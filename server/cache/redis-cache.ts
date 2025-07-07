/**
 * REDIS CACHE - Production
 * AGENTE 2: Cache Optimization Expert
 * 
 * Upstash Redis (Free: 10k commands/day)
 * Optimized for zero cost operation
 */

import { Redis } from '@upstash/redis';
import { CacheInterface } from './cache.interface';

export class RedisCache implements CacheInterface {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      console.warn('Redis not configured - falling back to memory cache');
      return;
    }

    try {
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      this.isConnected = true;
      console.log('✅ Redis cache connected');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }

    try {
      const result = await this.redis.get(key);
      return result as T;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number, tags?: string[]): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      if (ttlSeconds === Infinity) {
        await this.redis.set(key, value);
      } else {
        await this.redis.setex(key, ttlSeconds, value);
      }

      // Store tags for invalidation (if provided)
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          await this.redis.sadd(`tag:${tag}`, key);
          // Tags expire slightly longer than data
          await this.redis.expire(`tag:${tag}`, ttlSeconds + 300);
        }
      }
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis DELETE error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Redis CLEAR error:', error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
      }
    } catch (error) {
      console.error('Redis INVALIDATE error:', error);
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    if (!this.isConnected || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error);
      return false;
    }
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      url: process.env.REDIS_URL ? '***configured***' : 'not configured',
    };
  }
}