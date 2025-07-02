import { ICache, CacheEntry, CacheConfig } from './cache.interface';

export class InMemoryCache implements ICache {
  private cache = new Map<string, CacheEntry>();
  private timers = new Map<string, NodeJS.Timeout>();
  private maxSizeInBytes: number;
  private defaultTTL: number;

  constructor(config: CacheConfig = {}) {
    this.maxSizeInBytes = (config.maxSizeInMB || 512) * 1024 * 1024;
    this.defaultTTL = config.defaultTTL || 60; // 60 seconds default
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      await this.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const ttlSeconds = ttl || this.defaultTTL;
    
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    // Check memory limit before adding
    const estimatedSize = this.estimateSize(value);
    if (this.getCurrentSize() + estimatedSize > this.maxSizeInBytes) {
      // Simple eviction: remove oldest entries
      await this.evictOldest();
    }

    // Set new entry with expiration
    const expires = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expires });

    // Set auto-cleanup timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
  }

  async delete(key: string): Promise<boolean> {
    // Clear timer if exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  async setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, ttl);
    }
  }

  async size(): Promise<number> {
    // Clean up expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        await this.delete(key);
      }
    }

    return this.cache.size;
  }

  // Private helper methods
  private estimateSize(value: any): number {
    // Rough estimation of object size in bytes
    return JSON.stringify(value).length * 2; // 2 bytes per character
  }

  private getCurrentSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += this.estimateSize(entry.value);
    }
    return totalSize;
  }

  private async evictOldest(): Promise<void> {
    // Find and remove the entry closest to expiration
    let oldestKey: string | null = null;
    let oldestExpires = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < oldestExpires) {
        oldestExpires = entry.expires;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
    }
  }

  // Utility method for monitoring
  getCacheStats() {
    return {
      size: this.cache.size,
      memoryUsageBytes: this.getCurrentSize(),
      memoryUsageMB: this.getCurrentSize() / (1024 * 1024),
      maxSizeMB: this.maxSizeInBytes / (1024 * 1024)
    };
  }
}