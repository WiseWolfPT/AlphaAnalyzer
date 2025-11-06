/**
 * Financial Modeling Prep (FMP) Provider for Market Data
 * Starter Plan: $19/month with 300 requests/minute
 * Priority: 3 (medium - reliable with good rate limits)
 *
 * IMPORTANT: Rate limiting is critical to avoid exceeding quota!
 */

import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';
import { SymbolMapperService } from '../symbol-mapper-service';

/**
 * AGENT 6: Batch Financial Data Types
 *
 * Types for batch financial data fetching system that enables
 * warming workers to populate cache with 98% fewer API calls
 */

/**
 * Complete financial data for a single stock
 * Includes all datasets needed for intrinsic value calculations
 */
export interface BatchFinancialData {
  symbol: string;
  quote: StockQuote | null;           // Real-time price data
  income: any | null;                 // Income statement (TTM)
  balance: any | null;                // Balance sheet (TTM)
  cashFlow: any | null;               // Cash flow statement (TTM)
  ratios: any | null;                 // Financial ratios (TTM)
  profile: any | null;                // Company profile (sector, industry, beta)
  keyMetrics: any | null;             // Key metrics (P/E, P/B, EV/EBITDA, etc.)
  fetchedAt: string;                  // ISO timestamp of fetch
  completeness: number;               // Percentage of datasets successfully fetched (0-100)
}

export class FMPProvider extends BaseProvider {
  // Starter Plan: 300 calls per minute
  private quotaPerMinute = 300;
  private callsThisMinute = 0;
  private minuteResetTime = Date.now();

  // Track daily usage for monitoring
  private totalCallsToday = 0;
  private dailyResetTime = Date.now();

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  // Symbol mapper for exchange suffix normalization
  private symbolMapper = new SymbolMapperService();

  constructor(apiKey: string) {
    super(apiKey, 'https://financialmodelingprep.com/api/v3', 'fmp');
    console.log('[FMP] Initialized with Starter plan (300 calls/min)');
  }

  /**
   * Retry wrapper with exponential backoff for API calls
   */
  private async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    context: string,
    retries = 0
  ): Promise<T> {
    try {
      return await fetchFn();
    } catch (error: any) {
      // Check if it's a rate limit error (HTTP 429)
      const isRateLimit = error.response?.status === 429 ||
                          error.message?.toLowerCase().includes('rate limit');

      // Check if we should retry
      if (retries < this.MAX_RETRIES && (isRateLimit || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
        const delay = this.RETRY_DELAYS[retries];
        console.warn(`[FMP] ${context} - Retry ${retries + 1}/${this.MAX_RETRIES} after ${delay}ms (reason: ${error.response?.status || error.code || 'network error'})`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(fetchFn, context, retries + 1);
      }

      // Max retries reached or non-retryable error
      throw error;
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset minute counter
    if (now - this.minuteResetTime > 60000) {
      console.log(`[FMP] Minute reset: ${this.callsThisMinute} calls used`);
      this.callsThisMinute = 0;
      this.minuteResetTime = now;
    }
    
    // Reset daily counter
    if (now - this.dailyResetTime > 24 * 60 * 60 * 1000) {
      console.log(`[FMP] Daily reset: ${this.totalCallsToday} total calls`);
      this.totalCallsToday = 0;
      this.dailyResetTime = now;
    }
    
    // Check minute limit with buffer
    const safeLimit = this.quotaPerMinute - 10; // Leave 10 calls buffer
    if (this.callsThisMinute >= safeLimit) {
      const waitTime = 60000 - (now - this.minuteResetTime);
      console.warn(`[FMP] Rate limit approaching, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after wait
      this.callsThisMinute = 0;
      this.minuteResetTime = Date.now();
    }
    
    this.callsThisMinute++;
    this.totalCallsToday++;
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    // Normalize symbol for FMP API (e.g., JMT-LS → JMT.LS)
    const normalizedSymbol = this.symbolMapper.normalizeFmpSymbol(symbol);
    const alternatives = this.symbolMapper.getAlternativeSymbols(symbol);

    console.log(`[FMP] getQuote: ${symbol} → normalized: ${normalizedSymbol}, alternatives: [${alternatives.join(', ')}]`);

    // Try primary normalized symbol first
    let lastError: any;
    for (const symbolVariant of alternatives) {
      try {
        await this.checkRateLimit();

        const result = await this.fetchWithRetry(async () => {
          const response = await axios.get(
            `${this.baseUrl}/quote/${symbolVariant}`,
            {
              params: {
                apikey: this.apiKey
              },
              timeout: 10000
            }
          );

          const data = response.data;

          // FMP returns an array even for single quotes
          if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`No data found for symbol ${symbolVariant}`);
          }

          const quote = data[0];

          return {
            symbol: quote.symbol,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changesPercentage,
            high: quote.dayHigh,
            low: quote.dayLow,
            open: quote.open,
            previousClose: quote.previousClose,
            volume: quote.volume,
            marketCap: quote.marketCap,
            eps: quote.eps,
            pe: quote.pe,
            timestamp: new Date(quote.timestamp * 1000).toISOString(),
            provider: this.name,
            // After-hours and pre-market data
            afterMarketPrice: quote.afterMarketPrice ?? null,
            afterMarketChange: quote.afterMarketChange ?? null,
            afterMarketChangePercentage: quote.afterMarketChangePercentage ?? null,
            preMarketPrice: quote.preMarketPrice ?? null,
            preMarketChange: quote.preMarketChange ?? null,
            preMarketChangePercentage: quote.preMarketChangePercentage ?? null
          };
        }, `getQuote(${symbolVariant})`);

        console.log(`[FMP] ✅ Success with symbol variant: ${symbolVariant} (original: ${symbol})`);
        return result;

      } catch (error: any) {
        lastError = error;
        console.warn(`[FMP] ⚠️ Failed with symbol variant: ${symbolVariant} (error: ${error.message})`);

        // If this wasn't the last alternative, continue trying
        if (symbolVariant !== alternatives[alternatives.length - 1]) {
          console.log(`[FMP] 🔄 Trying next alternative...`);
          continue;
        }
      }
    }

    // All alternatives failed
    console.error(`[FMP] ❌ All symbol variants failed for ${symbol} (tried: ${alternatives.join(', ')})`);
    this.handleApiError(lastError, `getQuote(${symbol})`);
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Normalize all symbols for FMP API
    const normalizedSymbols = symbols.map(s => this.symbolMapper.normalizeFmpSymbol(s));

    console.log(`[FMP] getBatchQuotes: normalizing ${symbols.length} symbols`);
    const differences = symbols
      .map((orig, i) => orig !== normalizedSymbols[i] ? `${orig} → ${normalizedSymbols[i]}` : null)
      .filter(Boolean);

    if (differences.length > 0) {
      console.log(`[FMP] Symbol normalizations: ${differences.join(', ')}`);
    }

    // FMP supports batch quotes with comma-separated symbols
    await this.checkRateLimit();

    return this.fetchWithRetry(async () => {
      // FMP allows multiple symbols in one request
      const symbolsStr = normalizedSymbols.join(',');

      const response = await axios.get(
        `${this.baseUrl}/quote/${symbolsStr}`,
        {
          params: {
            apikey: this.apiKey
          },
          timeout: 15000
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch quote');
      }

      return data.map(quote => ({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        high: quote.dayHigh,
        low: quote.dayLow,
        open: quote.open,
        previousClose: quote.previousClose,
        volume: quote.volume,
        marketCap: quote.marketCap,
        eps: quote.eps,
        pe: quote.pe,
        timestamp: new Date(quote.timestamp * 1000).toISOString(),
        provider: this.name,
        // After-hours and pre-market data
        afterMarketPrice: quote.afterMarketPrice ?? null,
        afterMarketChange: quote.afterMarketChange ?? null,
        afterMarketChangePercentage: quote.afterMarketChangePercentage ?? null,
        preMarketPrice: quote.preMarketPrice ?? null,
        preMarketChange: quote.preMarketChange ?? null,
        preMarketChangePercentage: quote.preMarketChangePercentage ?? null
      }));
    }, `getBatchQuotes(${symbols.length} symbols)`).catch(async (error) => {
      // Fallback to individual fetches if batch fails
      console.error('[FMP] Batch quote failed, falling back to individual fetches');
      const quotes: StockQuote[] = [];

      for (const symbol of symbols) {
        try {
          const quote = await this.getQuote(symbol);
          quotes.push(quote);
        } catch (err) {
          console.error(`[FMP] Failed to fetch ${symbol}:`, err);
        }
      }

      return quotes;
    });
  }

  /**
   * Get API usage statistics
   */
  getUsageStats() {
    return {
      provider: 'FMP',
      callsThisMinute: this.callsThisMinute,
      quotaPerMinute: this.quotaPerMinute,
      totalCallsToday: this.totalCallsToday,
      percentOfMinuteQuota: Math.round((this.callsThisMinute / this.quotaPerMinute) * 100),
      isApproachingLimit: this.callsThisMinute >= (this.quotaPerMinute * 0.8),
      nextReset: new Date(this.minuteResetTime + 60000).toISOString()
    };
  }

  async getMarketStatus(): Promise<MarketStatus> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/is-the-market-open`,
        {
          params: {
            apikey: this.apiKey
          },
          timeout: 5000
        }
      );

      const data = response.data;
      
      return {
        market: 'US',
        isOpen: data.isTheStockMarketOpen || false,
        timezone: 'America/New_York',
        provider: this.name
      };
    } catch (error) {
      // Fallback to calculated status
      const now = new Date();
      const hour = now.getUTCHours();
      const day = now.getUTCDay();
      
      const isWeekday = day >= 1 && day <= 5;
      const isMarketHours = hour >= 14 && hour < 21;
      
      return {
        market: 'US',
        isOpen: isWeekday && isMarketHours,
        timezone: 'America/New_York',
        provider: this.name
      };
    }
  }

  async getChartData(symbol: string, period: string): Promise<ChartData> {
    await this.checkRateLimit();
    
    try {
      const { interval, from, to } = this.getChartParams(period);
      
      let endpoint: string;
      let params: any = { apikey: this.apiKey };
      
      if (interval === 'intraday') {
        // Use intraday endpoint for 1D and 5D
        endpoint = `${this.baseUrl}/historical-chart/5min/${symbol}`;
      } else {
        // Use daily historical for longer periods
        endpoint = `${this.baseUrl}/historical-price-full/${symbol}`;
        params.from = from;
        params.to = to;
      }
      
      const response = await axios.get(endpoint, {
        params,
        timeout: 15000
      });

      let data: any[];
      
      if (interval === 'intraday') {
        data = response.data || [];
      } else {
        // Daily data is nested under 'historical'
        data = response.data.historical || [];
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No chart data found for ${symbol}`);
      }

      // Transform and filter data based on period
      const chartData = data
        .filter((bar: any) => {
          const barDate = new Date(bar.date).getTime();
          const fromDate = new Date(from).getTime();
          const toDate = new Date(to).getTime();
          return barDate >= fromDate && barDate <= toDate;
        })
        .map((bar: any) => ({
          timestamp: new Date(bar.date).getTime(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume || 0
        }))
        .reverse(); // FMP returns newest first, reverse for chronological order

      return {
        symbol: symbol.toUpperCase(),
        data: chartData,
        period,
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getChartData(${symbol}, ${period})`);
    }
  }

  private getChartParams(period: string): { interval: string; from: string; to: string } {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;
    let interval = 'daily';

    switch (period.toUpperCase()) {
      case '1D':
        from = to; // Same day
        interval = 'intraday';
        break;
      case '5D':
        from = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        interval = 'intraday';
        break;
      case '1M':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '3M':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '6M':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1Y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '5Y':
        from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        // Default to 1 month
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { interval, from, to };
  }

  checkQuota(): boolean {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyCalls = 0;
      this.lastResetDate = today;
    }
    return this.dailyCalls < this.quotaPerDay;
  }

  updateQuota(remaining: number): void {
    // FMP doesn't provide quota info in response
    // We track it internally
    this.quotaRemaining = this.quotaPerDay - this.dailyCalls;
  }

  /**
   * Get fundamental data for a symbol
   */
  async getFundamentals(symbol: string): Promise<any> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/profile/${symbol}`,
        {
          params: {
            apikey: this.apiKey
          },
          timeout: 10000
        }
      );

      const data = response.data;
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No fundamental data found for ${symbol}`);
      }

      const fundamentals = data[0];
      
      return {
        symbol: fundamentals.symbol,
        companyName: fundamentals.companyName,
        exchange: fundamentals.exchangeShortName,
        industry: fundamentals.industry,
        sector: fundamentals.sector,
        marketCap: fundamentals.mktCap,
        price: fundamentals.price,
        beta: fundamentals.beta,
        volAvg: fundamentals.volAvg,
        lastDiv: fundamentals.lastDiv,
        changes: fundamentals.changes,
        ceo: fundamentals.ceo,
        description: fundamentals.description,
        website: fundamentals.website,
        country: fundamentals.country,
        employees: fundamentals.fullTimeEmployees,
        timestamp: new Date().toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getFundamentals(${symbol})`);
    }
  }

  /**
   * Get historical price data
   */
  async getHistorical(symbol: string, period: string = '1m'): Promise<any> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/historical-price-full/${symbol}`,
        {
          params: {
            apikey: this.apiKey,
            from: this.getHistoricalDateRange(period).from,
            to: this.getHistoricalDateRange(period).to
          },
          timeout: 15000
        }
      );

      const data = response.data;
      
      if (!data || !data.historical) {
        throw new Error(`No historical data found for ${symbol}`);
      }

      return {
        symbol: data.symbol,
        historical: data.historical.map((bar: any) => ({
          date: bar.date,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          change: bar.change,
          changePercent: bar.changePercent
        })),
        period,
        timestamp: new Date().toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getHistorical(${symbol}, ${period})`);
    }
  }

  /**
   * Get news for a symbol
   */
  async getNews(symbol: string, limit: number = 10): Promise<any> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/stock_news`,
        {
          params: {
            apikey: this.apiKey,
            tickers: symbol,
            limit
          },
          timeout: 10000
        }
      );

      const data = response.data;
      
      if (!Array.isArray(data)) {
        throw new Error(`Invalid news response for ${symbol}`);
      }

      return {
        symbol,
        articles: data.map((article: any) => ({
          title: article.title,
          text: article.text,
          site: article.site,
          publishedDate: article.publishedDate,
          url: article.url,
          image: article.image
        })),
        count: data.length,
        timestamp: new Date().toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getNews(${symbol}, ${limit})`);
    }
  }

  private getHistoricalDateRange(period: string): { from: string; to: string } {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;

    switch (period.toLowerCase()) {
      case '1d':
        from = to;
        break;
      case '1w':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1m':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '3m':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '6m':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { from, to };
  }

  /**
   * ========================================
   * BATCH FINANCIAL DATA METHODS (AGENT 6)
   * ========================================
   * These methods enable fetching multiple stocks' financial data
   * in a single API call, reducing API consumption by ~98%
   */

  /**
   * Fetch income statements for multiple stocks in a single API call
   * @param symbols - Array of stock symbols (max 100)
   * @param limit - Number of periods to fetch per symbol (default: 1 for latest)
   * @returns Array of income statement data grouped by symbol
   */
  async getBatchIncomeStatements(symbols: string[], limit: number = 1): Promise<any[]> {
    if (symbols.length === 0) {
      return [];
    }

    if (symbols.length > 100) {
      throw new Error('Maximum 100 symbols per batch. Please chunk your request into multiple batches of ≤100 symbols each.');
    }

    await this.checkRateLimit();

    return this.fetchWithRetry(async () => {
      const symbolsStr = symbols.join(',');
      const response = await axios.get(
        `${this.baseUrl}/income-statement/${symbolsStr}`,
        {
          params: {
            apikey: this.apiKey,
            limit
          },
          timeout: 15000
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch income statements');
      }

      return data;
    }, `getBatchIncomeStatements(${symbols.length} symbols)`).catch((error) => {
      console.error('[FMP] Batch income statements failed:', error.message);
      // Return empty array on failure - caller should handle missing data
      return [];
    });
  }

  /**
   * Fetch balance sheets for multiple stocks in a single API call
   * @param symbols - Array of stock symbols (max 100)
   * @param limit - Number of periods to fetch per symbol (default: 1 for latest)
   * @returns Array of balance sheet data grouped by symbol
   */
  async getBatchBalanceSheets(symbols: string[], limit: number = 1): Promise<any[]> {
    if (symbols.length === 0) {
      return [];
    }

    if (symbols.length > 100) {
      throw new Error('Maximum 100 symbols per batch. Please chunk your request into multiple batches of ≤100 symbols each.');
    }

    await this.checkRateLimit();

    return this.fetchWithRetry(async () => {
      const symbolsStr = symbols.join(',');
      const response = await axios.get(
        `${this.baseUrl}/balance-sheet-statement/${symbolsStr}`,
        {
          params: {
            apikey: this.apiKey,
            limit
          },
          timeout: 15000
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch balance sheets');
      }

      return data;
    }, `getBatchBalanceSheets(${symbols.length} symbols)`).catch((error) => {
      console.error('[FMP] Batch balance sheets failed:', error.message);
      return [];
    });
  }

  /**
   * Fetch cash flow statements for multiple stocks in a single API call
   * @param symbols - Array of stock symbols (max 100)
   * @param limit - Number of periods to fetch per symbol (default: 1 for latest)
   * @returns Array of cash flow data grouped by symbol
   */
  async getBatchCashFlows(symbols: string[], limit: number = 1): Promise<any[]> {
    if (symbols.length === 0) {
      return [];
    }

    if (symbols.length > 100) {
      throw new Error('Maximum 100 symbols per batch. Please chunk your request into multiple batches of ≤100 symbols each.');
    }

    await this.checkRateLimit();

    return this.fetchWithRetry(async () => {
      const symbolsStr = symbols.join(',');
      const response = await axios.get(
        `${this.baseUrl}/cash-flow-statement/${symbolsStr}`,
        {
          params: {
            apikey: this.apiKey,
            limit
          },
          timeout: 15000
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch cash flows');
      }

      return data;
    }, `getBatchCashFlows(${symbols.length} symbols)`).catch((error) => {
      console.error('[FMP] Batch cash flows failed:', error.message);
      return [];
    });
  }

  /**
   * Fetch financial ratios for multiple stocks in a single API call
   * @param symbols - Array of stock symbols (max 100)
   * @param limit - Number of periods to fetch per symbol (default: 1 for latest)
   * @returns Array of financial ratios data grouped by symbol
   */
  async getBatchRatios(symbols: string[], limit: number = 1): Promise<any[]> {
    if (symbols.length === 0) {
      return [];
    }

    if (symbols.length > 100) {
      throw new Error('Maximum 100 symbols per batch. Please chunk your request into multiple batches of ≤100 symbols each.');
    }

    await this.checkRateLimit();

    return this.fetchWithRetry(async () => {
      const symbolsStr = symbols.join(',');
      const response = await axios.get(
        `${this.baseUrl}/ratios/${symbolsStr}`,
        {
          params: {
            apikey: this.apiKey,
            limit
          },
          timeout: 15000
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch ratios');
      }

      return data;
    }, `getBatchRatios(${symbols.length} symbols)`).catch((error) => {
      console.error('[FMP] Batch ratios failed:', error.message);
      return [];
    });
  }

  /**
   * Fetch company profiles for multiple stocks in a single API call
   * @param symbols - Array of stock symbols (max 100)
   * @returns Array of company profile data
   */
  async getBatchProfiles(symbols: string[]): Promise<any[]> {
    if (symbols.length === 0) {
      return [];
    }

    if (symbols.length > 100) {
      throw new Error('Maximum 100 symbols per batch. Please chunk your request into multiple batches of ≤100 symbols each.');
    }

    await this.checkRateLimit();

    return this.fetchWithRetry(async () => {
      const symbolsStr = symbols.join(',');
      const response = await axios.get(
        `${this.baseUrl}/profile/${symbolsStr}`,
        {
          params: {
            apikey: this.apiKey
          },
          timeout: 15000
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch profiles');
      }

      return data;
    }, `getBatchProfiles(${symbols.length} symbols)`).catch((error) => {
      console.error('[FMP] Batch profiles failed:', error.message);
      return [];
    });
  }

  /**
   * Fetch key metrics (TTM) for multiple stocks in a single API call
   * @param symbols - Array of stock symbols (max 100)
   * @param limit - Number of periods to fetch per symbol (default: 1 for latest)
   * @returns Array of key metrics data grouped by symbol
   */
  async getBatchKeyMetricsTTM(symbols: string[], limit: number = 1): Promise<any[]> {
    if (symbols.length === 0) {
      return [];
    }

    if (symbols.length > 100) {
      throw new Error('Maximum 100 symbols per batch. Please chunk your request into multiple batches of ≤100 symbols each.');
    }

    await this.checkRateLimit();

    return this.fetchWithRetry(async () => {
      const symbolsStr = symbols.join(',');
      const response = await axios.get(
        `${this.baseUrl}/key-metrics-ttm/${symbolsStr}`,
        {
          params: {
            apikey: this.apiKey,
            limit
          },
          timeout: 15000
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch key metrics');
      }

      return data;
    }, `getBatchKeyMetricsTTM(${symbols.length} symbols)`).catch((error) => {
      console.error('[FMP] Batch key metrics failed:', error.message);
      return [];
    });
  }

  /**
   * MASTER BATCH METHOD: Fetch ALL financial data for multiple stocks in parallel
   *
   * This is the primary method that warming workers will use to populate cache.
   * Fetches 7 datasets in parallel (7 API calls total for up to 100 stocks).
   *
   * @param symbols - Array of stock symbols (max 100)
   * @returns Map of symbol → complete financial data
   *
   * @example
   * const data = await fmpProvider.getBatchFinancialData(['AAPL', 'MSFT', 'GOOGL']);
   * const appleData = data.get('AAPL');
   * console.log(appleData.quote.price, appleData.income?.revenue);
   */
  async getBatchFinancialData(symbols: string[]): Promise<Map<string, BatchFinancialData>> {
    if (symbols.length === 0) {
      return new Map();
    }

    if (symbols.length > 100) {
      throw new Error('Maximum 100 symbols per batch. Please chunk your request into multiple batches of ≤100 symbols each.');
    }

    console.log(`[FMP] Fetching batch financial data for ${symbols.length} symbols (7 parallel API calls)...`);

    try {
      // Fetch all endpoints in parallel (7 API calls total)
      const [quotes, incomes, balances, cashFlows, ratios, profiles, keyMetrics] = await Promise.all([
        this.getBatchQuotes(symbols),
        this.getBatchIncomeStatements(symbols, 1), // Latest period only
        this.getBatchBalanceSheets(symbols, 1),
        this.getBatchCashFlows(symbols, 1),
        this.getBatchRatios(symbols, 1),
        this.getBatchProfiles(symbols),
        this.getBatchKeyMetricsTTM(symbols, 1)
      ]);

      // Organize by symbol
      const result = new Map<string, BatchFinancialData>();

      for (const symbol of symbols) {
        const symbolUpper = symbol.toUpperCase();

        // Find matching data for this symbol
        const quote = quotes.find(q => q.symbol === symbolUpper);
        const income = incomes.find(i => i.symbol === symbolUpper);
        const balance = balances.find(b => b.symbol === symbolUpper);
        const cashFlow = cashFlows.find(c => c.symbol === symbolUpper);
        const ratio = ratios.find(r => r.symbol === symbolUpper);
        const profile = profiles.find(p => p.symbol === symbolUpper);
        const keyMetric = keyMetrics.find(k => k.symbol === symbolUpper);

        result.set(symbol, {
          symbol: symbolUpper,
          quote: quote || null,
          income: income || null,
          balance: balance || null,
          cashFlow: cashFlow || null,
          ratios: ratio || null,
          profile: profile || null,
          keyMetrics: keyMetric || null,
          fetchedAt: new Date().toISOString(),
          completeness: this.calculateCompleteness(quote, income, balance, cashFlow, ratio, profile, keyMetric)
        });
      }

      console.log(`[FMP] Batch fetch complete: ${result.size}/${symbols.length} symbols, avg completeness: ${this.calculateAverageCompleteness(result)}%`);

      return result;

    } catch (error: any) {
      console.error('[FMP] Batch financial data failed:', error.message);
      throw new Error(`Failed to fetch batch financial data: ${error.message}`);
    }
  }

  /**
   * Calculate data completeness percentage for a single stock
   * @returns Completeness score 0-100
   */
  private calculateCompleteness(...datasets: any[]): number {
    const nonNullCount = datasets.filter(d => d !== null && d !== undefined).length;
    return Math.round((nonNullCount / datasets.length) * 100);
  }

  /**
   * Calculate average completeness across all stocks in batch
   */
  private calculateAverageCompleteness(data: Map<string, BatchFinancialData>): number {
    if (data.size === 0) return 0;

    const totalCompleteness = Array.from(data.values())
      .reduce((sum, item) => sum + item.completeness, 0);

    return Math.round(totalCompleteness / data.size);
  }
}