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

export class AlphaVantageProvider extends BaseMarketDataProvider {
  name: ProviderName = 'alphaVantage';
  priority = 4; // Lowest priority - backup provider
  capabilities: ProviderCapabilities = {
    realTimePrice: true,
    fundamentals: true,
    historical: true,
    news: true,
    companyInfo: true,
    batchRequests: false, // Not supported in free tier
    webSocket: false
  };

  private client: AxiosInstance;
  private baseUrl = 'https://www.alphavantage.co/query';
  private isDemo = false;

  constructor() {
    super();
    // Set API key after name is defined
    this.apiKey = this.getApiKey();
    this.isDemo = this.apiKey === 'demo';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000 // Alpha Vantage can be slow
    });
  }

  async initialize(): Promise<void> {
    try {
      // Skip API verification in demo mode
      if (this.isDemo) {
        console.warn(`[${this.name}] Running in DEMO mode - will return mock data`);
        return;
      }

      // Test the API key with a lightweight request
      await this.client.get('/', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL',
          apikey: this.apiKey
        }
      });
      console.log(`[${this.name}] Initialized successfully`);
    } catch (error) {
      console.error(`[${this.name}] Failed to initialize:`, error);
      throw new Error(`Failed to initialize ${this.name} provider`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'AAPL',
          apikey: this.apiKey
        }
      });
      return response.status === 200 && !response.data['Note'];
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

      const response = await this.client.get('/', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: this.apiKey
        }
      });

      this.checkForRateLimit(response.data);

      const quote = response.data['Global Quote'];
      
      if (!quote || !quote['05. price']) {
        throw new Error(`No price data available for ${symbol}`);
      }

      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

      return {
        symbol,
        price,
        change,
        changePercent,
        volume: parseInt(quote['06. volume']) || 0,
        timestamp: Date.now(),
        provider: this.name
      };
    } catch (error) {
      this.handleApiError(error, 'getPrice');
    }
  }

  async getFundamentals(symbol: string): Promise<Fundamentals> {
    try {
      // Return mock data in demo mode
      if (this.isDemo) {
        return this.getMockFundamentals(symbol);
      }

      const response = await this.client.get('/', {
        params: {
          function: 'OVERVIEW',
          symbol,
          apikey: this.apiKey
        }
      });

      this.checkForRateLimit(response.data);

      const data = response.data;
      
      if (!data.Symbol) {
        throw new Error(`No fundamental data available for ${symbol}`);
      }

      return {
        symbol,
        marketCap: parseFloat(data.MarketCapitalization) || 0,
        pe: parseFloat(data.PERatio) || 0,
        eps: parseFloat(data.EPS) || 0,
        dividend: parseFloat(data.DividendPerShare) || 0,
        dividendYield: parseFloat(data.DividendYield) || 0,
        beta: parseFloat(data.Beta) || 0,
        week52High: parseFloat(data['52WeekHigh']) || 0,
        week52Low: parseFloat(data['52WeekLow']) || 0,
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

      const { function: func, outputsize } = this.getHistoricalParams(range);
      
      const response = await this.client.get('/', {
        params: {
          function: func,
          symbol,
          outputsize,
          apikey: this.apiKey
        }
      });

      this.checkForRateLimit(response.data);

      const timeSeries = this.extractTimeSeries(response.data, func);
      
      if (!timeSeries) {
        throw new Error(`No historical data available for ${symbol}`);
      }

      const data: HistoricalDataPoint[] = [];
      const entries = Object.entries(timeSeries);
      const limit = this.getDataLimit(range);
      
      for (let i = 0; i < Math.min(entries.length, limit); i++) {
        const [date, values] = entries[i] as [string, any];
        data.push({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        });
      }

      return {
        symbol,
        data: data.reverse(), // Alpha Vantage returns newest first
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

      const response = await this.client.get('/', {
        params: {
          function: 'OVERVIEW',
          symbol,
          apikey: this.apiKey
        }
      });

      this.checkForRateLimit(response.data);

      const data = response.data;
      
      if (!data.Symbol) {
        throw new Error(`No company info available for ${symbol}`);
      }

      return {
        symbol,
        name: data.Name || '',
        exchange: data.Exchange || '',
        sector: data.Sector || '',
        industry: data.Industry || '',
        description: data.Description || '',
        website: '', // Not provided by Alpha Vantage
        employees: parseInt(data.FullTimeEmployees) || 0,
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

      const response = await this.client.get('/', {
        params: {
          function: 'NEWS_SENTIMENT',
          tickers: symbol,
          limit,
          apikey: this.apiKey
        }
      });

      this.checkForRateLimit(response.data);

      const feed = response.data.feed || [];
      
      const items: NewsItem[] = feed.map((item: any) => {
        const tickerSentiment = item.ticker_sentiment?.find((t: any) => t.ticker === symbol) || {};
        
        return {
          id: item.url,
          headline: item.title,
          summary: item.summary,
          url: item.url,
          source: item.source,
          publishedAt: this.parseAlphaVantageDate(item.time_published),
          sentiment: this.mapSentimentScore(parseFloat(tickerSentiment.ticker_sentiment_score))
        };
      });

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

  private getHistoricalParams(range: TimeRange): { function: string; outputsize: string } {
    switch (range) {
      case '1d':
      case '5d':
        return { function: 'TIME_SERIES_INTRADAY', outputsize: 'full' };
      case '1m':
      case '3m':
      case '6m':
      case '1y':
        return { function: 'TIME_SERIES_DAILY', outputsize: 'full' };
      case '5y':
      case 'max':
        return { function: 'TIME_SERIES_WEEKLY', outputsize: 'full' };
      default:
        return { function: 'TIME_SERIES_DAILY', outputsize: 'compact' };
    }
  }

  private extractTimeSeries(data: any, func: string): any {
    if (func === 'TIME_SERIES_INTRADAY') {
      return data['Time Series (5min)'] || data['Time Series (15min)'] || data['Time Series (60min)'];
    } else if (func === 'TIME_SERIES_DAILY') {
      return data['Time Series (Daily)'];
    } else if (func === 'TIME_SERIES_WEEKLY') {
      return data['Weekly Time Series'];
    }
    return null;
  }

  private getDataLimit(range: TimeRange): number {
    switch (range) {
      case '1d': return 78; // ~6.5 hours of 5-min data
      case '5d': return 390; // 5 days of 5-min data
      case '1m': return 30;
      case '3m': return 90;
      case '6m': return 180;
      case '1y': return 252;
      case '5y': return 260; // 5 years of weekly data
      case 'max': return 1040; // 20 years of weekly data
      default: return 100;
    }
  }

  private parseAlphaVantageDate(dateStr: string): string {
    // Alpha Vantage format: "20240102T123000"
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
  }

  private mapSentimentScore(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.05) return 'positive';
    if (score < -0.05) return 'negative';
    return 'neutral';
  }

  private checkForRateLimit(data: any): void {
    if (data['Note']) {
      throw new Error(`Rate limit reached for ${this.name}. ${data['Note']}`);
    }
    if (data['Information']) {
      throw new Error(`API limit reached for ${this.name}. ${data['Information']}`);
    }
  }

  // Override to provide Alpha Vantage-specific error handling
  protected handleApiError(error: any, operation: string): never {
    if (error.message?.includes('Rate limit')) {
      throw new Error(`Rate limit exceeded for ${this.name}. Please wait 60 seconds.`);
    }
    
    if (error.response?.status === 503) {
      throw new Error(`${this.name} service temporarily unavailable`);
    }
    
    super.handleApiError(error, operation);
  }

  // Mock data methods for demo mode (similar to other providers)
  private getMockPriceData(symbol: string): PriceData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const change = (Math.random() - 0.5) * 5;
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol,
      price: basePrice + change,
      change,
      changePercent,
      volume: Math.floor(Math.random() * 35000000) + 25000000,
      timestamp: Date.now(),
      provider: this.name
    };
  }

  private getMockFundamentals(symbol: string): Fundamentals {
    const basePrice = this.getBasePriceForSymbol(symbol);
    
    return {
      symbol,
      marketCap: basePrice * 1000000 * (Math.random() * 3500 + 2500),
      pe: Math.random() * 20 + 15,
      eps: Math.random() * 6 + 4,
      dividend: Math.random() * 2,
      dividendYield: Math.random() * 2,
      beta: Math.random() * 0.5 + 1,
      week52High: basePrice * (1.1 + Math.random() * 0.1),
      week52Low: basePrice * (0.8 + Math.random() * 0.05),
      provider: this.name,
      timestamp: Date.now()
    };
  }

  private getMockHistoricalData(symbol: string, range: TimeRange): HistoricalData {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const dataPoints = this.getDataLimit(range);
    
    const data: HistoricalDataPoint[] = [];
    let currentPrice = basePrice;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 3;
      currentPrice = currentPrice + variance;
      
      const date = new Date();
      if (range === '1d' || range === '5d') {
        date.setMinutes(date.getMinutes() - i * 5);
      } else {
        date.setDate(date.getDate() - i);
      }
      
      const high = currentPrice + Math.random() * 1;
      const low = currentPrice - Math.random() * 1;
      const close = low + Math.random() * (high - low);
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: currentPrice,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 40000000) + 20000000
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
        employees: 164000
      },
      'MSFT': {
        name: 'Microsoft Corporation',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Software - Infrastructure',
        description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
        employees: 221000
      },
      'GOOGL': {
        name: 'Alphabet Inc.',
        exchange: 'NASDAQ',
        sector: 'Communication Services',
        industry: 'Internet Content & Information',
        description: 'Alphabet Inc. provides various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
        employees: 190234
      }
    };
    
    const defaultInfo = {
      name: `${symbol} Inc.`,
      exchange: 'NYSE',
      sector: 'Unknown',
      industry: 'Unknown',
      description: 'Company information not available.',
      employees: 0
    };
    
    const info = companies[symbol] || defaultInfo;
    
    return {
      symbol,
      name: info.name || '',
      exchange: info.exchange || '',
      sector: info.sector || '',
      industry: info.industry || '',
      description: info.description || '',
      website: '',
      employees: info.employees || 0,
      provider: this.name,
      timestamp: Date.now()
    };
  }

  private getMockNews(symbol: string, limit: number): NewsData {
    const headlines = [
      'Quarterly Results Beat Analyst Expectations',
      'New Product Line Shows Promise in Early Reviews',
      'Institutional Investors Increase Holdings',
      'Market Share Gains in Key Segments',
      'Strategic Acquisition Completed Successfully',
      'Board Announces Dividend Increase',
      'Technology Innovation Drives Growth',
      'International Expansion Plans Revealed',
      'Strong Holiday Season Sales Reported',
      'Partnership Creates New Revenue Opportunities'
    ];
    
    const sources = ['MarketWatch', 'Seeking Alpha', 'Benzinga', 'The Motley Fool', 'Yahoo Finance'];
    
    const items: NewsItem[] = [];
    
    for (let i = 0; i < Math.min(limit, headlines.length); i++) {
      const date = new Date();
      date.setHours(date.getHours() - Math.floor(Math.random() * 96)); // Random time in last 4 days
      
      const sentiment = Math.random();
      
      items.push({
        id: `${symbol}_av_news_${i}`,
        headline: `${symbol}: ${headlines[i]}`,
        summary: `Breaking news on ${symbol}: ${headlines[i]}. Market analysts are closely watching these developments as they could impact future performance.`,
        url: `https://example.com/av-news/${symbol}/${i}`,
        source: sources[Math.floor(Math.random() * sources.length)],
        publishedAt: date.toISOString(),
        sentiment: sentiment > 0.6 ? 'positive' : sentiment > 0.3 ? 'neutral' : 'negative'
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
}