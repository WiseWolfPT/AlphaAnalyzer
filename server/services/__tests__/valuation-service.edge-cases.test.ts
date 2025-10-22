/**
 * AlfaValue™ Valuation Service - Edge Cases Tests
 *
 * Testing resilience and error handling:
 * - Negative FCF scenarios
 * - Missing data (profile, cash flow, balance sheet)
 * - API failures and fallbacks
 * - Cache failures and bypass
 *
 * Test Strategy: Verify graceful degradation and appropriate confidence levels
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValuationService } from '../valuation-service';
import { redisCacheService } from '../../cache/redis-cache-service';
import axios from 'axios';
import {
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

describe('ValuationService - Edge Cases', () => {
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
  // SECTION 1: Negative FCF
  // ============================================================================
  describe('Negative FCF Scenarios', () => {
    it('should handle negative FCF with LOW confidence', async () => {
      // Arrange: Company with negative FCF TTM
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'NEGFCF',
        companyName: 'Negative FCF Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.5,
        marketCap: 500000000,
        price: 25,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'NEGFCF', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: -50_000_000 }, // Negative TTM
        { date: '2023-01-01', symbol: 'NEGFCF', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 10_000_000 },
        { date: '2022-01-01', symbol: 'NEGFCF', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 20_000_000 },
        { date: '2021-01-01', symbol: 'NEGFCF', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 30_000_000 },
        { date: '2020-01-01', symbol: 'NEGFCF', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 40_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'NEGFCF',
        reportedCurrency: 'USD',
        cik: '0001',
        fillingDate: '2024-01-01',
        acceptedDate: '2024-01-01',
        calendarYear: '2024',
        period: 'FY',
        cashAndCashEquivalents: 100_000_000,
        shortTermInvestments: 20_000_000,
        totalDebt: 200_000_000,
        weightedAverageShsOutDil: 20_000_000,
      }];

      const mockQuote = [{ price: 25 }];

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
      const result = await service.getAlfaValue('NEGFCF');

      // Assert: Should calculate IV but with LOW confidence
      expect(result.iv).toBeDefined();
      expect(result.confidence).toBe('LOW'); // Negative FCF → LOW confidence
      expect(result.inputs.fcf_ttm_musd).toBe(-50); // Negative FCF captured
    });

    it('should not crash with all negative FCF history', async () => {
      // Arrange: Company with all negative FCF (unprofitable company)
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'ALLNEG',
        companyName: 'All Negative Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.8,
        marketCap: 200000000,
        price: 10,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'ALLNEG', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: -100_000_000 },
        { date: '2023-01-01', symbol: 'ALLNEG', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: -90_000_000 },
        { date: '2022-01-01', symbol: 'ALLNEG', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: -80_000_000 },
        { date: '2021-01-01', symbol: 'ALLNEG', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: -70_000_000 },
        { date: '2020-01-01', symbol: 'ALLNEG', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: -60_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
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
      }];

      const mockQuote = [{ price: 10 }];

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
      const result = await service.getAlfaValue('ALLNEG');

      // Assert: Should not crash, g1_5 clamped to floor
      expect(result.iv).toBeDefined();
      expect(result.confidence).toBe('LOW');
      expect(result.assumptions.g_1_5).toBeGreaterThanOrEqual(0.05); // Clamped to floor
    });
  });

  // ============================================================================
  // SECTION 2: Missing Data
  // ============================================================================
  describe('Missing Data Scenarios', () => {
    it('should throw error when no profile data available', async () => {
      // Arrange: FMP returns empty profile
      mockedAxios.get.mockResolvedValueOnce({ data: [] }); // Empty profile

      // Act & Assert
      await expect(service.getAlfaValue('NODATA')).rejects.toThrow(
        'No profile data found for NODATA'
      );
    });

    it('should throw error when no cash flow data available', async () => {
      // Arrange: Profile exists but no cash flow
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'NOCF',
        companyName: 'No Cash Flow Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: [] }); // Empty cash flow

      // Act & Assert
      await expect(service.getAlfaValue('NOCF')).rejects.toThrow(
        'No cash flow data found for NOCF'
      );
    });

    it('should throw error when no balance sheet data available', async () => {
      // Arrange: Profile and cash flow exist but no balance sheet
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'NOBS',
        companyName: 'No Balance Sheet Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'NOBS', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
      ];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: [] }); // Empty balance sheet

      // Act & Assert
      await expect(service.getAlfaValue('NOBS')).rejects.toThrow(
        'No balance sheet data found for NOBS'
      );
    });

    it('should use fallback RF when API fails', async () => {
      // Arrange: Valid company data, but RF API fails
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'RFFALL',
        companyName: 'RF Fallback Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'RFFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'RFFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'RFFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'RFFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'RFFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'RFFALL',
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

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet })
        .mockResolvedValueOnce({ data: mockQuote })
        .mockResolvedValueOnce({ data: [] }) // RF API returns empty → fallback
        .mockResolvedValueOnce({ data: [{ country: 'United States', continent: 'North America', totalEquityRiskPremium: 5.0, countryRiskPremium: 0 }] as FMPMarketRiskPremium[] })
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      // Act
      const result = await service.getAlfaValue('RFFALL');

      // Assert: Should use fallback RF (4%)
      expect(result.assumptions.rf).toBe(VALUATION_DEFAULTS.RF); // 0.04
      expect(result.confidence).toBe('MED'); // Fallback used → MED confidence
    });

    it('should use fallback MRP when API fails', async () => {
      // Arrange: Valid company data, but MRP API fails
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'MRPFALL',
        companyName: 'MRP Fallback Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'MRPFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'MRPFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'MRPFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'MRPFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'MRPFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'MRPFALL',
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

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockProfile })
        .mockResolvedValueOnce({ data: mockCashFlow })
        .mockResolvedValueOnce({ data: mockBalanceSheet })
        .mockResolvedValueOnce({ data: mockQuote })
        .mockResolvedValueOnce({ data: [{ date: '2024-01-01', year10: 4.25 }] as FMPTreasuryRates[] })
        .mockResolvedValueOnce({ data: [] }) // MRP API returns empty → fallback
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [] });

      // Act
      const result = await service.getAlfaValue('MRPFALL');

      // Assert: Should use fallback MRP (5%)
      expect(result.assumptions.mrp).toBe(VALUATION_DEFAULTS.MRP); // 0.05
      expect(result.confidence).toBe('MED'); // Fallback used → MED confidence
    });

    it('should use fallback beta when profile missing beta', async () => {
      // Arrange: Profile exists but beta is null/undefined
      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'BETAFALL',
        companyName: 'Beta Fallback Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: null as any, // No beta
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'BETAFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'BETAFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'BETAFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'BETAFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'BETAFALL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'BETAFALL',
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
      const result = await service.getAlfaValue('BETAFALL');

      // Assert: Should use fallback beta (1.0)
      expect(result.assumptions.beta).toBe(VALUATION_DEFAULTS.BETA); // 1.0
      expect(result.confidence).toBe('MED'); // Fallback used → MED confidence
    });
  });

  // ============================================================================
  // SECTION 3: Cache Failures
  // ============================================================================
  describe('Cache Failures', () => {
    it('should fallback to API when Redis get fails', async () => {
      // Arrange: Redis get throws error
      mockedCache.get.mockRejectedValue(new Error('Redis connection failed'));

      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'CACHEFAIL',
        companyName: 'Cache Fail Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'CACHEFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'CACHEFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'CACHEFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'CACHEFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'CACHEFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'CACHEFAIL',
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
      const result = await service.getAlfaValue('CACHEFAIL');

      // Assert: Should calculate IV successfully (bypass cache)
      expect(result.iv).toBeGreaterThan(0);
      expect(result.ticker).toBe('CACHEFAIL');
    });

    it('should handle Redis set failure gracefully', async () => {
      // Arrange: Redis set throws error but calculation proceeds
      mockedCache.get.mockResolvedValue(null); // Cache miss
      mockedCache.set.mockRejectedValue(new Error('Redis write failed'));

      const mockProfile: FMPCompanyProfile[] = [{
        symbol: 'SETFAIL',
        companyName: 'Set Fail Corp',
        industry: 'Technology',
        sector: 'Tech',
        beta: 1.0,
        marketCap: 1000000000,
        price: 50,
      }];

      const mockCashFlow: FMPFinancialStatement[] = [
        { date: '2024-01-01', symbol: 'SETFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2024-01-01', acceptedDate: '2024-01-01', calendarYear: '2024', period: 'FY', freeCashFlow: 100_000_000 },
        { date: '2023-01-01', symbol: 'SETFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2023-01-01', acceptedDate: '2023-01-01', calendarYear: '2023', period: 'FY', freeCashFlow: 95_000_000 },
        { date: '2022-01-01', symbol: 'SETFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2022-01-01', acceptedDate: '2022-01-01', calendarYear: '2022', period: 'FY', freeCashFlow: 90_000_000 },
        { date: '2021-01-01', symbol: 'SETFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2021-01-01', acceptedDate: '2021-01-01', calendarYear: '2021', period: 'FY', freeCashFlow: 85_000_000 },
        { date: '2020-01-01', symbol: 'SETFAIL', reportedCurrency: 'USD', cik: '0001', fillingDate: '2020-01-01', acceptedDate: '2020-01-01', calendarYear: '2020', period: 'FY', freeCashFlow: 80_000_000 },
      ];

      const mockBalanceSheet: FMPFinancialStatement[] = [{
        date: '2024-01-01',
        symbol: 'SETFAIL',
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
      const result = await service.getAlfaValue('SETFAIL');

      // Assert: Should calculate IV successfully (cache write failure ignored)
      expect(result.iv).toBeGreaterThan(0);
      expect(result.ticker).toBe('SETFAIL');
    });

    it('should return cached result when available', async () => {
      // Arrange: Cache returns valid result
      const cachedResult = {
        ticker: 'CACHED',
        iv: 150.0,
        price: 100.0,
        discount_pct: 50.0,
        status: 'undervalued' as const,
        assumptions: {
          g_1_5: 0.15,
          g_6_10: 0.10,
          g_11_20: 0.04,
          discount_rate: 0.09,
          rf: 0.04,
          beta: 1.0,
          mrp: 0.05,
        },
        inputs: {
          fcf_ttm_musd: 100,
          fcf_5y_musd: [80, 85, 90, 95, 100],
          cash_musd: 200,
          debt_musd: 100,
          shares_m: 20,
        },
        meta: {
          g_sector_mid: 0.12,
          g_sector_source: 'static' as const,
          g_term_region: 0.04,
          region: 'US' as const,
        },
        confidence: 'HIGH' as const,
        as_of: '2024-01-01',
      };

      mockedCache.get.mockResolvedValueOnce(cachedResult);

      // Act
      const result = await service.getAlfaValue('CACHED');

      // Assert: Should return cached result without API calls
      expect(result).toEqual(cachedResult);
      expect(mockedAxios.get).not.toHaveBeenCalled(); // No API calls
    });
  });
});
