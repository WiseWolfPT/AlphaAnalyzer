/**
 * Comprehensive Security Configuration for Alfalyzer
 * Phase 8: Security & Rate Limiting Implementation
 * 
 * This file consolidates all security configurations including:
 * - Rate limiting
 * - Helmet.js security headers
 * - CORS configuration
 * - Input validation
 * - SQL injection prevention
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

/**
 * API Rate Limiter - General endpoints
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Auth Rate Limiter - Authentication endpoints
 * 5 attempts per 15 minutes per IP (strict for security)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful auth
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Account temporarily locked for security. Please try again in 15 minutes.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Market Data Rate Limiter - Financial data endpoints
 * 60 requests per minute per IP (balanced for real-time data)
 */
export const marketDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many market data requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for cached responses
    return req.headers['x-cache-hit'] === 'true';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many market data requests. Consider upgrading your plan for higher limits.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Search Rate Limiter - Search endpoints
 * 30 requests per minute per IP
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Batch Operations Rate Limiter - Batch API endpoints
 * 10 requests per 5 minutes per IP (expensive operations)
 */
export const batchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: 'Too many batch operations, please wait before trying again',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// HELMET.JS SECURITY HEADERS
// ============================================

/**
 * Helmet configuration for comprehensive security headers
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React
        "'unsafe-eval'", // Required for development (remove in production)
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://financialmodelingprep.com",
        "https://www.alphavantage.co",
        "wss://128.140.45.28.sslip.io", // WebSocket for real-time data
        process.env.NODE_ENV === 'development' ? "ws://localhost:*" : "",
      ].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disabled for external API calls
  
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: true },
  
  // Frameguard - Prevent clickjacking
  frameguard: { action: 'deny' },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HSTS - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff - Prevent MIME type sniffing
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // XSS Filter
  xssFilter: true,
});

// ============================================
// CORS CONFIGURATION
// ============================================

/**
 * CORS configuration for cross-origin requests
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'https://128.140.45.28.sslip.io',
      'https://alfalyzer.com', // Future production domain
      'https://www.alfalyzer.com', // Future production domain
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Development mode - allow localhost
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // Cache preflight for 24 hours
};

// ============================================
// INPUT VALIDATION SCHEMAS
// ============================================

/**
 * Common validation schemas using Zod
 */
export const validationSchemas = {
  // Stock symbol validation
  stockSymbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .regex(/^[A-Z0-9.-]+$/, 'Invalid symbol format')
    .transform(val => val.toUpperCase()),
  
  // Email validation
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
  
  // Pagination validation
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['asc', 'desc']).optional(),
    orderBy: z.string().optional(),
  }),
  
  // Date range validation
  dateRange: z.object({
    from: z.string().datetime().or(z.date()),
    to: z.string().datetime().or(z.date()),
  }).refine(data => new Date(data.from) <= new Date(data.to), {
    message: 'From date must be before or equal to To date',
  }),
  
  // Portfolio transaction validation
  transaction: z.object({
    symbol: z.string().regex(/^[A-Z0-9.-]+$/),
    type: z.enum(['buy', 'sell']),
    quantity: z.number().positive(),
    price: z.number().positive(),
    date: z.string().datetime().or(z.date()),
    fees: z.number().nonnegative().optional(),
    notes: z.string().max(500).optional(),
  }),
  
  // Watchlist validation
  watchlist: z.object({
    name: z.string().min(1).max(100),
    symbols: z.array(z.string().regex(/^[A-Z0-9.-]+$/)).max(100),
    description: z.string().max(500).optional(),
  }),
};

// ============================================
// INPUT SANITIZATION MIDDLEWARE
// ============================================

/**
 * Middleware to sanitize and validate input
 */
export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        // Remove any HTML tags
        req.query[key] = (req.query[key] as string)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
    });
  }
  
  // Sanitize body parameters
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          // Remove any HTML tags and script injections
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      });
    };
    sanitizeObject(req.body);
  }
  
  next();
};

// ============================================
// SQL INJECTION PREVENTION
// ============================================

/**
 * SQL injection prevention utilities
 */
export const sqlInjectionPrevention = {
  /**
   * Sanitize string for SQL queries
   */
  sanitizeString: (input: string): string => {
    return input
      .replace(/['";\\]/g, '') // Remove dangerous characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comments
      .replace(/\*\//g, '')
      .replace(/\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b/gi, '') // Remove SQL keywords
      .trim();
  },
  
  /**
   * Validate and sanitize order by field
   */
  sanitizeOrderBy: (field: string, allowedFields: string[]): string | null => {
    const sanitized = field.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return allowedFields.includes(sanitized) ? sanitized : null;
  },
  
  /**
   * Escape special characters for LIKE queries
   */
  escapeLike: (input: string): string => {
    return input
      .replace(/[%_]/g, '\\$&') // Escape wildcards
      .replace(/['";\\]/g, ''); // Remove dangerous characters
  },
};

// ============================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================

/**
 * Create validation middleware for specific schema
 */
export const createValidator = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (req.body) {
        req.body = schema.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(500).json({ error: 'Internal validation error' });
      }
    }
  };
};

// ============================================
// SECURITY AUDIT LOGGING
// ============================================

/**
 * Log security events for audit trail
 */
export const securityLogger = {
  logRateLimit: (ip: string, endpoint: string) => {
    console.warn(`[SECURITY] Rate limit exceeded - IP: ${ip}, Endpoint: ${endpoint}, Time: ${new Date().toISOString()}`);
  },
  
  logAuthFailure: (email: string, ip: string) => {
    console.warn(`[SECURITY] Authentication failed - Email: ${email}, IP: ${ip}, Time: ${new Date().toISOString()}`);
  },
  
  logSuspiciousActivity: (type: string, details: any) => {
    console.error(`[SECURITY] Suspicious activity detected - Type: ${type}, Details: ${JSON.stringify(details)}, Time: ${new Date().toISOString()}`);
  },
  
  logValidationFailure: (endpoint: string, errors: any) => {
    console.warn(`[SECURITY] Validation failed - Endpoint: ${endpoint}, Errors: ${JSON.stringify(errors)}, Time: ${new Date().toISOString()}`);
  },
};

// ============================================
// EXPORT ALL SECURITY CONFIGURATIONS
// ============================================

export default {
  // Rate limiters
  apiLimiter,
  authLimiter,
  marketDataLimiter,
  searchLimiter,
  batchLimiter,
  
  // Security headers
  helmetConfig,
  
  // CORS
  corsConfig,
  
  // Validation
  validationSchemas,
  createValidator,
  
  // Sanitization
  inputSanitizer,
  sqlInjectionPrevention,
  
  // Logging
  securityLogger,
};