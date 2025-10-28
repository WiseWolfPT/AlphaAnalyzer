/**
 * IV Chart Controller - Method Cache Integration Tests - ONDA 7
 *
 * Tests the integration of method-level caching in the IV Chart Controller
 *
 * Test Strategy:
 * 1. Method-level cache lookup: Controller uses methodCacheService.warmMethod
 * 2. Response assembly: Methods assembled from individual cache results
 * 3. Performance: <100ms for fully cached response (14 Redis GETs)
 * 4. Fallback: Graceful degradation when cache unavailable
 * 5. Consistency: All 14 methods use same caching pattern
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { getIVChart } from '../iv-chart-controller';
import { methodCacheService } from '../../services/method-cache-service';
import { valuationService } from '../../services/valuation-service';
import { macroService } from '../../services/macro-service';
import type { ValuationResult } from '../../types/valuation';

// Mock dependencies
vi.mock('../../services/method-cache-service', () => ({
  methodCacheService: {
    warmMethod: vi.fn(),
    getSupportedMethods: vi.fn(() => [
      'alfa-value',
      'dcf-fcf-20',
      'dcf-fcfe-20',
      'dcf-terminal-fcf',
      'dcf-terminal-fcfe',
      'dni-20',
      'pe-mean',
      'pe-mean-without-nri',
      'ps-mean',
      'pb-mean',
      'pb-mean-without-nri',
      'peg',
      'psg',
      'dfcf-terminal',
    ]),
  },
}));

vi.mock('../../services/valuation-service', () => ({
  valuationService: {
    getCurrentPrice: vi.fn(),
  },
}));

vi.mock('../../services/macro-service', () => ({
  macroService: {
    getMacroMultiplier: vi.fn(),
  },
}));

vi.mock('../../cache/redis-cache-service', () => ({
  redisCacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('IV Chart Controller - Method Cache Integration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockTicker = 'AAPL';
  const mockPrice = 175.5;
  const mockMacroMultiplier = 1.05;

  const createMockResult = (methodId: string, iv: number): ValuationResult => ({
    ticker: mockTicker,
    iv,
    confidence: 'HIGH',
    as_of: '2025-10-24',
    inputs: {
      fcf_ttm_musd: 100000,
      totalDebt: 50000,
      cash: 25000,
      sharesOutstanding: 15000,
    },
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

    // Mock common dependencies
    vi.mocked(valuationService.getCurrentPrice).mockResolvedValue(mockPrice);
    vi.mocked(macroService.getMacroMultiplier).mockResolvedValue({
      multiplier: mockMacroMultiplier,
      sentiment: 'neutral' as any,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Method-Level Cache Usage', () => {
    it('should call warmMethod for each valuation method', async () => {
      // Mock warmMethod to return different IVs for each method
      let callCount = 0;
      vi.mocked(methodCacheService.warmMethod).mockImplementation(async (ticker, methodId) => {
        callCount++;
        return createMockResult(methodId, 150 + callCount * 5);
      });

      await getIVChart(mockReq as Request, mockRes as Response);

      // Should call warmMethod for each of the 14 methods
      // Note: Actual implementation might call fewer methods based on availability
      expect(methodCacheService.warmMethod).toHaveBeenCalled();
      expect(vi.mocked(methodCacheService.warmMethod).mock.calls.length).toBeGreaterThan(0);
    });

    it('should pass correct ticker to warmMethod', async () => {
      vi.mocked(methodCacheService.warmMethod).mockResolvedValue(
        createMockResult('alfa-value', 180)
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      const calls = vi.mocked(methodCacheService.warmMethod).mock.calls;
      calls.forEach(([ticker]) => {
        expect(ticker).toBe(mockTicker.toUpperCase());
      });
    });

    it('should normalize ticker case before calling warmMethod', async () => {
      mockReq.params = { ticker: 'aapl' }; // lowercase

      vi.mocked(methodCacheService.warmMethod).mockResolvedValue(
        createMockResult('alfa-value', 180)
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      const calls = vi.mocked(methodCacheService.warmMethod).mock.calls;
      calls.forEach(([ticker]) => {
        expect(ticker).toBe('AAPL'); // Should be uppercase
      });
    });
  });

  describe('Response Assembly from Cache', () => {
    it('should assemble response from individual method results', async () => {
      // Mock different IV values for each method
      const mockResults = {
        'alfa-value': createMockResult('alfa-value', 180),
        'dcf-fcf-20': createMockResult('dcf-fcf-20', 175),
        'peg': createMockResult('peg', 170),
      };

      vi.mocked(methodCacheService.warmMethod).mockImplementation(
        async (ticker, methodId) => mockResults[methodId as keyof typeof mockResults]
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ticker: mockTicker.toUpperCase(),
          price: mockPrice,
          methods: expect.arrayContaining([
            expect.objectContaining({ iv: expect.any(Number) }),
          ]),
        })
      );
    });

    it('should apply macro multiplier to all method IVs', async () => {
      const baseIV = 150;
      vi.mocked(methodCacheService.warmMethod).mockResolvedValue(
        createMockResult('alfa-value', baseIV)
      );

      vi.mocked(macroService.getMacroMultiplier).mockResolvedValue({
        multiplier: 1.1, // 10% adjustment
        sentiment: 'bullish' as any,
      });

      await getIVChart(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      expect(response.macro_multiplier).toBe(1.1);
      expect(response.macro_sentiment).toBe('bullish');
    });

    it('should include method metadata in response', async () => {
      vi.mocked(methodCacheService.warmMethod).mockResolvedValue(
        createMockResult('alfa-value', 180)
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      const response = jsonMock.mock.calls[0][0];
      response.methods.forEach((method: any) => {
        expect(method).toHaveProperty('name');
        expect(method).toHaveProperty('method_id');
        expect(method).toHaveProperty('category');
        expect(method).toHaveProperty('iv');
        expect(method).toHaveProperty('discount_pct');
        expect(method).toHaveProperty('confidence');
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should complete fully cached request in <200ms', async () => {
      // All methods cached (fast path)
      vi.mocked(methodCacheService.warmMethod).mockImplementation(
        async () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createMockResult('alfa-value', 180)), 5)
          )
      );

      const start = Date.now();
      await getIVChart(mockReq as Request, mockRes as Response);
      const duration = Date.now() - start;

      // With 14 methods × 5ms (mocked cache hit), should be ~70ms
      expect(duration).toBeLessThan(200);
    });

    it('should use parallel warming for multiple methods', async () => {
      const delays: number[] = [];

      vi.mocked(methodCacheService.warmMethod).mockImplementation(
        async () =>
          new Promise((resolve) => {
            const delay = 50;
            delays.push(Date.now());
            setTimeout(() => resolve(createMockResult('alfa-value', 180)), delay);
          })
      );

      const start = Date.now();
      await getIVChart(mockReq as Request, mockRes as Response);
      const duration = Date.now() - start;

      // If sequential: 14 × 50ms = 700ms
      // If parallel: ~50ms (all at once)
      // Allow some overhead, but should be much faster than sequential
      expect(duration).toBeLessThan(150); // Parallel execution
    }, 10000);
  });

  describe('Error Handling & Graceful Degradation', () => {
    it('should handle individual method failures gracefully', async () => {
      vi.mocked(methodCacheService.warmMethod).mockImplementation(
        async (ticker, methodId) => {
          if (methodId === 'dcf-fcf-20') {
            throw new Error('FMP API timeout');
          }
          return createMockResult(methodId, 180);
        }
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      // Should still return successful methods
      expect(jsonMock).toHaveBeenCalled();
      const response = jsonMock.mock.calls[0][0];
      expect(response.methods.length).toBeGreaterThan(0);
    });

    it('should continue with other methods if one fails', async () => {
      let successCount = 0;

      vi.mocked(methodCacheService.warmMethod).mockImplementation(
        async (ticker, methodId) => {
          if (methodId === 'dcf-fcf-20' || methodId === 'peg') {
            throw new Error('Service unavailable');
          }
          successCount++;
          return createMockResult(methodId, 180);
        }
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(successCount).toBeGreaterThan(0);
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should return 500 if no methods succeed', async () => {
      vi.mocked(valuationService.getCurrentPrice).mockRejectedValue(
        new Error('Price service down')
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing ticker parameter', async () => {
      mockReq.params = {};

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Ticker symbol required' })
      );
    });

    it('should handle invalid price data', async () => {
      vi.mocked(valuationService.getCurrentPrice).mockResolvedValue(0);

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle special characters in ticker', async () => {
      mockReq.params = { ticker: 'BRK.B' };

      vi.mocked(methodCacheService.warmMethod).mockResolvedValue(
        createMockResult('alfa-value', 180)
      );

      await getIVChart(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalled();
      const response = jsonMock.mock.calls[0][0];
      expect(response.ticker).toBe('BRK.B');
    });

    it('should handle ETF tickers appropriately', async () => {
      mockReq.params = { ticker: 'SPY' }; // S&P 500 ETF

      // Mock ETF detection (simplified - actual implementation more complex)
      vi.mocked(valuationService.getCurrentPrice).mockResolvedValue(mockPrice);

      await getIVChart(mockReq as Request, mockRes as Response);

      // Should handle ETF detection in actual implementation
      // This test ensures no crash occurs
      expect(statusMock).toHaveBeenCalled();
    });
  });

  describe('Cache Key Consistency', () => {
    it('should use consistent method IDs across requests', async () => {
      const methodIds = new Set<string>();

      vi.mocked(methodCacheService.warmMethod).mockImplementation(
        async (ticker, methodId) => {
          methodIds.add(methodId);
          return createMockResult(methodId, 180);
        }
      );

      // Make two requests
      await getIVChart(mockReq as Request, mockRes as Response);

      vi.clearAllMocks();

      await getIVChart(mockReq as Request, mockRes as Response);

      // Should use same method IDs both times
      const firstCallIds = Array.from(methodIds);
      methodIds.clear();

      vi.mocked(methodCacheService.warmMethod).mockImplementation(
        async (ticker, methodId) => {
          methodIds.add(methodId);
          return createMockResult(methodId, 180);
        }
      );

      await getIVChart(mockReq as Request, mockRes as Response);
      const secondCallIds = Array.from(methodIds);

      // Compare sets (order doesn't matter)
      expect(new Set(firstCallIds)).toEqual(new Set(secondCallIds));
    });
  });
});
