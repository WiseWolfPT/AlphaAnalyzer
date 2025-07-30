#!/usr/bin/env node

/**
 * Koyeb Simple Server - No TypeScript, No Path Aliases
 * Direct CommonJS implementation for immediate deployment
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Enable compression
app.use(compression());

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://alfalyzer.vercel.app').split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() < item.expires) {
    return item.data;
  }
  cache.delete(key);
  return null;
}

function setCached(key, data, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expires: Date.now() + ttl
  });
}

// Mock market data generator
function generateQuote(symbol) {
  const basePrice = 100 + Math.random() * 400;
  const change = (Math.random() - 0.5) * 10;
  return {
    symbol: symbol.toUpperCase(),
    price: basePrice,
    change: change,
    changePercent: (change / basePrice) * 100,
    volume: Math.floor(Math.random() * 10000000),
    high: basePrice * 1.02,
    low: basePrice * 0.98,
    open: basePrice - change,
    previousClose: basePrice - change,
    timestamp: new Date().toISOString(),
    provider: 'mock'
  };
}

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'alfalyzer-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: {
      size: cache.size,
      enabled: true
    }
  });
});

// Market status endpoint
app.get('/api/v1/market/status', (req, res) => {
  res.json({
    status: 'ok',
    markets: {
      US: { open: true, nextOpen: null, nextClose: '16:00:00' },
      EU: { open: false, nextOpen: '09:00:00', nextClose: null }
    },
    timestamp: new Date().toISOString()
  });
});

// Market data config
app.get('/api/market-data/config', (req, res) => {
  res.json({
    status: 'ok',
    hasRealData: false,
    providers: {
      finnhub: !!process.env.FINNHUB_API_KEY,
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      fmp: !!process.env.FMP_API_KEY,
      twelveData: !!process.env.TWELVE_DATA_API_KEY,
      polygon: !!process.env.POLYGON_API_KEY
    },
    cache: {
      enabled: true,
      provider: 'memory',
      ttl: CACHE_TTL
    }
  });
});

// Quote endpoint
app.get('/api/market-data/quote/:symbol', (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `quote:${symbol}`;
  
  let quote = getCached(cacheKey);
  if (!quote) {
    quote = generateQuote(symbol);
    setCached(cacheKey, quote);
  }
  
  res.json(quote);
});

// Batch quotes
app.get('/api/market-data/quotes', (req, res) => {
  const symbols = (req.query.symbols || '').split(',').filter(Boolean);
  
  const quotes = symbols.map(symbol => {
    const cacheKey = `quote:${symbol}`;
    let quote = getCached(cacheKey);
    if (!quote) {
      quote = generateQuote(symbol);
      setCached(cacheKey, quote);
    }
    return quote;
  });
  
  res.json({ quotes });
});

// Chart data
app.get('/api/market-data/chart/:symbol', (req, res) => {
  const { symbol } = req.params;
  const { period = '1D' } = req.query;
  const cacheKey = `chart:${symbol}:${period}`;
  
  let chartData = getCached(cacheKey);
  if (!chartData) {
    const points = period === '1D' ? 390 : 100;
    const basePrice = 100 + Math.random() * 400;
    
    chartData = {
      symbol: symbol.toUpperCase(),
      period,
      data: Array.from({ length: points }, (_, i) => ({
        time: Date.now() - (points - i) * 60000,
        value: basePrice + Math.sin(i / 10) * 10 + (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000)
      }))
    };
    setCached(cacheKey, chartData);
  }
  
  res.json(chartData);
});

// Fundamentals endpoint
app.get('/api/market-data/fundamentals/:symbol', (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `fundamentals:${symbol}`;
  
  let fundamentals = getCached(cacheKey);
  if (!fundamentals) {
    fundamentals = {
      symbol: symbol.toUpperCase(),
      marketCap: Math.floor(Math.random() * 1000000000000),
      pe: 15 + Math.random() * 20,
      eps: 5 + Math.random() * 10,
      dividendYield: Math.random() * 5,
      beta: 0.8 + Math.random() * 0.4,
      week52High: 150 + Math.random() * 100,
      week52Low: 50 + Math.random() * 50
    };
    setCached(cacheKey, fundamentals, 3600000); // 1 hour
  }
  
  res.json(fundamentals);
});

// Test endpoint
app.get('/api/market-data/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Market data API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Alfalyzer Backend API',
    status: 'running',
    endpoints: [
      '/health',
      '/api/health',
      '/api/v1/market/status',
      '/api/market-data/config',
      '/api/market-data/quote/:symbol',
      '/api/market-data/quotes?symbols=AAPL,GOOGL',
      '/api/market-data/chart/:symbol',
      '/api/market-data/fundamentals/:symbol',
      '/api/market-data/test'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server on 0.0.0.0 for container compatibility
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Simple server running on 0.0.0.0:${PORT}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Test endpoint: http://0.0.0.0:${PORT}/api/market-data/test`);
  console.log(`🔑 API keys configured:`, {
    ALPHA_VANTAGE: !!process.env.ALPHA_VANTAGE_API_KEY,
    FINNHUB: !!process.env.FINNHUB_API_KEY,
    FMP: !!process.env.FMP_API_KEY,
    TWELVE_DATA: !!process.env.TWELVE_DATA_API_KEY,
    POLYGON: !!process.env.POLYGON_API_KEY
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});