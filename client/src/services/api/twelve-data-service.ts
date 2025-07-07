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
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseReconnectDelay: number = 1000; // 1 second
  private isConnecting: boolean = false;

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

  // Enhanced WebSocket methods with exponential backoff reconnection
  connectWebSocket(onMessage: (data: TwelveDataWebSocketMessage) => void): void {
    // Prevent multiple connection attempts
    if (this.isConnecting) {
      console.log('WebSocket connection already in progress...');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isConnecting = true;
    const connectionAttempt = this.reconnectAttempts + 1;
    
    console.log(`🔌 Attempting WebSocket connection (attempt ${connectionAttempt}/${this.maxReconnectAttempts})`);

    try {
      this.ws = new WebSocket(`${this.wsUrl}?apikey=${this.apiKey}`);

      this.ws.onopen = () => {
        console.log('✅ Twelve Data WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0; // Reset attempts on successful connection
        this.setupHeartbeat();
        
        // Resubscribe to all symbols
        if (this.subscriptions.size > 0) {
          console.log(`📡 Resubscribing to ${this.subscriptions.size} symbols:`, Array.from(this.subscriptions));
          this.subscriptions.forEach(symbol => {
            this.subscribe([symbol]);
          });
        }

        // Dispatch custom event for successful connection
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('websocket-connected', {
            detail: { provider: 'twelvedata', attempt: connectionAttempt }
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle heartbeat responses
          if (data.event === 'heartbeat') {
            console.debug('💓 WebSocket heartbeat received');
            return;
          }

          onMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Twelve Data WebSocket error:', error);
        this.isConnecting = false;
        
        // Dispatch error event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('websocket-error', {
            detail: { provider: 'twelvedata', error, attempt: connectionAttempt }
          }));
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 Twelve Data WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        this.isConnecting = false;
        this.cleanup();
        
        // Only schedule reconnect if it wasn't a manual disconnect
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnectWithBackoff(onMessage);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(`❌ Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
          
          // Dispatch max attempts reached event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('websocket-max-attempts', {
              detail: { provider: 'twelvedata', maxAttempts: this.maxReconnectAttempts }
            }));
          }
        }
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnectWithBackoff(onMessage);
    }
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'heartbeat' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private scheduleReconnectWithBackoff(onMessage: (data: TwelveDataWebSocketMessage) => void): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: baseDelay * 2^attempts with jitter
    const backoffDelay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Maximum 30 seconds
    );
    
    // Add jitter to prevent thundering herd (±25%)
    const jitter = backoffDelay * 0.25 * (Math.random() - 0.5);
    const delayWithJitter = Math.round(backoffDelay + jitter);

    console.log(`⏰ Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delayWithJitter}ms`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connectWebSocket(onMessage);
      }
    }, delayWithJitter);
  }

  // Legacy method for backward compatibility
  private scheduleReconnect(onMessage: (data: TwelveDataWebSocketMessage) => void): void {
    this.scheduleReconnectWithBackoff(onMessage);
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