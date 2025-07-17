import { performanceOptimizer } from './performance-optimizer';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for performance monitoring
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface PerformanceAlert {
  id: string;
  type: 'slow_query' | 'high_memory' | 'connection_pool_exhausted' | 'cache_miss_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metrics: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export interface SystemHealthMetrics {
  timestamp: Date;
  database: {
    connectionPool: any;
    queryPerformance: any;
    cacheEfficiency: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    usage: number;
  };
  network: {
    requestsPerSecond: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

/**
 * Performance Monitor Service
 * 
 * Comprehensive monitoring of system performance including:
 * - Real-time performance metrics collection
 * - Automated alerting for performance issues
 * - Health check endpoints
 * - Performance trend analysis
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private performanceOptimizer: any;
  private alerts: PerformanceAlert[] = [];
  private healthMetrics: SystemHealthMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds: {
    slowQueryThreshold: number;
    cacheHitRateThreshold: number;
    memoryUsageThreshold: number;
    connectionPoolThreshold: number;
  };

  private constructor() {
    this.alertThresholds = {
      slowQueryThreshold: 1000, // 1 second
      cacheHitRateThreshold: 70, // 70%
      memoryUsageThreshold: 85, // 85%
      connectionPoolThreshold: 80 // 80%
    };

    this.startMonitoring();
    console.log('📊 [PerformanceMonitor] Initialized with real-time monitoring');
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  private startMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
    }, 30000);

    console.log('🔄 [PerformanceMonitor] Started monitoring (30s intervals)');
  }

  /**
   * Collect comprehensive system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Get performance stats from optimizer if available
      let dbStats = null;
      try {
        if (this.performanceOptimizer) {
          dbStats = this.performanceOptimizer.getPerformanceStats();
        }
      } catch (error) {
        console.warn('⚠️ [PerformanceMonitor] Could not get DB stats:', error.message);
      }

      const metrics: SystemHealthMetrics = {
        timestamp: new Date(),
        database: {
          connectionPool: dbStats?.connectionPool || null,
          queryPerformance: dbStats?.queries || null,
          cacheEfficiency: dbStats?.cache?.hitRate || 0
        },
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to milliseconds
        },
        network: {
          requestsPerSecond: 0, // Would need request tracking
          avgResponseTime: dbStats?.queries?.avgExecutionTime || 0,
          errorRate: 0 // Would need error tracking
        }
      };

      this.healthMetrics.push(metrics);

      // Keep only last 1000 metrics (about 8 hours at 30s intervals)
      if (this.healthMetrics.length > 1000) {
        this.healthMetrics = this.healthMetrics.slice(-1000);
      }

    } catch (error) {
      console.error('❌ [PerformanceMonitor] Error collecting metrics:', error);
    }
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    if (this.healthMetrics.length === 0) return;

    const latestMetrics = this.healthMetrics[this.healthMetrics.length - 1];

    // Check cache hit rate
    if (latestMetrics.database.cacheEfficiency < this.alertThresholds.cacheHitRateThreshold) {
      this.createAlert({
        type: 'cache_miss_rate',
        severity: latestMetrics.database.cacheEfficiency < 50 ? 'high' : 'medium',
        title: 'Low Cache Hit Rate',
        message: `Cache hit rate is ${latestMetrics.database.cacheEfficiency.toFixed(1)}%, below threshold of ${this.alertThresholds.cacheHitRateThreshold}%`,
        metrics: { cacheHitRate: latestMetrics.database.cacheEfficiency }
      });
    }

    // Check memory usage
    const memoryUsagePercent = (latestMetrics.memory.heapUsed / latestMetrics.memory.heapTotal) * 100;
    if (memoryUsagePercent > this.alertThresholds.memoryUsageThreshold) {
      this.createAlert({
        type: 'high_memory',
        severity: memoryUsagePercent > 95 ? 'critical' : 'high',
        title: 'High Memory Usage',
        message: `Memory usage is ${memoryUsagePercent.toFixed(1)}%, above threshold of ${this.alertThresholds.memoryUsageThreshold}%`,
        metrics: { memoryUsagePercent, heapUsed: latestMetrics.memory.heapUsed, heapTotal: latestMetrics.memory.heapTotal }
      });
    }

    // Check slow queries
    if (latestMetrics.database.queryPerformance?.avgExecutionTime > this.alertThresholds.slowQueryThreshold) {
      this.createAlert({
        type: 'slow_query',
        severity: latestMetrics.database.queryPerformance.avgExecutionTime > 2000 ? 'high' : 'medium',
        title: 'Slow Query Performance',
        message: `Average query time is ${latestMetrics.database.queryPerformance.avgExecutionTime}ms, above threshold of ${this.alertThresholds.slowQueryThreshold}ms`,
        metrics: { avgExecutionTime: latestMetrics.database.queryPerformance.avgExecutionTime }
      });
    }

    // Check connection pool usage
    if (latestMetrics.database.connectionPool) {
      const poolUsagePercent = (latestMetrics.database.connectionPool.activeConnections / latestMetrics.database.connectionPool.poolSize) * 100;
      if (poolUsagePercent > this.alertThresholds.connectionPoolThreshold) {
        this.createAlert({
          type: 'connection_pool_exhausted',
          severity: poolUsagePercent > 95 ? 'critical' : 'high',
          title: 'High Connection Pool Usage',
          message: `Connection pool usage is ${poolUsagePercent.toFixed(1)}%, above threshold of ${this.alertThresholds.connectionPoolThreshold}%`,
          metrics: { poolUsagePercent, activeConnections: latestMetrics.database.connectionPool.activeConnections }
        });
      }
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert => 
      alert.type === alertData.type && 
      !alert.resolved &&
      (Date.now() - alert.timestamp.getTime()) < 300000 // 5 minutes
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...alertData,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    console.warn(`🚨 [PerformanceMonitor] ${alert.severity.toUpperCase()} ALERT: ${alert.title} - ${alert.message}`);

    // Auto-resolve alerts after 15 minutes
    setTimeout(() => {
      const alertToResolve = this.alerts.find(a => a.id === alert.id);
      if (alertToResolve) {
        alertToResolve.resolved = true;
      }
    }, 900000); // 15 minutes
  }

  /**
   * Get current system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: SystemHealthMetrics | null;
    activeAlerts: PerformanceAlert[];
    summary: {
      totalAlerts: number;
      criticalAlerts: number;
      uptime: number;
      memoryUsage: number;
      cacheHitRate: number;
    };
  } {
    const latestMetrics = this.healthMetrics.length > 0 ? this.healthMetrics[this.healthMetrics.length - 1] : null;
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (activeAlerts.length > 0) {
      status = 'warning';
    }

    const memoryUsage = latestMetrics 
      ? (latestMetrics.memory.heapUsed / latestMetrics.memory.heapTotal) * 100 
      : 0;

    return {
      status,
      metrics: latestMetrics,
      activeAlerts,
      summary: {
        totalAlerts: this.alerts.length,
        criticalAlerts: criticalAlerts.length,
        uptime: process.uptime(),
        memoryUsage,
        cacheHitRate: latestMetrics?.database.cacheEfficiency || 0
      }
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(hours: number = 24): {
    timeRange: { start: Date; end: Date };
    trends: {
      memoryUsage: Array<{ timestamp: Date; value: number }>;
      queryPerformance: Array<{ timestamp: Date; value: number }>;
      cacheHitRate: Array<{ timestamp: Date; value: number }>;
    };
    summary: {
      avgMemoryUsage: number;
      avgQueryTime: number;
      avgCacheHitRate: number;
      peakMemoryUsage: number;
      slowestQuery: number;
    };
  } {
    const now = new Date();
    const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    const relevantMetrics = this.healthMetrics.filter(
      metric => metric.timestamp >= startTime
    );

    const memoryUsage = relevantMetrics.map(metric => ({
      timestamp: metric.timestamp,
      value: (metric.memory.heapUsed / metric.memory.heapTotal) * 100
    }));

    const queryPerformance = relevantMetrics.map(metric => ({
      timestamp: metric.timestamp,
      value: metric.database.queryPerformance?.avgExecutionTime || 0
    }));

    const cacheHitRate = relevantMetrics.map(metric => ({
      timestamp: metric.timestamp,
      value: metric.database.cacheEfficiency
    }));

    // Calculate summary statistics
    const avgMemoryUsage = memoryUsage.reduce((sum, item) => sum + item.value, 0) / memoryUsage.length || 0;
    const avgQueryTime = queryPerformance.reduce((sum, item) => sum + item.value, 0) / queryPerformance.length || 0;
    const avgCacheHitRate = cacheHitRate.reduce((sum, item) => sum + item.value, 0) / cacheHitRate.length || 0;
    const peakMemoryUsage = Math.max(...memoryUsage.map(item => item.value), 0);
    const slowestQuery = Math.max(...queryPerformance.map(item => item.value), 0);

    return {
      timeRange: { start: startTime, end: now },
      trends: {
        memoryUsage,
        queryPerformance,
        cacheHitRate
      },
      summary: {
        avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
        avgQueryTime: Math.round(avgQueryTime * 100) / 100,
        avgCacheHitRate: Math.round(avgCacheHitRate * 100) / 100,
        peakMemoryUsage: Math.round(peakMemoryUsage * 100) / 100,
        slowestQuery: Math.round(slowestQuery * 100) / 100
      }
    };
  }

  /**
   * Optimize system performance
   */
  async optimizePerformance(): Promise<{
    actions: string[];
    results: any;
  }> {
    const actions: string[] = [];
    const results: any = {};

    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        actions.push('Forced garbage collection');
      }

      // Clear performance optimizer cache if hit rate is low
      if (this.performanceOptimizer) {
        const stats = this.performanceOptimizer.getPerformanceStats();
        if (stats.cache.hitRate < 50) {
          this.performanceOptimizer.invalidateCache();
          actions.push('Cleared low-efficiency cache');
          results.cacheCleared = true;
        }
      }

      // Analyze query performance and suggest optimizations
      if (this.performanceOptimizer) {
        const analysis = this.performanceOptimizer.analyzeQueryPerformance();
        if (analysis.recommendations.length > 0) {
          actions.push(...analysis.recommendations);
          results.queryAnalysis = analysis;
        }
      }

      console.log(`🔧 [PerformanceMonitor] Optimization completed: ${actions.length} actions taken`);

    } catch (error) {
      console.error('❌ [PerformanceMonitor] Optimization failed:', error);
      actions.push(`Optimization error: ${error.message}`);
    }

    return { actions, results };
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    metrics: SystemHealthMetrics[];
    alerts: PerformanceAlert[];
    summary: any;
    exportedAt: Date;
  } {
    return {
      metrics: this.healthMetrics,
      alerts: this.alerts,
      summary: this.getHealthStatus().summary,
      exportedAt: new Date()
    };
  }

  /**
   * Set performance optimizer instance
   */
  setPerformanceOptimizer(optimizer: any): void {
    this.performanceOptimizer = optimizer;
    console.log('🔗 [PerformanceMonitor] Connected to performance optimizer');
  }

  /**
   * Shutdown monitoring
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🛑 [PerformanceMonitor] Monitoring stopped');
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();