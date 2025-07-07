/**
 * Real-time Dashboard Data Hook
 * Provides real-time updates for dashboard components
 */

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMarketQuotes, useMarketOverview } from './use-market-data';

interface DashboardRealTimeData {
  marketOverview: any;
  topGainers: any[];
  topLosers: any[];
  lastUpdated: Date;
  isLive: boolean;
}

export function useRealTimeDashboard() {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Popular stocks for tracking
  const trackedSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 
    'JPM', 'V', 'UNH', 'JNJ', 'WMT', 'PG', 'MA', 'DIS'
  ];

  // Get market data
  const { data: marketOverview, refetch: refetchOverview } = useMarketOverview();
  const { data: stocksData, refetch: refetchStocks } = useMarketQuotes(trackedSymbols);

  // Real-time update interval
  useEffect(() => {
    setIsLive(true);
    
    // Update every 30 seconds during market hours (9:30 AM - 4:00 PM ET)
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const day = now.getDay();
      
      // Check if it's during market hours (simplified - doesn't account for holidays)
      const isMarketHours = day >= 1 && day <= 5 && hours >= 9 && hours <= 16;
      
      if (isMarketHours) {
        // Refresh data more frequently during market hours
        refetchOverview();
        refetchStocks();
        setLastUpdated(new Date());
        console.log('📊 Dashboard real-time refresh');
      } else {
        // Less frequent updates after hours
        if (now.getMinutes() % 5 === 0) {
          refetchOverview();
          refetchStocks();
          setLastUpdated(new Date());
          console.log('📊 Dashboard after-hours refresh');
        }
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(interval);
      setIsLive(false);
    };
  }, [refetchOverview, refetchStocks]);

  // Helper function to get company names
  const getCompanyName = (symbol: string): string => {
    const companyNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corp',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms',
      'NVDA': 'NVIDIA Corp',
      'JPM': 'JPMorgan Chase',
      'V': 'Visa Inc.',
      'UNH': 'UnitedHealth Group',
      'JNJ': 'Johnson & Johnson',
      'WMT': 'Walmart Inc.',
      'PG': 'Procter & Gamble',
      'MA': 'Mastercard',
      'DIS': 'Walt Disney Co.'
    };
    return companyNames[symbol] || symbol;
  };

  // Process stock data for gainers/losers
  const processedData = {
    topGainers: stocksData?.quotes
      ?.map(quote => ({
        symbol: quote.symbol,
        name: getCompanyName(quote.symbol),
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent
      }))
      ?.filter(stock => stock.changePercent > 0)
      ?.sort((a, b) => b.changePercent - a.changePercent)
      ?.slice(0, 5) || [],
    
    topLosers: stocksData?.quotes
      ?.map(quote => ({
        symbol: quote.symbol,
        name: getCompanyName(quote.symbol),
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent
      }))
      ?.filter(stock => stock.changePercent < 0)
      ?.sort((a, b) => a.changePercent - b.changePercent)
      ?.slice(0, 5) || []
  };

  // Manual refresh function
  const refreshAll = async () => {
    try {
      await Promise.all([
        refetchOverview(),
        refetchStocks()
      ]);
      setLastUpdated(new Date());
      
      // Invalidate related queries to trigger component updates
      queryClient.invalidateQueries({ queryKey: ['market-overview'] });
      queryClient.invalidateQueries({ queryKey: ['market-quotes'] });
      
      return true;
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      return false;
    }
  };

  return {
    marketOverview,
    topGainers: processedData.topGainers,
    topLosers: processedData.topLosers,
    lastUpdated,
    isLive,
    refreshAll,
    hasData: Boolean(marketOverview || stocksData?.quotes?.length),
  };
}