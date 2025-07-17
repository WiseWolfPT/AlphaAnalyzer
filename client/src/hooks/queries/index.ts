// Stock queries
export * from './use-stock-queries';
export * from './use-portfolio-queries';
export * from './use-watchlist-queries';

// Re-export query keys and utilities
export { queryKeys, queryKeyUtils } from '@/lib/query-keys';

// Common query configurations
export const commonQueryConfigs = {
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  
  standard: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  
  slow: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
    retryDelay: (attemptIndex: number) => Math.min(5000 * 2 ** attemptIndex, 60000),
  },
};