import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class FinnhubProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://finnhub.io/api/v1', 'finnhub');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (!data || data.c === 0) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      // Get additional data for better quote info
      const profileResponse = await axios.get(`${this.baseUrl}/stock/profile2`, {
        params: {
          symbol: symbol,
          token: this.apiKey
        },
        timeout: 10000
      });

      const profile = profileResponse.data;

      return {
        symbol: symbol,
        price: data.c, // Current price
        change: data.d, // Change
        changePercent: data.dp, // Change percent
        volume: data.v || 0, // Volume (might not be available)
        high: data.h, // High
        low: data.l, // Low
        open: data.o, // Open
        previousClose: data.pc, // Previous close
        marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : undefined,
        timestamp: new Date(data.t * 1000).toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getQuote');
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Finnhub doesn't support true batch quotes, but we can make parallel requests
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
      const response = await axios.get(`${this.baseUrl}/stock/market-status`, {
        params: {
          exchange: 'US',
          token: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      return {
        market: 'US',
        isOpen: data.isOpen,
        timezone: data.timezone || 'America/New_York',
        provider: this.name
      };
    } catch (error) {
      // Fallback if endpoint is not available or fails
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
      // Map period to Finnhub resolution
      let resolution = 'D'; // Daily default
      let from: number;
      const to = Math.floor(Date.now() / 1000);
      
      switch (period) {
        case '1D':
        case 'intraday':
          resolution = '5'; // 5 minute
          from = to - 24 * 60 * 60; // 1 day
          break;
        case '1W':
        case 'weekly':
          resolution = '60'; // 60 minute
          from = to - 7 * 24 * 60 * 60; // 1 week
          break;
        case '1M':
        case 'monthly':
          resolution = 'D'; // Daily
          from = to - 30 * 24 * 60 * 60; // 30 days
          break;
        case '3M':
          resolution = 'D';
          from = to - 90 * 24 * 60 * 60; // 90 days
          break;
        case '1Y':
          resolution = 'W'; // Weekly
          from = to - 365 * 24 * 60 * 60; // 1 year
          break;
        default:
          resolution = 'D';
          from = to - 30 * 24 * 60 * 60; // Default 30 days
      }

      const response = await axios.get(`${this.baseUrl}/stock/candle`, {
        params: {
          symbol: symbol,
          resolution: resolution,
          from: from,
          to: to,
          token: this.apiKey
        },
        timeout: 15000
      });

      const data = response.data;
      
      if (data.s !== 'ok' || !data.t || data.t.length === 0) {
        throw new Error(`No chart data found for ${symbol}`);
      }

      const chartData = data.t.map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
        volume: data.v[index]
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