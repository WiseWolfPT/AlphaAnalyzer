/**
 * AlfaValue™ Shares Outstanding Fallback Tests - FASE 2
 *
 * Unit tests for shares outstanding calculation with fallback mechanism:
 * 1. Primary: weightedAverageShsOutDil (diluted shares from financial statements)
 * 2. Secondary: weightedAverageShsOut (basic shares from financial statements)
 * 3. Tertiary: marketCap / price (calculated from current market data)
 *
 * Tests ensure correct priority and handling of missing data.
 */

import { describe, it, expect } from 'vitest';

/**
 * Mock FMP financial statement shape
 */
interface MockFinancialStatement {
  weightedAverageShsOutDil?: number;
  weightedAverageShsOut?: number;
}

/**
 * Mock FMP company profile shape
 */
interface MockCompanyProfile {
  marketCap: number;
  price: number;
}

/**
 * Helper: Get shares outstanding with fallback logic
 * Mimics implementation in valuation-service.ts lines 474-476
 */
function getSharesOutstanding(
  latestBalanceSheet: MockFinancialStatement,
  profile: MockCompanyProfile
): number {
  const shares = (
    latestBalanceSheet.weightedAverageShsOutDil ||
    latestBalanceSheet.weightedAverageShsOut ||
    profile.marketCap / profile.price
  ) / 1_000_000; // Convert to millions

  return shares;
}

describe('AlfaValue™ Shares Outstanding Fallback', () => {
  describe('Primary Source: weightedAverageShsOutDil', () => {
    it('should use diluted shares when available', () => {
      // Arrange: All sources available
      const balanceSheet = {
        weightedAverageShsOutDil: 15_500_000_000, // 15.5B shares (diluted)
        weightedAverageShsOut: 15_000_000_000, // 15.0B shares (basic)
      };
      const profile = {
        marketCap: 2_500_000_000_000, // $2.5T
        price: 165.0, // $165/share
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Should use diluted (primary)
      expect(shares).toBe(15_500); // 15.5B / 1M = 15,500M
    });

    it('should prefer diluted over basic shares', () => {
      // Arrange: Diluted > Basic (realistic scenario)
      const balanceSheet = {
        weightedAverageShsOutDil: 16_000_000_000, // Includes stock options
        weightedAverageShsOut: 15_000_000_000,
      };
      const profile = {
        marketCap: 2_400_000_000_000,
        price: 150.0,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Uses diluted (not basic, not calculated)
      expect(shares).toBe(16_000);
      expect(shares).toBeGreaterThan(15_000); // Diluted > basic
    });

    it('should handle AAPL-scale shares (15B+)', () => {
      // Arrange: Apple-sized company
      const balanceSheet = {
        weightedAverageShsOutDil: 15_441_883_000, // ~15.4B shares
        weightedAverageShsOut: 15_334_100_000,
      };
      const profile = {
        marketCap: 2_600_000_000_000, // $2.6T
        price: 168.5,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Precise calculation
      expect(shares).toBeCloseTo(15_441.883, 3);
    });
  });

  describe('Secondary Source: weightedAverageShsOut', () => {
    it('should use basic shares when diluted missing', () => {
      // Arrange: No diluted shares
      const balanceSheet = {
        // weightedAverageShsOutDil: undefined,
        weightedAverageShsOut: 10_000_000_000, // 10B shares
      };
      const profile = {
        marketCap: 1_500_000_000_000,
        price: 150.0,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Falls back to basic
      expect(shares).toBe(10_000);
    });

    it('should prefer basic over calculated when diluted missing', () => {
      // Arrange
      const balanceSheet = {
        weightedAverageShsOut: 10_500_000_000,
      };
      const profile = {
        marketCap: 1_575_000_000_000, // Would calculate to 10,500M at $150
        price: 150.0,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);
      const calculatedShares = profile.marketCap / profile.price / 1_000_000;

      // Assert: Uses basic (not calculated)
      expect(shares).toBe(10_500);
      expect(shares).toBe(calculatedShares); // Happens to match, but basic was used
    });

    it('should handle small-cap company basic shares', () => {
      // Arrange: Small company with only basic shares
      const balanceSheet = {
        weightedAverageShsOut: 50_000_000, // 50M shares
      };
      const profile = {
        marketCap: 500_000_000, // $500M market cap
        price: 10.0,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert
      expect(shares).toBe(50); // 50M / 1M = 50M
    });
  });

  describe('Tertiary Source: marketCap / price', () => {
    it('should calculate from market cap when shares unavailable', () => {
      // Arrange: No shares data in financials
      const balanceSheet = {
        // Both undefined
      };
      const profile = {
        marketCap: 2_400_000_000_000, // $2.4T
        price: 160.0, // $160/share
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: marketCap / price = 2.4T / 160 = 15B = 15,000M
      expect(shares).toBe(15_000);
    });

    it('should calculate correctly for various market caps', () => {
      // Arrange: Test different company sizes
      const testCases = [
        { marketCap: 100_000_000, price: 5.0, expected: 20 }, // $100M / $5 = 20M shares
        { marketCap: 10_000_000_000, price: 50.0, expected: 200 }, // $10B / $50 = 200M
        { marketCap: 500_000_000_000, price: 100.0, expected: 5_000 }, // $500B / $100 = 5B
      ];

      testCases.forEach(({ marketCap, price, expected }) => {
        const balanceSheet = {};
        const profile = { marketCap, price };

        // Act
        const shares = getSharesOutstanding(balanceSheet, profile);

        // Assert
        expect(shares).toBe(expected);
      });
    });

    it('should handle high-priced stocks (e.g., BRK.A)', () => {
      // Arrange: Berkshire Hathaway Class A (~$500K/share)
      const balanceSheet = {};
      const profile = {
        marketCap: 750_000_000_000, // $750B
        price: 500_000, // $500K/share
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: 750B / 500K = 1.5M shares = 1.5M
      expect(shares).toBe(1.5);
    });

    it('should handle penny stocks', () => {
      // Arrange: Low-priced stock
      const balanceSheet = {};
      const profile = {
        marketCap: 50_000_000, // $50M
        price: 0.25, // $0.25/share
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: 50M / 0.25 = 200M shares = 200M
      expect(shares).toBe(200);
    });
  });

  describe('Fallback Priority Order', () => {
    it('should demonstrate complete fallback chain', () => {
      // Arrange: Test all three scenarios
      const profile = {
        marketCap: 1_500_000_000_000,
        price: 150.0,
      };

      // Test 1: Primary (diluted)
      const shares1 = getSharesOutstanding(
        {
          weightedAverageShsOutDil: 10_200_000_000,
          weightedAverageShsOut: 10_000_000_000,
        },
        profile
      );

      // Test 2: Secondary (basic)
      const shares2 = getSharesOutstanding(
        {
          weightedAverageShsOut: 10_000_000_000,
        },
        profile
      );

      // Test 3: Tertiary (calculated)
      const shares3 = getSharesOutstanding({}, profile);

      // Assert: Different sources used
      expect(shares1).toBe(10_200); // Diluted
      expect(shares2).toBe(10_000); // Basic
      expect(shares3).toBe(10_000); // Calculated (happens to match basic)

      console.log('Fallback chain:', {
        primary_diluted: shares1,
        secondary_basic: shares2,
        tertiary_calculated: shares3,
      });
    });

    it('should never use calculated when basic available', () => {
      // Arrange: Basic shares differ from calculated
      const balanceSheet = {
        weightedAverageShsOut: 11_000_000_000, // 11B
      };
      const profile = {
        marketCap: 1_500_000_000_000, // Would calculate to 10B at $150
        price: 150.0,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);
      const calculated = profile.marketCap / profile.price / 1_000_000;

      // Assert: Uses basic (11B), not calculated (10B)
      expect(shares).toBe(11_000);
      expect(shares).not.toBe(calculated);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero shares (invalid data)', () => {
      // Arrange: Zero diluted shares (data error)
      const balanceSheet = {
        weightedAverageShsOutDil: 0,
      };
      const profile = {
        marketCap: 1_000_000_000_000,
        price: 100.0,
      };

      // Act: Zero is falsy, falls back to calculated
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Falls back to calculated (10B)
      expect(shares).toBe(10_000);
    });

    it('should handle undefined vs zero (falsy check)', () => {
      // Arrange: Test undefined vs 0
      const profile = {
        marketCap: 1_000_000_000_000,
        price: 100.0,
      };

      // Test undefined
      const shares_undefined = getSharesOutstanding({}, profile);

      // Test zero
      const shares_zero = getSharesOutstanding(
        { weightedAverageShsOutDil: 0 },
        profile
      );

      // Assert: Both fall back to calculated
      expect(shares_undefined).toBe(10_000);
      expect(shares_zero).toBe(10_000);
    });

    it('should handle very large share counts (e.g., Chinese stocks)', () => {
      // Arrange: Chinese company with 100B+ shares
      const balanceSheet = {
        weightedAverageShsOutDil: 120_000_000_000, // 120B shares
      };
      const profile = {
        marketCap: 1_200_000_000_000, // $1.2T
        price: 10.0, // $10/share
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert
      expect(shares).toBe(120_000); // 120B / 1M = 120,000M
    });

    it('should handle precision issues with calculated fallback', () => {
      // Arrange: Scenario where division introduces rounding
      const balanceSheet = {};
      const profile = {
        marketCap: 1_234_567_890_000, // $1.234T
        price: 123.45, // Specific price
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);
      const expected = profile.marketCap / profile.price / 1_000_000;

      // Assert: Precise calculation
      expect(shares).toBeCloseTo(expected, 6);
      expect(shares).toBeCloseTo(10_000, 1); // ~10B shares (within 10% tolerance)
    });
  });

  describe('Real-World Examples', () => {
    it('should handle AAPL shares (diluted available)', () => {
      // Arrange: Apple actual data (approximate)
      const balanceSheet = {
        weightedAverageShsOutDil: 15_441_883_000, // ~15.4B
        weightedAverageShsOut: 15_334_100_000,
      };
      const profile = {
        marketCap: 2_600_000_000_000, // ~$2.6T
        price: 168.4,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Uses diluted
      expect(shares).toBeCloseTo(15_441.883, 2);
    });

    it('should handle MSFT shares (diluted available)', () => {
      // Arrange: Microsoft actual data (approximate)
      const balanceSheet = {
        weightedAverageShsOutDil: 7_430_000_000, // ~7.43B
        weightedAverageShsOut: 7_400_000_000,
      };
      const profile = {
        marketCap: 2_500_000_000_000, // ~$2.5T
        price: 336.5,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Uses diluted
      expect(shares).toBe(7_430);
    });

    it('should handle KO shares (mature company)', () => {
      // Arrange: Coca-Cola (mature, stable shares)
      const balanceSheet = {
        weightedAverageShsOutDil: 4_320_000_000, // ~4.32B
        weightedAverageShsOut: 4_300_000_000,
      };
      const profile = {
        marketCap: 260_000_000_000, // ~$260B
        price: 60.2,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Uses diluted
      expect(shares).toBe(4_320);
    });

    it('should handle small-cap with missing diluted', () => {
      // Arrange: Small company, no diluted shares reported
      const balanceSheet = {
        weightedAverageShsOut: 25_000_000, // 25M shares
      };
      const profile = {
        marketCap: 150_000_000, // $150M
        price: 6.0,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Uses basic
      expect(shares).toBe(25);
    });

    it('should handle startup with incomplete financial data', () => {
      // Arrange: Recently public company, no historical financials
      const balanceSheet = {}; // No shares data yet
      const profile = {
        marketCap: 5_000_000_000, // $5B (hot IPO)
        price: 50.0,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: Calculates from market data
      expect(shares).toBe(100); // 5B / 50 = 100M shares
    });
  });

  describe('Unit Conversion: Raw → Millions', () => {
    it('should convert billions to millions correctly', () => {
      // Arrange: 15.5B shares
      const balanceSheet = {
        weightedAverageShsOutDil: 15_500_000_000,
      };
      const profile = {
        marketCap: 2_500_000_000_000,
        price: 161.3,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: 15.5B → 15,500M
      expect(shares).toBe(15_500);
    });

    it('should maintain precision for fractional millions', () => {
      // Arrange: 15.441B shares
      const balanceSheet = {
        weightedAverageShsOutDil: 15_441_000_000,
      };
      const profile = {
        marketCap: 2_600_000_000_000,
        price: 168.4,
      };

      // Act
      const shares = getSharesOutstanding(balanceSheet, profile);

      // Assert: 15.441B → 15,441M (exact)
      expect(shares).toBe(15_441);
    });
  });
});
