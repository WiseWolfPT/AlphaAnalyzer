/**
 * Twelve Data Provider for Market Data
 * Free tier: 8 requests/minute, 800 requests/day
 * Priority: 4
 */

import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class TwelveDataProvider extends BaseProvider {
  private quotaPerMinute = 8;
  private quotaPerDay = 800;
  private callTimestamps: number[] = [];
  private dailyCalls = 0;
  private lastResetDate: string;

  constructor(apiKey: string) {
    super(apiKey, 'https://api.twelvedata.com', 'twelve_data');
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
      throw new Error('Twelve Data daily quota exceeded');
    }
    
    // Check per-minute limit
    const oneMinuteAgo = now - 60000;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneMinuteAgo);
    
    if (this.callTimestamps.length >= this.quotaPerMinute) {
      const oldestCall = this.callTimestamps[0];
      const waitTime = 60000 - (now - oldestCall);
      
      if (waitTime > 0) {
        console.log(`[Twelve Data] Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.callTimestamps.push(now);
    this.dailyCalls++;
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/quote`,
        {
          params: {
            symbol: symbol,
            apikey: this.apiKey
          },
          timeout: 10000
        }
      );

      const data = response.data;
      
      // Check for errors
      if (data.code === 400 || data.status === 'error') {
        throw new Error(data.message || `No data found for symbol ${symbol}`);
      }

      // Parse the quote data
      const price = parseFloat(data.close);
      const previousClose = parseFloat(data.previous_close);
      const change = parseFloat(data.change) || (price - previousClose);
      const changePercent = parseFloat(data.percent_change) || ((change / previousClose) * 100);

      return {
        symbol: data.symbol,
        price: price,
        change: change,
        changePercent: changePercent,
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        open: parseFloat(data.open),
        previousClose: previousClose,
        volume: parseInt(data.volume) || 0,
        timestamp: data.datetime || new Date().toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getQuote(${symbol})`);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Twelve Data supports batch quotes!
    await this.checkRateLimit();
    
    try {
      // Twelve Data allows up to 120 symbols per request
      const maxBatchSize = 120;
      const quotes: StockQuote[] = [];
      
      for (let i = 0; i < symbols.length; i += maxBatchSize) {
        const batch = symbols.slice(i, i + maxBatchSize);
        
        const response = await axios.get(
          `${this.baseUrl}/quote`,
          {
            params: {
              symbol: batch.join(','),
              apikey: this.apiKey
            },
            timeout: 15000
          }
        );

        // Handle single symbol response vs batch response
        const results = Array.isArray(response.data) ? response.data : [response.data];
        
        for (const data of results) {
          if (data.code === 400 || data.status === 'error') {
            console.error(`[Twelve Data] Error for symbol: ${data.message}`);
            continue;
          }

          const price = parseFloat(data.close);
          const previousClose = parseFloat(data.previous_close);
          const change = parseFloat(data.change) || (price - previousClose);
          const changePercent = parseFloat(data.percent_change) || ((change / previousClose) * 100);

          quotes.push({
            symbol: data.symbol,
            price: price,
            change: change,
            changePercent: changePercent,
            high: parseFloat(data.high),
            low: parseFloat(data.low),
            open: parseFloat(data.open),
            previousClose: previousClose,
            volume: parseInt(data.volume) || 0,
            timestamp: data.datetime || new Date().toISOString(),
            provider: this.name
          });
        }
        
        // Delay between batches if needed
        if (i + maxBatchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return quotes;
    } catch (error) {
      this.handleApiError(error, `getBatchQuotes(${symbols.length} symbols)`);
    }
  }

  async getMarketStatus(): Promise<MarketStatus> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/market_state`,
        {
          params: {
            exchange: 'NYSE',
            apikey: this.apiKey
          },
          timeout: 5000
        }
      );

      const data = response.data;
      
      return {
        market: 'US',
        isOpen: data.is_market_open || false,
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
      const { interval, outputsize } = this.getChartParams(period);
      
      const response = await axios.get(
        `${this.baseUrl}/time_series`,
        {
          params: {
            symbol: symbol,
            interval: interval,
            outputsize: outputsize,
            apikey: this.apiKey
          },
          timeout: 15000
        }
      );

      const data = response.data;
      
      if (data.code === 400 || data.status === 'error') {
        throw new Error(data.message || `No chart data found for ${symbol}`);
      }

      // Transform the data
      const values = data.values || [];
      const chartData = values.map((bar: any) => ({
        timestamp: new Date(bar.datetime).getTime(),
        open: parseFloat(bar.open),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
        close: parseFloat(bar.close),
        volume: parseInt(bar.volume) || 0
      })).reverse(); // Twelve Data returns newest first

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

  private getChartParams(period: string): { interval: string; outputsize: number } {
    switch (period.toUpperCase()) {
      case '1D':
        return { interval: '5min', outputsize: 78 }; // ~390 minutes in trading day / 5
      case '5D':
        return { interval: '30min', outputsize: 65 }; // ~5 days of 30min bars
      case '1M':
        return { interval: '1day', outputsize: 30 };
      case '3M':
        return { interval: '1day', outputsize: 90 };
      case '6M':
        return { interval: '1day', outputsize: 180 };
      case '1Y':
        return { interval: '1day', outputsize: 365 };
      case '5Y':
        return { interval: '1week', outputsize: 260 };
      default:
        // Default to 1 month
        return { interval: '1day', outputsize: 30 };
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
    // Twelve Data provides quota info in response headers
    // X-API-Calls-Left header contains remaining calls
    if (remaining !== undefined) {
      this.quotaRemaining = remaining;
    } else {
      // Fallback to internal tracking
      this.quotaRemaining = this.quotaPerDay - this.dailyCalls;
    }
  }
}