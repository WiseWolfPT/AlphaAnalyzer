/**
 * CACHE ADMINISTRATION ROUTES
 * Admin endpoints for cache management and monitoring
 */

import { Router, Request, Response } from 'express';
import { cacheManager, CacheType, cacheWarmingService } from '../services/cache/cache-manager';
import { redisCache } from '../services/cache/providers/redis-cache';
import { memoryCache } from '../services/cache/providers/memory-cache';

const router = Router();

/**
 * Get comprehensive cache statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      globalStats,
      redisStats,
      memoryStats
    ] = await Promise.all([
      cacheManager.getStats(),
      redisCache.getStats(),
      memoryCache.getStats()
    ]);

    const warmingProgress = cacheWarmingService.getProgress();

    res.json({
      global: globalStats,
      redis: redisStats,
      memory: memoryStats,
      warming: warmingProgress,
      performance: {
        redisConnected: redisStats.connected,
        hitRate: globalStats.hitRate,
        totalRequests: globalStats.totalRequests,
        apiCallsSaved: globalStats.apiCallsSaved,
        uptime: process.uptime()
      },
      breakdown: {
        byType: globalStats.byType,
        providers: {
          redis: {
            enabled: redisStats.connected,
            commands: redisStats.totalCommands,
            failed: redisStats.failedCommands,
            memory: redisStats.memoryUsed
          },
          memory: {
            enabled: true,
            entries: memoryStats.totalEntries,
            evictions: memoryStats.evictions,
            hitRate: memoryStats.hitRate
          }
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        server: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    res.status(500).json({ 
      error: 'Failed to get cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cache entries by type or pattern
 */
router.get('/entries', async (req: Request, res: Response) => {
  try {
    const { type, pattern, limit = 100 } = req.query;
    
    let keys: string[] = [];
    
    if (type) {
      // Get keys for specific cache type
      const cacheType = type as CacheType;
      keys = await memoryCache.getKeys(`${cacheType}:*`);
    } else if (pattern) {
      // Get keys matching pattern
      keys = await memoryCache.getKeys(pattern as string);
    } else {
      // Get all keys
      keys = await memoryCache.getKeys('*');
    }

    // Limit results
    const limitedKeys = keys.slice(0, parseInt(limit as string));
    
    // Get entry details
    const entries = await Promise.all(
      limitedKeys.map(async (key) => {
        const ttl = await memoryCache.getTtl(key);
        return {
          key,
          ttl: ttl > 0 ? ttl : 'expired',
          exists: await memoryCache.exists(key)
        };
      })
    );

    res.json({
      total: keys.length,
      showing: entries.length,
      entries,
      filters: {
        type: type || null,
        pattern: pattern || null,
        limit: parseInt(limit as string)
      }
    });

  } catch (error) {
    console.error('❌ Error getting cache entries:', error);
    res.status(500).json({ 
      error: 'Failed to get cache entries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear entire cache or specific type/pattern
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const { type, pattern } = req.query;
    
    let cleared = 0;
    
    if (type) {
      cleared = await cacheManager.clear(type as CacheType);
    } else if (pattern) {
      cleared = await cacheManager.invalidate(pattern as string);
    } else {
      cleared = await cacheManager.clear();
    }

    res.json({
      message: 'Cache cleared successfully',
      cleared,
      type: type || null,
      pattern: pattern || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Invalidate cache by pattern
 */
router.delete('/invalidate/:pattern', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.params;
    const invalidated = await cacheManager.invalidate(pattern);

    res.json({
      message: `Cache pattern invalidated: ${pattern}`,
      invalidated,
      pattern,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error invalidating cache:', error);
    res.status(500).json({ 
      error: 'Failed to invalidate cache pattern',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Warm cache with specific symbols
 */
router.post('/warm', async (req: Request, res: Response) => {
  try {
    const { symbols, force = false } = req.body;
    
    if (cacheWarmingService.isWarmingInProgress() && !force) {
      return res.status(409).json({
        error: 'Cache warming already in progress',
        progress: cacheWarmingService.getProgress()
      });
    }

    const defaultSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA'];
    const symbolsToWarm = symbols || defaultSymbols;

    // Start warming in background
    const warmingPromise = cacheWarmingService.warmPopularStocks({
      symbols: symbolsToWarm,
      batchSize: 5,
      delayBetweenBatches: 1000,
      retryAttempts: 2
    });

    // Don't wait for completion, return immediately
    res.json({
      message: 'Cache warming started',
      symbols: symbolsToWarm,
      count: symbolsToWarm.length,
      progress: cacheWarmingService.getProgress(),
      timestamp: new Date().toISOString()
    });

    // Log completion when done
    warmingPromise
      .then((summary) => {
        console.log('✅ Cache warming completed:', summary);
      })
      .catch((error) => {
        console.error('❌ Cache warming failed:', error);
      });

  } catch (error) {
    console.error('❌ Error starting cache warming:', error);
    res.status(500).json({ 
      error: 'Failed to start cache warming',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cache warming progress
 */
router.get('/warm/progress', (req: Request, res: Response) => {
  try {
    const progress = cacheWarmingService.getProgress();
    
    res.json({
      ...progress,
      percentage: progress.total > 0 
        ? Math.round((progress.progress / progress.total) * 100)
        : 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting warming progress:', error);
    res.status(500).json({ 
      error: 'Failed to get warming progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test cache performance
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { operations = 1000, dataSize = 'small' } = req.body;
    
    // Generate test data
    const getTestData = (size: string) => {
      switch (size) {
        case 'small': 
          return { test: 'data', timestamp: Date.now() };
        case 'medium':
          return { 
            test: 'data'.repeat(100), 
            array: new Array(100).fill('test'),
            timestamp: Date.now() 
          };
        case 'large':
          return { 
            test: 'data'.repeat(1000), 
            array: new Array(1000).fill('test'),
            nested: {
              deep: {
                data: new Array(500).fill('nested_test')
              }
            },
            timestamp: Date.now() 
          };
        default:
          return { test: 'data', timestamp: Date.now() };
      }
    };

    const testData = getTestData(dataSize);
    const testResults = {
      operations,
      dataSize,
      started: Date.now(),
      setOperations: 0,
      getOperations: 0,
      hits: 0,
      misses: 0,
      errors: 0
    };

    // Perform SET operations
    console.log(`🧪 Starting cache performance test: ${operations} operations with ${dataSize} data`);
    
    for (let i = 0; i < operations; i++) {
      try {
        const key = `test:perf:${i}`;
        await cacheManager.set(key, { ...testData, id: i }, CacheType.REALTIME_PRICE, 'performance-test');
        testResults.setOperations++;
      } catch (error) {
        testResults.errors++;
      }
    }

    // Perform GET operations
    for (let i = 0; i < operations; i++) {
      try {
        const key = `test:perf:${i}`;
        const result = await cacheManager.get(key, CacheType.REALTIME_PRICE);
        testResults.getOperations++;
        
        if (result !== null) {
          testResults.hits++;
        } else {
          testResults.misses++;
        }
      } catch (error) {
        testResults.errors++;
      }
    }

    const duration = Date.now() - testResults.started;
    const opsPerSecond = Math.round((testResults.setOperations + testResults.getOperations) / (duration / 1000));

    // Cleanup test data
    await cacheManager.invalidate('test:perf:*');

    res.json({
      ...testResults,
      duration,
      opsPerSecond,
      hitRate: testResults.getOperations > 0 
        ? Math.round((testResults.hits / testResults.getOperations) * 100) + '%'
        : '0%',
      completed: Date.now(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error during cache performance test:', error);
    res.status(500).json({ 
      error: 'Cache performance test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cache health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const [redisPing, memoryPing] = await Promise.all([
      redisCache.ping(),
      memoryCache.ping()
    ]);

    const health = {
      status: 'healthy',
      providers: {
        redis: {
          connected: redisCache.isConnectedState(),
          responsive: redisPing
        },
        memory: {
          connected: true,
          responsive: memoryPing
        }
      },
      overall: {
        functional: redisPing || memoryPing, // At least one working
        redundant: redisPing && memoryPing,  // Both working
      },
      timestamp: new Date().toISOString()
    };

    // Set status based on health
    if (!health.overall.functional) {
      health.status = 'critical';
      res.status(503);
    } else if (!health.overall.redundant) {
      health.status = 'degraded';
    }

    res.json(health);

  } catch (error) {
    console.error('❌ Error checking cache health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to check cache health',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;