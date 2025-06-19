import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import enhancedApi from '@/lib/enhanced-api';
import type { Stock } from '@shared/schema';

// Hook for fetching a single stock with real-time data
export function useStock(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => enhancedApi.stocks.getBySymbol(symbol),
    enabled: enabled && !!symbol,
    staleTime: 60 * 1000, // Data is fresh for 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Hook for fetching multiple stocks
export function useStocks(symbols: string[]) {
  return useQuery({
    queryKey: ['stocks', 'batch', symbols],
    queryFn: () => enhancedApi.stocks.getBatch(symbols),
    enabled: symbols.length > 0,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Hook for searching stocks
export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ['stocks', 'search', query],
    queryFn: () => enhancedApi.stocks.search(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache search results for 5 minutes
  });
}

// Hook for historical data
export function useHistoricalData(
  symbol: string,
  interval: '1min' | '5min' | '15min' | '30min' | '1h' | '1day' = '1day',
  outputsize = 30
) {
  return useQuery({
    queryKey: ['stocks', 'historical', symbol, interval, outputsize],
    queryFn: () => enhancedApi.stocks.getHistoricalData(symbol, interval, outputsize),
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
    queryKey: ['market', 'indices'],
    queryFn: () => enhancedApi.market.getIndices(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
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