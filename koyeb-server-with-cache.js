/**
 * Koyeb Server with Basic Market Data and Cache
 * Simple implementation to test cache functionality
 */

import http from 'http';
import url from 'url';

const PORT = process.env.PORT || 3001;

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

// Helper to get from cache
function getFromCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    console.log(`✅ Cache HIT for ${key}`);
    return cached.data;
  }
  console.log(`❌ Cache MISS for ${key}`);
  return null;
}

// Helper to set cache
function setCache(key, data) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  });
  console.log(`💾 Cached ${key} for ${CACHE_TTL/1000}s`);
}

// Mock data generator
function generateQuote(symbol) {
  return {
    symbol: symbol.toUpperCase(),
    price: 100 + Math.random() * 200,
    change: (Math.random() - 0.5) * 10,
    changePercent: (Math.random() - 0.5) * 5,
    volume: Math.floor(Math.random() * 10000000),
    timestamp: Date.now(),
    provider: 'mock'
  };
}

// CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Health endpoints
  if (pathname === '/api/health' || pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'alfalyzer-backend-cache',
      port: PORT,
      uptime: process.uptime(),
      cache: {
        size: cache.size,
        enabled: true
      }
    }));
    return;
  }
  
  // Market data quote endpoint
  if (pathname.match(/^\/api\/market-data\/quote\/([A-Z]+)$/)) {
    const symbol = pathname.split('/').pop();
    const cacheKey = `quote:${symbol}`;
    
    // Try cache first
    let quote = getFromCache(cacheKey);
    
    if (!quote) {
      // Generate new data and cache it
      quote = generateQuote(symbol);
      setCache(cacheKey, quote);
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      ...quote,
      _cached: !!getFromCache(cacheKey),
      _timestamp: Date.now()
    }));
    return;
  }
  
  // Batch quotes endpoint
  if (pathname === '/api/market-data/quotes' && parsedUrl.query.symbols) {
    const symbols = parsedUrl.query.symbols.split(',');
    const quotes = [];
    
    for (const symbol of symbols) {
      const cacheKey = `quote:${symbol.toUpperCase()}`;
      let quote = getFromCache(cacheKey);
      
      if (!quote) {
        quote = generateQuote(symbol);
        setCache(cacheKey, quote);
      }
      
      quotes.push(quote);
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      quotes,
      _timestamp: Date.now(),
      _cached: quotes.every(q => !!getFromCache(`quote:${q.symbol}`))
    }));
    return;
  }
  
  // Chart data endpoint
  if (pathname.match(/^\/api\/market-data\/chart\/([A-Z]+)$/)) {
    const parts = pathname.split('/');
    const symbol = parts[parts.length - 1];
    const period = parsedUrl.query.period || '1D';
    const cacheKey = `chart:${symbol}:${period}`;
    
    let chartData = getFromCache(cacheKey);
    
    if (!chartData) {
      // Generate mock chart data
      const points = period === '1D' ? 390 : 100; // More points for intraday
      chartData = {
        symbol: symbol.toUpperCase(),
        period,
        data: Array.from({ length: points }, (_, i) => ({
          time: Date.now() - (points - i) * 60000,
          value: 100 + Math.random() * 50 + Math.sin(i / 10) * 10
        })),
        provider: 'mock'
      };
      setCache(cacheKey, chartData);
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      ...chartData,
      _cached: !!getFromCache(cacheKey),
      _timestamp: Date.now()
    }));
    return;
  }
  
  // Cache stats endpoint
  if (pathname === '/api/market-data/cache-stats') {
    const stats = {
      size: cache.size,
      ttl: CACHE_TTL,
      entries: Array.from(cache.keys()),
      hits: 0, // Would need to track this
      misses: 0, // Would need to track this
      hitRate: 0
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(stats));
    return;
  }
  
  // Market data config
  if (pathname === '/api/market-data/config') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      hasRealData: false,
      configuredProviders: 0,
      providers: {
        finnhub: false,
        alphaVantage: false,
        fmp: false,
        twelveData: false,
        polygon: false
      },
      cache: {
        enabled: true,
        provider: 'memory',
        ttl: CACHE_TTL
      },
      message: 'Mock data with caching enabled',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Root endpoint
  if (pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      name: 'Alfalyzer Backend with Cache',
      status: 'running',
      endpoints: [
        '/health',
        '/api/health',
        '/api/market-data/config',
        '/api/market-data/quote/:symbol',
        '/api/market-data/quotes?symbols=AAPL,GOOGL',
        '/api/market-data/chart/:symbol?period=1D',
        '/api/market-data/cache-stats'
      ],
      cache: {
        enabled: true,
        size: cache.size
      },
      message: 'Service is active with caching'
    }));
    return;
  }
  
  // 404 for everything else
  res.writeHead(404);
  res.end(JSON.stringify({ 
    error: 'Not found',
    path: pathname
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server with cache running on 0.0.0.0:${PORT}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📊 Quote example: http://0.0.0.0:${PORT}/api/market-data/quote/AAPL`);
  console.log(`📊 Cache stats: http://0.0.0.0:${PORT}/api/market-data/cache-stats`);
  console.log(`💾 Cache TTL: ${CACHE_TTL/1000} seconds`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});