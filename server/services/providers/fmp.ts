import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class FMPProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://financialmodelingprep.com/api/v3', 'fmp');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote/${symbol}`, {
        params: {
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (!data || data.length === 0) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      const quote = data[0];

      return {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        volume: quote.volume,
        high: quote.dayHigh,
        low: quote.dayLow,
        open: quote.open,
        previousClose: quote.previousClose,
        marketCap: quote.marketCap,
        eps: quote.eps,
        pe: quote.pe,
        timestamp: new Date(quote.timestamp * 1000).toISOString(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getQuote');
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      // FMP supports batch quotes with comma-separated symbols
      const response = await axios.get(`${this.baseUrl}/quote/${symbols.join(',')}`, {
        params: {
          apikey: this.apiKey
        },
        timeout: 15000
      });

      const data = response.data;
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid response from FMP batch quotes');
      }

      return data.map((quote: any) => ({
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        volume: quote.volume,
        high: quote.dayHigh,
        low: quote.dayLow,
        open: quote.open,
        previousClose: quote.previousClose,
        marketCap: quote.marketCap,
        eps: quote.eps,
        pe: quote.pe,
        timestamp: new Date(quote.timestamp * 1000).toISOString(),
        provider: this.name
      }));
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

  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/is-the-market-open`, {
        params: {
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (!data) {
        throw new Error('Failed to get market status');
      }

      return {
        market: 'US',
        isOpen: data.isTheStockMarketOpen,
        timezone: 'America/New_York',
        provider: this.name
      };
    } catch (error) {
      // Fallback to calculated market status
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
      // Map period to FMP endpoints and parameters
      let endpoint = 'historical-price-full';
      let interval = '1day';
      let from: string;
      const to = new Date().toISOString().split('T')[0];
      
      switch (period) {
        case '1D':
        case 'intraday':
          endpoint = 'historical-chart/5min';
          from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '1W':
        case 'weekly':
          endpoint = 'historical-chart/1hour';
          from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '1M':
        case 'monthly':
          from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '3M':
          from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '1Y':
          from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default:
          from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      let url = `${this.baseUrl}/${endpoint}/${symbol}`;
      const params: any = {
        apikey: this.apiKey
      };

      // For historical-price-full endpoint, add date range
      if (endpoint === 'historical-price-full') {
        params.from = from;
        params.to = to;
      }

      const response = await axios.get(url, {
        params,
        timeout: 15000
      });

      const data = response.data;
      
      let chartData: any[] = [];
      
      // Handle different response formats
      if (endpoint === 'historical-price-full') {
        if (!data.historical || data.historical.length === 0) {
          throw new Error(`No chart data found for ${symbol}`);
        }
        
        chartData = data.historical.map((candle: any) => ({
          timestamp: new Date(candle.date).getTime(),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        })).reverse(); // FMP returns newest first for daily data
      } else {
        // For intraday/hourly data
        if (!data || data.length === 0) {
          throw new Error(`No chart data found for ${symbol}`);
        }
        
        chartData = data.map((candle: any) => ({
          timestamp: new Date(candle.date).getTime(),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume || 0
        }));
      }

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