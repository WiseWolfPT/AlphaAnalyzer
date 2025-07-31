/**
 * API Configuration for Alfalyzer Frontend
 * Using Koyeb backend with cold start handling
 */

export const API_CONFIG = {
  // Use empty baseURL to work with Vercel proxy
  // The proxy is configured in vercel.json to redirect /api/* to Koyeb backend
  baseURL: '',
  
  // Request timeout - 30 seconds to handle cold starts
  timeout: 30000,
  
  // Headers
  headers: {
    'Content-Type': 'application/json',
  },
  
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
  }
};

// API endpoints
export const API_ENDPOINTS = {
  // Health check
  health: '/api/health',
  
  // Market data endpoints (matching backend routes)
  quotes: {
    single: (symbol: string) => `/api/market-data/quote/${symbol}`,
    batch: '/api/market-data/quotes/batch',
  },
  
  // Market status
  market: {
    status: '/api/market-data/market-status',
  },
  
  // API v1 endpoints (real data with Alpha Vantage)
  v1: {
    stock: {
      quote: (symbol: string) => `/api/v1/stock/${symbol}/quote`,
      search: '/api/v1/search',
    },
    cache: {
      stats: '/api/v1/cache/stats',
    },
    health: '/api/v1/health',
  },
  
  // Cache endpoints
  cache: {
    stats: '/api/v1/cache/stats',
    invalidate: (symbol: string) => `/api/v1/cache/quotes/${symbol}`,
  },
  
  // Legacy endpoints (for compatibility)
  stocks: {
    all: '/api/stocks',
    search: '/api/stocks/search',
    bySymbol: (symbol: string) => `/api/stocks/${symbol}`,
  },
  
  watchlists: {
    all: '/api/watchlists',
    byId: (id: number) => `/api/watchlists/${id}`,
    stocks: (id: number) => `/api/watchlists/${id}/stocks`,
  },
  
  portfolios: {
    all: '/api/portfolios',
    byId: (id: number) => `/api/portfolios/${id}`,
  }
};

// Supabase configuration
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

// Cold start detection
export const COLD_START_CONFIG = {
  // Time in ms to consider a request as cold start
  threshold: 5000,
  
  // Message to show during cold start
  message: 'Server is waking up, please wait...',
  
  // Retry delay for cold start
  retryDelay: 2000,
};

// Feature flags for progressive API rollout
export const API_FEATURE_FLAGS = {
  // Enable real API for specific symbols (Steel Thread approach)
  realApiSymbols: ['AAPL'],
  
  // Check if a symbol should use real API
  useRealApi: (symbol: string) => {
    return API_FEATURE_FLAGS.realApiSymbols.includes(symbol.toUpperCase());
  }
};

// Development helpers
if (import.meta.env.DEV) {
  console.log(
    '%c🔧 API Configuration',
    'color: blue; font-size: 14px; font-weight: bold;',
    '\nBackend URL:', API_CONFIG.baseURL,
    '\nSupabase URL:', SUPABASE_CONFIG.url,
    '\nEnvironment:', import.meta.env.MODE,
    '\nReal API enabled for:', API_FEATURE_FLAGS.realApiSymbols
  );
}