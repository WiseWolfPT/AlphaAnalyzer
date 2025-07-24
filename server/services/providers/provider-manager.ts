/**
 * Provider Manager for Market Data APIs
 * Implements fallback logic between multiple providers
 */

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  marketCap?: number;
  eps?: number;
  pe?: number;
  timestamp: string;
  provider: string;
}

export interface MarketStatus {
  market: string;
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
  timezone: string;
  provider: string;
}

export interface ChartData {
  symbol: string;
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  period: string;
  provider: string;
}

export abstract class BaseProvider {
  protected apiKey: string;
  protected baseUrl: string;
  protected name: string;
  protected quotaRemaining: number = Infinity;
  protected lastQuotaReset: Date = new Date();

  constructor(apiKey: string, baseUrl: string, name: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.name = name;
  }

  abstract getQuote(symbol: string): Promise<StockQuote>;
  abstract getBatchQuotes(symbols: string[]): Promise<StockQuote[]>;
  abstract getMarketStatus(): Promise<MarketStatus>;
  abstract getChartData(symbol: string, period: string): Promise<ChartData>;
  
  // Quota management
  checkQuota(): boolean {
    return this.quotaRemaining > 0;
  }

  updateQuota(remaining: number): void {
    this.quotaRemaining = remaining;
  }

  getName(): string {
    return this.name;
  }

  // Helper method to handle common API errors
  protected handleApiError(error: any, operation: string): never {
    console.error(`[${this.name}] Error in ${operation}:`, error);
    
    if (error.response?.status === 429) {
      throw new Error(`Rate limit exceeded for ${this.name}`);
    }
    
    if (error.response?.status === 401) {
      throw new Error(`Invalid API key for ${this.name}`);
    }
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Timeout error for ${this.name}`);
    }
    
    throw new Error(`${this.name} API error: ${error.message || 'Unknown error'}`);
  }
}

export class ProviderManager {
  private providers: BaseProvider[] = [];
  private currentProviderIndex = 0;
  private providerHealth: Map<string, { failures: number; lastFailure: Date | null }> = new Map();
  private maxFailures = 5;
  private healthResetTime = 5 * 60 * 1000; // 5 minutes

  addProvider(provider: BaseProvider): void {
    this.providers.push(provider);
    this.providerHealth.set(provider.getName(), { failures: 0, lastFailure: null });
  }

  private isProviderHealthy(provider: BaseProvider): boolean {
    const health = this.providerHealth.get(provider.getName());
    if (!health) return true;

    // Reset health if enough time has passed
    if (health.lastFailure && Date.now() - health.lastFailure.getTime() > this.healthResetTime) {
      health.failures = 0;
      health.lastFailure = null;
    }

    return health.failures < this.maxFailures;
  }

  private recordFailure(provider: BaseProvider): void {
    const health = this.providerHealth.get(provider.getName());
    if (health) {
      health.failures++;
      health.lastFailure = new Date();
    }
  }

  private recordSuccess(provider: BaseProvider): void {
    const health = this.providerHealth.get(provider.getName());
    if (health && health.failures > 0) {
      health.failures = Math.max(0, health.failures - 1);
    }
  }

  async getQuoteWithFallback(symbol: string): Promise<StockQuote> {
    const errors: Error[] = [];
    const triedProviders: string[] = [];

    // Try providers in order: Polygon → Alpha Vantage → Finnhub → Twelve Data
    const providerOrder = ['polygon', 'alpha_vantage', 'finnhub', 'twelve_data', 'fmp'];
    
    for (const providerName of providerOrder) {
      const provider = this.providers.find(p => p.getName() === providerName);
      if (!provider) continue;
      
      if (!this.isProviderHealthy(provider) || !provider.checkQuota()) {
        console.log(`Skipping unhealthy/quota-exceeded provider: ${provider.getName()}`);
        continue;
      }
      
      try {
        console.log(`Trying provider: ${provider.getName()} for ${symbol}`);
        const quote = await provider.getQuote(symbol);
        
        this.recordSuccess(provider);
        
        return quote;
      } catch (error) {
        console.error(`Provider ${provider.getName()} failed:`, error);
        this.recordFailure(provider);
        errors.push(error as Error);
        triedProviders.push(provider.getName());
      }
    }

    throw new Error(`All providers failed for ${symbol}. Tried: ${triedProviders.join(', ')}. Errors: ${errors.map(e => e.message).join(', ')}`);
  }

  async getBatchQuotesWithFallback(symbols: string[]): Promise<StockQuote[]> {
    const errors: Error[] = [];

    // Try providers that support batch requests first
    const batchProviders = this.providers.filter(p => 
      ['polygon', 'finnhub', 'twelve_data'].includes(p.getName())
    );

    for (const provider of batchProviders) {
      if (!this.isProviderHealthy(provider) || !provider.checkQuota()) {
        continue;
      }

      try {
        console.log(`Trying batch fetch with ${provider.getName()}`);
        const quotes = await provider.getBatchQuotes(symbols);
        this.recordSuccess(provider);
        return quotes;
      } catch (error) {
        console.error(`Batch provider ${provider.getName()} failed:`, error);
        this.recordFailure(provider);
        errors.push(error as Error);
      }
    }

    // Fallback: fetch individually with request coalescing
    console.log('Batch fetch failed, trying individual fetches with coalescing...');
    
    // Group requests to avoid overwhelming providers
    const batchSize = 5;
    const results: StockQuote[] = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const quotes = await Promise.allSettled(
        batch.map(symbol => this.getQuoteWithFallback(symbol))
      );

      for (const result of quotes) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  async getMarketStatusWithFallback(market: string = 'US'): Promise<MarketStatus> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      if (!this.isProviderHealthy(provider)) {
        continue;
      }

      try {
        const status = await provider.getMarketStatus();
        this.recordSuccess(provider);
        return status;
      } catch (error) {
        this.recordFailure(provider);
        errors.push(error as Error);
      }
    }

    // Return calculated status if all providers fail
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Simple US market hours check (9:30 AM - 4:00 PM ET)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21; // Approximate ET in UTC
    
    return {
      market,
      isOpen: isWeekday && isMarketHours,
      timezone: 'America/New_York',
      provider: 'calculated'
    };
  }

  async getChartDataWithFallback(symbol: string, period: string): Promise<ChartData> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      if (!this.isProviderHealthy(provider) || !provider.checkQuota()) {
        continue;
      }

      try {
        const chartData = await provider.getChartData(symbol, period);
        this.recordSuccess(provider);
        return chartData;
      } catch (error) {
        this.recordFailure(provider);
        errors.push(error as Error);
      }
    }

    throw new Error(`All providers failed for chart data. Errors: ${errors.map(e => e.message).join(', ')}`);
  }

  getProviderStatus(): { provider: string; healthy: boolean; failures: number }[] {
    return this.providers.map(provider => {
      const health = this.providerHealth.get(provider.getName())!;
      return {
        provider: provider.getName(),
        healthy: this.isProviderHealthy(provider),
        failures: health.failures
      };
    });
  }

  resetProviderHealth(providerName?: string): void {
    if (providerName) {
      const health = this.providerHealth.get(providerName);
      if (health) {
        health.failures = 0;
        health.lastFailure = null;
      }
    } else {
      // Reset all providers
      this.providerHealth.forEach(health => {
        health.failures = 0;
        health.lastFailure = null;
      });
    }
  }
}