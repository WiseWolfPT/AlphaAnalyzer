import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { SubscriptionTier } from '../types/auth';

// Rate limiting configuration per subscription tier
const RATE_LIMITS: Record<SubscriptionTier, {
  requests: number;
  windowMs: number;
  dailyLimit: number;
  burstLimit: number;
}> = {
  'free': {
    requests: 100000,        // 100k requests per hour (massive increase for testing)
    windowMs: 60 * 60 * 1000, // 1 hour
    dailyLimit: 1000000,     // 1M requests per day (massive increase for testing)
    burstLimit: 10000,       // 10k requests per minute burst (massive increase for testing)
  },
  'pro': {
    requests: 10000,       // 10k requests per hour (10x increase)
    windowMs: 60 * 60 * 1000, // 1 hour
    dailyLimit: 150000,    // 150k requests per day (10x increase)
    burstLimit: 500,       // 500 requests per minute burst (10x increase)
  },
  'premium': {
    requests: 50000,       // 50k requests per hour (10x increase)
    windowMs: 60 * 60 * 1000, // 1 hour
    dailyLimit: 1000000,   // 1M requests per day (10x increase)
    burstLimit: 2000,      // 2000 requests per minute burst (10x increase)
  },
};

// Special endpoints with different rate limits
const ENDPOINT_SPECIFIC_LIMITS: Record<string, Partial<Record<SubscriptionTier, number>>> = {
  '/api/stocks/search': {
    'free': 500,     // 10x increase
    'pro': 5000,     // 10x increase
    'premium': 20000, // 10x increase
  },
  '/api/intrinsic-values/calculate': {
    'free': 200,     // 10x increase
    'pro': 2000,     // 10x increase
    'premium': 10000, // 10x increase
  },
  '/api/stocks': {
    'free': 2000,    // 10x increase
    'pro': 15000,    // 10x increase
    'premium': 80000, // 10x increase
  },
};

export interface RateLimitOptions {
  redisUrl?: string;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  enableDistributed?: boolean;
  whitelistedIPs?: string[];
}

export class RateLimitMiddleware {
  private redisClient?: any;
  private memoryStore: Map<string, { count: number; resetTime: number; dailyCount: number; dailyResetTime: number; burstCount: number; burstResetTime: number }>;
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions = {}) {
    this.options = options;
    this.memoryStore = new Map();
    
    if (options.enableDistributed && options.redisUrl) {
      this.initializeRedis(options.redisUrl);
    }
  }

  private async initializeRedis(redisUrl: string) {
    try {
      // Skip Redis in production if not properly configured
      if (process.env.NODE_ENV === 'production' && redisUrl === 'redis://localhost:6379') {
        console.warn('⚠️ Rate limit middleware: Redis not configured for production, using memory only');
        return;
      }
      
      this.redisClient = createClient({ 
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
          connectTimeout: 10000
        }
      });
      
      this.redisClient.on('error', (err) => {
        console.error('❌ Rate limit Redis error:', err.message);
      });
      
      await this.redisClient.connect();
      console.log('✅ Rate limiting Redis client connected');
    } catch (error) {
      console.error('Failed to connect to Redis for rate limiting:', error);
      console.log('Falling back to in-memory rate limiting');
      this.redisClient = undefined;
    }
  }

  /**
   * Main rate limiting middleware
   */
  rateLimitByTier = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip rate limiting for whitelisted IPs
        if (this.options.whitelistedIPs?.includes(req.ip)) {
          return next();
        }

        // Get user subscription tier (fallback to free for unauthenticated users)
        const subscriptionTier: SubscriptionTier = req.user?.subscriptionTier || 'free';
        const userId = req.user?.id || req.ip;
        
        // Generate rate limit key
        const key = this.options.keyGenerator ? this.options.keyGenerator(req) : this.generateKey(req, userId);
        
        // Get rate limit configuration
        const rateLimitConfig = this.getRateLimitConfig(req.path, subscriptionTier);
        
        // Check rate limits
        const rateLimitResult = await this.checkRateLimit(key, rateLimitConfig, subscriptionTier);
        
        if (!rateLimitResult.allowed) {
          return this.rateLimitExceededResponse(res, rateLimitResult);
        }

        // Add rate limit headers
        this.addRateLimitHeaders(res, rateLimitResult);
        
        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Don't block requests on rate limiting errors
        next();
      }
    };
  };

  /**
   * Financial data specific rate limiting
   */
  financialDataRateLimit = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const subscriptionTier: SubscriptionTier = req.user?.subscriptionTier || 'free';
      const userId = req.user?.id || req.ip;
      
      // Special limits for financial data endpoints
      const financialLimits = {
        'free': { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
        'pro': { requests: 500, windowMs: 60 * 60 * 1000 }, // 500 per hour
        'premium': { requests: 2000, windowMs: 60 * 60 * 1000 }, // 2000 per hour
      };

      const key = `financial:${userId}`;
      const config = financialLimits[subscriptionTier];
      
      const rateLimitResult = await this.checkRateLimit(key, config, subscriptionTier);
      
      if (!rateLimitResult.allowed) {
        return this.rateLimitExceededResponse(res, rateLimitResult);
      }

      this.addRateLimitHeaders(res, rateLimitResult);
      next();
    };
  };

  /**
   * API endpoint specific rate limiting
   */
  endpointRateLimit = (endpoint: string, customLimits?: Partial<Record<SubscriptionTier, number>>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const subscriptionTier: SubscriptionTier = req.user?.subscriptionTier || 'free';
      const userId = req.user?.id || req.ip;
      
      const limits = customLimits || ENDPOINT_SPECIFIC_LIMITS[endpoint] || {};
      const requestLimit = limits[subscriptionTier] || RATE_LIMITS[subscriptionTier].requests;
      
      const config = {
        requests: requestLimit,
        windowMs: RATE_LIMITS[subscriptionTier].windowMs,
      };

      const key = `endpoint:${endpoint}:${userId}`;
      const rateLimitResult = await this.checkRateLimit(key, config, subscriptionTier);
      
      if (!rateLimitResult.allowed) {
        return this.rateLimitExceededResponse(res, rateLimitResult);
      }

      this.addRateLimitHeaders(res, rateLimitResult);
      next();
    };
  };

  /**
   * Burst protection middleware
   */
  burstProtection = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const subscriptionTier: SubscriptionTier = req.user?.subscriptionTier || 'free';
      const userId = req.user?.id || req.ip;
      
      const burstConfig = {
        requests: RATE_LIMITS[subscriptionTier].burstLimit,
        windowMs: 60 * 1000, // 1 minute window
      };

      const key = `burst:${userId}`;
      const rateLimitResult = await this.checkRateLimit(key, burstConfig, subscriptionTier);
      
      if (!rateLimitResult.allowed) {
        return this.rateLimitExceededResponse(res, {
          ...rateLimitResult,
          message: 'Too many requests in a short time. Please slow down.',
        });
      }

      next();
    };
  };

  /**
   * Generate rate limit key
   */
  private generateKey(req: Request, userId: string): string {
    const endpoint = req.path;
    const method = req.method;
    return `ratelimit:${method}:${endpoint}:${userId}`;
  }

  /**
   * Get rate limit configuration for specific endpoint and tier
   */
  private getRateLimitConfig(endpoint: string, tier: SubscriptionTier) {
    const baseConfig = RATE_LIMITS[tier];
    const endpointLimit = ENDPOINT_SPECIFIC_LIMITS[endpoint]?.[tier];
    
    return {
      ...baseConfig,
      requests: endpointLimit || baseConfig.requests,
    };
  }

  /**
   * Check rate limit against storage (Redis or memory)
   */
  private async checkRateLimit(key: string, config: any, tier: SubscriptionTier) {
    if (this.redisClient) {
      return this.checkRedisRateLimit(key, config, tier);
    } else {
      return this.checkMemoryRateLimit(key, config, tier);
    }
  }

  /**
   * Check rate limit using Redis
   */
  private async checkRedisRateLimit(key: string, config: any, tier: SubscriptionTier) {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const dailyWindowStart = now - (24 * 60 * 60 * 1000);

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redisClient.multi();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zremrangebyscore(`daily:${key}`, 0, dailyWindowStart);
      
      // Count current requests
      pipeline.zcard(key);
      pipeline.zcard(`daily:${key}`);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zadd(`daily:${key}`, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));
      pipeline.expire(`daily:${key}`, 24 * 60 * 60);
      
      const results = await pipeline.exec();
      
      const currentCount = results[2][1] as number;
      const dailyCount = results[3][1] as number;
      
      const allowed = currentCount <= config.requests && 
                     dailyCount <= RATE_LIMITS[tier].dailyLimit;
      
      return {
        allowed,
        count: currentCount + 1,
        limit: config.requests,
        remaining: Math.max(0, config.requests - currentCount - 1),
        resetTime: now + config.windowMs,
        dailyCount: dailyCount + 1,
        dailyLimit: RATE_LIMITS[tier].dailyLimit,
        dailyRemaining: Math.max(0, RATE_LIMITS[tier].dailyLimit - dailyCount - 1),
      };
    } catch (error) {
      console.error('Redis rate limit check failed:', error);
      // Fallback to memory store
      return this.checkMemoryRateLimit(key, config, tier);
    }
  }

  /**
   * Check rate limit using memory store
   */
  private checkMemoryRateLimit(key: string, config: any, tier: SubscriptionTier) {
    const now = Date.now();
    const record = this.memoryStore.get(key) || {
      count: 0,
      resetTime: now + config.windowMs,
      dailyCount: 0,
      dailyResetTime: now + (24 * 60 * 60 * 1000),
      burstCount: 0,
      burstResetTime: now + (60 * 1000),
    };

    // Reset counters if windows have expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + config.windowMs;
    }

    if (now > record.dailyResetTime) {
      record.dailyCount = 0;
      record.dailyResetTime = now + (24 * 60 * 60 * 1000);
    }

    if (now > record.burstResetTime) {
      record.burstCount = 0;
      record.burstResetTime = now + (60 * 1000);
    }

    // Increment counters
    record.count++;
    record.dailyCount++;
    record.burstCount++;

    // Check limits
    const allowed = record.count <= config.requests && 
                   record.dailyCount <= RATE_LIMITS[tier].dailyLimit &&
                   record.burstCount <= RATE_LIMITS[tier].burstLimit;

    // Update store
    this.memoryStore.set(key, record);

    return {
      allowed,
      count: record.count,
      limit: config.requests,
      remaining: Math.max(0, config.requests - record.count),
      resetTime: record.resetTime,
      dailyCount: record.dailyCount,
      dailyLimit: RATE_LIMITS[tier].dailyLimit,
      dailyRemaining: Math.max(0, RATE_LIMITS[tier].dailyLimit - record.dailyCount),
    };
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(res: Response, rateLimitResult: any) {
    res.set({
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
      'X-RateLimit-Daily-Limit': rateLimitResult.dailyLimit.toString(),
      'X-RateLimit-Daily-Remaining': rateLimitResult.dailyRemaining.toString(),
    });
  }

  /**
   * Send rate limit exceeded response
   */
  private rateLimitExceededResponse(res: Response, rateLimitResult: any) {
    this.addRateLimitHeaders(res, rateLimitResult);
    
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: rateLimitResult.message || 'Too many requests. Please try again later.',
      statusCode: 429,
      details: {
        limit: rateLimitResult.limit,
        current: rateLimitResult.count,
        remaining: rateLimitResult.remaining,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
        dailyLimit: rateLimitResult.dailyLimit,
        dailyRemaining: rateLimitResult.dailyRemaining,
      },
    });
  }

  /**
   * Clean up expired entries (for memory store)
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    
    for (const [key, record] of this.memoryStore.entries()) {
      if (now > record.dailyResetTime && now > record.resetTime) {
        this.memoryStore.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimitMiddleware = new RateLimitMiddleware({
  redisUrl: process.env.REDIS_URL || `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  enableDistributed: false, // Temporarily disable Redis for rate limiting due to compatibility issues
  whitelistedIPs: process.env.WHITELISTED_IPS?.split(',') || [],
});

// Clean up expired entries every hour
setInterval(() => {
  rateLimitMiddleware.cleanupExpiredEntries();
}, 60 * 60 * 1000);