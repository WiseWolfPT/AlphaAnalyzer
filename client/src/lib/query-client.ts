import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 429 (rate limit)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistency
export const queryKeys = {
  // Stock data
  stock: (symbol: string) => ['stock', symbol] as const,
  stockPrice: (symbol: string) => ['stock', symbol, 'price'] as const,
  stockChart: (symbol: string, timeframe: string) => ['stock', symbol, 'chart', timeframe] as const,
  stockProfile: (symbol: string) => ['stock', symbol, 'profile'] as const,
  stockNews: (symbol: string) => ['stock', symbol, 'news'] as const,
  
  // Market data
  marketOverview: () => ['market', 'overview'] as const,
  marketSectors: () => ['market', 'sectors'] as const,
  marketGainers: () => ['market', 'gainers'] as const,
  marketLosers: () => ['market', 'losers'] as const,
  
  // User data
  watchlists: (userId?: string) => ['watchlists', userId] as const,
  watchlist: (id: string) => ['watchlist', id] as const,
  portfolios: (userId?: string) => ['portfolios', userId] as const,
  portfolio: (id: string) => ['portfolio', id] as const,
  
  // Search
  search: (query: string) => ['search', query] as const,
  
  // Transcripts
  transcripts: () => ['transcripts'] as const,
  transcript: (id: string) => ['transcript', id] as const,
  
  // Earnings
  earnings: (timeframe?: string) => ['earnings', timeframe] as const,
  
  // User settings
  userProfile: (userId?: string) => ['user', 'profile', userId] as const,
  userSettings: (userId?: string) => ['user', 'settings', userId] as const,
} as const;

// Prefetch configurations for different data types
export const prefetchConfigs = {
  // Stock data should be prefetched aggressively
  stock: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Market data refreshes frequently
  market: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute during market hours
  },
  
  // User data is stable
  user: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  
  // Search results can be cached longer
  search: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
} as const;

// Helper to invalidate related queries
export const invalidateQueries = {
  stock: (symbol: string) => {
    queryClient.invalidateQueries({ queryKey: ['stock', symbol] });
  },
  
  watchlists: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['watchlists', userId] });
  },
  
  portfolios: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['portfolios', userId] });
  },
  
  market: () => {
    queryClient.invalidateQueries({ queryKey: ['market'] });
  },
} as const;