import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '../lib/query-client';
import { localCache } from '../services/local-cache';
import { useToast } from './use-toast';
import type { Watchlist, WatchlistStock, Portfolio } from '@shared/schema';

interface OptimisticContext {
  previousData?: any;
  tempId?: string;
}

/**
 * Optimistic mutations for watchlist operations
 */
export function useOptimisticWatchlistMutations(userId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add stock to watchlist with optimistic update
  const addToWatchlistMutation = useMutation({
    mutationFn: async ({ watchlistId, stock }: { watchlistId: string; stock: WatchlistStock }) => {
      const response = await fetch(`/api/watchlists/${watchlistId}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stock),
      });
      if (!response.ok) throw new Error('Failed to add stock to watchlist');
      return response.json();
    },
    
    onMutate: async ({ watchlistId, stock }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist(watchlistId) });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKeys.watchlist(watchlistId));
      
      // Optimistically update cache
      queryClient.setQueryData(queryKeys.watchlist(watchlistId), (old: Watchlist | undefined) => {
        if (!old) return old;
        
        const tempId = `temp_${Date.now()}`;
        const optimisticStock: WatchlistStock = {
          ...stock,
          id: tempId,
          addedAt: new Date().toISOString(),
        };
        
        return {
          ...old,
          stocks: [...old.stocks, optimisticStock],
        };
      });
      
      // Update local cache
      const tempId = `temp_${Date.now()}`;
      localCache.setUserData(userId || 'anonymous', `watchlist_${watchlistId}`, {
        ...previousData,
        stocks: [...(previousData as Watchlist)?.stocks || [], { ...stock, id: tempId }],
      });
      
      return { previousData, tempId };
    },
    
    onError: (err, { watchlistId }, context: OptimisticContext | undefined) => {
      // Revert optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.watchlist(watchlistId), context.previousData);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao adicionar ação à watchlist",
        variant: "destructive",
      });
    },
    
    onSuccess: (data, { watchlistId }) => {
      // Update with real data
      queryClient.setQueryData(queryKeys.watchlist(watchlistId), (old: Watchlist | undefined) => {
        if (!old) return old;
        
        return {
          ...old,
          stocks: old.stocks.map(stock => 
            stock.id.startsWith('temp_') ? data : stock
          ),
        };
      });
      
      // Invalidate related queries
      invalidateQueries.watchlists(userId);
      
      toast({
        title: "Sucesso",
        description: "Ação adicionada à watchlist",
      });
    },
    
    onSettled: ({ watchlistId }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(watchlistId) });
    },
  });

  // Remove stock from watchlist with optimistic update
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async ({ watchlistId, stockId }: { watchlistId: string; stockId: string }) => {
      const response = await fetch(`/api/watchlists/${watchlistId}/stocks/${stockId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove stock from watchlist');
      return response.json();
    },
    
    onMutate: async ({ watchlistId, stockId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist(watchlistId) });
      
      const previousData = queryClient.getQueryData(queryKeys.watchlist(watchlistId));
      
      // Optimistically remove stock
      queryClient.setQueryData(queryKeys.watchlist(watchlistId), (old: Watchlist | undefined) => {
        if (!old) return old;
        
        return {
          ...old,
          stocks: old.stocks.filter(stock => stock.id !== stockId),
        };
      });
      
      return { previousData };
    },
    
    onError: (err, { watchlistId }, context: OptimisticContext | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.watchlist(watchlistId), context.previousData);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao remover ação da watchlist",
        variant: "destructive",
      });
    },
    
    onSuccess: (data, { watchlistId }) => {
      invalidateQueries.watchlists(userId);
      
      toast({
        title: "Sucesso",
        description: "Ação removida da watchlist",
      });
    },
    
    onSettled: ({ watchlistId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(watchlistId) });
    },
  });

  // Create new watchlist with optimistic update
  const createWatchlistMutation = useMutation({
    mutationFn: async (watchlist: Partial<Watchlist>) => {
      const response = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(watchlist),
      });
      if (!response.ok) throw new Error('Failed to create watchlist');
      return response.json();
    },
    
    onMutate: async (newWatchlist) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlists(userId) });
      
      const previousData = queryClient.getQueryData(queryKeys.watchlists(userId));
      const tempId = `temp_${Date.now()}`;
      
      // Optimistically add new watchlist
      queryClient.setQueryData(queryKeys.watchlists(userId), (old: Watchlist[] | undefined) => {
        const optimisticWatchlist: Watchlist = {
          id: tempId,
          name: newWatchlist.name || 'Nova Watchlist',
          description: newWatchlist.description || '',
          userId: userId || '',
          stocks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublic: false,
          ...newWatchlist,
        };
        
        return [...(old || []), optimisticWatchlist];
      });
      
      return { previousData, tempId };
    },
    
    onError: (err, newWatchlist, context: OptimisticContext | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.watchlists(userId), context.previousData);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao criar watchlist",
        variant: "destructive",
      });
    },
    
    onSuccess: (data) => {
      // Replace temp watchlist with real data
      queryClient.setQueryData(queryKeys.watchlists(userId), (old: Watchlist[] | undefined) => {
        if (!old) return [data];
        
        return old.map(watchlist => 
          watchlist.id.startsWith('temp_') ? data : watchlist
        );
      });
      
      toast({
        title: "Sucesso",
        description: "Watchlist criada com sucesso",
      });
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlists(userId) });
    },
  });

  return {
    addToWatchlist: addToWatchlistMutation.mutate,
    removeFromWatchlist: removeFromWatchlistMutation.mutate,
    createWatchlist: createWatchlistMutation.mutate,
    isAdding: addToWatchlistMutation.isPending,
    isRemoving: removeFromWatchlistMutation.isPending,
    isCreating: createWatchlistMutation.isPending,
  };
}

/**
 * Optimistic mutations for portfolio operations
 */
export function useOptimisticPortfolioMutations(userId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add holding to portfolio with optimistic update
  const addHoldingMutation = useMutation({
    mutationFn: async ({ portfolioId, holding }: { portfolioId: string; holding: any }) => {
      const response = await fetch(`/api/portfolios/${portfolioId}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holding),
      });
      if (!response.ok) throw new Error('Failed to add holding to portfolio');
      return response.json();
    },
    
    onMutate: async ({ portfolioId, holding }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolio(portfolioId) });
      
      const previousData = queryClient.getQueryData(queryKeys.portfolio(portfolioId));
      const tempId = `temp_${Date.now()}`;
      
      // Optimistically add holding
      queryClient.setQueryData(queryKeys.portfolio(portfolioId), (old: Portfolio | undefined) => {
        if (!old) return old;
        
        const optimisticHolding = {
          ...holding,
          id: tempId,
          addedAt: new Date().toISOString(),
        };
        
        return {
          ...old,
          holdings: [...(old.holdings || []), optimisticHolding],
        };
      });
      
      return { previousData, tempId };
    },
    
    onError: (err, { portfolioId }, context: OptimisticContext | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.portfolio(portfolioId), context.previousData);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao adicionar posição ao portfolio",
        variant: "destructive",
      });
    },
    
    onSuccess: (data, { portfolioId }) => {
      // Replace temp holding with real data
      queryClient.setQueryData(queryKeys.portfolio(portfolioId), (old: Portfolio | undefined) => {
        if (!old) return old;
        
        return {
          ...old,
          holdings: (old.holdings || []).map(holding => 
            holding.id.startsWith('temp_') ? data : holding
          ),
        };
      });
      
      invalidateQueries.portfolios(userId);
      
      toast({
        title: "Sucesso",
        description: "Posição adicionada ao portfolio",
      });
    },
    
    onSettled: ({ portfolioId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(portfolioId) });
    },
  });

  return {
    addHolding: addHoldingMutation.mutate,
    isAddingHolding: addHoldingMutation.isPending,
  };
}

/**
 * Optimistic mutations for user settings
 */
export function useOptimisticSettingsMutations(userId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch(`/api/users/${userId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.userSettings(userId) });
      
      const previousData = queryClient.getQueryData(queryKeys.userSettings(userId));
      
      // Optimistically update settings
      queryClient.setQueryData(queryKeys.userSettings(userId), (old: any) => ({
        ...old,
        ...newSettings,
      }));
      
      // Update local cache immediately for instant UI feedback
      if (userId) {
        localCache.setUserData(userId, 'settings', { ...previousData, ...newSettings });
      }
      
      return { previousData };
    },
    
    onError: (err, newSettings, context: OptimisticContext | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.userSettings(userId), context.previousData);
      }
      
      toast({
        title: "Erro",
        description: "Falha ao atualizar configurações",
        variant: "destructive",
      });
    },
    
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas",
      });
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userSettings(userId) });
    },
  });

  return {
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}