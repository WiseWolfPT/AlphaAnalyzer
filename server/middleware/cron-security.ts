import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Middleware to protect cron job endpoints
 * Validates a secret token or internal trigger
 */
export function cronSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow internal calls (from the CronManager)
  if (req.headers['x-internal-cron'] === 'true') {
    logger.info(`[CRON] Internal cron job triggered: ${req.path}`);
    return next();
  }

  // Check for cron secret in different places
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('[CRON] CRON_SECRET not configured!');
    return res.status(503).json({
      success: false,
      error: 'Cron jobs not properly configured'
    });
  }

  // Check authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token === cronSecret) {
      logger.info(`[CRON] Valid cron secret provided for: ${req.path}`);
      return next();
    }
  }

  // Check custom header (for services like Vercel Cron)
  const cronHeader = req.headers['x-cron-secret'];
  if (cronHeader === cronSecret) {
    logger.info(`[CRON] Valid cron header provided for: ${req.path}`);
    return next();
  }

  // Check query parameter (for simple cron services)
  const cronQuery = req.query.secret;
  if (cronQuery === cronSecret) {
    logger.info(`[CRON] Valid cron query param provided for: ${req.path}`);
    return next();
  }

  // Coolify specific: Check for Coolify service token
  if (process.env.COOLIFY_SERVICE_TOKEN) {
    const coolifyToken = req.headers['x-coolify-token'];
    if (coolifyToken === process.env.COOLIFY_SERVICE_TOKEN) {
      logger.info(`[CRON] Valid Coolify service token for: ${req.path}`);
      return next();
    }
  }

  // Log unauthorized attempt
  logger.warn(`[CRON] Unauthorized cron job attempt: ${req.path} from IP: ${req.ip}`);
  
  return res.status(401).json({
    success: false,
    error: 'Unauthorized - Invalid cron secret'
  });
}

/**
 * Middleware to log cron job execution
 */
export function cronLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    res.locals.responseTime = Date.now() - startTime;
    
    // Log cron job completion
    const logData = {
      type: 'cron_job',
      path: req.path,
      method: req.method,
      status: res.statusCode,
      duration: res.locals.responseTime,
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info('[CRON] Job completed successfully', logData);
    } else {
      logger.error('[CRON] Job failed', logData);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Rate limiting for cron endpoints to prevent abuse
 */
const cronRateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function cronRateLimitMiddleware(maxRequests: number = 10, windowMinutes: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const rateLimitData = cronRateLimitMap.get(key);
    
    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Create new window
      cronRateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (rateLimitData.count >= maxRequests) {
      logger.warn(`[CRON] Rate limit exceeded for ${key}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests - cron job rate limit exceeded',
        retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000)
      });
    }
    
    rateLimitData.count++;
    return next();
  };
}