import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to protect public market data endpoints with API key
 * Used for endpoints that don't require user authentication but need protection
 */
export function marketDataApiKey(req: Request, res: Response, next: NextFunction) {
  // Skip API key check in development for easier testing
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.MARKET_DATA_API_KEY;

  if (!expectedKey) {
    console.error('⚠️ MARKET_DATA_API_KEY not configured in environment');
    return res.status(500).json({
      error: 'CONFIGURATION_ERROR',
      message: 'Server configuration error',
    });
  }

  if (!apiKey) {
    return res.status(401).json({
      error: 'MISSING_API_KEY',
      message: 'X-API-Key header is required',
    });
  }

  if (apiKey !== expectedKey) {
    console.warn(`🚫 Invalid API key attempt from IP: ${req.ip}`);
    return res.status(401).json({
      error: 'INVALID_API_KEY',
      message: 'Invalid API key',
    });
  }

  // API key is valid
  next();
}

/**
 * Optional API key middleware - allows access with or without key
 * but applies stricter rate limiting without key
 */
export function optionalMarketDataApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.MARKET_DATA_API_KEY;

  // Mark request as authenticated if valid key provided
  (req as any).hasValidApiKey = false;

  if (apiKey && expectedKey && apiKey === expectedKey) {
    (req as any).hasValidApiKey = true;
  }

  next();
}