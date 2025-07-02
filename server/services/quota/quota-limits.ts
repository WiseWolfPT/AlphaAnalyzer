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
    priority: 1 // Highest priority for real-time data
  },
  
  twelveData: {
    name: 'Twelve Data',
    limits: {
      daily: 800,
      perMinute: 8 // Spread throughout the day
    },
    resetTime: '00:00',
    priority: 2
  },
  
  fmp: {
    name: 'Financial Modeling Prep',
    limits: {
      daily: 250,
      perMinute: 5
    },
    resetTime: '00:00',
    priority: 3
  },
  
  alphaVantage: {
    name: 'Alpha Vantage',
    limits: {
      daily: 25,
      perMinute: 5 // API has 5 calls per minute limit
    },
    resetTime: '00:00',
    priority: 4 // Lowest priority - emergency fallback only
  }
};

// Data type to provider mapping
export const DATA_TYPE_PROVIDERS = {
  price: ['finnhub', 'twelveData', 'fmp'],
  fundamentals: ['fmp', 'finnhub', 'alphaVantage'],
  historical: ['twelveData', 'alphaVantage', 'fmp'],
  news: ['finnhub', 'fmp'],
  companyInfo: ['finnhub', 'fmp']
} as const;

export type DataType = keyof typeof DATA_TYPE_PROVIDERS;
export type ProviderName = keyof typeof PROVIDER_QUOTAS;