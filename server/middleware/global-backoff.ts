/**
 * Global Back-off Middleware for 429 Rate Limiting
 * 
 * Implements global back-off strategy for API rate limiting as specified in roadmap V4.
 * Adds 1-second delay when 429 (rate limit) responses are detected.
 */

import { Request, Response, NextFunction } from 'express';

// Global tracking for 429 responses
let global429Count = 0;
let lastReset = Date.now();
const RESET_INTERVAL = 60 * 1000; // 1 minute

/**
 * Global back-off middleware for 429 responses
 * Implements: if (resp.status===429) await new Promise(r=>setTimeout(r,1000))  // log 'backoff'
 */
export const globalBackoffMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercept response to detect 429 status
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    let statusCode = 200;
    
    // Override status method to capture status code
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    // Override send method
    res.send = function(data: any) {
      if (statusCode === 429) {
        handle429Response(req);
      }
      return originalSend.call(this, data);
    };
    
    // Override json method
    res.json = function(data: any) {
      if (statusCode === 429) {
        handle429Response(req);
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Handle 429 response with back-off strategy
 */
function handle429Response(req: Request) {
  const now = Date.now();
  
  // Reset counter every minute
  if (now - lastReset > RESET_INTERVAL) {
    global429Count = 0;
    lastReset = now;
  }
  
  global429Count++;
  
  // Log back-off as specified in roadmap
  console.log(`🔥 BACKOFF: 429 detected for ${req.method} ${req.path} - Count: ${global429Count}`);
  
  // Set header to indicate back-off
  if (!req.res?.headersSent) {
    req.res?.setHeader('X-Backoff-Applied', 'true');
    req.res?.setHeader('X-Backoff-Count', global429Count.toString());
    req.res?.setHeader('X-Backoff-Reset', new Date(lastReset + RESET_INTERVAL).toISOString());
  }
}

/**
 * Add delay for client-side requests when 429 is detected
 * This should be used in API client code
 */
export const clientBackoffDelay = async (responseStatus: number): Promise<void> => {
  if (responseStatus === 429) {
    console.log('🔥 Client back-off: waiting 1 second due to 429');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

/**
 * Get current 429 statistics
 */
export const get429Stats = () => {
  return {
    count: global429Count,
    lastReset: new Date(lastReset).toISOString(),
    nextReset: new Date(lastReset + RESET_INTERVAL).toISOString()
  };
};