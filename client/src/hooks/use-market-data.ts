import { useQuery, useQueryClient } from '@tanstack/react-query';
import { marketDataClient } from '@/services/market-data-client';
import { useAuth } from '@/contexts/simple-auth-offline';
import { useEffect } from 'react';

// Hook for fetching real market data with authentication
export function useMarketQuote(symbol: string, enabled = true) {
  const { user, token } = useAuth();
  
  // Update token in market data client when it changes
  useEffect(() => {
    if (token) {
      marketDataClient.setAuthToken(token);
    }
  }, [token]);

  return useQuery({
    queryKey: ['market-quote', symbol],
    queryFn: async () => {
      // If no auth, return null
      if (!user || !token) {
        console.warn('No authentication - using mock data');
        return null;
      }
      
      const quote = await marketDataClient.getQuote(symbol);
      return quote;
    },
    enabled: enabled && !!symbol && !!user,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 2,
  });
}

// Hook for batch quotes
export function useMarketQuotes(symbols: string[]) {
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (token) {
      marketDataClient.setAuthToken(token);
    }
  }, [token]);

  return useQuery({
    queryKey: ['market-quotes', 'batch', symbols],
    queryFn: async () => {
      
      // Check if we recently got rate limited
      const rateLimitKey = 'alfalyzer-rate-limit';
      const lastRateLimit = localStorage.getItem(rateLimitKey);
      if (lastRateLimit) {
        const limitTime = new Date(lastRateLimit);
        const now = new Date();
        if (now < limitTime) {
          console.warn('🚫 Rate limited until:', limitTime.toLocaleTimeString());
          // Silent fallback instead of showing error to users
          return { quotes: [], message: 'Using cached data' };
        } else {
          localStorage.removeItem(rateLimitKey);
        }
      }
      
      // In development, allow access without authentication for real data
      if (!user || !token) {
        // Set a demo token for API access
        marketDataClient.setAuthToken('demo-token-development');
      }
      
      try {
        const response = await marketDataClient.getBatchQuotes(symbols);
        
        if (response.quotes && response.quotes.length > 0) {
          return response;
        } else {
          return response;
        }
      } catch (error) {
        // Check if it's a rate limit error
        if (error.message?.includes('Too many requests') || error.message?.includes('rate limit')) {
          // Store rate limit for 15 minutes
          const cooldownEnd = new Date(Date.now() + 15 * 60 * 1000);
          localStorage.setItem(rateLimitKey, cooldownEnd.toISOString());
        }
        throw error;
      }
    },
    enabled: symbols.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - much longer cache
    cacheTime: 20 * 60 * 1000, // 20 minutes - keep in cache longer
    refetchInterval: false, // Disable automatic refetch to save API calls
    refetchOnWindowFocus: false, // Don't refetch when window gets focus
    retry: (failureCount, error) => {
      // Don't retry rate limit errors
      if (error.message?.includes('rate limit') || error.message?.includes('Too many requests')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(5000 * 2 ** attemptIndex, 30000), // Slower retry
  });
}

// Hook for market overview (indices)
export function useMarketOverview() {
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (token) {
      marketDataClient.setAuthToken(token);
    }
  }, [token]);

  return useQuery({
    queryKey: ['market-overview'],
    queryFn: async () => {
      if (!user || !token) {
        // Return mock data for non-authenticated users
        return {
          sp500: { value: 4712.34, change: 1.24 },
          nasdaq: { value: 14789.45, change: 1.89 },
          dow: { value: 35234.67, change: 0.78 },
          vix: { value: 16.23, change: -5.2 }
        };
      }
      
      const overview = await marketDataClient.getMarketOverview();
      return overview;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Hook for stock search
export function useMarketSearch(query: string) {
  const { user, token } = useAuth();
  
  useEffect(() => {
    if (token) {
      marketDataClient.setAuthToken(token);
    }
  }, [token]);

  return useQuery({
    queryKey: ['market-search', query],
    queryFn: async () => {
      if (!user || !token || query.length < 2) {
        return [];
      }
      
      const results = await marketDataClient.search(query);
      return results;
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}