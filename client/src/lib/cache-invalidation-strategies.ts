// Cache Invalidation Strategies for Real-Time Financial Data
// Optimized for market data consistency and user experience

import { EventEmitter } from 'events';
import { DataCategory, AdvancedCacheManager } from './advanced-cache-manager';

// Invalidation trigger types
export enum InvalidationTrigger {
  MARKET_CLOSE = 'market_close',
  MARKET_OPEN = 'market_open',
  PRICE_CHANGE = 'price_change',
  VOLUME_SPIKE = 'volume_spike',
  NEWS_ALERT = 'news_alert',
  EARNINGS_RELEASE = 'earnings_release',
  USER_ACTION = 'user_action',
  SCHEDULE = 'schedule',
  API_QUOTA_RESET = 'api_quota_reset',
  ERROR_RECOVERY = 'error_recovery'
}

export enum InvalidationStrategy {
  IMMEDIATE = 'immediate',        // Invalidate instantly
  BATCH = 'batch',               // Collect and invalidate in batches
  LAZY = 'lazy',                 // Invalidate on next access
  CONDITIONAL = 'conditional',    // Invalidate based on conditions
  PROPAGATE = 'propagate'        // Cascade invalidation to related data
}

interface InvalidationRule {
  trigger: InvalidationTrigger;
  strategy: InvalidationStrategy;
  categories: DataCategory[];
  conditions?: {
    priceChangeThreshold?: number;
    volumeChangeThreshold?: number;
    marketHours?: boolean;
    userTier?: string[];
  };
  batchConfig?: {
    maxBatchSize: number;
    batchTimeoutMs: number;
  };
  propagation?: {
    relatedSymbols?: string[];
    relatedCategories?: DataCategory[];
    maxDepth?: number;
  };
}

interface InvalidationEvent {
  id: string;
  trigger: InvalidationTrigger;
  strategy: InvalidationStrategy;
  timestamp: number;
  data: {
    symbol?: string;
    symbols?: string[];
    userId?: string;
    category?: DataCategory;
    oldValue?: any;
    newValue?: any;
    metadata?: Record<string, any>;
  };
}

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface MarketStatus {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  timezone: string;
}

// Pre-configured invalidation rules for financial data
const DEFAULT_INVALIDATION_RULES: InvalidationRule[] = [
  // Real-time price invalidation
  {
    trigger: InvalidationTrigger.PRICE_CHANGE,
    strategy: InvalidationStrategy.IMMEDIATE,
    categories: [DataCategory.REAL_TIME_PRICE, DataCategory.STOCK_QUOTE],
    conditions: {
      priceChangeThreshold: 0.5, // 0.5% change triggers invalidation
      marketHours: true
    }
  },
  
  // Volume spike invalidation
  {
    trigger: InvalidationTrigger.VOLUME_SPIKE,
    strategy: InvalidationStrategy.BATCH,
    categories: [DataCategory.REAL_TIME_PRICE, DataCategory.STOCK_QUOTE],
    conditions: {
      volumeChangeThreshold: 2.0, // 200% volume spike
      marketHours: true
    },
    batchConfig: {
      maxBatchSize: 50,
      batchTimeoutMs: 5000
    }
  },
  
  // News-driven invalidation
  {
    trigger: InvalidationTrigger.NEWS_ALERT,
    strategy: InvalidationStrategy.PROPAGATE,
    categories: [DataCategory.NEWS_DATA, DataCategory.STOCK_QUOTE],
    propagation: {
      relatedCategories: [DataCategory.REAL_TIME_PRICE],
      maxDepth: 2
    }
  },
  
  // Earnings release invalidation
  {
    trigger: InvalidationTrigger.EARNINGS_RELEASE,
    strategy: InvalidationStrategy.PROPAGATE,
    categories: [DataCategory.EARNINGS_DATA, DataCategory.FINANCIAL_DATA],
    propagation: {
      relatedCategories: [
        DataCategory.REAL_TIME_PRICE,
        DataCategory.STOCK_QUOTE,
        DataCategory.NEWS_DATA
      ],
      maxDepth: 3
    }
  },
  
  // Market close cleanup
  {
    trigger: InvalidationTrigger.MARKET_CLOSE,
    strategy: InvalidationStrategy.BATCH,
    categories: [DataCategory.REAL_TIME_PRICE],
    batchConfig: {
      maxBatchSize: 1000,
      batchTimeoutMs: 30000
    }
  },
  
  // User action invalidation
  {
    trigger: InvalidationTrigger.USER_ACTION,
    strategy: InvalidationStrategy.IMMEDIATE,
    categories: [DataCategory.USER_WATCHLIST, DataCategory.USER_PORTFOLIO]
  },
  
  // Scheduled invalidation
  {
    trigger: InvalidationTrigger.SCHEDULE,
    strategy: InvalidationStrategy.BATCH,
    categories: [DataCategory.HISTORICAL_DATA, DataCategory.COMPANY_PROFILE],
    batchConfig: {
      maxBatchSize: 100,
      batchTimeoutMs: 60000
    }
  }
];

export class CacheInvalidationManager extends EventEmitter {
  private rules: Map<InvalidationTrigger, InvalidationRule[]> = new Map();
  private batchQueue: Map<string, InvalidationEvent[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private marketStatus: MarketStatus = {
    isOpen: false,
    timezone: 'America/New_York'
  };
  
  private invalidationCount = 0;
  private lastPriceData: Map<string, MarketData> = new Map();
  
  constructor(
    private cacheManager: AdvancedCacheManager,
    customRules: InvalidationRule[] = []
  ) {
    super();
    
    // Initialize with default rules
    this.initializeRules([...DEFAULT_INVALIDATION_RULES, ...customRules]);
    
    // Setup market status monitoring
    this.setupMarketStatusMonitoring();
    
    // Setup scheduled invalidations
    this.setupScheduledInvalidations();
  }

  // Core invalidation methods
  async triggerInvalidation(event: Omit<InvalidationEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: InvalidationEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      ...event
    };

    const rules = this.rules.get(event.trigger) || [];
    
    for (const rule of rules) {
      if (this.shouldApplyRule(rule, fullEvent)) {
        await this.executeInvalidation(rule, fullEvent);
      }
    }

    this.invalidationCount++;
    this.emit('invalidation:triggered', fullEvent);
  }

  // Market data specific invalidation
  async invalidateOnPriceChange(newData: MarketData): Promise<void> {
    const oldData = this.lastPriceData.get(newData.symbol);
    
    if (oldData && this.shouldInvalidatePrice(oldData, newData)) {
      await this.triggerInvalidation({
        trigger: InvalidationTrigger.PRICE_CHANGE,
        strategy: InvalidationStrategy.IMMEDIATE,
        data: {
          symbol: newData.symbol,
          oldValue: oldData,
          newValue: newData,
          metadata: {
            priceChange: newData.price - oldData.price,
            percentChange: ((newData.price - oldData.price) / oldData.price) * 100
          }
        }
      });
    }

    this.lastPriceData.set(newData.symbol, newData);
  }

  async invalidateOnVolumeSpike(marketData: MarketData): Promise<void> {
    const oldData = this.lastPriceData.get(marketData.symbol);
    
    if (oldData && this.shouldInvalidateVolume(oldData, marketData)) {
      await this.triggerInvalidation({
        trigger: InvalidationTrigger.VOLUME_SPIKE,
        strategy: InvalidationStrategy.BATCH,
        data: {
          symbol: marketData.symbol,
          oldValue: oldData,
          newValue: marketData,
          metadata: {
            volumeMultiplier: marketData.volume / oldData.volume
          }
        }
      });
    }
  }

  // News and events invalidation
  async invalidateOnNewsAlert(symbol: string, newsData: any): Promise<void> {
    await this.triggerInvalidation({
      trigger: InvalidationTrigger.NEWS_ALERT,
      strategy: InvalidationStrategy.PROPAGATE,
      data: {
        symbol,
        newValue: newsData,
        metadata: {
          newsType: newsData.type,
          severity: newsData.severity
        }
      }
    });
  }

  async invalidateOnEarningsRelease(symbol: string, earningsData: any): Promise<void> {
    await this.triggerInvalidation({
      trigger: InvalidationTrigger.EARNINGS_RELEASE,
      strategy: InvalidationStrategy.PROPAGATE,
      data: {
        symbol,
        newValue: earningsData,
        metadata: {
          quarter: earningsData.quarter,
          year: earningsData.year,
          surprise: earningsData.surprise
        }
      }
    });
  }

  // User action invalidation
  async invalidateUserData(userId: string, action: string, data?: any): Promise<void> {
    await this.triggerInvalidation({
      trigger: InvalidationTrigger.USER_ACTION,
      strategy: InvalidationStrategy.IMMEDIATE,
      data: {
        userId,
        metadata: {
          action,
          actionData: data
        }
      }
    });
  }

  // Market state invalidation
  async invalidateOnMarketClose(): Promise<void> {
    await this.triggerInvalidation({
      trigger: InvalidationTrigger.MARKET_CLOSE,
      strategy: InvalidationStrategy.BATCH,
      data: {
        metadata: {
          marketCloseTime: Date.now()
        }
      }
    });
  }

  async invalidateOnMarketOpen(): Promise<void> {
    await this.triggerInvalidation({
      trigger: InvalidationTrigger.MARKET_OPEN,
      strategy: InvalidationStrategy.IMMEDIATE,
      data: {
        metadata: {
          marketOpenTime: Date.now()
        }
      }
    });
  }

  // Error recovery invalidation
  async invalidateOnErrorRecovery(symbols: string[], category: DataCategory): Promise<void> {
    await this.triggerInvalidation({
      trigger: InvalidationTrigger.ERROR_RECOVERY,
      strategy: InvalidationStrategy.BATCH,
      data: {
        symbols,
        category,
        metadata: {
          recoveryTime: Date.now()
        }
      }
    });
  }

  // Rule execution strategies
  private async executeInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    switch (rule.strategy) {
      case InvalidationStrategy.IMMEDIATE:
        await this.executeImmediateInvalidation(rule, event);
        break;
      
      case InvalidationStrategy.BATCH:
        await this.executeBatchInvalidation(rule, event);
        break;
      
      case InvalidationStrategy.LAZY:
        await this.executeLazyInvalidation(rule, event);
        break;
      
      case InvalidationStrategy.CONDITIONAL:
        await this.executeConditionalInvalidation(rule, event);
        break;
      
      case InvalidationStrategy.PROPAGATE:
        await this.executePropagateInvalidation(rule, event);
        break;
    }
  }

  private async executeImmediateInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    for (const category of rule.categories) {
      if (event.data.symbol) {
        await this.cacheManager.invalidate(event.data.symbol, category, event.data.userId);
      } else if (event.data.symbols) {
        for (const symbol of event.data.symbols) {
          await this.cacheManager.invalidate(symbol, category, event.data.userId);
        }
      } else if (event.data.userId) {
        // Invalidate all user data for the category
        await this.cacheManager.invalidateByPattern(`user:${event.data.userId}`, category);
      }
    }
  }

  private async executeBatchInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    const batchKey = `${rule.trigger}-${rule.categories.join(',')}`;
    
    if (!this.batchQueue.has(batchKey)) {
      this.batchQueue.set(batchKey, []);
    }
    
    this.batchQueue.get(batchKey)!.push(event);
    
    // Setup batch timer if not already set
    if (!this.batchTimers.has(batchKey)) {
      const timeout = rule.batchConfig?.batchTimeoutMs || 5000;
      const timer = setTimeout(() => {
        this.processBatch(batchKey, rule);
      }, timeout);
      
      this.batchTimers.set(batchKey, timer);
    }
    
    // Check if batch is full
    const maxBatchSize = rule.batchConfig?.maxBatchSize || 100;
    if (this.batchQueue.get(batchKey)!.length >= maxBatchSize) {
      this.processBatch(batchKey, rule);
    }
  }

  private async executeLazyInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    // Mark entries as stale instead of removing them
    // They will be invalidated on next access
    this.emit('invalidation:lazy', { rule, event });
  }

  private async executeConditionalInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    // Additional condition checking beyond shouldApplyRule
    const shouldInvalidate = this.evaluateConditions(rule, event);
    
    if (shouldInvalidate) {
      await this.executeImmediateInvalidation(rule, event);
    }
  }

  private async executePropagateInvalidation(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    // Execute primary invalidation
    await this.executeImmediateInvalidation(rule, event);
    
    // Propagate to related data
    if (rule.propagation && event.data.symbol) {
      const relatedCategories = rule.propagation.relatedCategories || [];
      const maxDepth = rule.propagation.maxDepth || 1;
      
      for (let depth = 1; depth <= maxDepth; depth++) {
        for (const category of relatedCategories) {
          await this.cacheManager.invalidate(event.data.symbol, category, event.data.userId);
          
          // If there are related symbols (e.g., sector ETFs, correlated stocks)
          if (rule.propagation.relatedSymbols) {
            for (const relatedSymbol of rule.propagation.relatedSymbols) {
              await this.cacheManager.invalidate(relatedSymbol, category, event.data.userId);
            }
          }
        }
      }
    }
  }

  private async processBatch(batchKey: string, rule: InvalidationRule): Promise<void> {
    const events = this.batchQueue.get(batchKey) || [];
    this.batchQueue.delete(batchKey);
    
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }
    
    if (events.length === 0) return;
    
    // Group invalidations by category and symbol
    const invalidationMap: Map<DataCategory, Set<string>> = new Map();
    
    for (const event of events) {
      for (const category of rule.categories) {
        if (!invalidationMap.has(category)) {
          invalidationMap.set(category, new Set());
        }
        
        if (event.data.symbol) {
          invalidationMap.get(category)!.add(event.data.symbol);
        } else if (event.data.symbols) {
          event.data.symbols.forEach(symbol => 
            invalidationMap.get(category)!.add(symbol)
          );
        }
      }
    }
    
    // Execute batch invalidations
    for (const [category, symbols] of invalidationMap.entries()) {
      if (symbols.size <= 10) {
        // Small batch - invalidate individually
        for (const symbol of symbols) {
          await this.cacheManager.invalidate(symbol, category);
        }
      } else {
        // Large batch - use pattern invalidation
        for (const symbol of symbols) {
          await this.cacheManager.invalidateByPattern(symbol, category);
        }
      }
    }
    
    this.emit('invalidation:batch:processed', {
      batchKey,
      eventCount: events.length,
      categoriesAffected: invalidationMap.size
    });
  }

  // Condition evaluation methods
  private shouldApplyRule(rule: InvalidationRule, event: InvalidationEvent): boolean {
    if (!rule.conditions) return true;
    
    // Market hours check
    if (rule.conditions.marketHours !== undefined) {
      if (rule.conditions.marketHours && !this.marketStatus.isOpen) {
        return false;
      }
    }
    
    // User tier check
    if (rule.conditions.userTier && event.data.userId) {
      // This would need to be implemented based on your user system
      // const userTier = getUserTier(event.data.userId);
      // if (!rule.conditions.userTier.includes(userTier)) {
      //   return false;
      // }
    }
    
    return true;
  }

  private shouldInvalidatePrice(oldData: MarketData, newData: MarketData): boolean {
    const rule = this.rules.get(InvalidationTrigger.PRICE_CHANGE)?.[0];
    if (!rule?.conditions) return true;
    
    const threshold = rule.conditions.priceChangeThreshold || 0;
    const percentChange = Math.abs(((newData.price - oldData.price) / oldData.price) * 100);
    
    return percentChange >= threshold;
  }

  private shouldInvalidateVolume(oldData: MarketData, newData: MarketData): boolean {
    const rule = this.rules.get(InvalidationTrigger.VOLUME_SPIKE)?.[0];
    if (!rule?.conditions) return true;
    
    const threshold = rule.conditions.volumeChangeThreshold || 2.0;
    const volumeMultiplier = newData.volume / oldData.volume;
    
    return volumeMultiplier >= threshold;
  }

  private evaluateConditions(rule: InvalidationRule, event: InvalidationEvent): boolean {
    // Additional conditional logic can be implemented here
    return true;
  }

  // Utility methods
  private initializeRules(rules: InvalidationRule[]): void {
    for (const rule of rules) {
      if (!this.rules.has(rule.trigger)) {
        this.rules.set(rule.trigger, []);
      }
      this.rules.get(rule.trigger)!.push(rule);
    }
  }

  private generateEventId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupMarketStatusMonitoring(): void {
    // Check market status every minute
    setInterval(() => {
      this.updateMarketStatus();
    }, 60000);
    
    // Initial check
    this.updateMarketStatus();
  }

  private updateMarketStatus(): void {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hours = easternTime.getHours();
    const minutes = easternTime.getMinutes();
    const day = easternTime.getDay();
    
    // Market is open Monday-Friday 9:30 AM - 4:00 PM ET
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = (hours > 9 || (hours === 9 && minutes >= 30)) && hours < 16;
    
    const wasOpen = this.marketStatus.isOpen;
    this.marketStatus.isOpen = isWeekday && isMarketHours;
    
    // Trigger market open/close events
    if (!wasOpen && this.marketStatus.isOpen) {
      this.invalidateOnMarketOpen();
    } else if (wasOpen && !this.marketStatus.isOpen) {
      this.invalidateOnMarketClose();
    }
  }

  private setupScheduledInvalidations(): void {
    // Daily cleanup at market close
    setInterval(() => {
      if (!this.marketStatus.isOpen) {
        this.triggerInvalidation({
          trigger: InvalidationTrigger.SCHEDULE,
          strategy: InvalidationStrategy.BATCH,
          data: {
            metadata: {
              type: 'daily_cleanup'
            }
          }
        });
      }
    }, 24 * 60 * 60 * 1000); // Daily
    
    // Hourly cleanup of stale data
    setInterval(() => {
      this.triggerInvalidation({
        trigger: InvalidationTrigger.SCHEDULE,
        strategy: InvalidationStrategy.BATCH,
        data: {
          metadata: {
            type: 'hourly_cleanup'
          }
        }
      });
    }, 60 * 60 * 1000); // Hourly
  }

  // Public API for monitoring and management
  getInvalidationStats(): any {
    return {
      totalInvalidations: this.invalidationCount,
      activeBatches: this.batchQueue.size,
      pendingEvents: Array.from(this.batchQueue.values()).reduce((sum, events) => sum + events.length, 0),
      marketStatus: this.marketStatus,
      rulesCount: Array.from(this.rules.values()).reduce((sum, rules) => sum + rules.length, 0)
    };
  }

  addRule(rule: InvalidationRule): void {
    if (!this.rules.has(rule.trigger)) {
      this.rules.set(rule.trigger, []);
    }
    this.rules.get(rule.trigger)!.push(rule);
    this.emit('rule:added', rule);
  }

  removeRule(trigger: InvalidationTrigger, index: number): void {
    const rules = this.rules.get(trigger);
    if (rules && rules[index]) {
      const removedRule = rules.splice(index, 1)[0];
      this.emit('rule:removed', removedRule);
    }
  }

  updateMarketStatusManually(status: Partial<MarketStatus>): void {
    this.marketStatus = { ...this.marketStatus, ...status };
    this.emit('market:status:updated', this.marketStatus);
  }

  shutdown(): void {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();
    
    // Clear queues
    this.batchQueue.clear();
    this.lastPriceData.clear();
    
    this.emit('invalidation:shutdown');
  }
}

// Export types for use in other modules
export type { InvalidationRule, InvalidationEvent, MarketData, MarketStatus };