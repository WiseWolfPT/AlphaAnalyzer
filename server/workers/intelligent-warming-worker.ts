/**
 * Intelligent Warming Worker - ONDA 7
 *
 * Priority-based, bandwidth-aware cache warming for all 1,493 stocks × 12 methods.
 *
 * Architecture:
 * 1. Priority Queue (Redis sorted sets)
 * 2. Adaptive Strategy (user activity + earnings + staleness)
 * 3. Bandwidth Throttling (stop at 85%, throttle at 70%)
 * 4. Continuous Operation (5-minute cycles)
 *
 * Coverage:
 * - 50 tasks × 12 cycles/hour × 24 hours = 14,400 tasks/day
 * - Universe: 1,493 stocks × 12 methods = 17,916 methods (FCFE removed)
 * - Daily Coverage: 68.9% (prioritized: S&P 100 = 100%, S&P 500 = 80%, Extended = 60% weekly)
 */

import { logger } from '../lib/logger';
import { warmingQueueService } from '../services/warming-queue-service';
import { warmingThrottle } from '../middleware/warming-throttle';
import { analyticsService } from '../services/analytics-service';
import { methodCacheService } from '../services/method-cache-service';
import type { MethodId } from '../types/valuation';
import {
  createDefaultContext,
  scheduleAdaptiveTasks,
  isMarketOpen,
  getTierLists
} from '../services/adaptive-warming-strategy';
import Redis from 'ioredis';

// Configuration from ENV
const WARMING_BATCH_SIZE = parseInt(process.env.WARMING_BATCH_SIZE || '50', 10);
const WARMING_CYCLE_INTERVAL_MS = parseInt(process.env.WARMING_CYCLE_INTERVAL_MS || '300000', 10); // 5 min
const WARMING_RATE_LIMIT_MS = parseInt(process.env.WARMING_RATE_LIMIT_MS || '250', 10); // 4 calls/sec
const WORKER_HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT || '3006', 10);

// Valuation method IDs (12 methods - ONDA 7)
// Mapping to actual MethodId types used by method-cache-service
const METHOD_IDS: MethodId[] = [
  'alfa-value',              // Proprietary AlfaValue method
  'dcf-fcf-20',              // FMP DCF FCF 20Y
  'dcf-fcfe-20',             // FMP DCF FCFE 20Y
  'dcf-terminal-fcf',        // FMP DCF Terminal FCF
  'dcf-terminal-fcfe',       // FMP DCF Terminal FCFE
  'dni-20',                  // DNI-20 (internal)
  'dfcf-terminal',           // DFCF Terminal (3-stage)
  'pe-mean',                 // P/E Mean 5Y (ex-NRI)
  'pe-mean-without-nri',     // P/E Mean 5Y (without NRI)
  'ps-mean',                 // P/S Mean 5Y
  'pb-mean',                 // P/B Mean 5Y
  'pb-mean-without-nri',     // P/B Mean 5Y (without NRI)
  'peg',                     // PEG (ex-NRI)
  'psg'                      // PSG
];

// Redis client for cache checks
let redis: Redis;

/**
 * Initialize Redis connection
 */
function initRedis(): void {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });

  redis.on('error', (error) => {
    logger.error('[IntelligentWarming] Redis error:', error);
  });

  redis.connect().catch((error) => {
    logger.error('[IntelligentWarming] Failed to connect to Redis:', error);
  });
}

/**
 * Get last warmed timestamp from Redis
 *
 * @param ticker - Stock ticker
 * @param methodId - Valuation method ID
 * @returns Date | null
 */
async function getLastWarmed(ticker: string, methodId: string): Promise<Date | null> {
  try {
    const key = `iv:warmed:${ticker}:${methodId}`;
    const timestamp = await redis.get(key);

    if (timestamp) {
      return new Date(parseInt(timestamp, 10));
    }

    return null;
  } catch (error) {
    logger.error('[IntelligentWarming] Failed to get last warmed:', error);
    return null;
  }
}

/**
 * Mark method as warmed in Redis
 *
 * @param ticker - Stock ticker
 * @param methodId - Valuation method ID
 * @returns Promise<void>
 */
async function markWarmed(ticker: string, methodId: string): Promise<void> {
  try {
    const key = `iv:warmed:${ticker}:${methodId}`;
    const now = Date.now();

    // Store timestamp with 7-day TTL
    await redis.setex(key, 7 * 24 * 60 * 60, now.toString());
  } catch (error) {
    logger.error('[IntelligentWarming] Failed to mark warmed:', error);
  }
}

/**
 * Warm a single method (calls real IV calculation API)
 *
 * @param ticker - Stock ticker
 * @param methodId - Valuation method ID
 * @returns Promise<{ success: boolean; bytesUsed: number }> - Success status and bandwidth used
 */
async function warmMethod(ticker: string, methodId: string): Promise<{ success: boolean; bytesUsed: number }> {
  try {
    logger.debug(`[IntelligentWarming] Warming ${ticker}:${methodId}`);

    // Track start time for performance monitoring
    const startTime = Date.now();

    // Call method-cache-service which:
    // 1. Checks cache first (returns cached if available)
    // 2. Calculates method via appropriate service (valuation-service/fmp-dcf)
    // 3. Stores result in Redis with 24h TTL
    const result = await methodCacheService.warmMethod(ticker, methodId as MethodId);

    const duration = Date.now() - startTime;

    // Estimate bandwidth used (conservative)
    // - Average FMP API response: ~30 KB
    // - Each method makes 2-3 API calls on average
    // - If cached, no API calls made (0 bytes)
    const bytesUsed = result ? 60 * 1024 : 0; // 60 KB if calculated, 0 if cached

    logger.info(`[IntelligentWarming] Warmed ${ticker}:${methodId} in ${duration}ms (${result ? 'calculated' : 'cached'})`);

    // Mark as warmed
    await markWarmed(ticker, methodId);

    return { success: true, bytesUsed };
  } catch (error) {
    logger.error(`[IntelligentWarming] Failed to warm ${ticker}:${methodId}:`, error);
    return { success: false, bytesUsed: 0 };
  }
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise<void>
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main intelligent warming loop
 */
async function intelligentWarmingLoop(): Promise<void> {
  logger.info('[IntelligentWarming] Starting...');
  logger.info(`[IntelligentWarming] Config: batchSize=${WARMING_BATCH_SIZE}, cycleInterval=${WARMING_CYCLE_INTERVAL_MS}ms, rateLimit=${WARMING_RATE_LIMIT_MS}ms`);

  // Initialize Redis
  initRedis();

  // Load tier lists
  const { sp100, sp500, extended } = await getTierLists();
  logger.info(`[IntelligentWarming] Tiers: SP100=${sp100.length}, SP500=${sp500.length}, Extended=${extended.length}`);

  // Initialize queue with initial tasks (Tier 1 priority)
  logger.info('[IntelligentWarming] Scheduling initial Tier 1 tasks...');
  await warmingQueueService.scheduleTier1(sp100.slice(0, 10), METHOD_IDS); // Start with top 10

  let cycleCount = 0;

  while (true) {
    cycleCount++;
    const cycleStart = Date.now();

    try {
      logger.info(`[IntelligentWarming] === Cycle ${cycleCount} started ===`);

      // 1. Check bandwidth budget
      const budget = await warmingThrottle.checkBandwidthBudget();

      if (!budget.allowWarming) {
        logger.warn(`[IntelligentWarming] Paused: ${budget.reason}`);
        await sleep(300000); // Sleep 5 min, check again
        continue;
      }

      logger.info(`[IntelligentWarming] Bandwidth: ${(budget.percentUsed * 100).toFixed(2)}% used, throttle=${budget.throttleRate}`);

      // 2. Get next batch (priority-sorted)
      const tasks = await warmingQueueService.getNextBatch(WARMING_BATCH_SIZE);

      if (tasks.length === 0) {
        logger.info('[IntelligentWarming] Queue empty, scheduling adaptive tasks...');

        // Create warming context
        const context = await createDefaultContext();

        // Override with real implementations
        context.analytics.getViews = (ticker, timeframe) => {
          return analyticsService.getViews(ticker, timeframe);
        };

        context.cache.getLastWarmed = (ticker, methodId) => {
          return getLastWarmed(ticker, methodId);
        };

        // Schedule adaptive tasks
        await scheduleAdaptiveTasks(context, METHOD_IDS, WARMING_BATCH_SIZE);

        // Get fresh batch
        const newTasks = await warmingQueueService.getNextBatch(WARMING_BATCH_SIZE);
        if (newTasks.length === 0) {
          logger.warn('[IntelligentWarming] Still no tasks, sleeping 5 min');
          await sleep(300000);
          continue;
        }

        tasks.push(...newTasks);
      }

      logger.info(`[IntelligentWarming] Processing ${tasks.length} tasks`);

      // 3. Warm with rate limiting
      let callsThisCycle = 0;
      let successCount = 0;
      let failureCount = 0;
      let totalBytesThisCycle = 0;

      for (const task of tasks) {
        // Stop if budget exhausted
        if (budget.maxCallsRemaining !== Infinity && callsThisCycle >= budget.maxCallsRemaining) {
          logger.warn('[IntelligentWarming] Budget exhausted, stopping cycle');
          break;
        }

        // Warm method (makes real API calls)
        const result = await warmMethod(task.ticker, task.methodId);

        if (result.success) {
          successCount++;
          await warmingQueueService.markCompleted(task.ticker, task.methodId);

          // Track bandwidth usage
          if (result.bytesUsed > 0) {
            totalBytesThisCycle += result.bytesUsed;
            await warmingThrottle.recordApiCall(result.bytesUsed);
          }
        } else {
          failureCount++;
          await warmingQueueService.markFailed(task.ticker, task.methodId, 'Warming failed');
        }

        callsThisCycle++;

        // Rate limit: 4 calls/sec (or 2 if throttled)
        const delay = budget.throttleRate === 'reduced' ? 500 : WARMING_RATE_LIMIT_MS;
        await sleep(delay);
      }

      const cycleDuration = Date.now() - cycleStart;
      const bandwidthMB = (totalBytesThisCycle / 1024 / 1024).toFixed(2);
      logger.info(`[IntelligentWarming] Cycle ${cycleCount} complete: ${successCount} success, ${failureCount} failed, ${cycleDuration}ms, ${bandwidthMB} MB used`);

      // 4. Get queue stats
      const stats = await warmingQueueService.getStats();
      logger.info(`[IntelligentWarming] Queue: size=${stats.queueSize}, completed=${stats.completedToday}, failed=${stats.failedToday}, avgPriority=${stats.avgPriority}`);

      // 5. Get bandwidth report
      const bandwidthReport = await warmingThrottle.getBandwidthReport();
      logger.info(`[IntelligentWarming] ${bandwidthReport.split('\n').join(' | ')}`);

      // 6. Sleep before next cycle
      const sleepTime = Math.max(0, WARMING_CYCLE_INTERVAL_MS - cycleDuration);
      logger.info(`[IntelligentWarming] Sleeping ${sleepTime}ms until next cycle`);
      await sleep(sleepTime);

    } catch (error) {
      logger.error('[IntelligentWarming] Error:', error);
      await sleep(60000); // 1 min on error
    }
  }
}

/**
 * Health check endpoint
 */
async function startHealthServer(): Promise<void> {
  const http = await import('http');

  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      try {
        const stats = await warmingQueueService.getStats();
        const budget = await warmingThrottle.checkBandwidthBudget();

        const health = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          queue: stats,
          bandwidth: {
            percentUsed: budget.percentUsed,
            allowWarming: budget.allowWarming,
            throttleRate: budget.throttleRate
          },
          config: {
            batchSize: WARMING_BATCH_SIZE,
            cycleInterval: WARMING_CYCLE_INTERVAL_MS,
            rateLimit: WARMING_RATE_LIMIT_MS
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
      } catch (error) {
        logger.error('[IntelligentWarming] Health check error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: String(error) }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(WORKER_HEALTH_PORT, () => {
    logger.info(`[IntelligentWarming] Health server listening on port ${WORKER_HEALTH_PORT}`);
  });
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  logger.info('[IntelligentWarming] Shutting down...');

  // Disconnect services
  await warmingQueueService.disconnect();
  await warmingThrottle.disconnect();
  await analyticsService.disconnect();

  if (redis) {
    await redis.quit();
  }

  logger.info('[IntelligentWarming] Shutdown complete');
  process.exit(0);
}

// Signal handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start both health server and warming loop concurrently
(async () => {
  try {
    // Start health server (non-blocking)
    startHealthServer().catch(error => {
      logger.error('[IntelligentWarming] Health server error:', error);
    });

    // Start warming loop (this is the main blocking loop)
    await intelligentWarmingLoop();
  } catch (error) {
    logger.error('[IntelligentWarming] Fatal error:', error);
    process.exit(1);
  }
})();
