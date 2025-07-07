/**
 * REDIS CACHE PROVIDER
 * High-performance Redis cache implementation with connection pooling and failover
 */

import { createClient, RedisClientType } from 'redis';
import { env } from '../../../config/env';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  type: string;
  provider?: string;
  hitCount: number;
  metadata?: Record<string, any>;
}

export interface RedisStats {
  connected: boolean;
  totalCommands: number;
  failedCommands: number;
  memoryUsed: number;
  keyCount: number;
  uptime: number;
  reconnectAttempts: number;
}

export class RedisCacheProvider {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private stats: RedisStats = {
    connected: false,
    totalCommands: 0,
    failedCommands: 0,
    memoryUsed: 0,
    keyCount: 0,
    uptime: 0,
    reconnectAttempts: 0
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectInterval = 5000; // 5 seconds

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const redisUrl = env.REDIS_URL || env.UPSTASH_REDIS_URL || 'redis://localhost:6379';
      
      if (!redisUrl || redisUrl === 'redis://localhost:6379' && env.NODE_ENV === 'production') {
        console.log('🔧 Redis not configured for production, skipping...');
        return;
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          keepAlive: true
        },
        // Retry strategy
        retry_unfulfilled_commands: true,
        // Connection pooling settings
        legacyMode: false
      });

      this.setupEventHandlers();
      await this.connect();

    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      this.handleConnectionFailure();
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('🔄 Redis connecting...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis connected and ready');
      this.isConnected = true;
      this.stats.connected = true;
      this.stats.reconnectAttempts = 0;
      
      // Clear reconnect timer on successful connection
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error.message);
      this.stats.failedCommands++;
      this.handleConnectionFailure();
    });

    this.client.on('end', () => {
      console.log('⚠️ Redis connection ended');
      this.isConnected = false;
      this.stats.connected = false;
      this.scheduleReconnect();
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
      this.stats.reconnectAttempts++;
    });
  }

  private async connect(): Promise<void> {
    if (!this.client || this.isConnected) return;

    try {
      await this.client.connect();
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.handleConnectionFailure();
    }
  }

  private handleConnectionFailure(): void {
    this.isConnected = false;
    this.stats.connected = false;
    
    if (this.stats.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.warn('⚠️ Max Redis reconnect attempts reached, giving up');
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(async () => {
      if (this.stats.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Attempting Redis reconnect (${this.stats.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        await this.connect();
      }
      this.reconnectTimer = null;
    }, this.reconnectInterval);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      this.stats.totalCommands++;
      const cached = await this.client.get(key);
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check expiration
      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        return null;
      }

      // Update hit count
      entry.hitCount++;
      await this.updateHitCount(key, entry);
      
      return entry.data;

    } catch (error) {
      console.error(`❌ Redis get error for ${key}:`, error);
      this.stats.failedCommands++;
      return null;
    }
  }

  async set<T>(
    key: string, 
    data: T, 
    ttlMs: number, 
    type: string = 'unknown',
    provider?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.stats.totalCommands++;
      const now = Date.now();
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
        type,
        provider,
        hitCount: 0,
        metadata
      };

      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.client.setEx(key, ttlSeconds, JSON.stringify(entry));
      
      return true;

    } catch (error) {
      console.error(`❌ Redis set error for ${key}:`, error);
      this.stats.failedCommands++;
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.stats.totalCommands++;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`❌ Redis delete error for ${key}:`, error);
      this.stats.failedCommands++;
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      this.stats.totalCommands++;
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      return keys.length;

    } catch (error) {
      console.error(`❌ Redis delete pattern error for ${pattern}:`, error);
      this.stats.failedCommands++;
      return 0;
    }
  }

  async clear(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.stats.totalCommands++;
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('❌ Redis clear error:', error);
      this.stats.failedCommands++;
      return false;
    }
  }

  async getStats(): Promise<RedisStats> {
    if (!this.isConnected || !this.client) {
      return this.stats;
    }

    try {
      // Get Redis info
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      
      if (memoryMatch) {
        this.stats.memoryUsed = parseInt(memoryMatch[1], 10);
      }

      // Get key count
      const dbSize = await this.client.dbSize();
      this.stats.keyCount = dbSize;
      
      this.stats.uptime = process.uptime();

    } catch (error) {
      console.error('❌ Redis stats error:', error);
      this.stats.failedCommands++;
    }

    return { ...this.stats };
  }

  async getKeys(pattern: string = '*'): Promise<string[]> {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      this.stats.totalCommands++;
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`❌ Redis get keys error for ${pattern}:`, error);
      this.stats.failedCommands++;
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.stats.totalCommands++;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis exists error for ${key}:`, error);
      this.stats.failedCommands++;
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      this.stats.totalCommands++;
      const result = await this.client.expire(key, ttlSeconds);
      return result;
    } catch (error) {
      console.error(`❌ Redis expire error for ${key}:`, error);
      this.stats.failedCommands++;
      return false;
    }
  }

  async getTtl(key: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return -1;
    }

    try {
      this.stats.totalCommands++;
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`❌ Redis TTL error for ${key}:`, error);
      this.stats.failedCommands++;
      return -1;
    }
  }

  private async updateHitCount<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const ttlSeconds = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      if (ttlSeconds > 0) {
        await this.client!.setEx(key, ttlSeconds, JSON.stringify(entry));
      }
    } catch (error) {
      // Silent fail for hit count updates
      console.debug(`Cache hit count update failed for ${key}:`, error);
    }
  }

  isConnectedState(): boolean {
    return this.isConnected;
  }

  async ping(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Redis cache provider...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        console.log('✅ Redis connection closed cleanly');
      } catch (error) {
        console.error('❌ Error closing Redis connection:', error);
      }
    }

    this.isConnected = false;
    this.stats.connected = false;
  }
}

// Export singleton instance
export const redisCache = new RedisCacheProvider();