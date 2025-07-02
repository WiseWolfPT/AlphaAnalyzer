import { createClient, RedisClientType } from 'redis';
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';

interface CacheConfig {
  marketHours: {
    ttl: number;
    staleWhileRevalidate: number;
    backgroundRefresh: boolean;
  };
  afterHours: {
    ttl: number;
    staleWhileRevalidate: number;
    backgroundRefresh: boolean;
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  staleTime: number;
  etag?: string;
  accessCount: number;
  lastAccess: number;
}

interface PopularityScore {
  symbol: string;
  score: number;
  factors: {
    recentViews: number;
    uniqueUsers: number;
    searchFrequency: number;
    newsActivity: number;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  apiCalls: number;
  avgResponseTime: number;
  memoryUsage: number;
}

export class AdvancedCacheManager extends EventEmitter {
  private redis: RedisClientType;
  private memoryCache: LRUCache<string, CacheEntry<any>>;
  private pendingRequests: Map<string, Promise<any>>;
  private stats: CacheStats;
  private popularityTracker: Map<string, PopularityScore>;
  
  private readonly configs: Record<string, CacheConfig> = {
    'quote': {
      marketHours: {
        ttl: 60_000, // 1 minute
        staleWhileRevalidate: 30_000, // 30 seconds
        backgroundRefresh: true
      },
      afterHours: {
        ttl: 900_000, // 15 minutes
        staleWhileRevalidate: 300_000, // 5 minutes
        backgroundRefresh: false
      }
    },
    'fundamentals': {
      marketHours: {
        ttl: 86_400_000, // 24 hours
        staleWhileRevalidate: 43_200_000, // 12 hours
        backgroundRefresh: true
      },
      afterHours: {
        ttl: 86_400_000, // 24 hours
        staleWhileRevalidate: 43_200_000, // 12 hours
        backgroundRefresh: false
      }
    },
    'charts': {
      marketHours: {
        ttl: 300_000, // 5 minutes
        staleWhileRevalidate: 150_000, // 2.5 minutes
        backgroundRefresh: true
      },
      afterHours: {
        ttl: 1_800_000, // 30 minutes
        staleWhileRevalidate: 900_000, // 15 minutes
        backgroundRefresh: false
      }
    }
  };

  constructor() {
    super();
    
    // Initialize Redis connection
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    // Initialize memory cache with 500MB limit
    this.memoryCache = new LRUCache<string, CacheEntry<any>>({
      max: 500 * 1024 * 1024, // 500MB
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      ttl: 60_000, // 1 minute default
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Initialize tracking
    this.pendingRequests = new Map();
    this.popularityTracker = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      apiCalls: 0,
      avgResponseTime: 0,
      memoryUsage: 0
    };

    // Connect to Redis
    this.connectRedis();

    // Start background jobs
    this.startBackgroundJobs();
  }

  private async connectRedis(): Promise<void> {
    try {
      await this.redis.connect();
      console.log('✅ Redis connected successfully');
      
      // Subscribe to real-time updates
      const subscriber = this.redis.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe('cache:invalidate', (message) => {
        this.handleCacheInvalidation(message);
      });
      
      await subscriber.subscribe('quotes:update', (message) => {
        this.handleQuoteUpdate(message);
      });
    } catch (error) {
      console.error('❌ Redis connection error:', error);
      // Fallback to memory-only cache
    }
  }

  async get<T>(
    key: string, 
    fetcher: () => Promise<T>,
    options: {
      dataType: keyof typeof this.configs;
      symbol?: string;
      bypassCache?: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    // Track access for popularity
    if (options.symbol) {
      this.trackAccess(options.symbol);
    }

    // Check if bypassing cache
    if (options.bypassCache) {
      this.stats.apiCalls++;
      return fetcher();
    }

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    try {
      // Check memory cache first (L1)
      const memCached = this.memoryCache.get(key);
      if (memCached) {
        return this.handleCacheHit(memCached, key, fetcher, options);
      }

      // Check Redis cache (L2)
      const redisCached = await this.getFromRedis(key);
      if (redisCached) {
        // Promote to memory cache
        this.memoryCache.set(key, redisCached);
        return this.handleCacheHit(redisCached, key, fetcher, options);
      }

      // Cache miss - fetch data
      this.stats.misses++;
      const promise = this.fetchAndCache(key, fetcher, options);
      this.pendingRequests.set(key, promise);
      
      const result = await promise;
      
      // Update stats
      const responseTime = Date.now() - startTime;
      this.updateResponseTime(responseTime);
      
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async handleCacheHit<T>(
    entry: CacheEntry<T>,
    key: string,
    fetcher: () => Promise<T>,
    options: any
  ): Promise<T> {
    const now = Date.now();
    const config = this.getConfig(options.dataType);
    
    // Update access tracking
    entry.accessCount++;
    entry.lastAccess = now;
    
    if (now < entry.staleTime) {
      // Fresh data
      this.stats.hits++;
      return entry.data;
    } else if (now < entry.expiry) {
      // Stale but valid - return and refresh in background
      this.stats.staleHits++;
      
      if (config.backgroundRefresh && this.isMarketHours()) {
        this.backgroundRefresh(key, fetcher, options);
      }
      
      return entry.data;
    } else {
      // Expired - fetch new data
      this.stats.misses++;
      return this.fetchAndCache(key, fetcher, options);
    }
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: any
  ): Promise<T> {
    try {
      this.stats.apiCalls++;
      const data = await fetcher();
      
      const config = this.getConfig(options.dataType);
      const now = Date.now();
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        staleTime: now + config.staleWhileRevalidate,
        expiry: now + config.ttl,
        accessCount: 1,
        lastAccess: now
      };

      // Store in both caches
      this.memoryCache.set(key, entry);
      await this.setInRedis(key, entry, config.ttl);

      // Publish update for other instances
      if (options.dataType === 'quote' && options.symbol) {
        await this.redis.publish('quotes:update', JSON.stringify({
          symbol: options.symbol,
          data,
          timestamp: now
        }));
      }

      return data;
    } catch (error) {
      // On error, try to return stale data if available
      const stale = this.memoryCache.get(key);
      if (stale) {
        console.warn(`Returning stale data for ${key} due to fetch error:`, error);
        return stale.data;
      }
      throw error;
    }
  }

  private async backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: any
  ): Promise<void> {
    // Fire and forget background refresh
    this.fetchAndCache(key, fetcher, options).catch(err => {
      console.error(`Background refresh failed for ${key}:`, err);
    });
  }

  private getConfig(dataType: string): CacheConfig['marketHours'] {
    const config = this.configs[dataType] || this.configs.quote;
    return this.isMarketHours() ? config.marketHours : config.afterHours;
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Monday-Friday
    if (day === 0 || day === 6) return false;
    
    // 9:30 AM - 4:00 PM EST
    const totalMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;
    
    return totalMinutes >= marketOpen && totalMinutes < marketClose;
  }

  private async getFromRedis(key: string): Promise<CacheEntry<any> | null> {
    try {
      const data = await this.redis.get(key);
      return data && typeof data === 'string' ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis get error for ${key}:`, error);
      return null;
    }
  }

  private async setInRedis(key: string, entry: CacheEntry<any>, ttl: number): Promise<void> {
    try {
      await this.redis.setEx(key, Math.floor(ttl / 1000), JSON.stringify(entry));
    } catch (error) {
      console.error(`Redis set error for ${key}:`, error);
    }
  }

  private trackAccess(symbol: string): void {
    const existing = this.popularityTracker.get(symbol) || {
      symbol,
      score: 0,
      factors: {
        recentViews: 0,
        uniqueUsers: 0,
        searchFrequency: 0,
        newsActivity: 0
      }
    };

    existing.factors.recentViews++;
    existing.score = this.calculatePopularityScore(existing.factors);
    
    this.popularityTracker.set(symbol, existing);
  }

  private calculatePopularityScore(factors: PopularityScore['factors']): number {
    return (
      factors.recentViews * 0.4 +
      factors.uniqueUsers * 0.3 +
      factors.searchFrequency * 0.2 +
      factors.newsActivity * 0.1
    );
  }

  private updateResponseTime(time: number): void {
    const currentAvg = this.stats.avgResponseTime;
    const totalCalls = this.stats.hits + this.stats.misses;
    this.stats.avgResponseTime = (currentAvg * (totalCalls - 1) + time) / totalCalls;
  }

  private startBackgroundJobs(): void {
    // Update popular stocks every 15 minutes
    setInterval(() => {
      this.updatePopularStocks();
    }, 15 * 60 * 1000);

    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanExpiredEntries();
    }, 5 * 60 * 1000);

    // Sync stats to Redis every minute
    setInterval(() => {
      this.syncStatsToRedis();
    }, 60 * 1000);

    // Pre-warm popular stocks during market hours
    if (this.isMarketHours()) {
      setInterval(() => {
        this.warmPopularStocks();
      }, 60 * 1000); // Every minute
    }
  }

  private async updatePopularStocks(): Promise<void> {
    const scores = Array.from(this.popularityTracker.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Store in Redis for other instances
    await this.redis.set('popular:stocks', JSON.stringify(scores));
    
    this.emit('popularStocksUpdated', scores);
  }

  private async cleanExpiredEntries(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory cache (LRU handles this automatically)
    
    // Clean Redis entries
    const keys = await this.redis.keys('cache:*');
    for (const key of keys) {
      const entry = await this.getFromRedis(key);
      if (entry && entry.expiry < now) {
        await this.redis.del(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  private async syncStatsToRedis(): Promise<void> {
    const stats = {
      ...this.stats,
      timestamp: Date.now(),
      instance: process.env.INSTANCE_ID || 'default'
    };

    await this.redis.hSet('cache:stats', stats.instance, JSON.stringify(stats));
  }

  private async warmPopularStocks(): Promise<void> {
    try {
      const popularData = await this.redis.get('popular:stocks');
      if (!popularData || typeof popularData !== 'string') return;

      const popular: PopularityScore[] = JSON.parse(popularData);
      
      // Warm top 10 stocks
      const topStocks = popular.slice(0, 10).map(p => p.symbol);
      
      this.emit('warmCache', topStocks);
    } catch (error) {
      console.error('Error warming popular stocks:', error);
    }
  }

  private handleCacheInvalidation(message: string): void {
    try {
      const { pattern } = JSON.parse(message);
      
      // Invalidate matching keys in memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.match(pattern)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Error handling cache invalidation:', error);
    }
  }

  private handleQuoteUpdate(message: string): void {
    try {
      const { symbol, data, timestamp } = JSON.parse(message);
      const key = `cache:v1:quote:${symbol}:realtime`;
      
      // Update memory cache if exists
      const existing = this.memoryCache.get(key);
      if (existing) {
        existing.data = data;
        existing.timestamp = timestamp;
        this.memoryCache.set(key, existing);
      }
    } catch (error) {
      console.error('Error handling quote update:', error);
    }
  }

  // Public methods for monitoring
  getStats(): CacheStats & { popularStocks: PopularityScore[] } {
    return {
      ...this.stats,
      memoryUsage: this.memoryCache.size,
      popularStocks: Array.from(this.popularityTracker.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    };
  }

  async getGlobalStats(): Promise<any> {
    const allStats = await this.redis.hGetAll('cache:stats');
    return Object.entries(allStats).map(([instance, data]) => ({
      instance,
      ...JSON.parse(data)
    }));
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate local cache
    for (const key of this.memoryCache.keys()) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Notify other instances
    await this.redis.publish('cache:invalidate', JSON.stringify({ pattern }));
  }

  async warmCache(symbols: string[]): Promise<void> {
    console.log(`🔥 Warming cache for ${symbols.length} symbols`);
    
    // Emit event for cache warmer service
    this.emit('warmCache', symbols);
  }

  async close(): Promise<void> {
    await this.redis.quit();
    this.memoryCache.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const advancedCache = new AdvancedCacheManager();