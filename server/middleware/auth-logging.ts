// Middleware for detailed auth and CORS logging
import { Request, Response, NextFunction } from 'express';
import log from '../lib/logger';

// Auth logging middleware
export const authLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Log all auth-related requests
  if (req.path.includes('/auth') || req.path.includes('/login') || req.path.includes('/logout')) {
    log.debug('🔐 Auth Request', {
      path: req.path,
      method: req.method,
      headers: {
        authorization: req.headers.authorization ? '[PRESENT]' : '[MISSING]',
        cookie: req.headers.cookie ? '[PRESENT]' : '[MISSING]',
        origin: req.headers.origin,
        referer: req.headers.referer,
      },
      body: req.method !== 'GET' ? { ...req.body, password: '[REDACTED]' } : undefined,
    });
  }
  
  // Monitor authorization headers
  if (req.headers.authorization) {
    const authType = req.headers.authorization.split(' ')[0];
    log.debug('🔑 Authorization Header', {
      type: authType,
      path: req.path,
      valid: req.headers.authorization.split(' ').length === 2,
    });
  }
  
  next();
};

// CORS logging middleware
export const corsLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || 'NO_ORIGIN';
  
  // Log CORS preflight requests
  if (req.method === 'OPTIONS') {
    log.debug('🌐 CORS Preflight', {
      origin,
      requestedMethod: req.headers['access-control-request-method'],
      requestedHeaders: req.headers['access-control-request-headers'],
      path: req.path,
    });
  }
  
  // Log cross-origin requests
  if (origin !== 'NO_ORIGIN') {
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isVercel = origin.includes('vercel.app');
    const isProduction = origin === process.env.PRODUCTION_URL;
    
    log.debug('🌍 Cross-Origin Request', {
      origin,
      isLocalhost,
      isVercel,
      isProduction,
      path: req.path,
      method: req.method,
    });
  }
  
  // Store CORS info in res.locals for logging
  res.locals.corsInfo = {
    origin: req.headers.origin,
    method: req.method,
    path: req.path
  };
  
  next();
};

// 401 Error logging middleware
export const unauthorizedLoggingMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.statusCode === 401 || err.status === 401 || err.statusCode === 401) {
    log.error('🚨 401 Unauthorized - Detailed Analysis', {
      path: req.path,
      method: req.method,
      headers: {
        authorization: req.headers.authorization ? '[PRESENT]' : '[MISSING]',
        cookie: req.headers.cookie ? '[PRESENT]' : '[MISSING]',
        origin: req.headers.origin,
        host: req.headers.host,
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
      },
      query: req.query,
      params: req.params,
      user: (req as any).user,
      session: (req as any).session,
      error: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === 'production',
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
      },
    });
  }
  
  next(err);
};

// API proxy logging middleware
export const proxyLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Log all proxy requests
  if (req.path.startsWith('/api/proxy/')) {
    const targetUrl = req.path.replace('/api/proxy/', '');
    
    log.debug('🔄 Proxy Request', {
      targetUrl,
      method: req.method,
      headers: {
        authorization: req.headers.authorization ? '[PRESENT]' : '[MISSING]',
        origin: req.headers.origin,
      },
      query: req.query,
    });
    
    // Store proxy info in res.locals for logging
    res.locals.proxyInfo = {
      targetUrl,
      method: req.method,
      startTime: Date.now()
    };
    
    // Log response after it's sent
    res.on('finish', () => {
      if (res.locals.proxyInfo) {
        log.debug('🔄 Proxy Response', {
          targetUrl: res.locals.proxyInfo.targetUrl,
          status: res.statusCode,
          responseTime: Date.now() - res.locals.proxyInfo.startTime
        });
      }
    });
  }
  
  next();
};

// Environment validation logging
export const environmentLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Log environment issues on first request
  if (!environmentLoggingMiddleware.logged) {
    environmentLoggingMiddleware.logged = true;
    
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
        port: process.env.PORT,
      });
    } else {
      log.info('✅ Environment Configuration Valid', {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        hasSupabase: true,
        hasJwt: true,
      });
    }
  }
  
  next();
};

// Add static property
environmentLoggingMiddleware.logged = false;