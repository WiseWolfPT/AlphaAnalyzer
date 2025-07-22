// Simplified server for Koyeb deployment
console.log('✅ RUNNING SIMPLE-SERVER.TS - WITH SUPABASE CACHE');
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db/supabase-client';
import { SupabaseCacheService } from './services/supabase-cache-service';

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
// IMPORTANT: Koyeb assigns the PORT dynamically, we must use it
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AlphaAnalyzer API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/health',
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