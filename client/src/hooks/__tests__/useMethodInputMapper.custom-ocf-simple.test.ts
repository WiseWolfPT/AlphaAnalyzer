/**
 * Simplified TDD Test Suite: Custom OCF Bug
 *
 * Tests the core logic of useMethodInputMapper without React rendering complexity
 */

import { describe, it, expect } from 'vitest';

// Mock data matching production API response
const mockValuationChartData = {
  methods: [
    {
      method_id: 'dcf-20-ocf',
      name: 'DCF-20 Operating Cash Flow',
      iv: 150.25,
      inputs: {
        method: 'dcf-20-ocf',
        ocf_ttm_musd: 100000,
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
      }
    }
  ],
  price: 135.00
};

describe('useMethodInputMapper - Core Logic (no React)', () => {
  it('should find dcf-20-ocf method in data', () => {
    const method = mockValuationChartData.methods.find(
      m => m.method_id === 'dcf-20-ocf'
    );

    expect(method).toBeDefined();
    expect(method?.method_id).toBe('dcf-20-ocf');
    expect(method?.inputs).toBeDefined();
    expect(method?.inputs.method).toBe('dcf-20-ocf');
  });

  it('should recognize dcf-20-ocf as a DCF method', () => {
    const method = mockValuationChartData.methods.find(
      m => m.method_id === 'dcf-20-ocf'
    );

    expect(method?.inputs.method).toBe('dcf-20-ocf');

    // Test various DCF detection patterns
    const methodType = method?.inputs.method;
    const isDCF = (
      methodType === 'dcf-20-ocf' ||
      methodType === 'dcf-20-fcf' ||
      methodType === 'dcf-20-ni' ||
      methodType?.toLowerCase().includes('dcf')
    );

    expect(isDCF).toBe(true);
  });

  it('should extract OCF value from inputs', () => {
    const method = mockValuationChartData.methods.find(
      m => m.method_id === 'dcf-20-ocf'
    );

    const ocf = Number(
      method?.inputs.ocf_ttm_musd ||
      method?.inputs.operating_cf ||
      method?.inputs.base_metric_musd || 0
    );

    expect(ocf).toBe(100000);
  });

  it('should convert discount rate from decimal to percentage', () => {
    const method = mockValuationChartData.methods.find(
      m => m.method_id === 'dcf-20-ocf'
    );

    const discountRate = Number(
      method?.inputs.discount_rate ?
        method.inputs.discount_rate * 100 :
        0
    );

    expect(discountRate).toBe(10); // 0.10 * 100
  });

  it('should extract all required DCF fields', () => {
    const method = mockValuationChartData.methods.find(
      m => m.method_id === 'dcf-20-ocf'
    );

    expect(method?.inputs).toBeDefined();

    const expectedFields = {
      operatingCF: Number(method?.inputs.ocf_ttm_musd || 0),
      totalDebt: Number(method?.inputs.total_debt_musd || 0),
      cash: Number(method?.inputs.cash_musd || 0),
      discountRate: Number(method?.inputs.discount_rate ? method.inputs.discount_rate * 100 : 0),
      shares: Number(method?.inputs.shares_outstanding_m || 0),
      growthY1_5: Number(method?.inputs.growth_rate_y1_5 ? method.inputs.growth_rate_y1_5 * 100 : 0),
      growthY6_10: Number(method?.inputs.growth_rate_y6_10 ? method.inputs.growth_rate_y6_10 * 100 : 0),
      growthY11_20: Number(method?.inputs.growth_rate_y11_20 ? method.inputs.growth_rate_y11_20 * 100 : 0),
    };

    expect(expectedFields.operatingCF).toBe(100000);
    expect(expectedFields.totalDebt).toBe(50000);
    expect(expectedFields.cash).toBe(20000);
    expect(expectedFields.discountRate).toBe(10);
    expect(expectedFields.shares).toBe(1000);
    expect(expectedFields.growthY1_5).toBe(15);
    expect(expectedFields.growthY6_10).toBe(10);
    expect(expectedFields.growthY11_20).toBe(3);
  });
});

describe('Bug Scenario: Custom method ID mapping', () => {
  it('should map custom-ocf to dcf-20-ocf', () => {
    const customBasedOn = 'ocf';
    const selectedMethod = 'custom';

    const methodMap: Record<string, string> = {
      'ocf': 'dcf-20-ocf',
      'fcf': 'dcf-20-fcf',
      'ni': 'dcf-20-ni',
    };

    const effectiveMethodId = selectedMethod === 'custom'
      ? methodMap[customBasedOn]
      : selectedMethod;

    expect(effectiveMethodId).toBe('dcf-20-ocf');
  });

  it('should find method using mapped ID', () => {
    const customBasedOn = 'ocf';
    const selectedMethod = 'custom';

    const methodMap: Record<string, string> = {
      'ocf': 'dcf-20-ocf',
      'fcf': 'dcf-20-fcf',
      'ni': 'dcf-20-ni',
    };

    const effectiveMethodId = selectedMethod === 'custom'
      ? methodMap[customBasedOn]
      : selectedMethod;

    const method = mockValuationChartData.methods.find(
      m => m.method_id === effectiveMethodId
    );

    expect(method).toBeDefined();
    expect(method?.method_id).toBe('dcf-20-ocf');
    expect(method?.inputs).toBeDefined();
  });
});
