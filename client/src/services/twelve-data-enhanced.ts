// Enhanced Twelve Data API Service
// Optimized for 800 calls/day with comprehensive TypeScript support
import { cacheManager } from '../lib/cache-manager';

export interface TwelveDataConfig {
  apiKey: string;
  baseUrl?: string;
  dailyLimit?: number;
  retryAttempts?: number;
  timeout?: number;
}

export interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previous_close: number;
  change: number;
  percent_change: number;
  average_volume: number;
  is_market_open: boolean;
  fifty_two_week?: {
    low: number;
    high: number;
    low_change: number;
    high_change: number;
    low_change_percent: number;
    high_change_percent: number;
    range: string;
  };
}

export interface TwelveDataTimeSeries {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: TwelveDataTimeSeriesValue[];
  status?: string;
}

export interface TwelveDataTimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TwelveDataProfile {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  country: string;
  type: string;
  assetType?: string;
}

export interface TwelveDataEarnings {
  symbol: string;
  earnings: Array<{
    date: string;
    time: string;
    eps_estimate: number;
    eps_actual?: number;
    revenue_estimate: number;
    revenue_actual?: number;
  }>;
}

export interface TwelveDataDividends {
  symbol: string;
  dividends: Array<{
    ex_date: string;
    amount: number;
    record_date: string;
    payment_date: string;
    declaration_date: string;
  }>;
}

export interface TwelveDataTechnicalIndicator {
  meta: {
    symbol: string;
    indicator: string;
    last_refreshed: string;
    interval: string;
    period: number;
  };
  values: Array<{
    datetime: string;
    value?: number;
    [key: string]: any;
  }>;
  status?: string;
}

export interface TwelveDataRateLimit {
  used: number;
  remaining: number;
  limit: number;
  resetTime: Date;
  requestsThisMinute: number;
  creditsThisMinute: number;
}

export interface TwelveDataBatchRequest {
  symbols: string[];
  interval: string;
  outputsize?: number;
  start_date?: string;
  end_date?: string;
}

export interface TwelveDataBatchResponse {
  [symbol: string]: TwelveDataTimeSeries;
}

export type TwelveDataInterval = '1min' | '5min' | '15min' | '30min' | '45min' | '1h' | '2h' | '4h' | '1day' | '1week' | '1month';
export type TwelveDataPeriod = 'annual' | 'quarter';
export type TwelveDataOutputSize = 'compact' | 'full';

export class TwelveDataEnhancedService {
  private config: Required<TwelveDataConfig>;
  private requestCount: number = 0;
  private dailyRequestCount: number = 0;
  private lastResetDate: string = '';
  private requestsThisMinute: Array<{ timestamp: number; credits: number }> = [];
  private readonly MAX_REQUESTS_PER_MINUTE = 8; // Free tier limit
  private readonly MAX_CREDITS_PER_MINUTE = 8;

  constructor(config: TwelveDataConfig) {
    this.config = {
      baseUrl: 'https://api.twelvedata.com',
      dailyLimit: 800,
      retryAttempts: 3,
      timeout: 10000,
      ...config
    };
    this.initializeDailyTracking();
  }

  private initializeDailyTracking(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}, credits: number = 1): Promise<T> {
    this.initializeDailyTracking();
    
    // Check daily limit
    if (this.dailyRequestCount >= this.config.dailyLimit) {
      throw new Error(`Daily API limit reached (${this.config.dailyLimit} requests)`);
    }

    // Rate limiting check
    const now = Date.now();
    this.requestsThisMinute = this.requestsThisMinute.filter(req => now - req.timestamp < 60000);
    
    const requestsThisMinute = this.requestsThisMinute.length;
    const creditsThisMinute = this.requestsThisMinute.reduce((sum, req) => sum + req.credits, 0);
    
    if (requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE || creditsThisMinute + credits > this.MAX_CREDITS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.requestsThisMinute[0]?.timestamp || 0);
      console.warn(`Twelve Data rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 1000)));
    }

    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    url.searchParams.append('apikey', this.config.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(','));
        } else {
          url.searchParams.append(key, value.toString());
        }
      }
    });

    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Alfalyzer/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
            console.warn(`Twelve Data rate limited, waiting ${retryAfter}s`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          
          if (response.status === 401 || response.status === 403) {
            throw new Error('API key invalid or limit exceeded');
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Check for API error in response
        if (data.code && data.message) {
          throw new Error(`Twelve Data API Error: ${data.message}`);
        }

        if (data.status === 'error') {
          throw new Error(`Twelve Data Error: ${data.message || 'Unknown error'}`);
        }

        // Track successful request
        this.requestCount++;
        this.dailyRequestCount++;
        this.requestsThisMinute.push({ timestamp: now, credits });

        return data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`Twelve Data request failed, retrying in ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // Real-time Quote
  async getQuote(symbol: string): Promise<TwelveDataQuote> {
    const cacheKey = `twelve-quote-${symbol}`;
    const cached = cacheManager.get<TwelveDataQuote>(cacheKey, 'stock-quote');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for quote ${symbol}`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching quote for ${symbol}`);
    const data = await this.makeRequest<TwelveDataQuote>('/quote', { symbol });
    
    cacheManager.set(cacheKey, data, 'stock-quote');
    return data;
  }

  // Batch quotes (up to 120 symbols)
  async getBatchQuotes(symbols: string[]): Promise<TwelveDataBatchResponse> {
    if (symbols.length === 0) return {};
    if (symbols.length > 120) {
      throw new Error('Maximum 120 symbols allowed per batch request');
    }
    
    const symbolsParam = symbols.join(',');
    const cacheKey = `twelve-batch-quotes-${symbolsParam}`;
    const cached = cacheManager.get<TwelveDataBatchResponse>(cacheKey, 'stock-quote');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for batch quotes: ${symbols.length} symbols`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching batch quotes for ${symbols.length} symbols`);
    const data = await this.makeRequest<TwelveDataBatchResponse>('/quote', { symbol: symbolsParam });
    
    cacheManager.set(cacheKey, data, 'stock-quote');
    return data;
  }

  // Time Series Data
  async getTimeSeries(
    symbol: string,
    interval: TwelveDataInterval,
    outputsize: number = 30,
    start_date?: string,
    end_date?: string
  ): Promise<TwelveDataTimeSeries> {
    const cacheKey = `twelve-timeseries-${symbol}-${interval}-${outputsize}-${start_date || ''}-${end_date || ''}`;
    const cached = cacheManager.get<TwelveDataTimeSeries>(cacheKey, 'historical');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for time series ${symbol}`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching time series for ${symbol}`);
    const params: Record<string, any> = {
      symbol,
      interval,
      outputsize
    };
    
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;

    const data = await this.makeRequest<TwelveDataTimeSeries>('/time_series', params);
    
    cacheManager.set(cacheKey, data, 'historical');
    return data;
  }

  // Batch Time Series (efficient for multiple symbols)
  async getBatchTimeSeries(request: TwelveDataBatchRequest): Promise<TwelveDataBatchResponse> {
    if (request.symbols.length > 120) {
      throw new Error('Maximum 120 symbols allowed per batch request');
    }

    const cacheKey = `twelve-batch-timeseries-${JSON.stringify(request)}`;
    const cached = cacheManager.get<TwelveDataBatchResponse>(cacheKey, 'historical');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for batch time series: ${request.symbols.length} symbols`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching batch time series for ${request.symbols.length} symbols`);
    const params: Record<string, any> = {
      symbol: request.symbols.join(','),
      interval: request.interval
    };
    
    if (request.outputsize) params.outputsize = request.outputsize;
    if (request.start_date) params.start_date = request.start_date;
    if (request.end_date) params.end_date = request.end_date;

    const data = await this.makeRequest<TwelveDataBatchResponse>('/time_series', params, request.symbols.length);
    
    cacheManager.set(cacheKey, data, 'historical');
    return data;
  }

  // Profile/Company Information
  async getProfile(symbol: string): Promise<TwelveDataProfile> {
    const cacheKey = `twelve-profile-${symbol}`;
    const cached = cacheManager.get<TwelveDataProfile>(cacheKey, 'profile');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for profile ${symbol}`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching profile for ${symbol}`);
    const data = await this.makeRequest<TwelveDataProfile>('/profile', { symbol });
    
    cacheManager.set(cacheKey, data, 'profile');
    return data;
  }

  // Earnings Calendar
  async getEarnings(symbol: string): Promise<TwelveDataEarnings> {
    const cacheKey = `twelve-earnings-${symbol}`;
    const cached = cacheManager.get<TwelveDataEarnings>(cacheKey, 'earnings');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for earnings ${symbol}`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching earnings for ${symbol}`);
    const data = await this.makeRequest<TwelveDataEarnings>('/earnings', { symbol });
    
    cacheManager.set(cacheKey, data, 'earnings');
    return data;
  }

  // Dividends
  async getDividends(symbol: string, range?: string): Promise<TwelveDataDividends> {
    const cacheKey = `twelve-dividends-${symbol}-${range || ''}`;
    const cached = cacheManager.get<TwelveDataDividends>(cacheKey, 'earnings');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for dividends ${symbol}`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching dividends for ${symbol}`);
    const params: Record<string, any> = { symbol };
    if (range) params.range = range;

    const data = await this.makeRequest<TwelveDataDividends>('/dividends', params);
    
    cacheManager.set(cacheKey, data, 'earnings');
    return data;
  }

  // Technical Indicators
  async getTechnicalIndicator(
    symbol: string,
    indicator: string,
    interval: TwelveDataInterval,
    period: number = 14,
    outputsize: number = 30
  ): Promise<TwelveDataTechnicalIndicator> {
    const cacheKey = `twelve-tech-${symbol}-${indicator}-${interval}-${period}-${outputsize}`;
    const cached = cacheManager.get<TwelveDataTechnicalIndicator>(cacheKey, 'historical');
    
    if (cached) {
      console.log(`📦 Twelve Data cache hit for ${indicator} ${symbol}`);
      return cached;
    }

    console.log(`🔄 Twelve Data fetching ${indicator} for ${symbol}`);
    const data = await this.makeRequest<TwelveDataTechnicalIndicator>(`/${indicator}`, {
      symbol,
      interval,
      period,
      outputsize
    });
    
    cacheManager.set(cacheKey, data, 'historical');
    return data;
  }

  // RSI
  async getRSI(symbol: string, interval: TwelveDataInterval, period: number = 14): Promise<TwelveDataTechnicalIndicator> {
    return this.getTechnicalIndicator(symbol, 'rsi', interval, period);
  }

  // Moving Average
  async getMA(symbol: string, interval: TwelveDataInterval, period: number = 20): Promise<TwelveDataTechnicalIndicator> {
    return this.getTechnicalIndicator(symbol, 'ma', interval, period);
  }

  // MACD
  async getMACD(symbol: string, interval: TwelveDataInterval): Promise<TwelveDataTechnicalIndicator> {
    return this.getTechnicalIndicator(symbol, 'macd', interval);
  }

  // API Usage
  async getApiUsage(): Promise<any> {
    console.log(`🔄 Twelve Data fetching API usage`);
    return this.makeRequest<any>('/api_usage');
  }

  // Rate Limit Information
  getRateLimitInfo(): TwelveDataRateLimit {
    const now = Date.now();
    const requestsThisMinute = this.requestsThisMinute.filter(req => now - req.timestamp < 60000);
    const creditsThisMinute = requestsThisMinute.reduce((sum, req) => sum + req.credits, 0);

    return {
      used: this.dailyRequestCount,
      remaining: this.config.dailyLimit - this.dailyRequestCount,
      limit: this.config.dailyLimit,
      resetTime: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Next day
      requestsThisMinute: requestsThisMinute.length,
      creditsThisMinute
    };
  }

  // Optimize requests for maximum efficiency
  optimizeSymbolRequests(symbols: string[], maxRequests?: number): {
    batches: string[][];
    estimatedRequests: number;
    estimatedCredits: number;
    strategy: string;
  } {
    const remainingRequests = maxRequests || (this.config.dailyLimit - this.dailyRequestCount);
    const maxSymbolsPerBatch = 120; // Twelve Data batch limit
    
    if (symbols.length <= remainingRequests * maxSymbolsPerBatch) {
      // We can process all symbols efficiently with batching
      const batches: string[][] = [];
      for (let i = 0; i < symbols.length; i += maxSymbolsPerBatch) {
        batches.push(symbols.slice(i, i + maxSymbolsPerBatch));
      }
      
      return {
        batches,
        estimatedRequests: batches.length,
        estimatedCredits: symbols.length, // 1 credit per symbol in batch
        strategy: `Processing all ${symbols.length} symbols in ${batches.length} efficient batch(es)`
      };
    }
    
    // Limited by remaining requests
    const affordableSymbols = remainingRequests * maxSymbolsPerBatch;
    const limitedSymbols = symbols.slice(0, affordableSymbols);
    const batches: string[][] = [];
    
    for (let i = 0; i < limitedSymbols.length; i += maxSymbolsPerBatch) {
      batches.push(limitedSymbols.slice(i, i + maxSymbolsPerBatch));
    }
    
    return {
      batches,
      estimatedRequests: batches.length,
      estimatedCredits: limitedSymbols.length,
      strategy: `Limited to ${affordableSymbols} symbols due to quota constraints`
    };
  }

  // Get optimization recommendations
  getOptimizationRecommendations(): string[] {
    const rateLimitInfo = this.getRateLimitInfo();
    const usagePercentage = (rateLimitInfo.used / rateLimitInfo.limit) * 100;
    const recommendations: string[] = [];

    if (usagePercentage < 20) {
      recommendations.push('✅ Excellent! You have plenty of API quota remaining');
      recommendations.push('💡 Use batch requests to fetch up to 120 symbols per call');
      recommendations.push('🚀 Consider enabling WebSocket for real-time data (no credits used)');
    } else if (usagePercentage < 50) {
      recommendations.push('📊 Moderate API usage - good balance');
      recommendations.push('🔄 Implement aggressive caching for repeated data');
      recommendations.push('📦 Use batch requests to maximize efficiency');
    } else if (usagePercentage < 80) {
      recommendations.push('⚠️ High API usage detected');
      recommendations.push('📦 Enable maximum caching to reduce requests');
      recommendations.push('🎯 Prioritize most critical symbols only');
      recommendations.push('⚡ Switch to WebSocket for active monitoring');
    } else {
      recommendations.push('🚨 Critical: Very high API usage!');
      recommendations.push('⬆️ Consider upgrading your Twelve Data plan');
      recommendations.push('🔒 Implement strict symbol prioritization');
      recommendations.push('⚡ Use WebSocket exclusively for real-time data');
    }

    recommendations.push(`📊 Daily usage: ${rateLimitInfo.used}/${rateLimitInfo.limit} requests (${rateLimitInfo.remaining} remaining)`);
    recommendations.push(`⏱️ Current minute: ${rateLimitInfo.requestsThisMinute}/${this.MAX_REQUESTS_PER_MINUTE} requests, ${rateLimitInfo.creditsThisMinute}/${this.MAX_CREDITS_PER_MINUTE} credits`);

    return recommendations;
  }

  // Intelligent request scheduling
  async scheduleRequest<T>(operation: () => Promise<T>, credits: number = 1): Promise<T> {
    const rateLimitInfo = this.getRateLimitInfo();
    
    // Check if we need to wait for rate limits
    if (rateLimitInfo.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE || 
        rateLimitInfo.creditsThisMinute + credits > this.MAX_CREDITS_PER_MINUTE) {
      
      const waitTime = 60000 - (Date.now() - (this.requestsThisMinute[0]?.timestamp || 0));
      console.log(`🕐 Scheduling request after ${waitTime}ms to respect rate limits`);
      await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 1000)));
    }

    return operation();
  }

  // Batch optimization utility
  async processLargeSymbolList(
    symbols: string[],
    operation: (batch: string[]) => Promise<any>,
    batchSize: number = 120
  ): Promise<Record<string, any>> {
    const optimization = this.optimizeSymbolRequests(symbols);
    console.log(`🎯 ${optimization.strategy}`);
    
    const results: Record<string, any> = {};
    
    for (let i = 0; i < optimization.batches.length; i++) {
      const batch = optimization.batches[i];
      
      try {
        console.log(`📊 Processing batch ${i + 1}/${optimization.batches.length} (${batch.length} symbols)`);
        
        const batchResult = await this.scheduleRequest(
          () => operation(batch),
          batch.length
        );
        
        // Merge results based on response structure
        if (typeof batchResult === 'object' && batchResult !== null) {
          Object.assign(results, batchResult);
        }
        
        // Add delay between batches for rate limiting
        if (i < optimization.batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        // Continue with next batch instead of failing completely
      }
    }
    
    return results;
  }
}

// Global Twelve Data service instance
let twelveDataService: TwelveDataEnhancedService | null = null;

export const initializeTwelveDataService = (apiKey: string): TwelveDataEnhancedService => {
  twelveDataService = new TwelveDataEnhancedService({ apiKey });
  return twelveDataService;
};

export const getTwelveDataService = (): TwelveDataEnhancedService => {
  if (!twelveDataService) {
    throw new Error('Twelve Data Service not initialized. Call initializeTwelveDataService() first.');
  }
  return twelveDataService;
};

export { twelveDataService };