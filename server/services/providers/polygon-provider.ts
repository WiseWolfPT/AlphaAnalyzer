/**
 * Polygon.io Provider for Market Data
 * Free tier: 5 calls/minute
 * Priority: 1 (highest)
 */

import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class PolygonProvider extends BaseProvider {
  private quotaPerMinute = 5;
  private callTimestamps: number[] = [];

  constructor(apiKey: string) {
    super(apiKey, 'https://api.polygon.io', 'polygon');
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
        console.log(`[Polygon] Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.callTimestamps.push(now);
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    await this.checkRateLimit();
    
    try {
      // Get previous day's data (most reliable for free tier)
      const response = await axios.get(
        `${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`,
        {
          params: { apiKey: this.apiKey },
          timeout: 10000
        }
      );

      if (response.data.status !== 'OK' || !response.data.results?.length) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      const data = response.data.results[0];
      
      // Get current quote for real-time price (if available)
      let currentPrice = data.c; // close price as fallback
      let volume = data.v;
      
      try {
        await this.checkRateLimit();
        const quoteResponse = await axios.get(
          `${this.baseUrl}/v3/quotes/${symbol}`,
          {
            params: { apiKey: this.apiKey },
            timeout: 5000
          }
        );
        
        if (quoteResponse.data.status === 'OK' && quoteResponse.data.results?.length) {
          const latestQuote = quoteResponse.data.results[0];
          currentPrice = latestQuote.bid_price || latestQuote.ask_price || currentPrice;
          volume = latestQuote.day_volume || volume;
        }
      } catch (error) {
        // Fallback to previous day data if quote fails
        console.log('[Polygon] Using previous day data for current price');
      }

      const previousClose = data.c; // Yesterday's close price
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: symbol.toUpperCase(),
        price: currentPrice,
        change,
        changePercent,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose,
        volume,
        timestamp: new Date(data.t).toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getQuote(${symbol})`);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Polygon doesn't have efficient batch endpoint for free tier
    // Implement with rate-limited sequential calls
    const quotes: StockQuote[] = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        quotes.push(quote);
      } catch (error) {
        console.error(`[Polygon] Failed to fetch ${symbol}:`, error);
      }
    }
    
    return quotes;
  }

  async getMarketStatus(): Promise<MarketStatus> {
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/marketstatus/now`,
        {
          params: { apiKey: this.apiKey },
          timeout: 5000
        }
      );

      const data = response.data;
      const market = data.exchanges?.nyse || data.exchanges?.nasdaq || {};
      
      return {
        market: 'US',
        isOpen: market.state === 'open',
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
      // Convert period to Polygon parameters
      const { multiplier, timespan, from, to } = this.convertPeriod(period);
      
      const response = await axios.get(
        `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
        {
          params: { 
            apiKey: this.apiKey,
            sort: 'asc',
            limit: 5000
          },
          timeout: 10000
        }
      );

      if (response.data.status !== 'OK' || !response.data.results?.length) {
        throw new Error(`No chart data found for ${symbol}`);
      }

      const data = response.data.results.map((bar: any) => ({
        timestamp: bar.t,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));

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

  private convertPeriod(period: string): { multiplier: number; timespan: string; from: string; to: string } {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;
    let multiplier = 1;
    let timespan = 'day';

    switch (period.toUpperCase()) {
      case '1D':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'minute';
        multiplier = 5;
        break;
      case '5D':
        from = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'hour';
        break;
      case '1M':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
        break;
      case '3M':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
        break;
      case '6M':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
        break;
      case '1Y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
        break;
      case '5Y':
        from = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'week';
        break;
      default:
        // Default to 1 month
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        timespan = 'day';
    }

    return { multiplier, timespan, from, to };
  }
}