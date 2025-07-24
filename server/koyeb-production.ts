// Production server for Koyeb with all market data routes
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://alfalyzer.vercel.app',
      'https://alfalyzer.com',
      'https://www.alfalyzer.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for quotes
const CHART_CACHE_TTL = 60 * 60 * 1000; // 1 hour for chart data

// API Provider configuration
const API_PROVIDERS = {
  ALPHA_VANTAGE: {
    key: process.env.ALPHA_VANTAGE_API_KEY,
    baseUrl: 'https://www.alphavantage.co/query'
  },
  FINNHUB: {
    key: process.env.FINNHUB_API_KEY,
    baseUrl: 'https://finnhub.io/api/v1'
  },
  FMP: {
    key: process.env.FMP_API_KEY,
    baseUrl: 'https://financialmodelingprep.com/api/v3'
  },
  TWELVE_DATA: {
    key: process.env.TWELVE_DATA_API_KEY,
    baseUrl: 'https://api.twelvedata.com'
  },
  POLYGON: {
    key: process.env.POLYGON_API_KEY,
    baseUrl: 'https://api.polygon.io'
  }
};

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    uptime: process.uptime(),
    version: 'koyeb-production-2.0',
    cache: {
      size: cache.size,
      ttl: CACHE_TTL
    },
    apis: {
      alphaVantage: !!API_PROVIDERS.ALPHA_VANTAGE.key,
      finnhub: !!API_PROVIDERS.FINNHUB.key,
      fmp: !!API_PROVIDERS.FMP.key,
      twelveData: !!API_PROVIDERS.TWELVE_DATA.key,
      polygon: !!API_PROVIDERS.POLYGON.key
    }
  });
});

// Keep-alive endpoint for UptimeRobot
app.get('/api/keep-alive', (req, res) => {
  console.log('🫀 Keep-alive ping received');
  res.json({ 
    alive: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper function to fetch quote from different providers
async function fetchQuoteFromProvider(symbol: string, provider: string): Promise<any> {
  try {
    switch (provider) {
      case 'ALPHA_VANTAGE':
        if (!API_PROVIDERS.ALPHA_VANTAGE.key) return null;
        const avResponse = await axios.get(
          `${API_PROVIDERS.ALPHA_VANTAGE.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_PROVIDERS.ALPHA_VANTAGE.key}`,
          { timeout: 5000 }
        );
        const globalQuote = avResponse.data['Global Quote'];
        if (globalQuote && globalQuote['05. price']) {
          return {
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
          };
        }
        break;

      case 'FINNHUB':
        if (!API_PROVIDERS.FINNHUB.key) return null;
        const fhResponse = await axios.get(
          `${API_PROVIDERS.FINNHUB.baseUrl}/quote?symbol=${symbol}&token=${API_PROVIDERS.FINNHUB.key}`,
          { timeout: 5000 }
        );
        const data = fhResponse.data;
        if (data && data.c) {
          return {
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
          };
        }
        break;

      case 'TWELVE_DATA':
        if (!API_PROVIDERS.TWELVE_DATA.key) return null;
        const tdResponse = await axios.get(
          `${API_PROVIDERS.TWELVE_DATA.baseUrl}/quote?symbol=${symbol}&apikey=${API_PROVIDERS.TWELVE_DATA.key}`,
          { timeout: 5000 }
        );
        const tdData = tdResponse.data;
        if (tdData && tdData.price) {
          return {
            symbol,
            price: parseFloat(tdData.price),
            change: parseFloat(tdData.change),
            changePercent: parseFloat(tdData.percent_change),
            high: parseFloat(tdData.high),
            low: parseFloat(tdData.low),
            open: parseFloat(tdData.open),
            previousClose: parseFloat(tdData.previous_close),
            volume: parseInt(tdData.volume),
            provider: 'twelve_data',
            timestamp: Date.now()
          };
        }
        break;

      case 'POLYGON':
        if (!API_PROVIDERS.POLYGON.key) return null;
        const pgResponse = await axios.get(
          `${API_PROVIDERS.POLYGON.baseUrl}/v2/aggs/ticker/${symbol}/prev?apiKey=${API_PROVIDERS.POLYGON.key}`,
          { timeout: 5000 }
        );
        const pgData = pgResponse.data;
        if (pgData && pgData.results && pgData.results.length > 0) {
          const result = pgData.results[0];
          return {
            symbol,
            price: result.c,
            change: result.c - result.o,
            changePercent: ((result.c - result.o) / result.o) * 100,
            high: result.h,
            low: result.l,
            open: result.o,
            previousClose: result.c,
            volume: result.v,
            provider: 'polygon',
            timestamp: Date.now()
          };
        }
        break;
    }
  } catch (error) {
    console.error(`Error fetching ${symbol} from ${provider}:`, error.message);
  }
  return null;
}

// Market data batch quotes - GET endpoint
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

    // Try providers in order of preference
    const providers = ['POLYGON', 'ALPHA_VANTAGE', 'FINNHUB', 'TWELVE_DATA'];
    
    for (const symbol of symbolList) {
      let quote = null;
      
      // Try each provider until we get data
      for (const provider of providers) {
        quote = await fetchQuoteFromProvider(symbol, provider);
        if (quote) {
          console.log(`✅ Got ${symbol} from ${provider}`);
          break;
        }
      }

      if (quote) {
        quotes.push(quote);
      } else {
        // Generate mock data if all providers fail
        console.log(`⚠️ Using mock data for ${symbol}`);
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
        errors[symbol] = 'All providers failed';
      }
    }

    const result = {
      quotes,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      timestamp: Date.now(),
      cached: false
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