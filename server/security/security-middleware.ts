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

// Rate limiting configurations for different endpoints
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Log rate limit violations for security monitoring
      console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    },
  });
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

// Security headers configuration using Helmet
export const securityHeaders = helmet({
  // Content Security Policy for financial applications
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "https://financialmodelingprep.com",
        "https://www.alphavantage.co",
        "https://finnhub.io",
        "https://cloud.iexapis.com",
        "wss:", // For WebSocket connections
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Prevent clickjacking
    },
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // Prevent MIME sniffing
  noSniff: true,
  
  // X-Frame-Options to prevent clickjacking
  frameguard: { action: 'deny' },
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
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
  // Add financial-specific headers
  res.setHeader('X-Financial-Data', 'true');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
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

// CORS configuration for financial applications
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In production, maintain a whitelist of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'https://yourapp.com',
      // Add your production domains here
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
};

// Error handling middleware for security
export const securityErrorHandler = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Log security-related errors
  if (err.message && err.message.includes('CORS')) {
    console.warn(`🚨 CORS violation from ${req.ip} attempting to access ${req.path}`);
    return res.status(403).json({
      error: 'Access denied',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    requestId: (req as any).requestId,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: err.stack }),
  });
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