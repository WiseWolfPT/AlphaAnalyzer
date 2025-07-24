/**
 * CORS Debug Middleware
 * Helps diagnose CORS issues by logging all CORS-related headers and requests
 */

import { Request, Response, NextFunction } from 'express';

export const corsDebugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || 'no-origin';
  const method = req.method;
  const path = req.path;
  
  console.log(`🔍 CORS Debug - ${method} ${path}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   Headers:`, {
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer ...' : 'none',
    'x-requested-with': req.headers['x-requested-with']
  });

  // Log response headers being sent
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 Response for ${method} ${path}:`);
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   CORS Headers:`, {
      'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
      'access-control-allow-credentials': res.getHeader('access-control-allow-credentials'),
      'access-control-allow-methods': res.getHeader('access-control-allow-methods'),
      'access-control-allow-headers': res.getHeader('access-control-allow-headers')
    });
    console.log(`   Content-Type: ${res.getHeader('content-type')}`);
    
    // If status 0 or error, log the response body
    if (res.statusCode >= 400 || res.statusCode === 0) {
      console.log(`   Response Body:`, data?.toString().substring(0, 500));
    }
    
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Force CORS Headers Middleware
 * Ensures CORS headers are always present on responses
 */
export const forceCorsHeaders = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Always set CORS headers on responses
  res.on('finish', () => {
    // This runs after response is sent, just for logging
    if (!res.getHeader('access-control-allow-origin')) {
      console.warn(`⚠️ WARNING: No CORS headers on ${req.method} ${req.path} response!`);
    }
  });
  
  // Intercept res.json and res.send to ensure headers are set
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  res.json = function(data: any) {
    ensureCorsHeaders(req, res);
    return originalJson(data);
  };
  
  res.send = function(data: any) {
    ensureCorsHeaders(req, res);
    return originalSend(data);
  };
  
  next();
};

function ensureCorsHeaders(req: Request, res: Response) {
  const origin = req.headers.origin;
  
  // If no CORS headers are set, add them
  if (!res.getHeader('access-control-allow-origin') && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    console.log(`🚨 CORS headers were missing, added for ${req.method} ${req.path}`);
  }
}

/**
 * JSON Content Type Enforcer
 * Ensures all API responses have proper JSON content type
 */
export const enforceJsonContentType = (req: Request, res: Response, next: NextFunction) => {
  // Only for API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  // Intercept res.send to ensure JSON content type
  const originalSend = res.send.bind(res);
  
  res.send = function(data: any) {
    // If sending an object or array, ensure JSON content type
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      if (!res.getHeader('content-type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    }
    
    return originalSend(data);
  };
  
  next();
};