/**
 * Secure Market Data Routes with Input Validation
 * Phase 8: Security Implementation
 */

import { Router } from 'express';
import { z } from 'zod';
import { 
  createValidator, 
  marketDataLimiter, 
  batchLimiter,
  validationSchemas,
  sqlInjectionPrevention,
  securityLogger 
} from '../middleware/security-config';
import { getUnifiedAPIService } from '../services/unified-api';
import { cacheService } from '../services/cache/cache-service';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const quoteSchema = z.object({
  symbol: validationSchemas.stockSymbol,
});

const batchQuoteSchema = z.object({
  symbols: z.array(validationSchemas.stockSymbol)
    .min(1, 'At least one symbol is required')
    .max(50, 'Maximum 50 symbols allowed per request'),
});

const historicalDataSchema = z.object({
  symbol: validationSchemas.stockSymbol,
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  interval: z.enum(['1min', '5min', '15min', '30min', '1hour', '1day']).optional(),
});

const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query too long')
    .transform(val => sqlInjectionPrevention.sanitizeString(val)),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const financialsSchema = z.object({
  symbol: validationSchemas.stockSymbol,
  period: z.enum(['annual', 'quarter']).default('quarter'),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

const newsSchema = z.object({
  symbol: validationSchemas.stockSymbol.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check cache before making API call
 */
const checkCache = async (key: string) => {
  try {
    const cached = await cacheService.get(key);
    if (cached) {
      return { data: cached, fromCache: true };
    }
    return null;
  } catch (error) {
    console.error('[CACHE] Error checking cache:', error);
    return null;
  }
};

/**
 * Save to cache with appropriate TTL
 */
const saveToCache = async (key: string, data: any, ttl: number) => {
  try {
    await cacheService.set(key, data, ttl);
  } catch (error) {
    console.error('[CACHE] Error saving to cache:', error);
  }
};

// ============================================
// MARKET DATA ENDPOINTS
// ============================================

/**
 * GET /api/market-data/quote/:symbol
 * Get real-time quote for a single stock
 */
router.get(
  '/quote/:symbol',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      // Validate symbol
      const result = validationSchemas.stockSymbol.safeParse(req.params.symbol);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid symbol',
          details: result.error.errors,
        });
      }
      
      const symbol = result.data;
      const cacheKey = `quote:${symbol}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const quote = await apiService.getQuote(symbol);
      
      if (!quote) {
        return res.status(404).json({
          error: 'Symbol not found',
          message: `No data available for symbol: ${symbol}`,
        });
      }
      
      // Save to cache (60 seconds for real-time quotes)
      await saveToCache(cacheKey, quote, 60);
      
      res.json(quote);
    } catch (error) {
      console.error('[API] Quote error:', error);
      next(error);
    }
  }
);

/**
 * POST /api/market-data/batch-quotes
 * Get quotes for multiple stocks
 */
router.post(
  '/batch-quotes',
  batchLimiter,
  createValidator(batchQuoteSchema),
  async (req, res, next) => {
    try {
      const { symbols } = req.body;
      const cacheKey = `batch:${symbols.sort().join(',')}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const quotes = await apiService.getBatchQuotes(symbols);
      
      // Save to cache (60 seconds for real-time quotes)
      await saveToCache(cacheKey, quotes, 60);
      
      res.json(quotes);
    } catch (error) {
      console.error('[API] Batch quotes error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/market-data/historical/:symbol
 * Get historical price data
 */
router.get(
  '/historical/:symbol',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      // Validate symbol
      const symbolResult = validationSchemas.stockSymbol.safeParse(req.params.symbol);
      if (!symbolResult.success) {
        return res.status(400).json({
          error: 'Invalid symbol',
          details: symbolResult.error.errors,
        });
      }
      
      const symbol = symbolResult.data;
      const { from, to, interval = '1day' } = req.query;
      
      // Validate query parameters
      if (from && !z.string().datetime().safeParse(from).success) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'From date must be in ISO 8601 format',
        });
      }
      
      if (to && !z.string().datetime().safeParse(to).success) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'To date must be in ISO 8601 format',
        });
      }
      
      const cacheKey = `historical:${symbol}:${from || 'default'}:${to || 'default'}:${interval}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const historicalData = await apiService.getHistoricalData(symbol, {
        from: from as string,
        to: to as string,
        interval: interval as string,
      });
      
      // Save to cache (1 hour for historical data)
      await saveToCache(cacheKey, historicalData, 3600);
      
      res.json(historicalData);
    } catch (error) {
      console.error('[API] Historical data error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/market-data/search
 * Search for stocks by symbol or name
 */
router.get(
  '/search',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      // Validate search parameters
      const result = searchSchema.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid search parameters',
          details: result.error.errors,
        });
      }
      
      const { query, limit } = result.data;
      const cacheKey = `search:${query}:${limit}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const searchResults = await apiService.searchSymbol(query);
      
      // Limit results
      const limitedResults = searchResults.slice(0, limit);
      
      // Save to cache (5 minutes for search results)
      await saveToCache(cacheKey, limitedResults, 300);
      
      res.json(limitedResults);
    } catch (error) {
      console.error('[API] Search error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/market-data/financials/:symbol
 * Get financial statements
 */
router.get(
  '/financials/:symbol',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      // Validate symbol
      const symbolResult = validationSchemas.stockSymbol.safeParse(req.params.symbol);
      if (!symbolResult.success) {
        return res.status(400).json({
          error: 'Invalid symbol',
          details: symbolResult.error.errors,
        });
      }
      
      // Validate query parameters
      const queryResult = financialsSchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          error: 'Invalid parameters',
          details: queryResult.error.errors,
        });
      }
      
      const symbol = symbolResult.data;
      const { period, limit } = queryResult.data;
      const cacheKey = `financials:${symbol}:${period}:${limit}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const financials = await apiService.getFinancials(symbol, period);
      
      // Limit results
      const limitedFinancials = financials.slice(0, limit);
      
      // Save to cache (1 hour for financial data)
      await saveToCache(cacheKey, limitedFinancials, 3600);
      
      res.json(limitedFinancials);
    } catch (error) {
      console.error('[API] Financials error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/market-data/company/:symbol
 * Get company information
 */
router.get(
  '/company/:symbol',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      // Validate symbol
      const result = validationSchemas.stockSymbol.safeParse(req.params.symbol);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid symbol',
          details: result.error.errors,
        });
      }
      
      const symbol = result.data;
      const cacheKey = `company:${symbol}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const companyInfo = await apiService.getCompanyInfo(symbol);
      
      if (!companyInfo) {
        return res.status(404).json({
          error: 'Company not found',
          message: `No company information available for symbol: ${symbol}`,
        });
      }
      
      // Save to cache (24 hours for company info)
      await saveToCache(cacheKey, companyInfo, 86400);
      
      res.json(companyInfo);
    } catch (error) {
      console.error('[API] Company info error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/market-data/news
 * Get market news
 */
router.get(
  '/news',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      // Validate query parameters
      const result = newsSchema.safeParse(req.query);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid parameters',
          details: result.error.errors,
        });
      }
      
      const { symbol, limit, from, to } = result.data;
      const cacheKey = `news:${symbol || 'general'}:${limit}:${from || ''}:${to || ''}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const news = symbol 
        ? await apiService.getNews(symbol)
        : await apiService.getMarketNews();
      
      // Limit results
      const limitedNews = news.slice(0, limit);
      
      // Save to cache (15 minutes for news)
      await saveToCache(cacheKey, limitedNews, 900);
      
      res.json(limitedNews);
    } catch (error) {
      console.error('[API] News error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/market-data/movers
 * Get market movers (gainers, losers, active)
 */
router.get(
  '/movers',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      const cacheKey = 'market:movers';
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const [gainers, losers, active] = await Promise.all([
        apiService.getGainers(),
        apiService.getLosers(),
        apiService.getMostActive(),
      ]);
      
      const movers = {
        gainers: gainers.slice(0, 10),
        losers: losers.slice(0, 10),
        mostActive: active.slice(0, 10),
        timestamp: new Date().toISOString(),
      };
      
      // Save to cache (5 minutes for market movers)
      await saveToCache(cacheKey, movers, 300);
      
      res.json(movers);
    } catch (error) {
      console.error('[API] Market movers error:', error);
      next(error);
    }
  }
);

/**
 * GET /api/market-data/earnings/:symbol
 * Get earnings data
 */
router.get(
  '/earnings/:symbol',
  marketDataLimiter,
  async (req, res, next) => {
    try {
      // Validate symbol
      const result = validationSchemas.stockSymbol.safeParse(req.params.symbol);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid symbol',
          details: result.error.errors,
        });
      }
      
      const symbol = result.data;
      const cacheKey = `earnings:${symbol}`;
      
      // Check cache first
      const cached = await checkCache(cacheKey);
      if (cached) {
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cached.data);
      }
      
      // Fetch from API
      const apiService = getUnifiedAPIService();
      const earnings = await apiService.getEarnings(symbol);
      
      // Save to cache (24 hours for earnings data)
      await saveToCache(cacheKey, earnings, 86400);
      
      res.json(earnings);
    } catch (error) {
      console.error('[API] Earnings error:', error);
      next(error);
    }
  }
);

// ============================================
// ERROR HANDLER
// ============================================

router.use((error: any, req: any, res: any, next: any) => {
  // Log the error
  console.error('[MARKET-DATA] Error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
  });
  
  // Check for specific error types
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
      details: error.errors || error.issues,
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
  
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: error.message,
      retryAfter: error.retryAfter,
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred processing your request',
  });
});

export default router;