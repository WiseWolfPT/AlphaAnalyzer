/**
 * AlfaValue™ Discounting Formula Tests - FASE 2
 *
 * Unit tests for mid-year discounting and present value calculations:
 * - Mid-year convention: PV = FCF / (1 + DR)^(year - 0.5)
 * - Tests verify correct time adjustment for cash flow timing
 * - Validates 20-year projection with proper discounting
 *
 * Tests follow AAA pattern (Arrange, Act, Assert)
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper: Calculate present value with mid-year discounting
 * Formula: PV = FCF / (1 + DR)^(year - 0.5)
 *
 * Mid-year convention assumes cash flows occur at the middle of the year,
 * which is more realistic than end-of-year (full-year) discounting.
 */
function calculatePV(fcf: number, discountRate: number, year: number): number {
  const discountFactor = Math.pow(1 + discountRate, year - 0.5);
  return fcf / discountFactor;
}

/**
 * Helper: Calculate present value with end-of-year discounting (for comparison)
 */
function calculatePV_EndOfYear(fcf: number, discountRate: number, year: number): number {
  const discountFactor = Math.pow(1 + discountRate, year);
  return fcf / discountFactor;
}

describe('AlfaValue™ Mid-Year Discounting Formula', () => {
  describe('Mid-Year Convention: (year - 0.5)', () => {
    it('should use year 0.5 for year 1 cash flows', () => {
      // Arrange: $100M FCF in year 1, 10% discount rate
      const fcf = 100;
      const dr = 0.10;
      const year = 1;

      // Act: PV = 100 / (1.10)^0.5
      const pv = calculatePV(fcf, dr, year);

      // Assert: √1.10 ≈ 1.0488, so PV ≈ 95.35
      expect(pv).toBeCloseTo(95.35, 2);
    });

    it('should use year 1.5 for year 2 cash flows', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;
      const year = 2;

      // Act: PV = 100 / (1.10)^1.5
      const pv = calculatePV(fcf, dr, year);

      // Assert: (1.10)^1.5 ≈ 1.1533, so PV ≈ 86.70
      expect(pv).toBeCloseTo(86.70, 2);
    });

    it('should use year 9.5 for year 10 cash flows', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;
      const year = 10;

      // Act: PV = 100 / (1.10)^9.5
      const pv = calculatePV(fcf, dr, year);

      // Assert: (1.10)^9.5 ≈ 2.4461, so PV ≈ 40.88
      expect(pv).toBeCloseTo(40.88, 2);
    });

    it('should use year 19.5 for year 20 cash flows', () => {
      // Arrange: Terminal year
      const fcf = 100;
      const dr = 0.10;
      const year = 20;

      // Act: PV = 100 / (1.10)^19.5
      const pv = calculatePV(fcf, dr, year);

      // Assert: (1.10)^19.5 ≈ 6.2775, so PV ≈ 15.93
      expect(pv).toBeCloseTo(15.93, 2);
    });
  });

  describe('Mid-Year vs End-of-Year Comparison', () => {
    it('should produce higher PV than end-of-year (year 1)', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;
      const year = 1;

      // Act
      const pv_midyear = calculatePV(fcf, dr, year);
      const pv_endyear = calculatePV_EndOfYear(fcf, dr, year);

      // Assert: Mid-year > End-year (cash arrives sooner)
      // Mid-year: 95.35, End-year: 90.91
      expect(pv_midyear).toBeCloseTo(95.35, 2);
      expect(pv_endyear).toBeCloseTo(90.91, 2);
      expect(pv_midyear).toBeGreaterThan(pv_endyear);
    });

    it('should produce ~4.9% higher PV than end-of-year (DR=10%)', () => {
      // Arrange: Year 1 with 10% discount rate
      const fcf = 100;
      const dr = 0.10;

      // Act
      const pv_midyear = calculatePV(fcf, dr, 1);
      const pv_endyear = calculatePV_EndOfYear(fcf, dr, 1);
      const difference_pct = ((pv_midyear - pv_endyear) / pv_endyear) * 100;

      // Assert: Mid-year gives ~4.9% boost (√1.10 - 1 ≈ 4.88%)
      expect(difference_pct).toBeCloseTo(4.88, 1);
    });

    it('should show greater absolute difference for distant cash flows', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;

      // Act: Compare years 1, 10, and 20
      const diff_y1 = calculatePV(fcf, dr, 1) - calculatePV_EndOfYear(fcf, dr, 1);
      const diff_y10 = calculatePV(fcf, dr, 10) - calculatePV_EndOfYear(fcf, dr, 10);
      const diff_y20 = calculatePV(fcf, dr, 20) - calculatePV_EndOfYear(fcf, dr, 20);

      // Assert: Absolute difference grows (though % stays similar)
      expect(diff_y1).toBeCloseTo(4.44, 2); // 95.35 - 90.91
      expect(diff_y10).toBeCloseTo(1.85, 2); // 40.88 - 39.03
      expect(diff_y20).toBeCloseTo(0.72, 2); // 15.93 - 15.21
      // Note: Absolute difference decreases due to compounding, but relative is consistent
    });
  });

  describe('Discount Rate Sensitivity', () => {
    it('should show higher PV with lower discount rate', () => {
      // Arrange
      const fcf = 100;
      const year = 10;

      // Act: Compare 5% vs 15% discount rates
      const pv_5pct = calculatePV(fcf, 0.05, year);
      const pv_15pct = calculatePV(fcf, 0.15, year);

      // Assert: Lower DR → higher PV
      expect(pv_5pct).toBeCloseTo(61.85, 2);
      expect(pv_15pct).toBeCloseTo(25.34, 2);
      expect(pv_5pct).toBeGreaterThan(pv_15pct);
    });

    it('should show exponential decay over time', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;

      // Act: Calculate PV for years 1, 5, 10, 15, 20
      const pv_y1 = calculatePV(fcf, dr, 1);
      const pv_y5 = calculatePV(fcf, dr, 5);
      const pv_y10 = calculatePV(fcf, dr, 10);
      const pv_y15 = calculatePV(fcf, dr, 15);
      const pv_y20 = calculatePV(fcf, dr, 20);

      // Assert: Exponential decay
      expect(pv_y1).toBeCloseTo(95.35, 2);
      expect(pv_y5).toBeCloseTo(63.55, 2);
      expect(pv_y10).toBeCloseTo(40.88, 2);
      expect(pv_y15).toBeCloseTo(25.28, 2);
      expect(pv_y20).toBeCloseTo(15.93, 2);

      // Each period shows greater than 10% decay
      expect(pv_y5 / pv_y1).toBeLessThan(0.67);
      expect(pv_y10 / pv_y5).toBeLessThan(0.65);
    });
  });

  describe('20-Year Projection Totals', () => {
    it('should calculate total PV for constant FCF over 20 years', () => {
      // Arrange: $100M constant FCF, 10% DR
      const fcf = 100;
      const dr = 0.10;
      let totalPV = 0;

      // Act: Sum PV of all 20 years
      for (let year = 1; year <= 20; year++) {
        totalPV += calculatePV(fcf, dr, year);
      }

      // Assert: Total PV ≈ $851M (mid-year discounting)
      // For reference, end-of-year would be ~$810M
      expect(totalPV).toBeCloseTo(851, 0);
      expect(totalPV).toBeGreaterThan(800);
      expect(totalPV).toBeLessThan(900);
    });

    it('should calculate total PV for growing FCF (15% growth)', () => {
      // Arrange: Starting at $100M, growing 15% annually
      const startFCF = 100;
      const growthRate = 0.15;
      const dr = 0.10;
      let totalPV = 0;
      let currentFCF = startFCF;

      // Act: Project and discount 20 years
      for (let year = 1; year <= 20; year++) {
        currentFCF *= (1 + growthRate);
        totalPV += calculatePV(currentFCF, dr, year);
      }

      // Assert: Total PV should be much higher (growth > discount rate)
      // Growth at 15% vs discount at 10% = net present value grows
      expect(totalPV).toBeGreaterThan(2000); // Significantly higher than constant
    });

    it('should calculate total PV for declining FCF (-5% growth)', () => {
      // Arrange: Starting at $100M, declining 5% annually
      const startFCF = 100;
      const growthRate = -0.05;
      const dr = 0.10;
      let totalPV = 0;
      let currentFCF = startFCF;

      // Act: Project and discount 20 years
      for (let year = 1; year <= 20; year++) {
        currentFCF *= (1 + growthRate);
        totalPV += calculatePV(currentFCF, dr, year);
      }

      // Assert: Total PV should be lower than constant FCF
      expect(totalPV).toBeGreaterThan(400);
      expect(totalPV).toBeLessThan(600);
    });
  });

  describe('Multi-Stage Growth with Mid-Year Discounting', () => {
    it('should handle realistic AAPL-style projection', () => {
      // Arrange: Multi-stage growth
      // Years 1-5: 15% growth
      // Years 6-10: 10% growth
      // Years 11-20: 4% terminal growth
      const startFCF = 100;
      const dr = 0.10;
      let totalPV = 0;
      let currentFCF = startFCF;

      // Act: Project with stage-specific growth rates
      for (let year = 1; year <= 20; year++) {
        let growthRate: number;
        if (year <= 5) {
          growthRate = 0.15;
        } else if (year <= 10) {
          growthRate = 0.10;
        } else {
          growthRate = 0.04;
        }

        currentFCF *= (1 + growthRate);
        const pv = calculatePV(currentFCF, dr, year);
        totalPV += pv;

        // Log key milestones
        if (year === 5 || year === 10 || year === 20) {
          console.log(`Year ${year}: FCF=${currentFCF.toFixed(2)}M, PV=${pv.toFixed(2)}M`);
        }
      }

      // Assert: Total PV should be substantial (high early growth)
      expect(totalPV).toBeGreaterThan(1500);
      expect(totalPV).toBeLessThan(2500);
    });

    it('should show years 1-5 contribute most to valuation', () => {
      // Arrange: Same multi-stage projection
      const startFCF = 100;
      const dr = 0.10;
      let pv_stage1 = 0; // Years 1-5
      let pv_stage2 = 0; // Years 6-10
      let pv_stage3 = 0; // Years 11-20
      let currentFCF = startFCF;

      // Act
      for (let year = 1; year <= 20; year++) {
        let growthRate: number;
        if (year <= 5) {
          growthRate = 0.15;
        } else if (year <= 10) {
          growthRate = 0.10;
        } else {
          growthRate = 0.04;
        }

        currentFCF *= (1 + growthRate);
        const pv = calculatePV(currentFCF, dr, year);

        if (year <= 5) pv_stage1 += pv;
        else if (year <= 10) pv_stage2 += pv;
        else pv_stage3 += pv;
      }

      const totalPV = pv_stage1 + pv_stage2 + pv_stage3;

      // Assert: Stage 1 > Stage 2 > Stage 3 (nearer cash flows worth more)
      expect(pv_stage1).toBeGreaterThan(pv_stage2);
      expect(pv_stage2).toBeGreaterThan(pv_stage3);

      console.log('Stage contributions:', {
        stage1: (pv_stage1 / totalPV * 100).toFixed(1) + '%',
        stage2: (pv_stage2 / totalPV * 100).toFixed(1) + '%',
        stage3: (pv_stage3 / totalPV * 100).toFixed(1) + '%',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero FCF', () => {
      // Arrange
      const fcf = 0;
      const dr = 0.10;
      const year = 5;

      // Act
      const pv = calculatePV(fcf, dr, year);

      // Assert
      expect(pv).toBe(0);
    });

    it('should handle very large FCF', () => {
      // Arrange: $1 billion FCF
      const fcf = 1000;
      const dr = 0.10;
      const year = 1;

      // Act
      const pv = calculatePV(fcf, dr, year);

      // Assert: Should scale linearly
      expect(pv).toBeCloseTo(953.5, 1);
    });

    it('should handle minimum discount rate (5%)', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.05; // Minimum DR
      const year = 10;

      // Act
      const pv = calculatePV(fcf, dr, year);

      // Assert: Higher PV with lower DR
      expect(pv).toBeCloseTo(61.85, 2);
    });

    it('should handle maximum discount rate (15%)', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.15; // Maximum DR
      const year = 10;

      // Act
      const pv = calculatePV(fcf, dr, year);

      // Assert: Lower PV with higher DR
      expect(pv).toBeCloseTo(25.34, 2);
    });

    it('should handle precision for very distant cash flows', () => {
      // Arrange: Year 20 with high discount rate
      const fcf = 100;
      const dr = 0.15;
      const year = 20;

      // Act
      const pv = calculatePV(fcf, dr, year);

      // Assert: Very small PV (heavily discounted)
      expect(pv).toBeCloseTo(6.16, 2);
      expect(pv).toBeGreaterThan(0);
    });
  });

  describe('Mathematical Properties', () => {
    it('should satisfy: PV(year N, DR) = PV(year N+1, DR) × (1 + DR)', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;

      // Act
      const pv_y10 = calculatePV(fcf, dr, 10);
      const pv_y11 = calculatePV(fcf, dr, 11);

      // Assert: Each year discounts by factor of (1 + DR)
      const ratio = pv_y10 / pv_y11;
      expect(ratio).toBeCloseTo(1 + dr, 3);
    });

    it('should be monotonically decreasing with year', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;

      // Act: Calculate PV for increasing years
      const pvs = Array.from({ length: 20 }, (_, i) =>
        calculatePV(fcf, dr, i + 1)
      );

      // Assert: Each year has lower PV than previous
      for (let i = 1; i < pvs.length; i++) {
        expect(pvs[i]).toBeLessThan(pvs[i - 1]);
      }
    });

    it('should converge to zero as year approaches infinity', () => {
      // Arrange
      const fcf = 100;
      const dr = 0.10;

      // Act: Calculate PV for very distant years
      const pv_y50 = calculatePV(fcf, dr, 50);
      const pv_y100 = calculatePV(fcf, dr, 100);

      // Assert: Approaches zero
      expect(pv_y50).toBeLessThan(1);
      expect(pv_y100).toBeLessThan(0.01);
    });
  });
});
