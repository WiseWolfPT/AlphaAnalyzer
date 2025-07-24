import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class AlphaVantageProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://www.alphavantage.co/query', 'alpha_vantage');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.Note) {
        throw new Error('Alpha Vantage API rate limit reached');
      }

      if (response.data['Error Message']) {
        throw new Error(`Invalid symbol: ${symbol}`);
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
        volume: parseInt(quote['06. volume']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        timestamp: quote['07. latest trading day'],
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getQuote');
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    // Alpha Vantage doesn't support batch quotes in free tier
    // Implement sequential fetching with delay
    const quotes: StockQuote[] = [];
    
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        quotes.push(quote);
        
        // Rate limiting: 5 calls per minute for free tier
        if (symbols.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay
        }
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
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
    
    // Simple US market hours check (9:30 AM - 4:00 PM ET)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 14 && hour < 21; // Approximate ET in UTC
    
    return {
      market: 'US',
      isOpen: isWeekday && isMarketHours,
      timezone: 'America/New_York',
      provider: this.name
    };
  }

  async getChartData(symbol: string, period: string): Promise<ChartData> {
    try {
      // Map period to Alpha Vantage function
      let func = 'TIME_SERIES_DAILY';
      let timeSeriesKey = 'Time Series (Daily)';
      
      if (period === '1D' || period === 'intraday') {
        func = 'TIME_SERIES_INTRADAY';
        timeSeriesKey = 'Time Series (5min)';
      } else if (period === 'weekly' || period === '1W') {
        func = 'TIME_SERIES_WEEKLY';
        timeSeriesKey = 'Weekly Time Series';
      } else if (period === 'monthly' || period === '1M') {
        func = 'TIME_SERIES_MONTHLY';
        timeSeriesKey = 'Monthly Time Series';
      }

      const params: any = {
        function: func,
        symbol: symbol,
        apikey: this.apiKey
      };

      if (func === 'TIME_SERIES_INTRADAY') {
        params.interval = '5min';
      }

      const response = await axios.get(this.baseUrl, {
        params,
        timeout: 15000
      });

      if (response.data.Note) {
        throw new Error('Alpha Vantage API rate limit reached');
      }

      const timeSeries = response.data[timeSeriesKey];
      
      if (!timeSeries) {
        throw new Error(`No chart data found for ${symbol}`);
      }

      const data = Object.entries(timeSeries)
        .slice(0, 100) // Limit to last 100 data points
        .map(([timestamp, values]: [string, any]) => ({
          timestamp: new Date(timestamp).getTime(),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }))
        .reverse(); // Alpha Vantage returns newest first, reverse for chronological order

      return {
        symbol,
        data,
        period,
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getChartData');
    }
  }
}