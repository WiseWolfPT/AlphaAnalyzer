/**
 * FMP Rate Limit Service - Agent 8 Implementation
 *
 * Production service that wraps TokenBucketRateLimiter with:
 * - FMP-specific configuration
 * - HTTP 429 handling
 * - Comprehensive metrics
 * - Monitoring endpoints
 *
 * This service is the recommended way to interact with FMP API
 * for all batch and individual calls.
 */

import { fmpTokenBucket, TokenBucketMetrics } from '../utils/token-bucket-rate-limiter';
import { logger } from '../lib/logger';

/**
 * FMP API call statistics
 */
export interface FMPCallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  http429Errors: number;
  avgResponseTimeMs: number;
  tokenBucket: TokenBucketMetrics;
}

/**
 * FMP Rate Limit Service
 *
 * Manages rate limiting for FMP API with:
 * - Token bucket algorithm (8 burst, 4/sec sustained)
 * - Automatic HTTP 429 handling
 * - Metrics and monitoring
 * - Health checks
 *
 * @example
 * ```typescript
 * // Single call
 * await fmpRateLimitService.acquireForCall();
 * const response = await fetch(fmpUrl);
 * fmpRateLimitService.recordResponse(response.status, responseTime);
 *
 * // Batch call (8 endpoints)
 * await fmpRateLimitService.acquireForBatch(8);
 * const responses = await Promise.all(batchCalls);
 * responses.forEach(r => fmpRateLimitService.recordResponse(r.status, r.time));
 * ```
 */
export class FMPRateLimitService {
  private callStats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    http429Errors: 0,
    responseTimes: [] as number[],
  };

  /**
   * Acquire permit for a single FMP API call
   *
   * This method will block until a token is available.
   * Use this for individual FMP API calls.
   *
   * @returns Promise that resolves when permit is acquired
   *
   * @example
   * ```typescript
   * await fmpRateLimitService.acquireForCall();
   * const quote = await fmpProvider.getQuote('AAPL');
   * fmpRateLimitService.recordResponse(200, 150);
   * ```
   */
  async acquireForCall(): Promise<void> {
    await fmpTokenBucket.acquire(1);
    this.callStats.totalCalls++;

    logger.debug('[FMP Rate Limit] Permit acquired for call', {
      totalCalls: this.callStats.totalCalls,
      tokensRemaining: fmpTokenBucket.getState().tokens.toFixed(2),
    });
  }

  /**
   * Acquire permits for a batch FMP API call
   *
   * Use this for batch endpoints that fetch multiple symbols at once.
   * Even though it's 1 HTTP call, it counts as multiple FMP calls.
   *
   * @param batchSize - Number of symbols in the batch
   *
   * @example
   * ```typescript
   * // Batch warming: 8 parallel endpoint calls
   * await fmpRateLimitService.acquireForBatch(8);
   * const [quotes, income, balance, cashflow, ratios, profile, metrics, metricsTTM] =
   *   await Promise.all([...]);
   * ```
   */
  async acquireForBatch(batchSize: number): Promise<void> {
    if (batchSize <= 0) {
      throw new Error(`Invalid batch size: ${batchSize}`);
    }

    await fmpTokenBucket.acquire(batchSize);
    this.callStats.totalCalls += batchSize;

    logger.debug('[FMP Rate Limit] Permit acquired for batch', {
      batchSize,
      totalCalls: this.callStats.totalCalls,
      tokensRemaining: fmpTokenBucket.getState().tokens.toFixed(2),
    });
  }

  /**
   * Try to acquire permit without waiting
   *
   * Non-blocking version. Returns immediately with success/failure.
   * Use this for optional calls or when you want to skip if rate limited.
   *
   * @param count - Number of permits to acquire. Default: 1
   * @returns true if acquired, false if not enough tokens
   *
   * @example
   * ```typescript
   * if (fmpRateLimitService.tryAcquire(1)) {
   *   const data = await fmpProvider.getData(symbol);
   * } else {
   *   // Skip or queue for later
   * }
   * ```
   */
  tryAcquire(count: number = 1): boolean {
    const success = fmpTokenBucket.tryAcquire(count);

    if (success) {
      this.callStats.totalCalls += count;
      logger.debug('[FMP Rate Limit] Try-acquire succeeded', {
        count,
        tokensRemaining: fmpTokenBucket.getState().tokens.toFixed(2),
      });
    } else {
      logger.debug('[FMP Rate Limit] Try-acquire failed', {
        count,
        tokensAvailable: fmpTokenBucket.getState().tokens.toFixed(2),
      });
    }

    return success;
  }

  /**
   * Record API response (success or failure)
   *
   * Call this after every FMP API call to track metrics and
   * activate adaptive rate limiting on HTTP 429 errors.
   *
   * @param statusCode - HTTP status code
   * @param responseTimeMs - Response time in milliseconds
   *
   * @example
   * ```typescript
   * const start = Date.now();
   * await fmpRateLimitService.acquireForCall();
   * const response = await fetch(fmpUrl);
   * const elapsed = Date.now() - start;
   * fmpRateLimitService.recordResponse(response.status, elapsed);
   * ```
   */
  recordResponse(statusCode: number, responseTimeMs: number): void {
    // Track response time
    this.callStats.responseTimes.push(responseTimeMs);

    // Keep only last 100 response times for memory efficiency
    if (this.callStats.responseTimes.length > 100) {
      this.callStats.responseTimes.shift();
    }

    // Track success/failure
    if (statusCode >= 200 && statusCode < 300) {
      this.callStats.successfulCalls++;
      fmpTokenBucket.recordSuccess();

      logger.debug('[FMP Rate Limit] Call succeeded', {
        statusCode,
        responseTimeMs,
        successRate: this.getSuccessRate().toFixed(1) + '%',
      });
    } else if (statusCode === 429) {
      this.callStats.failedCalls++;
      this.callStats.http429Errors++;
      fmpTokenBucket.recordError(true); // Activate adaptive backoff

      logger.error('[FMP Rate Limit] HTTP 429 Too Many Requests', {
        statusCode,
        responseTimeMs,
        http429Count: this.callStats.http429Errors,
        consecutiveErrors: fmpTokenBucket.getMetrics().errorCount,
      });
    } else {
      this.callStats.failedCalls++;
      fmpTokenBucket.recordError(false);

      logger.warn('[FMP Rate Limit] Call failed', {
        statusCode,
        responseTimeMs,
        failureRate: ((this.callStats.failedCalls / this.callStats.totalCalls) * 100).toFixed(1) + '%',
      });
    }
  }

  /**
   * Get current call statistics
   *
   * @returns Comprehensive statistics including token bucket metrics
   */
  getStats(): FMPCallStats {
    const responseTimes = this.callStats.responseTimes;
    const avgResponseTimeMs =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

    return {
      totalCalls: this.callStats.totalCalls,
      successfulCalls: this.callStats.successfulCalls,
      failedCalls: this.callStats.failedCalls,
      http429Errors: this.callStats.http429Errors,
      avgResponseTimeMs,
      tokenBucket: fmpTokenBucket.getMetrics(),
    };
  }

  /**
   * Get success rate as percentage
   *
   * @returns Success rate (0-100)
   */
  getSuccessRate(): number {
    if (this.callStats.totalCalls === 0) {
      return 100;
    }
    return (this.callStats.successfulCalls / this.callStats.totalCalls) * 100;
  }

  /**
   * Get current token bucket state
   *
   * @returns Current state including tokens available and utilization
   */
  getState() {
    return fmpTokenBucket.getState();
  }

  /**
   * Check if rate limiter is healthy
   *
   * A healthy rate limiter has:
   * - HTTP 429 errors < 1% of total calls
   * - Success rate > 95%
   * - No active backoff
   *
   * @returns true if healthy, false otherwise
   */
  isHealthy(): boolean {
    const stats = this.getStats();
    const state = this.getState();

    const http429Rate = stats.totalCalls > 0 ? (stats.http429Errors / stats.totalCalls) * 100 : 0;
    const successRate = this.getSuccessRate();

    const isHealthy =
      http429Rate < 1.0 && // Less than 1% HTTP 429 errors
      successRate > 95.0 && // More than 95% success rate
      !state.isThrottling; // Not actively throttling

    if (!isHealthy) {
      logger.warn('[FMP Rate Limit] Health check failed', {
        http429Rate: http429Rate.toFixed(2) + '%',
        successRate: successRate.toFixed(2) + '%',
        isThrottling: state.isThrottling,
        tokensRemaining: state.tokens.toFixed(2),
      });
    }

    return isHealthy;
  }

  /**
   * Reset all statistics (useful for testing and monitoring)
   */
  resetStats(): void {
    this.callStats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      http429Errors: 0,
      responseTimes: [],
    };

    fmpTokenBucket.resetMetrics();

    logger.info('[FMP Rate Limit] Statistics reset');
  }

  /**
   * Reset token bucket to full capacity (useful for testing)
   */
  reset(): void {
    fmpTokenBucket.reset();
    this.resetStats();

    logger.info('[FMP Rate Limit] Service reset');
  }

  /**
   * Get health report for monitoring
   *
   * @returns Comprehensive health report
   */
  getHealthReport() {
    const stats = this.getStats();
    const state = this.getState();
    const isHealthy = this.isHealthy();

    return {
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      state: {
        tokens: state.tokens,
        capacity: state.capacity,
        refillRate: state.refillRate,
        utilizationPercent: state.utilizationPercent,
        isThrottling: state.isThrottling,
      },
      stats: {
        totalCalls: stats.totalCalls,
        successfulCalls: stats.successfulCalls,
        failedCalls: stats.failedCalls,
        http429Errors: stats.http429Errors,
        successRate: this.getSuccessRate().toFixed(2) + '%',
        avgResponseTimeMs: stats.avgResponseTimeMs.toFixed(0),
      },
      tokenBucket: {
        totalAcquired: stats.tokenBucket.totalAcquired,
        totalWaited: stats.tokenBucket.totalWaited,
        avgWaitTimeMs: stats.tokenBucket.avgWaitTimeMs.toFixed(0),
        maxWaitTimeMs: stats.tokenBucket.maxWaitTimeMs,
        uptime: Math.floor(stats.tokenBucket.uptime / 1000) + 's',
      },
      issues: this.detectIssues(),
    };
  }

  /**
   * Detect potential issues
   *
   * @returns Array of issue descriptions
   */
  private detectIssues(): string[] {
    const issues: string[] = [];
    const stats = this.getStats();
    const state = this.getState();

    // Check for high HTTP 429 rate
    if (stats.totalCalls > 0) {
      const http429Rate = (stats.http429Errors / stats.totalCalls) * 100;
      if (http429Rate > 5) {
        issues.push(`High HTTP 429 rate: ${http429Rate.toFixed(1)}%`);
      }
    }

    // Check for low success rate
    const successRate = this.getSuccessRate();
    if (stats.totalCalls > 10 && successRate < 90) {
      issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
    }

    // Check for excessive throttling
    if (state.isThrottling && state.utilizationPercent > 90) {
      issues.push(`High utilization: ${state.utilizationPercent.toFixed(1)}%`);
    }

    // Check for high wait times
    if (stats.tokenBucket.avgWaitTimeMs > 1000) {
      issues.push(`High avg wait time: ${stats.tokenBucket.avgWaitTimeMs.toFixed(0)}ms`);
    }

    return issues;
  }
}

/**
 * Global FMP Rate Limit Service instance
 *
 * Use this singleton for all FMP API calls.
 *
 * @example
 * ```typescript
 * import { fmpRateLimitService } from '@/services/fmp-rate-limit-service';
 *
 * // Single call
 * await fmpRateLimitService.acquireForCall();
 * const data = await fetch(fmpUrl);
 *
 * // Batch call
 * await fmpRateLimitService.acquireForBatch(8);
 * const results = await Promise.all(batchCalls);
 * ```
 */
export const fmpRateLimitService = new FMPRateLimitService();
