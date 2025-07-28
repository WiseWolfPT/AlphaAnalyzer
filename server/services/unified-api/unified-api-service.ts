import { 
  IMarketDataProvider, 
  PriceData, 
  Fundamentals, 
  HistoricalData, 
  CompanyInfo,
  NewsData,
  TimeRange 
} from './provider.interface';
import { DataType, DATA_TYPE_PROVIDERS, ProviderName } from '../quota/quota-limits';
import { getCache, CACHE_TTL } from '../cache';
import { getQuotaTracker } from '../quota';
import { 
  circuitBreakerManager, 
  CircuitBreaker, 
  CircuitBreakerState 
} from './circuit-breaker';

export class UnifiedAPIService {
  private providers: Map<ProviderName, IMarketDataProvider> = new Map();
  private cache: any;
  private quotaTracker: any;
  private initialized = false;

  async initialize(providers: IMarketDataProvider[]): Promise<void> {
    console.log('[UnifiedAPIService] Initializing with providers:', providers.map(p => p.name));
    
    try {
      // Initialize cache and quota tracker with error handling
      this.cache = getCache();
      if (!this.cache) {
        console.warn('[UnifiedAPIService] Cache service not available, creating fallback');
        // Create a simple fallback cache implementation
        this.cache = {
          get: async () => null,
          set: async () => {},
          getStats: () => ({ hits: 0, misses: 0, sets: 0, evictions: 0 })
        };
      }
      
      this.quotaTracker = getQuotaTracker();
      if (!this.quotaTracker) {
        console.warn('[UnifiedAPIService] Quota tracker not available, creating fallback');
        // Create a simple fallback quota tracker
        this.quotaTracker = {
          canUseProvider: async () => true,
          recordCall: async () => {},
          getUsage: async () => ({ used: 0, limit: 1000, remaining: 1000 })
        };
      }
    } catch (error) {
      console.error('[UnifiedAPIService] Error initializing cache/quota services:', error);
      // Create fallback services
      this.cache = {
        get: async () => null,
        set: async () => {},
        getStats: () => ({ hits: 0, misses: 0, sets: 0, evictions: 0 })
      };
      this.quotaTracker = {
        canUseProvider: async () => true,
        recordCall: async () => {},
        getUsage: async () => ({ used: 0, limit: 1000, remaining: 1000 })
      };
    }
    
    // Register providers
    for (const provider of providers) {
      try {
        this.providers.set(provider.name, provider);
        await provider.initialize();
      } catch (error) {
        console.error(`[UnifiedAPIService] Failed to initialize provider ${provider.name}:`, error);
        // Continue with other providers
      }
    }

    this.initialized = true;
    console.log('[UnifiedAPIService] Initialization complete');
  }

  async getPrice(symbol: string, useCache = true): Promise<PriceData> {
    const cacheKey = `price:${symbol}`;
    
    // Check cache first
    if (useCache) {
      const cached = await this.cache.get<PriceData>(cacheKey);
      if (cached) {
        console.log(`[UnifiedAPIService] Cache hit for price: ${symbol}`);
        return { ...cached, cached: true } as any;
      }
    }

    // Try providers in order
    const result = await this.callProvidersInOrder(
      'price',
      async (provider) => provider.getPrice(symbol)
    );

    // Cache the result
    await this.cache.set(cacheKey, result, CACHE_TTL.PRICE);
    
    return result;
  }

  async getBatchPrices(symbols: string[], useCache = true): Promise<PriceData[]> {
    const results: PriceData[] = [];
    const uncachedSymbols: string[] = [];

    // Check cache for each symbol
    if (useCache) {
      for (const symbol of symbols) {
        const cached = await this.cache.get<PriceData>(`price:${symbol}`);
        if (cached) {
          results.push({ ...cached, cached: true } as any);
        } else {
          uncachedSymbols.push(symbol);
        }
      }
    } else {
      uncachedSymbols.push(...symbols);
    }

    // Fetch uncached symbols
    if (uncachedSymbols.length > 0) {
      // Try to find a provider that supports batch requests
      const batchProvider = await this.findProviderWithCapability('price', p => p.capabilities.batchRequests);
      
      if (batchProvider && batchProvider.getBatchPrices) {
        try {
          // Use circuit breaker for batch requests too
          const circuitBreaker = circuitBreakerManager.getCircuitBreaker(batchProvider.name);
          
          if (circuitBreaker.isAvailable()) {
            const batchResults = await circuitBreaker.execute(async () => {
              return await batchProvider.getBatchPrices!(uncachedSymbols);
            });
            
            // Cache individual results
            for (const result of batchResults) {
              await this.cache.set(`price:${result.symbol}`, result, CACHE_TTL.PRICE);
              results.push(result);
            }
            
            await this.quotaTracker.recordCall(batchProvider.name, 'batch-prices');
          } else {
            console.warn(`[UnifiedAPIService] Batch provider ${batchProvider.name} circuit breaker not available`);
            throw new Error('Circuit breaker not available for batch provider');
          }
        } catch (error) {
          console.error('[UnifiedAPIService] Batch request failed, falling back to individual requests:', (error as Error).message);
          // Fall back to individual requests
          for (const symbol of uncachedSymbols) {
            try {
              const price = await this.getPrice(symbol, false);
              results.push(price);
            } catch (err) {
              console.error(`Failed to get price for ${symbol}:`, err);
            }
          }
        }
      } else {
        // No batch support, fetch individually
        for (const symbol of uncachedSymbols) {
          try {
            const price = await this.getPrice(symbol, false);
            results.push(price);
          } catch (err) {
            console.error(`Failed to get price for ${symbol}:`, err);
          }
        }
      }
    }

    return results;
  }

  async getFundamentals(symbol: string, useCache = true): Promise<Fundamentals> {
    const cacheKey = `fundamentals:${symbol}`;
    
    if (useCache) {
      const cached = await this.cache.get<Fundamentals>(cacheKey);
      if (cached) {
        console.log(`[UnifiedAPIService] Cache hit for fundamentals: ${symbol}`);
        return { ...cached, cached: true } as any;
      }
    }

    const result = await this.callProvidersInOrder(
      'fundamentals',
      async (provider) => provider.getFundamentals(symbol)
    );

    await this.cache.set(cacheKey, result, CACHE_TTL.FUNDAMENTALS);
    
    return result;
  }

  async getHistorical(symbol: string, range: TimeRange, useCache = true): Promise<HistoricalData> {
    const cacheKey = `historical:${symbol}:${range}`;
    
    if (useCache) {
      const cached = await this.cache.get<HistoricalData>(cacheKey);
      if (cached) {
        console.log(`[UnifiedAPIService] Cache hit for historical: ${symbol} ${range}`);
        return { ...cached, cached: true } as any;
      }
    }

    const result = await this.callProvidersInOrder(
      'historical',
      async (provider) => provider.getHistorical(symbol, range)
    );

    await this.cache.set(cacheKey, result, CACHE_TTL.HISTORICAL);
    
    return result;
  }

  async getCompanyInfo(symbol: string, useCache = true): Promise<CompanyInfo> {
    const cacheKey = `company:${symbol}`;
    
    if (useCache) {
      const cached = await this.cache.get<CompanyInfo>(cacheKey);
      if (cached) {
        console.log(`[UnifiedAPIService] Cache hit for company info: ${symbol}`);
        return { ...cached, cached: true } as any;
      }
    }

    const result = await this.callProvidersInOrder(
      'companyInfo',
      async (provider) => provider.getCompanyInfo(symbol)
    );

    await this.cache.set(cacheKey, result, CACHE_TTL.COMPANY_INFO);
    
    return result;
  }

  async getNews(symbol: string, limit = 10, useCache = true): Promise<NewsData> {
    const cacheKey = `news:${symbol}:${limit}`;
    
    if (useCache) {
      const cached = await this.cache.get<NewsData>(cacheKey);
      if (cached) {
        console.log(`[UnifiedAPIService] Cache hit for news: ${symbol}`);
        return { ...cached, cached: true } as any;
      }
    }

    const result = await this.callProvidersInOrder(
      'news',
      async (provider) => provider.getNews(symbol, limit)
    );

    await this.cache.set(cacheKey, result, CACHE_TTL.NEWS);
    
    return result;
  }

  // Helper methods
  private async callProvidersInOrder<T>(
    dataType: DataType,
    operation: (provider: IMarketDataProvider) => Promise<T>
  ): Promise<T> {
    if (!this.initialized) {
      throw new Error('UnifiedAPIService not initialized');
    }

    const eligibleProviders = DATA_TYPE_PROVIDERS[dataType] || [];
    const errors: Error[] = [];

    // Try each provider in priority order
    for (const providerName of eligibleProviders) {
      const provider = this.providers.get(providerName as ProviderName);
      
      if (!provider || !provider.canHandle(dataType)) {
        continue;
      }

      // Get circuit breaker for this provider
      const circuitBreaker = circuitBreakerManager.getCircuitBreaker(providerName, {
        failureThreshold: 5,        // Open after 5 failures
        successThreshold: 3,        // Close after 3 successes in half-open
        timeout: 60000,            // 1 minute timeout
        halfOpenMaxCalls: 3        // Allow 3 calls in half-open state
      });

      // Skip if circuit breaker is open
      if (!circuitBreaker.isAvailable()) {
        const state = circuitBreaker.getState();
        console.log(`[UnifiedAPIService] Skipping ${providerName} - circuit breaker is ${state}`);
        continue;
      }

      // Check quota
      const canUse = await this.quotaTracker.canUseProvider(providerName as ProviderName);
      if (!canUse) {
        console.log(`[UnifiedAPIService] Skipping ${providerName} - quota exceeded`);
        continue;
      }

      try {
        console.log(`[UnifiedAPIService] Trying ${providerName} for ${dataType} (Circuit: ${circuitBreaker.getState()})`);
        
        // Execute operation with circuit breaker protection
        const result = await circuitBreaker.execute(async () => {
          return await operation(provider);
        });
        
        // Record successful call
        await this.quotaTracker.recordCall(providerName as ProviderName, dataType);
        
        console.log(`[UnifiedAPIService] ✅ Success with ${providerName} for ${dataType}`);
        return result;
      } catch (error: any) {
        console.error(`[UnifiedAPIService] ❌ ${providerName} failed:`, error.message);
        errors.push(error);
        
        // Handle specific error types
        if (error.name === 'CircuitBreakerOpenError') {
          console.warn(`[UnifiedAPIService] Circuit breaker blocked request to ${providerName}`);
          continue;
        }
        
        if (error.name === 'CircuitBreakerHalfOpenMaxCallsError') {
          console.warn(`[UnifiedAPIService] Circuit breaker half-open max calls reached for ${providerName}`);
          continue;
        }
        
        // If rate limited, don't try again
        if (error.message.includes('Rate limit')) {
          console.warn(`[UnifiedAPIService] Rate limit hit for ${providerName}`);
          continue;
        }
      }
    }

    // All providers failed
    const errorSummary = errors.map(e => `${e.name}: ${e.message}`).join(', ');
    throw new Error(`All providers failed for ${dataType}. Errors: ${errorSummary}`);
  }

  private async findProviderWithCapability(
    dataType: DataType,
    capabilityCheck: (provider: IMarketDataProvider) => boolean
  ): Promise<IMarketDataProvider | null> {
    const eligibleProviders = DATA_TYPE_PROVIDERS[dataType] || [];
    
    for (const providerName of eligibleProviders) {
      const provider = this.providers.get(providerName as ProviderName);
      
      if (provider && provider.canHandle(dataType) && capabilityCheck(provider)) {
        // Check circuit breaker availability
        const circuitBreaker = circuitBreakerManager.getCircuitBreaker(providerName);
        if (!circuitBreaker.isAvailable()) {
          console.log(`[UnifiedAPIService] Skipping ${providerName} - circuit breaker not available (${circuitBreaker.getState()})`);
          continue;
        }
        
        // Check quota
        const canUse = await this.quotaTracker.canUseProvider(providerName as ProviderName);
        if (canUse) {
          return provider;
        }
      }
    }
    
    return null;
  }

  // Monitoring and status methods
  async getStatus() {
    const providersStatus = [];
    
    for (const [name, provider] of this.providers) {
      const healthy = await provider.isHealthy();
      const usage = await this.quotaTracker.getUsage(name);
      
      // Get circuit breaker status
      const circuitBreaker = circuitBreakerManager.getCircuitBreaker(name);
      const circuitStatus = circuitBreaker.getHealthStatus();
      const circuitMetrics = circuitBreaker.getMetrics();
      
      providersStatus.push({
        name,
        healthy,
        usage,
        circuitBreaker: {
          state: circuitStatus.state,
          isHealthy: circuitStatus.isHealthy,
          failureRate: circuitStatus.failureRate,
          uptime: circuitStatus.uptime,
          totalRequests: circuitMetrics.totalRequests,
          totalFailures: circuitMetrics.totalFailures,
          totalSuccesses: circuitMetrics.totalSuccesses,
          consecutiveFailures: circuitMetrics.consecutiveFailures,
          lastFailureTime: circuitMetrics.lastFailureTime,
          lastSuccessTime: circuitMetrics.lastSuccessTime
        }
      });
    }

    // Safe cache stats retrieval
    let cacheStats = null;
    try {
      if (this.cache && typeof this.cache.getStats === 'function') {
        cacheStats = this.cache.getStats();
      }
    } catch (error) {
      console.warn('[UnifiedAPIService] Error getting cache stats:', error);
    }
    
    const allCircuitBreakerStatuses = circuitBreakerManager.getAllStatuses();

    return {
      initialized: this.initialized,
      providers: providersStatus,
      cache: cacheStats,
      circuitBreakers: allCircuitBreakerStatuses,
      availableProviders: circuitBreakerManager.getAvailableProviders()
    };
  }

  // Circuit breaker management methods
  resetCircuitBreaker(providerName: ProviderName): void {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(providerName);
    circuitBreaker.reset();
    console.log(`[UnifiedAPIService] Circuit breaker reset for ${providerName}`);
  }

  resetAllCircuitBreakers(): void {
    circuitBreakerManager.resetAll();
    console.log('[UnifiedAPIService] All circuit breakers reset');
  }

  getCircuitBreakerStatus(providerName: ProviderName) {
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(providerName);
    return {
      state: circuitBreaker.getState(),
      metrics: circuitBreaker.getMetrics(),
      health: circuitBreaker.getHealthStatus(),
      isAvailable: circuitBreaker.isAvailable()
    };
  }
}