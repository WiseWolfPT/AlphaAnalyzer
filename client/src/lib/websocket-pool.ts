// Advanced WebSocket Connection Pool and Load Balancer for Financial Streaming
import { EventEmitter } from 'events';
import { websocketManager, FinancialDataPoint, ConnectionState, DataSource } from './websocket-manager';

export interface PoolConfig {
  maxConnectionsPerSource: number;
  minConnectionsPerSource: number;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'weighted' | 'adaptive';
  healthCheckInterval: number;
  reconnectStrategy: 'exponential' | 'linear' | 'immediate';
  failoverEnabled: boolean;
  circuitBreakerThreshold: number;
  connectionTimeout: number;
}

export interface LoadBalancerMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageLatency: number;
  throughput: number;
  circuitBreakerTrips: number;
  lastFailoverTime: number;
}

export interface ConnectionPoolMetrics {
  poolId: string;
  sourceId: string;
  activeConnections: number;
  maxConnections: number;
  queuedRequests: number;
  averageResponseTime: number;
  successRate: number;
  lastUsed: number;
}

class WebSocketPool extends EventEmitter {
  private pools = new Map<string, WebSocket[]>();
  private poolMetrics = new Map<string, ConnectionPoolMetrics>();
  private circuitBreakers = new Map<string, { isOpen: boolean; failures: number; lastFailure: number }>();
  private loadBalancerIndex = new Map<string, number>();
  private requestQueue: Array<{ symbol: string; resolve: Function; reject: Function; timestamp: number }> = [];
  private isProcessingQueue = false;
  
  constructor(private config: PoolConfig) {
    super();
    this.startHealthCheck();
    this.startQueueProcessor();
  }

  // Initialize connection pools for a data source
  async initializePool(source: DataSource): Promise<void> {
    const poolId = source.id;
    
    if (this.pools.has(poolId)) {
      return; // Pool already exists
    }

    const connections: WebSocket[] = [];
    this.pools.set(poolId, connections);
    
    // Initialize metrics
    this.poolMetrics.set(poolId, {
      poolId,
      sourceId: source.id,
      activeConnections: 0,
      maxConnections: this.config.maxConnectionsPerSource,
      queuedRequests: 0,
      averageResponseTime: 0,
      successRate: 1.0,
      lastUsed: Date.now()
    });

    // Initialize circuit breaker
    this.circuitBreakers.set(poolId, {
      isOpen: false,
      failures: 0,
      lastFailure: 0
    });

    // Create initial connections
    const initialConnections = Math.min(this.config.minConnectionsPerSource, this.config.maxConnectionsPerSource);
    
    for (let i = 0; i < initialConnections; i++) {
      await this.createConnection(source, i);
    }

    this.emit('poolInitialized', poolId);
  }

  // Create a new connection in the pool
  private async createConnection(source: DataSource, index: number): Promise<WebSocket | null> {
    const poolId = source.id;
    const pool = this.pools.get(poolId);
    if (!pool) return null;

    const circuitBreaker = this.circuitBreakers.get(poolId);
    if (circuitBreaker?.isOpen) {
      this.emit('circuitBreakerOpen', poolId);
      return null;
    }

    try {
      const ws = new WebSocket(source.url, source.protocols);
      
      const connectionPromise = new Promise<WebSocket>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout for ${poolId}`));
        }, this.config.connectionTimeout);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.handleConnectionOpen(poolId, ws, index);
          resolve(ws);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          this.handleConnectionError(poolId, error, index);
          reject(error);
        };

        ws.onclose = (event) => {
          this.handleConnectionClose(poolId, index, event);
        };

        ws.onmessage = (event) => {
          this.handleMessage(poolId, event);
        };
      });

      const connection = await connectionPromise;
      
      // Add to pool
      if (pool.length > index) {
        pool[index] = connection;
      } else {
        pool.push(connection);
      }

      // Reset circuit breaker on successful connection
      this.resetCircuitBreaker(poolId);
      
      return connection;

    } catch (error) {
      this.handleConnectionFailure(poolId, error as Error);
      return null;
    }
  }

  // Get best available connection using load balancing strategy
  getConnection(symbol?: string): { connection: WebSocket | null; poolId: string | null } {
    const availablePools = Array.from(this.pools.entries()).filter(([poolId, pool]) => {
      const circuitBreaker = this.circuitBreakers.get(poolId);
      const hasActiveConnections = pool.some(ws => ws.readyState === WebSocket.OPEN);
      return hasActiveConnections && !circuitBreaker?.isOpen;
    });

    if (availablePools.length === 0) {
      return { connection: null, poolId: null };
    }

    let selectedPool: [string, WebSocket[]] | null = null;

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        selectedPool = this.selectRoundRobin(availablePools);
        break;
      case 'least-connections':
        selectedPool = this.selectLeastConnections(availablePools);
        break;
      case 'weighted':
        selectedPool = this.selectWeighted(availablePools);
        break;
      case 'adaptive':
        selectedPool = this.selectAdaptive(availablePools);
        break;
      default:
        selectedPool = availablePools[0];
    }

    if (!selectedPool) {
      return { connection: null, poolId: null };
    }

    const [poolId, pool] = selectedPool;
    const availableConnection = pool.find(ws => ws.readyState === WebSocket.OPEN);
    
    if (availableConnection) {
      this.updatePoolUsage(poolId);
    }

    return { connection: availableConnection || null, poolId };
  }

  // Load balancing strategies
  private selectRoundRobin(pools: [string, WebSocket[]][]): [string, WebSocket[]] | null {
    if (pools.length === 0) return null;
    
    const poolIds = pools.map(([id]) => id);
    const lastIndex = this.loadBalancerIndex.get('round-robin') || 0;
    const nextIndex = (lastIndex + 1) % poolIds.length;
    
    this.loadBalancerIndex.set('round-robin', nextIndex);
    
    return pools[nextIndex];
  }

  private selectLeastConnections(pools: [string, WebSocket[]][]): [string, WebSocket[]] | null {
    if (pools.length === 0) return null;

    return pools.reduce((best, current) => {
      const [currentId, currentPool] = current;
      const [bestId, bestPool] = best;
      
      const currentActiveConnections = currentPool.filter(ws => ws.readyState === WebSocket.OPEN).length;
      const bestActiveConnections = bestPool.filter(ws => ws.readyState === WebSocket.OPEN).length;
      
      return currentActiveConnections < bestActiveConnections ? current : best;
    });
  }

  private selectWeighted(pools: [string, WebSocket[]][]): [string, WebSocket[]] | null {
    if (pools.length === 0) return null;

    // Weight based on pool metrics (success rate, latency, etc.)
    const weightedPools = pools.map(([poolId, pool]) => {
      const metrics = this.poolMetrics.get(poolId);
      if (!metrics) return { pool: [poolId, pool] as [string, WebSocket[]], weight: 0 };

      // Calculate weight based on success rate and inverse of response time
      const weight = metrics.successRate * (1000 / Math.max(metrics.averageResponseTime, 1));
      return { pool: [poolId, pool] as [string, WebSocket[]], weight };
    });

    // Select based on weighted random
    const totalWeight = weightedPools.reduce((sum, { weight }) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { pool, weight } of weightedPools) {
      random -= weight;
      if (random <= 0) {
        return pool;
      }
    }

    return weightedPools[0]?.pool || null;
  }

  private selectAdaptive(pools: [string, WebSocket[]][]): [string, WebSocket[]] | null {
    if (pools.length === 0) return null;

    // Adaptive strategy: prioritize based on current performance
    const poolScores = pools.map(([poolId, pool]) => {
      const metrics = this.poolMetrics.get(poolId);
      if (!metrics) return { pool: [poolId, pool] as [string, WebSocket[]], score: 0 };

      // Adaptive scoring algorithm
      const latencyScore = 1000 / Math.max(metrics.averageResponseTime, 1);
      const successScore = metrics.successRate * 100;
      const utilizationScore = (1 - (metrics.activeConnections / metrics.maxConnections)) * 50;
      
      const score = latencyScore + successScore + utilizationScore;
      return { pool: [poolId, pool] as [string, WebSocket[]], score };
    });

    // Select pool with highest score
    return poolScores.reduce((best, current) => 
      current.score > best.score ? current : best
    ).pool;
  }

  // Send message through load-balanced connection
  async sendMessage(symbol: string, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add to queue for processing
      this.requestQueue.push({
        symbol,
        resolve: (response: any) => resolve(response),
        reject: (error: Error) => reject(error),
        timestamp: Date.now()
      });

      // Update queue metrics
      const relevantPools = Array.from(this.poolMetrics.values()).filter(metric => {
        // In a real implementation, you'd filter based on which pools can handle this symbol
        return true;
      });

      relevantPools.forEach(metric => {
        metric.queuedRequests++;
      });

      this.processQueue();
    });
  }

  // Process queued requests
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) break;

      const { connection, poolId } = this.getConnection(request.symbol);
      
      if (!connection || !poolId) {
        if (this.config.failoverEnabled) {
          // Try failover
          await this.attemptFailover(request);
        } else {
          request.reject(new Error('No available connections'));
        }
        continue;
      }

      try {
        // In a real implementation, you'd send the actual message
        // For now, we'll simulate the response
        const startTime = Date.now();
        
        // Simulate message sending
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const responseTime = Date.now() - startTime;
        this.updateMetrics(poolId, responseTime, true);
        
        request.resolve({ success: true, data: `Response for ${request.symbol}` });
        
      } catch (error) {
        this.updateMetrics(poolId, 0, false);
        this.handleConnectionFailure(poolId, error as Error);
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  // Attempt failover to backup connections
  private async attemptFailover(request: any): Promise<void> {
    // Try to create new connections if pools are available
    const availableSources = Array.from(this.pools.keys());
    
    for (const sourceId of availableSources) {
      const circuitBreaker = this.circuitBreakers.get(sourceId);
      if (circuitBreaker?.isOpen) continue;

      // Try to add a new connection to this pool
      const source = Array.from(websocketManager['sourceConfigs'].values())
        .find(s => s.id === sourceId);
      
      if (source) {
        const newConnection = await this.createConnection(source, -1);
        if (newConnection) {
          this.emit('failoverSuccess', sourceId);
          // Retry the request
          this.requestQueue.unshift(request);
          return;
        }
      }
    }

    this.emit('failoverFailed');
    request.reject(new Error('Failover failed: No backup connections available'));
  }

  // Handle various connection events
  private handleConnectionOpen(poolId: string, ws: WebSocket, index: number): void {
    const metrics = this.poolMetrics.get(poolId);
    if (metrics) {
      metrics.activeConnections++;
    }

    this.emit('connectionAdded', poolId, index);
  }

  private handleConnectionClose(poolId: string, index: number, event: CloseEvent): void {
    const metrics = this.poolMetrics.get(poolId);
    if (metrics) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
    }

    // Attempt to replace the connection if needed
    if (!event.wasClean && this.config.reconnectStrategy !== 'immediate') {
      this.scheduleReconnection(poolId, index);
    }

    this.emit('connectionRemoved', poolId, index);
  }

  private handleConnectionError(poolId: string, error: any, index: number): void {
    this.handleConnectionFailure(poolId, error);
    this.emit('connectionError', poolId, index, error);
  }

  private handleMessage(poolId: string, event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('messageReceived', poolId, data);
    } catch (error) {
      this.emit('messageParseError', poolId, error);
    }
  }

  private handleConnectionFailure(poolId: string, error: Error): void {
    const circuitBreaker = this.circuitBreakers.get(poolId);
    if (circuitBreaker) {
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = Date.now();

      // Trip circuit breaker if threshold exceeded
      if (circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
        circuitBreaker.isOpen = true;
        this.emit('circuitBreakerTripped', poolId);
        
        // Schedule circuit breaker reset
        setTimeout(() => {
          this.resetCircuitBreaker(poolId);
        }, 30000); // Reset after 30 seconds
      }
    }

    this.emit('connectionFailure', poolId, error);
  }

  private resetCircuitBreaker(poolId: string): void {
    const circuitBreaker = this.circuitBreakers.get(poolId);
    if (circuitBreaker) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
      this.emit('circuitBreakerReset', poolId);
    }
  }

  private updateMetrics(poolId: string, responseTime: number, success: boolean): void {
    const metrics = this.poolMetrics.get(poolId);
    if (!metrics) return;

    // Update response time (exponential moving average)
    metrics.averageResponseTime = metrics.averageResponseTime * 0.8 + responseTime * 0.2;
    
    // Update success rate (exponential moving average)
    const successValue = success ? 1 : 0;
    metrics.successRate = metrics.successRate * 0.9 + successValue * 0.1;
    
    metrics.lastUsed = Date.now();
    metrics.queuedRequests = Math.max(0, metrics.queuedRequests - 1);
  }

  private updatePoolUsage(poolId: string): void {
    const metrics = this.poolMetrics.get(poolId);
    if (metrics) {
      metrics.lastUsed = Date.now();
    }
  }

  private scheduleReconnection(poolId: string, index: number): void {
    const source = Array.from(websocketManager['sourceConfigs'].values())
      .find(s => s.id === poolId);
    
    if (!source) return;

    let delay = 1000; // 1 second default

    switch (this.config.reconnectStrategy) {
      case 'exponential':
        const circuitBreaker = this.circuitBreakers.get(poolId);
        const attempts = circuitBreaker?.failures || 0;
        delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        break;
      case 'linear':
        delay = 5000; // 5 seconds
        break;
      case 'immediate':
        delay = 0;
        break;
    }

    setTimeout(() => {
      this.createConnection(source, index);
    }, delay);
  }

  private startHealthCheck(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private performHealthCheck(): void {
    this.pools.forEach((pool, poolId) => {
      pool.forEach((ws, index) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send ping message
          try {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          } catch (error) {
            this.handleConnectionError(poolId, error, index);
          }
        }
      });
    });
  }

  private startQueueProcessor(): void {
    // Process queue every 100ms
    setInterval(() => {
      this.processQueue();
    }, 100);
  }

  // Public API methods
  getPoolMetrics(): Map<string, ConnectionPoolMetrics> {
    return new Map(this.poolMetrics);
  }

  getLoadBalancerMetrics(): LoadBalancerMetrics {
    const allMetrics = Array.from(this.poolMetrics.values());
    
    return {
      totalConnections: allMetrics.reduce((sum, m) => sum + m.maxConnections, 0),
      activeConnections: allMetrics.reduce((sum, m) => sum + m.activeConnections, 0),
      failedConnections: Array.from(this.circuitBreakers.values())
        .reduce((sum, cb) => sum + cb.failures, 0),
      averageLatency: allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length 
        : 0,
      throughput: 0, // Would calculate based on actual message throughput
      circuitBreakerTrips: Array.from(this.circuitBreakers.values())
        .filter(cb => cb.isOpen).length,
      lastFailoverTime: 0 // Would track actual failover times
    };
  }

  destroy(): void {
    // Close all connections
    this.pools.forEach((pool, poolId) => {
      pool.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    });

    // Clear all maps and timers
    this.pools.clear();
    this.poolMetrics.clear();
    this.circuitBreakers.clear();
    this.requestQueue.length = 0;
    
    this.emit('destroyed');
  }
}

// Default pool configuration
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxConnectionsPerSource: 5,
  minConnectionsPerSource: 2,
  loadBalancingStrategy: 'adaptive',
  healthCheckInterval: 30000,
  reconnectStrategy: 'exponential',
  failoverEnabled: true,
  circuitBreakerThreshold: 5,
  connectionTimeout: 10000
};

// Global pool instance
export const websocketPool = new WebSocketPool(DEFAULT_POOL_CONFIG);