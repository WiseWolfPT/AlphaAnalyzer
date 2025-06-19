// Twelve Data WebSocket Service
// Real-time stock, forex, and crypto data streaming with credit optimization
import { getTwelveDataService } from './twelve-data-enhanced';

export interface TwelveDataWebSocketConfig {
  apiKey: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
}

export interface TwelveDataWebSocketSubscription {
  action: 'subscribe' | 'unsubscribe' | 'reset' | 'heartbeat';
  params?: {
    symbols: string;
  };
}

export interface TwelveDataWebSocketMessage {
  event: 'price' | 'subscribe' | 'unsubscribe' | 'heartbeat' | 'error';
  symbol?: string;
  price?: number;
  timestamp?: number;
  volume?: number;
  change?: number;
  change_percent?: number;
  day_high?: number;
  day_low?: number;
  day_open?: number;
  previous_close?: number;
  exchange?: string;
  mic_code?: string;
}

export interface TwelveDataPriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  dayHigh?: number;
  dayLow?: number;
  dayOpen?: number;
  previousClose?: number;
  exchange?: string;
  micCode?: string;
}

export type TwelveDataUpdateHandler = (update: TwelveDataPriceUpdate) => void;
export type TwelveDataErrorHandler = (error: Error) => void;
export type TwelveDataConnectionHandler = () => void;

export class TwelveDataWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<TwelveDataWebSocketConfig>;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private shouldReconnect: boolean = true;
  private connectionRetries: number = 0;
  private isConnected: boolean = false;
  private subscriptionCredits: number = 0; // Track WebSocket credits used

  // Event handlers
  private updateHandlers: Set<TwelveDataUpdateHandler> = new Set();
  private errorHandlers: Set<TwelveDataErrorHandler> = new Set();
  private connectHandlers: Set<TwelveDataConnectionHandler> = new Set();
  private disconnectHandlers: Set<TwelveDataConnectionHandler> = new Set();

  constructor(config: TwelveDataWebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      maxReconnectAttempts: 5,
      ...config
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Twelve Data WebSocket endpoint with API key authentication
        const wsUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${this.config.apiKey}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔗 Connected to Twelve Data WebSocket');
          this.isConnected = true;
          this.connectionRetries = 0;
          this.startHeartbeat();
          this.resubscribeAll();
          this.connectHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: TwelveDataWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing Twelve Data WebSocket message:', error);
            this.errorHandlers.forEach(handler => handler(error as Error));
          }
        };

        this.ws.onclose = (event) => {
          console.log(`🔌 Twelve Data WebSocket disconnected: ${event.code} - ${event.reason}`);
          this.cleanup();
          this.isConnected = false;
          this.disconnectHandlers.forEach(handler => handler());

          if (this.shouldReconnect && this.connectionRetries < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (this.connectionRetries >= this.config.maxReconnectAttempts) {
            const error = new Error('Max reconnection attempts reached');
            this.errorHandlers.forEach(handler => handler(error));
          }
        };

        this.ws.onerror = (error) => {
          console.error('Twelve Data WebSocket error:', error);
          const wsError = new Error('WebSocket connection error');
          this.errorHandlers.forEach(handler => handler(wsError));
          
          if (this.connectionRetries === 0) {
            reject(wsError);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: TwelveDataWebSocketMessage): void {
    try {
      switch (message.event) {
        case 'price':
          if (message.symbol) {
            const priceUpdate: TwelveDataPriceUpdate = {
              symbol: message.symbol,
              price: message.price || 0,
              timestamp: message.timestamp || Date.now(),
              volume: message.volume,
              change: message.change,
              changePercent: message.change_percent,
              dayHigh: message.day_high,
              dayLow: message.day_low,
              dayOpen: message.day_open,
              previousClose: message.previous_close,
              exchange: message.exchange,
              micCode: message.mic_code
            };
            this.updateHandlers.forEach(handler => handler(priceUpdate));
          }
          break;
        
        case 'subscribe':
          console.log(`✅ Successfully subscribed via Twelve Data WebSocket`);
          break;
        
        case 'unsubscribe':
          console.log(`✅ Successfully unsubscribed via Twelve Data WebSocket`);
          break;
        
        case 'heartbeat':
          console.log('💓 Twelve Data WebSocket heartbeat received');
          break;
        
        case 'error':
          const error = new Error(`Twelve Data WebSocket error: ${JSON.stringify(message)}`);
          this.errorHandlers.forEach(handler => handler(error));
          break;
        
        default:
          console.log('📨 Twelve Data WebSocket message:', message);
      }
    } catch (error) {
      console.error('Error handling Twelve Data WebSocket message:', error);
      this.errorHandlers.forEach(handler => handler(error as Error));
    }
  }

  subscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const newSymbols = symbolArray.filter(symbol => !this.subscribedSymbols.has(symbol.toUpperCase()));
    
    if (newSymbols.length === 0) {
      console.log('All symbols already subscribed');
      return;
    }

    // Track WebSocket credits (1 credit per symbol subscription)
    this.subscriptionCredits += newSymbols.length;
    
    newSymbols.forEach(symbol => this.subscribedSymbols.add(symbol.toUpperCase()));
    
    if (this.isWebSocketConnected()) {
      this.subscribeToSymbols(newSymbols);
    }
    
    console.log(`📈 Queued subscription to: ${newSymbols.join(', ')} (${this.subscriptionCredits} WS credits used)`);
  }

  unsubscribe(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const existingSymbols = symbolArray.filter(symbol => this.subscribedSymbols.has(symbol.toUpperCase()));
    
    if (existingSymbols.length === 0) {
      console.log('No matching subscriptions found');
      return;
    }

    // Reduce WebSocket credits
    this.subscriptionCredits -= existingSymbols.length;
    this.subscriptionCredits = Math.max(0, this.subscriptionCredits);
    
    existingSymbols.forEach(symbol => this.subscribedSymbols.delete(symbol.toUpperCase()));
    
    if (this.isWebSocketConnected()) {
      this.unsubscribeFromSymbols(existingSymbols);
    }
    
    console.log(`📉 Unsubscribed from: ${existingSymbols.join(', ')} (${this.subscriptionCredits} WS credits used)`);
  }

  private subscribeToSymbols(symbols: string[]): void {
    const payload: TwelveDataWebSocketSubscription = {
      action: 'subscribe',
      params: {
        symbols: symbols.join(',')
      }
    };
    this.send(payload);
    console.log(`📊 Subscribed to ${symbols.length} symbols via WebSocket`);
  }

  private unsubscribeFromSymbols(symbols: string[]): void {
    const payload: TwelveDataWebSocketSubscription = {
      action: 'unsubscribe',
      params: {
        symbols: symbols.join(',')
      }
    };
    this.send(payload);
    console.log(`📊 Unsubscribed from ${symbols.length} symbols via WebSocket`);
  }

  private resubscribeAll(): void {
    if (this.subscribedSymbols.size > 0) {
      this.subscribeToSymbols(Array.from(this.subscribedSymbols));
    }
  }

  private send(payload: TwelveDataWebSocketSubscription): void {
    if (this.isWebSocketConnected()) {
      this.ws!.send(JSON.stringify(payload));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isWebSocketConnected()) {
        const heartbeat: TwelveDataWebSocketSubscription = {
          action: 'heartbeat'
        };
        this.send(heartbeat);
      }
    }, this.config.heartbeatInterval);
  }

  private scheduleReconnect(): void {
    this.connectionRetries++;
    console.log(`🔄 Attempting to reconnect to Twelve Data WebSocket (${this.connectionRetries}/${this.config.maxReconnectAttempts}) in ${this.config.reconnectInterval}ms`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(error => {
        console.error('Twelve Data WebSocket reconnection failed:', error);
        this.errorHandlers.forEach(handler => handler(error));
      });
    }, this.config.reconnectInterval);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private isWebSocketConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isConnected;
  }

  // Event handler registration
  onUpdate(handler: TwelveDataUpdateHandler): () => void {
    this.updateHandlers.add(handler);
    return () => this.updateHandlers.delete(handler);
  }

  onError(handler: TwelveDataErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onConnect(handler: TwelveDataConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: TwelveDataConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
    this.subscribedSymbols.clear();
    this.subscriptionCredits = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.isConnected = false;
    console.log('👋 Disconnected from Twelve Data WebSocket');
  }

  // Utility methods
  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return this.isConnected ? 'CONNECTED' : 'AUTHENTICATING';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  getSubscriptionStats(): {
    connectionState: string;
    subscribedCount: number;
    creditsUsed: number;
    retries: number;
    maxRetries: number;
  } {
    return {
      connectionState: this.getConnectionState(),
      subscribedCount: this.subscribedSymbols.size,
      creditsUsed: this.subscriptionCredits,
      retries: this.connectionRetries,
      maxRetries: this.config.maxReconnectAttempts
    };
  }

  // Optimized subscription management
  optimizeSubscriptions(requestedSymbols: string[], maxCredits: number = 100): {
    canSubscribe: string[];
    mustUnsubscribe: string[];
    currentCredits: number;
    estimatedCredits: number;
    recommendations: string[];
  } {
    const currentSymbols = Array.from(this.subscribedSymbols);
    const newSymbols = requestedSymbols.filter(symbol => 
      !this.subscribedSymbols.has(symbol.toUpperCase())
    );
    
    const estimatedCredits = this.subscriptionCredits + newSymbols.length;
    const recommendations: string[] = [];
    
    if (estimatedCredits <= maxCredits) {
      // All symbols can be subscribed
      recommendations.push(`✅ Can subscribe to all ${newSymbols.length} new symbols`);
      recommendations.push(`📊 Total credits will be: ${estimatedCredits}/${maxCredits}`);
      
      return {
        canSubscribe: newSymbols,
        mustUnsubscribe: [],
        currentCredits: this.subscriptionCredits,
        estimatedCredits,
        recommendations
      };
    }
    
    // Need to optimize subscriptions
    const available = maxCredits - this.subscriptionCredits;
    const canSubscribe = newSymbols.slice(0, available);
    const mustUnsubscribe = available < newSymbols.length ? 
      currentSymbols.slice(0, newSymbols.length - available) : [];
    
    recommendations.push(`⚠️ Credit limit constraint: ${maxCredits} WebSocket credits`);
    recommendations.push(`📈 Can subscribe to ${canSubscribe.length}/${newSymbols.length} new symbols`);
    
    if (mustUnsubscribe.length > 0) {
      recommendations.push(`📉 Must unsubscribe from ${mustUnsubscribe.length} existing symbols`);
      recommendations.push(`🎯 Consider prioritizing most important symbols`);
    }
    
    return {
      canSubscribe,
      mustUnsubscribe,
      currentCredits: this.subscriptionCredits,
      estimatedCredits: Math.min(estimatedCredits, maxCredits),
      recommendations
    };
  }

  // Smart subscription with automatic optimization
  smartSubscribe(symbols: string | string[], priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    const maxCredits = this.getRecommendedMaxCredits();
    
    const optimization = this.optimizeSubscriptions(symbolArray, maxCredits);
    
    // Log optimization recommendations
    optimization.recommendations.forEach(rec => console.log(rec));
    
    // Apply optimizations
    if (optimization.mustUnsubscribe.length > 0) {
      console.log(`🔄 Auto-optimizing: unsubscribing from ${optimization.mustUnsubscribe.length} symbols`);
      this.unsubscribe(optimization.mustUnsubscribe);
    }
    
    if (optimization.canSubscribe.length > 0) {
      this.subscribe(optimization.canSubscribe);
    }
    
    if (optimization.canSubscribe.length < symbolArray.length) {
      const skipped = symbolArray.length - optimization.canSubscribe.length;
      console.warn(`⚠️ Skipped ${skipped} symbols due to WebSocket credit limits`);
    }
  }

  private getRecommendedMaxCredits(): number {
    // Conservative approach: limit WebSocket subscriptions to preserve API credits
    // for other operations
    return 50; // Reasonable limit for real-time monitoring
  }

  // Batch subscribe with intelligent prioritization
  batchSubscribe(
    symbolGroups: { symbols: string[]; priority: 'high' | 'medium' | 'low' }[],
    maxCredits: number = 50
  ): void {
    // Sort by priority
    const sortedGroups = symbolGroups.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    let remainingCredits = maxCredits - this.subscriptionCredits;
    
    for (const group of sortedGroups) {
      const newSymbols = group.symbols.filter(symbol => 
        !this.subscribedSymbols.has(symbol.toUpperCase())
      );
      
      if (newSymbols.length === 0) continue;
      
      const canSubscribe = Math.min(newSymbols.length, remainingCredits);
      
      if (canSubscribe > 0) {
        this.subscribe(newSymbols.slice(0, canSubscribe));
        remainingCredits -= canSubscribe;
        
        console.log(`📊 Subscribed to ${canSubscribe}/${newSymbols.length} ${group.priority} priority symbols`);
      }
      
      if (remainingCredits <= 0) {
        console.log(`🚫 WebSocket credit limit reached (${maxCredits})`);
        break;
      }
    }
  }
}

// Global Twelve Data WebSocket service instance
let twelveDataWebSocketService: TwelveDataWebSocketService | null = null;

export const initializeTwelveDataWebSocket = (apiKey: string): TwelveDataWebSocketService => {
  twelveDataWebSocketService = new TwelveDataWebSocketService({ apiKey });
  return twelveDataWebSocketService;
};

export const getTwelveDataWebSocketService = (): TwelveDataWebSocketService => {
  if (!twelveDataWebSocketService) {
    throw new Error('Twelve Data WebSocket Service not initialized. Call initializeTwelveDataWebSocket() first.');
  }
  return twelveDataWebSocketService;
};

export { twelveDataWebSocketService };