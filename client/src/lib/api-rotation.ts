// Smart API rotation system for maximum free tier usage with enhanced security
import { cacheManager } from './cache-manager';
import { dataSanitizer, DataClassification } from '../../../server/security/data-sanitizer';

interface APIProvider {
  name: string;
  baseUrl: string;
  dailyLimit: number;
  minuteLimit?: number;
  currentUsage: number;
  lastReset: number;
  apiKey?: string;
  enabled: boolean;
}

interface APICall {
  provider: string;
  endpoint: string;
  timestamp: number;
  success: boolean;
}

export class APIRotationManager {
  private providers: APIProvider[] = [
    {
      name: 'financialmodeling',
      baseUrl: 'https://financialmodelingprep.com/api/v3',
      dailyLimit: 250,
      currentUsage: 0,
      lastReset: Date.now(),
      apiKey: import.meta.env.VITE_FMP_API_KEY,
      enabled: true
    },
    {
      name: 'alphavantage',
      baseUrl: 'https://www.alphavantage.co/query',
      dailyLimit: 500,
      currentUsage: 0,
      lastReset: Date.now(),
      apiKey: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY,
      enabled: true
    },
    {
      name: 'iexcloud',
      baseUrl: 'https://cloud.iexapis.com/stable',
      dailyLimit: 3000, // 100k monthly = ~3k daily
      currentUsage: 0,
      lastReset: Date.now(),
      apiKey: import.meta.env.VITE_IEX_API_KEY,
      enabled: true
    },
    {
      name: 'finnhub',
      baseUrl: 'https://finnhub.io/api/v1',
      dailyLimit: 60 * 24 * 60, // 60 calls/min = ~86k daily theoretical
      minuteLimit: 60,
      currentUsage: 0,
      lastReset: Date.now(),
      apiKey: import.meta.env.VITE_FINNHUB_API_KEY,
      enabled: true
    }
  ];

  private callHistory: APICall[] = [];

  constructor() {
    this.loadUsageFromStorage();
    this.resetDailyLimitsIfNeeded();
  }

  private resetDailyLimitsIfNeeded(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    this.providers.forEach(provider => {
      if (now - provider.lastReset > oneDayMs) {
        provider.currentUsage = 0;
        provider.lastReset = now;
      }
    });
    
    this.saveUsageToStorage();
  }

  private loadUsageFromStorage(): void {
    try {
      const stored = localStorage.getItem('api-usage');
      if (stored) {
        const data = JSON.parse(stored);
        this.providers.forEach(provider => {
          const stored = data[provider.name];
          if (stored) {
            provider.currentUsage = stored.currentUsage;
            provider.lastReset = stored.lastReset;
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load API usage from storage:', error);
    }
  }

  private saveUsageToStorage(): void {
    try {
      const data: Record<string, any> = {};
      this.providers.forEach(provider => {
        data[provider.name] = {
          currentUsage: provider.currentUsage,
          lastReset: provider.lastReset
        };
      });
      localStorage.setItem('api-usage', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save API usage to storage:', error);
    }
  }

  private getAvailableProvider(): APIProvider | null {
    const availableProviders = this.providers.filter(provider => 
      provider.enabled && 
      provider.currentUsage < provider.dailyLimit &&
      provider.apiKey // Only use providers with API keys
    );

    if (availableProviders.length === 0) {
      return null;
    }

    // Sort by lowest usage percentage
    availableProviders.sort((a, b) => {
      const aUsagePercent = a.currentUsage / a.dailyLimit;
      const bUsagePercent = b.currentUsage / b.dailyLimit;
      return aUsagePercent - bUsagePercent;
    });

    return availableProviders[0];
  }

  async makeAPICall<T>(
    endpoint: string, 
    symbol: string,
    dataType: 'quote' | 'profile' | 'financials' | 'historical' | 'earnings' | 'news'
  ): Promise<T | null> {
    // Check cache first
    const cacheKey = `${dataType}-${symbol}-${endpoint}`;
    const cached = cacheManager.get<T>(cacheKey, dataType);
    
    if (cached) {
      console.log(`📦 Cache hit for ${symbol} ${dataType}`);
      return cached;
    }

    // Get available provider
    const provider = this.getAvailableProvider();
    
    if (!provider) {
      console.warn('🚫 No available API providers');
      return null;
    }

    try {
      const url = this.buildURL(provider, endpoint, symbol);
      console.log(`🔄 API call to ${provider.name} for ${symbol} ${dataType}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Sanitize financial data before processing
      const sanitizedData = dataSanitizer.sanitize(data, {
        classification: DataClassification.CONFIDENTIAL,
        maskPII: true,
        removeScripts: true,
        validateFinancialData: true,
        auditLog: true,
      }).sanitizedData;
      
      // Update usage
      provider.currentUsage++;
      this.saveUsageToStorage();
      
      // Log successful call with security audit
      this.callHistory.push({
        provider: provider.name,
        endpoint,
        timestamp: Date.now(),
        success: true
      });

      // Cache the sanitized result
      cacheManager.set(cacheKey, sanitizedData, dataType);
      
      return sanitizedData;
    } catch (error) {
      console.error(`❌ API call failed for ${provider.name}:`, error);
      
      // Log failed call
      this.callHistory.push({
        provider: provider.name,
        endpoint,
        timestamp: Date.now(),
        success: false
      });
      
      return null;
    }
  }

  private buildURL(provider: APIProvider, endpoint: string, symbol: string): string {
    switch (provider.name) {
      case 'financialmodeling':
        return `${provider.baseUrl}${endpoint}/${symbol}?apikey=${provider.apiKey}`;
      
      case 'alphavantage':
        return `${provider.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${provider.apiKey}`;
      
      case 'iexcloud':
        return `${provider.baseUrl}/stock/${symbol}${endpoint}?token=${provider.apiKey}`;
      
      case 'finnhub':
        return `${provider.baseUrl}${endpoint}?symbol=${symbol}&token=${provider.apiKey}`;
      
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  // Get usage statistics
  getUsageStats() {
    return {
      providers: this.providers.map(p => ({
        name: p.name,
        usage: p.currentUsage,
        limit: p.dailyLimit,
        percentage: Math.round((p.currentUsage / p.dailyLimit) * 100),
        enabled: p.enabled
      })),
      totalCalls: this.callHistory.length,
      successRate: this.callHistory.length > 0 
        ? Math.round((this.callHistory.filter(c => c.success).length / this.callHistory.length) * 100)
        : 0,
      cacheStats: cacheManager.getStats()
    };
  }

  // Force provider preference (for testing)
  setProviderPreference(providerName: string): void {
    this.providers.forEach(p => p.enabled = p.name === providerName);
  }

  // Reset all providers
  resetProviders(): void {
    this.providers.forEach(p => {
      p.enabled = true;
      p.currentUsage = 0;
      p.lastReset = Date.now();
    });
    this.saveUsageToStorage();
  }
}

// Global instance
export const apiRotation = new APIRotationManager();