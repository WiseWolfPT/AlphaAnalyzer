# Modern WebSocket Patterns for Real-time Financial Data in TypeScript

This document outlines comprehensive patterns for implementing WebSocket connections for real-time financial data streams using TypeScript, covering both Socket.IO and native WebSocket approaches.

## Table of Contents

1. [Socket.IO vs Native WebSocket Comparison](#socketio-vs-native-websocket-comparison)
2. [Reconnection Strategies with Exponential Backoff](#reconnection-strategies-with-exponential-backoff)
3. [Message Queuing and Buffering](#message-queuing-and-buffering)
4. [React Hooks for WebSocket Integration](#react-hooks-for-websocket-integration)
5. [TypeScript Typing for Socket Events](#typescript-typing-for-socket-events)
6. [Multiple Data Stream Management](#multiple-data-stream-management)

## Socket.IO vs Native WebSocket Comparison

### Socket.IO Advantages for Financial Data

**Socket.IO** is recommended for financial applications due to:

- **Automatic reconnection** with exponential backoff
- **Connection state recovery** to restore missed packets
- **Built-in heartbeat mechanism** to detect broken connections
- **Namespace support** for organizing different data streams
- **Fallback transports** (polling, WebSocket, WebTransport)

```typescript
// Socket.IO with connection state recovery
import { Server } from "socket.io";

const io = new Server({
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

io.on("connection", (socket) => {
  console.log(socket.recovered); // whether the state was recovered
});
```

### Native WebSocket for High-Performance Scenarios

**Native WebSocket** is better for:

- **Lower latency** due to no additional protocol overhead
- **Smaller bundle size** for client applications
- **Direct binary data handling** without encoding overhead
- **Custom protocol implementations**

```typescript
// Native WebSocket with custom reconnection
class FinancialWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  constructor(private url: string) {
    this.connect();
  }
  
  private connect() {
    this.ws = new WebSocket(this.url);
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onclose = () => {
      this.handleReconnection();
    };
  }
  
  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 10000);
      setTimeout(() => this.connect(), delay);
      this.reconnectAttempts++;
    }
  }
}
```

## Reconnection Strategies with Exponential Backoff

### Socket.IO Reconnection Configuration

```typescript
import { io } from 'socket.io-client';

const socket = io('wss://financial-api.com', {
  // Promise-based acknowledgements with timeout
  retries: 3,
  ackTimeout: 10000,
  
  // Exponential backoff reconnection
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  
  // Connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  }
});

// Check if connection was recovered
socket.on("connect", () => {
  console.log(socket.recovered); // true if state was recovered
});
```

### React useWebSocket Hook with Exponential Backoff

```typescript
import useWebSocket from 'react-use-websocket';

const FinancialDataComponent: React.FC = () => {
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    'wss://financial-api.com/stream',
    {
      shouldReconnect: (closeEvent) => true,
      reconnectAttempts: 10,
      // Exponential backoff: 1s, 2s, 4s, 8s, capped at 10s
      reconnectInterval: (attemptNumber) =>
        Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
      
      // Heartbeat configuration
      heartbeat: {
        message: 'ping',
        returnMessage: 'pong',
        timeout: 60000,
        interval: 25000,
      },
    }
  );
  
  return (
    <div>
      <div>Status: {readyState}</div>
      {lastMessage && <div>Last: {lastMessage.data}</div>}
    </div>
  );
};
```

### Custom Exponential Backoff Implementation

```typescript
class ReconnectionManager {
  private attempts = 0;
  private maxAttempts = 10;
  private baseDelay = 1000;
  private maxDelay = 30000;
  private jitter = true;
  
  calculateDelay(): number {
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts),
      this.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    if (this.jitter) {
      return exponentialDelay + Math.random() * 1000;
    }
    
    return exponentialDelay;
  }
  
  async reconnect(connectFn: () => Promise<void>): Promise<void> {
    if (this.attempts >= this.maxAttempts) {
      throw new Error('Max reconnection attempts reached');
    }
    
    const delay = this.calculateDelay();
    this.attempts++;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await connectFn();
      this.reset();
    } catch (error) {
      throw error;
    }
  }
  
  reset() {
    this.attempts = 0;
  }
}
```

## Message Queuing and Buffering

### Socket.IO Message Queuing

```typescript
interface FinancialMessage {
  type: 'price' | 'volume' | 'order' | 'trade';
  symbol: string;
  timestamp: number;
  data: any;
}

class FinancialSocketManager {
  private socket: Socket;
  private messageQueue: FinancialMessage[] = [];
  private isConnected = false;
  
  constructor(url: string) {
    this.socket = io(url);
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.flushMessageQueue();
    });
    
    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
  }
  
  sendMessage(message: FinancialMessage) {
    if (this.isConnected) {
      this.socket.emit('financial-data', message);
    } else {
      this.messageQueue.push(message);
    }
  }
  
  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.emit('financial-data', message);
      }
    }
  }
}
```

### Native WebSocket with Message Buffer

```typescript
class BufferedWebSocket {
  private ws: WebSocket | null = null;
  private messageBuffer: string[] = [];
  private readonly maxBufferSize = 1000;
  
  constructor(private url: string) {
    this.connect();
  }
  
  private connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      this.flushBuffer();
    };
    
    this.ws.onclose = () => {
      // Implement reconnection logic here
    };
  }
  
  send(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.bufferMessage(data);
    }
  }
  
  private bufferMessage(data: string) {
    if (this.messageBuffer.length >= this.maxBufferSize) {
      // Remove oldest message to prevent memory issues
      this.messageBuffer.shift();
    }
    this.messageBuffer.push(data);
  }
  
  private flushBuffer() {
    while (this.messageBuffer.length > 0) {
      const message = this.messageBuffer.shift();
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      }
    }
  }
}
```

### Advanced Message Prioritization

```typescript
enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

interface PriorityMessage {
  data: string;
  priority: MessagePriority;
  timestamp: number;
}

class PriorityMessageQueue {
  private queues: Map<MessagePriority, PriorityMessage[]> = new Map();
  
  constructor() {
    // Initialize priority queues
    Object.values(MessagePriority).forEach(priority => {
      if (typeof priority === 'number') {
        this.queues.set(priority, []);
      }
    });
  }
  
  enqueue(message: PriorityMessage) {
    const queue = this.queues.get(message.priority);
    if (queue) {
      queue.push(message);
      // Sort by timestamp for same priority
      queue.sort((a, b) => a.timestamp - b.timestamp);
    }
  }
  
  dequeue(): PriorityMessage | null {
    // Check highest priority first
    for (let priority = MessagePriority.CRITICAL; priority >= MessagePriority.LOW; priority--) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift() || null;
      }
    }
    return null;
  }
  
  size(): number {
    return Array.from(this.queues.values()).reduce((total, queue) => total + queue.length, 0);
  }
}
```

## React Hooks for WebSocket Integration

### Custom Financial Data Hook

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';

interface FinancialData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

interface UseFinancialStreamOptions {
  symbols: string[];
  onData?: (data: FinancialData) => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
  bufferSize?: number;
}

export const useFinancialStream = (
  url: string,
  options: UseFinancialStreamOptions
) => {
  const [data, setData] = useState<Map<string, FinancialData>>(new Map());
  const [error, setError] = useState<Error | null>(null);
  const dataBuffer = useRef<FinancialData[]>([]);
  const { bufferSize = 100 } = options;
  
  const {
    sendJsonMessage,
    lastJsonMessage,
    readyState,
    getWebSocket
  } = useWebSocket(url, {
    shouldReconnect: () => true,
    reconnectAttempts: options.reconnectAttempts ?? 5,
    reconnectInterval: (attemptNumber) =>
      Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
      
    onOpen: () => {
      // Subscribe to symbols on connection
      sendJsonMessage({
        type: 'subscribe',
        symbols: options.symbols
      });
    },
    
    onError: (event) => {
      const error = new Error('WebSocket error');
      setError(error);
      options.onError?.(error);
    },
    
    filter: (message) => {
      // Filter out ping/pong messages
      try {
        const data = JSON.parse(message.data);
        return data.type !== 'ping' && data.type !== 'pong';
      } catch {
        return true;
      }
    }
  });
  
  // Process incoming messages
  useEffect(() => {
    if (lastJsonMessage) {
      try {
        const financialData = lastJsonMessage as FinancialData;
        
        // Update data map
        setData(prev => {
          const newData = new Map(prev);
          newData.set(financialData.symbol, financialData);
          return newData;
        });
        
        // Add to buffer
        dataBuffer.current.push(financialData);
        if (dataBuffer.current.length > bufferSize) {
          dataBuffer.current.shift();
        }
        
        // Call callback
        options.onData?.(financialData);
        
      } catch (err) {
        setError(err as Error);
      }
    }
  }, [lastJsonMessage, options.onData, bufferSize]);
  
  const subscribe = useCallback((symbols: string[]) => {
    sendJsonMessage({
      type: 'subscribe',
      symbols
    });
  }, [sendJsonMessage]);
  
  const unsubscribe = useCallback((symbols: string[]) => {
    sendJsonMessage({
      type: 'unsubscribe',
      symbols
    });
  }, [sendJsonMessage]);
  
  const getHistoricalData = useCallback((symbol: string, limit: number = 50) => {
    return dataBuffer.current
      .filter(d => d.symbol === symbol)
      .slice(-limit);
  }, []);
  
  return {
    data,
    error,
    readyState,
    subscribe,
    unsubscribe,
    getHistoricalData,
    connectionStatus: {
      [ReadyState.CONNECTING]: 'Connecting',
      [ReadyState.OPEN]: 'Connected',
      [ReadyState.CLOSING]: 'Disconnecting',
      [ReadyState.CLOSED]: 'Disconnected',
      [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState]
  };
};
```

### Multi-Stream Management Hook

```typescript
interface StreamConfig {
  id: string;
  url: string;
  symbols: string[];
  priority: MessagePriority;
}

export const useMultipleFinancialStreams = (configs: StreamConfig[]) => {
  const [streams, setStreams] = useState<Map<string, any>>(new Map());
  const [aggregatedData, setAggregatedData] = useState<Map<string, FinancialData>>(new Map());
  
  // Create individual streams
  const streamHooks = configs.map(config => {
    const hook = useFinancialStream(config.url, {
      symbols: config.symbols,
      onData: (data) => {
        setAggregatedData(prev => {
          const newData = new Map(prev);
          newData.set(data.symbol, data);
          return newData;
        });
      }
    });
    
    return {
      id: config.id,
      hook,
      priority: config.priority
    };
  });
  
  // Manage stream states
  useEffect(() => {
    const streamMap = new Map();
    streamHooks.forEach(({ id, hook }) => {
      streamMap.set(id, {
        data: hook.data,
        status: hook.connectionStatus,
        readyState: hook.readyState
      });
    });
    setStreams(streamMap);
  }, [streamHooks]);
  
  const getStreamStatus = () => {
    const statuses = Array.from(streams.values()).map(stream => stream.readyState);
    const connectedCount = statuses.filter(status => status === ReadyState.OPEN).length;
    
    return {
      total: configs.length,
      connected: connectedCount,
      allConnected: connectedCount === configs.length,
      anyConnected: connectedCount > 0
    };
  };
  
  return {
    streams,
    aggregatedData,
    streamStatus: getStreamStatus(),
    streamHooks: streamHooks.map(s => s.hook)
  };
};
```

## TypeScript Typing for Socket Events

### Socket.IO Event Types

```typescript
// Server-to-client events
interface ServerToClientEvents {
  'price-update': (data: {
    symbol: string;
    price: number;
    timestamp: number;
  }) => void;
  
  'market-status': (data: {
    status: 'open' | 'closed' | 'pre-market' | 'after-hours';
    timezone: string;
  }) => void;
  
  'order-update': (data: {
    orderId: string;
    status: 'filled' | 'partial' | 'cancelled' | 'pending';
    executedQuantity: number;
  }) => void;
  
  'error': (error: {
    code: string;
    message: string;
    timestamp: number;
  }) => void;
}

// Client-to-server events
interface ClientToServerEvents {
  'subscribe': (data: {
    symbols: string[];
    dataTypes: ('price' | 'volume' | 'orderbook')[];
  }) => void;
  
  'unsubscribe': (data: {
    symbols: string[];
  }) => void;
  
  'place-order': (data: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price?: number;
    type: 'market' | 'limit' | 'stop';
  }, callback: (response: {
    success: boolean;
    orderId?: string;
    error?: string;
  }) => void) => void;
}

// Bidirectional events
interface InterServerEvents {
  'ping': () => void;
}

// Socket data
interface SocketData {
  userId: string;
  subscribedSymbols: string[];
  permissions: string[];
}

// Typed Socket.IO usage
import { Socket } from 'socket.io-client';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socket: TypedSocket = io('wss://financial-api.com');

// Type-safe event handling
socket.on('price-update', (data) => {
  // data is properly typed
  console.log(`${data.symbol}: ${data.price}`);
});

// Type-safe event emission
socket.emit('subscribe', {
  symbols: ['AAPL', 'GOOGL'],
  dataTypes: ['price', 'volume']
});
```

### Native WebSocket Event Types

```typescript
// WebSocket message types
interface WebSocketMessage {
  type: string;
  timestamp: number;
}

interface PriceUpdateMessage extends WebSocketMessage {
  type: 'price-update';
  data: {
    symbol: string;
    price: number;
    volume: number;
    change: number;
  };
}

interface OrderbookMessage extends WebSocketMessage {
  type: 'orderbook';
  data: {
    symbol: string;
    bids: [number, number][];
    asks: [number, number][];
  };
}

interface TradeMessage extends WebSocketMessage {
  type: 'trade';
  data: {
    symbol: string;
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    tradeId: string;
  };
}

type FinancialWebSocketMessage = 
  | PriceUpdateMessage 
  | OrderbookMessage 
  | TradeMessage;

// Type-safe message handler
class TypedWebSocketHandler {
  private handlers: Map<string, (message: any) => void> = new Map();
  
  on<T extends FinancialWebSocketMessage>(
    type: T['type'],
    handler: (message: T) => void
  ) {
    this.handlers.set(type, handler);
  }
  
  handleMessage(rawMessage: string) {
    try {
      const message = JSON.parse(rawMessage) as FinancialWebSocketMessage;
      const handler = this.handlers.get(message.type);
      if (handler) {
        handler(message);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
}

// Usage
const handler = new TypedWebSocketHandler();

handler.on('price-update', (message) => {
  // message is typed as PriceUpdateMessage
  console.log(`Price update for ${message.data.symbol}: ${message.data.price}`);
});

handler.on('trade', (message) => {
  // message is typed as TradeMessage
  console.log(`Trade: ${message.data.quantity} ${message.data.symbol} at ${message.data.price}`);
});
```

### React Hook TypeScript Integration

```typescript
// Type-safe hook for financial data
interface UseFinancialDataReturn {
  data: Map<string, FinancialData>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  readyState: ReadyState;
  error: Error | null;
}

export const useFinancialData = (
  url: string,
  initialSymbols: string[] = []
): UseFinancialDataReturn => {
  // Implementation using the patterns above
  return useFinancialStream(url, {
    symbols: initialSymbols
  });
};

// Component usage with full type safety
const TradingDashboard: React.FC = () => {
  const { data, subscribe, readyState, error } = useFinancialData(
    'wss://api.example.com/financial',
    ['AAPL', 'GOOGL', 'MSFT']
  );
  
  // Type-safe data access
  const appleData = data.get('AAPL');
  
  return (
    <div>
      <div>Status: {readyState}</div>
      {error && <div>Error: {error.message}</div>}
      {appleData && (
        <div>
          AAPL: ${appleData.price} ({appleData.changePercent}%)
        </div>
      )}
    </div>
  );
};
```

## Multiple Data Stream Management

### Stream Aggregation and Conflict Resolution

```typescript
interface StreamSource {
  id: string;
  priority: number;
  latency: number;
  reliability: number;
}

interface DataPoint {
  symbol: string;
  price: number;
  timestamp: number;
  source: StreamSource;
  confidence: number;
}

class FinancialDataAggregator {
  private sources: Map<string, StreamSource> = new Map();
  private dataPoints: Map<string, DataPoint[]> = new Map();
  private conflictResolution: 'latest' | 'highest-priority' | 'weighted-average' = 'weighted-average';
  
  addSource(source: StreamSource) {
    this.sources.set(source.id, source);
  }
  
  addDataPoint(point: DataPoint) {
    const key = point.symbol;
    const points = this.dataPoints.get(key) || [];
    points.push(point);
    
    // Keep only recent data points (last 10 seconds)
    const cutoff = Date.now() - 10000;
    const recentPoints = points.filter(p => p.timestamp > cutoff);
    
    this.dataPoints.set(key, recentPoints);
  }
  
  getBestPrice(symbol: string): number | null {
    const points = this.dataPoints.get(symbol);
    if (!points || points.length === 0) return null;
    
    switch (this.conflictResolution) {
      case 'latest':
        return points.sort((a, b) => b.timestamp - a.timestamp)[0]?.price || null;
        
      case 'highest-priority':
        return points.sort((a, b) => b.source.priority - a.source.priority)[0]?.price || null;
        
      case 'weighted-average':
        const totalWeight = points.reduce((sum, p) => sum + p.confidence, 0);
        const weightedSum = points.reduce((sum, p) => sum + (p.price * p.confidence), 0);
        return totalWeight > 0 ? weightedSum / totalWeight : null;
        
      default:
        return null;
    }
  }
  
  getDataQuality(symbol: string): {
    sourceCount: number;
    avgLatency: number;
    avgReliability: number;
    lastUpdate: number;
  } {
    const points = this.dataPoints.get(symbol) || [];
    
    if (points.length === 0) {
      return {
        sourceCount: 0,
        avgLatency: 0,
        avgReliability: 0,
        lastUpdate: 0
      };
    }
    
    const uniqueSources = new Set(points.map(p => p.source.id));
    const avgLatency = points.reduce((sum, p) => sum + p.source.latency, 0) / points.length;
    const avgReliability = points.reduce((sum, p) => sum + p.source.reliability, 0) / points.length;
    const lastUpdate = Math.max(...points.map(p => p.timestamp));
    
    return {
      sourceCount: uniqueSources.size,
      avgLatency,
      avgReliability,
      lastUpdate
    };
  }
}
```

### Connection Pool Management

```typescript
interface ConnectionConfig {
  url: string;
  maxConnections: number;
  symbols: string[];
  priority: number;
}

class WebSocketConnectionPool {
  private pools: Map<string, WebSocket[]> = new Map();
  private configs: Map<string, ConnectionConfig> = new Map();
  private symbolToPool: Map<string, string> = new Map();
  private roundRobinIndex: Map<string, number> = new Map();
  
  addPool(poolId: string, config: ConnectionConfig) {
    this.configs.set(poolId, config);
    this.pools.set(poolId, []);
    this.roundRobinIndex.set(poolId, 0);
    
    // Map symbols to pool
    config.symbols.forEach(symbol => {
      this.symbolToPool.set(symbol, poolId);
    });
    
    // Initialize connections
    this.initializePool(poolId);
  }
  
  private initializePool(poolId: string) {
    const config = this.configs.get(poolId);
    if (!config) return;
    
    const connections: WebSocket[] = [];
    
    for (let i = 0; i < config.maxConnections; i++) {
      const ws = new WebSocket(config.url);
      
      ws.onopen = () => {
        // Subscribe to symbols for this connection
        const symbolsPerConnection = Math.ceil(config.symbols.length / config.maxConnections);
        const startIndex = i * symbolsPerConnection;
        const endIndex = Math.min(startIndex + symbolsPerConnection, config.symbols.length);
        const symbols = config.symbols.slice(startIndex, endIndex);
        
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbols
        }));
      };
      
      ws.onclose = () => {
        // Implement reconnection logic
        setTimeout(() => this.reconnectConnection(poolId, i), 1000);
      };
      
      connections.push(ws);
    }
    
    this.pools.set(poolId, connections);
  }
  
  private reconnectConnection(poolId: string, index: number) {
    const config = this.configs.get(poolId);
    const connections = this.pools.get(poolId);
    
    if (!config || !connections) return;
    
    // Replace the connection at the specified index
    const ws = new WebSocket(config.url);
    connections[index] = ws;
    
    // Set up event handlers (same as in initializePool)
    // ... event handler setup
  }
  
  getConnection(symbol: string): WebSocket | null {
    const poolId = this.symbolToPool.get(symbol);
    if (!poolId) return null;
    
    const connections = this.pools.get(poolId);
    if (!connections || connections.length === 0) return null;
    
    // Round-robin connection selection
    const currentIndex = this.roundRobinIndex.get(poolId) || 0;
    const connection = connections[currentIndex];
    
    // Update round-robin index
    this.roundRobinIndex.set(poolId, (currentIndex + 1) % connections.length);
    
    return connection.readyState === WebSocket.OPEN ? connection : null;
  }
  
  broadcast(poolId: string, message: string) {
    const connections = this.pools.get(poolId);
    if (!connections) return;
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
  
  getPoolStats(poolId: string) {
    const connections = this.pools.get(poolId);
    if (!connections) return null;
    
    const openConnections = connections.filter(ws => ws.readyState === WebSocket.OPEN).length;
    const totalConnections = connections.length;
    
    return {
      poolId,
      openConnections,
      totalConnections,
      healthRatio: openConnections / totalConnections
    };
  }
}
```

### Performance Monitoring and Optimization

```typescript
interface PerformanceMetrics {
  latency: number;
  throughput: number;
  errorRate: number;
  connectionUptime: number;
  messageCount: number;
  lastMessageTime: number;
}

class WebSocketPerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private messageTimestamps: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private connectionStartTimes: Map<string, number> = new Map();
  
  recordConnection(connectionId: string) {
    this.connectionStartTimes.set(connectionId, Date.now());
    this.metrics.set(connectionId, {
      latency: 0,
      throughput: 0,
      errorRate: 0,
      connectionUptime: 0,
      messageCount: 0,
      lastMessageTime: 0
    });
  }
  
  recordMessage(connectionId: string, sendTime?: number) {
    const now = Date.now();
    const metrics = this.metrics.get(connectionId);
    if (!metrics) return;
    
    // Calculate latency if send time provided
    if (sendTime) {
      metrics.latency = now - sendTime;
    }
    
    // Update message count and timestamp
    metrics.messageCount++;
    metrics.lastMessageTime = now;
    
    // Track message timestamps for throughput calculation
    const timestamps = this.messageTimestamps.get(connectionId) || [];
    timestamps.push(now);
    
    // Keep only last minute of timestamps
    const cutoff = now - 60000;
    const recentTimestamps = timestamps.filter(t => t > cutoff);
    this.messageTimestamps.set(connectionId, recentTimestamps);
    
    // Calculate throughput (messages per second)
    metrics.throughput = recentTimestamps.length / 60;
    
    // Update connection uptime
    const startTime = this.connectionStartTimes.get(connectionId);
    if (startTime) {
      metrics.connectionUptime = now - startTime;
    }
    
    this.metrics.set(connectionId, metrics);
  }
  
  recordError(connectionId: string) {
    const errorCount = (this.errorCounts.get(connectionId) || 0) + 1;
    this.errorCounts.set(connectionId, errorCount);
    
    const metrics = this.metrics.get(connectionId);
    if (metrics) {
      metrics.errorRate = errorCount / metrics.messageCount;
      this.metrics.set(connectionId, metrics);
    }
  }
  
  getMetrics(connectionId: string): PerformanceMetrics | null {
    return this.metrics.get(connectionId) || null;
  }
  
  getOptimalConnection(connectionIds: string[]): string | null {
    const validConnections = connectionIds.filter(id => {
      const metrics = this.metrics.get(id);
      return metrics && metrics.connectionUptime > 0;
    });
    
    if (validConnections.length === 0) return null;
    
    // Score connections based on multiple factors
    const scores = validConnections.map(id => {
      const metrics = this.metrics.get(id)!;
      
      // Lower latency is better (inverse score)
      const latencyScore = metrics.latency > 0 ? 1000 / metrics.latency : 1000;
      
      // Higher throughput is better
      const throughputScore = metrics.throughput * 10;
      
      // Lower error rate is better (inverse score)
      const errorScore = metrics.errorRate < 1 ? (1 - metrics.errorRate) * 100 : 0;
      
      // Longer uptime is better
      const uptimeScore = Math.min(metrics.connectionUptime / 1000, 3600); // Cap at 1 hour
      
      const totalScore = latencyScore + throughputScore + errorScore + uptimeScore;
      
      return { id, score: totalScore };
    });
    
    // Return connection with highest score
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.id || null;
  }
  
  cleanup(connectionId: string) {
    this.metrics.delete(connectionId);
    this.messageTimestamps.delete(connectionId);
    this.errorCounts.delete(connectionId);
    this.connectionStartTimes.delete(connectionId);
  }
}
```

This comprehensive guide provides modern, production-ready patterns for implementing WebSocket connections in financial applications. The patterns include proper error handling, reconnection strategies, type safety, and performance monitoring suitable for high-frequency financial data streams.