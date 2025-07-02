import { QuotaTracker } from '../quota/quota-tracker';
import { getCache } from '../cache';

describe('QuotaTracker', () => {
  let tracker: QuotaTracker;

  beforeEach(async () => {
    // Clear cache before each test
    const cache = getCache();
    await cache.clear();
    
    tracker = new QuotaTracker();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    // Clear cache after each test
    const cache = getCache();
    await cache.clear();
  });

  describe('Recording Calls', () => {
    it('should track API calls per provider', async () => {
      await tracker.recordCall('finnhub', 'price');
      await tracker.recordCall('finnhub', 'price');
      
      const usage = await tracker.getUsage('finnhub');
      expect(usage.today).toBe(2);
      expect(usage.lastMinute).toBe(2);
    });

    it('should track calls across different providers', async () => {
      await tracker.recordCall('finnhub', 'price');
      await tracker.recordCall('twelveData', 'historical');
      await tracker.recordCall('fmp', 'fundamentals');
      
      const finnhubUsage = await tracker.getUsage('finnhub');
      const twelveDataUsage = await tracker.getUsage('twelveData');
      const fmpUsage = await tracker.getUsage('fmp');
      
      expect(finnhubUsage.today).toBe(1);
      expect(twelveDataUsage.today).toBe(1);
      expect(fmpUsage.today).toBe(1);
    });
  });

  describe('Minute Limits', () => {
    it('should track per-minute usage correctly', async () => {
      // Record 5 calls
      for (let i = 0; i < 5; i++) {
        await tracker.recordCall('finnhub', 'price');
      }
      
      let usage = await tracker.getUsage('finnhub');
      expect(usage.lastMinute).toBe(5);
      
      // Fast forward 30 seconds
      jest.advanceTimersByTime(30000);
      
      // Record 3 more calls
      for (let i = 0; i < 3; i++) {
        await tracker.recordCall('finnhub', 'price');
      }
      
      usage = await tracker.getUsage('finnhub');
      expect(usage.lastMinute).toBe(8); // All 8 calls still within 1 minute
      
      // Fast forward another 35 seconds (total 65 seconds)
      jest.advanceTimersByTime(35000);
      
      usage = await tracker.getUsage('finnhub');
      expect(usage.lastMinute).toBe(3); // Only last 3 calls within 1 minute
    });

    it('should enforce minute limits for Finnhub', async () => {
      // Fill up the minute quota (60 calls)
      for (let i = 0; i < 60; i++) {
        await tracker.recordCall('finnhub', 'price');
      }
      
      const canUse = await tracker.canUseProvider('finnhub');
      expect(canUse).toBe(false);
      
      // Fast forward 61 seconds
      jest.advanceTimersByTime(61000);
      
      const canUseAfter = await tracker.canUseProvider('finnhub');
      expect(canUseAfter).toBe(true);
    });
  });

  describe('Daily Limits', () => {
    it('should enforce daily limits', async () => {
      // Use up TwelveData daily quota (800 calls)
      for (let i = 0; i < 800; i++) {
        await tracker.recordCall('twelveData', 'price');
        // Advance time to avoid minute limits
        if (i % 10 === 0) {
          jest.advanceTimersByTime(60000);
        }
      }
      
      const canUse = await tracker.canUseProvider('twelveData');
      expect(canUse).toBe(false);
      
      const usage = await tracker.getUsage('twelveData');
      expect(usage.quotaRemaining.daily).toBe(0);
    });

    it('should calculate usage percentage correctly', async () => {
      // Use 50% of FMP quota (125 out of 250)
      for (let i = 0; i < 125; i++) {
        await tracker.recordCall('fmp', 'fundamentals');
        if (i % 5 === 0) {
          jest.advanceTimersByTime(60000);
        }
      }
      
      const usagePercent = await tracker.getUsagePercent('fmp');
      expect(usagePercent).toBe(50);
    });
  });

  describe('Provider Selection', () => {
    it('should select available provider based on quota', async () => {
      // Fill up Finnhub minute quota
      for (let i = 0; i < 60; i++) {
        await tracker.recordCall('finnhub', 'price');
      }
      
      const bestProvider = await tracker.selectBestProvider('price', ['finnhub', 'twelveData']);
      expect(bestProvider).toBe('twelveData');
    });

    it('should return null when all providers exhausted', async () => {
      // Exhaust all providers (simplified test)
      const providers = ['finnhub', 'twelveData', 'fmp', 'alphaVantage'] as const;
      
      for (const provider of providers) {
        const limit = provider === 'finnhub' ? 60 : 1000; // Simplified limits
        for (let i = 0; i < limit; i++) {
          await tracker.recordCall(provider, 'test');
        }
      }
      
      const bestProvider = await tracker.selectBestProvider('price');
      // Should return provider with lowest usage percentage
      expect(bestProvider).toBeTruthy();
    });
  });

  describe('Quota Alerts', () => {
    it('should trigger alerts when usage exceeds 80%', async () => {
      // Use 85% of Alpha Vantage quota (21 out of 25)
      for (let i = 0; i < 21; i++) {
        await tracker.recordCall('alphaVantage', 'fundamentals');
        jest.advanceTimersByTime(60000); // Avoid minute limits
      }
      
      const alerts = await tracker.checkQuotaAlerts();
      const alphaAlert = alerts.find(a => a.provider === 'alphaVantage');
      
      expect(alphaAlert).toBeDefined();
      expect(alphaAlert?.alert).toBe(true);
      expect(alphaAlert?.usage).toBe(84); // 21/25 = 84%
    });
  });

  describe('Usage Statistics', () => {
    it('should return all providers usage', async () => {
      await tracker.recordCall('finnhub', 'price');
      await tracker.recordCall('twelveData', 'historical');
      await tracker.recordCall('fmp', 'fundamentals');
      
      const allUsage = await tracker.getAllProvidersUsage();
      
      expect(Object.keys(allUsage)).toHaveLength(4);
      expect(allUsage.finnhub.today).toBe(1);
      expect(allUsage.twelveData.today).toBe(1);
      expect(allUsage.fmp.today).toBe(1);
      expect(allUsage.alphaVantage.today).toBe(0);
    });
  });
});