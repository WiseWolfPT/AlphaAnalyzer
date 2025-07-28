/**
 * Centralized Response Handler Middleware
 * 
 * This middleware solves the "Cannot set headers after they are sent" error
 * by centralizing all response logging and monitoring logic.
 * 
 * Instead of wrapping res.send/res.json methods (which causes conflicts),
 * we use the 'on-finished' library to safely handle response completion.
 */

import { Request, Response, NextFunction } from 'express';
import onFinished from 'on-finished';
import log from '../lib/logger';

// Extend Express Request/Response types for our custom properties
declare module 'express-serve-static-core' {
  interface Response {
    locals: {
      startTime?: number;
      responseBody?: any;
      corsHeaders?: Record<string, string>;
      securityContext?: {
        userId?: string;
        endpoint?: string;
        method?: string;
      };
      proxyTarget?: string;
      authStatus?: {
        hasToken: boolean;
        tokenType?: string;
        isValid?: boolean;
      };
    };
  }
}

interface ResponseMetrics {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  origin?: string;
  corsHeaders?: Record<string, string>;
  securityContext?: any;
  proxyTarget?: string;
  authStatus?: any;
  errorMessage?: string;
}

/**
 * Initialize response tracking
 * This middleware should be one of the first middleware in the chain
 */
export const initializeResponseTracking = (req: Request, res: Response, next: NextFunction) => {
  // Initialize locals if not exists
  if (!res.locals) {
    res.locals = {};
  }
  
  // Track request start time
  res.locals.startTime = Date.now();
  
  // Initialize other tracking objects
  res.locals.corsHeaders = {};
  res.locals.securityContext = {
    endpoint: req.originalUrl,
    method: req.method
  };
  
  next();
};

/**
 * Track CORS headers being set
 * This replaces the wrapping in cors-debug.ts
 */
export const trackCorsHeaders = (req: Request, res: Response, next: NextFunction) => {
  const originalSetHeader = res.setHeader;
  
  res.setHeader = function(name: string, value: string | string[] | number) {
    const headerName = name.toLowerCase();
    
    // Track CORS headers
    if (headerName.startsWith('access-control-')) {
      if (!res.locals.corsHeaders) {
        res.locals.corsHeaders = {};
      }
      res.locals.corsHeaders[name] = String(value);
    }
    
    return originalSetHeader.call(this, name, value);
  };
  
  next();
};

/**
 * Track authentication status
 * This replaces the logic in auth-logging.ts
 */
export const trackAuthStatus = (req: Request, res: Response, next: NextFunction) => {
  if (!res.locals.authStatus) {
    res.locals.authStatus = {
      hasToken: false
    };
  }
  
  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    res.locals.authStatus = {
      hasToken: true,
      tokenType: parts[0],
      isValid: parts.length === 2
    };
  }
  
  // Track user context if available
  if ((req as any).user) {
    res.locals.securityContext.userId = (req as any).user.id;
  }
  
  next();
};

/**
 * Track proxy requests
 * This replaces the logic in auth-logging.ts proxyLoggingMiddleware
 */
export const trackProxyRequests = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/proxy/')) {
    res.locals.proxyTarget = req.path.replace('/api/proxy/', '');
  }
  
  next();
};

/**
 * Main response handler using on-finished
 * This should be added AFTER all route handlers but BEFORE error handlers
 */
export const centralizedResponseHandler = (req: Request, res: Response, next: NextFunction) => {
  // Use on-finished to safely handle response completion
  onFinished(res, (err, res) => {
    if (err) {
      log.error('Response finished with error', { error: err });
      return;
    }
    
    const responseTime = res.locals.startTime 
      ? Date.now() - res.locals.startTime 
      : 0;
    
    const metrics: ResponseMetrics = {
      requestId: (req as any).requestId || 'unknown',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      origin: req.headers.origin as string,
      corsHeaders: res.locals.corsHeaders,
      securityContext: res.locals.securityContext,
      proxyTarget: res.locals.proxyTarget,
      authStatus: res.locals.authStatus
    };
    
    // Log based on response status and context
    if (res.statusCode >= 500) {
      log.error('🚨 Server Error Response', metrics);
    } else if (res.statusCode >= 400) {
      if (res.statusCode === 401) {
        log.warn('🔒 Authentication Failed', {
          ...metrics,
          headers: {
            authorization: req.headers.authorization ? '[PRESENT]' : '[MISSING]',
            cookie: req.headers.cookie ? '[PRESENT]' : '[MISSING]',
            origin: req.headers.origin,
            referer: req.headers.referer
          }
        });
      } else {
        log.warn('⚠️ Client Error Response', metrics);
      }
    } else if (res.locals.proxyTarget) {
      log.debug('🔄 Proxy Request Completed', metrics);
    } else if (req.path.includes('/auth')) {
      log.debug('🔐 Auth Request Completed', metrics);
    } else if (req.method === 'OPTIONS') {
      log.debug('🌐 CORS Preflight Completed', metrics);
    } else {
      // Standard successful response
      if (process.env.NODE_ENV === 'development') {
        log.info(`${req.method} ${req.path} ${res.statusCode} in ${responseTime}ms`);
      }
    }
    
    // CORS validation logging
    if (res.locals.corsHeaders && Object.keys(res.locals.corsHeaders).length === 0 && req.headers.origin) {
      log.warn('⚠️ CORS headers missing for cross-origin request', {
        origin: req.headers.origin,
        path: req.path,
        method: req.method
      });
    }
  });
  
  next();
};

/**
 * Environment validation on first request
 * This replaces the logic in auth-logging.ts
 */
let environmentValidated = false;

export const validateEnvironmentOnce = (req: Request, res: Response, next: NextFunction) => {
  if (!environmentValidated) {
    environmentValidated = true;
    
    const envIssues: string[] = [];
    
    // Check critical environment variables
    if (!process.env.SUPABASE_URL) envIssues.push('SUPABASE_URL missing');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) envIssues.push('SUPABASE_SERVICE_ROLE_KEY missing');
    if (!process.env.JWT_SECRET) envIssues.push('JWT_SECRET missing');
    if (!process.env.NODE_ENV) envIssues.push('NODE_ENV not set');
    
    if (envIssues.length > 0) {
      log.error('⚠️ Environment Configuration Issues', {
        issues: envIssues,
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT
      });
    } else {
      log.info('✅ Environment Configuration Valid', {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        hasSupabase: true,
        hasJwt: true
      });
    }
  }
  
  next();
};

/**
 * Helper to capture response body if needed
 * Use sparingly as this can impact performance
 */
export const captureResponseBody = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  const originalSend = res.send;
  
  res.json = function(body: any) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };
  
  res.send = function(body: any) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Export all middleware in the correct order
 */
export const responseHandlerMiddleware = [
  validateEnvironmentOnce,
  initializeResponseTracking,
  trackCorsHeaders,
  trackAuthStatus,
  trackProxyRequests,
  // captureResponseBody, // Uncomment only if you need to log response bodies
  centralizedResponseHandler
];

// Default export for convenience
export default responseHandlerMiddleware;