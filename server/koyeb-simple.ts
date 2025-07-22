// Ultra-simplified server for Koyeb - minimal dependencies
console.log('✅ RUNNING KOYEB-SIMPLE.TS - MINIMAL DEPENDENCIES');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: [
    'https://alfalyzerpro4.vercel.app',
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
    uptime: process.uptime(),
    version: 'koyeb-simple-1.0'
  });
});

// Minimal diagnostic endpoint
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
      ALPHA_VANTAGE: maskKey(process.env.ALPHA_VANTAGE_API_KEY),
      FINNHUB: maskKey(process.env.FINNHUB_API_KEY),
      FMP: maskKey(process.env.FMP_API_KEY),
      TWELVE_DATA: maskKey(process.env.TWELVE_DATA_API_KEY),
      POLYGON: maskKey(process.env.POLYGON_API_KEY),
      FISCAL_AI: maskKey(process.env.FISCAL_AI_API_KEY)
    }
  });
});

// Cache status endpoint
app.get('/api/cache/status', (req, res) => {
  res.json({
    cacheUpdater: {
      running: false,
      message: 'Cache disabled in simple mode'
    },
    supabase: {
      connected: false,
      cacheEnabled: false
    },
    strategy: 'Direct API calls only - no caching'
  });
});

// Batch quotes endpoint - simplified without cache
app.post('/api/market-data/quotes/batch', async (req, res) => {
  const { symbols } = req.body;
  
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: 'Invalid symbols array' });
  }
  
  try {
    console.log(`📊 Batch quotes request for ${symbols.length} symbols`);
    
    const quotes = [];
    const errors: Record<string, string> = {};
    
    // Use Alpha Vantage for each symbol
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    
    if (!apiKey || apiKey === 'demo') {
      // Return mock data if no API key
      for (const symbol of symbols) {
        quotes.push({
          symbol: symbol,
          price: 100 + Math.random() * 50,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 5,
          high: 105 + Math.random() * 50,
          low: 95 + Math.random() * 50,
          open: 100 + Math.random() * 50,
          previousClose: 100 + Math.random() * 50,
          volume: Math.floor(Math.random() * 10000000),
          marketCap: Math.floor(Math.random() * 1000000000000),
          provider: 'mock',
          timestamp: Date.now() / 1000,
          _cached: false,
          _timestamp: Date.now() / 1000
        });
      }
    } else {
      // Fetch real data with rate limiting
      for (const symbol of symbols.slice(0, 5)) { // Limit to 5 to avoid rate limits
        try {
          const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
          );
          const data = await response.json();
          
          if (data['Global Quote']) {
            const quote = data['Global Quote'];
            quotes.push({
              symbol: quote['01. symbol'],
              price: parseFloat(quote['05. price']),
              change: parseFloat(quote['09. change']),
              changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
              high: parseFloat(quote['03. high']),
              low: parseFloat(quote['04. low']),
              open: parseFloat(quote['02. open']),
              previousClose: parseFloat(quote['08. previous close']),
              volume: parseInt(quote['06. volume']),
              provider: 'alpha-vantage',
              timestamp: Date.now() / 1000,
              _cached: false,
              _timestamp: Date.now() / 1000
            });
          } else {
            errors[symbol] = 'Quote not found';
          }
          
          // Rate limit: wait 500ms between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`Error fetching ${symbol}:`, error.message);
          errors[symbol] = error.message;
        }
      }
      
      // Add mock data for remaining symbols
      for (const symbol of symbols.slice(5)) {
        quotes.push({
          symbol: symbol,
          price: 100 + Math.random() * 50,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 5,
          high: 105 + Math.random() * 50,
          low: 95 + Math.random() * 50,
          open: 100 + Math.random() * 50,
          previousClose: 100 + Math.random() * 50,
          volume: Math.floor(Math.random() * 10000000),
          marketCap: Math.floor(Math.random() * 1000000000000),
          provider: 'mock-overflow',
          timestamp: Date.now() / 1000,
          _cached: false,
          _timestamp: Date.now() / 1000
        });
      }
    }
    
    res.json({
      quotes,
      errors,
      timestamp: Date.now(),
      _timestamp: Date.now() / 1000
    });
  } catch (error: any) {
    console.error('Error in batch quotes endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quotes',
      message: error.message 
    });
  }
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
      fmp: !!process.env.FMP_API_KEY,
      fiscalAI: !!process.env.FISCAL_AI_API_KEY
    }
  });
});

// Alerts endpoint (empty for now to stop 404s)
app.get('/api/alerts/notifications', (req, res) => {
  res.json({
    notifications: [],
    count: 0,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AlphaAnalyzer API (Simple)',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      '/api/health',
      '/api/diagnostic/minimal',
      '/api/market-data/health',
      '/api/market-data/quotes/batch',
      '/api/cache/status',
      '/api/alerts/notifications'
    ],
    mode: 'simple',
    cache: 'disabled'
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
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
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💾 Mode: Simple (no caching, direct API calls)`);
});