import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Helper to get user identifier
const getUserIdentifier = (req: Request): string => {
  // Priority: authenticated user ID > API key > IP address
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `api:${apiKey}`;
  }
  
  // Fallback to IP
  return req.ip || 'unknown';
};

// Different rate limit tiers
export const rateLimitTiers = {
  // Strict limit for expensive operations
  strict: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserIdentifier,
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.user?.role === 'admin';
    }
  }),

  // Standard limit for regular API calls
  standard: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserIdentifier,
    skip: (req) => {
      return req.user?.role === 'admin';
    }
  }),

  // Relaxed limit for lightweight operations
  relaxed: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserIdentifier,
    skip: (req) => {
      return req.user?.role === 'admin';
    }
  }),

  // Special limit for batch operations
  batch: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20,
    message: 'Too many batch requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserIdentifier,
    skip: (req) => {
      return req.user?.role === 'admin';
    }
  })
};

// Route-specific rate limiters
export const createApiRateLimiter = (max: number, windowMinutes: number = 1) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    message: {
      success: false,
      error: `Rate limit exceeded. Maximum ${max} requests per ${windowMinutes} minute(s) allowed.`
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getUserIdentifier,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Maximum ${max} requests per ${windowMinutes} minute(s) allowed.`,
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Specific rate limiters for market data endpoints
export const marketDataRateLimiters = {
  // Real-time price endpoints
  price: createApiRateLimiter(isDevelopment ? 1000 : 100, 1), // 1000 in dev, 100 in prod requests per minute
  
  // Batch price endpoints
  batchPrice: createApiRateLimiter(isDevelopment ? 200 : 20, 5), // 200 in dev, 20 in prod batch requests per 5 minutes
  
  // Fundamentals (cached for 24h, so lower limit)
  fundamentals: createApiRateLimiter(isDevelopment ? 300 : 30, 1), // 300 in dev, 30 in prod requests per minute
  
  // Historical data (expensive)
  historical: createApiRateLimiter(isDevelopment ? 100 : 10, 1), // 100 in dev, 10 in prod requests per minute
  
  // Company info (cached for 7 days)
  company: createApiRateLimiter(isDevelopment ? 500 : 50, 1), // 500 in dev, 50 in prod requests per minute
  
  // News
  news: createApiRateLimiter(isDevelopment ? 300 : 30, 1), // 300 in dev, 30 in prod requests per minute
  
  // System status endpoints
  status: createApiRateLimiter(isDevelopment ? 100 : 10, 1) // 100 in dev, 10 in prod requests per minute
};