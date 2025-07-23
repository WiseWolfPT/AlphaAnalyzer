import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import enhancedApi from '@/lib/enhanced-api';
import { queryKeys, prefetchConfigs } from '@/lib/query-client';
import { localCache } from '@/services/local-cache';
import type { Stock } from '@shared/schema';
import { handleError } from '@/services/error-handler-service';

// Hook for fetching a single stock with real-time data
export function useStock(symbol: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.stock(symbol),
    queryFn: async () => {
      try {
        // Check local cache first
        const cached = localCache.getStockData(symbol, 'stock_profile');
        if (cached) {
          return cached;
        }
        
        // Fetch from API
        const data = await enhancedApi.stocks.getBySymbol(symbol);
        
        // Cache the result
        localCache.setStockData(symbol, 'stock_profile', data);
        
        return data;
      } catch (error) {
        await handleError(error, {
          context: `Fetching stock data for ${symbol}`,
          category: 'api',
          severity: 'medium',
          showNotification: true,
          retry: true
        });
        throw error;
      }
    },
    enabled: enabled && !!symbol,
    ...prefetchConfigs.stock,
    retry: (failureCount, error) => {
      // Custom retry logic
      if (error?.message?.includes('404')) return false; // Don't retry if stock not found
      if (error?.message?.includes('quota')) return false; // Don't retry if quota exceeded
      return failureCount < 3;
    },
    onError: (error) => {
      console.error(`Error fetching stock ${symbol}:`, error);
    }
  });
}

// Hook for fetching multiple stocks
export function useStocks(symbols: string[]) {
  return useQuery({
    queryKey: ['stocks', 'batch', symbols.sort().join(',')],
    queryFn: () => enhancedApi.stocks.getBatch(symbols),
    enabled: symbols.length > 0,
    ...prefetchConfigs.stock,
  });
}

// Hook for searching stocks
export function useStockSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      // Check cache first
      const cached = localCache.get(`search_${query}`);
      if (cached) {
        return cached;
      }
      
      // Fetch from API
      const data = await enhancedApi.stocks.search(query);
      
      // Cache the result
      localCache.set(`search_${query}`, data, { ttl: 10 * 60 * 1000 }); // 10 minutes
      
      return data;
    },
    enabled: query.length >= 2,
    ...prefetchConfigs.search,
  });
}

// Hook for historical data
export function useHistoricalData(
  symbol: string,
  interval: '1min' | '5min' | '15min' | '30min' | '1h' | '1day' = '1day',
  outputsize = 30
) {
  return useQuery({
    queryKey: queryKeys.stockChart(symbol, `${interval}_${outputsize}`),
    queryFn: async () => {
      // Check cache for chart data
      const cached = localCache.getStockData(symbol, 'stock_chart');
      if (cached && cached.interval === interval && cached.outputsize === outputsize) {
        return cached.data;
      }
      
      // Fetch from API
      const data = await enhancedApi.stocks.getHistoricalData(symbol, interval, outputsize);
      
      // Cache the result
      localCache.setStockData(symbol, 'stock_chart', { 
        data, 
        interval, 
        outputsize,
        timestamp: Date.now()
      });
      
      return data;
    },
    enabled: !!symbol,
    staleTime: interval === '1min' ? 60 * 1000 : 
              interval === '5min' ? 5 * 60 * 1000 :
              interval === '15min' ? 15 * 60 * 1000 :
              interval === '30min' ? 30 * 60 * 1000 :
              interval === '1h' ? 60 * 60 * 1000 :
              24 * 60 * 60 * 1000,
  });
}

// Hook for market indices
export function useMarketIndices() {
  return useQuery({
    queryKey: queryKeys.marketOverview(),
    queryFn: async () => {
      // Check cache first
      const cached = localCache.getMarketData('indices');
      if (cached) {
        return cached;
      }
      
      // Fetch from API
      const data = await enhancedApi.market.getIndices();
      
      // Cache the result
      localCache.setMarketData('indices', data);
      
      return data;
    },
    ...prefetchConfigs.market,
  });
}

// Hook for intrinsic value calculation
export function useIntrinsicValue(symbol: string) {
  return useQuery({
    queryKey: ['intrinsicValue', symbol],
    queryFn: () => enhancedApi.intrinsicValue.getBySymbol(symbol),
    enabled: !!symbol,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });
}

// Mutation for calculating intrinsic value with real data
export function useCalculateIntrinsicValue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (symbol: string) => enhancedApi.intrinsicValue.calculateWithRealData(symbol),
    onSuccess: (data, symbol) => {
      if (data) {
        queryClient.setQueryData(['intrinsicValue', symbol], data);
      }
    },
  });
}

// Hook for API quota status
export function useApiQuota() {
  return useQuery({
    queryKey: ['api', 'quota'],
    queryFn: () => enhancedApi.quota.getStatus(),
    staleTime: 5 * 60 * 1000, // Update every 5 minutes
  });
}

// Hook for warming cache
export function useWarmCache() {
  return useMutation({
    mutationFn: () => enhancedApi.cache.warmPopularStocks(),
  });
}

// Hook for real-time WebSocket connection
export function useRealTimeStocks(symbols: string[], enabled = true) {
  const queryClient = useQueryClient();
  
  useQuery({
    queryKey: ['realtime', 'connection', symbols],
    queryFn: async () => {
      if (enabled && symbols.length > 0) {
        enhancedApi.realTime.connect(symbols, (symbol, price) => {
          // Update the cache with real-time price
          queryClient.setQueryData(['stock', symbol], (old: Stock | undefined) => {
            if (!old) return old;
            return {
              ...old,
              currentPrice: price,
              lastUpdated: new Date().toISOString(),
            };
          });
        });
      }
      return true;
    },
    enabled: enabled && symbols.length > 0,
  });
  
  // Cleanup on unmount
  return () => {
    enhancedApi.realTime.disconnect();
  };
}