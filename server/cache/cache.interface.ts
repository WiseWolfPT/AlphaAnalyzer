/**
 * SIMPLIFIED CACHE INTERFACE
 * AGENTE 2: Cache Optimization Expert
 * 
 * Reduced from 18 files to 4 core files
 * TTL strategy for maximum API cost savings
 */

export interface CacheItem<T = any> {
  value: T;
  expiresAt: number;
  tags?: string[];
}

export interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number, tags?: string[]): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
}

// TTL Strategy for Zero Cost Operation
export const CACHE_TTL = {
  // Real-time data - balance freshness vs API quota
  PRICE_REALTIME: 5 * 60,        // 5 minutes
  PRICE_INTRADAY: 15 * 60,       // 15 minutes
  
  // Fundamental data - longer TTL to save costs
  FUNDAMENTALS: 24 * 60 * 60,    // 24 hours
  COMPANY_PROFILE: 7 * 24 * 60 * 60,  // 7 days
  HISTORICAL: 30 * 24 * 60 * 60,      // 30 days
  
  // Content data - cache aggressively
  TRANSCRIPTS: Infinity,              // Permanent
  NEWS: 60 * 60,                      // 1 hour
  EARNINGS_CALENDAR: 24 * 60 * 60,    // 1 day
  
  // User data - fast access
  USER_PREFERENCES: 60 * 60,          // 1 hour
  WATCHLISTS: 5 * 60,                 // 5 minutes
  PORTFOLIOS: 10 * 60,                // 10 minutes
} as const;

export type CacheKeys = keyof typeof CACHE_TTL;

// Cache tags for efficient invalidation
export const CACHE_TAGS = {
  PRICES: 'prices',
  FUNDAMENTALS: 'fundamentals', 
  USER_DATA: 'user',
  MARKET_DATA: 'market',
  CONTENT: 'content',
} as const;