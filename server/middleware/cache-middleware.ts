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

export const companyProfileCache = (ttlSeconds: number = 24 * 3600) => 
  createCacheMiddleware({
    type: CacheType.COMPANY_PROFILE,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => CacheKeys.companyProfile(req.params.symbol?.toUpperCase() || 'UNKNOWN'),
    condition: (req, res) => res.statusCode === 200
  });

export const fundamentalsCache = (ttlSeconds: number = 3600) => 
  createCacheMiddleware({
    type: CacheType.FUNDAMENTALS,
    ttl: ttlSeconds * 1000,
    keyGenerator: (req) => CacheKeys.fundamentals(req.params.symbol?.toUpperCase() || 'UNKNOWN'),
    condition: (req, res) => res.statusCode === 200
  });

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