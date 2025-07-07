/**
 * MEMORY CACHE - Development Only
 * AGENTE 2: Cache Optimization Expert
 * 
 * Simple in-memory cache for local development
 * Production uses Redis (Upstash free tier)
 */

import { CacheInterface, CacheItem } from './cache.interface';

export class MemoryCache implements CacheInterface {
  private cache = new Map<string, CacheItem>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean expired items every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number, tags?: string[]): Promise<void> {
    const expiresAt = ttlSeconds === Infinity 
      ? Infinity 
      : Date.now() + (ttlSeconds * 1000);
      
    this.cache.set(key, {
      value,
      expiresAt,
      tags: tags || []
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async invalidateByTag(tag: string): Promise<void> {
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Stats for debugging
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}