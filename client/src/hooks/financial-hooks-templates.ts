// Reusable hook templates based on successful patterns from admin-dashboard.tsx
// These hooks provide consistent API data fetching, error handling, and real-time updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { apiMetricsCollector } from '@/lib/api-metrics';
import type {
  StockData,
  StockQuote,
  StockProfile,
  ApiResult,
  FinancialError,
  AsyncState,
  SystemMetrics
} from '@/types/financial-interfaces';

// ============================================================================
// CORE FINANCIAL DATA HOOKS
// ============================================================================

/**
 * Standard hook for fetching financial data with error handling and caching
 */
export function useFinancialData<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    refetchInterval?: number;
    retryCount?: number;
    onError?: (error: FinancialError) => void;
    onSuccess?: (data: T) => void;
  } = {}
) {
  const errorHandler = useErrorHandler({
    showToast: true,
    autoRecover: true,
    maxRetries: options.retryCount || 3
  });

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        // Track API call with metrics collector
        return await apiMetricsCollector.trackAPICall(
          queryKey[0] || 'unknown',
          queryKey.slice(1).join('/'),
          queryFn,
          { method: 'GET' }
        );
      } catch (error) {
        const result = await errorHandler.handleError(error, {
          endpoint: queryKey.join('/'),
          method: 'GET'
        }, queryFn);
        
        if (result?.success && result.data) {
          return result.data;
        }
        
        throw error;
      }
    },
    staleTime: options.staleTime || 30000, // 30 seconds
    cacheTime: options.cacheTime || 300000, // 5 minutes
    refetchInterval: options.refetchInterval,
    enabled: options.enabled,
    retry: (failureCount, error) => {
      return failureCount < (options.retryCount || 3) && errorHandler.canRetry;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: options.onError,
    onSuccess: options.onSuccess
  });
}

/**
 * Hook for fetching stock quote data with auto-refresh
 */
export function useStockQuote(
  symbol: string,
  options: {
    enabled?: boolean;
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  return useFinancialData<StockQuote>(
    ['stock-quote', symbol],
    () => fetch(`/api/stocks/${symbol}/quote`).then(res => res.json()),
    {
      enabled: !!symbol && options.enabled,
      staleTime: 10000, // 10 seconds for real-time data
      refetchInterval: autoRefresh ? refreshInterval : undefined
    }
  );
}

/**
 * Hook for fetching stock profile data (less frequent updates)
 */
export function useStockProfile(symbol: string) {
  return useFinancialData<StockProfile>(
    ['stock-profile', symbol],
    () => fetch(`/api/stocks/${symbol}/profile`).then(res => res.json()),
    {
      enabled: !!symbol,
      staleTime: 600000, // 10 minutes
      cacheTime: 1800000 // 30 minutes
    }
  );
}

/**
 * Hook for fetching multiple stock data efficiently
 */
export function useMultipleStocks(symbols: string[]) {
  return useFinancialData<StockData[]>(
    ['stocks-bulk', ...symbols.sort()],
    () => fetch('/api/stocks/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols })
    }).then(res => res.json()),
    {
      enabled: symbols.length > 0,
      staleTime: 30000
    }
  );
}

// ============================================================================
// REAL-TIME DATA HOOKS
// ============================================================================

/**
 * Hook for real-time data with WebSocket fallback to polling
 */
export function useRealTimeData<T>(
  endpoint: string,
  options: {
    interval?: number;
    enabled?: boolean;
    transform?: (data: any) => T;
    onUpdate?: (data: T) => void;
    useWebSocket?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const wsRef = useRef<WebSocket>();

  const {
    interval = 30000,
    enabled = true,
    transform,
    onUpdate,
    useWebSocket = true
  } = options;

  const updateData = useCallback((newData: any) => {
    const transformedData = transform ? transform(newData) : newData;
    setData(transformedData);
    setLastUpdate(new Date());
    onUpdate?.(transformedData);
  }, [transform, onUpdate]);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(endpoint);
      const result = await response.json();
      updateData(result);
    } catch (error) {
      console.error('Real-time data fetch error:', error);
    }
  }, [endpoint, updateData]);

  // WebSocket connection
  useEffect(() => {
    if (!enabled || !useWebSocket) return;

    const wsUrl = endpoint.replace('/api/', '/ws/');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        updateData(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [endpoint, enabled, useWebSocket, updateData]);

  // Polling fallback
  useEffect(() => {
    if (!enabled || (useWebSocket && connectionStatus === 'connected')) return;

    // Initial fetch
    fetchData();

    // Set up polling
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, enabled, interval, useWebSocket, connectionStatus]);

  return {
    data,
    lastUpdate,
    connectionStatus,
    refresh: fetchData,
    isConnected: connectionStatus === 'connected'
  };
}

/**
 * Hook for auto-refreshing component state
 */
export function useAutoRefresh(
  refreshFn: () => Promise<void>,
  options: {
    interval?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { interval = 30000, enabled = true, onError } = options;

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshFn();
      setLastRefresh(new Date());
    } catch (error) {
      onError?.(error as Error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFn, isRefreshing, onError]);

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(refresh, interval);
    return () => clearInterval(intervalId);
  }, [refresh, enabled, interval]);

  return {
    isRefreshing,
    lastRefresh,
    refresh
  };
}

// ============================================================================
// ADMIN & METRICS HOOKS
// ============================================================================

/**
 * Hook for system metrics (based on admin-dashboard pattern)
 */
export function useSystemMetrics(
  timeRange: string = '1h',
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const timeRanges = [
    { label: '5 minutes', value: '5m', ms: 5 * 60 * 1000 },
    { label: '1 hour', value: '1h', ms: 60 * 60 * 1000 },
    { label: '24 hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
    { label: '7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 }
  ];

  const fetchMetrics = useCallback(async () => {
    try {
      const currentTimeRange = timeRanges.find(t => t.value === timeRange)?.ms || 60 * 60 * 1000;
      
      const systemMetrics: SystemMetrics = {
        apiMetrics: apiMetricsCollector.generateSnapshot(currentTimeRange),
        quotaStatus: apiMetricsCollector.getQuotaStatus(),
        cacheMetrics: apiMetricsCollector.getCacheMetrics(),
        errorAnalysis: apiMetricsCollector.getErrorAnalysis(currentTimeRange),
        systemHealth: apiMetricsCollector.healthCheck()
      };

      setMetrics(systemMetrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const { autoRefresh = true, refreshInterval = 30000 } = options;

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useAutoRefresh(fetchMetrics, {
    enabled: autoRefresh,
    interval: refreshInterval
  });

  return {
    metrics,
    loading,
    refreshMetrics: fetchMetrics
  };
}

// ============================================================================
// STATE MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for managing async state with loading, error, and data
 */
export function useAsyncState<T>(
  initialData: T | null = null
): [AsyncState<T>, (promise: Promise<T>) => Promise<void>] {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null
  });

  const execute = useCallback(async (promise: Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await promise;
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as FinancialError
      }));
      throw error;
    }
  }, []);

  return [state, execute];
}

/**
 * Hook for local storage with type safety
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * Hook for debouncing values (useful for search)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for managing previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

/**
 * Hook for interval-based effects
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, delay);
    
    return () => clearInterval(id);
  }, [delay]);
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook for financial calculations with validation
 */
export function useFinancialCalculation<TInput, TOutput>(
  calculationType: string,
  validationFn?: (input: TInput) => string | null
) {
  const errorHandler = useErrorHandler();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: TInput): Promise<TOutput> => {
      // Validate inputs
      if (validationFn) {
        const validationError = validationFn(inputs);
        if (validationError) {
          throw new Error(validationError);
        }
      }

      return fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: calculationType,
          inputs
        })
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
    },
    onError: (error) => {
      errorHandler.handleError(error);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries(['calculations', calculationType]);
    }
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for tracking component mount/unmount
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return useCallback(() => isMountedRef.current, []);
}

/**
 * Hook for handling window focus/blur events
 */
export function useWindowFocus(): boolean {
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return focused;
}

/**
 * Hook for media queries
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}

export default {
  useFinancialData,
  useStockQuote,
  useStockProfile,
  useMultipleStocks,
  useRealTimeData,
  useAutoRefresh,
  useSystemMetrics,
  useAsyncState,
  useLocalStorage,
  useDebounce,
  usePrevious,
  useInterval,
  useFinancialCalculation,
  useIsMounted,
  useWindowFocus,
  useMediaQuery
};