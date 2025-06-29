import { SubscriptionTier } from './auth';

// Core API Metrics Interface
export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ipAddress: string;
  subscriptionTier: SubscriptionTier;
  dataProvider?: string;
  bytesTransferred: number;
  errorType?: string;
  errorMessage?: string;
  requestId: string;
}

// Usage Statistics Interface
export interface UsageStats {
  userId?: string;
  subscriptionTier: SubscriptionTier;
  endpoint: string;
  method: string;
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  errorCount: number;
  successCount: number;
  bytesTransferred: number;
  firstRequest: Date;
  lastRequest: Date;
  period: 'hour' | 'day' | 'week' | 'month';
  periodStart: Date;
  periodEnd: Date;
}

// Error Report Interface
export interface ErrorReport {
  errorId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  subscriptionTier: SubscriptionTier;
  ipAddress: string;
  userAgent?: string;
  requestBody?: any;
  queryParams?: Record<string, any>;
  headers?: Record<string, string>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  frequency: number;
  affectedUsers: string[];
}

// Service Health Interface
export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  lastCheck: Date;
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  dependencies: ServiceDependency[];
  alerts: ServiceAlert[];
}

// Service Dependency Interface
export interface ServiceDependency {
  name: string;
  type: 'database' | 'api' | 'cache' | 'queue';
  status: 'connected' | 'disconnected' | 'timeout';
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
}

// Service Alert Interface
export interface ServiceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

// Rate Limit Status Interface
export interface RateLimitStatus {
  userId?: string;
  ipAddress: string;
  subscriptionTier: SubscriptionTier;
  endpoint: string;
  currentRequests: number;
  requestLimit: number;
  remaining: number;
  resetTime: Date;
  windowStart: Date;
  windowEnd: Date;
  isThrottled: boolean;
  dailyUsage: number;
  dailyLimit: number;
}

// API Provider Metrics Interface
export interface APIProviderMetrics {
  provider: string;
  endpoint: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
  quotaResetTime: Date;
  lastRequest: Date;
  errorRate: number;
  availability: number;
  cost: number;
  period: Date;
}

// Real-time Metrics Interface
export interface RealTimeMetrics {
  timestamp: Date;
  activeConnections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeUsers: number;
  topEndpoints: EndpointMetric[];
  topErrors: ErrorMetric[];
}

// Endpoint Metric Interface
export interface EndpointMetric {
  endpoint: string;
  method: string;
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
}

// Error Metric Interface
export interface ErrorMetric {
  errorType: string;
  count: number;
  percentage: number;
  lastOccurrence: Date;
}

// Monitoring Configuration Interface
export interface MonitoringConfig {
  metricsRetentionDays: number;
  errorRetentionDays: number;
  alertThresholds: AlertThresholds;
  dataProviderSettings: DataProviderSettings;
  realTimeUpdateInterval: number;
  batchProcessingInterval: number;
  cleanupInterval: number;
}

// Alert Thresholds Interface
export interface AlertThresholds {
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  consecutiveFailures: number;
  rateLimitUsage: number;
}

// Data Provider Settings Interface
export interface DataProviderSettings {
  [provider: string]: {
    quotaLimit: number;
    quotaWindow: number;
    costPerRequest: number;
    timeout: number;
    retryAttempts: number;
    priority: number;
  };
}

// Metric Aggregation Types
export type MetricPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';
export type MetricType = 'count' | 'average' | 'sum' | 'min' | 'max' | 'percentile';

// Monitoring Events
export interface MonitoringEvent {
  type: 'request' | 'error' | 'alert' | 'health_check' | 'rate_limit';
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Database Storage Interfaces
export interface MetricsStorageOptions {
  batchSize: number;
  flushInterval: number;
  compressionEnabled: boolean;
  indexingStrategy: 'time' | 'endpoint' | 'user' | 'hybrid';
}

// Export types for external use
export type {
  APIMetrics as APIMetricsType,
  UsageStats as UsageStatsType,
  ErrorReport as ErrorReportType,
  ServiceHealth as ServiceHealthType,
  RateLimitStatus as RateLimitStatusType,
  APIProviderMetrics as APIProviderMetricsType,
  RealTimeMetrics as RealTimeMetricsType
};