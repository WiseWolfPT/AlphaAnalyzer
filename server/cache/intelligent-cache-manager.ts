/**
 * INTELLIGENT CACHE MANAGER
 * Multi-layered caching system for different data types with optimized TTLs
 * Designed for professional financial data platform with API quota management
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  type: DataType;
  provider: string;
  hitCount: number;
}

export enum DataType {
  REAL_TIME_PRICE = 'real_time_price',     // 1 minute TTL
  AFTER_HOURS = 'after_hours',             // 5 minutes TTL  
  CHART_DATA = 'chart_data',               // 24 hours TTL
  FINANCIAL_METRICS = 'financial_metrics', // 24 hours TTL
  COMPANY_PROFILE = 'company_profile',     // 7 days TTL
  MARKET_STATUS = 'market_status'          // 30 seconds TTL
}

interface CacheConfig {
  ttl: number;
  maxSize: number;
  priority: number; // Higher = more important, less likely to be evicted
}

const CACHE_CONFIGS: Record<DataType, CacheConfig> = {
  [DataType.REAL_TIME_PRICE]: { ttl: 60 * 1000, maxSize: 1000, priority: 10 },
  [DataType.AFTER_HOURS]: { ttl: 5 * 60 * 1000, maxSize: 500, priority: 8 },
  [DataType.CHART_DATA]: { ttl: 24 * 60 * 60 * 1000, maxSize: 100, priority: 6 },
  [DataType.FINANCIAL_METRICS]: { ttl: 24 * 60 * 60 * 1000, maxSize: 200, priority: 7 },
  [DataType.COMPANY_PROFILE]: { ttl: 7 * 24 * 60 * 60 * 1000, maxSize: 1000, priority: 5 },
  [DataType.MARKET_STATUS]: { ttl: 30 * 1000, maxSize: 10, priority: 9 }
};

export class IntelligentCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    apiCallsSaved: 0,
    totalRequests: 0
  };

  /**
   * Get data from cache if available and not expired
   */
  get<T>(key: string, type: DataType): T | null {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hitCount++;
    this.stats.hits++;
    this.stats.apiCallsSaved++;
    
    console.log(`📦 Cache HIT: ${key} (${type}, saved API call)`);
    return entry.data;
  }

  /**
   * Store data in cache with intelligent TTL based on data type
   */
  set<T>(key: string, data: T, type: DataType, provider: string = 'unknown'): void {
    const config = CACHE_CONFIGS[type];
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + config.ttl,
      type,
      provider,
      hitCount: 0
    };

    // Check if we need to evict entries
    this.evictIfNecessary(type);
    
    this.cache.set(key, entry);
    console.log(`💾 Cache SET: ${key} (${type}, TTL: ${this.formatTTL(config.ttl)})`);
  }

  /**
   * Evict entries if cache is full, prioritizing by data type and usage
   */
  private evictIfNecessary(type: DataType): void {
    const config = CACHE_CONFIGS[type];
    const entriesOfType = Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.type === type);

    if (entriesOfType.length >= config.maxSize) {
      // Sort by priority (lower priority first) and hit count (less used first)
      entriesOfType.sort(([_, a], [__, b]) => {
        const priorityDiff = CACHE_CONFIGS[a.type].priority - CACHE_CONFIGS[b.type].priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.hitCount - b.hitCount;
      });

      // Remove 20% of entries to make room
      const toRemove = Math.max(1, Math.floor(entriesOfType.length * 0.2));
      for (let i = 0; i < toRemove; i++) {
        const [keyToRemove] = entriesOfType[i];
        this.cache.delete(keyToRemove);
        this.stats.evictions++;
      }
      
      console.log(`🗑️ Cache evicted ${toRemove} entries of type ${type}`);
    }
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Get cache statistics for admin panel
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
      : '0.00';

    const typeStats = new Map<DataType, { count: number; size: number }>();
    for (const [_, entry] of this.cache.entries()) {
      const current = typeStats.get(entry.type) || { count: 0, size: 0 };
      current.count++;
      current.size += JSON.stringify(entry.data).length;
      typeStats.set(entry.type, current);
    }

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      totalEntries: this.cache.size,
      memorySaved: `${this.stats.apiCallsSaved} API calls`,
      byType: Object.fromEntries(typeStats),
      uptime: process.uptime()
    };
  }

  /**
   * Warm cache with essential data
   */
  async warmCache(symbols: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${symbols.length} symbols`);
    // This would typically pre-fetch common data
    // Implementation depends on your data sources
  }

  /**
   * Get cache entries for admin inspection
   */
  getEntries(type?: DataType): Array<{ key: string; entry: CacheEntry<any> }> {
    const entries = Array.from(this.cache.entries());
    
    if (type) {
      return entries
        .filter(([_, entry]) => entry.type === type)
        .map(([key, entry]) => ({ key, entry }));
    }
    
    return entries.map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Clear cache (for admin tools)
   */
  clear(type?: DataType): number {
    let cleared = 0;
    
    if (type) {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.type === type) {
          this.cache.delete(key);
          cleared++;
        }
      }
      console.log(`🗑️ Cleared ${cleared} entries of type ${type}`);
    } else {
      cleared = this.cache.size;
      this.cache.clear();
      this.stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        apiCallsSaved: 0,
        totalRequests: 0
      };
      console.log(`🗑️ Cleared entire cache (${cleared} entries)`);
    }
    
    return cleared;
  }

  private formatTTL(ttl: number): string {
    if (ttl < 60 * 1000) return `${ttl / 1000}s`;
    if (ttl < 60 * 60 * 1000) return `${ttl / (60 * 1000)}m`;
    if (ttl < 24 * 60 * 60 * 1000) return `${ttl / (60 * 60 * 1000)}h`;
    return `${ttl / (24 * 60 * 60 * 1000)}d`;
  }
}

// Global cache instance
export const globalCache = new IntelligentCacheManager();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  globalCache.cleanup();
}, 5 * 60 * 1000);

// Export cache key generators for consistency
export const CacheKeys = {
  realtimePrice: (symbol: string) => `price:${symbol}`,
  afterHours: (symbol: string) => `after_hours:${symbol}`,
  chartData: (symbol: string, period: string) => `chart:${symbol}:${period}`,
  financialMetrics: (symbol: string) => `metrics:${symbol}`,
  companyProfile: (symbol: string) => `profile:${symbol}`,
  marketStatus: () => 'market:status'
};