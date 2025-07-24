import { logger } from '../lib/logger';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface KeepAliveMetrics {
  lastPing: Date;
  totalPings: number;
  coldStarts: number;
  averageResponseTime: number;
  uptimePercentage: number;
}

export class KeepAliveService {
  private static instance: KeepAliveService;
  private metrics: KeepAliveMetrics;
  private startTime: Date;
  private intervalId?: NodeJS.Timeout;
  
  private constructor() {
    this.startTime = new Date();
    this.metrics = {
      lastPing: new Date(),
      totalPings: 0,
      coldStarts: 0,
      averageResponseTime: 0,
      uptimePercentage: 100
    };
    
    // Detect if this is a cold start
    if (process.uptime() < 10) {
      this.metrics.coldStarts++;
      logger.warn('🥶 Cold start detected!');
      this.logColdStart();
    }
  }

  static getInstance(): KeepAliveService {
    if (!KeepAliveService.instance) {
      KeepAliveService.instance = new KeepAliveService();
    }
    return KeepAliveService.instance;
  }

  /**
   * Start the keep-alive monitoring
   */
  start(): void {
    logger.info('🫀 Starting keep-alive service...');
    
    // Initial ping
    this.performHealthCheck();
    
    // Schedule regular health checks every 5 minutes
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop the keep-alive monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Keep-alive service stopped');
    }
  }

  /**
   * Perform a health check
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      // Check CPU usage (rough estimate)
      const cpuUsage = process.cpuUsage();
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.metrics.totalPings++;
      this.metrics.lastPing = new Date();
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalPings - 1) + responseTime) / 
        this.metrics.totalPings;
      
      // Log health status
      logger.info(`🫀 Health check: Memory ${memoryMB}MB, Response time ${responseTime}ms, Uptime ${this.getUptime()}`);
      
      // Store metrics in Supabase
      await this.storeMetrics({
        memory_mb: memoryMB,
        response_time_ms: responseTime,
        cpu_user: cpuUsage.user,
        cpu_system: cpuUsage.system,
        uptime_seconds: process.uptime()
      });
      
      // Publish to Realtime
      await this.publishHealthStatus({
        status: 'healthy',
        memory: memoryMB,
        responseTime: responseTime,
        uptime: this.getUptime()
      });
      
    } catch (error) {
      logger.error('Health check failed:', error);
      
      // Still update last ping time
      this.metrics.lastPing = new Date();
      
      // Publish error status
      await this.publishHealthStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        uptime: this.getUptime()
      });
    }
  }

  /**
   * Log cold start event
   */
  private async logColdStart(): Promise<void> {
    try {
      await supabase
        .from('performance_logs')
        .insert({
          event_type: 'cold_start',
          data: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            node_version: process.version
          },
          timestamp: new Date().toISOString()
        });
      
      // Also publish to Realtime for immediate notification
      await supabase
        .from('realtime_events')
        .insert({
          event_type: 'cold_start_detected',
          data: {
            message: 'Server experienced a cold start',
            recovery_time_estimate: '1-5 seconds'
          },
          timestamp: new Date().toISOString()
        });
        
    } catch (error) {
      logger.error('Failed to log cold start:', error);
    }
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(data: any): Promise<void> {
    try {
      await supabase
        .from('health_metrics')
        .insert({
          ...data,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to store health metrics:', error);
    }
  }

  /**
   * Publish health status to Realtime
   */
  private async publishHealthStatus(status: any): Promise<void> {
    try {
      await supabase
        .from('realtime_health')
        .insert({
          ...status,
          server_id: process.env.INSTANCE_ID || 'default',
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to publish health status:', error);
    }
  }

  /**
   * Get formatted uptime
   */
  private getUptime(): string {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): KeepAliveMetrics {
    // Calculate uptime percentage
    const totalTime = Date.now() - this.startTime.getTime();
    const downtime = this.metrics.coldStarts * 3000; // Assume 3s per cold start
    this.metrics.uptimePercentage = ((totalTime - downtime) / totalTime) * 100;
    
    return { ...this.metrics };
  }

  /**
   * Handle external keep-alive ping (from UptimeRobot)
   */
  async handleExternalPing(source: string): Promise<void> {
    logger.info(`📡 Received keep-alive ping from ${source}`);
    
    // Log the external ping
    await supabase
      .from('external_pings')
      .insert({
        source,
        timestamp: new Date().toISOString(),
        server_uptime: process.uptime()
      });
    
    // If server just started, this helped prevent cold start
    if (process.uptime() < 60) {
      logger.info('✅ External ping prevented potential cold start!');
    }
  }
}

// Export singleton instance
export const keepAliveService = KeepAliveService.getInstance();