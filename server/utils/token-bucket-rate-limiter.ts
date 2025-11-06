/**
 * Token Bucket Rate Limiter - Agent 8 Implementation
 *
 * Production-grade token bucket algorithm that allows burst traffic
 * while respecting FMP's 4 req/s sustained limit.
 *
 * Features:
 * - Burst allowance: 8 tokens (8 simultaneous calls)
 * - Sustained rate: 4 tokens/sec (FMP limit)
 * - Adaptive rate limiting (backs off on HTTP 429)
 * - Comprehensive monitoring and metrics
 * - Thread-safe implementation
 *
 * Example Usage:
 * ```typescript
 * const limiter = new TokenBucketRateLimiter(8, 4, 'FMP');
 * await limiter.acquire(1); // Wait for 1 token
 * // Make API call...
 * limiter.recordSuccess(); // Record success
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Token_bucket
 */

import { logger } from '../lib/logger';

/**
 * Token Bucket State for monitoring
 */
export interface TokenBucketState {
  tokens: number;
  capacity: number;
  refillRate: number;
  utilizationPercent: number;
  isThrottling: boolean;
}

/**
 * Token Bucket Metrics for performance analysis
 */
export interface TokenBucketMetrics {
  totalAcquired: number;
  totalWaited: number;
  avgWaitTimeMs: number;
  maxWaitTimeMs: number;
  minWaitTimeMs: number;
  http429Count: number;
  successCount: number;
  errorCount: number;
  uptime: number;
  state: TokenBucketState;
}

/**
 * Configuration options for TokenBucketRateLimiter
 */
export interface TokenBucketConfig {
  /** Maximum tokens (burst allowance) */
  capacity?: number;
  /** Tokens added per second (sustained rate) */
  refillRate?: number;
  /** Identifier for logging */
  name?: string;
  /** Enable adaptive rate limiting (backs off on 429) */
  adaptive?: boolean;
  /** Max consecutive errors before backing off */
  maxConsecutiveErrors?: number;
}

/**
 * Production-Grade Token Bucket Rate Limiter
 *
 * Implements the token bucket algorithm with burst allowance and sustained rate.
 * Allows up to `capacity` tokens instantly (burst), then throttles to `refillRate`.
 *
 * Key features:
 * - Burst traffic support (8 parallel calls)
 * - Sustained rate enforcement (4 req/s)
 * - Adaptive rate limiting (backs off on HTTP 429)
 * - Comprehensive metrics and monitoring
 * - Thread-safe implementation
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;
  private readonly name: string;
  private readonly adaptive: boolean;
  private readonly maxConsecutiveErrors: number;

  // Adaptive rate limiting state
  private consecutiveErrors = 0;
  private backoffActive = false;
  private backoffUntil = 0;

  // Metrics
  private metrics = {
    totalAcquired: 0,
    totalWaited: 0,
    waitTimes: [] as number[],
    http429Count: 0,
    successCount: 0,
    errorCount: 0,
    startTime: Date.now()
  };

  /**
   * Create a new Token Bucket Rate Limiter
   *
   * @param capacity - Maximum tokens (burst allowance). Default: 8
   * @param refillRate - Tokens added per second (sustained rate). Default: 4
   * @param name - Identifier for logging. Default: 'default'
   * @param adaptive - Enable adaptive rate limiting. Default: true
   * @param maxConsecutiveErrors - Max consecutive errors before backing off. Default: 3
   */
  constructor(
    capacity: number = 8,
    refillRate: number = 4,
    name: string = 'default',
    adaptive: boolean = true,
    maxConsecutiveErrors: number = 3
  ) {
    if (capacity <= 0 || refillRate <= 0) {
      throw new Error(`Invalid token bucket config: capacity=${capacity}, refillRate=${refillRate}`);
    }

    if (refillRate > capacity) {
      logger.warn(`[TokenBucket:${name}] Refill rate (${refillRate}) > capacity (${capacity}). Consider increasing capacity.`);
    }

    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity; // Start full
    this.lastRefill = Date.now();
    this.name = name;
    this.adaptive = adaptive;
    this.maxConsecutiveErrors = maxConsecutiveErrors;

    logger.info(`[TokenBucket:${name}] Initialized`, {
      capacity,
      refillRate,
      adaptive,
      maxConsecutiveErrors,
      burstAllowance: `${capacity} calls`,
      sustainedRate: `${refillRate} req/s`,
    });
  }

  /**
   * Acquire tokens (wait if not enough available)
   *
   * This method will block (async wait) until enough tokens are available.
   * Tokens are refilled continuously at the configured rate.
   *
   * @param permits - Number of tokens to acquire. Default: 1
   * @returns Promise that resolves when tokens are available
   * @throws Error if permits > capacity
   *
   * @example
   * ```typescript
   * // Acquire 1 token (single API call)
   * await limiter.acquire(1);
   *
   * // Acquire 3 tokens (batch request with 3 symbols)
   * await limiter.acquire(3);
   * ```
   */
  async acquire(permits: number = 1): Promise<void> {
    if (permits > this.capacity) {
      throw new Error(
        `[TokenBucket:${this.name}] Requested ${permits} tokens exceeds capacity ${this.capacity}`
      );
    }

    const startWait = Date.now();
    let hadToWait = false;

    // Check if backoff is active
    if (this.backoffActive && Date.now() < this.backoffUntil) {
      const backoffWaitMs = this.backoffUntil - Date.now();
      logger.warn(`[TokenBucket:${this.name}] Backoff active, waiting ${backoffWaitMs}ms`, {
        consecutiveErrors: this.consecutiveErrors,
        backoffUntil: new Date(this.backoffUntil).toISOString(),
      });
      await this.sleep(backoffWaitMs);
      this.backoffActive = false;
      hadToWait = true;
    }

    // Refill tokens based on time passed
    this.refill();

    // Wait until enough tokens available
    while (this.tokens < permits) {
      hadToWait = true;
      const tokensNeeded = permits - this.tokens;
      const waitTimeMs = (tokensNeeded / this.refillRate) * 1000;

      logger.debug(`[TokenBucket:${this.name}] Waiting ${waitTimeMs.toFixed(0)}ms for ${tokensNeeded.toFixed(2)} tokens`, {
        currentTokens: this.tokens.toFixed(2),
        needed: permits,
        capacity: this.capacity,
        refillRate: this.refillRate,
      });

      await this.sleep(waitTimeMs);
      this.refill();
    }

    // Consume tokens
    this.tokens -= permits;
    this.metrics.totalAcquired += permits;

    // Record wait time if we had to wait
    if (hadToWait) {
      const waitTime = Date.now() - startWait;
      this.metrics.totalWaited++;
      this.metrics.waitTimes.push(waitTime);

      // Keep only last 100 wait times for memory efficiency
      if (this.metrics.waitTimes.length > 100) {
        this.metrics.waitTimes.shift();
      }
    }

    const utilizationPct = ((this.capacity - this.tokens) / this.capacity) * 100;

    logger.debug(`[TokenBucket:${this.name}] Acquired ${permits} tokens`, {
      remaining: this.tokens.toFixed(2),
      capacity: this.capacity,
      utilization: `${utilizationPct.toFixed(1)}%`,
      waitedMs: hadToWait ? (Date.now() - startWait) : 0,
    });
  }

  /**
   * Try to acquire tokens without waiting
   *
   * Non-blocking version of acquire(). Returns immediately with
   * success/failure status.
   *
   * @param permits - Number of tokens to acquire. Default: 1
   * @returns true if acquired, false if not enough tokens
   *
   * @example
   * ```typescript
   * if (limiter.tryAcquire(1)) {
   *   // Make API call
   * } else {
   *   // Skip or queue for later
   * }
   * ```
   */
  tryAcquire(permits: number = 1): boolean {
    this.refill();

    if (this.tokens >= permits) {
      this.tokens -= permits;
      this.metrics.totalAcquired += permits;

      logger.debug(`[TokenBucket:${this.name}] Try-acquired ${permits} tokens`, {
        remaining: this.tokens.toFixed(2),
        capacity: this.capacity,
      });

      return true;
    }

    logger.debug(`[TokenBucket:${this.name}] Try-acquire failed`, {
      requested: permits,
      available: this.tokens.toFixed(2),
    });

    return false;
  }

  /**
   * Refill tokens based on time elapsed
   *
   * Calculates how many tokens should be added since last refill
   * and updates the token count (capped at capacity).
   *
   * @private
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds

    if (timePassed <= 0) {
      return; // No time passed
    }

    const tokensToAdd = timePassed * this.refillRate;
    const oldTokens = this.tokens;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);

    if (this.tokens > oldTokens) {
      logger.debug(`[TokenBucket:${this.name}] Refilled ${(this.tokens - oldTokens).toFixed(2)} tokens`, {
        tokens: this.tokens.toFixed(2),
        capacity: this.capacity,
        timePassed: `${timePassed.toFixed(2)}s`,
      });
    }

    this.lastRefill = now;
  }

  /**
   * Record a successful API call
   *
   * Resets consecutive error counter for adaptive rate limiting.
   * Call this after a successful API response.
   *
   * @example
   * ```typescript
   * await limiter.acquire(1);
   * const response = await fetch(url);
   * limiter.recordSuccess(); // Reset error counter
   * ```
   */
  recordSuccess(): void {
    this.consecutiveErrors = 0;
    this.metrics.successCount++;

    logger.debug(`[TokenBucket:${this.name}] Success recorded`, {
      totalSuccess: this.metrics.successCount,
      consecutiveErrors: this.consecutiveErrors,
    });
  }

  /**
   * Record a failed API call (HTTP 429 or other error)
   *
   * Increments consecutive error counter. If max consecutive errors
   * reached, activates exponential backoff.
   *
   * @param isHttp429 - Whether this was an HTTP 429 error. Default: false
   *
   * @example
   * ```typescript
   * await limiter.acquire(1);
   * try {
   *   const response = await fetch(url);
   *   if (response.status === 429) {
   *     limiter.recordError(true); // Activate backoff
   *   } else {
   *     limiter.recordSuccess();
   *   }
   * } catch (error) {
   *   limiter.recordError(false);
   * }
   * ```
   */
  recordError(isHttp429: boolean = false): void {
    this.consecutiveErrors++;
    this.metrics.errorCount++;

    if (isHttp429) {
      this.metrics.http429Count++;
      logger.error(`[TokenBucket:${this.name}] HTTP 429 recorded`, {
        consecutiveErrors: this.consecutiveErrors,
        maxConsecutiveErrors: this.maxConsecutiveErrors,
        totalHttp429: this.metrics.http429Count,
      });
    }

    // Activate backoff if max consecutive errors reached
    if (this.adaptive && this.consecutiveErrors >= this.maxConsecutiveErrors) {
      const backoffMs = 5000 * Math.pow(2, Math.min(this.consecutiveErrors - this.maxConsecutiveErrors, 3));
      this.backoffActive = true;
      this.backoffUntil = Date.now() + backoffMs;

      logger.warn(`[TokenBucket:${this.name}] Activating backoff`, {
        consecutiveErrors: this.consecutiveErrors,
        backoffMs,
        backoffUntil: new Date(this.backoffUntil).toISOString(),
      });
    }
  }

  /**
   * Get current state for monitoring
   *
   * Returns current token count, capacity, utilization, and throttling status.
   * Useful for dashboards and monitoring systems.
   *
   * @returns Current state snapshot
   *
   * @example
   * ```typescript
   * const state = limiter.getState();
   * console.log(`Tokens: ${state.tokens}/${state.capacity}`);
   * console.log(`Utilization: ${state.utilizationPercent.toFixed(1)}%`);
   * ```
   */
  getState(): TokenBucketState {
    this.refill();

    const utilizationPercent = ((this.capacity - this.tokens) / this.capacity) * 100;
    const isThrottling = this.tokens < this.capacity * 0.2; // Less than 20% tokens remaining

    return {
      tokens: this.tokens,
      capacity: this.capacity,
      refillRate: this.refillRate,
      utilizationPercent,
      isThrottling,
    };
  }

  /**
   * Get comprehensive metrics for performance analysis
   *
   * Returns detailed metrics including:
   * - Total tokens acquired
   * - Wait statistics (count, avg, min, max)
   * - Error counts (total, HTTP 429)
   * - Success count
   * - Uptime
   * - Current state
   *
   * @returns Comprehensive metrics snapshot
   *
   * @example
   * ```typescript
   * const metrics = limiter.getMetrics();
   * console.log(`Total acquired: ${metrics.totalAcquired}`);
   * console.log(`Avg wait time: ${metrics.avgWaitTimeMs.toFixed(0)}ms`);
   * console.log(`HTTP 429 count: ${metrics.http429Count}`);
   * ```
   */
  getMetrics(): TokenBucketMetrics {
    const waitTimes = this.metrics.waitTimes;
    const avgWaitTimeMs = waitTimes.length > 0
      ? waitTimes.reduce((sum, t) => sum + t, 0) / waitTimes.length
      : 0;
    const maxWaitTimeMs = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;
    const minWaitTimeMs = waitTimes.length > 0 ? Math.min(...waitTimes) : 0;

    return {
      totalAcquired: this.metrics.totalAcquired,
      totalWaited: this.metrics.totalWaited,
      avgWaitTimeMs,
      maxWaitTimeMs,
      minWaitTimeMs,
      http429Count: this.metrics.http429Count,
      successCount: this.metrics.successCount,
      errorCount: this.metrics.errorCount,
      uptime: Date.now() - this.metrics.startTime,
      state: this.getState(),
    };
  }

  /**
   * Reset to full capacity (useful for testing)
   *
   * Resets token count to capacity and clears backoff state.
   * Does NOT reset metrics.
   *
   * @example
   * ```typescript
   * // Reset for next test
   * limiter.reset();
   * ```
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.consecutiveErrors = 0;
    this.backoffActive = false;
    this.backoffUntil = 0;

    logger.info(`[TokenBucket:${this.name}] Reset to full capacity`, {
      capacity: this.capacity,
    });
  }

  /**
   * Reset all metrics (useful for testing and monitoring)
   *
   * Resets all counters and statistics to zero.
   * Does NOT reset token count or backoff state.
   *
   * @example
   * ```typescript
   * // Reset metrics for new monitoring window
   * limiter.resetMetrics();
   * ```
   */
  resetMetrics(): void {
    this.metrics = {
      totalAcquired: 0,
      totalWaited: 0,
      waitTimes: [],
      http429Count: 0,
      successCount: 0,
      errorCount: 0,
      startTime: Date.now(),
    };

    logger.info(`[TokenBucket:${this.name}] Metrics reset`);
  }

  /**
   * Sleep helper for async delays
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a token bucket with configuration from environment
 *
 * Environment variables:
 * - FMP_RATE_LIMIT_CAPACITY: Maximum tokens (default: 8)
 * - FMP_RATE_LIMIT_REFILL_RATE: Tokens per second (default: 4)
 * - FMP_RATE_LIMIT_ENABLED: Enable rate limiting (default: true)
 * - FMP_RATE_LIMIT_ADAPTIVE: Enable adaptive rate limiting (default: true)
 *
 * @param config - Optional configuration overrides
 * @returns Configured TokenBucketRateLimiter instance
 *
 * @example
 * ```typescript
 * const limiter = createTokenBucket({ name: 'FMP' });
 * ```
 */
export function createTokenBucket(config?: TokenBucketConfig): TokenBucketRateLimiter {
  const capacity = config?.capacity ?? parseInt(process.env.FMP_RATE_LIMIT_CAPACITY || '8', 10);
  const refillRate = config?.refillRate ?? parseInt(process.env.FMP_RATE_LIMIT_REFILL_RATE || '4', 10);
  const name = config?.name ?? 'default';
  const adaptive = config?.adaptive ?? (process.env.FMP_RATE_LIMIT_ADAPTIVE !== 'false');
  const maxConsecutiveErrors = config?.maxConsecutiveErrors ?? 3;

  return new TokenBucketRateLimiter(
    capacity,
    refillRate,
    name,
    adaptive,
    maxConsecutiveErrors
  );
}

/**
 * Global FMP rate limiter instance
 *
 * Configured for FMP API limits:
 * - Capacity: 8 tokens (burst allowance)
 * - Refill Rate: 4 tokens/sec (sustained rate)
 * - Adaptive: true (backs off on HTTP 429)
 *
 * @example
 * ```typescript
 * import { fmpTokenBucket } from '@/utils/token-bucket-rate-limiter';
 *
 * await fmpTokenBucket.acquire(1);
 * const response = await fetch(fmpUrl);
 * if (response.status === 429) {
 *   fmpTokenBucket.recordError(true);
 * } else {
 *   fmpTokenBucket.recordSuccess();
 * }
 * ```
 */
export const fmpTokenBucket = createTokenBucket({ name: 'FMP' });
