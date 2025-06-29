import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import type { 
  APIMetrics, 
  UsageStats, 
  RateLimitStatus, 
  MonitoringEvent,
  MetricPeriod 
} from '../types/monitoring';
import type { SubscriptionTier } from '../types/auth';

export class APIUsageTracker extends EventEmitter {
  private metricsBuffer: APIMetrics[] = [];
  private usageStatsCache: Map<string, UsageStats> = new Map();
  private rateLimitCache: Map<string, RateLimitStatus> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly bufferSize = 1000;
  private readonly flushIntervalMs = 30000; // 30 seconds

  constructor() {
    super();
    this.startPeriodicFlush();
    this.setupEventListeners();
  }

  /**
   * Track API request metrics
   */
  async trackRequest(req: Request, res: Response, responseTime: number): Promise<void> {
    const metrics: APIMetrics = {
      endpoint: this.normalizeEndpoint(req.path),
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || 'unknown',
      subscriptionTier: req.user?.subscriptionTier || 'free',
      dataProvider: this.extractDataProvider(req),
      bytesTransferred: this.calculateBytesTransferred(req, res),
      errorType: res.statusCode >= 400 ? this.getErrorType(res.statusCode) : undefined,
      errorMessage: res.statusCode >= 400 ? this.getErrorMessage(res) : undefined,
      requestId: (req as any).requestId || this.generateRequestId()
    };

    // Add to buffer
    this.metricsBuffer.push(metrics);

    // Update real-time cache
    await this.updateUsageStatsCache(metrics);
    await this.updateRateLimitCache(req, metrics);

    // Emit event for real-time monitoring
    this.emit('request_tracked', metrics);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      await this.flushMetrics();
    }
  }

  /**
   * Get usage statistics for a user or endpoint
   */
  async getUsageStats(
    filters: {
      userId?: string;
      endpoint?: string;
      subscriptionTier?: SubscriptionTier;
      period?: MetricPeriod;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<UsageStats[]> {
    const cacheKey = this.generateCacheKey('usage', filters);
    
    // Check cache first
    const cached = this.usageStatsCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.lastRequest)) {
      return [cached];
    }

    // Calculate from metrics buffer
    const stats = this.calculateUsageStatsFromBuffer(filters);
    
    // Cache the result
    if (stats.length > 0) {
      this.usageStatsCache.set(cacheKey, stats[0]);
    }

    return stats;
  }

  /**
   * Get rate limit status for a user/IP
   */
  async getRateLimitStatus(
    userId?: string, 
    ipAddress?: string
  ): Promise<RateLimitStatus | null> {
    const key = userId || ipAddress;
    if (!key) return null;

    return this.rateLimitCache.get(key) || null;
  }

  /**
   * Get top endpoints by request volume
   */
  async getTopEndpoints(limit: number = 10, period: MetricPeriod = 'day'): Promise<any[]> {
    const endpointStats = new Map<string, { 
      count: number; 
      avgResponseTime: number; 
      errorRate: number;
      totalResponseTime: number;
      errorCount: number;
    }>();

    const cutoff = this.getPeriodCutoff(period);
    
    this.metricsBuffer
      .filter(metric => metric.timestamp >= cutoff)
      .forEach(metric => {
        const key = `${metric.method} ${metric.endpoint}`;
        const existing = endpointStats.get(key) || {
          count: 0,
          avgResponseTime: 0,
          errorRate: 0,
          totalResponseTime: 0,
          errorCount: 0
        };

        existing.count++;
        existing.totalResponseTime += metric.responseTime;
        existing.avgResponseTime = existing.totalResponseTime / existing.count;
        
        if (metric.statusCode >= 400) {
          existing.errorCount++;
        }
        existing.errorRate = (existing.errorCount / existing.count) * 100;

        endpointStats.set(key, existing);
      });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get error statistics
   */
  async getErrorStats(period: MetricPeriod = 'day'): Promise<any[]> {
    const errorStats = new Map<string, {
      count: number;
      percentage: number;
      lastOccurrence: Date;
      affectedEndpoints: Set<string>;
      affectedUsers: Set<string>;
    }>();

    const cutoff = this.getPeriodCutoff(period);
    const totalRequests = this.metricsBuffer.filter(m => m.timestamp >= cutoff).length;
    
    this.metricsBuffer
      .filter(metric => metric.timestamp >= cutoff && metric.statusCode >= 400)
      .forEach(metric => {
        const errorType = metric.errorType || 'Unknown';
        const existing = errorStats.get(errorType) || {
          count: 0,
          percentage: 0,
          lastOccurrence: metric.timestamp,
          affectedEndpoints: new Set(),
          affectedUsers: new Set()
        };

        existing.count++;
        existing.lastOccurrence = metric.timestamp > existing.lastOccurrence 
          ? metric.timestamp 
          : existing.lastOccurrence;
        existing.affectedEndpoints.add(metric.endpoint);
        
        if (metric.userId) {
          existing.affectedUsers.add(metric.userId);
        }

        errorStats.set(errorType, existing);
      });

    return Array.from(errorStats.entries())
      .map(([errorType, stats]) => ({
        errorType,
        count: stats.count,
        percentage: totalRequests > 0 ? (stats.count / totalRequests) * 100 : 0,
        lastOccurrence: stats.lastOccurrence,
        affectedEndpoints: Array.from(stats.affectedEndpoints),
        affectedUsers: Array.from(stats.affectedUsers)
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get metrics summary for dashboard
   */
  async getMetricsSummary(period: MetricPeriod = 'day'): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
    uniqueUsers: number;
    topSubscriptionTier: SubscriptionTier;
    dataProviderUsage: Record<string, number>;
  }> {
    const cutoff = this.getPeriodCutoff(period);
    const relevantMetrics = this.metricsBuffer.filter(m => m.timestamp >= cutoff);

    const uniqueUsers = new Set(relevantMetrics.map(m => m.userId).filter(Boolean));
    const tierCounts = new Map<SubscriptionTier, number>();
    const providerCounts = new Map<string, number>();
    let totalResponseTime = 0;
    let successCount = 0;
    let errorCount = 0;

    relevantMetrics.forEach(metric => {
      totalResponseTime += metric.responseTime;
      
      if (metric.statusCode < 400) {
        successCount++;
      } else {
        errorCount++;
      }

      // Count subscription tiers
      const currentCount = tierCounts.get(metric.subscriptionTier) || 0;
      tierCounts.set(metric.subscriptionTier, currentCount + 1);

      // Count data providers
      if (metric.dataProvider) {
        const currentProviderCount = providerCounts.get(metric.dataProvider) || 0;
        providerCounts.set(metric.dataProvider, currentProviderCount + 1);
      }
    });

    const topTier = Array.from(tierCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'free';

    return {
      totalRequests: relevantMetrics.length,
      successfulRequests: successCount,
      errorRequests: errorCount,
      averageResponseTime: relevantMetrics.length > 0 
        ? totalResponseTime / relevantMetrics.length 
        : 0,
      uniqueUsers: uniqueUsers.size,
      topSubscriptionTier: topTier,
      dataProviderUsage: Object.fromEntries(providerCounts)
    };
  }

  /**
   * Flush metrics buffer to persistent storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Emit flush event for database storage
      this.emit('metrics_flush', metricsToFlush);
      
      console.log(`Flushed ${metricsToFlush.length} metrics to storage`);
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Add back to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  /**
   * Update usage stats cache
   */
  private async updateUsageStatsCache(metric: APIMetrics): Promise<void> {
    const keys = [
      `user:${metric.userId}`,
      `endpoint:${metric.endpoint}`,
      `tier:${metric.subscriptionTier}`,
      `global`
    ].filter(Boolean);

    keys.forEach(key => {
      const existing = this.usageStatsCache.get(key) || this.createEmptyUsageStats(metric);
      
      existing.requestCount++;
      existing.totalResponseTime += metric.responseTime;
      existing.averageResponseTime = existing.totalResponseTime / existing.requestCount;
      existing.bytesTransferred += metric.bytesTransferred;
      existing.lastRequest = metric.timestamp;

      if (metric.statusCode >= 400) {
        existing.errorCount++;
      } else {
        existing.successCount++;
      }

      this.usageStatsCache.set(key, existing);
    });
  }

  /**
   * Update rate limit cache
   */
  private async updateRateLimitCache(req: Request, metric: APIMetrics): Promise<void> {
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const key = userId || ipAddress;
    
    if (!key) return;

    // This would integrate with the existing RateLimitMiddleware
    // For now, create a basic status
    const status: RateLimitStatus = {
      userId,
      ipAddress: ipAddress || 'unknown',
      subscriptionTier: metric.subscriptionTier,
      endpoint: metric.endpoint,
      currentRequests: 1,
      requestLimit: this.getRequestLimit(metric.subscriptionTier),
      remaining: this.getRequestLimit(metric.subscriptionTier) - 1,
      resetTime: new Date(Date.now() + 3600000), // 1 hour
      windowStart: new Date(Date.now() - 3600000),
      windowEnd: new Date(Date.now()),
      isThrottled: false,
      dailyUsage: 1,
      dailyLimit: this.getDailyLimit(metric.subscriptionTier)
    };

    this.rateLimitCache.set(key, status);
  }

  /**
   * Utility methods
   */
  private normalizeEndpoint(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-zA-Z0-9]{24}/g, '/:id') // MongoDB ObjectId
      .replace(/\?.*$/, ''); // Remove query parameters
  }

  private extractDataProvider(req: Request): string | undefined {
    // Extract from request headers or other indicators
    const provider = req.headers['x-data-provider'] as string;
    if (provider) return provider;

    // Infer from endpoint
    if (req.path.includes('/stocks')) {
      return 'market-data';
    }
    
    return undefined;
  }

  private calculateBytesTransferred(req: Request, res: Response): number {
    const requestSize = JSON.stringify(req.body || {}).length + 
                       JSON.stringify(req.query || {}).length;
    const responseSize = parseInt(res.get('content-length') || '0', 10);
    return requestSize + responseSize;
  }

  private getErrorType(statusCode: number): string {
    if (statusCode >= 500) return 'server_error';
    if (statusCode === 429) return 'rate_limit_exceeded';
    if (statusCode === 401) return 'unauthorized';
    if (statusCode === 403) return 'forbidden';
    if (statusCode === 404) return 'not_found';
    if (statusCode >= 400) return 'client_error';
    return 'unknown';
  }

  private getErrorMessage(res: Response): string {
    return res.locals.errorMessage || `HTTP ${res.statusCode}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(type: string, filters: any): string {
    return `${type}:${JSON.stringify(filters)}`;
  }

  private isCacheValid(lastUpdate: Date): boolean {
    return Date.now() - lastUpdate.getTime() < 60000; // 1 minute
  }

  private getPeriodCutoff(period: MetricPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'minute':
        return new Date(now.getTime() - 60000);
      case 'hour':
        return new Date(now.getTime() - 3600000);
      case 'day':
        return new Date(now.getTime() - 86400000);
      case 'week':
        return new Date(now.getTime() - 604800000);
      case 'month':
        return new Date(now.getTime() - 2592000000);
      default:
        return new Date(now.getTime() - 86400000);
    }
  }

  private createEmptyUsageStats(metric: APIMetrics): UsageStats {
    return {
      userId: metric.userId,
      subscriptionTier: metric.subscriptionTier,
      endpoint: metric.endpoint,
      method: metric.method,
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      errorCount: 0,
      successCount: 0,
      bytesTransferred: 0,
      firstRequest: metric.timestamp,
      lastRequest: metric.timestamp,
      period: 'day',
      periodStart: new Date(),
      periodEnd: new Date()
    };
  }

  private getRequestLimit(tier: SubscriptionTier): number {
    const limits = { free: 100, pro: 1000, premium: 5000 };
    return limits[tier] || 100;
  }

  private getDailyLimit(tier: SubscriptionTier): number {
    const limits = { free: 1000, pro: 15000, premium: 100000 };
    return limits[tier] || 1000;
  }

  private calculateUsageStatsFromBuffer(filters: any): UsageStats[] {
    // Implementation for calculating stats from buffer
    // This would be expanded based on specific filter requirements
    return [];
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, this.flushIntervalMs);
  }

  private setupEventListeners(): void {
    this.on('error', (error) => {
      console.error('APIUsageTracker error:', error);
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush
    this.flushMetrics();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const apiUsageTracker = new APIUsageTracker();