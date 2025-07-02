// Financial Data Client - Fetches financial statements and metrics
import { env } from '@/lib/env';

const API_BASE_URL = env.VITE_API_URL || 'http://localhost:3001';

export interface FinancialStatement {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
  freeCashFlow: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cash: number;
  debt: number;
  sharesOutstanding: number;
}

export interface StockProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  country: string;
  currency: string;
  website: string;
  logo?: string;
}

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FinancialMetrics {
  pe: number;
  ps: number;
  pb: number;
  evToEbitda: number;
  roe: number;
  roa: number;
  currentRatio: number;
  debtToEquity: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

class FinancialDataClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
    this.authToken = localStorage.getItem('auth-token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  async getStockProfile(symbol: string): Promise<StockProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stocks/${symbol}/profile`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`Failed to fetch profile for ${symbol}:`, response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching profile for ${symbol}:`, error);
      return null;
    }
  }

  async getFinancialStatements(symbol: string, period: 'quarterly' | 'annual' = 'quarterly'): Promise<FinancialStatement[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stocks/${symbol}/financials?period=${period}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`Failed to fetch financials for ${symbol}:`, response.status);
        return [];
      }

      const data = await response.json();
      return data.statements || [];
    } catch (error) {
      console.error(`Error fetching financials for ${symbol}:`, error);
      return [];
    }
  }

  async getHistoricalPrices(symbol: string, days: number = 30): Promise<PriceData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stocks/${symbol}/prices?days=${days}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`Failed to fetch prices for ${symbol}:`, response.status);
        return [];
      }

      const data = await response.json();
      return data.prices || [];
    } catch (error) {
      console.error(`Error fetching prices for ${symbol}:`, error);
      return [];
    }
  }

  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stocks/${symbol}/metrics`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`Failed to fetch metrics for ${symbol}:`, response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching metrics for ${symbol}:`, error);
      return null;
    }
  }

  async getDividends(symbol: string): Promise<Array<{ date: string; amount: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/stocks/${symbol}/dividends`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`Failed to fetch dividends for ${symbol}:`, response.status);
        return [];
      }

      const data = await response.json();
      return data.dividends || [];
    } catch (error) {
      console.error(`Error fetching dividends for ${symbol}:`, error);
      return [];
    }
  }

  // Helper method to transform financial statements into chart data
  transformToChartData(statements: FinancialStatement[], metric: keyof FinancialStatement) {
    return statements.map(statement => ({
      quarter: statement.date,
      value: Number(statement[metric]) || 0
    }));
  }

  // Helper to calculate segment data (if available from API)
  async getSegmentRevenue(symbol: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stocks/${symbol}/segments`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.segments || [];
    } catch (error) {
      console.error(`Error fetching segment data for ${symbol}:`, error);
      return [];
    }
  }
}

export const financialDataClient = new FinancialDataClient();