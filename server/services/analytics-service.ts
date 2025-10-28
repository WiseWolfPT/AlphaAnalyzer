/**
 * Analytics Service - ONDA 7
 *
 * Tracks user activity for intelligent cache warming prioritization.
 *
 * Metrics:
 * - Stock views (by ticker, timeframe)
 * - Method usage (which valuation methods are most popular)
 * - Page visits (intrinsic value, transcripts, etc.)
 * - Search queries
 *
 * Storage:
 * - Redis sorted sets for time-series data
 * - TTL: 7 days (rolling window)
 */

import Redis from 'ioredis';
import { logger } from '../lib/logger';

export interface ViewStats {
  ticker: string;
  views1h: number;
  views24h: number;
  views7d: number;
  lastViewed: Date;
}

export interface MethodStats {
  methodId: string;
  uses1h: number;
  uses24h: number;
  uses7d: number;
  lastUsed: Date;
}

export interface TopStock {
  ticker: string;
  views: number;
  rank: number;
}

/**
 * Analytics Service
 *
 * Tracks user activity to inform intelligent cache warming decisions.
 */
export class AnalyticsService {
  private redis: Redis;
  private connected: boolean = false;

  // Redis keys
  private readonly STOCK_VIEWS_KEY = 'analytics:stock_views:';
  private readonly METHOD_USES_KEY = 'analytics:method_uses:';
  private readonly SEARCH_QUERIES_KEY = 'analytics:searches';
  private readonly PAGE_VISITS_KEY = 'analytics:page_visits';

  // Timeframe windows (in seconds)
  private readonly WINDOW_1H = 60 * 60; // 1 hour
  private readonly WINDOW_24H = 24 * 60 * 60; // 24 hours
  private readonly WINDOW_7D = 7 * 24 * 60 * 60; // 7 days

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('[Analytics] Redis connected');
      this.connected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('[Analytics] Redis error:', error);
      this.connected = false;
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('[Analytics] Failed to connect:', error);
    }
  }

  /**
   * Track a stock view
   *
   * @param ticker - Stock ticker symbol
   * @returns Promise<void>
   */
  async trackView(ticker: string): Promise<void> {
    if (!this.connected) return;

    try {
      const now = Date.now();
      const key = `${this.STOCK_VIEWS_KEY}${ticker}`;

      // Add timestamp to sorted set
      await this.redis.zadd(key, now, now.toString());

      // Set expiry: 7 days
      await this.redis.expire(key, this.WINDOW_7D);

      logger.debug(`[Analytics] Tracked view: ${ticker}`);
    } catch (error) {
      logger.error('[Analytics] Failed to track view:', error);
    }
  }

  /**
   * Get view count for a ticker within a timeframe
   *
   * @param ticker - Stock ticker symbol
   * @param timeframe - '1h' | '24h' | '7d'
   * @returns Promise<number>
   */
  async getViews(ticker: string, timeframe: '1h' | '24h' | '7d'): Promise<number> {
    if (!this.connected) return 0;

    try {
      const key = `${this.STOCK_VIEWS_KEY}${ticker}`;
      const now = Date.now();

      // Calculate window
      let windowSeconds: number;
      if (timeframe === '1h') {
        windowSeconds = this.WINDOW_1H;
      } else if (timeframe === '24h') {
        windowSeconds = this.WINDOW_24H;
      } else {
        windowSeconds = this.WINDOW_7D;
      }

      const minTimestamp = now - (windowSeconds * 1000);

      // Count entries in time window
      const count = await this.redis.zcount(key, minTimestamp, now);

      return count;
    } catch (error) {
      logger.error('[Analytics] Failed to get views:', error);
      return 0;
    }
  }

  /**
   * Get detailed view stats for a ticker
   *
   * @param ticker - Stock ticker symbol
   * @returns Promise<ViewStats>
   */
  async getViewStats(ticker: string): Promise<ViewStats> {
    if (!this.connected) {
      return {
        ticker,
        views1h: 0,
        views24h: 0,
        views7d: 0,
        lastViewed: new Date(0)
      };
    }

    try {
      const [views1h, views24h, views7d] = await Promise.all([
        this.getViews(ticker, '1h'),
        this.getViews(ticker, '24h'),
        this.getViews(ticker, '7d')
      ]);

      // Get last viewed timestamp
      const key = `${this.STOCK_VIEWS_KEY}${ticker}`;
      const lastTimestamps = await this.redis.zrevrange(key, 0, 0);
      const lastViewed = lastTimestamps.length > 0
        ? new Date(parseInt(lastTimestamps[0], 10))
        : new Date(0);

      return {
        ticker,
        views1h,
        views24h,
        views7d,
        lastViewed
      };
    } catch (error) {
      logger.error('[Analytics] Failed to get view stats:', error);
      return {
        ticker,
        views1h: 0,
        views24h: 0,
        views7d: 0,
        lastViewed: new Date(0)
      };
    }
  }

  /**
   * Get top N most viewed stocks
   *
   * @param limit - Number of stocks to return (default: 20)
   * @param timeframe - '1h' | '24h' | '7d'
   * @returns Promise<TopStock[]>
   */
  async getTopStocks(limit: number = 20, timeframe: '24h' | '7d' = '24h'): Promise<TopStock[]> {
    if (!this.connected) return [];

    try {
      const now = Date.now();
      const windowSeconds = timeframe === '24h' ? this.WINDOW_24H : this.WINDOW_7D;
      const minTimestamp = now - (windowSeconds * 1000);

      // Get all stock view keys
      const pattern = `${this.STOCK_VIEWS_KEY}*`;
      const keys = await this.redis.keys(pattern);

      // Count views for each stock
      const stockCounts: Array<{ ticker: string; views: number }> = [];

      for (const key of keys) {
        const ticker = key.replace(this.STOCK_VIEWS_KEY, '');
        const count = await this.redis.zcount(key, minTimestamp, now);

        if (count > 0) {
          stockCounts.push({ ticker, views: count });
        }
      }

      // Sort by views (descending) and take top N
      stockCounts.sort((a, b) => b.views - a.views);
      const topStocks = stockCounts.slice(0, limit);

      // Add rank
      const result: TopStock[] = topStocks.map((stock, index) => ({
        ticker: stock.ticker,
        views: stock.views,
        rank: index + 1
      }));

      logger.info(`[Analytics] Top ${limit} stocks (${timeframe}): ${result.map(s => s.ticker).join(', ')}`);
      return result;
    } catch (error) {
      logger.error('[Analytics] Failed to get top stocks:', error);
      return [];
    }
  }

  /**
   * Track valuation method usage
   *
   * @param methodId - Valuation method ID
   * @returns Promise<void>
   */
  async trackMethodUse(methodId: string): Promise<void> {
    if (!this.connected) return;

    try {
      const now = Date.now();
      const key = `${this.METHOD_USES_KEY}${methodId}`;

      // Add timestamp to sorted set
      await this.redis.zadd(key, now, now.toString());

      // Set expiry: 7 days
      await this.redis.expire(key, this.WINDOW_7D);

      logger.debug(`[Analytics] Tracked method use: ${methodId}`);
    } catch (error) {
      logger.error('[Analytics] Failed to track method use:', error);
    }
  }

  /**
   * Get method usage stats
   *
   * @param methodId - Valuation method ID
   * @returns Promise<MethodStats>
   */
  async getMethodStats(methodId: string): Promise<MethodStats> {
    if (!this.connected) {
      return {
        methodId,
        uses1h: 0,
        uses24h: 0,
        uses7d: 0,
        lastUsed: new Date(0)
      };
    }

    try {
      const key = `${this.METHOD_USES_KEY}${methodId}`;
      const now = Date.now();

      // Count uses in each timeframe
      const [uses1h, uses24h, uses7d] = await Promise.all([
        this.redis.zcount(key, now - (this.WINDOW_1H * 1000), now),
        this.redis.zcount(key, now - (this.WINDOW_24H * 1000), now),
        this.redis.zcount(key, now - (this.WINDOW_7D * 1000), now)
      ]);

      // Get last used timestamp
      const lastTimestamps = await this.redis.zrevrange(key, 0, 0);
      const lastUsed = lastTimestamps.length > 0
        ? new Date(parseInt(lastTimestamps[0], 10))
        : new Date(0);

      return {
        methodId,
        uses1h,
        uses24h,
        uses7d,
        lastUsed
      };
    } catch (error) {
      logger.error('[Analytics] Failed to get method stats:', error);
      return {
        methodId,
        uses1h: 0,
        uses24h: 0,
        uses7d: 0,
        lastUsed: new Date(0)
      };
    }
  }

  /**
   * Track search query
   *
   * @param query - Search query string
   * @returns Promise<void>
   */
  async trackSearch(query: string): Promise<void> {
    if (!this.connected) return;

    try {
      const now = Date.now();

      // Add to sorted set (score = timestamp)
      await this.redis.zadd(this.SEARCH_QUERIES_KEY, now, `${now}:${query}`);

      // Keep only last 1000 searches
      await this.redis.zremrangebyrank(this.SEARCH_QUERIES_KEY, 0, -1001);

      logger.debug(`[Analytics] Tracked search: ${query}`);
    } catch (error) {
      logger.error('[Analytics] Failed to track search:', error);
    }
  }

  /**
   * Track page visit
   *
   * @param page - Page name (e.g., 'intrinsic-value', 'transcripts')
   * @returns Promise<void>
   */
  async trackPageVisit(page: string): Promise<void> {
    if (!this.connected) return;

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `${this.PAGE_VISITS_KEY}:${today}`;

      // Increment counter for page
      await this.redis.hincrby(key, page, 1);

      // Set expiry: 30 days
      await this.redis.expire(key, 30 * 24 * 60 * 60);

      logger.debug(`[Analytics] Tracked page visit: ${page}`);
    } catch (error) {
      logger.error('[Analytics] Failed to track page visit:', error);
    }
  }

  /**
   * Get analytics summary
   *
   * @returns Promise<object>
   */
  async getSummary(): Promise<{
    topStocks24h: TopStock[];
    totalViews24h: number;
    uniqueStocks24h: number;
  }> {
    try {
      const topStocks = await this.getTopStocks(10, '24h');
      const totalViews = topStocks.reduce((sum, stock) => sum + stock.views, 0);
      const uniqueStocks = topStocks.length;

      return {
        topStocks24h: topStocks,
        totalViews24h: totalViews,
        uniqueStocks24h: uniqueStocks
      };
    } catch (error) {
      logger.error('[Analytics] Failed to get summary:', error);
      return {
        topStocks24h: [],
        totalViews24h: 0,
        uniqueStocks24h: 0
      };
    }
  }

  /**
   * Cleanup old data (admin operation)
   *
   * @returns Promise<void>
   */
  async cleanup(): Promise<void> {
    if (!this.connected) return;

    try {
      const now = Date.now();
      const cutoff = now - (this.WINDOW_7D * 1000);

      // Clean stock views
      const viewKeys = await this.redis.keys(`${this.STOCK_VIEWS_KEY}*`);
      for (const key of viewKeys) {
        await this.redis.zremrangebyscore(key, 0, cutoff);
      }

      // Clean method uses
      const methodKeys = await this.redis.keys(`${this.METHOD_USES_KEY}*`);
      for (const key of methodKeys) {
        await this.redis.zremrangebyscore(key, 0, cutoff);
      }

      logger.info('[Analytics] Cleanup complete');
    } catch (error) {
      logger.error('[Analytics] Failed to cleanup:', error);
    }
  }

  /**
   * Disconnect Redis client
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.redis.quit();
      logger.info('[Analytics] Disconnected');
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
