import type { Stock } from '../../shared/schema';

import { yahooFinanceService } from './yahoo-finance-service';
import { globalCache, DataType, CacheKeys } from '../cache/intelligent-cache-manager';
import { getSupabaseClient } from '../lib/supabase-client';
import { logger } from '../lib/logger';

// Server-side environment access with proper security and validation
const getServerEnvVar = (key: string, fallbackKey?: string): string => {
  const value = process.env[key];
  console.log(`🔍 Checking env var ${key}: ${value ? 'exists' : 'missing'}, length: ${value?.length || 0}`);
  
  if (!value || value === 'your_' + key.toLowerCase().replace('_api_key', '') + '_key_here') {
    if (fallbackKey) {
      const fallbackValue = process.env[fallbackKey];
      if (fallbackValue) {
        console.warn(`⚠️ Using fallback key for ${key}`);
        return fallbackValue;
      }
    }
    console.warn(`⚠️ WARNING: Missing or invalid environment variable: ${key}`);
    return 'demo';
  }
  return value;
};

const API_KEYS = {
  FINNHUB: getServerEnvVar('FINNHUB_API_KEY', 'FINNHUB_API_KEY_DEMO'),
  ALPHA_VANTAGE: getServerEnvVar('ALPHA_VANTAGE_API_KEY', 'ALPHA_VANTAGE_API_KEY_DEMO'),
  FMP: getServerEnvVar('FMP_API_KEY', 'FMP_API_KEY_DEMO'),
  TWELVE_DATA: getServerEnvVar('TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY_DEMO'),
};

// API Key validation
const isRealApiKey = (key: string): boolean => {
  return key !== 'demo' && 
         !key.startsWith('demo_') && 
         !key.includes('_here') &&
         key.length > 10;
};

interface QuotaStatus {
  provider: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export class ServerMarketDataService {
  private quotaTracker: Map<string, QuotaStatus> = new Map();

  constructor() {
    this.initializeQuotaTracking();
  }

  private initializeQuotaTracking(): void {
    this.quotaTracker.set('twelvedata', {
      provider: 'twelvedata',
      used: 0,
      limit: 800,
      remaining: 800,
      resetAt: this.getNextMidnight()
    });

    this.quotaTracker.set('fmp', {
      provider: 'fmp',
      used: 0,
      limit: 250,
      remaining: 250,
      resetAt: this.getNextMidnight()
    });

    this.quotaTracker.set('finnhub', {
      provider: 'finnhub',
      used: 0,
      limit: 3600, // 60 per minute
      remaining: 3600,
      resetAt: this.getNextMidnight()
    });

    this.quotaTracker.set('alphavantage', {
      provider: 'alphavantage',
      used: 0,
      limit: 25,
      remaining: 25,
      resetAt: this.getNextMidnight()
    });
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  async getRealTimeQuote(symbol: string): Promise<Stock | null> {
    // Use intelligent cache system
    const cacheKey = CacheKeys.realtimePrice(symbol);
    const cached = globalCache.get<Stock>(cacheKey, DataType.REAL_TIME_PRICE);
    
    if (cached) {
      console.log(`📦 Returning cached quote for ${symbol}`);
      return cached;
    }

    console.log(`🔍 Fetching real-time quote for ${symbol}`);
    console.log(`🔑 API Key Status: FH:${isRealApiKey(API_KEYS.FINNHUB)}, AV:${isRealApiKey(API_KEYS.ALPHA_VANTAGE)}, FMP:${isRealApiKey(API_KEYS.FMP)}, TD:${isRealApiKey(API_KEYS.TWELVE_DATA)}`);

    const providers = [
      { name: 'twelvedata', fn: () => this.fetchTwelveDataQuote(symbol), hasRealKey: isRealApiKey(API_KEYS.TWELVE_DATA) },
      { name: 'fmp', fn: () => this.fetchFMPQuote(symbol), hasRealKey: isRealApiKey(API_KEYS.FMP) },
      { name: 'finnhub', fn: () => this.fetchFinnhubQuote(symbol), hasRealKey: isRealApiKey(API_KEYS.FINNHUB) },
      { name: 'alphavantage', fn: () => this.fetchAlphaVantageQuote(symbol), hasRealKey: isRealApiKey(API_KEYS.ALPHA_VANTAGE) }
    ];

    // Sort providers: real API keys first, then demo keys
    providers.sort((a, b) => {
      if (a.hasRealKey && !b.hasRealKey) return -1;
      if (!a.hasRealKey && b.hasRealKey) return 1;
      return 0;
    });

    const errors: Record<string, string> = {};

    for (const provider of providers) {
      try {
        const quota = this.quotaTracker.get(provider.name);
        if (quota && quota.remaining <= 0) {
          console.log(`⚠️ Quota exhausted for ${provider.name}`);
          errors[provider.name] = 'Quota exhausted';
          continue;
        }

        console.log(`🚀 Trying ${provider.name} (${provider.hasRealKey ? 'real key' : 'demo key'})`);
        const quote = await provider.fn();
        
        if (quote) {
          console.log(`✅ Successfully fetched ${symbol} from ${provider.name}`);
          this.incrementQuota(provider.name);
          
          const enrichedQuote = { ...quote, provider: provider.name };
          
          // Store in intelligent cache with appropriate data type
          globalCache.set(
            cacheKey, 
            enrichedQuote, 
            DataType.REAL_TIME_PRICE, 
            provider.name
          );
          
          // AGENT 5: Broadcast to Supabase Realtime
          await this.broadcastRealtimeUpdate(enrichedQuote);
          
          return enrichedQuote;
        } else {
          errors[provider.name] = 'No data returned';
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ ${provider.name} failed for ${symbol}:`, errorMsg);
        errors[provider.name] = errorMsg;
        continue;
      }
    }

    // Final fallback to Yahoo Finance (no API key required)
    try {
      console.log(`🔄 Final fallback: Yahoo Finance for ${symbol}`);
      const yahooQuote = await yahooFinanceService.getQuote(symbol);
      if (yahooQuote) {
        console.log(`✅ Yahoo Finance success for ${symbol}`);
        const enrichedQuote = { ...yahooQuote, provider: 'yahoo' };
        
        globalCache.set(
          cacheKey, 
          enrichedQuote, 
          DataType.REAL_TIME_PRICE, 
          'yahoo'
        );
        
        // AGENT 5: Broadcast to Supabase Realtime
        await this.broadcastRealtimeUpdate(enrichedQuote);
        
        return enrichedQuote;
      } else {
        errors['yahoo'] = 'No data returned';
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Yahoo Finance failed for ${symbol}:`, errorMsg);
      errors['yahoo'] = errorMsg;
    }

    console.error(`🚫 All providers failed for ${symbol}. Errors:`, JSON.stringify(errors, null, 2));
    return null;
  }

  private async fetchTwelveDataQuote(symbol: string): Promise<Stock | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${API_KEYS.TWELVE_DATA}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);

      if (!response.ok) return null;

      const data = await response.json();
      if (data.code === 400 || data.code === 401) {
        console.warn('Twelve Data API error:', data.message);
        return null;
      }

      return {
        id: 0,
        symbol: data.symbol,
        name: data.name || symbol,
        price: parseFloat(data.close),
        previousClose: parseFloat(data.previous_close),
        change: parseFloat(data.change),
        changePercent: parseFloat(data.percent_change),
        volume: parseInt(data.volume) || 0,
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        open: parseFloat(data.open),
        marketCap: "0",
        week52High: parseFloat(data.fifty_two_week?.high) || 0,
        week52Low: parseFloat(data.fifty_two_week?.low) || 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      } as Stock;
    } catch (error) {
      console.error('Twelve Data API error:', error);
      return null;
    }
  }

  private async fetchFinnhubQuote(symbol: string): Promise<Stock | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEYS.FINNHUB}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        id: 0,
        symbol: symbol,
        name: symbol,
        price: data.c,
        previousClose: data.pc,
        change: data.d,
        changePercent: data.dp,
        volume: 0,
        high: data.h,
        low: data.l,
        open: data.o,
        marketCap: "0",
        week52High: 0,
        week52Low: 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      } as Stock;
    } catch (error) {
      throw new Error(`Finnhub API error: ${error.message}`);
    }
  }

  private async fetchFMPQuote(symbol: string): Promise<Stock | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${API_KEYS.FMP}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data returned');
      }

      const quote = data[0];

      return {
        id: 0,
        symbol: quote.symbol,
        name: quote.name || quote.symbol,
        price: quote.price,
        previousClose: quote.previousClose,
        change: quote.change,
        changePercent: quote.changesPercentage,
        volume: quote.volume,
        high: quote.dayHigh,
        low: quote.dayLow,
        open: quote.open,
        marketCap: quote.marketCap?.toString() || "0",
        week52High: quote.yearHigh || 0,
        week52Low: quote.yearLow || 0,
        sector: '',
        industry: null,
        eps: quote.eps || null,
        peRatio: quote.pe || null,
        logo: null,
        lastUpdated: new Date()
      } as Stock;
    } catch (error) {
      throw new Error(`FMP API error: ${error.message}`);
    }
  }

  private async fetchAlphaVantageQuote(symbol: string): Promise<Stock | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout (AlphaVantage is slower)
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEYS.ALPHA_VANTAGE}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data['Error Message'] || data['Note']) {
        throw new Error(data['Error Message'] || data['Note']);
      }

      const quote = data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data returned');
      }

      return {
        id: 0,
        symbol: quote['01. symbol'],
        name: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        previousClose: parseFloat(quote['08. previous close']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        marketCap: "0",
        week52High: 0,
        week52Low: 0,
        sector: '',
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      } as Stock;
    } catch (error) {
      throw new Error(`Alpha Vantage API error: ${error.message}`);
    }
  }

  private incrementQuota(provider: string): void {
    const quota = this.quotaTracker.get(provider);
    if (quota) {
      quota.used++;
      quota.remaining = Math.max(0, quota.limit - quota.used);
    }
  }

  getQuotaStatus(): Map<string, QuotaStatus> {
    return this.quotaTracker;
  }

  async getBatchQuotes(symbols: string[]): Promise<Stock[]> {
    const quotes = await Promise.all(
      symbols.map(symbol => this.getRealTimeQuote(symbol))
    );
    return quotes.filter(quote => quote !== null) as Stock[];
  }

  async warmCache(symbols: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${symbols.length} symbols`);
    await Promise.all(
      symbols.map(symbol => this.getRealTimeQuote(symbol))
    );
    
    // Also warm the global cache
    await globalCache.warmCache(symbols);
  }

  getApiStatus() {
    const providers = ['finnhub', 'alphaVantage', 'fmp', 'twelveData'];
    const availableProviders = [];
    
    if (isRealApiKey(API_KEYS.FINNHUB)) availableProviders.push('finnhub');
    if (isRealApiKey(API_KEYS.ALPHA_VANTAGE)) availableProviders.push('alphaVantage');
    if (isRealApiKey(API_KEYS.FMP)) availableProviders.push('fmp');
    if (isRealApiKey(API_KEYS.TWELVE_DATA)) availableProviders.push('twelveData');
    
    // Always add Yahoo Finance as it doesn't require API key
    availableProviders.push('yahoo');
    
    return {
      availableProviders,
      apiKeys: {
        finnhub: { 
          configured: API_KEYS.FINNHUB !== 'demo',
          isReal: isRealApiKey(API_KEYS.FINNHUB),
          masked: API_KEYS.FINNHUB.substring(0, 8) + '...',
          keyLength: API_KEYS.FINNHUB.length
        },
        alphaVantage: { 
          configured: API_KEYS.ALPHA_VANTAGE !== 'demo',
          isReal: isRealApiKey(API_KEYS.ALPHA_VANTAGE),
          masked: API_KEYS.ALPHA_VANTAGE.substring(0, 8) + '...',
          keyLength: API_KEYS.ALPHA_VANTAGE.length
        },
        fmp: { 
          configured: API_KEYS.FMP !== 'demo',
          isReal: isRealApiKey(API_KEYS.FMP),
          masked: API_KEYS.FMP.substring(0, 8) + '...',
          keyLength: API_KEYS.FMP.length
        },
        twelveData: { 
          configured: API_KEYS.TWELVE_DATA !== 'demo',
          isReal: isRealApiKey(API_KEYS.TWELVE_DATA),
          masked: API_KEYS.TWELVE_DATA.substring(0, 8) + '...',
          keyLength: API_KEYS.TWELVE_DATA.length
        }
      },
      quotas: Object.fromEntries(this.quotaTracker),
      cache: globalCache.getStats()
    };
  }

  async testApiConnections(): Promise<any> {
    const testSymbol = 'AAPL';
    const results = {
      yahoo: { status: 'testing', data: null, error: null },
      twelvedata: { status: 'testing', data: null, error: null },
      fmp: { status: 'testing', data: null, error: null },
      finnhub: { status: 'testing', data: null, error: null },
      alphavantage: { status: 'testing', data: null, error: null }
    };

    // Test Yahoo Finance
    try {
      const yahooQuote = await yahooFinanceService.getQuote(testSymbol);
      results.yahoo = { status: 'success', data: yahooQuote, error: null };
    } catch (error) {
      results.yahoo = { status: 'failed', data: null, error: error.message };
    }

    // Test other providers
    const tests = [
      { name: 'twelvedata', fn: () => this.fetchTwelveDataQuote(testSymbol) },
      { name: 'fmp', fn: () => this.fetchFMPQuote(testSymbol) },
      { name: 'finnhub', fn: () => this.fetchFinnhubQuote(testSymbol) },
      { name: 'alphavantage', fn: () => this.fetchAlphaVantageQuote(testSymbol) }
    ];

    await Promise.all(tests.map(async test => {
      try {
        const quote = await test.fn();
        results[test.name] = { status: 'success', data: quote, error: null };
      } catch (error) {
        results[test.name] = { status: 'failed', data: null, error: error.message };
      }
    }));

    return results;
  }

  /**
   * AGENT 5: Broadcast real-time quote updates to Supabase Realtime
   */
  private async broadcastRealtimeUpdate(quote: Stock): Promise<void> {
    try {
      // Insert into realtime_quotes table which triggers Supabase Realtime
      const { error } = await supabase
        .from('realtime_quotes')
        .insert({
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          change_percent: quote.changePercent,
          volume: quote.volume,
          timestamp: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to broadcast realtime update:', error);
      } else {
        logger.info(`📡 Broadcasted realtime update for ${quote.symbol}`);
      }
    } catch (error) {
      logger.error('Error broadcasting realtime update:', error);
    }
  }
}

// Export class for use in other modules
export { ServerMarketDataService as MarketDataService };