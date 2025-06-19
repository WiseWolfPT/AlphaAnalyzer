// Cache Warming Strategies for Popular Stocks and Financial Data
// Optimized for proactive data loading and API quota management

import { EventEmitter } from 'events';
import { DataCategory, AdvancedCacheManager } from './advanced-cache-manager';

// Warming strategy types
export enum WarmingTrigger {
  SCHEDULE = 'schedule',
  USER_ACTIVITY = 'user_activity',
  MARKET_OPEN = 'market_open',
  POPULARITY_SPIKE = 'popularity_spike',
  API_QUOTA_RESET = 'api_quota_reset',
  MANUAL = 'manual',
  PREDICTIVE = 'predictive'
}

export enum WarmingPriority {
  CRITICAL = 1,    // VIP users, most popular stocks
  HIGH = 2,        // Premium users, trending stocks
  MEDIUM = 3,      // Regular users, sector leaders
  LOW = 4          // Background warming, historical data
}

export enum WarmingStrategy {
  AGGRESSIVE = 'aggressive',      // Pre-load everything possible
  CONSERVATIVE = 'conservative',  // Load only essential data
  ADAPTIVE = 'adaptive',         // Adjust based on usage patterns
  INTELLIGENT = 'intelligent'    // ML-based prediction warming
}

interface WarmingTarget {
  symbol: string;
  categories: DataCategory[];
  priority: WarmingPriority;
  userId?: string;
  expiryTime?: number;
  metadata?: {
    reason: string;
    confidence: number;
    expectedAccess: number;
  };
}

interface WarmingSchedule {
  id: string;
  trigger: WarmingTrigger;
  targets: WarmingTarget[];
  cronExpression?: string;
  intervalMs?: number;
  enabled: boolean;
  strategy: WarmingStrategy;
  constraints: {
    maxConcurrent: number;
    apiQuotaLimit: number;
    timeWindow: number; // ms
    respectMarketHours: boolean;
  };
}

interface WarmingStats {
  totalWarmed: number;
  successRate: number;
  averageLatency: number;
  apiCallsUsed: number;
  cacheHitImprovement: number;
  priorityDistribution: Record<WarmingPriority, number>;
  categoryDistribution: Record<DataCategory, number>;
}

interface PopularityMetrics {
  symbol: string;
  accessCount: number;
  uniqueUsers: number;
  recentActivity: number; // Activity in last hour
  trendingScore: number;
  marketCap?: number;
  volume?: number;
}

interface UserBehaviorPattern {
  userId: string;
  favoriteSymbols: string[];
  accessPatterns: Record<string, number[]>; // symbol -> access times
  preferredCategories: DataCategory[];
  activityHours: number[];
  predictedSymbols: string[];
}

// Default warming schedules
const DEFAULT_WARMING_SCHEDULES: WarmingSchedule[] = [
  {
    id: 'market-open-warm',
    trigger: WarmingTrigger.MARKET_OPEN,
    targets: [],
    strategy: WarmingStrategy.AGGRESSIVE,
    enabled: true,
    constraints: {
      maxConcurrent: 20,
      apiQuotaLimit: 100,
      timeWindow: 5 * 60 * 1000, // 5 minutes
      respectMarketHours: true
    }
  },
  {
    id: 'popular-stocks-hourly',
    trigger: WarmingTrigger.SCHEDULE,
    targets: [],
    cronExpression: '0 * * * *', // Every hour
    strategy: WarmingStrategy.ADAPTIVE,
    enabled: true,
    constraints: {
      maxConcurrent: 10,
      apiQuotaLimit: 50,
      timeWindow: 10 * 60 * 1000, // 10 minutes
      respectMarketHours: true
    }
  },
  {
    id: 'user-prediction-warm',
    trigger: WarmingTrigger.PREDICTIVE,
    targets: [],
    intervalMs: 15 * 60 * 1000, // Every 15 minutes
    strategy: WarmingStrategy.INTELLIGENT,
    enabled: true,
    constraints: {
      maxConcurrent: 5,
      apiQuotaLimit: 25,
      timeWindow: 5 * 60 * 1000, // 5 minutes
      respectMarketHours: false
    }
  }
];

// Popular stocks by category
const POPULAR_STOCKS = {
  megaCap: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B'],
  techGrowth: ['NVDA', 'AMD', 'CRM', 'ADBE', 'NFLX', 'UBER', 'SHOP', 'SQ'],
  etfs: ['SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VGT', 'XLK', 'SMH'],
  crypto: ['COIN', 'MSTR', 'RIOT', 'MARA', 'HUT', 'BITF'],
  trending: [] // Will be populated dynamically
};

export class CacheWarmingManager extends EventEmitter {
  private schedules = new Map<string, WarmingSchedule>();
  private warmingQueue: WarmingTarget[] = [];
  private activeWarmingTasks = new Set<string>();
  private popularityMetrics = new Map<string, PopularityMetrics>();
  private userBehaviorPatterns = new Map<string, UserBehaviorPattern>();
  
  private stats: WarmingStats = {
    totalWarmed: 0,
    successRate: 0,
    averageLatency: 0,
    apiCallsUsed: 0,
    cacheHitImprovement: 0,
    priorityDistribution: {
      [WarmingPriority.CRITICAL]: 0,
      [WarmingPriority.HIGH]: 0,
      [WarmingPriority.MEDIUM]: 0,
      [WarmingPriority.LOW]: 0
    },
    categoryDistribution: {}
  };

  private schedulerInterval?: NodeJS.Timeout;
  private warmingInterval?: NodeJS.Timeout;
  private analyticsInterval?: NodeJS.Timeout;
  
  private isMarketOpen = false;
  private marketSchedule = {
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
    timezone: 'America/New_York'
  };

  constructor(
    private cacheManager: AdvancedCacheManager,
    private apiManager: any, // API rotation manager
    customSchedules: WarmingSchedule[] = []
  ) {
    super();
    
    // Initialize default schedules
    DEFAULT_WARMING_SCHEDULES.forEach(schedule => {
      this.schedules.set(schedule.id, schedule);
    });
    
    // Add custom schedules
    customSchedules.forEach(schedule => {
      this.schedules.set(schedule.id, schedule);
    });
    
    this.initializePopularStocks();
    this.startScheduler();
    this.startWarmingProcessor();
    this.startAnalytics();
    this.monitorMarketStatus();
  }

  // Core warming methods
  async warmTarget(target: WarmingTarget): Promise<boolean> {
    const taskId = `${target.symbol}-${target.categories.join(',')}-${Date.now()}`;
    
    if (this.activeWarmingTasks.has(taskId)) {
      return false; // Already warming
    }

    this.activeWarmingTasks.add(taskId);
    
    try {
      const startTime = Date.now();
      
      for (const category of target.categories) {
        const cacheKey = this.buildCacheKey(target.symbol, category, target.userId);
        
        // Check if already cached
        const cached = await this.cacheManager.get(cacheKey, category, target.userId);
        if (cached) {
          continue; // Already cached
        }
        
        // Fetch data from API
        const data = await this.fetchDataFromAPI(target.symbol, category);
        if (data) {
          // Store in cache
          await this.cacheManager.set(cacheKey, data, category, target.userId, {
            temperature: this.determineTemperature(target.priority)
          });
          
          this.updateStats(category, target.priority, Date.now() - startTime, true);
        } else {
          this.updateStats(category, target.priority, Date.now() - startTime, false);
        }
      }
      
      this.emit('warming:completed', { target, success: true, duration: Date.now() - startTime });
      return true;
      
    } catch (error) {
      this.emit('warming:failed', { target, error: error.message });
      return false;
      
    } finally {
      this.activeWarmingTasks.delete(taskId);
    }
  }

  // Warming strategy implementations
  private async executeAggressiveWarming(targets: WarmingTarget[]): Promise<void> {
    // Warm all targets in parallel with rate limiting
    const batches = this.chunkArray(targets, 20);
    
    for (const batch of batches) {
      const promises = batch.map(target => this.warmTarget(target));
      await Promise.allSettled(promises);
      
      // Brief pause between batches
      await this.delay(1000);
    }
  }

  private async executeConservativeWarming(targets: WarmingTarget[]): Promise<void> {
    // Warm only critical and high priority targets
    const priorityTargets = targets.filter(t => 
      t.priority <= WarmingPriority.HIGH
    );
    
    // Sequential warming to minimize API usage
    for (const target of priorityTargets) {
      await this.warmTarget(target);
      await this.delay(500); // Longer delay between requests
    }
  }

  private async executeAdaptiveWarming(targets: WarmingTarget[]): Promise<void> {
    // Adjust warming based on current conditions
    const conditions = this.analyzeCurrentConditions();
    
    let effectiveTargets = targets;
    
    if (conditions.highAPIUsage) {
      // Reduce to only critical targets
      effectiveTargets = targets.filter(t => t.priority === WarmingPriority.CRITICAL);
    } else if (conditions.lowCacheHitRate) {
      // Increase warming for frequently accessed data
      effectiveTargets = targets.filter(t => t.priority <= WarmingPriority.MEDIUM);
    }
    
    // Use parallel execution if API quota allows
    if (conditions.apiQuotaAvailable > 50) {
      await this.executeAggressiveWarming(effectiveTargets);
    } else {
      await this.executeConservativeWarming(effectiveTargets);
    }
  }

  private async executeIntelligentWarming(targets: WarmingTarget[]): Promise<void> {
    // Use ML-like predictions and user behavior patterns
    const enhancedTargets = await this.enhanceTargetsWithPredictions(targets);
    
    // Sort by prediction confidence
    enhancedTargets.sort((a, b) => {
      const aConfidence = a.metadata?.confidence || 0;
      const bConfidence = b.metadata?.confidence || 0;
      return bConfidence - aConfidence;
    });
    
    // Warm top predictions with high confidence
    const highConfidenceTargets = enhancedTargets.filter(t => 
      (t.metadata?.confidence || 0) > 0.7
    );
    
    await this.executeAdaptiveWarming(highConfidenceTargets);
  }

  // Popularity and trending analysis
  updatePopularityMetrics(symbol: string, userId: string): void {
    const metrics = this.popularityMetrics.get(symbol) || {
      symbol,
      accessCount: 0,
      uniqueUsers: 0,
      recentActivity: 0,
      trendingScore: 0
    };
    
    metrics.accessCount++;
    metrics.recentActivity++;
    
    // Track unique users (simplified)
    const userKey = `${symbol}_users`;
    const users = new Set((this as any)[userKey] || []);
    users.add(userId);
    (this as any)[userKey] = Array.from(users);
    metrics.uniqueUsers = users.size;
    
    // Calculate trending score
    metrics.trendingScore = this.calculateTrendingScore(metrics);
    
    this.popularityMetrics.set(symbol, metrics);
    
    // Update trending stocks if significant change
    if (metrics.trendingScore > 0.8) {
      this.addToTrendingStocks(symbol);
    }
  }

  private calculateTrendingScore(metrics: PopularityMetrics): number {
    // Simplified trending algorithm
    const accessWeight = Math.min(metrics.accessCount / 100, 1);
    const userWeight = Math.min(metrics.uniqueUsers / 50, 1);
    const recentWeight = Math.min(metrics.recentActivity / 20, 1);
    
    return (accessWeight * 0.4) + (userWeight * 0.3) + (recentWeight * 0.3);
  }

  private addToTrendingStocks(symbol: string): void {
    if (!POPULAR_STOCKS.trending.includes(symbol)) {
      POPULAR_STOCKS.trending.push(symbol);
      
      // Limit trending list size
      if (POPULAR_STOCKS.trending.length > 20) {
        POPULAR_STOCKS.trending.shift();
      }
      
      this.emit('trending:added', symbol);
    }
  }

  // User behavior analysis
  updateUserBehaviorPattern(userId: string, symbol: string, category: DataCategory): void {
    let pattern = this.userBehaviorPatterns.get(userId) || {
      userId,
      favoriteSymbols: [],
      accessPatterns: {},
      preferredCategories: [],
      activityHours: [],
      predictedSymbols: []
    };
    
    // Update access patterns
    if (!pattern.accessPatterns[symbol]) {
      pattern.accessPatterns[symbol] = [];
    }
    pattern.accessPatterns[symbol].push(Date.now());
    
    // Keep only recent access times (last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    pattern.accessPatterns[symbol] = pattern.accessPatterns[symbol].filter(time => time > weekAgo);
    
    // Update favorite symbols
    const accessCount = pattern.accessPatterns[symbol].length;
    if (accessCount >= 5 && !pattern.favoriteSymbols.includes(symbol)) {
      pattern.favoriteSymbols.push(symbol);
    }
    
    // Update preferred categories
    if (!pattern.preferredCategories.includes(category)) {
      pattern.preferredCategories.push(category);
    }
    
    // Update activity hours
    const hour = new Date().getHours();
    if (!pattern.activityHours.includes(hour)) {
      pattern.activityHours.push(hour);
    }
    
    // Update predictions
    pattern.predictedSymbols = this.predictUserInterests(pattern);
    
    this.userBehaviorPatterns.set(userId, pattern);
  }

  private predictUserInterests(pattern: UserBehaviorPattern): string[] {
    const predictions: string[] = [];
    
    // Predict based on favorite symbols
    for (const symbol of pattern.favoriteSymbols) {
      const relatedSymbols = this.getRelatedSymbols(symbol);
      predictions.push(...relatedSymbols.slice(0, 2)); // Top 2 related
    }
    
    // Predict based on trending stocks in preferred categories
    const trendingInCategories = this.getTrendingForCategories(pattern.preferredCategories);
    predictions.push(...trendingInCategories.slice(0, 3));
    
    // Remove duplicates and existing favorites
    return [...new Set(predictions)].filter(s => !pattern.favoriteSymbols.includes(s));
  }

  private getRelatedSymbols(symbol: string): string[] {
    // Simplified related symbol detection
    const sectorMap: Record<string, string[]> = {
      'AAPL': ['MSFT', 'GOOGL', 'META'],
      'TSLA': ['NIO', 'RIVN', 'LCID'],
      'NVDA': ['AMD', 'INTC', 'QCOM'],
      'SPY': ['QQQ', 'IWM', 'VTI']
    };
    
    return sectorMap[symbol] || [];
  }

  private getTrendingForCategories(categories: DataCategory[]): string[] {
    // Return trending stocks that are relevant to preferred categories
    return POPULAR_STOCKS.trending.slice(0, 5);
  }

  // Schedule management
  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      this.processSchedules();
    }, 60000); // Check every minute
  }

  private async processSchedules(): Promise<void> {
    const now = new Date();
    
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;
      
      const shouldRun = this.shouldRunSchedule(schedule, now);
      if (shouldRun) {
        await this.executeSchedule(schedule);
      }
    }
  }

  private shouldRunSchedule(schedule: WarmingSchedule, now: Date): boolean {
    // Check market hours if required
    if (schedule.constraints.respectMarketHours && !this.isMarketOpen) {
      return false;
    }
    
    // Check trigger type
    switch (schedule.trigger) {
      case WarmingTrigger.SCHEDULE:
        return this.shouldRunCronSchedule(schedule.cronExpression!, now);
      case WarmingTrigger.MARKET_OPEN:
        return this.isMarketOpen && this.wasRecentlyOpened();
      case WarmingTrigger.PREDICTIVE:
        return this.shouldRunIntervalSchedule(schedule.intervalMs!, now);
      default:
        return false;
    }
  }

  private shouldRunCronSchedule(cronExpression: string, now: Date): boolean {
    // Simplified cron parsing - in production use a real cron library
    if (cronExpression === '0 * * * *') {
      return now.getMinutes() === 0;
    }
    return false;
  }

  private shouldRunIntervalSchedule(intervalMs: number, now: Date): boolean {
    // Check if enough time has passed since last run
    const lastRun = (this as any).lastIntervalRun || 0;
    return now.getTime() - lastRun >= intervalMs;
  }

  private wasRecentlyOpened(): boolean {
    const now = new Date();
    const openTime = new Date();
    openTime.setHours(this.marketSchedule.openHour, this.marketSchedule.openMinute, 0, 0);
    
    return now.getTime() - openTime.getTime() < 10 * 60 * 1000; // Within 10 minutes of opening
  }

  private async executeSchedule(schedule: WarmingSchedule): Promise<void> {
    const targets = await this.generateTargetsForSchedule(schedule);
    
    switch (schedule.strategy) {
      case WarmingStrategy.AGGRESSIVE:
        await this.executeAggressiveWarming(targets);
        break;
      case WarmingStrategy.CONSERVATIVE:
        await this.executeConservativeWarming(targets);
        break;
      case WarmingStrategy.ADAPTIVE:
        await this.executeAdaptiveWarming(targets);
        break;
      case WarmingStrategy.INTELLIGENT:
        await this.executeIntelligentWarming(targets);
        break;
    }
    
    this.emit('schedule:executed', { scheduleId: schedule.id, targetCount: targets.length });
  }

  private async generateTargetsForSchedule(schedule: WarmingSchedule): Promise<WarmingTarget[]> {
    const targets: WarmingTarget[] = [];
    
    switch (schedule.trigger) {
      case WarmingTrigger.MARKET_OPEN:
        targets.push(...this.generateMarketOpenTargets());
        break;
      case WarmingTrigger.SCHEDULE:
        targets.push(...this.generatePopularStockTargets());
        break;
      case WarmingTrigger.PREDICTIVE:
        targets.push(...await this.generatePredictiveTargets());
        break;
    }
    
    // Apply constraints
    return targets.slice(0, schedule.constraints.maxConcurrent);
  }

  private generateMarketOpenTargets(): WarmingTarget[] {
    const targets: WarmingTarget[] = [];
    const allPopularStocks = [
      ...POPULAR_STOCKS.megaCap,
      ...POPULAR_STOCKS.etfs,
      ...POPULAR_STOCKS.trending
    ];
    
    for (const symbol of allPopularStocks.slice(0, 30)) {
      targets.push({
        symbol,
        categories: [DataCategory.REAL_TIME_PRICE, DataCategory.STOCK_QUOTE],
        priority: WarmingPriority.HIGH,
        metadata: {
          reason: 'market_open_warming',
          confidence: 0.9,
          expectedAccess: 10
        }
      });
    }
    
    return targets;
  }

  private generatePopularStockTargets(): WarmingTarget[] {
    const targets: WarmingTarget[] = [];
    
    // Sort by popularity metrics
    const sortedPopular = Array.from(this.popularityMetrics.values())
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 20);
    
    for (const metrics of sortedPopular) {
      targets.push({
        symbol: metrics.symbol,
        categories: [DataCategory.REAL_TIME_PRICE, DataCategory.STOCK_QUOTE],
        priority: metrics.trendingScore > 0.8 ? WarmingPriority.HIGH : WarmingPriority.MEDIUM,
        metadata: {
          reason: 'popularity_based',
          confidence: metrics.trendingScore,
          expectedAccess: metrics.recentActivity
        }
      });
    }
    
    return targets;
  }

  private async generatePredictiveTargets(): Promise<WarmingTarget[]> {
    const targets: WarmingTarget[] = [];
    
    // Generate targets based on user behavior patterns
    for (const pattern of this.userBehaviorPatterns.values()) {
      for (const symbol of pattern.predictedSymbols.slice(0, 3)) {
        targets.push({
          symbol,
          categories: pattern.preferredCategories.slice(0, 2),
          priority: WarmingPriority.MEDIUM,
          userId: pattern.userId,
          metadata: {
            reason: 'user_prediction',
            confidence: 0.7,
            expectedAccess: 1
          }
        });
      }
    }
    
    return targets;
  }

  // Warming queue processor
  private startWarmingProcessor(): void {
    this.warmingInterval = setInterval(() => {
      this.processWarmingQueue();
    }, 5000); // Process queue every 5 seconds
  }

  private async processWarmingQueue(): Promise<void> {
    if (this.warmingQueue.length === 0) return;
    
    // Sort queue by priority
    this.warmingQueue.sort((a, b) => a.priority - b.priority);
    
    // Process high-priority items first
    const batchSize = 5;
    const batch = this.warmingQueue.splice(0, batchSize);
    
    for (const target of batch) {
      await this.warmTarget(target);
    }
  }

  // Analytics and monitoring
  private startAnalytics(): void {
    this.analyticsInterval = setInterval(() => {
      this.updateAnalytics();
      this.cleanupExpiredData();
    }, 300000); // Every 5 minutes
  }

  private updateAnalytics(): void {
    // Reset recent activity counters
    for (const metrics of this.popularityMetrics.values()) {
      metrics.recentActivity = Math.max(0, metrics.recentActivity - 1);
    }
    
    // Calculate cache hit improvement
    const cacheStats = this.cacheManager.getStats();
    this.stats.cacheHitImprovement = cacheStats.hitRate;
    
    this.emit('analytics:updated', this.stats);
  }

  private cleanupExpiredData(): void {
    const now = Date.now();
    
    // Clean up expired warming targets
    this.warmingQueue = this.warmingQueue.filter(target => 
      !target.expiryTime || target.expiryTime > now
    );
    
    // Clean up old popularity metrics
    for (const [symbol, metrics] of this.popularityMetrics.entries()) {
      if (metrics.recentActivity === 0 && metrics.accessCount < 5) {
        this.popularityMetrics.delete(symbol);
      }
    }
  }

  private monitorMarketStatus(): void {
    setInterval(() => {
      this.updateMarketStatus();
    }, 60000); // Check every minute
    
    this.updateMarketStatus(); // Initial check
  }

  private updateMarketStatus(): void {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: this.marketSchedule.timezone}));
    const hours = easternTime.getHours();
    const minutes = easternTime.getMinutes();
    const day = easternTime.getDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const currentMinutes = hours * 60 + minutes;
    const openMinutes = this.marketSchedule.openHour * 60 + this.marketSchedule.openMinute;
    const closeMinutes = this.marketSchedule.closeHour * 60 + this.marketSchedule.closeMinute;
    
    const wasOpen = this.isMarketOpen;
    this.isMarketOpen = isWeekday && currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    
    if (!wasOpen && this.isMarketOpen) {
      this.emit('market:opened');
      this.triggerMarketOpenWarming();
    } else if (wasOpen && !this.isMarketOpen) {
      this.emit('market:closed');
    }
  }

  private triggerMarketOpenWarming(): void {
    this.emit('warming:trigger', { trigger: WarmingTrigger.MARKET_OPEN });
  }

  // Utility methods
  private async enhanceTargetsWithPredictions(targets: WarmingTarget[]): Promise<WarmingTarget[]> {
    // Enhance targets with ML predictions (simplified)
    return targets.map(target => ({
      ...target,
      metadata: {
        ...target.metadata,
        confidence: Math.random() * 0.5 + 0.5, // Simplified confidence
        expectedAccess: Math.floor(Math.random() * 10) + 1
      }
    }));
  }

  private analyzeCurrentConditions(): any {
    const apiStats = this.apiManager?.getUsageStats() || {};
    const cacheStats = this.cacheManager.getStats();
    
    return {
      highAPIUsage: (apiStats.totalCalls || 0) > 800,
      lowCacheHitRate: cacheStats.hitRate < 60,
      apiQuotaAvailable: 1000 - (apiStats.totalCalls || 0)
    };
  }

  private determineTemperature(priority: WarmingPriority): any {
    switch (priority) {
      case WarmingPriority.CRITICAL:
        return 'hot';
      case WarmingPriority.HIGH:
        return 'warm';
      default:
        return 'cold';
    }
  }

  private buildCacheKey(symbol: string, category: DataCategory, userId?: string): string {
    return userId ? `${symbol}-${category}-${userId}` : `${symbol}-${category}`;
  }

  private async fetchDataFromAPI(symbol: string, category: DataCategory): Promise<any> {
    // This would integrate with the actual API manager
    return this.apiManager?.makeAPICall(`/${category}`, symbol, category);
  }

  private updateStats(category: DataCategory, priority: WarmingPriority, duration: number, success: boolean): void {
    this.stats.totalWarmed++;
    this.stats.priorityDistribution[priority]++;
    this.stats.categoryDistribution[category] = (this.stats.categoryDistribution[category] || 0) + 1;
    
    if (success) {
      this.stats.averageLatency = (this.stats.averageLatency + duration) / 2;
    }
    
    this.stats.successRate = (this.stats.totalWarmed > 0) 
      ? ((this.stats.totalWarmed - Object.values(this.stats.priorityDistribution).reduce((a, b) => a + b, 0)) / this.stats.totalWarmed) * 100 
      : 0;
  }

  private initializePopularStocks(): void {
    // Initialize popularity metrics for default popular stocks
    const allPopular = [
      ...POPULAR_STOCKS.megaCap,
      ...POPULAR_STOCKS.techGrowth,
      ...POPULAR_STOCKS.etfs
    ];
    
    for (const symbol of allPopular) {
      this.popularityMetrics.set(symbol, {
        symbol,
        accessCount: 1,
        uniqueUsers: 1,
        recentActivity: 1,
        trendingScore: 0.5
      });
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  addWarmingTarget(target: WarmingTarget): void {
    this.warmingQueue.push(target);
    this.emit('warming:queued', target);
  }

  addWarmingSchedule(schedule: WarmingSchedule): void {
    this.schedules.set(schedule.id, schedule);
    this.emit('schedule:added', schedule);
  }

  removeWarmingSchedule(scheduleId: string): boolean {
    const removed = this.schedules.delete(scheduleId);
    if (removed) {
      this.emit('schedule:removed', scheduleId);
    }
    return removed;
  }

  enableSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.enabled = true;
      this.emit('schedule:enabled', scheduleId);
    }
  }

  disableSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.enabled = false;
      this.emit('schedule:disabled', scheduleId);
    }
  }

  getWarmingStats(): WarmingStats {
    return { ...this.stats };
  }

  getPopularityMetrics(): PopularityMetrics[] {
    return Array.from(this.popularityMetrics.values());
  }

  getUserBehaviorPatterns(): UserBehaviorPattern[] {
    return Array.from(this.userBehaviorPatterns.values());
  }

  getActiveSchedules(): WarmingSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.enabled);
  }

  manualWarm(symbols: string[], categories: DataCategory[], priority: WarmingPriority = WarmingPriority.HIGH): void {
    for (const symbol of symbols) {
      this.addWarmingTarget({
        symbol,
        categories,
        priority,
        metadata: {
          reason: 'manual_trigger',
          confidence: 1.0,
          expectedAccess: 1
        }
      });
    }
  }

  shutdown(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
    
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }
    
    this.warmingQueue.length = 0;
    this.activeWarmingTasks.clear();
    
    this.emit('warming:shutdown');
  }
}

// Export types and utilities
export type { WarmingTarget, WarmingSchedule, WarmingStats, PopularityMetrics, UserBehaviorPattern };