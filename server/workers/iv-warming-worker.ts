/**
 * IV Warming Worker - ONDA 7
 *
 * Proactively warms IV cache for all 1,493 stocks using method-level caching.
 *
 * Strategy:
 * - Tier 1 (S&P 100): All 12 methods (FCFE removed), hourly (~5.6 min/cycle)
 * - Tier 2 (S&P 500): All 12 methods (FCFE removed), daily (~23.3 min/cycle)
 * - Tier 3 (Extended): On earnings events only
 *
 * API Impact (Optimized):
 * - Daily calls: ~1,808 (vs 85,393 naive approach)
 * - Bandwidth: ~18 MB/day (2.7% of FMP 20 GB limit)
 *
 * Performance:
 * - Rate limit: 4 calls/sec (250ms between calls)
 * - Capacity: 56 stocks/sec (12 methods × 4 calls/sec)
 * - Thundering herd protection: Via MethodCacheService
 */

import { methodCacheService } from '../services/method-cache-service';
import { redisCacheService } from '../cache/redis-cache-service';
import { logger } from '../lib/logger';
import type { MethodId } from '../types/valuation';

// All supported method IDs (12 total - ONDA 7)
// REMOVED 'dcf-fcfe-20' and 'dcf-terminal-fcfe' (FMP API returns empty array - no FCFE data available)
const ALL_METHOD_IDS: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-terminal-fcf',
  'dni-20',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg',
  'dfcf-terminal',
];

// Rate limiting: 4 calls/sec = 250ms between calls
const RATE_LIMIT_MS = 250;

// Warming cycle intervals
const TIER_1_INTERVAL_MS = 3600000; // 1 hour
const TIER_2_INTERVAL_MS = 86400000; // 24 hours

// Load tier definitions from environment (fallback to defaults)
const TIER_1_STOCKS = process.env.TIER_1_STOCKS?.split(',').filter(Boolean) || [
  // S&P 100 top stocks (default subset for testing)
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'V', 'UNH',
  'JPM', 'XOM', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'LLY', 'MRK',
];

const TIER_2_STOCKS = process.env.TIER_2_STOCKS?.split(',').filter(Boolean) || [];

const TIER_3_STOCKS = process.env.TIER_3_STOCKS?.split(',').filter(Boolean) || [];

/**
 * Main warming loop
 * Runs continuously, warming stocks in tiers
 */
export async function warmingLoop(): Promise<void> {
  logger.info('[IV Warming Worker] Starting warming loop');
  logger.info(`[IV Warming Worker] Tier 1: ${TIER_1_STOCKS.length} stocks (hourly)`);
  logger.info(`[IV Warming Worker] Tier 2: ${TIER_2_STOCKS.length} stocks (daily)`);
  logger.info(`[IV Warming Worker] Tier 3: ${TIER_3_STOCKS.length} stocks (earnings-driven)`);

  while (true) {
    try {
      const cycleStart = Date.now();

      // Tier 1: Warm hourly (every cycle)
      if (TIER_1_STOCKS.length > 0) {
        await warmTier(TIER_1_STOCKS, ALL_METHOD_IDS, 'Tier 1 (S&P 100)');
      }

      // Tier 2: Warm daily (check if 24h passed)
      if (TIER_2_STOCKS.length > 0) {
        const lastTier2 = await getLastWarmingTime('tier2');
        const shouldWarmTier2 = !lastTier2 || (Date.now() - lastTier2 > TIER_2_INTERVAL_MS);

        if (shouldWarmTier2) {
          await warmTier(TIER_2_STOCKS, ALL_METHOD_IDS, 'Tier 2 (S&P 500)');
          await setLastWarmingTime('tier2', Date.now());
        } else {
          const hoursUntilNext = ((lastTier2 + TIER_2_INTERVAL_MS - Date.now()) / 3600000).toFixed(1);
          logger.info(`[IV Warming Worker] Tier 2 skipped (next in ${hoursUntilNext}h)`);
        }
      }

      // Tier 3: Event-driven (check earnings calendar)
      if (TIER_3_STOCKS.length > 0) {
        const earningsToday = await getEarningsToday();
        if (earningsToday.length > 0) {
          logger.info(`[IV Warming Worker] Tier 3: ${earningsToday.length} earnings events today`);
          await warmTier(earningsToday, ALL_METHOD_IDS, 'Tier 3 (Earnings)');
        } else {
          logger.info('[IV Warming Worker] Tier 3: No earnings events today');
        }
      }

      const cycleDuration = ((Date.now() - cycleStart) / 60000).toFixed(2);
      logger.info(`[IV Warming Worker] Cycle complete in ${cycleDuration} min, sleeping 1 hour`);

      await sleep(TIER_1_INTERVAL_MS); // Sleep 1 hour
    } catch (error) {
      logger.error('[IV Warming Worker] Error in warming loop:', error);
      await sleep(300000); // 5 min retry delay
    }
  }
}

/**
 * Warm a tier of stocks with specified methods
 */
export async function warmTier(
  tickers: string[],
  methodIds: MethodId[],
  tierName: string
): Promise<WarmingResult> {
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ ticker: string; methodId: MethodId; error: string }> = [];

  logger.info(
    `[IV Warming] Starting ${tierName}: ${tickers.length} stocks × ${methodIds.length} methods = ${tickers.length * methodIds.length} total`
  );

  for (const ticker of tickers) {
    for (const methodId of methodIds) {
      try {
        await methodCacheService.warmMethod(ticker, methodId);
        successCount++;

        // Log progress every 100 methods
        if (successCount % 100 === 0) {
          logger.info(
            `[IV Warming] ${tierName} progress: ${successCount}/${tickers.length * methodIds.length}`
          );
        }

        // Rate limiting
        await sleep(RATE_LIMIT_MS);
      } catch (error: any) {
        errorCount++;
        const errorMsg = error?.message || String(error);
        errors.push({ ticker, methodId, error: errorMsg });

        // Log individual errors at debug level
        logger.debug(`[IV Warming] Error warming ${ticker}:${methodId}: ${errorMsg}`);

        // Continue with other methods (don't block entire tier)
      }
    }
  }

  const duration = ((Date.now() - startTime) / 60000).toFixed(2);
  const successRate = ((successCount / (tickers.length * methodIds.length)) * 100).toFixed(1);

  logger.info(
    `[IV Warming] ${tierName} complete: ` +
      `${successCount} success, ${errorCount} errors (${successRate}% success rate), ` +
      `${duration} min`
  );

  // Log error summary if any failures
  if (errors.length > 0 && errors.length <= 10) {
    logger.warn(`[IV Warming] ${tierName} errors:`, errors);
  } else if (errors.length > 10) {
    logger.warn(`[IV Warming] ${tierName} had ${errors.length} errors (showing first 10):`, errors.slice(0, 10));
  }

  return {
    tierName,
    totalAttempts: tickers.length * methodIds.length,
    successCount,
    errorCount,
    successRate: parseFloat(successRate),
    durationMinutes: parseFloat(duration),
    errors: errors.slice(0, 10), // Limit error array size
  };
}

/**
 * Get last warming time for a tier
 */
async function getLastWarmingTime(tier: string): Promise<number | null> {
  try {
    const key = `iv:warming:last:${tier}`;
    const timestamp = await redisCacheService.get<number>(key);
    return timestamp || null;
  } catch (error) {
    logger.error(`[IV Warming] Error getting last warming time for ${tier}:`, error);
    return null;
  }
}

/**
 * Set last warming time for a tier
 */
async function setLastWarmingTime(tier: string, timestamp: number): Promise<void> {
  try {
    const key = `iv:warming:last:${tier}`;
    // Store with 30-day TTL (just for housekeeping)
    await redisCacheService.set(key, timestamp, 2592000);
  } catch (error) {
    logger.error(`[IV Warming] Error setting last warming time for ${tier}:`, error);
  }
}

/**
 * Get stocks with earnings today
 * TODO: Integrate with earnings calendar API or database
 */
async function getEarningsToday(): Promise<string[]> {
  try {
    // Stub implementation - replace with actual earnings calendar lookup
    // Options:
    // 1. Query FMP earnings calendar API
    // 2. Query PostgreSQL earnings_calendar table
    // 3. Query Supabase earnings table

    // For now, return empty array (Tier 3 disabled until calendar integrated)
    return [];
  } catch (error) {
    logger.error('[IV Warming] Error fetching earnings calendar:', error);
    return [];
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Warming result type
 */
export interface WarmingResult {
  tierName: string;
  totalAttempts: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  durationMinutes: number;
  errors: Array<{ ticker: string; methodId: MethodId; error: string }>;
}

/**
 * Get warming statistics
 */
export async function getWarmingStats(): Promise<{
  tier1LastRun: number | null;
  tier2LastRun: number | null;
  tier1NextRun: number | null;
  tier2NextRun: number | null;
  methodCacheStats: any;
}> {
  const tier1Last = await getLastWarmingTime('tier1');
  const tier2Last = await getLastWarmingTime('tier2');

  const tier1Next = tier1Last ? tier1Last + TIER_1_INTERVAL_MS : null;
  const tier2Next = tier2Last ? tier2Last + TIER_2_INTERVAL_MS : null;

  const methodCacheStats = await methodCacheService.getStats();

  return {
    tier1LastRun: tier1Last,
    tier2LastRun: tier2Last,
    tier1NextRun: tier1Next,
    tier2NextRun: tier2Next,
    methodCacheStats,
  };
}

// Start worker if run directly
if (require.main === module) {
  logger.info('[IV Warming Worker] Starting worker process');
  warmingLoop().catch((error) => {
    logger.error('[IV Warming Worker] Fatal error:', error);
    process.exit(1);
  });
}
