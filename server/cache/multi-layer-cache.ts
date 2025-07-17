import { supabase } from '../lib/supabase.js';

/**
 * Multi-Layer Cache System
 * Layer 1: In-memory Map (instant access)
 * Layer 2: Supabase api_cache table (fast database access)
 */
export class MultiLayerCache {
  // Layer 1: In-memory cache
  private memoryCache = new Map<string, {
    value: any;
    expiresAt: number;
    createdAt: number;
  }>();

  // TTL configurations by data type (in milliseconds)
  private readonly TTL_CONFIG = {
    quotes: 60 * 1000,           // 1 minute
    daily: 60 * 60 * 1000,       // 1 hour
    company: 24 * 60 * 60 * 1000, // 24 hours
    historical: 60 * 60 * 1000,   // 1 hour
    snapshot: 30 * 1000,          // 30 seconds
    trades: 5 * 60 * 1000,        // 5 minutes
    dividends: 24 * 60 * 60 * 1000, // 24 hours
    splits: 24 * 60 * 60 * 1000,   // 24 hours
    market_status: 60 * 1000,      // 1 minute
    default: 60 * 60 * 1000        // 1 hour default
  };

  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    memoryHits: 0,
    supabaseHits: 0,
    sets: 0,
    errors: 0
  };

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Get data from cache (Layer 1 -> Layer 2)
   */
  async get(key: string): Promise<any> {
    try {
      // Layer 1: Check memory cache first
      const memoryResult = this.memoryCache.get(key);
      if (memoryResult && memoryResult.expiresAt > Date.now()) {
        this.stats.hits++;
        this.stats.memoryHits++;
        console.log(`🚀 Cache HIT (memory): ${key}`);
        return memoryResult.value;
      }

      // Layer 2: Check Supabase cache
      const { data, error } = await supabase
        .from('api_cache')
        .select('*')
        .eq('cache_key', key)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is OK
          console.error('❌ Supabase cache error:', error);
          this.stats.errors++;
        }
        this.stats.misses++;
        return null;
      }

      if (data && new Date(data.expires_at) > new Date()) {
        // Valid cache entry - promote to memory cache
        const value = JSON.parse(data.cache_value);
        this.memoryCache.set(key, {
          value,
          expiresAt: new Date(data.expires_at).getTime(),
          createdAt: new Date(data.created_at).getTime()
        });

        this.stats.hits++;
        this.stats.supabaseHits++;
        console.log(`💾 Cache HIT (supabase): ${key}`);
        return value;
      }

      // Cache miss or expired
      this.stats.misses++;
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Cache get error for ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set data in cache (both layers)
   */
  async set(key: string, value: any, dataType: keyof typeof this.TTL_CONFIG = 'default'): Promise<void> {
    try {
      const ttl = this.TTL_CONFIG[dataType] || this.TTL_CONFIG.default;
      const now = Date.now();
      const expiresAt = now + ttl;

      // Layer 1: Set in memory
      this.memoryCache.set(key, {
        value,
        expiresAt,
        createdAt: now
      });

      // Layer 2: Set in Supabase
      const { error } = await supabase
        .from('api_cache')
        .upsert({
          cache_key: key,
          cache_value: JSON.stringify(value),
          data_type: dataType,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date(now).toISOString()
        });

      if (error) {
        console.error('❌ Supabase cache set error:', error);
        this.stats.errors++;
      } else {
        this.stats.sets++;
        console.log(`💾 Cache SET: ${key} (TTL: ${Math.round(ttl / 1000)}s)`);
      }
    } catch (error) {
      console.error(`❌ Cache set error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(key);

      // Remove from Supabase
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .eq('cache_key', key);

      if (error) {
        console.error('❌ Supabase cache invalidate error:', error);
        this.stats.errors++;
      } else {
        console.log(`🗑️ Cache INVALIDATED: ${key}`);
      }
    } catch (error) {
      console.error(`❌ Cache invalidate error for ${key}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Invalidate cache by pattern (prefix)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Remove from memory
      const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => key.startsWith(pattern));
      keysToDelete.forEach(key => this.memoryCache.delete(key));

      // Remove from Supabase
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .like('cache_key', `${pattern}%`);

      if (error) {
        console.error('❌ Supabase cache pattern invalidate error:', error);
        this.stats.errors++;
      } else {
        console.log(`🗑️ Cache PATTERN INVALIDATED: ${pattern}* (${keysToDelete.length} memory keys)`);
      }
    } catch (error) {
      console.error(`❌ Cache pattern invalidate error for ${pattern}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Warm cache for popular symbols
   */
  async warmCache(symbols: string[], dataOrchestrator: any): Promise<void> {
    console.log(`🔥 Warming cache for ${symbols.length} symbols...`);
    
    const warmingPromises = symbols.map(async (symbol) => {
      try {
        // Warm with quote data
        const quote = await dataOrchestrator.getQuote(symbol);
        if (quote) {
          await this.set(`quote:${symbol}`, quote, 'quotes');
        }

        // Warm with company details
        const company = await dataOrchestrator.getCompanyDetails(symbol);
        if (company) {
          await this.set(`company:${symbol}`, company, 'company');
        }

        // Warm with previous close
        const prevClose = await dataOrchestrator.getPreviousClose(symbol);
        if (prevClose) {
          await this.set(`prev_close:${symbol}`, prevClose, 'daily');
        }

        console.log(`🔥 Cache warmed for ${symbol}`);
      } catch (error) {
        console.error(`❌ Cache warming failed for ${symbol}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
    console.log(`✅ Cache warming completed for ${symbols.length} symbols`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hits: number;
    misses: number;
    hitRatio: number;
    memoryHits: number;
    supabaseHits: number;
    sets: number;
    errors: number;
    memoryCacheSize: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRatio = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRatio: Math.round(hitRatio * 100) / 100,
      memoryCacheSize: this.memoryCache.size
    };
  }

  /**
   * Clear all cache (both layers)
   */
  async clear(): Promise<void> {
    try {
      // Clear memory
      this.memoryCache.clear();

      // Clear Supabase
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .neq('cache_key', 'never_matches'); // Delete all

      if (error) {
        console.error('❌ Supabase cache clear error:', error);
        this.stats.errors++;
      } else {
        console.log('🗑️ All caches cleared');
      }

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        memoryHits: 0,
        supabaseHits: 0,
        sets: 0,
        errors: 0
      };
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Memory cleanup - remove expired entries
   */
  private cleanupMemory(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Memory cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Start periodic cleanup of memory cache
   */
  private startCleanupInterval(): void {
    // Cleanup every 5 minutes
    setInterval(() => {
      this.cleanupMemory();
    }, 5 * 60 * 1000);

    console.log('🧹 Cache cleanup interval started (5 minutes)');
  }

  /**
   * Generate cache key for standardized format
   */
  static generateKey(provider: string, method: string, symbol: string, ...params: string[]): string {
    const paramStr = params.length > 0 ? `:${params.join(':')}` : '';
    return `${provider}:${method}:${symbol}${paramStr}`;
  }
}

// Export singleton instance
export const multiLayerCache = new MultiLayerCache();