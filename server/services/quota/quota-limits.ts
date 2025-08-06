export interface QuotaLimit {
  daily?: number;
  perMinute?: number;
  perSecond?: number;
}

export interface ProviderQuotaConfig {
  name: string;
  limits: QuotaLimit;
  resetTime: string; // Time when quota resets (UTC)
  priority: number; // Lower number = higher priority
}

// Provider quota configurations
export const PROVIDER_QUOTAS: Record<string, ProviderQuotaConfig> = {
  finnhub: {
    name: 'Finnhub',
    limits: {
      perMinute: 60,
      daily: 86400 // Theoretical based on per-minute limit
    },
    resetTime: '00:00',
    priority: 2 // Secondary provider after FMP
  },
  
  twelveData: {
    name: 'Twelve Data',
    limits: {
      daily: 800,
      perMinute: 8 // Spread throughout the day
    },
    resetTime: '00:00',
    priority: 3 // Third provider
  },
  
  fmp: {
    name: 'Financial Modeling Prep',
    limits: {
      daily: 432000, // 300/min * 60min * 24h (theoretical max)
      perMinute: 300  // FMP Starter Plan: 300 calls/min ($19/month)
    },
    resetTime: '00:00',
    priority: 1 // HIGH PRIORITY - Main provider with 300/min quota
  },
  
  alphaVantage: {
    name: 'Alpha Vantage',
    limits: {
      daily: 25,
      perMinute: 5 // API has 5 calls per minute limit
    },
    resetTime: '00:00',
    priority: 4 // Low priority - use sparingly
  },
  
  polygon: {
    name: 'Polygon.io',
    limits: {
      daily: 5,      // Very conservative for free tier
      perMinute: 5   // 5 calls/minute on free tier
    },
    resetTime: '00:00',
    priority: 5 // Emergency fallback only due to low limits
  }
};

// Data type to provider mapping (ordered by priority)
// FMP is now primary with 300 calls/min quota
export const DATA_TYPE_PROVIDERS = {
  price: ['fmp', 'finnhub', 'twelveData', 'polygon'],
  fundamentals: ['fmp', 'finnhub', 'alphaVantage'],
  historical: ['fmp', 'twelveData', 'alphaVantage', 'polygon'],
  news: ['fmp', 'finnhub'],
  companyInfo: ['fmp', 'finnhub']
} as const;

export type DataType = keyof typeof DATA_TYPE_PROVIDERS;
export type ProviderName = keyof typeof PROVIDER_QUOTAS;