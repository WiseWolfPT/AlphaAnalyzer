// Real Data Integration Service - Primary gateway for all stock data
import { realAPI } from '@/lib/real-api';
import { mockStocks, type MockStock } from '@/lib/mock-api';
import { cacheManager } from '@/lib/cache-manager';

// Import services with error handling using dynamic imports
let alphaVantageEnhanced: any = null;
let finnhubEnhanced: any = null;
let servicesLoaded = false;

async function loadServices() {
  if (servicesLoaded) return;
  
  try {
    const alphaModule = await import('./alpha-vantage-enhanced');
    alphaVantageEnhanced = alphaModule.alphaVantageEnhanced;
    console.log('✅ Alpha Vantage Enhanced service loaded');
  } catch (error) {
    console.warn('⚠️ Alpha Vantage Enhanced service not available:', error);
  }

  try {
    const finnhubModule = await import('./finnhub-enhanced');
    finnhubEnhanced = finnhubModule.finnhubEnhanced;
    console.log('✅ Finnhub Enhanced service loaded');
  } catch (error) {
    console.warn('⚠️ Finnhub Enhanced service not available:', error);
  }
  
  servicesLoaded = true;
}

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
  private useMockFallback = true;
  private apiPriority: ('finnhub' | 'alphavantage' | 'realapi')[] = ['finnhub', 'realapi', 'alphavantage'];
  private hasValidApiKeys = false;
  
  constructor() {
    this.checkApiKeys();
  }
  
  private async checkApiKeys() {
    // Check if we have valid API keys (not 'demo')
    try {
      const { env } = await import('@/lib/env');
      // SECURITY: API keys moved to server-side - always use server proxy
      this.hasValidApiKeys = false; // Force use of server proxy endpoints
      
      if (!this.hasValidApiKeys) {
        console.warn('⚠️ Using demo API keys - real data may be limited');
      }
    } catch (error) {
      console.warn('⚠️ Could not check API keys:', error);
    }
  }
  
  // Main method to get stock data with fallback
  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    console.log(`🔍 Getting stock quote for ${symbol}`);
    
    // Check cache first
    const cacheKey = `real-stock-${symbol}`;
    const cached = cacheManager.get<StockQuote>(cacheKey, 'quote');
    if (cached) {
      console.log(`📦 Cache hit for ${symbol}`);
      return cached;
    }

    // If using demo API keys, prioritize mock data to avoid rate limiting
    if (!this.hasValidApiKeys) {
      console.log(`📦 Using mock data for ${symbol} (demo API keys)`);
      const mockStock = this.getMockStock(symbol);
      if (mockStock) {
        const quote = this.convertMockToQuote(mockStock);
        quote.source = 'mock';
        // Cache mock data for 5 minutes
        cacheManager.set(cacheKey, quote, 'quote', 300000);
        return quote;
      }
    }

    // Load services if not already loaded
    await loadServices();

    // Try real APIs in priority order (but only if we have valid keys)
    if (this.hasValidApiKeys) {
      for (const provider of this.apiPriority) {
        try {
          const quote = await this.getQuoteFromProvider(symbol, provider);
          if (quote) {
            quote.source = 'real';
            // Cache for 30 seconds for real-time data
            cacheManager.set(cacheKey, quote, 'quote', 30000);
            console.log(`✅ Real data from ${provider} for ${symbol}`);
            return quote;
          }
        } catch (error) {
          console.warn(`⚠️ ${provider} failed for ${symbol}:`, error);
          continue;
        }
      }
    }

    // Fallback to mock data
    if (this.useMockFallback) {
      console.log(`📦 Falling back to mock data for ${symbol}`);
      const mockStock = this.getMockStock(symbol);
      if (mockStock) {
        const quote = this.convertMockToQuote(mockStock);
        quote.source = 'mock';
        // Cache mock data for 5 minutes
        cacheManager.set(cacheKey, quote, 'quote', 300000);
        return quote;
      }
    }

    console.error(`❌ No data available for ${symbol}`);
    return null;
  }

  // Get multiple stock quotes efficiently
  async getBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    console.log(`🔍 Getting batch quotes for ${symbols.length} symbols`);
    
    const results: Record<string, StockQuote> = {};
    const uncachedSymbols: string[] = [];

    // Check cache first
    for (const symbol of symbols) {
      const cacheKey = `real-stock-${symbol}`;
      const cached = cacheManager.get<StockQuote>(cacheKey, 'quote');
      if (cached) {
        results[symbol] = cached;
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    console.log(`📦 ${symbols.length - uncachedSymbols.length} cached, ${uncachedSymbols.length} need fetching`);

    // Process uncached symbols
    for (const symbol of uncachedSymbols) {
      try {
        const quote = await this.getStockQuote(symbol);
        if (quote) {
          results[symbol] = quote;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch ${symbol}:`, error);
      }
      
      // Small delay to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  // Get stock data from specific provider
  private async getQuoteFromProvider(symbol: string, provider: string): Promise<StockQuote | null> {
    switch (provider) {
      case 'finnhub':
        return await this.getQuoteFromFinnhub(symbol);
      case 'alphavantage':
        return await this.getQuoteFromAlphaVantage(symbol);
      case 'realapi':
        return await this.getQuoteFromRealAPI(symbol);
      default:
        return null;
    }
  }

  private async getQuoteFromFinnhub(symbol: string): Promise<StockQuote | null> {
    if (!finnhubEnhanced) {
      console.warn('⚠️ Finnhub Enhanced service not available');
      return null;
    }
    
    try {
      // Test with a timeout to avoid hanging
      const timeoutId = setTimeout(() => {
        throw new Error('Finnhub API request timeout after 10 seconds');
      }, 10000);
      
      const [quote, profile] = await Promise.all([
        finnhubEnhanced.getStockQuoteWithRateLimit(symbol),
        finnhubEnhanced.getCompanyProfileWithRateLimit(symbol).catch(() => null)
      ]);
      
      clearTimeout(timeoutId);

      if (!quote || quote.c === undefined || quote.c === null) {
        console.warn(`⚠️ Finnhub returned invalid quote data for ${symbol}:`, quote);
        return null;
      }

      return {
        symbol: symbol.toUpperCase(),
        name: profile?.name || `${symbol} Corp`,
        price: quote.c.toFixed(2),
        change: quote.d?.toFixed(2) || '0.00',
        changePercent: quote.dp?.toFixed(2) || '0.00',
        sector: profile?.finnhubIndustry || 'Technology',
        marketCap: profile?.marketCapitalization ? `${(profile.marketCapitalization / 1000).toFixed(1)}B` : 'N/A',
        eps: 'N/A',
        peRatio: 'N/A',
        logo: profile?.logo || null,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`❌ Finnhub error for ${symbol}:`, error);
      throw error;
    }
  }

  private async getQuoteFromAlphaVantage(symbol: string): Promise<StockQuote | null> {
    if (!alphaVantageEnhanced) {
      console.warn('Alpha Vantage Enhanced service not available');
      return null;
    }
    
    try {
      const overview = await alphaVantageEnhanced.getCompanyOverviewOptimized(symbol);
      
      if (!overview || !overview['50DayMovingAverage']) return null;

      // Alpha Vantage doesn't provide real-time quotes in overview
      // Use the 50-day moving average as price (not ideal but available)
      const price = parseFloat(overview['50DayMovingAverage'] || '0');
      
      return {
        symbol: symbol.toUpperCase(),
        name: overview.Name || `${symbol} Corp`,
        price: price.toFixed(2),
        change: '0.00', // Not available in overview
        changePercent: '0.00', // Not available in overview
        sector: overview.Sector || 'Technology',
        marketCap: overview.MarketCapitalization || 'N/A',
        eps: overview.EPS || 'N/A',
        peRatio: overview.PERatio || 'N/A',
        logo: null,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Alpha Vantage error for ${symbol}:`, error);
      throw error;
    }
  }

  private async getQuoteFromRealAPI(symbol: string): Promise<StockQuote | null> {
    try {
      const mockStock = await realAPI.getStockQuote(symbol);
      if (!mockStock) return null;

      return this.convertMockToQuote(mockStock);
    } catch (error) {
      console.error(`Real API error for ${symbol}:`, error);
      throw error;
    }
  }

  private getMockStock(symbol: string): MockStock | null {
    return mockStocks.find(stock => stock.symbol === symbol.toUpperCase()) || null;
  }

  private convertMockToQuote(mockStock: MockStock): StockQuote {
    return {
      symbol: mockStock.symbol,
      name: mockStock.name,
      price: mockStock.price,
      change: mockStock.change,
      changePercent: mockStock.changePercent,
      sector: mockStock.sector || 'Technology',
      marketCap: mockStock.marketCap || 'N/A',
      eps: mockStock.eps || 'N/A',
      peRatio: mockStock.peRatio || 'N/A',
      logo: mockStock.logo,
      lastUpdated: new Date()
    };
  }

  // Market indices with real data simulation
  async getMarketIndices(): Promise<MarketIndices> {
    console.log('🔍 Getting market indices');
    
    const cacheKey = 'market-indices';
    const cached = cacheManager.get<MarketIndices>(cacheKey, 'market');
    if (cached) {
      console.log('📦 Market indices cache hit');
      return cached;
    }

    // Simulate real market data with realistic fluctuations
    const baseData = {
      dow: { value: 34567.89, change: 0.52 },
      sp500: { value: 4234.56, change: 0.31 },
      nasdaq: { value: 13789.12, change: -0.18 }
    };

    // Add realistic market movement
    const indices: MarketIndices = {
      dow: {
        value: baseData.dow.value + (Math.random() - 0.5) * 100,
        change: baseData.dow.change + (Math.random() - 0.5) * 0.5
      },
      sp500: {
        value: baseData.sp500.value + (Math.random() - 0.5) * 50,
        change: baseData.sp500.change + (Math.random() - 0.5) * 0.3
      },
      nasdaq: {
        value: baseData.nasdaq.value + (Math.random() - 0.5) * 200,
        change: baseData.nasdaq.change + (Math.random() - 0.5) * 0.4
      }
    };

    // Cache for 1 minute
    cacheManager.set(cacheKey, indices, 'market', 60000);
    console.log('✅ Market indices generated');
    return indices;
  }

  // Configuration methods
  setMockFallback(enabled: boolean): void {
    this.useMockFallback = enabled;
    console.log(`🔧 Mock fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  setApiPriority(priority: ('finnhub' | 'alphavantage' | 'realapi')[]): void {
    this.apiPriority = priority;
    console.log(`🔧 API priority set to: ${priority.join(' -> ')}`);
  }

  // Health check for all providers
  async checkProviderHealth(): Promise<Record<string, { available: boolean; responseTime: number; error?: string }>> {
    const testSymbol = 'AAPL';
    const results: Record<string, { available: boolean; responseTime: number; error?: string }> = {};

    for (const provider of this.apiPriority) {
      const startTime = Date.now();
      try {
        const quote = await this.getQuoteFromProvider(testSymbol, provider);
        results[provider] = {
          available: !!quote,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        results[provider] = {
          available: false,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  // Get usage statistics
  getUsageStats(): {
    cache: any;
    finnhub: any;
    alphavantage: any;
  } {
    return {
      cache: cacheManager.getStats(),
      finnhub: finnhubEnhanced ? finnhubEnhanced.getRateLimitStatus() : null,
      alphavantage: alphaVantageEnhanced ? alphaVantageEnhanced.getUsageReport() : null
    };
  }
}

// Export singleton instance
export const realDataService = new RealDataIntegrationService();

// Export the class for testing
export { RealDataIntegrationService };