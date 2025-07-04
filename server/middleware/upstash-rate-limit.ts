/**
 * Upstash Rate Limiting Middleware - Roadmap V4
 * 
 * Implements 30 req/min IP rate limiting using @upstash/ratelimit and KV counter
 */

import { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { trackKVOperation } from '../routes/health/kv';

// Initialize Redis client - fallback to in-memory if no Upstash config
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

// In-memory fallback for development
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // ROADMAP V4: 30 req/min IP using counter KV
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
      analytics: true,
      prefix: 'alfalyzer:ratelimit',
    });
    
    console.log('✅ Upstash rate limiting initialized');
  } else {
    console.log('⚠️ Upstash not configured, using in-memory rate limiting');
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize Upstash, falling back to in-memory:', error);
}

/**
 * Rate limiting middleware using Upstash or in-memory fallback
 */
export const upstashRateLimitMiddleware = (
  maxRequests: number = 30,
  windowMs: number = 60 * 1000, // 1 minute
  keyGenerator?: (req: Request) => string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate rate limit key (IP by default)
      const identifier = keyGenerator ? keyGenerator(req) : getClientIdentifier(req);
      
      if (ratelimit && redis) {
        // Use Upstash rate limiting
        const result = await ratelimit.limit(identifier);
        
        // Track KV operation for monitoring
        trackKVOperation('read', 1);
        if (!result.success) {
          trackKVOperation('write', 1);
        }
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.reset).toISOString(),
          'X-RateLimit-Provider': 'upstash'
        });
        
        if (!result.success) {
          console.log(`🚫 Upstash rate limit exceeded for ${identifier}: ${result.remaining}/${maxRequests}`);
          
          return res.status(429).json({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            limit: maxRequests,
            remaining: result.remaining,
            reset: result.reset,
            retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
            timestamp: new Date().toISOString()
          });
        }
        
        // Log successful request
        if (result.remaining % 10 === 0) { // Log every 10th request
          console.log(`📊 Upstash rate limit status for ${identifier}: ${maxRequests - result.remaining}/${maxRequests} used`);
        }
        
      } else {
        // Fallback to in-memory rate limiting
        const now = Date.now();
        const key = `ratelimit:${identifier}`;
        const current = inMemoryStore.get(key);
        
        if (!current || now > current.resetTime) {
          // Reset or initialize counter
          inMemoryStore.set(key, {
            count: 1,
            resetTime: now + windowMs
          });
          
          res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': (maxRequests - 1).toString(),
            'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
            'X-RateLimit-Provider': 'memory'
          });
        } else {
          // Increment counter
          current.count++;
          
          res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, maxRequests - current.count).toString(),
            'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
            'X-RateLimit-Provider': 'memory'
          });
          
          if (current.count > maxRequests) {
            console.log(`🚫 Memory rate limit exceeded for ${identifier}: ${current.count}/${maxRequests}`);
            
            return res.status(429).json({
              error: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              limit: maxRequests,
              remaining: 0,
              reset: current.resetTime,
              retryAfter: Math.ceil((current.resetTime - now) / 1000),
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't block requests if rate limiting fails
      next();
    }
  };
};

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: Request): string {
  // Use X-Forwarded-For header if available (for proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  // Use X-Real-IP header if available
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }
  
  // Fall back to req.ip
  return req.ip || 'unknown';
}

/**
 * Create rate limiter for specific endpoints
 */
export const createUpstashRateLimit = (requests: number, windowMs: number = 60 * 1000) => {
  return upstashRateLimitMiddleware(requests, windowMs);
};

/**
 * Pre-configured rate limiters for different use cases
 */
export const upstashRateLimiters = {
  // ROADMAP V4: 30 req/min IP as specified
  general: createUpstashRateLimit(30), // 30 requests per minute
  
  // More restrictive for auth endpoints
  auth: createUpstashRateLimit(5), // 5 requests per minute
  
  // More generous for public data
  public: createUpstashRateLimit(60), // 60 requests per minute
  
  // Very restrictive for admin endpoints
  admin: createUpstashRateLimit(10), // 10 requests per minute
  
  // Moderate for API endpoints
  api: createUpstashRateLimit(20), // 20 requests per minute
};

/**
 * Get rate limiting statistics
 */
export async function getRateLimitStats(): Promise<{
  provider: 'upstash' | 'memory';
  isConnected: boolean;
  inMemoryEntries?: number;
}> {
  try {
    if (redis && ratelimit) {
      // Test connection
      await redis.ping();
      return {
        provider: 'upstash',
        isConnected: true
      };
    } else {
      return {
        provider: 'memory',
        isConnected: true,
        inMemoryEntries: inMemoryStore.size
      };
    }
  } catch (error) {
    return {
      provider: redis ? 'upstash' : 'memory',
      isConnected: false,
      inMemoryEntries: inMemoryStore.size
    };
  }
}