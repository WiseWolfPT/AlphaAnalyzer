/**
 * Comprehensive test suite for Intrinsic Value calculations
 * Covers Adam Khoo method, edge cases, and validation
 */
import {
  calculateIntrinsicValue,
  calculateOptimalPE,
  validateIntrinsicValueParams,
  getValuationColor,
  getValuationBorderColor,
  formatCurrency,
  formatPercentage,
  calculateCAGR,
  calculateFairValueTarget,
  type IntrinsicValueParams,
  type IntrinsicValueResult
} from '../intrinsic-value';

describe('Intrinsic Value Calculations - Adam Khoo Method', () => {
  const baseParams: IntrinsicValueParams = {
    eps: 5.89,
    growthRate: 15,
    horizon: 10,
    peMultiple: 25,
    requiredReturn: 10,
    marginOfSafety: 25
  };

  describe('calculateIntrinsicValue - Core Logic', () => {
    it('should calculate intrinsic value correctly with base parameters', () => {
      const currentPrice = 150;
      const result = calculateIntrinsicValue(currentPrice, baseParams);

      // Future EPS = 5.89 * (1.15)^10 ≈ 23.83
      expect(result.futureEPS).toBeCloseTo(23.83, 1);
      
      // Future Price = 23.83 * 25 ≈ 595.71
      expect(result.futurePrice).toBeCloseTo(595.71, 1);
      
      // Present Value = 595.71 / (1.10)^10 ≈ 229.67
      expect(result.presentValue).toBeCloseTo(229.67, 1);
      
      // Intrinsic Value = 229.67 * (1 - 0.25) ≈ 172.25
      expect(result.intrinsicValue).toBeCloseTo(172.25, 1);
      
      // Delta % = (172.25/150 - 1) * 100 ≈ 14.83%
      expect(result.deltaPercent).toBeCloseTo(14.83, 1);
      
      expect(result.valuation).toBe('overvalued'); // > 3%
    });

    it('should cap growth rate at 20%', () => {
      const highGrowthParams = {
        ...baseParams,
        growthRate: 50 // Should be capped at 20%
      };

      const result1 = calculateIntrinsicValue(150, highGrowthParams);
      const cappedParams = {
        ...baseParams,
        growthRate: 20
      };
      const result2 = calculateIntrinsicValue(150, cappedParams);

      expect(result1.futureEPS).toEqual(result2.futureEPS);
      expect(result1.intrinsicValue).toEqual(result2.intrinsicValue);
    });

    it('should handle zero EPS edge case', () => {
      const zeroEpsParams = {
        ...baseParams,
        eps: 0
      };

      const result = calculateIntrinsicValue(150, zeroEpsParams);

      expect(result.futureEPS).toBe(0);
      expect(result.futurePrice).toBe(0);
      expect(result.presentValue).toBe(0);
      expect(result.intrinsicValue).toBe(0);
      expect(result.deltaPercent).toBe(-100);
      expect(result.valuation).toBe('undervalued');
    });

    it('should handle negative EPS', () => {
      const negativeEpsParams = {
        ...baseParams,
        eps: -2.5
      };

      const result = calculateIntrinsicValue(150, negativeEpsParams);

      expect(result.futureEPS).toBeLessThan(0);
      expect(result.futurePrice).toBeLessThan(0);
      expect(result.presentValue).toBeLessThan(0);
      expect(result.intrinsicValue).toBeLessThan(0);
    });

    it('should classify valuations correctly', () => {
      const testCases = [
        { currentPrice: 200, expectedValuation: 'undervalued' as const },
        { currentPrice: 175, expectedValuation: 'neutral' as const },
        { currentPrice: 150, expectedValuation: 'overvalued' as const },
        { currentPrice: 100, expectedValuation: 'overvalued' as const }
      ];

      testCases.forEach(({ currentPrice, expectedValuation }) => {
        const result = calculateIntrinsicValue(currentPrice, baseParams);
        expect(result.valuation).toBe(expectedValuation);
      });
    });

    it('should handle extreme parameter values', () => {
      const extremeParams: IntrinsicValueParams = {
        eps: 0.01, // Very low EPS
        growthRate: 1, // Very low growth
        horizon: 1, // Short horizon
        peMultiple: 5, // Low PE
        requiredReturn: 30, // High required return
        marginOfSafety: 50 // High margin of safety
      };

      const result = calculateIntrinsicValue(100, extremeParams);

      expect(result.futureEPS).toBeCloseTo(0.0101, 4);
      expect(result.futurePrice).toBeCloseTo(0.0505, 4);
      expect(result.presentValue).toBeCloseTo(0.0388, 4);
      expect(result.intrinsicValue).toBeCloseTo(0.0194, 4);
      expect(result.valuation).toBe('undervalued');
    });

    it('should handle floating point precision correctly', () => {
      const precisionParams = {
        ...baseParams,
        eps: 1.1111111111,
        growthRate: 12.3456789,
        peMultiple: 18.9876543
      };

      const result = calculateIntrinsicValue(123.456789, precisionParams);

      // Should not throw and should have reasonable precision
      expect(result.futureEPS).toBeGreaterThan(0);
      expect(result.intrinsicValue).toBeGreaterThan(0);
      expect(Number.isFinite(result.deltaPercent)).toBe(true);
    });
  });

  describe('calculateOptimalPE', () => {
    it('should return default PE when current PE is null', () => {
      const result = calculateOptimalPE(null, 15);
      expect(result).toBe(15);
    });

    it('should return minimum of current PE, 2x growth rate, and max PE', () => {
      expect(calculateOptimalPE(30, 10)).toBe(20); // min(30, 20, 35) = 20
      expect(calculateOptimalPE(15, 25)).toBe(15); // min(15, 50, 35) = 15
      expect(calculateOptimalPE(40, 30)).toBe(35); // min(40, 60, 35) = 35
    });

    it('should handle edge cases', () => {
      expect(calculateOptimalPE(0, 10)).toBe(15); // Returns default when current PE is 0
      expect(calculateOptimalPE(100, 0)).toBe(0); // min(100, 0, 35) = 0
      expect(calculateOptimalPE(-5, 10)).toBe(-5);
    });
  });

  describe('validateIntrinsicValueParams', () => {
    it('should validate all parameters correctly', () => {
      const result = validateIntrinsicValueParams(baseParams);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch invalid EPS values', () => {
      const invalidEpsParams = [
        { eps: 0 },
        { eps: -5 },
        { eps: undefined }
      ];

      invalidEpsParams.forEach(params => {
        const result = validateIntrinsicValueParams(params);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('EPS must be a positive number');
      });
    });

    it('should validate growth rate boundaries', () => {
      const testCases = [
        { growthRate: -5, shouldBeValid: false },
        { growthRate: 0, shouldBeValid: true },
        { growthRate: 25, shouldBeValid: true },
        { growthRate: 50, shouldBeValid: true },
        { growthRate: 60, shouldBeValid: false }
      ];

      testCases.forEach(({ growthRate, shouldBeValid }) => {
        const result = validateIntrinsicValueParams({ ...baseParams, growthRate });
        expect(result.isValid).toBe(shouldBeValid);
        if (!shouldBeValid) {
          expect(result.errors).toContain('Growth rate must be between 0% and 50%');
        }
      });
    });

    it('should validate horizon boundaries', () => {
      const testCases = [
        { horizon: 0, shouldBeValid: false },
        { horizon: 1, shouldBeValid: true },
        { horizon: 10, shouldBeValid: true },
        { horizon: 20, shouldBeValid: true },
        { horizon: 25, shouldBeValid: false }
      ];

      testCases.forEach(({ horizon, shouldBeValid }) => {
        const result = validateIntrinsicValueParams({ ...baseParams, horizon });
        expect(result.isValid).toBe(shouldBeValid);
        if (!shouldBeValid) {
          expect(result.errors).toContain('Horizon must be between 1 and 20 years');
        }
      });
    });

    it('should validate all parameters simultaneously', () => {
      const invalidParams = {
        eps: -1,
        growthRate: 60,
        horizon: 25,
        peMultiple: -5,
        requiredReturn: 2,
        marginOfSafety: 60
      };

      const result = validateIntrinsicValueParams(invalidParams);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(6);
    });
  });

  describe('Color and Display Utilities', () => {
    it('should return correct colors for valuations', () => {
      expect(getValuationColor('undervalued')).toBe('bg-positive text-white');
      expect(getValuationColor('overvalued')).toBe('bg-negative text-white');
      expect(getValuationColor('neutral')).toBe('bg-neutral text-black');
      expect(getValuationColor('unknown')).toBe('bg-muted text-muted-foreground');
    });

    it('should return correct border colors for valuations', () => {
      expect(getValuationBorderColor('undervalued')).toBe('border-positive');
      expect(getValuationBorderColor('overvalued')).toBe('border-negative');
      expect(getValuationBorderColor('neutral')).toBe('border-neutral');
      expect(getValuationBorderColor('unknown')).toBe('border-border');
    });
  });

  describe('Formatting Utilities', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(150.25)).toBe('$150.25');
      expect(formatCurrency(1234.567, 2)).toBe('$1,234.57');
      expect(formatCurrency(0.99, 3)).toBe('$0.990');
      expect(formatCurrency(-50.75)).toBe('-$50.75');
    });

    it('should format percentages correctly', () => {
      expect(formatPercentage(15.67)).toBe('+15.67%');
      expect(formatPercentage(-8.23)).toBe('-8.23%');
      expect(formatPercentage(0)).toBe('+0.00%');
      expect(formatPercentage(5.1, 1)).toBe('+5.1%');
    });

    it('should handle edge cases in formatting', () => {
      expect(formatCurrency(Infinity)).toContain('$');
      expect(formatCurrency(NaN)).toContain('$');
      expect(formatPercentage(Infinity)).toContain('%');
      expect(formatPercentage(NaN)).toContain('%');
    });
  });

  describe('Financial Calculation Utilities', () => {
    it('should calculate CAGR correctly', () => {
      // 100 to 200 over 5 years = 14.87% CAGR
      expect(calculateCAGR(100, 200, 5)).toBeCloseTo(14.87, 2);
      
      // 150 to 120 over 3 years ≈ -7.17% CAGR
      expect(calculateCAGR(150, 120, 3)).toBeCloseTo(-7.17, 1);
      
      // Same value = 0% CAGR
      expect(calculateCAGR(100, 100, 5)).toBe(0);
    });

    it('should handle CAGR edge cases', () => {
      // Zero beginning value
      expect(calculateCAGR(0, 100, 5)).toBe(Infinity);
      
      // Zero ending value
      expect(calculateCAGR(100, 0, 5)).toBe(-100);
      
      // Negative values
      expect(calculateCAGR(-100, -200, 5)).toBeCloseTo(14.87, 2);
      
      // Single period
      expect(calculateCAGR(100, 150, 1)).toBe(50);
    });

    it('should calculate fair value target correctly', () => {
      // Intrinsic value 100, margin of safety 25% = target 133.33
      expect(calculateFairValueTarget(100, 25)).toBeCloseTo(133.33, 2);
      
      // Zero margin of safety
      expect(calculateFairValueTarget(150, 0)).toBe(150);
      
      // High margin of safety
      expect(calculateFairValueTarget(100, 50)).toBe(200);
    });

    it('should handle fair value target edge cases', () => {
      // Negative intrinsic value
      expect(calculateFairValueTarget(-100, 25)).toBeCloseTo(-133.33, 2);
      
      // Zero intrinsic value
      expect(calculateFairValueTarget(0, 25)).toBe(0);
      
      // 100% margin of safety (would be division by zero)
      expect(calculateFairValueTarget(100, 100)).toBe(Infinity);
    });
  });

  describe('Integration Tests', () => {
    it('should produce consistent results for known stock scenario', () => {
      // Simulating Apple-like scenario
      const appleParams: IntrinsicValueParams = {
        eps: 6.05,
        growthRate: 8,
        horizon: 10,
        peMultiple: 24,
        requiredReturn: 12,
        marginOfSafety: 20
      };

      const currentPrice = 150;
      const result = calculateIntrinsicValue(currentPrice, appleParams);

      // Verify calculation chain
      expect(result.futureEPS).toBeCloseTo(6.05 * Math.pow(1.08, 10), 2);
      expect(result.futurePrice).toBeCloseTo(result.futureEPS * 24, 2);
      expect(result.presentValue).toBeCloseTo(result.futurePrice / Math.pow(1.12, 10), 2);
      expect(result.intrinsicValue).toBeCloseTo(result.presentValue * 0.8, 2);
      
      // Verify delta calculation
      const expectedDelta = (result.intrinsicValue / currentPrice - 1) * 100;
      expect(result.deltaPercent).toBeCloseTo(expectedDelta, 2);
    });

    it('should handle validation and calculation together', () => {
      const invalidParams = {
        eps: -1,
        growthRate: 15,
        horizon: 10,
        peMultiple: 25,
        requiredReturn: 10,
        marginOfSafety: 25
      };

      const validation = validateIntrinsicValueParams(invalidParams);
      expect(validation.isValid).toBe(false);

      // Should still calculate (garbage in, garbage out)
      const result = calculateIntrinsicValue(150, invalidParams as IntrinsicValueParams);
      expect(result.futureEPS).toBeLessThan(0);
    });

    it('should maintain precision across complex calculations', () => {
      const precisionParams: IntrinsicValueParams = {
        eps: 1.23456789,
        growthRate: 12.3456,
        horizon: 7,
        peMultiple: 18.765,
        requiredReturn: 11.234,
        marginOfSafety: 23.456
      };

      const result = calculateIntrinsicValue(123.456, precisionParams);

      // Verify no precision loss leads to NaN or Infinity
      expect(Number.isFinite(result.futureEPS)).toBe(true);
      expect(Number.isFinite(result.futurePrice)).toBe(true);
      expect(Number.isFinite(result.presentValue)).toBe(true);
      expect(Number.isFinite(result.intrinsicValue)).toBe(true);
      expect(Number.isFinite(result.deltaPercent)).toBe(true);
    });
  });

  describe('Real-world Edge Cases', () => {
    it('should handle very high growth stocks (like tech companies)', () => {
      const techParams: IntrinsicValueParams = {
        eps: 0.5, // Low current earnings
        growthRate: 20, // High growth (will be capped)
        horizon: 10,
        peMultiple: 50, // High PE multiple
        requiredReturn: 15, // Higher risk requirement
        marginOfSafety: 30 // Conservative margin
      };

      const result = calculateIntrinsicValue(300, techParams);
      
      expect(result.valuation).toBeDefined();
      expect(result.intrinsicValue).toBeGreaterThan(0);
    });

    it('should handle mature dividend-paying stocks', () => {
      const matureParams: IntrinsicValueParams = {
        eps: 8.5, // Higher current earnings
        growthRate: 3, // Low growth
        horizon: 15, // Longer horizon
        peMultiple: 12, // Conservative PE
        requiredReturn: 8, // Lower risk requirement
        marginOfSafety: 15 // Moderate margin
      };

      const result = calculateIntrinsicValue(120, matureParams);
      
      expect(result.valuation).toBeDefined();
      expect(result.intrinsicValue).toBeGreaterThan(0);
    });

    it('should handle distressed/turnaround stocks', () => {
      const distressedParams: IntrinsicValueParams = {
        eps: 0.1, // Very low earnings
        growthRate: 50, // Very high growth (will be capped to 20%)
        horizon: 5, // Shorter horizon for uncertainty
        peMultiple: 15, // Moderate PE
        requiredReturn: 20, // High risk requirement
        marginOfSafety: 40 // High margin for risk
      };

      const result = calculateIntrinsicValue(50, distressedParams);
      
      expect(result.valuation).toBeDefined();
      expect(result.futureEPS).toBeCloseTo(0.1 * Math.pow(1.2, 5), 2); // Growth capped at 20%
    });
  });
});