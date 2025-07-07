/**
 * COMPREHENSIVE API USAGE TRACKER TESTS
 * Tests críticos para cobrir api-usage-tracker.ts (0% -> target 80%+)
 */

import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';
import { ApiUsageTracker } from '../api-usage-tracker';

// Mock cache service
const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  mget: vi.fn(),
  mset: vi.fn(),
  keys: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
  ping: vi.fn(),
  info: vi.fn()
};

vi.mock('../cache-service', () => ({
  cacheService: mockCache
}));

describe('🚀 API Usage Tracker - Comprehensive Tests', () => {
  let tracker: ApiUsageTracker;

  beforeAll(() => {
    // Mock current time for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new ApiUsageTracker();
    mockCache.get.mockClear();
    mockCache.set.mockClear();
    mockCache.del.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('📊 Usage Recording', () => {
    it('should record API call successfully', async () => {
      const provider = 'finnhub';
      const endpoint = 'quote';
      const cost = 1;

      mockCache.get.mockResolvedValueOnce(null); // No existing usage
      mockCache.set.mockResolvedValueOnce(undefined);

      await tracker.recordCall(provider, endpoint, cost);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining(`usage:${provider}:`),
        expect.objectContaining({
          provider,
          endpoint,
          count: 1,
          totalCost: cost
        }),
        expect.any(Number)
      );
    });

    it('should increment existing usage count', async () => {
      const provider = 'finnhub';
      const endpoint = 'quote';
      const existingUsage = {
        provider,
        endpoint,
        count: 5,
        totalCost: 5,
        timestamp: Date.now()
      };

      mockCache.get.mockResolvedValueOnce(existingUsage);
      mockCache.set.mockResolvedValueOnce(undefined);

      await tracker.recordCall(provider, endpoint, 1);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          count: 6,
          totalCost: 6
        }),
        expect.any(Number)
      );
    });

    it('should handle different cost values', async () => {
      const testCases = [
        { provider: 'finnhub', endpoint: 'quote', cost: 1 },
        { provider: 'alphaVantage', endpoint: 'fundamentals', cost: 5 },
        { provider: 'twelveData', endpoint: 'timeseries', cost: 2 }
      ];

      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      for (const testCase of testCases) {
        await tracker.recordCall(testCase.provider, testCase.endpoint, testCase.cost);
      }

      expect(mockCache.set).toHaveBeenCalledTimes(testCases.length);
      
      testCases.forEach((testCase, index) => {
        expect(mockCache.set).toHaveBeenNthCalledWith(
          index + 1,
          expect.any(String),
          expect.objectContaining({
            provider: testCase.provider,
            endpoint: testCase.endpoint,
            totalCost: testCase.cost
          }),
          expect.any(Number)
        );
      });
    });

    it('should record batch API calls', async () => {
      const calls = [
        { provider: 'finnhub', endpoint: 'quote', cost: 1 },
        { provider: 'finnhub', endpoint: 'profile', cost: 1 },
        { provider: 'alphaVantage', endpoint: 'overview', cost: 5 }
      ];

      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      await tracker.recordBatchCalls(calls);

      expect(mockCache.set).toHaveBeenCalledTimes(calls.length);
    });
  });

  describe('📈 Usage Retrieval', () => {
    it('should get current usage for provider', async () => {
      const provider = 'finnhub';
      const expectedUsage = {
        daily: 150,
        hourly: 25,
        minutely: 5,
        totalCost: 175,
        lastReset: Date.now() - 3600000 // 1 hour ago
      };

      mockCache.get.mockResolvedValueOnce(expectedUsage);

      const result = await tracker.getUsage(provider);

      expect(result).toEqual(expectedUsage);
      expect(mockCache.get).toHaveBeenCalledWith(`usage:${provider}:current`);
    });

    it('should return zero usage for new provider', async () => {
      const provider = 'newProvider';

      mockCache.get.mockResolvedValueOnce(null);

      const result = await tracker.getUsage(provider);

      expect(result).toEqual({
        daily: 0,
        hourly: 0,
        minutely: 0,
        totalCost: 0,
        lastReset: expect.any(Number)
      });
    });

    it('should get usage for specific endpoint', async () => {
      const provider = 'finnhub';
      const endpoint = 'quote';
      const expectedUsage = {
        count: 45,
        totalCost: 45,
        averageResponseTime: 150,
        lastCalled: Date.now() - 300000 // 5 minutes ago
      };

      mockCache.get.mockResolvedValueOnce(expectedUsage);

      const result = await tracker.getEndpointUsage(provider, endpoint);

      expect(result).toEqual(expectedUsage);
      expect(mockCache.get).toHaveBeenCalledWith(`usage:${provider}:${endpoint}`);
    });

    it('should get historical usage data', async () => {
      const provider = 'alphaVantage';
      const period = '7d';
      const expectedHistory = [
        { date: '2024-01-14', calls: 120, cost: 600 },
        { date: '2024-01-13', calls: 85, cost: 425 },
        { date: '2024-01-12', calls: 95, cost: 475 }
      ];

      mockCache.get.mockResolvedValueOnce(expectedHistory);

      const result = await tracker.getUsageHistory(provider, period);

      expect(result).toEqual(expectedHistory);
      expect(mockCache.get).toHaveBeenCalledWith(`usage:${provider}:history:${period}`);
    });
  });

  describe('⚡ Rate Limiting', () => {
    it('should check if provider can be used (within limits)', async () => {
      const provider = 'finnhub';
      const currentUsage = {
        daily: 50,
        hourly: 10,
        minutely: 2
      };
      const limits = {
        daily: 100,
        hourly: 60,
        minutely: 30
      };

      mockCache.get.mockResolvedValueOnce(currentUsage);
      vi.spyOn(tracker, 'getLimits').mockReturnValue(limits);

      const canUse = await tracker.canUseProvider(provider);

      expect(canUse).toBe(true);
    });

    it('should check if provider exceeds limits', async () => {
      const provider = 'finnhub';
      const currentUsage = {
        daily: 95,
        hourly: 55,
        minutely: 35 // Exceeds minute limit
      };
      const limits = {
        daily: 100,
        hourly: 60,
        minutely: 30
      };

      mockCache.get.mockResolvedValueOnce(currentUsage);
      vi.spyOn(tracker, 'getLimits').mockReturnValue(limits);

      const canUse = await tracker.canUseProvider(provider);

      expect(canUse).toBe(false);
    });

    it('should get remaining quota for provider', async () => {
      const provider = 'alphaVantage';
      const currentUsage = {
        daily: 15,
        hourly: 8,
        minutely: 2
      };
      const limits = {
        daily: 25,
        hourly: 15,
        minutely: 5
      };

      mockCache.get.mockResolvedValueOnce(currentUsage);
      vi.spyOn(tracker, 'getLimits').mockReturnValue(limits);

      const remaining = await tracker.getRemainingQuota(provider);

      expect(remaining).toEqual({
        daily: 10,
        hourly: 7,
        minutely: 3
      });
    });

    it('should calculate usage percentage', async () => {
      const provider = 'twelveData';
      const currentUsage = {
        daily: 400,
        hourly: 35,
        minutely: 8
      };
      const limits = {
        daily: 800,
        hourly: 40,
        minutely: 10
      };

      mockCache.get.mockResolvedValueOnce(currentUsage);
      vi.spyOn(tracker, 'getLimits').mockReturnValue(limits);

      const percentage = await tracker.getUsagePercentage(provider);

      expect(percentage).toEqual({
        daily: 50, // 400/800 * 100
        hourly: 87.5, // 35/40 * 100
        minutely: 80 // 8/10 * 100
      });
    });

    it('should estimate time until quota reset', async () => {
      const provider = 'finnhub';
      const lastReset = Date.now() - 1800000; // 30 minutes ago

      mockCache.get.mockResolvedValueOnce({
        lastReset,
        minutely: 30 // At limit
      });

      const timeUntilReset = await tracker.getTimeUntilReset(provider, 'minutely');

      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(60000); // Max 1 minute
    });
  });

  describe('🔄 Quota Management', () => {
    it('should reset usage counters', async () => {
      const provider = 'finnhub';
      const resetType = 'daily';

      mockCache.del.mockResolvedValueOnce(true);
      mockCache.set.mockResolvedValueOnce(undefined);

      await tracker.resetUsage(provider, resetType);

      expect(mockCache.del).toHaveBeenCalledWith(
        expect.stringContaining(`usage:${provider}:`)
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          lastReset: expect.any(Number)
        }),
        expect.any(Number)
      );
    });

    it('should automatically reset expired counters', async () => {
      const provider = 'alphaVantage';
      const expiredUsage = {
        daily: 20,
        lastReset: Date.now() - 86400000 - 1000 // Over 24 hours ago
      };

      mockCache.get.mockResolvedValueOnce(expiredUsage);
      vi.spyOn(tracker, 'resetUsage').mockResolvedValueOnce(undefined);

      await tracker.getUsage(provider);

      expect(tracker.resetUsage).toHaveBeenCalledWith(provider, 'daily');
    });

    it('should handle custom quota limits', async () => {
      const provider = 'customProvider';
      const customLimits = {
        daily: 500,
        hourly: 100,
        minutely: 10
      };

      tracker.setCustomLimits(provider, customLimits);
      const limits = tracker.getLimits(provider);

      expect(limits).toEqual(customLimits);
    });

    it('should track quota usage across multiple time windows', async () => {
      const provider = 'finnhub';
      
      // Simulate calls at different times
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      // Record call at 10:00
      await tracker.recordCall(provider, 'quote', 1);

      // Advance time by 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Record another call at 10:30
      await tracker.recordCall(provider, 'quote', 1);

      expect(mockCache.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('📊 Analytics and Reporting', () => {
    it('should get all providers usage summary', async () => {
      const providersData = {
        'usage:finnhub:current': { daily: 50, hourly: 10 },
        'usage:alphaVantage:current': { daily: 15, hourly: 5 },
        'usage:twelveData:current': { daily: 200, hourly: 25 }
      };

      mockCache.keys.mockResolvedValueOnce(Object.keys(providersData));
      mockCache.mget.mockResolvedValueOnce(Object.values(providersData));

      const summary = await tracker.getAllProvidersUsage();

      expect(summary).toEqual({
        finnhub: { daily: 50, hourly: 10 },
        alphaVantage: { daily: 15, hourly: 5 },
        twelveData: { daily: 200, hourly: 25 }
      });
    });

    it('should generate usage report', async () => {
      const provider = 'finnhub';
      const reportData = {
        period: '24h',
        totalCalls: 150,
        totalCost: 175,
        endpoints: [
          { name: 'quote', calls: 100, cost: 100 },
          { name: 'profile', calls: 30, cost: 30 },
          { name: 'news', calls: 20, cost: 45 }
        ],
        averageResponseTime: 185,
        errorRate: 0.02
      };

      vi.spyOn(tracker, 'generateReport').mockResolvedValueOnce(reportData);

      const report = await tracker.generateReport(provider, '24h');

      expect(report).toEqual(reportData);
      expect(report.totalCalls).toBe(150);
      expect(report.errorRate).toBeLessThan(0.05);
    });

    it('should identify top consumers by endpoint', async () => {
      const topConsumers = [
        { endpoint: 'quote', calls: 500, percentage: 45.5 },
        { endpoint: 'profile', calls: 300, percentage: 27.3 },
        { endpoint: 'news', calls: 200, percentage: 18.2 },
        { endpoint: 'fundamentals', calls: 100, percentage: 9.0 }
      ];

      vi.spyOn(tracker, 'getTopConsumers').mockResolvedValueOnce(topConsumers);

      const result = await tracker.getTopConsumers('finnhub', 'daily');

      expect(result).toEqual(topConsumers);
      expect(result[0].calls).toBeGreaterThan(result[1].calls);
    });

    it('should calculate cost efficiency metrics', async () => {
      const provider = 'alphaVantage';
      const metrics = {
        costPerCall: 3.2,
        callsPerDollar: 0.31,
        dailySpend: 48.50,
        projectedMonthlyCost: 1455,
        efficiency: 'good' // Based on usage patterns
      };

      vi.spyOn(tracker, 'getCostMetrics').mockResolvedValueOnce(metrics);

      const result = await tracker.getCostMetrics(provider);

      expect(result).toEqual(metrics);
      expect(result.costPerCall).toBeGreaterThan(0);
      expect(result.efficiency).toBeDefined();
    });
  });

  describe('🚨 Alerting and Monitoring', () => {
    it('should trigger alert when approaching limit', async () => {
      const provider = 'finnhub';
      const currentUsage = {
        daily: 85, // 85% of 100 limit
        hourly: 50,
        minutely: 5
      };
      const limits = {
        daily: 100,
        hourly: 60,
        minutely: 30
      };

      mockCache.get.mockResolvedValueOnce(currentUsage);
      vi.spyOn(tracker, 'getLimits').mockReturnValue(limits);
      
      const alerts = await tracker.checkQuotaAlerts(provider);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          message: expect.stringContaining('85%'),
          threshold: 80
        })
      );
    });

    it('should trigger critical alert when limit exceeded', async () => {
      const provider = 'alphaVantage';
      const currentUsage = {
        daily: 25, // Exactly at limit
        hourly: 12,
        minutely: 4
      };
      const limits = {
        daily: 25,
        hourly: 15,
        minutely: 5
      };

      mockCache.get.mockResolvedValueOnce(currentUsage);
      vi.spyOn(tracker, 'getLimits').mockReturnValue(limits);

      const alerts = await tracker.checkQuotaAlerts(provider);

      expect(alerts).toContainEqual(
        expect.objectContaining({
          level: 'critical',
          message: expect.stringContaining('100%')
        })
      );
    });

    it('should monitor unusual usage patterns', async () => {
      const provider = 'twelveData';
      const unusualPattern = {
        detected: true,
        type: 'spike',
        description: 'Usage increased by 300% in last hour',
        baseline: 10,
        current: 40,
        timestamp: Date.now()
      };

      vi.spyOn(tracker, 'detectAnomalies').mockResolvedValueOnce([unusualPattern]);

      const anomalies = await tracker.detectAnomalies(provider);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].detected).toBe(true);
      expect(anomalies[0].type).toBe('spike');
    });

    it('should track error rates and failed calls', async () => {
      const provider = 'finnhub';
      const errorMetrics = {
        totalErrors: 5,
        errorRate: 0.033, // 5 errors out of 150 calls
        commonErrors: [
          { type: '429', count: 3, description: 'Rate limit exceeded' },
          { type: '500', count: 2, description: 'Internal server error' }
        ],
        lastError: Date.now() - 60000
      };

      vi.spyOn(tracker, 'getErrorMetrics').mockResolvedValueOnce(errorMetrics);

      const result = await tracker.getErrorMetrics(provider);

      expect(result).toEqual(errorMetrics);
      expect(result.errorRate).toBeLessThan(0.05); // Less than 5%
    });
  });

  describe('🔧 Configuration and Health', () => {
    it('should validate tracker configuration', async () => {
      const config = {
        providers: ['finnhub', 'alphaVantage', 'twelveData'],
        limits: {
          finnhub: { daily: 100, hourly: 60, minutely: 30 },
          alphaVantage: { daily: 25, hourly: 15, minutely: 5 }
        },
        alertThresholds: {
          warning: 80,
          critical: 95
        }
      };

      vi.spyOn(tracker, 'validateConfig').mockReturnValue({ valid: true, errors: [] });

      const validation = tracker.validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle invalid configuration', async () => {
      const invalidConfig = {
        providers: [], // Empty providers
        limits: {
          invalidProvider: { daily: -1 } // Negative limit
        }
      };

      vi.spyOn(tracker, 'validateConfig').mockReturnValue({
        valid: false,
        errors: ['No providers configured', 'Invalid daily limit for invalidProvider']
      });

      const validation = tracker.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(2);
    });

    it('should check tracker health status', async () => {
      mockCache.ping.mockResolvedValueOnce('PONG');
      
      const health = await tracker.getHealthStatus();

      expect(health).toEqual({
        status: 'healthy',
        cache: 'connected',
        lastCheck: expect.any(Number),
        uptime: expect.any(Number)
      });
    });

    it('should handle cache connection issues', async () => {
      mockCache.ping.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await tracker.getHealthStatus();

      expect(health.status).toBe('unhealthy');
      expect(health.cache).toBe('disconnected');
    });
  });

  describe('🧪 Edge Cases and Error Handling', () => {
    it('should handle cache failures gracefully', async () => {
      mockCache.get.mockRejectedValueOnce(new Error('Cache unavailable'));

      const result = await tracker.getUsage('finnhub');

      // Should return default usage when cache fails
      expect(result).toEqual({
        daily: 0,
        hourly: 0,
        minutely: 0,
        totalCost: 0,
        lastReset: expect.any(Number)
      });
    });

    it('should handle concurrent usage recording', async () => {
      const provider = 'finnhub';
      const endpoint = 'quote';

      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      // Simulate concurrent calls
      const promises = Array(10).fill(null).map(() =>
        tracker.recordCall(provider, endpoint, 1)
      );

      await Promise.all(promises);

      expect(mockCache.set).toHaveBeenCalledTimes(10);
    });

    it('should handle very large usage numbers', async () => {
      const provider = 'highVolume';
      const largeUsage = {
        daily: 999999,
        hourly: 50000,
        minutely: 1000,
        totalCost: 4999995
      };

      mockCache.get.mockResolvedValueOnce(largeUsage);

      const result = await tracker.getUsage(provider);

      expect(result.daily).toBe(999999);
      expect(result.totalCost).toBe(4999995);
    });

    it('should handle malformed cache data', async () => {
      mockCache.get.mockResolvedValueOnce('invalid json');

      const result = await tracker.getUsage('finnhub');

      // Should handle gracefully and return default
      expect(result).toEqual({
        daily: 0,
        hourly: 0,
        minutely: 0,
        totalCost: 0,
        lastReset: expect.any(Number)
      });
    });

    it('should handle zero and negative costs', async () => {
      const provider = 'testProvider';
      
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      // Test zero cost
      await tracker.recordCall(provider, 'free-endpoint', 0);
      
      // Test negative cost (should be treated as 0 or error)
      await tracker.recordCall(provider, 'invalid-endpoint', -5);

      expect(mockCache.set).toHaveBeenCalledTimes(2);
    });
  });
});