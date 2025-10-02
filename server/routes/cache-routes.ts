/**
 * CACHE ROUTES - Cache-first with auto-fill on miss
 *
 * These routes prioritize Redis cache and will auto-fill from
 * providers on cache miss via simple-cache-service.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { simpleCacheService } from '../services/simple-cache-service';
import { logger } from '../lib/logger';

const router = Router();

// Validation schemas
const symbolSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol required')
    .max(10, 'Symbol too long')
    .regex(/^[A-Z0-9\-\.]+$/, 'Invalid symbol format')
    .transform(val => val.toUpperCase().trim())
});

const batchSymbolsSchema = z.object({
  symbols: z.array(z.string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9\-\.]+$/))
    .min(1, 'At least one symbol required')
    .max(50, 'Maximum 50 symbols per request')
});

/**
 * GET /api/cache/quotes/:symbol
 * Get cached quote - NEVER triggers API call
 */
router.get('/quotes/:symbol', async (req: Request, res: Response) => {
  try {
    const validation = symbolSchema.safeParse({ symbol: req.params.symbol });
    if (!validation.success) {
      return res.status(400).json({
        error: 'INVALID_SYMBOL',
        message: validation.error.errors[0].message
      });
    }

    const { symbol } = validation.data;
    
    // Use simple cache service with 60s TTL
    const quote = await simpleCacheService.getQuote(symbol);
    res.json({
      data: quote || null,
      _cached: true,
      _source: 'cache-first',
      _timestamp: Date.now(),
    });
    
  } catch (error) {
    logger.error('Cache quote fetch error:', error);
    res.status(500).json({
      error: 'CACHE_ERROR',
      message: 'Failed to fetch cached quote'
    });
  }
});

/**
 * POST /api/cache/quotes/batch
 * Get batch quotes from cache - NEVER triggers API calls
 */
router.post('/quotes/batch', async (req: Request, res: Response) => {
  try {
    const validation = batchSymbolsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: validation.error.errors[0].message
      });
    }

    const { symbols } = validation.data;
    
    // Use cache-first strategy for batch
    const quotesBySymbol = await simpleCacheService.getBatchQuotes(symbols);
    const quotes = Object.values(quotesBySymbol);
    res.json({
      quotes,
      _cached: true,
      _source: 'cache-first',
      _timestamp: Date.now(),
    });
    
  } catch (error) {
    logger.error('Batch quotes fetch error:', error);
    res.status(500).json({
      error: 'CACHE_ERROR',
      message: 'Failed to fetch cached quotes'
    });
  }
});

/**
 * GET /api/cache/fundamentals/:symbol
 * Get cached fundamentals - queues for update if stale
 */
router.get('/fundamentals/:symbol', async (req: Request, res: Response) => {
  try {
    const validation = symbolSchema.safeParse({ symbol: req.params.symbol });
    if (!validation.success) {
      return res.status(400).json({
        error: 'INVALID_SYMBOL',
        message: validation.error.errors[0].message
      });
    }

    const { symbol } = validation.data;
    
    // For now, return from regular cache service
    // TODO: Implement cache-first strategy for fundamentals
    const { redisCacheService } = await import('../cache/redis-cache-service');
    const cacheKey = `fundamentals:${symbol}`;
    const data = await redisCacheService.get(cacheKey);
    
    if (!data) {
      // Queue for update but return empty
      return res.json({
        success: true,
        data: null,
        message: 'Data is being fetched. Please refresh in a moment.',
        cached: false
      });
    }
    
    res.json({
      success: true,
      data,
      cached: true
    });
    
  } catch (error) {
    logger.error('Fundamentals fetch error:', error);
    res.status(500).json({
      error: 'CACHE_ERROR',
      message: 'Failed to fetch cached fundamentals'
    });
  }
});

/**
 * GET /api/cache/financials/:symbol
 * Get cached financials - queues for update if stale
 */
router.get('/financials/:symbol', async (req: Request, res: Response) => {
  try {
    const validation = symbolSchema.safeParse({ symbol: req.params.symbol });
    if (!validation.success) {
      return res.status(400).json({
        error: 'INVALID_SYMBOL',
        message: validation.error.errors[0].message
      });
    }

    const { symbol } = validation.data;
    const { redisCacheService } = await import('../cache/redis-cache-service');
    const cacheKey = `financials:${symbol}`;
    const data = await redisCacheService.get(cacheKey);

    if (!data) {
      return res.json({
        success: true,
        data: null,
        message: 'Financials are being fetched. Please refresh in a moment.',
        cached: false
      });
    }

    res.json({ success: true, data, cached: true });
  } catch (error) {
    logger.error('Financials fetch error:', error);
    res.status(500).json({ error: 'CACHE_ERROR', message: 'Failed to fetch cached financials' });
  }
});

/**
 * GET /api/cache/historical/:symbol/:period
 * Get cached historical data
 */
router.get('/historical/:symbol/:period', async (req: Request, res: Response) => {
  try {
    const validation = symbolSchema.safeParse({ symbol: req.params.symbol });
    if (!validation.success) {
      return res.status(400).json({
        error: 'INVALID_SYMBOL',
        message: validation.error.errors[0].message
      });
    }

    const { symbol } = validation.data;
    const period = req.params.period;
    
    // Validate period
    const validPeriods = ['1d', '5d', '1m', '3m', '6m', '1y', '5y', 'max'];
    if (!validPeriods.includes(period.toLowerCase())) {
      return res.status(400).json({
        error: 'INVALID_PERIOD',
        message: 'Invalid time period'
      });
    }
    
    // Get from cache
    const { redisCacheService } = await import('../cache/redis-cache-service');
    const cacheKey = `historical:${symbol}:${period}`;
    const data = await redisCacheService.get(cacheKey);
    
    if (!data) {
      return res.json({
        success: true,
        data: null,
        message: 'Historical data is being fetched. Please refresh in a moment.',
        cached: false
      });
    }
    
    res.json({
      success: true,
      data,
      cached: true
    });
    
  } catch (error) {
    logger.error('Historical data fetch error:', error);
    res.status(500).json({
      error: 'CACHE_ERROR',
      message: 'Failed to fetch historical data'
    });
  }
});

/**
 * GET /api/cache/intrinsic-values/:symbol
 * Read-only intrinsic value from cache/DB (no calculation)
 */
router.get('/intrinsic-values/:symbol', async (req: Request, res: Response) => {
  try {
    const validation = symbolSchema.safeParse({ symbol: req.params.symbol });
    if (!validation.success) {
      return res.status(400).json({
        error: 'INVALID_SYMBOL',
        message: validation.error.errors[0].message
      });
    }

    const { symbol } = validation.data;
    const { redisCacheService } = await import('../cache/redis-cache-service');
    const cacheKey = `iv:${symbol}`;
    const data = await redisCacheService.get(cacheKey);

    if (data) {
      return res.json({ success: true, data, cached: true });
    }

    // Optional fallback to DB for last value
    const { storage } = await import('../storage');
    const dbVal = await storage.getIntrinsicValue(symbol).catch(() => undefined);
    if (dbVal) {
      return res.json({ success: true, data: dbVal, cached: false, source: 'db' });
    }

    return res.json({ success: true, data: null, cached: false });
  } catch (error) {
    logger.error('IV cache fetch error:', error);
    res.status(500).json({
      error: 'CACHE_ERROR',
      message: 'Failed to fetch intrinsic value'
    });
  }
});

// Alias endpoint for intrinsic values cache
router.get('/iv/:symbol', async (req: Request, res: Response) => {
  const symbolParam = req.params.symbol;
  try {
    const validation = symbolSchema.safeParse({ symbol: symbolParam });
    if (!validation.success) {
      return res.status(400).json({ error: 'INVALID_SYMBOL', message: validation.error.errors[0].message });
    }
    const { symbol } = validation.data;
    const { redisCacheService } = await import('../cache/redis-cache-service');
    const cacheKey = `iv:${symbol}`;
    const data = await redisCacheService.get(cacheKey);
    if (data) return res.json({ success: true, data, cached: true });
    const { storage } = await import('../storage');
    const dbVal = await storage.getIntrinsicValue(symbol).catch(() => undefined);
    if (dbVal) return res.json({ success: true, data: dbVal, cached: false, source: 'db' });
    return res.json({ success: true, data: null, cached: false });
  } catch (error) {
    logger.error('IV cache alias fetch error:', error);
    res.status(500).json({ error: 'CACHE_ERROR', message: 'Failed to fetch intrinsic value' });
  }
});

/**
 * GET /api/cache/status
 * Get cache and queue status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get cache stats
    const cacheStats = await simpleCacheService.getCacheStats();
    const { redisCacheService } = await import('../cache/redis-cache-service');
    const redisHealth = await redisCacheService.healthCheck();
    
    res.json({
      success: true,
      cache: {
        redis: redisHealth,
        strategy: 'simple',
        stats: cacheStats
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Status fetch error:', error);
    res.status(500).json({
      error: 'STATUS_ERROR',
      message: 'Failed to fetch status'
    });
  }
});

export default router;
