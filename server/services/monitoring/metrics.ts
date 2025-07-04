interface MetricValue {
  count: number;
  lastUpdated: number;
}

interface LatencyMetric {
  count: number;
  total: number;
  min: number;
  max: number;
  avg: number;
}

class MetricsCollector {
  private counters: Map<string, MetricValue> = new Map();
  private latencies: Map<string, LatencyMetric> = new Map();
  private errors: Map<string, MetricValue> = new Map();
  
  // Increment a counter metric
  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || { count: 0, lastUpdated: 0 };
    this.counters.set(name, {
      count: current.count + value,
      lastUpdated: Date.now()
    });
  }

  // Record a latency measurement
  recordLatency(name: string, milliseconds: number): void {
    const current = this.latencies.get(name) || {
      count: 0,
      total: 0,
      min: Infinity,
      max: -Infinity,
      avg: 0
    };

    const newCount = current.count + 1;
    const newTotal = current.total + milliseconds;
    
    this.latencies.set(name, {
      count: newCount,
      total: newTotal,
      min: Math.min(current.min, milliseconds),
      max: Math.max(current.max, milliseconds),
      avg: newTotal / newCount
    });
  }

  // Record an error
  recordError(name: string, error?: any): void {
    const errorKey = `${name}_${error?.code || 'unknown'}`;
    const current = this.errors.get(errorKey) || { count: 0, lastUpdated: 0 };
    
    this.errors.set(errorKey, {
      count: current.count + 1,
      lastUpdated: Date.now()
    });
  }

  // Get all metrics
  getMetrics() {
    const counters: Record<string, MetricValue> = {};
    const latencies: Record<string, LatencyMetric> = {};
    const errors: Record<string, MetricValue> = {};

    this.counters.forEach((value, key) => {
      counters[key] = value;
    });

    this.latencies.forEach((value, key) => {
      latencies[key] = value;
    });

    this.errors.forEach((value, key) => {
      errors[key] = value;
    });

    return {
      counters,
      latencies,
      errors,
      timestamp: Date.now()
    };
  }

  // Reset all metrics
  reset(): void {
    this.counters.clear();
    this.latencies.clear();
    this.errors.clear();
  }

  // Get metrics for a specific time window
  getMetricsSince(sinceTimestamp: number) {
    const counters: Record<string, MetricValue> = {};
    const errors: Record<string, MetricValue> = {};

    this.counters.forEach((value, key) => {
      if (value.lastUpdated >= sinceTimestamp) {
        counters[key] = value;
      }
    });

    this.errors.forEach((value, key) => {
      if (value.lastUpdated >= sinceTimestamp) {
        errors[key] = value;
      }
    });

    return {
      counters,
      latencies: this.latencies,
      errors,
      since: sinceTimestamp,
      timestamp: Date.now()
    };
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Metric names constants
export const METRIC_NAMES = {
  // API calls
  API_CALL_TOTAL: 'api_calls_total',
  API_CALL_CACHE_HIT: 'api_calls_cache_hit',
  API_CALL_CACHE_MISS: 'api_calls_cache_miss',
  
  // By provider
  API_CALL_FINNHUB: 'api_calls_finnhub',
  API_CALL_TWELVE_DATA: 'api_calls_twelve_data',
  API_CALL_FMP: 'api_calls_fmp',
  API_CALL_ALPHA_VANTAGE: 'api_calls_alpha_vantage',
  
  // By endpoint
  ENDPOINT_PRICE: 'endpoint_price',
  ENDPOINT_FUNDAMENTALS: 'endpoint_fundamentals',
  ENDPOINT_HISTORICAL: 'endpoint_historical',
  ENDPOINT_COMPANY: 'endpoint_company',
  ENDPOINT_NEWS: 'endpoint_news',
  ENDPOINT_BATCH: 'endpoint_batch',
  
  // Latency
  LATENCY_API_FINNHUB: 'latency_api_finnhub',
  LATENCY_API_TWELVE_DATA: 'latency_api_twelve_data',
  LATENCY_API_FMP: 'latency_api_fmp',
  LATENCY_API_ALPHA_VANTAGE: 'latency_api_alpha_vantage',
  LATENCY_CACHE: 'latency_cache',
  LATENCY_TOTAL: 'latency_total',
  
  // Errors
  ERROR_API: 'error_api',
  ERROR_CACHE: 'error_cache',
  ERROR_RATE_LIMIT: 'error_rate_limit',
  ERROR_QUOTA: 'error_quota',
  ERROR_VALIDATION: 'error_validation'
} as const;

// Helper to create a timer for measuring latency
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

// Express middleware for automatic endpoint metrics
import { Request, Response, NextFunction } from 'express';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const timer = startTimer();
  const endpoint = `${req.method}_${req.route?.path || req.path}`;
  
  // Increment request counter
  metrics.incrementCounter(METRIC_NAMES.API_CALL_TOTAL);
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    // Record latency
    const latency = timer();
    metrics.recordLatency(METRIC_NAMES.LATENCY_TOTAL, latency);
    metrics.recordLatency(`latency_${endpoint}`, latency);
    
    // Record status-based metrics
    if (res.statusCode >= 500) {
      metrics.recordError(METRIC_NAMES.ERROR_API, { code: res.statusCode });
    } else if (res.statusCode === 429) {
      metrics.recordError(METRIC_NAMES.ERROR_RATE_LIMIT);
    }
    
    // Call original end
    return originalEnd.apply(res, args);
  };
  
  next();
}

// Format metrics for Prometheus-style output
export function formatMetricsForPrometheus(): string {
  const data = metrics.getMetrics();
  let output = '';
  
  // Format counters
  Object.entries(data.counters).forEach(([name, value]) => {
    output += `# TYPE ${name} counter\n`;
    output += `${name} ${value.count}\n`;
  });
  
  // Format latencies
  Object.entries(data.latencies).forEach(([name, value]) => {
    output += `# TYPE ${name}_count counter\n`;
    output += `${name}_count ${value.count}\n`;
    output += `# TYPE ${name}_sum gauge\n`;
    output += `${name}_sum ${value.total}\n`;
    output += `# TYPE ${name}_avg gauge\n`;
    output += `${name}_avg ${value.avg.toFixed(2)}\n`;
    output += `# TYPE ${name}_min gauge\n`;
    output += `${name}_min ${value.min}\n`;
    output += `# TYPE ${name}_max gauge\n`;
    output += `${name}_max ${value.max}\n`;
  });
  
  // Format errors
  Object.entries(data.errors).forEach(([name, value]) => {
    output += `# TYPE ${name} counter\n`;
    output += `${name} ${value.count}\n`;
  });
  
  return output;
}