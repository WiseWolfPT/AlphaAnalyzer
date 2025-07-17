/**
 * CACHE SERVICE INDEX
 * Main export file for cache services
 */

export { cacheManager, CacheType, CacheKeys, CACHE_CONFIGS } from './cache-manager';
export type { CacheStats, CacheConfig } from './cache-manager';

// Simple getCache function for backward compatibility
export const getCache = () => {
  return cacheManager;
};

// Backward compatibility for old CACHE_TTL usage
export const CACHE_TTL = {
  PRICE: 30 * 1000,           // 30 seconds
  FUNDAMENTALS: 60 * 60 * 1000, // 1 hour
  HISTORICAL: 24 * 60 * 60 * 1000, // 24 hours
  COMPANY_INFO: 24 * 60 * 60 * 1000, // 24 hours
  NEWS: 10 * 60 * 1000,       // 10 minutes
};