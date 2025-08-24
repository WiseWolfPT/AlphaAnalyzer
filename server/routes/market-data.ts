import { Router, Request, Response } from 'express';
import { z } from 'zod';
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
import { redditStrategy } from '../services/reddit-strategy';
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

      // ✅ REDDIT STRATEGY - Users NEVER trigger API calls!
      const quote = await redditStrategy.getQuoteForUser(symbol);
      
      // If no data or stale, queue for background update
      if (!quote || quote.isStale) {
        return res.json({
          symbol,
          message: "Dados sendo atualizados... Recarregue em 1 minuto",
          isStale: true,
          timestamp: new Date().toISOString(),
        });
      }

      const quoteData = quote;
      
      if (!quoteData) {
        return res.status(404).json({
          error: 'QUOTE_NOT_FOUND',
          message: `Unable to fetch quote for ${symbol}. All providers failed.`,
          symbol,
          timestamp: new Date().toISOString(),
        });
      }

      // Add cache information to response
      const quoteResponse = {
        ...quoteData,
        _timestamp: Date.now(),
        _cached: true,
        _source: 'reddit_strategy',
      };

      console.log(`✅ Reddit Strategy: ${symbol} served from cache (provider: ${quoteData.provider || 'cached'})`);

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
        _source: 'reddit_strategy',
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
        _source: 'reddit_strategy',
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

      // Direct FMP API call - NO CACHE!
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

      console.log(`✅ Direct FMP: ${symbol} fetched successfully`);
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

      // Direct FMP API call for batch quotes
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbolString}?apikey=${process.env.FMP_API_KEY}`,
        { timeout: 15000 } as any
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP');
      }

      // Transform all quotes to our standard format
      const quotes = data.map(quote => ({
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
      }));

      console.log(`✅ Direct FMP batch: ${quotes.length} quotes fetched successfully`);

      res.json({
        quotes,
        _timestamp: Date.now(),
        _cached: false,
        _source: 'fmp_direct',
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

      // ✅ REDDIT STRATEGY - Batch quotes from cache only!
      const quotes = await redditStrategy.getBatchQuotesForUser(symbols);
      
      // Transform to API response format
      for (const quote of quotes) {
        if (quote && !quote.isStale) {
          results.push({
            ...quote,
            _timestamp: Date.now(),
            _cached: true,
            _source: 'reddit_strategy',
          });
        } else if (quote && quote.isStale) {
          // Return stale data with indication
          results.push({
            ...quote,
            _timestamp: Date.now(),
            _cached: true,
            _source: 'reddit_strategy',
            _stale: true,
          });
        }
      }

      // Add errors for symbols that failed
      for (const symbol of symbols) {
        if (!results.find(r => r.symbol === symbol)) {
          errors[symbol] = 'Failed to fetch quote';
        }
      }

      console.log(`✅ Batch quotes: ${results.length} success, ${Object.keys(errors).length} failed (via Reddit Strategy)`);

      res.json({
        quotes: results,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        _timestamp: Date.now(),
        _cached: true,
        _source: 'reddit_strategy',
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

export default router;