// API Configuration - Uses environment variables
// IMPORTANT: Never expose secret keys in client-side code
// Only use VITE_ prefixed variables for client-side

export const API_CONFIG = {
  // Financial API Keys (these should come from backend for security)
  FMP_API_KEY: '', // Keep empty - should be handled by backend
  ALPHA_VANTAGE_API_KEY: '', // Keep empty - should be handled by backend
  FINNHUB_API_KEY: '', // Keep empty - should be handled by backend
  TWELVE_DATA_API_KEY: '', // Keep empty - should be handled by backend
  POLYGON_API_KEY: '', // Keep empty - should be handled by backend
  
  // API Endpoints
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  
  // Rate limiting
  RATE_LIMIT_DELAY: 1000, // 1 second between requests
  MAX_RETRIES: 3,
  
  // Cache configuration
  CACHE_TTL: {
    STOCK_QUOTE: 5 * 60 * 1000, // 5 minutes
    FUNDAMENTALS: 60 * 60 * 1000, // 1 hour
    NEWS: 15 * 60 * 1000, // 15 minutes
    HISTORICAL: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Mock mode for development
  MOCK_MODE: import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true',
} as const;

// Validation helper
export const validateApiConfig = () => {
  const warnings: string[] = [];
  
  if (!API_CONFIG.API_BASE_URL) {
    warnings.push('API_BASE_URL not configured');
  }
  
  if (warnings.length > 0) {
    console.warn('API Configuration warnings:', warnings);
  }
  
  return warnings.length === 0;
};