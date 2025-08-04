/**
 * Fiscal AI Provider
 * Handles financial data from Fiscal AI API
 */

import axios from 'axios';
import { BaseProvider, StockQuote, MarketStatus, ChartData } from './provider-manager';

export class FiscalAIProvider extends BaseProvider {
  constructor(apiKey: string) {
    super(apiKey, 'https://api.fiscalai.com/v1', 'FiscalAI');
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const response = await axios.get(`${this.baseUrl}/quote/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const data = response.data;

      // Map Fiscal AI response to our StockQuote interface
      return {
        symbol: data.symbol || symbol,
        price: parseFloat(data.price || data.last || 0),
        change: parseFloat(data.change || 0),
        changePercent: parseFloat(data.changePercent || data.change_percent || 0),
        volume: parseInt(data.volume || 0),
        high: parseFloat(data.high || data.dayHigh || 0),
        low: parseFloat(data.low || data.dayLow || 0),
        open: parseFloat(data.open || 0),
        previousClose: parseFloat(data.previousClose || data.prev_close || 0),
        marketCap: parseFloat(data.marketCap || 0),
        eps: parseFloat(data.eps || 0),
        pe: parseFloat(data.pe || data.peRatio || 0),
        timestamp: new Date().toISOString(),
        provider: 'FiscalAI'
      };
    } catch (error) {
      this.handleApiError(error, 'getQuote');
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      // Fiscal AI might support batch requests
      const response = await axios.post(`${this.baseUrl}/quotes/batch`, 
        { symbols },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const quotes = response.data.quotes || [];
      
      return quotes.map((data: any) => ({
        symbol: data.symbol,
        price: parseFloat(data.price || data.last || 0),
        change: parseFloat(data.change || 0),
        changePercent: parseFloat(data.changePercent || data.change_percent || 0),
        volume: parseInt(data.volume || 0),
        high: parseFloat(data.high || data.dayHigh || 0),
        low: parseFloat(data.low || data.dayLow || 0),
        open: parseFloat(data.open || 0),
        previousClose: parseFloat(data.previousClose || data.prev_close || 0),
        marketCap: parseFloat(data.marketCap || 0),
        eps: parseFloat(data.eps || 0),
        pe: parseFloat(data.pe || data.peRatio || 0),
        timestamp: new Date().toISOString(),
        provider: 'FiscalAI'
      }));
    } catch (error: any) {
      // If batch fails, try individual requests
      if (error.response?.status === 404) {
        console.log('[FiscalAI] Batch endpoint not available, falling back to individual requests');
        return await Promise.all(symbols.map(symbol => this.getQuote(symbol)));
      }
      this.handleApiError(error, 'getBatchQuotes');
    }
  }

  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/market/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      const data = response.data;

      return {
        market: data.market || 'US',
        isOpen: data.isOpen || false,
        nextOpen: data.nextOpen,
        nextClose: data.nextClose,
        timezone: data.timezone || 'America/New_York',
        provider: 'FiscalAI'
      };
    } catch (error) {
      // Default market status if API doesn't support it
      const now = new Date();
      const hour = now.getUTCHours();
      const day = now.getUTCDay();
      const isWeekday = day >= 1 && day <= 5;
      const isMarketHours = hour >= 14 && hour < 21;

      return {
        market: 'US',
        isOpen: isWeekday && isMarketHours,
        timezone: 'America/New_York',
        provider: 'FiscalAI'
      };
    }
  }

  async getChartData(symbol: string, period: string = '1D'): Promise<ChartData> {
    try {
      const response = await axios.get(`${this.baseUrl}/chart/${symbol}`, {
        params: { period },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const data = response.data;
      const candles = data.candles || data.data || [];

      return {
        symbol,
        data: candles.map((candle: any) => ({
          timestamp: new Date(candle.datetime || candle.timestamp || candle.t).getTime(),
          open: parseFloat(candle.open || candle.o),
          high: parseFloat(candle.high || candle.h),
          low: parseFloat(candle.low || candle.l),
          close: parseFloat(candle.close || candle.c),
          volume: parseInt(candle.volume || candle.v || 0)
        })),
        period,
        provider: 'FiscalAI'
      };
    } catch (error) {
      this.handleApiError(error, 'getChartData');
    }
  }
}