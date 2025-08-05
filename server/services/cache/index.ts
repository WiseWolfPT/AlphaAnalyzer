/**
 * CACHE SERVICE INDEX
 * Main export file for cache services
 */

// Export new Supabase-based cache services
export { CacheService } from './cache-service';
export { getSupabaseClient, getCacheSchemaClient, getRealtimeClient } from './supabase-client';
export * from '../../types/cache.types';

// Keep backward compatibility exports
export { CacheType, CacheKeys, CACHE_CONFIGS } from './cache-manager';
export type { CacheStats, CacheConfig } from './cache-manager';

// Import CacheManager class instead of instance to avoid circular dependency
import { CacheManager } from './cache-manager';
import { logger } from '../../config/logger-config';

// Lazy-loaded cache manager instance
let cacheManagerInstance: CacheManager | null = null;

// Export getter function for cacheManager
export const getCacheManager = () => {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
    
    // Auto-start cache warming after creating instance
    setTimeout(async () => {
      try {
        await cacheManagerInstance!.warmCache();
      } catch (error) {
        logger.error('❌ Initial cache warming failed:', error);
      }
    }, 2000); // Wait 2 seconds for server startup
  }
  return cacheManagerInstance;
};

// Export cacheManager as a getter to ensure it's initialized when accessed
export const cacheManager = getCacheManager();

// Simple getCache function for backward compatibility
export const getCache = () => {
  try {
    return getCacheManager();
  } catch (error) {
    logger.warn('[Cache] Error getting cache manager:', error);
    // Return a no-op cache implementation as fallback
    return {
      get: async () => null,
      set: async () => {},
      getStats: () => ({ hits: 0, misses: 0, sets: 0, evictions: 0 }),
      invalidate: async () => 0,
      clear: async () => 0,
      getOrFetch: async (_key: string, _type: any, fetcher: () => Promise<any>) => fetcher()
    };
  }
};

// Backward compatibility for old CACHE_TTL usage
export const CACHE_TTL = {
  PRICE: 30 * 1000,           // 30 seconds
  FUNDAMENTALS: 60 * 60 * 1000, // 1 hour
  HISTORICAL: 24 * 60 * 60 * 1000, // 24 hours
  COMPANY_INFO: 24 * 60 * 60 * 1000, // 24 hours
  NEWS: 10 * 60 * 1000,       // 10 minutes
};