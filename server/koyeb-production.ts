// Production server for Koyeb with all market data routes
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    uptime: process.uptime(),
    version: 'koyeb-production-1.0'
  });
});

// Market data batch quotes - GET endpoint (as frontend expects)
app.get('/api/market-data/quotes/batch', async (req, res) => {
  try {
    const symbols = req.query.symbols as string;
    if (!symbols) {
      return res.status(400).json({ error: 'Symbols parameter required' });
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
    console.log('📊 Fetching quotes for:', symbolList);

    // Check cache first
    const cacheKey = `batch_${symbolList.join('_')}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Returning cached data');
      return res.json(cached.data);
    }

    const quotes = [];
    const errors = {};

    // Try Alpha Vantage first
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (alphaVantageKey && alphaVantageKey !== 'demo') {
      for (const symbol of symbolList) {
        try {
          const response = await axios.get(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${alphaVantageKey}`
          );
          
          const globalQuote = response.data['Global Quote'];
          if (globalQuote && globalQuote['05. price']) {
            quotes.push({
              symbol,
              price: parseFloat(globalQuote['05. price']),
              change: parseFloat(globalQuote['09. change']),
              changePercent: parseFloat(globalQuote['10. change percent'].replace('%', '')),
              high: parseFloat(globalQuote['03. high']),
              low: parseFloat(globalQuote['04. low']),
              open: parseFloat(globalQuote['02. open']),
              previousClose: parseFloat(globalQuote['08. previous close']),
              volume: parseInt(globalQuote['06. volume']),
              provider: 'alpha_vantage',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error.message);
          errors[symbol] = error.message;
        }
      }
    }

    // If no data from Alpha Vantage, try Finnhub
    if (quotes.length === 0) {
      const finnhubKey = process.env.FINNHUB_API_KEY;
      if (finnhubKey) {
        for (const symbol of symbolList) {
          try {
            const response = await axios.get(
              `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`
            );
            
            const data = response.data;
            if (data && data.c) {
              quotes.push({
                symbol,
                price: data.c,
                change: data.d,
                changePercent: data.dp,
                high: data.h,
                low: data.l,
                open: data.o,
                previousClose: data.pc,
                volume: 0,
                provider: 'finnhub',
                timestamp: Date.now()
              });
            }
          } catch (error) {
            console.error(`Error fetching ${symbol} from Finnhub:`, error.message);
            errors[symbol] = error.message;
          }
        }
      }
    }

    // Return mock data if no API keys or all requests failed
    if (quotes.length === 0) {
      console.log('⚠️ Returning mock data - no API keys configured or all requests failed');
      for (const symbol of symbolList) {
        quotes.push({
          symbol,
          price: 100 + Math.random() * 100,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 5,
          high: 110 + Math.random() * 10,
          low: 90 + Math.random() * 10,
          open: 100 + Math.random() * 5,
          previousClose: 100,
          volume: Math.floor(Math.random() * 1000000),
          provider: 'mock',
          timestamp: Date.now()
        });
      }
    }

    const result = {
      quotes,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      timestamp: Date.now()
    };

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    res.json(result);
  } catch (error) {
    console.error('Error in batch quotes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch quotes', 
      message: error.message 
    });
  }
});

// Single quote endpoint
app.get('/api/market-data/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  // Use batch endpoint logic
  const result = await fetch(`http://localhost:${PORT}/api/market-data/quotes/batch?symbols=${symbol}`);
  const data = await result.json();
  
  if (data.quotes && data.quotes.length > 0) {
    res.json(data.quotes[0]);
  } else {
    res.status(404).json({ error: 'Quote not found' });
  }
});

// Catch all 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Koyeb production server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Market data: http://localhost:${PORT}/api/market-data/quotes/batch?symbols=AAPL,GOOGL`);
  console.log(`🔑 API Keys configured:`, {
    alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
    finnhub: !!process.env.FINNHUB_API_KEY,
    fmp: !!process.env.FMP_API_KEY,
    twelveData: !!process.env.TWELVE_DATA_API_KEY,
    polygon: !!process.env.POLYGON_API_KEY
  });
});