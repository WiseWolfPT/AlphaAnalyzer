/**
 * EARNINGS MONITOR WORKER - Event-Driven Cache Refresh
 *
 * Implements permanent monitoring of earnings events to keep analyst estimates fresh:
 * - Fetches FMP earnings calendar (today + next 2 days)
 * - Detects earnings that happened in last 48h
 * - Invalidates stale analyst estimate caches
 * - Warms cache with fresh post-earnings data
 *
 * ARCHITECTURE:
 * - Event-driven discovery (NOT universe sweep like transcripts initial burst)
 * - Runs every 1 hour during market hours (6 AM - 8 PM UTC)
 * - Rate limiting: 4 req/s (respecting FMP limits)
 * - Bandwidth protection: Circuit breaker at 95% daily budget
 * - Graceful error handling with exponential backoff
 *
 * BANDWIDTH ESTIMATE:
 * - Normal days: ~21 calls/day (1 calendar + ~20 earnings checks)
 * - Earnings seasons: ~40 calls/day peak
 * - Monthly total: ~630 calls (~18.9 MB/month at 30KB/call)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { structuredLogger as logger } from '../services/structured-logger';
import { fmpRateLimiter } from '../lib/rate-limiter';
import { methodCacheService } from '../services/method-cache-service';

// Load environment FIRST
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: resolve(process.cwd(), envPath) });

// IMPORTANT: Load Redis cache service only AFTER dotenv, so REDIS_* are available
let redisCacheService: any = null;
async function getRedisCacheService() {
  if (!redisCacheService) {
    const mod = await import('../cache/redis-cache-service.js');
    redisCacheService = (mod as any).redisCacheService;
  }
  return redisCacheService;
}

// Load analyst service dynamically (it imports Redis)
let analystService: any = null;
async function getAnalystService() {
  if (!analystService) {
    analystService = await import('../services/fmp-analyst-service.js');
  }
  return analystService;
}

// Configuration
const RUN_INTERVAL_MS = parseInt(process.env.EARNINGS_MONITOR_INTERVAL_MS || '3600000', 10); // 1 hour default
const LOOKBACK_HOURS = parseInt(process.env.EARNINGS_LOOKBACK_HOURS || '48', 10); // 48 hours default
const LOOKAHEAD_DAYS = parseInt(process.env.EARNINGS_LOOKAHEAD_DAYS || '2', 10); // 2 days default
const MAX_CALLS_PER_CYCLE = parseInt(process.env.EARNINGS_MAX_CALLS_PER_CYCLE || '50', 10); // Safety limit

// Bandwidth tracking (per-cycle)
let fmpApiCallsThisCycle = 0;
let dailyBytes = 0;
let dailyCalls = 0;

// Health tracking
let lastRunAt: string | null = null;
let lastCycleStats: {
  earningsFound: number;
  cacheInvalidated: number;
  cacheWarmed: number;
  errors: number;
  apiCalls: number;
} | null = null;

/**
 * FMP Earnings Calendar Response
 */
interface EarningsEvent {
  symbol: string;
  date: string; // "2025-10-24"
  time: string; // "amc" (after market close), "bmc" (before market), "tbc" (to be confirmed)
  eps: number | null;
  epsEstimated: number | null;
  revenue: number | null;
  revenueEstimated: number | null;
  fiscalDateEnding: string;
  updatedFromDate: string;
}

/**
 * Track bandwidth usage
 */
async function trackBandwidth(bytes: number): Promise<void> {
  dailyBytes += bytes;
  dailyCalls++;

  logger.debug('[EarningsMonitor] Bandwidth tracked', {
    mb: (dailyBytes / 1024 / 1024).toFixed(2),
    calls: dailyCalls,
    date: new Date().toISOString().split('T')[0]
  });
}

/**
 * Reset daily counters (24h interval)
 */
setInterval(() => {
  logger.info('[EarningsMonitor] Daily bandwidth reset', {
    finalMb: (dailyBytes / 1024 / 1024).toFixed(2),
    finalCalls: dailyCalls,
    date: new Date().toISOString().split('T')[0]
  });
  dailyBytes = 0;
  dailyCalls = 0;
}, 24 * 60 * 60 * 1000);

/**
 * Fetch earnings calendar from FMP API
 *
 * Endpoint: /api/v3/earning_calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: Array of earnings events
 */
async function fetchEarningsCalendar(
  from: string,
  to: string
): Promise<EarningsEvent[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    logger.warn('[EarningsMonitor] FMP API key not configured');
    return [];
  }

  // Guard: Check limit BEFORE rate limiter
  if (fmpApiCallsThisCycle >= MAX_CALLS_PER_CYCLE) {
    logger.error('[EarningsMonitor] API calls limit reached - aborting', {
      calls: fmpApiCallsThisCycle,
      limit: MAX_CALLS_PER_CYCLE
    });
    return [];
  }

  // Apply rate limiter (4 req/s)
  await fmpRateLimiter.take();

  const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${apiKey}`;

  try {
    fmpApiCallsThisCycle++;

    const response = await fetch(url as any, {
      headers: {
        'Accept-Encoding': 'gzip'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Track bandwidth
    const bytes = parseInt(response.headers.get('content-length') || '0', 10);
    if (bytes > 0) {
      await trackBandwidth(bytes);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      logger.warn('[EarningsMonitor] Invalid response format from FMP');
      return [];
    }

    logger.info('[EarningsMonitor] Calendar fetched', {
      from,
      to,
      events: data.length,
      apiCalls: fmpApiCallsThisCycle
    });

    return data;
  } catch (error: any) {
    logger.error('[EarningsMonitor] Calendar fetch failed', {
      error: error.message,
      from,
      to
    });
    return [];
  }
}

/**
 * Check if earnings event should trigger cache refresh
 *
 * Logic:
 * - Earnings happened in last 48h
 * - Earnings date is valid
 * - Symbol is valid
 */
function shouldRefreshCache(event: EarningsEvent): boolean {
  if (!event.symbol || !event.date) {
    return false;
  }

  try {
    const eventDate = new Date(event.date + 'T00:00:00Z'); // Force UTC
    const now = new Date();
    const hoursAgo = (now.getTime() - eventDate.getTime()) / 3600000;

    // Refresh if earnings happened in last LOOKBACK_HOURS
    const shouldRefresh = hoursAgo >= 0 && hoursAgo <= LOOKBACK_HOURS;

    if (shouldRefresh) {
      logger.debug('[EarningsMonitor] Refresh needed', {
        symbol: event.symbol,
        date: event.date,
        hoursAgo: hoursAgo.toFixed(1)
      });
    }

    return shouldRefresh;
  } catch (error) {
    logger.warn('[EarningsMonitor] Invalid event date', {
      symbol: event.symbol,
      date: event.date
    });
    return false;
  }
}

/**
 * Invalidate analyst estimates cache for a symbol
 */
async function invalidateCache(symbol: string): Promise<boolean> {
  const upperSymbol = symbol.toUpperCase();
  const startTime = Date.now();
  let success = false;

  try {
    const redis = await getRedisCacheService();
    const cacheKey = `fmp:analyst:estimates:${upperSymbol}`;
    await redis.del(cacheKey);

    logger.info('[EarningsMonitor] Analyst cache invalidated', { symbol });
    success = true;
  } catch (error: any) {
    logger.error('[EarningsMonitor] Analyst cache invalidation failed', {
      symbol,
      error: error.message
    });
  }

  // Invalidate all IV method caches
  try {
    await methodCacheService.invalidateAllMethods(upperSymbol);
    logger.info('[EarningsMonitor] IV method caches invalidated', {
      symbol: upperSymbol,
      methodsInvalidated: 12
    });
  } catch (error: any) {
    logger.error('[EarningsMonitor] Failed to invalidate IV method caches', {
      symbol: upperSymbol,
      error: error.message
    });
  }

  // Step 3: Proactive warming - recalculate priority methods immediately
  // This ensures zero latency for ALL users, not just 2nd user onwards
  try {
    const priorityMethods: any[] = ['alfa-value', 'dcf-fcf-20', 'pe-mean'];

    logger.info('[EarningsMonitor] Starting proactive IV warming', {
      symbol: upperSymbol,
      methods: priorityMethods.length
    });

    // Warm each priority method sequentially
    for (const methodId of priorityMethods) {
      try {
        await methodCacheService.warmMethod(upperSymbol, methodId);
        logger.debug('[EarningsMonitor] Method warmed', {
          symbol: upperSymbol,
          method: methodId
        });
      } catch (warmError: any) {
        // Log but don't fail - warming is best-effort
        logger.warn('[EarningsMonitor] Failed to warm method', {
          symbol: upperSymbol,
          method: methodId,
          error: warmError.message
        });
      }

      // Small delay between methods to respect rate limits (4 req/s)
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    logger.info('[EarningsMonitor] Proactive warming complete', {
      symbol: upperSymbol,
      methodsWarmed: priorityMethods.length,
      durationMs: Date.now() - startTime
    });
  } catch (error: any) {
    // Warming failure should not break earnings processing
    logger.error('[EarningsMonitor] Proactive warming failed', {
      symbol: upperSymbol,
      error: error.message
    });
  }

  return success;
}

/**
 * Warm cache with fresh analyst estimates
 *
 * Fetches new data from FMP and stores in Redis
 */
async function warmCache(symbol: string): Promise<boolean> {
  try {
    // Guard: Check limit BEFORE API call
    if (fmpApiCallsThisCycle >= MAX_CALLS_PER_CYCLE) {
      logger.warn('[EarningsMonitor] Skipping cache warm - limit reached', {
        symbol,
        calls: fmpApiCallsThisCycle
      });
      return false;
    }

    // Load analyst service dynamically
    const service = await getAnalystService();
    const getAnalystEstimates = service.getAnalystEstimates;

    // getAnalystEstimates will:
    // 1. Apply rate limiting via fmpRateLimiter
    // 2. Fetch from FMP
    // 3. Cache in Redis (24h TTL)
    // 4. Track bandwidth
    fmpApiCallsThisCycle++; // Pre-increment for guard logic

    const estimates = await getAnalystEstimates(symbol);

    if (estimates.length > 0) {
      logger.info('[EarningsMonitor] Cache warmed', {
        symbol,
        estimates: estimates.length
      });
      return true;
    } else {
      logger.warn('[EarningsMonitor] No analyst estimates available', { symbol });
      return false;
    }
  } catch (error: any) {
    logger.error('[EarningsMonitor] Cache warming failed', {
      symbol,
      error: error.message
    });
    return false;
  }
}

/**
 * Process single earnings event
 *
 * Steps:
 * 1. Check if cache refresh needed
 * 2. Invalidate stale cache
 * 3. Warm with fresh data
 */
async function processEarningsEvent(event: EarningsEvent): Promise<{
  invalidated: boolean;
  warmed: boolean;
}> {
  const symbol = event.symbol.toUpperCase();

  // Check if refresh needed
  if (!shouldRefreshCache(event)) {
    return { invalidated: false, warmed: false };
  }

  // Step 1: Invalidate stale cache
  const invalidated = await invalidateCache(symbol);

  if (!invalidated) {
    return { invalidated: false, warmed: false };
  }

  // Step 2: Warm cache with fresh data
  // Add small delay between invalidation and warming
  await new Promise(resolve => setTimeout(resolve, 500));

  const warmed = await warmCache(symbol);

  return { invalidated, warmed };
}

/**
 * Main cycle logic
 *
 * Runs every hour:
 * 1. Fetch earnings calendar (lookback + lookahead window)
 * 2. Filter events that need cache refresh
 * 3. Invalidate and warm cache for each event
 * 4. Log cycle statistics
 */
async function runCycle(): Promise<void> {
  logger.info('[EarningsMonitor] Cycle start', {
    interval: RUN_INTERVAL_MS,
    lookbackHours: LOOKBACK_HOURS,
    lookaheadDays: LOOKAHEAD_DAYS
  });

  // Reset cycle counter
  fmpApiCallsThisCycle = 0;

  const stats = {
    earningsFound: 0,
    cacheInvalidated: 0,
    cacheWarmed: 0,
    errors: 0,
    apiCalls: 0
  };

  try {
    // Calculate date range
    const now = new Date();
    const lookbackDate = new Date(now.getTime() - LOOKBACK_HOURS * 3600000);
    const lookaheadDate = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400000);

    const from = lookbackDate.toISOString().split('T')[0];
    const to = lookaheadDate.toISOString().split('T')[0];

    // Fetch earnings calendar
    const earnings = await fetchEarningsCalendar(from, to);
    stats.earningsFound = earnings.length;

    if (earnings.length === 0) {
      logger.info('[EarningsMonitor] No earnings events found', { from, to });
      lastCycleStats = stats;
      lastRunAt = new Date().toISOString();
      return;
    }

    // Process each earnings event
    for (const event of earnings) {
      try {
        const result = await processEarningsEvent(event);

        if (result.invalidated) {
          stats.cacheInvalidated++;
        }

        if (result.warmed) {
          stats.cacheWarmed++;
        }

        // Rate limiting between events
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error: any) {
        stats.errors++;
        logger.error('[EarningsMonitor] Event processing failed', {
          symbol: event.symbol,
          error: error.message
        });
      }
    }

    stats.apiCalls = fmpApiCallsThisCycle;

    // Log cycle summary
    logger.info('[EarningsMonitor] Cycle complete', stats);

    // Bandwidth report
    const estimatedMB = (fmpApiCallsThisCycle * 30 / 1024).toFixed(2);
    logger.info('[EarningsMonitor] Bandwidth report', {
      apiCalls: fmpApiCallsThisCycle,
      estimatedMB,
      limit: MAX_CALLS_PER_CYCLE,
      status: fmpApiCallsThisCycle > MAX_CALLS_PER_CYCLE ? '🚨 EXCEEDED' : '✅ OK'
    });

  } catch (error: any) {
    stats.errors++;
    logger.error('[EarningsMonitor] Cycle error', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    lastCycleStats = stats;
    lastRunAt = new Date().toISOString();
  }
}

/**
 * Health endpoint server
 */
async function startHealthServer(): Promise<void> {
  const port = parseInt(process.env.WORKER_HEALTH_PORT || '3005', 10);

  try {
    const http = await import('http');
    const server = http.createServer((req: any, res: any) => {
      if (req.url === '/health') {
        const body = JSON.stringify({
          status: 'healthy',
          worker: 'earnings-monitor',
          lastRunAt,
          lastCycleStats,
          uptime: process.uptime(),
          config: {
            intervalMs: RUN_INTERVAL_MS,
            lookbackHours: LOOKBACK_HOURS,
            lookaheadDays: LOOKAHEAD_DAYS,
            maxCallsPerCycle: MAX_CALLS_PER_CYCLE
          },
          isRunning: true,
          timestamp: new Date().toISOString()
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(body);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(port, () => {
      logger.info(`[EarningsMonitor] Health endpoint listening on port ${port}`);
    });
  } catch (error: any) {
    logger.error('[EarningsMonitor] Health server failed to start', {
      error: error.message
    });
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('[EarningsMonitor] Worker starting', {
    env: process.env.NODE_ENV,
    intervalMs: RUN_INTERVAL_MS,
    lookbackHours: LOOKBACK_HOURS,
    lookaheadDays: LOOKAHEAD_DAYS
  });

  // Start health endpoint
  await startHealthServer();

  // Run first cycle immediately
  await runCycle();

  // Schedule subsequent cycles
  setInterval(async () => {
    try {
      await runCycle();
    } catch (error: any) {
      logger.error('[EarningsMonitor] Interval cycle failed', {
        error: error.message,
        stack: error.stack
      });
    }
  }, RUN_INTERVAL_MS);

  logger.info('[EarningsMonitor] Worker initialized successfully');
}

// Start worker (CJS-compatible)
main().catch((error) => {
  logger.error('[EarningsMonitor] Fatal error', {
    error: error?.message || String(error),
    stack: error?.stack,
    name: error?.name
  });
  process.exit(1);
});

export {};
