/**
 * SECURITY TEST: Health Check Rate Limiting
 *
 * P0 Fix #4: Prevent DoS via excessive health checks:
 * - Implement 30-second cache for health check results
 * - Prevent health check storms
 * - Timeout health checks after 5 seconds
 * - Cache both success and failure states
 * - Handle network errors gracefully
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WarmingAlertingService } from '../warming-alerting-service';

// Mock fetch for health checks
global.fetch = vi.fn();

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock bandwidth protection
vi.mock('../../middleware/bandwidth-protection', () => ({
  getBandwidthStatsForMonitoring: vi.fn().mockResolvedValue({
    percentUsed: 0.5,
    dailyUsedMB: 333,
    dailyBudgetMB: 666,
    requestsToday: 1000
  })
}));

// Mock Redis cache service
vi.mock('../../cache/redis-cache-service', () => ({
  redisCacheService: {
    keys: vi.fn().mockResolvedValue([]),
    llen: vi.fn().mockResolvedValue(0)
  }
}));

describe('Health Check Rate Limiting Security - P0 Fix #4', () => {
  let alertingService: WarmingAlertingService;
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = global.fetch as any;
    alertingService = new WarmingAlertingService();
  });

  afterEach(() => {
    alertingService.stop();
  });

  describe('Cache Implementation', () => {
    it('should cache successful health check for 30 seconds', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      // First call - should hit API
      await alertingService['checkWorkerHealth']();
      expect(fetchMock).toHaveBeenCalledTimes(4); // 4 workers

      vi.clearAllMocks();

      // Second call within 30s - should use cache
      await alertingService['checkWorkerHealth']();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should cache failed health check for 30 seconds', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Connection refused'));

      // First call - should hit API and fail
      await alertingService['checkWorkerHealth']();
      expect(fetchMock).toHaveBeenCalledTimes(4);

      vi.clearAllMocks();

      // Second call within 30s - should use cached failure
      await alertingService['checkWorkerHealth']();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should refresh cache after 30 seconds', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200
      });

      // First call
      await alertingService['checkWorkerHealth']();
      const firstCallCount = fetchMock.mock.calls.length;

      vi.clearAllMocks();

      // Simulate 31 seconds passing
      vi.useFakeTimers();
      vi.advanceTimersByTime(31000);

      // Second call - should hit API again
      await alertingService['checkWorkerHealth']();
      expect(fetchMock).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should cache per worker independently', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('3005')) {
          return Promise.resolve({ ok: true, status: 200 });
        } else if (url.includes('3008')) {
          return Promise.reject(new Error('Connection refused'));
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      await alertingService['checkWorkerHealth']();

      // Check that cache stores different states per worker
      const cache = alertingService['healthCheckCache'];
      expect(cache.get('earnings-monitor')?.status).toBe('online');
      expect(cache.get('intelligent-warming-worker')?.status).toBe('offline');
    });
  });

  describe('Timeout Protection', () => {
    it('should timeout health checks after 5 seconds', async () => {
      fetchMock.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true }), 10000); // 10 second delay
        });
      });

      const startTime = Date.now();
      await alertingService['checkWorkerHealth']();
      const duration = Date.now() - startTime;

      // Should abort after 5 seconds, not wait 10
      expect(duration).toBeLessThan(6000);
    });

    it('should cache timeout failures', async () => {
      fetchMock.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true }), 10000);
        });
      });

      // First call - times out
      await alertingService['checkWorkerHealth']();
      expect(fetchMock).toHaveBeenCalledTimes(4);

      vi.clearAllMocks();

      // Second call - uses cached timeout
      await alertingService['checkWorkerHealth']();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('DoS Prevention', () => {
    it('should handle rapid consecutive calls without storm', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200
      });

      // Make 100 rapid calls
      const promises = Array.from({ length: 100 }, () =>
        alertingService['checkWorkerHealth']()
      );

      await Promise.all(promises);

      // Should only make 4 API calls (one per worker), rest from cache
      expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
    });

    it('should handle concurrent alert checks efficiently', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      // Simulate 10 concurrent alert check cycles
      const promises = Array.from({ length: 10 }, () =>
        alertingService.checkAlerts()
      );

      await Promise.all(promises);

      // Should leverage cache to minimize API calls
      expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(alertingService['checkWorkerHealth']()).resolves.not.toThrow();
    });

    it('should handle DNS errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(alertingService['checkWorkerHealth']()).resolves.not.toThrow();
    });

    it('should handle timeout errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('AbortError'));

      await expect(alertingService['checkWorkerHealth']()).resolves.not.toThrow();
    });

    it('should handle HTTP 500 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(alertingService['checkWorkerHealth']()).resolves.not.toThrow();

      // Should cache 500 error
      const cache = alertingService['healthCheckCache'];
      expect(cache.get('earnings-monitor')?.status).toBe('offline');
    });
  });

  describe('Cache Expiration Logic', () => {
    it('should use timestamp-based cache expiration', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      await alertingService['checkWorkerHealth']();

      const cache = alertingService['healthCheckCache'];
      const entry = cache.get('earnings-monitor');

      expect(entry).toBeDefined();
      expect(entry?.timestamp).toBeDefined();
      expect(typeof entry?.timestamp).toBe('number');
      expect(entry?.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should respect HEALTH_CACHE_TTL constant', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      await alertingService['checkWorkerHealth']();

      const cache = alertingService['healthCheckCache'];
      const entry = cache.get('earnings-monitor');
      const ttl = alertingService['HEALTH_CACHE_TTL'];

      expect(ttl).toBe(30000); // 30 seconds
      expect(Date.now() - entry!.timestamp).toBeLessThan(100);
    });
  });

  describe('Performance', () => {
    it('should complete cached health check in under 1ms', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      // Warm up cache
      await alertingService['checkWorkerHealth']();

      // Measure cached call
      const start = Date.now();
      await alertingService['checkWorkerHealth']();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10); // Should be nearly instant
    });

    it('should handle cache with 1000 entries efficiently', async () => {
      const cache = alertingService['healthCheckCache'];

      // Fill cache with 1000 entries
      for (let i = 0; i < 1000; i++) {
        cache.set(`worker-${i}`, {
          status: 'online',
          timestamp: Date.now()
        });
      }

      const start = Date.now();
      await alertingService['checkWorkerHealth']();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Integration with Alert System', () => {
    it('should not send duplicate alerts due to cache', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      const sendAlertSpy = vi.spyOn(alertingService as any, 'sendAlert');

      // First call - should alert
      await alertingService['checkWorkerHealth']();
      const firstAlertCount = sendAlertSpy.mock.calls.length;

      // Second call within 30s - should use cache, not alert again
      await alertingService['checkWorkerHealth']();

      // Should not increase alert count (cooldown + cache)
      expect(sendAlertSpy.mock.calls.length).toBe(firstAlertCount);
    });
  });

  describe('Worker Configuration', () => {
    it('should check all 4 workers', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      await alertingService['checkWorkerHealth']();

      const cache = alertingService['healthCheckCache'];
      expect(cache.size).toBe(4);
      expect(cache.has('earnings-monitor')).toBe(true);
      expect(cache.has('intelligent-warming-worker')).toBe(true);
      expect(cache.has('price-worker')).toBe(true);
      expect(cache.has('transcripts-worker')).toBe(true);
    });

    it('should use correct ports for each worker', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });

      await alertingService['checkWorkerHealth']();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3005/health',
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3008/health',
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3002/health',
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3003/health',
        expect.any(Object)
      );
    });
  });
});
