import type { Stock } from '../../shared/schema';

// Server-side environment access
const getServerEnvVar = (key: string): string => {
  return process.env[key] || 'demo';
};

const API_KEYS = {
  FINNHUB: getServerEnvVar('FINNHUB_API_KEY'),
  ALPHA_VANTAGE: getServerEnvVar('ALPHA_VANTAGE_API_KEY'),
  FMP: getServerEnvVar('FMP_API_KEY'),
  TWELVE_DATA: getServerEnvVar('TWELVE_DATA_API_KEY'),
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
  private cache: Map<string, { data: any; expiry: number }> = new Map();

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
    const cacheKey = `quote:${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      // Try Twelve Data first
      const twelveQuota = this.quotaTracker.get('twelvedata');
      if (twelveQuota && twelveQuota.remaining > 0) {
        const quote = await this.fetchTwelveDataQuote(symbol);
        if (quote) {
          this.incrementQuota('twelvedata');
          this.cache.set(cacheKey, { 
            data: quote, 
            expiry: Date.now() + 60000 
          });
          return quote;
        }
      }

      // Fallback to Finnhub
      const finnhubQuota = this.quotaTracker.get('finnhub');
      if (finnhubQuota && finnhubQuota.remaining > 0) {
        const quote = await this.fetchFinnhubQuote(symbol);
        if (quote) {
          this.incrementQuota('finnhub');
          this.cache.set(cacheKey, { 
            data: quote, 
            expiry: Date.now() + 60000 
          });
          return quote;
        }
      }

      return null;
    } catch (error) {
      console.error('ServerMarketDataService getRealTimeQuote error:', error);
      return null;
    }
  }

  private async fetchTwelveDataQuote(symbol: string): Promise<Stock | null> {
    if (API_KEYS.TWELVE_DATA === 'demo') {
      console.warn('Using demo Twelve Data API key');
      return null;
    }

    try {
      const response = await fetch(
        `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${API_KEYS.TWELVE_DATA}`
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.code === 400) return null;

      return {
        id: 0,
        symbol: data.symbol,
        name: data.name || symbol,
        currentPrice: parseFloat(data.close),
        previousClose: parseFloat(data.previous_close),
        change: parseFloat(data.change),
        changePercent: parseFloat(data.percent_change),
        volume: parseInt(data.volume) || 0,
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        open: parseFloat(data.open),
        marketCap: 0,
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
    if (API_KEYS.FINNHUB === 'demo') {
      console.warn('Using demo Finnhub API key');
      return null;
    }

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEYS.FINNHUB}`
      );

      if (!response.ok) return null;

      const data = await response.json();

      return {
        id: 0,
        symbol: symbol,
        name: symbol,
        currentPrice: data.c,
        previousClose: data.pc,
        change: data.d,
        changePercent: data.dp,
        volume: 0,
        high: data.h,
        low: data.l,
        open: data.o,
        marketCap: 0,
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
      console.error('Finnhub API error:', error);
      return null;
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
    await Promise.all(
      symbols.map(symbol => this.getRealTimeQuote(symbol))
    );
  }
}