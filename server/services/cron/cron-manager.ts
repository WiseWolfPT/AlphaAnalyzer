import cron from 'node-cron';
import { getSupabaseClient } from '../../lib/supabase-client';
import { logger } from '../../lib/logger';
import fetch from 'node-fetch';
import { simpleCacheService } from '../simple-cache-service';

export interface CronJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
}

export interface CronMetrics {
  lastRun?: Date;
  nextRun?: Date;
  successCount: number;
  errorCount: number;
  averageDuration: number;
  lastError?: string;
}

export class CronManager {
  private static instance: CronManager;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private metrics: Map<string, CronMetrics> = new Map();
  private isProduction = process.env.NODE_ENV === 'production';
  private healthcheckUrl = process.env.HEALTHCHECK_UUID ? `https://hc-ping.com/${process.env.HEALTHCHECK_UUID}` : null;
  
  // Popular stocks to keep warm in cache
  private readonly POPULAR_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
    'TSLA', 'NVDA', 'JPM', 'V', 'JNJ',
    'WMT', 'PG', 'MA', 'UNH', 'HD',
    // Portuguese stocks
    'GALP.LS', 'EDP.LS', 'JMT.LS', 'ALTRI.LS', 'NOS.LS'
  ];

  private constructor() {
    logger.info('🕐 CronManager initialized');
  }

  static getInstance(): CronManager {
    if (!CronManager.instance) {
      CronManager.instance = new CronManager();
    }
    return CronManager.instance;
  }

  /**
   * Start all cron jobs
   */
  async startAll(): Promise<void> {
    logger.info('🚀 Starting all cron jobs...');
    
    // Critical: Keep server awake - Run every 45 minutes
    this.scheduleJob({
      name: 'keep-alive',
      schedule: '*/45 * * * *',
      task: this.keepAlive.bind(this),
      enabled: this.isProduction
    });
    
    // Warm cache during market windows (ET):
    // Pre-market 04:00–09:30, Regular 09:30–16:00, After-hours 16:00–20:00
    // Simplified: run every minute 04:00–20:59 ET, Mon–Fri
    this.scheduleJob({
      name: 'cache-warmer',
      schedule: '*/1 4-20 * * 1-5',
      task: this.warmPopularStocksCache.bind(this),
      enabled: true
    });
    
    // Clean expired cache - Daily at 2 AM
    this.scheduleJob({
      name: 'cache-cleanup',
      schedule: '0 2 * * *',
      task: this.cleanupExpiredCache.bind(this),
      enabled: true
    });
    
    // Monitor API quotas - Every hour
    this.scheduleJob({
      name: 'quota-monitor',
      schedule: '0 * * * *',
      task: this.monitorApiQuotas.bind(this),
      enabled: true
    });
    
    // Publish metrics to Supabase - Every 5 minutes
    this.scheduleJob({
      name: 'metrics-publisher',
      schedule: '*/5 * * * *',
      task: this.publishMetrics.bind(this),
      enabled: this.isProduction
    });
    
    // Request coalescing cleanup - Every 30 minutes
    this.scheduleJob({
      name: 'coalescing-cleanup',
      schedule: '*/30 * * * *',
      task: this.cleanupCoalescingQueue.bind(this),
      enabled: true
    });
    
    // Healthchecks.io system monitoring - Every minute (only if configured)
    if (this.healthcheckUrl) {
      this.scheduleJob({
        name: 'system-health-monitor',
        schedule: '* * * * *',
        task: this.pingSystemHealth.bind(this),
        enabled: true
      });
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    logger.info('🛑 Stopping all cron jobs...');
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Schedule a cron job
   */
  private scheduleJob(config: CronJob): void {
    if (!config.enabled) {
      logger.info(`⏸️  Job ${config.name} is disabled`);
      return;
    }

    if (this.jobs.has(config.name)) {
      logger.warn(`Job ${config.name} already exists. Skipping...`);
      return;
    }

    const job = cron.schedule(config.schedule, async () => {
      const startTime = Date.now();
      const metric = this.getOrCreateMetric(config.name);
      
      try {
        logger.info(`[CRON] ▶️  Starting job: ${config.name}`);
        await config.task();
        
        const duration = Date.now() - startTime;
        metric.successCount++;
        metric.lastRun = new Date();
        metric.averageDuration = (metric.averageDuration * (metric.successCount - 1) + duration) / metric.successCount;
        
        logger.info(`[CRON] ✅ Completed job: ${config.name} in ${duration}ms`);
        
        // Ping healthchecks.io on successful completion
        await this.pingHealthchecks(config.name, duration);
      } catch (error) {
        const duration = Date.now() - startTime;
        metric.errorCount++;
        metric.lastError = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error(`[CRON] ❌ Error in job ${config.name} after ${duration}ms:`, error);
      }
    }, {
      timezone: process.env.CRON_TZ || 'America/New_York'
    });

    job.start();
    this.jobs.set(config.name, job);
    logger.info(`✅ Scheduled job: ${config.name} (${config.schedule})`);
  }

  /**
   * Keep server alive to prevent Coolify sleep
   */
  private async keepAlive(): Promise<void> {
    logger.info('🫀 Keep-alive ping to prevent cold start...');

    // Log cold start detection
    const startupTime = process.uptime();
    if (startupTime < 60) {
      logger.warn(`🥶 Cold start detected! Server uptime: ${startupTime.toFixed(2)}s`);

      // Report cold start to Supabase
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase
          .from('performance_logs')
          .insert({
            event_type: 'cold_start',
            duration_ms: startupTime * 1000,
            timestamp: new Date().toISOString()
          });
      }
    }

    // Self-ping to keep warm (if needed)
    if (process.env.SELF_PING_URL) {
      try {
        const response = await fetch(process.env.SELF_PING_URL + '/api/health');
        logger.info(`Keep-alive ping response: ${response.status}`);
      } catch (error) {
        logger.error('Keep-alive ping failed:', error);
      }
    }
  }

  /**
   * Warm cache with popular stocks
   */
  private async warmPopularStocksCache(): Promise<void> {
    logger.info('🔥 Warming cache for popular stocks...');

    const results = {
      success: 0,
      failed: 0,
      cached: 0
    };

    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < this.POPULAR_STOCKS.length; i += batchSize) {
      const batch = this.POPULAR_STOCKS.slice(i, i + batchSize);

      const promises = batch.map(async (symbol) => {
        try {
          // Canonizar símbolos .LS → -LS para compatibilidade com FMP
          const canonicalSymbol = symbol.replace(/\./g, '-');

          // Usar simpleCacheService que já implementa fallbacks e canonização
          const quote = await simpleCacheService.getQuote(canonicalSymbol);

          if (quote) {
            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          logger.error(`Failed to warm cache for ${symbol}:`, error);
        }
      });

      await Promise.all(promises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < this.POPULAR_STOCKS.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.info(`Cache warming complete: ${results.success} fetched, ${results.failed} failed`);

    // Publish results to Supabase Realtime
    await this.publishRealtimeEvent('cache_warming', {
      timestamp: new Date().toISOString(),
      results
    });
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredCache(): Promise<void> {
    logger.info('🧹 Cleaning up expired cache entries...');

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        logger.warn('Supabase client not available, skipping cache cleanup');
        return;
      }

      // Clean stock quotes
      const { count: quotesDeleted } = await supabase
        .from('stock_quotes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Clean batch quotes
      const { count: batchDeleted } = await supabase
        .from('batch_quotes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Clean market status
      const { count: statusDeleted } = await supabase
        .from('market_status')
        .delete()
        .lt('expires_at', new Date().toISOString());

      logger.info(`Cleaned up: ${quotesDeleted || 0} quotes, ${batchDeleted || 0} batch quotes, ${statusDeleted || 0} market statuses`);

      // Get cache statistics
      const stats = await this.getCacheStatistics();
      logger.info('Cache statistics after cleanup:', stats);

    } catch (error) {
      logger.error('Cache cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Monitor API quotas and alert if needed
   */
  private async monitorApiQuotas(): Promise<void> {
    logger.info('📊 Monitoring API quotas...');

    const supabase = getSupabaseClient();
    if (!supabase) {
      logger.warn('Supabase client not available, skipping quota monitoring');
      return;
    }

    const { data: quotas } = await supabase
      .from('api_metadata')
      .select('*')
      .order('last_called', { ascending: false });

    const alerts: any[] = [];

    for (const quota of quotas || []) {
      if (quota.quota_remaining && quota.call_count) {
        const usagePercent = (quota.call_count / (quota.call_count + quota.quota_remaining)) * 100;

        if (usagePercent > 90) {
          alerts.push({
            provider: quota.provider,
            endpoint: quota.endpoint,
            usagePercent,
            severity: 'critical'
          });
          logger.error(`⚠️  CRITICAL: ${quota.provider} at ${usagePercent.toFixed(1)}% quota usage!`);
        } else if (usagePercent > 80) {
          alerts.push({
            provider: quota.provider,
            endpoint: quota.endpoint,
            usagePercent,
            severity: 'warning'
          });
          logger.warn(`⚠️  WARNING: ${quota.provider} at ${usagePercent.toFixed(1)}% quota usage`);
        }
      }
    }

    // Publish alerts to Supabase Realtime
    if (alerts.length > 0) {
      await this.publishRealtimeEvent('quota_alerts', {
        timestamp: new Date().toISOString(),
        alerts
      });
    }
  }

  /**
   * Publish performance metrics
   */
  private async publishMetrics(): Promise<void> {
    const metrics: any = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cron_jobs: {}
    };

    // Add cron job metrics
    this.metrics.forEach((metric, jobName) => {
      metrics.cron_jobs[jobName] = {
        lastRun: metric.lastRun?.toISOString(),
        successCount: metric.successCount,
        errorCount: metric.errorCount,
        averageDuration: Math.round(metric.averageDuration),
        lastError: metric.lastError
      };
    });

    // Publish to Supabase Realtime
    await this.publishRealtimeEvent('performance_metrics', metrics);

    // Also store in database for historical analysis
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from('performance_logs')
        .insert({
          event_type: 'metrics_snapshot',
          data: metrics,
          timestamp: metrics.timestamp
        });
    }
  }

  /**
   * Clean up request coalescing queue
   */
  private async cleanupCoalescingQueue(): Promise<void> {
    logger.info('🧹 Cleaning up coalescing queue...');
    
    // This would clean up any stale entries in the request coalescing system
    // Implementation depends on the coalescing strategy used
    const { RequestCoalescer } = await import('../request-coalescer');
    const coalescer = RequestCoalescer.getInstance();
    
    const cleaned = await coalescer.cleanup();
    logger.info(`Cleaned ${cleaned} stale coalescing entries`);
  }

  /**
   * Publish event to Supabase Realtime
   */
  private async publishRealtimeEvent(eventType: string, data: any): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        logger.debug(`Supabase client not available, skipping realtime event ${eventType}`);
        return;
      }

      await supabase
        .from('realtime_events')
        .insert({
          event_type: eventType,
          data,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error(`Failed to publish realtime event ${eventType}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  private async getCacheStatistics(): Promise<any> {
    const [quotes, batch, market] = await Promise.all([
      getSupabaseClient()?.from('stock_quotes').select('count'),
      getSupabaseClient()?.from('batch_quotes').select('count'),
      getSupabaseClient()?.from('market_status').select('count')
    ]);
    
    return {
      stock_quotes: quotes.data?.[0]?.count || 0,
      batch_quotes: batch.data?.[0]?.count || 0,
      market_status: market.data?.[0]?.count || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get or create metric for a job
   */
  /**
   * Ping healthchecks.io to indicate successful cron job execution
   */
  private async pingHealthchecks(jobName: string, duration: number): Promise<void> {
    if (!this.healthcheckUrl) {
      return; // Healthchecks not configured
    }

    try {
      const response = await fetch(`${this.healthcheckUrl}/${jobName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Alfalyzer-CronManager/1.0'
        },
        body: JSON.stringify({
          duration_ms: duration,
          timestamp: new Date().toISOString(),
          status: 'success'
        }),
        timeout: 5000 // 5 second timeout
      });

      if (response.ok) {
        logger.debug(`[HEALTHCHECK] ✅ Pinged for job: ${jobName}`);
      } else {
        logger.warn(`[HEALTHCHECK] ⚠️ Failed to ping for job: ${jobName} - HTTP ${response.status}`);
      }
    } catch (error) {
      logger.error(`[HEALTHCHECK] ❌ Error pinging for job: ${jobName}`, error);
    }
  }

  /**
   * Ping healthchecks.io with system health status
   */
  private async pingSystemHealth(): Promise<void> {
    if (!this.healthcheckUrl) {
      return;
    }

    try {
      const systemHealth = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        pid: process.pid,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(this.healthcheckUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Alfalyzer-SystemHealth/1.0'
        },
        body: JSON.stringify(systemHealth),
        timeout: 5000
      });

      if (response.ok) {
        logger.debug('[HEALTHCHECK] ✅ System health ping successful');
      }
    } catch (error) {
      logger.error('[HEALTHCHECK] ❌ System health ping failed', error);
    }
  }

  private getOrCreateMetric(jobName: string): CronMetrics {
    if (!this.metrics.has(jobName)) {
      this.metrics.set(jobName, {
        successCount: 0,
        errorCount: 0,
        averageDuration: 0
      });
    }
    return this.metrics.get(jobName)!;
  }

  /**
   * Get current status of all jobs
   */
  getStatus(): any {
    const status: any = {
      jobs: [],
      metrics: {},
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    this.jobs.forEach((job, name) => {
      status.jobs.push({
        name,
        running: true, // cron.ScheduledTask doesn't expose running state
        metrics: this.metrics.get(name) || {}
      });
    });
    
    return status;
  }

  /**
   * Manually trigger a specific job
   */
  async triggerJob(jobName: string): Promise<void> {
    switch (jobName) {
      case 'keep-alive':
        await this.keepAlive();
        break;
      case 'cache-warmer':
        await this.warmPopularStocksCache();
        break;
      case 'cache-cleanup':
        await this.cleanupExpiredCache();
        break;
      case 'quota-monitor':
        await this.monitorApiQuotas();
        break;
      case 'metrics-publisher':
        await this.publishMetrics();
        break;
      case 'coalescing-cleanup':
        await this.cleanupCoalescingQueue();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Export singleton instance
export const cronManager = CronManager.getInstance();
