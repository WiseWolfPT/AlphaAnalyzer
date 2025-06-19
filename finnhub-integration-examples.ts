// Finnhub API Integration Examples for TypeScript/Node.js
// For the Alfalyzer project

import finnhub from 'finnhub';

// ========================================
// 1. AUTHENTICATION SETUP
// ========================================

// Basic API client initialization with authentication
export function initializeFinnhubClient(apiKey: string): finnhub.DefaultApi {
  const api_key = finnhub.ApiClient.instance.authentications['api_key'];
  api_key.apiKey = apiKey; // Store your API key in environment variables
  return new finnhub.DefaultApi();
}

// TypeScript example with proper typing
interface FinnhubClientConfig {
  apiKey: string;
  apiKeyPrefix?: string; // Optional prefix like "Token"
}

export function createFinnhubClient(config: FinnhubClientConfig): finnhub.DefaultApi {
  const defaultClient = finnhub.ApiClient.instance;
  const api_key = defaultClient.authentications['api_key'];
  api_key.apiKey = config.apiKey;
  
  if (config.apiKeyPrefix) {
    api_key.apiKeyPrefix = config.apiKeyPrefix;
  }
  
  return new finnhub.DefaultApi();
}

// ========================================
// 2. WEBSOCKET REAL-TIME DATA STREAMING
// ========================================

// Note: The finnhub-js library doesn't include WebSocket support directly
// You'll need to use the WebSocket API separately

import WebSocket from 'ws';

interface TradeData {
  s: string;  // Symbol
  p: number;  // Price
  t: number;  // Timestamp
  v: number;  // Volume
}

export class FinnhubWebSocket {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private reconnectInterval: number = 5000;
  private shouldReconnect: boolean = true;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  connect(): void {
    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

    this.ws.on('open', () => {
      console.log('WebSocket connected');
      // Subscribe to symbols after connection
      this.subscribe(['AAPL', 'MSFT', 'GOOGL']);
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'trade') {
        this.handleTradeData(message.data as TradeData[]);
      }
    });

    this.ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    });
  }

  subscribe(symbols: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      symbols.forEach(symbol => {
        this.ws!.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    }
  }

  unsubscribe(symbols: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      symbols.forEach(symbol => {
        this.ws!.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      });
    }
  }

  private handleTradeData(trades: TradeData[]): void {
    trades.forEach(trade => {
      console.log(`Trade: ${trade.s} - Price: ${trade.p} - Volume: ${trade.v}`);
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
  }
}

// ========================================
// 3. RATE LIMITING BEST PRACTICES
// ========================================

import { RateLimiter } from 'limiter';

export class FinnhubRateLimitedClient {
  private client: finnhub.DefaultApi;
  private limiter: RateLimiter;

  constructor(apiKey: string) {
    this.client = initializeFinnhubClient(apiKey);
    // Finnhub free tier: 60 calls/minute
    // Premium tiers have higher limits
    this.limiter = new RateLimiter({ tokensPerInterval: 60, interval: 'minute' });
  }

  async makeRateLimitedCall<T>(
    apiCall: () => Promise<T>
  ): Promise<T> {
    await this.limiter.removeTokens(1);
    return apiCall();
  }

  // Example: Get quote with rate limiting
  async getQuote(symbol: string): Promise<any> {
    return this.makeRateLimitedCall(() => 
      new Promise((resolve, reject) => {
        this.client.quote(symbol, (error, data, response) => {
          if (error) reject(error);
          else resolve(data);
        });
      })
    );
  }

  // Batch requests to minimize API calls
  async getBatchQuotes(symbols: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async symbol => {
          try {
            const quote = await this.getQuote(symbol);
            results.set(symbol, quote);
          } catch (error) {
            console.error(`Failed to get quote for ${symbol}:`, error);
          }
        })
      );
      
      // Add delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

// ========================================
// 4. ERROR HANDLING PATTERNS
// ========================================

export interface FinnhubError {
  code: string;
  message: string;
  statusCode?: number;
}

export class FinnhubErrorHandler {
  static handleError(error: any): FinnhubError {
    if (error.response) {
      // API responded with error
      return {
        code: error.response.body?.error || 'API_ERROR',
        message: error.response.body?.message || 'An API error occurred',
        statusCode: error.response.status
      };
    } else if (error.request) {
      // Request made but no response
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error: Unable to reach Finnhub API'
      };
    } else {
      // Something else happened
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred'
      };
    }
  }

  static isRateLimitError(error: FinnhubError): boolean {
    return error.statusCode === 429;
  }

  static isAuthenticationError(error: FinnhubError): boolean {
    return error.statusCode === 401;
  }

  static isNotFoundError(error: FinnhubError): boolean {
    return error.statusCode === 404;
  }
}

// Wrapper with comprehensive error handling
export class FinnhubClientWithErrorHandling {
  private client: finnhub.DefaultApi;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(apiKey: string) {
    this.client = initializeFinnhubClient(apiKey);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const finnhubError = FinnhubErrorHandler.handleError(error);
      
      if (FinnhubErrorHandler.isRateLimitError(finnhubError) && retries > 0) {
        console.log(`Rate limit hit, retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.executeWithRetry(operation, retries - 1);
      }
      
      if (FinnhubErrorHandler.isAuthenticationError(finnhubError)) {
        throw new Error('Authentication failed: Check your API key');
      }
      
      throw finnhubError;
    }
  }

  // Example method with error handling
  async getCompanyProfile(symbol: string): Promise<any> {
    return this.executeWithRetry(() =>
      new Promise((resolve, reject) => {
        this.client.companyProfile({ symbol }, (error, data, response) => {
          if (error) reject(error);
          else resolve(data);
        });
      })
    );
  }
}

// ========================================
// 5. TYPESCRIPT TYPES/INTERFACES
// ========================================

// Company Profile
export interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

// Quote Data
export interface Quote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

// Candlestick Data
export interface CandlestickData {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status
  t: number[];  // Timestamps
  v: number[];  // Volumes
}

// News Article
export interface NewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// Earnings Calendar
export interface EarningsEvent {
  date: string;
  epsActual: number;
  epsEstimate: number;
  hour: string;
  quarter: number;
  revenueActual: number;
  revenueEstimate: number;
  symbol: string;
  year: number;
}

// Technical Indicator
export interface TechnicalIndicator {
  [key: string]: number[];
}

// Support & Resistance Levels
export interface SupportResistance {
  levels: number[];
}

// Type-safe client wrapper
export class TypedFinnhubClient {
  private client: finnhub.DefaultApi;

  constructor(apiKey: string) {
    this.client = initializeFinnhubClient(apiKey);
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    return new Promise((resolve, reject) => {
      this.client.companyProfile({ symbol }, (error, data, response) => {
        if (error) reject(error);
        else resolve(data as CompanyProfile);
      });
    });
  }

  async getQuote(symbol: string): Promise<Quote> {
    return new Promise((resolve, reject) => {
      this.client.quote(symbol, (error, data, response) => {
        if (error) reject(error);
        else resolve(data as Quote);
      });
    });
  }

  async getCompanyNews(
    symbol: string,
    from: Date,
    to: Date
  ): Promise<NewsArticle[]> {
    return new Promise((resolve, reject) => {
      this.client.companyNews(symbol, from, to, (error, data, response) => {
        if (error) reject(error);
        else resolve(data as NewsArticle[]);
      });
    });
  }

  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<CandlestickData> {
    return new Promise((resolve, reject) => {
      this.client.stockCandles(symbol, resolution, from, to, (error, data, response) => {
        if (error) reject(error);
        else resolve(data as CandlestickData);
      });
    });
  }
}

// ========================================
// USAGE EXAMPLES
// ========================================

// Example: Complete implementation for Alfalyzer
export class AlfalyzerFinnhubService {
  private typedClient: TypedFinnhubClient;
  private rateLimitedClient: FinnhubRateLimitedClient;
  private websocket: FinnhubWebSocket;

  constructor(apiKey: string) {
    this.typedClient = new TypedFinnhubClient(apiKey);
    this.rateLimitedClient = new FinnhubRateLimitedClient(apiKey);
    this.websocket = new FinnhubWebSocket(apiKey);
  }

  // Get comprehensive stock data
  async getStockAnalysis(symbol: string): Promise<{
    profile: CompanyProfile;
    quote: Quote;
    news: NewsArticle[];
  }> {
    const [profile, quote, news] = await Promise.all([
      this.typedClient.getCompanyProfile(symbol),
      this.typedClient.getQuote(symbol),
      this.typedClient.getCompanyNews(
        symbol,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        new Date()
      )
    ]);

    return { profile, quote, news };
  }

  // Start real-time monitoring
  startRealTimeMonitoring(symbols: string[]): void {
    this.websocket.connect();
    // WebSocket will auto-subscribe after connection
  }

  // Stop monitoring
  stopRealTimeMonitoring(): void {
    this.websocket.disconnect();
  }
}