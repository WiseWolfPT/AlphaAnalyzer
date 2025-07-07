import {
  calculateDCF,
  calculatePERatio,
  calculatePEGRatio,
  calculateGrahamNumber,
  calculatePeterLynchFairValue,
  calculateBuffettFairValue,
  calculateIntrinsicValue,
  type ValuationInputs,
} from '../intrinsic-value';

describe('Intrinsic Value Calculations', () => {
  const baseInputs: ValuationInputs = {
    currentPrice: 150,
    eps: 5.89,
    growthRate: 15,
    freeCashFlow: 100000000000, // 100B
    totalDebt: 120000000000, // 120B
    cashAndEquivalents: 50000000000, // 50B
    sharesOutstanding: 15500000000, // 15.5B
    bookValue: 60000000000, // 60B
    dividends: 0.96,
    requiredReturn: 10,
    terminalGrowthRate: 3,
    margin: 25,
  };

  describe('calculateDCF', () => {
    it('should calculate DCF value correctly', () => {
      const dcfValue = calculateDCF(
        baseInputs.freeCashFlow,
        baseInputs.growthRate,
        baseInputs.requiredReturn,
        baseInputs.terminalGrowthRate,
        baseInputs.totalDebt,
        baseInputs.cashAndEquivalents,
        baseInputs.sharesOutstanding
      );

      // DCF = (PV of FCF for 10 years + Terminal Value - Debt + Cash) / Shares
      expect(dcfValue).toBeGreaterThan(0);
      expect(dcfValue).toBeLessThan(500); // Sanity check
    });

    it('should handle negative free cash flow', () => {
      const dcfValue = calculateDCF(
        -10000000000, // Negative FCF
        baseInputs.growthRate,
        baseInputs.requiredReturn,
        baseInputs.terminalGrowthRate,
        baseInputs.totalDebt,
        baseInputs.cashAndEquivalents,
        baseInputs.sharesOutstanding
      );

      expect(dcfValue).toBe(0);
    });

    it('should handle zero shares outstanding', () => {
      const dcfValue = calculateDCF(
        baseInputs.freeCashFlow,
        baseInputs.growthRate,
        baseInputs.requiredReturn,
        baseInputs.terminalGrowthRate,
        baseInputs.totalDebt,
        baseInputs.cashAndEquivalents,
        0 // Zero shares
      );

      expect(dcfValue).toBe(0);
    });

    it('should handle extreme growth rates', () => {
      const highGrowthDCF = calculateDCF(
        baseInputs.freeCashFlow,
        50, // 50% growth
        baseInputs.requiredReturn,
        baseInputs.terminalGrowthRate,
        baseInputs.totalDebt,
        baseInputs.cashAndEquivalents,
        baseInputs.sharesOutstanding
      );

      const lowGrowthDCF = calculateDCF(
        baseInputs.freeCashFlow,
        2, // 2% growth
        baseInputs.requiredReturn,
        baseInputs.terminalGrowthRate,
        baseInputs.totalDebt,
        baseInputs.cashAndEquivalents,
        baseInputs.sharesOutstanding
      );

      expect(highGrowthDCF).toBeGreaterThan(lowGrowthDCF);
    });
  });

  describe('calculatePERatio', () => {
    it('should calculate P/E ratio correctly', () => {
      const pe = calculatePERatio(150, 5.89);
      expect(pe).toBeCloseTo(25.47, 2);
    });

    it('should handle negative EPS', () => {
      const pe = calculatePERatio(150, -2);
      expect(pe).toBe(0);
    });

    it('should handle zero EPS', () => {
      const pe = calculatePERatio(150, 0);
      expect(pe).toBe(0);
    });
  });

  describe('calculatePEGRatio', () => {
    it('should calculate PEG ratio correctly', () => {
      const peg = calculatePEGRatio(25, 15);
      expect(peg).toBeCloseTo(1.67, 2);
    });

    it('should handle zero growth rate', () => {
      const peg = calculatePEGRatio(25, 0);
      expect(peg).toBe(0);
    });

    it('should handle negative growth rate', () => {
      const peg = calculatePEGRatio(25, -5);
      expect(peg).toBe(0);
    });
  });

  describe('calculateGrahamNumber', () => {
    it('should calculate Graham Number correctly', () => {
      const bookValuePerShare = baseInputs.bookValue / baseInputs.sharesOutstanding;
      const grahamNumber = calculateGrahamNumber(baseInputs.eps, bookValuePerShare);
      
      // Graham Number = sqrt(22.5 × EPS × Book Value per Share)
      const expected = Math.sqrt(22.5 * baseInputs.eps * bookValuePerShare);
      expect(grahamNumber).toBeCloseTo(expected, 2);
    });

    it('should handle negative EPS', () => {
      const bookValuePerShare = 4;
      const grahamNumber = calculateGrahamNumber(-2, bookValuePerShare);
      expect(grahamNumber).toBe(0);
    });

    it('should handle negative book value', () => {
      const grahamNumber = calculateGrahamNumber(5, -2);
      expect(grahamNumber).toBe(0);
    });
  });

  describe('calculatePeterLynchFairValue', () => {
    it('should calculate Peter Lynch fair value correctly', () => {
      const fairValue = calculatePeterLynchFairValue(
        baseInputs.eps,
        baseInputs.growthRate,
        baseInputs.dividends
      );
      
      // Fair Value = (EPS × (Growth Rate + 2×Dividend Yield)) × Multiplier
      expect(fairValue).toBeGreaterThan(0);
      expect(fairValue).toBeLessThan(500);
    });

    it('should handle zero growth and dividends', () => {
      const fairValue = calculatePeterLynchFairValue(5, 0, 0);
      expect(fairValue).toBe(0);
    });
  });

  describe('calculateBuffettFairValue', () => {
    it('should calculate Buffett fair value correctly', () => {
      const fairValue = calculateBuffettFairValue(
        baseInputs.freeCashFlow,
        baseInputs.sharesOutstanding,
        baseInputs.growthRate,
        baseInputs.requiredReturn
      );
      
      expect(fairValue).toBeGreaterThan(0);
      expect(fairValue).toBeLessThan(1000);
    });

    it('should handle growth rate equal to required return', () => {
      const fairValue = calculateBuffettFairValue(
        baseInputs.freeCashFlow,
        baseInputs.sharesOutstanding,
        10, // Growth rate same as required return
        10
      );
      
      expect(fairValue).toBe(0);
    });
  });

  describe('calculateIntrinsicValue', () => {
    it('should calculate all valuation methods', () => {
      const result = calculateIntrinsicValue(baseInputs);
      
      expect(result).toHaveProperty('dcf');
      expect(result).toHaveProperty('peRatio');
      expect(result).toHaveProperty('pegRatio');
      expect(result).toHaveProperty('grahamNumber');
      expect(result).toHaveProperty('peterLynch');
      expect(result).toHaveProperty('buffett');
      expect(result).toHaveProperty('averageIntrinsicValue');
      expect(result).toHaveProperty('margin');
      expect(result).toHaveProperty('recommendation');
    });

    it('should provide buy recommendation when undervalued', () => {
      const undervaluedInputs = {
        ...baseInputs,
        currentPrice: 50, // Much lower than intrinsic value
      };
      
      const result = calculateIntrinsicValue(undervaluedInputs);
      expect(result.recommendation).toBe('Strong Buy');
    });

    it('should provide sell recommendation when overvalued', () => {
      const overvaluedInputs = {
        ...baseInputs,
        currentPrice: 500, // Much higher than intrinsic value
      };
      
      const result = calculateIntrinsicValue(overvaluedInputs);
      expect(result.recommendation).toBe('Sell');
    });

    it('should handle missing optional inputs', () => {
      const minimalInputs: ValuationInputs = {
        currentPrice: 100,
        eps: 5,
        growthRate: 10,
        freeCashFlow: 1000000000,
        totalDebt: 0,
        cashAndEquivalents: 0,
        sharesOutstanding: 1000000000,
        bookValue: 5000000000,
        dividends: 0,
      };
      
      const result = calculateIntrinsicValue(minimalInputs);
      expect(result.averageIntrinsicValue).toBeGreaterThan(0);
    });

    it('should exclude invalid calculations from average', () => {
      const invalidInputs: ValuationInputs = {
        ...baseInputs,
        eps: -5, // Negative EPS will invalidate some methods
        freeCashFlow: -1000000, // Negative FCF
      };
      
      const result = calculateIntrinsicValue(invalidInputs);
      
      // Should still calculate average from valid methods
      expect(result.averageIntrinsicValue).toBeGreaterThan(0);
      expect(result.peRatio.value).toBe(0);
      expect(result.dcf.value).toBe(0);
    });
  });
});