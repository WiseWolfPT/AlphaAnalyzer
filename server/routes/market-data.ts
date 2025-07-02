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

const router = Router();

// Use demo authentication in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
const authService = isDevelopment ? demoAuthMiddleware() : authMiddleware.instance.authenticate();

// Initialize the enhanced market data service
const marketDataService = new ServerMarketDataService();

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

// Função principal para buscar cotação com fallback
async function fetchQuoteWithFallback(symbol: string, userId?: string): Promise<any> {
  const providers = [
    { name: 'twelve_data', fetch: fetchFromTwelveData },
    { name: 'yahoo_finance', fetch: fetchFromYahooFinance },
    { name: 'finnhub', fetch: fetchFromFinnhub },
    { name: 'fmp', fetch: fetchFromFMP },
    { name: 'alpha_vantage', fetch: fetchFromAlphaVantage },
  ];

  const errors: Record<string, string> = {};

  // Tentar cada provider em ordem
  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name} for ${symbol}...`);
      const data = await provider.fetch(symbol);
      
      // Log de sucesso
      if (userId) {
        dbUtils.logSecurityEvent({
          user_id: userId,
          action: 'market_data_fetch',
          resource: `quote_${symbol}`,
          success: true,
          details: { provider: provider.name, symbol },
        });
      }
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors[provider.name] = errorMessage;
      console.warn(`${provider.name} failed for ${symbol}:`, errorMessage);
      continue;
    }
  }

  // Se todos falharam, lançar erro com detalhes
  throw new Error(`All providers failed. Details: ${JSON.stringify(errors)}`);
}

/**
 * GET /api/market-data/quote/:symbol
 * Buscar cotação de uma ação com dados reais usando o enhanced service
 */
router.get('/quote/:symbol',
  authService,
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

      // Use the enhanced market data service
      const stockData = await marketDataService.getRealTimeQuote(symbol);
      
      if (!stockData) {
        return res.status(404).json({
          error: 'QUOTE_NOT_FOUND',
          message: `Unable to fetch quote for ${symbol}. All providers failed.`,
          symbol,
          timestamp: new Date().toISOString(),
        });
      }

      // Convert Stock to API response format
      const quoteResponse = {
        symbol: stockData.symbol,
        name: stockData.name,
        price: stockData.price,
        change: stockData.change,
        changePercent: stockData.changePercent,
        high: stockData.high,
        low: stockData.low,
        open: stockData.open,
        previousClose: stockData.previousClose,
        volume: stockData.volume,
        marketCap: stockData.marketCap,
        eps: stockData.eps,
        pe: stockData.peRatio,
        provider: (stockData as any).provider || 'unknown',
        timestamp: Math.floor(stockData.lastUpdated.getTime() / 1000),
        _timestamp: Date.now(),
        _cached: false,
      };

      console.log(`✅ Successfully fetched ${symbol} via ${quoteResponse.provider}`);

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
      const results: any[] = [];
      const errors: Record<string, string> = {};

      // Processar cada símbolo
      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const cacheKey = `quote:${symbol}`;
            
            // Verificar cache
            const cached = checkCache(cacheKey);
            if (cached) {
              results.push({ ...cached, _cached: true });
              return;
            }

            // Buscar dados reais
            const quoteData = await fetchQuoteWithFallback(symbol, req.user?.id);
            const enrichedData = {
              ...quoteData,
              _timestamp: Date.now(),
              _cached: false,
            };

            saveToCache(cacheKey, enrichedData);
            results.push(enrichedData);
          } catch (error) {
            errors[symbol] = error instanceof Error ? error.message : 'Failed to fetch';
          }
        })
      );

      res.json({
        quotes: results,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        _timestamp: Date.now(),
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
 * GET /api/market-data/test
 * Test API configuration and connectivity (public endpoint for testing)
 */
router.get('/test', 
  async (req: Request, res: Response) => {
    const testSymbol = 'AAPL';
    const testResults: any = {
      timestamp: new Date().toISOString(),
      symbol: testSymbol,
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
      const apiStatus = marketDataService.getApiStatus();
      const quotaStatus = Array.from(marketDataService.getQuotaStatus().entries());

      res.json({
        ...apiStatus,
        quotas: quotaStatus.map(([provider, quota]) => ({
          provider,
          ...quota,
        })),
        cache: {
          marketData: {
            ...marketDataCache.getStats(),
            ttl: CACHE_TTL,
          },
          search: {
            ...searchCache.getStats(),
            ttl: 5 * 60 * 1000,
          },
        },
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
      const diagnostics = await marketDataService.testApiConnections();
      
      res.json({
        ...diagnostics,
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

export default router;