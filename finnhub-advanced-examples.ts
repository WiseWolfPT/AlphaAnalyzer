// Advanced Finnhub API Integration Examples
// Additional patterns and implementations for Alfalyzer

import finnhub from 'finnhub';

// ========================================
// ADVANCED WEBSOCKET IMPLEMENTATION
// ========================================

import WebSocket from 'ws';
import EventEmitter from 'events';

interface WebSocketMessage {
  type: 'trade' | 'news' | 'ping';
  data?: any;
}

interface TradeUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume: number;
  conditions?: string[];
}

export class EnhancedFinnhubWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPong: number = Date.now();

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

        this.ws.on('open', () => {
          console.log('Enhanced WebSocket connected');
          this.reconnectAttempts = 0;
          this.setupPingPong();
          this.resubscribe();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        this.ws.on('pong', () => {
          this.lastPong = Date.now();
        });

        this.ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
        });

        this.ws.on('close', (code: number, reason: string) => {
          console.log(`WebSocket closed: ${code} - ${reason}`);
          this.cleanup();
          this.emit('disconnected', { code, reason });
          this.attemptReconnect();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupPingPong(): void {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        
        // Check if we received pong recently
        if (Date.now() - this.lastPong > 60000) {
          console.log('Connection seems dead, reconnecting...');
          this.ws.close();
        }
      }
    }, 30000);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private resubscribe(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscriptions.forEach(symbol => {
        this.ws!.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'trade':
        this.handleTradeData(message.data);
        break;
      case 'news':
        this.emit('news', message.data);
        break;
      case 'ping':
        // Server ping, no action needed
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleTradeData(trades: any[]): void {
    trades.forEach(trade => {
      const tradeUpdate: TradeUpdate = {
        symbol: trade.s,
        price: trade.p,
        timestamp: trade.t,
        volume: trade.v,
        conditions: trade.c
      };
      this.emit('trade', tradeUpdate);
    });
  }

  subscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    symbolArray.forEach(symbol => {
      this.subscriptions.add(symbol);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    });
  }

  unsubscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    symbolArray.forEach(symbol => {
      this.subscriptions.delete(symbol);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      }
    });
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// ========================================
// CACHING LAYER FOR RATE LIMITING
// ========================================

import NodeCache from 'node-cache';

export class CachedFinnhubClient {
  private client: finnhub.DefaultApi;
  private cache: NodeCache;

  constructor(apiKey: string, cacheTTL: number = 60) {
    this.client = new finnhub.DefaultApi();
    const api_key = finnhub.ApiClient.instance.authentications['api_key'];
    api_key.apiKey = apiKey;
    
    // Cache with default TTL of 60 seconds
    this.cache = new NodeCache({ stdTTL: cacheTTL });
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const cached = this.cache.get<T>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const data = await fetchFunction();
    this.cache.set(cacheKey, data, customTTL);
    return data;
  }

  async getQuote(symbol: string): Promise<any> {
    const cacheKey = this.getCacheKey('quote', { symbol });
    
    return this.getCachedOrFetch(
      cacheKey,
      () => new Promise((resolve, reject) => {
        this.client.quote(symbol, (error, data) => {
          if (error) reject(error);
          else resolve(data);
        });
      }),
      10 // Cache quotes for only 10 seconds
    );
  }

  async getCompanyProfile(symbol: string): Promise<any> {
    const cacheKey = this.getCacheKey('companyProfile', { symbol });
    
    return this.getCachedOrFetch(
      cacheKey,
      () => new Promise((resolve, reject) => {
        this.client.companyProfile({ symbol }, (error, data) => {
          if (error) reject(error);
          else resolve(data);
        });
      }),
      3600 // Cache company profiles for 1 hour
    );
  }

  async getCompanyNews(symbol: string, from: Date, to: Date): Promise<any[]> {
    const cacheKey = this.getCacheKey('companyNews', { 
      symbol, 
      from: from.toISOString(), 
      to: to.toISOString() 
    });
    
    return this.getCachedOrFetch(
      cacheKey,
      () => new Promise((resolve, reject) => {
        this.client.companyNews(symbol, from, to, (error, data) => {
          if (error) reject(error);
          else resolve(data);
        });
      }),
      300 // Cache news for 5 minutes
    );
  }

  clearCache(): void {
    this.cache.flushAll();
  }

  getCacheStats(): NodeCache.Stats {
    return this.cache.getStats();
  }
}

// ========================================
// BATCH OPERATIONS WITH QUEUE
// ========================================

import PQueue from 'p-queue';

export class BatchFinnhubClient {
  private client: finnhub.DefaultApi;
  private queue: PQueue;

  constructor(apiKey: string, concurrency: number = 5) {
    this.client = new finnhub.DefaultApi();
    const api_key = finnhub.ApiClient.instance.authentications['api_key'];
    api_key.apiKey = apiKey;
    
    // Queue with concurrency limit
    this.queue = new PQueue({ 
      concurrency,
      interval: 1000, // 1 second
      intervalCap: 50  // Max 50 requests per second
    });
  }

  async batchGetQuotes(symbols: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    const promises = symbols.map(symbol => 
      this.queue.add(async () => {
        try {
          const quote = await this.getQuote(symbol);
          results.set(symbol, quote);
        } catch (error) {
          console.error(`Failed to get quote for ${symbol}:`, error);
          results.set(symbol, { error: true, message: error.message });
        }
      })
    );

    await Promise.all(promises);
    return results;
  }

  private getQuote(symbol: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.quote(symbol, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  }

  async batchGetCompanyProfiles(symbols: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    const promises = symbols.map(symbol => 
      this.queue.add(async () => {
        try {
          const profile = await this.getCompanyProfile(symbol);
          results.set(symbol, profile);
        } catch (error) {
          console.error(`Failed to get profile for ${symbol}:`, error);
          results.set(symbol, { error: true, message: error.message });
        }
      })
    );

    await Promise.all(promises);
    return results;
  }

  private getCompanyProfile(symbol: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.companyProfile({ symbol }, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  getPendingCount(): number {
    return this.queue.pending;
  }

  clearQueue(): void {
    this.queue.clear();
  }
}

// ========================================
// TECHNICAL ANALYSIS HELPERS
// ========================================

export class TechnicalAnalysisService {
  private client: finnhub.DefaultApi;

  constructor(apiKey: string) {
    this.client = new finnhub.DefaultApi();
    const api_key = finnhub.ApiClient.instance.authentications['api_key'];
    api_key.apiKey = apiKey;
  }

  async getMultipleIndicators(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    indicators: string[]
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    await Promise.all(
      indicators.map(async indicator => {
        try {
          const data = await this.getTechnicalIndicator(
            symbol,
            resolution,
            from,
            to,
            indicator
          );
          results.set(indicator, data);
        } catch (error) {
          console.error(`Failed to get ${indicator} for ${symbol}:`, error);
        }
      })
    );

    return results;
  }

  private getTechnicalIndicator(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    indicator: string,
    indicatorFields?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.technicalIndicator(
        symbol,
        resolution,
        from,
        to,
        indicator,
        { indicatorFields },
        (error, data) => {
          if (error) reject(error);
          else resolve(data);
        }
      );
    });
  }

  async getSupportResistanceLevels(
    symbol: string,
    resolution: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.supportResistance(symbol, resolution, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  }

  async getPatternRecognition(
    symbol: string,
    resolution: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.patternRecognition(symbol, resolution, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  }
}

// ========================================
// COMPREHENSIVE ERROR RECOVERY
// ========================================

export class ResilientFinnhubClient {
  private client: finnhub.DefaultApi;
  private fallbackClient?: finnhub.DefaultApi;
  private circuitBreaker: CircuitBreaker;

  constructor(primaryApiKey: string, fallbackApiKey?: string) {
    this.client = this.createClient(primaryApiKey);
    
    if (fallbackApiKey) {
      this.fallbackClient = this.createClient(fallbackApiKey);
    }

    this.circuitBreaker = new CircuitBreaker({
      threshold: 5,
      timeout: 60000
    });
  }

  private createClient(apiKey: string): finnhub.DefaultApi {
    const client = new finnhub.DefaultApi();
    const api_key = finnhub.ApiClient.instance.authentications['api_key'];
    api_key.apiKey = apiKey;
    return client;
  }

  async executeWithFallback<T>(
    operation: (client: finnhub.DefaultApi) => Promise<T>
  ): Promise<T> {
    if (this.circuitBreaker.isOpen()) {
      if (this.fallbackClient) {
        return operation(this.fallbackClient);
      }
      throw new Error('Circuit breaker is open and no fallback available');
    }

    try {
      const result = await operation(this.client);
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      
      if (this.fallbackClient && this.shouldUseFallback(error)) {
        console.log('Primary API failed, using fallback');
        return operation(this.fallbackClient);
      }
      
      throw error;
    }
  }

  private shouldUseFallback(error: any): boolean {
    // Use fallback for rate limits, auth errors, or server errors
    const statusCode = error.response?.status;
    return statusCode === 429 || statusCode === 401 || statusCode >= 500;
  }
}

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private config: {
      threshold: number;
      timeout: number;
    }
  ) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.threshold) {
      this.state = 'open';
    }
  }
}