import { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import type { Stock } from '@shared/schema';

export interface RealTimeStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
  lastUpdate: number;
}

interface UseRealTimeStocksOptions {
  symbols: string[];
  updateInterval?: number;
  enabled?: boolean;
}

interface UseRealTimeStocksReturn {
  stocks: Record<string, RealTimeStock>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updatingStocks: Set<string>;
}

export function useRealTimeStocks({
  symbols,
  updateInterval = 4000,
  enabled = true
}: UseRealTimeStocksOptions): UseRealTimeStocksReturn {
  const [stocks, setStocks] = useState<Record<string, RealTimeStock>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStocks, setUpdatingStocks] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();
  const previousPricesRef = useRef<Record<string, number>>({});

  const fetchStockData = useCallback(async (symbolList: string[]): Promise<Record<string, RealTimeStock>> => {
    if (symbolList.length === 0) return {};

    try {
      const response = await apiRequest("GET", `/api/stocks/realtime/${symbolList.join(',')}`);
      const stocksData = await response.json();
      
      const realTimeStocks: Record<string, RealTimeStock> = {};
      
      for (const symbol of symbolList) {
        const stock = stocksData[symbol];
        if (stock) {
          realTimeStocks[symbol] = {
            symbol: stock.symbol || symbol,
            name: stock.name || `${symbol} Corp`,
            price: parseFloat(stock.currentPrice || stock.price || '0'),
            change: parseFloat(stock.change || '0'),
            changePercent: parseFloat(stock.changePercent || '0'),
            volume: parseInt(stock.volume || '0'),
            marketCap: stock.marketCap || 'N/A',
            lastUpdate: Date.now()
          };
        }
      }
      
      return realTimeStocks;
    } catch (error) {
      console.error('Failed to fetch real-time stock data:', error);
      throw error;
    }
  }, []);

  const refetch = useCallback(async () => {
    if (!enabled || symbols.length === 0) return;

    try {
      setError(null);
      const newStocks = await fetchStockData(symbols);
      
      // Detect price changes for animation
      const changedSymbols = new Set<string>();
      Object.entries(newStocks).forEach(([symbol, stock]) => {
        const previousPrice = previousPricesRef.current[symbol];
        if (previousPrice !== undefined && Math.abs(stock.price - previousPrice) > 0.01) {
          changedSymbols.add(symbol);
        }
        previousPricesRef.current[symbol] = stock.price;
      });
      
      if (changedSymbols.size > 0) {
        setUpdatingStocks(changedSymbols);
        setTimeout(() => setUpdatingStocks(new Set()), 600);
      }
      
      setStocks(newStocks);
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stock data';
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [enabled, symbols, fetchStockData]);

  // Initial fetch and periodic updates
  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    refetch();

    // Set up periodic updates
    if (updateInterval > 0) {
      intervalRef.current = setInterval(refetch, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbols.join(','), updateInterval, enabled, refetch]);

  return {
    stocks,
    isLoading,
    error,
    refetch,
    updatingStocks
  };
}

// Hook for a single stock
export function useRealTimeStock(symbol: string, updateInterval?: number, enabled?: boolean) {
  const { stocks, isLoading, error, refetch, updatingStocks } = useRealTimeStocks({
    symbols: symbol ? [symbol] : [],
    updateInterval,
    enabled
  });

  return {
    stock: symbol ? stocks[symbol] || null : null,
    isLoading,
    error,
    refetch,
    isUpdating: symbol ? updatingStocks.has(symbol) : false
  };
}