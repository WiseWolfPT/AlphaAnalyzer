// Enhanced Finnhub Service with WebSocket support and rate limiting
import { finnhubService } from './finnhub';
import { cacheManager } from '../lib/cache-manager';

export interface FinnhubWebSocketData {
  type: 'trade' | 'ping' | 'error';
  data?: Array<{
    s: string; // Symbol
    p: number; // Price
    t: number; // Timestamp
    v: number; // Volume
    c?: string[]; // Conditions
  }>;
  msg?: string;
}

export interface RateLimitStatus {
  requests: number;
  resetTime: number;
  remaining: number;
}

class FinnhubEnhancedService {
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  
  // Rate limiting - Finnhub free tier: 60 API calls/minute
  private apiCallCount = 0;
  private apiCallWindow = 60000; // 1 minute
  private lastResetTime = Date.now();
  private maxCallsPerMinute = 55; // Leave buffer for safety
  
  // WebSocket event handlers
  private onTradeHandlers: Array<(data: FinnhubWebSocketData['data']) => void> = [];
  private onErrorHandlers: Array<(error: string) => void> = [];
  private onConnectionHandlers: Array<(connected: boolean) => void> = [];

  // SECURITY: API key moved to server-side - use proxy endpoints instead
  constructor(private apiKey: string = 'DEPRECATED_USE_SERVER_PROXY') {}

  // Rate limiting management
  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastResetTime > this.apiCallWindow) {
      this.apiCallCount = 0;
      this.lastResetTime = now;
    }
    
    return this.apiCallCount < this.maxCallsPerMinute;
  }
  
  private incrementApiCall(): void {
    this.apiCallCount++;
  }
  
  getRateLimitStatus(): RateLimitStatus {
    const now = Date.now();
    const windowRemaining = this.apiCallWindow - (now - this.lastResetTime);
    
    return {
      requests: this.apiCallCount,
      resetTime: this.lastResetTime + this.apiCallWindow,
      remaining: Math.max(0, this.maxCallsPerMinute - this.apiCallCount)
    };
  }

  // Enhanced API methods with rate limiting and caching
  async getStockQuoteWithRateLimit(symbol: string): Promise<any> {
    if (!this.checkRateLimit()) {
      const status = this.getRateLimitStatus();
      const waitTime = status.resetTime - Date.now();
      console.warn(`🚫 Finnhub rate limit reached. Wait ${Math.ceil(waitTime / 1000)}s`);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }

    // Check cache first
    const cacheKey = `finnhub-quote-${symbol}`;
    const cached = cacheManager.get(cacheKey, 'quote');
    if (cached) {
      console.log(`📦 Finnhub cache hit for ${symbol}`);
      return cached;
    }

    try {
      this.incrementApiCall();
      const data = await finnhubService.getStockPrice(symbol);
      
      // Cache for 30 seconds for quotes
      cacheManager.set(cacheKey, data, 'quote', 30000);
      
      return data;
    } catch (error) {
      console.error(`❌ Finnhub API error for ${symbol}:`, error);
      throw error;
    }
  }

  async getCompanyProfileWithRateLimit(symbol: string): Promise<any> {
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    const cacheKey = `finnhub-profile-${symbol}`;
    const cached = cacheManager.get(cacheKey, 'profile');
    if (cached) return cached;

    try {
      this.incrementApiCall();
      const data = await finnhubService.getCompanyProfile(symbol);
      cacheManager.set(cacheKey, data, 'profile', 3600000); // 1 hour cache
      return data;
    } catch (error) {
      console.error(`❌ Finnhub profile error for ${symbol}:`, error);
      throw error;
    }
  }

  async getBasicFinancialsWithRateLimit(symbol: string): Promise<any> {
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    const cacheKey = `finnhub-financials-${symbol}`;
    const cached = cacheManager.get(cacheKey, 'financials');
    if (cached) return cached;

    try {
      this.incrementApiCall();
      const data = await finnhubService.getBasicFinancials(symbol);
      cacheManager.set(cacheKey, data, 'financials', 1800000); // 30 min cache
      return data;
    } catch (error) {
      console.error(`❌ Finnhub financials error for ${symbol}:`, error);
      throw error;
    }
  }

  // WebSocket Implementation for Real-time Data
  connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('🔄 Finnhub WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
    
    console.log('🔗 Connecting to Finnhub WebSocket...');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ Finnhub WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.onConnectionHandlers.forEach(handler => handler(true));
      
      // Re-subscribe to all symbols
      this.subscriptions.forEach(symbol => {
        this.subscribeToSymbol(symbol);
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const data: FinnhubWebSocketData = JSON.parse(event.data);
        
        if (data.type === 'trade' && data.data) {
          this.onTradeHandlers.forEach(handler => handler(data.data));
        } else if (data.type === 'ping') {
          // Send pong response
          this.ws?.send(JSON.stringify({ type: 'pong' }));
        } else if (data.type === 'error') {
          console.error('❌ Finnhub WebSocket error:', data.msg);
          this.onErrorHandlers.forEach(handler => handler(data.msg || 'Unknown error'));
        }
      } catch (error) {
        console.error('❌ Error parsing Finnhub WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('🔌 Finnhub WebSocket disconnected:', event.code, event.reason);
      this.isConnecting = false;
      this.onConnectionHandlers.forEach(handler => handler(false));
      
      // Attempt to reconnect if it wasn't a manual close
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Finnhub WebSocket error:', error);
      this.isConnecting = false;
      this.onErrorHandlers.forEach(handler => handler('WebSocket connection error'));
    };
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`⏱️ Reconnecting to Finnhub WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  subscribeToSymbol(symbol: string): void {
    this.subscriptions.add(symbol);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'subscribe',
        symbol: symbol.toUpperCase()
      });
      
      this.ws.send(message);
      console.log(`📈 Subscribed to Finnhub real-time data for ${symbol}`);
    }
  }

  unsubscribeFromSymbol(symbol: string): void {
    this.subscriptions.delete(symbol);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'unsubscribe',
        symbol: symbol.toUpperCase()
      });
      
      this.ws.send(message);
      console.log(`📉 Unsubscribed from Finnhub real-time data for ${symbol}`);
    }
  }

  // Event handlers
  onTrade(handler: (data: FinnhubWebSocketData['data']) => void): void {
    this.onTradeHandlers.push(handler);
  }

  onError(handler: (error: string) => void): void {
    this.onErrorHandlers.push(handler);
  }

  onConnection(handler: (connected: boolean) => void): void {
    this.onConnectionHandlers.push(handler);
  }

  // Cleanup
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.subscriptions.clear();
    this.onTradeHandlers = [];
    this.onErrorHandlers = [];
    this.onConnectionHandlers = [];
  }

  // Health check
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  // Batch operations to optimize API usage
  async batchGetQuotes(symbols: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const batchSize = 5; // Process in small batches to respect rate limits
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      // Process batch in parallel but respect rate limits
      const promises = batch.map(async (symbol, index) => {
        // Add small delay between requests in batch
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        try {
          const data = await this.getStockQuoteWithRateLimit(symbol);
          return { symbol, data };
        } catch (error) {
          console.warn(`⚠️ Failed to fetch quote for ${symbol}:`, error);
          return { symbol, data: null, error };
        }
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ symbol, data }) => {
        results[symbol] = data;
      });
      
      // Wait between batches if there are more
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export const finnhubEnhanced = new FinnhubEnhancedService();