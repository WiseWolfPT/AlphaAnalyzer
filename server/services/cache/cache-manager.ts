/**
 * ENHANCED MULTI-LAYER CACHE MANAGER
 * Intelligent caching system with Redis fallback to in-memory storage
 * Implements cache warming, invalidation strategies, and monitoring
 */

import { env } from '../../config/env';
import { RedisCacheProvider } from './providers/redis-cache';
import { MemoryCacheProvider } from './providers/memory-cache';
import { logger } from '../../config/logger-config';

export enum CacheType {
  // API Data Layers
  REALTIME_PRICE = 'realtime_price',       // 30 seconds TTL
  AFTER_HOURS = 'after_hours',             // 5 minutes TTL
  CHART_DATA = 'chart_data',               // 1 hour TTL
  HISTORICAL_DATA = 'historical_data',     // 24 hours TTL
  FUNDAMENTALS = 'fundamentals',           // 1 hour TTL
  COMPANY_PROFILE = 'company_profile',     // 24 hours TTL
  
  // Database Query Cache
  USER_DATA = 'user_data',                 // 30 minutes TTL
  WATCHLISTS = 'watchlists',               // 15 minutes TTL
  PORTFOLIOS = 'portfolios',               // 15 minutes TTL
  TRANSCRIPTS = 'transcripts',             // 2 hours TTL
  
  // Static Data Cache
  SECTORS = 'sectors',                     // 24 hours TTL
  MARKET_STATUS = 'market_status',         // 30 seconds TTL
  NEWS = 'news',                          // 10 minutes TTL
  EARNINGS_CALENDAR = 'earnings_calendar', // 6 hours TTL
}

export interface CacheConfig {
  ttl: number;           // Time to live in milliseconds
  maxSize: number;       // Maximum entries for this cache type
  priority: number;      // Eviction priority (higher = keep longer)
  warmOnStart: boolean;  // Whether to warm this cache on startup
}

export const CACHE_CONFIGS: Record<CacheType, CacheConfig> = {
  // API Data - Short TTL for real-time data
  [CacheType.REALTIME_PRICE]: { ttl: 30 * 1000, maxSize: 1000, priority: 10, warmOnStart: true },
  [CacheType.AFTER_HOURS]: { ttl: 5 * 60 * 1000, maxSize: 500, priority: 8, warmOnStart: false },
  [CacheType.CHART_DATA]: { ttl: 60 * 60 * 1000, maxSize: 200, priority: 7, warmOnStart: true },
  [CacheType.HISTORICAL_DATA]: { ttl: 24 * 60 * 60 * 1000, maxSize: 100, priority: 6, warmOnStart: false },
  [CacheType.FUNDAMENTALS]: { ttl: 60 * 60 * 1000, maxSize: 300, priority: 7, warmOnStart: true },
  [CacheType.COMPANY_PROFILE]: { ttl: 24 * 60 * 60 * 1000, maxSize: 1000, priority: 5, warmOnStart: false },
  
  // Database Cache - Medium TTL for user data
  [CacheType.USER_DATA]: { ttl: 30 * 60 * 1000, maxSize: 1000, priority: 9, warmOnStart: false },
  [CacheType.WATCHLISTS]: { ttl: 15 * 60 * 1000, maxSize: 500, priority: 8, warmOnStart: true },
  [CacheType.PORTFOLIOS]: { ttl: 15 * 60 * 1000, maxSize: 500, priority: 8, warmOnStart: true },
  [CacheType.TRANSCRIPTS]: { ttl: 2 * 60 * 60 * 1000, maxSize: 200, priority: 6, warmOnStart: false },
  
  // Static Data - Long TTL for rarely changing data
  [CacheType.SECTORS]: { ttl: 24 * 60 * 60 * 1000, maxSize: 50, priority: 4, warmOnStart: true },
  [CacheType.MARKET_STATUS]: { ttl: 30 * 1000, maxSize: 10, priority: 9, warmOnStart: true },
  [CacheType.NEWS]: { ttl: 10 * 60 * 1000, maxSize: 100, priority: 5, warmOnStart: false },
  [CacheType.EARNINGS_CALENDAR]: { ttl: 6 * 60 * 60 * 1000, maxSize: 50, priority: 6, warmOnStart: true },
};

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  errors: number;
  apiCallsSaved: number;
  totalRequests: number;
  redisConnected: boolean;
  memoryCacheSize: number;
  redisCacheSize: number;
  hitRate: string;
  uptime: number;
  byType: Record<CacheType, { count: number; hits: number; misses: number; size: number }>;
}

export class CacheManager {
  private redisProvider: RedisCacheProvider;
  private memoryProvider: MemoryCacheProvider;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.initializeProviders();
    this.initializeStats();
    this.startCleanupTask();
  }

  private initializeProviders() {
    this.redisProvider = new RedisCacheProvider();
    this.memoryProvider = new MemoryCacheProvider({
      maxSizeInMB: 512,
      maxEntries: 10000,
      cleanupIntervalMs: 5 * 60 * 1000
    });
    logger.info('✅ Cache providers initialized (Redis + Memory)');
  }

  private initializeStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      errors: 0,
      apiCallsSaved: 0,
      totalRequests: 0,
      redisConnected: false,
      memoryCacheSize: 0,
      redisCacheSize: 0,
      hitRate: '0.00%',
      uptime: 0,
      byType: {} as Record<CacheType, { count: number; hits: number; misses: number; size: number }>,
    };

    // Initialize per-type stats
    Object.values(CacheType).forEach(type => {
      this.stats.byType[type] = { count: 0, hits: 0, misses: 0, size: 0 };
    });
  }

  /**
   * Get data from cache with automatic fallback to memory cache
   */
  async get<T>(key: string, type: CacheType): Promise<T | null> {
    this.stats.totalRequests++;
    
    try {
      // Try Redis first if available
      if (this.redisProvider.isConnectedState()) {
        const result = await this.redisProvider.get<T>(key);
        if (result !== null) {
          this.stats.hits++;
          this.stats.byType[type].hits++;
          this.stats.apiCallsSaved++;
          logger.debug(`📦 Redis cache HIT: ${key} (${type})`);
          return result;
        }
      }

      // Fallback to memory cache
      const result = await this.memoryProvider.get<T>(key);
      if (result !== null) {
        this.stats.hits++;
        this.stats.byType[type].hits++;
        this.stats.apiCallsSaved++;
        logger.debug(`💾 Memory cache HIT: ${key} (${type})`);
        return result;
      }

      this.stats.misses++;
      this.stats.byType[type].misses++;
      return null;

    } catch (error) {
      logger.error(`❌ Cache get error for ${key}:`, error);
      this.stats.errors++;
      this.stats.misses++;
      this.stats.byType[type].misses++;
      return null;
    }
  }

  /**
   * Set data in cache with automatic dual-layer storage
   */
  async set<T>(key: string, data: T, type: CacheType, provider?: string, metadata?: Record<string, any>): Promise<void> {
    const config = CACHE_CONFIGS[type];
    
    this.stats.sets++;
    this.stats.byType[type].count++;

    try {
      // Store in Redis if available
      if (this.redisProvider.isConnectedState()) {
        await this.redisProvider.set(key, data, config.ttl, type, provider, metadata);
      }

      // Always store in memory cache as fallback
      await this.memoryProvider.set(key, data, config.ttl, type, provider, metadata);

      logger.debug(`💾 Cache SET: ${key} (${type}, TTL: ${this.formatTTL(config.ttl)}, Provider: ${provider || 'unknown'})`);

    } catch (error) {
      logger.error(`❌ Cache set error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Get or fetch pattern with automatic caching
   */
  async getOrFetch<T>(
    key: string,
    type: CacheType,
    fetcher: () => Promise<T>,
    provider?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key, type);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    try {
      const data = await fetcher();
      await this.set(key, data, type, provider, metadata);
      return data;
    } catch (error) {
      logger.error(`❌ Fetcher error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries by pattern or type
   */
  async invalidate(pattern?: string, type?: CacheType): Promise<number> {
    let invalidated = 0;

    try {
      // Invalidate in Redis
      if (this.redisProvider.isConnectedState()) {
        if (pattern) {
          invalidated += await this.redisProvider.deletePattern(pattern);
        } else if (type) {
          invalidated += await this.redisProvider.deletePattern(`${type}:*`);
        }
      }

      // Invalidate in memory cache
      if (pattern) {
        invalidated += await this.memoryProvider.deletePattern(pattern);
      } else if (type) {
        invalidated += await this.memoryProvider.deletePattern(`${type}:*`);
      }

      if (invalidated > 0) {
        logger.info(`🗑️ Cache invalidated ${invalidated} entries (pattern: ${pattern}, type: ${type})`);
      }

    } catch (error) {
      logger.error('❌ Cache invalidation error:', error);
      this.stats.errors++;
    }

    return invalidated;
  }

  /**
   * Clear entire cache or specific type
   */
  async clear(type?: CacheType): Promise<number> {
    let cleared = 0;

    try {
      if (type) {
        cleared = await this.invalidate(undefined, type);
        this.stats.byType[type] = { count: 0, hits: 0, misses: 0, size: 0 };
      } else {
        // Clear everything
        if (this.redisProvider.isConnectedState()) {
          await this.redisProvider.clear();
        }
        
        await this.memoryProvider.clear();
        
        // Reset stats
        Object.values(CacheType).forEach(cacheType => {
          this.stats.byType[cacheType] = { count: 0, hits: 0, misses: 0, size: 0 };
        });
        
        cleared = 1; // Indicate successful clear
      }

      logger.info(`🗑️ Cache cleared: ${cleared} entries ${type ? `(type: ${type})` : '(all)'}`);

    } catch (error) {
      logger.error('❌ Cache clear error:', error);
      this.stats.errors++;
    }

    return cleared;
  }

  /**
   * Warm cache with popular/essential data
   */
  async warmCache(symbols: string[] = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']): Promise<void> {
    logger.info(`🔥 Warming cache for ${symbols.length} symbols...`);

    const warmingTasks = symbols.map(async (symbol) => {
      try {
        // Warm market status (global)
        await this.set('market:status', { isOpen: true, session: 'regular' }, CacheType.MARKET_STATUS, 'system');
        
        // Warm sector data
        await this.set('sectors:all', [], CacheType.SECTORS, 'system');
        
        // Warm symbol-specific data that should be cached on startup
        const configs = Object.entries(CACHE_CONFIGS).filter(([_, config]) => config.warmOnStart);
        
        for (const [cacheType] of configs) {
          const key = `${cacheType}:${symbol}`;
          // Set placeholder data to warm the cache structure
          await this.set(key, null, cacheType as CacheType, 'warming');
        }
        
      } catch (error) {
        logger.error(`❌ Cache warming error for ${symbol}:`, error);
      }
    });

    await Promise.allSettled(warmingTasks);
    logger.info('✅ Cache warming completed');
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(2) + '%'
      : '0.00%';

    return {
      ...this.stats,
      hitRate,
      memoryCacheSize: 0, // Will be updated from provider stats
      redisCacheSize: 0, // Will be updated from provider stats
      redisConnected: this.redisProvider.isConnectedState(),
      uptime: process.uptime(),
    };
  }

  /**
   * Generate cache key with consistent format
   */
  static generateKey(type: CacheType, identifier: string, ...params: string[]): string {
    const parts = [type, identifier, ...params.filter(Boolean)];
    return parts.join(':');
  }

  private startCleanupTask(): void {
    // Cleanup is now handled by individual providers
    // This interval is kept for global cache statistics updates
    this.cleanupInterval = setInterval(() => {
      // Update global stats periodically
      logger.trace(`💾 Cache manager uptime: ${Math.floor(process.uptime())}s`);
    }, 5 * 60 * 1000);
  }

  private formatTTL(ttl: number): string {
    if (ttl < 60 * 1000) return `${Math.floor(ttl / 1000)}s`;
    if (ttl < 60 * 60 * 1000) return `${Math.floor(ttl / (60 * 1000))}m`;
    if (ttl < 24 * 60 * 60 * 1000) return `${Math.floor(ttl / (60 * 60 * 1000))}h`;
    return `${Math.floor(ttl / (24 * 60 * 60 * 1000))}d`;
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await Promise.all([
      this.redisProvider.shutdown(),
      this.memoryProvider.shutdown()
    ]);

    logger.info('💾 Cache manager shutdown complete');
  }
}

// Cache key generators for consistency
export const CacheKeys = {
  // API Data Keys
  realtimePrice: (symbol: string) => CacheManager.generateKey(CacheType.REALTIME_PRICE, symbol),
  afterHours: (symbol: string) => CacheManager.generateKey(CacheType.AFTER_HOURS, symbol),
  chartData: (symbol: string, period: string, interval?: string) => 
    CacheManager.generateKey(CacheType.CHART_DATA, symbol, period, interval || '1d'),
  historicalData: (symbol: string, range: string) => 
    CacheManager.generateKey(CacheType.HISTORICAL_DATA, symbol, range),
  fundamentals: (symbol: string) => CacheManager.generateKey(CacheType.FUNDAMENTALS, symbol),
  companyProfile: (symbol: string) => CacheManager.generateKey(CacheType.COMPANY_PROFILE, symbol),

  // Database Keys
  userData: (userId: string) => CacheManager.generateKey(CacheType.USER_DATA, userId),
  userWatchlists: (userId: string) => CacheManager.generateKey(CacheType.WATCHLISTS, userId),
  userPortfolios: (userId: string) => CacheManager.generateKey(CacheType.PORTFOLIOS, userId),
  transcript: (symbol: string, quarter: string, year: string) => 
    CacheManager.generateKey(CacheType.TRANSCRIPTS, symbol, quarter, year),

  // Static Data Keys
  sectors: () => CacheManager.generateKey(CacheType.SECTORS, 'all'),
  marketStatus: () => CacheManager.generateKey(CacheType.MARKET_STATUS, 'global'),
  news: (symbol?: string) => CacheManager.generateKey(CacheType.NEWS, symbol || 'general'),
  earningsCalendar: (date: string) => CacheManager.generateKey(CacheType.EARNINGS_CALENDAR, date),
};

// Auto-start cache warming will be handled by the lazy-loaded instance