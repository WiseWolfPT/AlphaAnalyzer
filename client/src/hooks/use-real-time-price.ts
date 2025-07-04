import { useQuery, useQueries } from '@tanstack/react-query';
import axios from 'axios';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  provider: string;
}

interface ApiResponse {
  success: boolean;
  data?: PriceData;
  error?: string;
  cached?: boolean;
}

// API base URL - in production this should come from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Fetch single stock price
export function useRealTimePrice(symbol: string, options?: {
  enabled?: boolean;
  refetchInterval?: number;
  useCache?: boolean;
}) {
  return useQuery<PriceData>({
    queryKey: ['stockPrice', symbol],
    queryFn: async () => {
      const cacheParam = options?.useCache === false ? '?cache=false' : '';
      const response = await axios.get<ApiResponse>(
        `${API_BASE_URL}/api/v2/market-data/stocks/${symbol}/price${cacheParam}`
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch price data');
      }
      
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 60000, // Default 1 minute
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Fetch multiple stock prices in batch
export function useBatchPrices(symbols: string[], options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery<PriceData[]>({
    queryKey: ['batchPrices', symbols],
    queryFn: async () => {
      const response = await axios.post<{
        success: boolean;
        data?: PriceData[];
        error?: string;
      }>(`${API_BASE_URL}/api/v2/market-data/stocks/batch/prices`, {
        symbols
      });
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch batch prices');
      }
      
      return response.data.data;
    },
    enabled: (options?.enabled ?? true) && symbols.length > 0,
    refetchInterval: options?.refetchInterval ?? 60000,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Fetch prices for multiple stocks individually (fallback when batch fails)
export function useMultiplePrices(symbols: string[], options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const queries = useQueries({
    queries: symbols.map(symbol => ({
      queryKey: ['stockPrice', symbol],
      queryFn: async () => {
        const response = await axios.get<ApiResponse>(
          `${API_BASE_URL}/api/v2/market-data/stocks/${symbol}/price`
        );
        
        if (!response.data.success || !response.data.data) {
          throw new Error(response.data.error || 'Failed to fetch price data');
        }
        
        return response.data.data;
      },
      enabled: options?.enabled ?? true,
      refetchInterval: options?.refetchInterval ?? 60000,
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }))
  });

  // Combine results
  const data = queries
    .filter(query => query.data)
    .map(query => query.data as PriceData);
  
  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const error = queries.find(query => query.error)?.error;

  return {
    data,
    isLoading,
    isError,
    error,
    queries
  };
}

// Hook to get price with fallback to mock data
export function useStockPrice(symbol: string, options?: {
  refetchInterval?: number;
  fallbackPrice?: number;
}) {
  const { data, isLoading, isError, error } = useRealTimePrice(symbol, options);

  // Return mock data if API fails
  if (isError && options?.fallbackPrice) {
    return {
      data: {
        symbol,
        price: options.fallbackPrice,
        change: 0,
        changePercent: 0,
        volume: 0,
        timestamp: Date.now(),
        provider: 'mock'
      } as PriceData,
      isLoading: false,
      isError: true,
      error,
      isMockData: true
    };
  }

  return {
    data,
    isLoading,
    isError,
    error,
    isMockData: false
  };
}

// Format price for display
export function formatPrice(price: number | undefined): string {
  if (price === undefined || price === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

// Format change percentage for display
export function formatChangePercent(percent: number | undefined): string {
  if (percent === undefined || percent === null) return '-';
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

// Format volume for display
export function formatVolume(volume: number | undefined): string {
  if (volume === undefined || volume === null) return '-';
  
  if (volume >= 1000000000) {
    return `${(volume / 1000000000).toFixed(2)}B`;
  } else if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`;
  }
  
  return volume.toString();
}