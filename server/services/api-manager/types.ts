/**
 * SHARED TYPES FOR API MANAGER
 * Common types and interfaces used across the API management system
 */

import { ProviderName, DataType } from '../quota/quota-limits';
import { CircuitBreakerState } from '../unified-api/circuit-breaker';

export interface ApiResponse<T = any> {
  data: T;
  source: ProviderName;
  cached: boolean;
  timestamp: number;
  requestId: string;
}

export interface ApiError {
  message: string;
  code: string;
  provider: ProviderName;
  timestamp: number;
  retryable: boolean;
}

export interface ProviderHealth {
  name: ProviderName;
  healthy: boolean;
  circuitBreakerState: CircuitBreakerState;
  quotaUsage: number;
  lastError?: string;
  uptime: number;
}

export interface SmartCacheOptions {
  ttl?: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  invalidateOn?: string[];
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  quotaUsage: number;
  circuitBreakerTriggers: number;
}

export interface ApiManagerMetrics {
  totalRequests: number;
  successRate: number;
  cacheHitRate: number;
  providersMetrics: Record<ProviderName, ProviderMetrics>;
  cacheMetrics: {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
  };
  uptime: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export interface ProviderConfig {
  name: ProviderName;
  enabled: boolean;
  priority: number;
  quotaLimits: {
    daily?: number;
    perMinute?: number;
    perSecond?: number;
  };
  circuitBreakerConfig: {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
  };
  retryConfig: RetryConfig;
}

export type DataPriority = 'realtime' | 'near-realtime' | 'historical' | 'static';

export interface CacheStrategy {
  type: DataType;
  priority: DataPriority;
  ttl: number;
  maxSize: number;
  warmOnStart: boolean;
  invalidationRules: string[];
}