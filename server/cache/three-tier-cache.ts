import { supabase } from '../lib/supabase.js';
import { redisCacheService } from './redis-cache-service.js';

/**
 * Three-Tier Cache System - ALFALYZER PRODUCTION PLAN Day 3
 * Implements: Memory → Redis → Supabase fallback strategy
 * 
 * This implements the Reddit Strategy:
 * - Users NEVER trigger API calls
 * - All data comes from cache layers
 * - Cron jobs update cache in background
 */
export class ThreeTierCache {
  // Layer 1: In-memory cache (fastest, smallest capacity)
  private memoryCache = new Map<string, {
    value: any;
    expiresAt: number;
    createdAt: number;
  }>();

  // TTL configurations by data type (in milliseconds)
  private readonly TTL_CONFIG = {
    // Stock data
    quotes: {
      memory: 30 * 1000,           // 30 seconds in memory
      redis: 5 * 60,               // 5 minutes in Redis
      supabase: 60 * 60 * 1000     // 1 hour in Supabase
    },
    fundamentals: {
      memory: 60 * 60 * 1000,      // 1 hour in memory
      redis: 12 * 60 * 60,         // 12 hours in Redis
      supabase: 24 * 60 * 60 * 1000 // 24 hours in Supabase
    },
    historical: {
      memory: 30 * 60 * 1000,      // 30 minutes in memory
      redis: 2 * 60 * 60,          // 2 hours in Redis
      supabase: 6 * 60 * 60 * 1000  // 6 hours in Supabase
    },
    company: {
      memory: 12 * 60 * 60 * 1000,  // 12 hours in memory
      redis: 24 * 60 * 60,          // 24 hours in Redis
      supabase: 7 * 24 * 60 * 60 * 1000 // 1 week in Supabase
    },
    // Real-time data (short TTL)
    snapshot: {
      memory: 10 * 1000,           // 10 seconds in memory
      redis: 1 * 60,               // 1 minute in Redis
      supabase: 5 * 60 * 1000      // 5 minutes in Supabase
    },
    // Market status
    market_status: {
      memory: 30 * 1000,           // 30 seconds in memory
      redis: 2 * 60,               // 2 minutes in Redis
      supabase: 15 * 60 * 1000     // 15 minutes in Supabase
    },
    // Default fallback
    default: {
      memory: 30 * 60 * 1000,      // 30 minutes in memory
      redis: 2 * 60 * 60,          // 2 hours in Redis
      supabase: 6 * 60 * 60 * 1000  // 6 hours in Supabase
    }
  };

  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    memoryHits: 0,
    redisHits: 0,
    supabaseHits: 0,
    sets: 0,
    errors: 0,
    redisErrors: 0,
    supabaseErrors: 0
  };

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Get data from cache (Layer 1 → Layer 2 → Layer 3)
   * Implements the Reddit Strategy: NEVER call external APIs
   */
  async get(key: string, dataType: keyof typeof this.TTL_CONFIG = 'default'): Promise<any> {
    try {
      // Layer 1: Check memory cache first
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult && memoryResult.expiresAt > Date.now()) {
        this.stats.hits++;
        this.stats.memoryHits++;
        console.log(`🚀 L1 HIT (memory): ${key}`);
        return memoryResult.value;
      }

      // Layer 2: Check Redis cache
      const redisResult = await redisCacheService.get(key);
      if (redisResult !== null) {
        // Promote to memory cache
        const ttl = this.TTL_CONFIG[dataType] || this.TTL_CONFIG.default;
        this.memoryCache.set(key, {
          value: redisResult,
          expiresAt: Date.now() + ttl.memory,
          createdAt: Date.now()
        });

        this.stats.hits++;
        this.stats.redisHits++;
        console.log(`⚡ L2 HIT (redis): ${key}`);
        return redisResult;
      }

      // Layer 3: Check Supabase cache
      const { data, error } = await supabase
        .from('api_cache')
        .select('*')
        .eq('cache_key', key)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is OK
          console.error('❌ Supabase cache error:', error);
          this.stats.supabaseErrors++;
        }
        this.stats.misses++;
        console.log(`❌ L3 MISS: ${key}`);
        return null;
      }

      if (data && new Date(data.expires_at) > new Date()) {
        const value = JSON.parse(data.cache_value);
        
        // Promote to Redis
        const ttl = this.TTL_CONFIG[dataType] || this.TTL_CONFIG.default;
        await redisCacheService.set(key, value, ttl.redis);
        
        // Promote to memory cache
        this.memoryCache.set(key, {
          value,
          expiresAt: Date.now() + ttl.memory,
          createdAt: Date.now()
        });

        this.stats.hits++;
        this.stats.supabaseHits++;
        console.log(`💾 L3 HIT (supabase): ${key}`);
        return value;
      }

      // Complete cache miss - return null (NEVER call external API!)
      this.stats.misses++;
      console.log(`❌ COMPLETE MISS: ${key} - Data will be updated by cron job`);
      return null;

    } catch (error) {
      console.error(`❌ Cache get error for ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set data in all cache layers
   * Used by cron jobs to populate cache
   */
  async set(key: string, value: any, dataType: keyof typeof this.TTL_CONFIG = 'default'): Promise<void> {
    try {
      const ttl = this.TTL_CONFIG[dataType] || this.TTL_CONFIG.default;
      const now = Date.now();

      // Layer 1: Set in memory with short TTL
      this.memoryCache.set(key, {
        value,
        expiresAt: now + ttl.memory,
        createdAt: now
      });

      // Layer 2: Set in Redis with medium TTL
      await redisCacheService.set(key, value, ttl.redis);

      // Layer 3: Set in Supabase with long TTL
      const expiresAt = now + ttl.supabase;
      const { error } = await supabase
        .from('api_cache')
        .upsert({
          cache_key: key,
          cache_value: JSON.stringify(value),
          data_type: dataType,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date(now).toISOString()
        });

      if (error) {
        console.error('❌ Supabase cache set error:', error);
        this.stats.supabaseErrors++;
      }

      this.stats.sets++;
      console.log(`💾 3-TIER SET: ${key} (M:${Math.round(ttl.memory / 1000)}s, R:${ttl.redis}s, S:${Math.round(ttl.supabase / 1000)}s)`);

    } catch (error) {
      console.error(`❌ Cache set error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Batch set multiple items efficiently
   */
  async setBatch(items: Array<{ key: string; value: any; dataType?: keyof typeof this.TTL_CONFIG }>): Promise<void> {
    const promises = items.map(item => 
      this.set(item.key, item.value, item.dataType || 'default')
    );
    
    await Promise.allSettled(promises);
    console.log(`📦 Batch SET completed: ${items.length} items`);
  }

  /**
   * Invalidate cache entry from all layers
   */
  async invalidate(key: string): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(key);

      // Remove from Redis
      await redisCacheService.del(key);

      // Remove from Supabase
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .eq('cache_key', key);

      if (error) {
        console.error('❌ Supabase cache invalidate error:', error);
        this.stats.supabaseErrors++;
      }

      console.log(`🗑️ 3-TIER INVALIDATED: ${key}`);
    } catch (error) {
      console.error(`❌ Cache invalidate error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Invalidate cache by pattern (prefix)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Remove from memory
      const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => key.startsWith(pattern));
      keysToDelete.forEach(key => this.memoryCache.delete(key));

      // Remove from Redis
      await redisCacheService.delPattern(`${pattern}*`);

      // Remove from Supabase
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .like('cache_key', `${pattern}%`);

      if (error) {
        console.error('❌ Supabase cache pattern invalidate error:', error);
        this.stats.supabaseErrors++;
      }

      console.log(`🗑️ 3-TIER PATTERN INVALIDATED: ${pattern}* (${keysToDelete.length} memory keys)`);
    } catch (error) {
      console.error(`❌ Cache pattern invalidate error for ${pattern}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Warm cache for popular symbols (used by cron jobs)
   */
  async warmCache(symbols: string[], dataOrchestrator: any): Promise<void> {
    console.log(`🔥 Warming 3-tier cache for ${symbols.length} symbols...`);
    
    const warmingPromises = symbols.map(async (symbol) => {
      try {
        // Only warm if not already cached
        const existsInMemory = this.memoryCache.has(`quote:${symbol}`);
        const existsInRedis = await redisCacheService.exists(`quote:${symbol}`);
        
        if (!existsInMemory && !existsInRedis) {
          // Fetch and cache quote data
          const quote = await dataOrchestrator.getQuote(symbol);
          if (quote) {
            await this.set(`quote:${symbol}`, quote, 'quotes');
          }

          // Fetch and cache company details
          const company = await dataOrchestrator.getCompanyDetails(symbol);
          if (company) {
            await this.set(`company:${symbol}`, company, 'company');
          }
        }

        console.log(`🔥 Cache warmed for ${symbol}`);
      } catch (error) {
        console.error(`❌ Cache warming failed for ${symbol}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
    console.log(`✅ 3-tier cache warming completed for ${symbols.length} symbols`);
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    hitRatio: number;
    memoryHits: number;
    redisHits: number;
    supabaseHits: number;
    sets: number;
    errors: number;
    redisErrors: number;
    supabaseErrors: number;
    memoryCacheSize: number;
    layerDistribution: {
      memory: number;
      redis: number;
      supabase: number;
    };
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRatio = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRatio: Math.round(hitRatio * 100) / 100,
      memoryCacheSize: this.memoryCache.size,
      layerDistribution: {
        memory: this.stats.memoryHits,
        redis: this.stats.redisHits,
        supabase: this.stats.supabaseHits
      }
    };
  }

  /**
   * Health check for all cache layers
   */
  async healthCheck(): Promise<{
    memory: { status: 'healthy' | 'unhealthy'; size: number };
    redis: { status: 'healthy' | 'unhealthy'; message: string; memoryUsage?: number };
    supabase: { status: 'healthy' | 'unhealthy'; message: string };
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    // Memory check
    const memoryStatus = {
      status: 'healthy' as const,
      size: this.memoryCache.size
    };

    // Redis check
    const redisHealth = await redisCacheService.healthCheck();

    // Supabase check
    let supabaseStatus;
    try {
      const { error } = await supabase.from('api_cache').select('cache_key').limit(1);
      supabaseStatus = {
        status: error ? 'unhealthy' as const : 'healthy' as const,
        message: error ? error.message : 'Supabase connection OK'
      };
    } catch (error) {
      supabaseStatus = {
        status: 'unhealthy' as const,
        message: `Supabase error: ${error.message}`
      };
    }

    // Overall status
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (redisHealth.status === 'healthy' && supabaseStatus.status === 'healthy') {
      overall = 'healthy';
    } else if (redisHealth.status === 'unhealthy' && supabaseStatus.status === 'unhealthy') {
      overall = 'unhealthy';
    } else {
      overall = 'degraded';
    }

    return {
      memory: memoryStatus,
      redis: redisHealth,
      supabase: supabaseStatus,
      overall
    };
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    try {
      // Clear memory
      this.memoryCache.clear();

      // Clear Redis
      await redisCacheService.clear();

      // Clear Supabase
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .neq('cache_key', 'never_matches'); // Delete all

      if (error) {
        console.error('❌ Supabase cache clear error:', error);
        this.stats.supabaseErrors++;
      }

      console.log('🗑️ All 3-tier caches cleared');

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        memoryHits: 0,
        redisHits: 0,
        supabaseHits: 0,
        sets: 0,
        errors: 0,
        redisErrors: 0,
        supabaseErrors: 0
      };
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Memory cleanup - remove expired entries
   */
  private cleanupMemory(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 L1 cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Start periodic cleanup of memory cache
   */
  private startCleanupInterval(): void {
    // Cleanup every 2 minutes (more frequent for memory)
    setInterval(() => {
      this.cleanupMemory();
    }, 2 * 60 * 1000);

    console.log('🧹 3-tier cache cleanup interval started (2 minutes)');
  }

  /**
   * Generate standardized cache key
   */
  static generateKey(provider: string, method: string, symbol: string, ...params: string[]): string {
    const paramStr = params.length > 0 ? `:${params.join(':')}` : '';
    return `${provider}:${method}:${symbol}${paramStr}`;
  }

  /**
   * Get cache info for monitoring
   */
  async getCacheInfo(): Promise<{
    memorySize: number;
    redisConnected: boolean;
    supabaseConnected: boolean;
    stats: ReturnType<typeof this.getStats>;
  }> {
    const health = await this.healthCheck();
    return {
      memorySize: this.memoryCache.size,
      redisConnected: health.redis.status === 'healthy',
      supabaseConnected: health.supabase.status === 'healthy',
      stats: this.getStats()
    };
  }
}

// Export singleton instance
export const threeTierCache = new ThreeTierCache();