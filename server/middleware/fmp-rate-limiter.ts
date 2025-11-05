/**
 * FMP Rate Limiter - P0 Critical Fix (FASE 1 - Issue #1)
 *
 * Problem: IV endpoint amplification (1 IV req = 10-15 FMP calls)
 * - FMP limit: 4 calls/sec (300 calls/min)
 * - Budget allocated for IV: 200 calls/min
 * - Current issue: Validation script (1 IV req/sec) → 10-15 FMP calls/sec → EXCEEDS LIMIT
 *
 * Solution: Intelligent rate limiter with token bucket algorithm
 * - Pre-request budget check (estimate 12 FMP calls per IV)
 * - Automatic throttling when budget exceeded
 * - Exponential backoff retry logic (3 attempts)
 * - Circuit breaker (don't cache 429 errors)
 *
 * Expected Impact:
 * - Zero HTTP 429 errors
 * - Validation time: ~1h 33min (1,493 stocks × 12 calls ÷ 200/min)
 * - 35.2% recovery (141/400 stocks currently failing due to rate exhaustion)
 */

import { logger } from '../lib/logger';

/**
 * Sleep helper for async delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * FMP Rate Limiter Configuration
 */
interface FMPRateLimiterConfig {
  /** Max calls per minute allocated for IV endpoints */
  budgetPerMinute: number;
  /** Estimated FMP calls per IV calculation */
  estimatedCallsPerIV: number;
  /** Enable exponential backoff on budget exhaustion */
  enableRetry: boolean;
  /** Max retry attempts */
  maxRetries: number;
  /** Base backoff delay in ms */
  baseBackoffMs: number;
}

/**
 * Rate Limiter Statistics
 */
interface RateLimiterStats {
  totalRequests: number;
  throttledRequests: number;
  retriedRequests: number;
  budgetExhaustedCount: number;
  currentUsed: number;
  currentBudget: number;
  resetTime: number;
}

/**
 * FMP Rate Limiter Class
 *
 * Implements token bucket algorithm with intelligent throttling:
 * 1. Pre-request budget check (prevents 429 errors)
 * 2. Automatic wait-and-retry when budget exhausted
 * 3. Per-minute window reset (aligned with FMP rate limits)
 * 4. Detailed logging for monitoring
 */
export class FMPRateLimiter {
  private budget: number; // calls/min for IV
  private used: number = 0;
  private resetTime: number;
  private config: FMPRateLimiterConfig;
  private stats: RateLimiterStats;

  constructor(config?: Partial<FMPRateLimiterConfig>) {
    this.config = {
      budgetPerMinute: config?.budgetPerMinute || 200, // 200 calls/min for IV (67% of 300 total)
      estimatedCallsPerIV: config?.estimatedCallsPerIV || 12, // Estimate 12 FMP calls per IV
      enableRetry: config?.enableRetry ?? true,
      maxRetries: config?.maxRetries || 3,
      baseBackoffMs: config?.baseBackoffMs || 1000, // 1 second base delay
    };

    this.budget = this.config.budgetPerMinute;
    this.resetTime = Date.now() + 60000; // Reset every minute

    this.stats = {
      totalRequests: 0,
      throttledRequests: 0,
      retriedRequests: 0,
      budgetExhaustedCount: 0,
      currentUsed: 0,
      currentBudget: this.budget,
      resetTime: this.resetTime,
    };

    logger.info('[FMP Rate Limiter] Initialized', {
      budgetPerMinute: this.config.budgetPerMinute,
      estimatedCallsPerIV: this.config.estimatedCallsPerIV,
      enableRetry: this.config.enableRetry,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Check if budget is available for estimated FMP calls
   * Automatically waits and retries if budget exhausted
   *
   * @param estimatedCalls - Number of FMP calls expected for this operation
   * @param attempt - Current retry attempt (internal, don't set manually)
   * @returns Promise resolving to true when budget available
   * @throws Error if max retries exceeded (should not happen with proper config)
   */
  async checkBudget(estimatedCalls?: number, attempt: number = 1): Promise<boolean> {
    const calls = estimatedCalls || this.config.estimatedCallsPerIV;
    const now = Date.now();

    // Reset window if minute elapsed
    if (now > this.resetTime) {
      const previousUsed = this.used;
      this.used = 0;
      this.resetTime = now + 60000;

      logger.info('[FMP Rate Limiter] Budget window reset', {
        previousUsed,
        budget: this.budget,
        utilization: ((previousUsed / this.budget) * 100).toFixed(1) + '%',
        nextReset: new Date(this.resetTime).toISOString(),
      });

      // Update stats
      this.stats.currentUsed = 0;
      this.stats.resetTime = this.resetTime;
    }

    // Check if budget available
    if (this.used + calls > this.budget) {
      const waitTime = this.resetTime - now;
      const utilizationPct = ((this.used / this.budget) * 100).toFixed(1);

      this.stats.budgetExhaustedCount++;
      this.stats.throttledRequests++;

      logger.warn('[FMP Rate Limiter] Budget exhausted, throttling', {
        used: this.used,
        budget: this.budget,
        requested: calls,
        utilization: utilizationPct + '%',
        waitTimeMs: waitTime,
        attempt,
        maxRetries: this.config.maxRetries,
      });

      // If retry enabled, wait until next window
      if (this.config.enableRetry && attempt <= this.config.maxRetries) {
        // Exponential backoff: wait = baseBackoff * 2^(attempt-1)
        const backoffMs = this.config.baseBackoffMs * Math.pow(2, attempt - 1);
        const totalWaitMs = Math.max(waitTime, backoffMs);

        logger.info('[FMP Rate Limiter] Waiting for next budget window', {
          waitTimeMs: totalWaitMs,
          backoffMs,
          attempt,
        });

        await sleep(totalWaitMs);
        this.stats.retriedRequests++;

        // Retry budget check (recursive call with incremented attempt)
        return this.checkBudget(calls, attempt + 1);
      } else if (attempt > this.config.maxRetries) {
        // Max retries exceeded (should be rare with 60s window resets)
        logger.error('[FMP Rate Limiter] Max retries exceeded', {
          attempt,
          maxRetries: this.config.maxRetries,
          used: this.used,
          budget: this.budget,
        });
        throw new Error(`FMP rate limit: max retries (${this.config.maxRetries}) exceeded`);
      } else {
        // Retry disabled - return false immediately
        return false;
      }
    }

    // Budget available - reserve tokens
    this.used += calls;
    this.stats.totalRequests++;
    this.stats.currentUsed = this.used;

    const utilizationPct = ((this.used / this.budget) * 100).toFixed(1);

    logger.debug('[FMP Rate Limiter] Budget reserved', {
      reserved: calls,
      used: this.used,
      budget: this.budget,
      remaining: this.budget - this.used,
      utilization: utilizationPct + '%',
      resetIn: Math.ceil((this.resetTime - Date.now()) / 1000) + 's',
    });

    return true;
  }

  /**
   * Get current rate limiter statistics
   * Useful for monitoring and debugging
   */
  getStats(): Readonly<RateLimiterStats> {
    return {
      ...this.stats,
      currentUsed: this.used,
      currentBudget: this.budget,
      resetTime: this.resetTime,
    };
  }

  /**
   * Reset rate limiter statistics (for testing/monitoring)
   * Does NOT reset budget - only stats counters
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      throttledRequests: 0,
      retriedRequests: 0,
      budgetExhaustedCount: 0,
      currentUsed: this.used,
      currentBudget: this.budget,
      resetTime: this.resetTime,
    };

    logger.info('[FMP Rate Limiter] Stats reset');
  }

  /**
   * Force reset budget window (for testing only)
   * WARNING: Use only in test environments
   */
  forceResetBudget(): void {
    this.used = 0;
    this.resetTime = Date.now() + 60000;

    logger.warn('[FMP Rate Limiter] Budget forcefully reset (TEST MODE)');
  }

  /**
   * Get current budget utilization as percentage
   */
  getUtilization(): number {
    return (this.used / this.budget) * 100;
  }

  /**
   * Check if budget is currently available without reserving
   */
  isBudgetAvailable(estimatedCalls?: number): boolean {
    const calls = estimatedCalls || this.config.estimatedCallsPerIV;
    return this.used + calls <= this.budget;
  }

  /**
   * Get time until next budget reset (in milliseconds)
   */
  getTimeUntilReset(): number {
    return Math.max(0, this.resetTime - Date.now());
  }
}

/**
 * Global FMP Rate Limiter instance
 * Shared across all IV calculations to enforce budget
 */
export const fmpRateLimiter = new FMPRateLimiter({
  budgetPerMinute: parseInt(process.env.FMP_IV_BUDGET_PER_MIN || '200', 10),
  estimatedCallsPerIV: parseInt(process.env.FMP_ESTIMATED_CALLS_PER_IV || '12', 10),
  enableRetry: process.env.FMP_RATE_LIMITER_RETRY !== 'false', // Enabled by default
  maxRetries: parseInt(process.env.FMP_RATE_LIMITER_MAX_RETRIES || '3', 10),
  baseBackoffMs: parseInt(process.env.FMP_RATE_LIMITER_BACKOFF_MS || '1000', 10),
});

/**
 * Express middleware to enforce FMP rate limiting on IV routes
 *
 * Usage:
 * router.get('/api/iv/:ticker/chart', fmpRateLimitMiddleware, getIVChart);
 *
 * Note: This is optional - controller can call fmpRateLimiter.checkBudget() directly
 * for more granular control
 */
export async function fmpRateLimitMiddleware(
  req: any,
  res: any,
  next: any
): Promise<void> {
  try {
    const ticker = req.params.ticker || 'UNKNOWN';

    logger.debug('[FMP Rate Limit Middleware] Checking budget', {
      ticker,
      path: req.path,
    });

    // Check budget (will wait and retry if exhausted)
    await fmpRateLimiter.checkBudget();

    // Budget available - proceed to controller
    next();
  } catch (error: any) {
    logger.error('[FMP Rate Limit Middleware] Budget check failed', {
      error: error.message,
      ticker: req.params.ticker,
    });

    // Return 429 Too Many Requests
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'FMP API rate limit exceeded. Please try again in a moment.',
      retryAfter: Math.ceil(fmpRateLimiter.getTimeUntilReset() / 1000), // seconds
      stats: fmpRateLimiter.getStats(),
    });
  }
}
