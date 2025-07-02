import axios from 'axios';
import type { Stock } from '../../shared/schema';

interface YahooFinanceQuote {
  regularMarketPrice: number;
  regularMarketPreviousClose: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  longName: string;
  shortName: string;
  symbol: string;
}

class YahooFinanceService {
  private baseUrl = 'https://query1.finance.yahoo.com';

  /**
   * Get real-time quote from Yahoo Finance (no API key required)
   * This is a free alternative when other APIs are not available
   */
  async getQuote(symbol: string): Promise<Stock | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/v8/finance/chart/${symbol}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Alfalyzer/1.0)'
        }
      });

      const data = response.data;
      
      if (!data?.chart?.result?.[0]) {
        console.warn(`Yahoo Finance: No data found for symbol ${symbol}`);
        return null;
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      
      if (!meta) {
        return null;
      }

      // Get the latest values from the timestamps
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const latestIndex = timestamps.length - 1;

      const price = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || 0;
      const change = price - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        id: 0,
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || symbol,
        price: price,
        previousClose: previousClose,
        change: change,
        changePercent: changePercent,
        volume: meta.regularMarketVolume || 0,
        high: meta.regularMarketDayHigh || quotes.high?.[latestIndex] || 0,
        low: meta.regularMarketDayLow || quotes.low?.[latestIndex] || 0,
        open: meta.regularMarketOpen || quotes.open?.[latestIndex] || 0,
        marketCap: meta.marketCap?.toString() || "0",
        week52High: meta.fiftyTwoWeekHigh || 0,
        week52Low: meta.fiftyTwoWeekLow || 0,
        sector: '', // Yahoo Finance chart API doesn't include sector
        industry: null,
        eps: null,
        peRatio: null,
        logo: null,
        lastUpdated: new Date()
      } as Stock;
    } catch (error) {
      console.error('Yahoo Finance API error:', error.message);
      return null;
    }
  }

  /**
   * Get multiple quotes in batch
   */
  async getBatchQuotes(symbols: string[]): Promise<Stock[]> {
    const quotes = await Promise.all(
      symbols.map(symbol => this.getQuote(symbol))
    );
    return quotes.filter(quote => quote !== null) as Stock[];
  }

  /**
   * Search for symbols (limited functionality compared to other APIs)
   */
  async searchSymbols(query: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/finance/search`, {
        params: { q: query },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Alfalyzer/1.0)'
        }
      });

      const results = response.data?.quotes || [];
      return results.slice(0, 10).map((item: any) => ({
        symbol: item.symbol,
        name: item.longname || item.shortname,
        type: item.typeDisp,
        exchange: item.exchange
      }));
    } catch (error) {
      console.error('Yahoo Finance search error:', error.message);
      return [];
    }
  }

  /**
   * Check if the service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const quote = await this.getQuote('AAPL');
      return quote !== null;
    } catch {
      return false;
    }
  }
}

export const yahooFinanceService = new YahooFinanceService();