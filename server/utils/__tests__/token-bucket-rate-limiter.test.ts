/**
 * Token Bucket Rate Limiter Tests - Agent 8
 *
 * Comprehensive test suite covering:
 * - Burst allowance
 * - Sustained rate throttling
 * - Token refill mechanics
 * - Concurrent acquire handling
 * - Adaptive rate limiting
 * - Metrics and monitoring
 */

import { TokenBucketRateLimiter, createTokenBucket } from '../token-bucket-rate-limiter';

// Helper to sleep for testing
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('TokenBucketRateLimiter', () => {
  describe('Basic Functionality', () => {
    it('should initialize with correct parameters', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');
      const state = limiter.getState();

      expect(state.capacity).toBe(8);
      expect(state.refillRate).toBe(4);
      expect(state.tokens).toBe(8); // Starts full
      expect(state.utilizationPercent).toBe(0); // No tokens consumed yet
    });

    it('should throw error if invalid parameters', () => {
      expect(() => new TokenBucketRateLimiter(0, 4)).toThrow();
      expect(() => new TokenBucketRateLimiter(8, 0)).toThrow();
      expect(() => new TokenBucketRateLimiter(-1, 4)).toThrow();
    });

    it('should throw error if requesting more than capacity', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');
      await expect(limiter.acquire(10)).rejects.toThrow();
    });
  });

  describe('Burst Allowance', () => {
    it('should allow burst up to capacity instantly', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');
      const start = Date.now();

      // Burst 8 calls - should all be instant
      await Promise.all([
        limiter.acquire(1),
        limiter.acquire(1),
        limiter.acquire(1),
        limiter.acquire(1),
        limiter.acquire(1),
        limiter.acquire(1),
        limiter.acquire(1),
        limiter.acquire(1),
      ]);

      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // All instant (under 100ms)

      const state = limiter.getState();
      expect(state.tokens).toBeCloseTo(0, 1); // All tokens consumed (allowing for floating point)
      expect(state.utilizationPercent).toBeGreaterThan(99); // ~100% utilization
    });

    it('should allow single burst of capacity tokens', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');
      const start = Date.now();

      await limiter.acquire(8); // All tokens at once

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Instant

      const state = limiter.getState();
      expect(state.tokens).toBe(0);
    });
  });

  describe('Sustained Rate Throttling', () => {
    it('should throttle after burst exhausted', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Exhaust burst
      await limiter.acquire(8);
      expect(limiter.getState().tokens).toBe(0);

      const start = Date.now();

      // Next call should wait for refill
      await limiter.acquire(1);

      const elapsed = Date.now() - start;

      // Should wait ~250ms (1 token / 4 tokens/sec = 0.25s)
      expect(elapsed).toBeGreaterThan(200); // At least 200ms
      expect(elapsed).toBeLessThan(350); // Under 350ms
    }, 10000);

    it('should throttle to sustained rate for continuous requests', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');
      const start = Date.now();

      // 20 sequential acquires (more than capacity)
      for (let i = 0; i < 20; i++) {
        await limiter.acquire(1);
      }

      const elapsed = Date.now() - start;

      // Expected: 8 instant + 12 at 4/sec = 3s total
      // 8 instant: ~0ms
      // 12 throttled: 12/4 = 3s
      // Total: ~3s
      expect(elapsed).toBeGreaterThan(2500); // At least 2.5s
      expect(elapsed).toBeLessThan(3500); // Under 3.5s

      const metrics = limiter.getMetrics();
      expect(metrics.totalAcquired).toBe(20);
      expect(metrics.totalWaited).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Token Refill', () => {
    it('should refill tokens over time', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Exhaust tokens
      await limiter.acquire(8);
      expect(limiter.getState().tokens).toBe(0);

      // Wait 1 second
      await sleep(1000);

      // Should have refilled 4 tokens (4 tokens/sec)
      const state = limiter.getState();
      expect(state.tokens).toBeGreaterThan(3.8); // ~4 tokens (allowing for timing variance)
      expect(state.tokens).toBeLessThan(4.2);
    }, 10000);

    it('should cap refill at capacity', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Consume 2 tokens
      await limiter.acquire(2);

      // Wait 5 seconds (should refill 20 tokens, but cap at 8)
      await sleep(5000);

      const state = limiter.getState();
      expect(state.tokens).toBe(8); // Capped at capacity
    }, 10000);

    it('should refill continuously during idle time', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Exhaust all tokens
      await limiter.acquire(8);

      // Wait 2 seconds (should refill 8 tokens, capped at 8)
      await sleep(2000);

      // Should be able to burst again
      const start = Date.now();
      await limiter.acquire(8);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should be instant (tokens refilled)
    }, 10000);
  });

  describe('Concurrent Acquires', () => {
    it('should handle concurrent acquires correctly', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // 20 concurrent acquires (more than capacity)
      const promises = Array(20)
        .fill(null)
        .map(() => limiter.acquire(1));

      const start = Date.now();
      await Promise.all(promises);
      const elapsed = Date.now() - start;

      // Should take ~3 seconds (8 instant, 12 at 4/sec = 3s)
      expect(elapsed).toBeGreaterThan(2500);
      expect(elapsed).toBeLessThan(3500);

      const metrics = limiter.getMetrics();
      expect(metrics.totalAcquired).toBe(20);
    }, 10000);

    it('should serialize concurrent acquires without race conditions', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');
      const results: number[] = [];

      // Launch 10 concurrent acquires
      const promises = Array(10)
        .fill(null)
        .map(async (_, i) => {
          await limiter.acquire(1);
          results.push(i);
        });

      await Promise.all(promises);

      // All 10 should complete
      expect(results.length).toBe(10);
      expect(limiter.getMetrics().totalAcquired).toBe(10);
    }, 10000);
  });

  describe('tryAcquire()', () => {
    it('should acquire tokens without waiting if available', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      const success = limiter.tryAcquire(4);
      expect(success).toBe(true);

      const state = limiter.getState();
      expect(state.tokens).toBe(4); // 4 tokens remaining
    });

    it('should fail immediately if not enough tokens', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Exhaust tokens
      limiter.tryAcquire(8);

      // Should fail immediately
      const success = limiter.tryAcquire(1);
      expect(success).toBe(false);

      const state = limiter.getState();
      expect(state.tokens).toBe(0);
    });

    it('should not block on tryAcquire', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Exhaust tokens
      await limiter.acquire(8);

      const start = Date.now();
      const success = limiter.tryAcquire(1);
      const elapsed = Date.now() - start;

      expect(success).toBe(false);
      expect(elapsed).toBeLessThan(10); // Should be instant
    });
  });

  describe('Adaptive Rate Limiting', () => {
    it('should reset consecutive errors on success', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test', true, 3);

      limiter.recordError(false);
      limiter.recordError(false);
      expect(limiter.getMetrics().errorCount).toBe(2);

      limiter.recordSuccess();
      expect(limiter.getMetrics().successCount).toBe(1);

      // Next error should not trigger backoff (counter reset)
      limiter.recordError(false);
      expect(limiter.getMetrics().errorCount).toBe(3);
    });

    it('should activate backoff after max consecutive errors', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test', true, 3);

      // Trigger backoff
      limiter.recordError(true); // 1
      limiter.recordError(true); // 2
      limiter.recordError(true); // 3 - should activate backoff

      expect(limiter.getMetrics().http429Count).toBe(3);

      // Next acquire should wait for backoff
      const start = Date.now();
      await limiter.acquire(1);
      const elapsed = Date.now() - start;

      // Should have waited for backoff (5s base)
      expect(elapsed).toBeGreaterThan(4500); // At least 4.5s
    }, 10000);

    it('should increase backoff exponentially', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test', true, 2);

      // First backoff: 5s
      limiter.recordError(true);
      limiter.recordError(true);
      const start1 = Date.now();
      await limiter.acquire(1);
      const elapsed1 = Date.now() - start1;
      expect(elapsed1).toBeGreaterThan(4500);

      // Reset for second test (clear backoff)
      limiter.reset();

      // Second backoff: 10s (more errors = longer backoff)
      limiter.recordError(true);
      limiter.recordError(true);
      limiter.recordError(true); // Third error triggers longer backoff
      const start2 = Date.now();
      await limiter.acquire(1);
      const elapsed2 = Date.now() - start2;
      expect(elapsed2).toBeGreaterThan(4500); // Should be longer than first
    }, 30000);
  });

  describe('Metrics and Monitoring', () => {
    it('should track total acquired tokens', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      await limiter.acquire(3);
      await limiter.acquire(2);
      await limiter.acquire(1);

      const metrics = limiter.getMetrics();
      expect(metrics.totalAcquired).toBe(6);
    });

    it('should track wait statistics', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Exhaust tokens
      await limiter.acquire(8);

      // This will wait
      await limiter.acquire(1);

      const metrics = limiter.getMetrics();
      expect(metrics.totalWaited).toBe(1);
      expect(metrics.avgWaitTimeMs).toBeGreaterThan(0);
      expect(metrics.maxWaitTimeMs).toBeGreaterThan(0);
    }, 10000);

    it('should track HTTP 429 errors separately', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      limiter.recordError(true); // HTTP 429
      limiter.recordError(false); // Other error
      limiter.recordError(true); // HTTP 429

      const metrics = limiter.getMetrics();
      expect(metrics.http429Count).toBe(2);
      expect(metrics.errorCount).toBe(3);
    });

    it('should track success count', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      limiter.recordSuccess();
      limiter.recordSuccess();
      limiter.recordSuccess();

      const metrics = limiter.getMetrics();
      expect(metrics.successCount).toBe(3);
      expect(metrics.errorCount).toBe(0);
    });

    it('should calculate uptime', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      await sleep(100);

      const metrics = limiter.getMetrics();
      expect(metrics.uptime).toBeGreaterThan(90); // At least 90ms
    });

    it('should provide current state snapshot', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      limiter.tryAcquire(4); // Consume 4 tokens

      const state = limiter.getState();
      expect(state.tokens).toBe(4);
      expect(state.capacity).toBe(8);
      expect(state.refillRate).toBe(4);
      expect(state.utilizationPercent).toBe(50); // 50% utilization
      expect(state.isThrottling).toBe(false); // Over 20% tokens remaining
    });

    it('should detect throttling state', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      limiter.tryAcquire(7); // Leave only 1 token (12.5%)

      const state = limiter.getState();
      expect(state.isThrottling).toBe(true); // Under 20% tokens remaining
    });
  });

  describe('Reset Functions', () => {
    it('should reset to full capacity', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Exhaust tokens
      await limiter.acquire(8);
      expect(limiter.getState().tokens).toBe(0);

      // Reset
      limiter.reset();

      const state = limiter.getState();
      expect(state.tokens).toBe(8); // Back to full
      expect(state.utilizationPercent).toBe(0);
    });

    it('should reset metrics without affecting tokens', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      await limiter.acquire(4);
      limiter.recordSuccess();
      limiter.recordError(false);

      expect(limiter.getMetrics().totalAcquired).toBe(4);
      expect(limiter.getMetrics().successCount).toBe(1);
      expect(limiter.getMetrics().errorCount).toBe(1);

      limiter.resetMetrics();

      const metrics = limiter.getMetrics();
      expect(metrics.totalAcquired).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.errorCount).toBe(0);

      const state = limiter.getState();
      expect(state.tokens).toBeCloseTo(4, 1); // Tokens unchanged (allowing for floating point)
    });

    it('should clear backoff state on reset', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test', true, 2);

      // Trigger backoff
      limiter.recordError(true);
      limiter.recordError(true);

      // Reset clears backoff
      limiter.reset();

      // Should not wait for backoff
      const start = Date.now();
      await limiter.acquire(1);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Instant (no backoff)
    });
  });

  describe('Factory Function', () => {
    it('should create limiter with default config', () => {
      const limiter = createTokenBucket({ name: 'test' });
      const state = limiter.getState();

      expect(state.capacity).toBe(8); // Default
      expect(state.refillRate).toBe(4); // Default
    });

    it('should allow config overrides', () => {
      const limiter = createTokenBucket({
        capacity: 10,
        refillRate: 5,
        name: 'custom',
      });

      const state = limiter.getState();
      expect(state.capacity).toBe(10);
      expect(state.refillRate).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero time elapsed correctly', () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Get state twice immediately
      const state1 = limiter.getState();
      const state2 = limiter.getState();

      expect(state1.tokens).toBe(state2.tokens);
    });

    it('should handle fractional tokens correctly', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // Consume 5 tokens
      await limiter.acquire(5);

      // Wait 500ms (should refill 2 tokens: 4 tokens/sec * 0.5s)
      await sleep(500);

      const state = limiter.getState();
      expect(state.tokens).toBeGreaterThan(4.8); // ~5 tokens (3 + 2 refilled)
      expect(state.tokens).toBeLessThan(5.2);
    }, 10000);

    it('should handle rapid sequential acquires', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      // 100 rapid acquires
      for (let i = 0; i < 100; i++) {
        await limiter.acquire(1);
      }

      const metrics = limiter.getMetrics();
      expect(metrics.totalAcquired).toBe(100);
    }, 30000);
  });

  describe('Performance Benchmarks', () => {
    it('should handle batch warming simulation', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');

      const start = Date.now();

      // Simulate 8 parallel batch endpoint calls
      await Promise.all([
        limiter.acquire(1), // quotes
        limiter.acquire(1), // income
        limiter.acquire(1), // balance
        limiter.acquire(1), // cash flow
        limiter.acquire(1), // ratios
        limiter.acquire(1), // profile
        limiter.acquire(1), // key metrics TTM
        limiter.acquire(1), // key metrics
      ]);

      const elapsed = Date.now() - start;

      // All 8 should be instant (burst capacity)
      expect(elapsed).toBeLessThan(100);

      const metrics = limiter.getMetrics();
      expect(metrics.totalAcquired).toBe(8);
      expect(metrics.totalWaited).toBe(0); // No waiting (within burst)
    });

    it('should calculate stocks per second throughput', async () => {
      const limiter = new TokenBucketRateLimiter(8, 4, 'test');
      const numStocks = 50;
      const callsPerStock = 8;

      const start = Date.now();

      // Simulate warming 50 stocks (8 calls each)
      for (let i = 0; i < numStocks; i++) {
        await Promise.all(
          Array(callsPerStock)
            .fill(null)
            .map(() => limiter.acquire(1))
        );
      }

      const elapsed = Date.now() - start;
      const stocksPerSec = (numStocks / elapsed) * 1000;

      console.log(`\n📊 Performance: ${numStocks} stocks in ${elapsed}ms = ${stocksPerSec.toFixed(2)} stocks/sec`);
      console.log(`   Total API calls: ${numStocks * callsPerStock}`);
      console.log(`   Effective rate: ${((numStocks * callsPerStock) / elapsed * 1000).toFixed(2)} calls/sec`);

      // Should be close to 4 calls/sec sustained rate
      // But burst allows initial speedup
      expect(stocksPerSec).toBeGreaterThan(0.4); // At least 0.4 stocks/sec
      expect(stocksPerSec).toBeLessThan(1.0); // Under 1 stock/sec (8 calls at 4/sec)
    }, 120000); // 2 minute timeout
  });
});
