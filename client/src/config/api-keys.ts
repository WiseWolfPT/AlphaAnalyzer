/**
 * API Configuration for Financial Data Providers
 * This file centralizes all API configurations
 */

export const API_CONFIG = {
  // Financial Modeling Prep
  FMP: {
    baseUrl: 'https://financialmodelingprep.com/api/v3',
    apiKey: import.meta.env.VITE_FMP_API_KEY || '',
  },
  
  // Alpha Vantage
  ALPHA_VANTAGE: {
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '',
  },
  
  // Finnhub
  FINNHUB: {
    baseUrl: 'https://finnhub.io/api/v1',
    apiKey: import.meta.env.VITE_FINNHUB_API_KEY || '',
  },
  
  // Twelve Data
  TWELVE_DATA: {
    baseUrl: 'https://api.twelvedata.com',
    apiKey: import.meta.env.VITE_TWELVE_DATA_API_KEY || '',
  },
  
  // Polygon
  POLYGON: {
    baseUrl: 'https://api.polygon.io',
    apiKey: import.meta.env.VITE_POLYGON_API_KEY || '',
  },
};

// Export individual configs for convenience
export const FMP_CONFIG = API_CONFIG.FMP;
export const ALPHA_VANTAGE_CONFIG = API_CONFIG.ALPHA_VANTAGE;
export const FINNHUB_CONFIG = API_CONFIG.FINNHUB;
export const TWELVE_DATA_CONFIG = API_CONFIG.TWELVE_DATA;
export const POLYGON_CONFIG = API_CONFIG.POLYGON;