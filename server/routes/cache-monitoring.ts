/**
 * Cache Monitoring Routes
 *
 * Provides comprehensive observability into cache performance
 * and helps identify optimization opportunities.
 *
 * Endpoints:
 * - GET /api/cache/stats - Human-readable cache statistics
 * - GET /api/cache/metrics - Detailed metrics for monitoring
 * - GET /api/cache/health - Health check with performance data
 * - POST /api/cache/clear - Clear cache (admin only)
 * - GET /api/cache/keys/:pattern - List keys matching pattern
 */

import { Router, Request, Response } from 'express';
import { enhancedRedisCacheService } from '../cache/enhanced-redis-cache-service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/cache/stats
 *
 * Returns human-readable cache statistics
 *
 * Response:
 * {
 *   "l1HitRate": "45.23%",
 *   "l2HitRate": "38.14%",
 *   "totalHitRate": "83.37%",
 *   "avgL1Latency": "1.23ms",
 *   "avgL2Latency": "7.45ms",
 *   "p95L1Latency": "2.10ms",
 *   "p95L2Latency": "12.30ms",
 *   "totalRequests": 15234,
 *   "l1Size": 847,
 *   "memoryUsage": "L1: 8.45MB"
 * }
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = enhancedRedisCacheService.getStats();

    logger.info('[CacheMonitoring] Stats requested');

    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
      performanceTarget: {
        l1Latency: '<2ms',
        l2Latency: '<10ms',
        hitRate: '>80%',
        status: parseFloat(stats.totalHitRate) >= 80 ? '✅ ON TARGET' : '⚠️ BELOW TARGET',
      },
    });
  } catch (error) {
    logger.error('[CacheMonitoring] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

/**
 * GET /api/cache/metrics
 *
 * Returns detailed metrics for monitoring systems (Prometheus-friendly)
 *
 * Response:
 * {
 *   "l1Hits": 6890,
 *   "l2Hits": 5810,
 *   "misses": 2534,
 *   "l1Latencies": [1.2, 1.5, 1.3, ...],
 *   "l2Latencies": [7.2, 8.1, 6.9, ...],
 *   "sets": 3124,
 *   "errors": 5,
 *   "lastReset": "2025-10-25T12:00:00.000Z",
 *   "l1Size": 847,
 *   "l1CalculatedSize": 8867234,
 *   "connected": true,
 *   "timeSinceReset": 3600000
 * }
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = enhancedRedisCacheService.getDetailedMetrics();

    logger.debug('[CacheMonitoring] Metrics requested');

    res.json({
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[CacheMonitoring] Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get cache metrics' });
  }
});

/**
 * GET /api/cache/health
 *
 * Health check with performance data
 *
 * Response:
 * {
 *   "status": "healthy",
 *   "message": "Enhanced cache operational (L1 + L2)",
 *   "stats": { ... }
 * }
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await enhancedRedisCacheService.healthCheck();

    logger.debug('[CacheMonitoring] Health check requested');

    if (health.status === 'healthy') {
      res.json(health);
    } else {
      res.status(503).json(health);
    }
  } catch (error) {
    logger.error('[CacheMonitoring] Error checking health:', error);
    res.status(500).json({
      status: 'unhealthy',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/cache/clear
 *
 * Clear all cache (admin only)
 *
 * Security: Requires X-API-Key header with admin key
 */
router.post('/clear', async (req: Request, res: Response) => {
  try {
    // Security check (reuse existing API key middleware)
    const apiKey = req.headers['x-api-key'] as string;
    const adminKey = process.env.ADMIN_API_KEY || process.env.MARKET_DATA_API_KEY;

    if (!apiKey || apiKey !== adminKey) {
      logger.warn('[CacheMonitoring] Unauthorized cache clear attempt');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Optional: Clear only specific pattern
    const pattern = req.query.pattern as string | undefined;

    if (pattern) {
      await enhancedRedisCacheService.delPattern(pattern);
      logger.info(`[CacheMonitoring] Cache cleared (pattern: ${pattern})`);
      res.json({ message: `Cache cleared (pattern: ${pattern})` });
    } else {
      await enhancedRedisCacheService.clear();
      logger.info('[CacheMonitoring] Full cache cleared');
      res.json({ message: 'Cache cleared successfully' });
    }
  } catch (error) {
    logger.error('[CacheMonitoring] Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/cache/keys/:pattern
 *
 * List cache keys matching pattern
 *
 * Query params:
 * - limit: Max keys to return (default: 100)
 *
 * Example: GET /api/cache/keys/quote:*?limit=50
 */
router.get('/keys/:pattern', async (req: Request, res: Response) => {
  try {
    const pattern = req.params.pattern;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!pattern) {
      res.status(400).json({ error: 'Pattern required' });
      return;
    }

    const keys = await enhancedRedisCacheService.keys(pattern);

    logger.debug(`[CacheMonitoring] Keys listed (pattern: ${pattern}, found: ${keys.length})`);

    res.json({
      pattern,
      total: keys.length,
      keys: keys.slice(0, limit),
      truncated: keys.length > limit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[CacheMonitoring] Error listing keys:', error);
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

/**
 * GET /api/cache/key/:key
 *
 * Inspect specific cache key (value + TTL)
 */
router.get('/key/:key', async (req: Request, res: Response) => {
  try {
    const key = req.params.key;

    if (!key) {
      res.status(400).json({ error: 'Key required' });
      return;
    }

    const value = await enhancedRedisCacheService.get(key);
    const ttl = await enhancedRedisCacheService.ttl(key);
    const exists = await enhancedRedisCacheService.exists(key);

    logger.debug(`[CacheMonitoring] Key inspected: ${key}`);

    res.json({
      key,
      exists,
      ttl: ttl > 0 ? ttl : null,
      value: value !== null ? value : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[CacheMonitoring] Error inspecting key:', error);
    res.status(500).json({ error: 'Failed to inspect key' });
  }
});

/**
 * GET /api/cache/performance
 *
 * Performance dashboard with detailed breakdowns
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const stats = enhancedRedisCacheService.getStats();
    const metrics = enhancedRedisCacheService.getDetailedMetrics();

    // Calculate performance score (0-100)
    const hitRate = parseFloat(stats.totalHitRate);
    const avgLatency =
      (parseFloat(stats.avgL1Latency) + parseFloat(stats.avgL2Latency)) / 2;

    let performanceScore = 0;
    performanceScore += Math.min(hitRate, 100) * 0.6; // 60% weight on hit rate
    performanceScore += Math.max(0, 100 - avgLatency * 5) * 0.4; // 40% weight on latency

    const performanceGrade =
      performanceScore >= 90
        ? 'A'
        : performanceScore >= 80
        ? 'B'
        : performanceScore >= 70
        ? 'C'
        : performanceScore >= 60
        ? 'D'
        : 'F';

    logger.info(
      `[CacheMonitoring] Performance dashboard requested (score: ${performanceScore.toFixed(2)}, grade: ${performanceGrade})`
    );

    res.json({
      performanceScore: performanceScore.toFixed(2),
      performanceGrade,
      stats,
      metrics: {
        totalOperations: metrics.l1Hits + metrics.l2Hits + metrics.misses + metrics.sets,
        errorRate:
          metrics.errors /
          (metrics.l1Hits + metrics.l2Hits + metrics.misses + metrics.sets || 1),
        timeSinceReset: `${(metrics.timeSinceReset / 1000 / 60).toFixed(0)} minutes`,
      },
      recommendations: getPerformanceRecommendations(stats, metrics),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[CacheMonitoring] Error getting performance dashboard:', error);
    res.status(500).json({ error: 'Failed to get performance data' });
  }
});

/**
 * Generate performance recommendations based on metrics
 */
function getPerformanceRecommendations(stats: any, metrics: any): string[] {
  const recommendations: string[] = [];

  const hitRate = parseFloat(stats.totalHitRate);
  const l1HitRate = parseFloat(stats.l1HitRate);
  const avgL2Latency = parseFloat(stats.avgL2Latency);

  if (hitRate < 80) {
    recommendations.push(
      `Cache hit rate (${hitRate.toFixed(2)}%) is below target (80%). Consider increasing TTLs or implementing cache warming.`
    );
  }

  if (l1HitRate < 30) {
    recommendations.push(
      `L1 hit rate (${l1HitRate.toFixed(2)}%) is low. Consider increasing L1 cache size or implementing refresh-ahead pattern.`
    );
  }

  if (avgL2Latency > 10) {
    recommendations.push(
      `L2 latency (${avgL2Latency.toFixed(2)}ms) is high. Check Redis network latency or consider using pipelining for bulk operations.`
    );
  }

  if (metrics.errors > 100) {
    recommendations.push(
      `High error count (${metrics.errors}). Check Redis connection stability.`
    );
  }

  if (metrics.l1Size > 900) {
    recommendations.push(
      `L1 cache near capacity (${metrics.l1Size}/1000). Consider increasing max size.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Cache performance is optimal!');
  }

  return recommendations;
}

export default router;
