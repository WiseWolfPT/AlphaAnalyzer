// Working server for Alfalyzer with real market data
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Fetch stock data from Twelve Data
async function fetchStockData(symbol) {
  try {
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=demo`,
      { 
        headers: { 'User-Agent': 'Alfalyzer/1.0' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.close) {
      throw new Error('No data available from Twelve Data');
    }

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
  } catch (error) {
    console.error(`Twelve Data error for ${symbol}:`, error);
    return null;
  }
}

// Alternative Yahoo Finance fetch
async function fetchFromYahoo(symbol) {
  try {
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
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error);
    return null;
  }
}

// Market data quote endpoint
app.get('/api/market-data/quote/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    console.log(`Fetching quote for ${symbol}...`);
    
    // Try Twelve Data first
    let data = await fetchStockData(symbol);
    
    // If that fails, try Yahoo Finance
    if (!data) {
      data = await fetchFromYahoo(symbol);
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Stock data not available' });
    }
    
    // Add timestamp and cached flag
    data._timestamp = Date.now();
    data._cached = false;
    
    console.log(`✅ Stock data found for ${symbol}: $${data.price}`);
    res.json(data);
    
  } catch (error) {
    console.error('Quote fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stock quote' });
  }
});

// Test endpoint to verify APIs
app.get('/api/market-data/test', async (req, res) => {
  const testSymbol = 'AAPL';
  console.log(`Testing market data APIs with ${testSymbol}...`);
  
  try {
    const twelveData = await fetchStockData(testSymbol);
    const yahooData = await fetchFromYahoo(testSymbol);
    
    res.json({
      timestamp: new Date().toISOString(),
      symbol: testSymbol,
      providers: {
        twelve_data: twelveData ? {
          status: 'success',
          price: twelveData.price,
          provider: twelveData.provider
        } : { status: 'failed' },
        yahoo_finance: yahooData ? {
          status: 'success', 
          price: yahooData.price,
          provider: yahooData.provider
        } : { status: 'failed' }
      },
      workingProviders: [
        ...(twelveData ? ['twelve_data'] : []),
        ...(yahooData ? ['yahoo_finance'] : [])
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Test failed', message: error.message });
  }
});

// Market indices simulation
app.get('/api/market-indices', (req, res) => {
  const indices = {
    dow: {
      value: 34567.89 + (Math.random() - 0.5) * 100,
      change: 0.52 + (Math.random() - 0.5) * 0.5,
    },
    sp500: {
      value: 4234.56 + (Math.random() - 0.5) * 50,
      change: 0.31 + (Math.random() - 0.5) * 0.3,
    },
    nasdaq: {
      value: 13789.12 + (Math.random() - 0.5) * 200,
      change: -0.18 + (Math.random() - 0.5) * 0.4,
    },
  };
  
  res.json(indices);
});

// Basic stocks endpoint for compatibility
app.get('/api/stocks', (req, res) => {
  // Return some mock stock data with real companies
  const stocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: '205.17', change: '4.09', changePercent: '2.03' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: '191.75', change: '-1.25', changePercent: '-0.65' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', price: '445.50', change: '2.30', changePercent: '0.52' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: '178.25', change: '-0.75', changePercent: '-0.42' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: '248.50', change: '5.20', changePercent: '2.14' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', price: '118.75', change: '1.85', changePercent: '1.58' }
  ];
  
  res.json(stocks);
});

// Individual stock endpoint  
app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    // Try to get real data
    let data = await fetchStockData(symbol);
    if (!data) {
      data = await fetchFromYahoo(symbol);
    }
    
    if (data) {
      // Convert to stocks format
      const stock = {
        symbol: data.symbol,
        name: `${data.symbol} Corp`,
        price: data.price.toFixed(2),
        change: data.change.toFixed(2),
        changePercent: data.changePercent.toFixed(2),
        sector: 'Technology',
        marketCap: data.marketCap || 'N/A',
        eps: 'N/A',
        peRatio: 'N/A'
      };
      res.json(stock);
    } else {
      res.status(404).json({ error: 'Stock not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Create and start server
const server = createServer(app);
const port = 3003;

server.listen(port, '127.0.0.1', () => {
  console.log(`🚀 Working Alfalyzer Server`);
  console.log(`📱 Local:    http://localhost:${port}`);
  console.log(`🔧 Health:   http://localhost:${port}/health`);
  console.log(`🔧 API:      http://localhost:${port}/api/market-data/test`);
  console.log(`🔧 Stocks:   http://localhost:${port}/api/stocks`);
  console.log('✅ Ready for real data integration!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close();
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close();
  process.exit(0);
});