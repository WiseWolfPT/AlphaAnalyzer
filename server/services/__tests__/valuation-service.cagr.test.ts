/**
 * AlfaValue™ Valuation Service - CAGR Calculation Tests
 *
 * Testing CAGR calculation for various FCF scenarios:
 * - All positive values (standard case)
 * - All negative values (declining losses)
 * - Negative to positive transition (recovery scenario)
 * - Positive to negative transition (decline scenario)
 * - Mixed positive/negative sequence
 * - Zero values in sequence
 *
 * Test Strategy: Verify bug fix for negative FCF handling
 * Bug: Previous implementation returned 0 for ANY negative value
 * Fix: Return 0 for sequences with negatives, let floor clamp handle minimum
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValuationService } from '../valuation-service';
import { redisCacheService } from '../../cache/redis-cache-service';
import axios from 'axios';
import {
  VALUATION_CLAMPS,
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

describe('ValuationService - CAGR Calculation Tests', () => {
  let service: ValuationService;
  const mockedAxios = vi.mocked(axios);
  const mockedCache = vi.mocked(redisCacheService);

  // Helper to mock shares outstanding API responses (7-tier fallback)
  const mockSharesOutstanding = (shares: number) => {
    // Tier 1: key-metrics (return shares here to short-circuit the cascade)
    mockedAxios.get.mockResolvedValueOnce({
      data: [{ date: '2024-01-01', sharesOutstanding: shares }],
    });
  };

  // Helper to mock common API responses
  const mockCommonResponses = () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.25 }] as FMPTreasuryRates[] }) // RF
      .mockResolvedValueOnce({
        data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[],
      }) // MRP
      .mockResolvedValueOnce({ data: [] }) // GDP (fallback)
      .mockResolvedValueOnce({ data: [] }); // CPI (fallback)
  };

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
  // SECTION 1: All Positive Values (Standard Case - Should Work)
  // ============================================================================
  describe('All Positive FCF Values', () => {
    it('should calculate correct CAGR for steady 10% growth', async () => {
      // Arrange: FCF growing at 10% annually
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'STEADY10',
          companyName: 'Steady 10% Growth Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.0,
          marketCap: 1000000000,
          price: 50,
        },
      ];

      const fcf_base = 100_000_000;
      const growth = 1.10; // 10% growth
      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'STEADY10',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: fcf_base * Math.pow(growth, 4),
        },
        {
          date: '2023-01-01',
          symbol: 'STEADY10',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: fcf_base * Math.pow(growth, 3),
        },
        {
          date: '2022-01-01',
          symbol: 'STEADY10',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: fcf_base * Math.pow(growth, 2),
        },
        {
          date: '2021-01-01',
          symbol: 'STEADY10',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: fcf_base * growth,
        },
        {
          date: '2020-01-01',
          symbol: 'STEADY10',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: fcf_base,
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'STEADY10',
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
        },
      ];

      const mockQuote = [{ price: 50 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(20_000_000); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('STEADY10');

      // Debug: Log result if test fails
      if (typeof result.iv !== 'number') {
        console.log('ERROR: result.iv is not a number:', JSON.stringify(result, null, 2));
      }

      // Assert: g1_5 should be close to 10%
      expect(result.assumptions.g_1_5).toBeCloseTo(0.10, 2); // 10% ±0.01
      // Note: Confidence may vary based on fallbacks used
      expect(['LOW', 'MED', 'HIGH']).toContain(result.confidence);
      expect(result.iv).toBeGreaterThan(0);
      expect(isFinite(result.iv)).toBe(true);
    });

    it('should calculate correct CAGR for high 25% growth', async () => {
      // Arrange: FCF growing at 25% annually (will hit ceiling)
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'FAST25',
          companyName: 'Fast 25% Growth Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.2,
          marketCap: 5000000000,
          price: 150,
        },
      ];

      const fcf_base = 100_000_000;
      const growth = 1.25; // 25% growth
      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'FAST25',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: fcf_base * Math.pow(growth, 4),
        },
        {
          date: '2023-01-01',
          symbol: 'FAST25',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: fcf_base * Math.pow(growth, 3),
        },
        {
          date: '2022-01-01',
          symbol: 'FAST25',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: fcf_base * Math.pow(growth, 2),
        },
        {
          date: '2021-01-01',
          symbol: 'FAST25',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: fcf_base * growth,
        },
        {
          date: '2020-01-01',
          symbol: 'FAST25',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: fcf_base,
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'FAST25',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 500_000_000,
          shortTermInvestments: 100_000_000,
          totalDebt: 50_000_000,
          weightedAverageShsOutDil: 33_333_333,
        },
      ];

      const mockQuote = [{ price: 150 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(33_333_333); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('FAST25');

      // Assert: g1_5 should be close to 25% or clamped to ceiling (30%)
      expect(result.assumptions.g_1_5).toBeGreaterThan(0.20);
      expect(result.assumptions.g_1_5).toBeLessThanOrEqual(VALUATION_CLAMPS.G_1_5.max); // 30% ceiling
    });
  });

  // ============================================================================
  // SECTION 2: All Negative Values (Declining Losses - BUG FIX TARGET)
  // ============================================================================
  describe('All Negative FCF Values', () => {
    it('should handle all negative FCF with 0% growth (floor)', async () => {
      // Arrange: Company with all negative FCF (unprofitable)
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'ALLNEG',
          companyName: 'All Negative Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.5,
          marketCap: 200000000,
          price: 10,
        },
      ];

      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'ALLNEG',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: -100_000_000,
        },
        {
          date: '2023-01-01',
          symbol: 'ALLNEG',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: -90_000_000,
        },
        {
          date: '2022-01-01',
          symbol: 'ALLNEG',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: -80_000_000,
        },
        {
          date: '2021-01-01',
          symbol: 'ALLNEG',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: -70_000_000,
        },
        {
          date: '2020-01-01',
          symbol: 'ALLNEG',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: -60_000_000,
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'ALLNEG',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 50_000_000,
          shortTermInvestments: 10_000_000,
          totalDebt: 300_000_000,
          weightedAverageShsOutDil: 20_000_000,
        },
      ];

      const mockQuote = [{ price: 10 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(20_000_000); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('ALLNEG');

      // Assert: g1_5 should be 0% (floor), not undefined/NaN
      expect(result.assumptions.g_1_5).toBe(0.00); // 0% floor
      expect(result.confidence).toBe('LOW'); // Low confidence due to negative FCF
      expect(result.iv).toBeDefined();
      expect(isFinite(result.iv)).toBe(true); // Should not be NaN or Infinity
    });

    it('should handle declining negative FCF (losses improving)', async () => {
      // Arrange: Company with declining losses (-100M → -20M)
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'IMPROVING',
          companyName: 'Improving Losses Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.3,
          marketCap: 300000000,
          price: 15,
        },
      ];

      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'IMPROVING',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: -20_000_000, // Best (least negative)
        },
        {
          date: '2023-01-01',
          symbol: 'IMPROVING',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: -40_000_000,
        },
        {
          date: '2022-01-01',
          symbol: 'IMPROVING',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: -60_000_000,
        },
        {
          date: '2021-01-01',
          symbol: 'IMPROVING',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: -80_000_000,
        },
        {
          date: '2020-01-01',
          symbol: 'IMPROVING',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: -100_000_000, // Worst
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'IMPROVING',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 100_000_000,
          shortTermInvestments: 20_000_000,
          totalDebt: 150_000_000,
          weightedAverageShsOutDil: 20_000_000,
        },
      ];

      const mockQuote = [{ price: 15 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(20_000_000); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('IMPROVING');

      // Assert: g1_5 should be 0% (floor), calculation should succeed
      expect(result.assumptions.g_1_5).toBe(0.00); // 0% floor
      expect(result.confidence).toBe('LOW');
      expect(result.iv).toBeDefined();
      expect(isFinite(result.iv)).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 3: Negative to Positive Transition (Recovery Scenario - BUG FIX)
  // ============================================================================
  describe('Negative to Positive Transition', () => {
    it('should handle recovery from negative to positive FCF', async () => {
      // Arrange: Company recovering from losses (-50M → +50M)
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'RECOVERY',
          companyName: 'Recovery Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.1,
          marketCap: 800000000,
          price: 40,
        },
      ];

      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'RECOVERY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: 50_000_000, // Positive now
        },
        {
          date: '2023-01-01',
          symbol: 'RECOVERY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: 10_000_000,
        },
        {
          date: '2022-01-01',
          symbol: 'RECOVERY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: -10_000_000, // Was negative
        },
        {
          date: '2021-01-01',
          symbol: 'RECOVERY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: -30_000_000,
        },
        {
          date: '2020-01-01',
          symbol: 'RECOVERY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: -50_000_000,
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'RECOVERY',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 150_000_000,
          shortTermInvestments: 30_000_000,
          totalDebt: 100_000_000,
          weightedAverageShsOutDil: 20_000_000,
        },
      ];

      const mockQuote = [{ price: 40 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(20_000_000); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('RECOVERY');

      // Assert: g1_5 should be 0% (floor) due to mixed values
      expect(result.assumptions.g_1_5).toBe(0.00); // 0% floor
      expect(result.confidence).toBe('LOW'); // Low confidence due to historical negative FCF
      expect(result.iv).toBeDefined();
      expect(isFinite(result.iv)).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 4: Positive to Negative Transition (Decline Scenario - BUG FIX)
  // ============================================================================
  describe('Positive to Negative Transition', () => {
    it('should handle decline from positive to negative FCF', async () => {
      // Arrange: Company declining into losses (+100M → -20M)
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'DECLINE',
          companyName: 'Decline Corp',
          industry: 'Retail',
          sector: 'Consumer',
          beta: 0.9,
          marketCap: 500000000,
          price: 25,
        },
      ];

      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'DECLINE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: -20_000_000, // Negative now
        },
        {
          date: '2023-01-01',
          symbol: 'DECLINE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: 10_000_000,
        },
        {
          date: '2022-01-01',
          symbol: 'DECLINE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: 40_000_000,
        },
        {
          date: '2021-01-01',
          symbol: 'DECLINE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: 70_000_000,
        },
        {
          date: '2020-01-01',
          symbol: 'DECLINE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: 100_000_000, // Was positive
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'DECLINE',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 80_000_000,
          shortTermInvestments: 20_000_000,
          totalDebt: 200_000_000,
          weightedAverageShsOutDil: 20_000_000,
        },
      ];

      const mockQuote = [{ price: 25 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(20_000_000); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('DECLINE');

      // Assert: g1_5 should be 0% (floor) due to negative value
      expect(result.assumptions.g_1_5).toBe(0.00); // 0% floor
      expect(result.confidence).toBe('LOW'); // Low confidence due to negative FCF
      expect(result.iv).toBeDefined();
      expect(isFinite(result.iv)).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 5: Zero Values in Sequence (Edge Case)
  // ============================================================================
  describe('Zero Values in Sequence', () => {
    it('should handle zero FCF in sequence', async () => {
      // Arrange: Company with one year of zero FCF
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'ZEROFCF',
          companyName: 'Zero FCF Corp',
          industry: 'Industrials',
          sector: 'Industrials',
          beta: 1.0,
          marketCap: 600000000,
          price: 30,
        },
      ];

      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'ZEROFCF',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: 50_000_000,
        },
        {
          date: '2023-01-01',
          symbol: 'ZEROFCF',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: 40_000_000,
        },
        {
          date: '2022-01-01',
          symbol: 'ZEROFCF',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: 0, // Zero FCF
        },
        {
          date: '2021-01-01',
          symbol: 'ZEROFCF',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: 20_000_000,
        },
        {
          date: '2020-01-01',
          symbol: 'ZEROFCF',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: 10_000_000,
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'ZEROFCF',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 120_000_000,
          shortTermInvestments: 25_000_000,
          totalDebt: 80_000_000,
          weightedAverageShsOutDil: 20_000_000,
        },
      ];

      const mockQuote = [{ price: 30 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(20_000_000); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('ZEROFCF');

      // Assert: g1_5 should be 0% (floor) due to zero value
      expect(result.assumptions.g_1_5).toBe(0.00); // 0% floor
      expect(result.iv).toBeDefined();
      expect(isFinite(result.iv)).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 6: Regression Prevention (Ensure No Breakage)
  // ============================================================================
  describe('Regression Prevention', () => {
    it('should maintain backward compatibility for all-positive cases', async () => {
      // Arrange: Standard positive growth case (should work exactly as before)
      const mockProfile: FMPCompanyProfile[] = [
        {
          symbol: 'STANDARD',
          companyName: 'Standard Growth Corp',
          industry: 'Technology',
          sector: 'Tech',
          beta: 1.0,
          marketCap: 2000000000,
          price: 100,
        },
      ];

      const mockCashFlow: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'STANDARD',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          freeCashFlow: 175_000_000,
        },
        {
          date: '2023-01-01',
          symbol: 'STANDARD',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2023-01-01',
          acceptedDate: '2023-01-01',
          calendarYear: '2023',
          period: 'FY',
          freeCashFlow: 150_000_000,
        },
        {
          date: '2022-01-01',
          symbol: 'STANDARD',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2022-01-01',
          acceptedDate: '2022-01-01',
          calendarYear: '2022',
          period: 'FY',
          freeCashFlow: 125_000_000,
        },
        {
          date: '2021-01-01',
          symbol: 'STANDARD',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2021-01-01',
          acceptedDate: '2021-01-01',
          calendarYear: '2021',
          period: 'FY',
          freeCashFlow: 100_000_000,
        },
        {
          date: '2020-01-01',
          symbol: 'STANDARD',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2020-01-01',
          acceptedDate: '2020-01-01',
          calendarYear: '2020',
          period: 'FY',
          freeCashFlow: 75_000_000,
        },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [
        {
          date: '2024-01-01',
          symbol: 'STANDARD',
          reportedCurrency: 'USD',
          cik: '0001',
          fillingDate: '2024-01-01',
          acceptedDate: '2024-01-01',
          calendarYear: '2024',
          period: 'FY',
          cashAndCashEquivalents: 300_000_000,
          shortTermInvestments: 50_000_000,
          totalDebt: 100_000_000,
          weightedAverageShsOutDil: 20_000_000,
        },
      ];

      const mockQuote = [{ price: 100 }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet });

      mockSharesOutstanding(20_000_000); // Mock shares before quote

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuote });

      mockCommonResponses();

      // Act
      const result = await service.getAlfaValue('STANDARD');

      // Assert: Should calculate normal CAGR (no regression)
      expect(result.assumptions.g_1_5).toBeGreaterThan(0); // Positive growth
      expect(result.assumptions.g_1_5).toBeLessThanOrEqual(VALUATION_CLAMPS.G_1_5.max);
      expect(result.iv).toBeDefined();
      expect(typeof result.iv).toBe('number');
      expect(result.iv).toBeGreaterThan(0);
      expect(isFinite(result.iv)).toBe(true);
      // Confidence can be LOW, MED or HIGH
      expect(['LOW', 'MED', 'HIGH']).toContain(result.confidence);
    });
  });
});
