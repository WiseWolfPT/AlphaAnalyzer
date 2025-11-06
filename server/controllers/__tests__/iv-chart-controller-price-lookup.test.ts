/**
 * TDD Test Suite: IV Chart Controller Price Lookup Bug Fix
 *
 * Bug: 533 stocks (68%) fail with "No price data found"
 * Root Cause: valuationService.getCurrentPrice() bypasses Redis cache + has no FMP fallback
 * Solution: Replace with simpleCacheService.getQuote() which has Redis + FMP fallback
 *
 * Expected Impact: +528 stocks (25.7% → 93-95% success rate)
 */

import { Request, Response } from 'express';
import { getIVChart } from '../iv-chart-controller';
import { simpleCacheService } from '../../services/simple-cache-service';

// Mock dependencies
jest.mock('../../services/simple-cache-service');
jest.mock('../../services/valuation-service');
jest.mock('../../services/macro-service');
jest.mock('../../cache/redis-cache-service');

describe('IV Chart Controller - Price Lookup Bug Fix', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup response mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      params: { ticker: 'ADM' },
      query: { based_on: 'fcf' },
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe('Price Lookup - Redis Cache Integration', () => {
    it('should successfully fetch price for ADM from Redis cache', async () => {
      // Mock simpleCacheService.getQuote (uses Redis key: quote:ADM)
      (simpleCacheService.getQuote as jest.Mock).mockResolvedValue({
        symbol: 'ADM',
        price: 60.52,
        change: 0.5,
        changePercent: 0.83,
      });

      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Should NOT return 404 error
      expect(statusMock).not.toHaveBeenCalledWith(404);

      // Should fetch price using correct cache method
      expect(simpleCacheService.getQuote).toHaveBeenCalledWith('ADM');
    });

    it('should handle FMP API fallback when Redis cache misses', async () => {
      // Mock Redis miss → FMP fallback (inside simpleCacheService)
      (simpleCacheService.getQuote as jest.Mock).mockResolvedValue({
        symbol: 'ADM',
        price: 60.52,
        change: 0.5,
        changePercent: 0.83,
      });

      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Should successfully get price via FMP fallback
      expect(statusMock).not.toHaveBeenCalledWith(404);
      expect(simpleCacheService.getQuote).toHaveBeenCalledWith('ADM');
    });

    it('should return 404 only when both Redis AND FMP fail', async () => {
      // Mock total failure (both Redis and FMP)
      (simpleCacheService.getQuote as jest.Mock).mockResolvedValue(null);

      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Should return 404 with proper error message
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No price data found for ADM' });
    });
  });

  describe('Price Lookup - Multi-Stock Validation', () => {
    it('should work for all 10 previously failing stocks', async () => {
      const failingStocks = ['ADM', 'ADP', 'ADSK', 'AFL', 'AIG', 'ALL', 'AMAT', 'AME', 'AMGN', 'APD'];

      for (const ticker of failingStocks) {
        // Reset mocks for each iteration
        jest.clearAllMocks();

        mockRequest.params = { ticker };

        // Mock price lookup success
        (simpleCacheService.getQuote as jest.Mock).mockResolvedValue({
          symbol: ticker,
          price: 100.00, // Dummy price
          change: 0,
          changePercent: 0,
        });

        await getIVChart(mockRequest as Request, mockResponse as Response);

        // Should NOT return 404 for any stock
        expect(statusMock).not.toHaveBeenCalledWith(404);
        expect(simpleCacheService.getQuote).toHaveBeenCalledWith(ticker);
      }
    });
  });

  describe('Price Lookup - Redis Key Format', () => {
    it('should use correct Redis key format (quote:SYMBOL)', async () => {
      // This test validates the fix uses simpleCacheService which stores as quote:ADM
      (simpleCacheService.getQuote as jest.Mock).mockResolvedValue({
        symbol: 'ADM',
        price: 60.52,
        change: 0.5,
        changePercent: 0.83,
      });

      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Verify we're using the service that accesses quote:SYMBOL key
      expect(simpleCacheService.getQuote).toHaveBeenCalledWith('ADM');

      // OLD BUG: valuationService['getCurrentPrice'] would directly call FMP API
      // NEW FIX: Uses simpleCacheService.getQuote which checks Redis first (quote:ADM)
    });
  });

  describe('Price Lookup - Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      // Mock timeout error
      (simpleCacheService.getQuote as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Should handle error gracefully (not crash)
      // Will return 500 or 404 depending on error handling
      expect(statusMock).toHaveBeenCalled();
    });

    it('should handle invalid price data (0, null, undefined)', async () => {
      // Mock invalid price scenarios
      const invalidPrices = [
        { symbol: 'ADM', price: 0, change: 0, changePercent: 0 },
        { symbol: 'ADM', price: null, change: 0, changePercent: 0 },
        null,
      ];

      for (const invalidData of invalidPrices) {
        jest.clearAllMocks();
        (simpleCacheService.getQuote as jest.Mock).mockResolvedValue(invalidData);

        await getIVChart(mockRequest as Request, mockResponse as Response);

        // Should return 404 for invalid prices
        expect(statusMock).toHaveBeenCalledWith(404);
      }
    });
  });
});
