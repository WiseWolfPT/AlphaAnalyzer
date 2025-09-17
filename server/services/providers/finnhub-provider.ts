import axios from 'axios';
import { BaseProvider, ChartData, MarketStatus, StockQuote } from './provider-manager';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

const toISO = (unix?: number) => unix ? new Date(unix * 1000).toISOString() : new Date().toISOString();

export class FinnhubProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, FINNHUB_BASE_URL, 'finnhub');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote`, {
        params: {
          symbol,
          token: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      if (!data || typeof data.c !== 'number') {
        throw new Error(`Invalid Finnhub response for ${symbol}`);
      }

      return {
        symbol,
        price: data.c,
        change: data.d ?? 0,
        changePercent: data.dp ?? 0,
        high: data.h ?? undefined,
        low: data.l ?? undefined,
        open: data.o ?? undefined,
        previousClose: data.pc ?? undefined,
        volume: data.v ?? 0,
        timestamp: toISO(data.t),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getQuote(${symbol})`);
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    const results: StockQuote[] = [];
    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        if (quote) {
          results.push(quote);
        }
      } catch (error) {
        console.error(`[Finnhub] Failed to fetch ${symbol}:`, error);
      }
    }
    return results;
  }

  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/market/status`, {
        params: {
          exchange: 'US',
          token: this.apiKey
        },
        timeout: 5000
      });

      const data = response.data;
      return {
        market: data?.exchange ?? 'US',
        isOpen: Boolean(data?.isOpen ?? data?.marketStatus === 'open'),
        nextOpen: data?.nextOpen ? new Date(data.nextOpen).toISOString() : undefined,
        nextClose: data?.nextClose ? new Date(data.nextClose).toISOString() : undefined,
        timezone: data?.timezone ?? 'America/New_York',
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getMarketStatus');
    }
  }

  async getChartData(symbol: string, period: string): Promise<ChartData> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const from = now - this.getRangeForPeriod(period);

      const response = await axios.get(`${this.baseUrl}/stock/candle`, {
        params: {
          symbol,
          resolution: this.getResolution(period),
          from,
          to: now,
          token: this.apiKey
        },
        timeout: 10000
      });

      const data = response.data;
      if (data.s !== 'ok') {
        throw new Error(`Finnhub candle response not ok for ${symbol}`);
      }

      const candles = (data.t as number[]).map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000,
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: data.c[index],
        volume: data.v[index]
      }));

      return {
        symbol,
        data: candles,
        period,
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, `getChartData(${symbol}, ${period})`);
    }
  }

  private getResolution(period: string): string {
    switch (period) {
      case '1d':
      case '1h':
        return '1';
      case '5d':
        return '5';
      case '1m':
        return '30';
      case '3m':
      case '6m':
        return '60';
      default:
        return 'D';
    }
  }

  private getRangeForPeriod(period: string): number {
    const day = 24 * 60 * 60;
    switch (period) {
      case '1d':
        return day;
      case '5d':
        return day * 5;
      case '1m':
        return day * 30;
      case '3m':
        return day * 90;
      case '6m':
        return day * 180;
      case '1y':
        return day * 365;
      default:
        return day * 30;
    }
  }
}
