/**
 * Alpha Vantage Real API Service
 * Handles real stock data with aggressive caching
 */

const axios = require('axios');
const { SupabaseCacheService } = require('./cache/supabase-cache-service.cjs');

class AlphaVantageRealService {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.cache = new SupabaseCacheService();
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.requestWindow = 60000; // 1 minute
    this.maxRequestsPerMinute = 5;
    
    console.log('🔥 Alpha Vantage Real Service initialized');
    console.log(`📊 Using API key: ${this.apiKey.substring(0, 4)}...`);
  }

  /**
   * Get real-time quote with cache
   */
  async getQuote(symbol) {
    const cacheKey = `av_quote_${symbol}`;
    const cacheTTL = 15 * 60; // 15 minutes
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached && cached.data) {
      console.log(`💾 Cache hit for ${symbol}`);
      return { ...cached.data, _cached: true };
    }
    
    console.log(`🌐 Fetching fresh data for ${symbol}`);
    
    try {
      // Rate limit check
      await this.checkRateLimit();
      
      // Fetch from Alpha Vantage
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      if (!response.data['Global Quote']) {
        throw new Error(`No data found for symbol: ${symbol}`);
      }
      
      const quote = this.parseQuote(response.data['Global Quote']);
      
      // Cache the result
      await this.cache.set(cacheKey, quote, cacheTTL);
      
      return quote;
    } catch (error) {
      console.error(`❌ Alpha Vantage error for ${symbol}:`, error.message);
      
      // Check if we have stale cache
      const staleCache = await this.cache.get(cacheKey, true);
      if (staleCache && staleCache.data) {
        console.log(`📦 Using stale cache for ${symbol}`);
        return { ...staleCache.data, _cached: true, _stale: true };
      }
      
      throw error;
    }
  }
  
  /**
   * Parse Alpha Vantage response
   */
  parseQuote(data) {
    return {
      symbol: data['01. symbol'],
      price: parseFloat(data['05. price']),
      change: parseFloat(data['09. change']),
      changePercent: parseFloat(data['10. change percent'].replace('%', '')),
      volume: parseInt(data['06. volume']),
      high: parseFloat(data['03. high']),
      low: parseFloat(data['04. low']),
      open: parseFloat(data['02. open']),
      previousClose: parseFloat(data['08. previous close']),
      timestamp: Date.now() / 1000,
      provider: 'alpha-vantage'
    };
  }
  
  /**
   * Rate limiting
   */
  async checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if window expired
    if (now - this.lastRequestTime > this.requestWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // Check if we're at limit
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = this.requestWindow - (now - this.lastRequestTime);
      console.log(`⏳ Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }
    
    this.requestCount++;
  }
  
  /**
   * Search symbols (for Sprint 2)
   */
  async searchSymbols(query) {
    try {
      await this.checkRateLimit();
      
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'SYMBOL_SEARCH',
          keywords: query,
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      return response.data.bestMatches || [];
    } catch (error) {
      console.error('❌ Symbol search error:', error.message);
      return [];
    }
  }
}

module.exports = { AlphaVantageRealService };