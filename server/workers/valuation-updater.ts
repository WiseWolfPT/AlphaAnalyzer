/**
 * VALUATION UPDATER WORKER - FASE 2 AlfaValue™
 *
 * Maintains freshness of valuation data through scheduled updates:
 *
 * DAILY (06:00 UTC):
 * - Update risk-free rates (US 10Y Treasury)
 * - Recalculate intrinsic value for hot set (top 100 tickers)
 * - Invalidate stale IV cache entries
 *
 * MONTHLY (1st of month, 07:00 UTC):
 * - Rebuild g_sector_mid growth rates for all sectors
 * - Validate MRP coverage for configured regions
 * - Generate growth rate distribution report
 *
 * QUARTERLY (1st of quarter, 08:00 UTC):
 * - Update FCF series from latest FMP financial statements
 * - Recalculate IV for full universe (1000+ tickers)
 * - Archive historical valuation snapshots
 *
 * Architecture:
 * - Uses existing valuationService from server/services/valuation-service.ts
 * - Leverages simpleCacheService for cache invalidation
 * - Follows price-worker.ts and transcripts-worker.ts patterns
 * - Comprehensive error handling with retry logic
 * - Detailed logging with timestamps and metrics
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Simple logger for worker
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] INFO:`, msg, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[${new Date().toISOString()}] ERROR:`, msg, ...args),
  warn: (msg: string, ...args: any[]) => console.warn(`[${new Date().toISOString()}] WARN:`, msg, ...args),
  debug: (msg: string, ...args: any[]) => console.log(`[${new Date().toISOString()}] DEBUG:`, msg, ...args),
};

// Load environment variables
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

// Verify critical environment variables
if (!process.env.FMP_API_KEY) {
  logger.error('❌ FMP_API_KEY not found in environment variables!');
  logger.info('Loading from:', envPath);
  process.exit(1);
}

// Worker configuration
const DAILY_CRON = process.env.VALUATION_DAILY_CRON || '0 6 * * *'; // 06:00 UTC daily
const MONTHLY_CRON = process.env.VALUATION_MONTHLY_CRON || '0 7 1 * *'; // 07:00 UTC on 1st
const QUARTERLY_CRON = process.env.VALUATION_QUARTERLY_CRON || '0 8 1 */3 *'; // 08:00 UTC on 1st of Q
const HOT_SET_SIZE = parseInt(process.env.HOT_SET_SIZE || '100', 10);
const FULL_UNIVERSE_SIZE = parseInt(process.env.SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE || '1000', 10);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Dynamic imports to ensure environment is loaded
let valuationService: any;
let redisCacheService: any;

async function ensureServices() {
  if (!valuationService) {
    const valMod = await import('../services/valuation-service.js');
    valuationService = valMod.valuationService;
  }
  if (!redisCacheService) {
    const cacheMod = await import('../cache/redis-cache-service.js');
    redisCacheService = cacheMod.redisCacheService;
  }
}

/**
 * Get hot set of tickers (most actively traded)
 * Source: Built-in list or PostgreSQL stocks table
 */
async function getHotSetTickers(): Promise<string[]> {
  // Built-in hot set (top 100 most popular stocks)
  const builtInHotSet = [
    // Magnificent 7
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',

    // Top S&P 500 by market cap
    'BRK.B', 'JPM', 'JNJ', 'V', 'PG', 'UNH', 'HD', 'MA',
    'DIS', 'BAC', 'ADBE', 'NFLX', 'CRM', 'CMCSA', 'XOM', 'CVX',
    'PFE', 'ABBV', 'KO', 'TMO', 'CSCO', 'PEP', 'WMT', 'MRK',
    'AVGO', 'LLY', 'VZ', 'INTC', 'DHR', 'ABT', 'ACN', 'NKE',

    // Tech giants
    'ORCL', 'IBM', 'QCOM', 'TXN', 'AMD', 'NOW', 'INTU', 'PYPL',
    'UBER', 'SQ', 'SHOP', 'SNAP', 'PINS', 'ROKU', 'ZM',
    'DOCU', 'OKTA', 'TWLO', 'CRWD', 'PANW', 'NET', 'DDOG', 'SNOW',

    // Finance
    'GS', 'MS', 'WFC', 'C', 'USB', 'BLK', 'SCHW', 'AXP',
    'SPGI', 'CME', 'ICE', 'COF', 'PNC', 'TFC', 'FISV',

    // Healthcare
    'UNH', 'TMO', 'CVS', 'MDT', 'BMY', 'AMGN', 'GILD', 'ISRG', 'SYK',

    // Consumer
    'HD', 'MCD', 'SBUX', 'TGT', 'COST', 'LOW',
    'TJX', 'BKNG', 'MAR', 'HLT', 'YUM', 'CMG',
  ];

  // Try to load from PostgreSQL if configured
  if (process.env.PGHOST) {
    try {
      const { Client } = await import('pg');
      const client = new Client({
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        application_name: 'alfalyzer-valuation-updater'
      });

      await client.connect();
      const result = await client.query(
        `SELECT DISTINCT UPPER(symbol) AS symbol
         FROM stocks
         WHERE symbol IS NOT NULL AND TRIM(symbol) <> ''
         ORDER BY symbol
         LIMIT $1`,
        [HOT_SET_SIZE]
      );
      await client.end();

      const pgTickers = result.rows.map(r => String(r.symbol).toUpperCase());
      if (pgTickers.length > 0) {
        logger.info(`Loaded ${pgTickers.length} tickers from PostgreSQL`);
        return pgTickers;
      }
    } catch (error: any) {
      logger.warn('Failed to load tickers from PostgreSQL, using built-in list', { error: error.message });
    }
  }

  // Fallback to built-in list
  return builtInHotSet.slice(0, HOT_SET_SIZE);
}

/**
 * Get full universe of tickers
 */
async function getFullUniverse(): Promise<string[]> {
  const hotSet = await getHotSetTickers();

  // For now, return hot set. In future, expand to full universe from PG
  // TODO: Implement full universe fetch from stocks table
  logger.info(`Using hot set as full universe (${hotSet.length} tickers)`);
  return hotSet;
}

/**
 * Retry wrapper for operations with exponential backoff
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = MAX_RETRIES
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff

      if (isLastAttempt) {
        logger.error(`${operationName} failed after ${maxRetries} attempts`, { error: error.message });
        return null;
      }

      logger.warn(`${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms`, {
        error: error.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

/**
 * DAILY JOB: Update risk-free rates and recalculate IV for hot set
 */
async function dailyUpdate(): Promise<void> {
  const startTime = Date.now();
  logger.info('🌅 Starting DAILY valuation update');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await ensureServices();

  let rfUpdated = false;
  let ivsCalculated = 0;
  let ivsFailed = 0;
  let ivsNotCalculable = 0;  // Patch 3: Separate "impossible to calculate" from "real failures"
  // Diagnostics for cache invalidation effectiveness
  let delAttempted = 0;
  let delExistsHit = 0;

  // Step 1: Update risk-free rates (invalidate cache to force fresh fetch)
  try {
    logger.info('📈 Step 1: Updating risk-free rates');

    // Invalidate RF cache for all regions (use REAL cache keys from service)
    const regions = ['US', 'EU', 'CN', 'BR', 'UK', 'JP'];
    for (const region of regions) {
      await redisCacheService.del(`rf:${region}`); // Fixed: use real key format
    }

    // Force fresh fetch by calling service (will auto-cache)
    const rfUS = await valuationService.getRiskFree('US');
    const rfDisplay = (rfUS.rf !== null && isFinite(rfUS.rf))
      ? (rfUS.rf * 100).toFixed(2)
      : 'N/A';
    logger.info(`✅ Updated US risk-free rate: ${rfDisplay}% (source: ${rfUS.source})`);
    rfUpdated = true;
  } catch (error: any) {
    logger.error('❌ Failed to update risk-free rates', { error: error.message });
  }

  // Step 2: Recalculate IV for hot set
  logger.info(`📊 Step 2: Recalculating IV for hot set (${HOT_SET_SIZE} tickers)`);

  const hotSet = await getHotSetTickers();
  logger.info(`Hot set loaded: ${hotSet.length} tickers`);

  for (let i = 0; i < hotSet.length; i++) {
    const ticker = hotSet[i];
    let counted = false; // Flag to prevent double-counting

    try {
      // Invalidate existing cache (use REAL cache key from service)
      // Record diagnostics about whether a key existed prior to deletion
      const ivKey = `iv:calc:${ticker}`;
      delAttempted++;
      try {
        const existed = await redisCacheService.exists(ivKey);
        if (existed) delExistsHit++;
      } catch {/* ignore exists diagnostics */}
      await redisCacheService.del(ivKey); // Fixed: use real key format

      // Calculate fresh IV (will auto-cache)
      const result = await retryOperation(
        () => valuationService.getAlfaValue(ticker),
        `Calculate IV for ${ticker}`
      );

      // STRICT VALIDATION: Only count as success if IV is a valid finite number > 0
      if (result && result.iv !== null && isFinite(result.iv) && result.iv > 0) {
        ivsCalculated++;
        counted = true;

        // DEFENSIVE: Check discount_pct before toFixed
        const discount = result.discount_pct !== null && isFinite(result.discount_pct)
          ? result.discount_pct.toFixed(1)
          : 'N/A';

        // DEFENSIVE: Ensure IV is finite before toFixed
        const ivDisplay = isFinite(result.iv) ? result.iv.toFixed(2) : 'N/A';
        logger.info(`✅ [${i + 1}/${hotSet.length}] ${ticker}: $${ivDisplay} (${result.status}, ${discount}%)`);
      } else {
        // Patch 3: Classify as "not calculable" vs "real failure"
        if (!counted) {
          const isNotCalculable = result && result.iv !== null && result.iv < 0;

          if (isNotCalculable) {
            ivsNotCalculable++;
          } else {
            ivsFailed++;
          }
          counted = true;
        }

        const reason = !result ? 'API failed'
                      : result.iv === null ? 'IV null (missing inputs)'
                      : !isFinite(result.iv) ? 'IV NaN/Infinity'
                      : result.iv < 0 ? 'Not Calculable (negative IV)'
                      : 'IV <= 0';
        logger.warn(`⚠️ [${i + 1}/${hotSet.length}] ${ticker}: ${reason}`);
      }

      // Rate limiting: 1 calculation per second to avoid overwhelming FMP API
      if (i < hotSet.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      // Only count if not already counted (e.g., error in logging)
      if (!counted) {
        ivsFailed++;
      }
      logger.error(`❌ [${i + 1}/${hotSet.length}] ${ticker}: Exception - ${error.message}`);
    }
  }

  // Summary
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const totalTickers = hotSet.length;
  const successRateNum = totalTickers > 0 ? (ivsCalculated / totalTickers) : 0;
  const successRate = (successRateNum * 100).toFixed(1);

  // Patch 3: Adjust success rate to only count "real failures" in denominator
  const adjustedTotal = totalTickers - ivsNotCalculable;
  const adjustedSuccessRate = adjustedTotal > 0 ? (ivsCalculated / adjustedTotal) * 100 : 0;

  // SANITY CHECK: Prevent impossible metrics (calculated + notCalculable + failed should equal total)
  if (ivsCalculated + ivsNotCalculable + ivsFailed > totalTickers) {
    logger.error(`⚠️ METRICS BUG DETECTED: ${ivsCalculated} + ${ivsNotCalculable} + ${ivsFailed} > ${totalTickers} total`);
    logger.error('This should never happen - indicates double-counting in worker logic!');
  }

  // Patch 1: Cache Invalidation Visibility
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 DAILY Update Summary:');
  logger.info(`   ├─ Duration: ${duration}s`);
  logger.info(`   ├─ RF Updated: ${rfUpdated ? '✅' : '❌'}`);
  logger.info(`   ├─ IVs Calculated: ${ivsCalculated}/${totalTickers} (${successRate}%)`);
  logger.info(`   ├─ IVs Not Calculable: ${ivsNotCalculable} (negative FCF/missing data)`);
  logger.info(`   ├─ IVs Failed: ${ivsFailed} (real failures)`);
  logger.info(`   ├─ Cache Invalidation: ${delExistsHit}/${delAttempted} keys existed pre-del`);
  logger.info(`   └─ Status: ${ivsCalculated > 0 ? '✅ Success' : '❌ All Failed'}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Patch 3: Alarms based on adjusted success rate (excludes not calculable)
  const metricsValid = ivsCalculated + ivsNotCalculable + ivsFailed === totalTickers;
  if (!metricsValid) {
    logger.error(`🔴 [ALARM] METRICS_SANITY_FAILED: ${ivsCalculated}+${ivsNotCalculable}+${ivsFailed} != ${totalTickers}`);
  } else if (adjustedSuccessRate < 70) {
    logger.warn(`⚠️ [ALARM] SUCCESS_RATE_BELOW_TARGET: ${ivsCalculated}/${adjustedTotal} (${adjustedSuccessRate.toFixed(1)}%) < 70% (excluding ${ivsNotCalculable} not calculable)`);
  } else {
    logger.info(`✅ Daily Update OK: ${ivsCalculated}/${adjustedTotal} (${adjustedSuccessRate.toFixed(1)}%), ${ivsNotCalculable} not calculable, metrics valid`);
  }

  // Cache invalidation alarm: if none of the iv:calc:* keys existed prior to deletion, raise a suspicion
  try {
    if (delAttempted > 0 && delExistsHit === 0) {
      logger.error(`🔴 [ALARM] CACHE_INVALIDATION_SUSPECT: 0/${delAttempted} iv:calc:* keys existed before deletion`);
    }
  } catch {/* noop */}
}

/**
 * MONTHLY JOB: Rebuild sector growth rates and validate MRP coverage
 */
async function monthlyUpdate(): Promise<void> {
  const startTime = Date.now();
  logger.info('📅 Starting MONTHLY valuation maintenance');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await ensureServices();

  let sectorsRebuilt = 0;
  let mrpValidated = 0;

  // Step 1: Rebuild sector growth rates (invalidate all sector caches)
  try {
    logger.info('🏭 Step 1: Rebuilding sector growth rates');

    const sectors = [
      'technology', 'software', 'healthcare', 'financials',
      'consumer cyclical', 'consumer defensive', 'industrials',
      'energy', 'utilities', 'real estate', 'materials', 'telecommunications'
    ];

    for (const sector of sectors) {
      try {
        // Invalidate cache (use REAL cache key from service)
        const cacheKey = `sector:growth:industry:${sector.toLowerCase().replace(/\s+/g, '_')}`; // Fixed: use real key format
        await redisCacheService.del(cacheKey);

        // Force fresh calculation
        const result = await valuationService.getSectorGrowth(sector);
        const growthDisplay = (result.g_sector_mid !== null && isFinite(result.g_sector_mid))
          ? (result.g_sector_mid * 100).toFixed(1)
          : 'N/A';
        logger.info(`✅ ${sector}: ${growthDisplay}% (source: ${result.source})`);
        sectorsRebuilt++;
      } catch (error: any) {
        logger.error(`❌ Failed to rebuild ${sector}`, { error: error.message });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error: any) {
    logger.error('❌ Failed to rebuild sector growth rates', { error: error.message });
  }

  // Step 2: Validate MRP coverage
  try {
    logger.info('🌍 Step 2: Validating MRP coverage');

    const regions: Array<'US' | 'EU' | 'CN' | 'BR' | 'UK' | 'JP'> = ['US', 'EU', 'CN', 'BR', 'UK', 'JP'];

    for (const region of regions) {
      try {
        // Invalidate cache (use REAL cache key from service)
        await redisCacheService.del(`mrp:${region}`); // Fixed: use real key format

        // Force fresh fetch
        const result = await valuationService.getMRP(region);
        const coverage = result.covered ? '✅' : '⚠️';
        const mrpDisplay = (result.mrp !== null && isFinite(result.mrp))
          ? (result.mrp * 100).toFixed(1)
          : 'N/A';
        logger.info(`${coverage} ${region}: ${mrpDisplay}% (source: ${result.source})`);
        mrpValidated++;
      } catch (error: any) {
        logger.error(`❌ Failed to validate MRP for ${region}`, { error: error.message });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error: any) {
    logger.error('❌ Failed to validate MRP coverage', { error: error.message });
  }

  // Summary
  const duration = Math.floor((Date.now() - startTime) / 1000);

  // Patch 1: Cache Invalidation Visibility (monthly doesn't track DEL stats but keeping structure consistent)
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 MONTHLY Maintenance Summary:');
  logger.info(`   ├─ Duration: ${duration}s`);
  logger.info(`   ├─ Sectors Rebuilt: ${sectorsRebuilt}/12`);
  logger.info(`   ├─ MRP Regions Validated: ${mrpValidated}/6`);
  logger.info(`   └─ Status: ${sectorsRebuilt > 0 || mrpValidated > 0 ? '✅ Success' : '❌ Failed'}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * QUARTERLY JOB: Update FCF series and recalculate full universe
 */
async function quarterlyUpdate(): Promise<void> {
  const startTime = Date.now();
  logger.info('📈 Starting QUARTERLY valuation rebuild');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await ensureServices();

  let ivsCalculated = 0;
  let ivsFailed = 0;
  let ivsNotCalculable = 0;  // Patch 3: Separate "impossible to calculate" from "real failures"

  // Step 1: Get full universe
  logger.info(`📊 Step 1: Fetching full universe (up to ${FULL_UNIVERSE_SIZE} tickers)`);
  const universe = await getFullUniverse();
  logger.info(`Universe loaded: ${universe.length} tickers`);

  // Step 2: Recalculate IV for entire universe
  logger.info('🔄 Step 2: Recalculating IV for full universe (this may take a while...)');

  for (let i = 0; i < universe.length; i++) {
    const ticker = universe[i];
    let counted = false; // Flag to prevent double-counting

    try {
      // Invalidate existing cache (use REAL cache key from service)
      await redisCacheService.del(`iv:calc:${ticker}`); // Fixed: use real key format

      // Also invalidate g_term_region for quarterly refresh
      await redisCacheService.del(`g_term_region:US`); // Fixed: use real key format

      // Calculate fresh IV (this will fetch latest FCF data from FMP)
      const result = await retryOperation(
        () => valuationService.getAlfaValue(ticker),
        `Calculate IV for ${ticker}`
      );

      // STRICT VALIDATION: Only count as success if IV is a valid finite number > 0
      if (result && result.iv !== null && isFinite(result.iv) && result.iv > 0) {
        ivsCalculated++;
        counted = true;

        // Log progress every 10 tickers
        if ((i + 1) % 10 === 0) {
          const progressPct = ((i + 1) / universe.length * 100).toFixed(1);
          logger.info(`📊 Progress: ${i + 1}/${universe.length} (${progressPct}%)`);
        }

        // DEFENSIVE: Ensure IV is finite before toFixed
        const ivDisplay = isFinite(result.iv) ? result.iv.toFixed(2) : 'N/A';
        logger.debug(`✅ [${i + 1}/${universe.length}] ${ticker}: $${ivDisplay} (${result.status})`);
      } else {
        // Patch 3: Classify as "not calculable" vs "real failure"
        if (!counted) {
          const isNotCalculable = result && result.iv !== null && result.iv < 0;

          if (isNotCalculable) {
            ivsNotCalculable++;
          } else {
            ivsFailed++;
          }
          counted = true;
        }

        const reason = !result ? 'API failed'
                      : result.iv === null ? 'IV null (missing inputs)'
                      : !isFinite(result.iv) ? 'IV NaN/Infinity'
                      : result.iv < 0 ? 'Not Calculable (negative IV)'
                      : 'IV <= 0';
        logger.warn(`⚠️ [${i + 1}/${universe.length}] ${ticker}: ${reason}`);
      }

      // Rate limiting: 1 calculation per 2 seconds for quarterly updates
      // (more conservative to avoid API limits during large batch)
      if (i < universe.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      // Only count if not already counted (e.g., error in logging)
      if (!counted) {
        ivsFailed++;
      }
      logger.error(`❌ [${i + 1}/${universe.length}] ${ticker}: Exception - ${error.message}`);
    }
  }

  // Summary
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const durationMinutes = (duration / 60).toFixed(1);
  const totalTickers = universe.length;
  const successRate = totalTickers > 0 ? ((ivsCalculated / totalTickers) * 100).toFixed(1) : '0.0';

  // Patch 3: Adjust success rate to only count "real failures" in denominator
  const adjustedTotal = totalTickers - ivsNotCalculable;
  const adjustedSuccessRate = adjustedTotal > 0 ? ((ivsCalculated / adjustedTotal) * 100).toFixed(1) : '0.0';

  // SANITY CHECK: Prevent impossible metrics (calculated + notCalculable + failed should equal total)
  if (ivsCalculated + ivsNotCalculable + ivsFailed > totalTickers) {
    logger.error(`⚠️ METRICS BUG DETECTED: ${ivsCalculated} + ${ivsNotCalculable} + ${ivsFailed} > ${totalTickers} total`);
    logger.error('This should never happen - indicates double-counting in worker logic!');
  }

  // Patch 1: Cache Invalidation Visibility (quarterly doesn't track DEL stats currently but keeping structure)
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('📊 QUARTERLY Rebuild Summary:');
  logger.info(`   ├─ Duration: ${duration}s (${durationMinutes}m)`);
  logger.info(`   ├─ Universe Size: ${totalTickers} tickers`);
  logger.info(`   ├─ IVs Calculated: ${ivsCalculated}/${totalTickers} (${successRate}%)`);
  logger.info(`   ├─ IVs Not Calculable: ${ivsNotCalculable} (negative FCF/missing data)`);
  logger.info(`   ├─ IVs Failed: ${ivsFailed} (real failures)`);
  logger.info(`   └─ Status: ${ivsCalculated > 0 ? '✅ Success' : '❌ All Failed'}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Determine which job to run based on current date/time
 * This allows the worker to be triggered on-demand via PM2 restart
 */
async function determineAndRunJob(): Promise<void> {
  const now = new Date();
  const dayOfMonth = now.getUTCDate();
  const month = now.getUTCMonth();

  // Check if it's the start of a quarter (Jan, Apr, Jul, Oct)
  const isQuarterStart = dayOfMonth === 1 && (month === 0 || month === 3 || month === 6 || month === 9);

  // Check if it's the start of a month
  const isMonthStart = dayOfMonth === 1;

  if (isQuarterStart) {
    logger.info('🎯 Detected QUARTERLY trigger');
    await quarterlyUpdate();
  } else if (isMonthStart) {
    logger.info('🎯 Detected MONTHLY trigger');
    await monthlyUpdate();
  } else {
    logger.info('🎯 Detected DAILY trigger (default)');
    await dailyUpdate();
  }
}

/**
 * Health check endpoint
 */
let lastRunAt: string | null = null;
let lastRunType: 'daily' | 'monthly' | 'quarterly' | null = null;
let lastRunStatus: 'success' | 'error' = 'success';

async function setupHealthCheck(): Promise<void> {
  if (!process.env.WORKER_HEALTH_PORT) return;

  try {
    const http = await import('http');
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        const health = {
          status: 'healthy',
          worker: 'valuation-updater',
          lastRunAt,
          lastRunType,
          lastRunStatus,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    const port = parseInt(process.env.WORKER_HEALTH_PORT);
    server.listen(port, () => {
      logger.info(`🏥 Health check endpoint listening on port ${port}`);
    });
  } catch (error: any) {
    logger.warn('Failed to setup health check endpoint', { error: error.message });
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('🚀 Valuation Updater Worker starting...');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Hot Set Size: ${HOT_SET_SIZE}`);
  logger.info(`Full Universe Size: ${FULL_UNIVERSE_SIZE}`);
  logger.info(`Daily Cron: ${DAILY_CRON}`);
  logger.info(`Monthly Cron: ${MONTHLY_CRON}`);
  logger.info(`Quarterly Cron: ${QUARTERLY_CRON}`);
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Setup health check
  await setupHealthCheck();

  // Run job
  try {
    lastRunAt = new Date().toISOString();
    await determineAndRunJob();
    lastRunStatus = 'success';
    logger.info('✅ Job completed successfully');
  } catch (error: any) {
    lastRunStatus = 'error';
    logger.error('❌ Job failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }

  // Exit cleanly after one-time execution
  // PM2 will restart this worker based on cron schedule
  logger.info('👋 Valuation Updater Worker exiting (will restart per cron schedule)');
  process.exit(0);
}

// Graceful shutdown handlers
process.on('SIGINT', () => {
  logger.info('Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, exiting...');
  process.exit(0);
});

// Start worker
main().catch((error) => {
  logger.error('Fatal error in valuation updater worker', {
    error: error?.message || String(error),
    stack: error?.stack,
    name: error?.name,
    code: error?.code,
  });
  process.exit(1);
});

export {};
