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

export class FinnhubProvider extends BaseMarketDataProvider {
  name: ProviderName = 'finnhub';
  priority = 1;
  capabilities: ProviderCapabilities = {
    realTimePrice: true,
    fundamentals: true,
    historical: false, // Finnhub free tier doesn't include historical
    news: true,
    companyInfo: true,
    batchRequests: false,
    webSocket: true
  };

  private client: AxiosInstance;
  private baseUrl = 'https://finnhub.io/api/v1';
  private isDemo = false;

  constructor() {
    super();
    // Set API key after name is defined
    this.apiKey = this.getApiKey();
    this.isDemo = this.apiKey === 'demo';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'X-Finnhub-Token': this.apiKey
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
      await this.client.get('/stock/profile2', {
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
      const response = await this.client.get('/stock/profile2', {
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
      
      if (!data.c || data.c === 0) {
        throw new Error(`No price data available for ${symbol}`);
      }

      return {
        symbol,
        price: data.c, // Current price
        change: data.d || 0, // Change
        changePercent: data.dp || 0, // Change percent
        volume: data.v || 0, // Volume
        timestamp: Date.now(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getPrice');
    }
  }

  async getFundamentals(symbol: string): Promise<Fundamentals> {
    try {
      // Finnhub requires multiple endpoints for full fundamentals
      const [metricsResponse, profileResponse] = await Promise.all([
        this.client.get('/stock/metric', {
          params: { symbol, metric: 'all' }
        }),
        this.client.get('/stock/profile2', {
          params: { symbol }
        })
      ]);

      const metrics = metricsResponse.data.metric || {};
      const profile = profileResponse.data;

      return {
        symbol,
        marketCap: profile.marketCapitalization || 0,
        pe: metrics.peNormalizedAnnual || 0,
        eps: metrics.epsBasicExclExtraItemsAnnual || 0,
        dividend: metrics.dividendPerShareAnnual || 0,
        dividendYield: metrics.dividendYield || 0,
        beta: metrics.beta || 0,
        week52High: metrics['52WeekHigh'] || 0,
        week52Low: metrics['52WeekLow'] || 0,
        provider: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleApiError(error, 'getFundamentals');
    }
  }

  async getHistorical(symbol: string, range: TimeRange): Promise<HistoricalData> {
    // Finnhub free tier doesn't support historical data
    throw new Error(`Historical data not available in ${this.name} free tier`);
  }

  async getCompanyInfo(symbol: string): Promise<CompanyInfo> {
    try {
      const response = await this.client.get('/stock/profile2', {
        params: { symbol }
      });

      const data = response.data;
      
      if (!data.name) {
        throw new Error(`No company info available for ${symbol}`);
      }

      return {
        symbol,
        name: data.name || '',
        exchange: data.exchange || '',
        sector: data.finnhubIndustry || '',
        industry: data.finnhubIndustry || '',
        description: '', // Not available in profile2
        website: data.weburl || '',
        employees: 0, // Not available in free tier
        provider: this.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleApiError(error, 'getCompanyInfo');
    }
  }

  async getNews(symbol: string, limit = 10): Promise<NewsData> {
    try {
      // Calculate date range (last 7 days)
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 7);

      const response = await this.client.get('/company-news', {
        params: {
          symbol,
          from: from.toISOString().split('T')[0],
          to: to.toISOString().split('T')[0]
        }
      });

      const newsItems = response.data || [];
      
      // Transform and limit results
      const items: NewsItem[] = newsItems.slice(0, limit).map((item: any) => ({
        id: item.id.toString(),
        headline: item.headline,
        summary: item.summary,
        url: item.url,
        source: item.source,
        publishedAt: new Date(item.datetime * 1000).toISOString(),
        sentiment: this.categorizeSentiment(item.sentiment)
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

  private categorizeSentiment(score?: number): 'positive' | 'negative' | 'neutral' {
    if (!score) return 'neutral';
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  // Override to provide Finnhub-specific error handling
  protected handleApiError(error: any, operation: string): never {
    if (error.response?.status === 403) {
      throw new Error(`Invalid API key for ${this.name}`);
    }
    
    if (error.response?.status === 429) {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const waitTime = resetTime ? new Date(parseInt(resetTime) * 1000) : 'unknown';
      throw new Error(`Rate limit exceeded for ${this.name}. Reset at: ${waitTime}`);
    }
    
    if (error.response?.status === 404) {
      throw new Error(`Symbol not found in ${this.name}`);
    }
    
    super.handleApiError(error, operation);
  }

  // Mock data methods for demo mode
  private getMockPriceData(symbol: string): PriceData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol,
      price: basePrice + change,
      change,
      changePercent,
      volume: Math.floor(Math.random() * 50000000) + 10000000,
      timestamp: Date.now(),
      provider: this.name
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
}