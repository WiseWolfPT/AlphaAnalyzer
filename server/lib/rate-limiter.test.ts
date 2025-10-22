/**
 * Token Bucket Rate Limiter - TDD Test Suite
 *
 * Tests follow the AAA pattern (Arrange, Act, Assert)
 * Each test validates a single behavior
 * Tests serve as living documentation for rate limiting behavior
 *
 * NOTE: Uses fake timers for deterministic, fast tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenBucket } from './rate-limiter';

describe('TokenBucket Rate Limiter', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    // Arrange: Create fresh bucket with 4 tokens capacity, 4 tokens/second refill rate
    bucket = new TokenBucket(4, 4);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Token Availability', () => {
    it('should allow taking tokens when available', async () => {
      // Arrange: Bucket starts with 4 tokens
      const startTime = Date.now();

      // Act: Take 1 token (should be instant)
      await bucket.take(1);
      const endTime = Date.now();

      // Assert: Operation completed in less than 10ms (instant)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10);
      expect(bucket.getTokens()).toBe(3); // 4 - 1 = 3 tokens remaining
    });

    it('should block when tokens exhausted', async () => {
      // Arrange: Exhaust all 4 tokens
      await bucket.take(4);
      expect(bucket.getTokens()).toBe(0);

      // Act: Try to take 1 more token (must wait for refill)
      const startTime = Date.now();
      const takePromise = bucket.take(1);

      // Simulate time passing (250ms = time to refill 1 token at 4 req/s)
      await vi.advanceTimersByTimeAsync(250);
      await takePromise;
      const endTime = Date.now();

      // Assert: Had to wait ~250ms for 1 token to refill (4 tokens/s = 250ms per token)
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(200); // Allow some timing variance
      expect(duration).toBeLessThanOrEqual(300);
    });

    it('should handle taking multiple tokens', async () => {
      // Arrange: Bucket starts with 4 tokens

      // Act: Take 3 tokens at once
      await bucket.take(3);

      // Assert: 1 token remaining
      expect(bucket.getTokens()).toBe(1);
    });

    it('should wait for multiple tokens when needed', async () => {
      // Arrange: Take 3 tokens, leaving 1
      await bucket.take(3);
      expect(bucket.getTokens()).toBe(1);

      // Act: Try to take 2 tokens (need to wait for 1 more)
      const takePromise = bucket.take(2);

      // 1 token available, need 1 more = 250ms wait
      await vi.advanceTimersByTimeAsync(250);
      await takePromise;

      // Assert: Successfully took 2 tokens (used existing 1 + waited for 1)
      expect(bucket.getTokens()).toBe(0);
    });
  });

  describe('Token Refill Mechanism', () => {
    it('should refill tokens over time', async () => {
      // Arrange: Take all 4 tokens
      await bucket.take(4);
      expect(bucket.getTokens()).toBe(0);

      // Act: Wait 1 second (should refill 4 tokens at 4 tokens/s rate)
      await vi.advanceTimersByTimeAsync(1000);

      // Trigger refill by attempting an operation
      await bucket.take(0);

      // Assert: All 4 tokens restored
      expect(bucket.getTokens()).toBe(4);
    });

    it('should not exceed capacity when refilling', async () => {
      // Arrange: Take 2 tokens (2 remaining)
      await bucket.take(2);
      expect(bucket.getTokens()).toBe(2);

      // Act: Wait 2 seconds (would refill 8 tokens, but capacity is 4)
      await vi.advanceTimersByTimeAsync(2000);

      // Trigger refill
      await bucket.take(0);

      // Assert: Capped at capacity of 4 tokens (not 2 + 8 = 10)
      expect(bucket.getTokens()).toBe(4);
    });

    it('should refill partial tokens accurately', async () => {
      // Arrange: Take all 4 tokens
      await bucket.take(4);

      // Act: Wait 500ms (should refill 2 tokens at 4 tokens/s)
      await vi.advanceTimersByTimeAsync(500);

      // Trigger refill
      await bucket.take(0);

      // Assert: 2 tokens refilled (0.5s * 4 tokens/s = 2 tokens)
      expect(bucket.getTokens()).toBe(2);
    });

    it('should accumulate tokens gradually', async () => {
      // Arrange: Take all tokens
      await bucket.take(4);

      // Act & Assert: Check refill at different intervals
      await vi.advanceTimersByTimeAsync(250);
      await bucket.take(0);
      expect(bucket.getTokens()).toBe(1); // 0.25s * 4 = 1 token

      await vi.advanceTimersByTimeAsync(250);
      await bucket.take(0);
      expect(bucket.getTokens()).toBe(2); // 0.5s total * 4 = 2 tokens

      await vi.advanceTimersByTimeAsync(500);
      await bucket.take(0);
      expect(bucket.getTokens()).toBe(4); // 1s total * 4 = 4 tokens (capped)
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent take() calls', async () => {
      // Arrange: Fresh bucket with 4 tokens

      // Act: Make 4 concurrent requests
      const promises = [
        bucket.take(1),
        bucket.take(1),
        bucket.take(1),
        bucket.take(1),
      ];

      await Promise.all(promises);

      // Assert: All 4 tokens consumed
      expect(bucket.getTokens()).toBe(0);
    });

    it('should queue requests when tokens exhausted', async () => {
      // Arrange: Fresh bucket with 4 tokens

      // Act: Make 6 concurrent requests (2 more than capacity)
      const promises = [
        bucket.take(1),
        bucket.take(1),
        bucket.take(1),
        bucket.take(1),
        bucket.take(1), // Must wait
        bucket.take(1), // Must wait
      ];

      // First 4 should complete immediately
      await vi.runAllTimersAsync();

      // Assert: After all timers, all requests completed
      await Promise.all(promises);
      expect(bucket.getTokens()).toBeLessThanOrEqual(4);
    });

    it('should maintain FIFO order for queued requests', async () => {
      // Arrange: Exhaust tokens
      await bucket.take(4);

      const executionOrder: number[] = [];

      // Act: Queue 3 requests
      const p1 = bucket.take(1).then(() => executionOrder.push(1));
      const p2 = bucket.take(1).then(() => executionOrder.push(2));
      const p3 = bucket.take(1).then(() => executionOrder.push(3));

      // Advance time to allow all to complete
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.all([p1, p2, p3]);

      // Assert: Requests completed in order
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe('Real-World FMP Rate Limit (4 req/s)', () => {
    it('should match FMP rate limit (4 req/s)', async () => {
      // Arrange: Bucket configured for FMP's 4 req/s limit
      const startTime = Date.now();

      // Act: Make 8 requests (should take ~2 seconds at 4 req/s)
      for (let i = 0; i < 8; i++) {
        const takePromise = bucket.take(1);
        await vi.advanceTimersByTimeAsync(250); // Advance enough for next token
        await takePromise;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert: 8 requests at 4 req/s = 2 seconds
      // First 4 are instant, next 4 take 1 second (250ms each)
      expect(duration).toBeGreaterThanOrEqual(1000); // At least 1 second for the 5th-8th requests
      expect(duration).toBeLessThanOrEqual(2500); // Some tolerance for timing
    });

    it('should allow burst of 4 requests immediately', async () => {
      // Arrange: Fresh bucket
      const startTime = Date.now();

      // Act: Make 4 requests (should be instant - burst capacity)
      const promises = Array.from({ length: 4 }, () => bucket.take(1));
      await Promise.all(promises);

      const endTime = Date.now();

      // Assert: All 4 completed instantly (burst)
      expect(endTime - startTime).toBeLessThan(50);
      expect(bucket.getTokens()).toBe(0);
    });

    it('should throttle 5th request in burst', async () => {
      // Arrange: Make 4 instant requests
      await Promise.all([
        bucket.take(1),
        bucket.take(1),
        bucket.take(1),
        bucket.take(1),
      ]);
      expect(bucket.getTokens()).toBe(0);

      // Act: 5th request must wait
      const startTime = Date.now();
      const fifthRequest = bucket.take(1);

      await vi.advanceTimersByTimeAsync(250);
      await fifthRequest;

      const endTime = Date.now();

      // Assert: Had to wait ~250ms for token refill
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle taking 0 tokens', async () => {
      // Arrange: Fresh bucket
      const initialTokens = bucket.getTokens();

      // Act: Take 0 tokens (no-op)
      await bucket.take(0);

      // Assert: No tokens consumed
      expect(bucket.getTokens()).toBe(initialTokens);
    });

    it('should handle taking exactly capacity', async () => {
      // Arrange: Fresh bucket with 4 tokens

      // Act: Take all 4 tokens at once
      await bucket.take(4);

      // Assert: All tokens consumed
      expect(bucket.getTokens()).toBe(0);
    });

    it('should handle custom capacity and refill rate', async () => {
      // Arrange: Create bucket with 10 tokens, 5 tokens/s refill
      const customBucket = new TokenBucket(10, 5);

      // Act: Take all tokens
      await customBucket.take(10);
      expect(customBucket.getTokens()).toBe(0);

      // Wait 1 second (should refill 5 tokens)
      await vi.advanceTimersByTimeAsync(1000);
      await customBucket.take(0);

      // Assert: 5 tokens refilled
      expect(customBucket.getTokens()).toBe(5);
    });

    it('should start with full capacity', async () => {
      // Arrange & Act: Create new bucket
      const newBucket = new TokenBucket(4, 4);

      // Assert: Starts with all 4 tokens
      expect(newBucket.getTokens()).toBe(4);
    });

    it('should return floored token count', async () => {
      // Arrange: Take some tokens
      await bucket.take(2);

      // Advance time by partial refill (125ms = 0.5 tokens)
      await vi.advanceTimersByTimeAsync(125);
      await bucket.take(0);

      // Assert: getTokens() returns floor of actual tokens (2.5 -> 2)
      const tokens = bucket.getTokens();
      expect(tokens).toBe(Math.floor(2.5)); // Should be 2
    });
  });

  describe('Performance Under Load', () => {
    it('should handle many sequential requests efficiently', async () => {
      // Arrange: Fresh bucket
      const iterations = 20;
      const startTime = Date.now();

      // Act: Make 20 sequential requests
      for (let i = 0; i < iterations; i++) {
        const takePromise = bucket.take(1);
        await vi.advanceTimersByTimeAsync(250); // Keep pace with refill
        await takePromise;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert: Should take approximately (20-4)/4 = 4 seconds
      // (first 4 are instant, remaining 16 at 4 req/s = 4 seconds)
      expect(duration).toBeGreaterThanOrEqual(4000);
      expect(duration).toBeLessThanOrEqual(5500);
    });

    it('should maintain accuracy over extended period', async () => {
      // Arrange: Take all tokens
      await bucket.take(4);

      // Act: Wait 10 seconds
      await vi.advanceTimersByTimeAsync(10000);
      await bucket.take(0);

      // Assert: Should have exactly 4 tokens (capped at capacity)
      expect(bucket.getTokens()).toBe(4);
    });
  });

  describe('Monitoring and Observability', () => {
    it('should provide current token count', async () => {
      // Arrange: Fresh bucket
      expect(bucket.getTokens()).toBe(4);

      // Act: Take some tokens
      await bucket.take(2);

      // Assert: Reflects current state
      expect(bucket.getTokens()).toBe(2);
    });

    it('should allow monitoring without consuming tokens', async () => {
      // Arrange: Fresh bucket
      const initialTokens = bucket.getTokens();

      // Act: Check tokens multiple times
      const check1 = bucket.getTokens();
      const check2 = bucket.getTokens();
      const check3 = bucket.getTokens();

      // Assert: All checks return same value, no tokens consumed
      expect(check1).toBe(initialTokens);
      expect(check2).toBe(initialTokens);
      expect(check3).toBe(initialTokens);
    });
  });
});
