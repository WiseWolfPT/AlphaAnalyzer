/**
 * IV Chart Controller - Current Price Bug Fix Tests
 *
 * BUG: Line 93 - getCurrentPrice returns null instead of real price
 * CAUSE: Accessing private method via bracket notation fails in compiled JS
 * FIX: Use simpleCacheService.getQuote() which is proven to work
 *
 * Test Strategy:
 * 1. Red Phase: Verify currentPrice is returned correctly
 * 2. Green Phase: Fix implementation to use working quote service
 * 3. Refactor Phase: Ensure defensive fallbacks work
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { getIVChart } from '../iv-chart-controller';
import { simpleCacheService } from '../../services/simple-cache-service';
import { methodCacheService } from '../../services/method-cache-service';
import { macroService } from '../../services/macro-service';
import axios from 'axios';
import type { StockQuote } from '@/types/market-data';

// Mock dependencies
vi.mock('../../services/simple-cache-service', () => ({
  simpleCacheService: {
    getQuote: vi.fn(),
  },
}));

vi.mock('../../services/method-cache-service', () => ({
  methodCacheService: {
    warmMethod: vi.fn(),
  },
}));

vi.mock('../../services/macro-service', () => ({
  macroService: {
    getMacroMultiplier: vi.fn(),
  },
}));

vi.mock('../../cache/redis-cache-service', () => ({
  redisCacheService: {
    get: vi.fn().mockResolvedValue(null), // Force cache miss
    set: vi.fn(),
  },
}));

vi.mock('../../utils/stock-classifier', () => ({
  isETF: vi.fn().mockReturnValue(false),
  getETFReason: vi.fn(),
}));

vi.mock('../../utils/growth-rate-estimator', () => ({
  estimateGrowthRates: vi.fn().mockResolvedValue({
    year1To5: 0.10,
    year6To10: 0.07,
    year11To20: 0.04,
    dataSource: 'analyst',
    confidence: 'high',
  }),
}));

// Mock axios for company profile fetch
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('IV Chart Controller - Current Price Bug Fix', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockTicker = 'AAPL';
  const mockValidPrice = 262.82;

  const createMockQuote = (price: number): StockQuote => ({
    symbol: mockTicker,
    price,
    regularMarketPrice: price,
    change: 2.5,
    changePercent: 0.96,
    volume: 45678900,
    marketCap: 4000000000000,
    peRatio: 28.5,
    high: 265.0,
    low: 260.0,
    open: 261.5,
    previousClose: 260.32,
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockReq = {
      params: { ticker: mockTicker },
      query: {},
    };

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };

    vi.clearAllMocks();

    // Mock axios for company profile fetch (getCompanyProfile)
    vi.mocked(axios.get).mockResolvedValue({
      data: [
        {
          sector: 'Technology',
          industry: 'Consumer Electronics',
          beta: 1.2,
        },
      ],
    } as any);

    // Mock macro service
    vi.mocked(macroService.getMacroMultiplier).mockResolvedValue({
      multiplier: 1.0,
      sentiment: 'neutral' as any,
    });

    // Mock at least one successful method to prevent early 404
    vi.mocked(methodCacheService.warmMethod).mockResolvedValue({
      ticker: mockTicker,
      iv: 250,
      confidence: 'HIGH',
      as_of: '2025-10-25',
      inputs: {
        fcf_ttm_musd: 100000,
        totalDebt: 50000,
        cash: 25000,
        sharesOutstanding: 15000,
      },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TDD Red Phase - Verify Bug Exists', () => {
    it('should return valid currentPrice for AAPL (critical P0 bug)', async () => {
      // Arrange: Mock quote service to return valid price
      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(
        createMockQuote(mockValidPrice)
      );

      // Act: Call the controller
      await getIVChart(mockReq as Request, mockRes as Response);

      // Assert: currentPrice must be valid (not null, not 0)

      // Debug: Check what was called
      if (statusMock.mock.calls.length > 0) {
        const statusCode = statusMock.mock.calls[0][0];
        const errorResponse = jsonMock.mock.calls[0]?.[0];
        console.log('Error status:', statusCode);
        console.log('Error response:', JSON.stringify(errorResponse, null, 2));

        // If we got an error, fail with helpful message
        if (statusCode !== 200) {
          throw new Error(`Controller returned ${statusCode}: ${errorResponse?.error || 'Unknown error'}. Details: ${errorResponse?.details || 'None'}`);
        }
      }

      expect(jsonMock).toHaveBeenCalled();
      const response = jsonMock.mock.calls[0][0];

      expect(response).toBeDefined();
      expect(response.price).toBeDefined();
      expect(response.price).toBe(mockValidPrice);
      expect(response.price).toBeGreaterThan(0);
      expect(response.price).not.toBeNull();
    });

    it('should fetch price from simpleCacheService.getQuote', async () => {
      // Arrange
      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(
        createMockQuote(mockValidPrice)
      );

      // Act
      await getIVChart(mockReq as Request, mockRes as Response);

      // Assert: Verify the working service was called
      expect(simpleCacheService.getQuote).toHaveBeenCalledWith(mockTicker.toUpperCase());
    });
  });

  describe('TDD Green Phase - Defensive Fallbacks', () => {
    it('should use price field from quote response', async () => {
      const quoteWithPrice = createMockQuote(175.5);
      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(quoteWithPrice);

      await getIVChart(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.price).toBe(175.5);
    });

    it('should fallback to regularMarketPrice if price is missing', async () => {
      const quoteWithRegularPrice: StockQuote = {
        ...createMockQuote(0),
        price: 0, // Missing primary price
        regularMarketPrice: 180.25,
      };

      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(quoteWithRegularPrice);

      await getIVChart(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.price).toBe(180.25);
    });

    it('should return 404 if quote service returns null', async () => {
      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(null);

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('No price data'),
        })
      );
    });

    it('should return 404 if price is 0', async () => {
      const quoteWithZeroPrice: StockQuote = {
        ...createMockQuote(0),
        price: 0,
        regularMarketPrice: 0,
      };

      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(quoteWithZeroPrice);

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 404 if price is negative', async () => {
      const quoteWithNegativePrice = createMockQuote(-1);

      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(quoteWithNegativePrice);

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('Integration with Valuation Methods', () => {
    it('should use fetched price for discount percentage calculation', async () => {
      const price = 150.0;
      const iv = 180.0; // 20% undervalued

      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(createMockQuote(price));

      vi.mocked(methodCacheService.warmMethod).mockResolvedValue({
        ticker: mockTicker,
        iv,
        confidence: 'HIGH',
        as_of: '2025-10-25',
        inputs: {} as any,
      } as any);

      await getIVChart(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.price).toBe(price);

      // Verify discount calculation uses correct price
      const method = response.methods[0];
      const expectedDiscount = ((iv - price) / price) * 100;
      expect(method.discount_pct).toBeCloseTo(expectedDiscount, 2);
    });

    it('should handle special tickers like BRK.B', async () => {
      mockReq.params = { ticker: 'BRK.B' };

      vi.mocked(simpleCacheService.getQuote).mockResolvedValue(
        createMockQuote(450.5)
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(simpleCacheService.getQuote).toHaveBeenCalledWith('BRK.B');
      const response = jsonMock.mock.calls[0][0];
      expect(response.price).toBe(450.5);
    });
  });

  describe('Error Handling', () => {
    it('should handle quote service errors gracefully', async () => {
      vi.mocked(simpleCacheService.getQuote).mockRejectedValue(
        new Error('Network timeout')
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should handle malformed quote response', async () => {
      vi.mocked(simpleCacheService.getQuote).mockResolvedValue({} as any);

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });
});
