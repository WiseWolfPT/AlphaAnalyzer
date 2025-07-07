/**
 * Exchange Rate Service - Wave 3 Implementation
 * 
 * Dynamic currency exchange rate service for USD/EUR conversion
 * Replaces static rates with live API integration
 */

import { CacheManager } from '@/lib/cache-manager';

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  timestamp: number;
}

export interface ExchangeRateProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  free: boolean;
  rateLimit: string;
}

export class ExchangeRateService {
  private cache: CacheManager;
  private providers: ExchangeRateProvider[];
  private currentProviderIndex: number = 0;
  private cacheKey = 'exchange-rates';
  private cacheDuration = 60 * 60 * 1000; // 1 hour cache

  constructor(cache?: CacheManager) {
    this.cache = cache || new CacheManager();
    this.providers = this.initializeProviders();
  }

  private initializeProviders(): ExchangeRateProvider[] {
    return [
      {
        name: 'exchangerate-api.com',
        baseUrl: 'https://api.exchangerate-api.com/v4/latest',
        free: true,
        rateLimit: '1500 requests/month'
      },
      {
        name: 'fixer.io',
        baseUrl: 'https://api.fixer.io/latest',
        free: true,
        rateLimit: '100 requests/month'
      },
      {
        name: 'European Central Bank',
        baseUrl: 'https://api.exchangerate.host/latest',
        free: true,
        rateLimit: 'No limit'
      },
      {
        name: 'currencyapi.com',
        baseUrl: 'https://api.currencyapi.com/v3/latest',
        free: true,
        rateLimit: '300 requests/month'
      }
    ];
  }

  /**
   * Get current exchange rates with automatic provider fallback
   */
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates | null> {
    // Check cache first
    const cacheKey = `${this.cacheKey}:${baseCurrency}`;
    const cached = await this.cache.getAsync(cacheKey);
    
    if (cached && this.isCacheValid(cached as ExchangeRates)) {
      console.log(`💰 Using cached exchange rates for ${baseCurrency}`);
      return cached as ExchangeRates;
    }

    // Try each provider in order
    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentProviderIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];
      
      try {
        console.log(`🔄 Fetching exchange rates from ${provider.name}...`);
        const rates = await this.fetchFromProvider(provider, baseCurrency);
        
        if (rates) {
          // Cache successful result
          await this.cache.setAsync(cacheKey, rates, this.cacheDuration);
          
          // Update current provider for next request
          this.currentProviderIndex = providerIndex;
          
          console.log(`✅ Exchange rates fetched successfully from ${provider.name}`);
          return rates;
        }
      } catch (error) {
        console.warn(`❌ Provider ${provider.name} failed:`, error);
        continue;
      }
    }

    console.error('❌ All exchange rate providers failed, using fallback rates');
    return this.getFallbackRates(baseCurrency);
  }

  /**
   * Fetch rates from a specific provider
   */
  private async fetchFromProvider(
    provider: ExchangeRateProvider, 
    baseCurrency: string
  ): Promise<ExchangeRates | null> {
    const url = `${provider.baseUrl}/${baseCurrency}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Alfalyzer/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Normalize response format across providers
      return this.normalizeResponse(data, provider.name, baseCurrency);
      
    } catch (error) {
      console.error(`Provider ${provider.name} request failed:`, error);
      return null;
    }
  }

  /**
   * Normalize different provider response formats
   */
  private normalizeResponse(
    data: any, 
    providerName: string, 
    baseCurrency: string
  ): ExchangeRates | null {
    try {
      switch (providerName) {
        case 'exchangerate-api.com':
        case 'European Central Bank':
          return {
            base: data.base || baseCurrency,
            date: data.date || new Date().toISOString().split('T')[0],
            rates: data.rates || {},
            timestamp: Date.now()
          };

        case 'fixer.io':
          return {
            base: data.base || baseCurrency,
            date: data.date || new Date().toISOString().split('T')[0],
            rates: data.rates || {},
            timestamp: Date.now()
          };

        case 'currencyapi.com':
          // CurrencyAPI has a different structure
          const rates: Record<string, number> = {};
          if (data.data) {
            Object.entries(data.data).forEach(([currency, info]: [string, any]) => {
              rates[currency] = info.value;
            });
          }
          return {
            base: baseCurrency,
            date: new Date().toISOString().split('T')[0],
            rates,
            timestamp: Date.now()
          };

        default:
          console.warn(`Unknown provider format: ${providerName}`);
          return null;
      }
    } catch (error) {
      console.error(`Failed to normalize response from ${providerName}:`, error);
      return null;
    }
  }

  /**
   * Check if cached rates are still valid
   */
  private isCacheValid(rates: ExchangeRates): boolean {
    const ageInMs = Date.now() - rates.timestamp;
    return ageInMs < this.cacheDuration;
  }

  /**
   * Fallback rates when all providers fail
   */
  private getFallbackRates(baseCurrency: string): ExchangeRates {
    console.log(`🔄 Using fallback exchange rates for ${baseCurrency}`);
    
    // Static rates as fallback (should be updated periodically)
    const fallbackRates: Record<string, Record<string, number>> = {
      'USD': {
        'EUR': 0.92,
        'GBP': 0.79,
        'CHF': 0.88,
        'CAD': 1.36,
        'AUD': 1.52,
        'JPY': 149.50
      },
      'EUR': {
        'USD': 1.08,
        'GBP': 0.86,
        'CHF': 0.96,
        'CAD': 1.47,
        'AUD': 1.65,
        'JPY': 162.30
      }
    };

    return {
      base: baseCurrency,
      date: new Date().toISOString().split('T')[0],
      rates: fallbackRates[baseCurrency] || {},
      timestamp: Date.now()
    };
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      const rates = await this.getExchangeRates(fromCurrency);
      
      if (!rates || !rates.rates[toCurrency]) {
        console.warn(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
        return amount; // Return original amount if conversion fails
      }

      const convertedAmount = amount * rates.rates[toCurrency];
      console.debug(`💱 Converted ${amount} ${fromCurrency} to ${convertedAmount.toFixed(4)} ${toCurrency}`);
      
      return convertedAmount;
    } catch (error) {
      console.error('Currency conversion failed:', error);
      return amount;
    }
  }

  /**
   * Get specific exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    try {
      const rates = await this.getExchangeRates(fromCurrency);
      return rates?.rates[toCurrency] || null;
    } catch (error) {
      console.error(`Failed to get exchange rate ${fromCurrency}/${toCurrency}:`, error);
      return null;
    }
  }

  /**
   * Warm cache with popular currency pairs
   */
  async warmCache(): Promise<void> {
    const popularBases = ['USD', 'EUR'];
    
    await Promise.allSettled(
      popularBases.map(base => this.getExchangeRates(base))
    );
    
    console.log('💰 Exchange rate cache warmed for popular currencies');
  }

  /**
   * Force refresh rates (bypass cache)
   */
  async forceRefresh(baseCurrency: string = 'USD'): Promise<ExchangeRates | null> {
    const cacheKey = `${this.cacheKey}:${baseCurrency}`;
    await this.cache.deleteAsync(cacheKey);
    return this.getExchangeRates(baseCurrency);
  }

  /**
   * Get service status and provider info
   */
  getStatus(): {
    currentProvider: string;
    totalProviders: number;
    cacheStatus: string;
  } {
    return {
      currentProvider: this.providers[this.currentProviderIndex]?.name || 'None',
      totalProviders: this.providers.length,
      cacheStatus: 'Active'
    };
  }
}