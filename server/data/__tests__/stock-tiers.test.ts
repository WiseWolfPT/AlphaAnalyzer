/**
 * AGENT 12: Smart Warming Tiers Tests
 *
 * Tests for tiered warming strategy:
 * - Tier identification (S&P 100, S&P 500, Extended)
 * - Refresh interval calculation (market hours vs after hours)
 * - Priority assignment
 * - Should warm decision logic
 * - API call projection
 */

import {
  getStockTier,
  getRefreshInterval,
  getStockPriority,
  shouldWarm,
  getTierStats,
  calculateExpectedApiCalls,
  initializeTiers,
  getStocksByTier,
  getStocksNeedingRefresh,
  STOCK_TIERS
} from '../stock-tiers';

describe('Smart Warming Tiers', () => {
  beforeAll(() => {
    // Initialize tiers with mock data
    const mockSP100 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
    const mockSP500 = ['TSLA', 'AMD', 'INTC', 'QCOM', 'TXN'];
    const mockExtended = ['ROKU', 'SNAP', 'SPOT', 'SQ', 'SHOP'];

    initializeTiers(mockSP100, mockSP500, mockExtended);
  });

  describe('getStockTier', () => {
    test('should identify Tier 1 stocks (S&P 100)', () => {
      expect(getStockTier('AAPL')).toBe('tier1_hot');
      expect(getStockTier('MSFT')).toBe('tier1_hot');
      expect(getStockTier('GOOGL')).toBe('tier1_hot');
    });

    test('should identify Tier 2 stocks (S&P 500)', () => {
      expect(getStockTier('TSLA')).toBe('tier2_warm');
      expect(getStockTier('AMD')).toBe('tier2_warm');
    });

    test('should identify Tier 3 stocks (Extended)', () => {
      expect(getStockTier('ROKU')).toBe('tier3_cold');
      expect(getStockTier('SNAP')).toBe('tier3_cold');
    });

    test('should be case insensitive', () => {
      expect(getStockTier('aapl')).toBe('tier1_hot');
      expect(getStockTier('AaPl')).toBe('tier1_hot');
    });

    test('should handle unknown tickers (default to Tier 3)', () => {
      expect(getStockTier('UNKNOWN_TICKER')).toBe('tier3_cold');
    });
  });

  describe('getRefreshInterval', () => {
    test('should return correct interval for Tier 1 during market hours', () => {
      const interval = getRefreshInterval('AAPL', true);
      expect(interval).toBe(5 * 60 * 1000); // 5 minutes
    });

    test('should return correct interval for Tier 1 after hours', () => {
      const interval = getRefreshInterval('AAPL', false);
      expect(interval).toBe(30 * 60 * 1000); // 30 minutes
    });

    test('should return correct interval for Tier 2 during market hours', () => {
      const interval = getRefreshInterval('TSLA', true);
      expect(interval).toBe(30 * 60 * 1000); // 30 minutes
    });

    test('should return correct interval for Tier 2 after hours', () => {
      const interval = getRefreshInterval('TSLA', false);
      expect(interval).toBe(2 * 60 * 60 * 1000); // 2 hours
    });

    test('should return correct interval for Tier 3 (on-demand)', () => {
      const intervalMarketHours = getRefreshInterval('ROKU', true);
      const intervalAfterHours = getRefreshInterval('ROKU', false);

      expect(intervalMarketHours).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(intervalAfterHours).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe('getStockPriority', () => {
    test('should return priority 10 for Tier 1', () => {
      expect(getStockPriority('AAPL')).toBe(10);
      expect(getStockPriority('MSFT')).toBe(10);
    });

    test('should return priority 5 for Tier 2', () => {
      expect(getStockPriority('TSLA')).toBe(5);
      expect(getStockPriority('AMD')).toBe(5);
    });

    test('should return priority 1 for Tier 3', () => {
      expect(getStockPriority('ROKU')).toBe(1);
      expect(getStockPriority('SNAP')).toBe(1);
    });
  });

  describe('shouldWarm', () => {
    test('should return true if never warmed', () => {
      expect(shouldWarm('AAPL', null, true)).toBe(true);
      expect(shouldWarm('AAPL', null, false)).toBe(true);
    });

    test('should return true if Tier 1 stock stale (>5 min during market)', () => {
      const lastWarmed = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      expect(shouldWarm('AAPL', lastWarmed, true)).toBe(true);
    });

    test('should return false if Tier 1 stock fresh (<5 min during market)', () => {
      const lastWarmed = new Date(Date.now() - 4 * 60 * 1000); // 4 minutes ago
      expect(shouldWarm('AAPL', lastWarmed, true)).toBe(false);
    });

    test('should return true if Tier 1 stock stale (>30 min after hours)', () => {
      const lastWarmed = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      expect(shouldWarm('AAPL', lastWarmed, false)).toBe(true);
    });

    test('should return false if Tier 1 stock fresh (<30 min after hours)', () => {
      const lastWarmed = new Date(Date.now() - 29 * 60 * 1000); // 29 minutes ago
      expect(shouldWarm('AAPL', lastWarmed, false)).toBe(false);
    });

    test('should return true if Tier 2 stock stale (>30 min during market)', () => {
      const lastWarmed = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      expect(shouldWarm('TSLA', lastWarmed, true)).toBe(true);
    });

    test('should return false if Tier 2 stock fresh (<30 min during market)', () => {
      const lastWarmed = new Date(Date.now() - 29 * 60 * 1000); // 29 minutes ago
      expect(shouldWarm('TSLA', lastWarmed, true)).toBe(false);
    });

    test('should return true if Tier 3 stock stale (>24h)', () => {
      const lastWarmed = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(shouldWarm('ROKU', lastWarmed, true)).toBe(true);
    });

    test('should return false if Tier 3 stock fresh (<24h)', () => {
      const lastWarmed = new Date(Date.now() - 23 * 60 * 60 * 1000); // 23 hours ago
      expect(shouldWarm('ROKU', lastWarmed, true)).toBe(false);
    });
  });

  describe('getTierStats', () => {
    test('should return correct tier counts', () => {
      const stats = getTierStats();

      expect(stats.tier1_hot.count).toBe(5); // Mock data
      expect(stats.tier2_warm.count).toBe(5);
      expect(stats.tier3_cold.count).toBe(5);
      expect(stats.total).toBe(15);
    });

    test('should return correct refresh intervals', () => {
      const stats = getTierStats();

      expect(stats.tier1_hot.refreshMin).toBe(5); // minutes
      expect(stats.tier1_hot.refreshMax).toBe(30);

      expect(stats.tier2_warm.refreshMin).toBe(30);
      expect(stats.tier2_warm.refreshMax).toBe(120);

      expect(stats.tier3_cold.refreshMin).toBe(1440); // 24h
      expect(stats.tier3_cold.refreshMax).toBe(1440);
    });
  });

  describe('calculateExpectedApiCalls', () => {
    test('should calculate API calls per day', () => {
      const projection = calculateExpectedApiCalls();

      expect(projection.tier1).toBeGreaterThan(0);
      expect(projection.tier2).toBeGreaterThan(0);
      expect(projection.tier3).toBeGreaterThan(0);
      expect(projection.total).toBe(projection.tier1 + projection.tier2 + projection.tier3);
    });

    test('should calculate reduction vs hourly warming', () => {
      const projection = calculateExpectedApiCalls();
      const stats = getTierStats();

      // Baseline: All stocks warmed every hour
      const baseline = stats.total * 12 * 24; // 12 methods, 24 hours

      expect(projection.total).toBeLessThan(baseline);
      expect(projection.reduction).toBeGreaterThan(0);
      expect(projection.reduction).toBeLessThan(100);
    });

    test('should show significant reduction for realistic universe', () => {
      // Simulate realistic universe: 100 Tier 1, 400 Tier 2, 993 Tier 3
      const mockSP100 = Array.from({ length: 100 }, (_, i) => `T1_${i}`);
      const mockSP500 = Array.from({ length: 400 }, (_, i) => `T2_${i}`);
      const mockExtended = Array.from({ length: 993 }, (_, i) => `T3_${i}`);

      initializeTiers(mockSP100, mockSP500, mockExtended);

      const projection = calculateExpectedApiCalls();
      const stats = getTierStats();
      const baseline = stats.total * 12 * 24;

      // Should reduce by 50%+ for realistic universe
      expect(projection.reduction).toBeGreaterThan(50);
      expect(projection.total).toBeLessThan(baseline * 0.5);
    });
  });

  describe('getStocksByTier', () => {
    test('should return stocks for each tier', () => {
      const tier1 = getStocksByTier('tier1_hot');
      const tier2 = getStocksByTier('tier2_warm');
      const tier3 = getStocksByTier('tier3_cold');

      expect(tier1).toContain('AAPL');
      expect(tier1).toContain('MSFT');

      expect(tier2).toContain('TSLA');
      expect(tier2).toContain('AMD');

      expect(tier3).toContain('ROKU');
      expect(tier3).toContain('SNAP');
    });

    test('should return immutable copies (prevent mutations)', () => {
      const tier1_a = getStocksByTier('tier1_hot');
      const tier1_b = getStocksByTier('tier1_hot');

      // Mutate copy
      tier1_a.push('NEW_STOCK');

      // Original should be unchanged
      expect(tier1_b).not.toContain('NEW_STOCK');
    });
  });

  describe('getStocksNeedingRefresh', () => {
    test('should return stocks sorted by priority', () => {
      const lastWarmedMap = new Map<string, Date | null>([
        ['AAPL', new Date(Date.now() - 10 * 60 * 1000)],  // Tier 1, stale
        ['TSLA', new Date(Date.now() - 40 * 60 * 1000)],  // Tier 2, stale
        ['ROKU', new Date(Date.now() - 25 * 60 * 60 * 1000)] // Tier 3, stale
      ]);

      const needsRefresh = getStocksNeedingRefresh(lastWarmedMap, true);

      // Should be sorted by priority: Tier 1 (10) > Tier 2 (5) > Tier 3 (1)
      expect(needsRefresh[0]).toBe('AAPL'); // Priority 10
      expect(needsRefresh[1]).toBe('TSLA'); // Priority 5
      expect(needsRefresh[2]).toBe('ROKU'); // Priority 1
    });

    test('should exclude fresh stocks', () => {
      const lastWarmedMap = new Map<string, Date | null>([
        ['AAPL', new Date(Date.now() - 2 * 60 * 1000)],   // Tier 1, fresh (<5 min)
        ['TSLA', new Date(Date.now() - 40 * 60 * 1000)],  // Tier 2, stale
        ['ROKU', new Date(Date.now() - 1 * 60 * 60 * 1000)] // Tier 3, fresh (<24h)
      ]);

      const needsRefresh = getStocksNeedingRefresh(lastWarmedMap, true);

      expect(needsRefresh).not.toContain('AAPL');
      expect(needsRefresh).toContain('TSLA');
      expect(needsRefresh).not.toContain('ROKU');
    });

    test('should prioritize never-warmed stocks', () => {
      const lastWarmedMap = new Map<string, Date | null>([
        ['AAPL', null],  // Never warmed, Tier 1
        ['TSLA', new Date(Date.now() - 40 * 60 * 1000)],  // Stale, Tier 2
        ['ROKU', null]   // Never warmed, Tier 3
      ]);

      const needsRefresh = getStocksNeedingRefresh(lastWarmedMap, true);

      // Never warmed should come first within same tier
      expect(needsRefresh[0]).toBe('AAPL'); // Tier 1, never warmed
      expect(needsRefresh[1]).toBe('TSLA'); // Tier 2, stale
      expect(needsRefresh[2]).toBe('ROKU'); // Tier 3, never warmed
    });

    test('should handle market hours vs after hours correctly', () => {
      const lastWarmedMap = new Map<string, Date | null>([
        ['AAPL', new Date(Date.now() - 10 * 60 * 1000)], // 10 minutes ago
      ]);

      // During market hours: stale (>5 min)
      const needsRefreshMarketHours = getStocksNeedingRefresh(lastWarmedMap, true);
      expect(needsRefreshMarketHours).toContain('AAPL');

      // After hours: fresh (<30 min)
      const needsRefreshAfterHours = getStocksNeedingRefresh(lastWarmedMap, false);
      expect(needsRefreshAfterHours).not.toContain('AAPL');
    });
  });

  describe('initializeTiers', () => {
    test('should populate tiers from universe loader', () => {
      const mockSP100 = ['AAPL', 'MSFT', 'GOOGL'];
      const mockSP500 = ['TSLA', 'AMD'];
      const mockExtended = ['ROKU', 'SNAP', 'SPOT', 'SQ'];

      initializeTiers(mockSP100, mockSP500, mockExtended);

      expect(STOCK_TIERS.tier1_hot.stocks).toEqual(mockSP100);
      expect(STOCK_TIERS.tier2_warm.stocks).toEqual(mockSP500);
      expect(STOCK_TIERS.tier3_cold.stocks).toEqual(mockExtended);
    });

    test('should filter out duplicates between tiers', () => {
      const mockSP100 = ['AAPL', 'MSFT'];
      const mockSP500 = ['AAPL', 'TSLA']; // AAPL already in SP100
      const mockExtended = ['ROKU', 'TSLA']; // TSLA already in SP500

      initializeTiers(mockSP100, mockSP500, mockExtended);

      // Tier 1 should have AAPL
      expect(STOCK_TIERS.tier1_hot.stocks).toContain('AAPL');
      expect(STOCK_TIERS.tier1_hot.stocks).toContain('MSFT');

      // Tier 2 should NOT have AAPL (in Tier 1), but should have TSLA
      expect(STOCK_TIERS.tier2_warm.stocks).not.toContain('AAPL');
      expect(STOCK_TIERS.tier2_warm.stocks).toContain('TSLA');

      // Tier 3 should NOT have TSLA (in Tier 2), but should have ROKU
      expect(STOCK_TIERS.tier3_cold.stocks).not.toContain('TSLA');
      expect(STOCK_TIERS.tier3_cold.stocks).toContain('ROKU');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty tier gracefully', () => {
      initializeTiers([], [], ['ROKU']);

      const stats = getTierStats();
      expect(stats.tier1_hot.count).toBe(0);
      expect(stats.tier2_warm.count).toBe(0);
      expect(stats.tier3_cold.count).toBe(1);
    });

    test('should handle whitespace in ticker symbols', () => {
      expect(getStockTier(' AAPL ')).toBe('tier1_hot');
      expect(getStockTier('  TSLA  ')).toBe('tier2_warm');
    });

    test('should handle very recent last warmed (edge case)', () => {
      const lastWarmed = new Date(Date.now() - 100); // 100ms ago

      expect(shouldWarm('AAPL', lastWarmed, true)).toBe(false);
      expect(shouldWarm('TSLA', lastWarmed, true)).toBe(false);
    });
  });

  describe('Performance Characteristics', () => {
    test('Tier 1 stocks should warm most frequently', () => {
      const tier1Interval = getRefreshInterval('AAPL', true);
      const tier2Interval = getRefreshInterval('TSLA', true);
      const tier3Interval = getRefreshInterval('ROKU', true);

      expect(tier1Interval).toBeLessThan(tier2Interval);
      expect(tier2Interval).toBeLessThan(tier3Interval);
    });

    test('should reduce API calls by at least 50% for realistic universe', () => {
      const projection = calculateExpectedApiCalls();
      expect(projection.reduction).toBeGreaterThan(50);
    });
  });
});
