// Financial WebSocket Manager - Multi-API real-time streaming with connection pooling
import { EventEmitter } from 'events';

export interface FinancialDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  source: string;
  high?: number;
  low?: number;
  open?: number;
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  priority: number;
  protocols?: string[];
  reconnectConfig: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    exponentialBase: number;
  };
  healthCheck: {
    interval: number;
    timeout: number;
    failureThreshold: number;
  };
}

export interface ConnectionMetrics {
  latency: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  messageCount: number;
  lastMessageTime: number;
  failureCount: number;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  PAUSED = 'paused'
}

class ConnectionManager extends EventEmitter {
  private connections = new Map<string, WebSocket>();
  private connectionStates = new Map<string, ConnectionState>();
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private metrics = new Map<string, ConnectionMetrics>();
  private healthCheckTimers = new Map<string, NodeJS.Timeout>();
  private messageBuffers = new Map<string, FinancialDataPoint[]>();
  private subscribedSymbols = new Set<string>();
  private sourceConfigs = new Map<string, DataSource>();

  constructor() {
    super();
    this.setMaxListeners(100); // Support many symbol subscriptions
  }

  // Add and configure a data source
  addDataSource(config: DataSource): void {
    this.sourceConfigs.set(config.id, config);
    this.connectionStates.set(config.id, ConnectionState.DISCONNECTED);
    this.metrics.set(config.id, {
      latency: 0,
      throughput: 0,
      errorRate: 0,
      uptime: 0,
      messageCount: 0,
      lastMessageTime: 0,
      failureCount: 0
    });
    this.messageBuffers.set(config.id, []);
    
    this.emit('sourceAdded', config);
  }

  // Connect to a specific data source
  async connect(sourceId: string): Promise<void> {
    const config = this.sourceConfigs.get(sourceId);
    if (!config) {
      throw new Error(`Data source ${sourceId} not found`);
    }

    if (this.connectionStates.get(sourceId) === ConnectionState.CONNECTED) {
      return; // Already connected
    }

    this.setConnectionState(sourceId, ConnectionState.CONNECTING);
    
    try {
      const ws = new WebSocket(config.url, config.protocols);
      this.connections.set(sourceId, ws);
      
      await this.setupWebSocketHandlers(sourceId, ws, config);
      
    } catch (error) {
      this.handleConnectionError(sourceId, error as Error);
      throw error;
    }
  }

  // Connect to all configured data sources
  async connectAll(): Promise<void> {
    const promises = Array.from(this.sourceConfigs.keys()).map(sourceId => 
      this.connect(sourceId).catch(error => {
        console.warn(`Failed to connect to ${sourceId}:`, error);
        return null;
      })
    );
    
    await Promise.allSettled(promises);
    this.emit('bulkConnectionAttempted');
  }

  // Disconnect from a specific source
  disconnect(sourceId: string): void {
    const ws = this.connections.get(sourceId);
    if (ws) {
      ws.close(1000, 'Manual disconnect');
      this.connections.delete(sourceId);
    }

    this.clearReconnectTimer(sourceId);
    this.clearHealthCheckTimer(sourceId);
    this.setConnectionState(sourceId, ConnectionState.DISCONNECTED);
    
    this.emit('disconnected', sourceId);
  }

  // Disconnect from all sources
  disconnectAll(): void {
    Array.from(this.sourceConfigs.keys()).forEach(sourceId => {
      this.disconnect(sourceId);
    });
    
    this.emit('allDisconnected');
  }

  // Subscribe to real-time data for symbols
  subscribeToSymbols(symbols: string[]): void {
    symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
    
    // Send subscription messages to all connected sources
    this.connections.forEach((ws, sourceId) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendSubscriptionMessage(sourceId, symbols, 'subscribe');
      }
    });

    this.emit('symbolsSubscribed', symbols);
  }

  // Unsubscribe from symbols
  unsubscribeFromSymbols(symbols: string[]): void {
    symbols.forEach(symbol => this.subscribedSymbols.delete(symbol));
    
    this.connections.forEach((ws, sourceId) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendSubscriptionMessage(sourceId, symbols, 'unsubscribe');
      }
    });

    this.emit('symbolsUnsubscribed', symbols);
  }

  // Get current connection states
  getConnectionStates(): Map<string, ConnectionState> {
    return new Map(this.connectionStates);
  }

  // Get performance metrics
  getMetrics(): Map<string, ConnectionMetrics> {
    return new Map(this.metrics);
  }

  // Get the best available connection for a symbol
  getBestConnection(symbol?: string): string | null {
    const connectedSources = Array.from(this.connectionStates.entries())
      .filter(([_, state]) => state === ConnectionState.CONNECTED)
      .map(([sourceId]) => sourceId);

    if (connectedSources.length === 0) return null;

    // Sort by priority and performance metrics
    const rankedSources = connectedSources
      .map(sourceId => {
        const config = this.sourceConfigs.get(sourceId)!;
        const metrics = this.metrics.get(sourceId)!;
        
        // Calculate composite score
        const priorityScore = config.priority * 1000;
        const latencyScore = metrics.latency > 0 ? (1000 / metrics.latency) : 1000;
        const throughputScore = metrics.throughput * 10;
        const reliabilityScore = (1 - metrics.errorRate) * 100;
        
        return {
          sourceId,
          score: priorityScore + latencyScore + throughputScore + reliabilityScore
        };
      })
      .sort((a, b) => b.score - a.score);

    return rankedSources[0]?.sourceId || null;
  }

  // Get aggregated data for a symbol from all sources
  getAggregatedData(symbol: string): FinancialDataPoint[] {
    const allData: FinancialDataPoint[] = [];
    
    this.messageBuffers.forEach((buffer, sourceId) => {
      const symbolData = buffer.filter(point => point.symbol === symbol);
      allData.push(...symbolData);
    });

    // Sort by timestamp and return recent data
    return allData
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10); // Last 10 data points
  }

  // Private methods
  private async setupWebSocketHandlers(sourceId: string, ws: WebSocket, config: DataSource): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error(`Connection timeout for ${sourceId}`));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        this.setConnectionState(sourceId, ConnectionState.CONNECTED);
        this.resetReconnectAttempts(sourceId);
        this.startHealthCheck(sourceId);
        
        // Subscribe to current symbols
        if (this.subscribedSymbols.size > 0) {
          this.sendSubscriptionMessage(sourceId, Array.from(this.subscribedSymbols), 'subscribe');
        }
        
        this.emit('connected', sourceId);
        resolve();
      };

      ws.onmessage = (event) => {
        this.handleMessage(sourceId, event);
      };

      ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        this.handleConnectionClose(sourceId, event);
      };

      ws.onerror = (event) => {
        clearTimeout(connectTimeout);
        this.handleConnectionError(sourceId, new Error('WebSocket error'));
        reject(new Error(`WebSocket error for ${sourceId}`));
      };
    });
  }

  private handleMessage(sourceId: string, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Update metrics
      this.updateMetrics(sourceId, Date.now());
      
      // Process financial data
      if (this.isFinancialData(data)) {
        const financialData: FinancialDataPoint = {
          ...data,
          source: sourceId,
          timestamp: Date.now()
        };
        
        // Add to buffer
        const buffer = this.messageBuffers.get(sourceId) || [];
        buffer.push(financialData);
        
        // Keep buffer size manageable
        if (buffer.length > 1000) {
          buffer.splice(0, buffer.length - 1000);
        }
        
        this.messageBuffers.set(sourceId, buffer);
        this.emit('dataReceived', financialData);
      }
      
    } catch (error) {
      console.error(`Failed to parse message from ${sourceId}:`, error);
      this.incrementErrorCount(sourceId);
    }
  }

  private handleConnectionClose(sourceId: string, event: CloseEvent): void {
    this.connections.delete(sourceId);
    this.clearHealthCheckTimer(sourceId);
    
    if (event.wasClean) {
      this.setConnectionState(sourceId, ConnectionState.DISCONNECTED);
      this.emit('disconnected', sourceId);
    } else {
      this.setConnectionState(sourceId, ConnectionState.RECONNECTING);
      this.scheduleReconnect(sourceId);
      this.emit('connectionLost', sourceId, event);
    }
  }

  private handleConnectionError(sourceId: string, error: Error): void {
    console.error(`Connection error for ${sourceId}:`, error);
    this.incrementErrorCount(sourceId);
    this.setConnectionState(sourceId, ConnectionState.FAILED);
    this.emit('connectionError', sourceId, error);
  }

  private scheduleReconnect(sourceId: string): void {
    const config = this.sourceConfigs.get(sourceId);
    if (!config) return;

    const attempts = this.reconnectAttempts.get(sourceId) || 0;
    
    if (attempts >= config.reconnectConfig.maxAttempts) {
      this.setConnectionState(sourceId, ConnectionState.FAILED);
      this.emit('maxReconnectAttemptsReached', sourceId);
      return;
    }

    // Calculate exponential backoff delay with jitter
    const baseDelay = config.reconnectConfig.baseDelay;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(config.reconnectConfig.exponentialBase, attempts),
      config.reconnectConfig.maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = (Math.random() - 0.5) * 0.5 * exponentialDelay;
    const delay = exponentialDelay + jitter;

    this.reconnectAttempts.set(sourceId, attempts + 1);
    
    const timer = setTimeout(() => {
      this.connect(sourceId).catch(error => {
        console.warn(`Reconnect attempt ${attempts + 1} failed for ${sourceId}:`, error);
      });
    }, delay);
    
    this.reconnectTimers.set(sourceId, timer);
    this.emit('reconnectScheduled', sourceId, attempts + 1, delay);
  }

  private startHealthCheck(sourceId: string): void {
    const config = this.sourceConfigs.get(sourceId);
    if (!config) return;

    const timer = setInterval(() => {
      this.performHealthCheck(sourceId);
    }, config.healthCheck.interval);
    
    this.healthCheckTimers.set(sourceId, timer);
  }

  private performHealthCheck(sourceId: string): void {
    const ws = this.connections.get(sourceId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send ping or heartbeat message
    const pingMessage = JSON.stringify({ type: 'ping', timestamp: Date.now() });
    
    try {
      ws.send(pingMessage);
    } catch (error) {
      console.warn(`Health check failed for ${sourceId}:`, error);
      this.handleConnectionError(sourceId, error as Error);
    }
  }

  private sendSubscriptionMessage(sourceId: string, symbols: string[], action: 'subscribe' | 'unsubscribe'): void {
    const ws = this.connections.get(sourceId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      type: action,
      symbols: symbols,
      timestamp: Date.now()
    });

    try {
      ws.send(message);
      this.emit('subscriptionSent', sourceId, action, symbols);
    } catch (error) {
      console.error(`Failed to send subscription message to ${sourceId}:`, error);
    }
  }

  private isFinancialData(data: any): boolean {
    return data && 
           typeof data.symbol === 'string' && 
           typeof data.price === 'number' &&
           typeof data.timestamp === 'number';
  }

  private setConnectionState(sourceId: string, state: ConnectionState): void {
    this.connectionStates.set(sourceId, state);
    this.emit('stateChanged', sourceId, state);
  }

  private resetReconnectAttempts(sourceId: string): void {
    this.reconnectAttempts.set(sourceId, 0);
  }

  private clearReconnectTimer(sourceId: string): void {
    const timer = this.reconnectTimers.get(sourceId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sourceId);
    }
  }

  private clearHealthCheckTimer(sourceId: string): void {
    const timer = this.healthCheckTimers.get(sourceId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(sourceId);
    }
  }

  private updateMetrics(sourceId: string, messageTime: number): void {
    const metrics = this.metrics.get(sourceId);
    if (!metrics) return;

    metrics.messageCount++;
    metrics.lastMessageTime = messageTime;
    
    // Calculate throughput (messages per second)
    const timeWindow = 60000; // 1 minute
    const cutoff = messageTime - timeWindow;
    
    // This is a simplified throughput calculation
    // In a real implementation, you'd track message timestamps
    metrics.throughput = metrics.messageCount / ((messageTime - (metrics.lastMessageTime || messageTime)) / 1000 || 1);
    
    this.metrics.set(sourceId, metrics);
  }

  private incrementErrorCount(sourceId: string): void {
    const metrics = this.metrics.get(sourceId);
    if (metrics) {
      metrics.failureCount++;
      metrics.errorRate = metrics.failureCount / Math.max(metrics.messageCount, 1);
      this.metrics.set(sourceId, metrics);
    }
  }
}

// Singleton instance
export const websocketManager = new ConnectionManager();

// Default data source configurations for financial APIs
export const DEFAULT_FINANCIAL_SOURCES: DataSource[] = [
  {
    id: 'finnhub',
    name: 'Finnhub WebSocket',
    url: 'wss://ws.finnhub.io',
    priority: 10,
    reconnectConfig: {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2
    },
    healthCheck: {
      interval: 30000,
      timeout: 5000,
      failureThreshold: 3
    }
  },
  {
    id: 'alphaVantage',
    name: 'Alpha Vantage WebSocket',
    url: 'wss://ws.alpha-vantage.io',
    priority: 8,
    reconnectConfig: {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2
    },
    healthCheck: {
      interval: 30000,
      timeout: 5000,
      failureThreshold: 3
    }
  },
  {
    id: 'iex',
    name: 'IEX Cloud WebSocket',
    url: 'wss://cloud-sse.iexapis.com/stable',
    priority: 6,
    reconnectConfig: {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 20000,
      exponentialBase: 2
    },
    healthCheck: {
      interval: 45000,
      timeout: 8000,
      failureThreshold: 2
    }
  }
];