import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { watchlistService } from '@/services/watchlist-service';
import { toast } from 'sonner';

// Types for watchlist data
interface Watchlist {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  stocks: WatchlistStock[];
}

interface WatchlistStock {
  id: string;
  watchlistId: string;
  symbol: string;
  name: string;
  addedAt: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: string;
  sector?: string;
  alerts?: WatchlistAlert[];
}

interface WatchlistAlert {
  id: string;
  watchlistStockId: string;
  type: 'price_above' | 'price_below' | 'volume_above' | 'change_above' | 'change_below';
  value: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
}

// Query configurations
const queryConfigs = {
  watchlist: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  stocks: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
};

/**
 * Hook for fetching all user watchlists
 */
export function useWatchlists(
  options?: Partial<UseQueryOptions<Watchlist[]>>
) {
  return useQuery({
    queryKey: queryKeys.watchlists(),
    queryFn: async () => {
      const watchlists = await watchlistService.getAll();
      return watchlists || [];
    },
    ...queryConfigs.watchlist,
    ...options,
  });
}

/**
 * Hook for fetching a specific watchlist
 */
export function useWatchlist(
  id: string,
  options?: Partial<UseQueryOptions<Watchlist>>
) {
  return useQuery({
    queryKey: queryKeys.watchlist(id),
    queryFn: async () => {
      const watchlist = await watchlistService.getById(id);
      if (!watchlist) {
        throw new Error(`Watchlist ${id} not found`);
      }
      return watchlist;
    },
    enabled: !!id,
    ...queryConfigs.watchlist,
    ...options,
  });
}

/**
 * Hook for fetching watchlist stocks with real-time prices
 */
export function useWatchlistStocks(
  id: string,
  options?: Partial<UseQueryOptions<WatchlistStock[]>>
) {
  return useQuery({
    queryKey: queryKeys.watchlistStocks(id),
    queryFn: async () => {
      const stocks = await watchlistService.getStocks(id);
      return stocks || [];
    },
    enabled: !!id,
    ...queryConfigs.stocks,
    ...options,
  });
}

/**
 * Hook for getting the default watchlist
 */
export function useDefaultWatchlist(
  options?: Partial<UseQueryOptions<Watchlist>>
) {
  return useQuery({
    queryKey: [...queryKeys.watchlists(), 'default'],
    queryFn: async () => {
      const watchlists = await watchlistService.getAll();
      const defaultWatchlist = watchlists?.find(w => w.isDefault);
      
      if (!defaultWatchlist) {
        throw new Error('No default watchlist found');
      }
      
      return defaultWatchlist;
    },
    ...queryConfigs.watchlist,
    ...options,
  });
}

// Mutations for watchlist operations
export function useWatchlistMutations() {
  const queryClient = useQueryClient();

  /**
   * Mutation for creating a new watchlist
   */
  const createWatchlist = useMutation({
    mutationFn: async (data: { name: string; description?: string; isDefault?: boolean }) => {
      return await watchlistService.create(data);
    },
    onMutate: async (newWatchlist) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlists() });

      // Snapshot the previous value
      const previousWatchlists = queryClient.getQueryData<Watchlist[]>(queryKeys.watchlists());

      // Optimistically update to the new value
      if (previousWatchlists) {
        const optimisticWatchlist: Watchlist = {
          id: `temp-${Date.now()}`,
          name: newWatchlist.name,
          description: newWatchlist.description,
          userId: 'current-user', // This would come from auth context
          isDefault: newWatchlist.isDefault || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stocks: [],
        };

        queryClient.setQueryData<Watchlist[]>(
          queryKeys.watchlists(),
          [...previousWatchlists, optimisticWatchlist]
        );
      }

      return { previousWatchlists };
    },
    onError: (err, newWatchlist, context) => {
      // Rollback on error
      if (context?.previousWatchlists) {
        queryClient.setQueryData(queryKeys.watchlists(), context.previousWatchlists);
      }
      toast.error('Failed to create watchlist');
    },
    onSuccess: (data, variables) => {
      toast.success(`Watchlist "${variables.name}" created successfully`);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlists() });
    },
  });

  /**
   * Mutation for updating a watchlist
   */
  const updateWatchlist = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Watchlist> }) => {
      return await watchlistService.update(id, data);
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist(id) });

      // Snapshot the previous value
      const previousWatchlist = queryClient.getQueryData<Watchlist>(queryKeys.watchlist(id));

      // Optimistically update to the new value
      if (previousWatchlist) {
        queryClient.setQueryData<Watchlist>(
          queryKeys.watchlist(id),
          { ...previousWatchlist, ...data, updatedAt: new Date().toISOString() }
        );
      }

      return { previousWatchlist };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousWatchlist) {
        queryClient.setQueryData(queryKeys.watchlist(id), context.previousWatchlist);
      }
      toast.error('Failed to update watchlist');
    },
    onSuccess: (data, { id }) => {
      toast.success('Watchlist updated successfully');
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlists() });
    },
  });

  /**
   * Mutation for deleting a watchlist
   */
  const deleteWatchlist = useMutation({
    mutationFn: async (id: string) => {
      return await watchlistService.delete(id);
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlists() });

      // Snapshot the previous value
      const previousWatchlists = queryClient.getQueryData<Watchlist[]>(queryKeys.watchlists());

      // Optimistically update to the new value
      if (previousWatchlists) {
        queryClient.setQueryData<Watchlist[]>(
          queryKeys.watchlists(),
          previousWatchlists.filter(w => w.id !== id)
        );
      }

      return { previousWatchlists };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousWatchlists) {
        queryClient.setQueryData(queryKeys.watchlists(), context.previousWatchlists);
      }
      toast.error('Failed to delete watchlist');
    },
    onSuccess: (data, id) => {
      toast.success('Watchlist deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlists() });
    },
  });

  /**
   * Mutation for adding a stock to a watchlist
   */
  const addStock = useMutation({
    mutationFn: async ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) => {
      return await watchlistService.addStock(watchlistId, symbol);
    },
    onMutate: async ({ watchlistId, symbol }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlistStocks(watchlistId) });

      // Snapshot the previous value
      const previousStocks = queryClient.getQueryData<WatchlistStock[]>(
        queryKeys.watchlistStocks(watchlistId)
      );

      // Optimistically update to the new value
      if (previousStocks) {
        const optimisticStock: WatchlistStock = {
          id: `temp-${Date.now()}`,
          watchlistId,
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(), // We'll get real name from API
          addedAt: new Date().toISOString(),
          alerts: [],
        };

        queryClient.setQueryData<WatchlistStock[]>(
          queryKeys.watchlistStocks(watchlistId),
          [...previousStocks, optimisticStock]
        );
      }

      return { previousStocks };
    },
    onError: (err, { watchlistId, symbol }, context) => {
      // Rollback on error
      if (context?.previousStocks) {
        queryClient.setQueryData(queryKeys.watchlistStocks(watchlistId), context.previousStocks);
      }
      toast.error(`Failed to add ${symbol} to watchlist`);
    },
    onSuccess: (data, { watchlistId, symbol }) => {
      toast.success(`${symbol} added to watchlist`);
    },
    onSettled: (data, error, { watchlistId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlistStocks(watchlistId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(watchlistId) });
    },
  });

  /**
   * Mutation for removing a stock from a watchlist
   */
  const removeStock = useMutation({
    mutationFn: async ({ watchlistId, stockId }: { watchlistId: string; stockId: string }) => {
      return await watchlistService.removeStock(watchlistId, stockId);
    },
    onMutate: async ({ watchlistId, stockId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlistStocks(watchlistId) });

      // Snapshot the previous value
      const previousStocks = queryClient.getQueryData<WatchlistStock[]>(
        queryKeys.watchlistStocks(watchlistId)
      );

      // Optimistically update to the new value
      if (previousStocks) {
        queryClient.setQueryData<WatchlistStock[]>(
          queryKeys.watchlistStocks(watchlistId),
          previousStocks.filter(s => s.id !== stockId)
        );
      }

      return { previousStocks };
    },
    onError: (err, { watchlistId }, context) => {
      // Rollback on error
      if (context?.previousStocks) {
        queryClient.setQueryData(queryKeys.watchlistStocks(watchlistId), context.previousStocks);
      }
      toast.error('Failed to remove stock from watchlist');
    },
    onSuccess: (data, { watchlistId }) => {
      toast.success('Stock removed from watchlist');
    },
    onSettled: (data, error, { watchlistId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlistStocks(watchlistId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(watchlistId) });
    },
  });

  /**
   * Mutation for creating a price alert
   */
  const createAlert = useMutation({
    mutationFn: async (data: {
      watchlistStockId: string;
      type: WatchlistAlert['type'];
      value: number;
    }) => {
      return await watchlistService.createAlert(data);
    },
    onSuccess: (data, variables) => {
      toast.success('Price alert created successfully');
      // Invalidate watchlist data to include new alert
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlists() });
    },
    onError: (error) => {
      toast.error('Failed to create price alert');
    },
  });

  /**
   * Mutation for removing a price alert
   */
  const removeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      return await watchlistService.removeAlert(alertId);
    },
    onSuccess: (data, alertId) => {
      toast.success('Price alert removed');
      // Invalidate watchlist data to remove alert
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlists() });
    },
    onError: (error) => {
      toast.error('Failed to remove price alert');
    },
  });

  return {
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    addStock,
    removeStock,
    createAlert,
    removeAlert,
  };
}

// Utility functions for watchlist queries
export const watchlistQueryUtils = {
  /**
   * Prefetch watchlist data for better performance
   */
  prefetchWatchlist: (queryClient: any, id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.watchlist(id),
      queryFn: () => watchlistService.getById(id),
      ...queryConfigs.watchlist,
    });
  },

  /**
   * Invalidate all watchlist-related queries
   */
  invalidateWatchlistQueries: (queryClient: any, id: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.watchlist(id)
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.watchlists()
    });
  },

  /**
   * Get cached watchlist data if available
   */
  getCachedWatchlist: (queryClient: any, id: string): Watchlist | undefined => {
    return queryClient.getQueryData(queryKeys.watchlist(id));
  },

  /**
   * Set watchlist data in cache
   */
  setWatchlistData: (queryClient: any, id: string, data: Watchlist) => {
    queryClient.setQueryData(queryKeys.watchlist(id), data);
  },

  /**
   * Check if a stock is in any watchlist
   */
  isStockInWatchlist: (queryClient: any, symbol: string): boolean => {
    const watchlists = queryClient.getQueryData<Watchlist[]>(queryKeys.watchlists());
    if (!watchlists) return false;
    
    return watchlists.some(watchlist => 
      watchlist.stocks.some(stock => stock.symbol === symbol)
    );
  },

  /**
   * Get all watchlists containing a specific stock
   */
  getWatchlistsForStock: (queryClient: any, symbol: string): Watchlist[] => {
    const watchlists = queryClient.getQueryData<Watchlist[]>(queryKeys.watchlists());
    if (!watchlists) return [];
    
    return watchlists.filter(watchlist => 
      watchlist.stocks.some(stock => stock.symbol === symbol)
    );
  },

  /**
   * Refresh all watchlist stock prices
   */
  refreshWatchlistPrices: (queryClient: any, id: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.watchlistStocks(id)
    });
  },
};