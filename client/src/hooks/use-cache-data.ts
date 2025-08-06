import { useQuery } from '@tanstack/react-query';
import { env } from '@/lib/env';

// Helper to get API URL
const getApiUrl = () => {
  // Always use the backend URL for cache endpoints
  return env.VITE_BACKEND_URL || 'http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io';
};

// Hook for batch quotes from cache
export function useCachedBatchQuotes(symbols: string[], options = {}) {
  return useQuery({
    queryKey: ['cache', 'quotes', 'batch', symbols],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/quotes/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cached quotes: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache 10 min
    refetchOnWindowFocus: false, // Don't refetch on focus
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

// Hook for single quote from cache
export function useCachedQuote(symbol: string, options = {}) {
  return useQuery({
    queryKey: ['cache', 'quote', symbol],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/quotes/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cached quote: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// Hook for historical data from cache
export function useCachedHistorical(symbol: string, period: string = '1M', options = {}) {
  return useQuery({
    queryKey: ['cache', 'historical', symbol, period],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/historical/${symbol}/${period}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cached historical data: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    placeholderData: (previousData: any) => previousData, // Keep old data while loading
    ...options,
  });
}

// Hook for fundamentals from cache
export function useCachedFundamentals(symbol: string, options = {}) {
  return useQuery({
    queryKey: ['cache', 'fundamentals', symbol],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/fundamentals/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cached fundamentals: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    cacheTime: 4 * 60 * 60 * 1000, // 4 hours
    ...options,
  });
}

// Hook for financials from cache
export function useCachedFinancials(symbol: string, options = {}) {
  return useQuery({
    queryKey: ['cache', 'financials', symbol],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/financials/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cached financials: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 48 * 60 * 60 * 1000, // 48 hours
    ...options,
  });
}

// Hook for news from cache
export function useCachedNews(symbol?: string, options = {}) {
  return useQuery({
    queryKey: ['cache', 'news', symbol || 'market'],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const endpoint = symbol 
        ? `${apiUrl}/api/cache/news/${symbol}`
        : `${apiUrl}/api/cache/news/market`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cached news: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

// Hook for earnings from cache
export function useCachedEarnings(symbol: string, options = {}) {
  return useQuery({
    queryKey: ['cache', 'earnings', symbol],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/cache/earnings/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cached earnings: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 48 * 60 * 60 * 1000, // 48 hours
    ...options,
  });
}