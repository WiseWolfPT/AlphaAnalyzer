const API_CONFIG = {
  // Use empty baseURL to work with Vercel proxy in production
  // In development, use localhost:3001
  // Relative base: Vite proxy em dev e Nginx em prod
  baseURL: "",
  // Request timeout - 30 seconds to handle cold starts
  timeout: 3e4,
  // Headers
  headers: {
    "Content-Type": "application/json"
  },
  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1e3,
    backoffMultiplier: 2
  }
};
const API_ENDPOINTS = {
  // Health check
  health: "/api/health",
  // Market data endpoints (matching backend routes)
  quotes: {
    single: (symbol) => `/api/market-data/quote/${symbol}`,
    batch: "/api/market-data/quotes/batch"
  },
  // Market status
  market: {
    status: "/api/market-data/market-status"
  },
  // API v1 endpoints (real data with Alpha Vantage)
  v1: {
    stock: {
      quote: (symbol) => `/api/v1/stock/${symbol}/quote`,
      search: "/api/v1/search"
    },
    cache: {
      stats: "/api/v1/cache/stats"
    },
    health: "/api/v1/health"
  },
  // Cache endpoints
  cache: {
    stats: "/api/v1/cache/stats",
    invalidate: (symbol) => `/api/v1/cache/quotes/${symbol}`
  },
  // Legacy endpoints (for compatibility)
  stocks: {
    all: "/api/stocks",
    search: "/api/stocks/search",
    bySymbol: (symbol) => `/api/stocks/${symbol}`
  },
  watchlists: {
    all: "/api/watchlists",
    byId: (id) => `/api/watchlists/${id}`,
    stocks: (id) => `/api/watchlists/${id}/stocks`
  },
  portfolios: {
    all: "/api/portfolios",
    byId: (id) => `/api/portfolios/${id}`
  }
};
const SUPABASE_CONFIG = {
  url: "https://avjnfessefxtfurayybp.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q"
};
const COLD_START_CONFIG = {
  // Time in ms to consider a request as cold start
  threshold: 5e3,
  // Message to show during cold start
  message: "Server is waking up, please wait...",
  // Retry delay for cold start
  retryDelay: 2e3
};
const API_FEATURE_FLAGS = {
  // Enable real API for specific symbols (Steel Thread approach)
  realApiSymbols: ["AAPL"],
  // Check if a symbol should use real API
  useRealApi: (symbol) => {
    return API_FEATURE_FLAGS.realApiSymbols.includes(symbol.toUpperCase());
  }
};
export {
  API_CONFIG as A,
  COLD_START_CONFIG as C,
  SUPABASE_CONFIG as S,
  API_FEATURE_FLAGS as a,
  API_ENDPOINTS as b
};
