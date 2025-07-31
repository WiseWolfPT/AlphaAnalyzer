/**
 * Supabase Cache Service
 * Handles caching of API responses to respect rate limits
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface CacheEntry {
  key: string;
  data: any;
  expires_at: string;
  created_at: string;
  provider?: string;
}

export class SupabaseCacheService {
  private supabase: SupabaseClient;
  private tableName = 'cache_quotes';

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not found in environment variables');
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('💾 Supabase Cache Service initialized');
  }

  /**
   * Get cached data
   * @param key Cache key
   * @param includeExpired Whether to return expired entries
   */
  async get(key: string, includeExpired = false): Promise<CacheEntry | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('key', key)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (!includeExpired && expiresAt < now) {
        console.log(`🕒 Cache expired for key: ${key}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache data
   * @param key Cache key
   * @param data Data to cache
   * @param ttlSeconds Time to live in seconds
   */
  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

      const cacheEntry = {
        key,
        data,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        provider: data.provider || 'unknown'
      };

      // Upsert (insert or update)
      const { error } = await this.supabase
        .from(this.tableName)
        .upsert(cacheEntry, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Cache set error:', error);
      } else {
        console.log(`💾 Cached ${key} with TTL ${ttlSeconds}s`);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached entry
   */
  async delete(key: string): Promise<void> {
    try {
      await this.supabase
        .from(this.tableName)
        .delete()
        .eq('key', key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .lt('expires_at', now);

      if (!error) {
        console.log('🧹 Cleared expired cache entries');
      }
    } catch (error) {
      console.error('Clear expired error:', error);
    }
  }

  /**
   * Get all cached symbols
   */
  async getCachedSymbols(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('key')
        .like('key', 'av_quote_%')
        .gt('expires_at', new Date().toISOString());

      if (error || !data) {
        return [];
      }

      return data.map(entry => entry.key.replace('av_quote_', ''));
    } catch (error) {
      console.error('Get cached symbols error:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const now = new Date().toISOString();
      
      // Count total entries
      const { count: total } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Count valid entries
      const { count: valid } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', now);

      // Count expired entries
      const { count: expired } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', now);

      return {
        total: total || 0,
        valid: valid || 0,
        expired: expired || 0,
        timestamp: now
      };
    } catch (error) {
      console.error('Get stats error:', error);
      return { total: 0, valid: 0, expired: 0 };
    }
  }
}

// Export singleton instance
export const cacheService = new SupabaseCacheService();