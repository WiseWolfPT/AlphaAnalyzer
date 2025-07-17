import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { portfolioService } from '@/services/portfolio-service';
import { toast } from 'sonner';

// Types for portfolio data
interface Portfolio {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  holdings: PortfolioHolding[];
}

interface PortfolioHolding {
  id: string;
  portfolioId: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  addedAt: string;
  updatedAt: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  topPerformer: {
    symbol: string;
    changePercent: number;
  };
  worstPerformer: {
    symbol: string;
    changePercent: number;
  };
  allocation: {
    symbol: string;
    percentage: number;
    value: number;
  }[];
}

interface PortfolioPerformance {
  period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
  data: {
    date: string;
    value: number;
    change: number;
    changePercent: number;
  }[];
  metrics: {
    totalReturn: number;
    totalReturnPercent: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

// Query configurations
const queryConfigs = {
  portfolio: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
  performance: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(2000 * 2 ** attemptIndex, 60000),
  },
};

/**
 * Hook for fetching all user portfolios
 */
export function usePortfolios(
  options?: Partial<UseQueryOptions<Portfolio[]>>
) {
  return useQuery({
    queryKey: queryKeys.portfolios(),
    queryFn: async () => {
      const portfolios = await portfolioService.getAll();
      return portfolios || [];
    },
    ...queryConfigs.portfolio,
    ...options,
  });
}

/**
 * Hook for fetching a specific portfolio
 */
export function usePortfolio(
  id: string,
  options?: Partial<UseQueryOptions<Portfolio>>
) {
  return useQuery({
    queryKey: queryKeys.portfolio(id),
    queryFn: async () => {
      const portfolio = await portfolioService.getById(id);
      if (!portfolio) {
        throw new Error(`Portfolio ${id} not found`);
      }
      return portfolio;
    },
    enabled: !!id,
    ...queryConfigs.portfolio,
    ...options,
  });
}

/**
 * Hook for fetching portfolio holdings
 */
export function usePortfolioHoldings(
  id: string,
  options?: Partial<UseQueryOptions<PortfolioHolding[]>>
) {
  return useQuery({
    queryKey: queryKeys.portfolioHoldings(id),
    queryFn: async () => {
      const holdings = await portfolioService.getHoldings(id);
      return holdings || [];
    },
    enabled: !!id,
    ...queryConfigs.portfolio,
    ...options,
  });
}

/**
 * Hook for fetching portfolio summary
 */
export function usePortfolioSummary(
  id: string,
  options?: Partial<UseQueryOptions<PortfolioSummary>>
) {
  return useQuery({
    queryKey: queryKeys.portfolioSummary(id),
    queryFn: async () => {
      const summary = await portfolioService.getSummary(id);
      if (!summary) {
        throw new Error(`Portfolio summary for ${id} not available`);
      }
      return summary;
    },
    enabled: !!id,
    ...queryConfigs.portfolio,
    ...options,
  });
}

/**
 * Hook for fetching portfolio performance
 */
export function usePortfolioPerformance(
  id: string,
  period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL' = '1M',
  options?: Partial<UseQueryOptions<PortfolioPerformance>>
) {
  return useQuery({
    queryKey: queryKeys.portfolioPerformance(id),
    queryFn: async () => {
      const performance = await portfolioService.getPerformance(id, period);
      if (!performance) {
        throw new Error(`Portfolio performance for ${id} not available`);
      }
      return performance;
    },
    enabled: !!id,
    ...queryConfigs.performance,
    ...options,
  });
}

// Mutations for portfolio operations
export function usePortfolioMutations() {
  const queryClient = useQueryClient();

  /**
   * Mutation for creating a new portfolio
   */
  const createPortfolio = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await portfolioService.create(data);
    },
    onMutate: async (newPortfolio) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolios() });

      // Snapshot the previous value
      const previousPortfolios = queryClient.getQueryData<Portfolio[]>(queryKeys.portfolios());

      // Optimistically update to the new value
      if (previousPortfolios) {
        const optimisticPortfolio: Portfolio = {
          id: `temp-${Date.now()}`,
          name: newPortfolio.name,
          description: newPortfolio.description,
          userId: 'current-user', // This would come from auth context
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalValue: 0,
          totalChange: 0,
          totalChangePercent: 0,
          holdings: [],
        };

        queryClient.setQueryData<Portfolio[]>(
          queryKeys.portfolios(),
          [...previousPortfolios, optimisticPortfolio]
        );
      }

      return { previousPortfolios };
    },
    onError: (err, newPortfolio, context) => {
      // Rollback on error
      if (context?.previousPortfolios) {
        queryClient.setQueryData(queryKeys.portfolios(), context.previousPortfolios);
      }
      toast.error('Failed to create portfolio');
    },
    onSuccess: (data, variables) => {
      toast.success(`Portfolio "${variables.name}" created successfully`);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios() });
    },
  });

  /**
   * Mutation for updating a portfolio
   */
  const updatePortfolio = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Portfolio> }) => {
      return await portfolioService.update(id, data);
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolio(id) });

      // Snapshot the previous value
      const previousPortfolio = queryClient.getQueryData<Portfolio>(queryKeys.portfolio(id));

      // Optimistically update to the new value
      if (previousPortfolio) {
        queryClient.setQueryData<Portfolio>(
          queryKeys.portfolio(id),
          { ...previousPortfolio, ...data, updatedAt: new Date().toISOString() }
        );
      }

      return { previousPortfolio };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousPortfolio) {
        queryClient.setQueryData(queryKeys.portfolio(id), context.previousPortfolio);
      }
      toast.error('Failed to update portfolio');
    },
    onSuccess: (data, { id }) => {
      toast.success('Portfolio updated successfully');
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios() });
    },
  });

  /**
   * Mutation for deleting a portfolio
   */
  const deletePortfolio = useMutation({
    mutationFn: async (id: string) => {
      return await portfolioService.delete(id);
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolios() });

      // Snapshot the previous value
      const previousPortfolios = queryClient.getQueryData<Portfolio[]>(queryKeys.portfolios());

      // Optimistically update to the new value
      if (previousPortfolios) {
        queryClient.setQueryData<Portfolio[]>(
          queryKeys.portfolios(),
          previousPortfolios.filter(p => p.id !== id)
        );
      }

      return { previousPortfolios };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousPortfolios) {
        queryClient.setQueryData(queryKeys.portfolios(), context.previousPortfolios);
      }
      toast.error('Failed to delete portfolio');
    },
    onSuccess: (data, id) => {
      toast.success('Portfolio deleted successfully');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios() });
    },
  });

  /**
   * Mutation for adding a holding to a portfolio
   */
  const addHolding = useMutation({
    mutationFn: async ({ 
      portfolioId, 
      symbol, 
      quantity, 
      averagePrice 
    }: { 
      portfolioId: string; 
      symbol: string; 
      quantity: number; 
      averagePrice: number; 
    }) => {
      return await portfolioService.addHolding(portfolioId, {
        symbol,
        quantity,
        averagePrice,
      });
    },
    onMutate: async ({ portfolioId, symbol, quantity, averagePrice }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolioHoldings(portfolioId) });

      // Snapshot the previous value
      const previousHoldings = queryClient.getQueryData<PortfolioHolding[]>(
        queryKeys.portfolioHoldings(portfolioId)
      );

      // Optimistically update to the new value
      if (previousHoldings) {
        const optimisticHolding: PortfolioHolding = {
          id: `temp-${Date.now()}`,
          portfolioId,
          symbol,
          quantity,
          averagePrice,
          currentPrice: averagePrice, // We'll get real price from API
          totalValue: quantity * averagePrice,
          totalChange: 0,
          totalChangePercent: 0,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<PortfolioHolding[]>(
          queryKeys.portfolioHoldings(portfolioId),
          [...previousHoldings, optimisticHolding]
        );
      }

      return { previousHoldings };
    },
    onError: (err, { portfolioId }, context) => {
      // Rollback on error
      if (context?.previousHoldings) {
        queryClient.setQueryData(queryKeys.portfolioHoldings(portfolioId), context.previousHoldings);
      }
      toast.error('Failed to add holding');
    },
    onSuccess: (data, { portfolioId, symbol }) => {
      toast.success(`Added ${symbol} to portfolio`);
    },
    onSettled: (data, error, { portfolioId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioHoldings(portfolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(portfolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary(portfolioId) });
    },
  });

  /**
   * Mutation for removing a holding from a portfolio
   */
  const removeHolding = useMutation({
    mutationFn: async ({ portfolioId, holdingId }: { portfolioId: string; holdingId: string }) => {
      return await portfolioService.removeHolding(portfolioId, holdingId);
    },
    onMutate: async ({ portfolioId, holdingId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.portfolioHoldings(portfolioId) });

      // Snapshot the previous value
      const previousHoldings = queryClient.getQueryData<PortfolioHolding[]>(
        queryKeys.portfolioHoldings(portfolioId)
      );

      // Optimistically update to the new value
      if (previousHoldings) {
        queryClient.setQueryData<PortfolioHolding[]>(
          queryKeys.portfolioHoldings(portfolioId),
          previousHoldings.filter(h => h.id !== holdingId)
        );
      }

      return { previousHoldings };
    },
    onError: (err, { portfolioId }, context) => {
      // Rollback on error
      if (context?.previousHoldings) {
        queryClient.setQueryData(queryKeys.portfolioHoldings(portfolioId), context.previousHoldings);
      }
      toast.error('Failed to remove holding');
    },
    onSuccess: (data, { portfolioId }) => {
      toast.success('Holding removed successfully');
    },
    onSettled: (data, error, { portfolioId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioHoldings(portfolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(portfolioId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary(portfolioId) });
    },
  });

  return {
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    addHolding,
    removeHolding,
  };
}

// Utility functions for portfolio queries
export const portfolioQueryUtils = {
  /**
   * Prefetch portfolio data for better performance
   */
  prefetchPortfolio: (queryClient: any, id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.portfolio(id),
      queryFn: () => portfolioService.getById(id),
      ...queryConfigs.portfolio,
    });
  },

  /**
   * Invalidate all portfolio-related queries
   */
  invalidatePortfolioQueries: (queryClient: any, id: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.portfolio(id)
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.portfolios()
    });
  },

  /**
   * Get cached portfolio data if available
   */
  getCachedPortfolio: (queryClient: any, id: string): Portfolio | undefined => {
    return queryClient.getQueryData(queryKeys.portfolio(id));
  },

  /**
   * Set portfolio data in cache
   */
  setPortfolioData: (queryClient: any, id: string, data: Portfolio) => {
    queryClient.setQueryData(queryKeys.portfolio(id), data);
  },

  /**
   * Recalculate portfolio summary after holdings change
   */
  recalculatePortfolioSummary: async (queryClient: any, id: string) => {
    const holdings = queryClient.getQueryData<PortfolioHolding[]>(
      queryKeys.portfolioHoldings(id)
    );

    if (holdings) {
      const totalValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
      const totalChange = holdings.reduce((sum, holding) => sum + holding.totalChange, 0);
      const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

      queryClient.setQueryData(queryKeys.portfolioSummary(id), {
        totalValue,
        totalChange,
        totalChangePercent,
        // ... other summary calculations
      });
    }
  },
};