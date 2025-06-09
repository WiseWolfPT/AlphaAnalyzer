// Advanced caching system for API optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private configs: Record<string, CacheConfig> = {
    // Stock quotes - cache for 1 minute (real-time feel)
    'stock-quote': { ttl: 60 * 1000, maxSize: 100 },
    
    // Financial data - cache for 1 hour (changes less frequently)
    'financials': { ttl: 60 * 60 * 1000, maxSize: 50 },
    
    // Company profile - cache for 1 day (rarely changes)
    'profile': { ttl: 24 * 60 * 60 * 1000, maxSize: 100 },
    
    // Historical data - cache for 30 minutes
    'historical': { ttl: 30 * 60 * 1000, maxSize: 30 },
    
    // Earnings data - cache for 6 hours
    'earnings': { ttl: 6 * 60 * 60 * 1000, maxSize: 50 },
    
    // News - cache for 15 minutes
    'news': { ttl: 15 * 60 * 1000, maxSize: 200 }
  };

  get<T>(key: string, category: keyof typeof this.configs = 'stock-quote'): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access time for LRU
    entry.timestamp = Date.now();
    return entry.data;
  }

  set<T>(key: string, data: T, category: keyof typeof this.configs = 'stock-quote'): void {
    const config = this.configs[category];
    const expiry = Date.now() + config.ttl;
    
    // Clean up if at max size
    if (this.cache.size >= config.maxSize) {
      this.evictOldest(category);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  private evictOldest(category: string): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(category) && entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(category?: string): void {
    if (category) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(category)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Get cache statistics
  getStats() {
    const stats = {
      totalEntries: this.cache.size,
      categories: {} as Record<string, number>
    };
    
    for (const key of this.cache.keys()) {
      const category = key.split('-')[0];
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }
    
    return stats;
  }
}

// Global cache instance
export const cacheManager = new CacheManager();