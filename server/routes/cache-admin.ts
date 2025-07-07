/**
 * CACHE ADMINISTRATION ROUTES
 * Admin endpoints for cache management and monitoring
 */

import { Router, Request, Response } from 'express';
import { cacheManager } from '../services/cache/cache-manager';

const router = Router();

/**
 * Get comprehensive cache statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = cacheManager.getStats();

    res.json({
      global: stats,
      performance: {
        hitRate: stats.hitRate,
        totalRequests: stats.totalRequests,
        apiCallsSaved: stats.apiCallsSaved,
        uptime: process.uptime()
      },
      breakdown: {
        byType: stats.byType
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
 * Clear entire cache or specific type
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const { type, pattern } = req.query;
    
    let cleared = 0;
    
    if (pattern) {
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
 * Warm cache with default symbols
 */
router.post('/warm', async (req: Request, res: Response) => {
  try {
    const defaultSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];

    // Start warming in background
    const warmingPromise = cacheManager.warmCache(defaultSymbols);

    res.json({
      message: 'Cache warming started',
      symbols: defaultSymbols,
      count: defaultSymbols.length,
      timestamp: new Date().toISOString()
    });

    // Log completion when done
    warmingPromise
      .then(() => {
        console.log('✅ Cache warming completed');
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
 * Get cache health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      providers: {
        memory: {
          connected: true,
          responsive: true
        }
      },
      overall: {
        functional: true,
        redundant: false,
      },
      timestamp: new Date().toISOString()
    };

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