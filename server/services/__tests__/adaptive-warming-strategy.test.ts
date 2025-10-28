/**
 * Tests for Adaptive Warming Strategy - ONDA 7 Bug Fix
 *
 * Focus: Type coercion bug fix for lastWarmed (string vs Date)
 *
 * Root cause: Redis returns ISO timestamps as strings, but calculatePriority
 * expected Date objects and called .getTime() without validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WarmingContext } from '../adaptive-warming-strategy';
import { calculatePriority, isMarketOpen } from '../adaptive-warming-strategy';

describe('calculatePriority() - Type Coercion Bug Fix', () => {
  let baseContext: WarmingContext;

  beforeEach(() => {
    // Base context with minimal valid data
    baseContext = {
      sp100: ['AAPL', 'MSFT', 'GOOGL'],
      sp500: ['IBM', 'INTC'],
      extended: ['SMCI', 'NVAX'],
      analytics: {
        getViews: () => 0
      },
      earningsCalendar: {
        getNext: () => null
      },
      cache: {
        getLastWarmed: () => null
      },
      marketHours: {
        isOpen: () => false
      }
    };
  });

  describe('Edge Case 1: lastWarmed as ISO string (from Redis)', () => {
    it('should handle lastWarmed as string without throwing TypeError', async () => {
      const ticker = 'AAPL';
      const methodId = 'dcf20-ocf';

      // Simulate Redis returning ISO string
      const lastWarmedString = '2025-10-24T19:00:00.000Z';

      const context: WarmingContext = {
        ...baseContext,
        cache: {
          getLastWarmed: () => lastWarmedString as any // Simulate Redis behavior
        }
      };

      // Should NOT throw TypeError
      await expect(calculatePriority(ticker, methodId, context)).resolves.toBeGreaterThan(0);
    });

    it('should calculate correct staleness priority for string timestamp', async () => {
      const ticker = 'AAPL';
      const methodId = 'dcf20-ocf';

      // 25 hours ago (should get +2 priority for very stale)
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      const context: WarmingContext = {
        ...baseContext,
        sp100: ['AAPL'], // +3 for tier
        cache: {
          getLastWarmed: () => twentyFiveHoursAgo as any
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Base (1) + Tier SP100 (3) + Very Stale (2) = 6, capped at 5
      expect(priority).toBe(5);
    });

    it('should handle moderately stale string timestamp (12-20 hours)', async () => {
      const ticker = 'AAPL';
      const methodId = 'dcf20-ocf';

      // 15 hours ago (should get +1 priority for moderately stale)
      const fifteenHoursAgo = new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString();

      const context: WarmingContext = {
        ...baseContext,
        sp100: [], // Clear SP100 (AAPL is there by default)
        sp500: ['AAPL'], // +2 for tier
        cache: {
          getLastWarmed: () => fifteenHoursAgo as any
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Base (1) + Tier SP500 (2) + Moderately Stale (1) = 4
      expect(priority).toBe(4);
    });
  });

  describe('Edge Case 2: lastWarmed as Date object (backward compatibility)', () => {
    it('should still handle Date object correctly', async () => {
      const ticker = 'MSFT';
      const methodId = 'dfcf20';

      // 25 hours ago as Date object
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const context: WarmingContext = {
        ...baseContext,
        sp100: ['MSFT'],
        cache: {
          getLastWarmed: () => twentyFiveHoursAgo
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Should NOT throw and should calculate correctly
      expect(priority).toBe(5);
    });

    it('should handle fresh Date object (< 12 hours)', async () => {
      const ticker = 'GOOGL';
      const methodId = 'dni20';

      // 5 hours ago
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

      const context: WarmingContext = {
        ...baseContext,
        sp100: ['GOOGL'],
        cache: {
          getLastWarmed: () => fiveHoursAgo
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Base (1) + Tier SP100 (3) + No staleness (0) = 4
      expect(priority).toBe(4);
    });
  });

  describe('Edge Case 3: lastWarmed as null (never warmed)', () => {
    it('should handle null lastWarmed without throwing', async () => {
      const ticker = 'NVAX';
      const methodId = 'peg';

      const context: WarmingContext = {
        ...baseContext,
        cache: {
          getLastWarmed: () => null
        }
      };

      await expect(calculatePriority(ticker, methodId, context)).resolves.toBeGreaterThan(0);
    });

    it('should assign high priority to never-warmed stocks', async () => {
      const ticker = 'SMCI';
      const methodId = 'fmp-dcf-fcf';

      const context: WarmingContext = {
        ...baseContext,
        extended: ['SMCI'], // +1 for tier
        cache: {
          getLastWarmed: () => null
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Base (1) + Tier Extended (1) + Never Warmed (2) = 4
      expect(priority).toBe(4);
    });
  });

  describe('Edge Case 4: Invalid date strings', () => {
    it('should handle invalid ISO string gracefully', async () => {
      const ticker = 'AAPL';
      const methodId = 'dcf20-ocf';

      const context: WarmingContext = {
        ...baseContext,
        cache: {
          getLastWarmed: () => 'invalid-date-string' as any
        }
      };

      // Should NOT throw
      await expect(calculatePriority(ticker, methodId, context)).resolves.toBeGreaterThan(0);
    });

    it('should treat invalid date as never warmed (high priority)', async () => {
      const ticker = 'MSFT';
      const methodId = 'pe-mean';

      const context: WarmingContext = {
        ...baseContext,
        sp100: ['MSFT'],
        cache: {
          getLastWarmed: () => 'not-a-date' as any
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Should treat as never warmed
      // Base (1) + Tier SP100 (3) + Never Warmed (2) = 6, capped at 5
      expect(priority).toBe(5);
    });
  });

  describe('Edge Case 5: undefined lastWarmed', () => {
    it('should handle undefined gracefully', async () => {
      const ticker = 'IBM';
      const methodId = 'pb-mean';

      const context: WarmingContext = {
        ...baseContext,
        cache: {
          getLastWarmed: () => undefined as any
        }
      };

      await expect(calculatePriority(ticker, methodId, context)).resolves.toBeGreaterThan(0);
    });
  });

  describe('Integration: Multiple priority factors', () => {
    it('should combine tier + staleness + user activity + earnings + market hours', async () => {
      const ticker = 'AAPL';
      const methodId = 'dcf20-ocf';

      // Very stale (25 hours ago) as string
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      // Earnings in 5 days
      const earningsDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const context: WarmingContext = {
        ...baseContext,
        sp100: ['AAPL'], // +3
        analytics: {
          getViews: () => 150 // +2 (>100 views)
        },
        earningsCalendar: {
          getNext: () => earningsDate // +2 (within 7 days)
        },
        cache: {
          getLastWarmed: () => twentyFiveHoursAgo as any // +2 (very stale string)
        },
        marketHours: {
          isOpen: () => true // +1
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Base (1) + Tier (3) + Views (2) + Earnings (2) + Staleness (2) + Market (1) = 11
      // Capped at 5
      expect(priority).toBe(5);
    });

    it('should handle mixed string/Date scenario in production', async () => {
      const ticker = 'MSFT';
      const methodId = 'dfcf-terminal';

      // Simulate production: first call returns string, second returns Date
      let callCount = 0;

      const context: WarmingContext = {
        ...baseContext,
        sp100: ['MSFT'],
        cache: {
          getLastWarmed: () => {
            callCount++;
            if (callCount === 1) {
              return '2025-10-24T12:00:00.000Z' as any; // String
            } else {
              return new Date('2025-10-24T12:00:00.000Z'); // Date
            }
          }
        }
      };

      // Both calls should work
      await expect(calculatePriority(ticker, methodId, context)).resolves.toBeGreaterThan(0);
      await expect(calculatePriority(ticker, methodId, context)).resolves.toBeGreaterThan(0);
    });
  });

  describe('Priority capping', () => {
    it('should never exceed priority 5', async () => {
      const ticker = 'AAPL';
      const methodId = 'dcf20-ocf';

      // Max everything
      const veryStale = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString();
      const earningsTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const context: WarmingContext = {
        ...baseContext,
        sp100: ['AAPL'], // +3
        analytics: {
          getViews: () => 1000 // +2
        },
        earningsCalendar: {
          getNext: () => earningsTomorrow // +3
        },
        cache: {
          getLastWarmed: () => veryStale as any // +2
        },
        marketHours: {
          isOpen: () => true // +1
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Should be capped at 5 despite sum being 12
      expect(priority).toBe(5);
    });

    it('should have minimum priority of 1', async () => {
      const ticker = 'UNKNOWN';
      const methodId = 'custom';

      // Not in any tier, no activity, no earnings, fresh cache, market closed
      const justNow = new Date().toISOString();

      const context: WarmingContext = {
        ...baseContext,
        sp100: [],
        sp500: [],
        extended: ['UNKNOWN'], // +1
        cache: {
          getLastWarmed: () => justNow as any // Fresh, no bonus
        }
      };

      const priority = await calculatePriority(ticker, methodId, context);

      // Base (1) + Tier Extended (1) = 2
      expect(priority).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('isMarketOpen()', () => {
  it('should return boolean without throwing', async () => {
    const result = isMarketOpen();
    expect(typeof result).toBe('boolean');
  });
});
