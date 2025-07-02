// API Configuration
export const API_CONFIG = {
  FMP: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    // In production, these should come from environment variables
    // SECURITY: API key moved to server-side - use proxy endpoints instead
    apiKey: 'DEPRECATED_USE_SERVER_PROXY',
    quotaPerDay: 250,
  },
  TWELVE_DATA: {
    baseUrl: 'https://api.twelvedata.com',
    wsUrl: 'wss://ws.twelvedata.com/v1/quotes/price',
    // SECURITY: API key moved to server-side - use proxy endpoints instead
    apiKey: 'DEPRECATED_USE_SERVER_PROXY',
    quotaPerDay: 800,
  },
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    wsUrl: 'wss://ws.finnhub.io',
    // SECURITY: API key moved to server-side - use proxy endpoints instead
    apiKey: 'DEPRECATED_USE_SERVER_PROXY',
    quotaPerMinute: 60,
  },
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    // SECURITY: API key moved to server-side - use proxy endpoints instead
    apiKey: 'DEPRECATED_USE_SERVER_PROXY',
    quotaPerDay: 25,
  },
} as const;