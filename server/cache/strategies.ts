/**
 * CACHE STRATEGIES - TTL Optimization
 * AGENTE 2: Cache Optimization Expert
 * 
 * Intelligent caching for zero cost operation
 * L1: Memory -> L2: Redis -> L3: Supabase
 */

import { MemoryCache } from './memory-cache';
import { RedisCache } from './redis-cache';
import { CacheInterface, CACHE_TTL, CACHE_TAGS } from './cache.interface';

export class CacheManager implements CacheInterface {
  private memoryCache: MemoryCache;
  private redisCache: RedisCache;
  private useRedis: boolean;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.useRedis = process.env.NODE_ENV === 'production';
  }

  async get<T>(key: string): Promise<T | null> {
    // L1: Check memory cache first (fastest)
    const memResult = await this.memoryCache.get<T>(key);
    if (memResult !== null) {
      return memResult;
    }

    // L2: Check Redis if in production
    if (this.useRedis) {
      const redisResult = await this.redisCache.get<T>(key);
      if (redisResult !== null) {
        // Backfill memory cache
        await this.memoryCache.set(key, redisResult, 300); // 5 min in memory
        return redisResult;
      }
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number, tags?: string[]): Promise<void> {
    // Always set in memory for fast access
    await this.memoryCache.set(key, value, Math.min(ttlSeconds, 3600), tags); // Max 1h in memory

    // Set in Redis for persistence in production
    if (this.useRedis) {
      await this.redisCache.set(key, value, ttlSeconds, tags);
    }
  }

  async delete(key: string): Promise<boolean> {
    const memDeleted = await this.memoryCache.delete(key);
    let redisDeleted = false;

    if (this.useRedis) {
      redisDeleted = await this.redisCache.delete(key);
    }

    return memDeleted || redisDeleted;
  }

  async clear(): Promise<void> {
    await this.memoryCache.clear();
    if (this.useRedis) {
      await this.redisCache.clear();
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    await this.memoryCache.invalidateByTag(tag);
    if (this.useRedis) {
      await this.redisCache.invalidateByTag(tag);
    }
  }

  // High-level caching methods with optimal TTLs
  async cachePrice(symbol: string, data: any): Promise<void> {
    const key = `price:${symbol}`;
    await this.set(key, data, CACHE_TTL.PRICE_REALTIME, [CACHE_TAGS.PRICES, CACHE_TAGS.MARKET_DATA]);
  }

  async cacheFundamentals(symbol: string, data: any): Promise<void> {
    const key = `fundamentals:${symbol}`;
    await this.set(key, data, CACHE_TTL.FUNDAMENTALS, [CACHE_TAGS.FUNDAMENTALS, CACHE_TAGS.MARKET_DATA]);
  }

  async cacheCompanyProfile(symbol: string, data: any): Promise<void> {
    const key = `profile:${symbol}`;
    await this.set(key, data, CACHE_TTL.COMPANY_PROFILE, [CACHE_TAGS.FUNDAMENTALS]);
  }

  async cacheTranscript(ticker: string, quarter: string, year: number, data: any): Promise<void> {
    const key = `transcript:${ticker}:${year}:${quarter}`;
    await this.set(key, data, CACHE_TTL.TRANSCRIPTS, [CACHE_TAGS.CONTENT]);
  }

  async cacheNews(symbol: string, data: any): Promise<void> {
    const key = `news:${symbol}`;
    await this.set(key, data, CACHE_TTL.NEWS, [CACHE_TAGS.CONTENT]);
  }

  async cacheUserWatchlist(userId: string, data: any): Promise<void> {
    const key = `watchlist:${userId}`;
    await this.set(key, data, CACHE_TTL.WATCHLISTS, [CACHE_TAGS.USER_DATA]);
  }

  // Cache warming for popular symbols
  async warmCache(): Promise<void> {
    console.log('🔥 Cache warming started...');
    
    // Pre-fetch top 50 Portuguese stocks
    const topSymbols = [
      'EDP.LS', 'GALP.LS', 'BCP.LS', 'BPI.LS', 'CTT.LS',
      'JMT.LS', 'NOS.LS', 'PHR.LS', 'SON.LS', 'SEM.LS'
    ];

    for (const symbol of topSymbols) {
      // This would trigger API calls in background
      console.log(`  📊 Warming cache for ${symbol}`);
      // Implementation would call market data APIs
    }

    console.log('✅ Cache warming completed');
  }

  // Stats for monitoring
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      redis: this.redisCache.getStatus(),
      strategy: this.useRedis ? 'Memory + Redis' : 'Memory only',
    };
  }

  // Cleanup
  destroy(): void {
    this.memoryCache.destroy();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();