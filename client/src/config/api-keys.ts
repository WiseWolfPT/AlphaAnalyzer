// API Configuration
export const API_CONFIG = {
  FMP: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    // In production, these should come from environment variables
    apiKey: import.meta.env.VITE_FMP_API_KEY || 'demo',
    quotaPerDay: 250,
  },
  TWELVE_DATA: {
    baseUrl: 'https://api.twelvedata.com',
    wsUrl: 'wss://ws.twelvedata.com/v1/quotes/price',
    apiKey: import.meta.env.VITE_TWELVE_DATA_API_KEY || 'demo',
    quotaPerDay: 800,
  },
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    wsUrl: 'wss://ws.finnhub.io',
    apiKey: import.meta.env.VITE_FINNHUB_API_KEY || 'demo',
    quotaPerMinute: 60,
  },
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'demo',
    quotaPerDay: 25,
  },
} as const;