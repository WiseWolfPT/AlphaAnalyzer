import { Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  coldStart: boolean;
  cacheHit: boolean;
  provider?: string;
  error?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRate: number;
  cacheHitRate: number;
  coldStarts: number;
  uptimeMinutes: number;
  endpointStats: Record<string, EndpointStats>;
}

export interface EndpointStats {
  count: number;
  avgDuration: number;
  errors: number;
  cacheHits: number;
  p95Duration: number;
  p99Duration: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: RequestMetrics[] = [];
  private maxMetrics = 10000; // Keep last 10k requests
  private serverStartTime = Date.now();
  private firstRequestHandled = false;
  private coalescedRequests = new Map<string, number>();
  
  // Thresholds
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private readonly CRITICAL_THRESHOLD = 3000; // 3 seconds
  
  private constructor() {
    logger.info('📊 Performance Monitor initialized');
    
    // Publish metrics every minute
    setInterval(() => {
      this.publishMetrics();
    }, 60 * 1000);
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Express middleware for monitoring requests
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Detect cold start
      const isColdStart = !this.firstRequestHandled;
      if (!this.firstRequestHandled) {
        this.firstRequestHandled = true;
        logger.warn(`🥶 Cold start detected! First request after ${process.uptime().toFixed(2)}s`);
      }
      
      // Track response
      const trackResponse = () => {
        const duration = Date.now() - start;
        const cacheHit = res.getHeader('X-Cache-Hit') === 'true';
        const provider = res.getHeader('X-Cache-Provider') as string;
        
        const metric: RequestMetrics = {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date(),
          coldStart: isColdStart,
          cacheHit,
          provider
        };
        
        // Add error if present
        if (res.statusCode >= 400) {
          metric.error = `HTTP ${res.statusCode}`;
        }
        
        this.recordMetric(metric);
      };
      
      // Override send
      res.send = function(data) {
        trackResponse();
        return originalSend.call(this, data);
      };
      
      // Override json
      res.json = function(data) {
        trackResponse();
        return originalJson.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: RequestMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    // Log slow requests
    if (metric.duration > this.CRITICAL_THRESHOLD) {
      logger.error(`🐌 CRITICAL: ${metric.method} ${metric.path} took ${metric.duration}ms${metric.coldStart ? ' (cold start)' : ''}`);
      this.alertSlowRequest(metric);
    } else if (metric.duration > this.SLOW_REQUEST_THRESHOLD) {
      logger.warn(`⚠️  Slow request: ${metric.method} ${metric.path} took ${metric.duration}ms${metric.coldStart ? ' (cold start)' : ''}`);
    }
    
    // Log errors
    if (metric.error) {
      logger.error(`❌ Request error: ${metric.method} ${metric.path} - ${metric.error}`);
    }
  }

  /**
   * Track coalesced request
   */
  trackCoalescedRequest(key: string): void {
    const count = this.coalescedRequests.get(key) || 0;
    this.coalescedRequests.set(key, count + 1);
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    const totalRequests = this.metrics.length;
    if (totalRequests === 0) {
      return this.getEmptyStats();
    }
    
    // Calculate overall stats
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = totalDuration / totalRequests;
    const slowRequests = this.metrics.filter(m => m.duration > this.SLOW_REQUEST_THRESHOLD).length;
    const errors = this.metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errors / totalRequests) * 100;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalRequests) * 100;
    const coldStarts = this.metrics.filter(m => m.coldStart).length;
    const uptimeMinutes = Math.round((Date.now() - this.serverStartTime) / 60000);
    
    // Calculate endpoint stats
    const endpointStats: Record<string, EndpointStats> = {};
    const endpointMetrics = new Map<string, RequestMetrics[]>();
    
    // Group metrics by endpoint
    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.path}`;
      if (!endpointMetrics.has(key)) {
        endpointMetrics.set(key, []);
      }
      endpointMetrics.get(key)!.push(metric);
    });
    
    // Calculate stats for each endpoint
    endpointMetrics.forEach((metrics, endpoint) => {
      const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
      const count = metrics.length;
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / count;
      const errors = metrics.filter(m => m.statusCode >= 400).length;
      const cacheHits = metrics.filter(m => m.cacheHit).length;
      const p95Index = Math.floor(count * 0.95);
      const p99Index = Math.floor(count * 0.99);
      
      endpointStats[endpoint] = {
        count,
        avgDuration: Math.round(avgDuration),
        errors,
        cacheHits,
        p95Duration: durations[p95Index] || avgDuration,
        p99Duration: durations[p99Index] || avgDuration
      };
    });
    
    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      coldStarts,
      uptimeMinutes,
      endpointStats
    };
  }

  /**
   * Get empty stats
   */
  private getEmptyStats(): PerformanceStats {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      cacheHitRate: 0,
      coldStarts: 0,
      uptimeMinutes: Math.round((Date.now() - this.serverStartTime) / 60000),
      endpointStats: {}
    };
  }

  /**
   * Publish metrics to Supabase
   */
  private async publishMetrics(): Promise<void> {
    try {
      const stats = this.getStats();
      
      // Publish to Realtime
      await supabase
        .from('realtime_metrics')
        .insert({
          type: 'performance_stats',
          data: stats,
          timestamp: new Date().toISOString()
        });
      
      // Store historical data
      await supabase
        .from('performance_snapshots')
        .insert({
          ...stats,
          coalesced_requests: Object.fromEntries(this.coalescedRequests),
          timestamp: new Date().toISOString()
        });
      
      // Clear coalesced requests counter
      this.coalescedRequests.clear();
      
      logger.info(`📊 Published performance metrics: ${stats.totalRequests} requests, ${stats.averageResponseTime}ms avg, ${stats.cacheHitRate}% cache hit rate`);
      
    } catch (error) {
      logger.error('Failed to publish performance metrics:', error);
    }
  }

  /**
   * Alert for slow requests
   */
  private async alertSlowRequest(metric: RequestMetrics): Promise<void> {
    try {
      await supabase
        .from('performance_alerts')
        .insert({
          type: 'slow_request',
          severity: metric.duration > this.CRITICAL_THRESHOLD ? 'critical' : 'warning',
          data: {
            path: metric.path,
            method: metric.method,
            duration: metric.duration,
            coldStart: metric.coldStart,
            timestamp: metric.timestamp
          },
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to send slow request alert:', error);
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): any {
    const stats = this.getStats();
    const memoryUsage = process.memoryUsage();
    const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    const status = {
      healthy: true,
      uptime: `${stats.uptimeMinutes} minutes`,
      memory: `${memoryMB} MB`,
      performance: {
        avgResponseTime: `${stats.averageResponseTime}ms`,
        slowRequests: stats.slowRequests,
        errorRate: `${stats.errorRate}%`,
        cacheHitRate: `${stats.cacheHitRate}%`,
        coldStarts: stats.coldStarts
      },
      timestamp: new Date().toISOString()
    };
    
    // Mark as unhealthy if certain thresholds are exceeded
    if (stats.errorRate > 10 || stats.averageResponseTime > 2000 || memoryMB > 400) {
      status.healthy = false;
    }
    
    return status;
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics = [];
    this.firstRequestHandled = false;
    this.coalescedRequests.clear();
    logger.info('Performance metrics reset');
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();