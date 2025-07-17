/**
 * 🚨 SECURITY UPDATE: API keys moved to backend for security
 * 
 * This file now only contains public API configurations.
 * All API keys are handled securely by the backend.
 * 
 * Frontend should use backend proxy endpoints instead of direct API calls.
 */

// Public API configurations (no keys!)
export const API_CONFIG = {
  // Financial Modeling Prep
  FMP: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    proxyUrl: '/api/market-data/fmp',
    // API key is handled securely by backend
  },
  
  // Alpha Vantage
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    proxyUrl: '/api/market-data/alpha-vantage',
    // API key is handled securely by backend
  },
  
  // Finnhub
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    proxyUrl: '/api/market-data/finnhub',
    // API key is handled securely by backend
  },
  
  // Twelve Data
  TWELVE_DATA: {
    baseUrl: 'https://api.twelvedata.com',
    proxyUrl: '/api/market-data/twelve-data',
    // API key is handled securely by backend
  },
  
  // Polygon
  POLYGON: {
    baseUrl: 'https://api.polygon.io',
    proxyUrl: '/api/market-data/polygon',
    // API key is handled securely by backend
  },
};

// Export individual configs for convenience
export const FMP_CONFIG = API_CONFIG.FMP;
export const ALPHA_VANTAGE_CONFIG = API_CONFIG.ALPHA_VANTAGE;
export const FINNHUB_CONFIG = API_CONFIG.FINNHUB;
export const TWELVE_DATA_CONFIG = API_CONFIG.TWELVE_DATA;
export const POLYGON_CONFIG = API_CONFIG.POLYGON;

/**
 * MIGRATION GUIDE FOR DEVELOPERS:
 * 
 * OLD (INSECURE):
 * ```typescript
 * const response = await fetch(`${FINNHUB_CONFIG.baseUrl}/quote?symbol=AAPL&token=${FINNHUB_CONFIG.apiKey}`);
 * ```
 * 
 * NEW (SECURE):
 * ```typescript
 * const response = await fetch(`${FINNHUB_CONFIG.proxyUrl}/quote?symbol=AAPL`);
 * ```
 * 
 * The backend proxy will:
 * 1. Add the API key securely
 * 2. Apply rate limiting
 * 3. Cache responses
 * 4. Handle errors gracefully
 */

// Development warning
if (import.meta.env.DEV) {
  console.log(
    '%c🔒 Security Notice',
    'color: green; font-size: 14px; font-weight: bold;',
    '\nAPI keys have been moved to backend for security.',
    '\nUse proxy endpoints instead of direct API calls.',
    '\nAll API calls are now secured and rate-limited.'
  );
}