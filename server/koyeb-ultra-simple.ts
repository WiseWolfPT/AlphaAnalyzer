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
    'http://localhost:5173',
    'http://localhost:5174' // Sometimes Vite uses 5174
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

// Simple in-memory cache
const quoteCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache to avoid API limits

// Per-IP rate limiting
const ipRateLimits = new Map<string, { lastCall: number; callCount: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute window
const MAX_CALLS_PER_WINDOW = 10; // 10 calls per minute per IP
const MIN_API_INTERVAL = 1000; // 1 second minimum between API calls (reduced from 12s)

// Helper function to get client IP
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Check rate limit for IP
function checkRateLimit(ip: string): { allowed: boolean; waitTime: number } {
  const now = Date.now();
  const limit = ipRateLimits.get(ip);
  
  if (!limit || now > limit.resetTime) {
    // New window
    ipRateLimits.set(ip, {
      lastCall: now,
      callCount: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true, waitTime: 0 };
  }
  
  if (limit.callCount >= MAX_CALLS_PER_WINDOW) {
    // Rate limit exceeded
    const waitTime = limit.resetTime - now;
    return { allowed: false, waitTime };
  }
  
  // Check minimum interval
  const timeSinceLastCall = now - limit.lastCall;
  if (timeSinceLastCall < MIN_API_INTERVAL) {
    return { allowed: false, waitTime: MIN_API_INTERVAL - timeSinceLastCall };
  }
  
  // Allow the call
  limit.callCount++;
  limit.lastCall = now;
  return { allowed: true, waitTime: 0 };
}

// Alpha Vantage API function
async function fetchAlphaVantageQuote(symbol: string, clientIp: string = 'unknown'): Promise<any> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!apiKey || apiKey === 'demo') {
    throw new Error('Valid Alpha Vantage API key required');
  }
  
  // Check cache first
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Returning cached quote for ${symbol}`);
    return { ...cached.data, _cached: true };
  }
  
  // Check rate limit for this IP
  const { allowed, waitTime } = checkRateLimit(clientIp);
  if (!allowed) {
    if (waitTime > 2000) {
      // If wait time is more than 2 seconds, throw rate limit error
      console.log(`⚠️ Rate limit exceeded for IP ${clientIp}, wait ${waitTime}ms`);
      throw new Error(`Rate limit exceeded. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    } else {
      // Short wait, just delay
      console.log(`⏱️ Rate limiting IP ${clientIp}: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  
  try {
    console.log(`🌐 Fetching quote for ${symbol} from Alpha Vantage`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      console.warn('⚠️ Alpha Vantage API limit warning:', data['Note']);
      throw new Error('API rate limit exceeded');
    }
    
    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      throw new Error('Invalid quote data received');
    }
    
    // Transform Alpha Vantage data to our format
    const transformedQuote = {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      open: parseFloat(quote['02. open']),
      previousClose: parseFloat(quote['08. previous close']),
      volume: parseInt(quote['06. volume']),
      provider: 'alpha_vantage',
      timestamp: Date.now() / 1000,
      _cached: false,
      _timestamp: Date.now() / 1000
    };
    
    // Cache the result
    quoteCache.set(symbol, { data: transformedQuote, timestamp: Date.now() });
    
    return transformedQuote;
  } catch (error) {
    console.error(`❌ Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}

// Market data batch quotes endpoint
app.post('/api/market-data/quotes/batch', async (req, res) => {
  console.log(`📊 Batch quotes request for ${req.body?.symbols?.length || 0} symbols`);
  
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const useRealData = apiKey && apiKey !== 'demo';
    const clientIp = getClientIp(req);
    
    const quotes = [];
    const errors: Record<string, string> = {};
    
    // Process symbols in parallel batches to optimize speed
    const BATCH_SIZE = 3; // Process 3 symbols at a time
    const symbolBatches = [];
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      symbolBatches.push(symbols.slice(i, i + BATCH_SIZE));
    }
    
    for (const batch of symbolBatches) {
      const batchPromises = batch.map(async (symbol) => {
        try {
          if (useRealData) {
            const quote = await fetchAlphaVantageQuote(symbol, clientIp);
            return { symbol, quote, error: null };
          } else {
            // Fallback to mock data if no API key
            const mockQuote = {
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
            };
            return { symbol, quote: mockQuote, error: null };
          }
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Return error data
          const errorQuote = {
            symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            high: 0,
            low: 0,
            open: 0,
            previousClose: 0,
            volume: 0,
            provider: 'error',
            timestamp: Date.now() / 1000,
            _cached: false,
            _timestamp: Date.now() / 1000
          };
          return { symbol, quote: errorQuote, error: errorMessage };
        }
      });
      
      // Wait for all quotes in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Process results
      for (const result of batchResults) {
        quotes.push(result.quote);
        if (result.error) {
          errors[result.symbol] = result.error;
        }
      }
    }
    
    res.json({
      quotes,
      errors,
      timestamp: Date.now(),
      _timestamp: Date.now() / 1000,
      provider: useRealData ? 'alpha_vantage' : 'mock'
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
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const hasValidApiKey = apiKey && apiKey !== 'demo';
  const clientIp = getClientIp(req);
  const ipLimit = ipRateLimits.get(clientIp);
  
  res.json({
    status: 'healthy',
    hasRealData: hasValidApiKey,
    cacheSize: quoteCache.size,
    providers: {
      alphaVantage: hasValidApiKey,
      finnhub: !!process.env.FINNHUB_API_KEY,
      fmp: !!process.env.FMP_API_KEY,
      fiscalAI: !!process.env.FISCAL_AI_API_KEY
    },
    rateLimit: {
      type: 'per-ip',
      callsPerMinute: MAX_CALLS_PER_WINDOW,
      minIntervalMs: MIN_API_INTERVAL,
      currentIp: clientIp,
      currentIpUsage: ipLimit ? ipLimit.callCount : 0,
      windowResetTime: ipLimit ? new Date(ipLimit.resetTime).toISOString() : null
    },
    cache: {
      enabled: true,
      durationMs: CACHE_DURATION,
      currentSize: quoteCache.size
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

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [ip, limit] of ipRateLimits.entries()) {
    if (now > limit.resetTime + RATE_LIMIT_WINDOW) {
      ipRateLimits.delete(ip);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`);
  }
}, 5 * 60 * 1000); // 5 minutes

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ultra simple server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💾 Mode: Ultra simple (no complex dependencies)`);
  console.log(`⚡ Rate limiting: ${MAX_CALLS_PER_WINDOW} calls/minute per IP, ${MIN_API_INTERVAL}ms minimum interval`);
  console.log(`💾 Cache duration: ${CACHE_DURATION / 1000} seconds`);
});