import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  staleTime: number;
  etag?: string;
  version: number;
  accessCount: number;
  lastAccess: number;
  compressionLevel?: number;
}

interface CacheDBSchema extends DBSchema {
  quotes: {
    key: string;
    value: CacheEntry<any>;
    indexes: { 'by-expiry': number; 'by-access': number; };
  };
  fundamentals: {
    key: string;
    value: CacheEntry<any>;
    indexes: { 'by-expiry': number; };
  };
  charts: {
    key: string;
    value: CacheEntry<any>;
    indexes: { 'by-expiry': number; };
  };
  metadata: {
    key: string;
    value: any;
  };
}

interface UserBehavior {
  symbol: string;
  viewCount: number;
  lastViewed: number;
  avgViewDuration: number;
  interactions: string[];
}

export class IntelligentCache {
  private db!: IDBPDatabase<CacheDBSchema>;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private userBehavior = new Map<string, UserBehavior>();
  private compressionWorker?: Worker;
  
  private readonly CACHE_VERSION = 1;
  private readonly MAX_MEMORY_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_IDB_SIZE = 200 * 1024 * 1024; // 200MB
  
  // Cache configurations with dynamic TTL
  private readonly configs = {
    quote: {
      memoryTTL: 30_000, // 30 seconds in memory
      idbTTL: 300_000, // 5 minutes in IndexedDB
      staleWhileRevalidate: 15_000, // 15 seconds
      compression: false,
      priority: 'high' as const
    },
    fundamentals: {
      memoryTTL: 3600_000, // 1 hour in memory
      idbTTL: 86_400_000, // 24 hours in IndexedDB
      staleWhileRevalidate: 1800_000, // 30 minutes
      compression: true,
      priority: 'medium' as const
    },
    charts: {
      memoryTTL: 600_000, // 10 minutes in memory
      idbTTL: 3600_000, // 1 hour in IndexedDB
      staleWhileRevalidate: 300_000, // 5 minutes
      compression: true,
      priority: 'low' as const
    }
  };

  constructor() {
    this.initializeDB();
    this.startBackgroundTasks();
    this.setupCompressionWorker();
  }

  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB<CacheDBSchema>('alfalyzer-cache', this.CACHE_VERSION, {
        upgrade(db) {
          // Quotes store
          const quotesStore = db.createObjectStore('quotes');
          quotesStore.createIndex('by-expiry', 'expiry');
          quotesStore.createIndex('by-access', 'lastAccess');
          
          // Fundamentals store
          const fundamentalsStore = db.createObjectStore('fundamentals');
          fundamentalsStore.createIndex('by-expiry', 'expiry');
          
          // Charts store
          const chartsStore = db.createObjectStore('charts');
          chartsStore.createIndex('by-expiry', 'expiry');
          
          // Metadata store
          db.createObjectStore('metadata');
        }
      });

      console.log('✅ IndexedDB initialized successfully');
      await this.loadUserBehavior();
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDB:', error);
    }
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      dataType: keyof typeof this.configs;
      symbol?: string;
      bypassCache?: boolean;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    // Track user behavior
    if (options.symbol) {
      this.trackUserBehavior(options.symbol);
    }

    // Handle cache bypass
    if (options.bypassCache) {
      return fetcher();
    }

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    try {
      // Check memory cache first (L1)
      const memCached = this.memoryCache.get(key);
      if (memCached && !options.forceRefresh) {
        const result = await this.handleCacheEntry(memCached, key, fetcher, options, 'memory');
        if (result !== null) return result;
      }

      // Check IndexedDB cache (L2)
      if (this.db) {
        const idbCached = await this.getFromIDB(key, options.dataType);
        if (idbCached && !options.forceRefresh) {
          // Promote to memory cache
          this.setInMemory(key, idbCached, options.dataType);
          const result = await this.handleCacheEntry(idbCached, key, fetcher, options, 'idb');
          if (result !== null) return result;
        }
      }

      // Cache miss - fetch data
      const promise = this.fetchAndCache(key, fetcher, options);
      this.pendingRequests.set(key, promise);
      
      return await promise;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async handleCacheEntry<T>(
    entry: CacheEntry<T>,
    key: string,
    fetcher: () => Promise<T>,
    options: any,
    source: 'memory' | 'idb'
  ): Promise<T | null> {
    const now = Date.now();
    const config = this.configs[options.dataType];
    
    // Update access tracking
    entry.accessCount++;
    entry.lastAccess = now;

    if (now < entry.staleTime) {
      // Fresh data
      console.log(`📦 Cache hit (${source}) for ${key}`);
      return this.decompressIfNeeded(entry.data, entry.compressionLevel);
    } else if (now < entry.expiry) {
      // Stale but valid - return and refresh in background
      console.log(`📦 Stale cache hit (${source}) for ${key}, refreshing in background`);
      
      if (this.shouldBackgroundRefresh(options.dataType)) {
        this.backgroundRefresh(key, fetcher, options);
      }
      
      return this.decompressIfNeeded(entry.data, entry.compressionLevel);
    } else {
      // Expired
      return null;
    }
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: any
  ): Promise<T> {
    try {
      console.log(`🌐 Fetching fresh data for ${key}`);
      const data = await fetcher();
      
      const now = Date.now();
      const config = this.configs[options.dataType];
      
      // Compress data if needed
      const compressedData = config.compression 
        ? await this.compressData(data)
        : { data, compressionLevel: 0 };
      
      const entry: CacheEntry<T> = {
        data: compressedData.data,
        timestamp: now,
        staleTime: now + config.staleWhileRevalidate,
        expiry: now + config.idbTTL,
        version: this.CACHE_VERSION,
        accessCount: 1,
        lastAccess: now,
        compressionLevel: compressedData.compressionLevel
      };

      // Store in both caches
      this.setInMemory(key, entry, options.dataType);
      
      if (this.db) {
        await this.setInIDB(key, entry, options.dataType);
      }

      return data;
    } catch (error) {
      // Try to return stale data if available
      const stale = this.memoryCache.get(key);
      if (stale) {
        console.warn(`Returning stale data for ${key} due to fetch error:`, error);
        return this.decompressIfNeeded(stale.data, stale.compressionLevel);
      }
      throw error;
    }
  }

  private async backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: any
  ): Promise<void> {
    try {
      await this.fetchAndCache(key, fetcher, options);
    } catch (error) {
      console.error(`Background refresh failed for ${key}:`, error);
    }
  }

  private setInMemory(key: string, entry: CacheEntry<any>, dataType: string): void {
    // Ensure memory cache doesn't exceed limit
    while (this.getMemoryCacheSize() > this.MAX_MEMORY_SIZE && this.memoryCache.size > 0) {
      this.evictLeastRecentlyUsed();
    }

    // Set expiry based on memory TTL
    const config = this.configs[dataType as keyof typeof this.configs];
    entry.expiry = Date.now() + config.memoryTTL;
    
    this.memoryCache.set(key, entry);
  }

  private async getFromIDB(key: string, dataType: string): Promise<CacheEntry<any> | null> {
    try {
      const store = dataType as keyof CacheDBSchema;
      return await this.db.get(store, key) || null;
    } catch (error) {
      console.error(`IndexedDB get error for ${key}:`, error);
      return null;
    }
  }

  private async setInIDB(key: string, entry: CacheEntry<any>, dataType: string): Promise<void> {
    try {
      const store = dataType as keyof CacheDBSchema;
      await this.db.put(store, entry, key);
      
      // Cleanup if approaching size limit
      if (await this.getIDBSize() > this.MAX_IDB_SIZE) {
        await this.cleanupOldEntries(store);
      }
    } catch (error) {
      console.error(`IndexedDB set error for ${key}:`, error);
    }
  }

  private getMemoryCacheSize(): number {
    let size = 0;
    for (const entry of this.memoryCache.values()) {
      size += JSON.stringify(entry).length;
    }
    return size;
  }

  private async getIDBSize(): Promise<number> {
    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch {
      return 0;
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private async cleanupOldEntries(store: keyof CacheDBSchema): Promise<void> {
    try {
      const now = Date.now();
      const tx = this.db.transaction(store, 'readwrite');
      const index = tx.store.index('by-expiry');
      
      // Delete entries older than 7 days
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      const range = IDBKeyRange.upperBound(weekAgo);
      
      for await (const cursor of index.iterate(range)) {
        await cursor.delete();
      }
      
      await tx.done;
    } catch (error) {
      console.error(`Cleanup error for ${store}:`, error);
    }
  }

  private shouldBackgroundRefresh(dataType: string): boolean {
    // Only refresh during reasonable hours and for high-priority data
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 6 && hour <= 22;
    const isHighPriority = this.configs[dataType as keyof typeof this.configs].priority === 'high';
    
    return isBusinessHours && isHighPriority;
  }

  private trackUserBehavior(symbol: string): void {
    const existing = this.userBehavior.get(symbol) || {
      symbol,
      viewCount: 0,
      lastViewed: 0,
      avgViewDuration: 0,
      interactions: []
    };

    existing.viewCount++;
    existing.lastViewed = Date.now();
    existing.interactions.push('view');

    // Keep only last 10 interactions
    if (existing.interactions.length > 10) {
      existing.interactions = existing.interactions.slice(-10);
    }

    this.userBehavior.set(symbol, existing);
  }

  private async loadUserBehavior(): Promise<void> {
    try {
      const stored = await this.db.get('metadata', 'userBehavior');
      if (stored) {
        this.userBehavior = new Map(stored);
      }
    } catch (error) {
      console.error('Failed to load user behavior:', error);
    }
  }

  private async saveUserBehavior(): Promise<void> {
    try {
      const data = Array.from(this.userBehavior.entries());
      await this.db.put('metadata', data, 'userBehavior');
    } catch (error) {
      console.error('Failed to save user behavior:', error);
    }
  }

  private setupCompressionWorker(): void {
    try {
      // Create compression worker for large data
      const workerCode = `
        self.onmessage = function(e) {
          const { data, compress } = e.data;
          
          if (compress) {
            // Simple compression - in production use better algorithms
            const compressed = JSON.stringify(data);
            self.postMessage({ compressed, compressionLevel: 1 });
          } else {
            // Decompress
            const decompressed = JSON.parse(data);
            self.postMessage({ decompressed });
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('Compression worker not available:', error);
    }
  }

  private async compressData(data: any): Promise<{ data: any; compressionLevel: number }> {
    // Simple size check - compress if data is large
    const size = JSON.stringify(data).length;
    
    if (size > 10000 && this.compressionWorker) {
      return new Promise((resolve) => {
        this.compressionWorker!.onmessage = (e) => {
          resolve({ data: e.data.compressed, compressionLevel: e.data.compressionLevel });
        };
        this.compressionWorker!.postMessage({ data, compress: true });
      });
    }
    
    return { data, compressionLevel: 0 };
  }

  private async decompressIfNeeded(data: any, compressionLevel?: number): Promise<any> {
    if (compressionLevel && compressionLevel > 0 && this.compressionWorker) {
      return new Promise((resolve) => {
        this.compressionWorker!.onmessage = (e) => {
          resolve(e.data.decompressed);
        };
        this.compressionWorker!.postMessage({ data, compress: false });
      });
    }
    
    return data;
  }

  private startBackgroundTasks(): void {
    // Save user behavior every 5 minutes
    setInterval(() => {
      this.saveUserBehavior();
    }, 5 * 60 * 1000);

    // Clean expired entries every 30 minutes
    setInterval(() => {
      this.cleanExpiredEntries();
    }, 30 * 60 * 1000);

    // Predictive prefetch every 10 minutes
    setInterval(() => {
      this.predictivePrefetch();
    }, 10 * 60 * 1000);
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired entries from memory cache`);
    }
  }

  private async predictivePrefetch(): Promise<void> {
    // Analyze user behavior and prefetch likely-to-be-viewed data
    const predictions = this.getUserPredictions();
    
    for (const symbol of predictions.slice(0, 5)) { // Top 5 predictions
      const key = `cache:v1:quote:${symbol}:realtime`;
      
      // Only prefetch if not already cached
      if (!this.memoryCache.has(key)) {
        try {
          // Mock fetcher - in production, integrate with actual API
          await this.get(key, async () => ({}), {
            dataType: 'quote',
            symbol
          });
          
          console.log(`🔮 Predictively prefetched ${symbol}`);
        } catch (error) {
          // Ignore prefetch errors
        }
      }
    }
  }

  private getUserPredictions(): string[] {
    const behaviors = Array.from(this.userBehavior.values());
    
    // Sort by recent activity and view count
    return behaviors
      .sort((a, b) => {
        const aScore = a.viewCount * 0.7 + (Date.now() - a.lastViewed) * -0.3;
        const bScore = b.viewCount * 0.7 + (Date.now() - b.lastViewed) * -0.3;
        return bScore - aScore;
      })
      .map(b => b.symbol)
      .slice(0, 10);
  }

  // Public API methods
  async invalidate(pattern: string): Promise<void> {
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate IndexedDB cache
    if (this.db) {
      for (const storeName of ['quotes', 'fundamentals', 'charts'] as const) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        for await (const cursor of store.iterate()) {
          if (cursor.key.toString().match(pattern)) {
            await cursor.delete();
          }
        }
        
        await tx.done;
      }
    }
  }

  getStats() {
    const memorySize = this.getMemoryCacheSize();
    const memoryCacheEntries = this.memoryCache.size;
    
    return {
      memoryCacheSize: memorySize,
      memoryCacheEntries,
      userBehaviorEntries: this.userBehavior.size,
      topSymbols: this.getUserPredictions().slice(0, 5)
    };
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.userBehavior.clear();
    
    if (this.db) {
      for (const storeName of ['quotes', 'fundamentals', 'charts', 'metadata'] as const) {
        await this.db.clear(storeName);
      }
    }
  }
}

// Export singleton instance
export const intelligentCache = new IntelligentCache();