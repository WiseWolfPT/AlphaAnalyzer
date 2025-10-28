/**
 * Warming Queue Service - ONDA 7
 *
 * Priority-based queue system for intelligent cache warming.
 * Uses Redis sorted sets (ZADD/ZRANGE) for O(log N) priority scheduling.
 *
 * Priority Scoring Formula:
 * score = priority × 1000 - timestamp
 *
 * Where priority (1-5):
 * - 5 = S&P 100 (highest priority)
 * - 4 = S&P 500 top tier
 * - 3 = S&P 500 mid tier
 * - 2 = Extended universe
 * - 1 = Low activity stocks
 */

import Redis from 'ioredis';
import { logger } from '../lib/logger';

export interface WarmingTask {
  ticker: string;
  methodId: string;
  priority: number;              // 1-5 (5 = highest)
  lastWarmed: Date | null;
  nextWarm: Date;
  reason: 'scheduled' | 'earnings' | 'user-activity' | 'stale';
}

export interface WarmingStats {
  queueSize: number;
  completedToday: number;
  failedToday: number;
  avgPriority: number;
}

/**
 * Warming Queue Service
 *
 * Manages priority-based warming queue in Redis using sorted sets.
 * Automatically schedules tasks based on priority, freshness, and user activity.
 */
export class WarmingQueueService {
  private redis: Redis;
  private connected: boolean = false;

  // Redis keys
  private readonly QUEUE_KEY = 'warming:queue';
  private readonly COMPLETED_KEY = 'warming:completed:';
  private readonly FAILED_KEY = 'warming:failed:';
  private readonly STATS_KEY = 'warming:stats';

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
      logger.info('[WarmingQueue] Redis connected');
      this.connected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('[WarmingQueue] Redis error:', error);
      this.connected = false;
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('[WarmingQueue] Failed to connect:', error);
    }
  }

  /**
   * Add a task to the warming queue
   *
   * @param task - Warming task with priority, ticker, methodId
   * @returns Promise<void>
   */
  async addTask(task: WarmingTask): Promise<void> {
    if (!this.connected) {
      logger.warn('[WarmingQueue] Redis not connected, skipping task add');
      return;
    }

    try {
      // Score = priority × 1000 - timestamp (higher priority = processed first)
      const score = task.priority * 1000 - Date.now();

      // Task ID: ticker:methodId
      const taskId = `${task.ticker}:${task.methodId}`;

      // Task payload
      const payload = JSON.stringify({
        ticker: task.ticker,
        methodId: task.methodId,
        priority: task.priority,
        lastWarmed: task.lastWarmed ? task.lastWarmed.toISOString() : null,
        nextWarm: task.nextWarm.toISOString(),
        reason: task.reason,
        addedAt: new Date().toISOString()
      });

      // Add to sorted set (ZADD)
      await this.redis.zadd(this.QUEUE_KEY, score, `${taskId}|${payload}`);

      logger.debug(`[WarmingQueue] Added task: ${taskId} (priority: ${task.priority}, reason: ${task.reason})`);
    } catch (error) {
      logger.error('[WarmingQueue] Failed to add task:', error);
    }
  }

  /**
   * Get next batch of high-priority tasks
   *
   * @param batchSize - Number of tasks to retrieve (default: 50)
   * @returns Promise<WarmingTask[]>
   */
  async getNextBatch(batchSize: number = 50): Promise<WarmingTask[]> {
    if (!this.connected) {
      logger.warn('[WarmingQueue] Redis not connected, returning empty batch');
      return [];
    }

    try {
      // Get top N tasks from sorted set (highest score = highest priority)
      const results = await this.redis.zrange(this.QUEUE_KEY, 0, batchSize - 1);

      if (results.length === 0) {
        return [];
      }

      // Parse tasks
      const tasks: WarmingTask[] = results.map(entry => {
        const [taskId, payload] = entry.split('|', 2);
        const parsed = JSON.parse(payload);

        return {
          ticker: parsed.ticker,
          methodId: parsed.methodId,
          priority: parsed.priority,
          lastWarmed: parsed.lastWarmed ? new Date(parsed.lastWarmed) : null,
          nextWarm: new Date(parsed.nextWarm),
          reason: parsed.reason
        };
      });

      logger.info(`[WarmingQueue] Retrieved ${tasks.length} tasks from queue`);
      return tasks;
    } catch (error) {
      logger.error('[WarmingQueue] Failed to get next batch:', error);
      return [];
    }
  }

  /**
   * Remove a task from the queue after completion
   *
   * @param ticker - Stock ticker
   * @param methodId - Valuation method ID
   * @returns Promise<void>
   */
  async removeTask(ticker: string, methodId: string): Promise<void> {
    if (!this.connected) return;

    try {
      const taskId = `${ticker}:${methodId}`;

      // Remove all entries matching this taskId (pattern match)
      const results = await this.redis.zrange(this.QUEUE_KEY, 0, -1);

      for (const entry of results) {
        if (entry.startsWith(`${taskId}|`)) {
          await this.redis.zrem(this.QUEUE_KEY, entry);
          logger.debug(`[WarmingQueue] Removed task: ${taskId}`);
        }
      }
    } catch (error) {
      logger.error('[WarmingQueue] Failed to remove task:', error);
    }
  }

  /**
   * Mark task as completed
   *
   * @param ticker - Stock ticker
   * @param methodId - Valuation method ID
   * @returns Promise<void>
   */
  async markCompleted(ticker: string, methodId: string): Promise<void> {
    if (!this.connected) return;

    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `${this.COMPLETED_KEY}${today}`;
      const taskId = `${ticker}:${methodId}`;

      // Increment completion counter for today
      await this.redis.hincrby(key, taskId, 1);

      // Set expiry: 7 days
      await this.redis.expire(key, 7 * 24 * 60 * 60);

      // Remove from queue
      await this.removeTask(ticker, methodId);

      logger.debug(`[WarmingQueue] Marked completed: ${taskId}`);
    } catch (error) {
      logger.error('[WarmingQueue] Failed to mark completed:', error);
    }
  }

  /**
   * Mark task as failed
   *
   * @param ticker - Stock ticker
   * @param methodId - Valuation method ID
   * @param reason - Failure reason
   * @returns Promise<void>
   */
  async markFailed(ticker: string, methodId: string, reason: string): Promise<void> {
    if (!this.connected) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${this.FAILED_KEY}${today}`;
      const taskId = `${ticker}:${methodId}`;

      // Store failure with reason
      await this.redis.hset(key, taskId, JSON.stringify({
        reason,
        timestamp: new Date().toISOString()
      }));

      // Set expiry: 7 days
      await this.redis.expire(key, 7 * 24 * 60 * 60);

      // Remove from queue
      await this.removeTask(ticker, methodId);

      logger.warn(`[WarmingQueue] Marked failed: ${taskId} (reason: ${reason})`);
    } catch (error) {
      logger.error('[WarmingQueue] Failed to mark failed:', error);
    }
  }

  /**
   * Boost priority for a ticker (e.g., after user view)
   *
   * @param ticker - Stock ticker
   * @param boostAmount - Priority boost (1-3)
   * @returns Promise<void>
   */
  async boostPriority(ticker: string, boostAmount: number = 2): Promise<void> {
    if (!this.connected) return;

    try {
      // Find all tasks for this ticker
      const results = await this.redis.zrange(this.QUEUE_KEY, 0, -1, 'WITHSCORES');

      for (let i = 0; i < results.length; i += 2) {
        const entry = results[i];
        const currentScore = parseFloat(results[i + 1]);

        if (entry.startsWith(`${ticker}:`)) {
          // Boost score (higher priority)
          const newScore = currentScore + (boostAmount * 1000);
          await this.redis.zadd(this.QUEUE_KEY, newScore, entry);

          logger.debug(`[WarmingQueue] Boosted priority for ${ticker} (boost: +${boostAmount})`);
        }
      }
    } catch (error) {
      logger.error('[WarmingQueue] Failed to boost priority:', error);
    }
  }

  /**
   * Get queue statistics
   *
   * @returns Promise<WarmingStats>
   */
  async getStats(): Promise<WarmingStats> {
    if (!this.connected) {
      return {
        queueSize: 0,
        completedToday: 0,
        failedToday: 0,
        avgPriority: 0
      };
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Queue size
      const queueSize = await this.redis.zcard(this.QUEUE_KEY);

      // Completed today
      const completedKey = `${this.COMPLETED_KEY}${today}`;
      const completedToday = await this.redis.hlen(completedKey);

      // Failed today
      const failedKey = `${this.FAILED_KEY}${today}`;
      const failedToday = await this.redis.hlen(failedKey);

      // Average priority
      const results = await this.redis.zrange(this.QUEUE_KEY, 0, -1);
      let totalPriority = 0;
      for (const entry of results) {
        const [, payload] = entry.split('|', 2);
        const parsed = JSON.parse(payload);
        totalPriority += parsed.priority;
      }
      const avgPriority = results.length > 0 ? totalPriority / results.length : 0;

      return {
        queueSize,
        completedToday,
        failedToday,
        avgPriority: parseFloat(avgPriority.toFixed(2))
      };
    } catch (error) {
      logger.error('[WarmingQueue] Failed to get stats:', error);
      return {
        queueSize: 0,
        completedToday: 0,
        failedToday: 0,
        avgPriority: 0
      };
    }
  }

  /**
   * Clear the entire queue (admin operation)
   *
   * @returns Promise<void>
   */
  async clearQueue(): Promise<void> {
    if (!this.connected) return;

    try {
      await this.redis.del(this.QUEUE_KEY);
      logger.info('[WarmingQueue] Queue cleared');
    } catch (error) {
      logger.error('[WarmingQueue] Failed to clear queue:', error);
    }
  }

  /**
   * Schedule Tier 1 (S&P 100) - Warm all methods hourly
   *
   * @param sp100Tickers - Array of S&P 100 ticker symbols
   * @param methodIds - Array of valuation method IDs
   * @returns Promise<void>
   */
  async scheduleTier1(sp100Tickers: string[], methodIds: string[]): Promise<void> {
    logger.info(`[WarmingQueue] Scheduling Tier 1: ${sp100Tickers.length} tickers × ${methodIds.length} methods`);

    for (const ticker of sp100Tickers) {
      for (const methodId of methodIds) {
        await this.addTask({
          ticker,
          methodId,
          priority: 5, // Highest
          lastWarmed: null,
          nextWarm: new Date(),
          reason: 'scheduled'
        });
      }
    }

    logger.info(`[WarmingQueue] Tier 1 scheduled: ${sp100Tickers.length * methodIds.length} tasks`);
  }

  /**
   * Disconnect Redis client
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.redis.quit();
      logger.info('[WarmingQueue] Disconnected');
    }
  }
}

// Export singleton instance
export const warmingQueueService = new WarmingQueueService();
