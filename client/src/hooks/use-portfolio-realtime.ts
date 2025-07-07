// Wave 4: Real-time Portfolio P&L Hook
// For Portuguese investors tracking USA/EU market investments
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, portfolioRealtimeManager, convertCurrency, handleSupabaseError } from '@/lib/supabase';
import { finnhubService } from '@/services/finnhub';

// Portfolio types for real-time P&L tracking
export interface PortfolioHolding {
  id: string;
  portfolio_id: string;
  stock_symbol: string;
  quantity: number;
  average_cost: number;
  original_currency: string;
  purchase_date: string;
  notes?: string;
  // Real-time calculated fields
  current_price?: number;
  market_value?: number;
  unrealized_gain_loss?: number;
  unrealized_gain_loss_percent?: number;
  day_change?: number;
  day_change_percent?: number;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  base_currency: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  // Real-time calculated fields
  total_value?: number;
  total_cost?: number;
  total_gain_loss?: number;
  total_gain_loss_percent?: number;
  day_change?: number;
  day_change_percent?: number;
}

export interface PortfolioPerformance {
  portfolio: Portfolio;
  holdings: PortfolioHolding[];
  performance_summary: {
    total_invested: number;
    current_value: number;
    unrealized_pnl: number;
    unrealized_pnl_percent: number;
    day_change: number;
    day_change_percent: number;
    best_performer: PortfolioHolding | null;
    worst_performer: PortfolioHolding | null;
    currency: string;
  };
}

// Hook for real-time portfolio P&L tracking
export const usePortfolioRealtime = (portfolioId: string | null, enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const subscriptionRef = useRef<any>(null);
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch portfolio data with real-time P&L calculations
  const { data: portfolioData, isLoading, error, refetch } = useQuery<PortfolioPerformance>({
    queryKey: ['portfolio-realtime', portfolioId],
    queryFn: async () => {
      if (!portfolioId) throw new Error('Portfolio ID is required');
      
      try {
        // Fetch portfolio details
        const { data: portfolio, error: portfolioError } = await supabase
          .from('portfolios')
          .select('*')
          .eq('id', portfolioId)
          .single();

        if (portfolioError) throw portfolioError;
        if (!portfolio) throw new Error('Portfolio not found');

        // Fetch portfolio holdings
        const { data: holdings, error: holdingsError } = await supabase
          .from('portfolio_holdings')
          .select(`
            *,
            stocks!portfolio_holdings_stock_symbol_fkey (
              name,
              currency,
              exchange
            )
          `)
          .eq('portfolio_id', portfolioId);

        if (holdingsError) throw holdingsError;

        // Calculate real-time P&L for each holding
        const holdingsWithPrices = await Promise.all(
          (holdings || []).map(async (holding) => {
            try {
              // Get current price from Finnhub proxy
              const quote = await finnhubService.getQuote(holding.stock_symbol);
              const currentPrice = quote.c || 0; // Current price
              const dayChange = quote.d || 0; // Day change
              const dayChangePercent = quote.dp || 0; // Day change percent

              // Convert currency if needed
              const holdingCurrency = holding.original_currency;
              const portfolioCurrency = portfolio.base_currency;
              
              const convertedCurrentPrice = await convertCurrency(
                currentPrice, 
                'USD', // Finnhub returns USD prices
                portfolioCurrency
              );
              
              const convertedAverageCost = await convertCurrency(
                holding.average_cost,
                holdingCurrency,
                portfolioCurrency
              );

              // Calculate P&L metrics
              const marketValue = convertedCurrentPrice * holding.quantity;
              const totalCost = convertedAverageCost * holding.quantity;
              const unrealizedGainLoss = marketValue - totalCost;
              const unrealizedGainLossPercent = totalCost > 0 ? (unrealizedGainLoss / totalCost) * 100 : 0;

              return {
                ...holding,
                current_price: convertedCurrentPrice,
                market_value: marketValue,
                unrealized_gain_loss: unrealizedGainLoss,
                unrealized_gain_loss_percent: unrealizedGainLossPercent,
                day_change: dayChange,
                day_change_percent: dayChangePercent,
              } as PortfolioHolding;
            } catch (error) {
              console.warn(`Failed to get price for ${holding.stock_symbol}:`, error);
              return {
                ...holding,
                current_price: 0,
                market_value: 0,
                unrealized_gain_loss: 0,
                unrealized_gain_loss_percent: 0,
                day_change: 0,
                day_change_percent: 0,
              } as PortfolioHolding;
            }
          })
        );

        // Calculate portfolio performance summary
        const totalInvested = holdingsWithPrices.reduce((sum, holding) => {
          return sum + (holding.average_cost * holding.quantity);
        }, 0);

        const currentValue = holdingsWithPrices.reduce((sum, holding) => {
          return sum + (holding.market_value || 0);
        }, 0);

        const unrealizedPnl = currentValue - totalInvested;
        const unrealizedPnlPercent = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;

        const dayChange = holdingsWithPrices.reduce((sum, holding) => {
          return sum + ((holding.day_change || 0) * holding.quantity);
        }, 0);

        const dayChangePercent = currentValue > 0 ? (dayChange / (currentValue - dayChange)) * 100 : 0;

        // Find best and worst performers
        const sortedByPerformance = holdingsWithPrices.sort((a, b) => 
          (b.unrealized_gain_loss_percent || 0) - (a.unrealized_gain_loss_percent || 0)
        );

        return {
          portfolio: {
            ...portfolio,
            total_value: currentValue,
            total_cost: totalInvested,
            total_gain_loss: unrealizedPnl,
            total_gain_loss_percent: unrealizedPnlPercent,
            day_change: dayChange,
            day_change_percent: dayChangePercent,
          },
          holdings: holdingsWithPrices,
          performance_summary: {
            total_invested: totalInvested,
            current_value: currentValue,
            unrealized_pnl: unrealizedPnl,
            unrealized_pnl_percent: unrealizedPnlPercent,
            day_change: dayChange,
            day_change_percent: dayChangePercent,
            best_performer: sortedByPerformance[0] || null,
            worst_performer: sortedByPerformance[sortedByPerformance.length - 1] || null,
            currency: portfolio.base_currency,
          },
        };
      } catch (error: any) {
        handleSupabaseError(error, 'fetch portfolio');
        throw error;
      }
    },
    enabled: enabled && !!portfolioId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!portfolioId || !enabled) return;

    const handleRealtimeUpdate = (payload: any) => {
      console.log('Portfolio real-time update:', payload);
      setLastUpdate(new Date());
      
      // Invalidate and refetch the portfolio data
      queryClient.invalidateQueries({ queryKey: ['portfolio-realtime', portfolioId] });
    };

    // Subscribe to portfolio changes
    subscriptionRef.current = portfolioRealtimeManager.subscribeToPortfolioUpdates(
      portfolioId,
      handleRealtimeUpdate
    );

    setIsConnected(true);

    return () => {
      if (subscriptionRef.current) {
        portfolioRealtimeManager.unsubscribeFromPortfolio(portfolioId);
        setIsConnected(false);
      }
    };
  }, [portfolioId, enabled, queryClient]);

  // Set up periodic price updates for real-time feel
  useEffect(() => {
    if (!enabled || !portfolioData?.holdings?.length) return;

    // Update prices every 30 seconds during market hours
    priceUpdateIntervalRef.current = setInterval(() => {
      const now = new Date();
      const hour = now.getUTCHours();
      
      // Only update during extended market hours (approximately 9 AM - 8 PM EST = 14-01 UTC)
      if ((hour >= 14 && hour <= 23) || (hour >= 0 && hour <= 1)) {
        refetch();
      }
    }, 30000);

    return () => {
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current);
      }
    };
  }, [enabled, portfolioData?.holdings?.length, refetch]);

  // Manually refresh portfolio data
  const refreshPortfolio = useCallback(() => {
    refetch();
    setLastUpdate(new Date());
  }, [refetch]);

  // Add new holding to portfolio
  const addHolding = useCallback(async (holdingData: Omit<PortfolioHolding, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .insert([holdingData])
        .select()
        .single();

      if (error) throw error;

      // Refresh portfolio data
      refreshPortfolio();
      
      return data;
    } catch (error: any) {
      handleSupabaseError(error, 'add holding');
      throw error;
    }
  }, [refreshPortfolio]);

  // Remove holding from portfolio
  const removeHolding = useCallback(async (holdingId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('id', holdingId);

      if (error) throw error;

      // Refresh portfolio data
      refreshPortfolio();
    } catch (error: any) {
      handleSupabaseError(error, 'remove holding');
      throw error;
    }
  }, [refreshPortfolio]);

  // Update holding quantity or average cost
  const updateHolding = useCallback(async (holdingId: string, updates: Partial<PortfolioHolding>) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .update(updates)
        .eq('id', holdingId)
        .select()
        .single();

      if (error) throw error;

      // Refresh portfolio data
      refreshPortfolio();
      
      return data;
    } catch (error: any) {
      handleSupabaseError(error, 'update holding');
      throw error;
    }
  }, [refreshPortfolio]);

  return {
    // Data
    portfolioData,
    isLoading,
    error,
    
    // Real-time connection status
    isConnected,
    lastUpdate,
    
    // Actions
    refreshPortfolio,
    addHolding,
    removeHolding,
    updateHolding,
    
    // Utilities
    isMarketOpen: () => {
      const now = new Date();
      const hour = now.getUTCHours();
      return (hour >= 14 && hour <= 21); // Approximate US market hours in UTC
    },
  };
};