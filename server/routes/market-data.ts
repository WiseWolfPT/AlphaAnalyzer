import { Router, Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth-middleware';
import { demoAuthMiddleware, optionalDemoAuth } from '../middleware/demo-auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { marketDataApiKey } from '../middleware/market-data-api-key';
import { dbUtils } from '../db';
import crypto from 'crypto';
import { 
  SecureLRUCache, 
  createMarketDataCache, 
  createSearchCache, 
  MarketDataSchema, 
  SearchResultSchema 
} from '../cache/lru-cache';
import { ServerMarketDataService } from '../services/market-data-service';
import { 
  ProviderManager, 
  PolygonProvider, 
  AlphaVantageProvider, 
  FinnhubProvider, 
  TwelveDataProvider,
  FMPProvider,
  FiscalAIProvider
} from '../services/providers';
import { CacheService } from '../services/cache/cache-service';
import { simpleCacheService } from '../services/simple-cache-service';
import { threeTierCache } from '../cache/three-tier-cache';

const router = Router();

// Use optional authentication for market data endpoints (public access allowed)
const isDevelopment = process.env.NODE_ENV !== 'production';
// Market data should be publicly accessible - always use demo auth that allows public access
const authService = optionalDemoAuth(); // Always allow public access to market data

// Initialize the enhanced market data service
const marketDataService = new ServerMarketDataService();

// Initialize the new provider manager
const providerManager = new ProviderManager();

// SIMPLIFIED PROVIDERS - Phase 2 Backend Integration
// Only FMP (primary) + Alpha Vantage (backup) for cost/reliability optimization
if (process.env.FMP_API_KEY && process.env.FMP_API_KEY !== 'demo') {
  providerManager.addProvider(new FMPProvider(process.env.FMP_API_KEY));
  console.log('✅ FMP Provider configured (PRIMARY: $14.99/month, 300 calls/min)');
}
if (process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo') {
  providerManager.addProvider(new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY));
  console.log('✅ Alpha Vantage Provider configured (BACKUP: Free tier, 5 calls/min)');
}

// REMOVED: Polygon, Finnhub, TwelveData, FiscalAI for cost optimization
console.log('📊 Provider optimization: Using only FMP + Alpha Vantage for cost/reliability');

// Initialize cache service
const cacheService = new CacheService();

// SECURITY FIX: Replace simple Map with secure LRU cache to prevent memory exhaustion
const searchCache = createSearchCache();

// Rate limiting específico para market data - TEMPORARILY INCREASED FOR TESTING
const marketDataRateLimit = rateLimitMiddleware.endpointRateLimit('/api/market-data', {
  'free': 10000,     // TEMPORARILY INCREASED: 10000 requests per hour
  'pro': 10000,      // TEMPORARILY INCREASED: 10000 requests per hour  
  'premium': 10000,  // TEMPORARILY INCREASED: 10000 requests per hour
});

// Validação de símbolo de ação
const stockSymbolSchema = z.object({
  symbol: z.string()
    .min(1, 'Stock symbol is required')
    .max(10, 'Stock symbol too long')
    .regex(/^[A-Z0-9\-\.]+$/, 'Invalid stock symbol format')
    .transform(val => val.toUpperCase().trim()),
});

// Validação para batch de símbolos
const batchSymbolsSchema = z.object({
  symbols: z.array(z.string()
    .min(1)
    .max(10)
    .regex(/^[A-Z0-9\-\.]+$/))
    .min(1, 'At least one symbol required')
    .max(20, 'Maximum 20 symbols per request'),
});

/**
 * GET /api/market-data/quote/:symbol
 * Get real-time stock quote with caching and provider fallback
 */
router.get('/quote/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: validation.error.errors[0].message,
        });
      }

      const { symbol } = validation.data;
      console.log(`🔍 API request for quote: ${symbol}`);

      // Use simple cache service with 60s TTL
      const quote = await simpleCacheService.getQuote(symbol);
      
      if (!quote) {
        return res.status(404).json({
          error: 'QUOTE_NOT_FOUND',
          message: `Unable to fetch quote for ${symbol}`,
          symbol,
          timestamp: new Date().toISOString(),
        });
      }

      // Add cache information to response
      const quoteResponse = {
        ...quote,
        _timestamp: Date.now(),
        _cached: true,
        _source: 'simple_cache',
      };

      console.log(`✅ Quote for ${symbol}: $${quote.price}`);

      res.json(quoteResponse);
    } catch (error) {
      console.error('Quote fetch error:', error);
      
      // Log de erro
      if (req.user?.id) {
        dbUtils.logSecurityEvent({
          user_id: req.user.id,
          action: 'market_data_fetch',
          resource: `quote:${req.params.symbol}`,
          status: 'error',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
      
      const errorResponse = {
        error: 'QUOTE_FETCH_ERROR',
        message: 'Unable to fetch quote data. Please try again later.',
        symbol: req.params.symbol,
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId,
      };
      
      // SECURITY FIX: Only include error details in development
      if (process.env.NODE_ENV === 'development') {
        (errorResponse as any).details = error instanceof Error ? error.message : 'Unknown error';
        (errorResponse as any).stack = error instanceof Error ? error.stack : undefined;
      }
      
      res.status(503).json(errorResponse);
    }
  }
);


/**
 * GET /api/market-data/chart/:symbol/:period
 * Get historical chart data with caching
 */
router.get('/chart/:symbol/:period',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const symbolValidation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!symbolValidation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: symbolValidation.error.errors[0].message,
        });
      }

      const { symbol } = symbolValidation.data;
      const period = req.params.period.toUpperCase();
      
      // Validate period
      const validPeriods = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'];
      if (!validPeriods.includes(period)) {
        return res.status(400).json({
          error: 'INVALID_PERIOD',
          message: `Invalid period. Valid values: ${validPeriods.join(', ')}`,
        });
      }

      console.log(`📊 Chart data request for ${symbol} (${period})`);

      // ✅ REDDIT STRATEGY - Try ThreeTierCache for chart data
      const chartData = await threeTierCache.get(`historical:${symbol}:${period}`, 'historical');
      
      if (!chartData || !chartData.data || chartData.data.length === 0) {
        // Queue for update if not available
        console.log(`📊 Chart data not cached for ${symbol} (${period}) - will be updated by cron`);
        return res.status(202).json({
          message: `Chart data for ${symbol} is being fetched. Please try again in a few minutes.`,
          symbol,
          period,
          timestamp: new Date().toISOString(),
          status: 'pending'
        });
      }

      console.log(`✅ Reddit Strategy: Chart data for ${symbol} served from cache (${period})`);

      res.json({
        ...chartData,
        _timestamp: Date.now(),
        _cached: true,
        _source: 'simple_cache',
      });
    } catch (error) {
      console.error('Chart data error:', error);
      res.status(500).json({
        error: 'CHART_DATA_ERROR',
        message: 'Unable to fetch chart data',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/market-status
 * Get current market status with caching
 */
router.get('/market-status',
  authService,
  async (req: Request, res: Response) => {
    try {
      const market = (req.query.market as string) || 'US';
      console.log(`🏛️ Market status request for ${market}`);

      // ✅ REDDIT STRATEGY - Use ThreeTierCache for market status
      const status = await threeTierCache.get(`market_status:${market}`, 'market_status');
      
      if (!status) {
        // Fallback to calculated status
        const now = new Date();
        const hour = now.getUTCHours();
        const day = now.getUTCDay();
        
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = hour >= 14 && hour < 21;
        
        const calculatedStatus = {
          market,
          isOpen: isWeekday && isMarketHours,
          timezone: 'America/New_York',
          provider: 'calculated',
        };

        console.log(`📊 Market status calculated: ${calculatedStatus.isOpen ? 'OPEN' : 'CLOSED'}`);
        
        return res.json({
          ...calculatedStatus,
          _timestamp: Date.now(),
          _cached: false,
          _source: 'calculated'
        });
      }
      
      console.log(`✅ Market status: ${status.isOpen ? 'OPEN' : 'CLOSED'} via cache`);

      res.json({
        ...status,
        _timestamp: Date.now(),
        _cached: true,
        _source: 'simple_cache',
      });
    } catch (error) {
      console.error('Market status error:', error);
      
      // Return calculated status as fallback
      const now = new Date();
      const hour = now.getUTCHours();
      const day = now.getUTCDay();
      
      const isWeekday = day >= 1 && day <= 5;
      const isMarketHours = hour >= 14 && hour < 21;
      
      res.json({
        market: 'US',
        isOpen: isWeekday && isMarketHours,
        timezone: 'America/New_York',
        provider: 'calculated',
        _timestamp: Date.now(),
        _cached: false,
      });
    }
  }
);

/**
 * GET /api/market-data/search
 * Search for stock symbols
 */
router.get('/search',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 1) {
        return res.status(400).json({
          error: 'INVALID_QUERY',
          message: 'Search query is required (minimum 1 character)',
        });
      }

      const cacheKey = `search:${query.toLowerCase()}`;
      
      // Check memory cache first
      const cached = searchCache.get(cacheKey);
      if (cached) {
        const parsed = SearchResultSchema.safeParse(cached);
        if (parsed.success) {
          return res.json({
            ...parsed.data,
            _cached: true,
            _timestamp: Date.now(),
          });
        }
      }

      // For now, return mock results
      // TODO: Implement real search using providers
      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'Stock', exchange: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Stock', exchange: 'NASDAQ' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Stock', exchange: 'NASDAQ' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Stock', exchange: 'NASDAQ' },
        { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Stock', exchange: 'NASDAQ' },
      ].filter(stock => 
        stock.symbol.includes(query.toUpperCase()) || 
        stock.name.toLowerCase().includes(query.toLowerCase())
      );

      const results = {
        results: mockResults,
        count: mockResults.length,
        _timestamp: Date.now(),
      };

      // Cache for 5 minutes
      searchCache.set(cacheKey, results);
      
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: 'SEARCH_ERROR',
        message: 'Search functionality temporarily unavailable',
      });
    }
  }
);

/**
 * GET /api/market-data/market-overview
 * Get market overview data (indices, VIX, etc.)
 */
router.get('/market-overview',
  authService,
  async (req: Request, res: Response) => {
    try {
      // TODO: Implement real market overview using providers
      // For now, return realistic mock data
      const baseData = {
        sp500: { value: 4712.34, change: 1.24 },
        nasdaq: { value: 14789.45, change: 1.89 },
        dow: { value: 35234.67, change: 0.78 },
        vix: { value: 16.23, change: -5.2 }
      };
      
      // Add small random variations to simulate live market
      const liveData = {
        sp500: {
          value: baseData.sp500.value + (Math.random() - 0.5) * 50,
          change: baseData.sp500.change + (Math.random() - 0.5) * 0.5
        },
        nasdaq: {
          value: baseData.nasdaq.value + (Math.random() - 0.5) * 100,
          change: baseData.nasdaq.change + (Math.random() - 0.5) * 0.5
        },
        dow: {
          value: baseData.dow.value + (Math.random() - 0.5) * 200,
          change: baseData.dow.change + (Math.random() - 0.5) * 0.3
        },
        vix: {
          value: baseData.vix.value + (Math.random() - 0.5) * 2,
          change: baseData.vix.change + (Math.random() - 0.5) * 1
        }
      };

      console.log('📊 Serving market overview data');

      res.json({
        ...liveData,
        timestamp: new Date().toISOString(),
        source: 'demo_with_variation'
      });
    } catch (error) {
      console.error('Market overview error:', error);
      res.status(500).json({
        error: 'MARKET_OVERVIEW_ERROR',
        message: 'Unable to fetch market overview',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/market-data/config
 * Check API configuration (public endpoint)
 */
router.get('/config', 
  async (req: Request, res: Response) => {
    try {
      const hasKeys = {
        finnhub: !!process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'demo' && process.env.FINNHUB_API_KEY.length > 10,
        alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo' && process.env.ALPHA_VANTAGE_API_KEY.length > 10,
        fmp: !!process.env.FMP_API_KEY && process.env.FMP_API_KEY !== 'demo' && process.env.FMP_API_KEY.length > 10,
        twelveData: !!process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo' && process.env.TWELVE_DATA_API_KEY.length > 10,
        polygon: !!process.env.POLYGON_API_KEY && process.env.POLYGON_API_KEY !== 'demo' && process.env.POLYGON_API_KEY.length > 10,
      };

      const configuredCount = Object.values(hasKeys).filter(Boolean).length;
      const providerStatus = providerManager.getProviderStatus();
      
      res.json({
        status: 'ok',
        hasRealData: configuredCount > 0,
        configuredProviders: configuredCount,
        providers: hasKeys,
        activeProviders: providerStatus,
        cache: {
          enabled: true,
          provider: 'supabase'
        },
        message: configuredCount > 0 ? 
          `${configuredCount} API provider(s) configured with cache` : 
          'No API keys configured - using demo data only',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Config check error:', error);
      res.status(500).json({
        status: 'error',
        hasRealData: false,
        message: 'Failed to check configuration',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/health
 * Health check endpoint
 */
router.get('/health', 
  async (req: Request, res: Response) => {
    try {
      const providerStatus = providerManager.getProviderStatus();
      const cacheStats = await cacheService.getCacheStats();
      
      const response = {
        status: 'healthy',
        providers: {
          total: providerStatus.length,
          healthy: providerStatus.filter(p => p.healthy).length,
          list: providerStatus
        },
        cache: {
          enabled: true,
          stats: cacheStats
        },
        timestamp: new Date().toISOString()
      };

      console.log('✅ Health check response:', response);

      // Set CORS headers explicitly for this endpoint
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.json(response);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/market-data/cache/invalidate
 * Invalidate cache for specific symbols (admin only)
 */
router.post('/cache/invalidate',
  authService,
  async (req: Request, res: Response) => {
    try {
      const { symbols } = req.body;
      
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Symbols array is required',
        });
      }

      const results: Record<string, boolean> = {};
      
      for (const symbol of symbols) {
        try {
          await threeTierCache.invalidate(`quote:${symbol}`);
          await threeTierCache.invalidate(`fundamentals:${symbol}`);
          await threeTierCache.invalidate(`historical:${symbol}`);
          results[symbol] = true;
        } catch (error) {
          results[symbol] = false;
        }
      }

      console.log(`🗑️ Cache invalidated for: ${Object.keys(results).filter(k => results[k]).join(', ')}`);

      res.json({
        message: 'Cache invalidation completed',
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cache invalidation error:', error);
      res.status(500).json({
        error: 'INVALIDATION_FAILED',
        message: 'Failed to invalidate cache',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/cache/stats
 * Get cache statistics (admin only)
 */
router.get('/cache/stats',
  authService,
  async (req: Request, res: Response) => {
    try {
      const stats = await threeTierCache.getStats();
      const health = await threeTierCache.healthCheck();
      
      res.json({
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cache stats error:', error);
      res.status(500).json({
        error: 'STATS_ERROR',
        message: 'Failed to get cache statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/market-data/reset-provider/:provider?
 * Reset provider health status (admin only)
 */
router.post('/reset-provider/:provider?',
  authService,
  async (req: Request, res: Response) => {
    try {
      const provider = req.params.provider;
      
      if (provider) {
        providerManager.resetProviderHealth(provider);
        console.log(`🔄 Reset health status for provider: ${provider}`);
      } else {
        providerManager.resetProviderHealth();
        console.log('🔄 Reset health status for all providers');
      }

      const status = providerManager.getProviderStatus();
      
      res.json({
        message: provider ? `Provider ${provider} health reset` : 'All providers health reset',
        providers: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Provider reset error:', error);
      res.status(500).json({
        error: 'RESET_FAILED',
        message: 'Failed to reset provider health',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/test
 * Simple test endpoint for connectivity checking
 */
router.get('/test', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Market data API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * GET /api/market-data/direct/quote/:symbol
 * PHASE 2: Direct FMP API call without cache
 * This endpoint connects directly to FMP for real-time data
 */
router.get('/direct/quote/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: validation.error.errors[0].message,
        });
      }

      const { symbol } = validation.data;
      console.log(`🎯 DIRECT FMP request for quote: ${symbol}`);
      
      // PHASE 2.5: Check Redis cache first (updated by ProactiveWorker)
      const cachedQuote = await cacheService.getQuote(symbol);
      if (cachedQuote) {
        console.log(`✅ Cache HIT for ${symbol} - serving in <1ms`);
        return res.json({
          ...cachedQuote,
          _cached: true,
          _cacheTime: cachedQuote.cachedAt || new Date().toISOString(),
          _source: cachedQuote.fromWorker ? 'proactive_worker' : 'cache',
        });
      }
      
      console.log(`❌ Cache MISS for ${symbol} - fetching from FMP`);

      // Direct FMP API call if cache miss
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${process.env.FMP_API_KEY}`,
        { timeout: 10000 } as any
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({
          error: 'QUOTE_NOT_FOUND',
          message: `No data found for ${symbol}`,
          symbol,
          timestamp: new Date().toISOString(),
        });
      }

      const quote = data[0];
      
      // Transform to our standard format
      const quoteResponse = {
        symbol: quote.symbol,
        price: quote.price || 0,
        change: quote.change || 0,
        changePercent: quote.changesPercentage || 0,
        high: quote.dayHigh || 0,
        low: quote.dayLow || 0,
        open: quote.open || 0,
        previousClose: quote.previousClose || 0,
        volume: quote.volume || 0,
        marketCap: quote.marketCap || 0,
        eps: quote.eps || null,
        pe: quote.pe || null,
        timestamp: new Date(quote.timestamp * 1000).toISOString(),
        provider: 'fmp_direct',
        _timestamp: Date.now(),
        _cached: false,
        _source: 'fmp_direct',
      };
      
      // PHASE 2.5: Cache the response for 60 seconds
      await cacheService.setQuote(symbol, quoteResponse, 60);

      console.log(`✅ Direct FMP: ${symbol} fetched successfully and cached`);
      res.json(quoteResponse);
    } catch (error) {
      console.error('Direct FMP quote fetch error:', error);
      
      res.status(503).json({
        error: 'QUOTE_FETCH_ERROR',
        message: 'Unable to fetch quote data from FMP',
        symbol: req.params.symbol,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/market-data/direct/batch
 * PHASE 2: Direct FMP batch quotes without cache
 */
router.post('/direct/batch',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = batchSymbolsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: validation.error.errors[0].message,
        });
      }

      const { symbols } = validation.data;
      const symbolString = symbols.join(',');
      
      console.log(`🎯 DIRECT FMP batch request for: ${symbolString}`);

      // Import our Redis cache service
      const { cacheService: redisCache } = await import('../services/cache-service');

      // Check cache for each symbol
      const cachedQuotes = await redisCache.getBatchQuotes(symbols);
      const uncachedSymbols: string[] = [];
      const resultQuotes: any[] = [];

      // Separate cached and uncached symbols
      for (const symbol of symbols) {
        if (cachedQuotes[symbol]) {
          console.log(`✅ Cache hit for ${symbol}`);
          resultQuotes.push(cachedQuotes[symbol]);
        } else {
          uncachedSymbols.push(symbol);
        }
      }

      // If all are cached, return immediately
      if (uncachedSymbols.length === 0) {
        console.log(`✅ All ${symbols.length} quotes served from Redis cache`);
        return res.json({
          quotes: resultQuotes,
          _timestamp: Date.now(),
          _cached: true,
          _source: 'redis_cache',
        });
      }

      // Fetch uncached symbols from FMP
      console.log(`📊 Fetching ${uncachedSymbols.length} uncached symbols from FMP...`);
      const uncachedString = uncachedSymbols.join(',');
      
      // Direct FMP API call for batch quotes
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${uncachedString}?apikey=${process.env.FMP_API_KEY}`,
        { timeout: 15000 } as any
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP');
      }

      // Transform and cache quotes
      const quotesToCache: Record<string, any> = {};
      for (const quote of data) {
        const formattedQuote = {
          symbol: quote.symbol,
          name: quote.name || '',
          price: quote.price || 0,
          change: quote.change || 0,
          changePercent: quote.changesPercentage || 0,
          high: quote.dayHigh || 0,
          low: quote.dayLow || 0,
          open: quote.open || 0,
          previousClose: quote.previousClose || 0,
          volume: quote.volume || 0,
          marketCap: quote.marketCap || 0,
          eps: quote.eps || null,
          pe: quote.pe || null,
          timestamp: new Date(quote.timestamp * 1000).toISOString(),
          provider: 'fmp_direct',
        };
        
        quotesToCache[quote.symbol] = formattedQuote;
        resultQuotes.push(formattedQuote);
      }

      // Cache the new quotes (60 second TTL)
      await redisCache.setQuotes(quotesToCache);

      const cacheHitRate = ((symbols.length - uncachedSymbols.length) / symbols.length * 100).toFixed(1);
      console.log(`✅ Batch complete: ${resultQuotes.length} quotes (${cacheHitRate}% cache hit rate)`);

      res.json({
        quotes: resultQuotes,
        _timestamp: Date.now(),
        _cached: uncachedSymbols.length === 0,
        _cacheHitRate: `${cacheHitRate}%`,
        _source: uncachedSymbols.length === 0 ? 'redis_cache' : 'mixed',
      });
    } catch (error) {
      console.error('Direct FMP batch fetch error:', error);
      
      res.status(503).json({
        error: 'BATCH_FETCH_ERROR',
        message: 'Unable to fetch batch quotes from FMP',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/market/movers
 * PHASE 2, Day 9: Market movers - gainers, losers, and active stocks
 * PHASE 2.5: Now with Redis caching for fast response times
 */
router.get('/market/movers',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      console.log('📈 Fetching market movers...');

      // Import our Redis cache service
      const { cacheService: redisCache } = await import('../services/cache-service');

      // Try cache first (5 minute TTL for market movers)
      const cached = await redisCache.getMarketMovers();
      if (cached) {
        console.log('✅ Market movers served from Redis cache');
        return res.json({
          ...cached,
          _cached: true,
          _cacheAge: Date.now() - cached.cachedAt,
          _source: 'redis_cache'
        });
      }

      // Check for FMP API key
      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      console.log('📊 Cache miss - fetching from FMP API...');

      // Fetch gainers, losers, and most active in parallel
      const [gainersRes, losersRes, activeRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${process.env.FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${process.env.FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=${process.env.FMP_API_KEY}`)
      ]);

      // Check responses
      if (!gainersRes.ok || !losersRes.ok || !activeRes.ok) {
        throw new Error('Failed to fetch market movers from FMP');
      }

      const [gainersData, losersData, activeData] = await Promise.all([
        gainersRes.json(),
        losersRes.json(),
        activeRes.json()
      ]);

      // Format and limit results (top 5 of each)
      const formatMover = (stock: any) => ({
        symbol: stock.symbol,
        name: stock.name || stock.companyName || '',
        price: stock.price || 0,
        change: stock.change || 0,
        changePercent: stock.changesPercentage || stock.changePercent || 0,
        volume: stock.volume || 0,
      });

      const moversResponse = {
        gainers: (Array.isArray(gainersData) ? gainersData : [])
          .slice(0, 5)
          .map(formatMover),
        losers: (Array.isArray(losersData) ? losersData : [])
          .slice(0, 5)
          .map(formatMover),
        mostActive: (Array.isArray(activeData) ? activeData : [])
          .slice(0, 5)
          .map(formatMover),
        timestamp: new Date().toISOString(),
        provider: 'fmp_direct',
        _cached: false,
        _source: 'fmp_market_movers'
      };

      // Cache the response for 5 minutes (300 seconds)
      await redisCache.setMarketMovers(moversResponse, 300);

      console.log(`✅ Market movers fetched and cached: ${moversResponse.gainers.length} gainers, ${moversResponse.losers.length} losers, ${moversResponse.mostActive.length} active`);
      
      res.json(moversResponse);
    } catch (error) {
      console.error('Market movers fetch error:', error);
      
      res.status(503).json({
        error: 'MOVERS_FETCH_ERROR',
        message: 'Unable to fetch market movers from FMP',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/direct/financials/:symbol
 * PHASE 2, Day 8: Direct FMP financial data for charts
 * PHASE 2.5: Now with Redis caching for 1 hour TTL
 */
router.get('/direct/financials/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: validation.error.errors[0].message,
        });
      }

      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter'; // Default to quarterly
      
      console.log(`📊 Fetching ${period} financials for ${symbol}`);

      // Import our Redis cache service
      const { cacheService: redisCache } = await import('../services/cache-service');

      // Try cache first (1 hour TTL for financial data)
      const cached = await redisCache.getFinancials(symbol, period);
      if (cached) {
        console.log(`✅ Financials for ${symbol} (${period}) served from Redis cache`);
        return res.json({
          ...cached,
          _cached: true,
          _cacheAge: Date.now() - cached.cachedAt,
          _source: 'redis_cache'
        });
      }

      // Check for FMP API key
      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      console.log(`📊 Cache miss - fetching from FMP API...`);

      // Fetch income statements from FMP
      const incomeUrl = `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?period=${period}&limit=12&apikey=${process.env.FMP_API_KEY}`;
      console.log(`🔍 Fetching income statements from FMP...`);
      
      const incomeResponse = await fetch(incomeUrl);
      
      if (!incomeResponse.ok) {
        throw new Error(`FMP API error: ${incomeResponse.status}`);
      }

      const incomeData = await incomeResponse.json();
      
      if (!Array.isArray(incomeData) || incomeData.length === 0) {
        return res.status(404).json({
          error: 'NO_DATA',
          message: `No financial data available for ${symbol}`,
        });
      }

      // Format data for charts (reverse to show oldest to newest)
      const sortedData = incomeData.reverse();
      
      const chartData = {
        symbol,
        period,
        revenue: sortedData.map(item => ({
          quarter: period === 'annual' ? item.date.substring(0, 4) : `${item.date.substring(0, 7)}`,
          value: Math.round((item.revenue || 0) / 1000000), // Convert to millions
        })),
        ebitda: sortedData.map(item => ({
          quarter: period === 'annual' ? item.date.substring(0, 4) : `${item.date.substring(0, 7)}`,
          value: Math.round((item.ebitda || 0) / 1000000), // Convert to millions
        })),
        netIncome: sortedData.map(item => ({
          quarter: period === 'annual' ? item.date.substring(0, 4) : `${item.date.substring(0, 7)}`,
          value: Math.round((item.netIncome || 0) / 1000000), // Convert to millions
        })),
        eps: sortedData.map(item => ({
          quarter: period === 'annual' ? item.date.substring(0, 4) : `${item.date.substring(0, 7)}`,
          value: item.eps || 0,
        })),
        operatingExpenses: sortedData.map(item => ({
          quarter: period === 'annual' ? item.date.substring(0, 4) : `${item.date.substring(0, 7)}`,
          value: Math.round((item.operatingExpenses || 0) / 1000000), // Convert to millions
        })),
        grossProfit: sortedData.map(item => ({
          quarter: period === 'annual' ? item.date.substring(0, 4) : `${item.date.substring(0, 7)}`,
          value: Math.round((item.grossProfit || 0) / 1000000), // Convert to millions
        })),
        // Add key metrics from the latest period
        latestMetrics: {
          revenue: incomeData[0].revenue || 0,
          revenueGrowth: incomeData[0].revenueGrowth || 0,
          grossProfitRatio: incomeData[0].grossProfitRatio || 0,
          operatingIncomeRatio: incomeData[0].operatingIncomeRatio || 0,
          netIncomeRatio: incomeData[0].netIncomeRatio || 0,
          ebitdaRatio: incomeData[0].ebitdaratio || 0,
          eps: incomeData[0].eps || 0,
          epsDiluted: incomeData[0].epsdiluted || 0,
        },
        provider: 'fmp_direct',
        _timestamp: Date.now(),
        _cached: false,
        _source: 'fmp_direct_financials',
      };

      // Cache the response for 1 hour (3600 seconds)
      await redisCache.setFinancials(symbol, period, chartData, 3600);

      console.log(`✅ Direct FMP: ${symbol} financials fetched and cached (${incomeData.length} periods)`);
      res.json(chartData);
    } catch (error) {
      console.error('Direct FMP financials fetch error:', error);
      
      res.status(503).json({
        error: 'FINANCIALS_FETCH_ERROR',
        message: 'Unable to fetch financial data from FMP',
        timestamp: new Date().toISOString(),
      });
    }
  }
);


/**
 * GET /api/market-data/quotes/batch
 * Get multiple quotes at once with caching
 * Protected by API key for public access
 */
router.get('/quotes/batch',
  marketDataApiKey,  // Use API key instead of user auth
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    console.log('📊 GET /api/market-data/quotes/batch endpoint hit');
    
    // Set Cache-Control headers (5 minutes)
    res.header('Cache-Control', 'public, max-age=300');
    res.header('Content-Type', 'application/json; charset=utf-8');
    
    try {
      // Parse symbols from query string
      const symbolsParam = req.query.symbols?.toString() || '';
      if (!symbolsParam) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'symbols query parameter is required',
        });
      }
      
      const symbols = symbolsParam.split(',').filter(s => s.trim());
      if (symbols.length === 0) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'At least one symbol is required',
        });
      }

      console.log(`📊 Batch quotes request for: ${symbols.join(', ')}`);

      const results: any[] = [];
      const errors: Record<string, string> = {};

      // Resolve aliases using FMP stable search-symbol and cache mapping for 24h
      const { redisCacheService } = await import('../cache/redis-cache-service');
      const aliases: Record<string, string> = {};
      const apiKey = process.env.FMP_API_KEY as string;
      await Promise.all(symbols.map(async (raw) => {
        const upper = raw.toUpperCase();
        const aliasKey = `alias:${upper}`;
        let canonical = await redisCacheService.get<string>(aliasKey);
        if (!canonical) {
          try {
            const searchUrl = `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(upper)}&limit=1&apikey=${apiKey}`;
            const r = await fetch(searchUrl);
            if (r.ok) {
              const arr = await r.json().catch(() => []);
              canonical = Array.isArray(arr) && arr[0]?.symbol ? String(arr[0].symbol).toUpperCase() : upper;
            } else {
              canonical = upper;
            }
          } catch {
            canonical = upper;
          }
          await redisCacheService.set(aliasKey, canonical, 86400);
        }
        aliases[upper] = canonical;
      }));

      // Deduplicate and fetch batch via cache service
      const canonicalList = [...new Set(symbols.map(s => aliases[s.toUpperCase()]))];
      const quotesByCan = await simpleCacheService.getBatchQuotes(canonicalList);

      // Build result respecting original order and mapping back to raw symbol
      for (const raw of symbols) {
        const upper = raw.toUpperCase();
        const can = aliases[upper] || upper;
        const quote = quotesByCan[can];
        if (quote) {
          results.push({
            ...quote,
            symbol: upper, // map back to requested symbol (e.g., BRK.B)
            _timestamp: Date.now(),
            _cached: true,
            _source: 'simple_cache',
          });
        } else {
          errors[upper] = 'Failed to fetch quote';
        }
      }

      console.log(`✅ Batch quotes: ${results.length} success, ${Object.keys(errors).length} failed (aliases applied)`);

      res.json({
        quotes: results,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        _timestamp: Date.now(),
        _cached: true,
        _source: 'simple_cache',
      });
    } catch (error) {
      console.error('Batch quotes error:', error);
      res.status(500).json({
        error: 'BATCH_FETCH_ERROR',
        message: 'Failed to fetch batch quotes',
      });
    }
  }
);

/**
 * GET /api/market-data/dcf/:symbol
 * PHASE 7: Fetch cash flow and financial data for DCF calculations
 * Provides Free Cash Flow, growth rates, and other metrics needed for intrinsic value
 */
router.get('/dcf/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    const validation = z.object({
      symbol: z.string().toUpperCase(),
    }).safeParse({
      symbol: req.params.symbol,
    });

    if (!validation.success) {
      return res.status(400).json({
        error: 'INVALID_SYMBOL',
        message: 'Invalid stock symbol',
      });
    }

    try {
      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter';
      
      console.log(`💰 Fetching DCF data for ${symbol} (${period})`);

      // Import Redis cache
      const { cacheService: redisCache } = await import('../services/cache-service');
      
      // Check cache first
      const cacheKey = `dcf:${symbol}:${period}`;
      const cached = await redisCache.get(cacheKey);
      
      if (cached) {
        console.log(`💰 Cache hit for DCF data: ${symbol}`);
        return res.json({
          ...cached,
          _cached: true,
          _timestamp: Date.now(),
        });
      }

      // Fetch from FMP if not cached
      const [cashFlowRes, incomeRes, balanceRes, keyMetricsRes] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${symbol}?period=${period}&limit=10&apikey=${process.env.FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/income-statement/${symbol}?period=${period}&limit=10&apikey=${process.env.FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${symbol}?period=${period}&limit=10&apikey=${process.env.FMP_API_KEY}`),
        fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?period=${period}&limit=10&apikey=${process.env.FMP_API_KEY}`)
      ]);

      const [cashFlowData, incomeData, balanceData, keyMetrics] = await Promise.all([
        cashFlowRes.json(),
        incomeRes.json(),
        balanceRes.json(),
        keyMetricsRes.json()
      ]);

      // Calculate Free Cash Flow (FCF) history
      const fcfHistory = cashFlowData.slice(0, 5).map((item: any) => ({
        period: item.date,
        freeCashFlow: item.freeCashFlow || (item.operatingCashFlow - item.capitalExpenditure),
        operatingCashFlow: item.operatingCashFlow,
        capitalExpenditure: item.capitalExpenditure,
      }));

      // Calculate growth rates
      const revenueGrowth = incomeData.length >= 2 ? 
        ((incomeData[0].revenue - incomeData[1].revenue) / incomeData[1].revenue) * 100 : 0;
      
      const fcfGrowth = fcfHistory.length >= 2 && fcfHistory[1].freeCashFlow > 0 ? 
        ((fcfHistory[0].freeCashFlow - fcfHistory[1].freeCashFlow) / fcfHistory[1].freeCashFlow) * 100 : 0;

      // Get latest metrics
      const latestMetrics = keyMetrics[0] || {};
      const latestIncome = incomeData[0] || {};
      const latestBalance = balanceData[0] || {};
      const latestCashFlow = cashFlowData[0] || {};

      // Calculate average FCF growth rate (3-year CAGR if available)
      let fcfCAGR = 0;
      if (fcfHistory.length >= 4 && fcfHistory[3].freeCashFlow > 0) {
        const beginningFCF = fcfHistory[3].freeCashFlow;
        const endingFCF = fcfHistory[0].freeCashFlow;
        fcfCAGR = (Math.pow(endingFCF / beginningFCF, 1/3) - 1) * 100;
      }

      const dcfData = {
        symbol,
        period,
        currentPrice: latestMetrics.priceBookValueRatio * latestMetrics.bookValuePerShare || 0,
        
        // FCF Data
        freeCashFlow: latestCashFlow.freeCashFlow || (latestCashFlow.operatingCashFlow - latestCashFlow.capitalExpenditure),
        fcfHistory,
        fcfGrowthRate: fcfGrowth,
        fcfCAGR,
        
        // Financial Metrics
        revenue: latestIncome.revenue,
        netIncome: latestIncome.netIncome,
        eps: latestIncome.eps,
        epsGrowth: latestMetrics.revenueGrowth || revenueGrowth,
        
        // Valuation Metrics
        peRatio: latestMetrics.peRatio || (latestMetrics.priceBookValueRatio * latestMetrics.returnOnEquity) || 15,
        pegRatio: latestMetrics.pegRatio || 1,
        priceToFCF: latestMetrics.pfcfRatio || 0,
        
        // Balance Sheet
        totalDebt: latestBalance.totalDebt || 0,
        cashAndEquivalents: latestBalance.cashAndCashEquivalents || 0,
        sharesOutstanding: latestIncome.weightedAverageShsOut || latestBalance.commonStock || 0,
        
        // Profitability
        roic: latestMetrics.roic || 0,
        roe: latestMetrics.roe || 0,
        
        // Suggested DCF Parameters
        suggestedGrowthRate: Math.min(Math.max(fcfCAGR, 0), 20), // Cap at 20%
        suggestedTerminalGrowth: 3, // Conservative terminal growth
        suggestedDiscountRate: 10, // Standard WACC approximation
      };

      // Cache for 1 hour
      await redisCache.set(cacheKey, dcfData, 3600);

      console.log(`✅ DCF data fetched for ${symbol}`);
      res.json({
        ...dcfData,
        _cached: false,
        _timestamp: Date.now(),
      });

    } catch (error) {
      console.error('DCF data fetch error:', error);
      res.status(503).json({
        error: 'DCF_FETCH_ERROR',
        message: 'Failed to fetch DCF data',
      });
    }
  }
);

/**
 * GET /api/market-data/profile/:symbol
 * Get company profile information
 */
router.get('/profile/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      console.log(`🏢 Fetching company profile for ${symbol}`);

      // Use the existing FMP provider which has built-in caching
      const fmpProvider = new FMPProvider(process.env.FMP_API_KEY || '');
      
      try {
        const fundamentals = await fmpProvider.getFundamentals(symbol);
        
        res.json({
          ...fundamentals,
          _cached: false,
          _timestamp: Date.now(),
        });
      } catch (providerError) {
        // Fallback to direct API call if provider fails
        const response = await axios.get(
          `https://financialmodelingprep.com/api/v3/profile/${symbol}`,
          {
            params: { apikey: process.env.FMP_API_KEY },
            timeout: 10000
          }
        );
        
        const data = response.data;
        const profile = Array.isArray(data) ? data[0] : data || {};

        res.json({
          ...profile,
          _cached: false,
          _timestamp: Date.now(),
        });
      }

    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(503).json({
        error: 'PROFILE_FETCH_ERROR',
        message: 'Failed to fetch company profile',
      });
    }
  }
);

/**
 * GET /api/market-data/historical-price-full/:symbol
 * Get historical price data for charts
 */
router.get('/historical-price-full/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const from = req.query.from || '';
      const to = req.query.to || '';
      
      console.log(`📈 Fetching historical prices for ${symbol}`);

      // Use the existing FMP provider which has built-in caching
      const fmpProvider = new FMPProvider(process.env.FMP_API_KEY || '');
      
      try {
        const historical = await fmpProvider.getHistorical(symbol, '1y');
        
        res.json({
          ...historical,
          _cached: false,
          _timestamp: Date.now(),
        });
      } catch (providerError) {
        // Fallback to direct API call if provider fails
        const params: any = { apikey: process.env.FMP_API_KEY };
        if (from) params.from = from;
        if (to) params.to = to;
        
        const response = await axios.get(
          `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}`,
          {
            params,
            timeout: 10000
          }
        );
        const data = response.data;

        res.json({
          ...data,
          _cached: false,
          _timestamp: Date.now(),
        });
      }

    } catch (error) {
      console.error('Historical price fetch error:', error);
      res.status(503).json({
        error: 'HISTORICAL_FETCH_ERROR',
        message: 'Failed to fetch historical prices',
      });
    }
  }
);

/**
 * GET /api/market-data/income-statement/:symbol
 * Get income statement data
 */
router.get('/income-statement/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter';
      const limit = req.query.limit || '12';
      
      console.log(`💵 Fetching income statement for ${symbol} (${period})`);

      // TODO: Add caching once generic cache methods are available

      // Fetch from FMP using axios
      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/income-statement/${symbol}`,
        {
          params: { 
            period, 
            limit, 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      const data = response.data;

      // TODO: Cache for 1 hour

      res.json({
        data,
        _cached: false,
        _timestamp: Date.now(),
      });

    } catch (error) {
      console.error('Income statement fetch error:', error);
      res.status(503).json({
        error: 'INCOME_FETCH_ERROR',
        message: 'Failed to fetch income statement',
      });
    }
  }
);

/**
 * GET /api/market-data/key-metrics/:symbol
 * Get key financial metrics
 */
router.get('/key-metrics/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter';
      const limit = req.query.limit || '10';
      
      console.log(`📊 Fetching key metrics for ${symbol} (${period})`);

      // TODO: Add caching once generic cache methods are available

      // Fetch from FMP using axios
      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}`,
        {
          params: { 
            period, 
            limit, 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      const data = response.data;

      // TODO: Cache for 1 hour

      res.json({
        data,
        _cached: false,
        _timestamp: Date.now(),
      });

    } catch (error) {
      console.error('Key metrics fetch error:', error);
      res.status(503).json({
        error: 'METRICS_FETCH_ERROR',
        message: 'Failed to fetch key metrics',
      });
    }
  }
);

/**
 * GET /api/market-data/news/:symbol
 * Get company news
 */
router.get('/news/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const limit = req.query.limit || '10';
      
      console.log(`📰 Fetching news for ${symbol}`);

      // Use the existing FMP provider which has built-in caching
      const fmpProvider = new FMPProvider(process.env.FMP_API_KEY || '');
      
      try {
        const news = await fmpProvider.getNews(symbol, parseInt(limit as string));
        
        res.json({
          ...news,
          _cached: false,
          _timestamp: Date.now(),
        });
      } catch (providerError) {
        // Fallback to direct API call if provider fails
        const response = await axios.get(
          `https://financialmodelingprep.com/api/v3/stock_news`,
          {
            params: { 
              tickers: symbol, 
              limit, 
              apikey: process.env.FMP_API_KEY 
            },
            timeout: 10000
          }
        );
        
        const data = response.data;

        res.json({
          articles: data,
          _cached: false,
          _timestamp: Date.now(),
        });
      }

    } catch (error) {
      console.error('News fetch error:', error);
      res.status(503).json({
        error: 'NEWS_FETCH_ERROR',
        message: 'Failed to fetch news',
      });
    }
  }
);

/**
 * FMP PROXY ENDPOINTS FOR COMPARE PAGE
 * These endpoints are used by the frontend FMPService
 */

/**
 * GET /api/market-data/fmp/key-metrics/:symbol
 * Proxy endpoint for FMP key metrics
 */
router.get('/fmp/key-metrics/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter';
      const limit = req.query.limit || '10';
      
      console.log(`📊 [FMP Proxy] Fetching key metrics for ${symbol}`);

      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}`,
        {
          params: { 
            period, 
            limit, 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      res.json(response.data);

    } catch (error) {
      console.error('FMP key metrics proxy error:', error);
      res.status(503).json({
        error: 'FMP_PROXY_ERROR',
        message: 'Failed to fetch key metrics from FMP',
      });
    }
  }
);

/**
 * GET /api/market-data/fmp/income-statement/:symbol
 * Proxy endpoint for FMP income statement
 */
router.get('/fmp/income-statement/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter';
      const limit = req.query.limit || '10';
      
      console.log(`💵 [FMP Proxy] Fetching income statement for ${symbol}`);

      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/income-statement/${symbol}`,
        {
          params: { 
            period, 
            limit, 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      res.json(response.data);

    } catch (error) {
      console.error('FMP income statement proxy error:', error);
      res.status(503).json({
        error: 'FMP_PROXY_ERROR',
        message: 'Failed to fetch income statement from FMP',
      });
    }
  }
);

/**
 * GET /api/market-data/fmp/balance-sheet-statement/:symbol
 * Proxy endpoint for FMP balance sheet
 */
router.get('/fmp/balance-sheet-statement/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter';
      const limit = req.query.limit || '10';
      
      console.log(`💰 [FMP Proxy] Fetching balance sheet for ${symbol}`);

      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${symbol}`,
        {
          params: { 
            period, 
            limit, 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      res.json(response.data);

    } catch (error) {
      console.error('FMP balance sheet proxy error:', error);
      res.status(503).json({
        error: 'FMP_PROXY_ERROR',
        message: 'Failed to fetch balance sheet from FMP',
      });
    }
  }
);

/**
 * GET /api/market-data/fmp/cash-flow-statement/:symbol
 * Proxy endpoint for FMP cash flow statement
 */
router.get('/fmp/cash-flow-statement/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      const period = req.query.period === 'annual' ? 'annual' : 'quarter';
      const limit = req.query.limit || '10';
      
      console.log(`💸 [FMP Proxy] Fetching cash flow for ${symbol}`);

      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/cash-flow-statement/${symbol}`,
        {
          params: { 
            period, 
            limit, 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      res.json(response.data);

    } catch (error) {
      console.error('FMP cash flow proxy error:', error);
      res.status(503).json({
        error: 'FMP_PROXY_ERROR',
        message: 'Failed to fetch cash flow from FMP',
      });
    }
  }
);

/**
 * GET /api/market-data/fmp/profile/:symbol
 * Proxy endpoint for FMP company profile
 */
router.get('/fmp/profile/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      
      console.log(`🏢 [FMP Proxy] Fetching profile for ${symbol}`);

      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/profile/${symbol}`,
        {
          params: { 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      res.json(response.data);

    } catch (error) {
      console.error('FMP profile proxy error:', error);
      res.status(503).json({
        error: 'FMP_PROXY_ERROR',
        message: 'Failed to fetch profile from FMP',
      });
    }
  }
);

/**
 * GET /api/market-data/fmp/quote-short/:symbol
 * Proxy endpoint for FMP short quote
 */
router.get('/fmp/quote-short/:symbol',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: 'Invalid stock symbol',
        });
      }

      const symbol = validation.data.symbol;
      
      console.log(`📈 [FMP Proxy] Fetching short quote for ${symbol}`);

      if (!process.env.FMP_API_KEY || process.env.FMP_API_KEY === 'demo') {
        return res.status(503).json({
          error: 'FMP_NOT_CONFIGURED',
          message: 'FMP API key not configured',
        });
      }

      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/quote-short/${symbol}`,
        {
          params: { 
            apikey: process.env.FMP_API_KEY 
          },
          timeout: 10000
        }
      );
      
      res.json(response.data);

    } catch (error) {
      console.error('FMP quote-short proxy error:', error);
      res.status(503).json({
        error: 'FMP_PROXY_ERROR',
        message: 'Failed to fetch quote from FMP',
      });
    }
  }
);

export default router;
/**
 * GET /api/market-data/extended-hours/:symbol
 * Prefer FMP stable endpoints; fallback to v4 if needed (pre-market)
 */
router.get('/extended-hours/:symbol', async (req: Request, res: Response) => {
  try {
    const raw = String(req.params.symbol || '').toUpperCase().trim();
    if (!raw) return res.status(400).json({ error: 'INVALID_SYMBOL' });
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey || apiKey === 'demo') return res.status(503).json({ error: 'FMP_NOT_CONFIGURED' });

    const { redisCacheService } = await import('../cache/redis-cache-service');
    const { simpleCacheService } = await import('../services/simple-cache-service');

    // Resolve canonical symbol once and cache alias
    const aliasKey = `alias:${raw}`;
    let canonical = await redisCacheService.get<string>(aliasKey);
    if (!canonical) {
      const searchUrl = `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(raw)}&limit=1&apikey=${apiKey}`;
      try {
        const s = await fetch(searchUrl);
        if (s.ok) {
          const arr = await s.json().catch(() => []);
          const sym = Array.isArray(arr) && arr[0]?.symbol ? String(arr[0].symbol).toUpperCase() : raw;
          canonical = sym;
          await redisCacheService.set(aliasKey, canonical, 86400); // 24h
        } else {
          canonical = raw;
        }
      } catch {
        canonical = raw;
      }
    }

    const cacheKey = `ext:${raw}`;
    const cached = await redisCacheService.get(cacheKey);
    if (cached) return res.json(cached);

    // Stable after-hours quote
    const aftUrl = `https://financialmodelingprep.com/stable/aftermarket-quote?symbol=${encodeURIComponent(canonical)}&apikey=${apiKey}`;
    // v4 pre-market quote (stable variant not documented no batch):
    const preUrl = `https://financialmodelingprep.com/api/v4/pre-market-quote/${encodeURIComponent(canonical)}?apikey=${apiKey}`;
    
    const [aftRes, preRes] = await Promise.all([
      fetch(aftUrl),
      fetch(preUrl)
    ]);

    const [aftData, preData] = await Promise.all([
      aftRes.ok ? aftRes.json() : Promise.resolve([]),
      preRes.ok ? preRes.json() : Promise.resolve([])
    ]);

    // Get previous close via our cache/quote
    const baseQuote = await simpleCacheService.getQuote(raw) || undefined;
    const prevClose = Number((baseQuote as any)?.previousClose || 0);

    const normAft = (() => {
      const d = Array.isArray(aftData) ? aftData[0] : undefined;
      if (!d) return null;
      const bid = Number(d.bidPrice || d.bid || 0);
      const ask = Number(d.askPrice || d.ask || 0);
      const price = ask > 0 ? ask : (bid > 0 ? bid : 0);
      const ch = prevClose > 0 && price > 0 ? price - prevClose : 0;
      const chp = prevClose > 0 && price > 0 ? (ch / prevClose) * 100 : 0;
      return {
        price,
        change: ch,
        changePercent: chp,
        volume: Number(d.volume || 0),
        timestamp: d.timestamp ? new Date(d.timestamp).toISOString() : new Date().toISOString()
      };
    })();

    const normPre = (() => {
      const d = Array.isArray(preData) ? preData[0] : undefined;
      if (!d) return null;
      const bid = Number(d.bid || 0);
      const ask = Number(d.ask || 0);
      const price = ask > 0 ? ask : (bid > 0 ? bid : 0);
      const ch = prevClose > 0 && price > 0 ? price - prevClose : 0;
      const chp = prevClose > 0 && price > 0 ? (ch / prevClose) * 100 : 0;
      return {
        price,
        change: ch,
        changePercent: chp,
        volume: Number(d.volume || 0),
        timestamp: d.timestamp ? new Date(d.timestamp).toISOString() : new Date().toISOString()
      };
    })();

    // Session calculation (aprox ET)
    const now = new Date();
    const hourUTC = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isPre = isWeekday && hourUTC >= 8 && hourUTC < 13; // ~4–9 ET
    const isReg = isWeekday && hourUTC >= 13 && hourUTC < 20; // ~9–16 ET
    const isAft = isWeekday && hourUTC >= 20 && hourUTC < 24; // ~16–20 ET

    const out = {
      preMarket: normPre,
      afterHours: normAft,
      isExtendedHours: isPre || isAft,
      currentSession: (isPre ? 'pre-market' : isReg ? 'regular' : isAft ? 'after-hours' : 'closed') as 'pre-market' | 'regular' | 'after-hours' | 'closed'
    };

    const ttl = out.isExtendedHours ? 30 : 300;
    await redisCacheService.set(cacheKey, out as any, ttl);
    res.json(out);
  } catch (error) {
    res.status(500).json({ error: 'EXTENDED_HOURS_ERROR' });
  }
});

/**
 * POST /api/market-data/extended-hours/batch
 * Returns aftermarket quotes for multiple symbols (stable batch), with alias resolution
 */
router.post('/extended-hours/batch', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey || apiKey === 'demo') return res.status(503).json({ error: 'FMP_NOT_CONFIGURED' });
    const symbols: string[] = Array.isArray(req.body?.symbols) ? req.body.symbols : [];
    if (!symbols.length) return res.status(400).json({ error: 'INVALID_REQUEST', message: 'symbols required' });

    const { redisCacheService } = await import('../cache/redis-cache-service');

    // Resolve aliases
    const aliases: Record<string, string> = {};
    await Promise.all(symbols.map(async (s) => {
      const raw = String(s || '').toUpperCase().trim();
      const aliasKey = `alias:${raw}`;
      let can = await redisCacheService.get<string>(aliasKey);
      if (!can) {
        const url = `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(raw)}&limit=1&apikey=${apiKey}`;
        try {
          const r = await fetch(url);
          if (r.ok) {
            const arr = await r.json().catch(() => []);
            can = Array.isArray(arr) && arr[0]?.symbol ? String(arr[0].symbol).toUpperCase() : raw;
            await redisCacheService.set(aliasKey, can, 86400);
          } else {
            can = raw;
          }
        } catch {
          can = raw;
        }
      }
      aliases[raw] = can || raw;
    }));

    const canSymbols = [...new Set(Object.values(aliases))];
    const batchUrl = `https://financialmodelingprep.com/stable/batch-aftermarket-quote?symbols=${encodeURIComponent(canSymbols.join(','))}&apikey=${apiKey}`;
    const r = await fetch(batchUrl);
    const arr = r.ok ? await r.json().catch(() => []) : [];

    // Build map back to original symbols
    const map: Record<string, any> = {};
    const byCan: Record<string, any> = {};
    if (Array.isArray(arr)) {
      for (const it of arr) {
        const sym = String(it.symbol || '').toUpperCase();
        byCan[sym] = it;
      }
    }
    // previousClose not provided here; UI can just show price/volume
    for (const raw of symbols.map(s => String(s).toUpperCase())) {
      const can = aliases[raw] || raw;
      const it = byCan[can];
      if (it) {
        map[raw] = {
          symbol: raw,
          bidPrice: Number(it.bidPrice || it.bid || 0),
          askPrice: Number(it.askPrice || it.ask || 0),
          volume: Number(it.volume || 0),
          timestamp: it.timestamp ? new Date(it.timestamp).toISOString() : new Date().toISOString()
        };
      } else {
        map[raw] = null;
      }
    }

    res.json({ quotes: map, _source: 'stable_aftermarket' });
  } catch (error) {
    res.status(500).json({ error: 'EXTENDED_HOURS_BATCH_ERROR' });
  }
});
