import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys, type ChartParams } from '@/lib/query-keys';
import { realDataService } from '@/services/real-data-integration';
import { stockApi } from '@/services/stock-api';
import { toast } from 'sonner';

// Types for stock data
interface StockQuote {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  volume?: string;
  marketCap?: string;
  peRatio?: string;
  source: 'real' | 'mock' | 'cache';
  lastUpdated: Date;
}

interface StockFundamentals {
  symbol: string;
  marketCap: string;
  pe: string;
  eps: string;
  dividend: string;
  beta: string;
  volume: string;
  avgVolume: string;
  sector: string;
  industry: string;
}

interface StockNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedSymbols: string[];
}

// Query configurations for different data types
const queryConfigs = {
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  fundamentals: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(2000 * 2 ** attemptIndex, 60000),
  },
  news: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  historical: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    retry: 1,
    retryDelay: (attemptIndex: number) => Math.min(5000 * 2 ** attemptIndex, 30000),
  },
};

/**
 * Hook for fetching real-time stock quote data
 */
export function useStockQuote(
  symbol: string,
  options?: Partial<UseQueryOptions<StockQuote>>
) {
  return useQuery({
    queryKey: queryKeys.stockQuote(symbol),
    queryFn: async () => {
      const quote = await realDataService.getStockQuote(symbol);
      if (!quote) {
        throw new Error(`No data available for ${symbol}`);
      }
      return quote;
    },
    enabled: !!symbol,
    ...queryConfigs.realtime,
    ...options,
  });
}

/**
 * Hook for fetching stock fundamentals
 */
export function useStockFundamentals(
  symbol: string,
  options?: Partial<UseQueryOptions<StockFundamentals>>
) {
  return useQuery({
    queryKey: queryKeys.stockFundamentals(symbol),
    queryFn: async () => {
      const fundamentals = await stockApi.getFundamentals(symbol);
      if (!fundamentals) {
        throw new Error(`No fundamentals data available for ${symbol}`);
      }
      return fundamentals;
    },
    enabled: !!symbol,
    ...queryConfigs.fundamentals,
    ...options,
  });
}

/**
 * Hook for fetching stock news
 */
export function useStockNews(
  symbol: string,
  options?: Partial<UseQueryOptions<StockNews[]>>
) {
  return useQuery({
    queryKey: queryKeys.stockNews(symbol),
    queryFn: async () => {
      const news = await stockApi.getNews(symbol);
      return news || [];
    },
    enabled: !!symbol,
    ...queryConfigs.news,
    ...options,
  });
}

/**
 * Hook for fetching stock chart data
 */
export function useStockChart(
  symbol: string,
  params: ChartParams,
  options?: Partial<UseQueryOptions<any>>
) {
  return useQuery({
    queryKey: queryKeys.stockChart(symbol, params),
    queryFn: async () => {
      const chartData = await stockApi.getChart(symbol, params);
      if (!chartData) {
        throw new Error(`No chart data available for ${symbol}`);
      }
      return chartData;
    },
    enabled: !!symbol,
    ...queryConfigs.historical,
    ...options,
  });
}

/**
 * Hook for fetching multiple stocks (batch)
 */
export function useStockBatch(
  symbols: string[],
  options?: Partial<UseQueryOptions<StockQuote[]>>
) {
  return useQuery({
    queryKey: queryKeys.stockBatch(symbols),
    queryFn: async () => {
      const promises = symbols.map(symbol => 
        realDataService.getStockQuote(symbol).catch(err => {
          console.warn(`Failed to fetch ${symbol}:`, err);
          return null;
        })
      );
      
      const results = await Promise.all(promises);
      return results.filter(Boolean) as StockQuote[];
    },
    enabled: symbols.length > 0,
    ...queryConfigs.realtime,
    ...options,
  });
}

/**
 * Hook for stock search
 */
export function useStockSearch(
  query: string,
  options?: Partial<UseQueryOptions<any[]>>
) {
  return useQuery({
    queryKey: queryKeys.searchStocks(query),
    queryFn: async () => {
      if (!query || query.length < 2) {
        return [];
      }
      
      const results = await stockApi.search(query);
      return results || [];
    },
    enabled: !!query && query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// Mutations for stock-related operations
export function useStockMutations() {
  const queryClient = useQueryClient();
  
  /**
   * Mutation for refreshing stock data
   */
  const refreshStock = useMutation({
    mutationFn: async (symbol: string) => {
      // Force refresh by invalidating cache
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stock(symbol)
      });
      
      // Fetch fresh data
      return await realDataService.getStockQuote(symbol);
    },
    onSuccess: (data, symbol) => {
      // Update cache with fresh data
      queryClient.setQueryData(queryKeys.stockQuote(symbol), data);
      toast.success(`${symbol} data refreshed`);
    },
    onError: (error, symbol) => {
      console.error(`Failed to refresh ${symbol}:`, error);
      toast.error(`Failed to refresh ${symbol} data`);
    },
  });

  /**
   * Mutation for bulk refresh of multiple stocks
   */
  const refreshStockBatch = useMutation({
    mutationFn: async (symbols: string[]) => {
      // Invalidate all stock queries
      await Promise.all(
        symbols.map(symbol => 
          queryClient.invalidateQueries({
            queryKey: queryKeys.stock(symbol)
          })
        )
      );
      
      // Fetch fresh data for all symbols
      const promises = symbols.map(symbol => 
        realDataService.getStockQuote(symbol).catch(err => {
          console.warn(`Failed to refresh ${symbol}:`, err);
          return null;
        })
      );
      
      return await Promise.all(promises);
    },
    onSuccess: (results, symbols) => {
      // Update cache with fresh data
      results.forEach((data, index) => {
        if (data) {
          queryClient.setQueryData(queryKeys.stockQuote(symbols[index]), data);
        }
      });
      
      const successCount = results.filter(Boolean).length;
      toast.success(`Refreshed ${successCount}/${symbols.length} stocks`);
    },
    onError: (error, symbols) => {
      console.error('Failed to refresh stocks:', error);
      toast.error('Failed to refresh stock data');
    },
  });

  return {
    refreshStock,
    refreshStockBatch,
  };
}

// Utility functions for stock queries
export const stockQueryUtils = {
  /**
   * Prefetch stock data for better performance
   */
  prefetchStock: (queryClient: any, symbol: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.stockQuote(symbol),
      queryFn: () => realDataService.getStockQuote(symbol),
      ...queryConfigs.realtime,
    });
  },

  /**
   * Invalidate all stock-related queries
   */
  invalidateStockQueries: (queryClient: any, symbol: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.stock(symbol)
    });
  },

  /**
   * Get cached stock data if available
   */
  getCachedStockData: (queryClient: any, symbol: string): StockQuote | undefined => {
    return queryClient.getQueryData(queryKeys.stockQuote(symbol));
  },

  /**
   * Set stock data in cache
   */
  setStockData: (queryClient: any, symbol: string, data: StockQuote) => {
    queryClient.setQueryData(queryKeys.stockQuote(symbol), data);
  },
};