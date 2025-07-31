/**
 * API v1 Routes - Real Data Implementation
 * Uses Alpha Vantage with Supabase caching
 */

const express = require('express');
const router = express.Router();

// Since we're in CommonJS, we'll use dynamic imports for TypeScript modules
let alphaVantageService;
let cacheService;

// Initialize services
(async () => {
  try {
    // Import CommonJS modules
    const { AlphaVantageRealService } = require('../services/alpha-vantage-real.cjs');
    const { SupabaseCacheService } = require('../services/cache/supabase-cache-service.cjs');
    
    alphaVantageService = new AlphaVantageRealService();
    cacheService = new SupabaseCacheService();
    
    console.log('✅ API v1 services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize API v1 services:', error);
    // Fallback to mock data if services fail
    alphaVantageService = null;
    cacheService = null;
  }
})();

// Middleware to check if services are ready
const checkServices = (req, res, next) => {
  if (!alphaVantageService || !cacheService) {
    console.log('⚠️ Services not ready, using mock data');
    req.useMockData = true;
  }
  next();
};

// GET /api/v1/stock/:symbol/quote - Get real-time quote for a specific symbol
router.get('/stock/:symbol/quote', checkServices, async (req, res) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();

  console.log(`📊 API v1: Quote request for ${upperSymbol}`);

  try {
    // If services not ready or mock mode, return mock data
    if (req.useMockData || process.env.USE_MOCK_DATA === 'true') {
      const mockData = getMockQuote(upperSymbol);
      return res.json({
        ...mockData,
        _mock: true,
        _message: 'Using mock data (services initializing or mock mode enabled)'
      });
    }

    // Get real data from Alpha Vantage
    const quote = await alphaVantageService.getQuote(upperSymbol);
    
    res.json({
      success: true,
      data: quote,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error fetching quote for ${upperSymbol}:`, error.message);
    
    // Return mock data as fallback
    const mockData = getMockQuote(upperSymbol);
    res.json({
      ...mockData,
      _mock: true,
      _error: error.message,
      _message: 'Falling back to mock data due to API error'
    });
  }
});

// GET /api/v1/search - Search for symbols
router.get('/search', checkServices, async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 1) {
    return res.status(400).json({
      error: 'Query parameter "q" is required and must be at least 1 character'
    });
  }

  console.log(`🔍 API v1: Search request for "${q}"`);

  try {
    if (req.useMockData || process.env.USE_MOCK_DATA === 'true') {
      const mockResults = getMockSearchResults(q);
      return res.json({
        results: mockResults,
        _mock: true
      });
    }

    const results = await alphaVantageService.searchSymbols(q);
    
    res.json({
      success: true,
      results: results.map(item => ({
        symbol: item['1. symbol'],
        name: item['2. name'],
        type: item['3. type'],
        region: item['4. region'],
        currency: item['8. currency']
      })),
      count: results.length
    });

  } catch (error) {
    console.error(`❌ Search error:`, error.message);
    
    const mockResults = getMockSearchResults(q);
    res.json({
      results: mockResults,
      _mock: true,
      _error: error.message
    });
  }
});

// GET /api/v1/cache/stats - Get cache statistics
router.get('/cache/stats', checkServices, async (req, res) => {
  try {
    if (req.useMockData || !cacheService) {
      return res.json({
        total: 0,
        valid: 0,
        expired: 0,
        _mock: true
      });
    }

    const stats = await cacheService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/health - Health check for v1 API
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v1',
    services: {
      alphaVantage: alphaVantageService ? 'ready' : 'initializing',
      cache: cacheService ? 'ready' : 'initializing'
    },
    mockMode: process.env.USE_MOCK_DATA === 'true',
    timestamp: new Date().toISOString()
  });
});

// Mock data helpers
function getMockQuote(symbol) {
  const mockPrices = {
    'AAPL': { price: 195.89, change: 2.45, changePercent: 1.27 },
    'GOOGL': { price: 178.23, change: -1.82, changePercent: -1.01 },
    'MSFT': { price: 450.67, change: 5.23, changePercent: 1.17 },
    'TSLA': { price: 167.89, change: -3.45, changePercent: -2.01 },
    'META': { price: 565.78, change: 8.90, changePercent: 1.60 }
  };

  const baseData = mockPrices[symbol] || {
    price: 100 + Math.random() * 400,
    change: (Math.random() - 0.5) * 10,
    changePercent: (Math.random() - 0.5) * 5
  };

  return {
    symbol: symbol,
    price: baseData.price,
    change: baseData.change,
    changePercent: baseData.changePercent,
    volume: Math.floor(10000000 + Math.random() * 50000000),
    high: baseData.price + Math.abs(baseData.change),
    low: baseData.price - Math.abs(baseData.change),
    open: baseData.price - baseData.change,
    previousClose: baseData.price - baseData.change,
    timestamp: Date.now() / 1000,
    provider: 'mock'
  };
}

function getMockSearchResults(query) {
  const allSymbols = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'US', currency: 'USD' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Equity', region: 'US', currency: 'USD' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Equity', region: 'US', currency: 'USD' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity', region: 'US', currency: 'USD' },
    { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Equity', region: 'US', currency: 'USD' }
  ];

  return allSymbols.filter(s => 
    s.symbol.toLowerCase().includes(query.toLowerCase()) ||
    s.name.toLowerCase().includes(query.toLowerCase())
  );
}

module.exports = router;