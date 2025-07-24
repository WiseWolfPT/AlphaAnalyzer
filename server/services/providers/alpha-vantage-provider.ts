/**
 * Alpha Vantage Provider for Market Data
 * Free tier: 5 calls/minute, 500 calls/day
 * Priority: 2
 */

import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class AlphaVantageProvider extends BaseProvider {
  private quotaPerMinute = 5;
  private quotaPerDay = 500;
  private callTimestamps: number[] = [];
  private dailyCalls = 0;
  private lastResetDate: string;

  constructor(apiKey: string) {
    super(apiKey, 'https://www.alphavantage.co/query', 'alpha_vantage');
    this.lastResetDate = new Date().toDateString();
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const today = new Date().toDateString();
    
    // Reset daily counter if new day
    if (today !== this.lastResetDate) {
      this.dailyCalls = 0;
      this.lastResetDate = today;
    }
    
    // Check daily limit
    if (this.dailyCalls >= this.quotaPerDay) {
      throw new Error('Alpha Vantage daily quota exceeded');
    }
    
    // Check per-minute limit
    const oneMinuteAgo = now - 60000;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneMinuteAgo);
    
    if (this.callTimestamps.length >= this.quotaPerMinute) {
      const oldestCall = this.callTimestamps[0];
      const waitTime = 60000 - (now - oldestCall);
      
      if (waitTime > 0) {
        console.log(`[Alpha Vantage] Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.callTimestamps.push(now);
    this.dailyCalls++;
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      // Check for rate limit message
      if (response.data.Note) {
        throw new Error('Alpha Vantage API rate limit reached');
      }

      const quote = response.data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        volume: parseInt(quote['06. volume']),
        timestamp: quote['07. latest trading day'],
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getQuote(${symbol})`);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Alpha Vantage doesn't support batch quotes in free tier
    // Implement sequential fetching with proper rate limiting
    const quotes: StockQuote[] = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        quotes.push(quote);
      } catch (error) {
        console.error(`[Alpha Vantage] Failed to fetch ${symbol}:`, error);
        // Don't fail entire batch if one symbol fails
      }
    }
    
    return quotes;
  }

  async getMarketStatus(): Promise<MarketStatus> {
    // Alpha Vantage doesn't provide market status in free tier
    // Return calculated status based on current time
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Convert to ET (UTC-5 or UTC-4 for DST)
    const etHour = (hour - 5 + 24) % 24;
    
    // Market hours: 9:30 AM - 4:00 PM ET
    const isWeekday = day >= 1 && day <= 5;
    const isPreMarket = etHour >= 4 && etHour < 9.5;
    const isMarketHours = etHour >= 9.5 && etHour < 16;
    const isAfterHours = etHour >= 16 && etHour < 20;
    
    return {
      market: 'US',
      isOpen: isWeekday && isMarketHours,
      timezone: 'America/New_York',
      provider: this.name
    };
  }

  async getChartData(symbol: string, period: string): Promise<ChartData> {
    await this.checkRateLimit();
    
    try {
      // Determine the appropriate function and interval
      const { func, interval, outputsize } = this.getChartParams(period);
      
      const params: any = {
        function: func,
        symbol: symbol,
        apikey: this.apiKey,
        outputsize: outputsize
      };
      
      if (interval) {
        params.interval = interval;
      }
      
      const response = await axios.get(this.baseUrl, {
        params,
        timeout: 15000 // Alpha Vantage can be slow
      });

      if (response.data.Note || response.data['Error Message']) {
        throw new Error(response.data.Note || response.data['Error Message']);
      }

      // Extract time series data
      const timeSeriesKey = Object.keys(response.data).find(key => key.includes('Time Series'));
      if (!timeSeriesKey) {
        throw new Error('No time series data found');
      }

      const timeSeries = response.data[timeSeriesKey];
      const data = Object.entries(timeSeries)
        .map(([timestamp, values]: [string, any]) => ({
          timestamp: new Date(timestamp).getTime(),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'] || values['6. volume'] || '0')
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      return {
        symbol: symbol.toUpperCase(),
        data,
        period,
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getChartData(${symbol}, ${period})`);
    }
  }

  private getChartParams(period: string): { func: string; interval?: string; outputsize: string } {
    switch (period.toUpperCase()) {
      case '1D':
        return {
          func: 'TIME_SERIES_INTRADAY',
          interval: '5min',
          outputsize: 'full'
        };
      case '5D':
        return {
          func: 'TIME_SERIES_INTRADAY',
          interval: '30min',
          outputsize: 'full'
        };
      case '1M':
        return {
          func: 'TIME_SERIES_DAILY',
          outputsize: 'compact'
        };
      case '3M':
        return {
          func: 'TIME_SERIES_DAILY',
          outputsize: 'full'
        };
      case '6M':
        return {
          func: 'TIME_SERIES_DAILY',
          outputsize: 'full'
        };
      case '1Y':
        return {
          func: 'TIME_SERIES_DAILY',
          outputsize: 'full'
        };
      case '5Y':
        return {
          func: 'TIME_SERIES_WEEKLY',
          outputsize: 'full'
        };
      default:
        // Default to daily for 1 month
        return {
          func: 'TIME_SERIES_DAILY',
          outputsize: 'compact'
        };
    }
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
    // Alpha Vantage doesn't provide quota info in response
    // We track it internally
    this.quotaRemaining = this.quotaPerDay - this.dailyCalls;
  }
}