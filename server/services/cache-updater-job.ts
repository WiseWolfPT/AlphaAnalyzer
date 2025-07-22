// Cache Updater Job - Periodically fetches data from APIs and updates Supabase cache
// This implements the Reddit strategy: backend fetches data, frontend only reads from our API
import { RedditStrategyService } from './reddit-strategy-service';
import { SupabaseCacheService } from './supabase-cache-service';

// Popular stocks to keep updated in cache
const POPULAR_STOCKS = [
  // Tech giants
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  // Financial
  'JPM', 'BAC', 'GS', 'MS', 'V', 'MA', 'PYPL',
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'CVS', 'ABBV',
  // Consumer
  'WMT', 'HD', 'DIS', 'NKE', 'MCD', 'SBUX',
  // Energy
  'XOM', 'CVX',
  // Other popular
  'BRK.B', 'PG', 'KO', 'PEP', 'NFLX', 'ADBE', 'CRM'
];

// Market indices
const MARKET_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^VIX', name: 'VIX' }
];

export class CacheUpdaterJob {
  private static isRunning = false;
  private static lastRun: Date | null = null;
  private static updateInterval = 5 * 60 * 1000; // 5 minutes

  /**
   * Start the cache updater job
   */
  static start() {
    console.log('🚀 Starting cache updater job');
    
    // Run immediately on start
    this.runUpdate();
    
    // Then run periodically
    setInterval(() => {
      this.runUpdate();
    }, this.updateInterval);
  }

  /**
   * Run a single update cycle
   */
  static async runUpdate() {
    if (this.isRunning) {
      console.log('⏭️ Update already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('🔄 Starting cache update cycle');
      
      // Update popular stocks in batches
      await this.updatePopularStocks();
      
      // Update market indices
      await this.updateMarketIndices();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Cache update completed in ${duration}ms`);
      
      this.lastRun = new Date();
    } catch (error) {
      console.error('❌ Cache update failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update popular stocks in cache
   */
  private static async updatePopularStocks() {
    console.log(`📊 Updating ${POPULAR_STOCKS.length} popular stocks`);
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < POPULAR_STOCKS.length; i += batchSize) {
      const batch = POPULAR_STOCKS.slice(i, i + batchSize);
      
      try {
        // Force refresh (fetch from APIs, not cache)
        const result = await RedditStrategyService.refreshQuotes(batch);
        
        console.log(`✅ Updated batch ${i / batchSize + 1}: ${result.quotes.length} stocks`);
        
        if (Object.keys(result.errors).length > 0) {
          console.warn('⚠️ Some stocks failed:', result.errors);
        }
        
        // Small delay between batches
        if (i + batchSize < POPULAR_STOCKS.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Failed to update batch ${i / batchSize + 1}:`, error);
      }
    }
  }

  /**
   * Update market indices
   */
  private static async updateMarketIndices() {
    console.log('📈 Updating market indices');
    
    for (const index of MARKET_INDICES) {
      try {
        const quote = await RedditStrategyService.getQuote(index.symbol);
        
        if (quote) {
          await SupabaseCacheService.saveMarketIndex(
            index.symbol,
            index.name,
            quote.price,
            quote.change,
            quote.change_percent
          );
          console.log(`✅ Updated ${index.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to update ${index.name}:`, error);
      }
    }
  }

  /**
   * Get job status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      updateInterval: this.updateInterval,
      stocksTracked: POPULAR_STOCKS.length,
      indicesTracked: MARKET_INDICES.length
    };
  }

  /**
   * Update a specific list of symbols (on-demand)
   */
  static async updateSymbols(symbols: string[]) {
    console.log(`📊 On-demand update for ${symbols.length} symbols`);
    
    try {
      const result = await RedditStrategyService.refreshQuotes(symbols);
      
      console.log(`✅ Updated ${result.quotes.length} symbols on-demand`);
      
      if (Object.keys(result.errors).length > 0) {
        console.warn('⚠️ Some symbols failed:', result.errors);
      }
      
      return result;
    } catch (error) {
      console.error('❌ On-demand update failed:', error);
      throw error;
    }
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CACHE_UPDATER === 'true') {
  CacheUpdaterJob.start();
}