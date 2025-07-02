import { DataType, ProviderName } from '../quota/quota-limits';

// Common data structures
export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  provider: string;
}

export interface Fundamentals {
  symbol: string;
  marketCap: number;
  pe: number;
  eps: number;
  dividend: number;
  dividendYield: number;
  beta: number;
  week52High: number;
  week52Low: number;
  provider: string;
  timestamp: number;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  symbol: string;
  data: HistoricalDataPoint[];
  provider: string;
  timestamp: number;
}

export interface CompanyInfo {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  employees: number;
  provider: string;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface NewsData {
  symbol: string;
  items: NewsItem[];
  provider: string;
  timestamp: number;
}

// Time ranges for historical data
export type TimeRange = '1d' | '5d' | '1m' | '3m' | '6m' | '1y' | '5y' | 'max';

// Provider capabilities
export interface ProviderCapabilities {
  realTimePrice: boolean;
  fundamentals: boolean;
  historical: boolean;
  news: boolean;
  companyInfo: boolean;
  batchRequests: boolean;
  webSocket: boolean;
}

// Main provider interface
export interface IMarketDataProvider {
  name: ProviderName;
  priority: number;
  capabilities: ProviderCapabilities;

  // Initialization
  initialize(): Promise<void>;
  isHealthy(): Promise<boolean>;

  // Data fetching methods
  getPrice(symbol: string): Promise<PriceData>;
  getBatchPrices?(symbols: string[]): Promise<PriceData[]>;
  
  getFundamentals(symbol: string): Promise<Fundamentals>;
  getBatchFundamentals?(symbols: string[]): Promise<Fundamentals[]>;
  
  getHistorical(symbol: string, range: TimeRange): Promise<HistoricalData>;
  
  getCompanyInfo(symbol: string): Promise<CompanyInfo>;
  
  getNews(symbol: string, limit?: number): Promise<NewsData>;

  // Utility methods
  canHandle(dataType: DataType): boolean;
  getApiKey(): string;
}

// Base provider class with common functionality
export abstract class BaseMarketDataProvider implements IMarketDataProvider {
  abstract name: ProviderName;
  abstract priority: number;
  abstract capabilities: ProviderCapabilities;

  protected apiKey: string;

  constructor() {
    this.apiKey = this.getApiKey();
  }

  abstract initialize(): Promise<void>;
  abstract isHealthy(): Promise<boolean>;

  abstract getPrice(symbol: string): Promise<PriceData>;
  abstract getFundamentals(symbol: string): Promise<Fundamentals>;
  abstract getHistorical(symbol: string, range: TimeRange): Promise<HistoricalData>;
  abstract getCompanyInfo(symbol: string): Promise<CompanyInfo>;
  abstract getNews(symbol: string, limit?: number): Promise<NewsData>;

  canHandle(dataType: DataType): boolean {
    switch (dataType) {
      case 'price':
        return this.capabilities.realTimePrice;
      case 'fundamentals':
        return this.capabilities.fundamentals;
      case 'historical':
        return this.capabilities.historical;
      case 'news':
        return this.capabilities.news;
      case 'companyInfo':
        return this.capabilities.companyInfo;
      default:
        return false;
    }
  }

  getApiKey(): string {
    const envKey = `${this.name.toUpperCase()}_API_KEY`;
    const apiKey = process.env[envKey];
    
    if (!apiKey || apiKey === 'demo') {
      console.warn(`[${this.name}] No valid API key found. Using demo mode.`);
      return 'demo';
    }
    
    return apiKey;
  }

  protected handleApiError(error: any, operation: string): never {
    console.error(`[${this.name}] Error in ${operation}:`, error);
    
    if (error.response?.status === 429) {
      throw new Error(`Rate limit exceeded for ${this.name}`);
    }
    
    if (error.response?.status === 401) {
      throw new Error(`Invalid API key for ${this.name}`);
    }
    
    throw new Error(`${this.name} API error: ${error.message}`);
  }
}