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

  // Store debug info in res.locals
  res.locals.corsDebug = {
    method,
    path,
    origin,
    startTime: Date.now()
  };
  
  // Log response after it's sent
  res.on('finish', () => {
    console.log(`📤 Response for ${method} ${path}:`);
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   CORS Headers:`, {
      'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
      'access-control-allow-credentials': res.getHeader('access-control-allow-credentials'),
      'access-control-allow-methods': res.getHeader('access-control-allow-methods'),
      'access-control-allow-headers': res.getHeader('access-control-allow-headers')
    });
    console.log(`   Content-Type: ${res.getHeader('content-type')}`);
    console.log(`   Response Time: ${Date.now() - res.locals.corsDebug.startTime}ms`);
  });

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
  
  // Ensure CORS headers are set before any response
  // This runs on every request before the response is sent
  const originalWriteHead = res.writeHead;
  res.writeHead = function(...args: any[]) {
    if (!res.headersSent) {
      ensureCorsHeaders(req, res);
    }
    return originalWriteHead.apply(res, args);
  };
  
  next();
};

function ensureCorsHeaders(req: Request, res: Response) {
  // Safety check - don't set headers if already sent
  if (res.headersSent) {
    return;
  }
  
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
  
  // Set JSON content type early if not already set
  // This runs before the response is sent
  const originalJson = res.json;
  res.json = function(data: any) {
    if (!res.headersSent && !res.getHeader('content-type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return originalJson.call(this, data);
  };
  
  // Also handle res.send for objects
  const originalWriteHead = res.writeHead;
  res.writeHead = function(...args: any[]) {
    if (!res.headersSent && req.path.startsWith('/api/')) {
      const [statusCode, statusMessage, headers] = args;
      const contentType = headers?.['content-type'] || res.getHeader('content-type');
      if (!contentType) {
        // Check if we're about to send JSON data
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    }
    return originalWriteHead.apply(res, args);
  };
  
  next();
};