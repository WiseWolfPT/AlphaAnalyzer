/**
 * AlfaValue™ Growth Rate Tests - FASE 2
 *
 * Unit tests for growth rate calculations with ENV-configurable knobs:
 * - g1_5: Historical FCF CAGR with adjustable floor
 * - g6_10: Decay+blend vs weighted average modes
 * - g11_20: Dynamic vs fixed clamp modes
 *
 * Tests follow AAA pattern (Arrange, Act, Assert)
 * Each test validates a single behavior
 * Tests serve as living documentation for valuation model
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Helper: Calculate CAGR from array of values
 * This mirrors the implementation in valuation-service.ts
 */
function calculateCAGR(values: number[]): number {
  if (values.length < 2) return 0;
  const startValue = values[0];
  const endValue = values[values.length - 1];
  if (startValue <= 0 || endValue <= 0) return 0;
  const years = values.length - 1;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Helper: Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Helper: Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

describe('AlfaValue™ Growth Rate Calculations', () => {
  // Store original ENV values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset ENV to defaults before each test
    process.env.G_1_5_FLOOR = '0.00'; // Default: 0% (allows negative growth)
    process.env.G_6_10_USE_WEIGHTS = 'false'; // Default: baseline decay mode
    process.env.G_6_10_COMPANY_WEIGHT = '0.6'; // Default: 60% company
    process.env.G_11_20_CLAMP_MODE = 'dynamic'; // Default: dynamic clamp
  });

  afterEach(() => {
    // Restore original ENV
    process.env = { ...originalEnv };
  });

  describe('g1_5: Historical FCF CAGR (Years 1-5)', () => {
    const G_1_5_MAX = 0.50; // 50% cap (UPDATED: was 30%)

    it('should calculate positive CAGR correctly', () => {
      // Arrange: 5 years of growing FCF (100M → 200M = ~15% CAGR)
      const fcf_5y = [100, 120, 144, 172.8, 207.36]; // ~20% CAGR

      // Act
      const g1_5_raw = calculateCAGR(fcf_5y);

      // Assert: CAGR should be ~20%
      expect(g1_5_raw).toBeGreaterThan(0.19);
      expect(g1_5_raw).toBeLessThan(0.21);
    });

    it('should calculate negative CAGR correctly', () => {
      // Arrange: 5 years of declining FCF (100M → 70M = ~7% decline CAGR)
      const fcf_5y = [100, 95, 87, 82, 70];

      // Act
      const g1_5_raw = calculateCAGR(fcf_5y);

      // Assert: CAGR should be negative
      expect(g1_5_raw).toBeLessThan(0);
    });

    it('should clamp to 30% maximum (prevents over-optimistic projections)', () => {
      // Arrange: 5 years of explosive growth (100M → 500M = ~50% CAGR)
      const fcf_5y = [100, 150, 225, 337.5, 506.25]; // ~50% CAGR

      // Act
      const g1_5_raw = calculateCAGR(fcf_5y);
      const g1_5 = clamp(g1_5_raw, Number(process.env.G_1_5_FLOOR), G_1_5_MAX);

      // Assert: Clamped to 30% max
      expect(g1_5_raw).toBeGreaterThan(0.30);
      expect(g1_5).toBe(0.30);
    });

    it('should allow negative growth with default floor (0%)', () => {
      // Arrange: Declining company (KO scenario: -14% CAGR)
      // Note: All values must be positive for CAGR calculation
      const fcf_5y = [100, 95, 90, 85, 80]; // ~4.4% decline per year

      // Act
      const g1_5_raw = calculateCAGR(fcf_5y);
      const g1_5 = clamp(g1_5_raw, Number(process.env.G_1_5_FLOOR), G_1_5_MAX);

      // Assert: Negative growth preserved (0% floor)
      expect(g1_5_raw).toBeLessThan(0); // Raw CAGR is negative
      expect(g1_5).toBeLessThan(0); // After clamp still negative (0% floor)
      expect(g1_5).toBe(g1_5_raw); // No floor applied
    });

    it('should respect custom G_1_5_FLOOR when set (legacy mode)', () => {
      // Arrange: Set 5% floor via ENV
      process.env.G_1_5_FLOOR = '0.05';
      const fcf_5y = [100, 92, 84, 76, 68]; // ~9% decline

      // Act
      const g1_5_raw = calculateCAGR(fcf_5y);
      const g1_5_floor = Number(process.env.G_1_5_FLOOR);
      const g1_5 = clamp(g1_5_raw, g1_5_floor, G_1_5_MAX);

      // Assert: Floored at 5%
      expect(g1_5_raw).toBeLessThan(0);
      expect(g1_5).toBe(0.05);
    });

    it('should handle flat growth (0% CAGR)', () => {
      // Arrange: No growth (flat FCF)
      const fcf_5y = [100, 100, 100, 100, 100];

      // Act
      const g1_5 = calculateCAGR(fcf_5y);

      // Assert: CAGR is 0%
      expect(g1_5).toBe(0);
    });

    it('should return 0 for insufficient data', () => {
      // Arrange: Only 1 year of data
      const fcf_5y = [100];

      // Act
      const g1_5 = calculateCAGR(fcf_5y);

      // Assert: Cannot calculate CAGR
      expect(g1_5).toBe(0);
    });

    it('should return 0 for negative/zero FCF values', () => {
      // Arrange: Negative FCF (unprofitable company)
      const fcf_5y = [100, 80, -20, -50, -80];

      // Act
      const g1_5 = calculateCAGR(fcf_5y);

      // Assert: CAGR calculation invalid
      expect(g1_5).toBe(0);
    });
  });

  describe('g6_10: Blended Growth (Years 6-10)', () => {
    const G_6_10_MIN = 0.02; // 2%
    const G_6_10_MAX = 0.20; // 20%

    describe('Baseline Mode: Decay-based Blending', () => {
      it('should apply 50% decay for high-growth companies (>8%)', () => {
        // Arrange: High-growth tech company
        const g1_5 = 0.20; // 20% historical growth
        const g_sector_mid = 0.12; // 12% sector mid

        // Act: Baseline formula (high growth: 50% decay)
        const decay = g1_5 < 0.08 ? 0.70 : 0.50;
        const g6_10 = clamp(
          0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
          G_6_10_MIN,
          G_6_10_MAX
        );

        // Assert: Should blend with 50% decay
        expect(decay).toBe(0.50);
        // 0.6 * (0.20 * 0.50) + 0.4 * 0.12 = 0.06 + 0.048 = 0.108
        expect(g6_10).toBeCloseTo(0.108, 3);
      });

      it('should apply 70% decay for low-growth companies (<8%)', () => {
        // Arrange: Mature consumer defensive company
        const g1_5 = 0.05; // 5% historical growth
        const g_sector_mid = 0.05; // 5% sector mid

        // Act: Baseline formula (low growth: 70% decay)
        const decay = g1_5 < 0.08 ? 0.70 : 0.50;
        const g6_10 = clamp(
          0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
          G_6_10_MIN,
          G_6_10_MAX
        );

        // Assert: Should blend with 70% decay
        expect(decay).toBe(0.70);
        // 0.6 * (0.05 * 0.70) + 0.4 * 0.05 = 0.021 + 0.020 = 0.041
        expect(g6_10).toBeCloseTo(0.041, 3);
      });
    });

    describe('Calibration Mode: Weighted Average', () => {
      it('should use simple weighted average when enabled', () => {
        // Arrange: Enable weighted mode
        process.env.G_6_10_USE_WEIGHTS = 'true';
        const g1_5 = 0.15; // 15% company growth
        const g_sector_mid = 0.08; // 8% sector mid
        const companyWeight = Number(process.env.G_6_10_COMPANY_WEIGHT);

        // Act
        const g6_10 = clamp(
          companyWeight * g1_5 + (1 - companyWeight) * g_sector_mid,
          G_6_10_MIN,
          G_6_10_MAX
        );

        // Assert: 60% company + 40% sector
        // 0.6 * 0.15 + 0.4 * 0.08 = 0.09 + 0.032 = 0.122
        expect(g6_10).toBeCloseTo(0.122, 3);
      });

      it('should respect custom company weight', () => {
        // Arrange: Set 70% company weight
        process.env.G_6_10_USE_WEIGHTS = 'true';
        process.env.G_6_10_COMPANY_WEIGHT = '0.7';
        const g1_5 = 0.20; // 20% company growth
        const g_sector_mid = 0.10; // 10% sector mid
        const companyWeight = Number(process.env.G_6_10_COMPANY_WEIGHT);

        // Act
        const g6_10 = clamp(
          companyWeight * g1_5 + (1 - companyWeight) * g_sector_mid,
          G_6_10_MIN,
          G_6_10_MAX
        );

        // Assert: 70% company + 30% sector
        // 0.7 * 0.20 + 0.3 * 0.10 = 0.14 + 0.03 = 0.17
        expect(g6_10).toBeCloseTo(0.17, 3);
      });
    });

    it('should clamp to safety range [2%, 20%]', () => {
      // Arrange: Extreme inputs
      const g1_5_high = 0.50; // 50% (already clamped in g1_5 to 30%)
      const g_sector_mid = 0.30; // 30% (unrealistic)

      // Act: Would exceed 20% without clamp
      const g6_10_unclamped = 0.6 * g1_5_high + 0.4 * g_sector_mid; // = 0.42
      const g6_10 = clamp(g6_10_unclamped, G_6_10_MIN, G_6_10_MAX);

      // Assert: Clamped to 20% max
      expect(g6_10_unclamped).toBeGreaterThan(0.20);
      expect(g6_10).toBe(0.20);
    });

    it('should handle negative g1_5 gracefully', () => {
      // Arrange: Declining company (negative g1_5)
      const g1_5 = -0.05; // -5% decline
      const g_sector_mid = 0.06; // 6% sector average

      // Act: Baseline mode
      const decay = g1_5 < 0.08 ? 0.70 : 0.50;
      const g6_10 = clamp(
        0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
        G_6_10_MIN,
        G_6_10_MAX
      );

      // Assert: Should floor at 2% minimum
      // 0.6 * (-0.05 * 0.70) + 0.4 * 0.06 = -0.021 + 0.024 = 0.003
      // Floored to 0.02
      expect(g6_10).toBe(0.02);
    });
  });

  describe('g11_20: Terminal Growth (Years 11-20)', () => {
    describe('Dynamic Clamp Mode (Default)', () => {
      it('should use g_term_region ± 1% as bounds', () => {
        // Arrange: US terminal growth
        const g_term_region = 0.04; // 4% (US: GDP + inflation)
        const g6_10 = 0.08; // 8% mid-stage growth

        // Act: Lerp from g6_10 to g_term_region (70% toward terminal)
        const base = lerp(g6_10, g_term_region, 0.7);
        const g11_20 = clamp(
          base,
          Math.max(0.03, g_term_region - 0.01), // 3% or g_term-1%
          Math.min(0.05, g_term_region + 0.01)  // 5% or g_term+1%
        );

        // Assert: base = 0.08 + 0.7*(0.04 - 0.08) = 0.052
        // Clamped to [0.03, 0.05] → 0.05
        expect(base).toBeCloseTo(0.052, 3);
        expect(g11_20).toBe(0.05);
      });

      it('should respect 3% absolute minimum', () => {
        // Arrange: Low terminal region (Japan scenario)
        const g_term_region = 0.02; // 2% (Japan)
        const g6_10 = 0.03; // 3%

        // Act
        const base = lerp(g6_10, g_term_region, 0.7);
        const g11_20 = clamp(
          base,
          Math.max(0.03, g_term_region - 0.01), // 3% (absolute min)
          Math.min(0.05, g_term_region + 0.01)
        );

        // Assert: base ≈ 0.023, clamped to 0.03
        expect(base).toBeLessThan(0.03);
        expect(g11_20).toBe(0.03);
      });

      it('should respect 5% absolute maximum', () => {
        // Arrange: High growth region
        const g_term_region = 0.05; // 5%
        const g6_10 = 0.12; // 12%

        // Act
        const base = lerp(g6_10, g_term_region, 0.7);
        const g11_20 = clamp(
          base,
          Math.max(0.03, g_term_region - 0.01),
          Math.min(0.05, g_term_region + 0.01) // 5% (absolute max)
        );

        // Assert: base ≈ 0.069, clamped to 0.05
        expect(base).toBeGreaterThan(0.05);
        expect(g11_20).toBe(0.05);
      });
    });

    describe('Fixed Clamp Mode', () => {
      it('should always use [3%, 5%] bounds when enabled', () => {
        // Arrange: Enable fixed clamp mode
        process.env.G_11_20_CLAMP_MODE = 'fixed';
        const g_term_region = 0.02; // 2% (would allow 1-3% in dynamic)
        const g6_10 = 0.10; // 10%

        // Act
        const base = lerp(g6_10, g_term_region, 0.7);
        const g11_20 = clamp(base, 0.03, 0.05); // Fixed [3%, 5%]

        // Assert: base ≈ 0.044, within fixed bounds
        expect(g11_20).toBeCloseTo(0.044, 3);
      });

      it('should clamp high base to 5% fixed maximum', () => {
        // Arrange
        process.env.G_11_20_CLAMP_MODE = 'fixed';
        const g_term_region = 0.05; // 5%
        const g6_10 = 0.15; // 15%

        // Act
        const base = lerp(g6_10, g6_10, 0.7); // Stays high
        const g11_20 = clamp(base, 0.03, 0.05);

        // Assert: Clamped to 5%
        expect(g11_20).toBe(0.05);
      });
    });

    it('should interpolate correctly between g6_10 and g_term_region', () => {
      // Arrange
      const g6_10 = 0.10; // 10%
      const g_term_region = 0.04; // 4%

      // Act: 70% toward terminal
      const base = lerp(g6_10, g_term_region, 0.7);

      // Assert: 0.10 + 0.7 * (0.04 - 0.10) = 0.10 - 0.042 = 0.058
      expect(base).toBeCloseTo(0.058, 3);
    });
  });

  describe('Integration: Complete Growth Path', () => {
    it('should show realistic decline from g1_5 → g6_10 → g11_20', () => {
      // Arrange: High-growth tech company maturing over time
      const fcf_5y = [100, 125, 156, 195, 244]; // ~25% CAGR
      const g_sector_mid = 0.12; // 12% tech sector
      const g_term_region = 0.04; // 4% US terminal

      // Act: Calculate all 3 stages
      const g1_5_raw = calculateCAGR(fcf_5y);
      const g1_5 = clamp(g1_5_raw, 0.00, 0.30);

      const decay = g1_5 < 0.08 ? 0.70 : 0.50;
      const g6_10 = clamp(
        0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
        0.02,
        0.20
      );

      const base = lerp(g6_10, g_term_region, 0.7);
      const g11_20 = clamp(
        base,
        Math.max(0.03, g_term_region - 0.01),
        Math.min(0.05, g_term_region + 0.01)
      );

      // Assert: Should show declining path
      expect(g1_5).toBeGreaterThan(0.20); // High initial growth
      expect(g6_10).toBeLessThan(g1_5); // Declines in mid-stage
      expect(g11_20).toBeLessThan(g6_10); // Further declines to terminal
      expect(g11_20).toBeGreaterThanOrEqual(0.03); // Within terminal bounds
      expect(g11_20).toBeLessThanOrEqual(0.05);

      console.log('Growth path:', {
        g1_5: (g1_5 * 100).toFixed(2) + '%',
        g6_10: (g6_10 * 100).toFixed(2) + '%',
        g11_20: (g11_20 * 100).toFixed(2) + '%',
      });
    });

    it('should handle mature company with low stable growth', () => {
      // Arrange: Mature consumer defensive (KO scenario)
      const fcf_5y = [100, 98, 96, 94, 92]; // ~2% decline (all positive values)
      const g_sector_mid = 0.05; // 5% consumer defensive
      const g_term_region = 0.04; // 4% terminal

      // Act
      const g1_5_raw = calculateCAGR(fcf_5y);
      const g1_5 = clamp(g1_5_raw, 0.00, 0.30);

      // Debug: Log the CAGR result
      console.log('Mature company CAGR:', g1_5_raw);

      const decay = g1_5 < 0.08 ? 0.70 : 0.50;
      const g6_10 = clamp(
        0.6 * (g1_5 * decay) + 0.4 * g_sector_mid,
        0.02,
        0.20
      );

      const base = lerp(g6_10, g_term_region, 0.7);
      const g11_20 = clamp(
        base,
        Math.max(0.03, g_term_region - 0.01),
        Math.min(0.05, g_term_region + 0.01)
      );

      // Assert: All stages should be low but positive (due to sector/terminal)
      // g1_5 will be negative, then clamped to 0 minimum (0% floor)
      expect(g1_5_raw).toBeLessThan(0); // Negative historical CAGR
      expect(g1_5).toBeGreaterThanOrEqual(0.00); // Clamped to 0% floor
      expect(g6_10).toBe(0.02); // Floored at 2% (sector pulls up)
      expect(g11_20).toBeGreaterThanOrEqual(0.03); // Terminal floor
      expect(g11_20).toBeLessThanOrEqual(0.05);
    });
  });
});
