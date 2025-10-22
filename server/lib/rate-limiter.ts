/**
 * Token Bucket Rate Limiter
 *
 * Implements a token bucket algorithm to limit FMP API calls to 4 req/s
 * (respecting 5 req/s limit with headroom).
 *
 * @example
 * ```typescript
 * import { fmpRateLimiter } from '@/lib/rate-limiter';
 *
 * await fmpRateLimiter.take(); // Wait if necessary, then consume 1 token
 * // Make API call...
 * ```
 */
export class TokenBucket {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;

  /**
   * Creates a new Token Bucket rate limiter
   *
   * @param capacity - Maximum number of tokens in the bucket (default: 4)
   * @param refillRate - Tokens added per second (default: 4)
   */
  constructor(capacity = 4, refillRate = 4) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Take N tokens from the bucket, waiting if necessary
   *
   * This method will block (async wait) until enough tokens are available.
   * Tokens are refilled continuously at the configured rate.
   *
   * @param count - Number of tokens to consume (default: 1)
   * @returns Promise that resolves when tokens have been consumed
   *
   * @example
   * ```typescript
   * // Wait for 1 token
   * await fmpRateLimiter.take();
   *
   * // Wait for 3 tokens (batch request)
   * await fmpRateLimiter.take(3);
   * ```
   */
  async take(count = 1): Promise<void> {
    await this.refill();

    while (this.tokens < count) {
      const waitTime = ((count - this.tokens) / this.refillRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      await this.refill();
    }

    this.tokens -= count;
  }

  /**
   * Refill tokens based on elapsed time
   *
   * Calculates how many tokens should be added since last refill
   * and updates the token count (capped at capacity).
   *
   * @private
   */
  private async refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count (for monitoring)
   *
   * @returns Current number of available tokens (floored to integer)
   *
   * @example
   * ```typescript
   * const available = fmpRateLimiter.getTokens();
   * console.log(`Tokens available: ${available}/4`);
   * ```
   */
  getTokens(): number {
    return Math.floor(this.tokens);
  }
}

/**
 * Singleton global rate limiter for FMP API
 * Configured for 4 req/s (headroom for 5 req/s limit)
 */
export const fmpRateLimiter = new TokenBucket(4, 4);
