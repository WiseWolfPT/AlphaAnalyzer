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
  private realRedis: any = null; // Real Redis service when credentials available
  private stats: RedisStats = {
    connected: false,
    totalCommands: 0,
    failedCommands: 0,
    memoryUsed: 0,
    keyCount: 0,
    uptime: 0,
    reconnectAttempts: 0
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Check if we have proper Redis configuration for real Redis
      if (env.REDIS_HOST && env.REDIS_PORT && env.REDIS_PASSWORD) {
        console.log('🔗 Redis credentials found - initializing real Redis connection');
        
        try {
          // Import and use the real Redis implementation
          const { redisCacheService } = await import('../../../cache/redis-cache-service.js');
          this.realRedis = redisCacheService;
          
          // Test connection
          const healthCheck = await this.realRedis.healthCheck();
          if (healthCheck.status === 'healthy') {
            console.log('✅ Redis cache provider initialized (REAL CONNECTION)');
            this.isConnected = true;
            return;
          } else {
            console.warn('⚠️ Redis health check failed:', healthCheck.message);
            this.isConnected = false;
          }
        } catch (error) {
          console.error('❌ Failed to connect to Redis:', error);
          this.isConnected = false;
        }
      } else {
        console.log('⚠️ Redis credentials missing - using mock implementation');
        const missingVars = [];
        if (!env.REDIS_HOST) missingVars.push('REDIS_HOST');
        if (!env.REDIS_PORT) missingVars.push('REDIS_PORT');
        if (!env.REDIS_PASSWORD) missingVars.push('REDIS_PASSWORD');
        console.log('   Missing variables:', missingVars.join(', '));
        this.isConnected = false;
      }
    } catch (error) {
      console.warn('⚠️ Redis initialization failed:', error);
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.realRedis && this.isConnected) {
      try {
        this.stats.totalCommands++;
        const result = await this.realRedis.get(key);
        return result;
      } catch (error) {
        this.stats.failedCommands++;
        console.error('❌ Redis get error:', error);
        return null;
      }
    }
    return null; // Mock implementation when no Redis connection
  }

  async set<T>(key: string, data: T, ttlMs: number, type: string = 'unknown'): Promise<boolean> {
    if (this.realRedis && this.isConnected) {
      try {
        this.stats.totalCommands++;
        // Convert milliseconds to seconds for Redis
        const ttlSeconds = Math.floor(ttlMs / 1000);
        await this.realRedis.set(key, data, ttlSeconds);
        return true;
      } catch (error) {
        this.stats.failedCommands++;
        console.error('❌ Redis set error:', error);
        return false;
      }
    }
    return false; // Mock implementation when no Redis connection
  }

  async delete(key: string): Promise<boolean> {
    if (this.realRedis && this.isConnected) {
      try {
        this.stats.totalCommands++;
        await this.realRedis.del(key);
        return true;
      } catch (error) {
        this.stats.failedCommands++;
        console.error('❌ Redis delete error:', error);
        return false;
      }
    }
    return false;
  }

  async deletePattern(pattern: string): Promise<number> {
    if (this.realRedis && this.isConnected) {
      try {
        this.stats.totalCommands++;
        await this.realRedis.delPattern(pattern);
        return 1; // Redis service doesn't return count
      } catch (error) {
        this.stats.failedCommands++;
        console.error('❌ Redis delete pattern error:', error);
        return 0;
      }
    }
    return 0;
  }

  async clear(): Promise<boolean> {
    if (this.realRedis && this.isConnected) {
      try {
        this.stats.totalCommands++;
        await this.realRedis.clear();
        return true;
      } catch (error) {
        this.stats.failedCommands++;
        console.error('❌ Redis clear error:', error);
        return false;
      }
    }
    return false;
  }

  async getStats(): Promise<RedisStats> {
    if (this.realRedis && this.isConnected) {
      try {
        const redisStats = this.realRedis.getStats();
        return {
          connected: redisStats.connected,
          totalCommands: this.stats.totalCommands + redisStats.hits + redisStats.sets,
          failedCommands: this.stats.failedCommands + redisStats.errors,
          memoryUsed: 0, // Would need to parse Redis info
          keyCount: 0, // Would need to get from Redis
          uptime: process.uptime(),
          reconnectAttempts: redisStats.connectionErrors
        };
      } catch (error) {
        console.error('❌ Redis stats error:', error);
      }
    }
    return { ...this.stats };
  }

  isConnectedState(): boolean {
    return this.isConnected;
  }

  async ping(): Promise<boolean> {
    if (this.realRedis && this.isConnected) {
      try {
        const healthCheck = await this.realRedis.healthCheck();
        return healthCheck.status === 'healthy';
      } catch (error) {
        console.error('❌ Redis ping error:', error);
        return false;
      }
    }
    return false;
  }

  async shutdown(): Promise<void> {
    if (this.realRedis && this.isConnected) {
      try {
        await this.realRedis.disconnect();
        console.log('✅ Redis cache provider shutdown (real connection)');
      } catch (error) {
        console.error('❌ Redis shutdown error:', error);
      }
    } else {
      console.log('✅ Redis cache provider shutdown (mock)');
    }
    this.isConnected = false;
    this.realRedis = null;
  }
}

export const redisCache = new RedisCacheProvider();