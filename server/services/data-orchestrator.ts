// import { FinnhubService, finnhubService } from './finnhub-service'; // Removed - keeping only FMP + Alpha Vantage
// import { PolygonService } from './polygon-service'; // Removed - keeping only FMP + Alpha Vantage
import { ServerMarketDataService } from './market-data-service';
import { multiLayerCache, MultiLayerCache } from '../cache/multi-layer-cache.js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase-client';

const supabase = getSupabaseClient();

export interface StockData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  lastUpdate: string;
  source: string;
}

export interface FundamentalsData {
  symbol: string;
  pe?: number;
  eps?: number;
  revenue?: number;
  marketCap?: number;
  sharesOutstanding?: number;
  bookValue?: number;
  lastUpdate: string;
  source: string;
}

/**
 * Data Orchestrator - Manages multi-API data fetching with intelligent fallbacks
 * Implements the core strategy from plan.md for robust data pipeline
 */
export class DataOrchestrator {
  private providers = {
    realtime: {
      primary: 'finnhub',    // Primary source for real-time data
      secondary: 'polygon',   // 5 calls/min free tier
      tertiary: 'twelveData', // 8 credits/min
    },
    historical: {
      primary: 'twelveData',  // Best for charts
      secondary: 'polygon',   // Good aggregates
      tertiary: 'fmp',        // EOD data
    },
    fundamentals: {
      primary: 'fmp',         // 250/day limit
      secondary: 'finnhub',   // If available
      tertiary: 'polygon',    // Basic fundamental data
    }
  };

  // private finnhubService: FinnhubService; // Removed - keeping only FMP + Alpha Vantage
  // private polygonService: PolygonService; // Removed - keeping only FMP + Alpha Vantage
  private marketDataService: ServerMarketDataService;

  constructor() {
    // this.finnhubService = finnhubService; // Removed - keeping only FMP + Alpha Vantage
    // this.polygonService = new PolygonService(); // Removed - keeping only FMP + Alpha Vantage
    this.marketDataService = new ServerMarketDataService();
  }

  /**
   * Update stock data with fallback strategy
   */
  async updateStockData(symbol: string): Promise<StockData | null> {
    // 1. Check cache first (multi-layer cache handles TTL automatically)
    const cacheKey = MultiLayerCache.generateKey('stock', 'quote', symbol);
    const cachedData = await multiLayerCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📦 Using cached data for ${symbol}`);
      return cachedData;
    }

    // 2. Get quote data with fallback
    const quoteData = await this.getQuoteWithFallback(symbol);
    if (!quoteData) {
      console.warn(`⚠️ No quote data available for ${symbol}`);
      return null;
    }

    // 3. Store in database and cache
    await this.storeStockData(quoteData);
    await multiLayerCache.set(cacheKey, quoteData, 'quotes');

    console.log(`✅ Updated ${symbol}: $${quoteData.price} (${quoteData.source})`);
    return quoteData;
  }

  /**
   * Get quote data with intelligent fallback
   */
  async getQuoteWithFallback(symbol: string): Promise<StockData | null> {
    const providers = ['finnhub', 'polygon', 'fmp'];
    
    for (const provider of providers) {
      try {
        console.log(`🔄 Trying ${provider} for ${symbol}...`);
        
        let data: any;
        switch (provider) {
          case 'finnhub':
            data = await this.finnhubService.getQuote(symbol);
            break;
          case 'polygon':
            data = await this.polygonService.getQuote(symbol);
            break;
          case 'fmp':
            data = await this.marketDataService.getRealTimePrice(symbol);
            break;
        }

        if (data && data.price && data.price > 0) {
          return {
            symbol,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            volume: data.volume,
            marketCap: data.marketCap,
            lastUpdate: new Date().toISOString(),
            source: provider
          };
        }
      } catch (error) {
        console.warn(`⚠️ ${provider} failed for ${symbol}:`, error instanceof Error ? error.message : error);
        continue; // Try next provider
      }
    }

    return null; // All providers failed
  }

  /**
   * Get fundamentals data with fallback
   */
  async getFundamentalsWithFallback(symbol: string): Promise<FundamentalsData | null> {
    const providers = ['fmp', 'finnhub', 'polygon'];
    
    for (const provider of providers) {
      try {
        console.log(`🔄 Getting fundamentals from ${provider} for ${symbol}...`);
        
        let data: any;
        switch (provider) {
          case 'fmp':
            data = await this.marketDataService.getCompanyFundamentals(symbol);
            break;
          case 'finnhub':
            data = await this.finnhubService.getCompanyProfile(symbol);
            break;
          case 'polygon':
            data = await this.polygonService.getCompanyDetails(symbol);
            break;
        }

        if (data) {
          return {
            symbol,
            pe: data.pe || data.peRatio,
            eps: data.eps || data.epsBasic,
            revenue: data.revenue || data.totalRevenue,
            marketCap: data.marketCap || data.marketCapitalization,
            sharesOutstanding: data.sharesOutstanding || data.shares,
            bookValue: data.bookValue || data.bookValuePerShare,
            lastUpdate: new Date().toISOString(),
            source: provider
          };
        }
      } catch (error) {
        console.warn(`⚠️ ${provider} fundamentals failed for ${symbol}:`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    return null;
  }

  /**
   * Store stock data in Supabase
   */
  private async storeStockData(stockData: StockData): Promise<void> {
    try {
      // Store in stocks table
      await supabase
        .from('stocks')
        .upsert({
          symbol: stockData.symbol,
          current_price: stockData.price,
          volume: stockData.volume,
          market_cap: stockData.marketCap,
          last_updated: stockData.lastUpdate,
          data_source: stockData.source
        });

      // Store in stock_prices for historical tracking
      await supabase
        .from('stock_prices')
        .insert({
          symbol: stockData.symbol,
          price: stockData.price,
          volume: stockData.volume,
          change_amount: stockData.change,
          change_percent: stockData.changePercent,
          timestamp: stockData.lastUpdate,
          source: stockData.source
        });

    } catch (error) {
      console.error(`❌ Failed to store data for ${stockData.symbol}:`, error);
    }
  }

  /**
   * Get quote data (new method for external access)
   */
  async getQuote(symbol: string): Promise<StockData | null> {
    return this.updateStockData(symbol);
  }

  /**
   * Get company details with caching
   */
  async getCompanyDetails(symbol: string): Promise<FundamentalsData | null> {
    const cacheKey = MultiLayerCache.generateKey('company', 'details', symbol);
    const cachedData = await multiLayerCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📦 Using cached company data for ${symbol}`);
      return cachedData;
    }

    const fundamentals = await this.getFundamentalsWithFallback(symbol);
    if (fundamentals) {
      await multiLayerCache.set(cacheKey, fundamentals, 'company');
    }

    return fundamentals;
  }

  /**
   * Get previous close with caching
   */
  async getPreviousClose(symbol: string): Promise<any | null> {
    const cacheKey = MultiLayerCache.generateKey('polygon', 'prev_close', symbol);
    const cachedData = await multiLayerCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`📦 Using cached previous close for ${symbol}`);
      return cachedData;
    }

    try {
      const data = await this.polygonService.getPreviousClose(symbol);
      if (data) {
        await multiLayerCache.set(cacheKey, data, 'daily');
      }
      return data;
    } catch (error) {
      console.error(`❌ Failed to get previous close for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get last update timestamp for symbol (now handled by cache TTL)
   */
  private async getLastUpdate(symbol: string): Promise<number> {
    // This method is now deprecated as TTL is handled by multi-layer cache
    // Keeping for backward compatibility but always return 0 to force cache check
    return 0;
  }

  /**
   * Warm cache for frequently accessed symbols
   */
  async warmCache(symbols: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${symbols.length} symbols using multi-layer cache...`);
    await multiLayerCache.warmCache(symbols, this);
  }

  /**
   * Bulk update multiple symbols
   */
  async bulkUpdateStocks(symbols: string[]): Promise<{ successful: number; failed: number; results: any[] }> {
    console.log(`📊 Bulk updating ${symbols.length} symbols...`);
    
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const symbol of symbols) {
      try {
        const stockData = await this.updateStockData(symbol);
        if (stockData) {
          results.push({ symbol, status: 'success', data: stockData });
          successful++;
        } else {
          results.push({ symbol, status: 'no_data' });
          failed++;
        }
      } catch (error) {
        results.push({ 
          symbol, 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error) 
        });
        failed++;
      }

      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 Bulk update complete: ${successful} successful, ${failed} failed`);
    return { successful, failed, results };
  }

  /**
   * Get data orchestrator health status
   */
  async getHealthStatus(): Promise<{
    status: string;
    providers: Record<string, boolean>;
    lastSuccessfulUpdate: string | null;
    cacheHitRate: number;
  }> {
    const providers = {
      finnhub: false,
      polygon: false,
      fmp: false
    };

    // Test each provider with a simple request
    try {
      await this.finnhubService.getQuote('AAPL');
      providers.finnhub = true;
    } catch {}

    try {
      await this.polygonService.getQuote('AAPL');
      providers.polygon = true;
    } catch {}

    try {
      await this.marketDataService.getRealTimePrice('AAPL');
      providers.fmp = true;
    } catch {}

    const availableProviders = Object.values(providers).filter(Boolean).length;
    const status = availableProviders > 0 ? 'healthy' : 'degraded';

    // Get cache stats from multi-layer cache
    const cacheStats = multiLayerCache.getStats();
    const cacheHitRate = cacheStats.hitRatio * 100;

    return {
      status,
      providers,
      lastSuccessfulUpdate: null, // Could be enhanced to track this
      cacheHitRate
    };
  }
}