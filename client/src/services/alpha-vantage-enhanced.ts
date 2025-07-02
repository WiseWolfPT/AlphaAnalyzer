// Enhanced Alpha Vantage Service with rate limiting and optimized fundamentals
import { alphaVantageService } from './alpha-vantage';
import { cacheManager } from '../lib/cache-manager';

export interface AlphaVantageRateLimit {
  requests: number;
  resetTime: number;
  remaining: number;
  dailyRequests: number;
  dailyRemaining: number;
}

export interface FundamentalsBundle {
  overview: any;
  earnings: any;
  incomeStatement: any;
  balanceSheet?: any;
  cashFlow?: any;
  timestamp: number;
}

class AlphaVantageEnhancedService {
  // Rate limiting - Alpha Vantage free tier: 25 requests/day, 5 requests/minute
  private minuteCallCount = 0;
  private dailyCallCount = 0;
  private lastMinuteReset = Date.now();
  private lastDayReset = Date.now();
  private maxCallsPerMinute = 4; // Leave buffer for safety
  private maxCallsPerDay = 20; // Leave buffer for safety
  
  // Cache durations optimized for fundamentals data
  private readonly CACHE_DURATIONS = {
    overview: 24 * 60 * 60 * 1000, // 24 hours - company fundamentals change rarely
    earnings: 4 * 60 * 60 * 1000,  // 4 hours - earnings data is quarterly
    incomeStatement: 12 * 60 * 60 * 1000, // 12 hours - financial statements
    balanceSheet: 12 * 60 * 60 * 1000,
    cashFlow: 12 * 60 * 60 * 1000,
    historicalPrices: 60 * 60 * 1000, // 1 hour - price data
  };

  // SECURITY: API key moved to server-side - use proxy endpoints instead
  constructor(private apiKey: string = 'DEPRECATED_USE_SERVER_PROXY') {}

  // Rate limiting management
  private checkRateLimit(): { canMakeRequest: boolean; reason?: string; waitTime?: number } {
    const now = Date.now();
    
    // Reset minute counter
    if (now - this.lastMinuteReset > 60000) {
      this.minuteCallCount = 0;
      this.lastMinuteReset = now;
    }
    
    // Reset daily counter
    if (now - this.lastDayReset > 24 * 60 * 60 * 1000) {
      this.dailyCallCount = 0;
      this.lastDayReset = now;
    }
    
    // Check minute limit
    if (this.minuteCallCount >= this.maxCallsPerMinute) {
      const waitTime = 60000 - (now - this.lastMinuteReset);
      return {
        canMakeRequest: false,
        reason: 'minute_limit',
        waitTime
      };
    }
    
    // Check daily limit
    if (this.dailyCallCount >= this.maxCallsPerDay) {
      const waitTime = (24 * 60 * 60 * 1000) - (now - this.lastDayReset);
      return {
        canMakeRequest: false,
        reason: 'daily_limit',
        waitTime
      };
    }
    
    return { canMakeRequest: true };
  }
  
  private incrementApiCall(): void {
    this.minuteCallCount++;
    this.dailyCallCount++;
    
    // Persist daily count to localStorage
    try {
      const data = {
        count: this.dailyCallCount,
        resetTime: this.lastDayReset
      };
      localStorage.setItem('alphavantage-daily-usage', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist Alpha Vantage usage data:', error);
    }
  }
  
  private loadDailyUsageFromStorage(): void {
    try {
      const stored = localStorage.getItem('alphavantage-daily-usage');
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        
        // Check if it's still the same day
        if (now - data.resetTime < 24 * 60 * 60 * 1000) {
          this.dailyCallCount = data.count;
          this.lastDayReset = data.resetTime;
        }
      }
    } catch (error) {
      console.warn('Failed to load Alpha Vantage usage data:', error);
    }
  }
  
  getRateLimitStatus(): AlphaVantageRateLimit {
    const now = Date.now();
    
    return {
      requests: this.minuteCallCount,
      resetTime: this.lastMinuteReset + 60000,
      remaining: Math.max(0, this.maxCallsPerMinute - this.minuteCallCount),
      dailyRequests: this.dailyCallCount,
      dailyRemaining: Math.max(0, this.maxCallsPerDay - this.dailyCallCount)
    };
  }

  // Enhanced API methods with intelligent caching and rate limiting
  async getCompanyOverviewOptimized(symbol: string): Promise<any> {
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.canMakeRequest) {
      const waitTimeSeconds = Math.ceil((rateLimitCheck.waitTime || 0) / 1000);
      console.warn(`🚫 Alpha Vantage ${rateLimitCheck.reason} reached. Wait ${waitTimeSeconds}s`);
      throw new Error(`Rate limit exceeded (${rateLimitCheck.reason}). Try again in ${waitTimeSeconds} seconds`);
    }

    // Check cache first
    const cacheKey = `alphavantage-overview-${symbol}`;
    const cached = cacheManager.get(cacheKey, 'overview');
    if (cached) {
      console.log(`📦 Alpha Vantage overview cache hit for ${symbol}`);
      return cached;
    }

    try {
      this.incrementApiCall();
      const data = await alphaVantageService.getCompanyOverview(symbol);
      
      // Cache for 24 hours - company overview data changes rarely
      cacheManager.set(cacheKey, data, 'overview', this.CACHE_DURATIONS.overview);
      
      return data;
    } catch (error) {
      console.error(`❌ Alpha Vantage overview error for ${symbol}:`, error);
      throw error;
    }
  }

  async getEarningsOptimized(symbol: string): Promise<any> {
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.canMakeRequest) {
      throw new Error(`Rate limit exceeded (${rateLimitCheck.reason})`);
    }

    const cacheKey = `alphavantage-earnings-${symbol}`;
    const cached = cacheManager.get(cacheKey, 'earnings');
    if (cached) return cached;

    try {
      this.incrementApiCall();
      const data = await alphaVantageService.getEarnings(symbol);
      cacheManager.set(cacheKey, data, 'earnings', this.CACHE_DURATIONS.earnings);
      return data;
    } catch (error) {
      console.error(`❌ Alpha Vantage earnings error for ${symbol}:`, error);
      throw error;
    }
  }

  async getIncomeStatementOptimized(symbol: string): Promise<any> {
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.canMakeRequest) {
      throw new Error(`Rate limit exceeded (${rateLimitCheck.reason})`);
    }

    const cacheKey = `alphavantage-income-${symbol}`;
    const cached = cacheManager.get(cacheKey, 'financials');
    if (cached) return cached;

    try {
      this.incrementApiCall();
      const data = await alphaVantageService.getIncomeStatement(symbol);
      cacheManager.set(cacheKey, data, 'financials', this.CACHE_DURATIONS.incomeStatement);
      return data;
    } catch (error) {
      console.error(`❌ Alpha Vantage income statement error for ${symbol}:`, error);
      throw error;
    }
  }

  // Optimized bundle fetching for fundamentals
  async getFundamentalsBundle(symbol: string): Promise<FundamentalsBundle | null> {
    const bundleCacheKey = `alphavantage-bundle-${symbol}`;
    const cached = cacheManager.get<FundamentalsBundle>(bundleCacheKey, 'financials');
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATIONS.overview) {
      console.log(`📦 Alpha Vantage fundamentals bundle cache hit for ${symbol}`);
      return cached;
    }

    // Check if we have enough API calls remaining for the bundle
    const status = this.getRateLimitStatus();
    const requiredCalls = 3; // overview, earnings, income statement
    
    if (status.dailyRemaining < requiredCalls) {
      console.warn(`⚠️ Insufficient Alpha Vantage API calls remaining (${status.dailyRemaining}/${requiredCalls} needed)`);
      return null;
    }

    try {
      console.log(`🔄 Fetching Alpha Vantage fundamentals bundle for ${symbol}`);
      
      // Fetch the three most important datasets with delays
      const overview = await this.getCompanyOverviewOptimized(symbol);
      
      // Wait 15 seconds between calls to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      const earnings = await this.getEarningsOptimized(symbol);
      
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      const incomeStatement = await this.getIncomeStatementOptimized(symbol);

      const bundle: FundamentalsBundle = {
        overview,
        earnings,
        incomeStatement,
        timestamp: Date.now()
      };

      // Cache the entire bundle
      cacheManager.set(bundleCacheKey, bundle, 'financials', this.CACHE_DURATIONS.overview);
      
      console.log(`✅ Alpha Vantage fundamentals bundle cached for ${symbol}`);
      return bundle;
      
    } catch (error) {
      console.error(`❌ Failed to fetch Alpha Vantage fundamentals bundle for ${symbol}:`, error);
      return null;
    }
  }

  // Priority queue for symbol processing
  private symbolQueue: Array<{ symbol: string; priority: number; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;

  async requestSymbolData(symbol: string, priority: number = 1): Promise<FundamentalsBundle | null> {
    return new Promise((resolve, reject) => {
      this.symbolQueue.push({ symbol, priority, resolve, reject });
      this.symbolQueue.sort((a, b) => b.priority - a.priority); // Higher priority first
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.symbolQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.symbolQueue.length > 0) {
      const { symbol, resolve, reject } = this.symbolQueue.shift()!;
      
      try {
        const data = await this.getFundamentalsBundle(symbol);
        resolve(data);
      } catch (error) {
        reject(error);
      }

      // Wait before processing next item if queue is not empty
      if (this.symbolQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute between symbols
      }
    }

    this.isProcessingQueue = false;
  }

  // Bulk operations optimized for limited API calls
  async getMultipleOverviews(symbols: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // Process symbols one by one with proper delays
    for (const symbol of symbols) {
      const status = this.getRateLimitStatus();
      
      if (status.dailyRemaining <= 0) {
        console.warn(`⚠️ Alpha Vantage daily limit reached. Skipping remaining symbols.`);
        break;
      }
      
      try {
        const data = await this.getCompanyOverviewOptimized(symbol);
        results[symbol] = data;
        
        // Wait 15 seconds between calls
        if (symbols.indexOf(symbol) < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch Alpha Vantage overview for ${symbol}:`, error);
        results[symbol] = null;
      }
    }
    
    return results;
  }

  // Smart data prioritization based on user activity
  async prioritizeSymbolData(symbols: string[], userWatchlist: string[] = []): Promise<void> {
    const prioritizedSymbols = symbols.map(symbol => ({
      symbol,
      priority: userWatchlist.includes(symbol) ? 10 : 1
    }));

    // Add to queue with priorities
    prioritizedSymbols.forEach(({ symbol, priority }) => {
      this.requestSymbolData(symbol, priority);
    });
  }

  // Health check and usage monitoring
  getUsageReport(): {
    minute: { used: number; limit: number; resetIn: number };
    daily: { used: number; limit: number; resetIn: number };
    cacheHitRate: number;
  } {
    const now = Date.now();
    
    return {
      minute: {
        used: this.minuteCallCount,
        limit: this.maxCallsPerMinute,
        resetIn: Math.max(0, 60000 - (now - this.lastMinuteReset))
      },
      daily: {
        used: this.dailyCallCount,
        limit: this.maxCallsPerDay,
        resetIn: Math.max(0, (24 * 60 * 60 * 1000) - (now - this.lastDayReset))
      },
      cacheHitRate: cacheManager.getStats().hitRate
    };
  }

  // Initialize the service
  init(): void {
    this.loadDailyUsageFromStorage();
    console.log('🔧 Alpha Vantage Enhanced Service initialized');
    console.log('📊 Usage status:', this.getUsageReport());
  }

  // Emergency cache clear if needed
  clearCache(): void {
    cacheManager.clear();
    console.log('🗑️ Alpha Vantage cache cleared');
  }
}

export const alphaVantageEnhanced = new AlphaVantageEnhancedService();

// Initialize on module load
alphaVantageEnhanced.init();