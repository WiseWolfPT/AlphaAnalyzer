/**
 * Alpha Vantage Real API Service
 * Handles real stock data with aggressive caching
 */

import axios from 'axios';
import { SupabaseCacheService } from './cache/supabase-cache-service';

// Types
interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

interface AlphaVantageGlobalQuote {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

export class AlphaVantageRealService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private cache: SupabaseCacheService;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    if (!this.apiKey || this.apiKey === 'demo') {
      console.warn('⚠️ Alpha Vantage Real API key not configured properly');
    }
    this.cache = new SupabaseCacheService();
    
    console.log('🏦 Alpha Vantage Real Service initialized');
    console.log(`📊 API Key: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`);
  }

  /**
   * Get real-time quote for a specific symbol
   * Uses cache to respect rate limits (5 requests/min)
   */
  async getQuote(symbol: string): Promise<AlphaVantageQuote> {
    const cacheKey = `av_quote_${symbol}`;
    const cacheTTL = 15 * 60; // 15 minutes
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached && cached.data) {
        console.log(`💾 Cache hit for ${symbol}`);
        return { ...cached.data, _cached: true };
      }

      // Rate limit protection (5 requests per minute)
      await this.enforceRateLimit();

      // Make API request
      console.log(`🌐 Fetching real data for ${symbol} from Alpha Vantage`);
      const response = await axios.get<AlphaVantageGlobalQuote>(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      if (!response.data['Global Quote']) {
        throw new Error(`No data found for symbol ${symbol}`);
      }

      const quote = this.transformQuote(response.data);
      
      // Cache the result
      await this.cache.set(cacheKey, quote, cacheTTL);
      console.log(`✅ Successfully fetched and cached ${symbol}`);

      return quote;
    } catch (error) {
      console.error(`❌ Error fetching ${symbol}:`, error.message);
      
      // Return cached data even if expired
      const expiredCache = await this.cache.get(cacheKey, true);
      if (expiredCache && expiredCache.data) {
        console.log(`🔄 Returning expired cache for ${symbol}`);
        return { ...expiredCache.data, _cached: true, _expired: true };
      }

      throw error;
    }
  }

  /**
   * Transform Alpha Vantage response to our format
   */
  private transformQuote(data: AlphaVantageGlobalQuote): AlphaVantageQuote {
    const quote = data['Global Quote'];
    const price = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const change = parseFloat(quote['09. change']);
    const changePercent = quote['10. change percent'].replace('%', '');

    return {
      symbol: quote['01. symbol'],
      price: price,
      change: change,
      changePercent: parseFloat(changePercent),
      volume: parseInt(quote['06. volume']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      open: parseFloat(quote['02. open']),
      previousClose: previousClose,
      timestamp: Date.now() / 1000,
      provider: 'alpha_vantage',
      _cached: false
    };
  }

  /**
   * Enforce rate limiting (5 requests per minute)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const oneMinute = 60 * 1000;

    // Reset counter if more than a minute has passed
    if (timeSinceLastRequest > oneMinute) {
      this.requestCount = 0;
    }

    // If we've made 5 requests in the last minute, wait
    if (this.requestCount >= 5) {
      const waitTime = oneMinute - timeSinceLastRequest;
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      }
    }

    this.requestCount++;
    this.lastRequestTime = now;
  }

  /**
   * Get multiple quotes (with rate limit awareness)
   */
  async getBatchQuotes(symbols: string[]): Promise<AlphaVantageQuote[]> {
    console.log(`📊 Fetching batch quotes for ${symbols.length} symbols`);
    const quotes: AlphaVantageQuote[] = [];

    for (const symbol of symbols) {
      try {
        const quote = await this.getQuote(symbol);
        quotes.push(quote);
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error.message);
        // Continue with other symbols
      }
    }

    return quotes;
  }

  /**
   * Search for symbols (lightweight endpoint)
   */
  async searchSymbols(query: string): Promise<any[]> {
    const cacheKey = `av_search_${query.toLowerCase()}`;
    const cacheTTL = 24 * 60 * 60; // 24 hours for search results

    try {
      // Check cache
      const cached = await this.cache.get(cacheKey);
      if (cached && cached.data) {
        return cached.data;
      }

      await this.enforceRateLimit();

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: query,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const results = response.data.bestMatches || [];
      
      // Cache results
      await this.cache.set(cacheKey, results, cacheTTL);

      return results;
    } catch (error) {
      console.error('Search error:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const alphaVantageService = new AlphaVantageRealService();