/**
 * AlfaValue™ Discount Rate Tests - FASE 2
 *
 * Unit tests for CAPM discount rate calculation:
 * - DR = RF + β × MRP
 * - Clamp: [5%, 15%]
 * - Tests cover various beta values, risk premiums, and edge cases
 *
 * Tests follow AAA pattern (Arrange, Act, Assert)
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper: Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Helper: Calculate CAPM discount rate
 * Formula: DR = RF + β × MRP
 */
function calculateDiscountRate(rf: number, beta: number, mrp: number): number {
  const dr = rf + beta * mrp;
  return clamp(dr, 0.05, 0.15); // [5%, 15%] safety clamp
}

describe('AlfaValue™ CAPM Discount Rate', () => {
  const DR_MIN = 0.05; // 5% minimum
  const DR_MAX = 0.15; // 15% maximum

  describe('Standard CAPM Formula: DR = RF + β × MRP', () => {
    it('should calculate DR correctly for market beta (β=1.0)', () => {
      // Arrange: Market-average stock
      const rf = 0.04; // 4% risk-free rate (10Y Treasury)
      const beta = 1.0; // Market beta
      const mrp = 0.05; // 5% market risk premium

      // Act: DR = 0.04 + 1.0 × 0.05 = 0.09
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.09); // 9%
    });

    it('should calculate DR for low-volatility stock (β=0.7)', () => {
      // Arrange: Defensive consumer staple
      const rf = 0.04; // 4%
      const beta = 0.7; // Low volatility
      const mrp = 0.05; // 5%

      // Act: DR = 0.04 + 0.7 × 0.05 = 0.075
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBeCloseTo(0.075, 3); // 7.5%
    });

    it('should calculate DR for high-volatility stock (β=1.5)', () => {
      // Arrange: High-growth tech stock
      const rf = 0.04; // 4%
      const beta = 1.5; // High volatility
      const mrp = 0.05; // 5%

      // Act: DR = 0.04 + 1.5 × 0.05 = 0.115
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBeCloseTo(0.115, 3); // 11.5%
    });

    it('should handle minimum beta (β=0.5)', () => {
      // Arrange: Very stable utility stock
      const rf = 0.04; // 4%
      const beta = 0.5; // Minimum allowed beta
      const mrp = 0.05; // 5%

      // Act: DR = 0.04 + 0.5 × 0.05 = 0.065
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBeCloseTo(0.065, 3); // 6.5%
    });

    it('should handle maximum beta (β=2.0)', () => {
      // Arrange: Volatile speculative stock
      const rf = 0.04; // 4%
      const beta = 2.0; // Maximum allowed beta
      const mrp = 0.05; // 5%

      // Act: DR = 0.04 + 2.0 × 0.05 = 0.14
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.14); // 14%
    });
  });

  describe('Safety Clamps: [5%, 15%]', () => {
    it('should clamp to 5% minimum for very low DR', () => {
      // Arrange: Unrealistically low inputs
      const rf = 0.01; // 1% (near-zero rates)
      const beta = 0.5; // Low beta
      const mrp = 0.02; // 2% (low premium)

      // Act: DR = 0.01 + 0.5 × 0.02 = 0.02 (2%)
      const dr_unclamped = rf + beta * mrp;
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Clamped to 5% minimum
      expect(dr_unclamped).toBeLessThan(DR_MIN);
      expect(dr).toBe(DR_MIN);
    });

    it('should clamp to 15% maximum for very high DR', () => {
      // Arrange: High interest rate environment
      const rf = 0.08; // 8% (high rates)
      const beta = 2.0; // High beta
      const mrp = 0.08; // 8% (high premium)

      // Act: DR = 0.08 + 2.0 × 0.08 = 0.24 (24%)
      const dr_unclamped = rf + beta * mrp;
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Clamped to 15% maximum
      expect(dr_unclamped).toBeGreaterThan(DR_MAX);
      expect(dr).toBe(DR_MAX);
    });

    it('should not clamp when within bounds', () => {
      // Arrange: Typical market conditions
      const rf = 0.04; // 4%
      const beta = 1.2; // Slightly above market
      const mrp = 0.05; // 5%

      // Act: DR = 0.04 + 1.2 × 0.05 = 0.10 (10%)
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: No clamping needed
      expect(dr).toBe(0.10);
      expect(dr).toBeGreaterThan(DR_MIN);
      expect(dr).toBeLessThan(DR_MAX);
    });
  });

  describe('Risk-Free Rate Variations', () => {
    it('should handle low interest rate environment (RF=2%)', () => {
      // Arrange: Post-2008 low rates
      const rf = 0.02; // 2%
      const beta = 1.0;
      const mrp = 0.05;

      // Act: DR = 0.02 + 1.0 × 0.05 = 0.07
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.07); // 7%
    });

    it('should handle high interest rate environment (RF=6%)', () => {
      // Arrange: 1980s-style high rates
      const rf = 0.06; // 6%
      const beta = 1.0;
      const mrp = 0.05;

      // Act: DR = 0.06 + 1.0 × 0.05 = 0.11
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.11); // 11%
    });

    it('should handle default fallback RF (4%)', () => {
      // Arrange: Using default when API fails
      const rf = 0.04; // Default fallback
      const beta = 1.0;
      const mrp = 0.05;

      // Act
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.09); // 9%
    });
  });

  describe('Market Risk Premium Variations', () => {
    it('should handle low risk premium (MRP=3%)', () => {
      // Arrange: Calm market conditions
      const rf = 0.04;
      const beta = 1.0;
      const mrp = 0.03; // 3% low premium

      // Act: DR = 0.04 + 1.0 × 0.03 = 0.07
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.07); // 7%
    });

    it('should handle high risk premium (MRP=8%)', () => {
      // Arrange: Crisis/volatile market
      const rf = 0.04;
      const beta = 1.0;
      const mrp = 0.08; // 8% high premium

      // Act: DR = 0.04 + 1.0 × 0.08 = 0.12
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.12); // 12%
    });

    it('should handle default fallback MRP (5%)', () => {
      // Arrange: Using default when API fails
      const rf = 0.04;
      const beta = 1.0;
      const mrp = 0.05; // Default fallback

      // Act
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.09); // 9%
    });
  });

  describe('Beta Sensitivity Analysis', () => {
    it('should show linear relationship between beta and DR', () => {
      // Arrange: Fixed RF and MRP, varying beta
      const rf = 0.04;
      const mrp = 0.05;
      const betas = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];

      // Act: Calculate DR for each beta
      const drs = betas.map(beta => calculateDiscountRate(rf, beta, mrp));

      // Assert: Each 0.1 increase in beta adds 0.5% to DR
      // β=0.5 → 6.5%, β=0.8 → 8.0%, β=1.0 → 9.0%, β=1.2 → 10.0%, β=1.5 → 11.5%, β=2.0 → 14.0%
      expect(drs[0]).toBeCloseTo(0.065, 3);
      expect(drs[1]).toBeCloseTo(0.08, 3);
      expect(drs[2]).toBe(0.09);
      expect(drs[3]).toBe(0.10);
      expect(drs[4]).toBeCloseTo(0.115, 3);
      expect(drs[5]).toBe(0.14);
    });

    it('should show higher DR for higher beta (risk)', () => {
      // Arrange
      const rf = 0.04;
      const mrp = 0.05;

      // Act
      const dr_low_risk = calculateDiscountRate(rf, 0.6, mrp);
      const dr_avg_risk = calculateDiscountRate(rf, 1.0, mrp);
      const dr_high_risk = calculateDiscountRate(rf, 1.8, mrp);

      // Assert: Higher beta → higher discount rate
      expect(dr_low_risk).toBeLessThan(dr_avg_risk);
      expect(dr_avg_risk).toBeLessThan(dr_high_risk);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should calculate DR for AAPL (β≈1.2)', () => {
      // Arrange: Apple - large cap tech
      const rf = 0.04; // 4% current 10Y
      const beta = 1.2; // Slightly above market
      const mrp = 0.05; // 5% standard

      // Act: DR = 0.04 + 1.2 × 0.05 = 0.10
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.10); // 10%
    });

    it('should calculate DR for KO (β≈0.6)', () => {
      // Arrange: Coca-Cola - defensive consumer staple
      const rf = 0.04; // 4%
      const beta = 0.6; // Low volatility
      const mrp = 0.05; // 5%

      // Act: DR = 0.04 + 0.6 × 0.05 = 0.07
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBe(0.07); // 7%
    });

    it('should calculate DR for NVDA (β≈1.7)', () => {
      // Arrange: NVIDIA - high-growth semiconductor
      const rf = 0.04; // 4%
      const beta = 1.7; // High volatility
      const mrp = 0.05; // 5%

      // Act: DR = 0.04 + 1.7 × 0.05 = 0.125
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert
      expect(dr).toBeCloseTo(0.125, 3); // 12.5%
    });

    it('should calculate DR for default beta (β=1.0) when missing', () => {
      // Arrange: Company with no beta available
      const rf = 0.04;
      const beta = 1.0; // Default fallback
      const mrp = 0.05;

      // Act
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Uses market beta
      expect(dr).toBe(0.09); // 9%
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero beta (theoretical minimum)', () => {
      // Arrange: Risk-free asset (theoretical)
      const rf = 0.04;
      const beta = 0.0; // No market risk
      const mrp = 0.05;

      // Act: DR = 0.04 + 0.0 × 0.05 = 0.04
      const dr_unclamped = rf + beta * mrp;
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Clamped to 5% minimum
      expect(dr_unclamped).toBe(0.04);
      expect(dr).toBe(DR_MIN); // Clamped
    });

    it('should handle negative beta (inverse correlation)', () => {
      // Arrange: Gold mining stock (theoretical)
      const rf = 0.04;
      const beta = -0.2; // Negative correlation
      const mrp = 0.05;

      // Act: DR = 0.04 + (-0.2) × 0.05 = 0.03
      const dr_unclamped = rf + beta * mrp;
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Clamped to 5% minimum
      expect(dr_unclamped).toBe(0.03);
      expect(dr).toBe(DR_MIN);
    });

    it('should handle extreme beta (β>2.0)', () => {
      // Arrange: Penny stock / speculative asset
      const rf = 0.04;
      const beta = 3.0; // Extreme volatility (would be clamped in real system)
      const mrp = 0.05;

      // Act: DR = 0.04 + 3.0 × 0.05 = 0.19
      const dr_unclamped = rf + beta * mrp;
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Clamped to 15% maximum
      expect(dr_unclamped).toBe(0.19);
      expect(dr).toBe(DR_MAX);
    });
  });

  describe('Precision and Rounding', () => {
    it('should maintain precision to 4 decimal places', () => {
      // Arrange
      const rf = 0.0425; // 4.25%
      const beta = 1.15;
      const mrp = 0.0535; // 5.35%

      // Act: DR = 0.0425 + 1.15 × 0.0535 = 0.103525
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Precise calculation
      expect(dr).toBeCloseTo(0.103525, 4);
    });

    it('should handle boundary rounding correctly', () => {
      // Arrange: Inputs that result in exactly 5.0%
      const rf = 0.03;
      const beta = 0.5;
      const mrp = 0.04;

      // Act: DR = 0.03 + 0.5 × 0.04 = 0.05
      const dr = calculateDiscountRate(rf, beta, mrp);

      // Assert: Exactly at boundary
      expect(dr).toBe(0.05);
    });
  });
});
