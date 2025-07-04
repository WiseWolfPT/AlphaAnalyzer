export interface ICacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl: number, type?: string): Promise<void>;
  getOrFetch<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    cacheType: string
  ): Promise<T>;
  clear(type?: string): Promise<void>;
  getStats(): any;
}

// Adapter for Memory Cache
export class MemoryCacheAdapter implements ICacheService {
  constructor(private cache: any) {}
  
  async get(key: string): Promise<any> {
    // For our LRU cache, we need to check if the entry exists and is not expired
    const cacheType = this.detectCacheType(key);
    const cache = this.getCache(cacheType);
    const entry = cache.get(key);
    
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number, type?: string): Promise<void> {
    const cacheType = type || this.detectCacheType(key);
    const cache = this.getCache(cacheType);
    
    cache.set(key, {
      data: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }
  
  async getOrFetch<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    cacheType: string
  ): Promise<T> {
    // Pass cacheType directly - it's now a required parameter
    const result = await this.cache.getOrFetch(key, fetcher, cacheType);
    return result.data; // Extract data from the result object
  }
  
  async clear(type?: string): Promise<void> {
    this.cache.clear(type);
  }
  
  getStats(): any {
    return this.cache.getStats();
  }
  
  private detectCacheType(key: string): string {
    if (key.startsWith('price:')) return 'price';
    if (key.startsWith('historical:') || key.startsWith('chart:')) return 'chart';
    if (key.startsWith('fundamentals:') || key.startsWith('metrics:')) return 'metrics';
    return 'price'; // default
  }
  
  private getCache(type: string) {
    switch (type) {
      case 'price': return this.cache.priceCache;
      case 'chart': return this.cache.chartCache;
      case 'metrics': return this.cache.metricsCache;
      default: return this.cache.priceCache;
    }
  }
}

// Factory for creating cache service
export function createCacheService(): ICacheService {
  const cacheType = process.env.CACHE_TYPE || 'memory';
  
  switch (cacheType) {
    case 'sqlite':
      // Future implementation
      // return new SQLiteCache();
      throw new Error('SQLite cache not implemented yet');
    case 'redis':
      // Future implementation
      // return new RedisCache();
      throw new Error('Redis cache not implemented yet');
    default:
      const { memoryCache } = require('./simple-memory-cache');
      return new MemoryCacheAdapter(memoryCache);
  }
}