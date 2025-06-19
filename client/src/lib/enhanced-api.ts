import { MarketDataOrchestrator } from '@/services/api/market-data-orchestrator';
import { stocksApi, watchlistsApi, intrinsicValueApi, earningsApi, recentSearchesApi, marketApi } from './api';
import type { Stock, IntrinsicValue } from '@shared/schema';

// Initialize the orchestrator
const orchestrator = new MarketDataOrchestrator();

// Enhanced Stock API with real data providers
export const enhancedStocksApi = {
  ...stocksApi,
  
  // Override getBySymbol to use real API data
  getBySymbol: async (symbol: string): Promise<Stock> => {
    try {
      // Try to get from our database first
      const dbStock = await stocksApi.getBySymbol(symbol).catch(() => null);
      
      // Get real-time data from APIs
      const realtimeData = await orchestrator.getRealTimeQuote(symbol);
      
      if (realtimeData) {
        // Merge database data with real-time data
        const mergedStock: Stock = {
          ...(dbStock || {}),
          ...realtimeData,
          symbol: symbol.toUpperCase(),
          lastUpdated: new Date().toISOString()
        } as Stock;
        
        // Update database with latest data
        if (dbStock) {
          await stocksApi.create(mergedStock).catch(console.error);
        }
        
        return mergedStock;
      }
      
      // Fallback to database data if APIs fail
      if (dbStock) return dbStock;
      
      throw new Error(`Stock ${symbol} not found`);
    } catch (error) {
      console.error('Enhanced getBySymbol error:', error);
      // Fallback to original API
      return stocksApi.getBySymbol(symbol);
    }
  },
  
  // Get multiple stocks with real-time data
  getBatch: async (symbols: string[]): Promise<Stock[]> => {
    const quotes = await orchestrator.getBatchQuotes(symbols);
    return Object.values(quotes);
  },
  
  // Get historical data
  getHistoricalData: async (
    symbol: string, 
    interval: '1min' | '5min' | '15min' | '30min' | '1h' | '1day' = '1day',
    outputsize: number = 30
  ) => {
    return orchestrator.getHistoricalData(symbol, interval, outputsize);
  },
  
  // Search with real API data
  search: async (query: string, limit?: number): Promise<Stock[]> => {
    try {
      // First try database search
      const dbResults = await stocksApi.search(query, limit);
      
      if (dbResults.length > 0) {
        // Enhance with real-time prices
        const symbols = dbResults.map(s => s.symbol);
        const realtimeQuotes = await orchestrator.getBatchQuotes(symbols);
        
        return dbResults.map(stock => ({
          ...stock,
          ...(realtimeQuotes[stock.symbol] || {}),
          lastUpdated: new Date().toISOString()
        }));
      }
      
      return dbResults;
    } catch (error) {
      console.error('Enhanced search error:', error);
      return stocksApi.search(query, limit);
    }
  }
};

// Enhanced Intrinsic Value API with real fundamentals
export const enhancedIntrinsicValueApi = {
  ...intrinsicValueApi,
  
  // Calculate with real fundamentals data
  calculateWithRealData: async (symbol: string): Promise<IntrinsicValue | null> => {
    try {
      // Get fundamentals from FMP
      const fundamentals = await orchestrator.getFundamentals(symbol);
      if (!fundamentals || !fundamentals.eps) {
        throw new Error('Insufficient fundamentals data');
      }
      
      // Get current price
      const quote = await orchestrator.getRealTimeQuote(symbol);
      const currentPrice = quote?.currentPrice || fundamentals.currentPrice || 0;
      
      // Calculate intrinsic value using the existing API
      const calculationParams = {
        stockSymbol: symbol,
        eps: fundamentals.eps || 0,
        growthRate: fundamentals.growthRate || 10,
        peMultiple: fundamentals.peMultiple || 15,
        requiredReturn: fundamentals.requiredReturn || 10,
        marginOfSafety: fundamentals.marginOfSafety || 25,
        horizon: 5
      };
      
      const result = await intrinsicValueApi.calculate(calculationParams);
      
      // Enhance with additional data
      const enhanced: IntrinsicValue = {
        ...result,
        ...fundamentals,
        currentPrice,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to database
      await intrinsicValueApi.create(enhanced).catch(console.error);
      
      return enhanced;
    } catch (error) {
      console.error('Enhanced calculateWithRealData error:', error);
      return null;
    }
  },
  
  // Get by symbol with fresh fundamentals
  getBySymbol: async (symbol: string): Promise<IntrinsicValue> => {
    try {
      // Check cache/database first
      const cached = await intrinsicValueApi.getBySymbol(symbol).catch(() => null);
      
      // If data is older than 24 hours, refresh
      if (cached && cached.lastUpdated) {
        const lastUpdate = new Date(cached.lastUpdated);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          return cached;
        }
      }
      
      // Get fresh data
      const fresh = await enhancedIntrinsicValueApi.calculateWithRealData(symbol);
      return fresh || cached || { stockSymbol: symbol } as IntrinsicValue;
    } catch (error) {
      console.error('Enhanced getBySymbol error:', error);
      return intrinsicValueApi.getBySymbol(symbol);
    }
  }
};

// Enhanced Market API with real indices
export const enhancedMarketApi = {
  ...marketApi,
  
  getIndices: async () => {
    try {
      // Get real-time market indices
      const [spy, dia, qqq] = await Promise.all([
        orchestrator.getRealTimeQuote('SPY'), // S&P 500 ETF
        orchestrator.getRealTimeQuote('DIA'), // Dow Jones ETF
        orchestrator.getRealTimeQuote('QQQ')  // Nasdaq ETF
      ]);
      
      return {
        sp500: {
          value: spy?.currentPrice || 0,
          change: spy?.changePercent || 0
        },
        dow: {
          value: dia?.currentPrice || 0,
          change: dia?.changePercent || 0
        },
        nasdaq: {
          value: qqq?.currentPrice || 0,
          change: qqq?.changePercent || 0
        }
      };
    } catch (error) {
      console.error('Enhanced getIndices error:', error);
      return marketApi.getIndices();
    }
  }
};

// Real-time WebSocket connection management
export const realTimeApi = {
  connect: (symbols: string[], onUpdate: (symbol: string, price: number) => void) => {
    orchestrator.connectRealTimeUpdates(symbols, onUpdate);
  },
  
  disconnect: () => {
    orchestrator.disconnectRealTimeUpdates();
  },
  
  subscribe: (symbols: string[]) => {
    // This will be handled by the orchestrator
  },
  
  unsubscribe: (symbols: string[]) => {
    // This will be handled by the orchestrator
  }
};

// API Quota monitoring
export const quotaApi = {
  getStatus: () => {
    return orchestrator.getQuotaStatus();
  }
};

// Cache warming for popular stocks
export const cacheApi = {
  warmPopularStocks: async () => {
    const popularSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'META', 'NVDA', 'JPM', 'V', 'JNJ',
      'WMT', 'PG', 'UNH', 'DIS', 'MA',
      'HD', 'PYPL', 'BAC', 'NFLX', 'ADBE'
    ];
    
    await orchestrator.warmCache(popularSymbols);
  }
};

// Export the enhanced APIs as default while keeping originals available
export default {
  stocks: enhancedStocksApi,
  watchlists: watchlistsApi,
  intrinsicValue: enhancedIntrinsicValueApi,
  earnings: earningsApi,
  recentSearches: recentSearchesApi,
  market: enhancedMarketApi,
  realTime: realTimeApi,
  quota: quotaApi,
  cache: cacheApi
};