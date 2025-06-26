/**
 * Security Middleware for Financial SaaS Application
 * 
 * Implements comprehensive security headers, rate limiting,
 * input validation, and audit logging for financial data protection.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import crypto from 'crypto';

// SECURITY FIX: Multi-factor rate limiting with IP, user, and token tracking
interface RateLimitState {
  ip: Map<string, { count: number; resetTime: number }>;
  user: Map<string, { count: number; resetTime: number }>;
  global: { count: number; resetTime: number };
}

const rateLimitState: RateLimitState = {
  ip: new Map(),
  user: new Map(),
  global: { count: 0, resetTime: Date.now() + 15 * 60 * 1000 },
};

// SECURITY FIX: Enhanced rate limiting with multiple factors
const createMultiFactorRateLimiter = (
  windowMs: number, 
  limits: { ip: number; user: number; global: number }, 
  message: string
) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const clientIp = req.ip || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    const resetTime = now + windowMs;
    
    // SECURITY FIX: Clean expired entries
    if (now > rateLimitState.global.resetTime) {
      rateLimitState.global = { count: 0, resetTime };
      rateLimitState.ip.clear();
      rateLimitState.user.clear();
    }
    
    // SECURITY FIX: Check global rate limit
    rateLimitState.global.count++;
    if (rateLimitState.global.count > limits.global) {
      console.warn(`Global rate limit exceeded: ${rateLimitState.global.count}/${limits.global}`);
      return sendRateLimitResponse(res, 'Global rate limit exceeded', windowMs, limits.global, 0);
    }
    
    // SECURITY FIX: Check IP-based rate limit
    const ipState = rateLimitState.ip.get(clientIp) || { count: 0, resetTime };
    if (now > ipState.resetTime) {
      ipState.count = 0;
      ipState.resetTime = resetTime;
    }
    ipState.count++;
    rateLimitState.ip.set(clientIp, ipState);
    
    if (ipState.count > limits.ip) {
      console.warn(`IP rate limit exceeded for ${clientIp}: ${ipState.count}/${limits.ip}`);
      return sendRateLimitResponse(res, `${message} (IP limit)`, windowMs, limits.ip, 0);
    }
    
    // SECURITY FIX: Check user-based rate limit (if authenticated)
    if (userId !== 'anonymous') {
      const userState = rateLimitState.user.get(userId) || { count: 0, resetTime };
      if (now > userState.resetTime) {
        userState.count = 0;
        userState.resetTime = resetTime;
      }
      userState.count++;
      rateLimitState.user.set(userId, userState);
      
      if (userState.count > limits.user) {
        console.warn(`User rate limit exceeded for ${userId}: ${userState.count}/${limits.user}`);
        return sendRateLimitResponse(res, `${message} (User limit)`, windowMs, limits.user, 0);
      }
      
      // Send success headers with remaining quota
      res.setHeader('X-RateLimit-Limit-User', limits.user.toString());
      res.setHeader('X-RateLimit-Remaining-User', (limits.user - userState.count).toString());
    }
    
    // SECURITY FIX: Set comprehensive rate limit headers
    res.setHeader('X-RateLimit-Limit-IP', limits.ip.toString());
    res.setHeader('X-RateLimit-Remaining-IP', (limits.ip - ipState.count).toString());
    res.setHeader('X-RateLimit-Limit-Global', limits.global.toString());
    res.setHeader('X-RateLimit-Remaining-Global', (limits.global - rateLimitState.global.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
    
    next();
  };
};

// SECURITY FIX: Helper function for consistent rate limit responses
function sendRateLimitResponse(
  res: express.Response, 
  message: string, 
  windowMs: number, 
  limit: number, 
  remaining: number
) {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
  res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
  
  res.status(429).json({
    error: message,
    retryAfter: Math.ceil(windowMs / 1000),
    rateLimitReset: new Date(Date.now() + windowMs).toISOString(),
    timestamp: new Date().toISOString(),
    limits: {
      window: Math.ceil(windowMs / 1000) + ' seconds',
      limit,
      remaining,
    }
  });
}

// SECURITY FIX: Legacy rate limiter for backward compatibility
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return createMultiFactorRateLimiter(windowMs, { ip: max, user: max * 2, global: max * 10 }, message);
};

// Different rate limits for different types of operations
export const rateLimiters = {
  // General API rate limiting - 100 requests per 15 minutes
  general: createRateLimiter(15 * 60 * 1000, 100, 'Too many requests. Please try again later.'),
  
  // Financial data access - more restrictive - 50 requests per 15 minutes
  financial: createRateLimiter(15 * 60 * 1000, 50, 'Too many financial data requests. Please upgrade your plan or wait.'),
  
  // Authentication endpoints - very restrictive - 5 attempts per 15 minutes
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts. Account temporarily locked.'),
  
  // Stock search - moderate - 200 requests per 15 minutes
  search: createRateLimiter(15 * 60 * 1000, 200, 'Too many search requests. Please slow down.'),
};

// SECURITY FIX: Consolidated and enhanced security headers configuration
export const securityHeaders = helmet({
  // SECURITY FIX: Single, comprehensive Content Security Policy for financial applications
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // SECURITY NOTE: Consider using nonces instead of unsafe-inline in production
        process.env.NODE_ENV === 'development' ? "'unsafe-inline'" : "'self'",
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Required for CSS-in-JS libraries like styled-components
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "data:" // For base64 encoded fonts
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", // Allow HTTPS images from any domain
        "blob:" // For dynamically generated images
      ],
      connectSrc: [
        "'self'",
        // SECURITY: Financial API endpoints (backend proxy only)
        "wss://localhost:*", // WebSocket connections in development
        "ws://localhost:*", // WebSocket connections in development
        ...(process.env.NODE_ENV === 'production' ? [
          "wss:", // HTTPS WebSocket in production
        ] : [])
      ],
      objectSrc: ["'none'"], // Disable plugins completely
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Prevent clickjacking completely
      baseUri: ["'self'"], // Prevent base tag injection
      formAction: ["'self'"], // Restrict form submissions
    },
  },
  
  // SECURITY FIX: Enhanced HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true, // Include in HSTS preload list
  },
  
  // SECURITY FIX: Prevent MIME type sniffing attacks
  noSniff: true,
  
  // SECURITY FIX: Prevent clickjacking attacks
  frameguard: { action: 'deny' },
  
  // SECURITY FIX: XSS Protection (legacy but still useful)
  xssFilter: true,
  
  // SECURITY FIX: Control referrer information
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // SECURITY FIX: Remove server fingerprinting
  hidePoweredBy: true,
  
  // SECURITY FIX: Additional security headers for financial applications
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? { policy: "require-corp" } : false,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // SECURITY FIX: Prevent DNS prefetching for privacy
  dnsPrefetchControl: { allow: false },
  
  // SECURITY FIX: Download protection
  ieNoOpen: true,
  
  // SECURITY FIX: Prevent MIME confusion attacks
  permittedCrossDomainPolicies: false,
});

// Input validation schemas
export const validationSchemas = {
  stockSymbol: z.string()
    .min(1, 'Stock symbol is required')
    .max(10, 'Stock symbol too long')
    .regex(/^[A-Z]+$/, 'Stock symbol must contain only uppercase letters'),
    
  financialData: z.object({
    symbol: z.string().regex(/^[A-Z]{1,10}$/, 'Invalid stock symbol'),
    period: z.enum(['annual', 'quarterly']).optional(),
    limit: z.number().min(1).max(100).optional(),
  }),
  
  userInput: z.string()
    .max(1000, 'Input too long')
    .refine(
      (val) => !/<script|javascript:|data:/i.test(val),
      'Potentially malicious input detected'
    ),
};

// Request sanitization middleware
export const sanitizeInput = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Sanitize query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = sanitizeString(req.query[key] as string);
    }
  }
  
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// String sanitization function
function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Object sanitization function
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

// Request validation middleware factory
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const data = { ...req.query, ...req.body, ...req.params };
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
          timestamp: new Date().toISOString(),
        });
      }
      next(error);
    }
  };
};

// Security audit logging middleware
export const auditLogger = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Add request ID to request object for tracing
  (req as any).requestId = requestId;
  
  // Log request
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    // Don't log sensitive data like API keys or passwords
    query: sanitizeForLogging(req.query),
    body: sanitizeForLogging(req.body),
  };
  
  console.log('🔒 Security Audit:', JSON.stringify(logData));
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`🔒 Security Audit Response: ${requestId} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// Sanitize data for logging (remove sensitive information)
function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveKeys = ['password', 'apikey', 'api_key', 'token', 'secret', 'authorization'];
  const sanitized: any = {};
  
  for (const key in data) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = data[key];
    }
  }
  
  return sanitized;
}

// Financial data specific security middleware
export const financialDataSecurity = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // SECURITY FIX: Enhanced financial-specific headers
  res.setHeader('X-Financial-Data', 'true');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // SECURITY FIX: Additional financial security headers
  res.setHeader('X-Financial-Service-Version', '1.0');
  res.setHeader('X-Data-Classification', 'financial');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // SECURITY FIX: Financial compliance headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Validate that financial data requests have proper authorization
  // In a production environment, this would check JWT tokens, API keys, etc.
  const hasAuth = req.headers.authorization || req.query.apikey;
  if (!hasAuth) {
    return res.status(401).json({
      error: 'Authentication required for financial data access',
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};

// SECURITY FIX: Enhanced CORS configuration for financial applications
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // SECURITY FIX: Environment-specific allowed origins
    const productionOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    const developmentOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
    ];
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? productionOrigins 
      : [...developmentOrigins, ...productionOrigins];
    
    // SECURITY FIX: Be more restrictive with no-origin requests in production
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        // Only allow no-origin requests for specific endpoints in production
        return callback(new Error('Origin header required in production'), false);
      }
      return callback(null, true);
    }
    
    // SECURITY FIX: Validate origin format
    try {
      const originUrl = new URL(origin);
      
      // SECURITY FIX: Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production' && originUrl.protocol !== 'https:') {
        console.warn(`🚨 CORS: Rejecting non-HTTPS origin in production: ${origin}`);
        return callback(new Error('HTTPS required in production'), false);
      }
      
      // SECURITY FIX: Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`🚨 CORS: Rejecting unauthorized origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      }
    } catch (error) {
      console.warn(`🚨 CORS: Invalid origin format: ${origin}`);
      return callback(new Error('Invalid origin format'), false);
    }
  },
  
  // SECURITY FIX: Enhanced credentials and methods configuration
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token',
    'X-Request-ID',
    'X-API-Version',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
    'X-API-Version',
  ],
  maxAge: 86400, // 24 hours for preflight cache
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false, // Pass control to next handler
};

// SECURITY FIX: Enhanced error handling middleware with standardized responses
export const securityErrorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requestId = (req as any).requestId || 'unknown';
  
  // SECURITY FIX: Log all errors for security monitoring
  console.error('Security Error Handler:', {
    error: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId,
    timestamp: new Date().toISOString(),
  });
  
  // SECURITY FIX: Handle specific security errors with appropriate responses
  if (err.message && err.message.includes('CORS')) {
    console.warn(`🚨 CORS violation from ${req.ip} attempting to access ${req.path}`);
    return res.status(403).json({
      error: 'CORS_VIOLATION',
      message: 'Access denied due to CORS policy',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  
  // SECURITY FIX: Handle CSRF errors
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'CSRF_TOKEN_INVALID',
      message: 'Invalid or missing CSRF token',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  
  // SECURITY FIX: Handle rate limiting errors
  if (err.message && err.message.includes('rate limit')) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  
  // SECURITY FIX: Handle validation errors
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      timestamp: new Date().toISOString(),
      requestId,
      ...(isDevelopment && { details: err.issues || err.errors }),
    });
  }
  
  // SECURITY FIX: Handle authentication errors
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication credentials required',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  
  // SECURITY FIX: Handle authorization errors
  if (err.status === 403) {
    return res.status(403).json({
      error: 'ACCESS_FORBIDDEN',
      message: 'Insufficient permissions',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
  
  // SECURITY FIX: Default error response with security-safe messaging
  const status = err.status || err.statusCode || 500;
  const errorResponse: any = {
    error: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
    message: status >= 500 
      ? 'An internal error occurred. Please try again later.'
      : 'The request could not be processed',
    timestamp: new Date().toISOString(),
    requestId,
  };
  
  // SECURITY FIX: Only include sensitive details in development
  if (isDevelopment) {
    errorResponse.details = {
      originalError: err.message,
      stack: err.stack,
      name: err.name,
    };
  }
  
  res.status(status).json(errorResponse);
};

// Content Security Policy nonce generator
export const generateCSPNonce = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  (res as any).locals.nonce = nonce;
  res.setHeader('Content-Security-Policy', 
    `script-src 'self' 'nonce-${nonce}'; object-src 'none';`
  );
  next();
};