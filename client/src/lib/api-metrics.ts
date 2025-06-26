// Comprehensive API Usage Metrics Collection System
// Tracks performance, quotas, errors, and optimization opportunities

export interface APIMetrics {
  provider: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timestamp: number;
  responseTime: number;
  status: 'success' | 'error' | 'rate_limited' | 'timeout';
  statusCode?: number;
  errorType?: string;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
  cacheHit: boolean;
  quotaUsed?: number;
  quotaRemaining?: number;
  apiKeyId?: string;
  symbol?: string;
  dataType?: string;
  userAgent?: string;
  region?: string;
}

export interface ProviderQuota {
  provider: string;
  dailyLimit: number;
  minuteLimit?: number;
  currentDailyUsage: number;
  currentMinuteUsage: number;
  lastDailyReset: number;
  lastMinuteReset: number;
  quotaResetTime?: number;
  remainingQuota?: number;
  apiKeyId?: string;
}

export interface APIMetricsSnapshot {
  totalCalls: number;
  successfulCalls: number;
  errorCalls: number;
  rateLimitedCalls: number;
  timeoutCalls: number;
  avgResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  cacheHitRate: number;
  topErrors: Array<{ error: string; count: number }>;
  topSlowEndpoints: Array<{ endpoint: string; avgTime: number }>;
  providerStats: Record<string, {
    calls: number;
    errors: number;
    avgResponseTime: number;
    quotaUsage: number;
    quotaRemaining: number;
  }>;
  endpointStats: Record<string, {
    calls: number;
    errors: number;
    avgResponseTime: number;
    cacheHitRate: number;
  }>;
}

export interface MetricsConfig {
  enabled: boolean;
  maxMetricsHistory: number;
  aggregationWindow: number; // in minutes
  persistToStorage: boolean;
  enablePerformanceMonitoring: boolean;
  enableQuotaTracking: boolean;
  enableErrorTracking: boolean;
  alertThresholds: {
    errorRate: number; // percentage
    avgResponseTime: number; // milliseconds
    quotaUsage: number; // percentage
  };
}

export class APIMetricsCollector {
  private metrics: APIMetrics[] = [];
  private quotas: Map<string, ProviderQuota> = new Map();
  private aggregatedStats: Map<string, APIMetricsSnapshot> = new Map();
  private performanceObserver?: PerformanceObserver;
  private storageKey = 'api_metrics';
  private quotaStorageKey = 'api_quotas';
  
  private config: MetricsConfig = {
    enabled: true,
    maxMetricsHistory: 10000,
    aggregationWindow: 5,
    persistToStorage: true,
    enablePerformanceMonitoring: true,
    enableQuotaTracking: true,
    enableErrorTracking: true,
    alertThresholds: {
      errorRate: 5, // 5%
      avgResponseTime: 2000, // 2 seconds
      quotaUsage: 80 // 80%
    }
  };

  constructor(config?: Partial<MetricsConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.loadFromStorage();
    this.initializeQuotas();
    
    if (this.config.enablePerformanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Periodic cleanup and aggregation
    setInterval(() => {
      this.cleanupOldMetrics();
      this.aggregateMetrics();
      this.saveToStorage();
    }, this.config.aggregationWindow * 60 * 1000);
  }

  // Initialize provider quotas based on known limits
  private initializeQuotas(): void {
    const providers = [
      { name: 'financialmodeling', dailyLimit: 250, minuteLimit: 10 },
      { name: 'alphavantage', dailyLimit: 500, minuteLimit: 5 },
      { name: 'iexcloud', dailyLimit: 3000, minuteLimit: 100 },
      { name: 'finnhub', dailyLimit: 86400, minuteLimit: 60 },
      { name: 'twelvedata', dailyLimit: 800, minuteLimit: 8 },
      { name: 'polygon', dailyLimit: 5, minuteLimit: 5 },
      { name: 'quandl', dailyLimit: 50, minuteLimit: 10 }
    ];

    providers.forEach(provider => {
      const key = provider.name;
      if (!this.quotas.has(key)) {
        this.quotas.set(key, {
          provider: provider.name,
          dailyLimit: provider.dailyLimit,
          minuteLimit: provider.minuteLimit,
          currentDailyUsage: 0,
          currentMinuteUsage: 0,
          lastDailyReset: Date.now(),
          lastMinuteReset: Date.now()
        });
      }
    });
  }

  // Record a new API call metric
  recordMetric(metric: Partial<APIMetrics>): void {
    if (!this.config.enabled) return;

    const fullMetric: APIMetrics = {
      provider: metric.provider || 'unknown',
      endpoint: metric.endpoint || '',
      method: metric.method || 'GET',
      timestamp: metric.timestamp || Date.now(),
      responseTime: metric.responseTime || 0,
      status: metric.status || 'success',
      cacheHit: metric.cacheHit || false,
      ...metric
    };

    this.metrics.push(fullMetric);
    
    // Update quota tracking
    if (this.config.enableQuotaTracking && fullMetric.provider) {
      this.updateQuotaUsage(fullMetric.provider, fullMetric.quotaUsed, fullMetric.quotaRemaining);
    }

    // Trigger alerts if thresholds exceeded
    this.checkAlertThresholds(fullMetric);

    // Cleanup if we exceed max history
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory);
    }
  }

  // Update quota usage for a provider
  private updateQuotaUsage(provider: string, used?: number, remaining?: number): void {
    const quota = this.quotas.get(provider);
    if (!quota) return;

    const now = Date.now();
    
    // Reset daily usage if needed
    if (now - quota.lastDailyReset > 24 * 60 * 60 * 1000) {
      quota.currentDailyUsage = 0;
      quota.lastDailyReset = now;
    }

    // Reset minute usage if needed
    if (now - quota.lastMinuteReset > 60 * 1000) {
      quota.currentMinuteUsage = 0;
      quota.lastMinuteReset = now;
    }

    // Update usage counts
    quota.currentDailyUsage++;
    quota.currentMinuteUsage++;

    // Update from API response if provided
    if (used !== undefined) quota.currentDailyUsage = used;
    if (remaining !== undefined) quota.remainingQuota = remaining;
  }

  // Create a wrapper for API calls that automatically tracks metrics
  async trackAPICall<T>(
    provider: string,
    endpoint: string,
    apiCall: () => Promise<T>,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      symbol?: string;
      dataType?: string;
      cacheHit?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = performance.now();
    const metric: Partial<APIMetrics> = {
      provider,
      endpoint,
      method: options.method || 'GET',
      timestamp: Date.now(),
      symbol: options.symbol,
      dataType: options.dataType,
      cacheHit: options.cacheHit || false
    };

    try {
      const result = await apiCall();
      const endTime = performance.now();
      
      metric.responseTime = endTime - startTime;
      metric.status = 'success';
      
      // Try to extract quota info from headers if result has them
      if (typeof result === 'object' && result !== null) {
        const headers = (result as any).headers;
        if (headers) {
          metric.quotaRemaining = this.parseQuotaFromHeaders(headers);
        }
      }

      this.recordMetric(metric);
      return result;
    } catch (error: any) {
      const endTime = performance.now();
      
      metric.responseTime = endTime - startTime;
      metric.errorMessage = error.message;
      metric.statusCode = error.status || error.statusCode;
      
      // Classify error type
      if (error.message?.includes('rate limit') || error.status === 429) {
        metric.status = 'rate_limited';
        metric.errorType = 'rate_limit';
      } else if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
        metric.status = 'timeout';
        metric.errorType = 'timeout';
      } else {
        metric.status = 'error';
        metric.errorType = this.classifyError(error);
      }

      this.recordMetric(metric);
      throw error;
    }
  }

  // Parse quota information from response headers
  private parseQuotaFromHeaders(headers: Headers | Record<string, string>): number | undefined {
    const quotaHeaders = [
      'x-ratelimit-remaining',
      'x-api-quota-remaining',
      'x-quota-remaining',
      'ratelimit-remaining'
    ];

    for (const header of quotaHeaders) {
      const value = typeof headers.get === 'function' 
        ? headers.get(header) 
        : headers[header];
      
      if (value) {
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }

    return undefined;
  }

  // Classify error types for better tracking
  private classifyError(error: any): string {
    if (error.name === 'NetworkError') return 'network';
    if (error.name === 'TypeError') return 'type';
    if (error.message?.includes('fetch')) return 'fetch';
    if (error.message?.includes('JSON')) return 'json_parse';
    if (error.message?.includes('auth')) return 'authentication';
    if (error.status >= 400 && error.status < 500) return 'client_error';
    if (error.status >= 500) return 'server_error';
    return 'unknown';
  }

  // Check if any alert thresholds are exceeded
  private checkAlertThresholds(metric: APIMetrics): void {
    // Calculate recent error rate
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    const errorRate = (recentMetrics.filter(m => m.status === 'error').length / recentMetrics.length) * 100;
    
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.triggerAlert('high_error_rate', `Error rate: ${errorRate.toFixed(1)}%`);
    }

    // Check response time
    if (metric.responseTime > this.config.alertThresholds.avgResponseTime) {
      this.triggerAlert('slow_response', `Slow response: ${metric.responseTime.toFixed(0)}ms for ${metric.endpoint}`);
    }

    // Check quota usage
    const quota = this.quotas.get(metric.provider);
    if (quota) {
      const usagePercent = (quota.currentDailyUsage / quota.dailyLimit) * 100;
      if (usagePercent > this.config.alertThresholds.quotaUsage) {
        this.triggerAlert('high_quota_usage', `Quota usage: ${usagePercent.toFixed(1)}% for ${metric.provider}`);
      }
    }
  }

  // Trigger alert (can be extended to send notifications)
  private triggerAlert(type: string, message: string): void {
    console.warn(`🚨 API Metrics Alert [${type}]: ${message}`);
    
    // In production, this could send to monitoring services
    // or trigger notifications
  }

  // Get metrics from a specific time window
  private getRecentMetrics(windowMs: number): APIMetrics[] {
    const cutoff = Date.now() - windowMs;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Generate comprehensive metrics snapshot
  generateSnapshot(windowMs: number = 60 * 60 * 1000): APIMetricsSnapshot {
    const recentMetrics = this.getRecentMetrics(windowMs);
    
    if (recentMetrics.length === 0) {
      return this.getEmptySnapshot();
    }

    const responseTimes = recentMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const successfulCalls = recentMetrics.filter(m => m.status === 'success').length;
    const errorCalls = recentMetrics.filter(m => m.status === 'error').length;
    const rateLimitedCalls = recentMetrics.filter(m => m.status === 'rate_limited').length;
    const timeoutCalls = recentMetrics.filter(m => m.status === 'timeout').length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;

    // Calculate percentiles
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const medianIndex = Math.floor(responseTimes.length * 0.5);

    // Top errors
    const errorCounts = new Map<string, number>();
    recentMetrics.filter(m => m.errorMessage).forEach(m => {
      const error = m.errorMessage!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });
    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top slow endpoints
    const endpointTimes = new Map<string, number[]>();
    recentMetrics.forEach(m => {
      const key = `${m.provider}:${m.endpoint}`;
      if (!endpointTimes.has(key)) endpointTimes.set(key, []);
      endpointTimes.get(key)!.push(m.responseTime);
    });
    const topSlowEndpoints = Array.from(endpointTimes.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Provider stats
    const providerStats: Record<string, any> = {};
    const providers = new Set(recentMetrics.map(m => m.provider));
    providers.forEach(provider => {
      const providerMetrics = recentMetrics.filter(m => m.provider === provider);
      const quota = this.quotas.get(provider);
      
      providerStats[provider] = {
        calls: providerMetrics.length,
        errors: providerMetrics.filter(m => m.status === 'error').length,
        avgResponseTime: providerMetrics.reduce((sum, m) => sum + m.responseTime, 0) / providerMetrics.length,
        quotaUsage: quota ? (quota.currentDailyUsage / quota.dailyLimit) * 100 : 0,
        quotaRemaining: quota ? quota.remainingQuota || (quota.dailyLimit - quota.currentDailyUsage) : 0
      };
    });

    // Endpoint stats
    const endpointStats: Record<string, any> = {};
    const endpoints = new Set(recentMetrics.map(m => `${m.provider}:${m.endpoint}`));
    endpoints.forEach(endpoint => {
      const endpointMetrics = recentMetrics.filter(m => `${m.provider}:${m.endpoint}` === endpoint);
      const cacheHitsForEndpoint = endpointMetrics.filter(m => m.cacheHit).length;
      
      endpointStats[endpoint] = {
        calls: endpointMetrics.length,
        errors: endpointMetrics.filter(m => m.status === 'error').length,
        avgResponseTime: endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0) / endpointMetrics.length,
        cacheHitRate: (cacheHitsForEndpoint / endpointMetrics.length) * 100
      };
    });

    return {
      totalCalls: recentMetrics.length,
      successfulCalls,
      errorCalls,
      rateLimitedCalls,
      timeoutCalls,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      medianResponseTime: responseTimes[medianIndex] || 0,
      p95ResponseTime: responseTimes[p95Index] || 0,
      cacheHitRate: (cacheHits / recentMetrics.length) * 100,
      topErrors,
      topSlowEndpoints,
      providerStats,
      endpointStats
    };
  }

  // Get quota information for all providers
  getQuotaStatus(): ProviderQuota[] {
    return Array.from(this.quotas.values()).map(quota => ({
      ...quota,
      // Calculate usage percentages
      dailyUsagePercent: (quota.currentDailyUsage / quota.dailyLimit) * 100,
      minuteUsagePercent: quota.minuteLimit 
        ? (quota.currentMinuteUsage / quota.minuteLimit) * 100 
        : 0
    }));
  }

  // Get cache performance metrics
  getCacheMetrics(): {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    avgResponseTimeWithCache: number;
    avgResponseTimeWithoutCache: number;
  } {
    const cacheHits = this.metrics.filter(m => m.cacheHit);
    const cacheMisses = this.metrics.filter(m => !m.cacheHit);
    
    return {
      totalRequests: this.metrics.length,
      cacheHits: cacheHits.length,
      cacheMisses: cacheMisses.length,
      hitRate: this.metrics.length > 0 ? (cacheHits.length / this.metrics.length) * 100 : 0,
      avgResponseTimeWithCache: cacheHits.length > 0 
        ? cacheHits.reduce((sum, m) => sum + m.responseTime, 0) / cacheHits.length 
        : 0,
      avgResponseTimeWithoutCache: cacheMisses.length > 0 
        ? cacheMisses.reduce((sum, m) => sum + m.responseTime, 0) / cacheMisses.length 
        : 0
    };
  }

  // Get detailed error analysis
  getErrorAnalysis(windowMs: number = 60 * 60 * 1000): {
    errorsByType: Record<string, number>;
    errorsByProvider: Record<string, number>;
    errorsByEndpoint: Record<string, number>;
    errorTrends: Array<{ timestamp: number; errorCount: number }>;
  } {
    const recentMetrics = this.getRecentMetrics(windowMs);
    const errors = recentMetrics.filter(m => m.status === 'error');

    const errorsByType: Record<string, number> = {};
    const errorsByProvider: Record<string, number> = {};
    const errorsByEndpoint: Record<string, number> = {};

    errors.forEach(error => {
      const type = error.errorType || 'unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
      
      errorsByProvider[error.provider] = (errorsByProvider[error.provider] || 0) + 1;
      
      const endpoint = `${error.provider}:${error.endpoint}`;
      errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1;
    });

    // Create hourly error trends
    const hourlyErrors = new Map<number, number>();
    const startHour = Math.floor((Date.now() - windowMs) / (60 * 60 * 1000));
    const endHour = Math.floor(Date.now() / (60 * 60 * 1000));

    for (let hour = startHour; hour <= endHour; hour++) {
      hourlyErrors.set(hour, 0);
    }

    errors.forEach(error => {
      const hour = Math.floor(error.timestamp / (60 * 60 * 1000));
      hourlyErrors.set(hour, (hourlyErrors.get(hour) || 0) + 1);
    });

    const errorTrends = Array.from(hourlyErrors.entries()).map(([hour, errorCount]) => ({
      timestamp: hour * 60 * 60 * 1000,
      errorCount
    }));

    return {
      errorsByType,
      errorsByProvider,
      errorsByEndpoint,
      errorTrends
    };
  }

  // Setup performance monitoring using the Performance API
  private setupPerformanceMonitoring(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation' && entry.name) {
          this.recordMetric({
            provider: 'navigation',
            endpoint: entry.name,
            method: 'GET',
            responseTime: entry.duration,
            status: 'success',
            cacheHit: false,
            timestamp: entry.startTime
          });
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ['navigation', 'resource'] });
  }

  // Aggregate metrics for efficient querying
  private aggregateMetrics(): void {
    const windows = [
      { key: '5m', duration: 5 * 60 * 1000 },
      { key: '1h', duration: 60 * 60 * 1000 },
      { key: '24h', duration: 24 * 60 * 60 * 1000 }
    ];

    windows.forEach(window => {
      const snapshot = this.generateSnapshot(window.duration);
      this.aggregatedStats.set(window.key, snapshot);
    });
  }

  // Clean up old metrics to prevent memory leaks
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  // Save metrics to localStorage
  private saveToStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.metrics.slice(-1000))); // Keep last 1000
      localStorage.setItem(this.quotaStorageKey, JSON.stringify(Array.from(this.quotas.entries())));
    } catch (error) {
      console.warn('Failed to save metrics to storage:', error);
    }
  }

  // Load metrics from localStorage
  private loadFromStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const metricsData = localStorage.getItem(this.storageKey);
      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }

      const quotaData = localStorage.getItem(this.quotaStorageKey);
      if (quotaData) {
        const quotaEntries = JSON.parse(quotaData);
        this.quotas = new Map(quotaEntries);
      }
    } catch (error) {
      console.warn('Failed to load metrics from storage:', error);
    }
  }

  // Get empty snapshot for when no data is available
  private getEmptySnapshot(): APIMetricsSnapshot {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      errorCalls: 0,
      rateLimitedCalls: 0,
      timeoutCalls: 0,
      avgResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      cacheHitRate: 0,
      topErrors: [],
      topSlowEndpoints: [],
      providerStats: {},
      endpointStats: {}
    };
  }

  // Export metrics data
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp', 'provider', 'endpoint', 'method', 'status', 
        'responseTime', 'cacheHit', 'errorType', 'symbol'
      ];
      
      const rows = this.metrics.map(m => [
        new Date(m.timestamp).toISOString(),
        m.provider,
        m.endpoint,
        m.method,
        m.status,
        m.responseTime,
        m.cacheHit,
        m.errorType || '',
        m.symbol || ''
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify({
      metrics: this.metrics,
      quotas: Array.from(this.quotas.entries()),
      snapshot: this.generateSnapshot(),
      config: this.config
    }, null, 2);
  }

  // Reset all metrics (useful for testing)
  reset(): void {
    this.metrics = [];
    this.quotas.clear();
    this.aggregatedStats.clear();
    this.initializeQuotas();
    
    if (this.config.persistToStorage) {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.quotaStorageKey);
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enablePerformanceMonitoring && !this.performanceObserver) {
      this.setupPerformanceMonitoring();
    } else if (!newConfig.enablePerformanceMonitoring && this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }
  }

  // Get current configuration
  getConfig(): MetricsConfig {
    return { ...this.config };
  }

  // Health check for the metrics system
  healthCheck(): {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    metrics: {
      totalMetrics: number;
      oldestMetric: number;
      newestMetric: number;
      storageUsed: number;
    };
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'error' = 'healthy';

    // Check if metrics are being collected
    if (this.metrics.length === 0) {
      issues.push('No metrics collected');
      status = 'warning';
    }

    // Check for old metrics
    const oldestMetric = Math.min(...this.metrics.map(m => m.timestamp));
    const age = Date.now() - oldestMetric;
    if (age > 7 * 24 * 60 * 60 * 1000) { // Older than 7 days
      issues.push('Metrics older than 7 days detected');
      status = 'warning';
    }

    // Check storage usage
    const storageUsed = JSON.stringify(this.metrics).length;
    if (storageUsed > 5 * 1024 * 1024) { // More than 5MB
      issues.push('High storage usage detected');
      status = 'warning';
    }

    // Check for quota issues
    this.quotas.forEach((quota, provider) => {
      if (quota.currentDailyUsage / quota.dailyLimit > 0.9) {
        issues.push(`High quota usage for ${provider}`);
        status = 'warning';
      }
    });

    return {
      status,
      issues,
      metrics: {
        totalMetrics: this.metrics.length,
        oldestMetric,
        newestMetric: Math.max(...this.metrics.map(m => m.timestamp)),
        storageUsed
      }
    };
  }
}

// Global metrics collector instance
export const apiMetricsCollector = new APIMetricsCollector();