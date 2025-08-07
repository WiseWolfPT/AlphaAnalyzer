/**
 * REDDIT STRATEGY - Users NEVER trigger API calls!
 * 
 * According to ALFALYZER-PRODUCTION-PLAN.md Days 7-9
 * 
 * Core principle: Users always get cached data
 * API calls are ONLY made by cron jobs
 * If data is stale, it's queued for update but user gets stale data immediately
 */

import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { redisCacheService } from '../cache/redis-cache-service';
import { MarketDataService } from './market-data-service';
import { FMPProvider } from './unified-api/providers/fmp.provider';
import cron from 'node-cron';

interface QueuedUpdate {
  symbol: string;
  dataType: 'quote' | 'fundamentals' | 'historical' | 'news';
  priority: number; // 1 = highest
  addedAt: Date;
  attempts: number;
}

export class RedditStrategy {
  private static instance: RedditStrategy;
  private updateQueue: Map<string, QueuedUpdate> = new Map();
  private isProcessing = false;
  private marketDataService: MarketDataService;
  private fmpProvider: FMPProvider;
  
  // Rate limiting for FMP (300/min)
  private callsThisMinute = 0;
  private minuteResetTime = Date.now();
  private readonly MAX_CALLS_PER_MINUTE = 290; // Leave 10 calls buffer
  
  private constructor() {
    this.marketDataService = new MarketDataService();
    this.fmpProvider = new FMPProvider();
    logger.info('🎯 Reddit Strategy initialized - Users will NEVER trigger API calls');
  }

  static getInstance(): RedditStrategy {
    if (!RedditStrategy.instance) {
      RedditStrategy.instance = new RedditStrategy();
    }
    return RedditStrategy.instance;
  }

  /**
   * Get quote for user - ALWAYS from cache, NEVER direct API
   */
  async getQuoteForUser(symbol: string): Promise<any> {
    try {
      // 1. ALWAYS try cache first
      const cacheKey = `quote:${symbol}`;
      
      // Try Redis first
      const redisData = await redisCacheService.get(cacheKey);
      if (redisData) {
        // Check if stale (> 5 minutes)
        const age = Date.now() - (redisData.timestamp || 0);
        if (age > 5 * 60 * 1000) {
          this.queueForUpdate(symbol, 'quote', 1);
        }
        return redisData;
      }
      
      // Try Supabase cache
      const { data: supabaseData } = await supabase
        .from('cache_quotes')
        .select('*')
        .eq('symbol', symbol)
        .single();
      
      if (supabaseData) {
        // Check if stale
        const age = Date.now() - new Date(supabaseData.updated_at).getTime();
        if (age > 5 * 60 * 1000) {
          this.queueForUpdate(symbol, 'quote', 1);
        }
        
        // Save to Redis for next time
        await redisCacheService.set(cacheKey, supabaseData.data, 5 * 60);
        
        return supabaseData.data;
      }
      
      // No cache available - queue for update and return placeholder
      this.queueForUpdate(symbol, 'quote', 1);
      
      return {
        symbol,
        price: null,
        change: null,
        changePercent: null,
        volume: null,
        message: 'Data is being fetched. Please refresh in a moment.',
        isStale: true,
        timestamp: Date.now()
      };
      
    } catch (error) {
      logger.error(`Failed to get quote for user (${symbol}):`, error);
      return {
        symbol,
        error: 'Failed to fetch data',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get batch quotes for user - ALWAYS from cache
   */
  async getBatchQuotesForUser(symbols: string[]): Promise<any[]> {
    const results = await Promise.all(
      symbols.map(symbol => this.getQuoteForUser(symbol))
    );
    return results;
  }

  /**
   * Queue symbol for update (called when data is stale or missing)
   */
  private queueForUpdate(symbol: string, dataType: 'quote' | 'fundamentals' | 'historical' | 'news', priority: number) {
    const key = `${dataType}:${symbol}`;
    
    if (this.updateQueue.has(key)) {
      // Already queued, maybe increase priority
      const existing = this.updateQueue.get(key)!;
      if (priority < existing.priority) {
        existing.priority = priority;
      }
      return;
    }
    
    this.updateQueue.set(key, {
      symbol,
      dataType,
      priority,
      addedAt: new Date(),
      attempts: 0
    });
    
    logger.debug(`Queued ${key} for update (priority: ${priority})`);
  }

  /**
   * Process update queue - ONLY called by cron job
   */
  async processUpdateQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Queue processor already running, skipping...');
      return;
    }
    
    if (this.updateQueue.size === 0) {
      logger.debug('Update queue is empty');
      return;
    }
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      // Reset rate limit counter if minute passed
      if (Date.now() - this.minuteResetTime > 60000) {
        this.callsThisMinute = 0;
        this.minuteResetTime = Date.now();
        logger.debug('Rate limit counter reset');
      }
      
      // Check if we have quota
      if (this.callsThisMinute >= this.MAX_CALLS_PER_MINUTE) {
        logger.warn('📊 Approaching FMP rate limit, waiting for reset...');
        return;
      }
      
      // Sort queue by priority
      const sortedQueue = Array.from(this.updateQueue.entries())
        .sort((a, b) => a[1].priority - b[1].priority);
      
      // Process in batches (FMP supports batch quotes)
      const quotesToProcess = sortedQueue
        .filter(([_, item]) => item.dataType === 'quote')
        .slice(0, 20); // Process up to 20 quotes at once
      
      if (quotesToProcess.length > 0) {
        await this.processBatchQuotes(quotesToProcess);
      }
      
      // Process other data types individually
      const remainingQuota = this.MAX_CALLS_PER_MINUTE - this.callsThisMinute;
      const otherItems = sortedQueue
        .filter(([_, item]) => item.dataType !== 'quote')
        .slice(0, remainingQuota);
      
      for (const [key, item] of otherItems) {
        if (this.callsThisMinute >= this.MAX_CALLS_PER_MINUTE) {
          break;
        }
        
        await this.processQueueItem(key, item);
      }
      
      const elapsed = Date.now() - startTime;
      logger.info(`✅ Queue processing complete in ${elapsed}ms. Processed ${quotesToProcess.length + otherItems.length} items`);
      
    } catch (error) {
      logger.error('Queue processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process batch quotes efficiently
   */
  private async processBatchQuotes(items: [string, QueuedUpdate][]): Promise<void> {
    const symbols = items.map(([_, item]) => item.symbol);
    
    try {
      logger.info(`📊 Processing batch quotes for ${symbols.length} symbols: ${symbols.join(', ')}`);
      
      // Use FMP batch endpoint (counts as 1 API call!)
      const quotes = await this.fmpProvider.getBatchPrices(symbols);
      this.callsThisMinute++;
      
      logger.info(`✅ Received ${quotes.length} quotes from FMP`);
      
      // Save to cache
      for (const quote of quotes) {
        const cacheKey = `quote:${quote.symbol}`;
        
        logger.debug(`💾 Saving ${quote.symbol} to cache: price=${quote.price}`);
        
        // Save to Redis (fast access)
        await redisCacheService.set(cacheKey, quote, 5 * 60); // 5 min TTL
        
        // Save to Supabase (persistent)
        await supabase
          .from('cache_quotes')
          .upsert({
            symbol: quote.symbol,
            data: quote,
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          });
        
        // Remove from queue
        this.updateQueue.delete(`quote:${quote.symbol}`);
      }
      
      logger.info(`✅ Updated ${quotes.length} quotes with 1 API call`);
      
    } catch (error) {
      logger.error('❌ Failed to process batch quotes:', error);
      logger.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Increment attempts for retry
      for (const [key, item] of items) {
        item.attempts++;
        if (item.attempts >= 3) {
          this.updateQueue.delete(key);
          logger.warn(`Removed ${key} from queue after 3 failed attempts`);
        }
      }
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(key: string, item: QueuedUpdate): Promise<void> {
    try {
      logger.debug(`Processing ${key}`);
      
      let data: any;
      
      switch (item.dataType) {
        case 'fundamentals':
          data = await this.fmpProvider.getFundamentals(item.symbol);
          this.callsThisMinute++;
          
          // Cache for 24 hours
          await redisCacheService.set(`fundamentals:${item.symbol}`, data, 24 * 60 * 60);
          await supabase
            .from('cache_fundamentals')
            .upsert({
              symbol: item.symbol,
              data,
              updated_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
          break;
          
        case 'historical':
          data = await this.fmpProvider.getHistorical(item.symbol, '1m');
          this.callsThisMinute++;
          
          // Cache for 6 hours
          await redisCacheService.set(`historical:${item.symbol}`, data, 6 * 60 * 60);
          await supabase
            .from('cache_historical')
            .upsert({
              symbol: item.symbol,
              period: '1m',
              data,
              updated_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
            });
          break;
          
        case 'news':
          data = await this.fmpProvider.getNews(item.symbol, 10);
          this.callsThisMinute++;
          
          // Cache for 1 hour
          await redisCacheService.set(`news:${item.symbol}`, data, 60 * 60);
          await supabase
            .from('market_news')
            .upsert({
              symbol: item.symbol,
              data,
              updated_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            });
          break;
      }
      
      // Remove from queue on success
      this.updateQueue.delete(key);
      logger.debug(`✅ Successfully updated ${key}`);
      
    } catch (error) {
      logger.error(`Failed to process ${key}:`, error);
      
      item.attempts++;
      if (item.attempts >= 3) {
        this.updateQueue.delete(key);
        logger.warn(`Removed ${key} from queue after 3 failed attempts`);
      }
    }
  }

  /**
   * Pre-warm cache with popular stocks
   */
  async warmPopularStocks(): Promise<void> {
    const popularStocks = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
      'TSLA', 'NVDA', 'JPM', 'V', 'JNJ',
      'WMT', 'PG', 'MA', 'UNH', 'HD',
      // Portuguese stocks
      'GALP.LS', 'EDP.LS', 'JMT.LS', 'ALTRI.LS', 'NOS.LS'
    ];
    
    // Queue all popular stocks for update
    for (const symbol of popularStocks) {
      this.queueForUpdate(symbol, 'quote', 2); // Priority 2 for warming
    }
    
    logger.info(`📊 Queued ${popularStocks.length} popular stocks for warming`);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const stats = {
      queueSize: this.updateQueue.size,
      isProcessing: this.isProcessing,
      callsThisMinute: this.callsThisMinute,
      quotaRemaining: this.MAX_CALLS_PER_MINUTE - this.callsThisMinute,
      minuteResetIn: Math.max(0, 60000 - (Date.now() - this.minuteResetTime)),
      queuedItems: Array.from(this.updateQueue.entries()).map(([key, item]) => ({
        key,
        symbol: item.symbol,
        dataType: item.dataType,
        priority: item.priority,
        queuedFor: Date.now() - item.addedAt.getTime(),
        attempts: item.attempts
      }))
    };
    
    return stats;
  }

  /**
   * Initialize cron jobs for Reddit Strategy
   */
  initializeCronJobs() {
    // Process queue immediately on startup
    setTimeout(async () => {
      logger.info('🚀 Initial queue processing...');
      await this.processUpdateQueue();
    }, 5000); // Wait 5 seconds for system to stabilize
    
    // Process queue every minute
    cron.schedule('* * * * *', async () => {
      logger.debug('🔄 Processing update queue...');
      await this.processUpdateQueue();
    });
    
    // Warm popular stocks every 15 minutes during market hours
    cron.schedule('*/15 9-16 * * 1-5', async () => {
      logger.info('🔥 Warming popular stocks cache...');
      await this.warmPopularStocks();
    });
    
    logger.info('✅ Reddit Strategy cron jobs initialized');
  }
}

// Export singleton instance
export const redditStrategy = RedditStrategy.getInstance();