import axios, { AxiosInstance } from 'axios';
import {
  BaseMarketDataProvider,
  PriceData,
  Fundamentals,
  HistoricalData,
  CompanyInfo,
  NewsData,
  TimeRange,
  ProviderCapabilities,
  HistoricalDataPoint,
  NewsItem
} from '../provider.interface';
import { ProviderName } from '../../quota/quota-limits';

export class TwelveDataProvider extends BaseMarketDataProvider {
  name: ProviderName = 'twelveData';
  priority = 2;
  capabilities: ProviderCapabilities = {
    realTimePrice: true,
    fundamentals: true,
    historical: true,
    news: false, // TwelveData doesn't provide news
    companyInfo: true,
    batchRequests: true,
    webSocket: true
  };

  private client: AxiosInstance;
  private baseUrl = 'https://api.twelvedata.com';
  private isDemo = false;

  constructor() {
    super();
    // Set API key after name is defined
    this.apiKey = this.getApiKey();
    this.isDemo = this.apiKey === 'demo';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      params: {
        apikey: this.apiKey
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      // Skip API verification in demo mode
      if (this.isDemo) {
        console.warn(`[${this.name}] Running in DEMO mode - will return mock data`);
        return;
      }

      // Test the API key
      await this.client.get('/quote', {
        params: { symbol: 'AAPL' }
      });
      console.log(`[${this.name}] Initialized successfully`);
    } catch (error) {
      console.error(`[${this.name}] Failed to initialize:`, error);
      throw new Error(`Failed to initialize ${this.name} provider`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/quote', {
        params: { symbol: 'AAPL' }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getPrice(symbol: string): Promise<PriceData> {
    try {
      // Return mock data in demo mode
      if (this.isDemo) {
        return this.getMockPriceData(symbol);
      }

      const response = await this.client.get('/quote', {
        params: { symbol }
      });

      const data = response.data;
      
      if (data.code === 400 || data.status === 'error') {
        throw new Error(data.message || `No price data available for ${symbol}`);
      }

      const price = parseFloat(data.close || data.price);
      const previousClose = parseFloat(data.previous_close);
      const change = price - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol,
        price,
        change,
        changePercent,
        volume: parseInt(data.volume) || 0,
        timestamp: Date.now(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getPrice');
    }
  }

  async getBatchPrices(symbols: string[]): Promise<PriceData[]> {
    try {
      // Return mock data in demo mode
      if (this.isDemo) {
        return symbols.map(symbol => this.getMockPriceData(symbol));
      }

      const response = await this.client.get('/quote', {
        params: { 
          symbol: symbols.join(','),
          interval: '1min' 
        }
      });

      const data = response.data;
      
      // Handle batch response
      if (Array.isArray(data)) {
        return data.map(item => {
          const price = parseFloat(item.close || item.price);
          const previousClose = parseFloat(item.previous_close);
          const change = price - previousClose;
          const changePercent = (change / previousClose) * 100;

          return {
            symbol: item.symbol,
            price,
            change,
            changePercent,
            volume: parseInt(item.volume) || 0,
            timestamp: Date.now(),
            provider: this.name
          };
        });
      } else {
        // Single result wrapped in array
        return [this.getPrice(symbols[0])];
      }
    } catch (error) {
      this.handleApiError(error, 'getBatchPrices');
    }
  }

  async getFundamentals(symbol: string): Promise<Fundamentals> {
    try {
      // Return mock data in demo mode
      if (this.isDemo) {
        return this.getMockFundamentals(symbol);
      }

      const response = await this.client.get('/statistics', {
        params: { symbol }
      });

      const data = response.data.statistics || {};

      return {
        symbol,
        marketCap: parseFloat(data.marketcap) || 0,
        pe: parseFloat(data.pe_ratio_ttm) || 0,
        eps: parseFloat(data.eps_ttm) || 0,
        dividend: parseFloat(data.dividend_amount) || 0,
        dividendYield: parseFloat(data.dividend_yield) || 0,
        beta: parseFloat(data.beta) || 0,
        week52High: parseFloat(data['52_week_high']) || 0,
        week52Low: parseFloat(data['52_week_low']) || 0,
        provider: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleApiError(error, 'getFundamentals');
    }
  }

  async getHistorical(symbol: string, range: TimeRange): Promise<HistoricalData> {
    try {
      // Return mock data in demo mode
      if (this.isDemo) {
        return this.getMockHistoricalData(symbol, range);
      }

      // Map range to TwelveData parameters
      const { interval, outputsize } = this.mapRangeToParams(range);

      const response = await this.client.get('/time_series', {
        params: {
          symbol,
          interval,
          outputsize
        }
      });

      const data = response.data;
      
      if (data.status === 'error') {
        throw new Error(data.message || `No historical data available for ${symbol}`);
      }

      const values = data.values || [];
      
      const historicalPoints: HistoricalDataPoint[] = values.map((point: any) => ({
        date: point.datetime,
        open: parseFloat(point.open),
        high: parseFloat(point.high),
        low: parseFloat(point.low),
        close: parseFloat(point.close),
        volume: parseInt(point.volume)
      }));

      return {
        symbol,
        data: historicalPoints,
        provider: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleApiError(error, 'getHistorical');
    }
  }

  async getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    try {
      // Return mock data in demo mode
      if (this.isDemo) {
        return this.getMockCompanyInfo(symbol);
      }

      const response = await this.client.get('/stocks', {
        params: { 
          symbol,
          show_plan: false
        }
      });

      const data = response.data;
      
      if (!data || data.status === 'error') {
        throw new Error(`No company info available for ${symbol}`);
      }

      return {
        symbol,
        name: data.name || '',
        exchange: data.exchange || '',
        sector: data.sector || '',
        industry: data.industry || '',
        description: '', // Not available in TwelveData
        website: data.website || '',
        employees: 0, // Not available
        provider: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleApiError(error, 'getCompanyInfo');
    }
  }

  async getNews(symbol: string, limit?: number): Promise<NewsData> {
    // TwelveData doesn't provide news
    throw new Error(`News data not available from ${this.name}`);
  }

  private mapRangeToParams(range: TimeRange): { interval: string; outputsize: number } {
    switch (range) {
      case '1d':
        return { interval: '5min', outputsize: 78 }; // ~6.5 hours of trading
      case '5d':
        return { interval: '30min', outputsize: 65 }; // 5 days
      case '1m':
        return { interval: '1day', outputsize: 30 };
      case '3m':
        return { interval: '1day', outputsize: 90 };
      case '6m':
        return { interval: '1day', outputsize: 180 };
      case '1y':
        return { interval: '1week', outputsize: 52 };
      case '5y':
        return { interval: '1month', outputsize: 60 };
      case 'max':
        return { interval: '1month', outputsize: 500 };
      default:
        return { interval: '1day', outputsize: 30 };
    }
  }

  // Override to provide TwelveData-specific error handling
  protected handleApiError(error: any, operation: string): never {
    if (error.response?.data?.code === 401) {
      throw new Error(`Invalid API key for ${this.name}`);
    }
    
    if (error.response?.data?.code === 429) {
      throw new Error(`Rate limit exceeded for ${this.name}. Please upgrade your plan.`);
    }
    
    if (error.response?.data?.code === 404) {
      throw new Error(`Symbol not found in ${this.name}`);
    }
    
    super.handleApiError(error, operation);
  }

  // Mock data methods for demo mode
  private getMockPriceData(symbol: string): PriceData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const change = (Math.random() - 0.5) * 8;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol,
      price: basePrice + change,
      change,
      changePercent,
      volume: Math.floor(Math.random() * 45000000) + 15000000,
      timestamp: Date.now(),
      provider: this.name
    };
  }

  private getMockFundamentals(symbol: string): Fundamentals {
    const basePrice = this.getBasePriceForSymbol(symbol);
    
    return {
      symbol,
      marketCap: basePrice * 1000000 * (Math.random() * 5000 + 1000),
      pe: Math.random() * 30 + 10,
      eps: Math.random() * 10 + 2,
      dividend: Math.random() * 3,
      dividendYield: Math.random() * 3,
      beta: Math.random() * 0.8 + 0.8,
      week52High: basePrice * (1.2 + Math.random() * 0.2),
      week52Low: basePrice * (0.7 + Math.random() * 0.1),
      provider: this.name,
      timestamp: Date.now()
    };
  }

  private getMockHistoricalData(symbol: string, range: TimeRange): HistoricalData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const dataPoints = this.getDataPointsForRange(range);
    
    const data: HistoricalDataPoint[] = [];
    let currentPrice = basePrice;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 5;
      currentPrice = currentPrice + variance;
      
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const high = currentPrice + Math.random() * 2;
      const low = currentPrice - Math.random() * 2;
      const close = low + Math.random() * (high - low);
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: currentPrice,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 50000000) + 10000000
      });
      
      currentPrice = close;
    }
    
    return {
      symbol,
      data,
      provider: this.name,
      timestamp: Date.now()
    };
  }

  private getMockCompanyInfo(symbol: string): CompanyInfo {
    const companies: Record<string, Partial<CompanyInfo>> = {
      'AAPL': {
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        website: 'https://www.apple.com'
      },
      'MSFT': {
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Software',
        website: 'https://www.microsoft.com'
      },
      'GOOGL': {
        name: 'Alphabet Inc.',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Internet Services',
        website: 'https://www.google.com'
      }
    };
    
    const defaultInfo = {
      name: `${symbol} Corporation`,
      exchange: 'NYSE',
      sector: 'Unknown',
      industry: 'Unknown',
      website: ''
    };
    
    const info = companies[symbol] || defaultInfo;
    
    return {
      symbol,
      name: info.name || '',
      exchange: info.exchange || '',
      sector: info.sector || '',
      industry: info.industry || '',
      description: '',
      website: info.website || '',
      employees: 0,
      provider: this.name,
      timestamp: Date.now()
    };
  }

  private getBasePriceForSymbol(symbol: string): number {
    const prices: Record<string, number> = {
      'AAPL': 195.50,
      'MSFT': 380.25,
      'GOOGL': 150.75,
      'AMZN': 178.50,
      'TSLA': 250.00,
      'META': 475.00,
      'NVDA': 825.00,
      'BRK.B': 380.00,
      'JPM': 195.00,
      'V': 275.00
    };
    
    return prices[symbol] || 100.00;
  }

  private getDataPointsForRange(range: TimeRange): number {
    switch (range) {
      case '1d': return 78;
      case '5d': return 5;
      case '1m': return 30;
      case '3m': return 90;
      case '6m': return 180;
      case '1y': return 252;
      case '5y': return 60;
      case 'max': return 120;
      default: return 30;
    }
  }
}