// Real Data Integration Service - Primary gateway for all stock data
import { marketDataClient } from './market-data-client';
import { cacheManager } from '@/lib/cache-manager';
import { apiConfig, enhancedFetch } from '@/lib/api-config';

export interface StockQuote {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  sector: string;
  marketCap: string;
  eps: string;
  peRatio: string;
  logo?: string | null;
  lastUpdated: Date;
  source?: 'real' | 'mock';
}

export interface MarketIndices {
  dow: { value: number; change: number };
  sp500: { value: number; change: number };
  nasdaq: { value: number; change: number };
}

class RealDataIntegrationService {
  constructor() {
    // Service is initialized and ready to use backend
    console.log('🚀 Real Data Integration Service initialized');
  }
  
  // Main method to get stock data from backend
  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    console.log(`🔍 Getting stock quote for ${symbol}`);
    
    // Check cache first
    const cacheKey = `real-stock-${symbol}`;
    const cached = cacheManager.get<StockQuote>(cacheKey, 'quote');
    if (cached) {
      console.log(`📦 Cache hit for ${symbol}`);
      return cached;
    }

    try {
      // Use market data client to get quote from backend
      const quote = await marketDataClient.getQuote(symbol);
      
      if (quote) {
        const stockQuote: StockQuote = {
          symbol: quote.symbol,
          name: `${quote.symbol} Corp`, // Backend might not provide name
          price: quote.price.toFixed(2),
          change: quote.change.toFixed(2),
          changePercent: quote.changePercent.toFixed(2),
          sector: 'Technology', // Default for now
          marketCap: quote.marketCap ? `${(quote.marketCap / 1e9).toFixed(1)}B` : 'N/A',
          eps: quote.eps?.toFixed(2) || 'N/A',
          peRatio: quote.pe?.toFixed(2) || 'N/A',
          logo: null,
          lastUpdated: new Date(),
          source: 'real'
        };
        
        // Cache for 60 seconds
        cacheManager.set(cacheKey, stockQuote, 'quote', 60000);
        console.log(`✅ Backend data for ${symbol}`);
        return stockQuote;
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${symbol}:`, error);
    }

    return null;
  }

  // Get multiple stock quotes efficiently
  async getBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    console.log(`🔍 Getting batch quotes for ${symbols.length} symbols`);
    
    const results: Record<string, StockQuote> = {};

    try {
      // Use market data client batch endpoint
      const response = await marketDataClient.getBatchQuotes(symbols);
      
      if (response.quotes && response.quotes.length > 0) {
        // Convert batch response to our format
        for (const quote of response.quotes) {
          const stockQuote: StockQuote = {
            symbol: quote.symbol,
            name: `${quote.symbol} Corp`,
            price: quote.price.toFixed(2),
            change: quote.change.toFixed(2),
            changePercent: quote.changePercent.toFixed(2),
            sector: 'Technology',
            marketCap: quote.marketCap ? `${(quote.marketCap / 1e9).toFixed(1)}B` : 'N/A',
            eps: quote.eps?.toFixed(2) || 'N/A',
            peRatio: quote.pe?.toFixed(2) || 'N/A',
            logo: null,
            lastUpdated: new Date(),
            source: 'real'
          };
          
          results[quote.symbol] = stockQuote;
          
          // Cache each quote
          const cacheKey = `real-stock-${quote.symbol}`;
          cacheManager.set(cacheKey, stockQuote, 'quote', 60000);
        }
        
        console.log(`✅ Fetched ${response.quotes.length} quotes from backend`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch batch quotes:', error);
    }

    return results;
  }


  // Market indices from backend
  async getMarketIndices(): Promise<MarketIndices> {
    console.log('🔍 Getting market indices');
    
    const cacheKey = 'market-indices';
    const cached = cacheManager.get<MarketIndices>(cacheKey, 'market');
    if (cached) {
      console.log('📦 Market indices cache hit');
      return cached;
    }

    try {
      const overview = await marketDataClient.getMarketOverview();
      
      if (overview) {
        const indices: MarketIndices = {
          dow: overview.dow,
          sp500: overview.sp500,
          nasdaq: overview.nasdaq
        };
        
        // Cache for 1 minute
        cacheManager.set(cacheKey, indices, 'market', 60000);
        console.log('✅ Market indices from backend');
        return indices;
      }
    } catch (error) {
      console.error('❌ Failed to fetch market indices:', error);
    }

    // Return default values if backend fails
    return {
      dow: { value: 0, change: 0 },
      sp500: { value: 0, change: 0 },
      nasdaq: { value: 0, change: 0 }
    };
  }

  // Get usage statistics
  getUsageStats(): {
    cache: any;
  } {
    return {
      cache: cacheManager.getStats()
    };
  }
}

// Export singleton instance
export const realDataService = new RealDataIntegrationService();

// Export the class for testing
export { RealDataIntegrationService };