import Redis from 'ioredis';
import { logger } from '../lib/logger.js';

/**
 * Redis Cache Service
 * Implements 3-tier cache strategy: Memory → Redis → Supabase
 * According to ALFALYZER-PRODUCTION-PLAN.md Day 3 requirements
 */
export class RedisCacheService {
  private redis: Redis;
  private connected: boolean = false;

  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    errors: 0,
    connectionErrors: 0
  };

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD, // Add password support
      maxmemoryPolicy: 'allkeys-lru', // LRU eviction as per requirements
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      commandTimeout: 3000,
      // Development settings - match production Hetzner config
      maxmemoryMemory: 256 * 1024 * 1024, // 256MB limit as per plan
      lazyConnect: true, // Don't connect immediately
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
      this.connected = true;
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis ready for commands');
      this.logRedisInfo();
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis error:', error);
      this.stats.connectionErrors++;
      this.connected = false;
    });

    this.redis.on('close', () => {
      console.warn('⚠️ Redis connection closed');
      this.connected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.stats.connectionErrors++;
    }
  }

  private async logRedisInfo(): Promise<void> {
    try {
      const info = await this.redis.info('memory');
      const memoryUsed = this.parseMemoryUsage(info);
      console.log(`📊 Redis Memory Usage: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.error('❌ Failed to get Redis info:', error);
    }
  }

  private parseMemoryUsage(info: string): number {
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get data from Redis
   */
  async get(key: string): Promise<any> {
    if (!this.connected) {
      console.warn('⚠️ Redis not connected, skipping cache get');
      this.stats.misses++;
      return null;
    }

    try {
      const data = await this.redis.get(key);
      
      if (data) {
        this.stats.hits++;
        console.log(`🔗 Redis HIT: ${key}`);
        return JSON.parse(data);
      } else {
        this.stats.misses++;
        console.log(`❌ Redis MISS: ${key}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Redis get error for ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set data in Redis with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.connected) {
      console.warn('⚠️ Redis not connected, skipping cache set');
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, serialized);
      
      this.stats.sets++;
      console.log(`🔗 Redis SET: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      console.error(`❌ Redis set error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.redis.del(key);
      console.log(`🗑️ Redis DEL: ${key}`);
    } catch (error) {
      console.error(`❌ Redis delete error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ Redis DEL PATTERN: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      console.error(`❌ Redis delete pattern error for ${pattern}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * List keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) {
      return [];
    }
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error(`❌ Redis keys error for ${pattern}:`, error);
      this.stats.errors++;
      return [];
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis exists error for ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`❌ Redis expire error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    if (!this.connected) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`❌ Redis TTL error for ${key}:`, error);
      this.stats.errors++;
      return -1;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.redis.flushdb();
      console.log('🗑️ Redis cache cleared');
    } catch (error) {
      console.error('❌ Redis clear error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): typeof this.stats & { connected: boolean; memoryUsage?: string } {
    return {
      ...this.stats,
      connected: this.connected
    };
  }

  /**
   * Get Redis info (memory, clients, etc.)
   */
  async getInfo(): Promise<{ memory: string; clients: string; stats: string } | null> {
    if (!this.connected) {
      return null;
    }

    try {
      const [memory, clients, stats] = await Promise.all([
        this.redis.info('memory'),
        this.redis.info('clients'),
        this.redis.info('stats')
      ]);

      return { memory, clients, stats };
    } catch (error) {
      console.error('❌ Redis info error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string; memoryUsage?: number }> {
    if (!this.connected) {
      return { status: 'unhealthy', message: 'Redis not connected' };
    }

    try {
      const result = await this.redis.ping();
      if (result === 'PONG') {
        const info = await this.redis.info('memory');
        const memoryUsage = this.parseMemoryUsage(info);
        
        return { 
          status: 'healthy', 
          message: 'Redis is operational',
          memoryUsage 
        };
      } else {
        return { status: 'unhealthy', message: 'Redis ping failed' };
      }
    } catch (error) {
      return { status: 'unhealthy', message: `Redis error: ${error.message}` };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('👋 Redis disconnected');
    } catch (error) {
      console.error('❌ Redis disconnect error:', error);
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();
