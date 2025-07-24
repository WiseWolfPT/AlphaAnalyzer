import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth-middleware';
import { demoAuthMiddleware, optionalDemoAuth } from '../middleware/demo-auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
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
  FMPProvider
} from '../services/providers';
import { CacheService } from '../services/cache-service';

const router = Router();

// Simple test endpoint to verify connectivity
// Test endpoint moved to line 848 with more comprehensive testing

// Use optional authentication for market data endpoints (public access allowed)
const isDevelopment = process.env.NODE_ENV !== 'production';
// Market data should be publicly accessible - always use demo auth that allows public access
const authService = optionalDemoAuth(); // Always allow public access to market data

// Initialize the enhanced market data service
const marketDataService = new ServerMarketDataService();

// Initialize the new provider manager
const providerManager = new ProviderManager();

// Initialize providers in priority order
if (process.env.POLYGON_API_KEY && process.env.POLYGON_API_KEY !== 'demo') {
  providerManager.addProvider(new PolygonProvider(process.env.POLYGON_API_KEY));
}
if (process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo') {
  providerManager.addProvider(new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY));
}
if (process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'demo') {
  providerManager.addProvider(new FinnhubProvider(process.env.FINNHUB_API_KEY));
}
if (process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo') {
  providerManager.addProvider(new TwelveDataProvider(process.env.TWELVE_DATA_API_KEY));
}
if (process.env.FMP_API_KEY && process.env.FMP_API_KEY !== 'demo') {
  providerManager.addProvider(new FMPProvider(process.env.FMP_API_KEY));
}

// Initialize cache service (Agent 2's implementation)
const cacheService = new CacheService();

// SECURITY FIX: Replace simple Map with secure LRU cache to prevent memory exhaustion
const marketDataCache = createMarketDataCache();
const searchCache = createSearchCache();
const CACHE_TTL = 60 * 1000; // 60 segundos de cache para dados de mercado

// Rate limiting específico para market data
const marketDataRateLimit = rateLimitMiddleware.endpointRateLimit('/api/market-data', {
  'free': 30,     // 30 requests per hour
  'pro': 120,     // 120 requests per hour  
  'premium': 500, // 500 requests per hour
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

// Configuração dos providers de API
const API_PROVIDERS = {
  FINNHUB: {
    name: 'Finnhub',
    baseUrl: 'https://finnhub.io/api/v1',
    getKey: () => process.env.FINNHUB_API_KEY,
    rateLimit: { perMinute: 60 },
  },
  ALPHA_VANTAGE: {
    name: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co/query',
    getKey: () => process.env.ALPHA_VANTAGE_API_KEY,
    rateLimit: { perMinute: 5 },
  },
  TWELVE_DATA: {
    name: 'Twelve Data',
    baseUrl: 'https://api.twelvedata.com',
    getKey: () => process.env.TWELVE_DATA_API_KEY,
    rateLimit: { perDay: 800 },
  },
  FMP: {
    name: 'Financial Modeling Prep',
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    getKey: () => process.env.FMP_API_KEY,
    rateLimit: { perDay: 250 },
  },
} as const;

// SECURITY FIX: Use LRU cache methods instead of direct Map access
function checkCache(key: string, cacheInstance: SecureLRUCache<any> = marketDataCache): any | null {
  return cacheInstance.get(key);
}

// SECURITY FIX: Comprehensive cache validation schemas to prevent poisoning
const QuoteCacheSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9\-\.]{1,10}$/, 'Invalid symbol format'),
  price: z.number().positive().finite(),
  change: z.number().finite(),
  changePercent: z.number().finite(),
  high: z.number().positive().finite().optional(),
  low: z.number().positive().finite().optional(),
  open: z.number().positive().finite().optional(),
  previousClose: z.number().positive().finite().optional(),
  volume: z.number().nonnegative().finite().optional(),
  timestamp: z.number().positive().optional(),
  provider: z.string().regex(/^[a-z_]+$/, 'Invalid provider format'),
  marketCap: z.number().positive().finite().optional(),
  eps: z.number().finite().optional(),
  pe: z.number().positive().finite().optional(),
  _timestamp: z.number().positive(),
  _cached: z.boolean(),
});

// SECURITY FIX: Additional validation schemas for other cache types
const SearchCacheSchema = z.object({
  results: z.array(z.object({
    symbol: z.string().regex(/^[A-Z0-9\-\.]{1,10}$/),
    name: z.string().max(100),
    type: z.string().regex(/^[A-Za-z\s]+$/),
    exchange: z.string().regex(/^[A-Z]+$/),
  })).max(50), // Limit results to prevent memory exhaustion
  count: z.number().nonnegative().max(50),
  _timestamp: z.number().positive(),
});

const BatchQuotesCacheSchema = z.object({
  quotes: z.array(QuoteCacheSchema.omit({ _cached: true })).max(20),
  errors: z.record(z.string()).optional(),
  _timestamp: z.number().positive(),
});

// SECURITY FIX: Use LRU cache with built-in validation
function saveToCache(key: string, data: any, ttl: number = CACHE_TTL, cacheInstance: SecureLRUCache<any> = marketDataCache) {
  // The LRU cache handles all validation, size limits, and security checks
  return cacheInstance.set(key, data, ttl);
}

// SECURITY FIX: Data sanitization function for cache entries
function sanitizeCacheData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    // Remove potentially malicious content
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .slice(0, 1000); // Limit string length
  }
  
  if (typeof data === 'number') {
    // Ensure numbers are finite and within reasonable bounds
    if (!isFinite(data)) return 0;
    if (data > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
    if (data < Number.MIN_SAFE_INTEGER) return Number.MIN_SAFE_INTEGER;
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.slice(0, 100).map(sanitizeCacheData); // Limit array size
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    const maxKeys = 50; // Limit object keys
    let keyCount = 0;
    
    for (const key in data) {
      if (keyCount >= maxKeys) break;
      if (key.length > 100) continue; // Skip excessively long keys
      
      sanitized[key] = sanitizeCacheData(data[key]);
      keyCount++;
    }
    return sanitized;
  }
  
  return data;
}

// SECURITY FIX: LRU cache handles cleanup automatically, but add manual cleanup for extra safety
setInterval(() => {
  const cleaned = marketDataCache.cleanupExpired();
  const searchCleaned = searchCache.cleanupExpired();
  if (cleaned > 0 || searchCleaned > 0) {
    console.log(`Cache cleanup: removed ${cleaned} market data, ${searchCleaned} search entries`);
  }
}, 60 * 1000); // Executar a cada minuto

// Buscar cotação do Finnhub
async function fetchFromFinnhub(symbol: string): Promise<any> {
  const apiKey = API_PROVIDERS.FINNHUB.getKey();
  if (!apiKey || apiKey === 'demo') {
    throw new Error('Finnhub API key not configured');
  }

  const response = await fetch(
    `${API_PROVIDERS.FINNHUB.baseUrl}/quote?symbol=${symbol}&token=${apiKey}`,
    { 
      headers: { 'User-Agent': 'Alfalyzer/1.0' },
      signal: AbortSignal.timeout(5000), // 5 segundos timeout
    }
  );

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Finnhub rate limit exceeded');
    }
    throw new Error(`Finnhub API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Validar resposta
  if (!data || typeof data.c === 'undefined') {
    throw new Error('Invalid response from Finnhub');
  }

  // Normalizar dados do Finnhub
  return {
    symbol: symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    volume: data.v,
    timestamp: data.t,
    provider: 'finnhub',
  };
}

// Buscar cotação do Alpha Vantage
async function fetchFromAlphaVantage(symbol: string): Promise<any> {
  const apiKey = API_PROVIDERS.ALPHA_VANTAGE.getKey();
  if (!apiKey || apiKey === 'demo') {
    throw new Error('Alpha Vantage API key not configured');
  }

  const response = await fetch(
    `${API_PROVIDERS.ALPHA_VANTAGE.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
    { 
      headers: { 'User-Agent': 'Alfalyzer/1.0' },
      signal: AbortSignal.timeout(10000), // 10 segundos timeout (Alpha Vantage é mais lento)
    }
  );

  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Verificar se há dados
  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) {
    throw new Error('No data available from Alpha Vantage');
  }

  // Normalizar dados do Alpha Vantage
  return {
    symbol: quote['01. symbol'],
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
    high: parseFloat(quote['03. high']),
    low: parseFloat(quote['04. low']),
    open: parseFloat(quote['02. open']),
    previousClose: parseFloat(quote['08. previous close']),
    volume: parseInt(quote['06. volume']),
    timestamp: new Date(quote['07. latest trading day']).getTime() / 1000,
    provider: 'alpha_vantage',
  };
}

// Buscar cotação do FMP
async function fetchFromFMP(symbol: string): Promise<any> {
  const apiKey = API_PROVIDERS.FMP.getKey();
  if (!apiKey || apiKey === 'demo') {
    throw new Error('FMP API key not configured');
  }

  const response = await fetch(
    `${API_PROVIDERS.FMP.baseUrl}/quote/${symbol}?apikey=${apiKey}`,
    { 
      headers: { 'User-Agent': 'Alfalyzer/1.0' },
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!response.ok) {
    throw new Error(`FMP API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No data available from FMP');
  }

  const quote = data[0];
  
  // Normalizar dados do FMP
  return {
    symbol: quote.symbol,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changesPercentage,
    high: quote.dayHigh,
    low: quote.dayLow,
    open: quote.open,
    previousClose: quote.previousClose,
    volume: quote.volume,
    timestamp: quote.timestamp,
    provider: 'fmp',
    marketCap: quote.marketCap,
    eps: quote.eps,
    pe: quote.pe,
  };
}

// Yahoo Finance fallback (no API key required)
async function fetchFromYahooFinance(symbol: string): Promise<any> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
    { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Alfalyzer/1.0)' },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data?.chart?.result?.[0]) {
    throw new Error('No data available from Yahoo Finance');
  }

  const result = data.chart.result[0];
  const meta = result.meta;
  
  const price = meta.regularMarketPrice || meta.previousClose || 0;
  const previousClose = meta.previousClose || 0;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  // Normalizar dados do Yahoo Finance
  return {
    symbol: meta.symbol || symbol,
    price: price,
    change: change,
    changePercent: changePercent,
    high: meta.regularMarketDayHigh || 0,
    low: meta.regularMarketDayLow || 0,
    open: meta.regularMarketOpen || 0,
    previousClose: previousClose,
    volume: meta.regularMarketVolume || 0,
    timestamp: Math.floor(Date.now() / 1000),
    provider: 'yahoo_finance',
    marketCap: meta.marketCap || 0,
  };
}

// Twelve Data with demo key support
async function fetchFromTwelveData(symbol: string): Promise<any> {
  const apiKey = process.env.TWELVE_DATA_API_KEY || 'demo';
  
  const response = await fetch(
    `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`,
    { 
      headers: { 'User-Agent': 'Alfalyzer/1.0' },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    throw new Error(`Twelve Data API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code === 401) {
    throw new Error('Twelve Data: API key invalid');
  }
  
  if (!data.close) {
    throw new Error('No data available from Twelve Data');
  }

  // Normalizar dados do Twelve Data
  return {
    symbol: data.symbol,
    price: parseFloat(data.close),
    change: parseFloat(data.change),
    changePercent: parseFloat(data.percent_change),
    high: parseFloat(data.high),
    low: parseFloat(data.low),
    open: parseFloat(data.open),
    previousClose: parseFloat(data.previous_close),
    volume: parseInt(data.volume) || 0,
    timestamp: data.timestamp || Math.floor(Date.now() / 1000),
    provider: 'twelve_data',
  };
}

// Função principal para buscar cotação com fallback (DEPRECATED - use providerManager)
// Mantida temporariamente para compatibilidade
async function fetchQuoteWithFallback(symbol: string, userId?: string): Promise<any> {
  console.warn('DEPRECATED: fetchQuoteWithFallback called. Use providerManager.getQuoteWithFallback instead.');
  
  try {
    const quote = await providerManager.getQuoteWithFallback(symbol);
    
    // Log de sucesso
    if (userId) {
      dbUtils.logSecurityEvent({
        user_id: userId,
        action: 'market_data_fetch',
        resource: `quote_${symbol}`,
        success: true,
        details: { provider: quote.provider, symbol },
      });
    }
    
    return quote;
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/market-data/quote/:symbol
 * Buscar cotação de uma ação com dados reais usando o enhanced service
 */
router.get('/quote/:symbol',
  authService, // Optional auth - allows public access
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      // Validar símbolo
      const validation = stockSymbolSchema.safeParse({ symbol: req.params.symbol });
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_SYMBOL',
          message: validation.error.errors[0].message,
        });
      }

      const { symbol } = validation.data;

      console.log(`🔍 API request for quote: ${symbol}`);

      // Try cache first (Agent 2's cache service)
      const cachedData = await cacheService.getQuote(
        symbol,
        async () => {
          // Cache miss - fetch from providers with fallback
          return await providerManager.getQuoteWithFallback(symbol);
        }
      );

      const quoteData = cachedData.data;
      
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
        _cached: cachedData.cached,
        _expires_at: cachedData.expires_at,
      };

      console.log(`✅ Successfully fetched ${symbol} via ${quoteData.provider} (cached: ${cachedData.cached})`);

      res.json(quoteResponse);
    } catch (error) {
      console.error('Quote fetch error:', error);
      
      // Log de erro
      if (req.user?.id) {
        dbUtils.logSecurityEvent({
          user_id: req.user.id,
          action: 'market_data_fetch',
          resource: `quote_${req.params.symbol}`,
          success: false,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }

      // SECURITY FIX: Standardized error response for production
      const errorResponse = {
        error: 'MARKET_DATA_UNAVAILABLE',
        message: 'Unable to fetch market data. Please try again later.',
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
 * POST /api/market-data/quotes/batch
 * Buscar múltiplas cotações de uma vez
 */
router.post('/quotes/batch',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    console.log('📊 POST /api/market-data/quotes/batch endpoint hit');
    console.log('   Headers:', req.headers);
    console.log('   Body:', req.body);
    console.log('   Origin:', req.headers.origin);
    
    try {
      // Validar entrada
      const validation = batchSymbolsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: validation.error.errors[0].message,
        });
      }

      const { symbols } = validation.data;
      console.log(`📊 Batch quotes request for: ${symbols.join(', ')}`);
      
      const results: any[] = [];
      const errors: Record<string, string> = {};

      // Use cache service with provider manager for batch quotes
      const cachedBatch = await cacheService.getBatchQuotes(
        symbols,
        async () => {
          // Cache miss - fetch from providers with fallback
          return await providerManager.getBatchQuotesWithFallback(symbols);
        }
      );

      const quotes = cachedBatch.data;
      
      // Transform to API response format
      for (const quote of quotes) {
        if (quote) {
          results.push({
            ...quote,
            _timestamp: Date.now(),
            _cached: cachedBatch.cached,
          });
        }
      }

      // Add errors for symbols that failed
      for (const symbol of symbols) {
        if (!results.find(r => r.symbol === symbol)) {
          errors[symbol] = 'Failed to fetch quote';
        }
      }

      console.log(`✅ Batch quotes: ${results.length} success, ${Object.keys(errors).length} failed (cached: ${cachedBatch.cached})`);

      res.json({
        quotes: results,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        _timestamp: Date.now(),
        _cached: cachedBatch.cached,
        _expires_at: cachedBatch.expires_at,
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
 * GET /api/market-data/search
 * Buscar símbolos de ações
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
      const cached = checkCache(cacheKey, searchCache);
      if (cached) {
        return res.json(cached);
      }

      // Por enquanto, retornar resultados estáticos
      // Em produção, isso deveria buscar de uma API real
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

      saveToCache(cacheKey, results, 5 * 60 * 1000, searchCache); // Cache por 5 minutos
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
      // For now, return realistic mock data
      // In production, this would fetch from APIs like Alpha Vantage or FMP
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
 * Simple public endpoint to check API configuration (no auth required)
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
      
      res.json({
        status: 'ok',
        hasRealData: configuredCount > 0,
        configuredProviders: configuredCount,
        providers: hasKeys,
        yahooFinance: 'always available (no key required)',
        message: configuredCount > 0 ? 
          `${configuredCount} API provider(s) configured` : 
          'No API keys configured - using Yahoo Finance fallback',
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
 * Health check endpoint for frontend to check if real data is available
 */
// Import GET endpoints from Koyeb production config
import { setupMarketDataGETEndpoints } from '../koyeb-production';

// Setup additional GET endpoints for Koyeb
setupMarketDataGETEndpoints(router);

router.get('/health', 
  async (req: Request, res: Response) => {
    try {
      // Log request details for debugging
      console.log('🏥 Health check request:', {
        origin: req.headers.origin,
        referer: req.headers.referer,
        host: req.headers.host,
        ip: req.ip
      });

      // Check if any API keys are configured (not 'demo')
      const hasValidKeys = [
        process.env.FINNHUB_API_KEY,
        process.env.ALPHA_VANTAGE_API_KEY,
        process.env.FMP_API_KEY,
        process.env.TWELVE_DATA_API_KEY
      ].some(key => key && key !== 'demo');

      // Check if market data service is initialized
      const serviceStatus = marketDataService.getApiStatus();
      const hasActiveProviders = serviceStatus.availableProviders?.length > 0;

      const response = {
        status: 'healthy',
        hasRealData: hasValidKeys && hasActiveProviders,
        message: hasValidKeys ? 
          (hasActiveProviders ? 'Real market data available' : 'API keys configured but providers not initialized') :
          'Using fallback data (demo keys)',
        providers: {
          configured: [
            process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'demo' ? 'finnhub' : null,
            process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo' ? 'alpha_vantage' : null,
            process.env.FMP_API_KEY && process.env.FMP_API_KEY !== 'demo' ? 'fmp' : null,
            process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo' ? 'twelve_data' : null
          ].filter(Boolean),
          active: serviceStatus.availableProviders || []
        },
        cors: {
          origin: req.headers.origin || 'no-origin',
          allowed: true // This will be set by CORS middleware
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
        hasRealData: false,
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/market-data/test
 * Test API configuration and connectivity (public endpoint for testing)
 */
router.get('/test', 
  async (req: Request, res: Response) => {
    // Add explicit CORS headers for debugging
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const testSymbol = req.query.symbol as string || 'AAPL';
    const testResults: any = {
      timestamp: new Date().toISOString(),
      symbol: testSymbol,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        host: req.hostname,
        origin: req.headers.origin || 'no-origin',
        userAgent: req.headers['user-agent'],
      },
      providers: {},
      workingProviders: [],
      failedProviders: [],
    };

    // Test each provider individually
    const providers = [
      { name: 'twelve_data', fetch: fetchFromTwelveData },
      { name: 'yahoo_finance', fetch: fetchFromYahooFinance },
      { name: 'finnhub', fetch: fetchFromFinnhub },
      { name: 'fmp', fetch: fetchFromFMP },
      { name: 'alpha_vantage', fetch: fetchFromAlphaVantage },
    ];

    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const data = await provider.fetch(testSymbol);
        const responseTime = Date.now() - startTime;
        
        testResults.providers[provider.name] = {
          status: 'success',
          responseTime: responseTime,
          data: {
            symbol: data.symbol,
            price: data.price,
            provider: data.provider,
          },
        };
        testResults.workingProviders.push(provider.name);
      } catch (error) {
        testResults.providers[provider.name] = {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        testResults.failedProviders.push(provider.name);
      }
    }

    // Overall status
    testResults.overallStatus = testResults.workingProviders.length > 0 ? 'success' : 'failed';
    testResults.summary = {
      working: testResults.workingProviders.length,
      failed: testResults.failedProviders.length,
      total: providers.length,
    };

    res.json(testResults);
  }
);

/**
 * GET /api/market-data/status
 * Enhanced API status with real key validation
 */
router.get('/status', 
  authService,
  async (req: Request, res: Response) => {
    try {
      const providerStatus = providerManager.getProviderStatus();
      const cacheStats = await cacheService.getCacheStats();

      res.json({
        providers: providerStatus,
        cache: cacheStats,
        marketDataService: marketDataService.getApiStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        error: 'STATUS_CHECK_FAILED',
        message: 'Unable to check API status',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/diagnostics
 * Comprehensive API connectivity test
 */
router.get('/diagnostics',
  authService,
  async (req: Request, res: Response) => {
    try {
      console.log('🔧 Running API diagnostics...');
      
      // Get environment info
      const envInfo = {
        NODE_ENV: process.env.NODE_ENV,
        FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'not set',
        KOYEB_APP_URL: process.env.KOYEB_APP_URL || 'not set',
        APP_URL: process.env.APP_URL || 'not set',
        PORT: process.env.PORT || '3001',
        // Check if API keys exist (not their values)
        apiKeysConfigured: {
          FINNHUB: !!process.env.FINNHUB_API_KEY && process.env.FINNHUB_API_KEY !== 'demo',
          ALPHA_VANTAGE: !!process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo',
          FMP: !!process.env.FMP_API_KEY && process.env.FMP_API_KEY !== 'demo',
          TWELVE_DATA: !!process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo',
          POLYGON: !!process.env.POLYGON_API_KEY && process.env.POLYGON_API_KEY !== 'demo',
        }
      };
      
      const diagnostics = await marketDataService.testApiConnections();
      
      res.json({
        environment: envInfo,
        apiStatus: marketDataService.getApiStatus(),
        connectionTests: diagnostics,
        summary: {
          total: Object.keys(diagnostics).length,
          working: Object.values(diagnostics).filter((result: any) => result.status === 'success').length,
          failed: Object.values(diagnostics).filter((result: any) => result.status === 'failed').length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Diagnostics error:', error);
      res.status(500).json({
        error: 'DIAGNOSTICS_FAILED',
        message: 'Unable to run API diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * POST /api/market-data/warm-cache
 * Warm cache with popular symbols
 */
router.post('/warm-cache',
  authService,
  async (req: Request, res: Response) => {
    try {
      const { symbols } = req.body;
      const defaultSymbols = ['AAPL', 'NVDA', 'TSLA', 'META', 'GOOGL', 'AMZN', 'MSFT'];
      const symbolsToWarm = Array.isArray(symbols) ? symbols : defaultSymbols;

      console.log(`🔥 Warming cache for ${symbolsToWarm.length} symbols...`);
      await marketDataService.warmCache(symbolsToWarm);

      res.json({
        message: 'Cache warming completed',
        symbols: symbolsToWarm,
        count: symbolsToWarm.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cache warming error:', error);
      res.status(500).json({
        error: 'CACHE_WARMING_FAILED',
        message: 'Unable to warm cache',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * GET /api/market-data/simple-test
 * Ultra-simple test endpoint to verify basic connectivity
 */
router.get('/simple-test', 
  async (req: Request, res: Response) => {
    try {
      // Direct test of Yahoo Finance without any caching or complex logic
      const symbol = (req.query.symbol as string) || 'AAPL';
      console.log(`🧪 Simple test for ${symbol}`);
      
      // Direct fetch from Yahoo Finance
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Alfalyzer/1.0)' },
            signal: AbortSignal.timeout(10000)
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        
        if (meta) {
          const price = meta.regularMarketPrice || meta.previousClose || 0;
          const previousClose = meta.previousClose || 0;
          
          res.json({
            success: true,
            symbol: symbol,
            price: price,
            previousClose: previousClose,
            change: price - previousClose,
            changePercent: previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0,
            provider: 'yahoo',
            timestamp: new Date().toISOString()
          });
        } else {
          res.json({
            success: false,
            error: 'No data found',
            symbol: symbol,
            timestamp: new Date().toISOString()
          });
        }
      } catch (fetchError) {
        res.json({
          success: false,
          error: fetchError instanceof Error ? fetchError.message : 'Fetch failed',
          symbol: symbol,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/market-data/chart/:symbol/:period
 * Get historical chart data for a symbol
 */
router.get('/chart/:symbol/:period',
  authService,
  marketDataRateLimit,
  async (req: Request, res: Response) => {
    try {
      // Validate symbol
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

      // Try cache first, then fetch with fallback
      const chartData = await providerManager.getChartDataWithFallback(symbol, period);
      
      if (!chartData || !chartData.data || chartData.data.length === 0) {
        return res.status(404).json({
          error: 'CHART_DATA_NOT_FOUND',
          message: `Unable to fetch chart data for ${symbol}`,
          symbol,
          period,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`✅ Successfully fetched chart data for ${symbol} via ${chartData.provider}`);

      res.json({
        ...chartData,
        _timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Chart data fetch error:', error);
      
      const errorResponse = {
        error: 'CHART_DATA_UNAVAILABLE',
        message: 'Unable to fetch chart data. Please try again later.',
        timestamp: new Date().toISOString(),
      };
      
      if (process.env.NODE_ENV === 'development') {
        (errorResponse as any).details = error instanceof Error ? error.message : 'Unknown error';
      }
      
      res.status(503).json(errorResponse);
    }
  }
);

/**
 * GET /api/market-data/market-status
 * Get current market status (open/closed)
 */
router.get('/market-status',
  authService,
  async (req: Request, res: Response) => {
    try {
      const market = (req.query.market as string) || 'US';
      console.log(`🏛️ Market status request for ${market}`);

      // Try cache first, then fetch with fallback
      const status = await providerManager.getMarketStatusWithFallback(market);
      
      console.log(`✅ Market status: ${status.isOpen ? 'OPEN' : 'CLOSED'} via ${status.provider}`);

      res.json({
        ...status,
        _timestamp: Date.now(),
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

export default router;