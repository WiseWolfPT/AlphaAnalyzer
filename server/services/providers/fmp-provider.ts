/**
 * Financial Modeling Prep (FMP) Provider for Market Data
 * Starter Plan: $19/month with 300 requests/minute
 * Priority: 3 (medium - reliable with good rate limits)
 * 
 * IMPORTANT: Rate limiting is critical to avoid exceeding quota!
 */

import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class FMPProvider extends BaseProvider {
  // Starter Plan: 300 calls per minute
  private quotaPerMinute = 300;
  private callsThisMinute = 0;
  private minuteResetTime = Date.now();
  
  // Track daily usage for monitoring
  private totalCallsToday = 0;
  private dailyResetTime = Date.now();

  constructor(apiKey: string) {
    super(apiKey, 'https://financialmodelingprep.com/api/v3', 'fmp');
    console.log('[FMP] Initialized with Starter plan (300 calls/min)');
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
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/quote/${symbol}`,
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
        throw new Error(`No data found for symbol ${symbol}`);
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
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getQuote(${symbol})`);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // FMP supports batch quotes with comma-separated symbols
    await this.checkRateLimit();
    
    try {
      // FMP allows multiple symbols in one request
      const symbolsStr = symbols.join(',');
      
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
        provider: this.name
      }));
    } catch (error) {
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
    }
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
}