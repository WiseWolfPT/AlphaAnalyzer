/**
 * API Configuration for Alfalyzer Frontend
 * Using Koyeb backend with cold start handling
 */

export const API_CONFIG = {
  // Koyeb backend URL
  baseURL: import.meta.env.VITE_API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app',
  
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
  
  // Market data endpoints (V1 from implementation plan)
  quotes: {
    single: (symbol: string) => `/api/v1/quotes/${symbol}`,
    batch: '/api/v1/quotes/batch',
  },
  
  // Market status
  market: {
    status: '/api/v1/market/status',
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

// Development helpers
if (import.meta.env.DEV) {
  console.log(
    '%c🔧 API Configuration',
    'color: blue; font-size: 14px; font-weight: bold;',
    '\nBackend URL:', API_CONFIG.baseURL,
    '\nSupabase URL:', SUPABASE_CONFIG.url,
    '\nEnvironment:', import.meta.env.MODE
  );
}