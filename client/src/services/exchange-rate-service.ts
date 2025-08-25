/**
 * Exchange Rate Service
 * Handles fetching and caching of currency exchange rates
 */

import type { Currency, ExchangeRates } from '@/stores/app-store';

export interface ExchangeRateResponse {
  rates: ExchangeRates;
  timestamp: string;
  base: Currency;
}

class ExchangeRateService {
  private readonly baseUrl = 'https://api.exchangerate-api.com/v4/latest';
  private readonly fallbackUrl = 'https://api.fixer.io/latest';
  private cache: Map<string, { rates: ExchangeRates; timestamp: number }> = new Map();
  private readonly cacheExpiry = 60 * 60 * 1000; // 1 hour

  /**
   * Fetch exchange rates from primary API
   */
  async fetchRates(baseCurrency: Currency = 'USD'): Promise<ExchangeRateResponse> {
    const cacheKey = `rates-${baseCurrency}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return {
        rates: cached.rates,
        timestamp: new Date(cached.timestamp).toISOString(),
        base: baseCurrency,
      };
    }

    try {
      // Try primary API first
      const response = await this.fetchFromPrimary(baseCurrency);
      
      // Cache the response
      this.cache.set(cacheKey, {
        rates: response.rates,
        timestamp: Date.now(),
      });
      
      return response;
    } catch (error) {
      console.warn('Primary exchange rate API failed, trying fallback:', error);
      
      try {
        // Try fallback API
        const response = await this.fetchFromFallback(baseCurrency);
        
        // Cache the response
        this.cache.set(cacheKey, {
          rates: response.rates,
          timestamp: Date.now(),
        });
        
        return response;
      } catch (fallbackError) {
        console.error('All exchange rate APIs failed:', fallbackError);
        
        // Return cached data if available, even if expired
        if (cached) {
          console.warn('Using expired cached exchange rates');
          return {
            rates: cached.rates,
            timestamp: new Date(cached.timestamp).toISOString(),
            base: baseCurrency,
          };
        }
        
        // Return default rates as last resort
        return this.getDefaultRates(baseCurrency);
      }
    }
  }

  /**
   * Fetch from primary API (exchangerate-api.com)
   */
  private async fetchFromPrimary(baseCurrency: Currency): Promise<ExchangeRateResponse> {
    const response = await fetch(`${this.baseUrl}/${baseCurrency}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Invalid response format from exchange rate API');
    }

    return {
      rates: this.normalizeRates(data.rates, baseCurrency),
      timestamp: new Date().toISOString(),
      base: baseCurrency,
    };
  }

  /**
   * Fetch from fallback API (fixer.io)
   */
  private async fetchFromFallback(baseCurrency: Currency): Promise<ExchangeRateResponse> {
    // SECURITY: API key moved to backend - use proxy endpoint instead
  const apiKey = null; // API key handled by backend
    const url = apiKey 
      ? `${this.fallbackUrl}?access_key=${apiKey}&base=${baseCurrency}`
      : `${this.fallbackUrl}/${baseCurrency}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.rates) {
      throw new Error('Invalid response format from fallback exchange rate API');
    }

    return {
      rates: this.normalizeRates(data.rates, baseCurrency),
      timestamp: new Date().toISOString(),
      base: baseCurrency,
    };
  }

  /**
   * Normalize exchange rates to ensure all supported currencies are present
   */
  private normalizeRates(rates: any, baseCurrency: Currency): ExchangeRates {
    const supportedCurrencies: Currency[] = ['USD', 'EUR', 'GBP', 'JPY'];
    const normalizedRates: ExchangeRates = {};

    // Add base currency with rate 1
    normalizedRates[baseCurrency] = 1;

    // Add other currencies
    supportedCurrencies.forEach(currency => {
      if (currency !== baseCurrency) {
        normalizedRates[currency] = rates[currency] || this.getFallbackRate(baseCurrency, currency);
      }
    });

    return normalizedRates;
  }

  /**
   * Get fallback exchange rate for currency pairs
   */
  private getFallbackRate(fromCurrency: Currency, toCurrency: Currency): number {
    // These are approximate rates for fallback purposes
    const fallbackRates: Record<string, number> = {
      'USD-EUR': 0.85,
      'USD-GBP': 0.73,
      'USD-JPY': 110,
      'EUR-USD': 1.18,
      'EUR-GBP': 0.86,
      'EUR-JPY': 129,
      'GBP-USD': 1.37,
      'GBP-EUR': 1.16,
      'GBP-JPY': 151,
      'JPY-USD': 0.0091,
      'JPY-EUR': 0.0077,
      'JPY-GBP': 0.0066,
    };

    const key = `${fromCurrency}-${toCurrency}`;
    return fallbackRates[key] || 1;
  }

  /**
   * Get default exchange rates when all APIs fail
   */
  private getDefaultRates(baseCurrency: Currency): ExchangeRateResponse {
    console.warn('Using default exchange rates - may be outdated');
    
    const defaultRates: Record<Currency, ExchangeRates> = {
      USD: { USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110 },
      EUR: { USD: 1.18, EUR: 1, GBP: 0.86, JPY: 129 },
      GBP: { USD: 1.37, EUR: 1.16, GBP: 1, JPY: 151 },
      JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, JPY: 1 },
    };

    return {
      rates: defaultRates[baseCurrency],
      timestamp: new Date().toISOString(),
      base: baseCurrency,
    };
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const { rates } = await this.fetchRates('USD');
    
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    
    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} → ${toCurrency}`);
    }

    // Convert via USD
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const { rates } = await this.fetchRates('USD');
    
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    
    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} → ${toCurrency}`);
    }

    return toRate / fromRate;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): { [key: string]: { timestamp: number; age: number } } {
    const status: { [key: string]: { timestamp: number; age: number } } = {};
    
    this.cache.forEach((value, key) => {
      status[key] = {
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp,
      };
    });
    
    return status;
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();

// Export class for testing
export { ExchangeRateService };

// Export types for external use
export type { ExchangeRateResponse };