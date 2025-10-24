/**
 * ONDA 7: Warming Worker Alerting Service
 *
 * Monitors critical conditions and sends alerts:
 * - Bandwidth > 85% (WARNING)
 * - Bandwidth > 95% (CRITICAL)
 * - Cache coverage < 50% (WARNING)
 * - Worker down (CRITICAL)
 * - Queue backlog > threshold (WARNING)
 *
 * Alert Channels:
 * - Structured logger (always)
 * - Email (configurable)
 * - Slack/Discord (configurable)
 * - SMS (future)
 */

import { logger } from '../lib/logger';
import { getBandwidthStatsForMonitoring } from '../middleware/bandwidth-protection';
import { redisCacheService } from '../cache/redis-cache-service';

/**
 * Alert severity levels
 */
export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Alert definition
 */
export interface Alert {
  level: AlertLevel;
  title: string;
  message: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Alert configuration
 */
interface AlertConfig {
  bandwidthWarningThreshold: number;  // 0.85 = 85%
  bandwidthCriticalThreshold: number; // 0.95 = 95%
  cacheCoverageWarningThreshold: number; // 0.50 = 50%
  queueBacklogWarningThreshold: number; // 100 tasks
  checkIntervalMs: number; // How often to check (default: 60000 = 1 minute)
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AlertConfig = {
  bandwidthWarningThreshold: 0.85,
  bandwidthCriticalThreshold: 0.95,
  cacheCoverageWarningThreshold: 0.50,
  queueBacklogWarningThreshold: 100,
  checkIntervalMs: 60000, // 1 minute
};

/**
 * Warming Alerting Service
 */
export class WarmingAlertingService {
  private config: AlertConfig;
  private intervalHandle: NodeJS.Timeout | null = null;
  private lastAlerts: Map<string, number> = new Map(); // Cooldown tracking

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start continuous monitoring
   */
  start(): void {
    if (this.intervalHandle) {
      logger.warn('[WarmingAlertingService] Already running');
      return;
    }

    logger.info('[WarmingAlertingService] Starting continuous monitoring', {
      interval: this.config.checkIntervalMs,
      config: this.config
    });

    this.intervalHandle = setInterval(() => {
      this.checkAlerts().catch(error => {
        logger.error('[WarmingAlertingService] Error in alert check cycle:', error);
      });
    }, this.config.checkIntervalMs);

    // Run initial check
    this.checkAlerts().catch(error => {
      logger.error('[WarmingAlertingService] Error in initial alert check:', error);
    });
  }

  /**
   * Stop continuous monitoring
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info('[WarmingAlertingService] Stopped monitoring');
    }
  }

  /**
   * Main alert check cycle
   */
  async checkAlerts(): Promise<void> {
    logger.debug('[WarmingAlertingService] Running alert checks');

    await Promise.all([
      this.checkBandwidth(),
      this.checkCacheCoverage(),
      this.checkWorkerHealth(),
      this.checkQueueBacklog()
    ]);
  }

  /**
   * Check bandwidth usage
   */
  private async checkBandwidth(): Promise<void> {
    try {
      const stats = await getBandwidthStatsForMonitoring();

      // CRITICAL: > 95%
      if (stats.percentUsed >= this.config.bandwidthCriticalThreshold) {
        await this.sendAlert({
          level: 'CRITICAL',
          title: 'Bandwidth Critical',
          message: `Bandwidth usage at ${(stats.percentUsed * 100).toFixed(2)}% (${stats.dailyUsedMB.toFixed(2)} / ${stats.dailyBudgetMB.toFixed(2)} MB)`,
          action: 'Warming worker auto-paused. Service degraded until tomorrow.',
          metadata: {
            percentUsed: stats.percentUsed,
            dailyUsedMB: stats.dailyUsedMB,
            dailyBudgetMB: stats.dailyBudgetMB,
            requestsToday: stats.requestsToday
          },
          timestamp: new Date()
        });
      }
      // WARNING: > 85%
      else if (stats.percentUsed >= this.config.bandwidthWarningThreshold) {
        await this.sendAlert({
          level: 'WARNING',
          title: 'Bandwidth Warning',
          message: `Bandwidth approaching limit: ${(stats.percentUsed * 100).toFixed(2)}% (${stats.dailyUsedMB.toFixed(2)} / ${stats.dailyBudgetMB.toFixed(2)} MB)`,
          action: 'Monitor closely. Consider reducing warming frequency.',
          metadata: {
            percentUsed: stats.percentUsed,
            dailyUsedMB: stats.dailyUsedMB,
            dailyBudgetMB: stats.dailyBudgetMB
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('[WarmingAlertingService] Error checking bandwidth:', error);
    }
  }

  /**
   * Check cache coverage
   */
  private async checkCacheCoverage(): Promise<void> {
    try {
      const keys = await redisCacheService.keys('iv:method:*');
      const tickers = new Set<string>();

      keys.forEach(key => {
        const parts = key.split(':');
        if (parts.length >= 3) {
          tickers.add(parts[2]);
        }
      });

      const totalStocks = parseInt(process.env.STOCK_UNIVERSE_SIZE || '1493', 10);
      const coveragePercent = tickers.size / totalStocks;

      if (coveragePercent < this.config.cacheCoverageWarningThreshold) {
        await this.sendAlert({
          level: 'WARNING',
          title: 'Low Cache Coverage',
          message: `Only ${(coveragePercent * 100).toFixed(2)}% of stocks cached (${tickers.size} / ${totalStocks})`,
          action: 'Check warming worker health. Verify queue is processing.',
          metadata: {
            cachedStocks: tickers.size,
            totalStocks,
            coveragePercent
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('[WarmingAlertingService] Error checking cache coverage:', error);
    }
  }

  /**
   * Check worker health
   */
  private async checkWorkerHealth(): Promise<void> {
    const workers = [
      { name: 'earnings-monitor', port: 3005 },
      { name: 'intelligent-warming-worker', port: 3008 },
      { name: 'price-worker', port: 3002 },
      { name: 'transcripts-worker', port: 3003 }
    ];

    for (const worker of workers) {
      try {
        const response = await fetch(`http://localhost:${worker.port}/health`, {
          signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (!response.ok) {
          await this.sendAlert({
            level: 'CRITICAL',
            title: `Worker Down: ${worker.name}`,
            message: `${worker.name} is not responding (HTTP ${response.status})`,
            action: `pm2 restart ${worker.name}`,
            metadata: {
              worker: worker.name,
              port: worker.port,
              status: response.status
            },
            timestamp: new Date()
          });
        }
      } catch (error) {
        await this.sendAlert({
          level: 'CRITICAL',
          title: `Worker Unreachable: ${worker.name}`,
          message: `${worker.name} health endpoint not responding`,
          action: `pm2 status ${worker.name} && pm2 restart ${worker.name}`,
          metadata: {
            worker: worker.name,
            port: worker.port,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Check queue backlog
   */
  private async checkQueueBacklog(): Promise<void> {
    try {
      const pending = await redisCacheService.llen('warming:queue') || 0;

      if (pending > this.config.queueBacklogWarningThreshold) {
        await this.sendAlert({
          level: 'WARNING',
          title: 'Queue Backlog High',
          message: `Warming queue has ${pending} pending tasks`,
          action: 'Check worker throughput. Consider scaling warming capacity.',
          metadata: {
            pendingTasks: pending,
            threshold: this.config.queueBacklogWarningThreshold
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('[WarmingAlertingService] Error checking queue backlog:', error);
    }
  }

  /**
   * Send alert (with cooldown to avoid spam)
   */
  private async sendAlert(alert: Alert): Promise<void> {
    const alertKey = `${alert.level}:${alert.title}`;
    const now = Date.now();
    const lastSent = this.lastAlerts.get(alertKey) || 0;
    const cooldownMs = 3600000; // 1 hour cooldown

    // Skip if sent recently (within cooldown)
    if (now - lastSent < cooldownMs) {
      logger.debug('[WarmingAlertingService] Alert skipped (cooldown)', {
        alert: alertKey,
        lastSent: new Date(lastSent).toISOString()
      });
      return;
    }

    // Update last sent time
    this.lastAlerts.set(alertKey, now);

    // Log to structured logger
    const logMethod = alert.level === 'CRITICAL' ? 'error' : alert.level === 'WARNING' ? 'warn' : 'info';
    logger[logMethod](`[ALERT] ${alert.level}: ${alert.title}`, {
      message: alert.message,
      action: alert.action,
      metadata: alert.metadata,
      timestamp: alert.timestamp.toISOString()
    });

    // Send to external channels (if configured)
    await this.sendToExternalChannels(alert);
  }

  /**
   * Send to external alert channels (Email, Slack, Discord, etc.)
   */
  private async sendToExternalChannels(alert: Alert): Promise<void> {
    // Email
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      await this.sendEmail(alert).catch(error => {
        logger.error('[WarmingAlertingService] Failed to send email alert:', error);
      });
    }

    // Slack
    if (process.env.ALERT_SLACK_WEBHOOK) {
      await this.sendSlack(alert).catch(error => {
        logger.error('[WarmingAlertingService] Failed to send Slack alert:', error);
      });
    }

    // Discord
    if (process.env.ALERT_DISCORD_WEBHOOK) {
      await this.sendDiscord(alert).catch(error => {
        logger.error('[WarmingAlertingService] Failed to send Discord alert:', error);
      });
    }
  }

  /**
   * Send email alert
   */
  private async sendEmail(alert: Alert): Promise<void> {
    // TODO: Implement email sending via SendGrid, AWS SES, etc.
    logger.info('[WarmingAlertingService] Email alert (not implemented)', alert);
  }

  /**
   * Send Slack alert
   */
  private async sendSlack(alert: Alert): Promise<void> {
    const webhook = process.env.ALERT_SLACK_WEBHOOK;
    if (!webhook) return;

    const color = alert.level === 'CRITICAL' ? 'danger' : alert.level === 'WARNING' ? 'warning' : 'good';
    const icon = alert.level === 'CRITICAL' ? '🚨' : alert.level === 'WARNING' ? '⚠️' : 'ℹ️';

    const payload = {
      attachments: [
        {
          color,
          title: `${icon} ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Action',
              value: alert.action || 'None',
              short: false
            },
            {
              title: 'Timestamp',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ],
          footer: 'Alfalyzer Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }
      ]
    };

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Send Discord alert
   */
  private async sendDiscord(alert: Alert): Promise<void> {
    const webhook = process.env.ALERT_DISCORD_WEBHOOK;
    if (!webhook) return;

    const color = alert.level === 'CRITICAL' ? 0xED4245 : alert.level === 'WARNING' ? 0xFEE75C : 0x57F287;
    const icon = alert.level === 'CRITICAL' ? '🚨' : alert.level === 'WARNING' ? '⚠️' : 'ℹ️';

    const payload = {
      embeds: [
        {
          title: `${icon} ${alert.title}`,
          description: alert.message,
          color,
          fields: [
            {
              name: 'Action',
              value: alert.action || 'None',
              inline: false
            }
          ],
          timestamp: alert.timestamp.toISOString(),
          footer: {
            text: 'Alfalyzer Monitoring'
          }
        }
      ]
    };

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
}

// Export singleton instance
export const warmingAlertingService = new WarmingAlertingService();
