import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class TwelveDataProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://api.twelvedata.com', 'twelve_data');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (data.code === 401) {
        throw new Error('Invalid API key');
      }
      
      if (data.status === 'error' || !data.close) {
        throw new Error(`No data found for symbol ${symbol}: ${data.message || 'Unknown error'}`);
      }

      // Get additional info for better data
      const timeSeries = await axios.get(`${this.baseUrl}/time_series`, {
        params: {
          symbol: symbol,
          interval: '1day',
          outputsize: 1,
          apikey: this.apiKey
        }
      });

      const latestData = timeSeries.data.values?.[0] || {};

      return {
        symbol: data.symbol,
        price: parseFloat(data.close),
        change: parseFloat(data.change || '0'),
        changePercent: parseFloat(data.percent_change || '0'),
        volume: parseInt(data.volume || '0'),
        high: parseFloat(data.high || latestData.high || data.close),
        low: parseFloat(data.low || latestData.low || data.close),
        open: parseFloat(data.open || latestData.open || data.close),
        previousClose: parseFloat(data.previous_close || data.close),
        marketCap: data.market_cap ? parseFloat(data.market_cap) : undefined,
        eps: data.eps ? parseFloat(data.eps) : undefined,
        pe: data.pe ? parseFloat(data.pe) : undefined,
        timestamp: new Date(data.datetime || Date.now()).toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getQuote');
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Twelve Data supports batch quotes with comma-separated symbols
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol: symbols.join(','),
          apikey: this.apiKey
        },
        timeout: 15000
      });

      const data = response.data;
      
      // Handle single symbol response
      if (!Array.isArray(data) && data.symbol) {
        return [this.formatQuote(data)];
      }
      
      // Handle multiple symbols
      const results: StockQuote[] = [];
      
      for (const symbol of symbols) {
        if (data[symbol]) {
          results.push(this.formatQuote(data[symbol]));
        }
      }
      
      return results;
    } catch (error) {
      // Fallback to individual requests
      console.error('Batch request failed, falling back to individual requests:', error);
      const promises = symbols.map(symbol => 
        this.getQuote(symbol).catch(err => {
          console.error(`Failed to fetch ${symbol}:`, err);
          return null;
        })
      );
      
      const results = await Promise.all(promises);
      return results.filter(quote => quote !== null) as StockQuote[];
    }
  }

  private formatQuote(data: any): StockQuote {
    return {
      symbol: data.symbol,
      price: parseFloat(data.close || '0'),
      change: parseFloat(data.change || '0'),
      changePercent: parseFloat(data.percent_change || '0'),
      volume: parseInt(data.volume || '0'),
      high: parseFloat(data.high || data.close || '0'),
      low: parseFloat(data.low || data.close || '0'),
      open: parseFloat(data.open || data.close || '0'),
      previousClose: parseFloat(data.previous_close || data.close || '0'),
      marketCap: data.market_cap ? parseFloat(data.market_cap) : undefined,
      eps: data.eps ? parseFloat(data.eps) : undefined,
      pe: data.pe ? parseFloat(data.pe) : undefined,
      timestamp: new Date(data.datetime || Date.now()).toISOString(),
      provider: this.name
    };
  }

  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/market_state`, {
        params: {
          exchange: 'NYSE',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (data.status === 'error') {
        throw new Error('Failed to get market status');
      }

      return {
        market: 'US',
        isOpen: data.is_market_open || false,
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
      // Map period to Twelve Data parameters
      let interval = '1day';
      let outputsize = 30;
      
      switch (period) {
        case '1D':
        case 'intraday':
          interval = '5min';
          outputsize = 78; // ~6.5 hours of trading
          break;
        case '1W':
        case 'weekly':
          interval = '1h';
          outputsize = 40; // ~1 week of market hours
          break;
        case '1M':
        case 'monthly':
          interval = '1day';
          outputsize = 30;
          break;
        case '3M':
          interval = '1day';
          outputsize = 90;
          break;
        case '1Y':
          interval = '1week';
          outputsize = 52;
          break;
        default:
          interval = '1day';
          outputsize = 30;
      }

      const response = await axios.get(`${this.baseUrl}/time_series`, {
        params: {
          symbol: symbol,
          interval: interval,
          outputsize: outputsize,
          apikey: this.apiKey
        },
        timeout: 15000
      });

      const data = response.data;
      
      if (data.status === 'error' || !data.values || data.values.length === 0) {
        throw new Error(`No chart data found for ${symbol}: ${data.message || 'Unknown error'}`);
      }

      const chartData = data.values.map((candle: any) => ({
        timestamp: new Date(candle.datetime).getTime(),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseInt(candle.volume || '0')
      })).reverse(); // Twelve Data returns newest first

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