/**
 * Portfolio Context - Wave 3 Implementation
 * 
 * Real-time portfolio tracking with multi-currency USD/EUR support
 * International markets focus with live P&L calculations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from './currency-context';
import { useRealTimeStocks } from '@/hooks/use-enhanced-stocks';

export interface PortfolioHolding {
  id: string;
  symbol: string;
  companyName: string;
  quantity: number;
  averageCost: number;
  originalCurrency: 'USD' | 'EUR';
  purchaseDate: string;
  currentPrice?: number;
  marketValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
  sector?: string;
  exchange?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  currency: 'USD' | 'EUR';
  lastUpdated: string;
}

export interface PortfolioPerformance {
  date: string;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface PortfolioContextType {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
  performance: PortfolioPerformance[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addHolding: (holding: Omit<PortfolioHolding, 'id'>) => Promise<void>;
  updateHolding: (id: string, updates: Partial<PortfolioHolding>) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  refreshPortfolio: () => Promise<void>;
  
  // Real-time features
  isRealTimeEnabled: boolean;
  toggleRealTime: () => void;
  lastPriceUpdate: string | null;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

// US and European international stocks
const INTERNATIONAL_STOCKS = {
  US: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ'],
  EU: ['SAP', 'ASML', 'LVMH', 'NVO', 'TM', 'SHEL', 'UNA', 'OR', 'MC', 'EL']
};

interface PortfolioProviderProps {
  children: React.ReactNode;
}

export function PortfolioProvider({ children }: PortfolioProviderProps) {
  const queryClient = useQueryClient();
  const { currentCurrency, convertCurrency, formatCurrency } = useCurrency();
  
  // State
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalValue: 0,
    totalCost: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    currency: currentCurrency,
    lastUpdated: new Date().toISOString()
  });
  const [performance, setPerformance] = useState<PortfolioPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<string | null>(null);

  // Real-time price updates for all portfolio symbols
  const portfolioSymbols = holdings.map(h => h.symbol);
  const realTimeCleanup = useRealTimeStocks(portfolioSymbols, isRealTimeEnabled);

  // Load portfolio from localStorage on mount
  useEffect(() => {
    loadPortfolio();
  }, []);

  // Update portfolio when currency changes
  useEffect(() => {
    if (holdings.length > 0) {
      calculatePortfolioSummary();
    }
  }, [currentCurrency, holdings]);

  // Listen for real-time price updates
  useEffect(() => {
    const handlePriceUpdate = (event: CustomEvent) => {
      const { symbol, price } = event.detail;
      updateHoldingPrice(symbol, price);
      setLastPriceUpdate(new Date().toISOString());
    };

    window.addEventListener('stock-price-update', handlePriceUpdate as EventListener);
    return () => {
      window.removeEventListener('stock-price-update', handlePriceUpdate as EventListener);
    };
  }, []);

  const loadPortfolio = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load from localStorage first
      const savedPortfolio = localStorage.getItem('alfalyzer-portfolio');
      if (savedPortfolio) {
        const portfolio = JSON.parse(savedPortfolio);
        setHoldings(portfolio.holdings || []);
        
        // If no holdings, create sample international portfolio
        if (!portfolio.holdings || portfolio.holdings.length === 0) {
          await createSamplePortfolio();
        }
      } else {
        await createSamplePortfolio();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSamplePortfolio = async () => {
    // Create sample international portfolio with USD and EUR stocks
    const sampleHoldings: PortfolioHolding[] = [
      {
        id: '1',
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        quantity: 10,
        averageCost: 150.00,
        originalCurrency: 'USD',
        purchaseDate: '2024-06-15',
        sector: 'Technology',
        exchange: 'NASDAQ'
      },
      {
        id: '2',
        symbol: 'MSFT',
        companyName: 'Microsoft Corporation',
        quantity: 8,
        averageCost: 380.00,
        originalCurrency: 'USD',
        purchaseDate: '2024-07-20',
        sector: 'Technology',
        exchange: 'NASDAQ'
      },
      {
        id: '3',
        symbol: 'GOOGL',
        companyName: 'Alphabet Inc.',
        quantity: 5,
        averageCost: 140.00,
        originalCurrency: 'USD',
        purchaseDate: '2024-08-10',
        sector: 'Technology',
        exchange: 'NASDAQ'
      },
      {
        id: '4',
        symbol: 'SAP',
        companyName: 'SAP SE',
        quantity: 15,
        averageCost: 125.50,
        originalCurrency: 'EUR',
        purchaseDate: '2024-09-05',
        sector: 'Technology',
        exchange: 'XETRA'
      },
      {
        id: '5',
        symbol: 'ASML',
        companyName: 'ASML Holding N.V.',
        quantity: 3,
        averageCost: 680.00,
        originalCurrency: 'EUR',
        purchaseDate: '2024-10-12',
        sector: 'Technology',
        exchange: 'Euronext'
      }
    ];

    setHoldings(sampleHoldings);
    await savePortfolio(sampleHoldings);
  };

  const savePortfolio = async (holdingsToSave: PortfolioHolding[]) => {
    try {
      const portfolio = {
        holdings: holdingsToSave,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem('alfalyzer-portfolio', JSON.stringify(portfolio));
    } catch (err) {
      console.error('Failed to save portfolio:', err);
    }
  };

  const addHolding = async (newHolding: Omit<PortfolioHolding, 'id'>) => {
    try {
      const holding: PortfolioHolding = {
        ...newHolding,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      };

      const updatedHoldings = [...holdings, holding];
      setHoldings(updatedHoldings);
      await savePortfolio(updatedHoldings);
      
      // Trigger price update for new holding
      await refreshHoldingPrice(holding.symbol);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holding');
    }
  };

  const updateHolding = async (id: string, updates: Partial<PortfolioHolding>) => {
    try {
      const updatedHoldings = holdings.map(holding =>
        holding.id === id ? { ...holding, ...updates } : holding
      );
      setHoldings(updatedHoldings);
      await savePortfolio(updatedHoldings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update holding');
    }
  };

  const removeHolding = async (id: string) => {
    try {
      const updatedHoldings = holdings.filter(holding => holding.id !== id);
      setHoldings(updatedHoldings);
      await savePortfolio(updatedHoldings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove holding');
    }
  };

  const updateHoldingPrice = (symbol: string, newPrice: number) => {
    setHoldings(prev => prev.map(holding => {
      if (holding.symbol === symbol) {
        // Convert price to display currency if needed
        const priceInDisplayCurrency = convertCurrency(newPrice, holding.originalCurrency, currentCurrency);
        const costInDisplayCurrency = convertCurrency(holding.averageCost, holding.originalCurrency, currentCurrency);
        
        const marketValue = priceInDisplayCurrency * holding.quantity;
        const totalCost = costInDisplayCurrency * holding.quantity;
        const gainLoss = marketValue - totalCost;
        const gainLossPercent = (gainLoss / totalCost) * 100;

        return {
          ...holding,
          currentPrice: priceInDisplayCurrency,
          marketValue,
          gainLoss,
          gainLossPercent
        };
      }
      return holding;
    }));
  };

  const refreshHoldingPrice = async (symbol: string) => {
    try {
      // Trigger cache invalidation and refetch
      queryClient.invalidateQueries({ queryKey: ['stock', symbol] });
      
      // Get fresh price data
      const stockData = queryClient.getQueryData(['stock', symbol]) as any;
      if (stockData?.currentPrice) {
        updateHoldingPrice(symbol, stockData.currentPrice);
      }
    } catch (err) {
      console.error(`Failed to refresh price for ${symbol}:`, err);
    }
  };

  const refreshPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Refresh all holdings prices
      await Promise.all(
        holdings.map(holding => refreshHoldingPrice(holding.symbol))
      );

      setLastPriceUpdate(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePortfolioSummary = useCallback(() => {
    if (holdings.length === 0) {
      setSummary({
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        currency: currentCurrency,
        lastUpdated: new Date().toISOString()
      });
      return;
    }

    let totalValue = 0;
    let totalCost = 0;
    let dayChange = 0;

    holdings.forEach(holding => {
      if (holding.currentPrice && holding.marketValue) {
        totalValue += holding.marketValue;
        const costInDisplayCurrency = convertCurrency(
          holding.averageCost * holding.quantity,
          holding.originalCurrency,
          currentCurrency
        );
        totalCost += costInDisplayCurrency;
        
        // Simulate day change (would come from real API)
        const dailyChange = holding.marketValue * (Math.random() * 0.04 - 0.02); // ±2%
        dayChange += dailyChange;
      }
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

    setSummary({
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent,
      currency: currentCurrency,
      lastUpdated: new Date().toISOString()
    });
  }, [holdings, currentCurrency, convertCurrency]);

  const toggleRealTime = () => {
    setIsRealTimeEnabled(prev => !prev);
    localStorage.setItem('alfalyzer-realtime-enabled', (!isRealTimeEnabled).toString());
  };

  // Calculate portfolio summary when holdings change
  useEffect(() => {
    calculatePortfolioSummary();
  }, [calculatePortfolioSummary]);

  // Generate performance history (mock data for now)
  useEffect(() => {
    const generatePerformanceHistory = () => {
      const history: PortfolioPerformance[] = [];
      const days = 30;
      const baseValue = summary.totalValue || 10000;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const variance = (Math.random() - 0.5) * 0.1; // ±5% daily variance
        const value = baseValue * (1 + variance * (i / days));
        const gainLoss = value - baseValue;
        const gainLossPercent = (gainLoss / baseValue) * 100;
        
        history.push({
          date: date.toISOString().split('T')[0],
          value,
          gainLoss,
          gainLossPercent
        });
      }
      
      setPerformance(history);
    };

    if (summary.totalValue > 0) {
      generatePerformanceHistory();
    }
  }, [summary.totalValue]);

  const value: PortfolioContextType = {
    holdings,
    summary,
    performance,
    isLoading,
    error,
    addHolding,
    updateHolding,
    removeHolding,
    refreshPortfolio,
    isRealTimeEnabled,
    toggleRealTime,
    lastPriceUpdate
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}