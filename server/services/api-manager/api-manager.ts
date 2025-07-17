/**
 * API MANAGER SINGLETON
 * Central orchestrator for all API providers with intelligent routing,
 * quota management, circuit breaker pattern, and smart caching
 */

import { UnifiedAPIService } from '../unified-api/unified-api-service';
import { circuitBreakerManager } from '../unified-api/circuit-breaker';
import { QuotaTracker } from '../quota/quota-tracker';
import { cacheManager, CacheType } from '../cache/cache-manager';
import { IMarketDataProvider, PriceData, Fundamentals, HistoricalData, CompanyInfo, NewsData, TimeRange } from '../unified-api/provider.interface';
import { ProviderName, DATA_TYPE_PROVIDERS, DataType } from '../quota/quota-limits';

// Provider imports
import { AlphaVantageProvider } from '../unified-api/providers/alpha-vantage.provider';
import { FinnhubProvider } from '../unified-api/providers/finnhub.provider';
import { FMPProvider } from '../unified-api/providers/fmp.provider';
import { PolygonProvider } from '../unified-api/providers/polygon.provider';
import { TwelveDataProvider } from '../unified-api/providers/twelve-data.provider';

export interface ApiManagerConfig {
  enabledProviders: ProviderName[];
  defaultProvider?: ProviderName;
  enableCircuitBreaker: boolean;
  enableQuotaTracking: boolean;
  enableSmartCaching: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

export interface ApiManagerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  providersUsage: Record<ProviderName, number>;
  circuitBreakerStats: any;
  quotaStats: any;
  cacheStats: any;
  uptime: number;
}

export class ApiManager {
  private static instance: ApiManager | null = null;
  private unifiedService: UnifiedAPIService;
  private quotaTracker: QuotaTracker;
  private config: ApiManagerConfig;
  private stats: ApiManagerStats;
  private initialized = false;
  private startTime: number;

  private constructor(config?: Partial<ApiManagerConfig>) {
    this.startTime = Date.now();
    
    // Default configuration
    this.config = {
      enabledProviders: ['alpha-vantage', 'finnhub', 'fmp', 'polygon', 'twelve-data'],
      defaultProvider: 'alpha-vantage',
      enableCircuitBreaker: true,
      enableQuotaTracking: true,
      enableSmartCaching: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config
    };

    this.initializeStats();
    this.unifiedService = new UnifiedAPIService();
    this.quotaTracker = new QuotaTracker();

    console.log('🏗️ ApiManager singleton created with config:', this.config);
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(config?: Partial<ApiManagerConfig>): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager(config);
    }
    return ApiManager.instance;
  }

  /**
   * Initialize the API manager with providers
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ ApiManager already initialized');
      return;
    }

    try {
      console.log('🔧 Initializing ApiManager...');
      
      // Initialize providers based on configuration
      const providers = await this.createProviders();
      
      // Initialize the unified service
      await this.unifiedService.initialize(providers);
      
      this.initialized = true;
      console.log('✅ ApiManager initialization complete');
      
      // Start background tasks
      this.startBackgroundTasks();
      
    } catch (error) {
      console.error('❌ ApiManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * PRICE DATA METHODS
   */
  public async getPrice(symbol: string): Promise<PriceData> {
    return this.executeWithStats('price', async () => {
      return await this.unifiedService.getPrice(symbol, this.config.enableSmartCaching);
    });
  }

  public async getBatchPrices(symbols: string[]): Promise<PriceData[]> {
    return this.executeWithStats('batch-prices', async () => {
      return await this.unifiedService.getBatchPrices(symbols, this.config.enableSmartCaching);
    });
  }

  /**
   * FUNDAMENTALS DATA METHODS
   */
  public async getFundamentals(symbol: string): Promise<Fundamentals> {
    return this.executeWithStats('fundamentals', async () => {
      return await this.unifiedService.getFundamentals(symbol, this.config.enableSmartCaching);
    });
  }

  /**
   * HISTORICAL DATA METHODS
   */
  public async getHistorical(symbol: string, range: TimeRange): Promise<HistoricalData> {
    return this.executeWithStats('historical', async () => {
      return await this.unifiedService.getHistorical(symbol, range, this.config.enableSmartCaching);
    });
  }

  /**
   * COMPANY INFO METHODS
   */
  public async getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    return this.executeWithStats('companyInfo', async () => {
      return await this.unifiedService.getCompanyInfo(symbol, this.config.enableSmartCaching);
    });
  }

  /**
   * NEWS DATA METHODS
   */
  public async getNews(symbol: string, limit = 10): Promise<NewsData> {
    return this.executeWithStats('news', async () => {
      return await this.unifiedService.getNews(symbol, limit, this.config.enableSmartCaching);
    });
  }

  /**
   * CACHE MANAGEMENT METHODS
   */
  public async invalidateCache(pattern?: string, type?: CacheType): Promise<number> {
    console.log(`🗑️ Invalidating cache: pattern=${pattern}, type=${type}`);
    return await cacheManager.invalidate(pattern, type);
  }

  public async warmCache(symbols: string[] = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']): Promise<void> {
    console.log('🔥 Warming cache through ApiManager...');
    return await cacheManager.warmCache(symbols);
  }

  /**
   * CIRCUIT BREAKER MANAGEMENT
   */
  public resetCircuitBreaker(providerName: ProviderName): void {
    console.log(`🔌 Resetting circuit breaker for ${providerName}`);
    circuitBreakerManager.getCircuitBreaker(providerName).reset();
  }

  public resetAllCircuitBreakers(): void {
    console.log('🔌 Resetting all circuit breakers');
    circuitBreakerManager.resetAll();
  }

  /**
   * QUOTA MANAGEMENT
   */
  public async getQuotaUsage(): Promise<any> {
    return await this.quotaTracker.getAllProvidersUsage();
  }

  public async checkQuotaAlerts(): Promise<any> {
    return await this.quotaTracker.checkQuotaAlerts();
  }

  /**
   * MONITORING AND STATISTICS
   */
  public async getStatus(): Promise<any> {
    const unifiedStatus = await this.unifiedService.getStatus();
    const quotaUsage = await this.quotaTracker.getAllProvidersUsage();
    const cacheStats = cacheManager.getStats();
    
    return {
      initialized: this.initialized,
      config: this.config,
      stats: this.getStats(),
      unified: unifiedStatus,
      quota: quotaUsage,
      cache: cacheStats,
      uptime: Date.now() - this.startTime
    };
  }

  public getStats(): ApiManagerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
      cacheStats: cacheManager.getStats(),
      circuitBreakerStats: circuitBreakerManager.getGlobalStats(),
      quotaStats: this.quotaTracker // Will be expanded with more quota stats
    };
  }

  /**
   * CONFIGURATION METHODS
   */
  public updateConfig(newConfig: Partial<ApiManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ ApiManager config updated:', this.config);
  }

  public getConfig(): ApiManagerConfig {
    return { ...this.config };
  }

  /**
   * HEALTH CHECK
   */
  public async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (!this.initialized) {
      issues.push('ApiManager not initialized');
    }
    
    // Check circuit breakers
    const availableProviders = circuitBreakerManager.getAvailableProviders();
    if (availableProviders.length === 0) {
      issues.push('No providers available (all circuit breakers open)');
    }
    
    // Check quota limits
    const quotaAlerts = await this.quotaTracker.checkQuotaAlerts();
    const highUsageProviders = quotaAlerts.filter(alert => alert.usage > 90);
    if (highUsageProviders.length > 0) {
      issues.push(`High quota usage: ${highUsageProviders.map(p => p.provider).join(', ')}`);
    }
    
    // Check cache health
    const cacheStats = cacheManager.getStats();
    if (cacheStats.errors > 10) {
      issues.push('High cache error rate');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * PRIVATE HELPER METHODS
   */
  private async createProviders(): Promise<IMarketDataProvider[]> {
    const providers: IMarketDataProvider[] = [];
    
    for (const providerName of this.config.enabledProviders) {
      try {
        let provider: IMarketDataProvider;
        
        switch (providerName) {
          case 'alpha-vantage':
            provider = new AlphaVantageProvider();
            break;
          case 'finnhub':
            provider = new FinnhubProvider();
            break;
          case 'fmp':
            provider = new FMPProvider();
            break;
          case 'polygon':
            provider = new PolygonProvider();
            break;
          case 'twelve-data':
            provider = new TwelveDataProvider();
            break;
          default:
            console.warn(`⚠️ Unknown provider: ${providerName}`);
            continue;
        }
        
        providers.push(provider);
        console.log(`✅ Created provider: ${providerName}`);
        
      } catch (error) {
        console.error(`❌ Failed to create provider ${providerName}:`, error);
      }
    }
    
    return providers;
  }

  private async executeWithStats<T>(operation: string, executor: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;
    
    try {
      const result = await executor();
      this.stats.successfulRequests++;
      
      // Track cache hits/misses if result has cache info
      if ((result as any)?.cached) {
        this.stats.cacheHits++;
      } else {
        this.stats.cacheMisses++;
      }
      
      return result;
    } catch (error) {
      this.stats.failedRequests++;
      console.error(`❌ ApiManager operation failed: ${operation}`, error);
      throw error;
    }
  }

  private initializeStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      providersUsage: {} as Record<ProviderName, number>,
      circuitBreakerStats: null,
      quotaStats: null,
      cacheStats: null,
      uptime: 0
    };
  }

  private startBackgroundTasks(): void {
    // Check quota alerts every 5 minutes
    setInterval(async () => {
      try {
        const alerts = await this.quotaTracker.checkQuotaAlerts();
        const highUsageAlerts = alerts.filter(alert => alert.alert);
        
        if (highUsageAlerts.length > 0) {
          console.warn('⚠️ Quota alerts:', highUsageAlerts);
        }
      } catch (error) {
        console.error('❌ Background quota check failed:', error);
      }
    }, 5 * 60 * 1000);

    // Log stats every 10 minutes
    setInterval(() => {
      const stats = this.getStats();
      console.log('📊 ApiManager stats:', {
        requests: stats.totalRequests,
        success_rate: stats.totalRequests > 0 ? (stats.successfulRequests / stats.totalRequests * 100).toFixed(1) + '%' : '0%',
        cache_hit_rate: stats.cacheHits + stats.cacheMisses > 0 ? (stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100).toFixed(1) + '%' : '0%',
        uptime: Math.floor(stats.uptime / 1000) + 's'
      });
    }, 10 * 60 * 1000);
  }

  /**
   * Cleanup on shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down ApiManager...');
    
    await cacheManager.shutdown();
    
    this.initialized = false;
    console.log('✅ ApiManager shutdown complete');
  }
}

// Export the singleton getter
export const getApiManager = (config?: Partial<ApiManagerConfig>): ApiManager => {
  return ApiManager.getInstance(config);
};

// Default instance for easy import
export const apiManager = ApiManager.getInstance();