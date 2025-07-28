/**
 * CORS Logger Middleware
 * Logs detailed CORS information for debugging production issues
 */

import type { Request, Response, NextFunction } from 'express';

export const corsLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || 'NO-ORIGIN';
  const method = req.method;
  const path = req.path;
  
  // Log preflight requests
  if (method === 'OPTIONS') {
    console.log(`🛡️ CORS Preflight Request:`);
    console.log(`   Origin: ${origin}`);
    console.log(`   Path: ${path}`);
    console.log(`   Access-Control-Request-Method: ${req.headers['access-control-request-method'] || 'none'}`);
    console.log(`   Access-Control-Request-Headers: ${req.headers['access-control-request-headers'] || 'none'}`);
  }
  
  // Log actual requests with origin
  if (origin !== 'NO-ORIGIN') {
    console.log(`🌐 CORS Request: ${method} ${path} from ${origin}`);
  }
  
  // Log CORS headers after response is sent
  res.on('finish', () => {
    // Log CORS response headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
      'Access-Control-Max-Age': res.getHeader('Access-Control-Max-Age'),
    };
    
    // Only log if CORS headers are present
    if (corsHeaders['Access-Control-Allow-Origin']) {
      console.log(`✅ CORS Response Headers for ${method} ${path}:`);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value) console.log(`   ${key}: ${value}`);
      });
    }
  });
  
  next();
};

/**
 * CORS Debug Info Endpoint Middleware
 * Adds debug info to all responses when CORS_DEBUG=true
 */
export const corsDebugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.CORS_DEBUG === 'true') {
    // Add debug headers to response
    res.setHeader('X-CORS-Debug-Origin', req.headers.origin || 'NO-ORIGIN');
    res.setHeader('X-CORS-Debug-Method', req.method);
    res.setHeader('X-CORS-Debug-Path', req.path);
    res.setHeader('X-CORS-Debug-Time', new Date().toISOString());
  }
  
  next();
};