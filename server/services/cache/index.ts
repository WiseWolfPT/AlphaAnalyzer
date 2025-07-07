/**
 * CACHE SERVICE INDEX
 * Main export file for cache services
 */

export { cacheManager, CacheType, CacheKeys, CACHE_CONFIGS } from './cache-manager';
export type { CacheStats, CacheConfig } from './cache-manager';

// Simple getCache function for backward compatibility
export const getCache = () => {
  const { cacheManager } = require('./cache-manager');
  return cacheManager;
};