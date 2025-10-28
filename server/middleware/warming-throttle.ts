/**
 * Warming Throttle - ONDA 7
 *
 * Bandwidth-aware throttling for intelligent cache warming.
 *
 * Strategy:
 * - Monitor FMP API bandwidth usage (daily rolling window)
 * - Stop warming at 85% usage
 * - Throttle warming at 70% usage (reduce rate 4 → 2 calls/sec)
 * - Normal operation below 70%
 *
 * Bandwidth Calculation:
 * - FMP monthly limit: 20 GB
 * - Daily budget: ~666 MB (20 GB / 30 days)
 * - Average API call size: ~30 KB
 * - Daily call budget: ~22,000 calls
 */

import Redis from 'ioredis';
import { logger } from '../lib/logger';

export interface BandwidthBudget {
  allowWarming: boolean;
  maxCallsRemaining: number;
  percentUsed: number;
  reason?: string;
  throttleRate?: 'normal' | 'reduced'; // 4 calls/sec vs 2 calls/sec
}

export interface BandwidthStats {
  dailyBudgetMB: number;
  usedMB: number;
  percentUsed: number;
  callsToday: number;
  avgCallSizeKB: number;
}

/**
 * Warming Throttle Service
 *
 * Monitors FMP API bandwidth and enforces throttling rules.
 */
export class WarmingThrottle {
  private redis: Redis;
  private connected: boolean = false;

  // Redis keys
  private readonly BANDWIDTH_KEY = 'bandwidth:daily:';
  private readonly CALLS_KEY = 'bandwidth:calls:daily:';

  // Budget configuration
  private readonly MONTHLY_LIMIT_GB = 20; // FMP limit
  private readonly DAILY_BUDGET_MB = (20 * 1024) / 30; // ~666 MB
  private readonly AVG_CALL_SIZE_KB = 30; // Average API response size

  // Thresholds
  private readonly STOP_THRESHOLD = 0.85; // 85%
  private readonly THROTTLE_THRESHOLD = 0.70; // 70%

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('[WarmingThrottle] Redis connected');
      this.connected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('[WarmingThrottle] Redis error:', error);
      this.connected = false;
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('[WarmingThrottle] Failed to connect:', error);
    }
  }

  /**
   * Check bandwidth budget and determine if warming is allowed
   *
   * @returns Promise<BandwidthBudget>
   */
  async checkBandwidthBudget(): Promise<BandwidthBudget> {
    if (!this.connected) {
      logger.warn('[WarmingThrottle] Redis not connected, allowing warming (fail-open)');
      return {
        allowWarming: true,
        maxCallsRemaining: Infinity,
        percentUsed: 0,
        throttleRate: 'normal'
      };
    }

    try {
      const stats = await this.getBandwidthStats();

      // Stop warming if >= 85%
      if (stats.percentUsed >= this.STOP_THRESHOLD) {
        logger.warn(`[WarmingThrottle] STOP: Bandwidth at ${(stats.percentUsed * 100).toFixed(2)}% (threshold: 85%)`);
        return {
          allowWarming: false,
          maxCallsRemaining: 0,
          percentUsed: stats.percentUsed,
          reason: `Bandwidth at ${(stats.percentUsed * 100).toFixed(2)}% (threshold: 85%)`
        };
      }

      // Throttle if >= 70%
      if (stats.percentUsed >= this.THROTTLE_THRESHOLD) {
        const remainingMB = stats.dailyBudgetMB - stats.usedMB;
        const remainingCalls = Math.floor((remainingMB * 1024) / this.AVG_CALL_SIZE_KB);

        logger.warn(`[WarmingThrottle] THROTTLE: Bandwidth at ${(stats.percentUsed * 100).toFixed(2)}% (reducing rate 4→2 calls/sec)`);
        return {
          allowWarming: true,
          maxCallsRemaining: Math.max(0, remainingCalls),
          percentUsed: stats.percentUsed,
          reason: `Throttled due to high bandwidth usage (${(stats.percentUsed * 100).toFixed(2)}%)`,
          throttleRate: 'reduced'
        };
      }

      // Normal operation
      logger.debug(`[WarmingThrottle] OK: Bandwidth at ${(stats.percentUsed * 100).toFixed(2)}% (normal rate)`);
      return {
        allowWarming: true,
        maxCallsRemaining: Infinity,
        percentUsed: stats.percentUsed,
        throttleRate: 'normal'
      };
    } catch (error) {
      logger.error('[WarmingThrottle] Failed to check bandwidth budget:', error);

      // Fail-open (allow warming on error)
      return {
        allowWarming: true,
        maxCallsRemaining: Infinity,
        percentUsed: 0,
        reason: 'Error checking bandwidth (fail-open)',
        throttleRate: 'normal'
      };
    }
  }

  /**
   * Get current bandwidth statistics
   *
   * @returns Promise<BandwidthStats>
   */
  async getBandwidthStats(): Promise<BandwidthStats> {
    if (!this.connected) {
      return {
        dailyBudgetMB: this.DAILY_BUDGET_MB,
        usedMB: 0,
        percentUsed: 0,
        callsToday: 0,
        avgCallSizeKB: this.AVG_CALL_SIZE_KB
      };
    }

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Get bandwidth used today (in KB)
      const bandwidthKey = `${this.BANDWIDTH_KEY}${today}`;
      const usedKB = parseInt(await this.redis.get(bandwidthKey) || '0', 10);
      const usedMB = usedKB / 1024;

      // Get calls made today
      const callsKey = `${this.CALLS_KEY}${today}`;
      const callsToday = parseInt(await this.redis.get(callsKey) || '0', 10);

      // Calculate percentage used
      const percentUsed = usedMB / this.DAILY_BUDGET_MB;

      return {
        dailyBudgetMB: this.DAILY_BUDGET_MB,
        usedMB,
        percentUsed,
        callsToday,
        avgCallSizeKB: this.AVG_CALL_SIZE_KB
      };
    } catch (error) {
      logger.error('[WarmingThrottle] Failed to get bandwidth stats:', error);
      return {
        dailyBudgetMB: this.DAILY_BUDGET_MB,
        usedMB: 0,
        percentUsed: 0,
        callsToday: 0,
        avgCallSizeKB: this.AVG_CALL_SIZE_KB
      };
    }
  }

  /**
   * Record an API call (bandwidth usage)
   *
   * @param responseSizeBytes - Size of API response in bytes
   * @returns Promise<void>
   */
  async recordApiCall(responseSizeBytes: number): Promise<void> {
    if (!this.connected) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Increment bandwidth usage (in KB)
      const bandwidthKey = `${this.BANDWIDTH_KEY}${today}`;
      const sizeKB = Math.ceil(responseSizeBytes / 1024);
      await this.redis.incrby(bandwidthKey, sizeKB);

      // Set expiry: 7 days
      await this.redis.expire(bandwidthKey, 7 * 24 * 60 * 60);

      // Increment call counter
      const callsKey = `${this.CALLS_KEY}${today}`;
      await this.redis.incr(callsKey);
      await this.redis.expire(callsKey, 7 * 24 * 60 * 60);

      logger.debug(`[WarmingThrottle] Recorded API call: ${sizeKB} KB`);
    } catch (error) {
      logger.error('[WarmingThrottle] Failed to record API call:', error);
    }
  }

  /**
   * Get delay between API calls (in milliseconds)
   *
   * @param throttleRate - 'normal' (4 calls/sec) or 'reduced' (2 calls/sec)
   * @returns Delay in milliseconds
   */
  getCallDelay(throttleRate: 'normal' | 'reduced' = 'normal'): number {
    if (throttleRate === 'reduced') {
      return 500; // 2 calls/sec
    }
    return 250; // 4 calls/sec (normal)
  }

  /**
   * Get bandwidth report for monitoring
   *
   * @returns Promise<string>
   */
  async getBandwidthReport(): Promise<string> {
    const stats = await this.getBandwidthStats();
    const budget = await this.checkBandwidthBudget();

    const report = [
      `Bandwidth Report (${new Date().toISOString().split('T')[0]})`,
      `----------------------------------------`,
      `Daily Budget: ${stats.dailyBudgetMB.toFixed(2)} MB`,
      `Used: ${stats.usedMB.toFixed(2)} MB (${(stats.percentUsed * 100).toFixed(2)}%)`,
      `Calls Today: ${stats.callsToday}`,
      `Avg Call Size: ${stats.avgCallSizeKB} KB`,
      `Status: ${budget.allowWarming ? (budget.throttleRate === 'reduced' ? 'THROTTLED' : 'OK') : 'STOPPED'}`,
      `Remaining Calls: ${budget.maxCallsRemaining === Infinity ? '∞' : budget.maxCallsRemaining}`,
      budget.reason ? `Reason: ${budget.reason}` : ''
    ].filter(Boolean).join('\n');

    return report;
  }

  /**
   * Reset daily bandwidth counters (admin operation)
   *
   * @returns Promise<void>
   */
  async resetDailyCounters(): Promise<void> {
    if (!this.connected) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const bandwidthKey = `${this.BANDWIDTH_KEY}${today}`;
      const callsKey = `${this.CALLS_KEY}${today}`;

      await this.redis.del(bandwidthKey);
      await this.redis.del(callsKey);

      logger.info('[WarmingThrottle] Daily counters reset');
    } catch (error) {
      logger.error('[WarmingThrottle] Failed to reset daily counters:', error);
    }
  }

  /**
   * Disconnect Redis client
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.redis.quit();
      logger.info('[WarmingThrottle] Disconnected');
    }
  }
}

/**
 * Get bandwidth statistics for monitoring (exported helper)
 *
 * @returns Promise<BandwidthStats>
 */
export async function getBandwidthStatsForMonitoring(): Promise<BandwidthStats> {
  const throttle = new WarmingThrottle();
  const stats = await throttle.getBandwidthStats();
  await throttle.disconnect();
  return stats;
}

// Export singleton instance
export const warmingThrottle = new WarmingThrottle();
