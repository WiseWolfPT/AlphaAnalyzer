import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { marketDataService, StockQuote, MarketStatus } from '@/services/market-data';
import { realtimeService, RealtimeQuote } from '@/services/realtime-service';
import { apiClient } from '@/services/api-client';
import { API_ENDPOINTS } from '@/config/api';

// Query keys
export const marketDataKeys = {
  all: ['market-data'] as const,
  quotes: () => [...marketDataKeys.all, 'quotes'] as const,
  quote: (symbol: string) => [...marketDataKeys.quotes(), symbol] as const,
  batchQuotes: (symbols: string[]) => [...marketDataKeys.quotes(), 'batch', symbols] as const,
  marketStatus: (market: string = 'US') => [...marketDataKeys.all, 'status', market] as const,
  marketOverview: () => [...marketDataKeys.all, 'overview'] as const,
};

/**
 * Hook to fetch a single stock quote with realtime updates
 */
export function useStockQuote(symbol: string, options = {}) {
  const queryClient = useQueryClient();
  const [realtimePrice, setRealtimePrice] = useState<number | null>(null);
  const [isColdStart, setIsColdStart] = useState(false);
  
  // Subscribe to cold start notifications
  useEffect(() => {
    const unsubscribe = apiClient.onColdStart(setIsColdStart);
    return unsubscribe;
  }, []);
  
  // REST API query
  const query = useQuery({
    queryKey: marketDataKeys.quote(symbol),
    queryFn: () => marketDataService.getQuote(symbol),
    staleTime: 60 * 1000, // 1 minute - matches FMP update frequency
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    enabled: !!symbol,
    refetchInterval: 60 * 1000, // Refetch every minute (FMP only updates each minute)
    refetchOnWindowFocus: true, // Also refresh when user returns to tab
    ...options
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!symbol) return;

    const subscription = realtimeService.subscribeToQuotes(
      [symbol],
      (quote: RealtimeQuote) => {
        setRealtimePrice(quote.price);
        
        // Update React Query cache
        queryClient.setQueryData(
          marketDataKeys.quote(symbol),
          (old: StockQuote | undefined) => ({
            ...old!,
            price: quote.price,
            change: quote.change,
            changePercent: quote.change_percent,
            volume: quote.volume,
            timestamp: quote.timestamp
          })
        );
      }
    );

    return () => subscription.unsubscribe();
  }, [symbol, queryClient]);

  // Merge realtime data with query data
  const data = query.data ? {
    ...query.data,
    price: realtimePrice ?? query.data.price
  } : undefined;

  return {
    ...query,
    data,
    isRealtime: realtimePrice !== null,
    isColdStart
  };
}

// Alias for backward compatibility
export const useMarketQuote = useStockQuote;

/**
 * Hook to fetch batch quotes with realtime updates
 */
export function useBatchQuotes(symbols: string[], options = {}) {
  const queryClient = useQueryClient();
  const [realtimeQuotes, setRealtimeQuotes] = useState<Map<string, RealtimeQuote>>(new Map());
  const [isColdStart, setIsColdStart] = useState(false);
  
  // Subscribe to cold start notifications
  useEffect(() => {
    const unsubscribe = apiClient.onColdStart(setIsColdStart);
    return unsubscribe;
  }, []);
  
  const query = useQuery({
    queryKey: marketDataKeys.batchQuotes(symbols),
    queryFn: () => marketDataService.getBatchQuotes(symbols),
    staleTime: 60 * 1000, // 1 minute - matches FMP update frequency
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    enabled: symbols.length > 0,
    refetchInterval: 60 * 1000, // Refetch every minute (FMP only updates each minute)
    refetchOnWindowFocus: true, // Also refresh when user returns to tab
    ...options
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (symbols.length === 0) return;

    const subscription = realtimeService.subscribeToQuotes(
      symbols,
      (quote: RealtimeQuote) => {
        setRealtimeQuotes(prev => {
          const next = new Map(prev);
          next.set(quote.symbol, quote);
          return next;
        });
        
        // Update individual quote cache
        queryClient.setQueryData(
          marketDataKeys.quote(quote.symbol),
          (old: StockQuote | undefined) => ({
            ...old!,
            price: quote.price,
            change: quote.change,
            changePercent: quote.change_percent,
            volume: quote.volume,
            timestamp: quote.timestamp
          })
        );
      }
    );

    return () => subscription.unsubscribe();
  }, [symbols.join(','), queryClient]);

  // Merge realtime data with query data
  const data = query.data?.quotes?.map(quote => {
    const realtimeQuote = realtimeQuotes.get(quote.symbol);
    return realtimeQuote ? {
      ...quote,
      price: realtimeQuote.price,
      change: realtimeQuote.change,
      changePercent: realtimeQuote.change_percent,
      volume: realtimeQuote.volume,
      timestamp: realtimeQuote.timestamp,
      _realtime: true
    } : quote;
  });

  return {
    ...query,
    data: query.data ? { ...query.data, quotes: data || [] } : undefined,
    hasRealtimeData: realtimeQuotes.size > 0,
    isColdStart
  };
}

// Alias for backward compatibility
export const useMarketQuotes = useBatchQuotes;

/**
 * Hook for market overview (indices)
 */
export function useMarketOverview(options = {}) {
  const [isColdStart, setIsColdStart] = useState(false);
  
  // Subscribe to cold start notifications
  useEffect(() => {
    const unsubscribe = apiClient.onColdStart(setIsColdStart);
    return unsubscribe;
  }, []);

  return useQuery({
    queryKey: marketDataKeys.marketOverview(),
    queryFn: () => marketDataService.getMarketOverview(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 2,
    ...options
  });
}

/**
 * Hook for stock search
 */
export function useMarketSearch(query: string, options = {}) {
  return useQuery({
    queryKey: ['market-search', query],
    queryFn: () => marketDataService.searchSymbols(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
}

/**
 * Hook for market status
 */
export function useMarketStatus(market: string = 'US', options = {}) {
  return useQuery({
    queryKey: marketDataKeys.marketStatus(market),
    queryFn: () => marketDataService.getMarketStatus(market),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options
  });
}

/**
 * Hook to invalidate quote cache
 */
export function useInvalidateQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (symbol: string) => marketDataService.invalidateQuote(symbol),
    onSuccess: (_, symbol) => {
      // Invalidate the specific quote
      queryClient.invalidateQueries({ queryKey: marketDataKeys.quote(symbol) });
      
      // Also invalidate any batch queries that might contain this symbol
      queryClient.invalidateQueries({ queryKey: marketDataKeys.quotes() });
    }
  });
}

/**
 * Hook to handle cold start UI
 */
export function useColdStartHandler() {
  const [isColdStart, setIsColdStart] = useState(false);
  const [coldStartMessage, setColdStartMessage] = useState('');
  
  useEffect(() => {
    const unsubscribe = apiClient.onColdStart((coldStart) => {
      setIsColdStart(coldStart);
      if (coldStart) {
        setColdStartMessage('Server is waking up, please wait...');
        // Clear message after 10 seconds
        setTimeout(() => setColdStartMessage(''), 10000);
      }
    });
    
    return unsubscribe;
  }, []);
  
  return { isColdStart, coldStartMessage };
}