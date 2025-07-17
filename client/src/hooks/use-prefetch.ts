import { useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, prefetchConfigs } from '../lib/query-client';
import { localCache } from '../services/local-cache';

interface PrefetchOptions {
  delay?: number; // Delay before prefetching (ms)
  priority?: 'low' | 'normal' | 'high';
  cache?: boolean; // Whether to use local cache
}

/**
 * Hook for intelligent data prefetching
 */
export function usePrefetch() {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearPrefetchTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Prefetch stock data on hover
   */
  const prefetchStock = useCallback(
    (symbol: string, options: PrefetchOptions = {}) => {
      const { delay = 300, cache = true } = options;

      // Clear any existing timeout
      clearPrefetchTimeout();

      timeoutRef.current = setTimeout(async () => {
        try {
          // Check cache first
          if (cache) {
            const cachedProfile = localCache.getStockData(symbol, 'stock_profile');
            const cachedPrice = localCache.getStockData(symbol, 'stock_price');
            
            if (cachedProfile && cachedPrice) {
              // Data is already cached, no need to fetch
              return;
            }
          }

          // Prefetch stock profile and current price
          await Promise.allSettled([
            queryClient.prefetchQuery({
              queryKey: queryKeys.stockProfile(symbol),
              queryFn: async () => {
                const response = await fetch(`/api/stocks/${symbol}/profile`);
                if (!response.ok) throw new Error('Failed to fetch stock profile');
                const data = await response.json();
                
                // Cache the data
                if (cache) {
                  localCache.setStockData(symbol, 'stock_profile', data);
                }
                
                return data;
              },
              ...prefetchConfigs.stock,
            }),
            
            queryClient.prefetchQuery({
              queryKey: queryKeys.stockPrice(symbol),
              queryFn: async () => {
                const response = await fetch(`/api/stocks/${symbol}/price`);
                if (!response.ok) throw new Error('Failed to fetch stock price');
                const data = await response.json();
                
                // Cache the data
                if (cache) {
                  localCache.setStockData(symbol, 'stock_price', data);
                }
                
                return data;
              },
              ...prefetchConfigs.stock,
            }),
          ]);
        } catch (error) {
          console.warn(`Failed to prefetch stock data for ${symbol}:`, error);
        }
      }, delay);
    },
    [queryClient, clearPrefetchTimeout]
  );

  /**
   * Prefetch stock chart data
   */
  const prefetchStockChart = useCallback(
    (symbol: string, timeframe: string = '1D', options: PrefetchOptions = {}) => {
      const { delay = 300, cache = true } = options;

      clearPrefetchTimeout();

      timeoutRef.current = setTimeout(async () => {
        try {
          // Check cache first
          if (cache) {
            const cachedChart = localCache.getStockData(symbol, 'stock_chart');
            if (cachedChart && cachedChart.timeframe === timeframe) {
              return;
            }
          }

          await queryClient.prefetchQuery({
            queryKey: queryKeys.stockChart(symbol, timeframe),
            queryFn: async () => {
              const response = await fetch(`/api/stocks/${symbol}/chart?timeframe=${timeframe}`);
              if (!response.ok) throw new Error('Failed to fetch stock chart');
              const data = await response.json();
              
              // Cache the data
              if (cache) {
                localCache.setStockData(symbol, 'stock_chart', { ...data, timeframe });
              }
              
              return data;
            },
            ...prefetchConfigs.stock,
          });
        } catch (error) {
          console.warn(`Failed to prefetch chart data for ${symbol}:`, error);
        }
      }, delay);
    },
    [queryClient, clearPrefetchTimeout]
  );

  /**
   * Prefetch market data
   */
  const prefetchMarketData = useCallback(
    (dataType: 'overview' | 'gainers' | 'losers' | 'sectors', options: PrefetchOptions = {}) => {
      const { delay = 200, cache = true } = options;

      clearPrefetchTimeout();

      timeoutRef.current = setTimeout(async () => {
        try {
          // Check cache first
          if (cache) {
            const cachedData = localCache.getMarketData(dataType);
            if (cachedData) {
              return;
            }
          }

          const queryKey = dataType === 'overview' 
            ? queryKeys.marketOverview()
            : dataType === 'sectors'
            ? queryKeys.marketSectors()
            : dataType === 'gainers'
            ? queryKeys.marketGainers()
            : queryKeys.marketLosers();

          await queryClient.prefetchQuery({
            queryKey,
            queryFn: async () => {
              const response = await fetch(`/api/market/${dataType}`);
              if (!response.ok) throw new Error(`Failed to fetch market ${dataType}`);
              const data = await response.json();
              
              // Cache the data
              if (cache) {
                localCache.setMarketData(dataType, data);
              }
              
              return data;
            },
            ...prefetchConfigs.market,
          });
        } catch (error) {
          console.warn(`Failed to prefetch market data for ${dataType}:`, error);
        }
      }, delay);
    },
    [queryClient, clearPrefetchTimeout]
  );

  /**
   * Prefetch search results
   */
  const prefetchSearch = useCallback(
    (query: string, options: PrefetchOptions = {}) => {
      const { delay = 500, cache = true } = options;

      // Don't prefetch very short queries
      if (query.length < 2) return;

      clearPrefetchTimeout();

      timeoutRef.current = setTimeout(async () => {
        try {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.search(query),
            queryFn: async () => {
              const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
              if (!response.ok) throw new Error('Failed to fetch search results');
              const data = await response.json();
              
              // Cache the data
              if (cache) {
                localCache.set(`search_${query}`, data, { 
                  ttl: 10 * 60 * 1000 // 10 minutes for search results
                });
              }
              
              return data;
            },
            ...prefetchConfigs.search,
          });
        } catch (error) {
          console.warn(`Failed to prefetch search results for "${query}":`, error);
        }
      }, delay);
    },
    [queryClient, clearPrefetchTimeout]
  );

  /**
   * Prefetch user data
   */
  const prefetchUserData = useCallback(
    (userId: string, dataType: 'watchlists' | 'portfolios' | 'profile', options: PrefetchOptions = {}) => {
      const { delay = 100, cache = true } = options;

      clearPrefetchTimeout();

      timeoutRef.current = setTimeout(async () => {
        try {
          // Check cache first
          if (cache) {
            const cachedData = localCache.getUserData(userId, dataType);
            if (cachedData) {
              return;
            }
          }

          const queryKey = dataType === 'watchlists'
            ? queryKeys.watchlists(userId)
            : dataType === 'portfolios'
            ? queryKeys.portfolios(userId)
            : queryKeys.userProfile(userId);

          await queryClient.prefetchQuery({
            queryKey,
            queryFn: async () => {
              const response = await fetch(`/api/users/${userId}/${dataType}`);
              if (!response.ok) throw new Error(`Failed to fetch user ${dataType}`);
              const data = await response.json();
              
              // Cache the data
              if (cache) {
                localCache.setUserData(userId, dataType, data);
              }
              
              return data;
            },
            ...prefetchConfigs.user,
          });
        } catch (error) {
          console.warn(`Failed to prefetch user ${dataType} for ${userId}:`, error);
        }
      }, delay);
    },
    [queryClient, clearPrefetchTimeout]
  );

  /**
   * Warm up cache with popular symbols
   */
  const warmupCache = useCallback(
    (symbols: string[] = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']) => {
      // Prefetch data for popular symbols during idle time
      requestIdleCallback(() => {
        symbols.forEach((symbol, index) => {
          setTimeout(() => {
            prefetchStock(symbol, { delay: 0, cache: true });
          }, index * 1000); // Stagger requests to avoid overwhelming the API
        });
      });
    },
    [prefetchStock]
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    clearPrefetchTimeout();
  }, [clearPrefetchTimeout]);

  return {
    prefetchStock,
    prefetchStockChart,
    prefetchMarketData,
    prefetchSearch,
    prefetchUserData,
    warmupCache,
    cleanup,
    clearPrefetchTimeout,
  };
}

/**
 * Hook for component-level hover prefetching
 */
export function useHoverPrefetch() {
  const { prefetchStock, clearPrefetchTimeout } = usePrefetch();

  const onMouseEnter = useCallback(
    (symbol: string) => {
      prefetchStock(symbol, { delay: 300 });
    },
    [prefetchStock]
  );

  const onMouseLeave = useCallback(() => {
    clearPrefetchTimeout();
  }, [clearPrefetchTimeout]);

  return { onMouseEnter, onMouseLeave };
}

/**
 * Hook for navigation-based prefetching
 */
export function useNavigationPrefetch() {
  const { prefetchStock, prefetchStockChart, prefetchMarketData } = usePrefetch();

  const prefetchStockPage = useCallback(
    (symbol: string) => {
      // Prefetch all data needed for a stock page
      prefetchStock(symbol, { delay: 0 });
      prefetchStockChart(symbol, '1D', { delay: 100 });
      prefetchStockChart(symbol, '1M', { delay: 200 });
    },
    [prefetchStock, prefetchStockChart]
  );

  const prefetchDashboard = useCallback(() => {
    // Prefetch market overview and popular data
    prefetchMarketData('overview', { delay: 0 });
    prefetchMarketData('gainers', { delay: 100 });
    prefetchMarketData('losers', { delay: 200 });
  }, [prefetchMarketData]);

  return {
    prefetchStockPage,
    prefetchDashboard,
  };
}