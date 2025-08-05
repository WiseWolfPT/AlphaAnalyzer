import WebSocket from 'ws';
import { rateLimitTracker } from './rate-limit-tracker';
import { getSupabaseClient } from '../lib/supabase-client';

export interface MarketDataUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: 'websocket' | 'polling';
}

export interface WebSocketConfig {
  url: string;
  apiKey: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  subscriptions: string[];
}

export interface ConnectionStats {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  lastMessage?: Date;
  subscriptionsActive: string[];
  latency?: number;
}

/**
 * WebSocket Service for Real-time Market Data
 * 
 * Handles TwelveData WebSocket connections with:
 * - Auto-reconnection with exponential backoff
 * - Heartbeat monitoring for connection health
 * - Subscription management for multiple symbols
 * - Rate limit integration and fallback to polling
 * - Real-time broadcasting via Supabase Realtime
 * - Connection health monitoring and statistics
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private stats: ConnectionStats;
  private subscriptions = new Map<string, Date>(); // symbol -> subscription time
  private isReconnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat: Date | null = null;
  private messageQueue: any[] = []; // Queue messages when disconnected

  // Polling fallback
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPollingActive = false;

  constructor() {
    this.config = {
      url: 'wss://ws.twelvedata.com/v1/quotes/price',
      apiKey: process.env.TWELVE_DATA_API_KEY || '',
      reconnectInterval: 5000, // Start with 5 seconds
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000, // 30 seconds
      subscriptions: []
    };

    this.stats = {
      status: 'disconnected',
      reconnectAttempts: 0,
      messagesReceived: 0,
      messagesSent: 0,
      subscriptionsActive: []
    };

    if (!this.config.apiKey || this.config.apiKey === 'demo') {
      console.warn('⚠️ [WebSocketService] TwelveData API key not configured, WebSocket disabled');
    }
  }

  /**
   * Start the WebSocket service
   */
  async start(): Promise<void> {
    if (!this.config.apiKey || this.config.apiKey === 'demo') {
      console.log('🔄 [WebSocketService] Starting in polling fallback mode');
      await this.startPollingFallback();
      return;
    }

    console.log('🔄 [WebSocketService] Starting WebSocket connection...');
    await this.connect();
  }

  /**
   * Stop the WebSocket service
   */
  stop(): void {
    console.log('🛑 [WebSocketService] Stopping service...');
    this.cleanup();
  }

  /**
   * Connect to TwelveData WebSocket
   */
  private async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ [WebSocketService] Already connected');
      return;
    }

    try {
      this.stats.status = 'connecting';
      console.log(`🔗 [WebSocketService] Connecting to ${this.config.url}`);

      this.ws = new WebSocket(this.config.url);

      this.ws.on('open', () => {
        console.log('✅ [WebSocketService] Connected to TwelveData WebSocket');
        this.onConnected();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.onMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        console.error('❌ [WebSocketService] WebSocket error:', error);
        this.onError(error);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log(`🔌 [WebSocketService] Connection closed: ${code} - ${reason.toString()}`);
        this.onDisconnected();
      });

    } catch (error) {
      console.error('❌ [WebSocketService] Failed to create WebSocket connection:', error);
      this.onError(error as Error);
    }
  }

  /**
   * Handle successful connection
   */
  private onConnected(): void {
    this.stats.status = 'connected';
    this.stats.connectedAt = new Date();
    this.stats.reconnectAttempts = 0;
    this.isReconnecting = false;

    // Clear any existing timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Start heartbeat
    this.startHeartbeat();

    // Authenticate with API key
    this.authenticate();

    // Re-subscribe to symbols if any
    this.resubscribeAll();

    // Stop polling fallback if it was active
    this.stopPollingFallback();
  }

  /**
   * Handle disconnection
   */
  private onDisconnected(): void {
    this.stats.status = 'disconnected';
    this.stats.disconnectedAt = new Date();

    // Stop heartbeat
    this.stopHeartbeat();

    // Clear subscriptions status
    this.stats.subscriptionsActive = [];

    // Start reconnection if not manually stopped
    if (!this.isReconnecting) {
      this.scheduleReconnect();
    }

    // Start polling fallback
    this.startPollingFallback();
  }

  /**
   * Handle WebSocket errors
   */
  private onError(error: Error): void {
    this.stats.status = 'error';
    console.error('❌ [WebSocketService] Error occurred:', error);

    // Start polling fallback on error
    this.startPollingFallback();
  }

  /**
   * Handle incoming messages
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      this.stats.messagesReceived++;
      this.stats.lastMessage = new Date();

      const message = JSON.parse(data.toString());
      
      // Handle different message types
      switch (message.event) {
        case 'subscribe-status':
          this.handleSubscriptionStatus(message);
          break;
        case 'price':
          this.handlePriceUpdate(message);
          break;
        case 'heartbeat':
          this.handleHeartbeat(message);
          break;
        case 'error':
          console.error('❌ [WebSocketService] Server error:', message);
          break;
        default:
          console.log('📨 [WebSocketService] Unknown message:', message);
      }

    } catch (error) {
      console.error('❌ [WebSocketService] Failed to parse message:', error);
    }
  }

  /**
   * Authenticate with TwelveData
   */
  private authenticate(): void {
    const authMessage = {
      action: 'subscribe',
      params: {
        symbols: [], // Will be populated when subscribing
        apikey: this.config.apiKey
      }
    };

    this.sendMessage(authMessage);
  }

  /**
   * Subscribe to symbol price updates
   */
  async subscribe(symbol: string): Promise<boolean> {
    if (this.subscriptions.has(symbol)) {
      console.log(`📊 [WebSocketService] Already subscribed to ${symbol}`);
      return true;
    }

    // DISABLED: Rate limit tracking to avoid SQL errors
    // Check rate limits before subscribing
    // const canSubscribe = await rateLimitTracker.checkLimit('twelve_data', 'websocket_subscribe');
    // if (!canSubscribe.allowed) {
    //   console.warn(`⏱️ [WebSocketService] Rate limit exceeded, cannot subscribe to ${symbol}`);
    //   return false;
    // }

    console.log(`📊 [WebSocketService] Subscribing to ${symbol}`);

    const subscribeMessage = {
      action: 'subscribe',
      params: {
        symbols: symbol,
        apikey: this.config.apiKey
      }
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(subscribeMessage);
      this.subscriptions.set(symbol, new Date());
      
      // DISABLED: Rate limit tracking to avoid SQL errors
      // Record the API call
      // await rateLimitTracker.recordCall('twelve_data', 'websocket_subscribe');
      
      return true;
    } else {
      console.warn(`⚠️ [WebSocketService] Cannot subscribe to ${symbol} - not connected`);
      // Queue for later when connected
      this.messageQueue.push(subscribeMessage);
      return false;
    }
  }

  /**
   * Unsubscribe from symbol
   */
  async unsubscribe(symbol: string): Promise<boolean> {
    if (!this.subscriptions.has(symbol)) {
      console.log(`📊 [WebSocketService] Not subscribed to ${symbol}`);
      return true;
    }

    console.log(`📊 [WebSocketService] Unsubscribing from ${symbol}`);

    const unsubscribeMessage = {
      action: 'unsubscribe',
      params: {
        symbols: symbol,
        apikey: this.config.apiKey
      }
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(unsubscribeMessage);
      this.subscriptions.delete(symbol);
      
      // Update active subscriptions
      this.stats.subscriptionsActive = this.stats.subscriptionsActive.filter(s => s !== symbol);
      
      return true;
    } else {
      console.warn(`⚠️ [WebSocketService] Cannot unsubscribe from ${symbol} - not connected`);
      return false;
    }
  }

  /**
   * Handle subscription status updates
   */
  private handleSubscriptionStatus(message: any): void {
    console.log('📊 [WebSocketService] Subscription status:', message);
    
    if (message.status === 'ok') {
      // Update active subscriptions
      this.stats.subscriptionsActive = Array.from(this.subscriptions.keys());
    }
  }

  /**
   * Handle real-time price updates
   */
  private async handlePriceUpdate(message: any): Promise<void> {
    try {
      const priceData = message.data;
      
      const marketUpdate: MarketDataUpdate = {
        symbol: priceData.symbol,
        price: parseFloat(priceData.price),
        change: parseFloat(priceData.change) || 0,
        changePercent: parseFloat(priceData.percent_change) || 0,
        volume: parseInt(priceData.volume) || 0,
        timestamp: new Date(),
        source: 'websocket'
      };

      console.log(`📈 [WebSocketService] Price update: ${marketUpdate.symbol} = $${marketUpdate.price}`);

      // Broadcast via Supabase Realtime
      await this.broadcastUpdate(marketUpdate);

      // Store in cache for immediate access
      await this.cacheUpdate(marketUpdate);

    } catch (error) {
      console.error('❌ [WebSocketService] Failed to process price update:', error);
    }
  }

  /**
   * Handle heartbeat messages
   */
  private handleHeartbeat(message: any): void {
    this.lastHeartbeat = new Date();
    
    // Calculate latency if timestamp provided
    if (message.timestamp) {
      const now = Date.now();
      const serverTime = new Date(message.timestamp).getTime();
      this.stats.latency = Math.abs(now - serverTime);
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.stats.messagesSent++;
        return true;
      } catch (error) {
        console.error('❌ [WebSocketService] Failed to send message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      // Check if we've received a heartbeat recently
      const now = Date.now();
      const lastHeartbeatTime = this.lastHeartbeat?.getTime() || 0;
      const timeSinceHeartbeat = now - lastHeartbeatTime;

      if (timeSinceHeartbeat > this.config.heartbeatInterval * 2) {
        console.warn('💔 [WebSocketService] Heartbeat timeout, connection may be stale');
        this.reconnect();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.stats.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('❌ [WebSocketService] Max reconnection attempts reached, starting polling fallback');
      this.startPollingFallback();
      return;
    }

    this.isReconnecting = true;
    this.stats.reconnectAttempts++;

    // Exponential backoff: 5s, 10s, 20s, 40s, etc.
    const delay = this.config.reconnectInterval * Math.pow(2, this.stats.reconnectAttempts - 1);
    
    console.log(`🔄 [WebSocketService] Scheduling reconnect attempt ${this.stats.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  private async reconnect(): Promise<void> {
    console.log('🔄 [WebSocketService] Attempting to reconnect...');
    
    // Close existing connection
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    // Attempt new connection
    await this.connect();
  }

  /**
   * Re-subscribe to all symbols after reconnection
   */
  private async resubscribeAll(): Promise<void> {
    console.log('🔄 [WebSocketService] Re-subscribing to all symbols...');
    
    const symbols = Array.from(this.subscriptions.keys());
    for (const symbol of symbols) {
      await this.subscribe(symbol);
    }

    // Process queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  /**
   * Start polling fallback when WebSocket fails
   */
  private async startPollingFallback(): Promise<void> {
    if (this.isPollingActive) {
      console.log('🔄 [WebSocketService] Polling fallback already active');
      return;
    }

    console.log('🔄 [WebSocketService] Starting polling fallback for subscribed symbols');
    this.isPollingActive = true;

    // Poll every 30 seconds for subscribed symbols
    this.pollingInterval = setInterval(async () => {
      const symbols = Array.from(this.subscriptions.keys());
      if (symbols.length === 0) return;

      try {
        // Use existing market data services for polling
        const { PolygonService } = await import('./polygon-service');
        const polygonService = new PolygonService();

        for (const symbol of symbols) {
          const quoteData = await polygonService.getQuote(symbol);
          if (quoteData) {
            const marketUpdate: MarketDataUpdate = {
              symbol: symbol,
              price: quoteData.price,
              change: quoteData.change || 0,
              changePercent: quoteData.changePercent || 0,
              volume: quoteData.volume || 0,
              timestamp: new Date(),
              source: 'polling'
            };

            await this.broadcastUpdate(marketUpdate);
            await this.cacheUpdate(marketUpdate);
          }
        }
      } catch (error) {
        console.error('❌ [WebSocketService] Polling fallback error:', error);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop polling fallback
   */
  private stopPollingFallback(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPollingActive = false;
      console.log('🛑 [WebSocketService] Stopped polling fallback');
    }
  }

  /**
   * Broadcast update via Supabase Realtime
   */
  private async broadcastUpdate(update: MarketDataUpdate): Promise<void> {
    try {
      await getSupabaseClient()
        .channel('market-data')
        .send({
          type: 'broadcast',
          event: 'price-update',
          payload: update
        });
      
      console.log(`📡 [WebSocketService] Broadcasted update for ${update.symbol}`);
    } catch (error) {
      console.error('❌ [WebSocketService] Failed to broadcast update:', error);
    }
  }

  /**
   * Cache update for immediate access
   */
  private async cacheUpdate(update: MarketDataUpdate): Promise<void> {
    try {
      // Store in real_time_quotes table for immediate access
      const { error } = await getSupabaseClient()
        .from('real_time_quotes')
        .upsert({
          symbol: update.symbol,
          price: update.price,
          change: update.change,
          change_percent: update.changePercent,
          volume: update.volume,
          source: update.source,
          updated_at: update.timestamp.toISOString()
        }, {
          onConflict: 'symbol'
        });

      if (error) {
        console.error('❌ [WebSocketService] Failed to cache update:', error);
      }
    } catch (error) {
      console.error('❌ [WebSocketService] Cache update error:', error);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.isReconnecting = false;

    // Close WebSocket
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Stop polling fallback
    this.stopPollingFallback();

    // Clear subscriptions
    this.subscriptions.clear();
    this.stats.subscriptionsActive = [];
    this.stats.status = 'disconnected';
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get service health status
   */
  getHealth(): {
    status: string;
    connected: boolean;
    subscriptions: number;
    uptime: number;
    pollingFallback: boolean;
  } {
    const connectedAt = this.stats.connectedAt?.getTime() || Date.now();
    const uptime = Date.now() - connectedAt;

    return {
      status: this.stats.status,
      connected: this.isConnected(),
      subscriptions: this.subscriptions.size,
      uptime,
      pollingFallback: this.isPollingActive
    };
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();