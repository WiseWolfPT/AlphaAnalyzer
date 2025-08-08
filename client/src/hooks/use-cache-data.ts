import { useQuery } from '@tanstack/react-query';
import { env } from '@/lib/env';

// Helper to get API URL
const getApiUrl = () => {
  // In production (Vercel), use relative URLs to leverage Vercel proxy
  // This avoids mixed content blocking (HTTPS -> HTTP)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Check if we're on any Vercel deployment (production or preview)
    if (hostname.includes('.vercel.app') || hostname === 'alfalyzer.com') {
      return ''; // Empty string for relative URLs
    }
  }
  
  // In development or other environments, use the configured backend URL
  return (env as any).VITE_BACKEND_URL || 'http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io';
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
      const chunks = chunk(unique, 20);
      const allQuotes: any[] = [];

      for (const c of chunks) {
        // 1) GET "real" (preenche cache e evita CSRF)
        const qs = c.map((s) => encodeURIComponent(s)).join(','); // importante: preservar vírgulas
        const url = `/api/market-data/quotes/batch?symbols=${qs}`;
        const r = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
        if (r.ok) {
          const b = await r.json();
          const quotes = b?.quotes ?? b?.data ?? (Array.isArray(b) ? b : []);
          allQuotes.push(...quotes);
        } else {
          // 2) Fallback cache (isento de CSRF)
          const r2 = await fetch('/api/cache/quotes/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ symbols: c }),
          });
          const b2 = r2.ok ? await r2.json() : { data: [] };
          const quotes2 = b2?.quotes ?? b2?.data ?? [];
          allQuotes.push(...quotes2);
        }

        await sleep(300); // suaviza rate limit
      }

      return {
        quotes: allQuotes.filter((q) => q && (q.price ?? q.close ?? q.last) != null),
        _source: 'normalized',
      };
    },
    staleTime: 30_000,
    gcTime: 300_000,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
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