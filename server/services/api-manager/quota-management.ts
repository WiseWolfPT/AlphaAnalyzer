/**
 * ADVANCED QUOTA MANAGEMENT
 * Intelligent quota tracking with Redis/SQLite persistence,
 * predictive usage modeling, and cost optimization
 */

import { ProviderName } from '../quota/quota-limits';
import { cacheManager } from '../cache/cache-manager';

export interface QuotaUsageRecord {
  provider: ProviderName;
  endpoint: string;
  timestamp: number;
  cost: number;
  dataType: string;
  success: boolean;
  responseTime: number;
}

export interface QuotaPrediction {
  provider: ProviderName;
  predictedUsage: number;
  timeframe: 'hour' | 'day' | 'week' | 'month';
  confidence: number;
  recommendations: string[];
}

export interface CostOptimization {
  currentCost: number;
  optimizedCost: number;
  savings: number;
  changes: Array<{
    action: string;
    provider: ProviderName;
    impact: string;
  }>;
}

/**
 * ADVANCED QUOTA TRACKER WITH PERSISTENCE
 * Extends the basic quota tracker with intelligent features
 */
export class AdvancedQuotaManager {
  private readonly USAGE_HISTORY_KEY = 'quota:history';
  private readonly PREDICTION_KEY = 'quota:predictions';
  private readonly COST_TRACKING_KEY = 'quota:costs';
  
  private usageHistory: QuotaUsageRecord[] = [];
  private predictions: Record<ProviderName, QuotaPrediction> = {} as any;

  constructor() {
    this.loadUsageHistory();
    this.startBackgroundTasks();
  }

  /**
   * Record API usage with detailed tracking
   */
  async recordDetailedUsage(record: QuotaUsageRecord): Promise<void> {
    // Add to in-memory history
    this.usageHistory.push(record);
    
    // Keep only last 10,000 records in memory
    if (this.usageHistory.length > 10000) {
      this.usageHistory = this.usageHistory.slice(-10000);
    }

    // Persist to cache/database
    await this.persistUsageRecord(record);

    // Update real-time metrics
    await this.updateRealTimeMetrics(record);

    console.log(`📊 Recorded usage: ${record.provider} - ${record.endpoint} (${record.cost} credits)`);
  }

  /**
   * Predict future quota usage based on historical patterns
   */
  async predictUsage(provider: ProviderName, timeframe: 'hour' | 'day' | 'week' | 'month'): Promise<QuotaPrediction> {
    const now = Date.now();
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    const windowSize = timeframes[timeframe];
    const recentUsage = this.usageHistory.filter(
      record => record.provider === provider && 
                record.timestamp > (now - windowSize * 7) // Use 7x window for pattern analysis
    );

    if (recentUsage.length === 0) {
      return {
        provider,
        predictedUsage: 0,
        timeframe,
        confidence: 0,
        recommendations: ['No historical data available for prediction']
      };
    }

    // Simple trend analysis (could be replaced with ML model)
    const hourlyUsage = this.groupUsageByHour(recentUsage);
    const trend = this.calculateTrend(hourlyUsage);
    const baseUsage = this.calculateAverageUsage(recentUsage, timeframe);
    
    const predictedUsage = Math.max(0, baseUsage + (trend * (windowSize / (60 * 60 * 1000))));
    const confidence = this.calculateConfidence(recentUsage);

    const prediction: QuotaPrediction = {
      provider,
      predictedUsage: Math.round(predictedUsage),
      timeframe,
      confidence: Math.round(confidence * 100),
      recommendations: this.generateRecommendations(provider, predictedUsage, recentUsage)
    };

    // Cache the prediction
    this.predictions[provider] = prediction;
    await cacheManager.set(
      `${this.PREDICTION_KEY}:${provider}:${timeframe}`,
      prediction,
      'user_data' as any,
      'quota-manager'
    );

    return prediction;
  }

  /**
   * Optimize costs by suggesting provider switches and usage patterns
   */
  async optimizeCosts(): Promise<CostOptimization> {
    const now = Date.now();
    const last30Days = this.usageHistory.filter(
      record => record.timestamp > (now - 30 * 24 * 60 * 60 * 1000)
    );

    const currentCost = this.calculateTotalCost(last30Days);
    const optimization = this.findCostOptimizations(last30Days);

    return {
      currentCost,
      optimizedCost: currentCost - optimization.savings,
      savings: optimization.savings,
      changes: optimization.changes
    };
  }

  /**
   * Get detailed analytics for a provider
   */
  async getProviderAnalytics(provider: ProviderName): Promise<any> {
    const now = Date.now();
    const providerUsage = this.usageHistory.filter(record => record.provider === provider);

    const last24h = providerUsage.filter(record => record.timestamp > (now - 24 * 60 * 60 * 1000));
    const last7d = providerUsage.filter(record => record.timestamp > (now - 7 * 24 * 60 * 60 * 1000));
    const last30d = providerUsage.filter(record => record.timestamp > (now - 30 * 24 * 60 * 60 * 1000));

    return {
      provider,
      usage: {
        last24h: last24h.length,
        last7d: last7d.length,
        last30d: last30d.length
      },
      costs: {
        last24h: this.calculateTotalCost(last24h),
        last7d: this.calculateTotalCost(last7d),
        last30d: this.calculateTotalCost(last30d)
      },
      performance: {
        successRate: this.calculateSuccessRate(providerUsage),
        averageResponseTime: this.calculateAverageResponseTime(providerUsage),
        errorRate: this.calculateErrorRate(providerUsage)
      },
      patterns: {
        peakHours: this.findPeakUsageHours(providerUsage),
        mostUsedEndpoints: this.findMostUsedEndpoints(providerUsage),
        costliestEndpoints: this.findCostliestEndpoints(providerUsage)
      }
    };
  }

  /**
   * Set usage alerts and budgets
   */
  async setUsageBudget(provider: ProviderName, budget: number, period: 'daily' | 'monthly'): Promise<void> {
    const budgetConfig = {
      provider,
      budget,
      period,
      alertThresholds: [50, 75, 90, 95], // Alert at these percentage levels
      timestamp: Date.now()
    };

    await cacheManager.set(
      `quota:budget:${provider}:${period}`,
      budgetConfig,
      'user_data' as any,
      'quota-manager'
    );

    console.log(`💰 Set ${period} budget for ${provider}: ${budget} credits`);
  }

  async checkBudgetAlerts(): Promise<Array<{provider: ProviderName, usage: number, budget: number, alert: string}>> {
    const alerts = [];
    const providers = Object.keys(this.predictions) as ProviderName[];

    for (const provider of providers) {
      // Check daily budget
      const dailyBudget = await cacheManager.get(`quota:budget:${provider}:daily`, 'user_data' as any);
      if (dailyBudget) {
        const dailyUsage = await this.getDailyUsage(provider);
        const percentage = (dailyUsage / dailyBudget.budget) * 100;

        if (percentage >= 95) {
          alerts.push({provider, usage: dailyUsage, budget: dailyBudget.budget, alert: 'CRITICAL: 95% budget used'});
        } else if (percentage >= 75) {
          alerts.push({provider, usage: dailyUsage, budget: dailyBudget.budget, alert: 'WARNING: 75% budget used'});
        }
      }
    }

    return alerts;
  }

  /**
   * PRIVATE HELPER METHODS
   */
  private async loadUsageHistory(): Promise<void> {
    try {
      const history = await cacheManager.get<QuotaUsageRecord[]>(this.USAGE_HISTORY_KEY, 'user_data' as any);
      if (history) {
        this.usageHistory = history;
        console.log(`📊 Loaded ${history.length} usage records from cache`);
      }
    } catch (error) {
      console.error('❌ Failed to load usage history:', error);
    }
  }

  private async persistUsageRecord(record: QuotaUsageRecord): Promise<void> {
    try {
      // Store individual record
      await cacheManager.set(
        `quota:record:${record.timestamp}:${record.provider}`,
        record,
        'user_data' as any,
        'quota-manager'
      );

      // Update usage history periodically (every 100 records)
      if (this.usageHistory.length % 100 === 0) {
        await cacheManager.set(
          this.USAGE_HISTORY_KEY,
          this.usageHistory,
          'user_data' as any,
          'quota-manager'
        );
      }
    } catch (error) {
      console.error('❌ Failed to persist usage record:', error);
    }
  }

  private async updateRealTimeMetrics(record: QuotaUsageRecord): Promise<void> {
    // Update real-time counters
    const metricsKey = `quota:metrics:${record.provider}:${new Date().toISOString().split('T')[0]}`;
    const metrics = await cacheManager.get(metricsKey, 'user_data' as any) || {
      calls: 0,
      cost: 0,
      errors: 0,
      totalResponseTime: 0
    };

    metrics.calls++;
    metrics.cost += record.cost;
    metrics.totalResponseTime += record.responseTime;
    if (!record.success) metrics.errors++;

    await cacheManager.set(metricsKey, metrics, 'user_data' as any, 'quota-manager');
  }

  private groupUsageByHour(usage: QuotaUsageRecord[]): Record<number, number> {
    const hourly: Record<number, number> = {};
    
    for (const record of usage) {
      const hour = new Date(record.timestamp).getUTCHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    }
    
    return hourly;
  }

  private calculateTrend(hourlyUsage: Record<number, number>): number {
    const hours = Object.keys(hourlyUsage).map(Number).sort();
    if (hours.length < 2) return 0;

    // Simple linear regression
    const n = hours.length;
    const sumX = hours.reduce((a, b) => a + b, 0);
    const sumY = hours.reduce((a, b) => a + hourlyUsage[b], 0);
    const sumXY = hours.reduce((a, b) => a + (b * hourlyUsage[b]), 0);
    const sumX2 = hours.reduce((a, b) => a + (b * b), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  private calculateAverageUsage(usage: QuotaUsageRecord[], timeframe: string): number {
    if (usage.length === 0) return 0;
    
    const groupedByTimeframe = this.groupByTimeframe(usage, timeframe);
    const periods = Object.keys(groupedByTimeframe);
    
    if (periods.length === 0) return 0;
    
    const totalUsage = periods.reduce((sum, period) => sum + groupedByTimeframe[period].length, 0);
    return totalUsage / periods.length;
  }

  private calculateConfidence(usage: QuotaUsageRecord[]): number {
    if (usage.length < 10) return 0.1;
    if (usage.length < 100) return 0.5;
    if (usage.length < 1000) return 0.8;
    return 0.95;
  }

  private generateRecommendations(provider: ProviderName, predictedUsage: number, recentUsage: QuotaUsageRecord[]): string[] {
    const recommendations = [];
    
    if (predictedUsage > 1000) {
      recommendations.push('Consider implementing more aggressive caching to reduce API calls');
    }
    
    if (recentUsage.length > 0) {
      const errorRate = this.calculateErrorRate(recentUsage);
      if (errorRate > 0.1) {
        recommendations.push('High error rate detected - consider implementing retry logic');
      }
    }
    
    return recommendations;
  }

  private calculateTotalCost(usage: QuotaUsageRecord[]): number {
    return usage.reduce((total, record) => total + record.cost, 0);
  }

  private findCostOptimizations(usage: QuotaUsageRecord[]): {savings: number, changes: any[]} {
    // Simple optimization logic - could be more sophisticated
    return { savings: 0, changes: [] };
  }

  private calculateSuccessRate(usage: QuotaUsageRecord[]): number {
    if (usage.length === 0) return 0;
    const successCount = usage.filter(record => record.success).length;
    return successCount / usage.length;
  }

  private calculateAverageResponseTime(usage: QuotaUsageRecord[]): number {
    if (usage.length === 0) return 0;
    const totalTime = usage.reduce((sum, record) => sum + record.responseTime, 0);
    return totalTime / usage.length;
  }

  private calculateErrorRate(usage: QuotaUsageRecord[]): number {
    return 1 - this.calculateSuccessRate(usage);
  }

  private findPeakUsageHours(usage: QuotaUsageRecord[]): number[] {
    const hourlyUsage = this.groupUsageByHour(usage);
    const hours = Object.keys(hourlyUsage).map(Number);
    return hours.sort((a, b) => hourlyUsage[b] - hourlyUsage[a]).slice(0, 3);
  }

  private findMostUsedEndpoints(usage: QuotaUsageRecord[]): Array<{endpoint: string, count: number}> {
    const endpointCounts: Record<string, number> = {};
    
    for (const record of usage) {
      endpointCounts[record.endpoint] = (endpointCounts[record.endpoint] || 0) + 1;
    }
    
    return Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({endpoint, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private findCostliestEndpoints(usage: QuotaUsageRecord[]): Array<{endpoint: string, cost: number}> {
    const endpointCosts: Record<string, number> = {};
    
    for (const record of usage) {
      endpointCosts[record.endpoint] = (endpointCosts[record.endpoint] || 0) + record.cost;
    }
    
    return Object.entries(endpointCosts)
      .map(([endpoint, cost]) => ({endpoint, cost}))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }

  private groupByTimeframe(usage: QuotaUsageRecord[], timeframe: string): Record<string, QuotaUsageRecord[]> {
    const grouped: Record<string, QuotaUsageRecord[]> = {};
    
    for (const record of usage) {
      let key: string;
      const date = new Date(record.timestamp);
      
      switch (timeframe) {
        case 'hour':
          key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}`;
          break;
        case 'day':
          key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(record);
    }
    
    return grouped;
  }

  private async getDailyUsage(provider: ProviderName): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const metricsKey = `quota:metrics:${provider}:${today}`;
    const metrics = await cacheManager.get(metricsKey, 'user_data' as any);
    return metrics?.cost || 0;
  }

  private startBackgroundTasks(): void {
    // Run predictions every hour
    setInterval(async () => {
      const providers: ProviderName[] = ['alpha-vantage', 'finnhub', 'fmp', 'polygon', 'twelve-data'];
      
      for (const provider of providers) {
        try {
          await this.predictUsage(provider, 'day');
        } catch (error) {
          console.error(`❌ Failed to update prediction for ${provider}:`, error);
        }
      }
    }, 60 * 60 * 1000);

    // Check budget alerts every 15 minutes
    setInterval(async () => {
      try {
        const alerts = await this.checkBudgetAlerts();
        if (alerts.length > 0) {
          console.warn('💰 Budget alerts:', alerts);
        }
      } catch (error) {
        console.error('❌ Failed to check budget alerts:', error);
      }
    }, 15 * 60 * 1000);
  }
}

// Export singleton instance
export const advancedQuotaManager = new AdvancedQuotaManager();