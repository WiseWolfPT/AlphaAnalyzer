import { InMemoryCache } from '../cache/in-memory-cache';
import { QuotaTracker } from '../quota/quota-tracker';
import { getCache, CACHE_TTL } from '../cache';
import { getQuotaTracker } from '../quota';

describe('Integration Tests', () => {
  describe('Cache and Quota Integration', () => {
    let cache: InMemoryCache;
    let quotaTracker: QuotaTracker;

    beforeEach(() => {
      // Use singletons
      cache = getCache() as InMemoryCache;
      quotaTracker = getQuotaTracker();
      jest.useFakeTimers();
    });

    afterEach(async () => {
      await cache.clear();
      jest.useRealTimers();
    });

    it('should work together for a typical price fetch scenario', async () => {
      const symbol = 'AAPL';
      const cacheKey = `price:${symbol}`;
      
      // Simulate checking cache (miss)
      const cachedPrice = await cache.get(cacheKey);
      expect(cachedPrice).toBeNull();
      
      // Check if we can use provider
      const canUseFinnhub = await quotaTracker.canUseProvider('finnhub');
      expect(canUseFinnhub).toBe(true);
      
      // Simulate API call
      const mockPrice = { 
        symbol, 
        price: 150.25, 
        change: 2.5,
        changePercent: 1.68,
        volume: 50000000,
        timestamp: Date.now(),
        provider: 'finnhub'
      };
      
      // Record the API call
      await quotaTracker.recordCall('finnhub', 'price');
      
      // Cache the result
      await cache.set(cacheKey, mockPrice, CACHE_TTL.PRICE);
      
      // Verify cache hit
      const retrievedPrice = await cache.get(cacheKey);
      expect(retrievedPrice).toEqual(mockPrice);
      
      // Check quota usage
      const usage = await quotaTracker.getUsage('finnhub');
      expect(usage.today).toBe(1);
      expect(usage.lastMinute).toBe(1);
    });

    it('should handle quota exhaustion scenario', async () => {
      // Fill up Alpha Vantage quota (only 25 daily calls)
      for (let i = 0; i < 25; i++) {
        await quotaTracker.recordCall('alphaVantage', 'fundamentals');
        jest.advanceTimersByTime(60000); // Avoid minute limits
      }
      
      // Check if we can still use it
      const canUse = await quotaTracker.canUseProvider('alphaVantage');
      expect(canUse).toBe(false);
      
      // Should suggest alternative provider
      const bestProvider = await quotaTracker.selectBestProvider('fundamentals');
      expect(bestProvider).not.toBe('alphaVantage');
      expect(['fmp', 'finnhub']).toContain(bestProvider);
    });

    it('should handle cache expiration and refresh', async () => {
      const symbol = 'GOOGL';
      const cacheKey = `price:${symbol}`;
      
      // Initial data
      const initialPrice = { symbol, price: 100, provider: 'finnhub' };
      await cache.set(cacheKey, initialPrice, CACHE_TTL.PRICE);
      await quotaTracker.recordCall('finnhub', 'price');
      
      // Fast forward past cache TTL
      jest.advanceTimersByTime(CACHE_TTL.PRICE * 1000 + 1000);
      
      // Cache should be expired
      const expiredData = await cache.get(cacheKey);
      expect(expiredData).toBeNull();
      
      // Can still use provider (minute limit reset)
      const canUse = await quotaTracker.canUseProvider('finnhub');
      expect(canUse).toBe(true);
      
      // Simulate refresh
      const newPrice = { symbol, price: 102, provider: 'finnhub' };
      await cache.set(cacheKey, newPrice, CACHE_TTL.PRICE);
      await quotaTracker.recordCall('finnhub', 'price');
      
      // Verify new data
      const refreshedData = await cache.get(cacheKey);
      expect(refreshedData).toEqual(newPrice);
      
      // Check total usage
      const usage = await quotaTracker.getUsage('finnhub');
      expect(usage.today).toBe(2);
    });

    it('should handle different data types with appropriate TTLs', async () => {
      // Price data - short TTL
      await cache.set('price:MSFT', { price: 300 }, CACHE_TTL.PRICE);
      
      // Fundamentals - long TTL
      await cache.set('fundamentals:MSFT', { pe: 25 }, CACHE_TTL.FUNDAMENTALS);
      
      // Historical - medium TTL
      await cache.set('historical:MSFT:1d', { data: [] }, CACHE_TTL.HISTORICAL);
      
      // Fast forward 2 minutes
      jest.advanceTimersByTime(120000);
      
      // Price should be expired
      expect(await cache.get('price:MSFT')).toBeNull();
      
      // Others should still be valid
      expect(await cache.get('fundamentals:MSFT')).toEqual({ pe: 25 });
      expect(await cache.get('historical:MSFT:1d')).toEqual({ data: [] });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle dashboard load with multiple stocks', async () => {
      const cache = getCache();
      const quotaTracker = getQuotaTracker();
      const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      
      // Simulate batch price fetch
      const prices = [];
      for (const symbol of stocks) {
        const cacheKey = `price:${symbol}`;
        const cached = await cache.get(cacheKey);
        
        if (!cached) {
          // Check quota
          const canUse = await quotaTracker.canUseProvider('finnhub');
          if (canUse) {
            // Simulate API call
            const price = { symbol, price: Math.random() * 1000 };
            await cache.set(cacheKey, price, CACHE_TTL.PRICE);
            await quotaTracker.recordCall('finnhub', 'price');
            prices.push(price);
          }
        } else {
          prices.push(cached);
        }
      }
      
      expect(prices).toHaveLength(5);
      
      // Check usage
      const usage = await quotaTracker.getUsage('finnhub');
      expect(usage.today).toBeLessThanOrEqual(5);
    });
  });
});