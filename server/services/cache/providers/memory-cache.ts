/**
 * MEMORY CACHE PROVIDER
 * In-memory LRU cache with intelligent eviction and memory management
 */

import { LRUCache } from 'lru-cache';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  type: string;
  provider?: string;
  hitCount: number;
  metadata?: Record<string, any>;
}

export interface MemoryStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: string;
  memoryUsage: {
    used: number;
    total: number;
    percentage: string;
  };
  evictions: number;
  oldestEntry: number;
  newestEntry: number;
  byType: Record<string, { count: number; size: number; hits: number }>;
}

export class MemoryCacheProvider {
  private cache: LRUCache<string, CacheEntry<any>>;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    typeStats: new Map<string, { count: number; size: number; hits: number }>()
  };
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxSizeInMB: number;

  constructor(options: {
    maxSizeInMB?: number;
    maxEntries?: number;
    cleanupIntervalMs?: number;
  } = {}) {
    this.maxSizeInMB = options.maxSizeInMB || 512; // 512MB default
    const maxEntries = options.maxEntries || 10000;
    const cleanupIntervalMs = options.cleanupIntervalMs || 5 * 60 * 1000; // 5 minutes

    this.cache = new LRUCache<string, CacheEntry<any>>({
      max: maxEntries,
      dispose: (value, key) => {
        this.stats.evictions++;
        this.updateTypeStats(value.type, -1, -this.estimateSize(value));
        console.log(`💾 Memory cache evicted: ${key} (${value.type})`);
      },
      updateAgeOnGet: true,
      updateAgeOnHas: true,
      // Calculate size based on JSON string length
      sizeCalculation: (value: CacheEntry<any>) => {
        return this.estimateSize(value);
      },
      // Max size in bytes (convert MB to bytes)
      maxSize: this.maxSizeInMB * 1024 * 1024
    });

    // Start cleanup task
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);

    console.log(`💾 Memory cache initialized: ${maxEntries} entries max, ${this.maxSizeInMB}MB limit`);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateTypeStats(entry.type, -1, -this.estimateSize(entry));
      return null;
    }

    // Update hit count and stats
    entry.hitCount++;
    this.stats.hits++;
    this.updateTypeStats(entry.type, 0, 0, 1);
    
    return entry.data;
  }

  async set<T>(
    key: string,
    data: T,
    ttlMs: number,
    type: string = 'unknown',
    provider?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
      type,
      provider,
      hitCount: 0,
      metadata
    };

    // Check if this would exceed memory limits
    const entrySize = this.estimateSize(entry);
    const currentSize = this.getCurrentMemoryUsage();
    
    if (currentSize + entrySize > this.maxSizeInMB * 1024 * 1024) {
      // Force eviction of oldest entries of the same type
      this.evictByType(type, Math.ceil(entrySize / (64 * 1024))); // Estimate 64KB per entry
    }

    // Remove old entry if it exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.updateTypeStats(oldEntry.type, -1, -this.estimateSize(oldEntry));
    }

    this.cache.set(key, entry);
    this.stats.sets++;
    this.updateTypeStats(type, 1, entrySize);

    return true;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    const deleted = this.cache.delete(key);
    
    if (deleted && entry) {
      this.updateTypeStats(entry.type, -1, -this.estimateSize(entry));
    }
    
    return deleted;
  }

  async deletePattern(pattern: string): Promise<number> {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const toDelete = keys.filter(key => regex.test(key));
    
    let deleted = 0;
    for (const key of toDelete) {
      if (await this.delete(key)) {
        deleted++;
      }
    }
    
    return deleted;
  }

  async clear(): Promise<boolean> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.typeStats.clear();
    
    console.log(`💾 Memory cache cleared: ${size} entries removed`);
    return true;
  }

  async getStats(): Promise<MemoryStats> {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2) + '%'
      : '0.00%';

    const memoryUsage = this.getCurrentMemoryUsage();
    const memoryLimit = this.maxSizeInMB * 1024 * 1024;
    const memoryPercentage = ((memoryUsage / memoryLimit) * 100).toFixed(2) + '%';

    // Find oldest and newest entries
    let oldestEntry = Date.now();
    let newestEntry = 0;
    
    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
      if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
    }

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      memoryUsage: {
        used: memoryUsage,
        total: memoryLimit,
        percentage: memoryPercentage
      },
      evictions: this.stats.evictions,
      oldestEntry,
      newestEntry,
      byType: Object.fromEntries(this.stats.typeStats.entries())
    };
  }

  async getKeys(pattern: string = '*'): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    
    if (pattern === '*') {
      return keys;
    }
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async getTtl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return -2; // Key doesn't exist
    }
    
    const remaining = entry.expiresAt - Date.now();
    
    if (remaining <= 0) {
      this.cache.delete(key);
      return -2;
    }
    
    return Math.ceil(remaining / 1000); // Return seconds
  }

  isConnectedState(): boolean {
    return true; // Memory cache is always "connected"
  }

  async ping(): Promise<boolean> {
    return true; // Memory cache always responds
  }

  // Private helper methods
  private estimateSize(entry: CacheEntry<any>): number {
    try {
      return JSON.stringify(entry).length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1024; // Fallback size estimate
    }
  }

  private getCurrentMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += this.estimateSize(entry);
    }
    
    return totalSize;
  }

  private updateTypeStats(type: string, countDelta: number, sizeDelta: number, hitsDelta: number = 0): void {
    const current = this.stats.typeStats.get(type) || { count: 0, size: 0, hits: 0 };
    
    current.count += countDelta;
    current.size += sizeDelta;
    current.hits += hitsDelta;
    
    if (current.count <= 0) {
      this.stats.typeStats.delete(type);
    } else {
      this.stats.typeStats.set(type, current);
    }
  }

  private evictByType(type: string, maxToEvict: number): void {
    const keys = Array.from(this.cache.keys());
    const typeKeys = [];
    
    // Find entries of the specified type
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && entry.type === type) {
        typeKeys.push({ key, timestamp: entry.timestamp });
      }
    }
    
    // Sort by timestamp (oldest first)
    typeKeys.sort((a, b) => a.timestamp - b.timestamp);
    
    // Evict oldest entries
    const toEvict = typeKeys.slice(0, Math.min(maxToEvict, typeKeys.length));
    
    for (const { key } of toEvict) {
      this.cache.delete(key);
    }
    
    if (toEvict.length > 0) {
      console.log(`💾 Force evicted ${toEvict.length} entries of type ${type}`);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Memory cache cleanup: removed ${cleaned} expired entries`);
    }
    
    // Log memory usage periodically
    const stats = this.getCurrentStats();
    console.log(`💾 Memory cache stats: ${stats.totalEntries} entries, ${stats.memoryUsage.percentage} memory used, ${stats.hitRate} hit rate`);
  }

  private getCurrentStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 
      ? ((this.stats.hits / totalRequests) * 100).toFixed(2) + '%'
      : '0.00%';

    const memoryUsage = this.getCurrentMemoryUsage();
    const memoryLimit = this.maxSizeInMB * 1024 * 1024;
    const memoryPercentage = ((memoryUsage / memoryLimit) * 100).toFixed(2) + '%';

    return {
      totalEntries: this.cache.size,
      hitRate,
      memoryUsage: {
        used: memoryUsage,
        total: memoryLimit,
        percentage: memoryPercentage
      }
    };
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down memory cache provider...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cache.clear();
    this.stats.typeStats.clear();
    
    console.log('✅ Memory cache shutdown complete');
  }
}

// Export singleton instance
export const memoryCache = new MemoryCacheProvider();