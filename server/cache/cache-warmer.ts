import { advancedCache } from './advanced-cache-manager';
// import { MarketDataOrchestrator } from '../../client/src/services/api/market-data-orchestrator';
import { EventEmitter } from 'events';

interface WarmingTask {
  symbol: string;
  dataType: 'quote' | 'fundamentals' | 'charts' | 'all';
  priority: 'high' | 'medium' | 'low';
  scheduledTime: number;
}

interface WarmingStats {
  tasksCompleted: number;
  tasksQueued: number;
  apiCallsUsed: number;
  lastWarmingTime: number;
  errors: string[];
}

export class CacheWarmer extends EventEmitter {
  private queue: WarmingTask[] = [];
  private isProcessing = false;
  private stats: WarmingStats = {
    tasksCompleted: 0,
    tasksQueued: 0,
    apiCallsUsed: 0,
    lastWarmingTime: 0,
    errors: []
  };
  
  private orchestrator: MarketDataOrchestrator;
  private rateLimiter: Map<string, number> = new Map();
  
  // Popular stocks that should always be warm
  private readonly popularStocks = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
    'META', 'NVDA', 'JPM', 'V', 'JNJ',
    'UNH', 'PG', 'HD', 'BAC', 'MA',
    'DIS', 'ADBE', 'CRM', 'NFLX', 'PYPL'
  ];

  // S&P 500 sector ETFs for broad market coverage
  private readonly sectorETFs = [
    'SPY', 'XLK', 'XLF', 'XLV', 'XLE',
    'XLI', 'XLB', 'XLP', 'XLU', 'XLRE'
  ];

  constructor() {
    super();
    this.orchestrator = new MarketDataOrchestrator();
    
    // Listen for cache warming requests
    advancedCache.on('warmCache', (symbols: string[]) => {
      this.addWarmingTasks(symbols, 'all', 'high');
    });

    // Start background processing
    this.startBackgroundProcessing();
  }

  /**
   * Add symbols to warming queue
   */
  addWarmingTasks(
    symbols: string[], 
    dataType: WarmingTask['dataType'] = 'all',
    priority: WarmingTask['priority'] = 'medium'
  ): void {
    const now = Date.now();
    
    for (const symbol of symbols) {
      // Avoid duplicate tasks
      const existingTask = this.queue.find(task => 
        task.symbol === symbol && task.dataType === dataType
      );
      
      if (!existingTask) {
        this.queue.push({
          symbol,
          dataType,
          priority,
          scheduledTime: now
        });
        
        this.stats.tasksQueued++;
      }
    }

    // Sort queue by priority and scheduled time
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return a.scheduledTime - b.scheduledTime;
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process warming queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    console.log(`🔥 Processing ${this.queue.length} warming tasks`);

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        
        // Check rate limits
        if (this.shouldThrottle(task.dataType)) {
          console.log(`⏳ Rate limited, delaying ${task.symbol} ${task.dataType}`);
          await this.sleep(1000);
          continue;
        }

        try {
          await this.warmSingleStock(task);
          this.stats.tasksCompleted++;
          this.stats.lastWarmingTime = Date.now();
          
          // Small delay to avoid overwhelming APIs
          await this.sleep(100);
        } catch (error) {
          const errorMsg = `Failed to warm ${task.symbol}: ${error}`;
          this.stats.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    console.log(`✅ Completed warming batch. Stats:`, this.getStats());
  }

  /**
   * Warm a single stock with all required data
   */
  private async warmSingleStock(task: WarmingTask): Promise<void> {
    const { symbol, dataType } = task;
    console.log(`🔥 Warming ${symbol} (${dataType})`);

    switch (dataType) {
      case 'quote':
        await this.warmQuote(symbol);
        break;
      case 'fundamentals':
        await this.warmFundamentals(symbol);
        break;
      case 'charts':
        await this.warmCharts(symbol);
        break;
      case 'all':
        await this.warmQuote(symbol);
        await this.warmFundamentals(symbol);
        await this.warmCharts(symbol);
        break;
    }
  }

  /**
   * Warm quote data
   */
  private async warmQuote(symbol: string): Promise<void> {
    const key = `cache:v1:quote:${symbol}:realtime`;
    
    await advancedCache.get(key, async () => {
      this.stats.apiCallsUsed++;
      this.updateRateLimit('quote');
      return await this.orchestrator.getRealTimeQuote(symbol);
    }, {
      dataType: 'quote',
      symbol
    });
  }

  /**
   * Warm fundamentals data
   */
  private async warmFundamentals(symbol: string): Promise<void> {
    const key = `cache:v1:fundamentals:${symbol}:daily`;
    
    await advancedCache.get(key, async () => {
      this.stats.apiCallsUsed++;
      this.updateRateLimit('fundamentals');
      return await this.orchestrator.getFundamentals(symbol);
    }, {
      dataType: 'fundamentals',
      symbol
    });
  }

  /**
   * Warm chart data for multiple timeframes
   */
  private async warmCharts(symbol: string): Promise<void> {
    const timeframes = ['1D', '1W', '1M', '3M', '6M', '1Y'];
    
    for (const timeframe of timeframes) {
      const key = `cache:v1:chart:${symbol}:${timeframe}`;
      
      await advancedCache.get(key, async () => {
        this.stats.apiCallsUsed++;
        this.updateRateLimit('charts');
        return await this.orchestrator.getHistoricalData(symbol, '1day', this.getOutputSize(timeframe));
      }, {
        dataType: 'charts',
        symbol
      });
    }
  }

  private getOutputSize(timeframe: string): number {
    const sizes = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365
    };
    return sizes[timeframe as keyof typeof sizes] || 30;
  }

  /**
   * Rate limiting logic
   */
  private shouldThrottle(dataType: string): boolean {
    const now = Date.now();
    const limits = {
      quote: { calls: 200, window: 3600000 }, // 200 calls per hour
      fundamentals: { calls: 50, window: 3600000 }, // 50 calls per hour
      charts: { calls: 100, window: 3600000 } // 100 calls per hour
    };

    const limit = limits[dataType as keyof typeof limits];
    if (!limit) return false;

    const windowStart = now - limit.window;
    const recentCalls = this.rateLimiter.get(dataType) || 0;

    return recentCalls >= limit.calls;
  }

  private updateRateLimit(dataType: string): void {
    const current = this.rateLimiter.get(dataType) || 0;
    this.rateLimiter.set(dataType, current + 1);

    // Reset counters every hour
    setTimeout(() => {
      this.rateLimiter.set(dataType, Math.max(0, (this.rateLimiter.get(dataType) || 0) - 1));
    }, 3600000);
  }

  /**
   * Start background warming schedules
   */
  private startBackgroundProcessing(): void {
    // Market hours warming (every 2 minutes)
    setInterval(() => {
      if (this.isMarketHours()) {
        this.addWarmingTasks(this.popularStocks, 'quote', 'high');
      }
    }, 2 * 60 * 1000);

    // After hours warming (every 30 minutes)
    setInterval(() => {
      if (!this.isMarketHours()) {
        this.addWarmingTasks(this.popularStocks, 'quote', 'low');
      }
    }, 30 * 60 * 1000);

    // Daily fundamentals warming (once per day at 2 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        this.addWarmingTasks([...this.popularStocks, ...this.sectorETFs], 'fundamentals', 'medium');
      }
    }, 60 * 1000);

    // Weekly charts warming (Sundays at 3 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 3 && now.getMinutes() === 0) {
        this.addWarmingTasks(this.popularStocks, 'charts', 'low');
      }
    }, 60 * 1000);
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Monday-Friday
    if (day === 0 || day === 6) return false;
    
    // 9:30 AM - 4:00 PM EST
    const totalMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;
    
    return totalMinutes >= marketOpen && totalMinutes < marketClose;
  }

  /**
   * Manual warming triggers
   */
  async warmPopularStocks(): Promise<void> {
    console.log('🔥 Manually warming popular stocks');
    this.addWarmingTasks(this.popularStocks, 'all', 'high');
  }

  async warmSectorETFs(): Promise<void> {
    console.log('🔥 Manually warming sector ETFs');
    this.addWarmingTasks(this.sectorETFs, 'all', 'medium');
  }

  async warmWatchlistStocks(symbols: string[]): Promise<void> {
    console.log(`🔥 Warming watchlist stocks: ${symbols.join(', ')}`);
    this.addWarmingTasks(symbols, 'all', 'medium');
  }

  /**
   * Predictive warming based on user patterns
   */
  async warmPredictiveStocks(userSymbols: string[]): Promise<void> {
    // Analyze user patterns and warm related stocks
    const relatedStocks = this.findRelatedStocks(userSymbols);
    
    console.log(`🔮 Predictive warming for ${relatedStocks.length} related stocks`);
    this.addWarmingTasks(relatedStocks, 'quote', 'low');
  }

  private findRelatedStocks(symbols: string[]): string[] {
    // Simple correlation logic - in production, use ML models
    const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'];
    const bankStocks = ['JPM', 'BAC', 'WFC', 'C', 'GS'];
    const healthStocks = ['JNJ', 'PFE', 'UNH', 'ABT', 'ABBV'];
    
    const related = new Set<string>();
    
    for (const symbol of symbols) {
      if (techStocks.includes(symbol)) {
        techStocks.forEach(s => related.add(s));
      } else if (bankStocks.includes(symbol)) {
        bankStocks.forEach(s => related.add(s));
      } else if (healthStocks.includes(symbol)) {
        healthStocks.forEach(s => related.add(s));
      }
    }
    
    return Array.from(related).filter(s => !symbols.includes(s));
  }

  /**
   * Get warming statistics
   */
  getStats(): WarmingStats & { queueLength: number; isProcessing: boolean } {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      errors: this.stats.errors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Clear warming queue
   */
  clearQueue(): void {
    this.queue = [];
    console.log('🧹 Warming queue cleared');
  }

  /**
   * Stop warming service
   */
  stop(): void {
    this.isProcessing = false;
    this.queue = [];
    this.removeAllListeners();
    console.log('🛑 Cache warmer stopped');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const cacheWarmer = new CacheWarmer();