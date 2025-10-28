/**
 * Enhanced Redis Cache Service - Performance Optimized
 *
 * Architecture:
 * - L1: In-memory LRU cache (1-2ms, 60s TTL, 10MB limit)
 * - L2: Redis with MessagePack serialization (5-10ms, configurable TTL)
 * - Pipelining support for bulk operations
 * - Comprehensive metrics and observability
 *
 * Performance targets:
 * - L1 hit: 1-2ms (40-50% of requests)
 * - L2 hit: 5-10ms (35-40% of requests)
 * - Overall P95: <40ms (vs 177ms baseline)
 */

import Redis from 'ioredis';
import * as msgpack from '@msgpack/msgpack';
import { logger } from '../lib/logger.js';
import { validateTTL } from '../security/input-validation';

// Import LRUCache type for typing only (not used at runtime)
import type { LRUCache as LRUCacheType } from 'lru-cache';

interface CacheMetrics {
  l1Hits: number;
  l2Hits: number;
  misses: number;
  l1Latencies: number[];
  l2Latencies: number[];
  sets: number;
  errors: number;
  lastReset: Date;
}

interface CacheStats {
  l1HitRate: string;
  l2HitRate: string;
  totalHitRate: string;
  avgL1Latency: string;
  avgL2Latency: string;
  p95L1Latency: string;
  p95L2Latency: string;
  totalRequests: number;
  l1Size: number;
  memoryUsage: string;
}

export class EnhancedRedisCacheService {
  private redis: Redis;
  private connected: boolean = false;

  // L1: In-memory LRU cache (10MB, 60s TTL)
  private l1Cache: LRUCacheType<string, any>;

  // Metrics tracking
  private metrics: CacheMetrics = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    l1Latencies: [],
    l2Latencies: [],
    sets: 0,
    errors: 0,
    lastReset: new Date(),
  };

  // Pipeline mode tracking
  private pipelineMode: boolean = false;
  private currentPipeline: Redis.Pipeline | null = null;

  constructor() {
    // Initialize L1 cache (10MB limit, ~1000 items)
    // Use runtime require to avoid ESM/CJS bundling issues with lru-cache v11
    const { LRUCache } = require('lru-cache');
    this.l1Cache = new LRUCache({
      max: 1000, // Max items
      maxSize: 10 * 1024 * 1024, // 10MB
      sizeCalculation: (value: any) => {
        // Estimate size (rough approximation)
        return JSON.stringify(value).length;
      },
      ttl: 60000, // 60 seconds
      updateAgeOnGet: true, // LRU behavior
      updateAgeOnHas: false,
    });

    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxmemoryPolicy: 'allkeys-lru',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: true,
      // Performance optimizations
      enableReadyCheck: false,
      enableOfflineQueue: true,
    });

    this.setupEventHandlers();
    this.connect();
    this.startMetricsResetTimer();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('[EnhancedCache] Redis connected');
      this.connected = true;
    });

    this.redis.on('ready', () => {
      logger.info('[EnhancedCache] Redis ready');
      this.connected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('[EnhancedCache] Redis error:', error);
      this.metrics.errors++;
      this.connected = false;
    });

    this.redis.on('close', () => {
      logger.warn('[EnhancedCache] Redis connection closed');
      this.connected = false;
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('[EnhancedCache] Failed to connect to Redis:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Reset metrics every hour to prevent memory leak
   */
  private startMetricsResetTimer(): void {
    setInterval(() => {
      this.metrics.l1Latencies = [];
      this.metrics.l2Latencies = [];
      this.metrics.lastReset = new Date();
      logger.info('[EnhancedCache] Metrics reset');
    }, 3600000); // 1 hour
  }

  /**
   * Get data from cache (L1 → L2 → miss)
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    // L1 check (in-memory, 1-2ms)
    const l1Start = performance.now();
    const l1Value = this.l1Cache.get(key);
    const l1Latency = performance.now() - l1Start;

    if (l1Value !== undefined) {
      this.metrics.l1Hits++;
      this.metrics.l1Latencies.push(l1Latency);
      logger.debug(`[EnhancedCache] L1 HIT: ${key} (${l1Latency.toFixed(2)}ms)`);
      return l1Value as T;
    }

    // L2 check (Redis, 5-10ms)
    if (!this.connected) {
      this.metrics.misses++;
      return null;
    }

    try {
      const l2Start = performance.now();
      const l2Value = await this.redis.getBuffer(key);
      const l2Latency = performance.now() - l2Start;

      if (l2Value) {
        this.metrics.l2Hits++;
        this.metrics.l2Latencies.push(l2Latency);

        // Deserialize with MessagePack (faster than JSON)
        const decoded = msgpack.decode(l2Value) as T;

        // Populate L1 for future requests
        this.l1Cache.set(key, decoded);

        logger.debug(`[EnhancedCache] L2 HIT: ${key} (${l2Latency.toFixed(2)}ms)`);
        return decoded;
      }

      // Cache miss
      this.metrics.misses++;
      logger.debug(`[EnhancedCache] MISS: ${key} (${l2Latency.toFixed(2)}ms)`);
      return null;
    } catch (error) {
      logger.error(`[EnhancedCache] Error getting ${key}:`, error);
      this.metrics.errors++;
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set data in cache (L1 + L2)
   * @param ttlSeconds Time-to-live in seconds
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.connected) {
      // Still populate L1 even if Redis is down
      this.l1Cache.set(key, value);
      return;
    }

    try {
      // Validate TTL
      const validatedTTL = validateTTL(ttlSeconds, 300);

      if (validatedTTL !== ttlSeconds) {
        logger.warn(`[EnhancedCache] TTL adjusted for ${key}: ${ttlSeconds} → ${validatedTTL}`);
      }

      // Serialize with MessagePack (faster and more compact than JSON)
      const serialized = msgpack.encode(value);

      // Write to L2 (Redis)
      if (this.pipelineMode && this.currentPipeline) {
        // Use pipeline for bulk operations
        this.currentPipeline.setex(key, validatedTTL, Buffer.from(serialized));
      } else {
        await this.redis.setex(key, validatedTTL, Buffer.from(serialized));
      }

      // Populate L1 for immediate access
      this.l1Cache.set(key, value);

      this.metrics.sets++;
      logger.debug(`[EnhancedCache] SET: ${key} (TTL: ${validatedTTL}s)`);
    } catch (error) {
      logger.error(`[EnhancedCache] Error setting ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Get multiple keys in parallel (optimized pipeline)
   * @param keys Array of cache keys
   * @returns Map of key → value (null for misses)
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    if (keys.length === 0) {
      return results;
    }

    // Check L1 first (parallel)
    const l1Misses: string[] = [];
    for (const key of keys) {
      const l1Value = this.l1Cache.get(key);
      if (l1Value !== undefined) {
        this.metrics.l1Hits++;
        results.set(key, l1Value as T);
      } else {
        l1Misses.push(key);
      }
    }

    if (l1Misses.length === 0) {
      logger.debug(`[EnhancedCache] MGET: All ${keys.length} keys in L1`);
      return results;
    }

    // Fetch from L2 (Redis pipeline)
    if (!this.connected) {
      // Mark all as misses
      for (const key of l1Misses) {
        results.set(key, null);
        this.metrics.misses++;
      }
      return results;
    }

    try {
      const l2Start = performance.now();
      const pipeline = this.redis.pipeline();

      // Queue all gets in pipeline
      for (const key of l1Misses) {
        pipeline.getBuffer(key);
      }

      // Execute pipeline (single round-trip)
      const pipelineResults = await pipeline.exec();
      const l2Latency = performance.now() - l2Start;

      if (!pipelineResults) {
        throw new Error('Pipeline returned null');
      }

      // Process results
      for (let i = 0; i < l1Misses.length; i++) {
        const key = l1Misses[i];
        const [err, value] = pipelineResults[i];

        if (err) {
          logger.error(`[EnhancedCache] Pipeline error for ${key}:`, err);
          results.set(key, null);
          this.metrics.errors++;
          this.metrics.misses++;
          continue;
        }

        if (value) {
          this.metrics.l2Hits++;
          const decoded = msgpack.decode(value as Buffer) as T;
          results.set(key, decoded);

          // Populate L1
          this.l1Cache.set(key, decoded);
        } else {
          this.metrics.misses++;
          results.set(key, null);
        }
      }

      logger.debug(
        `[EnhancedCache] MGET: ${keys.length} keys (L1: ${keys.length - l1Misses.length}, ` +
        `L2: ${l1Misses.length}, latency: ${l2Latency.toFixed(2)}ms)`
      );
    } catch (error) {
      logger.error('[EnhancedCache] Error in MGET:', error);
      this.metrics.errors++;

      // Mark remaining as misses
      for (const key of l1Misses) {
        if (!results.has(key)) {
          results.set(key, null);
          this.metrics.misses++;
        }
      }
    }

    return results;
  }

  /**
   * Set multiple keys (optimized pipeline)
   */
  async mset(entries: Array<{ key: string; value: any; ttl: number }>): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    if (!this.connected) {
      // Still populate L1
      for (const { key, value } of entries) {
        this.l1Cache.set(key, value);
      }
      return;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const { key, value, ttl } of entries) {
        const validatedTTL = validateTTL(ttl, 300);
        const serialized = msgpack.encode(value);

        pipeline.setex(key, validatedTTL, Buffer.from(serialized));

        // Populate L1
        this.l1Cache.set(key, value);
      }

      // Execute pipeline
      await pipeline.exec();
      this.metrics.sets += entries.length;

      logger.debug(`[EnhancedCache] MSET: ${entries.length} keys`);
    } catch (error) {
      logger.error('[EnhancedCache] Error in MSET:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Delete a key from both L1 and L2
   */
  async del(key: string): Promise<void> {
    // Remove from L1
    this.l1Cache.delete(key);

    // Remove from L2
    if (!this.connected) {
      return;
    }

    try {
      await this.redis.del(key);
      logger.debug(`[EnhancedCache] DEL: ${key}`);
    } catch (error) {
      logger.error(`[EnhancedCache] Error deleting ${key}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Delete keys matching pattern (L2 only, L1 cleared on next access)
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        // Clear from L1
        for (const key of keys) {
          this.l1Cache.delete(key);
        }

        // Clear from L2
        await this.redis.del(...keys);
        logger.debug(`[EnhancedCache] DEL PATTERN: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error(`[EnhancedCache] Error deleting pattern ${pattern}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Check if key exists (L1 → L2)
   */
  async exists(key: string): Promise<boolean> {
    // Check L1 first
    if (this.l1Cache.has(key)) {
      return true;
    }

    // Check L2
    if (!this.connected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`[EnhancedCache] Error checking exists ${key}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get TTL for key (L2 only)
   */
  async ttl(key: string): Promise<number> {
    if (!this.connected) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`[EnhancedCache] Error getting TTL ${key}:`, error);
      this.metrics.errors++;
      return -1;
    }
  }

  /**
   * List keys matching pattern (L2 only)
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) {
      return [];
    }

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      logger.error(`[EnhancedCache] Error listing keys ${pattern}:`, error);
      this.metrics.errors++;
      return [];
    }
  }

  /**
   * Clear all cache (L1 + L2)
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.clear();

    // Clear L2
    if (!this.connected) {
      return;
    }

    try {
      await this.redis.flushdb();
      logger.info('[EnhancedCache] Cache cleared (L1 + L2)');
    } catch (error) {
      logger.error('[EnhancedCache] Error clearing cache:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.metrics.l1Hits + this.metrics.l2Hits + this.metrics.misses;
    const totalHits = this.metrics.l1Hits + this.metrics.l2Hits;

    const l1HitRate = totalRequests > 0 ? (this.metrics.l1Hits / totalRequests) * 100 : 0;
    const l2HitRate = totalRequests > 0 ? (this.metrics.l2Hits / totalRequests) * 100 : 0;
    const totalHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    const avgL1 = this.metrics.l1Latencies.length > 0
      ? this.metrics.l1Latencies.reduce((a, b) => a + b, 0) / this.metrics.l1Latencies.length
      : 0;

    const avgL2 = this.metrics.l2Latencies.length > 0
      ? this.metrics.l2Latencies.reduce((a, b) => a + b, 0) / this.metrics.l2Latencies.length
      : 0;

    // Calculate P95 latencies
    const p95L1 = this.calculateP95(this.metrics.l1Latencies);
    const p95L2 = this.calculateP95(this.metrics.l2Latencies);

    return {
      l1HitRate: `${l1HitRate.toFixed(2)}%`,
      l2HitRate: `${l2HitRate.toFixed(2)}%`,
      totalHitRate: `${totalHitRate.toFixed(2)}%`,
      avgL1Latency: `${avgL1.toFixed(2)}ms`,
      avgL2Latency: `${avgL2.toFixed(2)}ms`,
      p95L1Latency: `${p95L1.toFixed(2)}ms`,
      p95L2Latency: `${p95L2.toFixed(2)}ms`,
      totalRequests,
      l1Size: this.l1Cache.size,
      memoryUsage: `L1: ${(this.l1Cache.calculatedSize || 0 / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  /**
   * Calculate P95 latency from array of measurements
   */
  private calculateP95(latencies: number[]): number {
    if (latencies.length === 0) {
      return 0;
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get detailed metrics for observability
   */
  getDetailedMetrics() {
    return {
      ...this.metrics,
      l1Size: this.l1Cache.size,
      l1CalculatedSize: this.l1Cache.calculatedSize,
      connected: this.connected,
      timeSinceReset: Date.now() - this.metrics.lastReset.getTime(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string; stats?: CacheStats }> {
    try {
      if (!this.connected) {
        // Attempt reconnect
        await this.connect();
      }

      const result = await this.redis.ping();
      if (result === 'PONG') {
        return {
          status: 'healthy',
          message: 'Enhanced cache operational (L1 + L2)',
          stats: this.getStats(),
        };
      }

      return { status: 'unhealthy', message: 'Redis ping failed' };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Redis error: ${error?.message || String(error)}`,
      };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      this.l1Cache.clear();
      await this.redis.quit();
      logger.info('[EnhancedCache] Disconnected');
    } catch (error) {
      logger.error('[EnhancedCache] Disconnect error:', error);
    }
  }
}

// Export singleton instance
export const enhancedRedisCacheService = new EnhancedRedisCacheService();
