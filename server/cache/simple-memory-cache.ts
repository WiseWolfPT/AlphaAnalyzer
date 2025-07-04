import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class SimpleMemoryCache {
  private priceCache: LRUCache<string, CacheEntry<any>>;
  private chartCache: LRUCache<string, CacheEntry<any>>;
  private metricsCache: LRUCache<string, CacheEntry<any>>;
  
  private stats = {
    hits: 0,
    misses: 0,
    apiCallsSaved: 0,
    totalResponseTime: 0,
    avgResponseTime: 0,
    lastResponseTime: 0
  };

  constructor() {
    // Cache de preços - 1 minuto TTL, máximo 1000 items
    this.priceCache = new LRUCache({
      max: 1000,
      ttl: 60 * 1000, // 1 minuto
      updateAgeOnGet: false
    });

    // Cache de gráficos - 24 horas TTL, máximo 200 items
    this.chartCache = new LRUCache({
      max: 200,
      ttl: 24 * 60 * 60 * 1000, // 24 horas
      updateAgeOnGet: false
    });

    // Cache de métricas - 24 horas TTL, máximo 500 items
    this.metricsCache = new LRUCache({
      max: 500,
      ttl: 24 * 60 * 60 * 1000, // 24 horas
      updateAgeOnGet: false
    });
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType: 'price' | 'chart' | 'metrics' = 'price'
  ): Promise<{ data: T; isHit: boolean }> {
    const startTime = performance.now();
    const cache = this.getCache(cacheType);
    const cached = cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      const responseTime = performance.now() - startTime;
      this.updateResponseTimeStats(responseTime);
      
      this.stats.hits++;
      this.stats.apiCallsSaved++;
      console.log(`[Cache] HIT for ${key} (${cacheType}) - ${responseTime.toFixed(3)}ms`);
      return { data: cached.data, isHit: true };
    }

    this.stats.misses++;
    console.log(`[Cache] MISS for ${key} (${cacheType}) - fetching from API`);
    
    try {
      const data = await fetcher();
      const ttl = this.getTTL(cacheType);
      
      cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      });
      
      const responseTime = performance.now() - startTime;
      this.updateResponseTimeStats(responseTime);
      
      return { data, isHit: false };
    } catch (error) {
      console.error(`[Cache] Error fetching ${key}:`, error);
      throw error;
    }
  }

  private getCache(type: string) {
    switch (type) {
      case 'price': return this.priceCache;
      case 'chart': return this.chartCache;
      case 'metrics': return this.metricsCache;
      default: return this.priceCache;
    }
  }

  private getTTL(type: string): number {
    switch (type) {
      case 'price': return 60 * 1000; // 1 minuto
      case 'chart': return 24 * 60 * 60 * 1000; // 24 horas
      case 'metrics': return 24 * 60 * 60 * 1000; // 24 horas
      default: return 60 * 1000;
    }
  }

  private updateResponseTimeStats(responseTime: number): void {
    this.stats.lastResponseTime = responseTime;
    this.stats.totalResponseTime += responseTime;
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.avgResponseTime = totalRequests > 0 
      ? this.stats.totalResponseTime / totalRequests 
      : 0;
  }

  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    return {
      ...this.stats,
      hitRate: `${(hitRate * 100).toFixed(2)}%`,
      totalCacheSize: this.priceCache.size + this.chartCache.size + this.metricsCache.size,
      avgResponseTimeMs: `${this.stats.avgResponseTime.toFixed(3)}ms`,
      lastResponseTimeMs: `${this.stats.lastResponseTime.toFixed(3)}ms`
    };
  }

  clear(cacheType?: string) {
    if (cacheType) {
      this.getCache(cacheType).clear();
    } else {
      this.priceCache.clear();
      this.chartCache.clear();
      this.metricsCache.clear();
    }
    console.log('[Cache] Cleared', cacheType || 'all caches');
  }
}

// Singleton instance
export const memoryCache = new SimpleMemoryCache();