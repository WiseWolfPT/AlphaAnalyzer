/**
 * BUG REPRODUCTION TEST: False 404s for Stocks with Full FMP Data
 *
 * CONTEXT:
 * - FMP validation shows 1,045 stocks (98.1%) have FULL financial data (5 years)
 * - Backend returns HTTP 404 for these same stocks
 * - Frontend endpoint: /api/iv/{ticker}/main
 *
 * CRITICAL EXAMPLES:
 * - UK: 0QVW.L, 0QZP.L, 0R1D.L, 0R3M.L (FMP: ✅ | Backend: ❌ 404)
 * - Netherlands: AALB.AS, AKZA.AS, ASML.AS (FMP: ✅ | Backend: ❌ 404)
 * - US: ACU, AES, AFRM, AJG, AKAM (FMP: ✅ | Backend: ❌ 404)
 *
 * HYPOTHESIS: Ticker normalization bug - European suffixes (.L, .AS, .PA) not handled correctly
 *
 * This file contains RED tests that SHOULD PASS but currently FAIL (404).
 * Fix implementation will make these tests GREEN.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { getIVChart } from '../iv-chart-controller';
import { methodCacheService } from '../../services/method-cache-service';
import { redisCacheService } from '../../cache/redis-cache-service';
import { getPriceWithFallbacks } from '../../services/price-fallback-service';

// Mock dependencies
vi.mock('../../services/method-cache-service');
vi.mock('../../cache/redis-cache-service');
vi.mock('../../lib/logger');
vi.mock('../../services/price-fallback-service');

describe('BUG: False 404s for stocks with FMP data', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Mock Redis cache to return null (force fresh calculation)
    vi.mocked(redisCacheService.get).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('European tickers with FMP data', () => {
    /**
     * TEST GROUP 1: UK stocks (.L suffix)
     * FMP validation confirms these have 5 years of data
     */
    const ukStocksWithFmpData = [
      '0QVW.L',   // FMP: ✅ 5 years | Backend: ❌ 404
      '0QZP.L',   // FMP: ✅ 5 years | Backend: ❌ 404
      '0R1D.L',   // FMP: ✅ 5 years | Backend: ❌ 404
      '0R3M.L',   // FMP: ✅ 5 years | Backend: ❌ 404
    ];

    it.each(ukStocksWithFmpData)(
      'should NOT return 404 for UK stock %s (FMP has 5 years data)',
      async (ticker) => {
        // Setup
        mockRequest = {
          params: { ticker },
          query: {},
        };

        // Mock getPriceWithFallbacks to return valid price
        vi.mocked(getPriceWithFallbacks).mockResolvedValue(150.0);

        // Mock methodCacheService.warmMethod to return valid valuation results
        // (simulating FMP API calls that SHOULD work)
        vi.mocked(methodCacheService.warmMethod).mockResolvedValue({
          iv: 200.0,
          confidence: 'HIGH',
          as_of: '2025-10-30',
        });

        // Execute
        await getIVChart(mockRequest as Request, mockResponse as Response);

        // Assert: Should return 200 with methods, NOT 404
        expect(statusMock).not.toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ticker: ticker.toUpperCase(),
            price: 150.0,
            methods: expect.arrayContaining([
              expect.objectContaining({
                iv: expect.any(Number),
                discount_pct: expect.any(Number),
              }),
            ]),
          })
        );
      }
    );

    /**
     * TEST GROUP 2: Netherlands stocks (.AS suffix)
     * FMP validation confirms these have 5 years of data
     */
    const netherlandsStocksWithFmpData = [
      'AALB.AS',  // FMP: ✅ 5 years | Backend: ❌ 404
      'AKZA.AS',  // FMP: ✅ 5 years | Backend: ❌ 404
      'ASML.AS',  // FMP: ✅ 5 years | Backend: ❌ 404
    ];

    it.each(netherlandsStocksWithFmpData)(
      'should NOT return 404 for Netherlands stock %s (FMP has 5 years data)',
      async (ticker) => {
        // Setup
        mockRequest = {
          params: { ticker },
          query: {},
        };

        // Mock valid price
        vi.mocked(getPriceWithFallbacks).mockResolvedValue(200.0);

        // Mock valid valuation results
        vi.mocked(methodCacheService.warmMethod).mockResolvedValue({
          iv: 250.0,
          confidence: 'MED',
          as_of: '2025-10-30',
        });

        // Execute
        await getIVChart(mockRequest as Request, mockResponse as Response);

        // Assert: Should return 200, NOT 404
        expect(statusMock).not.toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ticker: ticker.toUpperCase(),
            price: 200.0,
            methods: expect.any(Array),
          })
        );
      }
    );
  });

  describe('US stocks with FMP data', () => {
    /**
     * TEST GROUP 3: US stocks (no suffix)
     * FMP validation confirms these have 5 years of data
     */
    const usStocksWithFmpData = [
      'ACU',   // FMP: ✅ 5 years | Backend: ❌ 404
      'AES',   // FMP: ✅ 5 years | Backend: ❌ 404
      'AFRM',  // FMP: ✅ 5 years | Backend: ❌ 404
      'AJG',   // FMP: ✅ 5 years | Backend: ❌ 404
      'AKAM',  // FMP: ✅ 5 years | Backend: ❌ 404
    ];

    it.each(usStocksWithFmpData)(
      'should NOT return 404 for US stock %s (FMP has 5 years data)',
      async (ticker) => {
        // Setup
        mockRequest = {
          params: { ticker },
          query: {},
        };

        // Mock valid price
        vi.mocked(getPriceWithFallbacks).mockResolvedValue(100.0);

        // Mock valid valuation
        vi.mocked(methodCacheService.warmMethod).mockResolvedValue({
          iv: 120.0,
          confidence: 'HIGH',
          as_of: '2025-10-30',
        });

        // Execute
        await getIVChart(mockRequest as Request, mockResponse as Response);

        // Assert: Should return 200, NOT 404
        expect(statusMock).not.toHaveBeenCalledWith(404);
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            ticker: ticker.toUpperCase(),
            price: 100.0,
            methods: expect.any(Array),
          })
        );
      }
    );
  });

  describe('Root cause analysis: Price lookup failure', () => {
    /**
     * HYPOTHESIS: simpleCacheService.getQuote() returns null/undefined for European tickers
     * This triggers line 108 in iv-chart-controller.ts:
     *   res.status(404).json({ error: `No price data found for ${ticker}` })
     */
    it('should detect when price lookup fails for European ticker', async () => {
      const ticker = 'ASML.AS';

      mockRequest = {
        params: { ticker },
        query: {},
      };

      // Simulate price lookup failure (BUG!)
      vi.mocked(getPriceWithFallbacks).mockResolvedValue(null);

      // Execute
      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Assert: Currently returns 404 (THIS IS THE BUG!)
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining('No price data found'),
      });

      // Verify getPriceWithFallbacks was called with correct ticker
      expect(getPriceWithFallbacks).toHaveBeenCalledWith('ASML.AS');
    });

    it('should detect when price lookup fails for UK ticker', async () => {
      const ticker = '0QVW.L';

      mockRequest = {
        params: { ticker },
        query: {},
      };

      // Simulate price lookup failure
      vi.mocked(getPriceWithFallbacks).mockResolvedValue(null);

      // Execute
      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Assert: Returns 404 (BUG!)
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining('No price data found'),
      });

      // Verify call with original ticker (WITH suffix)
      expect(getPriceWithFallbacks).toHaveBeenCalledWith('0QVW.L');
    });
  });

  describe('Root cause analysis: Method cache failures', () => {
    /**
     * HYPOTHESIS: methodCacheService.warmMethod() fails for European tickers
     * This could happen if:
     * - Ticker normalization removes suffix before FMP call
     * - FMP API requires suffix but receives ticker without it
     */
    it('should detect when alfa-value method fails for European ticker', async () => {
      const ticker = 'ASML.AS';

      mockRequest = {
        params: { ticker },
        query: {},
      };

      // Mock valid price (pass first check)
      vi.mocked(getPriceWithFallbacks).mockResolvedValue(200.0);

      // Mock method failure (BUG!)
      vi.mocked(methodCacheService.warmMethod).mockRejectedValue(
        new Error('No financial data found for ASML')
      );

      // Execute
      await getIVChart(mockRequest as Request, mockResponse as Response);

      // Assert: Should handle gracefully, not return 404
      // (methods array may be empty but response should be 200)
      expect(statusMock).not.toHaveBeenCalledWith(404);
    });
  });
});

/**
 * EXPECTED TEST RESULTS:
 *
 * BEFORE FIX (Current state):
 * ❌ All tests FAIL (reproduce bug)
 * - European tickers return 404
 * - US tickers may also return 404 for some stocks
 * - Price lookup fails (returns null)
 * - Method cache fails (throws error)
 *
 * AFTER FIX (Expected state):
 * ✅ All tests PASS
 * - European tickers return 200 with methods
 * - US tickers return 200 with methods
 * - Price lookup succeeds (returns quote data)
 * - Method cache succeeds (returns valuation)
 *
 * ROOT CAUSE TO INVESTIGATE:
 * 1. simpleCacheService.getQuote() - ticker normalization before FMP call?
 * 2. fmpGet() helper in valuation-service.ts - endpoint construction?
 * 3. financial-statements-fallback.ts - ticker passed to FMP endpoints?
 *
 * KEY FILES TO ANALYZE:
 * - server/services/simple-cache-service.ts (price lookup)
 * - server/services/valuation-service.ts (fmpGet helper)
 * - server/utils/financial-statements-fallback.ts (statement fetch)
 * - server/lib/fmp-client.ts (if exists - centralized FMP calls)
 */
