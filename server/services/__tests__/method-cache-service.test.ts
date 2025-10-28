/**
 * Method Cache Service Tests - ONDA 7
 *
 * Tests for method-level caching system that enables proactive warming
 * of all 1,493 stocks without user dependency.
 *
 * Test Strategy:
 * 1. Cache granularity: Each method cached separately
 * 2. TTL management: 24-hour default with configurable override
 * 3. Warming capability: Fetch-on-miss with cache-first read
 * 4. Selective invalidation: Per-method, per-ticker invalidation
 * 5. Error handling: Graceful degradation on cache failures
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MethodCacheService } from '../method-cache-service';
import { redisCacheService } from '../../cache/redis-cache-service';
import type { ValuationResult, MethodId } from '../../types/valuation';

// Mock Redis cache service
vi.mock('../../cache/redis-cache-service', () => ({
  redisCacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
}));

// Mock valuation services
vi.mock('../valuation-service', () => ({
  valuationService: {
    getAlfaValue: vi.fn(),
    calculatePEMean5Y: vi.fn(),
    calculatePEG: vi.fn(),
  },
}));

vi.mock('../fmp-dcf', () => ({
  fmpDCFService: {
    getDCF_FCF_EXT: vi.fn(),
    getDCF_FCFE_EXT: vi.fn(),
    getDCF_TERM_EXT: vi.fn(),
    getDCF_TERM_FCFE_EXT: vi.fn(),
  },
}));

describe('MethodCacheService', () => {
  let service: MethodCacheService;
  const mockTicker = 'AAPL';
  const mockMethodId: MethodId = 'dcf-fcf-20';

  const mockValuationResult: ValuationResult = {
    ticker: mockTicker,
    iv: 150.25,
    confidence: 'HIGH',
    as_of: '2025-10-24',
    inputs: {
      fcf_ttm_musd: 100000,
      totalDebt: 50000,
      cash: 25000,
      sharesOutstanding: 15000,
    },
  };

  beforeEach(() => {
    service = new MethodCacheService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cache Key Generation', () => {
    it('should generate correct cache key format', () => {
      const key = service['getCacheKey'](mockTicker, mockMethodId);
      expect(key).toBe('iv:method:AAPL:dcf-fcf-20');
    });

    it('should normalize ticker to uppercase', () => {
      const key = service['getCacheKey']('aapl', mockMethodId);
      expect(key).toBe('iv:method:AAPL:dcf-fcf-20');
    });

    it('should handle complex method IDs', () => {
      const key = service['getCacheKey'](mockTicker, 'dcf-terminal-fcfe');
      expect(key).toBe('iv:method:AAPL:dcf-terminal-fcfe');
    });
  });

  describe('getMethod - Cache Retrieval', () => {
    it('should return cached result when available', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(mockValuationResult);

      const result = await service.getMethod(mockTicker, mockMethodId);

      expect(result).toEqual(mockValuationResult);
      expect(redisCacheService.get).toHaveBeenCalledWith('iv:method:AAPL:dcf-fcf-20');
    });

    it('should return null when cache miss', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(null);

      const result = await service.getMethod(mockTicker, mockMethodId);

      expect(result).toBeNull();
    });

    it('should handle cache read errors gracefully', async () => {
      vi.mocked(redisCacheService.get).mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.getMethod(mockTicker, mockMethodId);

      expect(result).toBeNull();
    });

    it('should normalize ticker case before lookup', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(mockValuationResult);

      await service.getMethod('aapl', mockMethodId);

      expect(redisCacheService.get).toHaveBeenCalledWith('iv:method:AAPL:dcf-fcf-20');
    });
  });

  describe('setMethod - Cache Storage', () => {
    it('should store result with correct TTL', async () => {
      await service.setMethod(mockTicker, mockMethodId, mockValuationResult);

      expect(redisCacheService.set).toHaveBeenCalledWith(
        'iv:method:AAPL:dcf-fcf-20',
        mockValuationResult,
        86400 // 24 hours
      );
    });

    it('should allow custom TTL', async () => {
      const customTTL = 3600; // 1 hour
      await service.setMethod(mockTicker, mockMethodId, mockValuationResult, customTTL);

      expect(redisCacheService.set).toHaveBeenCalledWith(
        'iv:method:AAPL:dcf-fcf-20',
        mockValuationResult,
        customTTL
      );
    });

    it('should handle cache write errors gracefully', async () => {
      vi.mocked(redisCacheService.set).mockRejectedValue(new Error('Redis write failed'));

      // Should not throw
      await expect(
        service.setMethod(mockTicker, mockMethodId, mockValuationResult)
      ).resolves.toBeUndefined();
    });

    it('should normalize ticker before storing', async () => {
      await service.setMethod('aapl', mockMethodId, mockValuationResult);

      expect(redisCacheService.set).toHaveBeenCalledWith(
        'iv:method:AAPL:dcf-fcf-20',
        expect.any(Object),
        expect.any(Number)
      );
    });
  });

  describe('warmMethod - Cache Warming', () => {
    it('should return cached result if available (cache hit)', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(mockValuationResult);

      const result = await service.warmMethod(mockTicker, mockMethodId);

      expect(result).toEqual(mockValuationResult);
      expect(redisCacheService.get).toHaveBeenCalled();
      // Should NOT call calculation if cached
      expect(redisCacheService.set).not.toHaveBeenCalled();
    });

    it('should calculate and cache on miss', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(null);

      // Mock the internal calculateMethod to return a result
      vi.spyOn(service as any, 'calculateMethod').mockResolvedValue(mockValuationResult);

      const result = await service.warmMethod(mockTicker, mockMethodId);

      expect(result).toEqual(mockValuationResult);
      expect(redisCacheService.set).toHaveBeenCalledWith(
        'iv:method:AAPL:dcf-fcf-20',
        mockValuationResult,
        86400
      );
    });

    it('should handle calculation errors gracefully', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(null);
      vi.spyOn(service as any, 'calculateMethod').mockRejectedValue(
        new Error('FMP API timeout')
      );

      await expect(service.warmMethod(mockTicker, mockMethodId)).rejects.toThrow(
        'FMP API timeout'
      );
    });

    it('should throttle concurrent requests for same ticker+method', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(null);

      const mockCalculate = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockValuationResult), 100))
      );
      vi.spyOn(service as any, 'calculateMethod').mockImplementation(mockCalculate);

      // Fire 3 concurrent requests
      const results = await Promise.all([
        service.warmMethod(mockTicker, mockMethodId),
        service.warmMethod(mockTicker, mockMethodId),
        service.warmMethod(mockTicker, mockMethodId),
      ]);

      // All should return same result
      results.forEach(r => expect(r).toEqual(mockValuationResult));

      // But calculation should only happen ONCE (thundering herd protection)
      expect(mockCalculate).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateMethod - Selective Cache Invalidation', () => {
    it('should delete single method cache', async () => {
      await service.invalidateMethod(mockTicker, mockMethodId);

      expect(redisCacheService.del).toHaveBeenCalledWith('iv:method:AAPL:dcf-fcf-20');
    });

    it('should handle deletion errors gracefully', async () => {
      vi.mocked(redisCacheService.del).mockRejectedValue(new Error('Redis delete failed'));

      // Should not throw
      await expect(
        service.invalidateMethod(mockTicker, mockMethodId)
      ).resolves.toBeUndefined();
    });

    it('should normalize ticker before invalidation', async () => {
      await service.invalidateMethod('aapl', mockMethodId);

      expect(redisCacheService.del).toHaveBeenCalledWith('iv:method:AAPL:dcf-fcf-20');
    });
  });

  describe('invalidateAllMethods - Bulk Invalidation', () => {
    it('should invalidate all methods for a ticker', async () => {
      const mockKeys = [
        'iv:method:AAPL:dcf-fcf-20',
        'iv:method:AAPL:dcf-fcfe-20',
        'iv:method:AAPL:alfa-value',
      ];

      vi.mocked(redisCacheService.keys).mockResolvedValue(mockKeys);
      vi.mocked(redisCacheService.del).mockResolvedValue(undefined);

      await service.invalidateAllMethods(mockTicker);

      expect(redisCacheService.keys).toHaveBeenCalledWith('iv:method:AAPL:*');
      expect(redisCacheService.del).toHaveBeenCalledTimes(3);
    });

    it('should handle no matching keys gracefully', async () => {
      vi.mocked(redisCacheService.keys).mockResolvedValue([]);

      await service.invalidateAllMethods(mockTicker);

      expect(redisCacheService.del).not.toHaveBeenCalled();
    });

    it('should continue on individual delete failures', async () => {
      const mockKeys = ['iv:method:AAPL:dcf-fcf-20', 'iv:method:AAPL:alfa-value'];
      vi.mocked(redisCacheService.keys).mockResolvedValue(mockKeys);
      vi.mocked(redisCacheService.del)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined);

      // Should not throw
      await expect(service.invalidateAllMethods(mockTicker)).resolves.toBeUndefined();
    });
  });

  describe('calculateMethod - Method Routing', () => {
    it('should route to correct service for alfa-value', async () => {
      const { valuationService } = await import('../valuation-service');
      vi.mocked(valuationService.getAlfaValue).mockResolvedValue(mockValuationResult);

      const result = await service['calculateMethod'](mockTicker, 'alfa-value');

      expect(valuationService.getAlfaValue).toHaveBeenCalledWith(mockTicker);
      expect(result).toEqual(mockValuationResult);
    });

    it('should route to correct service for dcf-fcf-20', async () => {
      const { fmpDCFService } = await import('../fmp-dcf');
      vi.mocked(fmpDCFService.getDCF_FCF_EXT).mockResolvedValue(mockValuationResult as any);

      const result = await service['calculateMethod'](mockTicker, 'dcf-fcf-20');

      expect(fmpDCFService.getDCF_FCF_EXT).toHaveBeenCalledWith(mockTicker);
      expect(result).toEqual(mockValuationResult);
    });

    it('should route to correct service for peg', async () => {
      const { valuationService } = await import('../valuation-service');
      vi.mocked(valuationService.calculatePEG).mockResolvedValue(mockValuationResult as any);

      const result = await service['calculateMethod'](mockTicker, 'peg');

      expect(valuationService.calculatePEG).toHaveBeenCalledWith(mockTicker);
      expect(result).toEqual(mockValuationResult);
    });

    it('should throw for unsupported method IDs', async () => {
      await expect(
        service['calculateMethod'](mockTicker, 'invalid-method' as any)
      ).rejects.toThrow('Unsupported method ID: invalid-method');
    });
  });

  describe('Performance & Resource Management', () => {
    it('should complete cache operations within 50ms', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(mockValuationResult);

      const start = Date.now();
      await service.getMethod(mockTicker, mockMethodId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should handle 100 concurrent cache reads efficiently', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(mockValuationResult);

      const tickers = Array.from({ length: 100 }, (_, i) => `TICK${i}`);

      const start = Date.now();
      await Promise.all(
        tickers.map(ticker => service.getMethod(ticker, mockMethodId))
      );
      const duration = Date.now() - start;

      // Should complete in reasonable time (< 500ms for 100 concurrent)
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined ticker gracefully', async () => {
      await expect(service.getMethod(null as any, mockMethodId)).rejects.toThrow();
      await expect(service.getMethod(undefined as any, mockMethodId)).rejects.toThrow();
    });

    it('should handle empty ticker string', async () => {
      await expect(service.getMethod('', mockMethodId)).rejects.toThrow();
    });

    it('should handle special characters in ticker', async () => {
      vi.mocked(redisCacheService.get).mockResolvedValue(mockValuationResult);

      const result = await service.getMethod('BRK.B', mockMethodId);

      expect(redisCacheService.get).toHaveBeenCalledWith('iv:method:BRK.B:dcf-fcf-20');
      expect(result).toEqual(mockValuationResult);
    });

    it('should handle very large IV values', async () => {
      const largeResult = { ...mockValuationResult, iv: 1e10 };
      vi.mocked(redisCacheService.get).mockResolvedValue(largeResult);

      const result = await service.getMethod(mockTicker, mockMethodId);

      expect(result?.iv).toBe(1e10);
    });

    it('should handle negative IV values (theoretical edge case)', async () => {
      const negativeResult = { ...mockValuationResult, iv: -50 };
      vi.mocked(redisCacheService.get).mockResolvedValue(negativeResult);

      const result = await service.getMethod(mockTicker, mockMethodId);

      expect(result?.iv).toBe(-50);
    });
  });
});
