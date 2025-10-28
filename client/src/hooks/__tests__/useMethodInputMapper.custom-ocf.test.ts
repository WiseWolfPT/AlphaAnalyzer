/**
 * TDD Test Suite: Custom OCF Bug (ONDA 3.2)
 *
 * Bug: When user selects "Custom" method and chooses "OCF - Operating Cash Flow"
 * in the "Based On" dropdown, the UI displays "No financial inputs available for this method"
 *
 * Expected: Should display DCF inputs (OCF, Debt, Cash, Discount Rate, Growth Rates)
 *
 * Root Cause: useMethodInputMapper hook not receiving correct methodId for custom OCF
 */

import { renderHook } from '@testing-library/react';
import { useMethodInputMapper } from '../useMethodInputMapper';

describe('Custom OCF Bug - TDD Red Phase', () => {
  const mockValuationChartData = {
    methods: [
      {
        method_id: 'dcf-20-ocf',
        name: 'DCF-20 Operating Cash Flow',
        iv: 150.25,
        inputs: {
          method: 'dcf-20-ocf',
          ocf_ttm_musd: 100000, // $100B
          total_debt_musd: 50000, // $50B
          cash_musd: 20000, // $20B
          discount_rate: 0.10, // 10%
          shares_outstanding_m: 1000, // 1B shares
          growth_rate_y1_5: 0.15, // 15%
          growth_rate_y6_10: 0.10, // 10%
          growth_rate_y11_20: 0.03, // 3%
          deduct_debt: true,
          add_cash: true,
        }
      },
      {
        method_id: 'dcf-20-fcf',
        name: 'DCF-20 Free Cash Flow',
        iv: 145.50,
        inputs: {
          method: 'dcf-20-fcf',
          fcf_ttm_musd: 95000,
          total_debt_musd: 50000,
          cash_musd: 20000,
          discount_rate: 0.10,
          shares_outstanding_m: 1000,
          growth_rate_y1_5: 0.15,
          growth_rate_y6_10: 0.10,
          growth_rate_y11_20: 0.03,
          deduct_debt: true,
          add_cash: true,
        }
      },
      {
        method_id: 'dcf-20-ni',
        name: 'DCF-20 Net Income',
        iv: 140.00,
        inputs: {
          method: 'dcf-20-ni',
          net_income_ttm_musd: 90000,
          total_debt_musd: 50000,
          cash_musd: 20000,
          discount_rate: 0.10,
          shares_outstanding_m: 1000,
          growth_rate_y1_5: 0.15,
          growth_rate_y6_10: 0.10,
          growth_rate_y11_20: 0.03,
          deduct_debt: true,
          add_cash: true,
        }
      }
    ],
    price: 135.00
  };

  describe('Custom OCF method inputs', () => {
    it('should return DCF inputs for dcf-20-ocf method', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', mockValuationChartData, null)
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.type).toBe('dcf');

      if (result.current?.type === 'dcf') {
        expect(result.current.operatingCF).toBe(100000);
        expect(result.current.totalDebt).toBe(50000);
        expect(result.current.cash).toBe(20000);
        expect(result.current.discountRate).toBe(10); // Converted to percentage
        expect(result.current.shares).toBe(1000);
        expect(result.current.growthY1_5).toBe(15); // Converted to percentage
        expect(result.current.growthY6_10).toBe(10);
        expect(result.current.growthY11_20).toBe(3);
        expect(result.current.deductDebt).toBe(true);
        expect(result.current.addCash).toBe(true);
      }
    });

    it('should return DCF inputs for dcf-20-fcf method', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-fcf', mockValuationChartData, null)
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.type).toBe('dcf');

      if (result.current?.type === 'dcf') {
        expect(result.current.operatingCF).toBe(95000);
      }
    });

    it('should return DCF inputs for dcf-20-ni method', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ni', mockValuationChartData, null)
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.type).toBe('dcf');

      if (result.current?.type === 'dcf') {
        expect(result.current.operatingCF).toBe(90000);
      }
    });
  });

  describe('Bug reproduction: Custom method with OCF base', () => {
    it('FAILS: should recognize dcf-20-ocf as DCF method', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', mockValuationChartData, null)
      );

      // This test should PASS after fix
      expect(result.current).not.toBeNull();
      expect(result.current?.type).toBe('dcf');
    });

    it('should NOT return null for valid OCF method', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', mockValuationChartData, null)
      );

      // Bug: Currently returns null because method detection fails
      expect(result.current).not.toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should return null for unknown method', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('unknown-method', mockValuationChartData, null)
      );

      expect(result.current).toBeNull();
    });

    it('should return null when valuationChartData is undefined', () => {
      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', undefined, null)
      );

      expect(result.current).toBeNull();
    });

    it('should return null when method not found in data', () => {
      const emptyData = {
        methods: [],
        price: 135.00
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', emptyData, null)
      );

      expect(result.current).toBeNull();
    });

    it('should return null when method has no inputs', () => {
      const noInputsData = {
        methods: [
          {
            method_id: 'dcf-20-ocf',
            name: 'DCF-20 Operating Cash Flow',
            iv: 150.25,
            // No inputs field
          }
        ],
        price: 135.00
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', noInputsData as any, null)
      );

      expect(result.current).toBeNull();
    });
  });

  describe('Field mapping robustness', () => {
    it('should handle alternative field names for OCF', () => {
      const altFieldsData = {
        methods: [
          {
            method_id: 'dcf-20-ocf',
            name: 'DCF-20 OCF',
            iv: 150,
            inputs: {
              method: 'dcf-20-ocf',
              operating_cf: 100000, // Alternative field name
              debt_musd: 50000, // Alternative field name
              cash: 20000, // Alternative field name (no _musd suffix)
              discount_rate: 0.10,
              shares_m: 1000, // Alternative field name
              growth_rate_1_5: 0.15, // Alternative field name
              growth_rate_6_10: 0.10,
              growth_rate_11_20: 0.03,
            }
          }
        ],
        price: 135
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', altFieldsData, null)
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.type).toBe('dcf');

      if (result.current?.type === 'dcf') {
        expect(result.current.operatingCF).toBe(100000);
        expect(result.current.totalDebt).toBe(50000);
        expect(result.current.cash).toBe(20000);
        expect(result.current.shares).toBe(1000);
      }
    });

    it('should default to 0 for missing numeric fields', () => {
      const minimalData = {
        methods: [
          {
            method_id: 'dcf-20-ocf',
            name: 'DCF-20 OCF',
            iv: 150,
            inputs: {
              method: 'dcf-20-ocf',
              // Most fields missing
            }
          }
        ],
        price: 135
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', minimalData, null)
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.type).toBe('dcf');

      if (result.current?.type === 'dcf') {
        expect(result.current.operatingCF).toBe(0);
        expect(result.current.totalDebt).toBe(0);
        expect(result.current.cash).toBe(0);
        expect(result.current.discountRate).toBe(0);
        expect(result.current.shares).toBe(0);
        expect(result.current.growthY1_5).toBe(0);
        expect(result.current.growthY6_10).toBe(0);
        expect(result.current.growthY11_20).toBe(0);
      }
    });

    it('should default deductDebt and addCash to true', () => {
      const noFlagsData = {
        methods: [
          {
            method_id: 'dcf-20-ocf',
            name: 'DCF-20 OCF',
            iv: 150,
            inputs: {
              method: 'dcf-20-ocf',
              ocf_ttm_musd: 100000,
              // No deduct_debt or add_cash flags
            }
          }
        ],
        price: 135
      };

      const { result } = renderHook(() =>
        useMethodInputMapper('dcf-20-ocf', noFlagsData, null)
      );

      expect(result.current).not.toBeNull();
      expect(result.current?.type).toBe('dcf');

      if (result.current?.type === 'dcf') {
        expect(result.current.deductDebt).toBe(true);
        expect(result.current.addCash).toBe(true);
      }
    });
  });
});
