import { FMPService } from './fmp-service';
import { TwelveDataService } from './twelve-data-service';
import { FinnhubService } from '@/services/finnhub-enhanced';
import { AlphaVantageService } from '@/services/alpha-vantage-enhanced';
import { CacheManager } from '@/lib/cache-manager';
import type { Stock, IntrinsicValue } from '@shared/schema';

export interface MarketDataProvider {
  realtime: TwelveDataService;
  fundamentals: FMPService;
  backup: any; // FinnhubService;
  deep: any; // AlphaVantageService;
}

export interface QuotaStatus {
  provider: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export class MarketDataOrchestrator {
  private providers: MarketDataProvider;
  private cache: CacheManager;
  private quotaTracker: Map<string, QuotaStatus> = new Map();

  constructor(cache?: CacheManager) {
    this.cache = cache || new CacheManager();
    
    this.providers = {
      realtime: new TwelveDataService(this.cache),
      fundamentals: new FMPService(this.cache),
      backup: {} as any, // placeholder for finnhub
      deep: {} as any // placeholder for alpha vantage
    };

    this.initializeQuotaTracking();
  }

  private initializeQuotaTracking(): void {
    // Initialize quota tracking for each provider
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
      limit: 60 * 60 * 24, // 60 per minute = ~86,400 per day
      remaining: 60 * 60 * 24,
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

  private incrementQuota(provider: string): void {
    const quota = this.quotaTracker.get(provider);
    if (quota) {
      quota.used++;
      quota.remaining = Math.max(0, quota.limit - quota.used);
      
      // Reset if past reset time
      if (new Date() > quota.resetAt) {
        quota.used = 1;
        quota.remaining = quota.limit - 1;
        quota.resetAt = this.getNextMidnight();
      }
    }
  }

  async getRealTimeQuote(symbol: string): Promise<Stock | null> {
    const cacheKey = `orchestrator:quote:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as Stock;

    try {
      // Try Twelve Data first (best for real-time)
      const twelveQuota = this.quotaTracker.get('twelvedata');
      if (twelveQuota && twelveQuota.remaining > 0) {
        const quote = await this.providers.realtime.getQuote(symbol);
        if (quote) {
          this.incrementQuota('twelvedata');
          const stock = await this.providers.realtime.convertToStock(quote);
          await this.cache.set(cacheKey, stock, 60 * 1000); // Cache for 1 minute
          return stock as Stock;
        }
      }

      // Fallback to Finnhub (currently disabled)
      // const finnhubQuota = this.quotaTracker.get('finnhub');
      // if (finnhubQuota && finnhubQuota.remaining > 0) {
      //   const quote = await this.providers.backup.getQuote(symbol);
      //   if (quote) {
      //     this.incrementQuota('finnhub');
      //     await this.cache.set(cacheKey, quote, 60 * 1000);
      //     return quote;
      //   }
      // }

      // Last resort: Alpha Vantage (currently disabled)
      // const alphaQuota = this.quotaTracker.get('alphavantage');
      // if (alphaQuota && alphaQuota.remaining > 0) {
      //   const quote = await this.providers.deep.getGlobalQuote(symbol);
      //   if (quote) {
      //     this.incrementQuota('alphavantage');
      //     await this.cache.set(cacheKey, quote, 60 * 1000);
      //     return quote;
      //   }
      // }

      return null;
    } catch (error) {
      console.error('MarketDataOrchestrator getRealTimeQuote error:', error);
      return null;
    }
  }

  async getFundamentals(symbol: string): Promise<Partial<IntrinsicValue> | null> {
    const cacheKey = `orchestrator:fundamentals:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as Partial<IntrinsicValue>;

    try {
      // Try FMP first (best for fundamentals)
      const fmpQuota = this.quotaTracker.get('fmp');
      if (fmpQuota && fmpQuota.remaining > 0) {
        const fundamentals = await this.providers.fundamentals.getIntrinsicValueData(symbol);
        if (fundamentals) {
          this.incrementQuota('fmp');
          await this.cache.set(cacheKey, fundamentals, 24 * 60 * 60 * 1000); // Cache for 24 hours
          return fundamentals;
        }
      }

      // Fallback to Alpha Vantage for deep fundamentals (currently disabled)
      // const alphaQuota = this.quotaTracker.get('alphavantage');
      // if (alphaQuota && alphaQuota.remaining > 0) {
      //   const overview = await this.providers.deep.getCompanyOverview(symbol);
      //   if (overview) {
      //     this.incrementQuota('alphavantage');
      //     
      //     // Convert to IntrinsicValue format
      //     const fundamentals: Partial<IntrinsicValue> = {
      //       stockSymbol: symbol,
      //       currentPrice: parseFloat(overview['50DayMovingAverage'] || '0'),
      //       eps: parseFloat(overview.EPS || '0'),
      //       peMultiple: parseFloat(overview.PERatio || '0'),
      //       bookValue: parseFloat(overview.BookValue || '0'),
      //       roe: parseFloat(overview.ReturnOnEquityTTM || '0') * 100,
      //       debtToEquity: parseFloat(overview.DebtToEquityRatio || '0'),
      //       revenue: parseFloat(overview.RevenueTTM || '0'),
      //       marketCap: parseFloat(overview.MarketCapitalization || '0'),
      //     };
      //     
      //     await this.cache.set(cacheKey, fundamentals, 24 * 60 * 60 * 1000);
      //     return fundamentals;
      //   }
      // }

      // Last resort: Finnhub basic fundamentals (currently disabled)
      // const finnhubQuota = this.quotaTracker.get('finnhub');
      // if (finnhubQuota && finnhubQuota.remaining > 0) {
      //   const metrics = await this.providers.backup.getBasicFinancials(symbol);
      //   if (metrics) {
      //     this.incrementQuota('finnhub');
      //     await this.cache.set(cacheKey, metrics, 24 * 60 * 60 * 1000);
      //     return metrics;
      //   }
      // }

      return null;
    } catch (error) {
      console.error('MarketDataOrchestrator getFundamentals error:', error);
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, Stock>> {
    const result: Record<string, Stock> = {};
    
    // Check cache first
    const uncachedSymbols: string[] = [];
    for (const symbol of symbols) {
      const cached = await this.cache.get(`orchestrator:quote:${symbol}`);
      if (cached) {
        result[symbol] = cached as Stock;
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) return result;

    try {
      // Twelve Data supports batch requests efficiently
      const twelveQuota = this.quotaTracker.get('twelvedata');
      if (twelveQuota && twelveQuota.remaining >= uncachedSymbols.length) {
        const batchSize = 120; // Twelve Data max batch size
        for (let i = 0; i < uncachedSymbols.length; i += batchSize) {
          const batch = uncachedSymbols.slice(i, i + batchSize);
          const quotes = await this.providers.realtime.getBatchQuotes(batch);
          
          for (const [symbol, quote] of Object.entries(quotes)) {
            const stock = await this.providers.realtime.convertToStock(quote);
            result[symbol] = stock as Stock;
            await this.cache.set(`orchestrator:quote:${symbol}`, stock, 60 * 1000);
            this.incrementQuota('twelvedata');
          }
        }
      } else {
        // Fallback to individual requests with other providers
        for (const symbol of uncachedSymbols) {
          const quote = await this.getRealTimeQuote(symbol);
          if (quote) {
            result[symbol] = quote;
          }
        }
      }
    } catch (error) {
      console.error('MarketDataOrchestrator getBatchQuotes error:', error);
    }

    return result;
  }

  async getHistoricalData(
    symbol: string, 
    interval: '1min' | '5min' | '15min' | '30min' | '1h' | '1day' = '1day',
    outputsize: number = 30
  ): Promise<any> {
    const cacheKey = `orchestrator:historical:${symbol}:${interval}:${outputsize}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Try Twelve Data first
      const twelveQuota = this.quotaTracker.get('twelvedata');
      if (twelveQuota && twelveQuota.remaining > 0) {
        const data = await this.providers.realtime.getTimeSeries(symbol, interval, outputsize);
        if (data) {
          this.incrementQuota('twelvedata');
          const cacheTime = this.getCacheTimeForInterval(interval);
          await this.cache.set(cacheKey, data, cacheTime);
          return data;
        }
      }

      // Fallback to Alpha Vantage for daily data (currently disabled)
      // if (interval === '1day') {
      //   const alphaQuota = this.quotaTracker.get('alphavantage');
      //   if (alphaQuota && alphaQuota.remaining > 0) {
      //     const data = await this.providers.deep.getDailyTimeSeries(symbol);
      //     if (data) {
      //       this.incrementQuota('alphavantage');
      //       await this.cache.set(cacheKey, data, 24 * 60 * 60 * 1000);
      //       return data;
      //     }
      //   }
      // }

      return null;
    } catch (error) {
      console.error('MarketDataOrchestrator getHistoricalData error:', error);
      return null;
    }
  }

  private getCacheTimeForInterval(interval: string): number {
    switch (interval) {
      case '1min': return 60 * 1000; // 1 minute
      case '5min': return 5 * 60 * 1000; // 5 minutes
      case '15min': return 15 * 60 * 1000; // 15 minutes
      case '30min': return 30 * 60 * 1000; // 30 minutes
      case '1h': return 60 * 60 * 1000; // 1 hour
      case '1day': return 24 * 60 * 60 * 1000; // 1 day
      default: return 60 * 1000; // Default to 1 minute
    }
  }

  getQuotaStatus(): Map<string, QuotaStatus> {
    return this.quotaTracker;
  }

  async warmCache(symbols: string[]): Promise<void> {
    console.log(`Warming cache for ${symbols.length} symbols...`);
    
    // Batch requests for efficiency
    await this.getBatchQuotes(symbols);
    
    // Get fundamentals for top symbols only (to preserve quota)
    const topSymbols = symbols.slice(0, 10);
    for (const symbol of topSymbols) {
      await this.getFundamentals(symbol);
    }
  }

  // WebSocket connection for real-time updates
  connectRealTimeUpdates(
    symbols: string[], 
    onUpdate: (symbol: string, price: number) => void
  ): void {
    try {
      this.providers.realtime.connectWebSocket((message) => {
        if (message.event === 'price' && message.symbol && message.price) {
          onUpdate(message.symbol, message.price);
        }
      });

      this.providers.realtime.subscribe(symbols);
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  disconnectRealTimeUpdates(): void {
    try {
      this.providers.realtime.disconnect();
    } catch (error) {
      console.error('WebSocket disconnect error:', error);
    }
  }
}