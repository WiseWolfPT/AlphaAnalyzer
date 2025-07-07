/**
 * CACHE WARMING SERVICE
 * Intelligent cache pre-warming for popular stocks and essential data
 */

import { cacheManager, CacheType, CacheKeys } from './cache-manager';
import { getUnifiedAPIService } from '../unified-api';

export interface WarmingConfig {
  symbols: string[];
  dataTypes: CacheType[];
  batchSize: number;
  delayBetweenBatches: number;
  retryAttempts: number;
  onProgress?: (completed: number, total: number, symbol: string) => void;
  onError?: (error: Error, symbol: string, dataType: CacheType) => void;
  onComplete?: (summary: WarmingSummary) => void;
}

export interface WarmingSummary {
  totalSymbols: number;
  totalRequests: number;
  successful: number;
  failed: number;
  cached: number;
  duration: number;
  errorsByType: Record<string, number>;
  cacheStats: {
    before: any;
    after: any;
  };
}

export class CacheWarmingService {
  private isWarming = false;
  private currentProgress = 0;
  private totalOperations = 0;

  /**
   * Popular stock symbols to warm by default
   */
  private static readonly POPULAR_SYMBOLS = [
    // US Large Cap
    'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'DIS', 'JPM', 'JNJ', 'V', 'WMT', 'PG', 'UNH', 'HD', 'MA', 'BAC',
    'ADBE', 'CRM', 'PYPL', 'INTC', 'CMCSA', 'PFE', 'T', 'VZ', 'KO', 'PEP',
    
    // ETFs
    'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'AGG',
    
    // Crypto-related
    'COIN', 'MSTR', 'SQ',
    
    // Popular Portuguese/European stocks (if supported)
    'EDP.LS', 'GALP.LS', 'BCP.LS', 'CTT.LS', 'SON.LS'
  ];

  /**
   * Essential data types to warm for each symbol
   */
  private static readonly ESSENTIAL_DATA_TYPES: CacheType[] = [
    CacheType.REALTIME_PRICE,
    CacheType.COMPANY_PROFILE,
    CacheType.FUNDAMENTALS
  ];

  /**
   * Warm cache with default popular symbols and essential data
   */
  async warmPopularStocks(config: Partial<WarmingConfig> = {}): Promise<WarmingSummary> {
    const fullConfig: WarmingConfig = {
      symbols: CacheWarmingService.POPULAR_SYMBOLS,
      dataTypes: CacheWarmingService.ESSENTIAL_DATA_TYPES,
      batchSize: 5,
      delayBetweenBatches: 1000,
      retryAttempts: 2,
      ...config
    };

    return this.warmCache(fullConfig);
  }

  /**
   * Warm cache for specific symbols and data types
   */
  async warmCache(config: WarmingConfig): Promise<WarmingSummary> {
    if (this.isWarming) {
      throw new Error('Cache warming already in progress');
    }

    this.isWarming = true;
    const startTime = Date.now();
    
    const summary: WarmingSummary = {
      totalSymbols: config.symbols.length,
      totalRequests: config.symbols.length * config.dataTypes.length,
      successful: 0,
      failed: 0,
      cached: 0,
      duration: 0,
      errorsByType: {},
      cacheStats: {
        before: cacheManager.getStats(),
        after: null
      }
    };

    try {
      console.log(`🔥 Starting cache warming for ${config.symbols.length} symbols...`);
      console.log(`📊 Data types: ${config.dataTypes.join(', ')}`);
      
      this.totalOperations = summary.totalRequests;
      this.currentProgress = 0;

      // Process symbols in batches
      const batches = this.createBatches(config.symbols, config.batchSize);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} symbols)`);
        
        // Process batch in parallel
        const batchPromises = batch.map(symbol => 
          this.warmSymbol(symbol, config.dataTypes, config.retryAttempts, summary)
        );
        
        await Promise.allSettled(batchPromises);
        
        // Progress callback
        if (config.onProgress) {
          config.onProgress(this.currentProgress, this.totalOperations, batch[batch.length - 1]);
        }
        
        // Delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1 && config.delayBetweenBatches > 0) {
          await this.delay(config.delayBetweenBatches);
        }
      }

      // Warm global data
      await this.warmGlobalData(summary);

      summary.duration = Date.now() - startTime;
      summary.cacheStats.after = cacheManager.getStats();

      console.log(`✅ Cache warming completed in ${summary.duration}ms`);
      console.log(`📊 Results: ${summary.successful} successful, ${summary.failed} failed, ${summary.cached} cached`);
      
      if (config.onComplete) {
        config.onComplete(summary);
      }

      return summary;

    } catch (error) {
      console.error('❌ Cache warming failed:', error);
      throw error;
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm cache for a specific symbol with all requested data types
   */
  private async warmSymbol(
    symbol: string, 
    dataTypes: CacheType[], 
    retryAttempts: number,
    summary: WarmingSummary
  ): Promise<void> {
    for (const dataType of dataTypes) {
      let attempts = 0;
      let success = false;

      while (attempts <= retryAttempts && !success) {
        try {
          attempts++;
          await this.warmDataType(symbol, dataType);
          summary.successful++;
          summary.cached++;
          success = true;
          
        } catch (error) {
          if (attempts > retryAttempts) {
            summary.failed++;
            
            const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
            summary.errorsByType[errorType] = (summary.errorsByType[errorType] || 0) + 1;
            
            console.warn(`⚠️ Failed to warm ${symbol} ${dataType} after ${retryAttempts} attempts:`, error);
          } else {
            // Wait before retry
            await this.delay(500 * attempts);
          }
        }
      }

      this.currentProgress++;
    }
  }

  /**
   * Warm specific data type for a symbol
   */
  private async warmDataType(symbol: string, dataType: CacheType): Promise<void> {
    const unifiedAPI = getUnifiedAPIService();
    
    switch (dataType) {
      case CacheType.REALTIME_PRICE:
        await this.warmRealtimePrice(symbol, unifiedAPI);
        break;
        
      case CacheType.COMPANY_PROFILE:
        await this.warmCompanyProfile(symbol, unifiedAPI);
        break;
        
      case CacheType.FUNDAMENTALS:
        await this.warmFundamentals(symbol, unifiedAPI);
        break;
        
      case CacheType.CHART_DATA:
        await this.warmChartData(symbol, unifiedAPI);
        break;
        
      case CacheType.AFTER_HOURS:
        await this.warmAfterHours(symbol, unifiedAPI);
        break;
        
      default:
        console.warn(`⚠️ Unknown data type for warming: ${dataType}`);
    }
  }

  private async warmRealtimePrice(symbol: string, api: any): Promise<void> {
    const key = CacheKeys.realtimePrice(symbol);
    
    // Check if already cached
    const cached = await cacheManager.get(key, CacheType.REALTIME_PRICE);
    if (cached !== null) {
      return; // Already cached
    }
    
    try {
      const quote = await api.getQuote(symbol);
      await cacheManager.set(key, quote, CacheType.REALTIME_PRICE, 'warming');
      console.log(`💾 Warmed real-time price for ${symbol}`);
    } catch (error) {
      // Fallback to mock data for warming
      const mockQuote = {
        symbol,
        price: 100 + Math.random() * 100,
        change: -5 + Math.random() * 10,
        changePercent: -0.05 + Math.random() * 0.1,
        timestamp: new Date().toISOString(),
        _cached: true,
        _warmed: true
      };
      
      await cacheManager.set(key, mockQuote, CacheType.REALTIME_PRICE, 'warming-mock');
      console.log(`💾 Warmed mock real-time price for ${symbol}`);
    }
  }

  private async warmCompanyProfile(symbol: string, api: any): Promise<void> {
    const key = CacheKeys.companyProfile(symbol);
    
    const cached = await cacheManager.get(key, CacheType.COMPANY_PROFILE);
    if (cached !== null) {
      return;
    }
    
    try {
      const profile = await api.getCompanyProfile(symbol);
      await cacheManager.set(key, profile, CacheType.COMPANY_PROFILE, 'warming');
      console.log(`💾 Warmed company profile for ${symbol}`);
    } catch (error) {
      // Fallback to basic profile
      const mockProfile = {
        symbol,
        name: `${symbol} Corporation`,
        exchange: 'NASDAQ',
        industry: 'Technology',
        sector: 'Technology',
        country: 'US',
        _warmed: true
      };
      
      await cacheManager.set(key, mockProfile, CacheType.COMPANY_PROFILE, 'warming-mock');
      console.log(`💾 Warmed mock company profile for ${symbol}`);
    }
  }

  private async warmFundamentals(symbol: string, api: any): Promise<void> {
    const key = CacheKeys.fundamentals(symbol);
    
    const cached = await cacheManager.get(key, CacheType.FUNDAMENTALS);
    if (cached !== null) {
      return;
    }
    
    try {
      const fundamentals = await api.getFundamentals(symbol);
      await cacheManager.set(key, fundamentals, CacheType.FUNDAMENTALS, 'warming');
      console.log(`💾 Warmed fundamentals for ${symbol}`);
    } catch (error) {
      // Fallback to basic fundamentals
      const mockFundamentals = {
        symbol,
        marketCap: 1000000000 + Math.random() * 2000000000,
        peRatio: 15 + Math.random() * 30,
        pbRatio: 1 + Math.random() * 5,
        dividendYield: Math.random() * 0.05,
        _warmed: true
      };
      
      await cacheManager.set(key, mockFundamentals, CacheType.FUNDAMENTALS, 'warming-mock');
      console.log(`💾 Warmed mock fundamentals for ${symbol}`);
    }
  }

  private async warmChartData(symbol: string, api: any): Promise<void> {
    const key = CacheKeys.chartData(symbol, '1d');
    
    const cached = await cacheManager.get(key, CacheType.CHART_DATA);
    if (cached !== null) {
      return;
    }
    
    try {
      const chartData = await api.getChartData(symbol, '1d');
      await cacheManager.set(key, chartData, CacheType.CHART_DATA, 'warming');
      console.log(`💾 Warmed chart data for ${symbol}`);
    } catch (error) {
      // Skip chart data warming if it fails
      console.debug(`Skip chart data warming for ${symbol}:`, error.message);
    }
  }

  private async warmAfterHours(symbol: string, api: any): Promise<void> {
    // Only warm after hours during market closed hours
    const now = new Date();
    const hour = now.getHours();
    
    // US market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
    if (hour >= 14 && hour <= 21) {
      return; // Skip during market hours
    }
    
    const key = CacheKeys.afterHours(symbol);
    
    const cached = await cacheManager.get(key, CacheType.AFTER_HOURS);
    if (cached !== null) {
      return;
    }
    
    try {
      const afterHours = await api.getAfterHoursQuote(symbol);
      await cacheManager.set(key, afterHours, CacheType.AFTER_HOURS, 'warming');
      console.log(`💾 Warmed after hours for ${symbol}`);
    } catch (error) {
      // Skip after hours warming if it fails
      console.debug(`Skip after hours warming for ${symbol}:`, error.message);
    }
  }

  /**
   * Warm global data (market status, sectors, etc.)
   */
  private async warmGlobalData(summary: WarmingSummary): Promise<void> {
    try {
      // Market status
      const marketStatusKey = CacheKeys.marketStatus();
      const marketStatus = {
        isOpen: this.isMarketOpen(),
        session: this.getMarketSession(),
        nextOpen: this.getNextMarketOpen(),
        nextClose: this.getNextMarketClose(),
        _warmed: true
      };
      
      await cacheManager.set(marketStatusKey, marketStatus, CacheType.MARKET_STATUS, 'warming');
      summary.cached++;
      
      // Sectors data
      const sectorsKey = CacheKeys.sectors();
      const sectors = [
        'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
        'Communication Services', 'Industrials', 'Consumer Defensive',
        'Energy', 'Utilities', 'Real Estate', 'Basic Materials'
      ];
      
      await cacheManager.set(sectorsKey, sectors, CacheType.SECTORS, 'warming');
      summary.cached++;
      
      console.log('✅ Global data warmed (market status, sectors)');
      
    } catch (error) {
      console.error('❌ Failed to warm global data:', error);
      summary.failed++;
    }
  }

  /**
   * Get current warming progress
   */
  getProgress(): { isWarming: boolean; progress: number; total: number } {
    return {
      isWarming: this.isWarming,
      progress: this.currentProgress,
      total: this.totalOperations
    };
  }

  /**
   * Check if cache warming is in progress
   */
  isWarmingInProgress(): boolean {
    return this.isWarming;
  }

  // Helper methods
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isMarketOpen(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    
    // Weekend
    if (day === 0 || day === 6) {
      return false;
    }
    
    // US market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
    return hour >= 14 && hour < 21;
  }

  private getMarketSession(): string {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 4 && hour < 14) {
      return 'pre-market';
    } else if (hour >= 14 && hour < 21) {
      return 'regular';
    } else {
      return 'after-hours';
    }
  }

  private getNextMarketOpen(): string {
    const now = new Date();
    const nextOpen = new Date(now);
    
    // Set to next 9:30 AM EST (14:30 UTC)
    nextOpen.setUTCHours(14, 30, 0, 0);
    
    // If it's already past market open today, move to next business day
    if (now.getTime() >= nextOpen.getTime()) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    
    // Skip weekends
    while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    
    return nextOpen.toISOString();
  }

  private getNextMarketClose(): string {
    const now = new Date();
    const nextClose = new Date(now);
    
    // Set to next 4:00 PM EST (21:00 UTC)
    nextClose.setUTCHours(21, 0, 0, 0);
    
    // If it's already past market close today, move to next business day
    if (now.getTime() >= nextClose.getTime()) {
      nextClose.setDate(nextClose.getDate() + 1);
    }
    
    // Skip weekends
    while (nextClose.getDay() === 0 || nextClose.getDay() === 6) {
      nextClose.setDate(nextClose.getDate() + 1);
    }
    
    return nextClose.toISOString();
  }
}

// Export singleton instance
export const cacheWarmingService = new CacheWarmingService();