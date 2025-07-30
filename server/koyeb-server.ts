// Simplified server for Koyeb deployment - NOW WITH SUPABASE CACHE!
console.log('✅ RUNNING KOYEB-SERVER.TS - WITH CACHE ENABLED');
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/supabase-client';
import { SupabaseCacheService } from './services/supabase-cache-service';
import { RedditStrategyService } from './services/reddit-strategy-service';
import { CacheUpdaterJob } from './services/cache-updater-job';

// Load environment variables
dotenv.config();

// Import API keys configuration
import { API_KEYS, SUPABASE_CONFIG } from './config/api-keys';

// Test Supabase connection
testConnection().then(connected => {
  if (connected) {
    console.log('✅ Supabase database connected - Cache enabled!');
    // Start cache updater job if Supabase is connected
    if (process.env.NODE_ENV === 'production') {
      console.log('🚀 Starting cache updater job in production');
      CacheUpdaterJob.start();
    }
  } else {
    console.warn('⚠️ Supabase connection failed - will use direct API calls');
  }
});

const app = express();
// IMPORTANT: Koyeb assigns the PORT dynamically, we must use it
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: [
    'https://alfalyzerpro4.vercel.app', // MAIN PRODUCTION URL
    'https://alfalyzerpro4-nth02sgvs-antonios-projects-f9cd3cd0.vercel.app',
    'https://alfalyzerpro4-fd1b9651c-antonios-projects-f9cd3cd0.vercel.app',
    'https://alfalyzerpro4-ihwma9ytw-antonios-projects-f9cd3cd0.vercel.app',
    'https://alphaanalyzer.vercel.app',
    'https://alfalyzer.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Minimal diagnostic endpoint - always works
app.get('/api/diagnostic/minimal', (req, res) => {
  const maskKey = (key: string | undefined) => {
    if (!key) return 'NOT_SET';
    if (key === 'demo') return 'DEMO';
    if (key.length < 8) return 'INVALID';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      PORT: process.env.PORT || 'NOT_SET',
      KOYEB: !!process.env.KOYEB_SERVICE_NAME,
      SERVICE: process.env.KOYEB_SERVICE_NAME || 'NOT_ON_KOYEB'
    },
    apiKeys: {
      ALPHA_VANTAGE: maskKey(API_KEYS.ALPHA_VANTAGE_API_KEY),
      FINNHUB: maskKey(API_KEYS.FINNHUB_API_KEY),
      FMP: maskKey(API_KEYS.FMP_API_KEY),
      TWELVE_DATA: maskKey(API_KEYS.TWELVE_DATA_API_KEY),
      POLYGON: maskKey(API_KEYS.POLYGON_API_KEY),
      FISCAL_AI: maskKey(API_KEYS.FISCAL_AI_API_KEY)
    },
    summary: {
      totalConfigured: [
        API_KEYS.ALPHA_VANTAGE_API_KEY,
        API_KEYS.FINNHUB_API_KEY,
        API_KEYS.FMP_API_KEY,
        API_KEYS.TWELVE_DATA_API_KEY,
        API_KEYS.POLYGON_API_KEY,
        API_KEYS.FISCAL_AI_API_KEY
      ].filter(key => key && key !== 'demo').length
    }
  });
});

// Test connectivity endpoint
app.get('/api/diagnostic/test-connectivity', async (req, res) => {
  const tests = [];
  
  // Test Yahoo Finance (no API key needed)
  try {
    const startTime = Date.now();
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/AAPL');
    const data = await response.json();
    
    tests.push({
      service: 'Yahoo Finance',
      status: response.ok ? 'success' : 'failed',
      latencyMs: Date.now() - startTime,
      hasData: !!data?.chart?.result?.[0]
    });
  } catch (error: any) {
    tests.push({
      service: 'Yahoo Finance',
      status: 'error',
      error: error.message
    });
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    koyeb: true,
    tests,
    summary: tests.every(t => t.status === 'success') ? 
      'External connectivity working' : 
      'Some connectivity issues detected'
  });
});

// Market data health check
app.get('/api/market-data/health', (req, res) => {
  const hasRealData = !!(
    API_KEYS.ALPHA_VANTAGE_API_KEY ||
    API_KEYS.FINNHUB_API_KEY ||
    API_KEYS.FMP_API_KEY
  );
  
  res.json({
    status: 'healthy',
    hasRealData,
    providers: {
      alphaVantage: !!API_KEYS.ALPHA_VANTAGE_API_KEY,
      finnhub: !!API_KEYS.FINNHUB_API_KEY,
      fmp: !!API_KEYS.FMP_API_KEY,
      fiscalAI: !!API_KEYS.FISCAL_AI_API_KEY
    }
  });
});

// Batch quotes endpoint - Reddit Strategy
app.post('/api/market-data/quotes/batch', async (req, res) => {
  const { symbols } = req.body;
  
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: 'Invalid symbols array' });
  }
  
  try {
    console.log(`📊 Batch quotes request for ${symbols.length} symbols`);
    
    // Use Reddit Strategy - backend fetches and caches
    const result = await RedditStrategyService.getBatchQuotes(symbols);
    
    // Transform to match frontend expected format
    const response = {
      quotes: result.quotes.map(quote => ({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.change_percent,
        high: quote.high || quote.price * 1.02,
        low: quote.low || quote.price * 0.98,
        open: quote.open || quote.price,
        previousClose: quote.previousClose || quote.price,
        volume: quote.volume || 0,
        marketCap: quote.market_cap,
        eps: quote.eps,
        pe: quote.pe_ratio,
        provider: result.source === 'cache' ? 'cache' : 'api',
        timestamp: quote.timestamp || Date.now() / 1000,
        _cached: result.source === 'cache',
        _timestamp: Date.now() / 1000
      })),
      errors: result.errors,
      timestamp: Date.now(),
      _timestamp: Date.now() / 1000
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Error in batch quotes endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quotes',
      message: error.message 
    });
  }
});

// Stock quote endpoint - now with Supabase cache!
app.get('/api/market-data/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    // First check cache
    const cached = await SupabaseCacheService.getCachedQuote(symbol.toUpperCase());
    
    if (cached) {
      // Return cached data
      res.json({
        symbol: cached.symbol,
        name: cached.name || `${cached.symbol} Corp`,
        price: cached.price,
        change: cached.change,
        changePercent: cached.change_percent,
        volume: cached.volume,
        marketCap: cached.market_cap,
        peRatio: cached.pe_ratio,
        eps: cached.eps,
        sector: cached.sector,
        source: 'cache',
        lastUpdated: cached.updated_at
      });
      return;
    }
    
    // If not in cache, fetch from API
    const apiKey = API_KEYS.ALPHA_VANTAGE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );
    const data = await response.json();
    
    if (data['Global Quote']) {
      const quote = data['Global Quote'];
      const result = {
        symbol: quote['01. symbol'],
        name: `${quote['01. symbol']} Corp`,
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        latestTradingDay: quote['07. latest trading day'],
        source: 'api'
      };
      
      // Save to cache for next time
      await SupabaseCacheService.saveQuoteToCache({
        symbol: result.symbol,
        name: result.name,
        price: result.price,
        change: result.change,
        change_percent: result.changePercent,
        volume: result.volume
      });
      
      res.json(result);
    } else {
      res.status(404).json({ error: 'Stock not found' });
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Basic stock data endpoint (using Alpha Vantage)
app.get('/api/stocks/:symbol/price', async (req, res) => {
  const { symbol } = req.params;
  const apiKey = API_KEYS.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );
    const data = await response.json();
    
    if (data['Global Quote']) {
      const quote = data['Global Quote'];
      res.json({
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: quote['10. change percent'],
        volume: parseInt(quote['06. volume']),
        latestTradingDay: quote['07. latest trading day']
      });
    } else {
      res.status(404).json({ error: 'Stock not found' });
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Stock profile endpoint
app.get('/api/stocks/:symbol/profile', async (req, res) => {
  const { symbol } = req.params;
  const apiKey = API_KEYS.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
    );
    const data = await response.json();
    
    if (data && data.Symbol) {
      res.json({
        symbol: data.Symbol,
        name: data.Name,
        description: data.Description,
        sector: data.Sector,
        industry: data.Industry,
        marketCap: data.MarketCapitalization,
        peRatio: data.PERatio,
        dividendYield: data.DividendYield,
        eps: data.EPS,
        beta: data.Beta,
        weekHigh52: data['52WeekHigh'],
        weekLow52: data['52WeekLow']
      });
    } else {
      res.status(404).json({ error: 'Company profile not found' });
    }
  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ error: 'Failed to fetch company profile' });
  }
});

// Market data proxy endpoints
app.use('/api/market-data/alpha-vantage', async (req, res) => {
  const path = req.url.substring(1);
  const apiKey = API_KEYS.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Alpha Vantage API key not configured' });
  }
  
  try {
    const url = `https://www.alphavantage.co/query?${path}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Alpha Vantage' });
  }
});

// FMP proxy
app.use('/api/market-data/fmp', async (req, res) => {
  const path = req.url.substring(1);
  const apiKey = API_KEYS.FMP_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'FMP API key not configured' });
  }
  
  try {
    const url = `https://financialmodelingprep.com/api/v3/${path}?apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from FMP' });
  }
});

// Finnhub proxy
app.use('/api/market-data/finnhub', async (req, res) => {
  const path = req.url.substring(1);
  const apiKey = API_KEYS.FINNHUB_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Finnhub API key not configured' });
  }
  
  try {
    const url = `https://finnhub.io/api/v1/${path}&token=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch from Finnhub' });
  }
});

// Cache status endpoint
app.get('/api/cache/status', (req, res) => {
  const status = CacheUpdaterJob.getStatus();
  res.json({
    cacheUpdater: status,
    supabase: {
      connected: !!SUPABASE_CONFIG.URL,
      cacheEnabled: true
    },
    strategy: 'Reddit Strategy - Backend fetches, frontend reads from cache'
  });
});

// Force cache update endpoint (admin only in production)
app.post('/api/cache/update', async (req, res) => {
  const { symbols } = req.body;
  
  try {
    if (symbols && Array.isArray(symbols)) {
      // Update specific symbols
      const result = await CacheUpdaterJob.updateSymbols(symbols);
      res.json({ 
        message: `Updated ${result.quotes.length} symbols`,
        errors: result.errors 
      });
    } else {
      // Run full update
      await CacheUpdaterJob.runUpdate();
      res.json({ message: 'Full cache update started' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AlphaAnalyzer API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/health',
      '/api/market-data/health',
      '/api/market-data/quotes/batch',
      '/api/market-data/quote/:symbol',
      '/api/stocks/:symbol/price',
      '/api/stocks/:symbol/profile',
      '/api/market-data/alpha-vantage/*',
      '/api/market-data/fmp/*',
      '/api/market-data/finnhub/*',
      '/api/cache/status',
      '/api/cache/update'
    ],
    database: 'Supabase PostgreSQL with caching enabled',
    strategy: 'Reddit Strategy - Backend fetches and caches data'
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Database: Supabase PostgreSQL with caching enabled`);
});