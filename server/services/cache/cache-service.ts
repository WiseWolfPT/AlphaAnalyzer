import { getCacheSchemaClient, getRealtimeClient } from './supabase-client';
import {
  CacheOptions,
  CacheEntry,
  StockQuoteCache,
  BatchQuoteCache,
  MarketStatusCache,
  ApiMetadata,
  RealtimeQuote,
  CACHE_DURATIONS,
} from '../../types/cache.types';

export class CacheService {
  private static instance: CacheService;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get or fetch stock quote with caching
   */
  async getStockQuote(
    symbol: string,
    fetchFn: () => Promise<any>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<any>> {
    const ttl = options.ttl || CACHE_DURATIONS.quotes;

    try {
      // 1. Try to get from cache
      const cacheClient = getCacheSchemaClient();
      const { data: cached, error } = await cacheClient
        .from('stock_quotes')
        .select('*')
        .eq('symbol', symbol)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached && !error) {
        // Update hit count and last accessed
        await cacheClient
          .from('stock_quotes')
          .update({
            hit_count: cached.hit_count + 1,
            last_accessed: new Date().toISOString(),
          })
          .eq('symbol', symbol);

        console.log(`[Cache HIT] Stock quote for ${symbol}`);
        return {
          data: cached.quote_data,
          cached: true,
          expires_at: cached.expires_at,
          provider: cached.provider,
        };
      }

      // 2. Cache miss - fetch from external API
      console.log(`[Cache MISS] Fetching stock quote for ${symbol}`);
      const freshData = await fetchFn();

      // 3. Store in cache
      const expires_at = new Date(Date.now() + ttl).toISOString();

      await cacheClient.from('stock_quotes').upsert({
        symbol,
        quote_data: freshData,
        provider: options.provider || freshData.provider || 'unknown',
        expires_at,
        hit_count: 0,
      });

      // 4. Publish to realtime
      await this.publishRealtimeUpdate(symbol, freshData);

      return {
        data: freshData,
        cached: false,
        expires_at,
        provider: options.provider,
      };
    } catch (error) {
      console.error(`Error in cache service for ${symbol}:`, error);

      // Try to return stale data if available
      const cacheClient = getCacheSchemaClient();
      const { data: stale } = await cacheClient
        .from('stock_quotes')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (stale) {
        console.log(`[Cache STALE] Returning stale data for ${symbol}`);
        return {
          data: { ...stale.quote_data, stale: true },
          cached: true,
          expires_at: stale.expires_at,
          provider: stale.provider,
        };
      }

      throw error;
    }
  }

  /**
   * Publish update to Supabase Realtime
   */
  private async publishRealtimeUpdate(symbol: string, data: any): Promise<void> {
    try {
      const realtimeClient = getRealtimeClient();
      await realtimeClient.from('realtime_quotes').insert({
        symbol,
        price: data.price,
        change: data.change,
        change_percent: data.changePercent || data.change_percent,
        volume: data.volume,
      });
    } catch (error) {
      console.error('Failed to publish realtime update:', error);
    }
  }

  /**
   * Get or fetch batch quotes with caching
   */
  async getBatchQuotes(
    symbols: string[],
    fetchFn: () => Promise<any>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<any>> {
    const ttl = options.ttl || CACHE_DURATIONS.batchQuotes;
    const batchId = symbols.sort().join(',');

    try {
      // 1. Try to get from cache
      const cacheClient = getCacheSchemaClient();
      const { data: cached, error } = await cacheClient
        .from('batch_quotes')
        .select('*')
        .eq('batch_id', batchId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached && !error) {
        console.log(`[Cache HIT] Batch quotes for ${symbols.length} symbols`);
        return {
          data: cached.quotes_data,
          cached: true,
          expires_at: cached.expires_at,
        };
      }

      // 2. Cache miss - fetch from external API
      console.log(`[Cache MISS] Fetching batch quotes for ${symbols.length} symbols`);
      const freshData = await fetchFn();

      // 3. Store in cache
      const expires_at = new Date(Date.now() + ttl).toISOString();

      await cacheClient.from('batch_quotes').upsert({
        batch_id: batchId,
        symbols,
        quotes_data: freshData,
        expires_at,
      });

      // 4. Publish all to realtime
      if (Array.isArray(freshData)) {
        for (const quote of freshData) {
          await this.publishRealtimeUpdate(quote.symbol, quote);
        }
      }

      return {
        data: freshData,
        cached: false,
        expires_at,
      };
    } catch (error) {
      console.error('Error in batch cache service:', error);
      throw error;
    }
  }

  /**
   * Get or fetch market status with caching
   */
  async getMarketStatus(
    market: string = 'US',
    fetchFn: () => Promise<any>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<any>> {
    const ttl = options.ttl || CACHE_DURATIONS.marketStatus;

    try {
      // 1. Try to get from cache
      const cacheClient = getCacheSchemaClient();
      const { data: cached, error } = await cacheClient
        .from('market_status')
        .select('*')
        .eq('market', market)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached && !error) {
        console.log(`[Cache HIT] Market status for ${market}`);
        return {
          data: cached.status_data,
          cached: true,
          expires_at: cached.expires_at,
        };
      }

      // 2. Cache miss - fetch from external API
      console.log(`[Cache MISS] Fetching market status for ${market}`);
      const freshData = await fetchFn();

      // 3. Store in cache
      const expires_at = new Date(Date.now() + ttl).toISOString();

      await cacheClient.from('market_status').upsert({
        market,
        status_data: freshData,
        expires_at,
      });

      return {
        data: freshData,
        cached: false,
        expires_at,
      };
    } catch (error) {
      console.error('Error in market status cache:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a specific symbol
   */
  async invalidateQuote(symbol: string): Promise<void> {
    const cacheClient = getCacheSchemaClient();
    await cacheClient.from('stock_quotes').delete().eq('symbol', symbol);
  }

  /**
   * Invalidate all batch quotes containing a specific symbol
   */
  async invalidateBatchQuotesContaining(symbol: string): Promise<void> {
    const cacheClient = getCacheSchemaClient();
    await cacheClient.from('batch_quotes').delete().contains('symbols', [symbol]);
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpired(): Promise<void> {
    const cacheClient = getCacheSchemaClient();
    await cacheClient.rpc('cleanup_expired_entries');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    const cacheClient = getCacheSchemaClient();
    const [quotes, batch, market] = await Promise.all([
      cacheClient.from('stock_quotes').select('count'),
      cacheClient.from('batch_quotes').select('count'),
      cacheClient.from('market_status').select('count'),
    ]);

    return {
      stock_quotes: quotes.data?.[0]?.count || 0,
      batch_quotes: batch.data?.[0]?.count || 0,
      market_status: market.data?.[0]?.count || 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update API metadata for tracking provider usage
   */
  async updateApiMetadata(
    provider: string,
    endpoint: string,
    responseTimeMs: number
  ): Promise<void> {
    try {
      const cacheClient = getCacheSchemaClient();

      // Get existing metadata
      const { data: existing } = await cacheClient
        .from('api_metadata')
        .select('*')
        .eq('provider', provider)
        .eq('endpoint', endpoint)
        .single();

      if (existing) {
        // Update existing record
        const newAvgResponseTime = existing.avg_response_time_ms
          ? Math.round(
              (existing.avg_response_time_ms * existing.call_count + responseTimeMs) /
                (existing.call_count + 1)
            )
          : responseTimeMs;

        await cacheClient
          .from('api_metadata')
          .update({
            call_count: existing.call_count + 1,
            last_called: new Date().toISOString(),
            avg_response_time_ms: newAvgResponseTime,
          })
          .eq('id', existing.id);
      } else {
        // Create new record
        await cacheClient.from('api_metadata').insert({
          provider,
          endpoint,
          call_count: 1,
          avg_response_time_ms: responseTimeMs,
        });
      }
    } catch (error) {
      console.error('Failed to update API metadata:', error);
    }
  }

  /**
   * Get API usage statistics
   */
  async getApiUsageStats(): Promise<ApiMetadata[]> {
    const cacheClient = getCacheSchemaClient();
    const { data, error } = await cacheClient
      .from('api_metadata')
      .select('*')
      .order('call_count', { ascending: false });

    if (error) {
      console.error('Failed to get API usage stats:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Warm cache with popular stocks
   */
  async warmCache(
    symbols: string[],
    fetchFn: (symbol: string) => Promise<any>
  ): Promise<void> {
    console.log(`Warming cache for ${symbols.length} symbols...`);

    for (const symbol of symbols) {
      try {
        await this.getStockQuote(symbol, () => fetchFn(symbol));
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to warm cache for ${symbol}:`, error);
      }
    }

    console.log('Cache warming completed');
  }

  /**
   * Get all cached quotes that are still valid
   */
  async getAllValidQuotes(): Promise<StockQuoteCache[]> {
    const cacheClient = getCacheSchemaClient();
    const { data, error } = await cacheClient
      .from('stock_quotes')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('last_accessed', { ascending: false });

    if (error) {
      console.error('Failed to get valid quotes:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Bulk update realtime quotes
   */
  async bulkPublishRealtimeUpdates(quotes: RealtimeQuote[]): Promise<void> {
    try {
      const realtimeClient = getRealtimeClient();
      await realtimeClient.from('realtime_quotes').insert(quotes);
      console.log(`Published ${quotes.length} realtime updates`);
    } catch (error) {
      console.error('Failed to bulk publish realtime updates:', error);
    }
  }
}