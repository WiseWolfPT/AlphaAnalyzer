import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class PolygonProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://api.polygon.io', 'polygon');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      // Get latest quote
      const quoteResponse = await axios.get(`${this.baseUrl}/v2/last/nbbo/${symbol}`, {
        params: {
          apiKey: this.apiKey
        },
        timeout: 10000
      });

      // Get previous close for change calculations
      const prevCloseResponse = await axios.get(`${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`, {
        params: {
          adjusted: true,
          apiKey: this.apiKey
        },
        timeout: 10000
      });

      const quote = quoteResponse.data;
      const prevClose = prevCloseResponse.data.results?.[0];

      if (quote.status !== 'OK' || !quote.results) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      const currentPrice = quote.results.P || (quote.results.p + quote.results.P) / 2;
      const previousClose = prevClose?.c || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: prevClose?.v || 0,
        high: prevClose?.h || currentPrice,
        low: prevClose?.l || currentPrice,
        open: prevClose?.o || currentPrice,
        previousClose: previousClose,
        timestamp: new Date(quote.results.t).toISOString(),
        provider: this.name
      };
    } catch (error) {
      // Try alternative endpoint for stocks
      try {
        const response = await axios.get(`${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`, {
          params: {
            adjusted: true,
            apiKey: this.apiKey
          },
          timeout: 10000
        });

        const data = response.data;
        if (data.status !== 'OK' || !data.results?.[0]) {
          throw new Error(`No data found for symbol ${symbol}`);
        }

        const result = data.results[0];
        const change = result.c - result.o;
        const changePercent = result.o !== 0 ? (change / result.o) * 100 : 0;

        return {
          symbol: symbol,
          price: result.c,
          change: change,
          changePercent: changePercent,
          volume: result.v,
          high: result.h,
          low: result.l,
          open: result.o,
          previousClose: result.c, // Using close as previous close
          timestamp: new Date(result.t).toISOString(),
          provider: this.name
        };
      } catch (fallbackError) {
        this.handleApiError(error, 'getQuote');
      }
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Polygon doesn't have a true batch endpoint for free tier
    // But we can make parallel requests efficiently
    const promises = symbols.map(symbol => 
      this.getQuote(symbol).catch(err => {
        console.error(`Failed to fetch ${symbol}:`, err);
        return null;
      })
    );
    
    const results = await Promise.all(promises);
    return results.filter(quote => quote !== null) as StockQuote[];
  }

  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/marketstatus/now`, {
        params: {
          apiKey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      return {
        market: 'US',
        isOpen: data.market === 'open',
        nextOpen: data.serverTime,
        nextClose: data.serverTime,
        timezone: 'America/New_York',
        provider: this.name
      };
    } catch (error) {
      return this.getDefaultMarketStatus();
    }
  }

  private getDefaultMarketStatus(): MarketStatus {
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

  async getChartData(symbol: string, period: string): Promise<ChartData> {
    try {
      // Map period to Polygon parameters
      let multiplier = 1;
      let timespan = 'day';
      let from: string;
      const to = new Date().toISOString().split('T')[0];
      
      switch (period) {
        case '1D':
        case 'intraday':
          multiplier = 5;
          timespan = 'minute';
          from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '1W':
        case 'weekly':
          multiplier = 1;
          timespan = 'hour';
          from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '1M':
        case 'monthly':
          multiplier = 1;
          timespan = 'day';
          from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '3M':
          multiplier = 1;
          timespan = 'day';
          from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '1Y':
          multiplier = 1;
          timespan = 'week';
          from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default:
          multiplier = 1;
          timespan = 'day';
          from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      const response = await axios.get(
        `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
        {
          params: {
            adjusted: true,
            sort: 'asc',
            limit: 500,
            apiKey: this.apiKey
          },
          timeout: 15000
        }
      );

      const data = response.data;
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(`No chart data found for ${symbol}`);
      }

      const chartData = data.results.map((candle: any) => ({
        timestamp: candle.t,
        open: candle.o,
        high: candle.h,
        low: candle.l,
        close: candle.c,
        volume: candle.v
      }));

      return {
        symbol,
        data: chartData,
        period,
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getChartData');
    }
  }
}