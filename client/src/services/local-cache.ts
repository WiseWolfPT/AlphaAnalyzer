interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  compress?: boolean; // Compress large objects
}

class LocalCacheService {
  private readonly prefix = 'alfalyzer_cache_';
  private readonly maxSize = 5 * 1024 * 1024; // 5MB limit for cache
  
  // Default TTL values for different data types
  private readonly defaultTTLs = {
    stock_price: 1 * 60 * 1000, // 1 minute
    stock_profile: 24 * 60 * 60 * 1000, // 24 hours
    stock_chart: 5 * 60 * 1000, // 5 minutes
    market_data: 1 * 60 * 1000, // 1 minute
    user_data: 30 * 60 * 1000, // 30 minutes
    search_results: 10 * 60 * 1000, // 10 minutes
    news: 15 * 60 * 1000, // 15 minutes
    transcripts: 60 * 60 * 1000, // 1 hour
    default: 5 * 60 * 1000, // 5 minutes
  } as const;

  /**
   * Store data in localStorage with TTL
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): boolean {
    try {
      const ttl = options.ttl || this.defaultTTLs.default;
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      const serialized = JSON.stringify(cacheItem);
      const fullKey = this.prefix + key;

      // Check storage limits
      if (serialized.length > this.maxSize / 10) {
        console.warn(`Cache item ${key} is very large, skipping cache`);
        return false;
      }

      // Clean up expired items before storing
      this.cleanup();

      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.warn('Failed to cache data:', error);
      // If storage is full, try to make space
      if (error instanceof DOMException && error.code === 22) {
        this.clearExpired();
        // Try once more
        try {
          localStorage.setItem(this.prefix + key, JSON.stringify({ data, timestamp: Date.now(), ttl: options.ttl || this.defaultTTLs.default }));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Retrieve data from localStorage, checking TTL
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = this.prefix + key;
      const item = localStorage.getItem(fullKey);
      
      if (!item) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(item);
      
      // Check if expired
      if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
        this.delete(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn(`Failed to retrieve cached data for ${key}:`, error);
      this.delete(key); // Clean up corrupted data
      return null;
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn(`Failed to delete cache key ${key}:`, error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  clearExpired(): number {
    let clearedCount = 0;
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      
      for (const fullKey of keys) {
        try {
          const item = localStorage.getItem(fullKey);
          if (item) {
            const cacheItem: CacheItem = JSON.parse(item);
            if (Date.now() - cacheItem.timestamp > cacheItem.ttl) {
              localStorage.removeItem(fullKey);
              clearedCount++;
            }
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(fullKey);
          clearedCount++;
        }
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
    return clearedCount;
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let totalEntries = 0;
    let totalSize = 0;
    let expiredEntries = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      
      for (const fullKey of keys) {
        try {
          const item = localStorage.getItem(fullKey);
          if (item) {
            totalEntries++;
            totalSize += item.length;
            
            const cacheItem: CacheItem = JSON.parse(item);
            const timestamp = cacheItem.timestamp;
            
            if (Date.now() - timestamp > cacheItem.ttl) {
              expiredEntries++;
            }
            
            if (oldestEntry === null || timestamp < oldestEntry) {
              oldestEntry = timestamp;
            }
            if (newestEntry === null || timestamp > newestEntry) {
              newestEntry = timestamp;
            }
          }
        } catch {
          // Count corrupted entries as expired
          expiredEntries++;
          totalEntries++;
        }
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return {
      totalEntries,
      totalSize,
      expiredEntries,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Automatic cleanup - call periodically
   */
  private cleanup(): void {
    const stats = this.getStats();
    
    // If we have many expired entries, clean them up
    if (stats.expiredEntries > 10) {
      this.clearExpired();
    }
    
    // If cache is getting large, clean up more aggressively
    if (stats.totalSize > this.maxSize * 0.8) {
      this.clearExpired();
      
      // If still too large, remove oldest entries
      if (this.getStats().totalSize > this.maxSize * 0.8) {
        this.clearOldest(Math.floor(stats.totalEntries * 0.2));
      }
    }
  }

  /**
   * Remove oldest cache entries
   */
  private clearOldest(count: number): void {
    try {
      const entries: Array<{ key: string; timestamp: number }> = [];
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      
      for (const fullKey of keys) {
        try {
          const item = localStorage.getItem(fullKey);
          if (item) {
            const cacheItem: CacheItem = JSON.parse(item);
            entries.push({ key: fullKey, timestamp: cacheItem.timestamp });
          }
        } catch {
          // Remove corrupted entries immediately
          localStorage.removeItem(fullKey);
        }
      }
      
      // Sort by timestamp (oldest first) and remove
      entries
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, count)
        .forEach(entry => localStorage.removeItem(entry.key));
        
    } catch (error) {
      console.warn('Failed to clear oldest cache entries:', error);
    }
  }

  /**
   * Cache stock-specific data with appropriate TTL
   */
  setStockData(symbol: string, dataType: keyof typeof this.defaultTTLs, data: any): boolean {
    const key = `stock_${symbol}_${dataType}`;
    const ttl = this.defaultTTLs[dataType] || this.defaultTTLs.default;
    return this.set(key, data, { ttl });
  }

  /**
   * Get stock-specific data
   */
  getStockData<T>(symbol: string, dataType: keyof typeof this.defaultTTLs): T | null {
    const key = `stock_${symbol}_${dataType}`;
    return this.get<T>(key);
  }

  /**
   * Cache market data
   */
  setMarketData(dataType: string, data: any): boolean {
    const key = `market_${dataType}`;
    return this.set(key, data, { ttl: this.defaultTTLs.market_data });
  }

  /**
   * Get market data
   */
  getMarketData<T>(dataType: string): T | null {
    const key = `market_${dataType}`;
    return this.get<T>(key);
  }

  /**
   * Cache user data
   */
  setUserData(userId: string, dataType: string, data: any): boolean {
    const key = `user_${userId}_${dataType}`;
    return this.set(key, data, { ttl: this.defaultTTLs.user_data });
  }

  /**
   * Get user data
   */
  getUserData<T>(userId: string, dataType: string): T | null {
    const key = `user_${userId}_${dataType}`;
    return this.get<T>(key);
  }
}

// Create singleton instance
export const localCache = new LocalCacheService();

// Auto-cleanup every 5 minutes
setInterval(() => {
  localCache.clearExpired();
}, 5 * 60 * 1000);

export default localCache;