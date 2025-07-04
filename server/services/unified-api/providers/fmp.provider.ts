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

export class FMPProvider extends BaseMarketDataProvider {
  name: ProviderName = 'fmp';
  priority = 3;
  capabilities: ProviderCapabilities = {
    realTimePrice: true,
    fundamentals: true,
    historical: true,
    news: true,
    companyInfo: true,
    batchRequests: true,
    webSocket: false
  };

  private client: AxiosInstance;
  private baseUrl = 'https://financialmodelingprep.com/api/v3';
  private isDemo = false;

  constructor() {
    super();
    // Set API key after name is defined
    this.apiKey = this.getApiKey();
    this.isDemo = this.apiKey === 'demo';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
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
      await this.client.get('/quote/AAPL', {
        params: { apikey: this.apiKey }
      });
      console.log(`[${this.name}] Initialized successfully`);
    } catch (error) {
      console.error(`[${this.name}] Failed to initialize:`, error);
      throw new Error(`Failed to initialize ${this.name} provider`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/quote/AAPL', {
        params: { apikey: this.apiKey }
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

      const response = await this.client.get(`/quote/${symbol}`, {
        params: { apikey: this.apiKey }
      });

      const data = response.data[0];
      
      if (!data) {
        throw new Error(`No price data available for ${symbol}`);
      }

      return {
        symbol,
        price: data.price || 0,
        change: data.change || 0,
        changePercent: data.changesPercentage || 0,
        volume: data.volume || 0,
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

      const symbolString = symbols.join(',');
      const response = await this.client.get(`/quote/${symbolString}`, {
        params: { apikey: this.apiKey }
      });

      return response.data.map((item: any) => ({
        symbol: item.symbol,
        price: item.price || 0,
        change: item.change || 0,
        changePercent: item.changesPercentage || 0,
        volume: item.volume || 0,
        timestamp: Date.now(),
        provider: this.name
      }));
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

      const [profileResponse, metricsResponse] = await Promise.all([
        this.client.get(`/profile/${symbol}`, {
          params: { apikey: this.apiKey }
        }),
        this.client.get(`/key-metrics/${symbol}`, {
          params: { apikey: this.apiKey, limit: 1 }
        })
      ]);

      const profile = profileResponse.data[0] || {};
      const metrics = metricsResponse.data[0] || {};

      return {
        symbol,
        marketCap: profile.mktCap || 0,
        pe: metrics.peRatio || 0,
        eps: profile.lastDiv || 0,
        dividend: profile.lastDiv || 0,
        dividendYield: metrics.dividendYield || 0,
        beta: profile.beta || 0,
        week52High: parseFloat(profile.range?.split('-')[1]) || 0,
        week52Low: parseFloat(profile.range?.split('-')[0]) || 0,
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

      const { from, to } = this.getDateRangeForTimeRange(range);
      
      const response = await this.client.get(`/historical-price-full/${symbol}`, {
        params: {
          apikey: this.apiKey,
          from,
          to
        }
      });

      const historical = response.data.historical || [];
      
      const data: HistoricalDataPoint[] = historical.map((point: any) => ({
        date: point.date,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
      })).reverse(); // FMP returns newest first, we want oldest first

      return {
        symbol,
        data,
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

      const response = await this.client.get(`/profile/${symbol}`, {
        params: { apikey: this.apiKey }
      });

      const data = response.data[0];
      
      if (!data) {
        throw new Error(`No company info available for ${symbol}`);
      }

      return {
        symbol,
        name: data.companyName || '',
        exchange: data.exchangeShortName || '',
        sector: data.sector || '',
        industry: data.industry || '',
        description: data.description || '',
        website: data.website || '',
        employees: data.fullTimeEmployees || 0,
        provider: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleApiError(error, 'getCompanyInfo');
    }
  }

  async getNews(symbol: string, limit = 10): Promise<NewsData> {
    try {
      // Return mock data in demo mode
      if (this.isDemo) {
        return this.getMockNews(symbol, limit);
      }

      const response = await this.client.get('/stock_news', {
        params: {
          apikey: this.apiKey,
          tickers: symbol,
          limit
        }
      });

      const newsItems = response.data || [];
      
      const items: NewsItem[] = newsItems.map((item: any) => ({
        id: item.symbol + '_' + item.publishedDate,
        headline: item.title,
        summary: item.text,
        url: item.url,
        source: item.site,
        publishedAt: item.publishedDate,
        sentiment: this.mapSentiment(item.sentiment)
      }));

      return {
        symbol,
        items,
        provider: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleApiError(error, 'getNews');
    }
  }

  private getDateRangeForTimeRange(range: TimeRange): { from: string; to: string } {
    const to = new Date();
    const from = new Date();
    
    switch (range) {
      case '1d':
        from.setDate(from.getDate() - 1);
        break;
      case '5d':
        from.setDate(from.getDate() - 5);
        break;
      case '1m':
        from.setMonth(from.getMonth() - 1);
        break;
      case '3m':
        from.setMonth(from.getMonth() - 3);
        break;
      case '6m':
        from.setMonth(from.getMonth() - 6);
        break;
      case '1y':
        from.setFullYear(from.getFullYear() - 1);
        break;
      case '5y':
        from.setFullYear(from.getFullYear() - 5);
        break;
      case 'max':
        from.setFullYear(from.getFullYear() - 20);
        break;
    }
    
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  }

  private mapSentiment(sentiment: string): 'positive' | 'negative' | 'neutral' {
    if (!sentiment) return 'neutral';
    const lower = sentiment.toLowerCase();
    if (lower.includes('positive') || lower.includes('bullish')) return 'positive';
    if (lower.includes('negative') || lower.includes('bearish')) return 'negative';
    return 'neutral';
  }

  // Override to provide FMP-specific error handling
  protected handleApiError(error: any, operation: string): never {
    if (error.response?.status === 401) {
      throw new Error(`Invalid API key for ${this.name}`);
    }
    
    if (error.response?.status === 429) {
      throw new Error(`Rate limit exceeded for ${this.name}. Please upgrade your plan.`);
    }
    
    super.handleApiError(error, operation);
  }

  // Mock data methods for demo mode
  private getMockPriceData(symbol: string): PriceData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const change = (Math.random() - 0.5) * 6;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol,
      price: basePrice + change,
      change,
      changePercent,
      volume: Math.floor(Math.random() * 40000000) + 20000000,
      timestamp: Date.now(),
      provider: this.name
    };
  }

  private getMockFundamentals(symbol: string): Fundamentals {
    const basePrice = this.getBasePriceForSymbol(symbol);
    
    return {
      symbol,
      marketCap: basePrice * 1000000 * (Math.random() * 4000 + 2000),
      pe: Math.random() * 25 + 12,
      eps: Math.random() * 8 + 3,
      dividend: Math.random() * 2.5,
      dividendYield: Math.random() * 2.5,
      beta: Math.random() * 0.6 + 0.9,
      week52High: basePrice * (1.15 + Math.random() * 0.15),
      week52Low: basePrice * (0.75 + Math.random() * 0.1),
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
      const variance = (Math.random() - 0.5) * 4;
      currentPrice = currentPrice + variance;
      
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const high = currentPrice + Math.random() * 1.5;
      const low = currentPrice - Math.random() * 1.5;
      const close = low + Math.random() * (high - low);
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: currentPrice,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 45000000) + 15000000
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
        description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
        website: 'https://www.apple.com'
      },
      'MSFT': {
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Software',
        description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
        website: 'https://www.microsoft.com'
      },
      'GOOGL': {
        name: 'Alphabet Inc.',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Internet Services',
        description: 'Alphabet Inc. provides online advertising services in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
        website: 'https://www.google.com'
      }
    };
    
    const defaultInfo = {
      name: `${symbol} Corporation`,
      exchange: 'NYSE',
      sector: 'Unknown',
      industry: 'Unknown',
      description: 'Company description not available.',
      website: ''
    };
    
    const info = companies[symbol] || defaultInfo;
    
    return {
      symbol,
      name: info.name || '',
      exchange: info.exchange || '',
      sector: info.sector || '',
      industry: info.industry || '',
      description: info.description || '',
      website: info.website || '',
      employees: Math.floor(Math.random() * 50000) + 1000,
      provider: this.name,
      timestamp: Date.now()
    };
  }

  private getMockNews(symbol: string, limit: number): NewsData {
    const headlines = [
      'Company Reports Strong Q4 Earnings, Beats Expectations',
      'Analysts Upgrade Stock Following Product Launch',
      'Market Volatility Impacts Trading Volume',
      'New Partnership Announced with Industry Leader',
      'CEO Discusses Growth Strategy in Recent Interview',
      'Regulatory Filing Shows Insider Buying Activity',
      'Stock Reaches New 52-Week High on Positive News',
      'Company Expands International Operations',
      'Quarterly Revenue Growth Exceeds Forecasts',
      'Innovation Drive Continues with R&D Investment'
    ];
    
    const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times'];
    
    const items: NewsItem[] = [];
    
    for (let i = 0; i < Math.min(limit, headlines.length); i++) {
      const date = new Date();
      date.setHours(date.getHours() - Math.floor(Math.random() * 72)); // Random time in last 3 days
      
      items.push({
        id: `${symbol}_news_${i}`,
        headline: `${symbol}: ${headlines[i]}`,
        summary: `Latest news about ${symbol} stock performance and company developments. ${headlines[i]} according to market analysts and industry experts.`,
        url: `https://example.com/news/${symbol}/${i}`,
        source: sources[Math.floor(Math.random() * sources.length)],
        publishedAt: date.toISOString(),
        sentiment: Math.random() > 0.5 ? 'positive' : Math.random() > 0.5 ? 'neutral' : 'negative'
      });
    }
    
    return {
      symbol,
      items,
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
      case '1d': return 1;
      case '5d': return 5;
      case '1m': return 30;
      case '3m': return 90;
      case '6m': return 180;
      case '1y': return 252;
      case '5y': return 1260;
      case 'max': return 5040;
      default: return 30;
    }
  }
}