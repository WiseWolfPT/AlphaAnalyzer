/**
 * TDD Test Suite for P/S and P/B Multiples Refactoring
 *
 * ONDA 2.2 UPDATE: Median methods (calculatePSMedian5Y, calculatePBMedian5Y, calculatePBMedianWithoutNRI)
 * have been removed from the backend to align with StockOracle methodology.
 * Tests for Median methods should be considered DEPRECATED and can be removed in future cleanup.
 *
 * Testing Strategy:
 * 1. RED: Write failing tests expecting rich response objects
 * 2. GREEN: Refactor methods to return PSValuationResponse/PBValuationResponse
 * 3. REFACTOR: Ensure code quality and maintainability
 *
 * Active Methods:
 * - calculatePSMean5Y() → PSValuationResponse
 * - calculatePBMean5Y() → PBValuationResponse
 * - calculatePBMeanWithoutNRI() → PBValuationResponse (excludeNRI: true)
 *
 * Deprecated (ONDA 2.2):
 * - calculatePSMedian5Y() → REMOVED
 * - calculatePBMedian5Y() → REMOVED
 * - calculatePBMedianWithoutNRI() → REMOVED
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PSValuationResponse, PBValuationResponse } from '../../types/valuation';

// Mock axios for FMP API calls (used in valuation-service.ts)
vi.mock('axios');

// Mock Redis cache
vi.mock('../../cache/redis-cache-service', () => ({
  redisCacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const axios = await import('axios');
const { redisCacheService } = await import('../../cache/redis-cache-service');
const { ValuationService } = await import('../valuation-service');

describe('ValuationService - P/S and P/B Multiples (TDD Refactoring)', () => {
  let service: InstanceType<typeof ValuationService>;

  beforeEach(() => {
    service = new ValuationService();
    vi.clearAllMocks();
  });

  describe('P/S Mean 5Y - calculatePSMean5Y()', () => {
    it('should return PSValuationResponse with avgPS and all required fields', async () => {
      // Arrange: Mock axios GET requests for FMP API
      vi.mocked(axios.default.get).mockImplementation(async (url: string) => {
        if (path.includes('/ratios/')) {
          return [
            { date: '2024-01-01', priceToSalesRatio: 7.5 },
            { date: '2023-01-01', priceToSalesRatio: 7.2 },
            { date: '2022-01-01', priceToSalesRatio: 7.8 },
            { date: '2021-01-01', priceToSalesRatio: 7.1 },
            { date: '2020-01-01', priceToSalesRatio: 6.9 },
          ];
        }
        if (path.includes('/key-metrics-ttm/')) {
          return [{ revenuePerShareTTM: 25.5 }];
        }
        if (path.includes('/quote/')) {
          return [{ price: 180.0 }];
        }
        return [];
      });

      // Act: Call method
      const result = await service.calculatePSMean5Y('AAPL');

      // Assert: Verify rich response structure
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        ticker: 'AAPL',
        iv: expect.any(Number),
        avgPS: expect.any(Number),
        currentPrice: 180.0,
        salesPerShare: 25.5,
        historicalPS: expect.arrayContaining([
          expect.any(Number),
        ]),
        confidence: 'MED',
        as_of: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });

      // Verify avgPS calculation (mean of 7.5, 7.2, 7.8, 7.1, 6.9 = 7.3)
      expect(result?.avgPS).toBeCloseTo(7.3, 1);

      // Verify IV calculation (7.3 × 25.5 ≈ 186.15)
      expect(result?.iv).toBeCloseTo(186.15, 0);

      // Verify historicalPS array
      expect(result?.historicalPS).toHaveLength(5);
    });

    it('should return null when insufficient data', async () => {
      vi.mocked(fmpGet).mockResolvedValue([]);

      const result = await service.calculatePSMean5Y('INVALID');

      expect(result).toBeNull();
    });
  });

  describe('P/S Median 5Y - calculatePSMedian5Y()', () => {
    it('should return PSValuationResponse with medianPS', async () => {
      // Arrange
      vi.mocked(fmpGet).mockImplementation(async (path: string) => {
        if (path.includes('/ratios/')) {
          return [
            { date: '2024-01-01', priceToSalesRatio: 7.5 },
            { date: '2023-01-01', priceToSalesRatio: 7.2 },
            { date: '2022-01-01', priceToSalesRatio: 7.8 },
            { date: '2021-01-01', priceToSalesRatio: 7.1 },
            { date: '2020-01-01', priceToSalesRatio: 6.9 },
          ];
        }
        if (path.includes('/key-metrics-ttm/')) {
          return [{ revenuePerShareTTM: 25.5 }];
        }
        if (path.includes('/quote/')) {
          return [{ price: 180.0 }];
        }
        return [];
      });

      // Act
      const result = await service.calculatePSMedian5Y('AAPL');

      // Assert
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        ticker: 'AAPL',
        iv: expect.any(Number),
        medianPS: expect.any(Number),
        currentPrice: 180.0,
        salesPerShare: 25.5,
        historicalPS: expect.any(Array),
        confidence: 'MED',
        as_of: expect.any(String),
      });

      // Verify medianPS calculation (sorted: 6.9, 7.1, 7.2, 7.5, 7.8 → median = 7.2)
      expect(result?.medianPS).toBeCloseTo(7.2, 1);
    });
  });

  describe('P/B Mean 5Y - calculatePBMean5Y()', () => {
    it('should return PBValuationResponse with avgPB and excludeNRI: false', async () => {
      // Arrange
      vi.mocked(fmpGet).mockImplementation(async (path: string) => {
        if (path.includes('/ratios/')) {
          return [
            { date: '2024-01-01', priceToBookRatio: 42.5 },
            { date: '2023-01-01', priceToBookRatio: 43.2 },
            { date: '2022-01-01', priceToBookRatio: 44.1 },
            { date: '2021-01-01', priceToBookRatio: 42.8 },
            { date: '2020-01-01', priceToBookRatio: 41.9 },
          ];
        }
        if (path.includes('/key-metrics-ttm/')) {
          return [{ bookValuePerShareTTM: 4.5 }];
        }
        if (path.includes('/quote/')) {
          return [{ price: 180.0 }];
        }
        return [];
      });

      // Act
      const result = await service.calculatePBMean5Y('AAPL');

      // Assert
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        ticker: 'AAPL',
        iv: expect.any(Number),
        avgPB: expect.any(Number),
        currentPrice: 180.0,
        bookValuePerShare: 4.5,
        historicalPB: expect.any(Array),
        excludeNRI: false,  // ✅ Normal version
        confidence: 'MED',
        as_of: expect.any(String),
      });

      // Verify avgPB calculation
      expect(result?.avgPB).toBeCloseTo(42.9, 1);

      // Verify IV calculation (42.9 × 4.5 ≈ 193.05)
      expect(result?.iv).toBeCloseTo(193.05, 0);
    });
  });

  describe('P/B Median 5Y - calculatePBMedian5Y()', () => {
    it('should return PBValuationResponse with medianPB and excludeNRI: false', async () => {
      // Arrange
      vi.mocked(fmpGet).mockImplementation(async (path: string) => {
        if (path.includes('/ratios/')) {
          return [
            { date: '2024-01-01', priceToBookRatio: 42.5 },
            { date: '2023-01-01', priceToBookRatio: 43.2 },
            { date: '2022-01-01', priceToBookRatio: 44.1 },
            { date: '2021-01-01', priceToBookRatio: 42.8 },
            { date: '2020-01-01', priceToBookRatio: 41.9 },
          ];
        }
        if (path.includes('/key-metrics-ttm/')) {
          return [{ bookValuePerShareTTM: 4.5 }];
        }
        if (path.includes('/quote/')) {
          return [{ price: 180.0 }];
        }
        return [];
      });

      // Act
      const result = await service.calculatePBMedian5Y('AAPL');

      // Assert
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        ticker: 'AAPL',
        medianPB: expect.any(Number),
        excludeNRI: false,
      });

      // Verify medianPB (sorted: 41.9, 42.5, 42.8, 43.2, 44.1 → median = 42.8)
      expect(result?.medianPB).toBeCloseTo(42.8, 1);
    });
  });

  describe('P/B Mean without NRI - calculatePBMeanWithoutNRI()', () => {
    it('should return PBValuationResponse with excludeNRI: true', async () => {
      // Arrange
      vi.mocked(fmpGet).mockImplementation(async (path: string) => {
        if (path.includes('/income-statement/')) {
          return [
            { date: '2024-01-01' },
            { date: '2023-01-01' },
            { date: '2022-01-01' },
            { date: '2021-01-01' },
            { date: '2020-01-01' },
          ];
        }
        if (path.includes('/balance-sheet-statement/')) {
          return [
            { date: '2024-01-01' },
            { date: '2023-01-01' },
            { date: '2022-01-01' },
          ];
        }
        if (path.includes('/ratios/')) {
          return [
            { date: '2024-01-01', priceToBookRatio: 41.0 },
            { date: '2023-01-01', priceToBookRatio: 40.5 },
            { date: '2022-01-01', priceToBookRatio: 42.2 },
            { date: '2021-01-01', priceToBookRatio: 39.8 },
            { date: '2020-01-01', priceToBookRatio: 40.1 },
          ];
        }
        if (path.includes('/key-metrics-ttm/')) {
          return [{ bookValuePerShareTTM: 4.5 }];
        }
        if (path.includes('/quote/')) {
          return [{ price: 180.0 }];
        }
        return [];
      });

      // Act
      const result = await service.calculatePBMeanWithoutNRI('AAPL');

      // Assert
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        ticker: 'AAPL',
        iv: expect.any(Number),
        avgPB: expect.any(Number),
        currentPrice: 180.0,
        bookValuePerShare: 4.5,
        historicalPB: expect.any(Array),
        excludeNRI: true,  // ✅ WITHOUT NRI version
        confidence: 'MED',
        as_of: expect.any(String),
      });
    });
  });

  describe('P/B Median without NRI - calculatePBMedianWithoutNRI()', () => {
    it('should return PBValuationResponse with medianPB and excludeNRI: true', async () => {
      // Arrange
      vi.mocked(fmpGet).mockImplementation(async (path: string) => {
        if (path.includes('/income-statement/')) {
          return [
            { date: '2024-01-01' },
            { date: '2023-01-01' },
            { date: '2022-01-01' },
            { date: '2021-01-01' },
            { date: '2020-01-01' },
          ];
        }
        if (path.includes('/balance-sheet-statement/')) {
          return [
            { date: '2024-01-01' },
            { date: '2023-01-01' },
            { date: '2022-01-01' },
          ];
        }
        if (path.includes('/ratios/')) {
          return [
            { date: '2024-01-01', priceToBookRatio: 41.0 },
            { date: '2023-01-01', priceToBookRatio: 40.5 },
            { date: '2022-01-01', priceToBookRatio: 42.2 },
            { date: '2021-01-01', priceToBookRatio: 39.8 },
            { date: '2020-01-01', priceToBookRatio: 40.1 },
          ];
        }
        if (path.includes('/key-metrics-ttm/')) {
          return [{ bookValuePerShareTTM: 4.5 }];
        }
        if (path.includes('/quote/')) {
          return [{ price: 180.0 }];
        }
        return [];
      });

      // Act
      const result = await service.calculatePBMedianWithoutNRI('AAPL');

      // Assert
      expect(result).toBeTruthy();
      expect(result).toMatchObject({
        ticker: 'AAPL',
        medianPB: expect.any(Number),
        excludeNRI: true,  // ✅ WITHOUT NRI version
        confidence: 'MED',
      });

      // Verify medianPB (sorted: 39.8, 40.1, 40.5, 41.0, 42.2 → median = 40.5)
      expect(result?.medianPB).toBeCloseTo(40.5, 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cache hits correctly', async () => {
      // This test verifies that cached values should now be PSValuationResponse/PBValuationResponse
      // After refactoring, cache will store rich objects instead of just numbers

      const cachedResponse: PSValuationResponse = {
        ticker: 'AAPL',
        iv: 186.15,
        avgPS: 7.3,
        currentPrice: 180.0,
        salesPerShare: 25.5,
        historicalPS: [7.5, 7.2, 7.8, 7.1, 6.9],
        confidence: 'MED',
        as_of: '2025-10-21',
      };

      vi.mocked(redisCacheService.get).mockResolvedValue(cachedResponse);

      const result = await service.calculatePSMean5Y('AAPL');

      expect(result).toEqual(cachedResponse);
    });

    it('should return null for invalid ticker data', async () => {
      vi.mocked(fmpGet).mockResolvedValue(null);

      const result = await service.calculatePSMean5Y('INVALID');

      expect(result).toBeNull();
    });
  });
});
