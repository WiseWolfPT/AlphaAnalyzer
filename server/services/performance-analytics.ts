/**
 * FASE 2 - DIA 8: Performance Analytics Service
 * Advanced performance analytics with trend analysis and predictive monitoring
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

// Analytics interfaces
export interface PerformanceMetric {
  timestamp: Date;
  source: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'api' | 'custom';
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface PerformanceTrend {
  metric: string;
  timeRange: { start: Date; end: Date };
  trend: 'improving' | 'stable' | 'degrading' | 'critical';
  changePercent: number;
  dataPoints: Array<{ timestamp: Date; value: number }>;
  summary: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
  };
  predictions?: {
    nextHour: number;
    nextDay: number;
    confidence: number;
  };
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  type: 'threshold' | 'trend' | 'anomaly' | 'prediction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  triggeredBy: {
    value: number;
    threshold: number;
    operator: '>' | '<' | '=' | '!=' | 'trend';
  };
  metadata: Record<string, any>;
}

export interface AnalyticsConfig {
  retentionDays: number;
  samplingInterval: number;
  alertThresholds: Record<string, {
    warning: number;
    critical: number;
  }>;
  trendAnalysis: {
    enabled: boolean;
    windowSize: number;
    sensitivityLevel: 'low' | 'medium' | 'high';
  };
  anomalyDetection: {
    enabled: boolean;
    algorithm: 'zscore' | 'iqr' | 'isolation_forest';
    sensitivity: number;
  };
  predictiveAnalysis: {
    enabled: boolean;
    lookAhead: number; // hours
    minDataPoints: number;
  };
}

class PerformanceAnalytics extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private trends: Map<string, PerformanceTrend> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private config: AnalyticsConfig;
  private isAnalyzing = false;
  private analysisInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: Partial<AnalyticsConfig>) {
    super();
    
    this.config = {
      retentionDays: 30,
      samplingInterval: 60000, // 1 minute
      alertThresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 },
        response_time: { warning: 1000, critical: 5000 },
        error_rate: { warning: 5, critical: 15 }
      },
      trendAnalysis: {
        enabled: true,
        windowSize: 60, // 60 data points
        sensitivityLevel: 'medium'
      },
      anomalyDetection: {
        enabled: true,
        algorithm: 'zscore',
        sensitivity: 2.5 // standard deviations
      },
      predictiveAnalysis: {
        enabled: true,
        lookAhead: 24, // 24 hours
        minDataPoints: 100
      },
      ...config
    };

    this.setupCleanupSchedule();
  }

  /**
   * Start performance analytics
   */
  start(): void {
    if (this.isAnalyzing) {
      console.warn('📊 [PerformanceAnalytics] Already analyzing');
      return;
    }

    this.isAnalyzing = true;
    console.log(`📊 [PerformanceAnalytics] Starting analytics (${this.config.samplingInterval}ms interval)`);

    // Initial analysis
    this.runAnalysis();

    // Set up periodic analysis
    this.analysisInterval = setInterval(() => {
      this.runAnalysis();
    }, this.config.samplingInterval);

    this.emit('analytics_started');
  }

  /**
   * Stop performance analytics
   */
  stop(): void {
    if (!this.isAnalyzing) return;

    this.isAnalyzing = false;
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    console.log('📊 [PerformanceAnalytics] Stopped analytics');
    this.emit('analytics_stopped');
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    const key = `${metric.source}_${metric.type}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricList = this.metrics.get(key)!;
    metricList.push(fullMetric);

    // Keep only recent metrics based on retention policy
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.metrics.set(key, metricList.filter(m => m.timestamp >= cutoff));

    this.emit('metric_recorded', fullMetric);
  }

  /**
   * Record multiple metrics at once (batch operation)
   */
  recordMetrics(metrics: Array<Omit<PerformanceMetric, 'timestamp'>>): void {
    metrics.forEach(metric => this.recordMetric(metric));
  }

  /**
   * Automatically collect system metrics
   */
  collectSystemMetrics(): void {
    const timestamp = new Date();
    
    try {
      // CPU metrics
      const loadAvg = os.loadavg();
      const cpuCount = os.cpus().length;
      
      this.recordMetric({
        source: 'system',
        type: 'cpu',
        value: (loadAvg[0] / cpuCount) * 100,
        unit: 'percent',
        metadata: { loadAverage: loadAvg, cpuCount }
      });

      // Memory metrics
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      
      this.recordMetric({
        source: 'system',
        type: 'memory',
        value: ((totalMem - freeMem) / totalMem) * 100,
        unit: 'percent',
        metadata: { 
          total: totalMem, 
          free: freeMem, 
          processHeap: memUsage.heapUsed,
          processTotal: memUsage.heapTotal
        }
      });

      // Process memory
      this.recordMetric({
        source: 'process',
        type: 'memory',
        value: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        unit: 'percent',
        metadata: memUsage
      });

      // Uptime
      this.recordMetric({
        source: 'process',
        type: 'uptime',
        value: process.uptime(),
        unit: 'seconds'
      });

    } catch (error) {
      console.error('📊 [PerformanceAnalytics] Error collecting system metrics:', error);
    }
  }

  /**
   * Run comprehensive analysis
   */
  private runAnalysis(): void {
    try {
      // Collect current system metrics
      this.collectSystemMetrics();

      // Analyze trends for all metrics
      this.analyzeTrends();

      // Detect anomalies
      if (this.config.anomalyDetection.enabled) {
        this.detectAnomalies();
      }

      // Generate predictions
      if (this.config.predictiveAnalysis.enabled) {
        this.generatePredictions();
      }

      // Check alert conditions
      this.checkAlertConditions();

      this.emit('analysis_completed');
    } catch (error) {
      console.error('📊 [PerformanceAnalytics] Analysis error:', error);
      this.emit('analysis_error', error);
    }
  }

  /**
   * Analyze trends for all metrics
   */
  private analyzeTrends(): void {
    for (const [key, metricList] of this.metrics.entries()) {
      if (metricList.length < 10) continue; // Need minimum data points
      
      const windowSize = Math.min(this.config.trendAnalysis.windowSize, metricList.length);
      const recentMetrics = metricList.slice(-windowSize);
      
      const trend = this.calculateTrend(key, recentMetrics);
      this.trends.set(key, trend);

      this.emit('trend_analyzed', { key, trend });
    }
  }

  /**
   * Calculate trend for a metric
   */
  private calculateTrend(metricKey: string, metrics: PerformanceMetric[]): PerformanceTrend {
    if (metrics.length === 0) {
      throw new Error('No metrics provided for trend calculation');
    }

    const values = metrics.map(m => m.value);
    const dataPoints = metrics.map(m => ({ timestamp: m.timestamp, value: m.value }));
    
    // Statistical calculations
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    // Standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Trend calculation using linear regression
    const n = values.length;
    const sumX = values.map((_, i) => i).reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.map((val, i) => i * val).reduce((a, b) => a + b, 0);
    const sumXX = values.map((_, i) => i * i).reduce((a, b) => a + b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const changePercent = (slope / avg) * 100;

    // Determine trend direction
    let trendDirection: PerformanceTrend['trend'];
    const sensitivity = this.getTrendSensitivity();
    
    if (Math.abs(changePercent) < sensitivity) {
      trendDirection = 'stable';
    } else if (changePercent > 0) {
      trendDirection = changePercent > sensitivity * 2 ? 'critical' : 'degrading';
    } else {
      trendDirection = 'improving';
    }

    // For metrics where lower is better (response time, error rate), invert the logic
    const lowerIsBetter = metricKey.includes('response_time') || metricKey.includes('error');
    if (lowerIsBetter) {
      if (trendDirection === 'degrading') trendDirection = 'improving';
      else if (trendDirection === 'improving') trendDirection = 'degrading';
    }

    return {
      metric: metricKey,
      timeRange: {
        start: metrics[0].timestamp,
        end: metrics[metrics.length - 1].timestamp
      },
      trend: trendDirection,
      changePercent,
      dataPoints,
      summary: { min, max, avg, median, stdDev }
    };
  }

  /**
   * Get trend sensitivity based on configuration
   */
  private getTrendSensitivity(): number {
    switch (this.config.trendAnalysis.sensitivityLevel) {
      case 'low': return 10; // 10% change needed
      case 'medium': return 5; // 5% change needed
      case 'high': return 2; // 2% change needed
      default: return 5;
    }
  }

  /**
   * Detect anomalies in metrics
   */
  private detectAnomalies(): void {
    for (const [key, metricList] of this.metrics.entries()) {
      if (metricList.length < 30) continue; // Need sufficient history
      
      const recentMetrics = metricList.slice(-100); // Last 100 data points
      const values = recentMetrics.map(m => m.value);
      const latestValue = values[values.length - 1];
      
      const isAnomaly = this.isAnomalyValue(values, latestValue);
      
      if (isAnomaly) {
        this.createAnomalyAlert(key, latestValue, recentMetrics[recentMetrics.length - 1]);
      }
    }
  }

  /**
   * Check if a value is an anomaly using Z-score method
   */
  private isAnomalyValue(values: number[], testValue: number): boolean {
    if (values.length < 10) return false;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return false; // No variation in data
    
    const zScore = Math.abs((testValue - mean) / stdDev);
    return zScore > this.config.anomalyDetection.sensitivity;
  }

  /**
   * Generate predictions for metrics
   */
  private generatePredictions(): void {
    for (const [key, metricList] of this.metrics.entries()) {
      if (metricList.length < this.config.predictiveAnalysis.minDataPoints) continue;
      
      const trend = this.trends.get(key);
      if (!trend) continue;
      
      // Simple linear prediction based on trend
      const lastValue = metricList[metricList.length - 1].value;
      const hourlyChange = (trend.changePercent / 100) * trend.summary.avg / 24; // Assuming daily trend
      
      const predictions = {
        nextHour: lastValue + hourlyChange,
        nextDay: lastValue + (hourlyChange * 24),
        confidence: this.calculatePredictionConfidence(trend)
      };
      
      // Update trend with predictions
      trend.predictions = predictions;
      this.trends.set(key, trend);
      
      this.emit('prediction_generated', { key, predictions });
    }
  }

  /**
   * Calculate prediction confidence based on trend stability
   */
  private calculatePredictionConfidence(trend: PerformanceTrend): number {
    const { stdDev, avg } = trend.summary;
    const coefficientOfVariation = stdDev / avg;
    
    // Lower coefficient of variation = higher confidence
    const confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation));
    return Math.round(confidence * 100);
  }

  /**
   * Check alert conditions based on thresholds and trends
   */
  private checkAlertConditions(): void {
    // Threshold-based alerts
    for (const [key, metricList] of this.metrics.entries()) {
      if (metricList.length === 0) continue;
      
      const latestMetric = metricList[metricList.length - 1];
      const thresholds = this.getThresholds(key);
      
      if (thresholds) {
        this.checkThresholdAlert(key, latestMetric, thresholds);
      }
    }

    // Trend-based alerts
    for (const [key, trend] of this.trends.entries()) {
      this.checkTrendAlert(key, trend);
    }
  }

  /**
   * Get thresholds for a metric key
   */
  private getThresholds(metricKey: string): { warning: number; critical: number } | null {
    // Extract metric type from key (e.g., "system_cpu" -> "cpu")
    const parts = metricKey.split('_');
    const metricType = parts[parts.length - 1];
    
    return this.config.alertThresholds[metricType] || null;
  }

  /**
   * Check threshold-based alerts
   */
  private checkThresholdAlert(
    key: string, 
    metric: PerformanceMetric, 
    thresholds: { warning: number; critical: number }
  ): void {
    const alertId = `threshold_${key}`;
    
    let severity: PerformanceAlert['severity'] | null = null;
    let operator: '>' | '<' = '>';
    let threshold: number;
    
    if (metric.value >= thresholds.critical) {
      severity = 'critical';
      threshold = thresholds.critical;
    } else if (metric.value >= thresholds.warning) {
      severity = 'medium';
      threshold = thresholds.warning;
    }
    
    if (severity) {
      const existingAlert = this.alerts.get(alertId);
      
      if (!existingAlert || existingAlert.resolved) {
        const alert: PerformanceAlert = {
          id: alertId,
          metric: key,
          type: 'threshold',
          severity,
          title: `${key} Threshold Exceeded`,
          message: `${key} is at ${metric.value.toFixed(2)}${metric.unit}, exceeding ${severity} threshold of ${threshold}${metric.unit}`,
          timestamp: new Date(),
          resolved: false,
          triggeredBy: {
            value: metric.value,
            threshold,
            operator
          },
          metadata: { metric }
        };
        
        this.alerts.set(alertId, alert);
        console.warn(`🚨 [PerformanceAnalytics] Alert: ${alert.title}`);
        this.emit('alert_created', alert);
      }
    } else {
      // Resolve existing alert if value is back to normal
      const existingAlert = this.alerts.get(alertId);
      if (existingAlert && !existingAlert.resolved) {
        existingAlert.resolved = true;
        console.log(`✅ [PerformanceAnalytics] Alert resolved: ${existingAlert.title}`);
        this.emit('alert_resolved', existingAlert);
      }
    }
  }

  /**
   * Check trend-based alerts
   */
  private checkTrendAlert(key: string, trend: PerformanceTrend): void {
    if (trend.trend === 'critical') {
      const alertId = `trend_${key}`;
      const existingAlert = this.alerts.get(alertId);
      
      if (!existingAlert || existingAlert.resolved) {
        const alert: PerformanceAlert = {
          id: alertId,
          metric: key,
          type: 'trend',
          severity: 'high',
          title: `${key} Critical Trend`,
          message: `${key} is showing a critical ${trend.changePercent > 0 ? 'upward' : 'downward'} trend of ${Math.abs(trend.changePercent).toFixed(1)}%`,
          timestamp: new Date(),
          resolved: false,
          triggeredBy: {
            value: trend.changePercent,
            threshold: this.getTrendSensitivity() * 2,
            operator: 'trend'
          },
          metadata: { trend }
        };
        
        this.alerts.set(alertId, alert);
        console.warn(`🚨 [PerformanceAnalytics] Trend Alert: ${alert.title}`);
        this.emit('alert_created', alert);
      }
    }
  }

  /**
   * Create anomaly alert
   */
  private createAnomalyAlert(metricKey: string, value: number, metric: PerformanceMetric): void {
    const alertId = `anomaly_${metricKey}_${Date.now()}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      metric: metricKey,
      type: 'anomaly',
      severity: 'medium',
      title: `${metricKey} Anomaly Detected`,
      message: `Unusual value detected for ${metricKey}: ${value.toFixed(2)}${metric.unit}`,
      timestamp: new Date(),
      resolved: false,
      triggeredBy: {
        value,
        threshold: this.config.anomalyDetection.sensitivity,
        operator: '>'
      },
      metadata: { metric, algorithm: this.config.anomalyDetection.algorithm }
    };
    
    this.alerts.set(alertId, alert);
    console.warn(`🚨 [PerformanceAnalytics] Anomaly Alert: ${alert.title}`);
    this.emit('alert_created', alert);
  }

  /**
   * Get performance trends for all metrics
   */
  getTrends(metricFilter?: string): PerformanceTrend[] {
    let trends = Array.from(this.trends.values());
    
    if (metricFilter) {
      trends = trends.filter(trend => trend.metric.includes(metricFilter));
    }
    
    return trends.sort((a, b) => b.timeRange.end.getTime() - a.timeRange.end.getTime());
  }

  /**
   * Get metrics for a specific time range
   */
  getMetrics(
    metricKey?: string, 
    timeRange?: { start: Date; end: Date }
  ): PerformanceMetric[] {
    let allMetrics: PerformanceMetric[] = [];
    
    if (metricKey) {
      allMetrics = this.metrics.get(metricKey) || [];
    } else {
      for (const metricList of this.metrics.values()) {
        allMetrics.push(...metricList);
      }
    }
    
    if (timeRange) {
      allMetrics = allMetrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }
    
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance alerts
   */
  getAlerts(filters?: {
    resolved?: boolean;
    severity?: string;
    type?: string;
    metric?: string;
    limit?: number;
  }): PerformanceAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.resolved !== undefined) {
        alerts = alerts.filter(a => a.resolved === filters.resolved);
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.type) {
        alerts = alerts.filter(a => a.type === filters.type);
      }
      if (filters.metric) {
        alerts = alerts.filter(a => a.metric.includes(filters.metric));
      }
      if (filters.limit) {
        alerts = alerts.slice(0, filters.limit);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    totalMetrics: number;
    totalTrends: number;
    totalAlerts: number;
    unresolvedAlerts: number;
    criticalAlerts: number;
    dataRetention: {
      oldestMetric?: Date;
      newestMetric?: Date;
      totalDataPoints: number;
    };
    systemHealth: {
      overall: 'healthy' | 'warning' | 'critical';
      details: string[];
    };
  } {
    const totalDataPoints = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);
    
    const allMetrics = this.getMetrics();
    const oldestMetric = allMetrics.length > 0 
      ? new Date(Math.min(...allMetrics.map(m => m.timestamp.getTime())))
      : undefined;
    const newestMetric = allMetrics.length > 0
      ? new Date(Math.max(...allMetrics.map(m => m.timestamp.getTime())))
      : undefined;

    const alerts = this.getAlerts();
    const unresolvedAlerts = alerts.filter(a => !a.resolved);
    const criticalAlerts = unresolvedAlerts.filter(a => a.severity === 'critical');

    // Determine overall health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    const details: string[] = [];

    if (criticalAlerts.length > 0) {
      overall = 'critical';
      details.push(`${criticalAlerts.length} critical alert(s)`);
    } else if (unresolvedAlerts.length > 3) {
      overall = 'warning';
      details.push(`${unresolvedAlerts.length} unresolved alert(s)`);
    } else if (unresolvedAlerts.length > 0) {
      overall = 'warning';
      details.push(`${unresolvedAlerts.length} active alert(s)`);
    }

    // Check for degrading trends
    const degradingTrends = this.getTrends().filter(t => 
      t.trend === 'degrading' || t.trend === 'critical'
    );
    
    if (degradingTrends.length > 0) {
      if (overall === 'healthy') overall = 'warning';
      details.push(`${degradingTrends.length} degrading trend(s)`);
    }

    return {
      totalMetrics: this.metrics.size,
      totalTrends: this.trends.size,
      totalAlerts: alerts.length,
      unresolvedAlerts: unresolvedAlerts.length,
      criticalAlerts: criticalAlerts.length,
      dataRetention: {
        oldestMetric,
        newestMetric,
        totalDataPoints
      },
      systemHealth: {
        overall,
        details: details.length > 0 ? details : ['All systems normal']
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📊 [PerformanceAnalytics] Configuration updated');
    this.emit('config_updated', this.config);
  }

  /**
   * Export analytics data
   */
  exportData(): {
    metrics: Record<string, PerformanceMetric[]>;
    trends: PerformanceTrend[];
    alerts: PerformanceAlert[];
    config: AnalyticsConfig;
    exportTimestamp: Date;
  } {
    return {
      metrics: Object.fromEntries(this.metrics),
      trends: Array.from(this.trends.values()),
      alerts: Array.from(this.alerts.values()),
      config: this.config,
      exportTimestamp: new Date()
    };
  }

  /**
   * Setup cleanup schedule for old data
   */
  private setupCleanupSchedule(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old data based on retention policy
   */
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    let totalCleaned = 0;

    // Clean metrics
    for (const [key, metricList] of this.metrics.entries()) {
      const originalLength = metricList.length;
      const filteredMetrics = metricList.filter(m => m.timestamp >= cutoff);
      this.metrics.set(key, filteredMetrics);
      totalCleaned += originalLength - filteredMetrics.length;
    }

    // Clean resolved alerts older than retention period
    const alertsToDelete: string[] = [];
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.timestamp < cutoff) {
        alertsToDelete.push(id);
      }
    }
    
    alertsToDelete.forEach(id => this.alerts.delete(id));
    totalCleaned += alertsToDelete.length;

    if (totalCleaned > 0) {
      console.log(`📊 [PerformanceAnalytics] Cleaned up ${totalCleaned} old data points`);
      this.emit('data_cleaned', { cleanedCount: totalCleaned, cutoff });
    }
  }

  /**
   * Destroy the analytics service
   */
  destroy(): void {
    this.stop();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.metrics.clear();
    this.trends.clear();
    this.alerts.clear();
    
    console.log('📊 [PerformanceAnalytics] Service destroyed');
    this.emit('destroyed');
  }
}

// Create and export singleton instance
export const performanceAnalytics = new PerformanceAnalytics();
export default performanceAnalytics;