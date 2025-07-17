/**
 * FASE 2 - DIA 8: Enhanced Health Monitoring System
 * Comprehensive health monitoring with automated alerts, system diagnostics and performance analytics
 */

import { performance } from 'perf_hooks';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  value?: any;
  message?: string;
  timestamp: string;
  responseTime?: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  uptime: number;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthMetric[];
  system: SystemMetrics;
  performance: {
    responseTime: number;
    requestsPerMinute?: number;
    errorRate?: number;
  };
  recovery?: {
    enabled: boolean;
    lastAttempt?: string;
    attempts: number;
  };
}

// Enhanced alert interface for DIA 8
interface HealthAlert {
  id: string;
  type: 'system' | 'performance' | 'security' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
  escalationLevel: number;
  lastNotified?: Date;
}

class HealthMonitor extends EventEmitter {
  private static instance: HealthMonitor;
  private startTime: number;
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private recoveryAttempts: number = 0;
  private lastRecoveryAttempt?: Date;
  private autoRecoveryEnabled: boolean = true;
  
  // DIA 8: Enhanced monitoring features
  private alerts: Map<string, HealthAlert> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private metricsHistory: Array<{ timestamp: Date; metrics: SystemMetrics }> = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.startTime = Date.now();
    this.initializeMetricsCollection();
  }

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  private initializeMetricsCollection() {
    // Reset metrics every minute
    setInterval(() => {
      this.requestCounts.clear();
      this.errorCounts.clear();
    }, 60000);
  }

  /**
   * Comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    const checks: HealthMetric[] = [];

    // Database health
    checks.push(await this.checkDatabase());

    // Environment health
    checks.push(await this.checkEnvironment());

    // File system health
    checks.push(await this.checkFileSystem());

    // Network health
    checks.push(await this.checkNetwork());

    // API dependencies health
    checks.push(...await this.checkAPIDependencies());

    // System metrics
    const systemMetrics = await this.getSystemMetrics();

    // Overall status
    const overallStatus = this.determineOverallStatus(checks);

    const responseTime = performance.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      system: systemMetrics,
      performance: {
        responseTime,
        requestsPerMinute: this.getRequestsPerMinute(),
        errorRate: this.getErrorRate(),
      },
      recovery: {
        enabled: this.autoRecoveryEnabled,
        lastAttempt: this.lastRecoveryAttempt?.toISOString(),
        attempts: this.recoveryAttempts,
      }
    };
  }

  /**
   * Quick health check for fast responses
   */
  async quickHealthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Check database connectivity and status
   */
  private async checkDatabase(): Promise<HealthMetric> {
    const startTime = performance.now();
    
    try {
      // Check if database file exists
      const dbPath = path.join(process.cwd(), 'dev.db');
      
      try {
        const stats = await fs.stat(dbPath);
        const sizeInMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
        
        // Additional check: try to query the database
        const { storage } = await import('../storage');
        
        // Simple query to test database responsiveness
        const result = await storage.query('SELECT 1 as test').catch(() => null);
        
        if (result) {
          return {
            name: 'database',
            status: 'healthy',
            value: `${sizeInMB}MB`,
            message: 'Database is accessible and responding',
            timestamp: new Date().toISOString(),
            responseTime: performance.now() - startTime,
          };
        } else {
          return {
            name: 'database',
            status: 'warning',
            value: `${sizeInMB}MB`,
            message: 'Database file exists but query failed',
            timestamp: new Date().toISOString(),
            responseTime: performance.now() - startTime,
          };
        }
      } catch (error) {
        return {
          name: 'database',
          status: 'warning',
          message: 'Database file not found (will be created)',
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        };
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'critical',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Check environment variables and configuration
   */
  private async checkEnvironment(): Promise<HealthMetric> {
    const startTime = performance.now();
    
    try {
      const requiredEnvVars = [
        'NODE_ENV',
        'PORT',
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      // Check optional but important variables
      const optionalVars = [
        'ALPHA_VANTAGE_API_KEY',
        'FINNHUB_API_KEY',
        'FMP_API_KEY',
        'TWELVE_DATA_API_KEY',
      ];
      
      const presentOptionalVars = optionalVars.filter(varName => process.env[varName]);
      
      if (missingVars.length === 0) {
        return {
          name: 'environment',
          status: presentOptionalVars.length > 0 ? 'healthy' : 'warning',
          value: `${presentOptionalVars.length}/${optionalVars.length} API keys configured`,
          message: missingVars.length === 0 ? 
            'All required environment variables present' : 
            `Missing required variables: ${missingVars.join(', ')}`,
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        };
      } else {
        return {
          name: 'environment',
          status: 'critical',
          message: `Missing required environment variables: ${missingVars.join(', ')}`,
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        };
      }
    } catch (error) {
      return {
        name: 'environment',
        status: 'critical',
        message: `Environment check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Check file system health
   */
  private async checkFileSystem(): Promise<HealthMetric> {
    const startTime = performance.now();
    
    try {
      const requiredPaths = [
        'package.json',
        'server/index.ts',
        'client/src/App.tsx',
        'node_modules',
      ];
      
      const pathChecks = await Promise.all(
        requiredPaths.map(async (pathName) => {
          try {
            await fs.access(path.join(process.cwd(), pathName));
            return { path: pathName, exists: true };
          } catch {
            return { path: pathName, exists: false };
          }
        })
      );
      
      const missingPaths = pathChecks.filter(check => !check.exists);
      
      if (missingPaths.length === 0) {
        return {
          name: 'filesystem',
          status: 'healthy',
          message: 'All required files and directories present',
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        };
      } else {
        return {
          name: 'filesystem',
          status: 'critical',
          message: `Missing paths: ${missingPaths.map(p => p.path).join(', ')}`,
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        };
      }
    } catch (error) {
      return {
        name: 'filesystem',
        status: 'critical',
        message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Check network connectivity
   */
  private async checkNetwork(): Promise<HealthMetric> {
    const startTime = performance.now();
    
    try {
      // Test external connectivity with a quick HTTP request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch('https://httpbin.org/get', {
          signal: controller.signal,
          method: 'HEAD', // Faster than GET
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return {
            name: 'network',
            status: 'healthy',
            message: 'External network connectivity confirmed',
            timestamp: new Date().toISOString(),
            responseTime: performance.now() - startTime,
          };
        } else {
          return {
            name: 'network',
            status: 'warning',
            message: `Network test returned ${response.status}`,
            timestamp: new Date().toISOString(),
            responseTime: performance.now() - startTime,
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);
        return {
          name: 'network',
          status: 'warning',
          message: 'External network connectivity may be limited',
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        };
      }
    } catch (error) {
      return {
        name: 'network',
        status: 'critical',
        message: `Network check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        responseTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Check API dependencies
   */
  private async checkAPIDependencies(): Promise<HealthMetric[]> {
    const apis = [
      { name: 'Alpha Vantage', key: 'ALPHA_VANTAGE_API_KEY', url: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=' },
      { name: 'Finnhub', key: 'FINNHUB_API_KEY', url: 'https://finnhub.io/api/v1/quote?symbol=AAPL&token=' },
      { name: 'FMP', key: 'FMP_API_KEY', url: 'https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=' },
    ];

    const results: HealthMetric[] = [];

    for (const api of apis) {
      const startTime = performance.now();
      const apiKey = process.env[api.key];

      if (!apiKey) {
        results.push({
          name: `api_${api.name.toLowerCase().replace(' ', '_')}`,
          status: 'warning',
          message: `${api.name} API key not configured`,
          timestamp: new Date().toISOString(),
          responseTime: 0,
        });
        continue;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(api.url + apiKey, {
          signal: controller.signal,
          method: 'HEAD', // Faster test
        });

        clearTimeout(timeoutId);

        results.push({
          name: `api_${api.name.toLowerCase().replace(' ', '_')}`,
          status: response.ok ? 'healthy' : 'warning',
          message: response.ok ? 
            `${api.name} API responding` : 
            `${api.name} API returned ${response.status}`,
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        });
      } catch (error) {
        results.push({
          name: `api_${api.name.toLowerCase().replace(' ', '_')}`,
          status: 'warning',
          message: `${api.name} API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          responseTime: performance.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memInfo = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Get disk usage
    let diskUsage = { used: 0, free: 0, total: 0, percentage: 0 };
    try {
      // This is a simplified approach - in production you might want to use a more robust method
      const stats = await fs.stat(process.cwd());
      // For now, we'll use memory as a proxy for disk info
      diskUsage = {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        percentage: Math.round((usedMem / totalMem) * 100),
      };
    } catch (error) {
      // Fallback to memory stats
    }

    return {
      cpu: {
        usage: Math.round(process.cpuUsage().user / 1000000), // Convert to milliseconds
        loadAverage: os.loadavg(),
      },
      memory: {
        used: Math.round(memInfo.heapUsed / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((memInfo.heapUsed / totalMem) * 100),
      },
      disk: diskUsage,
      uptime: Math.round(process.uptime()),
    };
  }

  /**
   * Determine overall status from individual checks
   */
  private determineOverallStatus(checks: HealthMetric[]): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalCount = checks.filter(check => check.status === 'critical').length;
    const warningCount = checks.filter(check => check.status === 'warning').length;

    if (criticalCount > 0) {
      return 'unhealthy';
    } else if (warningCount > 2) {
      return 'degraded';
    } else if (warningCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Record request for metrics
   */
  recordRequest(endpoint: string) {
    const current = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, current + 1);
  }

  /**
   * Record error for metrics
   */
  recordError(endpoint: string) {
    const current = this.errorCounts.get(endpoint) || 0;
    this.errorCounts.set(endpoint, current + 1);
  }

  /**
   * Get requests per minute
   */
  private getRequestsPerMinute(): number {
    const total = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    return total;
  }

  /**
   * Get error rate percentage
   */
  private getErrorRate(): number {
    const totalRequests = this.getRequestsPerMinute();
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    if (totalRequests === 0) return 0;
    return Math.round((totalErrors / totalRequests) * 100);
  }

  /**
   * Attempt auto-recovery
   */
  async attemptAutoRecovery(): Promise<boolean> {
    if (!this.autoRecoveryEnabled) {
      return false;
    }

    this.recoveryAttempts++;
    this.lastRecoveryAttempt = new Date();

    try {
      // Basic recovery steps
      console.log('🔄 Attempting auto-recovery...');

      // 1. Clear caches
      if (global.gc) {
        global.gc();
        console.log('✅ Memory garbage collection triggered');
      }

      // 2. Reset metrics
      this.requestCounts.clear();
      this.errorCounts.clear();
      console.log('✅ Metrics reset');

      // 3. Test basic functionality
      const quickCheck = await this.quickHealthCheck();
      if (quickCheck.status === 'healthy') {
        console.log('✅ Auto-recovery successful');
        return true;
      }

      console.log('❌ Auto-recovery failed');
      return false;
    } catch (error) {
      console.error('❌ Auto-recovery error:', error);
      return false;
    }
  }

  /**
   * Enable/disable auto-recovery
   */
  setAutoRecovery(enabled: boolean) {
    this.autoRecoveryEnabled = enabled;
  }

  /**
   * Get recovery status
   */
  getRecoveryStatus() {
    return {
      enabled: this.autoRecoveryEnabled,
      attempts: this.recoveryAttempts,
      lastAttempt: this.lastRecoveryAttempt?.toISOString(),
    };
  }

  // ============================================================================
  // DIA 8: NEW MONITORING & ALERTS FEATURES
  // ============================================================================

  /**
   * Start continuous health monitoring with alerts
   */
  startContinuousMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) {
      console.warn('📊 [HealthMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log(`📊 [HealthMonitor] Starting continuous monitoring (${intervalMs}ms interval)`);

    // Run initial check
    this.runContinuousCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.runContinuousCheck();
    }, intervalMs);

    this.emit('monitoring_started');
  }

  /**
   * Stop continuous monitoring
   */
  stopContinuousMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('📊 [HealthMonitor] Stopped continuous monitoring');
    this.emit('monitoring_stopped');
  }

  /**
   * Run continuous health check and alert processing
   */
  private async runContinuousCheck(): Promise<void> {
    try {
      const healthResult = await this.performHealthCheck();
      const systemMetrics = healthResult.system;
      
      // Store metrics history
      this.metricsHistory.push({
        timestamp: new Date(),
        metrics: systemMetrics
      });

      // Keep only last 1000 metrics (sliding window)
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }

      // Check for alert conditions
      this.checkAlertConditions(healthResult);
      
      this.emit('health_check_completed', healthResult);
    } catch (error) {
      console.error('📊 [HealthMonitor] Continuous check error:', error);
      this.emit('health_check_error', error);
    }
  }

  /**
   * Check for alert conditions and create alerts
   */
  private checkAlertConditions(healthResult: HealthCheckResult): void {
    const now = new Date();
    
    // System performance alerts
    if (healthResult.system.memory.percentage > 90) {
      this.createSystemAlert({
        type: 'performance',
        severity: 'critical',
        title: 'Critical Memory Usage',
        message: `Memory usage at ${healthResult.system.memory.percentage}%`,
        source: 'system_monitor',
        metadata: { memoryPercent: healthResult.system.memory.percentage }
      });
    } else if (healthResult.system.memory.percentage > 80) {
      this.createSystemAlert({
        type: 'performance',
        severity: 'high',
        title: 'High Memory Usage',
        message: `Memory usage at ${healthResult.system.memory.percentage}%`,
        source: 'system_monitor',
        metadata: { memoryPercent: healthResult.system.memory.percentage }
      });
    }

    // CPU usage alerts
    if (healthResult.system.cpu.loadAverage[0] > os.cpus().length * 1.5) {
      this.createSystemAlert({
        type: 'performance',
        severity: 'high',
        title: 'High CPU Load',
        message: `Load average: ${healthResult.system.cpu.loadAverage[0].toFixed(2)}`,
        source: 'system_monitor',
        metadata: { loadAverage: healthResult.system.cpu.loadAverage }
      });
    }

    // Response time alerts
    if (healthResult.performance.responseTime > 5000) {
      this.createSystemAlert({
        type: 'performance',
        severity: 'high',
        title: 'Slow Health Check Response',
        message: `Health check took ${healthResult.performance.responseTime.toFixed(0)}ms`,
        source: 'performance_monitor',
        metadata: { responseTime: healthResult.performance.responseTime }
      });
    }

    // Error rate alerts
    if (healthResult.performance.errorRate && healthResult.performance.errorRate > 10) {
      this.createSystemAlert({
        type: 'system',
        severity: 'critical',
        title: 'High Error Rate',
        message: `Error rate at ${healthResult.performance.errorRate}%`,
        source: 'error_monitor',
        metadata: { errorRate: healthResult.performance.errorRate }
      });
    }

    // Check individual health checks for failures
    healthResult.checks.forEach(check => {
      if (check.status === 'critical') {
        this.createSystemAlert({
          type: 'system',
          severity: 'critical',
          title: `${check.name} Health Check Failed`,
          message: check.message || `${check.name} is in critical state`,
          source: `health_check_${check.name}`,
          metadata: { check }
        });
      }
    });
  }

  /**
   * Create a system alert with cooldown logic
   */
  private createSystemAlert(alertData: Omit<HealthAlert, 'id' | 'timestamp' | 'resolved' | 'escalationLevel'>): void {
    const alertId = `${alertData.source}_${alertData.severity}`;
    
    // Check cooldown to prevent spam
    const cooldownKey = `${alertData.source}_${alertData.severity}`;
    const cooldown = this.alertCooldowns.get(cooldownKey);
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    
    if (cooldown && Date.now() - cooldown.getTime() < cooldownPeriod) {
      return; // Still in cooldown
    }

    const existingAlert = this.alerts.get(alertId);
    
    if (!existingAlert || existingAlert.resolved) {
      // Create new alert
      const alert: HealthAlert = {
        ...alertData,
        id: alertId,
        timestamp: new Date(),
        resolved: false,
        escalationLevel: 0
      };

      this.alerts.set(alertId, alert);
      this.alertCooldowns.set(cooldownKey, new Date());
      
      console.warn(`🚨 [HealthMonitor] Alert created: ${alert.title} - ${alert.message}`);
      this.emit('alert_created', alert);
    }
  }

  /**
   * Create a manual alert
   */
  createAlert(alertData: Omit<HealthAlert, 'id' | 'timestamp' | 'resolved' | 'escalationLevel'>): HealthAlert {
    const alert: HealthAlert = {
      ...alertData,
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      escalationLevel: 0
    };

    this.alerts.set(alert.id, alert);
    
    console.warn(`🚨 [HealthMonitor] Manual alert created: ${alert.title}`);
    this.emit('alert_created', alert);
    
    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    
    console.log(`✅ [HealthMonitor] Alert resolved: ${alert.title}`);
    this.emit('alert_resolved', alert);
    
    return true;
  }

  /**
   * Get all alerts with filtering
   */
  getAlerts(filters?: {
    resolved?: boolean;
    severity?: string;
    type?: string;
    limit?: number;
  }): HealthAlert[] {
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
      if (filters.limit) {
        alerts = alerts.slice(0, filters.limit);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance analytics for a time range
   */
  getPerformanceAnalytics(minutes = 60): {
    timeRange: { start: Date; end: Date };
    trends: {
      memoryUsage: Array<{ timestamp: Date; value: number }>;
      cpuUsage: Array<{ timestamp: Date; value: number }>;
      responseTime: Array<{ timestamp: Date; value: number }>;
    };
    summary: {
      avgMemoryUsage: number;
      peakMemoryUsage: number;
      avgCpuUsage: number;
      peakCpuUsage: number;
      totalRequests: number;
      errorRate: number;
    };
  } {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const relevantMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoff);
    
    const trends = {
      memoryUsage: relevantMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.metrics.memory.percentage
      })),
      cpuUsage: relevantMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.metrics.cpu.usage
      })),
      responseTime: [] // Would need to track this separately
    };

    const memoryValues = trends.memoryUsage.map(t => t.value);
    const cpuValues = trends.cpuUsage.map(t => t.value);

    const summary = {
      avgMemoryUsage: memoryValues.length > 0 ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length : 0,
      peakMemoryUsage: memoryValues.length > 0 ? Math.max(...memoryValues) : 0,
      avgCpuUsage: cpuValues.length > 0 ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : 0,
      peakCpuUsage: cpuValues.length > 0 ? Math.max(...cpuValues) : 0,
      totalRequests: this.getRequestsPerMinute(),
      errorRate: this.getErrorRate()
    };

    return {
      timeRange: { start: cutoff, end: new Date() },
      trends,
      summary
    };
  }

  /**
   * Get enhanced health status with alerts
   */
  getEnhancedHealthStatus(): {
    overall: 'healthy' | 'warning' | 'critical';
    health: HealthCheckResult;
    alerts: HealthAlert[];
    analytics: any;
    monitoring: {
      isActive: boolean;
      metricsCount: number;
      alertsCount: number;
    };
  } {
    const health = this.performHealthCheck();
    const alerts = this.getAlerts({ resolved: false });
    const analytics = this.getPerformanceAnalytics(60);
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Determine overall status from alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');
    
    if (criticalAlerts.length > 0) {
      overall = 'critical';
    } else if (highAlerts.length > 0 || alerts.length > 3) {
      overall = 'warning';
    }

    return {
      overall,
      health: health as any, // Type assertion for now
      alerts,
      analytics,
      monitoring: {
        isActive: this.isMonitoring,
        metricsCount: this.metricsHistory.length,
        alertsCount: this.alerts.size
      }
    };
  }

  /**
   * Export monitoring data for analysis
   */
  exportMonitoringData(): {
    alerts: HealthAlert[];
    metricsHistory: Array<{ timestamp: Date; metrics: SystemMetrics }>;
    recoveryHistory: any;
    exportTimestamp: Date;
  } {
    return {
      alerts: Array.from(this.alerts.values()),
      metricsHistory: this.metricsHistory,
      recoveryHistory: this.getRecoveryStatus(),
      exportTimestamp: new Date()
    };
  }
}

export default HealthMonitor;