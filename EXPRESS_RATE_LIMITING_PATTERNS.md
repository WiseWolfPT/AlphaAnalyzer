# Express.js Rate Limiting Patterns for Financial APIs

This document provides comprehensive patterns for implementing rate limiting in Express.js applications, with a special focus on protecting financial API endpoints. It covers user-based rate limiting, subscription tier limits, Redis-backed solutions, and TypeScript middleware patterns.

## Table of Contents
1. [Basic Rate Limiting Setup](#basic-rate-limiting-setup)
2. [User-Based Rate Limiting](#user-based-rate-limiting)
3. [Subscription Tier Limits](#subscription-tier-limits)
4. [Redis-Backed Rate Limiting](#redis-backed-rate-limiting)
5. [API Endpoint Specific Limits](#api-endpoint-specific-limits)
6. [TypeScript Middleware Patterns](#typescript-middleware-patterns)
7. [Financial API Protection Strategies](#financial-api-protection-strategies)
8. [Advanced Patterns](#advanced-patterns)

## Basic Rate Limiting Setup

### Express Rate Limit (Basic Implementation)

```typescript
import { rateLimit } from 'express-rate-limit';
import { Express } from 'express';

// Basic rate limiter configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  standardHeaders: 'draft-8', // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Apply globally
app.use(limiter);

// Apply to specific routes
app.use('/api/auth', limiter);
```

### Headers and Response Information

```typescript
// Setting custom rate limit headers
const headers = {
  "Retry-After": rateLimiterRes.msBeforeNext / 1000,
  "X-RateLimit-Limit": opts.points,
  "X-RateLimit-Remaining": rateLimiterRes.remainingPoints,
  "X-RateLimit-Reset": Math.ceil((Date.now() + rateLimiterRes.msBeforeNext) / 1000)
};
```

## User-Based Rate Limiting

### Custom Key Generator for User Identification

```typescript
import { rateLimit } from 'express-rate-limit';

// User-based rate limiting using custom key generator
const userBasedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 1000, // 1000 requests per hour per user
  keyGenerator: (req, res) => {
    // Use user ID if authenticated, fallback to IP
    return req.user?.id?.toString() || req.ip;
  },
  skip: (req, res) => {
    // Skip rate limiting for admin users
    return req.user?.role === 'admin';
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      error: 'Rate limit exceeded',
      retryAfter: res.getHeader('Retry-After'),
      limit: res.getHeader('X-RateLimit-Limit'),
      remaining: res.getHeader('X-RateLimit-Remaining')
    });
  }
});
```

### Authentication-aware Rate Limiting

```typescript
// Apply different limits based on authentication status
app.use((req, res, next) => {
  // Determine user authentication status first
  if (req.headers.authorization) {
    req.isLoggedIn = true;
    // Extract user from token logic here
  } else {
    req.isLoggedIn = false;
  }
  next();
});

const authAwareLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req, res) => {
    if (req.isLoggedIn) return 500; // Higher limit for authenticated users
    return 100; // Lower limit for anonymous users
  },
  keyGenerator: (req, res) => {
    return req.isLoggedIn ? `user:${req.user.id}` : `ip:${req.ip}`;
  }
});
```

## Subscription Tier Limits

### Dynamic Limits Based on User Subscription

```typescript
interface UserSubscription {
  tier: 'free' | 'premium' | 'enterprise';
  customLimits?: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

const subscriptionBasedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: async (req, res) => {
    if (!req.user) return 50; // Anonymous users
    
    const subscription = await getUserSubscription(req.user.id);
    
    switch (subscription.tier) {
      case 'free':
        return 100;
      case 'premium':
        return 1000;
      case 'enterprise':
        return subscription.customLimits?.requestsPerHour || 10000;
      default:
        return 50;
    }
  },
  keyGenerator: (req, res) => `user:${req.user?.id || 'anonymous'}:${req.ip}`,
  message: async (req, res) => {
    const subscription = req.user ? await getUserSubscription(req.user.id) : null;
    return {
      error: 'Rate limit exceeded',
      currentTier: subscription?.tier || 'anonymous',
      upgradeMessage: subscription?.tier === 'free' 
        ? 'Upgrade to Premium for higher limits'
        : undefined
    };
  }
});

async function getUserSubscription(userId: string): Promise<UserSubscription> {
  // Implementation to fetch user subscription from database
  // This is a placeholder - implement according to your data layer
  return { tier: 'free' };
}
```

### Multi-tier Rate Limiting System

```typescript
// Different rate limiters for different tiers
const freeTierLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  keyGenerator: (req) => `free:${req.user.id}`,
});

const premiumTierLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 1000,
  keyGenerator: (req) => `premium:${req.user.id}`,
});

const enterpriseTierLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10000,
  keyGenerator: (req) => `enterprise:${req.user.id}`,
});

// Middleware to apply appropriate limiter
const tierBasedRateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return freeTierLimiter(req, res, next);
  }

  switch (req.user.subscription.tier) {
    case 'free':
      return freeTierLimiter(req, res, next);
    case 'premium':
      return premiumTierLimiter(req, res, next);
    case 'enterprise':
      return enterpriseTierLimiter(req, res, next);
    default:
      return freeTierLimiter(req, res, next);
  }
};
```

## Redis-Backed Rate Limiting

### Using node-rate-limiter-flexible with Redis

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

// Redis connection
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Redis-backed rate limiter
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl_financial_api', // Prefix for Redis keys
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
  execEvenly: true, // Spread requests evenly across duration
});

// Middleware implementation
const redisRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = `user:${req.user?.id || req.ip}`;
    await rateLimiter.consume(key);
    next();
  } catch (rateLimiterRes) {
    // Rate limit exceeded
    const remainingPoints = rateLimiterRes.remainingPoints || 0;
    const msBeforeNext = rateLimiterRes.msBeforeNext || 0;
    
    res.set({
      'Retry-After': Math.round(msBeforeNext / 1000),
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
    });
    
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.round(msBeforeNext / 1000),
    });
  }
};
```

### Upstash Redis Rate Limiting

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis client
const redis = Redis.fromEnv(); // Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

// Create rate limiter with sliding window
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10s"), // 10 requests per 10 seconds
  analytics: true,
  prefix: "@financial-api/ratelimit",
});

// Middleware for Express
const upstashRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identifier = req.user?.id || req.ip;
    const { success, limit, remaining, pending } = await ratelimit.limit(identifier);
    
    // Handle analytics in background
    req.on('close', () => {
      pending.catch(console.error);
    });
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Success': success.toString(),
    });
    
    if (!success) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit,
        remaining: 0,
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    next();
  }
};
```

### Redis-backed Multi-tier Rate Limiting

```typescript
class TieredRateLimiter {
  private limiters: Map<string, RateLimiterRedis>;
  
  constructor(private redisClient: Redis) {
    this.limiters = new Map();
    this.initializeLimiters();
  }
  
  private initializeLimiters() {
    // Free tier: 100 requests per hour
    this.limiters.set('free', new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'rl_free',
      points: 100,
      duration: 3600, // 1 hour
      blockDuration: 3600,
    }));
    
    // Premium tier: 1000 requests per hour
    this.limiters.set('premium', new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'rl_premium',
      points: 1000,
      duration: 3600,
      blockDuration: 1800, // Shorter block duration
    }));
    
    // Enterprise tier: 10000 requests per hour
    this.limiters.set('enterprise', new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'rl_enterprise',
      points: 10000,
      duration: 3600,
      blockDuration: 600, // Even shorter block duration
    }));
  }
  
  async checkLimit(userId: string, tier: string, ip: string): Promise<{
    allowed: boolean;
    remainingPoints?: number;
    msBeforeNext?: number;
    resetTime?: Date;
  }> {
    const limiter = this.limiters.get(tier) || this.limiters.get('free')!;
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    
    try {
      const result = await limiter.consume(key);
      return {
        allowed: true,
        remainingPoints: result.remainingPoints,
        resetTime: new Date(Date.now() + result.msBeforeNext),
      };
    } catch (rateLimiterRes) {
      return {
        allowed: false,
        remainingPoints: rateLimiterRes.remainingPoints || 0,
        msBeforeNext: rateLimiterRes.msBeforeNext || 0,
        resetTime: new Date(Date.now() + (rateLimiterRes.msBeforeNext || 0)),
      };
    }
  }
}

// Usage in Express middleware
const tieredLimiter = new TieredRateLimiter(redisClient);

const tieredRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const tier = req.user?.subscription?.tier || 'free';
  const ip = req.ip;
  
  const result = await tieredLimiter.checkLimit(userId, tier, ip);
  
  if (!result.allowed) {
    const retryAfter = Math.round((result.msBeforeNext || 0) / 1000);
    
    res.set({
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Remaining': (result.remainingPoints || 0).toString(),
      'X-RateLimit-Reset': result.resetTime?.toISOString() || '',
    });
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      tier,
      retryAfter,
      upgradeMessage: tier === 'free' ? 'Upgrade your plan for higher limits' : undefined,
    });
  }
  
  // Set success headers
  res.set({
    'X-RateLimit-Remaining': (result.remainingPoints || 0).toString(),
    'X-RateLimit-Reset': result.resetTime?.toISOString() || '',
  });
  
  next();
};
```

## API Endpoint Specific Limits

### Different Limits for Different Endpoints

```typescript
// High-security endpoints (authentication, payments)
const criticalEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Very restrictive
  keyGenerator: (req) => `critical:${req.ip}:${req.user?.id || 'anonymous'}`,
  message: {
    error: 'Too many attempts on sensitive endpoint',
    blockDuration: '15 minutes'
  }
});

// Transaction endpoints
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10, // 10 transactions per minute
  keyGenerator: (req) => `transaction:${req.user.id}`,
  skip: (req) => !req.user, // Only apply to authenticated users
});

// Read-only endpoints (account balance, transaction history)
const readOnlyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // More permissive
  keyGenerator: (req) => `readonly:${req.user?.id || req.ip}`,
});

// Apply specific limiters to routes
app.post('/api/auth/login', criticalEndpointLimiter);
app.post('/api/auth/register', criticalEndpointLimiter);
app.post('/api/payments/transfer', transactionLimiter);
app.get('/api/account/balance', readOnlyLimiter);
app.get('/api/account/transactions', readOnlyLimiter);
```

### Dynamic Rate Limiting Based on Endpoint Risk

```typescript
interface EndpointConfig {
  path: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  baseLimit: number;
  windowMs: number;
}

const endpointConfigs: EndpointConfig[] = [
  { path: '/api/account/balance', riskLevel: 'low', baseLimit: 100, windowMs: 60000 },
  { path: '/api/payments/transfer', riskLevel: 'critical', baseLimit: 5, windowMs: 300000 },
  { path: '/api/auth/login', riskLevel: 'high', baseLimit: 10, windowMs: 900000 },
];

const createDynamicRateLimit = (config: EndpointConfig) => {
  return rateLimit({
    windowMs: config.windowMs,
    limit: (req, res) => {
      const userTier = req.user?.subscription?.tier || 'free';
      const multiplier = userTier === 'enterprise' ? 2 : userTier === 'premium' ? 1.5 : 1;
      return Math.floor(config.baseLimit * multiplier);
    },
    keyGenerator: (req) => `${config.riskLevel}:${req.user?.id || req.ip}:${config.path}`,
    handler: (req, res, next, options) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        endpoint: config.path,
        riskLevel: config.riskLevel,
        retryAfter: res.getHeader('Retry-After'),
      });
    }
  });
};

// Apply dynamic rate limiting
endpointConfigs.forEach(config => {
  app.use(config.path, createDynamicRateLimit(config));
});
```

## TypeScript Middleware Patterns

### Type-Safe Rate Limiting Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  limit: number | ((req: Request) => number | Promise<number>);
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

interface ExtendedRequest extends Request {
  user?: {
    id: string;
    subscription: {
      tier: 'free' | 'premium' | 'enterprise';
    };
    role: string;
  };
  rateLimit?: {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
  };
}

class TypeSafeRateLimiter {
  private config: RateLimitConfig;
  private store: Map<string, { count: number; resetTime: number }>;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.store = new Map();
    this.cleanupExpiredEntries();
  }

  private cleanupExpiredEntries() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime <= now) {
          this.store.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  private async getLimit(req: ExtendedRequest): Promise<number> {
    if (typeof this.config.limit === 'function') {
      return await this.config.limit(req);
    }
    return this.config.limit;
  }

  private generateKey(req: ExtendedRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }
    return req.user?.id || req.ip;
  }

  middleware = async (req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = this.generateKey(req);
      const limit = await this.getLimit(req);
      const now = Date.now();
      const windowMs = this.config.windowMs;

      let entry = this.store.get(key);
      
      if (!entry || entry.resetTime <= now) {
        entry = { count: 0, resetTime: now + windowMs };
        this.store.set(key, entry);
      }

      entry.count++;
      const remaining = Math.max(0, limit - entry.count);
      const resetTime = new Date(entry.resetTime);

      // Add rate limit info to request
      req.rateLimit = {
        limit,
        current: entry.count,
        remaining,
        resetTime,
      };

      // Set headers
      res.set({
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toISOString(),
      });

      if (entry.count > limit) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.set('Retry-After', retryAfter.toString());

        if (this.config.onLimitReached) {
          this.config.onLimitReached(req, res);
        }

        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter,
          resetTime: resetTime.toISOString(),
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - continue processing
      next();
    }
  };
}

// Usage example
const financialApiLimiter = new TypeSafeRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: (req: ExtendedRequest) => {
    if (req.user?.role === 'admin') return 10000;
    if (req.user?.subscription.tier === 'enterprise') return 5000;
    if (req.user?.subscription.tier === 'premium') return 1000;
    return 100; // free tier
  },
  keyGenerator: (req: ExtendedRequest) => `financial:${req.user?.id || req.ip}`,
  onLimitReached: (req, res) => {
    console.log(`Rate limit exceeded for user: ${req.user?.id || req.ip}`);
  },
});

app.use('/api/financial', financialApiLimiter.middleware);
```

### Decorator Pattern for Rate Limiting

```typescript
interface RateLimitOptions {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

function RateLimit(options: RateLimitOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (req: ExtendedRequest, res: Response, next: NextFunction) {
      const key = `${options.keyPrefix || 'rl'}:${req.user?.id || req.ip}:${propertyName}`;
      
      // Rate limiting logic here
      const rateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: key,
        points: options.limit,
        duration: options.windowMs / 1000,
      });
      
      try {
        await rateLimiter.consume(key);
        return method.apply(this, [req, res, next]);
      } catch (rateLimiterRes) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          endpoint: propertyName,
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000),
        });
      }
    };
  };
}

// Usage with decorators
class FinancialController {
  @RateLimit({ limit: 10, windowMs: 60000, keyPrefix: 'transfer' })
  async transferMoney(req: ExtendedRequest, res: Response, next: NextFunction) {
    // Transfer money logic
  }
  
  @RateLimit({ limit: 100, windowMs: 60000, keyPrefix: 'balance' })
  async getBalance(req: ExtendedRequest, res: Response, next: NextFunction) {
    // Get balance logic
  }
}
```

## Financial API Protection Strategies

### Comprehensive Financial API Rate Limiting

```typescript
class FinancialApiRateLimiter {
  private transactionLimiter: RateLimiterRedis;
  private authLimiter: RateLimiterRedis;
  private readLimiter: RateLimiterRedis;
  private suspiciousActivityLimiter: RateLimiterRedis;

  constructor(redisClient: Redis) {
    // Transaction operations - very restrictive
    this.transactionLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'fin_tx',
      points: 10, // 10 transactions per hour
      duration: 3600,
      blockDuration: 1800, // 30 minute block
    });

    // Authentication attempts - prevent brute force
    this.authLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'fin_auth',
      points: 5, // 5 attempts per 15 minutes
      duration: 900,
      blockDuration: 1800,
    });

    // Read operations - more permissive
    this.readLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'fin_read',
      points: 100,
      duration: 3600,
      blockDuration: 300,
    });

    // Suspicious activity detection
    this.suspiciousActivityLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'fin_suspicious',
      points: 1, // One strike and you're out
      duration: 86400, // 24 hours
      blockDuration: 86400,
    });
  }

  async checkTransactionLimit(userId: string, amount: number): Promise<{
    allowed: boolean;
    reason?: string;
    blockDuration?: number;
  }> {
    try {
      // Higher amounts get more restrictive limits
      const key = amount > 10000 ? `${userId}:large` : `${userId}:normal`;
      await this.transactionLimiter.consume(key, amount > 10000 ? 3 : 1);
      return { allowed: true };
    } catch (rateLimiterRes) {
      return {
        allowed: false,
        reason: 'Transaction rate limit exceeded',
        blockDuration: rateLimiterRes.msBeforeNext,
      };
    }
  }

  async checkAuthenticationLimit(identifier: string): Promise<{
    allowed: boolean;
    attemptsRemaining?: number;
    blockDuration?: number;
  }> {
    try {
      const result = await this.authLimiter.consume(identifier);
      return {
        allowed: true,
        attemptsRemaining: result.remainingPoints,
      };
    } catch (rateLimiterRes) {
      return {
        allowed: false,
        attemptsRemaining: rateLimiterRes.remainingPoints || 0,
        blockDuration: rateLimiterRes.msBeforeNext,
      };
    }
  }

  async reportSuspiciousActivity(identifier: string, activity: string): Promise<void> {
    try {
      await this.suspiciousActivityLimiter.consume(`${identifier}:${activity}`);
    } catch {
      // User is now blocked for suspicious activity
      console.warn(`Suspicious activity detected: ${activity} for ${identifier}`);
    }
  }
}

// Middleware implementation
const financialLimiter = new FinancialApiRateLimiter(redisClient);

const transactionRateLimit = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const amount = req.body?.amount || 0;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const result = await financialLimiter.checkTransactionLimit(userId, amount);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: result.reason,
      retryAfter: Math.round((result.blockDuration || 0) / 1000),
    });
  }

  next();
};

const authRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.body?.email || req.ip;
  const result = await financialLimiter.checkAuthenticationLimit(identifier);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many authentication attempts',
      attemptsRemaining: result.attemptsRemaining,
      retryAfter: Math.round((result.blockDuration || 0) / 1000),
    });
  }

  next();
};
```

### Anomaly Detection and Adaptive Rate Limiting

```typescript
interface UserBehaviorPattern {
  userId: string;
  avgRequestsPerHour: number;
  peakHours: number[];
  commonEndpoints: string[];
  riskScore: number;
}

class AdaptiveRateLimiter {
  private behaviorStore: Map<string, UserBehaviorPattern>;
  private baseLimiter: RateLimiterRedis;

  constructor(redisClient: Redis) {
    this.behaviorStore = new Map();
    this.baseLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'adaptive_rl',
      points: 100,
      duration: 3600,
    });
  }

  private async getUserBehaviorPattern(userId: string): Promise<UserBehaviorPattern> {
    // In real implementation, this would fetch from a database
    return this.behaviorStore.get(userId) || {
      userId,
      avgRequestsPerHour: 50,
      peakHours: [9, 10, 11, 14, 15, 16],
      commonEndpoints: ['/api/account/balance'],
      riskScore: 0.5,
    };
  }

  private calculateDynamicLimit(pattern: UserBehaviorPattern, currentHour: number): number {
    let baseLimit = pattern.avgRequestsPerHour * 2; // 2x normal usage
    
    // Increase limit during user's peak hours
    if (pattern.peakHours.includes(currentHour)) {
      baseLimit *= 1.5;
    }
    
    // Decrease limit for high-risk users
    if (pattern.riskScore > 0.7) {
      baseLimit *= 0.5;
    }
    
    return Math.floor(baseLimit);
  }

  async checkAdaptiveLimit(userId: string, endpoint: string): Promise<{
    allowed: boolean;
    dynamicLimit: number;
    riskScore: number;
  }> {
    const pattern = await this.getUserBehaviorPattern(userId);
    const currentHour = new Date().getHours();
    const dynamicLimit = this.calculateDynamicLimit(pattern, currentHour);
    
    // Update base limiter with dynamic limit
    this.baseLimiter.points = dynamicLimit;
    
    try {
      await this.baseLimiter.consume(`${userId}:${endpoint}`);
      return {
        allowed: true,
        dynamicLimit,
        riskScore: pattern.riskScore,
      };
    } catch {
      return {
        allowed: false,
        dynamicLimit,
        riskScore: pattern.riskScore,
      };
    }
  }

  // Update user behavior pattern based on request
  updateBehaviorPattern(userId: string, endpoint: string) {
    // Implementation would update patterns in database
    // This is simplified for example purposes
  }
}
```

## Advanced Patterns

### Circuit Breaker Pattern with Rate Limiting

```typescript
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

class CircuitBreakerRateLimit {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 60000; // 1 minute
  private rateLimiter: RateLimiterRedis;

  constructor(redisClient: Redis, points: number, duration: number) {
    this.rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      points,
      duration,
    });
  }

  async execute(key: string): Promise<{ allowed: boolean; circuitOpen: boolean }> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        return { allowed: false, circuitOpen: true };
      }
    }

    try {
      await this.rateLimiter.consume(key);
      
      // Reset failure count on success
      if (this.state === CircuitState.HALF_OPEN) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }
      
      return { allowed: true, circuitOpen: false };
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
      
      return { allowed: false, circuitOpen: this.state === CircuitState.OPEN };
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### Distributed Rate Limiting with Leader Election

```typescript
class DistributedRateLimit {
  private redisClient: Redis;
  private instanceId: string;
  private isLeader = false;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
    this.instanceId = `instance:${Date.now()}:${Math.random()}`;
    this.startLeaderElection();
  }

  private async startLeaderElection() {
    setInterval(async () => {
      try {
        const result = await this.redisClient.set(
          'rate_limit_leader',
          this.instanceId,
          'PX', 5000, // 5 second TTL
          'NX' // Only set if not exists
        );
        this.isLeader = result === 'OK';
      } catch (error) {
        this.isLeader = false;
      }
    }, 2000);
  }

  async checkGlobalLimit(key: string, limit: number, window: number): Promise<boolean> {
    if (!this.isLeader) {
      // Non-leader instances use local rate limiting with higher limits
      return true; // Simplified - implement local rate limiting
    }

    // Leader instance enforces global rate limits
    const currentCount = await this.redisClient.incr(`global_rl:${key}`);
    
    if (currentCount === 1) {
      await this.redisClient.expire(`global_rl:${key}`, window);
    }

    return currentCount <= limit;
  }
}
```

## Best Practices for Financial APIs

### 1. Layered Rate Limiting Strategy

```typescript
// Multiple layers of protection
const financialApiProtection = [
  // Layer 1: IP-based protection (DDoS)
  rateLimit({
    windowMs: 60 * 1000,
    limit: 1000,
    keyGenerator: (req) => req.ip,
  }),
  
  // Layer 2: User-based protection
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: (req) => req.user?.subscription?.tier === 'enterprise' ? 10000 : 1000,
    keyGenerator: (req) => `user:${req.user?.id}`,
  }),
  
  // Layer 3: Endpoint-specific protection
  (req: Request, res: Response, next: NextFunction) => {
    const endpointLimits: Record<string, any> = {
      '/api/payments/transfer': rateLimit({ windowMs: 300000, limit: 5 }),
      '/api/auth/login': rateLimit({ windowMs: 900000, limit: 10 }),
    };
    
    const limiter = endpointLimits[req.path];
    if (limiter) {
      return limiter(req, res, next);
    }
    next();
  }
];

app.use('/api', ...financialApiProtection);
```

### 2. Monitoring and Alerting

```typescript
class RateLimitMonitor {
  private alertThresholds = {
    highVolumeUser: 1000, // requests per hour
    suspiciousIP: 100, // requests per minute
    authFailures: 10, // failed attempts per 15 minutes
  };

  async logRateLimitEvent(event: {
    type: 'limit_exceeded' | 'suspicious_activity' | 'high_volume';
    identifier: string;
    endpoint: string;
    count: number;
    timestamp: Date;
  }) {
    // Log to monitoring system
    console.log('Rate limit event:', event);
    
    // Send alerts if thresholds exceeded
    if (event.count > this.alertThresholds.highVolumeUser) {
      await this.sendAlert('High volume user detected', event);
    }
  }

  private async sendAlert(message: string, event: any) {
    // Implementation for alerting system (Slack, email, PagerDuty, etc.)
  }
}
```

### 3. Graceful Degradation

```typescript
const gracefulRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try primary rate limiting with Redis
    await primaryRateLimiter.consume(req.user.id);
    next();
  } catch (primaryError) {
    try {
      // Fallback to in-memory rate limiting
      await fallbackRateLimiter.consume(req.user.id);
      console.warn('Using fallback rate limiter');
      next();
    } catch (fallbackError) {
      // Still enforce some basic rate limiting
      res.status(429).json({
        error: 'Service temporarily unavailable',
        retryAfter: 60,
      });
    }
  }
};
```

This comprehensive guide provides robust patterns for implementing rate limiting in Express.js applications with a focus on financial API security. The patterns can be adapted and combined based on specific requirements and risk profiles.