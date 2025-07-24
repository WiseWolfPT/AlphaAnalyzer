/**
 * Finnhub Provider for Market Data
 * Free tier: 60 calls/minute
 * Priority: 3
 */

import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class FinnhubProvider extends BaseProvider {
  private quotaPerMinute = 60;
  private callTimestamps: number[] = [];

  constructor(apiKey: string) {
    super(apiKey, 'https://finnhub.io/api/v1', 'finnhub');
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove timestamps older than 1 minute
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneMinuteAgo);
    
    if (this.callTimestamps.length >= this.quotaPerMinute) {
      const oldestCall = this.callTimestamps[0];
      const waitTime = 60000 - (now - oldestCall);
      
      if (waitTime > 0) {
        console.log(`[Finnhub] Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.callTimestamps.push(now);
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/quote`,
        {
          params: {
            symbol: symbol,
            token: this.apiKey
          },
          timeout: 10000
        }
      );

      const data = response.data;
      
      // Check if we have valid data
      if (!data || data.c === 0 || data.c === null) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      // Calculate change and change percent
      const change = data.d || (data.c - data.pc);
      const changePercent = data.dp || ((change / data.pc) * 100);

      return {
        symbol: symbol.toUpperCase(),
        price: data.c,
        change: change,
        changePercent: changePercent,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        volume: data.v || 0,
        timestamp: new Date(data.t * 1000).toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getQuote(${symbol})`);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Finnhub doesn't have a true batch endpoint, but we can make concurrent requests
    // since we have 60 calls/minute quota
    const batchSize = 10; // Process 10 symbols at a time
    const quotes: StockQuote[] = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          return await this.getQuote(symbol);
        } catch (error) {
          console.error(`[Finnhub] Failed to fetch ${symbol}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(batchPromises);
      quotes.push(...results.filter((q): q is StockQuote => q !== null));
      
      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return quotes;
  }

  async getMarketStatus(): Promise<MarketStatus> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/stock/market-status`,
        {
          params: {
            exchange: 'US',
            token: this.apiKey
          },
          timeout: 5000
        }
      );

      const data = response.data;
      
      return {
        market: 'US',
        isOpen: data.isOpen || false,
        timezone: data.timezone || 'America/New_York',
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
      const { resolution, from, to } = this.getChartParams(period);
      
      const response = await axios.get(
        `${this.baseUrl}/stock/candle`,
        {
          params: {
            symbol: symbol,
            resolution: resolution,
            from: from,
            to: to,
            token: this.apiKey
          },
          timeout: 10000
        }
      );

      const data = response.data;
      
      if (data.s !== 'ok' || !data.t || data.t.length === 0) {
        throw new Error(`No chart data found for ${symbol}`);
      }

      // Transform the data
      const chartData = data.t.map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000,
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
        volume: data.v[index] || 0
      }));

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

  private getChartParams(period: string): { resolution: string; from: number; to: number } {
    const now = Math.floor(Date.now() / 1000);
    let from: number;
    let resolution: string;

    switch (period.toUpperCase()) {
      case '1D':
        from = now - 24 * 60 * 60;
        resolution = '5'; // 5 minutes
        break;
      case '5D':
        from = now - 5 * 24 * 60 * 60;
        resolution = '30'; // 30 minutes
        break;
      case '1M':
        from = now - 30 * 24 * 60 * 60;
        resolution = 'D'; // Daily
        break;
      case '3M':
        from = now - 90 * 24 * 60 * 60;
        resolution = 'D';
        break;
      case '6M':
        from = now - 180 * 24 * 60 * 60;
        resolution = 'D';
        break;
      case '1Y':
        from = now - 365 * 24 * 60 * 60;
        resolution = 'D';
        break;
      case '5Y':
        from = now - 5 * 365 * 24 * 60 * 60;
        resolution = 'W'; // Weekly
        break;
      default:
        // Default to 1 month
        from = now - 30 * 24 * 60 * 60;
        resolution = 'D';
    }

    return { resolution, from, to: now };
  }

  checkQuota(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentCalls = this.callTimestamps.filter(ts => ts > oneMinuteAgo).length;
    return recentCalls < this.quotaPerMinute;
  }

  updateQuota(remaining: number): void {
    // Finnhub doesn't provide quota info in response headers
    // We track it internally based on call timestamps
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentCalls = this.callTimestamps.filter(ts => ts > oneMinuteAgo).length;
    this.quotaRemaining = this.quotaPerMinute - recentCalls;
  }
}