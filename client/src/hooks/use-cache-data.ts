import { useQuery } from '@tanstack/react-query';

// Helper to get API URL
const getApiUrl = () => {
  // In development, use localhost:3001
  // In production, use relative URLs (proxy handles it)
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  return '';
};

// Hook for batch quotes - GET with chunking, delay and fallback
export function useCachedBatchQuotes(symbols: string[], options: any = {}) {
  const unique = Array.from(new Set(symbols)).filter(Boolean);
  const chunk = (arr: string[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  return useQuery({
    queryKey: ['market-data', 'quotes', 'batch', unique],
    queryFn: async () => {
      const chunks = chunk(unique, 50);
      const allQuotes: any[] = [];

      for (const c of chunks) {
        const url = `/api/cache/quotes/batch`;
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ symbols: c }),
          });
          if (r.ok) {
            const b = await r.json();
            // Normalize response shape: server may return { data: Record<symbol, Quote> } or { quotes: Quote[] }
            let quotes: any[] = [];
            if (Array.isArray(b?.quotes)) {
              quotes = b.quotes;
            } else if (Array.isArray(b?.data)) {
              quotes = b.data;
            } else if (b?.data && typeof b.data === 'object') {
              quotes = Object.values(b.data);
            }
            if (quotes.length) {
              allQuotes.push(...quotes);
            }
          } else {
            console.warn(`Failed to fetch cached quotes for ${c.join(',')}: ${r.status} ${r.statusText}`);
          }
        } catch (error) {
          console.error('Error fetching cached quotes:', error);
        }
        await sleep(250);
      }

      return {
        quotes: allQuotes.filter((q) => q && (q.price ?? q.close ?? q.last) != null),
        _source: 'cache',
        _cached: true,
      };
    },
    staleTime: 60_000, // 60 seconds to match backend cache TTL
    gcTime: 120_000, // 2 minutes garbage collection
    refetchInterval: 60_000, // Auto-refresh every 60 seconds
    retry: (count) => count < 2,
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
    staleTime: 60 * 1000, // 60 seconds to match backend cache TTL
    gcTime: 120 * 1000, // 2 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
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
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
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
    gcTime: 4 * 60 * 60 * 1000, // 4 hours
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
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    ...options,
  });
}

// PHASE 2: Direct FMP data hooks (no cache)
export function useDirectFMPQuote(symbol: string, options = {}) {
  return useQuery({
    queryKey: ['direct', 'quote', symbol],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/market-data/direct/quote/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch direct quote: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 10 * 1000, // 10 seconds - very fresh data
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    ...options,
  });
}

// PHASE 2: Direct FMP batch quotes (no cache) 
// Fixed to use the correct working endpoint with GET method
export function useDirectFMPBatchQuotes(symbols: string[], options: any = {}) {
  const unique = Array.from(new Set(symbols)).filter(Boolean);

  return useQuery({
    queryKey: ['direct', 'batch', unique],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      // Use POST to /direct/batch endpoint for real FMP data
      const response = await fetch(`${apiUrl}/api/market-data/direct/batch`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols: unique })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch direct batch quotes: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        quotes: data.quotes || data || [],
        _source: 'fmp_direct',
        _cached: false
      };
    },
    staleTime: 10 * 1000, // 10 seconds - very fresh data
    gcTime: 60 * 1000, // 1 minute  
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    retry: 2,
    ...options,
  });
}

// PHASE 2, Day 8: Direct FMP financials data hook for charts
export function useDirectFMPFinancials(symbol: string, period: 'quarterly' | 'annual' = 'quarterly', options = {}) {
  return useQuery({
    queryKey: ['direct', 'financials', symbol, period],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const periodParam = period === 'annual' ? 'annual' : 'quarter';
      const response = await fetch(`${apiUrl}/api/market-data/direct/financials/${symbol}?period=${periodParam}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch direct financials: ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour - financials don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
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
    gcTime: 60 * 60 * 1000, // 1 hour
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
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    ...options,
  });
}
