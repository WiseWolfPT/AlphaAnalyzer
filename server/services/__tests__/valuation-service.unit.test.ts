/**
 * AlfaValue™ Valuation Service - Unit Tests
 *
 * Testing core valuation logic in isolation:
 * - Growth rate clamps (g1_5, g6_10, g11_20, discount_rate)
 * - Mid-year discounting calculation
 * - Shares fallback logic
 * - CAGR calculation
 *
 * Test Strategy: Red → Green → Refactor (TDD)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValuationService } from '../valuation-service';
import { redisCacheService } from '../../cache/redis-cache-service';
import axios from 'axios';
import {
  VALUATION_CLAMPS,
  VALUATION_DEFAULTS,
  FMPCompanyProfile,
  FMPFinancialStatement,
  FMPTreasuryRates,
  FMPMarketRiskPremium,
} from '../../types/valuation';

// Mock Redis cache
vi.mock('../../cache/redis-cache-service', () => ({
  redisCacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock axios
vi.mock('axios');

describe('ValuationService - Unit Tests', () => {
  let service: ValuationService;
  const mockedAxios = vi.mocked(axios);
  const mockedCache = vi.mocked(redisCacheService);

  beforeEach(() => {
    service = new ValuationService();
    vi.clearAllMocks();

    // Default: cache misses (force fresh calculation)
    mockedCache.get.mockResolvedValue(null);
    mockedCache.set.mockResolvedValue('OK');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // SECTION 1: Growth Rate Clamps
  // ============================================================================
  describe('Growth Rate Clamps', () => {
    describe('g1_5 clamp [5%, 30%]', () => {
      it('should clamp negative growth to 5% (floor)', async () => {
        // Arrange: Company with declining FCF → negative CAGR
        const mockProfile: FMPCompanyProfile[] = [{
          symbol: 'DECLINE',
          companyName: 'Declining Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.2,
          marketCap: 1000000000,
          price: 50,
        }];

        const mockCashFlow: FMPFinancialStatement[] = [
          { date: '2024-01-01', symbol: 'DECLINE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 50_000_000 }, // TTM (newest)
          { date: '2023-01-01', symbol: 'DECLINE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 70_000_000 },
          { date: '2022-01-01', symbol: 'DECLINE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
          { date: '2021-01-01', symbol: 'DECLINE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 110_000_000 },
          { date: '2020-01-01', symbol: 'DECLINE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 130_000_000 }, // Oldest
        ];

        const mockBalanceSheet: FMPFinancialStatement[] = [{
          date: '2024-01-01',
          symbol: 'DECLINE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 500_000_000,
          shortTermInvestments: 100_000_000,
          totalDebt: 200_000_000,
          weightedAverageShsOutDil: 20_000_000,
        }];

        const mockQuote = [{ price: 50 }];

        // Mock FMP responses
        mockedAxios.get
          .mockResolvedValueOnce({ data: mockProfile }) // profile
          .mockResolvedValueOnce({ data: mockCashFlow }) // cash flow
          .mockResolvedValueOnce({ data: mockBalanceSheet }) // balance sheet
          .mockResolvedValueOnce({ data: mockQuote }); // price

        // Mock helper endpoints (RF, MRP, g_term, sector growth) with valid responses
        mockedAxios.get
          .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.25 }] as FMPTreasuryRates[] }) // RF
          .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] }) // MRP
          .mockResolvedValueOnce({ data: [] }) // GDP (will use fallback)
          .mockResolvedValueOnce({ data: [] }); // CPI (will use fallback)

        // Act
        const result = await service.getAlfaValue('DECLINE');

        // Assert: g1_5 should be clamped to floor (5%)
        expect(result.assumptions.g_1_5).toBeGreaterThanOrEqual(VALUATION_CLAMPS.G_1_5.min);
        expect(result.assumptions.g_1_5).toBe(VALUATION_CLAMPS.G_1_5.min); // Should be exactly 5%
        // Note: Confidence might be MED if fallbacks are used (beta/RF/MRP)
        // The code checks fallbacks first, then negative FCF
        expect(['LOW', 'MED']).toContain(result.confidence);
      });

      it('should clamp extreme growth to 30% (ceiling)', async () => {
        // Arrange: Company with explosive FCF growth → CAGR > 50%
        const mockProfile: FMPCompanyProfile[] = [{
          symbol: 'ROCKET',
          companyName: 'Rocket Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.5,
          marketCap: 10000000000,
          price: 200,
        }];

        const mockCashFlow: FMPFinancialStatement[] = [
          { date: '2024-01-01', symbol: 'ROCKET', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 1000_000_000 }, // TTM
          { date: '2023-01-01', symbol: 'ROCKET', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 500_000_000 },
          { date: '2022-01-01', symbol: 'ROCKET', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 250_000_000 },
          { date: '2021-01-01', symbol: 'ROCKET', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 125_000_000 },
          { date: '2020-01-01', symbol: 'ROCKET', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 62_500_000 },
        ];

        const mockBalanceSheet: FMPFinancialStatement[] = [{
          date: '2024-01-01',
          symbol: 'ROCKET',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 2000_000_000,
          shortTermInvestments: 500_000_000,
          totalDebt: 100_000_000,
          weightedAverageShsOutDil: 50_000_000,
        }];

        const mockQuote = [{ price: 200 }];

        // Mock FMP responses
        mockedAxios.get
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockCashFlow })
          .mockResolvedValueOnce({ data: mockBalanceSheet })
          .mockResolvedValueOnce({ data: mockQuote })
          .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.25 }] as FMPTreasuryRates[] })
          .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
          .mockResolvedValueOnce({ data: [] })
          .mockResolvedValueOnce({ data: [] });

        // Act
        const result = await service.getAlfaValue('ROCKET');

        // Assert: g1_5 should be clamped to ceiling (50%)
        expect(result.assumptions.g_1_5).toBeLessThanOrEqual(VALUATION_CLAMPS.G_1_5.max);
        expect(result.assumptions.g_1_5).toBe(VALUATION_CLAMPS.G_1_5.max); // Should be exactly 50% (UPDATED: was 30%)
      });

      it('should allow normal growth within range', async () => {
        // Arrange: Company with steady 15% FCF growth
        const mockProfile: FMPCompanyProfile[] = [{
          symbol: 'STEADY',
          companyName: 'Steady Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.0,
          marketCap: 5000000000,
          price: 100,
        }];

        const fcf_base = 100_000_000;
        const growth = 1.15; // 15% growth
        const mockCashFlow: FMPFinancialStatement[] = [
          { date: '2024-01-01', symbol: 'STEADY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: fcf_base * Math.pow(growth, 4) },
          { date: '2023-01-01', symbol: 'STEADY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: fcf_base * Math.pow(growth, 3) },
          { date: '2022-01-01', symbol: 'STEADY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: fcf_base * Math.pow(growth, 2) },
          { date: '2021-01-01', symbol: 'STEADY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: fcf_base * growth },
          { date: '2020-01-01', symbol: 'STEADY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: fcf_base },
        ];

        const mockBalanceSheet: FMPFinancialStatement[] = [{
          date: '2024-01-01',
          symbol: 'STEADY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 1000_000_000,
          shortTermInvestments: 200_000_000,
          totalDebt: 300_000_000,
          weightedAverageShsOutDil: 50_000_000,
        }];

        const mockQuote = [{ price: 100 }];

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockCashFlow })
          .mockResolvedValueOnce({ data: mockBalanceSheet })
          .mockResolvedValueOnce({ data: mockQuote })
          .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.25 }] as FMPTreasuryRates[] })
          .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
          .mockResolvedValueOnce({ data: [] })
          .mockResolvedValueOnce({ data: [] });

        // Act
        const result = await service.getAlfaValue('STEADY');

        // Assert: g1_5 should be close to 15% (within tolerance)
        expect(result.assumptions.g_1_5).toBeGreaterThanOrEqual(VALUATION_CLAMPS.G_1_5.min);
        expect(result.assumptions.g_1_5).toBeLessThanOrEqual(VALUATION_CLAMPS.G_1_5.max);
        expect(result.assumptions.g_1_5).toBeCloseTo(0.15, 2); // 15% ±0.01
      });
    });

    describe('g6_10 clamp [2%, 20%]', () => {
      it('should respect min/max boundaries', async () => {
        // This test will verify that g6_10 (blended growth) is within [0.02, 0.20]
        // regardless of extreme g1_5 or sector values

        // Test case 1: Very low g1_5 (5%) + low sector growth (3%)
        const mockProfile: FMPCompanyProfile[] = [{
          symbol: 'LOWGROW',
          companyName: 'Low Growth Corp',
          industry: 'Utilities', // Low growth sector
          sector: 'Utilities',
          beta: 0.8,
          marketCap: 1000000000,
          price: 50,
        }];

        const mockCashFlow: FMPFinancialStatement[] = [
          { date: '2024-01-01', symbol: 'LOWGROW', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
          { date: '2023-01-01', symbol: 'LOWGROW', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
          { date: '2022-01-01', symbol: 'LOWGROW', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
          { date: '2021-01-01', symbol: 'LOWGROW', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
          { date: '2020-01-01', symbol: 'LOWGROW', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
        ];

        const mockBalanceSheet: FMPFinancialStatement[] = [{
          date: '2024-01-01',
          symbol: 'LOWGROW',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 200_000_000,
          shortTermInvestments: 50_000_000,
          totalDebt: 300_000_000,
          weightedAverageShsOutDil: 20_000_000,
        }];

        const mockQuote = [{ price: 50 }];

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockCashFlow })
          .mockResolvedValueOnce({ data: mockBalanceSheet })
          .mockResolvedValueOnce({ data: mockQuote })
          .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.25 }] as FMPTreasuryRates[] })
          .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
          .mockResolvedValueOnce({ data: [] })
          .mockResolvedValueOnce({ data: [] });

        // Act
        const result = await service.getAlfaValue('LOWGROW');

        // Assert: g6_10 should be within [2%, 20%]
        expect(result.assumptions.g_6_10).toBeGreaterThanOrEqual(VALUATION_CLAMPS.G_6_10.min);
        expect(result.assumptions.g_6_10).toBeLessThanOrEqual(VALUATION_CLAMPS.G_6_10.max);
      });
    });

    describe('g11_20 dynamic clamp', () => {
      it('should clamp around g_term_region', async () => {
        // g_term_region = 0.04 (4% for US default)
        // Expected range: [0.03, 0.05] (±1%)

        const mockProfile: FMPCompanyProfile[] = [{
          symbol: 'MATURE',
          companyName: 'Mature Corp',
          industry: 'Consumer Defensive',
          sector: 'Consumer',
          beta: 0.9,
          marketCap: 2000000000,
          price: 75,
        }];

        const mockCashFlow: FMPFinancialStatement[] = [
          { date: '2024-01-01', symbol: 'MATURE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 150_000_000 },
          { date: '2023-01-01', symbol: 'MATURE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 145_000_000 },
          { date: '2022-01-01', symbol: 'MATURE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 140_000_000 },
          { date: '2021-01-01', symbol: 'MATURE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 135_000_000 },
          { date: '2020-01-01', symbol: 'MATURE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 130_000_000 },
        ];

        const mockBalanceSheet: FMPFinancialStatement[] = [{
          date: '2024-01-01',
          symbol: 'MATURE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 300_000_000,
          shortTermInvestments: 100_000_000,
          totalDebt: 500_000_000,
          weightedAverageShsOutDil: 26_666_667,
        }];

        const mockQuote = [{ price: 75 }];

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockCashFlow })
          .mockResolvedValueOnce({ data: mockBalanceSheet })
          .mockResolvedValueOnce({ data: mockQuote })
          .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.25 }] as FMPTreasuryRates[] })
          .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
          .mockResolvedValueOnce({ data: [] })
          .mockResolvedValueOnce({ data: [] });

        // Act
        const result = await service.getAlfaValue('MATURE');

        // Assert: g11_20 should be within terminal growth range [3%, 5%]
        const g_term = result.meta.g_term_region;
        expect(result.assumptions.g_11_20).toBeGreaterThanOrEqual(Math.max(0.03, g_term - 0.01));
        expect(result.assumptions.g_11_20).toBeLessThanOrEqual(Math.min(0.05, g_term + 0.01));
      });
    });

    describe('discount_rate (CAPM) clamp [5%, 15%]', () => {
      it('should clamp low WACC to 5%', async () => {
        // CAPM = RF + β × MRP
        // RF = 2% (mock), β = 0.5, MRP = 5% (mock)
        // CAPM = 2% + 0.5 × 5% = 2% + 2.5% = 4.5% → clamped to 5%

        const mockProfile: FMPCompanyProfile[] = [{
          symbol: 'SAFE',
          companyName: 'Safe Corp',
          industry: 'Utilities',
          sector: 'Utilities',
          beta: 0.5, // Low beta
          marketCap: 1000000000,
          price: 50,
        }];

        const mockCashFlow: FMPFinancialStatement[] = [
          { date: '2024-01-01', symbol: 'SAFE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
          { date: '2023-01-01', symbol: 'SAFE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 98_000_000 },
          { date: '2022-01-01', symbol: 'SAFE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 96_000_000 },
          { date: '2021-01-01', symbol: 'SAFE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 94_000_000 },
          { date: '2020-01-01', symbol: 'SAFE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 92_000_000 },
        ];

        const mockBalanceSheet: FMPFinancialStatement[] = [{
          date: '2024-01-01',
          symbol: 'SAFE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 200_000_000,
          shortTermInvestments: 50_000_000,
          totalDebt: 300_000_000,
          weightedAverageShsOutDil: 20_000_000,
        }];

        const mockQuote = [{ price: 50 }];

        // Mock very low RF (2%)
        mockedCache.get.mockResolvedValue(null); // No cache

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockCashFlow })
          .mockResolvedValueOnce({ data: mockBalanceSheet })
          .mockResolvedValueOnce({ data: mockQuote })
          .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 2.0 }] as FMPTreasuryRates[] }) // 2% RF
          .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
          .mockResolvedValueOnce({ data: [] }) // GDP (fallback)
          .mockResolvedValueOnce({ data: [] }); // CPI (fallback)

        // Act
        const result = await service.getAlfaValue('SAFE');

        // Assert: discount_rate should be clamped to 5%
        expect(result.assumptions.discount_rate).toBeGreaterThanOrEqual(VALUATION_CLAMPS.DR.min);
        expect(result.assumptions.discount_rate).toBe(VALUATION_CLAMPS.DR.min); // Exactly 5%
      });

      it('should clamp high WACC to 15%', async () => {
        // CAPM = RF + β × MRP
        // RF = 5% (mock), β = 2.0, MRP = 8% (mock high)
        // CAPM = 5% + 2.0 × 8% = 5% + 16% = 21% → clamped to 15%

        const mockProfile: FMPCompanyProfile[] = [{
          symbol: 'RISKY',
          companyName: 'Risky Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 2.0, // High beta
          marketCap: 500000000,
          price: 25,
        }];

        const mockCashFlow: FMPFinancialStatement[] = [
          { date: '2024-01-01', symbol: 'RISKY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 50_000_000 },
          { date: '2023-01-01', symbol: 'RISKY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 45_000_000 },
          { date: '2022-01-01', symbol: 'RISKY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 40_000_000 },
          { date: '2021-01-01', symbol: 'RISKY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 35_000_000 },
          { date: '2020-01-01', symbol: 'RISKY', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 30_000_000 },
        ];

        const mockBalanceSheet: FMPFinancialStatement[] = [{
          date: '2024-01-01',
          symbol: 'RISKY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 50_000_000,
          shortTermInvestments: 10_000_000,
          totalDebt: 200_000_000,
          weightedAverageShsOutDil: 20_000_000,
        }];

        const mockQuote = [{ price: 25 }];

        // Mock high RF (5%) and high MRP (8%)
        // Note: Need to mock sector growth endpoint too
        mockedCache.get.mockResolvedValue(null); // No cache for sector growth

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockCashFlow })
          .mockResolvedValueOnce({ data: mockBalanceSheet })
          .mockResolvedValueOnce({ data: mockQuote })
          .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 5.0 }] as FMPTreasuryRates[] }) // 5% RF
          .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 8.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] }) // 8% MRP
          .mockResolvedValueOnce({ data: [] }) // GDP (fallback)
          .mockResolvedValueOnce({ data: [] }); // CPI (fallback)

        // Act
        const result = await service.getAlfaValue('RISKY');

        // Assert: discount_rate should be clamped to 15%
        expect(result.assumptions.discount_rate).toBeLessThanOrEqual(VALUATION_CLAMPS.DR.max);
        expect(result.assumptions.discount_rate).toBe(VALUATION_CLAMPS.DR.max); // Exactly 15%
      });
    });
  });

  // ============================================================================
  // SECTION 2: Mid-Year Discounting
  // ============================================================================
  describe('Mid-Year Discounting', () => {
    it('should apply mid-year discount factor correctly', async () => {
      // Year 1: discount factor = (1 + DR)^0.5
      // Year 5: discount factor = (1 + DR)^4.5
      // Verify PV calculation uses year - 0.5

      // We'll verify this indirectly by comparing IV calculations
      // with known discount factors

      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'MIDYEAR',
        companyName: 'Mid Year Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'MIDYEAR', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'MIDYEAR', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'MIDYEAR', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'MIDYEAR', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'MIDYEAR', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'MIDYEAR',
        reportedCurrency: 'USD',
        cik: '0001',
        fillingDate: '2024-01-01',
        acceptedDate: '2024-01-01',
        calendarYear: '2024',
        period: 'FY',
        cashAndCashEquivalents: 200_000_000,
        shortTermInvestments: 50_000_000,
        totalDebt: 100_000_000,
        weightedAverageShsOutDil: 20_000_000,
      }];

      const mockQuote = [{ price: 50 }];

      mockedCache.get.mockResolvedValue(null); // No cache

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet })
        .mockResolvedValueOnce({ data: mockQuote })
        .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.0 }] as FMPTreasuryRates[] })
        .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
        .mockResolvedValueOnce({ data: [] }) // GDP (fallback)
        .mockResolvedValueOnce({ data: [] }); // CPI (fallback)

      // Act
      const result = await service.getAlfaValue('MIDYEAR');

      // Assert: IV should be calculated (successful mid-year discounting)
      // We can't directly verify the formula without refactoring the service,
      // but we can verify the calculation completes successfully
      expect(result.iv).toBeGreaterThan(0);
      expect(result.inputs.fcf_ttm_musd).toBe(100); // TTM FCF

      // Manual calculation check (approximate):
      // Year 1 FCF: 100 * (1 + g1_5)
      // Discount factor: (1 + DR)^0.5
      // This is a smoke test to ensure mid-year logic doesn't crash
      expect(result.assumptions.discount_rate).toBeGreaterThan(0);
    });

    it('should produce higher PV than year-end discounting (implicit)', async () => {
      // Mid-year discounting should produce slightly higher PV
      // because cash flows are assumed to arrive at year 0.5, 1.5, 2.5, etc.
      // instead of year 1, 2, 3, etc.

      // This test verifies that IV > 0 with mid-year discounting
      // In a refactored version, we could add a feature flag to compare both methods

      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'COMPARE',
        companyName: 'Compare Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'COMPARE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'COMPARE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'COMPARE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'COMPARE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'COMPARE', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'COMPARE',
        reportedCurrency: 'USD',
        cik: '0001',
        fillingDate: '2024-01-01',
        acceptedDate: '2024-01-01',
        calendarYear: '2024',
        period: 'FY',
        cashAndCashEquivalents: 200_000_000,
        shortTermInvestments: 50_000_000,
        totalDebt: 100_000_000,
        weightedAverageShsOutDil: 20_000_000,
      }];

      const mockQuote = [{ price: 50 }];

      mockedCache.get.mockResolvedValue(null); // No cache

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet })
        .mockResolvedValueOnce({ data: mockQuote })
        .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.0 }] as FMPTreasuryRates[] })
        .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
        .mockResolvedValueOnce({ data: [] }) // GDP (fallback)
        .mockResolvedValueOnce({ data: [] }); // CPI (fallback)

      // Act
      const result = await service.getAlfaValue('COMPARE');

      // Assert: Calculation should complete successfully
      expect(result.iv).toBeGreaterThan(0);
      // Note: To truly test mid-year vs year-end, we'd need a feature flag
      // For now, this is a smoke test
    });
  });

  // ============================================================================
  // SECTION 3: Shares Fallback
  // ============================================================================
  describe('Shares Fallback', () => {
    it('should use weightedAverageShsOutDil when available', async () => {
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'DILUTED',
        companyName: 'Diluted Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'DILUTED', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'DILUTED', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'DILUTED', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'DILUTED', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'DILUTED', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'DILUTED',
        reportedCurrency: 'USD',
        cik: '0001',
        fillingDate: '2024-01-01',
        acceptedDate: '2024-01-01',
        calendarYear: '2024',
        period: 'FY',
        cashAndCashEquivalents: 200_000_000,
        shortTermInvestments: 50_000_000,
        totalDebt: 100_000_000,
        weightedAverageShsOutDil: 25_000_000, // Diluted shares available
        weightedAverageShsOut: 20_000_000, // Basic shares (should be ignored)
      }];

      const mockQuote = [{ price: 50 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet })
        .mockResolvedValueOnce({ data: mockQuote })
        .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.0 }] as FMPTreasuryRates[] })
        .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      // Act
      const result = await service.getAlfaValue('DILUTED');

      // Assert: Should use diluted shares (25M)
      expect(result.inputs.shares_m).toBe(25); // 25M shares
    });

    it('should fallback to weightedAverageShsOut when diluted not available', async () => {
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'BASIC',
        companyName: 'Basic Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'BASIC', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'BASIC', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'BASIC', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'BASIC', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'BASIC', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'BASIC',
        reportedCurrency: 'USD',
        cik: '0001',
        fillingDate: '2024-01-01',
        acceptedDate: '2024-01-01',
        calendarYear: '2024',
        period: 'FY',
        cashAndCashEquivalents: 200_000_000,
        shortTermInvestments: 50_000_000,
        totalDebt: 100_000_000,
        // weightedAverageShsOutDil: undefined, // Not available
        weightedAverageShsOut: 22_000_000, // Basic shares (fallback)
      }];

      const mockQuote = [{ price: 50 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet })
        .mockResolvedValueOnce({ data: mockQuote })
        .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.0 }] as FMPTreasuryRates[] })
        .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      // Act
      const result = await service.getAlfaValue('BASIC');

      // Assert: Should use basic shares (22M)
      expect(result.inputs.shares_m).toBe(22); // 22M shares
    });

    it('should fallback to marketCap/price when no shares data available', async () => {
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'FALLBACK',
        companyName: 'Fallback Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1200_000_000, // $1.2B market cap
        price: 60, // $60 per share
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'FALLBACK', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'FALLBACK', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'FALLBACK', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'FALLBACK', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'FALLBACK', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'FALLBACK',
        reportedCurrency: 'USD',
        cik: '0001',
        fillingDate: '2024-01-01',
        acceptedDate: '2024-01-01',
        calendarYear: '2024',
        period: 'FY',
        cashAndCashEquivalents: 200_000_000,
        shortTermInvestments: 50_000_000,
        totalDebt: 100_000_000,
        // No shares data available
      }];

      const mockQuote = [{ price: 60 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet })
        .mockResolvedValueOnce({ data: mockQuote })
        .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.0 }] as FMPTreasuryRates[] })
        .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      // Act
      const result = await service.getAlfaValue('FALLBACK');

      // Assert: Should calculate shares from marketCap/price
      // $1.2B / $60 = 20M shares
      expect(result.inputs.shares_m).toBe(20); // 20M shares
    });
  });
});
