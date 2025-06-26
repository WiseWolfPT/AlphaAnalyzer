/**
 * SECURE LRU CACHE IMPLEMENTATION
 * High-performance LRU cache with security validation
 * Prevents memory exhaustion and cache poisoning attacks
 */

import { z } from 'zod';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheNode<T> {
  key: string;
  value: CacheEntry<T>;
  prev: CacheNode<T> | null;
  next: CacheNode<T> | null;
}

export interface LRUCacheOptions {
  maxSize: number;
  defaultTTL: number;
  maxItemSize: number;
  validator?: z.ZodSchema<any>;
  enableStats: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  maxSize: number;
  hitRate: number;
  totalMemoryUsage: number;
}

/**
 * SECURITY-FIRST LRU CACHE
 * - Prevents memory exhaustion with strict size limits
 * - Validates all data with Zod schemas
 * - Tracks access patterns for security monitoring
 * - Automatic cleanup of expired entries
 */
export class SecureLRUCache<T> {
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly maxItemSize: number;
  private readonly validator?: z.ZodSchema<any>;
  private readonly enableStats: boolean;

  private cache = new Map<string, CacheNode<T>>();
  private head: CacheNode<T> | null = null;
  private tail: CacheNode<T> | null = null;
  
  // Security and performance metrics
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentSize: 0,
    maxSize: 0,
    hitRate: 0,
    totalMemoryUsage: 0,
  };

  // Security monitoring
  private suspiciousActivity = new Map<string, number>();
  private readonly MAX_SUSPICIOUS_REQUESTS = 100;
  private readonly SUSPICIOUS_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor(options: LRUCacheOptions) {
    this.maxSize = Math.max(1, Math.min(options.maxSize, 10000)); // Max 10k entries
    this.defaultTTL = Math.max(1000, Math.min(options.defaultTTL, 24 * 60 * 60 * 1000)); // Max 24h
    this.maxItemSize = Math.max(1024, Math.min(options.maxItemSize, 1024 * 1024)); // Max 1MB
    this.validator = options.validator;
    this.enableStats = options.enableStats;
    this.stats.maxSize = this.maxSize;

    // Initialize cleanup interval
    this.initializeCleanup();
    
    // Initialize security monitoring
    setInterval(() => {
      this.suspiciousActivity.clear();
    }, this.SUSPICIOUS_RESET_INTERVAL);
  }

  /**
   * GET - Retrieve item from cache
   */
  get(key: string): T | null {
    // SECURITY: Validate key format
    if (!this.isValidKey(key)) {
      this.logSuspiciousActivity(key, 'invalid_key_format');
      return null;
    }

    const node = this.cache.get(key);
    if (!node) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (node.value.expiresAt < Date.now()) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    node.value.accessCount++;
    node.value.lastAccessed = Date.now();
    
    // Move to head (most recently used)
    this.moveToHead(node);
    
    this.stats.hits++;
    this.updateHitRate();
    
    return node.value.data;
  }

  /**
   * SET - Store item in cache with validation
   */
  set(key: string, value: T, ttl?: number): boolean {
    try {
      // SECURITY: Validate key format
      if (!this.isValidKey(key)) {
        this.logSuspiciousActivity(key, 'invalid_key_format');
        return false;
      }

      // SECURITY: Validate value size
      const serializedSize = this.calculateSize(value);
      if (serializedSize > this.maxItemSize) {
        console.warn(`Cache item too large: ${serializedSize} bytes for key: ${key}`);
        this.logSuspiciousActivity(key, 'oversized_item');
        return false;
      }

      // SECURITY: Validate data structure if validator is provided
      if (this.validator) {
        const validation = this.validator.safeParse(value);
        if (!validation.success) {
          console.warn('Cache validation failed:', validation.error.errors);
          this.logSuspiciousActivity(key, 'validation_failed');
          return false;
        }
        value = validation.data; // Use sanitized data
      }

      const expirationTime = Date.now() + (ttl || this.defaultTTL);
      const cacheEntry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        expiresAt: expirationTime,
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      const existingNode = this.cache.get(key);
      if (existingNode) {
        // Update existing entry
        existingNode.value = cacheEntry;
        this.moveToHead(existingNode);
      } else {
        // Create new entry
        const newNode: CacheNode<T> = {
          key,
          value: cacheEntry,
          prev: null,
          next: null,
        };

        this.cache.set(key, newNode);
        this.addToHead(newNode);
        this.stats.currentSize++;

        // Check if we need to evict
        if (this.cache.size > this.maxSize) {
          const evicted = this.removeTail();
          if (evicted) {
            this.cache.delete(evicted.key);
            this.stats.evictions++;
            this.stats.currentSize--;
          }
        }
      }

      this.updateMemoryUsage();
      return true;

    } catch (error) {
      console.error('Cache set error:', error);
      this.logSuspiciousActivity(key, 'cache_error');
      return false;
    }
  }

  /**
   * DELETE - Remove item from cache
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.cache.delete(key);
    this.removeNode(node);
    this.stats.currentSize--;
    this.updateMemoryUsage();
    
    return true;
  }

  /**
   * CLEAR - Remove all items from cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.stats.currentSize = 0;
    this.stats.totalMemoryUsage = 0;
  }

  /**
   * HAS - Check if key exists and is valid
   */
  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    // Check expiration
    if (node.value.expiresAt < Date.now()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * SIZE - Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * KEYS - Get all valid keys
   */
  keys(): string[] {
    const validKeys: string[] = [];
    const now = Date.now();
    
    for (const [key, node] of this.cache.entries()) {
      if (node.value.expiresAt > now) {
        validKeys.push(key);
      }
    }
    
    return validKeys;
  }

  /**
   * GET STATS - Get cache performance statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * CLEANUP EXPIRED - Remove all expired entries
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, node] of this.cache.entries()) {
      if (node.value.expiresAt < now) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  // PRIVATE METHODS

  private isValidKey(key: string): boolean {
    return (
      typeof key === 'string' &&
      key.length > 0 &&
      key.length <= 200 &&
      /^[a-zA-Z0-9:_.-]+$/.test(key)
    );
  }

  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  private logSuspiciousActivity(key: string, type: string): void {
    const count = this.suspiciousActivity.get(type) || 0;
    this.suspiciousActivity.set(type, count + 1);
    
    if (count > this.MAX_SUSPICIOUS_REQUESTS) {
      console.warn(`SECURITY: High number of suspicious cache activities: ${type}`, {
        key: key.substring(0, 50), // Only log first 50 chars
        count,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private moveToHead(node: CacheNode<T>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private addToHead(node: CacheNode<T>): void {
    node.prev = null;
    node.next = this.head;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private removeTail(): CacheNode<T> | null {
    const last = this.tail;
    if (last) {
      this.removeNode(last);
    }
    return last;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateMemoryUsage(): void {
    if (!this.enableStats) return;
    
    let totalSize = 0;
    for (const node of this.cache.values()) {
      totalSize += this.calculateSize(node.value);
    }
    this.stats.totalMemoryUsage = totalSize;
  }

  private initializeCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const cleaned = this.cleanupExpired();
      if (cleaned > 0) {
        console.log(`LRU Cache: Cleaned up ${cleaned} expired entries`);
      }
    }, 5 * 60 * 1000);
  }
}

// VALIDATION SCHEMAS FOR DIFFERENT CACHE TYPES

export const MarketDataSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9.-]{1,10}$/, 'Invalid symbol format'),
  price: z.number().positive().finite(),
  change: z.number().finite(),
  changePercent: z.number().finite(),
  high: z.number().positive().finite().optional(),
  low: z.number().positive().finite().optional(),
  open: z.number().positive().finite().optional(),
  previousClose: z.number().positive().finite().optional(),
  volume: z.number().nonnegative().finite().optional(),
  timestamp: z.number().positive().optional(),
  provider: z.string().regex(/^[a-z_]+$/, 'Invalid provider format'),
  marketCap: z.number().positive().finite().optional(),
  eps: z.number().finite().optional(),
  pe: z.number().positive().finite().optional(),
  _timestamp: z.number().positive(),
  _cached: z.boolean().optional(),
});

export const SearchResultSchema = z.object({
  results: z.array(z.object({
    symbol: z.string().regex(/^[A-Z0-9.-]{1,10}$/),
    name: z.string().max(100),
    type: z.string().regex(/^[A-Za-z\s]+$/),
    exchange: z.string().regex(/^[A-Z]+$/),
  })).max(50),
  count: z.number().nonnegative().max(50),
  _timestamp: z.number().positive(),
});

// FACTORY FUNCTIONS FOR DIFFERENT CACHE INSTANCES

export function createMarketDataCache(): SecureLRUCache<any> {
  return new SecureLRUCache({
    maxSize: 1000,
    defaultTTL: 60 * 1000, // 1 minute
    maxItemSize: 10 * 1024, // 10KB
    validator: MarketDataSchema,
    enableStats: true,
  });
}

export function createSearchCache(): SecureLRUCache<any> {
  return new SecureLRUCache({
    maxSize: 500,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxItemSize: 50 * 1024, // 50KB
    validator: SearchResultSchema,
    enableStats: true,
  });
}

export function createGeneralCache(): SecureLRUCache<any> {
  return new SecureLRUCache({
    maxSize: 2000,
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    maxItemSize: 5 * 1024, // 5KB
    validator: undefined, // No specific validation
    enableStats: true,
  });
}