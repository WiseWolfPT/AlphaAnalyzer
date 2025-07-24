import { CacheService } from './cache-service';
import { realtimeService } from '../supabase-realtime';

export class CacheWarmer {
  private static instance: CacheWarmer;
  private cacheService: CacheService;

  // Popular stocks to keep warm in cache
  private readonly POPULAR_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'NVDA', 'JPM', 'V', 'JNJ',
    'WMT', 'PG', 'MA', 'UNH', 'HD',
    'BAC', 'DIS', 'NFLX', 'PYPL', 'INTC',
    'CSCO', 'VZ', 'CMCSA', 'PFE', 'TMO',
  ];

  // Portuguese stocks for local market
  private readonly PORTUGUESE_STOCKS = [
    'EDP.LS', 'GALP.LS', 'JMT.LS', 'ALTR.LS', 'SON.LS',
    'NOS.LS', 'BCP.LS', 'CTT.LS', 'RENE.LS', 'NVG.LS',
  ];

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  /**
   * Warm cache with popular stocks
   */
  async warmPopularStocks(
    fetchFn: (symbol: string) => Promise<any>,
    options: { includePortuguese?: boolean } = {}
  ): Promise<void> {
    const stocks = [...this.POPULAR_STOCKS];
    
    if (options.includePortuguese) {
      stocks.push(...this.PORTUGUESE_STOCKS);
    }

    console.log(`🔥 Warming cache for ${stocks.length} popular stocks...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { symbol: string; error: string }[],
    };

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            await this.cacheService.getStockQuote(
              symbol,
              () => fetchFn(symbol)
            );
            results.success++;
            console.log(`✅ Warmed cache for ${symbol}`);
          } catch (error) {
            results.failed++;
            results.errors.push({
              symbol,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            console.error(`❌ Failed to warm cache for ${symbol}:`, error);
          }
        })
      );

      // Add delay between batches to respect rate limits
      if (i + batchSize < stocks.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`🏁 Cache warming completed:`, {
      success: results.success,
      failed: results.failed,
      total: stocks.length,
    });

    if (results.errors.length > 0) {
      console.error('Cache warming errors:', results.errors);
    }
  }

  /**
   * Warm cache for specific watchlist
   */
  async warmWatchlist(
    symbols: string[],
    fetchFn: (symbol: string) => Promise<any>
  ): Promise<void> {
    console.log(`🔥 Warming cache for watchlist (${symbols.length} stocks)...`);

    const uniqueSymbols = [...new Set(symbols)];
    
    for (const symbol of uniqueSymbols) {
      try {
        await this.cacheService.getStockQuote(
          symbol,
          () => fetchFn(symbol)
        );
        console.log(`✅ Warmed cache for ${symbol}`);
        
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to warm cache for ${symbol}:`, error);
      }
    }
  }

  /**
   * Refresh stale quotes in cache
   */
  async refreshStaleQuotes(
    fetchFn: (symbol: string) => Promise<any>,
    staleThresholdMinutes: number = 10
  ): Promise<void> {
    console.log(`🔄 Refreshing quotes older than ${staleThresholdMinutes} minutes...`);

    try {
      const validQuotes = await this.cacheService.getAllValidQuotes();
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - staleThresholdMinutes * 60 * 1000);

      const staleQuotes = validQuotes.filter(
        (quote) => new Date(quote.updated_at) < staleThreshold
      );

      if (staleQuotes.length === 0) {
        console.log('✨ No stale quotes found');
        return;
      }

      console.log(`Found ${staleQuotes.length} stale quotes to refresh`);

      for (const quote of staleQuotes) {
        try {
          await this.cacheService.getStockQuote(
            quote.symbol,
            () => fetchFn(quote.symbol),
            { ttl: 5 * 60 * 1000 } // Force 5-minute TTL
          );
          console.log(`✅ Refreshed ${quote.symbol}`);
          
          // Delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Failed to refresh ${quote.symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('Error refreshing stale quotes:', error);
    }
  }

  /**
   * Preload cache for market open
   */
  async preloadForMarketOpen(
    fetchFn: (symbol: string) => Promise<any>
  ): Promise<void> {
    console.log('📈 Preloading cache for market open...');

    // Get current hour in ET
    const now = new Date();
    const etOffset = -5; // ET offset from UTC
    const etHour = (now.getUTCHours() + etOffset + 24) % 24;

    // Check if we're within 30 minutes of market open (9:30 AM ET)
    if (etHour === 9 || (etHour === 8 && now.getMinutes() >= 30)) {
      console.log('⏰ Market opening soon, warming all popular stocks...');
      await this.warmPopularStocks(fetchFn, { includePortuguese: true });
    } else {
      console.log('🕐 Not close to market open, skipping full warm-up');
      // Just refresh existing cache
      await this.refreshStaleQuotes(fetchFn, 15);
    }
  }

  /**
   * Get cache warming statistics
   */
  async getWarmingStats(): Promise<{
    totalCached: number;
    popularStocksCached: number;
    portugueseStocksCached: number;
    cacheHitRate: number;
  }> {
    const validQuotes = await this.cacheService.getAllValidQuotes();
    const cachedSymbols = new Set(validQuotes.map((q) => q.symbol));

    const popularCached = this.POPULAR_STOCKS.filter((s) =>
      cachedSymbols.has(s)
    ).length;

    const portugueseCached = this.PORTUGUESE_STOCKS.filter((s) =>
      cachedSymbols.has(s)
    ).length;

    // Calculate hit rate from valid quotes
    const totalHits = validQuotes.reduce((sum, q) => sum + q.hit_count, 0);
    const totalAccesses = validQuotes.length > 0 ? totalHits + validQuotes.length : 1;
    const hitRate = (totalHits / totalAccesses) * 100;

    return {
      totalCached: validQuotes.length,
      popularStocksCached: popularCached,
      portugueseStocksCached: portugueseCached,
      cacheHitRate: Math.round(hitRate),
    };
  }

  /**
   * Clear cache for specific symbols
   */
  async clearSymbols(symbols: string[]): Promise<void> {
    console.log(`🗑️ Clearing cache for ${symbols.length} symbols...`);

    for (const symbol of symbols) {
      try {
        await this.cacheService.invalidateQuote(symbol);
        await this.cacheService.invalidateBatchQuotesContaining(symbol);
        console.log(`✅ Cleared cache for ${symbol}`);
      } catch (error) {
        console.error(`❌ Failed to clear cache for ${symbol}:`, error);
      }
    }
  }
}