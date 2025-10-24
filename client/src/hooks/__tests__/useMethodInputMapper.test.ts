/**
 * TDD RED PHASE: Comprehensive Tests for useMethodInputMapper Hook
 *
 * PURPOSE: Test method-specific input mapping for Financial Inputs dropdown
 * PROBLEM: All 19 methods currently show same (wrong) inputs (fallback to AlfaValue)
 * SOLUTION: Category-aware hook that maps inputs dynamically per method
 *
 * TEST COVERAGE:
 * - DCF Methods (7): alfavalue, dcf-20-fcf, dcf-20-ocf, dcf-20-ni, dni-20, dfcf-terminal, dfcf-20
 * - Multiples Methods (10): pe-mean-5y, pe-median-5y, ps-mean-5y, ps-median-5y, pb-mean-5y, pb-median-5y,
 *                           pe-mean-without-nri, pe-median-without-nri, pb-mean-without-nri, pb-median-without-nri
 * - Growth-Adjusted Methods (2): peg, psg
 *
 * TEST PHILOSOPHY:
 * - Write tests FIRST (TDD Red phase)
 * - All tests should FAIL initially (hook doesn't exist yet)
 * - Tests describe the desired behavior and API contract
 * - Implementation comes AFTER tests pass (Green phase)
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMethodInputMapper } from '../useMethodInputMapper';

describe('useMethodInputMapper - TDD Red Phase', () => {
  /**
   * Mock data representing realistic API response structure
   * Based on actual /api/valuation/iv-chart/:symbol response shape
   */
  const mockValuationChartData = {
    ticker: 'AAPL',
    price: 260.01,
    methods: [
      {
        method_id: 'alfavalue',
        name: 'AlfaValue™',
        category: 'proprietary' as const,
        iv: 125.44,
        discount_pct: -51.74,
        formula: 'Multi-stage DCF',
        confidence: 'HIGH' as const,
        source: 'internal' as const,
        as_of: '2025-10-23',
        inputs: {
          method: 'alfavalue',
          fcf_ttm_musd: 108807,
          total_debt_musd: 119059,
          cash_musd: 65171,
          discount_rate: 0.0947, // Decimal format
          shares_outstanding_m: 15408.095,
          growth_rate_y1_5: 0.1035,
          growth_rate_y6_10: 0.0711,
          growth_rate_y11_20: 0.0493,
        }
      },
      {
        method_id: 'dcf-20-fcf',
        name: 'DCF-20 FCF',
        category: 'dcf' as const,
        iv: 130.22,
        discount_pct: -49.89,
        formula: '20-year DCF using Free Cash Flow',
        confidence: 'HIGH' as const,
        source: 'internal' as const,
        as_of: '2025-10-23',
        inputs: {
          method: 'dcf-20',
          fcf_ttm_musd: 108807,
          total_debt_musd: 119059,
          cash_musd: 65171,
          discount_rate: 0.0627,
          shares_outstanding_m: 15408.095,
          growth_rate_y1_5: 0.1035,
          growth_rate_y6_10: 0.0726,
          growth_rate_y11_20: 0.0363,
        }
      },
      {
        method_id: 'peg',
        name: 'PEG Ratio',
        category: 'growth' as const,
        iv: 103.47,
        discount_pct: -60.19,
        formula: 'Fair PEG × EPS × Growth',
        confidence: 'MED' as const,
        source: 'internal' as const,
        as_of: '2025-10-23',
        inputs: {
          method: 'peg',
          fair_peg_ratio: 1.5,
          last_price: 260.01,
          eps_without_nri: 6.61,
          pe_without_nri: 39.7,
          growth_rate: 0.1007,
          peg_ratio_without_nri: 3.94,
        }
      },
      {
        method_id: 'pe-mean-5y',
        name: 'P/E Mean 5Y',
        category: 'multiples' as const,
        iv: 197.65,
        discount_pct: -23.98,
        formula: 'Mean P/E × EPS TTM',
        confidence: 'HIGH' as const,
        source: 'internal' as const,
        as_of: '2025-10-23',
        inputs: {
          method: 'pe-mean',
          mean_pe_ratio_5y: 29.67,
          current_price: 260.01,
          eps_ttm: 6.662,
          pe_ratios: [28.5, 29.1, 30.2, 31.0, 29.3],
        }
      },
    ],
    macro_multiplier: 1.0,
    macro_sentiment: 'neutral' as const,
    as_of: '2025-10-23',
  };

  /**
   * GROUP 1: NULL HANDLING & DEFENSIVE PROGRAMMING
   * Validate robust error handling for missing/invalid data
   */
  describe('null handling and edge cases', () => {
    it('should return null when valuationChartData is undefined', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('alfavalue', undefined, undefined)
      );

      expect(result.current).toBeNull();
    });

    it('should return null when valuationChartData is null', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('alfavalue', null as any, undefined)
      );

      expect(result.current).toBeNull();
    });

    it('should return null when selectedMethod not found in data', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('nonexistent-method', mockValuationChartData, undefined)
      );

      expect(result.current).toBeNull();
    });

    it('should return null when method has no inputs field', () => {
      const dataWithNoInputs = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'test-method',
            name: 'Test Method',
            category: 'dcf' as const,
            iv: 100,
            discount_pct: 0,
            formula: 'Test',
            confidence: 'HIGH' as const,
            source: 'internal' as const,
            as_of: '2025-10-23',
            // No inputs field
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('test-method', dataWithNoInputs, undefined)
      );

      expect(result.current).toBeNull();
    });

    it('should return null when inputs object is empty', () => {
      const dataWithEmptyInputs = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'test-method',
            name: 'Test Method',
            category: 'dcf' as const,
            iv: 100,
            discount_pct: 0,
            formula: 'Test',
            confidence: 'HIGH' as const,
            source: 'internal' as const,
            as_of: '2025-10-23',
            inputs: {}
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('test-method', dataWithEmptyInputs, undefined)
      );

      expect(result.current).toBeNull();
    });
  });

  /**
   * GROUP 2: DCF METHODS (7 total)
   * All DCF methods map to 'dcf' type with standardized structure
   */
  describe('DCF methods mapping', () => {
    it('should map AlfaValue™ DCF inputs correctly', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('alfavalue', mockValuationChartData, undefined)
      );

      expect(result.current).toEqual({
        type: 'dcf',
        operatingCF: 108807,
        totalDebt: 119059,
        cash: 65171,
        discountRate: 9.47,  // Convert 0.0947 → 9.47%
        shares: 15408.095,
        growthY1_5: 10.35,   // Convert 0.1035 → 10.35%
        growthY6_10: 7.11,
        growthY11_20: 4.93,
        deductDebt: true,
        addCash: true,
      });
    });

    it('should map DCF-20 FCF inputs correctly', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-fcf', mockValuationChartData, undefined)
      );

      expect(result.current?.type).toBe('dcf');
      expect(result.current?.operatingCF).toBe(108807);
      expect(result.current?.discountRate).toBeCloseTo(6.27, 2);
      expect(result.current?.growthY1_5).toBeCloseTo(10.35, 2);
    });

    it('should map DCF-20 OCF inputs correctly', () => {
      const dataWithOCF = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'dcf-20-ocf',
            name: 'DCF-20 OCF',
            category: 'dcf' as const,
            iv: 135.50,
            inputs: {
              method: 'dcf-20',
              ocf_ttm_musd: 122151,
              total_debt_musd: 119059,
              cash_musd: 65171,
              discount_rate: 0.0627,
              shares_outstanding_m: 15408.095,
              growth_rate_y1_5: 0.0987,
              growth_rate_y6_10: 0.0689,
              growth_rate_y11_20: 0.0363,
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', dataWithOCF as any, undefined)
      );

      expect(result.current?.type).toBe('dcf');
      expect(result.current?.operatingCF).toBe(122151);
    });

    it('should map DCF-20 NI inputs correctly', () => {
      const dataWithNI = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'dcf-20-ni',
            name: 'DCF-20 NI',
            category: 'dcf' as const,
            iv: 142.88,
            inputs: {
              method: 'dcf-20',
              ni_ttm_musd: 102678,
              total_debt_musd: 119059,
              cash_musd: 65171,
              discount_rate: 0.0627,
              shares_outstanding_m: 15408.095,
              growth_rate_y1_5: 0.1007,
              growth_rate_y6_10: 0.0726,
              growth_rate_y11_20: 0.0363,
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ni', dataWithNI as any, undefined)
      );

      expect(result.current?.type).toBe('dcf');
      expect(result.current?.operatingCF).toBe(102678);
    });

    it('should map DNI-20 inputs correctly', () => {
      const dataWithDNI = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'dni-20',
            name: 'DNI-20',
            category: 'dcf' as const,
            iv: 138.75,
            inputs: {
              method: 'dni-20',
              ni_ttm_musd: 102678,
              total_debt_musd: 119059,
              cash_musd: 65171,
              discount_rate: 0.0947,
              shares_outstanding_m: 15408.095,
              growth_rate_y1_5: 0.1007,
              growth_rate_y6_10: 0.0726,
              growth_rate_y11_20: 0.0493,
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dni-20', dataWithDNI as any, undefined)
      );

      expect(result.current?.type).toBe('dcf');
      expect(result.current?.operatingCF).toBe(102678);
      expect(result.current?.discountRate).toBeCloseTo(9.47, 2);
    });

    it('should map DFCF Terminal inputs correctly with stage values', () => {
      const dataWithTerminal = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'dfcf-terminal',
            name: 'DFCF Terminal',
            category: 'dcf' as const,
            iv: 137.93,
            inputs: {
              method: 'dfcf-terminal',
              fcf_ttm_musd: 108807,
              total_debt_musd: 119059,
              cash_musd: 65171,
              discount_rate: 0.1036,
              shares_outstanding_m: 15408.095,
              stage1_years: 5,
              stage1_growth_rate: 0.1007,
              stage1_value: 31.92,
              stage2_years: 5,
              stage2_growth_rate: 0.0726,
              stage2_value: 29.17,
              terminal_growth_rate: 0.0363,
              terminal_value: 76.84,
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dfcf-terminal', dataWithTerminal as any, undefined)
      );

      expect(result.current?.type).toBe('dcf');
      expect(result.current?.discountRate).toBeCloseTo(10.36, 2);
      if (result.current?.type === 'dcf') {
        expect(result.current.stage1Years).toBe(5);
        expect(result.current.stage1Value).toBeCloseTo(31.92, 2);
        expect(result.current.stage2Years).toBe(5);
        expect(result.current.stage2Value).toBeCloseTo(29.17, 2);
        expect(result.current.terminalValue).toBeCloseTo(76.84, 2);
      }
    });

    it('should map DFCF-20 inputs correctly', () => {
      const dataWithDFCF = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'dfcf-20',
            name: 'DFCF-20',
            category: 'dcf' as const,
            iv: 130.22,
            inputs: {
              method: 'dfcf-20',
              fcf_ttm_musd: 108807,
              total_debt_musd: 119059,
              cash_musd: 65171,
              discount_rate: 0.0627,
              shares_outstanding_m: 15408.095,
              growth_rate_y1_5: 0.1035,
              growth_rate_y6_10: 0.0726,
              growth_rate_y11_20: 0.0363,
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dfcf-20', dataWithDFCF as any, undefined)
      );

      expect(result.current?.type).toBe('dcf');
      expect(result.current?.operatingCF).toBe(108807);
    });
  });

  /**
   * GROUP 3: GROWTH-ADJUSTED METHODS (2 total)
   * PEG and PSG use growth rates with P/E or P/S multiples
   */
  describe('growth-adjusted methods mapping', () => {
    it('should map PEG Ratio inputs correctly', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('peg', mockValuationChartData, undefined)
      );

      expect(result.current).toEqual({
        type: 'growth-adjusted',
        fairRatio: 1.5,
        lastPrice: 260.01,
        metric: 6.61,
        metricName: 'EPS without NRI',
        growthRate: 10.07,      // Convert 0.1007 → 10.07%
        currentRatio: 39.7,
        actualRatio: 3.94,
      });
    });

    it('should map PSG Ratio inputs correctly', () => {
      const dataWithPSG = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'psg',
            name: 'PSG Ratio',
            category: 'growth' as const,
            iv: 298.77,
            inputs: {
              method: 'psg',
              fair_psg_ratio: 0.2,
              last_price: 260.01,
              sales_per_share: 27.34,
              ps_ratio: 9.51,
              revenue_growth_rate: 0.0547,
              psg_ratio: 173.83,
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('psg', dataWithPSG as any, undefined)
      );

      expect(result.current?.type).toBe('growth-adjusted');
      expect(result.current?.fairRatio).toBe(0.2);
      expect(result.current?.metric).toBe(27.34);
      expect(result.current?.metricName).toBe('Sales Per Share');
      expect(result.current?.growthRate).toBeCloseTo(5.47, 2);
    });
  });

  /**
   * GROUP 4: MULTIPLES METHODS (10 total)
   * P/E, P/S, P/B with Mean/Median variations (including ex-NRI)
   */
  describe('multiples methods mapping', () => {
    it('should map P/E Mean 5Y inputs correctly', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('pe-mean-5y', mockValuationChartData, undefined)
      );

      expect(result.current).toEqual({
        type: 'multiples',
        ratio: 29.67,
        ratioName: 'Mean P/E Ratio (5Y)',
        currentPrice: 260.01,
        metricPerShare: 6.662,
        metricName: 'EPS TTM',
        historicalRatios: [28.5, 29.1, 30.2, 31.0, 29.3],
      });
    });

    it('should map P/E Median 5Y inputs correctly', () => {
      const dataWithPEMedian = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'pe-median-5y',
            name: 'P/E Median 5Y',
            category: 'multiples' as const,
            iv: 195.92,
            inputs: {
              method: 'pe-median',
              median_pe_ratio_5y: 29.42,
              current_price: 260.01,
              eps_ttm: 6.662,
              pe_ratios: [28.5, 29.1, 29.3, 30.2, 31.0],
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('pe-median-5y', dataWithPEMedian as any, undefined)
      );

      expect(result.current?.type).toBe('multiples');
      expect(result.current?.ratio).toBe(29.42);
      expect(result.current?.ratioName).toBe('Median P/E Ratio (5Y)');
    });

    it('should map P/S Mean 5Y inputs correctly', () => {
      const dataWithPSMean = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'ps-mean-5y',
            name: 'P/S Mean 5Y',
            category: 'multiples' as const,
            iv: 203.14,
            inputs: {
              method: 'ps-mean',
              mean_ps_ratio_5y: 7.43,
              current_price: 260.01,
              sales_per_share_ttm: 27.34,
              ps_ratios: [7.1, 7.3, 7.4, 7.5, 7.9],
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('ps-mean-5y', dataWithPSMean as any, undefined)
      );

      expect(result.current?.type).toBe('multiples');
      expect(result.current?.ratio).toBe(7.43);
      expect(result.current?.metricName).toBe('Sales Per Share TTM');
    });

    it('should map P/B Mean 5Y inputs correctly', () => {
      const dataWithPBMean = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'pb-mean-5y',
            name: 'P/B Mean 5Y',
            category: 'multiples' as const,
            iv: 190.76,
            inputs: {
              method: 'pb-mean',
              mean_pb_ratio_5y: 43.06,
              current_price: 260.01,
              book_value_per_share_ttm: 4.43,
              pb_ratios: [40.2, 42.1, 43.0, 44.8, 45.2],
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('pb-mean-5y', dataWithPBMean as any, undefined)
      );

      expect(result.current?.type).toBe('multiples');
      expect(result.current?.ratio).toBe(43.06);
      expect(result.current?.metricName).toBe('Book Value Per Share TTM');
    });

    it('should map P/E Mean (ex-NRI) inputs correctly', () => {
      const dataWithPEMeanExNRI = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'pe-mean-without-nri',
            name: 'P/E Mean 5Y (ex-NRI)',
            category: 'multiples' as const,
            iv: 199.77,
            inputs: {
              method: 'pe-mean-without-nri',
              mean_pe_ratio_5y_without_nri: 30.22,
              current_price: 260.01,
              eps_ttm_without_nri: 6.61,
              pe_ratios_without_nri: [29.0, 29.8, 30.2, 30.9, 31.2],
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('pe-mean-without-nri', dataWithPEMeanExNRI as any, undefined)
      );

      expect(result.current?.type).toBe('multiples');
      expect(result.current?.ratio).toBe(30.22);
      expect(result.current?.ratioName).toBe('Mean P/E Ratio (5Y, ex-NRI)');
      expect(result.current?.metricName).toBe('EPS TTM (ex-NRI)');
    });
  });

  /**
   * GROUP 5: CATEGORY DETECTION
   * Ensure all 19 methods route to correct category
   */
  describe('method category detection', () => {
    it('should detect all DCF method IDs correctly', () => {
      const dcfMethods = [
        'alfavalue',
        'dcf-20-fcf',
        'dcf-20-ocf',
        'dcf-20-ni',
        'dni-20',
        'dfcf-terminal',
        'dfcf-20',
      ];

      dcfMethods.forEach(methodId => {
        // Create minimal data for each method
        const data = {
          ...mockValuationChartData,
          methods: [
            {
              method_id: methodId,
              name: methodId,
              category: 'dcf' as const,
              iv: 100,
              inputs: {
                method: methodId,
                fcf_ttm_musd: 100000,
                total_debt_musd: 50000,
                cash_musd: 20000,
                discount_rate: 0.08,
                shares_outstanding_m: 1000,
                growth_rate_y1_5: 0.10,
                growth_rate_y6_10: 0.07,
                growth_rate_y11_20: 0.04,
              }
            }
          ]
        };

        const { result } = renderHook(() =>
          useMethodInputMapper(methodId, data as any, undefined)
        );
        expect(result.current?.type).toBe('dcf');
      });
    });

    it('should detect all growth-adjusted method IDs correctly', () => {
      const growthMethods = ['peg', 'psg'];

      growthMethods.forEach(methodId => {
        const data = {
          ...mockValuationChartData,
          methods: [
            {
              method_id: methodId,
              name: methodId,
              category: 'growth' as const,
              iv: 100,
              inputs: {
                method: methodId,
                fair_peg_ratio: 1.5,
                last_price: 250,
                eps_without_nri: 6.5,
                growth_rate: 0.10,
              }
            }
          ]
        };

        const { result } = renderHook(() =>
          useMethodInputMapper(methodId, data as any, undefined)
        );
        expect(result.current?.type).toBe('growth-adjusted');
      });
    });

    it('should detect all multiples method IDs correctly', () => {
      const multiplesMethods = [
        'pe-mean-5y',
        'pe-median-5y',
        'ps-mean-5y',
        'ps-median-5y',
        'pb-mean-5y',
        'pb-median-5y',
        'pe-mean-without-nri',
        'pe-median-without-nri',
        'pb-mean-without-nri',
        'pb-median-without-nri',
      ];

      multiplesMethods.forEach(methodId => {
        const data = {
          ...mockValuationChartData,
          methods: [
            {
              method_id: methodId,
              name: methodId,
              category: 'multiples' as const,
              iv: 100,
              inputs: {
                method: methodId,
                mean_pe_ratio_5y: 30,
                current_price: 250,
                eps_ttm: 6.5,
                pe_ratios: [28, 29, 30, 31, 32],
              }
            }
          ]
        };

        const { result } = renderHook(() =>
          useMethodInputMapper(methodId, data as any, undefined)
        );
        expect(result.current?.type).toBe('multiples');
      });
    });
  });

  /**
   * GROUP 6: MEMOIZATION
   * Ensure stable references for performance
   */
  describe('memoization behavior', () => {
    it('should memoize result when inputs unchanged', () => {
      const { result, rerender } = renderHook(
        ({ method, data }) => useMethodInputMapper(method, data, undefined),
        { initialProps: { method: 'alfavalue', data: mockValuationChartData } }
      );

      const firstResult = result.current;
      rerender({ method: 'alfavalue', data: mockValuationChartData });

      expect(result.current).toBe(firstResult); // Same reference
    });

    it('should return new reference when method changes', () => {
      const { result, rerender } = renderHook(
        ({ method, data }) => useMethodInputMapper(method, data, undefined),
        { initialProps: { method: 'alfavalue', data: mockValuationChartData } }
      );

      const firstResult = result.current;
      rerender({ method: 'peg', data: mockValuationChartData });

      expect(result.current).not.toBe(firstResult); // Different reference
      expect(result.current?.type).toBe('growth-adjusted');
    });

    it('should return new reference when data changes', () => {
      const { result, rerender } = renderHook(
        ({ method, data }) => useMethodInputMapper(method, data, undefined),
        { initialProps: { method: 'alfavalue', data: mockValuationChartData } }
      );

      const firstResult = result.current;
      const newData = {
        ...mockValuationChartData,
        price: 270.00,
      };
      rerender({ method: 'alfavalue', data: newData });

      expect(result.current).not.toBe(firstResult);
    });
  });

  /**
   * GROUP 7: PERCENTAGE CONVERSIONS
   * Verify decimal (0.0947) → percentage (9.47%) transformations
   */
  describe('percentage conversions', () => {
    it('should convert discount rate from decimal to percentage', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('alfavalue', mockValuationChartData, undefined)
      );

      // 0.0947 → 9.47%
      expect(result.current?.discountRate).toBeCloseTo(9.47, 2);
    });

    it('should convert all growth rates from decimal to percentage', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-fcf', mockValuationChartData, undefined)
      );

      expect(result.current?.growthY1_5).toBeCloseTo(10.35, 2);
      expect(result.current?.growthY6_10).toBeCloseTo(7.26, 2);
      expect(result.current?.growthY11_20).toBeCloseTo(3.63, 2);
    });

    it('should convert PEG growth rate from decimal to percentage', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('peg', mockValuationChartData, undefined)
      );

      expect(result.current?.growthRate).toBeCloseTo(10.07, 2);
    });
  });

  /**
   * GROUP 8: PARTIAL/MISSING INPUTS
   * Handle gracefully when optional fields are undefined
   */
  describe('partial and missing inputs', () => {
    it('should handle missing optional DCF fields', () => {
      const dataPartial = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'alfavalue',
            name: 'AlfaValue™',
            category: 'proprietary' as const,
            iv: 125.44,
            inputs: {
              method: 'alfavalue',
              fcf_ttm_musd: 108807,
              // Missing other fields
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('alfavalue', dataPartial as any, undefined)
      );

      // Should not crash
      expect(result.current).not.toBeNull();
      expect(result.current?.operatingCF).toBe(108807);
    });

    it('should handle missing historical ratios in multiples', () => {
      const dataNoHistory = {
        ...mockValuationChartData,
        methods: [
          {
            method_id: 'pe-mean-5y',
            name: 'P/E Mean 5Y',
            category: 'multiples' as const,
            iv: 197.65,
            inputs: {
              method: 'pe-mean',
              mean_pe_ratio_5y: 29.67,
              current_price: 260.01,
              eps_ttm: 6.662,
              // No pe_ratios array
            }
          }
        ]
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('pe-mean-5y', dataNoHistory as any, undefined)
      );

      expect(result.current?.historicalRatios).toEqual([]);
    });
  });

  /**
   * GROUP 9: TYPE SAFETY
   * Ensure discriminated union types work correctly
   */
  describe('type safety', () => {
    it('should return DCF type with correct properties', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('alfavalue', mockValuationChartData, undefined)
      );

      if (result.current?.type === 'dcf') {
        expect(result.current).toHaveProperty('operatingCF');
        expect(result.current).toHaveProperty('totalDebt');
        expect(result.current).toHaveProperty('cash');
        expect(result.current).toHaveProperty('discountRate');
        expect(result.current).toHaveProperty('shares');
        expect(result.current).toHaveProperty('growthY1_5');
        expect(result.current).toHaveProperty('deductDebt');
        expect(result.current).toHaveProperty('addCash');
      } else {
        throw new Error('Expected DCF type');
      }
    });

    it('should return growth-adjusted type with correct properties', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('peg', mockValuationChartData, undefined)
      );

      if (result.current?.type === 'growth-adjusted') {
        expect(result.current).toHaveProperty('fairRatio');
        expect(result.current).toHaveProperty('lastPrice');
        expect(result.current).toHaveProperty('metric');
        expect(result.current).toHaveProperty('metricName');
        expect(result.current).toHaveProperty('growthRate');
      } else {
        throw new Error('Expected growth-adjusted type');
      }
    });

    it('should return multiples type with correct properties', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('pe-mean-5y', mockValuationChartData, undefined)
      );

      if (result.current?.type === 'multiples') {
        expect(result.current).toHaveProperty('ratio');
        expect(result.current).toHaveProperty('ratioName');
        expect(result.current).toHaveProperty('currentPrice');
        expect(result.current).toHaveProperty('metricPerShare');
        expect(result.current).toHaveProperty('metricName');
        expect(result.current).toHaveProperty('historicalRatios');
      } else {
        throw new Error('Expected multiples type');
      }
    });
  });
});
