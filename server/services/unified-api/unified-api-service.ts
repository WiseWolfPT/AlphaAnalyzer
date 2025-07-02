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

export class UnifiedAPIService {
  private providers: Map<ProviderName, IMarketDataProvider> = new Map();
  private cache = getCache();
  private quotaTracker = getQuotaTracker();
  private initialized = false;

  async initialize(providers: IMarketDataProvider[]): Promise<void> {
    console.log('[UnifiedAPIService] Initializing with providers:', providers.map(p => p.name));
    
    // Register providers
    for (const provider of providers) {
      this.providers.set(provider.name, provider);
      await provider.initialize();
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
          const batchResults = await batchProvider.getBatchPrices(uncachedSymbols);
          
          // Cache individual results
          for (const result of batchResults) {
            await this.cache.set(`price:${result.symbol}`, result, CACHE_TTL.PRICE);
            results.push(result);
          }
          
          await this.quotaTracker.recordCall(batchProvider.name, 'batch-prices');
        } catch (error) {
          console.error('[UnifiedAPIService] Batch request failed, falling back to individual requests');
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

      // Check quota
      const canUse = await this.quotaTracker.canUseProvider(providerName as ProviderName);
      if (!canUse) {
        console.log(`[UnifiedAPIService] Skipping ${providerName} - quota exceeded`);
        continue;
      }

      try {
        console.log(`[UnifiedAPIService] Trying ${providerName} for ${dataType}`);
        const result = await operation(provider);
        
        // Record successful call
        await this.quotaTracker.recordCall(providerName as ProviderName, dataType);
        
        return result;
      } catch (error: any) {
        console.error(`[UnifiedAPIService] ${providerName} failed:`, error.message);
        errors.push(error);
        
        // If rate limited, don't try again
        if (error.message.includes('Rate limit')) {
          continue;
        }
      }
    }

    // All providers failed
    throw new Error(`All providers failed for ${dataType}. Errors: ${errors.map(e => e.message).join(', ')}`);
  }

  private async findProviderWithCapability(
    dataType: DataType,
    capabilityCheck: (provider: IMarketDataProvider) => boolean
  ): Promise<IMarketDataProvider | null> {
    const eligibleProviders = DATA_TYPE_PROVIDERS[dataType] || [];
    
    for (const providerName of eligibleProviders) {
      const provider = this.providers.get(providerName as ProviderName);
      
      if (provider && provider.canHandle(dataType) && capabilityCheck(provider)) {
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
      
      providersStatus.push({
        name,
        healthy,
        usage
      });
    }

    const cacheStats = (this.cache as any).getCacheStats ? (this.cache as any).getCacheStats() : null;

    return {
      initialized: this.initialized,
      providers: providersStatus,
      cache: cacheStats
    };
  }
}