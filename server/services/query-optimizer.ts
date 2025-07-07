/**
 * QUERY OPTIMIZER SERVICE
 * Eliminates N+1 queries and implements intelligent batching for 100+ concurrent users
 * Provides optimized data access patterns and query result caching
 */

import { optimizedPool } from '../db/optimized-connection-pool';
import { globalCache, DataType, CacheKeys } from '../cache/intelligent-cache-manager';

interface BatchRequest {
  id: string;
  resolver: (data: any) => void;
  rejector: (error: Error) => void;
  timestamp: number;
}

interface OptimizedQueryResult<T> {
  data: T[];
  cached: boolean;
  executionTime: number;
  source: 'cache' | 'database' | 'batch';
}

/**
 * Eliminates N+1 queries through intelligent batching and caching
 */
export class QueryOptimizer {
  private batchRequests = new Map<string, BatchRequest[]>();
  private batchTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly batchDelay = 10; // 10ms batching window
  private readonly maxBatchSize = 50;
  
  /**
   * Get user portfolios with optimized queries
   * Eliminates N+1 by fetching all portfolio data in batched queries
   */
  async getUserPortfoliosOptimized(userId: string): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    const cacheKey = `user_portfolios:${userId}`;
    
    // Check cache first
    const cached = globalCache.get(cacheKey, DataType.FINANCIAL_METRICS);
    if (cached) {
      return {
        data: cached,
        cached: true,
        executionTime: Date.now() - startTime,
        source: 'cache'
      };
    }
    
    try {
      // Single optimized query instead of N+1
      const portfoliosWithData = await optimizedPool.query(`
        SELECT 
          p.id,
          p.name,
          p.description,
          p.currency,
          p.is_default,
          p.created_at,
          p.updated_at,
          -- Portfolio value calculations
          COALESCE(SUM(CASE WHEN t.type = 'buy' THEN t.quantity * t.price ELSE 0 END), 0) as total_invested,
          COALESCE(SUM(CASE WHEN t.type = 'sell' THEN t.quantity * t.price ELSE 0 END), 0) as total_divested,
          COUNT(DISTINCT t.symbol) as unique_stocks,
          COUNT(t.id) as transaction_count,
          MAX(t.date) as last_transaction_date,
          -- Current holdings summary
          (
            SELECT json_agg(
              json_build_object(
                'symbol', symbol,
                'shares', SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END),
                'avg_price', AVG(CASE WHEN type = 'buy' THEN price ELSE NULL END),
                'invested', SUM(CASE WHEN type = 'buy' THEN quantity * price ELSE 0 END)
              )
            )
            FROM transactions t2 
            WHERE t2.portfolio_id = p.id 
            GROUP BY symbol
            HAVING SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) > 0
          ) as current_holdings
        FROM portfolios p
        LEFT JOIN transactions t ON p.id = t.portfolio_id
        WHERE p.user_id = $1
        GROUP BY p.id, p.name, p.description, p.currency, p.is_default, p.created_at, p.updated_at
        ORDER BY p.created_at DESC
      `, [userId]);
      
      // Cache the result
      globalCache.set(cacheKey, portfoliosWithData, DataType.FINANCIAL_METRICS, 'database');
      
      return {
        data: portfoliosWithData,
        cached: false,
        executionTime: Date.now() - startTime,
        source: 'database'
      };
      
    } catch (error) {
      console.error('Error in getUserPortfoliosOptimized:', error);
      throw error;
    }
  }
  
  /**
   * Get watchlist with stocks - eliminates N+1 by fetching all data in one query
   */
  async getUserWatchlistsOptimized(userId: string): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    const cacheKey = `user_watchlists:${userId}`;
    
    // Check cache first
    const cached = globalCache.get(cacheKey, DataType.FINANCIAL_METRICS);
    if (cached) {
      return {
        data: cached,
        cached: true,
        executionTime: Date.now() - startTime,
        source: 'cache'
      };
    }
    
    try {
      // Optimized single query with aggregated stock data
      const watchlistsWithStocks = await optimizedPool.query(`
        SELECT 
          w.id,
          w.name,
          w.description,
          w.is_default,
          w.created_at,
          w.updated_at,
          COUNT(wi.symbol) as stock_count,
          -- Aggregated stock symbols and details
          json_agg(
            CASE WHEN wi.symbol IS NOT NULL THEN
              json_build_object(
                'symbol', wi.symbol,
                'added_at', wi.added_at,
                'notes', wi.notes,
                'alert_price', wi.alert_price
              )
            END
          ) FILTER (WHERE wi.symbol IS NOT NULL) as stocks
        FROM watchlists w
        LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
        WHERE w.user_id = $1
        GROUP BY w.id, w.name, w.description, w.is_default, w.created_at, w.updated_at
        ORDER BY w.created_at DESC
      `, [userId]);
      
      // Cache the result
      globalCache.set(cacheKey, watchlistsWithStocks, DataType.FINANCIAL_METRICS, 'database');
      
      return {
        data: watchlistsWithStocks,
        cached: false,
        executionTime: Date.now() - startTime,
        source: 'database'
      };
      
    } catch (error) {
      console.error('Error in getUserWatchlistsOptimized:', error);
      throw error;
    }
  }
  
  /**
   * Batch stock price fetching to eliminate N+1 API calls
   */
  async getStockPricesBatch(symbols: string[]): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    
    if (symbols.length === 0) {
      return {
        data: [],
        cached: false,
        executionTime: 0,
        source: 'batch'
      };
    }
    
    // Check cache for all symbols first
    const cachedResults: Record<string, any> = {};
    const uncachedSymbols: string[] = [];
    
    for (const symbol of symbols) {
      const cacheKey = CacheKeys.realtimePrice(symbol);
      const cached = globalCache.get(cacheKey, DataType.REAL_TIME_PRICE);
      
      if (cached) {
        cachedResults[symbol] = cached;
      } else {
        uncachedSymbols.push(symbol);
      }
    }
    
    let databaseResults: any[] = [];
    
    // Fetch uncached symbols in batches
    if (uncachedSymbols.length > 0) {
      // Use batched database query instead of individual API calls
      databaseResults = await this.batchFetchStockPrices(uncachedSymbols);
      
      // Cache the new results
      for (const result of databaseResults) {
        const cacheKey = CacheKeys.realtimePrice(result.symbol);
        globalCache.set(cacheKey, result, DataType.REAL_TIME_PRICE, 'batch');
      }
    }
    
    // Combine cached and fresh results
    const allResults = [
      ...Object.values(cachedResults),
      ...databaseResults
    ];
    
    return {
      data: allResults,
      cached: uncachedSymbols.length === 0,
      executionTime: Date.now() - startTime,
      source: uncachedSymbols.length > 0 ? 'batch' : 'cache'
    };
  }
  
  /**
   * Optimized portfolio performance calculation
   * Single query instead of multiple aggregations
   */
  async getPortfolioPerformanceOptimized(portfolioId: string): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    const cacheKey = `portfolio_performance:${portfolioId}`;
    
    // Check cache first
    const cached = globalCache.get(cacheKey, DataType.FINANCIAL_METRICS);
    if (cached) {
      return {
        data: cached,
        cached: true,
        executionTime: Date.now() - startTime,
        source: 'cache'
      };
    }
    
    try {
      // Single complex query for all performance metrics
      const performance = await optimizedPool.query(`
        WITH portfolio_summary AS (
          SELECT 
            symbol,
            SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) as current_shares,
            SUM(CASE WHEN type = 'buy' THEN quantity * price ELSE 0 END) as total_buy_amount,
            SUM(CASE WHEN type = 'sell' THEN quantity * price ELSE 0 END) as total_sell_amount,
            AVG(CASE WHEN type = 'buy' THEN price ELSE NULL END) as avg_buy_price,
            COUNT(*) as transaction_count,
            MIN(date) as first_transaction,
            MAX(date) as last_transaction
          FROM transactions
          WHERE portfolio_id = $1
          GROUP BY symbol
          HAVING SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) > 0
        ),
        performance_metrics AS (
          SELECT 
            COUNT(*) as total_positions,
            SUM(current_shares * avg_buy_price) as total_invested,
            SUM(current_shares) as total_shares,
            AVG(avg_buy_price) as portfolio_avg_price,
            SUM(transaction_count) as total_transactions,
            MIN(first_transaction) as portfolio_start_date,
            MAX(last_transaction) as last_activity
          FROM portfolio_summary
        )
        SELECT 
          pm.*,
          json_agg(
            json_build_object(
              'symbol', ps.symbol,
              'shares', ps.current_shares,
              'avg_price', ps.avg_buy_price,
              'invested', ps.current_shares * ps.avg_buy_price,
              'weight', (ps.current_shares * ps.avg_buy_price) / pm.total_invested * 100,
              'transactions', ps.transaction_count,
              'first_buy', ps.first_transaction,
              'last_activity', ps.last_transaction
            )
          ) as holdings_breakdown
        FROM performance_metrics pm
        CROSS JOIN portfolio_summary ps
        GROUP BY pm.total_positions, pm.total_invested, pm.total_shares, 
                 pm.portfolio_avg_price, pm.total_transactions, 
                 pm.portfolio_start_date, pm.last_activity
      `, [portfolioId]);
      
      const result = performance[0] || {
        total_positions: 0,
        total_invested: 0,
        total_shares: 0,
        holdings_breakdown: []
      };
      
      // Cache the result
      globalCache.set(cacheKey, result, DataType.FINANCIAL_METRICS, 'database');
      
      return {
        data: result,
        cached: false,
        executionTime: Date.now() - startTime,
        source: 'database'
      };
      
    } catch (error) {
      console.error('Error in getPortfolioPerformanceOptimized:', error);
      throw error;
    }
  }
  
  /**
   * Batch API requests with intelligent deduplication
   */
  private async batchFetchStockPrices(symbols: string[]): Promise<any[]> {
    // Group symbols into manageable batches
    const batches = this.chunkArray(symbols, this.maxBatchSize);
    const results: any[] = [];
    
    for (const batch of batches) {
      try {
        // In production, this would call your market data service
        // For now, simulate with database lookup
        const batchResults = await optimizedPool.query(`
          SELECT 
            symbol,
            close as price,
            (close - open) as change,
            ((close - open) / open * 100) as change_percent,
            high,
            low,
            open,
            volume,
            date as last_updated
          FROM stock_prices sp1
          WHERE symbol = ANY($1)
          AND date = (
            SELECT MAX(date) 
            FROM stock_prices sp2 
            WHERE sp2.symbol = sp1.symbol
          )
        `, [batch]);
        
        results.push(...batchResults);
        
        // Small delay between batches to prevent overwhelming APIs
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        console.error(`Error fetching batch ${batch}:`, error);
        // Continue with other batches
      }
    }
    
    return results;
  }
  
  /**
   * Optimized user dashboard data - single query for all metrics
   */
  async getUserDashboardDataOptimized(userId: string): Promise<OptimizedQueryResult<any>> {
    const startTime = Date.now();
    const cacheKey = `user_dashboard:${userId}`;
    
    // Check cache first
    const cached = globalCache.get(cacheKey, DataType.FINANCIAL_METRICS);
    if (cached) {
      return {
        data: cached,
        cached: true,
        executionTime: Date.now() - startTime,
        source: 'cache'
      };
    }
    
    try {
      // Mega-optimized single query for entire dashboard
      const dashboardData = await optimizedPool.query(`
        WITH user_summary AS (
          SELECT 
            u.id,
            u.email,
            u.created_at as member_since,
            -- Portfolio metrics
            COUNT(DISTINCT p.id) as total_portfolios,
            COALESCE(SUM(
              CASE WHEN t.type = 'buy' THEN t.quantity * t.price ELSE 0 END
            ), 0) as total_invested,
            -- Watchlist metrics
            COUNT(DISTINCT w.id) as total_watchlists,
            COUNT(DISTINCT wi.symbol) as watched_stocks,
            -- Activity metrics
            COUNT(DISTINCT t.id) as total_transactions,
            MAX(GREATEST(
              COALESCE(p.updated_at, '1970-01-01'::timestamptz),
              COALESCE(w.updated_at, '1970-01-01'::timestamptz),
              COALESCE(t.created_at, '1970-01-01'::timestamptz)
            )) as last_activity
          FROM users u
          LEFT JOIN portfolios p ON u.id = p.user_id
          LEFT JOIN watchlists w ON u.id = w.user_id
          LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
          LEFT JOIN transactions t ON p.id = t.portfolio_id
          WHERE u.id = $1
          GROUP BY u.id, u.email, u.created_at
        ),
        recent_transactions AS (
          SELECT 
            t.symbol,
            t.type,
            t.quantity,
            t.price,
            t.date,
            p.name as portfolio_name
          FROM transactions t
          JOIN portfolios p ON t.portfolio_id = p.id
          WHERE p.user_id = $1
          ORDER BY t.created_at DESC
          LIMIT 10
        ),
        portfolio_breakdown AS (
          SELECT 
            p.id,
            p.name,
            COALESCE(SUM(
              CASE WHEN t.type = 'buy' THEN t.quantity * t.price ELSE 0 END
            ), 0) as invested,
            COUNT(DISTINCT t.symbol) as stocks,
            COUNT(t.id) as transactions
          FROM portfolios p
          LEFT JOIN transactions t ON p.id = t.portfolio_id
          WHERE p.user_id = $1
          GROUP BY p.id, p.name
        )
        SELECT 
          us.*,
          (SELECT json_agg(rt.*) FROM recent_transactions rt) as recent_transactions,
          (SELECT json_agg(pb.*) FROM portfolio_breakdown pb) as portfolio_breakdown
        FROM user_summary us
      `, [userId]);
      
      const result = dashboardData[0] || {
        total_portfolios: 0,
        total_invested: 0,
        total_watchlists: 0,
        watched_stocks: 0,
        total_transactions: 0,
        recent_transactions: [],
        portfolio_breakdown: []
      };
      
      // Cache with shorter TTL for dashboard data
      globalCache.set(cacheKey, result, DataType.FINANCIAL_METRICS, 'database');
      
      return {
        data: result,
        cached: false,
        executionTime: Date.now() - startTime,
        source: 'database'
      };
      
    } catch (error) {
      console.error('Error in getUserDashboardDataOptimized:', error);
      throw error;
    }
  }
  
  /**
   * Batch request handler to group similar queries
   */
  private async batchRequest<T>(
    batchKey: string,
    requestId: string,
    processor: (ids: string[]) => Promise<Record<string, T>>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Add to batch
      if (!this.batchRequests.has(batchKey)) {
        this.batchRequests.set(batchKey, []);
      }
      
      this.batchRequests.get(batchKey)!.push({
        id: requestId,
        resolver: resolve,
        rejector: reject,
        timestamp: Date.now()
      });
      
      // Clear existing timeout
      if (this.batchTimeouts.has(batchKey)) {
        clearTimeout(this.batchTimeouts.get(batchKey)!);
      }
      
      // Set new timeout to process batch
      const timeout = setTimeout(async () => {
        await this.processBatch(batchKey, processor);
      }, this.batchDelay);
      
      this.batchTimeouts.set(batchKey, timeout);
    });
  }
  
  /**
   * Process batched requests
   */
  private async processBatch<T>(
    batchKey: string,
    processor: (ids: string[]) => Promise<Record<string, T>>
  ): Promise<void> {
    const requests = this.batchRequests.get(batchKey) || [];
    this.batchRequests.delete(batchKey);
    this.batchTimeouts.delete(batchKey);
    
    if (requests.length === 0) return;
    
    try {
      const ids = requests.map(req => req.id);
      const results = await processor(ids);
      
      // Resolve all requests
      for (const request of requests) {
        const result = results[request.id];
        if (result !== undefined) {
          request.resolver(result);
        } else {
          request.rejector(new Error(`No result found for ID: ${request.id}`));
        }
      }
      
    } catch (error) {
      // Reject all requests
      for (const request of requests) {
        request.rejector(error);
      }
    }
  }
  
  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * Clear all caches related to a user (for consistency)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const keys = [
      `user_portfolios:${userId}`,
      `user_watchlists:${userId}`,
      `user_dashboard:${userId}`
    ];
    
    for (const key of keys) {
      globalCache.clear();
    }
    
    console.log(`🗑️ Invalidated cache for user ${userId}`);
  }
  
  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    return {
      activeBatches: this.batchRequests.size,
      pendingTimeouts: this.batchTimeouts.size,
      cacheStats: globalCache.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();