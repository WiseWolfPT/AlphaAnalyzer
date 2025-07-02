export * from './cache.interface';
export * from './in-memory-cache';

import { InMemoryCache } from './in-memory-cache';
import { ICache } from './cache.interface';

// Singleton cache instance
let cacheInstance: ICache | null = null;

export function getCache(): ICache {
  if (!cacheInstance) {
    cacheInstance = new InMemoryCache({
      maxSizeInMB: parseInt(process.env.MAX_CACHE_SIZE_MB || '512'),
      defaultTTL: 60 // 60 seconds default
    });
  }
  return cacheInstance;
}

// Cache TTL presets for different data types
export const CACHE_TTL = {
  PRICE: 60,           // 60 seconds for real-time prices
  FUNDAMENTALS: 86400, // 24 hours for fundamentals
  HISTORICAL: 3600,    // 1 hour for historical data
  COMPANY_INFO: 604800,// 7 days for company info
  NEWS: 1800,          // 30 minutes for news
} as const;