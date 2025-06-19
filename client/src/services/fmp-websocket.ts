// Financial Modeling Prep WebSocket Service
// Real-time stock, forex, and crypto data streaming
import { getFMPService } from './fmp-enhanced';

export interface FMPWebSocketConfig {
  apiKey: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
}

export interface FMPWebSocketMessage {
  event: 'subscribe' | 'unsubscribe' | 'login' | 'price' | 'forex' | 'crypto';
  data?: {
    apiKey?: string;
    ticker?: string | string[];
    symbol?: string;
    price?: number;
    change?: number;
    changesPercentage?: number;
    volume?: number;
    timestamp?: number;
  };
}

export interface FMPPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  volume?: number;
  timestamp: number;
}

export interface FMPForexUpdate {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

export interface FMPCryptoUpdate {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  timestamp: number;
}

export type FMPUpdateHandler = (update: FMPPriceUpdate | FMPForexUpdate | FMPCryptoUpdate) => void;
export type FMPErrorHandler = (error: Error) => void;
export type FMPConnectionHandler = () => void;

export class FMPWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<FMPWebSocketConfig>;
  private subscribedSymbols: Set<string> = new Set();
  private subscribedForex: Set<string> = new Set();
  private subscribedCrypto: Set<string> = new Set();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private shouldReconnect: boolean = true;
  private connectionRetries: number = 0;
  private isAuthenticated: boolean = false;

  // Event handlers
  private updateHandlers: Set<FMPUpdateHandler> = new Set();
  private errorHandlers: Set<FMPErrorHandler> = new Set();
  private connectHandlers: Set<FMPConnectionHandler> = new Set();
  private disconnectHandlers: Set<FMPConnectionHandler> = new Set();

  constructor(config: FMPWebSocketConfig) {
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
        // FMP WebSocket endpoint
        const wsUrl = 'wss://websockets.financialmodelingprep.com';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔗 Connected to FMP WebSocket');
          this.connectionRetries = 0;
          this.authenticate().then(() => {
            this.startHeartbeat();
            this.resubscribeAll();
            this.connectHandlers.forEach(handler => handler());
            resolve();
          }).catch(reject);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: FMPWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing FMP WebSocket message:', error);
            this.errorHandlers.forEach(handler => handler(error as Error));
          }
        };

        this.ws.onclose = (event) => {
          console.log(`🔌 FMP WebSocket disconnected: ${event.code} - ${event.reason}`);
          this.cleanup();
          this.isAuthenticated = false;
          this.disconnectHandlers.forEach(handler => handler());

          if (this.shouldReconnect && this.connectionRetries < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (this.connectionRetries >= this.config.maxReconnectAttempts) {
            const error = new Error('Max reconnection attempts reached');
            this.errorHandlers.forEach(handler => handler(error));
          }
        };

        this.ws.onerror = (error) => {
          console.error('FMP WebSocket error:', error);
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

  private async authenticate(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const loginMessage: FMPWebSocketMessage = {
      event: 'login',
      data: {
        apiKey: this.config.apiKey
      }
    };

    this.send(loginMessage);
    this.isAuthenticated = true;
    console.log('✅ FMP WebSocket authenticated');
  }

  private handleMessage(message: FMPWebSocketMessage): void {
    try {
      switch (message.event) {
        case 'price':
          if (message.data) {
            const priceUpdate: FMPPriceUpdate = {
              symbol: message.data.symbol || '',
              price: message.data.price || 0,
              change: message.data.change || 0,
              changesPercentage: message.data.changesPercentage || 0,
              volume: message.data.volume,
              timestamp: message.data.timestamp || Date.now()
            };
            this.updateHandlers.forEach(handler => handler(priceUpdate));
          }
          break;
        
        case 'forex':
          // Handle forex updates
          if (message.data) {
            const forexUpdate: FMPForexUpdate = {
              symbol: message.data.symbol || '',
              bid: message.data.price || 0,
              ask: (message.data.price || 0) + 0.0001, // Estimated spread
              spread: 0.0001,
              timestamp: message.data.timestamp || Date.now()
            };
            this.updateHandlers.forEach(handler => handler(forexUpdate));
          }
          break;
        
        case 'crypto':
          // Handle crypto updates
          if (message.data) {
            const cryptoUpdate: FMPCryptoUpdate = {
              symbol: message.data.symbol || '',
              price: message.data.price || 0,
              change24h: message.data.change || 0,
              changePercent24h: message.data.changesPercentage || 0,
              volume24h: message.data.volume || 0,
              timestamp: message.data.timestamp || Date.now()
            };
            this.updateHandlers.forEach(handler => handler(cryptoUpdate));
          }
          break;
        
        default:
          console.log('📨 FMP WebSocket message:', message);
      }
    } catch (error) {
      console.error('Error handling FMP WebSocket message:', error);
      this.errorHandlers.forEach(handler => handler(error as Error));
    }
  }

  subscribeToStocks(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    symbolArray.forEach(symbol => this.subscribedSymbols.add(symbol.toUpperCase()));
    
    if (this.isConnected() && this.isAuthenticated) {
      const subscribeMessage: FMPWebSocketMessage = {
        event: 'subscribe',
        data: {
          ticker: symbolArray
        }
      };
      this.send(subscribeMessage);
      console.log(`📈 Subscribed to stocks: ${symbolArray.join(', ')}`);
    }
  }

  subscribeToForex(pairs: string | string[]): void {
    const pairArray = Array.isArray(pairs) ? pairs : [pairs];
    pairArray.forEach(pair => this.subscribedForex.add(pair.toUpperCase()));
    
    if (this.isConnected() && this.isAuthenticated) {
      const subscribeMessage: FMPWebSocketMessage = {
        event: 'subscribe',
        data: {
          ticker: pairArray
        }
      };
      this.send(subscribeMessage);
      console.log(`💱 Subscribed to forex: ${pairArray.join(', ')}`);
    }
  }

  subscribeToCrypto(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    symbolArray.forEach(symbol => this.subscribedCrypto.add(symbol.toUpperCase()));
    
    if (this.isConnected() && this.isAuthenticated) {
      const subscribeMessage: FMPWebSocketMessage = {
        event: 'subscribe',
        data: {
          ticker: symbolArray
        }
      };
      this.send(subscribeMessage);
      console.log(`₿ Subscribed to crypto: ${symbolArray.join(', ')}`);
    }
  }

  unsubscribeFromStocks(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    symbolArray.forEach(symbol => this.subscribedSymbols.delete(symbol.toUpperCase()));
    
    if (this.isConnected() && this.isAuthenticated) {
      const unsubscribeMessage: FMPWebSocketMessage = {
        event: 'unsubscribe',
        data: {
          ticker: symbolArray
        }
      };
      this.send(unsubscribeMessage);
      console.log(`📉 Unsubscribed from stocks: ${symbolArray.join(', ')}`);
    }
  }

  unsubscribeFromForex(pairs: string | string[]): void {
    const pairArray = Array.isArray(pairs) ? pairs : [pairs];
    pairArray.forEach(pair => this.subscribedForex.delete(pair.toUpperCase()));
    
    if (this.isConnected() && this.isAuthenticated) {
      const unsubscribeMessage: FMPWebSocketMessage = {
        event: 'unsubscribe',
        data: {
          ticker: pairArray
        }
      };
      this.send(unsubscribeMessage);
      console.log(`💸 Unsubscribed from forex: ${pairArray.join(', ')}`);
    }
  }

  unsubscribeFromCrypto(symbols: string | string[]): void {
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    symbolArray.forEach(symbol => this.subscribedCrypto.delete(symbol.toUpperCase()));
    
    if (this.isConnected() && this.isAuthenticated) {
      const unsubscribeMessage: FMPWebSocketMessage = {
        event: 'unsubscribe',
        data: {
          ticker: symbolArray
        }
      };
      this.send(unsubscribeMessage);
      console.log(`🚫 Unsubscribed from crypto: ${symbolArray.join(', ')}`);
    }
  }

  private resubscribeAll(): void {
    if (this.subscribedSymbols.size > 0) {
      this.subscribeToStocks(Array.from(this.subscribedSymbols));
    }
    if (this.subscribedForex.size > 0) {
      this.subscribeToForex(Array.from(this.subscribedForex));
    }
    if (this.subscribedCrypto.size > 0) {
      this.subscribeToCrypto(Array.from(this.subscribedCrypto));
    }
  }

  private send(message: FMPWebSocketMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected()) {
        // FMP uses ping/pong for heartbeat
        this.ws!.ping?.();
      }
    }, this.config.heartbeatInterval);
  }

  private scheduleReconnect(): void {
    this.connectionRetries++;
    console.log(`🔄 Attempting to reconnect to FMP WebSocket (${this.connectionRetries}/${this.config.maxReconnectAttempts}) in ${this.config.reconnectInterval}ms`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(error => {
        console.error('FMP WebSocket reconnection failed:', error);
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

  private isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Event handler registration
  onUpdate(handler: FMPUpdateHandler): () => void {
    this.updateHandlers.add(handler);
    return () => this.updateHandlers.delete(handler);
  }

  onError(handler: FMPErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onConnect(handler: FMPConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: FMPConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.cleanup();
    this.subscribedSymbols.clear();
    this.subscribedForex.clear();
    this.subscribedCrypto.clear();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.isAuthenticated = false;
    console.log('👋 Disconnected from FMP WebSocket');
  }

  // Utility methods
  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return this.isAuthenticated ? 'AUTHENTICATED' : 'CONNECTED';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  getSubscribedSymbols(): {
    stocks: string[];
    forex: string[];
    crypto: string[];
  } {
    return {
      stocks: Array.from(this.subscribedSymbols),
      forex: Array.from(this.subscribedForex),
      crypto: Array.from(this.subscribedCrypto)
    };
  }

  getStats(): {
    connectionState: string;
    isAuthenticated: boolean;
    subscribedCount: number;
    retries: number;
    maxRetries: number;
  } {
    const subscribed = this.getSubscribedSymbols();
    return {
      connectionState: this.getConnectionState(),
      isAuthenticated: this.isAuthenticated,
      subscribedCount: subscribed.stocks.length + subscribed.forex.length + subscribed.crypto.length,
      retries: this.connectionRetries,
      maxRetries: this.config.maxReconnectAttempts
    };
  }
}

// Global FMP WebSocket service instance
let fmpWebSocketService: FMPWebSocketService | null = null;

export const initializeFMPWebSocket = (apiKey: string): FMPWebSocketService => {
  fmpWebSocketService = new FMPWebSocketService({ apiKey });
  return fmpWebSocketService;
};

export const getFMPWebSocketService = (): FMPWebSocketService => {
  if (!fmpWebSocketService) {
    throw new Error('FMP WebSocket Service not initialized. Call initializeFMPWebSocket() first.');
  }
  return fmpWebSocketService;
};

export { fmpWebSocketService };