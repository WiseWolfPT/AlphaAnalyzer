import { API_CONFIG } from '@/config/api-keys';
import { CacheManager } from '@/lib/cache-manager';
import type { Stock } from '@shared/schema';

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
  fifty_two_week: {
    low: string;
    high: string;
    low_change: string;
    high_change: string;
    low_change_percent: string;
    high_change_percent: string;
    range: string;
  };
}

export interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status: string;
}

export interface TwelveDataWebSocketMessage {
  event: 'price' | 'subscribe' | 'unsubscribe' | 'heartbeat';
  symbol?: string;
  currency?: string;
  exchange?: string;
  type?: string;
  timestamp?: number;
  price?: number;
  day_volume?: number;
  day_change?: number;
  change_percent?: number;
}

export class TwelveDataService {
  private cache: CacheManager;
  private apiKey: string;
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(cache?: CacheManager) {
    this.cache = cache || new CacheManager();
    this.apiKey = API_CONFIG.TWELVE_DATA.apiKey;
    this.baseUrl = API_CONFIG.TWELVE_DATA.baseUrl;
    this.wsUrl = API_CONFIG.TWELVE_DATA.wsUrl;
  }

  async getQuote(symbol: string): Promise<TwelveDataQuote | null> {
    const cacheKey = `twelve:quote:${symbol}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as TwelveDataQuote;

    try {
      const response = await fetch(
        `${this.baseUrl}/quote?symbol=${symbol}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.code === 400 || !data.symbol) return null;

      // Cache for 1 minute
      await this.cache.set(cacheKey, data, 60 * 1000);
      
      return data as TwelveDataQuote;
    } catch (error) {
      console.error('Twelve Data getQuote error:', error);
      return null;
    }
  }

  async getTimeSeries(
    symbol: string, 
    interval: '1min' | '5min' | '15min' | '30min' | '1h' | '1day' = '1day',
    outputsize: number = 30
  ): Promise<TwelveDataTimeSeries | null> {
    const cacheKey = `twelve:timeseries:${symbol}:${interval}:${outputsize}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as TwelveDataTimeSeries;

    try {
      const response = await fetch(
        `${this.baseUrl}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.code === 400 || data.status === 'error') return null;

      // Cache based on interval
      const cacheTime = interval === '1min' ? 60 * 1000 : // 1 minute
                       interval === '5min' ? 5 * 60 * 1000 : // 5 minutes
                       interval === '15min' ? 15 * 60 * 1000 : // 15 minutes
                       interval === '30min' ? 30 * 60 * 1000 : // 30 minutes
                       interval === '1h' ? 60 * 60 * 1000 : // 1 hour
                       24 * 60 * 60 * 1000; // 1 day

      await this.cache.set(cacheKey, data, cacheTime);
      
      return data as TwelveDataTimeSeries;
    } catch (error) {
      console.error('Twelve Data getTimeSeries error:', error);
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Record<string, TwelveDataQuote>> {
    const symbolsStr = symbols.join(',');
    const cacheKey = `twelve:batch:${symbolsStr}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as Record<string, TwelveDataQuote>;

    try {
      const response = await fetch(
        `${this.baseUrl}/quote?symbol=${symbolsStr}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Twelve Data API error: ${response.statusText}`);
      }

      const data = await response.json();
      const result: Record<string, TwelveDataQuote> = {};

      // Handle both single and multiple symbol responses
      if (data.symbol) {
        // Single symbol response
        result[data.symbol] = data;
      } else {
        // Multiple symbol response
        Object.entries(data).forEach(([symbol, quote]) => {
          if (typeof quote === 'object' && quote !== null && 'symbol' in quote) {
            result[symbol] = quote as TwelveDataQuote;
          }
        });
      }

      // Cache for 1 minute
      await this.cache.set(cacheKey, result, 60 * 1000);
      
      return result;
    } catch (error) {
      console.error('Twelve Data getBatchQuotes error:', error);
      return {};
    }
  }

  // WebSocket methods for real-time data
  connectWebSocket(onMessage: (data: TwelveDataWebSocketMessage) => void): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(`${this.wsUrl}?apikey=${this.apiKey}`);

      this.ws.onopen = () => {
        console.log('Twelve Data WebSocket connected');
        this.setupHeartbeat();
        
        // Resubscribe to all symbols
        this.subscriptions.forEach(symbol => {
          this.subscribe([symbol]);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Twelve Data WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Twelve Data WebSocket disconnected');
        this.cleanup();
        this.scheduleReconnect(onMessage);
      };
    } catch (error) {
      console.error('Error connecting to Twelve Data WebSocket:', error);
      this.scheduleReconnect(onMessage);
    }
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private scheduleReconnect(onMessage: (data: TwelveDataWebSocketMessage) => void): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect to Twelve Data WebSocket...');
      this.connectWebSocket(onMessage);
    }, 5000); // Reconnect after 5 seconds
  }

  subscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Store subscriptions for when connection is established
      symbols.forEach(symbol => this.subscriptions.add(symbol));
      return;
    }

    const message = {
      action: 'subscribe',
      params: {
        symbols: symbols.join(',')
      }
    };

    this.ws.send(JSON.stringify(message));
    symbols.forEach(symbol => this.subscriptions.add(symbol));
  }

  unsubscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      symbols.forEach(symbol => this.subscriptions.delete(symbol));
      return;
    }

    const message = {
      action: 'unsubscribe',
      params: {
        symbols: symbols.join(',')
      }
    };

    this.ws.send(JSON.stringify(message));
    symbols.forEach(symbol => this.subscriptions.delete(symbol));
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  // Convert Twelve Data quote to our Stock type
  async convertToStock(quote: TwelveDataQuote): Promise<Partial<Stock>> {
    return {
      symbol: quote.symbol,
      name: quote.name,
      currentPrice: parseFloat(quote.close),
      previousClose: parseFloat(quote.previous_close),
      change: parseFloat(quote.change),
      changePercent: parseFloat(quote.percent_change),
      volume: parseInt(quote.volume),
      high: parseFloat(quote.high),
      low: parseFloat(quote.low),
      open: parseFloat(quote.open),
      marketCap: 0, // Not provided by Twelve Data quote
      week52High: parseFloat(quote.fifty_two_week.high),
      week52Low: parseFloat(quote.fifty_two_week.low),
    };
  }
}