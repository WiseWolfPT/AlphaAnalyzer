export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  provider?: string;
}

export interface CacheEntry<T> {
  data: T;
  cached: boolean;
  expires_at: string;
  provider?: string;
}

export interface StockQuoteCache {
  symbol: string;
  quote_data: any;
  provider: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  hit_count: number;
  last_accessed: string;
}

export interface BatchQuoteCache {
  batch_id: string;
  symbols: string[];
  quotes_data: any;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface MarketStatusCache {
  market: string;
  status_data: any;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ApiMetadata {
  id: number;
  provider: string;
  endpoint: string;
  call_count: number;
  last_called: string;
  quota_remaining?: number;
  quota_reset_at?: string;
  avg_response_time_ms?: number;
}

export interface RealtimeQuote {
  id?: string;
  symbol: string;
  price: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  timestamp?: string;
}

// Cache duration constants
export const CACHE_DURATIONS = {
  quotes: 5 * 60 * 1000,        // 5 minutes
  batchQuotes: 5 * 60 * 1000,   // 5 minutes
  marketStatus: 15 * 60 * 1000, // 15 minutes
  fundamentals: 60 * 60 * 1000, // 1 hour
  companyInfo: 24 * 60 * 60 * 1000, // 24 hours
  chartData: 60 * 60 * 1000,    // 1 hour
} as const;