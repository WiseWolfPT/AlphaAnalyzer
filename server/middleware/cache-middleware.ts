/**
 * CACHE MIDDLEWARE
 * Express middleware for automatic caching of API responses
 */

import { Request, Response, NextFunction } from 'express';
import { cacheManager, CacheType, CacheKeys } from '../services/cache/cache-manager';
import { createHash } from 'crypto';

export interface CacheMiddlewareOptions {
  ttl?: number;
  type: CacheType;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  skipCache?: (req: Request) => boolean;
  onHit?: (key: string, data: any) => void;
  onMiss?: (key: string) => void;
  onSet?: (key: string, data: any) => void;
}

/**
 * Create cache middleware with automatic key generation and response caching
 */
export function createCacheMiddleware(options: CacheMiddlewareOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if condition check fails
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateDefaultKey(req, options.type);

    try {
      // Try to get from cache
      const cached = await cacheManager.get(cacheKey, options.type);
      
      if (cached !== null) {
        // Cache hit
        if (options.onHit) {
          options.onHit(cacheKey, cached);
        }
        
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Content-Type': 'application/json'
        });
        
        return res.json(cached);
      }

      // Cache miss - continue to route handler
      if (options.onMiss) {
        options.onMiss(cacheKey);
      }

      // Intercept response to cache it
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.send = function(data: any) {
        cacheResponse(cacheKey, data, options);
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        });
        return originalSend.call(this, data);
      };

      res.json = function(data: any) {
        cacheResponse(cacheKey, data, options);
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        });
        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      console.error(`❌ Cache middleware error for ${cacheKey}:`, error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Specific middleware factories for common use cases
 */

export const stockQuoteCache = (ttlSeconds: number = 60) => 
  createCacheMiddleware({
    type: CacheType.REALTIME_PRICE,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => CacheKeys.realtimePrice(req.params.symbol?.toUpperCase() || 'UNKNOWN'),
    condition: (req, res) => res.statusCode === 200,
    skipCache: (req) => req.query.nocache === 'true'
  });

export const chartDataCache = (ttlSeconds: number = 3600) => 
  createCacheMiddleware({
    type: CacheType.CHART_DATA,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => {
      const symbol = req.params.symbol?.toUpperCase() || 'UNKNOWN';
      const period = req.query.period as string || '1d';
      const interval = req.query.interval as string || '1m';
      return CacheKeys.chartData(symbol, period, interval);
    },
    condition: (req, res) => res.statusCode === 200
  });

export const fundamentalsCache = (ttlSeconds: number = 3600) => 
  createCacheMiddleware({
    type: CacheType.FUNDAMENTALS,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => CacheKeys.fundamentals(req.params.symbol?.toUpperCase() || 'UNKNOWN'),
    condition: (req, res) => res.statusCode === 200
  });

export const companyProfileCache = (ttlSeconds: number = 24 * 3600) => 
  createCacheMiddleware({
    type: CacheType.COMPANY_PROFILE,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => CacheKeys.companyProfile(req.params.symbol?.toUpperCase() || 'UNKNOWN'),
    condition: (req, res) => res.statusCode === 200
  });

export const marketStatusCache = (ttlSeconds: number = 30) => 
  createCacheMiddleware({
    type: CacheType.MARKET_STATUS,
    ttl: ttlSeconds * 1000,
    keyGenerator: () => CacheKeys.marketStatus(),
    condition: (req, res) => res.statusCode === 200
  });

export const newsCache = (ttlSeconds: number = 600) => 
  createCacheMiddleware({
    type: CacheType.NEWS,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => {
      const symbol = req.params.symbol || req.query.symbol as string;
      return CacheKeys.news(symbol);
    },
    condition: (req, res) => res.statusCode === 200
  });

export const earningsCalendarCache = (ttlSeconds: number = 6 * 3600) => 
  createCacheMiddleware({
    type: CacheType.EARNINGS_CALENDAR,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      return CacheKeys.earningsCalendar(date);
    },
    condition: (req, res) => res.statusCode === 200
  });

// User data caches (shorter TTL for personalized content)
export const watchlistCache = (ttlSeconds: number = 15 * 60) => 
  createCacheMiddleware({
    type: CacheType.WATCHLISTS,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id || 'anonymous';
      return CacheKeys.userWatchlists(userId);
    },
    condition: (req, res) => res.statusCode === 200,
    skipCache: (req) => !(req as any).user?.id // Don't cache for anonymous users
  });

export const portfolioCache = (ttlSeconds: number = 15 * 60) => 
  createCacheMiddleware({
    type: CacheType.PORTFOLIOS,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id || 'anonymous';
      return CacheKeys.userPortfolios(userId);
    },
    condition: (req, res) => res.statusCode === 200,
    skipCache: (req) => !(req as any).user?.id
  });

/**
 * Cache invalidation middleware
 */
export function createCacheInvalidationMiddleware(patterns: string[] | ((req: Request) => string[])) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Intercept successful responses to invalidate cache
    const interceptResponse = (data: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const invalidationPatterns = typeof patterns === 'function' 
          ? patterns(req) 
          : patterns;
        
        // Invalidate cache patterns asynchronously
        setImmediate(async () => {
          for (const pattern of invalidationPatterns) {
            try {
              const invalidated = await cacheManager.invalidate(pattern);
              if (invalidated > 0) {
                console.log(`🗑️ Cache invalidated ${invalidated} entries for pattern: ${pattern}`);
              }
            } catch (error) {
              console.error(`❌ Cache invalidation failed for pattern ${pattern}:`, error);
            }
          }
        });
      }
    };

    res.send = function(data: any) {
      interceptResponse(data);
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      interceptResponse(data);
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Cache warming middleware for popular endpoints
 */
export function createCacheWarmingMiddleware(symbols: string[] = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Warm cache in background on first request
    if (!req.app.locals.cacheWarmed) {
      req.app.locals.cacheWarmed = true;
      
      setImmediate(async () => {
        try {
          await cacheManager.warmCache(symbols);
          console.log('✅ Cache warming completed for popular symbols');
        } catch (error) {
          console.error('❌ Cache warming failed:', error);
        }
      });
    }
    
    next();
  };
}

/**
 * Cache statistics middleware
 */
export function cacheStatsMiddleware() {
  return async (req: Request, res: Response) => {
    try {
      const stats = cacheManager.getStats();
      
      res.json({
        cache: stats,
        endpoints: {
          '/api/stocks/:symbol': 'Real-time price cache (60s)',
          '/api/stocks/:symbol/chart': 'Chart data cache (1h)',
          '/api/stocks/:symbol/fundamentals': 'Fundamentals cache (1h)',
          '/api/stocks/:symbol/profile': 'Company profile cache (24h)',
          '/api/market/status': 'Market status cache (30s)',
          '/api/news': 'News cache (10m)',
          '/api/earnings/calendar': 'Earnings calendar cache (6h)'
        },
        actions: {
          clear: 'DELETE /api/admin/cache',
          invalidate: 'DELETE /api/admin/cache/:pattern',
          warm: 'POST /api/admin/cache/warm'
        }
      });
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      res.status(500).json({ error: 'Failed to get cache statistics' });
    }
  };
}

// Helper functions
function generateDefaultKey(req: Request, type: CacheType): string {
  const url = req.originalUrl || req.url;
  const method = req.method;
  const query = JSON.stringify(req.query);
  
  // Create a hash of the request to ensure consistent keys
  const hash = createHash('md5').update(`${method}:${url}:${query}`).digest('hex');
  
  return `${type}:${hash}`;
}

async function cacheResponse(key: string, data: any, options: CacheMiddlewareOptions): Promise<void> {
  try {
    const ttl = options.ttl || 60000; // Default 1 minute
    await cacheManager.set(key, data, options.type, 'middleware');
    
    if (options.onSet) {
      options.onSet(key, data);
    }
  } catch (error) {
    console.error(`❌ Failed to cache response for ${key}:`, error);
  }
}

/**
 * Express app configuration helper
 */
export function configureCaching(app: any) {
  // Add cache warming on app start
  app.use('*', createCacheWarmingMiddleware());
  
  // Add cache stats endpoint for admin
  app.get('/api/admin/cache/stats', cacheStatsMiddleware());
  
  // Add cache management endpoints
  app.delete('/api/admin/cache', async (req: Request, res: Response) => {
    try {
      const cleared = await cacheManager.clear();
      res.json({ message: `Cache cleared: ${cleared} entries removed` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });
  
  app.delete('/api/admin/cache/:pattern', async (req: Request, res: Response) => {
    try {
      const pattern = req.params.pattern;
      const invalidated = await cacheManager.invalidate(pattern);
      res.json({ message: `Cache invalidated: ${invalidated} entries removed for pattern "${pattern}"` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to invalidate cache' });
    }
  });
  
  app.post('/api/admin/cache/warm', async (req: Request, res: Response) => {
    try {
      const symbols = req.body.symbols || ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];
      await cacheManager.warmCache(symbols);
      res.json({ message: `Cache warming initiated for ${symbols.length} symbols` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to warm cache' });
    }
  });
  
  console.log('✅ Cache middleware and endpoints configured');
}