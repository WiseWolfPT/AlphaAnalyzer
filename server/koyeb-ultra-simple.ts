// Ultra-minimal server for Koyeb - NO complex dependencies
console.log('✅ RUNNING KOYEB-ULTRA-SIMPLE.TS - FIXING PATH-TO-REGEXP ERROR');

import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Manual CORS implementation to avoid path-to-regexp issues
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // List of allowed origins
  const allowedOrigins = [
    'https://alfalyzerpro4.vercel.app',
    'https://alphaanalyzer.vercel.app',
    'https://alfalyzer.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  // Check if origin is allowed or is a Vercel preview
  let isAllowed = false;
  
  if (!origin) {
    isAllowed = true; // Allow requests with no origin
  } else if (allowedOrigins.includes(origin)) {
    isAllowed = true;
  } else if (origin.match(/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/)) {
    isAllowed = true; // Allow all Vercel preview deployments
  }
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    version: 'koyeb-ultra-simple-1.0'
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

// Market data batch quotes endpoint
app.post('/api/market-data/quotes/batch', async (req, res) => {
  console.log(`📊 Batch quotes request for ${req.body?.symbols?.length || 0} symbols`);
  
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    // For now, return mock data to test connectivity
    const mockQuotes = symbols.map((symbol: string) => ({
      symbol,
      price: 100 + Math.random() * 200,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      high: 100 + Math.random() * 220,
      low: 100 + Math.random() * 180,
      open: 100 + Math.random() * 200,
      previousClose: 100 + Math.random() * 200,
      volume: Math.floor(Math.random() * 100000000),
      provider: 'mock',
      timestamp: Date.now() / 1000,
      _cached: false,
      _timestamp: Date.now() / 1000
    }));
    
    res.json({
      quotes: mockQuotes,
      errors: {},
      timestamp: Date.now(),
      _timestamp: Date.now() / 1000
    });
  } catch (error) {
    console.error('Error in batch quotes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cache status endpoint
app.get('/api/cache/status', (req, res) => {
  res.json({
    enabled: false,
    message: 'Cache disabled in ultra-simple mode',
    timestamp: new Date().toISOString()
  });
});

// Market data health endpoint
app.get('/api/market-data/health', (req, res) => {
  res.json({
    status: 'healthy',
    hasRealData: false,
    providers: {
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      finnhub: !!process.env.FINNHUB_API_KEY,
      fmp: !!process.env.FMP_API_KEY,
      fiscalAI: !!process.env.FISCAL_AI_API_KEY
    }
  });
});

// Alerts endpoint (empty for now)
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
    name: 'AlphaAnalyzer API (Ultra Simple)',
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
    mode: 'ultra-simple',
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ultra simple server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💾 Mode: Ultra simple (no complex dependencies)`);
});