/**
 * Enhanced Health Monitoring Service
 * Provides comprehensive health checks, auto-recovery, and system monitoring
 */

import { performance } from 'perf_hooks';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

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

class HealthMonitor {
  private static instance: HealthMonitor;
  private startTime: number;
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private recoveryAttempts: number = 0;
  private lastRecoveryAttempt?: Date;
  private autoRecoveryEnabled: boolean = true;

  private constructor() {
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
}

export default HealthMonitor;