# Redis Caching Patterns for Financial Applications

A comprehensive guide to implementing multi-layer caching with Redis for financial applications, focusing on TypeScript implementations with proper TTL strategies, cache invalidation patterns, and real-time updates.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [TypeScript Redis Client Setup](#typescript-redis-client-setup)
3. [Multi-Layer Caching Architecture](#multi-layer-caching-architecture)
4. [TTL Strategies for Financial Data](#ttl-strategies-for-financial-data)
5. [Cache Invalidation Patterns](#cache-invalidation-patterns)
6. [Pub/Sub for Real-Time Updates](#pubsub-for-real-time-updates)
7. [Hot/Warm/Cold Data Separation](#hotwarmcold-data-separation)
8. [Implementation Examples](#implementation-examples)

## Architecture Overview

Financial applications require robust caching strategies to handle:
- High-frequency market data updates
- User account balances and transactions
- Historical data queries
- Real-time price feeds
- Regulatory compliance data

The architecture implements a three-tier caching strategy:
1. **Memory Layer** - In-process cache for ultra-low latency
2. **Redis Layer** - Distributed cache for shared state
3. **Database Layer** - Persistent storage

## TypeScript Redis Client Setup

### Installation

```bash
npm install ioredis @types/node
# or
npm install redis @types/node
```

### Basic Client Configuration

```typescript
// redis-client.ts
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryStrategy?: (times: number) => number | void;
  enableOfflineQueue?: boolean;
  maxRetriesPerRequest?: number;
}

export class FinancialRedisClient {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(config: RedisConfig) {
    const baseConfig = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      enableOfflineQueue: config.enableOfflineQueue ?? false,
      maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
      retryStrategy: config.retryStrategy || ((times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      })
    };

    // Main client for general operations
    this.client = new Redis(baseConfig);
    
    // Dedicated subscriber (required for Pub/Sub)
    this.subscriber = this.client.duplicate();
    
    // Dedicated publisher
    this.publisher = this.client.duplicate();

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    const errorHandler = (err: Error) => {
      console.error('Redis Client Error:', err);
    };

    this.client.on('error', errorHandler);
    this.subscriber.on('error', errorHandler);
    this.publisher.on('error', errorHandler);
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.client.quit(),
      this.subscriber.quit(),
      this.publisher.quit()
    ]);
  }
}
```

## Multi-Layer Caching Architecture

### Layer 1: In-Memory Cache

```typescript
// memory-cache.ts
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  set(key: string, value: T, ttlSeconds: number): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store with timestamp
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.timers.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.cache.delete(key);
  }

  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
```

### Layer 2: Redis Distributed Cache

```typescript
// distributed-cache.ts
import { Redis } from 'ioredis';

export interface CacheOptions {
  ttl?: number;
  version?: string;
  compression?: boolean;
}

export class DistributedCache {
  constructor(
    private redis: Redis,
    private defaultTTL: number = 3600 // 1 hour default
  ) {}

  private buildKey(namespace: string, key: string, version?: string): string {
    const parts = ['cache', namespace];
    if (version) parts.push(`v${version}`);
    parts.push(key);
    return parts.join(':');
  }

  async get<T>(
    namespace: string, 
    key: string, 
    options?: CacheOptions
  ): Promise<T | null> {
    const cacheKey = this.buildKey(namespace, key, options?.version);
    const value = await this.redis.get(cacheKey);
    
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to parse cache value for ${cacheKey}:`, error);
      await this.redis.del(cacheKey);
      return null;
    }
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    const cacheKey = this.buildKey(namespace, key, options?.version);
    const ttl = options?.ttl ?? this.defaultTTL;
    const serialized = JSON.stringify(value);

    if (ttl > 0) {
      await this.redis.setex(cacheKey, ttl, serialized);
    } else {
      await this.redis.set(cacheKey, serialized);
    }
  }

  async mget<T>(
    namespace: string,
    keys: string[],
    options?: CacheOptions
  ): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    const cacheKeys = keys.map(key => 
      this.buildKey(namespace, key, options?.version)
    );
    
    const values = await this.redis.mget(...cacheKeys);
    
    return values.map(value => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    });
  }

  async mset<T>(
    namespace: string,
    items: Array<{ key: string; value: T }>,
    options?: CacheOptions
  ): Promise<void> {
    if (items.length === 0) return;

    const ttl = options?.ttl ?? this.defaultTTL;
    const pipeline = this.redis.pipeline();

    items.forEach(({ key, value }) => {
      const cacheKey = this.buildKey(namespace, key, options?.version);
      const serialized = JSON.stringify(value);
      
      if (ttl > 0) {
        pipeline.setex(cacheKey, ttl, serialized);
      } else {
        pipeline.set(cacheKey, serialized);
      }
    });

    await pipeline.exec();
  }

  async delete(
    namespace: string,
    key: string,
    options?: CacheOptions
  ): Promise<void> {
    const cacheKey = this.buildKey(namespace, key, options?.version);
    await this.redis.del(cacheKey);
  }

  async deletePattern(namespace: string, pattern: string): Promise<number> {
    const scanPattern = this.buildKey(namespace, pattern, undefined);
    const keys: string[] = [];
    
    // Use scanStream for efficient key discovery
    const stream = this.redis.scanStream({
      match: scanPattern,
      count: 100
    });

    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys);
    });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (keys.length > 0) {
      return await this.redis.del(...keys);
    }

    return 0;
  }

  async exists(
    namespace: string,
    key: string,
    options?: CacheOptions
  ): Promise<boolean> {
    const cacheKey = this.buildKey(namespace, key, options?.version);
    const exists = await this.redis.exists(cacheKey);
    return exists === 1;
  }

  async getTTL(
    namespace: string,
    key: string,
    options?: CacheOptions
  ): Promise<number> {
    const cacheKey = this.buildKey(namespace, key, options?.version);
    return await this.redis.ttl(cacheKey);
  }

  async expire(
    namespace: string,
    key: string,
    ttlSeconds: number,
    options?: CacheOptions
  ): Promise<boolean> {
    const cacheKey = this.buildKey(namespace, key, options?.version);
    const result = await this.redis.expire(cacheKey, ttlSeconds);
    return result === 1;
  }
}
```

### Multi-Layer Cache Manager

```typescript
// multi-layer-cache.ts
export interface MultiLayerCacheConfig {
  memoryTTL: number;
  redisTTL: number;
  namespace: string;
  version?: string;
}

export class MultiLayerCache<T> {
  private memoryCache: MemoryCache<T>;
  private distributedCache: DistributedCache;

  constructor(
    private config: MultiLayerCacheConfig,
    distributedCache: DistributedCache
  ) {
    this.memoryCache = new MemoryCache<T>();
    this.distributedCache = distributedCache;
  }

  async get(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== null) {
      return memoryValue;
    }

    // Check Redis cache
    const redisValue = await this.distributedCache.get<T>(
      this.config.namespace,
      key,
      { version: this.config.version }
    );

    if (redisValue !== null) {
      // Populate memory cache
      this.memoryCache.set(key, redisValue, this.config.memoryTTL);
      return redisValue;
    }

    return null;
  }

  async set(key: string, value: T): Promise<void> {
    // Set in both layers
    this.memoryCache.set(key, value, this.config.memoryTTL);
    
    await this.distributedCache.set(
      this.config.namespace,
      key,
      value,
      { 
        ttl: this.config.redisTTL,
        version: this.config.version 
      }
    );
  }

  async invalidate(key: string): Promise<void> {
    // Remove from both layers
    this.memoryCache.delete(key);
    await this.distributedCache.delete(
      this.config.namespace,
      key,
      { version: this.config.version }
    );
  }

  async invalidatePattern(pattern: string): Promise<number> {
    // Clear memory cache (simple implementation)
    this.memoryCache.clear();
    
    // Clear Redis keys matching pattern
    return await this.distributedCache.deletePattern(
      this.config.namespace,
      pattern
    );
  }
}
```

## TTL Strategies for Financial Data

Different types of financial data require different TTL strategies:

```typescript
// ttl-strategies.ts
export enum DataType {
  MARKET_PRICE = 'market_price',
  ACCOUNT_BALANCE = 'account_balance',
  TRANSACTION_HISTORY = 'transaction_history',
  USER_PROFILE = 'user_profile',
  REFERENCE_DATA = 'reference_data',
  REGULATORY_DATA = 'regulatory_data'
}

export interface TTLStrategy {
  memoryTTL: number;
  redisTTL: number;
  description: string;
}

export const TTL_STRATEGIES: Record<DataType, TTLStrategy> = {
  [DataType.MARKET_PRICE]: {
    memoryTTL: 1,      // 1 second
    redisTTL: 5,       // 5 seconds
    description: 'Real-time market prices - very short TTL'
  },
  [DataType.ACCOUNT_BALANCE]: {
    memoryTTL: 10,     // 10 seconds
    redisTTL: 60,      // 1 minute
    description: 'Account balances - short TTL for consistency'
  },
  [DataType.TRANSACTION_HISTORY]: {
    memoryTTL: 300,    // 5 minutes
    redisTTL: 3600,    // 1 hour
    description: 'Transaction history - medium TTL for read-heavy data'
  },
  [DataType.USER_PROFILE]: {
    memoryTTL: 600,    // 10 minutes
    redisTTL: 7200,    // 2 hours
    description: 'User profiles - longer TTL for stable data'
  },
  [DataType.REFERENCE_DATA]: {
    memoryTTL: 3600,   // 1 hour
    redisTTL: 86400,   // 24 hours
    description: 'Reference data - long TTL for rarely changing data'
  },
  [DataType.REGULATORY_DATA]: {
    memoryTTL: 1800,   // 30 minutes
    redisTTL: 10800,   // 3 hours
    description: 'Regulatory data - balanced TTL for compliance'
  }
};

// Dynamic TTL based on data characteristics
export class DynamicTTLCalculator {
  static calculate(
    dataType: DataType,
    options?: {
      isVolatile?: boolean;
      updateFrequency?: number; // updates per hour
      dataSize?: number; // bytes
      accessPattern?: 'read-heavy' | 'write-heavy' | 'balanced';
    }
  ): TTLStrategy {
    const baseStrategy = TTL_STRATEGIES[dataType];
    
    if (!options) return baseStrategy;

    let memoryTTL = baseStrategy.memoryTTL;
    let redisTTL = baseStrategy.redisTTL;

    // Adjust based on volatility
    if (options.isVolatile) {
      memoryTTL = Math.max(1, memoryTTL * 0.5);
      redisTTL = Math.max(5, redisTTL * 0.5);
    }

    // Adjust based on update frequency
    if (options.updateFrequency && options.updateFrequency > 60) {
      // High update frequency - reduce TTL
      memoryTTL = Math.max(1, memoryTTL * 0.3);
      redisTTL = Math.max(5, redisTTL * 0.3);
    }

    // Adjust based on data size
    if (options.dataSize && options.dataSize > 1024 * 1024) {
      // Large data - reduce memory TTL
      memoryTTL = Math.max(1, memoryTTL * 0.5);
    }

    // Adjust based on access pattern
    if (options.accessPattern === 'read-heavy') {
      // Increase TTL for read-heavy patterns
      memoryTTL = Math.min(3600, memoryTTL * 1.5);
      redisTTL = Math.min(86400, redisTTL * 1.5);
    }

    return {
      memoryTTL: Math.round(memoryTTL),
      redisTTL: Math.round(redisTTL),
      description: `Dynamic TTL based on ${baseStrategy.description}`
    };
  }
}
```

## Cache Invalidation Patterns

### Event-Driven Invalidation

```typescript
// cache-invalidation.ts
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

export enum InvalidationEvent {
  PRICE_UPDATE = 'price_update',
  BALANCE_CHANGE = 'balance_change',
  TRANSACTION_COMPLETE = 'transaction_complete',
  USER_UPDATE = 'user_update',
  REFERENCE_DATA_UPDATE = 'reference_data_update'
}

export interface InvalidationMessage {
  event: InvalidationEvent;
  keys: string[];
  pattern?: string;
  timestamp: number;
}

export class CacheInvalidator extends EventEmitter {
  private static INVALIDATION_CHANNEL = 'cache:invalidation';

  constructor(
    private publisher: Redis,
    private subscriber: Redis
  ) {
    super();
    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.subscribe(CacheInvalidator.INVALIDATION_CHANNEL);
    
    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === CacheInvalidator.INVALIDATION_CHANNEL) {
        try {
          const invalidation: InvalidationMessage = JSON.parse(message);
          this.emit('invalidate', invalidation);
        } catch (error) {
          console.error('Failed to parse invalidation message:', error);
        }
      }
    });
  }

  async invalidate(
    event: InvalidationEvent,
    keys: string[],
    pattern?: string
  ): Promise<void> {
    const message: InvalidationMessage = {
      event,
      keys,
      pattern,
      timestamp: Date.now()
    };

    await this.publisher.publish(
      CacheInvalidator.INVALIDATION_CHANNEL,
      JSON.stringify(message)
    );
  }

  async invalidatePrice(symbol: string): Promise<void> {
    await this.invalidate(
      InvalidationEvent.PRICE_UPDATE,
      [`price:${symbol}`, `quote:${symbol}`],
      `orderbook:${symbol}:*`
    );
  }

  async invalidateAccount(accountId: string): Promise<void> {
    await this.invalidate(
      InvalidationEvent.BALANCE_CHANGE,
      [
        `balance:${accountId}`,
        `portfolio:${accountId}`,
        `positions:${accountId}`
      ]
    );
  }

  async invalidateTransaction(
    accountId: string,
    transactionId: string
  ): Promise<void> {
    await this.invalidate(
      InvalidationEvent.TRANSACTION_COMPLETE,
      [
        `transaction:${transactionId}`,
        `balance:${accountId}`,
        `history:${accountId}`
      ]
    );
  }
}

// Cache manager with invalidation support
export class InvalidationAwareCache<T> extends MultiLayerCache<T> {
  constructor(
    config: MultiLayerCacheConfig,
    distributedCache: DistributedCache,
    private invalidator: CacheInvalidator
  ) {
    super(config, distributedCache);
    
    this.invalidator.on('invalidate', async (message: InvalidationMessage) => {
      // Handle key-based invalidation
      for (const key of message.keys) {
        if (key.startsWith(`${config.namespace}:`)) {
          const cacheKey = key.replace(`${config.namespace}:`, '');
          await this.invalidate(cacheKey);
        }
      }
      
      // Handle pattern-based invalidation
      if (message.pattern && message.pattern.startsWith(`${config.namespace}:`)) {
        const pattern = message.pattern.replace(`${config.namespace}:`, '');
        await this.invalidatePattern(pattern);
      }
    });
  }
}
```

### Write-Through Cache Pattern

```typescript
// write-through-cache.ts
export interface DataStore<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export class WriteThroughCache<T> {
  constructor(
    private cache: MultiLayerCache<T>,
    private dataStore: DataStore<T>,
    private invalidator?: CacheInvalidator
  ) {}

  async get(key: string): Promise<T | null> {
    // Try cache first
    const cachedValue = await this.cache.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // Load from data store
    const value = await this.dataStore.get(key);
    if (value !== null) {
      // Populate cache
      await this.cache.set(key, value);
    }

    return value;
  }

  async set(key: string, value: T): Promise<void> {
    // Write to data store first
    await this.dataStore.set(key, value);
    
    // Update cache
    await this.cache.set(key, value);
    
    // Broadcast invalidation if configured
    if (this.invalidator) {
      await this.invalidator.invalidate(
        InvalidationEvent.USER_UPDATE,
        [key]
      );
    }
  }

  async delete(key: string): Promise<void> {
    // Delete from data store first
    await this.dataStore.delete(key);
    
    // Invalidate cache
    await this.cache.invalidate(key);
    
    // Broadcast invalidation if configured
    if (this.invalidator) {
      await this.invalidator.invalidate(
        InvalidationEvent.USER_UPDATE,
        [key]
      );
    }
  }
}
```

## Pub/Sub for Real-Time Updates

### Market Data Streaming

```typescript
// market-data-stream.ts
export interface MarketPrice {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

export interface MarketDataSubscriber {
  onPriceUpdate(price: MarketPrice): void;
  onError(error: Error): void;
}

export class MarketDataStream {
  private static PRICE_CHANNEL_PREFIX = 'market:price:';
  private subscribers = new Map<string, Set<MarketDataSubscriber>>();
  private subscribedChannels = new Set<string>();

  constructor(
    private publisher: Redis,
    private subscriber: Redis,
    private cache: MultiLayerCache<MarketPrice>
  ) {
    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.on('pmessage', async (
      pattern: string,
      channel: string,
      message: string
    ) => {
      if (channel.startsWith(MarketDataStream.PRICE_CHANNEL_PREFIX)) {
        const symbol = channel.replace(MarketDataStream.PRICE_CHANNEL_PREFIX, '');
        try {
          const price: MarketPrice = JSON.parse(message);
          
          // Update cache
          await this.cache.set(symbol, price);
          
          // Notify subscribers
          const symbolSubscribers = this.subscribers.get(symbol);
          if (symbolSubscribers) {
            symbolSubscribers.forEach(subscriber => {
              try {
                subscriber.onPriceUpdate(price);
              } catch (error) {
                subscriber.onError(error as Error);
              }
            });
          }
        } catch (error) {
          console.error(`Failed to process price update for ${symbol}:`, error);
        }
      }
    });
  }

  async subscribe(
    symbol: string,
    subscriber: MarketDataSubscriber
  ): Promise<void> {
    // Add to local subscribers
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(subscriber);

    // Subscribe to Redis channel if not already subscribed
    const channel = `${MarketDataStream.PRICE_CHANNEL_PREFIX}${symbol}`;
    if (!this.subscribedChannels.has(channel)) {
      await this.subscriber.psubscribe(channel);
      this.subscribedChannels.add(channel);
    }

    // Send cached price if available
    const cachedPrice = await this.cache.get(symbol);
    if (cachedPrice) {
      subscriber.onPriceUpdate(cachedPrice);
    }
  }

  async unsubscribe(
    symbol: string,
    subscriber: MarketDataSubscriber
  ): Promise<void> {
    const symbolSubscribers = this.subscribers.get(symbol);
    if (symbolSubscribers) {
      symbolSubscribers.delete(subscriber);
      
      // Unsubscribe from Redis if no more local subscribers
      if (symbolSubscribers.size === 0) {
        this.subscribers.delete(symbol);
        const channel = `${MarketDataStream.PRICE_CHANNEL_PREFIX}${symbol}`;
        await this.subscriber.punsubscribe(channel);
        this.subscribedChannels.delete(channel);
      }
    }
  }

  async publishPrice(price: MarketPrice): Promise<void> {
    const channel = `${MarketDataStream.PRICE_CHANNEL_PREFIX}${price.symbol}`;
    await this.publisher.publish(channel, JSON.stringify(price));
  }
}
```

### Account Update Notifications

```typescript
// account-notifications.ts
export enum AccountEventType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRADE_EXECUTED = 'trade_executed',
  POSITION_OPENED = 'position_opened',
  POSITION_CLOSED = 'position_closed',
  MARGIN_CALL = 'margin_call'
}

export interface AccountEvent {
  type: AccountEventType;
  accountId: string;
  data: any;
  timestamp: number;
}

export class AccountNotificationService {
  private static ACCOUNT_CHANNEL_PREFIX = 'account:events:';

  constructor(
    private publisher: Redis,
    private subscriber: Redis,
    private invalidator: CacheInvalidator
  ) {}

  async publishEvent(event: AccountEvent): Promise<void> {
    const channel = `${AccountNotificationService.ACCOUNT_CHANNEL_PREFIX}${event.accountId}`;
    
    // Publish event
    await this.publisher.publish(channel, JSON.stringify(event));
    
    // Invalidate related caches
    switch (event.type) {
      case AccountEventType.DEPOSIT:
      case AccountEventType.WITHDRAWAL:
        await this.invalidator.invalidateAccount(event.accountId);
        break;
        
      case AccountEventType.TRADE_EXECUTED:
        await this.invalidator.invalidateAccount(event.accountId);
        await this.invalidator.invalidateTransaction(
          event.accountId,
          event.data.transactionId
        );
        break;
        
      case AccountEventType.POSITION_OPENED:
      case AccountEventType.POSITION_CLOSED:
        await this.invalidator.invalidate(
          InvalidationEvent.BALANCE_CHANGE,
          [
            `positions:${event.accountId}`,
            `portfolio:${event.accountId}`,
            `risk:${event.accountId}`
          ]
        );
        break;
    }
  }

  async subscribeToAccount(
    accountId: string,
    callback: (event: AccountEvent) => void
  ): Promise<void> {
    const channel = `${AccountNotificationService.ACCOUNT_CHANNEL_PREFIX}${accountId}`;
    
    await this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) {
        try {
          const event: AccountEvent = JSON.parse(message);
          callback(event);
        } catch (error) {
          console.error(`Failed to parse account event:`, error);
        }
      }
    });
  }
}
```

## Hot/Warm/Cold Data Separation

### Data Temperature Classification

```typescript
// data-temperature.ts
export enum DataTemperature {
  HOT = 'hot',     // < 1 minute old, accessed frequently
  WARM = 'warm',   // 1 minute - 1 hour old, moderate access
  COLD = 'cold'    // > 1 hour old, rarely accessed
}

export interface TemperatureConfig {
  hotThreshold: number;    // seconds
  warmThreshold: number;   // seconds
  hotTTL: number;         // seconds
  warmTTL: number;        // seconds
  coldTTL: number;        // seconds
}

export const DEFAULT_TEMPERATURE_CONFIG: TemperatureConfig = {
  hotThreshold: 60,        // 1 minute
  warmThreshold: 3600,     // 1 hour
  hotTTL: 10,             // 10 seconds in memory
  warmTTL: 300,           // 5 minutes in Redis
  coldTTL: 86400          // 24 hours in Redis
};

export class TemperatureAwareCache<T> {
  private accessCounts = new Map<string, number>();
  private lastAccess = new Map<string, number>();

  constructor(
    private hotCache: MemoryCache<T>,
    private warmCache: DistributedCache,
    private coldCache: DistributedCache,
    private config: TemperatureConfig = DEFAULT_TEMPERATURE_CONFIG
  ) {}

  private getDataTemperature(key: string): DataTemperature {
    const now = Date.now();
    const lastAccessTime = this.lastAccess.get(key) || 0;
    const age = (now - lastAccessTime) / 1000; // Convert to seconds

    if (age < this.config.hotThreshold) {
      return DataTemperature.HOT;
    } else if (age < this.config.warmThreshold) {
      return DataTemperature.WARM;
    } else {
      return DataTemperature.COLD;
    }
  }

  private updateAccessMetrics(key: string): void {
    const now = Date.now();
    this.lastAccess.set(key, now);
    
    const count = this.accessCounts.get(key) || 0;
    this.accessCounts.set(key, count + 1);

    // Clean up old entries periodically
    if (this.accessCounts.size > 10000) {
      const cutoff = now - (this.config.warmThreshold * 2 * 1000);
      for (const [k, time] of this.lastAccess.entries()) {
        if (time < cutoff) {
          this.accessCounts.delete(k);
          this.lastAccess.delete(k);
        }
      }
    }
  }

  async get(namespace: string, key: string): Promise<T | null> {
    const temperature = this.getDataTemperature(key);
    this.updateAccessMetrics(key);

    // Check hot cache first (always)
    const hotValue = this.hotCache.get(key);
    if (hotValue !== null) {
      return hotValue;
    }

    let value: T | null = null;
    let ttl: number;

    switch (temperature) {
      case DataTemperature.HOT:
        // Check warm cache
        value = await this.warmCache.get<T>(namespace, key);
        ttl = this.config.hotTTL;
        break;

      case DataTemperature.WARM:
        // Check warm cache
        value = await this.warmCache.get<T>(namespace, key);
        if (value === null) {
          // Fall back to cold cache
          value = await this.coldCache.get<T>(namespace, key);
        }
        ttl = this.config.warmTTL;
        break;

      case DataTemperature.COLD:
        // Check cold cache
        value = await this.coldCache.get<T>(namespace, key);
        ttl = this.config.coldTTL;
        break;
    }

    if (value !== null) {
      // Populate hot cache for frequently accessed data
      const accessCount = this.accessCounts.get(key) || 0;
      if (accessCount > 3 || temperature === DataTemperature.HOT) {
        this.hotCache.set(key, value, ttl);
      }
    }

    return value;
  }

  async set(
    namespace: string,
    key: string,
    value: T,
    explicitTemperature?: DataTemperature
  ): Promise<void> {
    const temperature = explicitTemperature || this.getDataTemperature(key);
    this.updateAccessMetrics(key);

    switch (temperature) {
      case DataTemperature.HOT:
        this.hotCache.set(key, value, this.config.hotTTL);
        await this.warmCache.set(namespace, key, value, {
          ttl: this.config.warmTTL
        });
        break;

      case DataTemperature.WARM:
        await this.warmCache.set(namespace, key, value, {
          ttl: this.config.warmTTL
        });
        break;

      case DataTemperature.COLD:
        await this.coldCache.set(namespace, key, value, {
          ttl: this.config.coldTTL
        });
        break;
    }
  }

  async promote(namespace: string, key: string): Promise<void> {
    // Promote cold data to warm
    const value = await this.coldCache.get<T>(namespace, key);
    if (value !== null) {
      await this.warmCache.set(namespace, key, value, {
        ttl: this.config.warmTTL
      });
    }
  }

  async demote(namespace: string, key: string): Promise<void> {
    // Demote warm data to cold
    const value = await this.warmCache.get<T>(namespace, key);
    if (value !== null) {
      await this.coldCache.set(namespace, key, value, {
        ttl: this.config.coldTTL
      });
      await this.warmCache.delete(namespace, key);
    }
  }
}
```

### Historical Data Management

```typescript
// historical-data-cache.ts
export interface HistoricalDataPoint {
  timestamp: number;
  value: number;
  volume?: number;
}

export interface HistoricalDataRange {
  symbol: string;
  startTime: number;
  endTime: number;
  interval: string; // '1m', '5m', '1h', '1d'
  data: HistoricalDataPoint[];
}

export class HistoricalDataCache {
  constructor(
    private temperatureCache: TemperatureAwareCache<HistoricalDataRange>,
    private redis: Redis
  ) {}

  private buildRangeKey(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number
  ): string {
    const startDate = new Date(startTime).toISOString().split('T')[0];
    const endDate = new Date(endTime).toISOString().split('T')[0];
    return `${symbol}:${interval}:${startDate}:${endDate}`;
  }

  async getRange(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number
  ): Promise<HistoricalDataRange | null> {
    const key = this.buildRangeKey(symbol, interval, startTime, endTime);
    return await this.temperatureCache.get('historical', key);
  }

  async setRange(
    range: HistoricalDataRange
  ): Promise<void> {
    const key = this.buildRangeKey(
      range.symbol,
      range.interval,
      range.startTime,
      range.endTime
    );

    // Determine temperature based on data age
    const now = Date.now();
    const dataAge = now - range.endTime;
    let temperature: DataTemperature;

    if (dataAge < 60 * 60 * 1000) { // Less than 1 hour old
      temperature = DataTemperature.HOT;
    } else if (dataAge < 24 * 60 * 60 * 1000) { // Less than 1 day old
      temperature = DataTemperature.WARM;
    } else {
      temperature = DataTemperature.COLD;
    }

    await this.temperatureCache.set(
      'historical',
      key,
      range,
      temperature
    );
  }

  async aggregateRanges(
    symbol: string,
    interval: string,
    ranges: Array<{ startTime: number; endTime: number }>
  ): Promise<HistoricalDataRange[]> {
    const results = await Promise.all(
      ranges.map(range =>
        this.getRange(symbol, interval, range.startTime, range.endTime)
      )
    );

    return results.filter((range): range is HistoricalDataRange => 
      range !== null
    );
  }
}
```

## Implementation Examples

### Complete Financial Cache Service

```typescript
// financial-cache-service.ts
export interface FinancialCacheConfig {
  redis: RedisConfig;
  temperatureConfig?: TemperatureConfig;
}

export class FinancialCacheService {
  private redisClient: FinancialRedisClient;
  private distributedCache: DistributedCache;
  private cacheInvalidator: CacheInvalidator;
  private marketDataStream: MarketDataStream;
  private accountNotifications: AccountNotificationService;
  
  // Specialized caches
  private priceCache: MultiLayerCache<MarketPrice>;
  private balanceCache: InvalidationAwareCache<AccountBalance>;
  private historicalCache: HistoricalDataCache;
  private temperatureCache: TemperatureAwareCache<any>;

  constructor(config: FinancialCacheConfig) {
    // Initialize Redis clients
    this.redisClient = new FinancialRedisClient(config.redis);
    
    // Initialize core services
    this.distributedCache = new DistributedCache(
      this.redisClient.getClient()
    );
    
    this.cacheInvalidator = new CacheInvalidator(
      this.redisClient.getPublisher(),
      this.redisClient.getSubscriber()
    );

    // Initialize specialized caches
    this.initializeCaches(config.temperatureConfig);
    
    // Initialize real-time services
    this.marketDataStream = new MarketDataStream(
      this.redisClient.getPublisher(),
      this.redisClient.getSubscriber(),
      this.priceCache
    );
    
    this.accountNotifications = new AccountNotificationService(
      this.redisClient.getPublisher(),
      this.redisClient.getSubscriber(),
      this.cacheInvalidator
    );
  }

  private initializeCaches(temperatureConfig?: TemperatureConfig): void {
    // Price cache with very short TTL
    this.priceCache = new MultiLayerCache<MarketPrice>({
      memoryTTL: TTL_STRATEGIES[DataType.MARKET_PRICE].memoryTTL,
      redisTTL: TTL_STRATEGIES[DataType.MARKET_PRICE].redisTTL,
      namespace: 'price'
    }, this.distributedCache);

    // Balance cache with invalidation support
    this.balanceCache = new InvalidationAwareCache<AccountBalance>({
      memoryTTL: TTL_STRATEGIES[DataType.ACCOUNT_BALANCE].memoryTTL,
      redisTTL: TTL_STRATEGIES[DataType.ACCOUNT_BALANCE].redisTTL,
      namespace: 'balance'
    }, this.distributedCache, this.cacheInvalidator);

    // Temperature-aware cache for mixed data
    const hotCache = new MemoryCache<any>();
    const warmCache = new DistributedCache(
      this.redisClient.getClient(),
      300 // 5 minutes default
    );
    const coldCache = new DistributedCache(
      this.redisClient.getClient(),
      86400 // 24 hours default
    );

    this.temperatureCache = new TemperatureAwareCache(
      hotCache,
      warmCache,
      coldCache,
      temperatureConfig
    );

    // Historical data cache
    this.historicalCache = new HistoricalDataCache(
      this.temperatureCache,
      this.redisClient.getClient()
    );
  }

  // Public API methods
  async getMarketPrice(symbol: string): Promise<MarketPrice | null> {
    return await this.priceCache.get(symbol);
  }

  async setMarketPrice(price: MarketPrice): Promise<void> {
    await this.priceCache.set(price.symbol, price);
    await this.marketDataStream.publishPrice(price);
  }

  async getAccountBalance(accountId: string): Promise<AccountBalance | null> {
    return await this.balanceCache.get(accountId);
  }

  async updateAccountBalance(
    accountId: string,
    balance: AccountBalance
  ): Promise<void> {
    await this.balanceCache.set(accountId, balance);
    await this.accountNotifications.publishEvent({
      type: AccountEventType.DEPOSIT,
      accountId,
      data: balance,
      timestamp: Date.now()
    });
  }

  async getHistoricalData(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number
  ): Promise<HistoricalDataRange | null> {
    return await this.historicalCache.getRange(
      symbol,
      interval,
      startTime,
      endTime
    );
  }

  async subscribeToMarketData(
    symbol: string,
    subscriber: MarketDataSubscriber
  ): Promise<void> {
    await this.marketDataStream.subscribe(symbol, subscriber);
  }

  async subscribeToAccountUpdates(
    accountId: string,
    callback: (event: AccountEvent) => void
  ): Promise<void> {
    await this.accountNotifications.subscribeToAccount(accountId, callback);
  }

  async shutdown(): Promise<void> {
    await this.redisClient.disconnect();
  }
}

// Type definitions
interface AccountBalance {
  accountId: string;
  currency: string;
  available: number;
  locked: number;
  total: number;
  lastUpdated: number;
}
```

### Usage Example

```typescript
// example-usage.ts
async function main() {
  // Initialize cache service
  const cacheService = new FinancialCacheService({
    redis: {
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD
    }
  });

  // Market data subscription
  const priceSubscriber: MarketDataSubscriber = {
    onPriceUpdate: (price) => {
      console.log(`Price update for ${price.symbol}:`, price);
    },
    onError: (error) => {
      console.error('Price subscription error:', error);
    }
  };

  await cacheService.subscribeToMarketData('BTC/USD', priceSubscriber);

  // Account updates subscription
  await cacheService.subscribeToAccountUpdates('account123', (event) => {
    console.log(`Account event: ${event.type}`, event.data);
  });

  // Set and get market price
  await cacheService.setMarketPrice({
    symbol: 'BTC/USD',
    bid: 45000.00,
    ask: 45010.00,
    last: 45005.00,
    volume: 1234.56,
    timestamp: Date.now()
  });

  const price = await cacheService.getMarketPrice('BTC/USD');
  console.log('Current BTC/USD price:', price);

  // Historical data
  const historicalData = await cacheService.getHistoricalData(
    'BTC/USD',
    '1h',
    Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
    Date.now()
  );
  console.log('Historical data points:', historicalData?.data.length);

  // Cleanup
  await cacheService.shutdown();
}

// Run the example
main().catch(console.error);
```

## Best Practices

1. **Connection Management**
   - Use connection pooling for high-throughput applications
   - Separate connections for Pub/Sub operations
   - Implement proper error handling and reconnection logic

2. **TTL Management**
   - Use shorter TTLs for volatile financial data
   - Implement dynamic TTL adjustment based on data characteristics
   - Monitor cache hit rates and adjust TTLs accordingly

3. **Cache Invalidation**
   - Use event-driven invalidation for real-time consistency
   - Implement pattern-based invalidation for related data
   - Consider eventual consistency for non-critical data

4. **Memory Management**
   - Monitor memory usage in both application and Redis
   - Implement cache size limits and eviction policies
   - Use compression for large data sets

5. **Security Considerations**
   - Encrypt sensitive financial data before caching
   - Implement access control at the cache layer
   - Audit cache access for compliance

6. **Monitoring and Observability**
   - Track cache hit/miss rates
   - Monitor latency for cache operations
   - Set up alerts for cache failures
   - Log invalidation events for debugging

## Conclusion

This guide provides a comprehensive approach to implementing Redis caching patterns for financial applications. The multi-layer architecture, combined with proper TTL strategies and real-time invalidation, ensures optimal performance while maintaining data consistency. The temperature-based data separation allows efficient resource utilization for different types of financial data.

Remember to adapt these patterns to your specific use case and compliance requirements. Regular monitoring and optimization based on actual usage patterns will help maintain optimal cache performance over time.