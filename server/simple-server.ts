// Simplified server for Coolify deployment
console.log('✅ RUNNING SIMPLE-SERVER.TS - WITH SUPABASE CACHE');
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/supabase-client';
import { SupabaseCacheService } from './services/supabase-cache-service';
import diagnosticRouter from './routes/diagnostic';
import diagnosticSimpleRouter from './routes/diagnostic-simple';

// Load environment variables
dotenv.config();

// Test Supabase connection
testConnection().then(connected => {
  if (connected) {
    console.log('✅ Supabase database connected - Cache enabled!');
  } else {
    console.warn('⚠️ Supabase connection failed - will use direct API calls');
  }
});

const app = express();
// IMPORTANT: Coolify assigns the PORT dynamically, we must use it
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: [
    'https://alfalyzerpro4-nth02sgvs-antonios-projects-f9cd3cd0.vercel.app',
    'https://alfalyzerpro4-fd1b9651c-antonios-projects-f9cd3cd0.vercel.app',
    'https://alphaanalyzer.vercel.app',
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

// Register diagnostic routes with fallback
try {
  // Try to use the original diagnostic router with axios
  app.use('/api/diagnostic', diagnosticRouter);
  console.log('✅ Diagnostic routes (axios) registered successfully');
} catch (error: any) {
  console.error('❌ Failed to register axios-based diagnostic routes:', error.message);
  
  try {
    // Fallback to fetch-based diagnostic router
    app.use('/api/diagnostic', diagnosticSimpleRouter);
    console.log('✅ Diagnostic routes (fetch) registered as fallback');
  } catch (fallbackError) {
    console.error('❌ Failed to register fetch-based diagnostic routes:', fallbackError);
    
    // Ultimate fallback - inline minimal diagnostic endpoint
    app.get('/api/diagnostic', (req, res) => {
      res.json({
        status: 'fallback',
        message: 'Using inline minimal diagnostic endpoint',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        coolify: !!process.env.COOLIFY_SERVICE_NAME,
        error: 'Both diagnostic modules failed to load'
      });
    });
  }
}

// Market data health check
app.get('/api/market-data/health', (req, res) => {
  const hasRealData = !!(
    process.env.ALPHA_VANTAGE_API_KEY ||
    process.env.FINNHUB_API_KEY ||
    process.env.FMP_API_KEY
  );
  
  res.json({
    status: 'healthy',
    hasRealData,
    providers: {
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      finnhub: !!process.env.FINNHUB_API_KEY,
      fmp: !!process.env.FMP_API_KEY
    }
  });
});

// Stock quote endpoint - now using cached data
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
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    
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
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
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
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
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

// Market data proxy endpoints - using regex to avoid path-to-regexp issues
app.use('/api/market-data/alpha-vantage', async (req, res) => {
  const path = req.url.substring(1); // Remove leading slash
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
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
  const path = req.url.substring(1); // Remove leading slash
  const apiKey = process.env.FMP_API_KEY;
  
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
  const path = req.url.substring(1); // Remove leading slash
  const apiKey = process.env.FINNHUB_API_KEY;
  
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

// Minimal diagnostic endpoint (always available)
app.get('/api/diagnostic/minimal', async (req, res) => {
  const maskApiKey = (key: string | undefined): string => {
    if (!key) return 'NOT_FOUND';
    if (key.length < 8) return 'INVALID';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)} (${key.length} chars)`;
  };

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: process.platform,
    nodeVersion: process.version,
    
    coolifyInfo: {
      IS_COOLIFY: !!process.env.COOLIFY_SERVICE_NAME,
      COOLIFY_SERVICE_NAME: process.env.COOLIFY_SERVICE_NAME || 'NOT_ON_COOLIFY',
      COOLIFY_APP_NAME: process.env.COOLIFY_APP_NAME || 'NOT_ON_COOLIFY',
      COOLIFY_REGION: process.env.COOLIFY_REGION || 'NOT_ON_COOLIFY'
    },
    
    envVars: {
      PORT: process.env.PORT || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      
      // API Keys (masked for security)
      ALPHA_VANTAGE_API_KEY: maskApiKey(process.env.ALPHA_VANTAGE_API_KEY),
      FINNHUB_API_KEY: maskApiKey(process.env.FINNHUB_API_KEY),
      FMP_API_KEY: maskApiKey(process.env.FMP_API_KEY),
      
      // Supabase
      SUPABASE_URL: process.env.SUPABASE_URL || 'NOT_SET',
      SUPABASE_ANON_KEY: maskApiKey(process.env.SUPABASE_ANON_KEY),
    },
    
    // Quick connectivity test
    connectivity: {
      canFetch: typeof fetch !== 'undefined',
      hasAxios: false // We'll use fetch instead
    },
    
    summary: {
      configuredApis: [] as string[],
      recommendations: [] as string[]
    }
  };

  // Check which APIs are configured
  if (process.env.ALPHA_VANTAGE_API_KEY) diagnostics.summary.configuredApis.push('Alpha Vantage');
  if (process.env.FINNHUB_API_KEY) diagnostics.summary.configuredApis.push('Finnhub');
  if (process.env.FMP_API_KEY) diagnostics.summary.configuredApis.push('FMP');
  
  // Add recommendations
  if (diagnostics.summary.configuredApis.length === 0) {
    diagnostics.summary.recommendations.push('No API keys configured. Please set environment variables on Coolify.');
  }
  
  if (process.env.NODE_ENV !== 'production' && diagnostics.coolifyInfo.IS_COOLIFY) {
    diagnostics.summary.recommendations.push('NODE_ENV should be set to "production" on Coolify.');
  }

  res.json(diagnostics);
});

// Simple connectivity test endpoint using fetch
app.get('/api/diagnostic/test-connectivity', async (req, res) => {
  const tests = [];
  
  // Test Google (simple connectivity check)
  try {
    const googleStart = Date.now();
    const googleResponse = await fetch('https://www.google.com/robots.txt', {
      signal: AbortSignal.timeout(3000)
    });
    const googleLatency = Date.now() - googleStart;
    
    tests.push({
      service: 'Google',
      status: googleResponse.ok ? 'success' : 'failed',
      httpStatus: googleResponse.status,
      latencyMs: googleLatency
    });
  } catch (error: any) {
    tests.push({
      service: 'Google',
      status: 'error',
      error: error.message
    });
  }
  
  // Test Alpha Vantage if configured
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const avStart = Date.now();
      const avResponse = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const avLatency = Date.now() - avStart;
      const avData = await avResponse.json();
      
      tests.push({
        service: 'Alpha Vantage',
        status: avData['Global Quote'] ? 'success' : (avData.Note ? 'rate_limited' : 'failed'),
        httpStatus: avResponse.status,
        latencyMs: avLatency,
        hasData: !!avData['Global Quote']
      });
    } catch (error: any) {
      tests.push({
        service: 'Alpha Vantage',
        status: 'error',
        error: error.message
      });
    }
  }
  
  const allSuccess = tests.every(t => t.status === 'success');
  
  res.json({
    timestamp: new Date().toISOString(),
    coolify: !!process.env.COOLIFY_SERVICE_NAME,
    tests,
    summary: allSuccess ? 'All connectivity tests passed' : 'Some connectivity tests failed',
    recommendation: allSuccess ? 
      'External connectivity is working. If API calls still fail, check API keys and rate limits.' :
      'External connectivity issues detected. Check network/firewall settings.'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AlphaAnalyzer API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/health',
      '/api/diagnostic',
      '/api/diagnostic/minimal',
      '/api/diagnostic/test-connectivity',
      '/api/market-data/health',
      '/api/market-data/quote/:symbol',
      '/api/stocks/:symbol/price',
      '/api/stocks/:symbol/profile',
      '/api/market-data/alpha-vantage/*',
      '/api/market-data/fmp/*',
      '/api/market-data/finnhub/*'
    ]
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

// Note: Cache updater service would be implemented with Supabase Edge Functions
// or a separate worker service for production use

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Database: Supabase PostgreSQL`);
});