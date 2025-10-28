/**
 * ONDA 7: Intelligent Warming Worker Monitoring Dashboard
 *
 * Real-time observability for:
 * - Cache coverage (% stocks warmed across 14 valuation methods)
 * - API usage tracking (FMP rate limits)
 * - Bandwidth consumption monitoring
 * - Worker health status
 * - Warming queue metrics
 *
 * Architecture:
 * - Redis-backed cache status tracking
 * - Server-Sent Events (SSE) for real-time updates
 * - Heatmap visualization of cache coverage by stock
 * - Defense-in-depth bandwidth protection integration
 */

import { Router, Request, Response } from 'express';
import { redisCacheService } from '../cache/redis-cache-service';
import { getBandwidthStatsForMonitoring } from '../middleware/bandwidth-protection';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Valuation method IDs (12 methods total)
 * Matches FASE 3 implementation - ONDA 2.2 removed median methods
 */
const METHOD_IDS = [
  'dcf20-ocf',          // #1: DCF-20 OCF
  'dfcf20',             // #2: DFCF-20 FCF
  'dni20',              // #3: DNI-20 Net Income
  'dfcf-terminal',      // #4: DFCF Terminal (3-stage)
  'ps-mean',            // #5: P/S Mean 5Y
  'pe-mean',            // #7: P/E Mean 5Y ex-NRI
  'pb-mean',            // #9: P/B Mean 5Y
  'peg',                // #11: PEG ex-NRI
  'psg',                // #12: PSG
  'pe-mean-no-nri',     // #13: P/E Mean without NRI
  'pb-mean-no-nri',     // #15: P/B Mean without NRI
  'oraclevalue',        // #17: OracleValue™ (proprietary)
  'custom',             // #18: Custom Method
  'fmp-dcf'             // FMP DCF (external)
];

/**
 * Stock Universe Size
 * Total stocks across US markets (configurable via ENV)
 */
const TOTAL_STOCKS = parseInt(process.env.STOCK_UNIVERSE_SIZE || '1493', 10);

/**
 * Cache key patterns
 */
const CACHE_PATTERNS = {
  METHOD: (ticker: string, methodId: string) => `iv:method:${ticker.toUpperCase()}:${methodId}`,
  QUOTE: (ticker: string) => `quote:${ticker.toUpperCase()}`,
  WARMING_QUEUE: 'warming:queue',
  WARMING_IN_PROGRESS: 'warming:in-progress',
  WARMING_COMPLETED_TODAY: `warming:completed:${new Date().toISOString().split('T')[0]}`,
};

/**
 * Worker status check via health endpoints
 */
async function getWorkerStatus(workerName: string): Promise<{
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime?: number;
  lastCycleStats?: any;
  lastRunAt?: string;
}> {
  const healthPorts: Record<string, number> = {
    'earnings-monitor': 3005,
    'intelligent-warming-worker': 3008,
    'price-worker': 3002,
    'transcripts-worker': 3003,
  };

  const port = healthPorts[workerName];
  if (!port) {
    return { name: workerName, status: 'offline' };
  }

  try {
    const response = await fetch(`http://localhost:${port}/health`);
    if (!response.ok) {
      return { name: workerName, status: 'degraded' };
    }

    const data = await response.json();
    return {
      name: workerName,
      status: 'online',
      uptime: data.uptime,
      lastCycleStats: data.lastCycleStats,
      lastRunAt: data.lastRunAt,
    };
  } catch (error) {
    logger.error(`[WarmingMonitor] Worker health check failed: ${workerName}`, { error });
    return { name: workerName, status: 'offline' };
  }
}

/**
 * Count cached stocks for a specific method
 */
async function getCachedStockCountByMethod(methodId: string): Promise<number> {
  try {
    const pattern = `iv:method:*:${methodId}`;
    const keys = await redisCacheService.keys(pattern);
    return keys.length;
  } catch (error) {
    logger.error(`[WarmingMonitor] Error counting cached stocks for ${methodId}`, { error });
    return 0;
  }
}

/**
 * Get cache hotness tier (based on age)
 */
async function getCachedByTier(tier: 'hot' | 'warm' | 'cold' | 'stale'): Promise<number> {
  try {
    const allKeys = await redisCacheService.keys('iv:method:*');
    let count = 0;

    for (const key of allKeys) {
      const ttl = await redisCacheService.ttl(key);
      const age = (24 * 60 * 60) - ttl; // Assuming 24h TTL

      switch (tier) {
        case 'hot':
          if (age < 3600) count++; // <1h old
          break;
        case 'warm':
          if (age >= 3600 && age < 43200) count++; // 1-12h old
          break;
        case 'cold':
          if (age >= 43200 && age < 86400) count++; // 12-24h old
          break;
        case 'stale':
          if (age >= 86400) count++; // >24h old
          break;
      }
    }

    return count;
  } catch (error) {
    logger.error(`[WarmingMonitor] Error getting cached by tier ${tier}`, { error });
    return 0;
  }
}

/**
 * Get total cached stocks (unique tickers)
 */
async function getTotalCachedStocks(): Promise<number> {
  try {
    const keys = await redisCacheService.keys('iv:method:*');
    const tickers = new Set<string>();

    keys.forEach(key => {
      const parts = key.split(':');
      if (parts.length >= 3) {
        tickers.add(parts[2]); // Extract ticker from "iv:method:AAPL:methodId"
      }
    });

    return tickers.size;
  } catch (error) {
    logger.error('[WarmingMonitor] Error counting total cached stocks', { error });
    return 0;
  }
}

/**
 * Get warming queue size
 */
async function getQueueSize(queueType: 'pending' | 'in-progress' | 'completed-today'): Promise<number> {
  try {
    let key: string;
    switch (queueType) {
      case 'pending':
        key = CACHE_PATTERNS.WARMING_QUEUE;
        break;
      case 'in-progress':
        key = CACHE_PATTERNS.WARMING_IN_PROGRESS;
        break;
      case 'completed-today':
        key = CACHE_PATTERNS.WARMING_COMPLETED_TODAY;
        break;
    }

    const size = await redisCacheService.llen(key);
    return size || 0;
  } catch (error) {
    logger.error(`[WarmingMonitor] Error getting queue size ${queueType}`, { error });
    return 0;
  }
}

/**
 * Calculate average wait time in queue (estimate)
 */
async function getAvgWaitTime(): Promise<number> {
  try {
    const pending = await getQueueSize('pending');
    const throughput = await getThroughput();

    if (throughput === 0) return 0;

    // Estimate: (pending tasks) / (tasks per hour) = hours
    return pending / throughput;
  } catch (error) {
    logger.error('[WarmingMonitor] Error calculating avg wait time', { error });
    return 0;
  }
}

/**
 * Calculate warming throughput (tasks/hour)
 */
async function getThroughput(): Promise<number> {
  try {
    const completed = await getQueueSize('completed-today');
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);

    const hoursElapsed = (now.getTime() - midnight.getTime()) / 3600000;
    if (hoursElapsed === 0) return 0;

    return completed / hoursElapsed;
  } catch (error) {
    logger.error('[WarmingMonitor] Error calculating throughput', { error });
    return 0;
  }
}

/**
 * GET /api/monitoring/warming/overview
 *
 * Real-time overview of intelligent warming system
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [
      cachedStocks,
      hotness,
      bandwidth,
      workers,
      queueMetrics
    ] = await Promise.all([
      getTotalCachedStocks(),
      Promise.all([
        getCachedByTier('hot'),
        getCachedByTier('warm'),
        getCachedByTier('cold'),
        getCachedByTier('stale')
      ]),
      getBandwidthStatsForMonitoring(),
      Promise.all([
        getWorkerStatus('earnings-monitor'),
        getWorkerStatus('intelligent-warming-worker'),
        getWorkerStatus('price-worker'),
        getWorkerStatus('transcripts-worker')
      ]),
      Promise.all([
        getQueueSize('pending'),
        getQueueSize('in-progress'),
        getQueueSize('completed-today'),
        getAvgWaitTime(),
        getThroughput()
      ])
    ]);

    const coveragePercent = ((cachedStocks / TOTAL_STOCKS) * 100).toFixed(2);

    const overview = {
      cache: {
        totalStocks: TOTAL_STOCKS,
        cachedStocks,
        coveragePercent,
        hotness: {
          hot: hotness[0],
          warm: hotness[1],
          cold: hotness[2],
          stale: hotness[3]
        }
      },

      bandwidth: {
        dailyUsed: `${bandwidth.dailyUsedMB.toFixed(2)} MB`,
        dailyBudget: `${bandwidth.dailyBudgetMB.toFixed(2)} MB`,
        percentUsed: `${(bandwidth.percentUsed * 100).toFixed(2)}%`,
        status: getStatusFromPercent(bandwidth.percentUsed),
        projectedEOD: projectEndOfDay(bandwidth)
      },

      apiCalls: {
        today: bandwidth.requestsToday,
        rateLimit: '4 calls/sec',
        budgetRemaining: Math.max(0, bandwidth.dailyBudgetMB - bandwidth.dailyUsedMB).toFixed(2) + ' MB'
      },

      workers: {
        earningsMonitor: workers[0],
        intelligentWarming: workers[1],
        priceWorker: workers[2],
        transcriptsWorker: workers[3]
      },

      warmingQueue: {
        pending: queueMetrics[0],
        inProgress: queueMetrics[1],
        completedToday: queueMetrics[2],
        avgWaitTime: `${queueMetrics[3].toFixed(2)} hours`,
        throughput: `${queueMetrics[4].toFixed(2)} tasks/hour`
      },

      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    logger.error('[WarmingMonitor] Error fetching overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch warming overview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/warming/cache-heatmap
 *
 * Visual heatmap of cache coverage by stock and method
 */
router.get('/cache-heatmap', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    // Get all unique tickers from cache
    const keys = await redisCacheService.keys('iv:method:*');
    const tickerMap = new Map<string, Set<string>>();

    keys.forEach(key => {
      const parts = key.split(':');
      if (parts.length >= 4) {
        const ticker = parts[2];
        const methodId = parts[3];

        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, new Set());
        }
        tickerMap.get(ticker)!.add(methodId);
      }
    });

    // Build heatmap
    const heatmap = Array.from(tickerMap.entries())
      .slice(0, parseInt(limit as string))
      .map(([ticker, methods]) => {
        const cachedCount = methods.size;
        const methodDetails = METHOD_IDS.map(methodId => ({
          methodId,
          cached: methods.has(methodId)
        }));

        return {
          ticker,
          cachedMethods: cachedCount,
          totalMethods: METHOD_IDS.length,
          coverage: ((cachedCount / METHOD_IDS.length) * 100).toFixed(2),
          methods: methodDetails
        };
      })
      .sort((a, b) => b.cachedMethods - a.cachedMethods);

    res.json({ success: true, data: heatmap });
  } catch (error) {
    logger.error('[WarmingMonitor] Error generating cache heatmap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate cache heatmap',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/warming/method-coverage
 *
 * Coverage breakdown by valuation method
 */
router.get('/method-coverage', async (req: Request, res: Response) => {
  try {
    const methodCoverage = await Promise.all(
      METHOD_IDS.map(async (methodId) => {
        const cachedCount = await getCachedStockCountByMethod(methodId);
        const coveragePercent = ((cachedCount / TOTAL_STOCKS) * 100).toFixed(2);

        return {
          methodId,
          cachedStocks: cachedCount,
          totalStocks: TOTAL_STOCKS,
          coveragePercent
        };
      })
    );

    res.json({ success: true, data: methodCoverage });
  } catch (error) {
    logger.error('[WarmingMonitor] Error getting method coverage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get method coverage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/warming/real-time
 *
 * Server-Sent Events for real-time updates
 */
router.get('/real-time', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  const sendUpdate = async () => {
    try {
      const [cachedStocks, bandwidth, pending, completed] = await Promise.all([
        getTotalCachedStocks(),
        getBandwidthStatsForMonitoring(),
        getQueueSize('pending'),
        getQueueSize('completed-today')
      ]);

      const data = {
        cache: {
          cachedStocks,
          coveragePercent: ((cachedStocks / TOTAL_STOCKS) * 100).toFixed(2)
        },
        bandwidth: {
          percentUsed: (bandwidth.percentUsed * 100).toFixed(2),
          status: getStatusFromPercent(bandwidth.percentUsed)
        },
        queue: {
          pending,
          completedToday: completed
        },
        timestamp: new Date().toISOString()
      };

      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      logger.error('[WarmingMonitor] Error in real-time update:', error);
    }
  };

  // Send update every 5 seconds
  const interval = setInterval(sendUpdate, 5000);

  // Send initial update
  sendUpdate();

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

/**
 * Helper: Get status from bandwidth percent
 */
function getStatusFromPercent(percent: number): string {
  if (percent >= 0.95) return 'CRITICAL';
  if (percent >= 0.85) return 'WARNING';
  if (percent >= 0.70) return 'CAUTION';
  return 'OK';
}

/**
 * Helper: Project end-of-day bandwidth usage
 */
function projectEndOfDay(bandwidth: {
  dailyUsedMB: number;
  requestsToday: number;
}): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  const hoursElapsed = (now.getTime() - midnight.getTime()) / 3600000;
  if (hoursElapsed === 0) return '0.00 MB';

  const ratePerHour = bandwidth.dailyUsedMB / hoursElapsed;
  const projectedTotal = ratePerHour * 24;

  return `${projectedTotal.toFixed(2)} MB`;
}

export default router;
