// Advanced Multi-Layer Caching System for Financial Applications
// Optimized for hundreds of users with limited API quotas

import { EventEmitter } from 'events';

// Types and Interfaces
export enum DataTemperature {
  HOT = 'hot',     // < 30 seconds old, accessed frequently (real-time prices)
  WARM = 'warm',   // 30 seconds - 5 minutes old, moderate access (recent quotes)
  COLD = 'cold'    // > 5 minutes old, rarely accessed (historical data)
}

export enum CacheLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  DISK = 'disk'
}

export enum DataCategory {
  REAL_TIME_PRICE = 'real_time_price',
  STOCK_QUOTE = 'stock_quote',
  FINANCIAL_DATA = 'financial_data',
  COMPANY_PROFILE = 'company_profile',
  HISTORICAL_DATA = 'historical_data',
  EARNINGS_DATA = 'earnings_data',
  NEWS_DATA = 'news_data',
  USER_WATCHLIST = 'user_watchlist',
  USER_PORTFOLIO = 'user_portfolio'
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  accessCount: number;
  lastAccess: number;
  temperature: DataTemperature;
  category: DataCategory;
  size: number; // Estimated size in bytes
}

interface CacheStats {
  totalEntries: number;
  totalMemoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  layerDistribution: Record<CacheLayer, number>;
  temperatureDistribution: Record<DataTemperature, number>;
  categoryStats: Record<DataCategory, {
    count: number;
    hitRate: number;
    avgAccessTime: number;
  }>;
}

interface CacheConfig {
  maxMemorySize: number; // Maximum memory usage in bytes
  maxEntries: number;
  ttlStrategies: Record<DataCategory, {
    memoryTTL: number;
    redisTTL: number;
    diskTTL: number;
  }>;
  temperatureThresholds: {
    hotThreshold: number; // seconds
    warmThreshold: number; // seconds
  };
  evictionStrategy: 'LRU' | 'LFU' | 'TEMPERATURE_AWARE';
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

// Default configuration optimized for financial data
const DEFAULT_CONFIG: CacheConfig = {
  maxMemorySize: 50 * 1024 * 1024, // 50MB
  maxEntries: 10000,
  ttlStrategies: {
    [DataCategory.REAL_TIME_PRICE]: {
      memoryTTL: 5,      // 5 seconds
      redisTTL: 30,      // 30 seconds
      diskTTL: 300       // 5 minutes
    },
    [DataCategory.STOCK_QUOTE]: {
      memoryTTL: 30,     // 30 seconds
      redisTTL: 60,      // 1 minute
      diskTTL: 900       // 15 minutes
    },
    [DataCategory.FINANCIAL_DATA]: {
      memoryTTL: 300,    // 5 minutes
      redisTTL: 3600,    // 1 hour
      diskTTL: 86400     // 24 hours
    },
    [DataCategory.COMPANY_PROFILE]: {
      memoryTTL: 1800,   // 30 minutes
      redisTTL: 86400,   // 24 hours
      diskTTL: 604800    // 7 days
    },
    [DataCategory.HISTORICAL_DATA]: {
      memoryTTL: 900,    // 15 minutes
      redisTTL: 3600,    // 1 hour
      diskTTL: 2592000   // 30 days
    },
    [DataCategory.EARNINGS_DATA]: {
      memoryTTL: 1800,   // 30 minutes
      redisTTL: 21600,   // 6 hours
      diskTTL: 2592000   // 30 days
    },
    [DataCategory.NEWS_DATA]: {
      memoryTTL: 300,    // 5 minutes
      redisTTL: 900,     // 15 minutes
      diskTTL: 86400     // 24 hours
    },
    [DataCategory.USER_WATCHLIST]: {
      memoryTTL: 60,     // 1 minute
      redisTTL: 3600,    // 1 hour
      diskTTL: 86400     // 24 hours
    },
    [DataCategory.USER_PORTFOLIO]: {
      memoryTTL: 30,     // 30 seconds
      redisTTL: 300,     // 5 minutes
      diskTTL: 3600      // 1 hour
    }
  },
  temperatureThresholds: {
    hotThreshold: 30,   // 30 seconds
    warmThreshold: 300  // 5 minutes
  },
  evictionStrategy: 'TEMPERATURE_AWARE',
  compressionEnabled: true,
  persistToDisk: true
};

// Priority system for cache warming
interface CacheWarmingConfig {
  popularStocks: string[]; // Most frequently accessed stocks
  prioritySymbols: string[]; // VIP user watchlists
  preloadCategories: DataCategory[];
  warmingBatchSize: number;
  warmingIntervals: Record<DataCategory, number>; // milliseconds
}

const DEFAULT_WARMING_CONFIG: CacheWarmingConfig = {
  popularStocks: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'SPY', 'QQQ'],
  prioritySymbols: [],
  preloadCategories: [DataCategory.REAL_TIME_PRICE, DataCategory.STOCK_QUOTE],
  warmingBatchSize: 10,
  warmingIntervals: {
    [DataCategory.REAL_TIME_PRICE]: 5000,   // Every 5 seconds
    [DataCategory.STOCK_QUOTE]: 30000,      // Every 30 seconds
    [DataCategory.FINANCIAL_DATA]: 300000,  // Every 5 minutes
    [DataCategory.COMPANY_PROFILE]: 3600000, // Every hour
    [DataCategory.HISTORICAL_DATA]: 1800000, // Every 30 minutes
    [DataCategory.EARNINGS_DATA]: 3600000,   // Every hour
    [DataCategory.NEWS_DATA]: 300000,       // Every 5 minutes
    [DataCategory.USER_WATCHLIST]: 60000,   // Every minute
    [DataCategory.USER_PORTFOLIO]: 30000    // Every 30 seconds
  }
};

// Cache invalidation event system
interface InvalidationEvent {
  type: 'UPDATE' | 'DELETE' | 'EXPIRE';
  category: DataCategory;
  keys: string[];
  pattern?: string;
  userId?: string;
  timestamp: number;
}

export class AdvancedCacheManager extends EventEmitter {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private redisCache?: any; // Redis client would be injected
  private diskCache = new Map<string, CacheEntry<any>>(); // Simplified disk cache
  
  private stats: CacheStats = {
    totalEntries: 0,
    totalMemoryUsage: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    layerDistribution: {
      [CacheLayer.MEMORY]: 0,
      [CacheLayer.REDIS]: 0,
      [CacheLayer.DISK]: 0
    },
    temperatureDistribution: {
      [DataTemperature.HOT]: 0,
      [DataTemperature.WARM]: 0,
      [DataTemperature.COLD]: 0
    },
    categoryStats: {}
  };

  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private accessLog = new Map<string, number[]>(); // Track access patterns
  private warmingTimers = new Map<DataCategory, NodeJS.Timeout>();

  constructor(
    private config: CacheConfig = DEFAULT_CONFIG,
    private warmingConfig: CacheWarmingConfig = DEFAULT_WARMING_CONFIG,
    redisClient?: any
  ) {
    super();
    this.redisCache = redisClient;
    this.initializeCacheWarming();
    this.setupCleanupInterval();
  }

  // Core cache operations
  async get<T>(key: string, category: DataCategory, userId?: string): Promise<T | null> {
    const fullKey = this.buildKey(key, category, userId);
    
    // Check memory cache first (L1)
    const memoryResult = this.getFromMemory<T>(fullKey);
    if (memoryResult) {
      this.recordHit(CacheLayer.MEMORY, category);
      this.updateAccessPattern(fullKey);
      return memoryResult;
    }

    // Check Redis cache (L2)
    if (this.redisCache) {
      const redisResult = await this.getFromRedis<T>(fullKey);
      if (redisResult) {
        this.recordHit(CacheLayer.REDIS, category);
        this.updateAccessPattern(fullKey);
        // Promote to memory if frequently accessed
        this.promoteToMemory(fullKey, redisResult, category);
        return redisResult;
      }
    }

    // Check disk cache (L3)
    if (this.config.persistToDisk) {
      const diskResult = this.getFromDisk<T>(fullKey);
      if (diskResult) {
        this.recordHit(CacheLayer.DISK, category);
        this.updateAccessPattern(fullKey);
        // Promote to higher layers if appropriate
        this.promoteData(fullKey, diskResult, category);
        return diskResult;
      }
    }

    this.recordMiss(category);
    return null;
  }

  async set<T>(
    key: string, 
    data: T, 
    category: DataCategory, 
    userId?: string,
    options?: { temperature?: DataTemperature; ttlOverride?: number }
  ): Promise<void> {
    const fullKey = this.buildKey(key, category, userId);
    const temperature = options?.temperature || this.calculateTemperature(fullKey);
    const ttl = options?.ttlOverride || this.config.ttlStrategies[category];
    const size = this.estimateSize(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (ttl.memoryTTL * 1000),
      accessCount: 1,
      lastAccess: Date.now(),
      temperature,
      category,
      size
    };

    // Store in appropriate layers based on temperature and size
    await this.storeInLayers(fullKey, entry, ttl);
    
    // Check if memory cleanup is needed
    this.checkMemoryLimits();
    
    this.emit('cache:set', { key: fullKey, category, temperature, size });
  }

  // Temperature-aware data placement
  private async storeInLayers<T>(
    key: string, 
    entry: CacheEntry<T>, 
    ttl: { memoryTTL: number; redisTTL: number; diskTTL: number }
  ): Promise<void> {
    switch (entry.temperature) {
      case DataTemperature.HOT:
        // Store in memory and Redis
        this.memoryCache.set(key, { ...entry, expiry: Date.now() + (ttl.memoryTTL * 1000) });
        if (this.redisCache) {
          await this.setInRedis(key, entry, ttl.redisTTL);
        }
        break;

      case DataTemperature.WARM:
        // Store in Redis and optionally memory if space allows
        if (this.redisCache) {
          await this.setInRedis(key, entry, ttl.redisTTL);
        }
        if (this.hasMemorySpace(entry.size)) {
          this.memoryCache.set(key, { ...entry, expiry: Date.now() + (ttl.memoryTTL * 1000) });
        }
        break;

      case DataTemperature.COLD:
        // Store in disk and Redis
        if (this.config.persistToDisk) {
          this.setOnDisk(key, entry, ttl.diskTTL);
        }
        if (this.redisCache) {
          await this.setInRedis(key, entry, ttl.redisTTL);
        }
        break;
    }

    this.updateStats();
  }

  // Cache invalidation strategies
  async invalidate(key: string, category: DataCategory, userId?: string): Promise<void> {
    const fullKey = this.buildKey(key, category, userId);
    
    // Remove from all layers
    this.memoryCache.delete(fullKey);
    
    if (this.redisCache) {
      await this.redisCache.del(fullKey);
    }
    
    this.diskCache.delete(fullKey);

    const event: InvalidationEvent = {
      type: 'DELETE',
      category,
      keys: [fullKey],
      userId,
      timestamp: Date.now()
    };

    this.emit('cache:invalidate', event);
  }

  async invalidateByPattern(pattern: string, category: DataCategory): Promise<number> {
    let count = 0;
    const keys: string[] = [];

    // Memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (key.includes(pattern) && entry.category === category) {
        this.memoryCache.delete(key);
        keys.push(key);
        count++;
      }
    }

    // Redis cache
    if (this.redisCache) {
      // Use Redis SCAN for pattern matching
      const redisKeys = await this.scanRedisPattern(pattern, category);
      if (redisKeys.length > 0) {
        await this.redisCache.del(...redisKeys);
        keys.push(...redisKeys);
        count += redisKeys.length;
      }
    }

    // Disk cache
    for (const [key, entry] of this.diskCache.entries()) {
      if (key.includes(pattern) && entry.category === category) {
        this.diskCache.delete(key);
        keys.push(key);
        count++;
      }
    }

    const event: InvalidationEvent = {
      type: 'DELETE',
      category,
      keys,
      pattern,
      timestamp: Date.now()
    };

    this.emit('cache:invalidate', event);
    
    return count;
  }

  // Cache warming strategies
  private initializeCacheWarming(): void {
    // Warm popular stocks
    this.startCacheWarming(DataCategory.REAL_TIME_PRICE, this.warmingConfig.popularStocks);
    this.startCacheWarming(DataCategory.STOCK_QUOTE, this.warmingConfig.popularStocks);
    
    // Warm priority symbols (from VIP users)
    if (this.warmingConfig.prioritySymbols.length > 0) {
      this.startCacheWarming(DataCategory.FINANCIAL_DATA, this.warmingConfig.prioritySymbols);
    }
  }

  private startCacheWarming(category: DataCategory, symbols: string[]): void {
    const interval = this.warmingConfig.warmingIntervals[category];
    
    const warmingFunction = async () => {
      const batchSize = this.warmingConfig.warmingBatchSize;
      const batches = this.chunkArray(symbols, batchSize);
      
      for (const batch of batches) {
        await this.warmBatch(batch, category);
        // Small delay between batches to avoid overwhelming APIs
        await this.delay(100);
      }
    };

    // Initial warming
    warmingFunction();
    
    // Schedule recurring warming
    const timer = setInterval(warmingFunction, interval);
    this.warmingTimers.set(category, timer);
  }

  private async warmBatch(symbols: string[], category: DataCategory): Promise<void> {
    const promises = symbols.map(async (symbol) => {
      const key = this.buildKey(symbol, category);
      const cached = await this.get(key, category);
      
      if (!cached) {
        // Data not in cache, this would trigger the API call in the main application
        this.emit('cache:warm:miss', { symbol, category });
      }
    });

    await Promise.allSettled(promises);
  }

  // Memory optimization strategies
  private checkMemoryLimits(): void {
    const currentMemoryUsage = this.calculateMemoryUsage();
    
    if (currentMemoryUsage > this.config.maxMemorySize || 
        this.memoryCache.size > this.config.maxEntries) {
      this.performEviction();
    }
  }

  private performEviction(): void {
    const evictionCount = Math.ceil(this.memoryCache.size * 0.1); // Evict 10%
    const candidates = this.getEvictionCandidates(evictionCount);
    
    for (const key of candidates) {
      const entry = this.memoryCache.get(key);
      if (entry) {
        // Demote to lower layer instead of deleting
        this.demoteFromMemory(key, entry);
      }
      this.memoryCache.delete(key);
      this.evictionCount++;
    }

    this.emit('cache:eviction', { count: evictionCount, strategy: this.config.evictionStrategy });
  }

  private getEvictionCandidates(count: number): string[] {
    const entries = Array.from(this.memoryCache.entries());
    
    switch (this.config.evictionStrategy) {
      case 'LRU':
        return entries
          .sort(([, a], [, b]) => a.lastAccess - b.lastAccess)
          .slice(0, count)
          .map(([key]) => key);
      
      case 'LFU':
        return entries
          .sort(([, a], [, b]) => a.accessCount - b.accessCount)
          .slice(0, count)
          .map(([key]) => key);
      
      case 'TEMPERATURE_AWARE':
        return entries
          .sort(([, a], [, b]) => {
            // Prioritize evicting COLD data first, then by access count
            const tempScore = { hot: 3, warm: 2, cold: 1 };
            const aTempScore = tempScore[a.temperature];
            const bTempScore = tempScore[b.temperature];
            
            if (aTempScore !== bTempScore) {
              return aTempScore - bTempScore;
            }
            return a.accessCount - b.accessCount;
          })
          .slice(0, count)
          .map(([key]) => key);
      
      default:
        return entries.slice(0, count).map(([key]) => key);
    }
  }

  // User-specific caching optimizations
  getUserCacheStats(userId: string): any {
    const userKeys = Array.from(this.memoryCache.keys()).filter(key => key.includes(`user:${userId}`));
    const userEntries = userKeys.map(key => this.memoryCache.get(key)!);
    
    return {
      totalEntries: userEntries.length,
      totalSize: userEntries.reduce((sum, entry) => sum + entry.size, 0),
      categoryDistribution: userEntries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      }, {} as Record<DataCategory, number>),
      averageAccessCount: userEntries.length > 0 
        ? userEntries.reduce((sum, entry) => sum + entry.accessCount, 0) / userEntries.length 
        : 0
    };
  }

  optimizeForUser(userId: string, symbols: string[]): void {
    // Add user's watchlist to priority warming
    const userSymbols = symbols.filter(s => !this.warmingConfig.prioritySymbols.includes(s));
    this.warmingConfig.prioritySymbols.push(...userSymbols);
    
    // Pre-warm user-specific data
    const categories = [DataCategory.REAL_TIME_PRICE, DataCategory.STOCK_QUOTE];
    categories.forEach(category => {
      this.warmBatch(symbols, category);
    });
  }

  // Utility methods
  private buildKey(key: string, category: DataCategory, userId?: string): string {
    const parts = [category];
    if (userId) parts.push(`user:${userId}`);
    parts.push(key);
    return parts.join(':');
  }

  private calculateTemperature(key: string): DataTemperature {
    const accessTimes = this.accessLog.get(key) || [];
    const now = Date.now();
    const recentAccesses = accessTimes.filter(time => now - time < this.config.temperatureThresholds.warmThreshold * 1000);
    
    if (recentAccesses.length >= 3 && (now - Math.max(...accessTimes)) < this.config.temperatureThresholds.hotThreshold * 1000) {
      return DataTemperature.HOT;
    } else if (recentAccesses.length >= 1) {
      return DataTemperature.WARM;
    }
    
    return DataTemperature.COLD;
  }

  private updateAccessPattern(key: string): void {
    const times = this.accessLog.get(key) || [];
    times.push(Date.now());
    
    // Keep only last 10 access times
    if (times.length > 10) {
      times.splice(0, times.length - 10);
    }
    
    this.accessLog.set(key, times);
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimation
  }

  private calculateMemoryUsage(): number {
    return Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private hasMemorySpace(size: number): boolean {
    return this.calculateMemoryUsage() + size <= this.config.maxMemorySize;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Layer-specific operations (simplified)
  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    
    entry.accessCount++;
    entry.lastAccess = Date.now();
    return entry.data as T;
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    if (!this.redisCache) return null;
    
    try {
      const data = await this.redisCache.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  private getFromDisk<T>(key: string): T | null {
    const entry = this.diskCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.diskCache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private async setInRedis<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number): Promise<void> {
    if (!this.redisCache) return;
    
    try {
      await this.redisCache.setex(key, ttlSeconds, JSON.stringify(entry.data));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  private setOnDisk<T>(key: string, entry: CacheEntry<T>, ttlSeconds: number): void {
    this.diskCache.set(key, {
      ...entry,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  private promoteToMemory<T>(key: string, data: T, category: DataCategory): void {
    if (this.hasMemorySpace(this.estimateSize(data))) {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + (this.config.ttlStrategies[category].memoryTTL * 1000),
        accessCount: 1,
        lastAccess: Date.now(),
        temperature: this.calculateTemperature(key),
        category,
        size: this.estimateSize(data)
      };
      
      this.memoryCache.set(key, entry);
    }
  }

  private promoteData<T>(key: string, data: T, category: DataCategory): void {
    this.promoteToMemory(key, data, category);
    
    if (this.redisCache) {
      const ttl = this.config.ttlStrategies[category].redisTTL;
      this.setInRedis(key, {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + (ttl * 1000),
        accessCount: 1,
        lastAccess: Date.now(),
        temperature: this.calculateTemperature(key),
        category,
        size: this.estimateSize(data)
      }, ttl);
    }
  }

  private demoteFromMemory<T>(key: string, entry: CacheEntry<T>): void {
    if (this.redisCache) {
      const ttl = this.config.ttlStrategies[entry.category].redisTTL;
      this.setInRedis(key, entry, ttl);
    } else if (this.config.persistToDisk) {
      const ttl = this.config.ttlStrategies[entry.category].diskTTL;
      this.setOnDisk(key, entry, ttl);
    }
  }

  private async scanRedisPattern(pattern: string, category: DataCategory): Promise<string[]> {
    if (!this.redisCache) return [];
    
    try {
      const keys = await this.redisCache.keys(`${category}:*${pattern}*`);
      return keys;
    } catch (error) {
      console.error('Redis pattern scan error:', error);
      return [];
    }
  }

  private recordHit(layer: CacheLayer, category: DataCategory): void {
    this.hitCount++;
    this.stats.layerDistribution[layer]++;
    
    if (!this.stats.categoryStats[category]) {
      this.stats.categoryStats[category] = { count: 0, hitRate: 0, avgAccessTime: 0 };
    }
    this.stats.categoryStats[category].count++;
  }

  private recordMiss(category: DataCategory): void {
    this.missCount++;
  }

  private updateStats(): void {
    const total = this.hitCount + this.missCount;
    this.stats.hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;
    this.stats.missRate = total > 0 ? (this.missCount / total) * 100 : 0;
    this.stats.evictionCount = this.evictionCount;
    this.stats.totalEntries = this.memoryCache.size;
    this.stats.totalMemoryUsage = this.calculateMemoryUsage();

    // Update temperature distribution
    this.stats.temperatureDistribution = {
      [DataTemperature.HOT]: 0,
      [DataTemperature.WARM]: 0,
      [DataTemperature.COLD]: 0
    };

    for (const entry of this.memoryCache.values()) {
      this.stats.temperatureDistribution[entry.temperature]++;
    }
  }

  private setupCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key));

    // Cleanup access log
    for (const [key, times] of this.accessLog.entries()) {
      const recentTimes = times.filter(time => now - time < 24 * 60 * 60 * 1000); // Keep 24 hours
      if (recentTimes.length === 0) {
        this.accessLog.delete(key);
      } else {
        this.accessLog.set(key, recentTimes);
      }
    }

    this.emit('cache:cleanup', { expiredCount: expiredKeys.length });
  }

  // Public API for monitoring and management
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('cache:config:updated', this.config);
  }

  addPopularStock(symbol: string): void {
    if (!this.warmingConfig.popularStocks.includes(symbol)) {
      this.warmingConfig.popularStocks.push(symbol);
      this.emit('cache:warming:symbol:added', symbol);
    }
  }

  removePopularStock(symbol: string): void {
    const index = this.warmingConfig.popularStocks.indexOf(symbol);
    if (index > -1) {
      this.warmingConfig.popularStocks.splice(index, 1);
      this.emit('cache:warming:symbol:removed', symbol);
    }
  }

  shutdown(): void {
    // Clear all warming timers
    for (const timer of this.warmingTimers.values()) {
      clearInterval(timer);
    }
    this.warmingTimers.clear();
    
    // Clear all caches
    this.memoryCache.clear();
    this.diskCache.clear();
    this.accessLog.clear();
    
    this.emit('cache:shutdown');
  }
}

// Export types for use in other modules
export type { CacheEntry, CacheStats, CacheConfig, CacheWarmingConfig, InvalidationEvent };