import { rateLimitTracker } from './rate-limit-tracker';

/**
 * Polygon.io Service
 * Free tier: 5 API calls per minute
 * Paid tier: Higher rate limits
 * 
 * Now integrated with persistent rate limiting system
 */
export class PolygonService {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || 'demo'; // Use 'demo' for free tier
    
    if (!this.apiKey || this.apiKey === 'your_polygon_key_here') {
      console.warn('⚠️ Polygon API key not configured, using demo mode');
      this.apiKey = 'demo';
    }
  }

  /**
   * Check rate limits using persistent rate limiting system
   */
  private async checkRateLimit(endpoint: string): Promise<boolean> {
    try {
      const result = await rateLimitTracker.checkLimit('polygon', endpoint);
      
      if (!result.allowed) {
        console.log(`⏱️ Polygon rate limit exceeded for ${endpoint}: ${result.used}/${result.dailyLimit} (${result.usagePercent}%)`);
        return false;
      }
      
      console.log(`✅ Polygon rate limit OK for ${endpoint}: ${result.used}/${result.dailyLimit} (${result.usagePercent}%)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to check Polygon rate limit:', error);
      // Fail open - allow the request
      return true;
    }
  }

  /**
   * Record API call usage
   */
  private async recordApiCall(endpoint: string, responseTimeMs?: number, statusCode?: number): Promise<void> {
    try {
      await rateLimitTracker.recordCall('polygon', endpoint, {
        responseTimeMs,
        statusCode
      });
    } catch (error) {
      console.error('❌ Failed to record Polygon API call:', error);
    }
  }

  /**
   * Helper to get next day in YYYY-MM-DD format
   */
  private getNextDay(dateStr: string): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * Make API request with persistent rate limiting and retry logic
   */
  private async makeRequest(endpoint: string, params: Record<string, any> = {}, retryCount = 0): Promise<any> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    const startTime = Date.now();
    
    // Check rate limits before making the request
    const canProceed = await this.checkRateLimit(endpoint);
    if (!canProceed) {
      throw new Error(`Polygon API rate limit exceeded for ${endpoint}`);
    }

    const searchParams = new URLSearchParams({
      apikey: this.apiKey,
      ...params
    });

    const url = `${this.baseUrl}${endpoint}?${searchParams}`;
    
    try {
      console.log(`🔄 Polygon API call: ${endpoint}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
      const response = await fetch(url);
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        // Record failed call
        await this.recordApiCall(endpoint, responseTime, response.status);
        
        if (response.status === 429) {
          // Rate limit exceeded - wait longer and retry
          if (retryCount < maxRetries) {
            const retryDelay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
            console.log(`⏱️ Rate limit hit, retrying in ${retryDelay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return this.makeRequest(endpoint, params, retryCount + 1);
          }
          throw new Error('Polygon API rate limit exceeded after retries');
        }
        
        if (response.status >= 500 && retryCount < maxRetries) {
          // Server error - retry with exponential backoff
          const retryDelay = baseDelay * Math.pow(2, retryCount);
          console.log(`🔄 Server error ${response.status}, retrying in ${retryDelay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.makeRequest(endpoint, params, retryCount + 1);
        }
        
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'ERROR') {
        // Record failed call even with 200 status but API error
        await this.recordApiCall(endpoint, responseTime, 400);
        throw new Error(`Polygon API error: ${data.error || 'Unknown error'}`);
      }

      // Record successful call
      await this.recordApiCall(endpoint, responseTime, 200);
      
      console.log(`✅ Polygon API success: ${endpoint} (${responseTime}ms)`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch') && retryCount < maxRetries) {
        // Network error - retry
        const retryDelay = baseDelay * Math.pow(2, retryCount);
        console.log(`🌐 Network error, retrying in ${retryDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.makeRequest(endpoint, params, retryCount + 1);
      }
      
      console.error(`❌ Polygon API error for ${endpoint} after ${retryCount + 1} attempts:`, error);
      throw error;
    }
  }

  /**
   * Get current quote for a symbol
   */
  async getQuote(symbol: string): Promise<{
    price: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    marketCap?: number;
  } | null> {
    try {
      // Use previous day's close as current price for free tier
      const data = await this.makeRequest(`/v2/aggs/ticker/${symbol}/prev`);
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      
      return {
        price: result.c, // Close price
        change: result.c - result.o, // Close - Open
        changePercent: ((result.c - result.o) / result.o) * 100,
        volume: result.v,
        marketCap: undefined // Not available in this endpoint
      };
    } catch (error) {
      console.error(`❌ Failed to get Polygon quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get company details/fundamentals
   */
  async getCompanyDetails(symbol: string): Promise<{
    pe?: number;
    eps?: number;
    revenue?: number;
    marketCap?: number;
    sharesOutstanding?: number;
    bookValue?: number;
  } | null> {
    try {
      // Get ticker details
      const data = await this.makeRequest(`/v3/reference/tickers/${symbol}`);
      
      if (!data.results) {
        return null;
      }

      const result = data.results;
      
      return {
        marketCap: result.market_cap,
        sharesOutstanding: result.share_class_shares_outstanding,
        // Note: PE, EPS, etc. require additional API calls or paid tier
        pe: undefined,
        eps: undefined,
        revenue: undefined,
        bookValue: undefined
      };
    } catch (error) {
      console.error(`❌ Failed to get Polygon company details for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get historical data (aggregates) - alias for backward compatibility
   */
  async getHistoricalData(
    symbol: string, 
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    from: string, // YYYY-MM-DD
    to: string,   // YYYY-MM-DD
    limit = 50
  ): Promise<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[] | null> {
    return this.getAggregates(symbol, from, to, timespan, limit);
  }

  /**
   * Get aggregates (OHLCV data) for a symbol within date range
   */
  async getAggregates(
    symbol: string,
    from: string, // YYYY-MM-DD
    to: string,   // YYYY-MM-DD
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    limit = 50
  ): Promise<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[] | null> {
    try {
      const data = await this.makeRequest(
        `/v2/aggs/ticker/${symbol}/range/1/${timespan}/${from}/${to}`,
        { 
          adjusted: 'true',
          sort: 'asc',
          limit: limit.toString()
        }
      );
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      return data.results.map((result: any) => ({
        timestamp: result.t,
        open: result.o,
        high: result.h,
        low: result.l,
        close: result.c,
        volume: result.v
      }));
    } catch (error) {
      console.error(`❌ Failed to get Polygon aggregates for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get trades for a specific symbol and date
   */
  async getTrades(symbol: string, date: string): Promise<{
    timestamp: number;
    price: number;
    size: number;
    conditions?: number[];
  }[] | null> {
    try {
      const data = await this.makeRequest(`/v3/trades/${symbol}`, {
        'timestamp.gte': date,
        'timestamp.lt': this.getNextDay(date),
        'limit': '1000',
        'sort': 'timestamp'
      });
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      return data.results.map((result: any) => ({
        timestamp: result.timestamp,
        price: result.price,
        size: result.size,
        conditions: result.conditions
      }));
    } catch (error) {
      console.error(`❌ Failed to get Polygon trades for ${symbol} on ${date}:`, error);
      return null;
    }
  }

  /**
   * Get market snapshot for a symbol
   */
  async getSnapshot(symbol: string): Promise<{
    ticker: string;
    todaysChange: number;
    todaysChangePerc: number;
    lastQuote?: {
      price: number;
      size: number;
      timestamp: number;
    };
    lastTrade?: {
      price: number;
      size: number;
      timestamp: number;
    };
    min?: {
      av: number; // average volume
      t: number;  // timestamp
      n: number;  // transactions
      o: number;  // open
      h: number;  // high
      l: number;  // low
      c: number;  // close
      v: number;  // volume
    };
  } | null> {
    try {
      const data = await this.makeRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`);
      
      if (!data.ticker) {
        return null;
      }

      const result = data.ticker;
      
      return {
        ticker: result.ticker,
        todaysChange: result.todaysChange || 0,
        todaysChangePerc: result.todaysChangePerc || 0,
        lastQuote: result.lastQuote ? {
          price: result.lastQuote.p,
          size: result.lastQuote.s,
          timestamp: result.lastQuote.t
        } : undefined,
        lastTrade: result.lastTrade ? {
          price: result.lastTrade.p,
          size: result.lastTrade.s,
          timestamp: result.lastTrade.t
        } : undefined,
        min: result.min
      };
    } catch (error) {
      console.error(`❌ Failed to get Polygon snapshot for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get daily open/close for a specific date
   */
  async getDailyOpenClose(symbol: string, date: string): Promise<{
    status: string;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    afterHours?: number;
    preMarket?: number;
  } | null> {
    try {
      const data = await this.makeRequest(`/v1/open-close/${symbol}/${date}`);
      
      if (data.status !== 'OK') {
        return null;
      }

      return {
        status: data.status,
        symbol: data.symbol,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        afterHours: data.afterHours,
        preMarket: data.preMarket
      };
    } catch (error) {
      console.error(`❌ Failed to get Polygon daily open/close for ${symbol} on ${date}:`, error);
      return null;
    }
  }

  /**
   * Get previous close data for a symbol
   */
  async getPreviousClose(symbol: string): Promise<{
    ticker: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
  } | null> {
    try {
      const data = await this.makeRequest(`/v2/aggs/ticker/${symbol}/prev`);
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      
      return {
        ticker: symbol,
        open: result.o,
        high: result.h,
        low: result.l,
        close: result.c,
        volume: result.v,
        timestamp: result.t
      };
    } catch (error) {
      console.error(`❌ Failed to get Polygon previous close for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get dividend history for a symbol
   */
  async getDividends(symbol: string, limit = 10): Promise<{
    ticker: string;
    exDividendDate: string;
    paymentDate?: string;
    recordDate?: string;
    declaredDate?: string;
    cashAmount: number;
    dividendType?: string;
    frequency?: number;
  }[] | null> {
    try {
      const data = await this.makeRequest(`/v3/reference/dividends`, {
        'ticker': symbol,
        'limit': limit.toString(),
        'sort': 'ex_dividend_date',
        'order': 'desc'
      });
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      return data.results.map((result: any) => ({
        ticker: result.ticker,
        exDividendDate: result.ex_dividend_date,
        paymentDate: result.payment_date,
        recordDate: result.record_date,
        declaredDate: result.declaration_date,
        cashAmount: result.cash_amount,
        dividendType: result.dividend_type,
        frequency: result.frequency
      }));
    } catch (error) {
      console.error(`❌ Failed to get Polygon dividends for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get stock splits history for a symbol
   */
  async getSplits(symbol: string, limit = 10): Promise<{
    ticker: string;
    executionDate: string;
    splitFrom: number;
    splitTo: number;
    ratio: number;
  }[] | null> {
    try {
      const data = await this.makeRequest(`/v3/reference/splits`, {
        'ticker': symbol,
        'limit': limit.toString(),
        'sort': 'execution_date',
        'order': 'desc'
      });
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      return data.results.map((result: any) => ({
        ticker: result.ticker,
        executionDate: result.execution_date,
        splitFrom: result.split_from,
        splitTo: result.split_to,
        ratio: result.split_to / result.split_from
      }));
    } catch (error) {
      console.error(`❌ Failed to get Polygon splits for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get market status
   */
  async getMarketStatus(): Promise<{
    isOpen: boolean;
    session?: string;
    nextOpen?: string;
    nextClose?: string;
  } | null> {
    try {
      const data = await this.makeRequest('/v1/marketstatus/now');
      
      if (!data.market) {
        return null;
      }

      return {
        isOpen: data.market === 'open',
        session: data.serverTime ? 'regular' : 'closed',
        // Additional fields would require more detailed parsing
      };
    } catch (error) {
      console.error('❌ Failed to get Polygon market status:', error);
      return null;
    }
  }

  /**
   * Get available tickers (for discovery)
   */
  async getAvailableTickers(
    type = 'CS', // Common Stock
    market = 'stocks',
    active = true,
    limit = 100
  ): Promise<{
    ticker: string;
    name: string;
    market: string;
    type: string;
  }[] | null> {
    try {
      const data = await this.makeRequest('/v3/reference/tickers', {
        type,
        market,
        active: active.toString(),
        limit: limit.toString(),
        sort: 'ticker'
      });
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      return data.results.map((result: any) => ({
        ticker: result.ticker,
        name: result.name,
        market: result.market,
        type: result.type
      }));
    } catch (error) {
      console.error('❌ Failed to get Polygon tickers:', error);
      return null;
    }
  }

  /**
   * Search for tickers by name
   */
  async searchTickers(query: string, limit = 10): Promise<{
    ticker: string;
    name: string;
    market: string;
    type: string;
  }[] | null> {
    try {
      const data = await this.makeRequest('/v3/reference/tickers', {
        search: query,
        active: 'true',
        limit: limit.toString(),
        sort: 'ticker'
      });
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      return data.results.map((result: any) => ({
        ticker: result.ticker,
        name: result.name,
        market: result.market,
        type: result.type
      }));
    } catch (error) {
      console.error(`❌ Failed to search Polygon tickers for "${query}":`, error);
      return null;
    }
  }

  /**
   * Get financial data (requires paid tier)
   */
  async getFinancials(symbol: string): Promise<any | null> {
    try {
      // This endpoint requires paid subscription
      const data = await this.makeRequest(`/vX/reference/financials`, {
        'ticker': symbol,
        'timeframe': 'annual',
        'limit': 1
      });
      
      return data.results || null;
    } catch (error) {
      // Expected to fail on free tier
      console.warn(`⚠️ Polygon financials not available for ${symbol} (requires paid tier)`);
      return null;
    }
  }

  /**
   * Check if service is configured and working
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'error';
    apiKey: string;
    lastResponse?: number;
  }> {
    try {
      const startTime = Date.now();
      await this.makeRequest('/v1/marketstatus/now');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        apiKey: this.apiKey === 'demo' ? 'demo' : 'configured',
        lastResponse: responseTime
      };
    } catch (error) {
      return {
        status: 'error',
        apiKey: this.apiKey === 'demo' ? 'demo' : 'configured'
      };
    }
  }
}