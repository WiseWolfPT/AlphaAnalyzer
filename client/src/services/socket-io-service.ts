/**
 * Socket.IO Service for Real-time Updates
 * Connects to backend Socket.IO server and handles real-time price updates
 */

import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api';

interface QuoteUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface MarketUpdate {
  type: 'quote';
  symbol: string;
  data: any;
  timestamp: number;
}

interface BatchUpdate {
  type: 'quotes';
  count: number;
  data: QuoteUpdate[];
  timestamp: number;
}

type UpdateCallback = (quote: QuoteUpdate) => void;
type MarketUpdateCallback = (update: MarketUpdate) => void;
type BatchUpdateCallback = (update: BatchUpdate) => void;

class SocketIOService {
  private socket: Socket | null = null;
  private connected = false;
  private subscribedSymbols = new Set<string>();
  private quoteListeners = new Map<string, Set<UpdateCallback>>();
  private marketListeners = new Set<MarketUpdateCallback>();
  private batchListeners = new Set<BatchUpdateCallback>();
  
  constructor() {
    this.connect();
  }
  
  /**
   * Connect to Socket.IO server
   */
  private connect(): void {
    if (this.socket?.connected) {
      return;
    }
    
    // Use same-origin; Vite proxy (dev) e Nginx (prod) tratam do encaminhamento
    const url = '';
    console.log('🔌 Connecting to Socket.IO at:', url || 'same-origin');

    this.socket = io(url || '/', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10
    });
    
    this.setupEventHandlers();
  }
  
  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to real-time updates');
      this.connected = true;
      
      // Re-subscribe to all symbols if reconnecting
      if (this.subscribedSymbols.size > 0) {
        const symbols = Array.from(this.subscribedSymbols);
        this.socket?.emit('subscribe', symbols);
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time updates');
      this.connected = false;
    });
    
    this.socket.on('connected', (data: any) => {
      console.log('📡', data.message);
    });
    
    // Subscription events
    this.socket.on('subscribed', (data: any) => {
      console.log('📊 Subscribed to:', data.symbols.join(', '));
    });
    
    this.socket.on('unsubscribed', (data: any) => {
      console.log('🔕 Unsubscribed from:', data.symbols.join(', '));
    });
    
    // Quote updates
    this.socket.on('quote-update', (data: QuoteUpdate) => {
      console.log(`📈 Quote update: ${data.symbol} = $${data.price}`);
      this.handleQuoteUpdate(data);
    });
    
    // Market updates (all symbols)
    this.socket.on('market-update', (data: MarketUpdate) => {
      console.log(`📊 Market update: ${data.type} for ${data.symbol}`);
      this.handleMarketUpdate(data);
    });
    
    // Batch updates
    this.socket.on('batch-update', (data: BatchUpdate) => {
      console.log(`📦 Batch update: ${data.count} quotes`);
      this.handleBatchUpdate(data);
    });
    
    // Error handling
    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });
  }
  
  /**
   * Handle quote update for specific symbol
   */
  private handleQuoteUpdate(quote: QuoteUpdate): void {
    const listeners = this.quoteListeners.get(quote.symbol);
    if (listeners) {
      listeners.forEach(callback => callback(quote));
    }
  }
  
  /**
   * Handle market-wide updates
   */
  private handleMarketUpdate(update: MarketUpdate): void {
    this.marketListeners.forEach(callback => callback(update));
    
    // Also trigger specific quote listeners if it's a quote update
    if (update.type === 'quote' && update.data) {
      const quoteUpdate: QuoteUpdate = {
        symbol: update.symbol,
        ...update.data,
        timestamp: update.timestamp
      };
      this.handleQuoteUpdate(quoteUpdate);
    }
  }
  
  /**
   * Handle batch updates
   */
  private handleBatchUpdate(update: BatchUpdate): void {
    this.batchListeners.forEach(callback => callback(update));
    
    // Also trigger individual quote listeners
    update.data.forEach(quote => {
      this.handleQuoteUpdate(quote);
    });
  }
  
  /**
   * Subscribe to real-time quotes for symbols
   */
  subscribe(symbols: string[], onUpdate: UpdateCallback): () => void {
    // Connect if not connected
    if (!this.connected && !this.socket) {
      this.connect();
    }
    
    // Track symbols and listeners
    symbols.forEach(symbol => {
      // Add to subscribed symbols
      const wasSubscribed = this.subscribedSymbols.has(symbol);
      this.subscribedSymbols.add(symbol);
      
      // Add listener
      if (!this.quoteListeners.has(symbol)) {
        this.quoteListeners.set(symbol, new Set());
      }
      this.quoteListeners.get(symbol)!.add(onUpdate);
      
      // Subscribe on server if new symbol
      if (!wasSubscribed && this.socket?.connected) {
        this.socket.emit('subscribe', [symbol]);
      }
    });
    
    // If connected, subscribe all at once
    if (this.socket?.connected) {
      const newSymbols = symbols.filter(s => !this.subscribedSymbols.has(s));
      if (newSymbols.length > 0) {
        this.socket.emit('subscribe', newSymbols);
      }
    }
    
    // Return unsubscribe function
    return () => {
      symbols.forEach(symbol => {
        const listeners = this.quoteListeners.get(symbol);
        if (listeners) {
          listeners.delete(onUpdate);
          
          // If no more listeners, unsubscribe from symbol
          if (listeners.size === 0) {
            this.quoteListeners.delete(symbol);
            this.subscribedSymbols.delete(symbol);
            
            if (this.socket?.connected) {
              this.socket.emit('unsubscribe', [symbol]);
            }
          }
        }
      });
    };
  }
  
  /**
   * Subscribe to market-wide updates
   */
  subscribeToMarketUpdates(onUpdate: MarketUpdateCallback): () => void {
    this.marketListeners.add(onUpdate);
    
    return () => {
      this.marketListeners.delete(onUpdate);
    };
  }
  
  /**
   * Subscribe to batch updates
   */
  subscribeToBatchUpdates(onUpdate: BatchUpdateCallback): () => void {
    this.batchListeners.add(onUpdate);
    
    return () => {
      this.batchListeners.delete(onUpdate);
    };
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.socket?.connected || false;
  }
  
  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.subscribedSymbols.clear();
      this.quoteListeners.clear();
      this.marketListeners.clear();
      this.batchListeners.clear();
    }
  }
  
  /**
   * Reconnect to server
   */
  reconnect(): void {
    this.disconnect();
    this.connect();
  }
}

// Export singleton instance
export const socketIOService = new SocketIOService();

// Export types
export type { QuoteUpdate, MarketUpdate, BatchUpdate };
