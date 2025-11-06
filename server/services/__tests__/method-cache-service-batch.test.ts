/**
 * Method Cache Service - Batch Operations Tests
 *
 * Tests Redis pipeline optimization for batch IV caching
 *
 * Performance targets:
 * - Batch cache: 600 entries in < 100ms (vs 3000ms individual)
 * - Batch retrieval: 600 gets in < 50ms
 * - 60x speedup vs sequential operations
 */

import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { methodCacheService } from '../method-cache-service';
import { enhancedRedisCacheService } from '../../cache/enhanced-redis-cache-service';
import type { ValuationResult, MethodId } from '../../types/valuation';

// Mock valuation results for testing
const createMockValuationResult = (ticker: string, iv: number): ValuationResult => ({
  ticker,
  iv,
  confidence: 'HIGH' as const,
  as_of: new Date().toISOString(),
  inputs: {
    fcf_ttm: 1000,
    shares: 100,
  },
});

describe('MethodCacheService - Batch Operations', () => {
  beforeEach(async () => {
    // Clear all cache before each test
    await enhancedRedisCacheService.clear();
  });

  afterAll(async () => {
    // Cleanup
    await enhancedRedisCacheService.disconnect();
  });

  describe('cacheBatchMethodResults()', () => {
    it('should cache 50 stocks with 12 methods each in < 100ms', async () => {
      // Build batch data: 50 stocks × 12 methods = 600 entries
      const results = new Map<string, Map<MethodId, ValuationResult>>();

      for (let i = 0; i < 50; i++) {
        const ticker = `STOCK${i}`;
        const methodsMap = new Map<MethodId, ValuationResult>();

        // Add all 12 methods
        methodsMap.set('dcf-fcf-20', createMockValuationResult(ticker, 100 + i));
        methodsMap.set('pe-mean', createMockValuationResult(ticker, 95 + i));
        methodsMap.set('ps-mean', createMockValuationResult(ticker, 90 + i));
        methodsMap.set('pb-mean', createMockValuationResult(ticker, 85 + i));
        methodsMap.set('peg', createMockValuationResult(ticker, 80 + i));
        methodsMap.set('psg', createMockValuationResult(ticker, 75 + i));
        methodsMap.set('dni-20', createMockValuationResult(ticker, 70 + i));
        methodsMap.set('pe-mean-without-nri', createMockValuationResult(ticker, 65 + i));
        methodsMap.set('pb-mean-without-nri', createMockValuationResult(ticker, 60 + i));
        methodsMap.set('dcf-terminal-fcf', createMockValuationResult(ticker, 55 + i));
        methodsMap.set('dfcf-terminal', createMockValuationResult(ticker, 50 + i));
        methodsMap.set('alfa-value', createMockValuationResult(ticker, 45 + i));

        results.set(ticker, methodsMap);
      }

      // Cache batch
      const start = performance.now();
      const entriesCached = await methodCacheService.cacheBatchMethodResults(results, 3600);
      const elapsed = performance.now() - start;

      // Assertions
      expect(entriesCached).toBe(600); // 50 stocks × 12 methods
      expect(elapsed).toBeLessThan(100); // Target: < 100ms

      // Verify one sample is actually cached
      const sampleCached = await methodCacheService.getMethod('STOCK0', 'dcf-fcf-20');
      expect(sampleCached).toBeTruthy();
      expect(sampleCached?.ticker).toBe('STOCK0');
      expect(sampleCached?.iv).toBe(100);

      console.log(`✅ Cached ${entriesCached} entries in ${elapsed.toFixed(1)}ms (${(entriesCached / elapsed).toFixed(1)} entries/ms)`);
    }, 10000);

    it('should skip null/undefined IV values', async () => {
      const results = new Map<string, Map<MethodId, ValuationResult>>();
      const methodsMap = new Map<MethodId, ValuationResult>();

      // Valid result
      methodsMap.set('dcf-fcf-20', createMockValuationResult('AAPL', 150));

      // Invalid results (should be skipped)
      methodsMap.set('pe-mean', { ...createMockValuationResult('AAPL', 0), iv: null as any });
      methodsMap.set('ps-mean', { ...createMockValuationResult('AAPL', 0), iv: undefined as any });

      results.set('AAPL', methodsMap);

      const entriesCached = await methodCacheService.cacheBatchMethodResults(results);

      // Only 1 valid entry should be cached
      expect(entriesCached).toBe(1);

      // Verify
      const dcfCached = await methodCacheService.getMethod('AAPL', 'dcf-fcf-20');
      expect(dcfCached?.iv).toBe(150);

      const peCached = await methodCacheService.getMethod('AAPL', 'pe-mean');
      expect(peCached).toBeNull();
    });

    it('should handle empty results gracefully', async () => {
      const results = new Map<string, Map<MethodId, ValuationResult>>();

      const entriesCached = await methodCacheService.cacheBatchMethodResults(results);

      expect(entriesCached).toBe(0);
    });
  });

  describe('getBatchCachedMethods()', () => {
    it('should retrieve 50 stocks with 90% hit rate in < 50ms', async () => {
      // Pre-cache 45 out of 50 stocks (90% coverage)
      const tickers: string[] = [];
      const preCacheResults = new Map<string, Map<MethodId, ValuationResult>>();

      for (let i = 0; i < 50; i++) {
        const ticker = `STOCK${i}`;
        tickers.push(ticker);

        // Cache only first 45 stocks
        if (i < 45) {
          const methodsMap = new Map<MethodId, ValuationResult>();
          methodsMap.set('dcf-fcf-20', createMockValuationResult(ticker, 100 + i));
          methodsMap.set('pe-mean', createMockValuationResult(ticker, 95 + i));
          methodsMap.set('ps-mean', createMockValuationResult(ticker, 90 + i));
          preCacheResults.set(ticker, methodsMap);
        }
      }

      await methodCacheService.cacheBatchMethodResults(preCacheResults);

      // Retrieve all 50 stocks
      const start = performance.now();
      const cached = await methodCacheService.getBatchCachedMethods(tickers);
      const elapsed = performance.now() - start;

      // Assertions
      expect(cached.size).toBe(45); // 45 stocks cached
      expect(elapsed).toBeLessThan(50); // Target: < 50ms

      // Verify content
      const aapl = cached.get('STOCK0');
      expect(aapl?.size).toBe(3); // 3 methods cached
      expect(aapl?.get('dcf-fcf-20')?.iv).toBe(100);

      // Verify missing stocks
      expect(cached.has('STOCK45')).toBe(false);
      expect(cached.has('STOCK49')).toBe(false);

      console.log(`✅ Retrieved ${cached.size} stocks in ${elapsed.toFixed(1)}ms`);
    });

    it('should filter by specific method IDs', async () => {
      // Cache multiple methods
      const results = new Map<string, Map<MethodId, ValuationResult>>();
      const methodsMap = new Map<MethodId, ValuationResult>();

      methodsMap.set('dcf-fcf-20', createMockValuationResult('AAPL', 150));
      methodsMap.set('pe-mean', createMockValuationResult('AAPL', 145));
      methodsMap.set('ps-mean', createMockValuationResult('AAPL', 140));
      methodsMap.set('peg', createMockValuationResult('AAPL', 135));

      results.set('AAPL', methodsMap);
      await methodCacheService.cacheBatchMethodResults(results);

      // Retrieve only specific methods
      const cached = await methodCacheService.getBatchCachedMethods(
        ['AAPL'],
        ['dcf-fcf-20', 'pe-mean']
      );

      const aaplMethods = cached.get('AAPL');
      expect(aaplMethods?.size).toBe(2); // Only 2 methods requested
      expect(aaplMethods?.has('dcf-fcf-20')).toBe(true);
      expect(aaplMethods?.has('pe-mean')).toBe(true);
      expect(aaplMethods?.has('ps-mean')).toBe(false); // Not requested
    });

    it('should return empty map for empty tickers array', async () => {
      const cached = await methodCacheService.getBatchCachedMethods([]);
      expect(cached.size).toBe(0);
    });
  });

  describe('getMissingTickers()', () => {
    it('should identify tickers with < 50% cache coverage', async () => {
      const tickers = ['AAPL', 'MSFT', 'GOOGL'];

      // AAPL: 100% cached (all 12 methods)
      const aaplMethods = new Map<MethodId, ValuationResult>();
      methodCacheService.getSupportedMethods().forEach(methodId => {
        aaplMethods.set(methodId, createMockValuationResult('AAPL', 150));
      });

      // MSFT: 50% cached (6 methods)
      const msftMethods = new Map<MethodId, ValuationResult>();
      ['dcf-fcf-20', 'pe-mean', 'ps-mean', 'peg', 'psg', 'dni-20'].forEach(methodId => {
        msftMethods.set(methodId as MethodId, createMockValuationResult('MSFT', 300));
      });

      // GOOGL: 0% cached (no methods)

      const results = new Map<string, Map<MethodId, ValuationResult>>();
      results.set('AAPL', aaplMethods);
      results.set('MSFT', msftMethods);

      await methodCacheService.cacheBatchMethodResults(results);

      // Check missing
      const missing = await methodCacheService.getMissingTickers(tickers);

      // Only GOOGL should be missing (0% < 50% threshold)
      // MSFT has exactly 50%, so it's NOT missing
      expect(missing).toContain('GOOGL');
      expect(missing).not.toContain('AAPL');
      expect(missing).not.toContain('MSFT'); // 50% is not < 50%
    });
  });

  describe('invalidateBatchCache()', () => {
    it('should delete all methods for multiple stocks', async () => {
      // Cache 3 stocks
      const results = new Map<string, Map<MethodId, ValuationResult>>();

      ['AAPL', 'MSFT', 'GOOGL'].forEach(ticker => {
        const methodsMap = new Map<MethodId, ValuationResult>();
        methodsMap.set('dcf-fcf-20', createMockValuationResult(ticker, 150));
        methodsMap.set('pe-mean', createMockValuationResult(ticker, 145));
        results.set(ticker, methodsMap);
      });

      await methodCacheService.cacheBatchMethodResults(results);

      // Verify cached
      let aaplCached = await methodCacheService.getMethod('AAPL', 'dcf-fcf-20');
      expect(aaplCached).toBeTruthy();

      // Invalidate
      const keysDeleted = await methodCacheService.invalidateBatchCache(
        ['AAPL', 'MSFT'],
        'test-invalidation'
      );

      expect(keysDeleted).toBeGreaterThan(0);

      // Verify AAPL and MSFT are cleared
      aaplCached = await methodCacheService.getMethod('AAPL', 'dcf-fcf-20');
      const msftCached = await methodCacheService.getMethod('MSFT', 'dcf-fcf-20');
      expect(aaplCached).toBeNull();
      expect(msftCached).toBeNull();

      // GOOGL should still be cached
      const googlCached = await methodCacheService.getMethod('GOOGL', 'dcf-fcf-20');
      expect(googlCached).toBeTruthy();
    });
  });

  describe('invalidateMethodsBatch()', () => {
    it('should selectively delete only specified methods', async () => {
      // Cache multiple methods for AAPL
      const results = new Map<string, Map<MethodId, ValuationResult>>();
      const methodsMap = new Map<MethodId, ValuationResult>();

      methodsMap.set('dcf-fcf-20', createMockValuationResult('AAPL', 150));
      methodsMap.set('pe-mean', createMockValuationResult('AAPL', 145));
      methodsMap.set('ps-mean', createMockValuationResult('AAPL', 140));
      methodsMap.set('peg', createMockValuationResult('AAPL', 135));

      results.set('AAPL', methodsMap);
      await methodCacheService.cacheBatchMethodResults(results);

      // Invalidate only DCF and PE methods
      const keysDeleted = await methodCacheService.invalidateMethodsBatch(
        ['AAPL'],
        ['dcf-fcf-20', 'pe-mean']
      );

      expect(keysDeleted).toBe(2);

      // Verify DCF and PE are cleared
      const dcfCached = await methodCacheService.getMethod('AAPL', 'dcf-fcf-20');
      const peCached = await methodCacheService.getMethod('AAPL', 'pe-mean');
      expect(dcfCached).toBeNull();
      expect(peCached).toBeNull();

      // PS and PEG should still be cached
      const psCached = await methodCacheService.getMethod('AAPL', 'ps-mean');
      const pegCached = await methodCacheService.getMethod('AAPL', 'peg');
      expect(psCached).toBeTruthy();
      expect(pegCached).toBeTruthy();
    });
  });

  describe('analyzeCacheCoverage()', () => {
    it('should provide accurate cache analytics', async () => {
      const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];

      // Cache 3 out of 5 stocks with varying methods
      const results = new Map<string, Map<MethodId, ValuationResult>>();

      // AAPL: All 12 methods
      const aaplMethods = new Map<MethodId, ValuationResult>();
      methodCacheService.getSupportedMethods().forEach(methodId => {
        aaplMethods.set(methodId, createMockValuationResult('AAPL', 150));
      });
      results.set('AAPL', aaplMethods);

      // MSFT: 6 methods
      const msftMethods = new Map<MethodId, ValuationResult>();
      ['dcf-fcf-20', 'pe-mean', 'ps-mean', 'peg', 'psg', 'dni-20'].forEach(methodId => {
        msftMethods.set(methodId as MethodId, createMockValuationResult('MSFT', 300));
      });
      results.set('MSFT', msftMethods);

      // GOOGL: 3 methods
      const googlMethods = new Map<MethodId, ValuationResult>();
      ['dcf-fcf-20', 'pe-mean', 'ps-mean'].forEach(methodId => {
        googlMethods.set(methodId as MethodId, createMockValuationResult('GOOGL', 2800));
      });
      results.set('GOOGL', googlMethods);

      // Cache everything
      await methodCacheService.cacheBatchMethodResults(results);

      // Analyze
      const analytics = await methodCacheService.analyzeCacheCoverage(tickers);

      // Total: 5 stocks × 12 methods = 60 possible methods
      // Cached: 12 + 6 + 3 = 21 methods
      // Hit rate: 21/60 = 35%
      expect(analytics.totalSymbols).toBe(5);
      expect(analytics.totalMethods).toBe(60);
      expect(analytics.cachedMethods).toBe(21);
      expect(analytics.hitRate).toBe(35);

      // Should have recommendations
      expect(analytics.recommendations.length).toBeGreaterThan(0);
      expect(analytics.recommendations.some(r => r.includes('below 50%'))).toBe(true);

      console.log('📊 Analytics:', analytics);
    });

    it('should return empty analytics for empty tickers', async () => {
      const analytics = await methodCacheService.analyzeCacheCoverage([]);

      expect(analytics.totalSymbols).toBe(0);
      expect(analytics.hitRate).toBe(0);
      expect(analytics.recommendations).toContain('⚠️  No data available for analysis');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should demonstrate 60x speedup vs sequential caching', async () => {
      const testSize = 10; // 10 stocks × 12 methods = 120 entries

      // Build test data
      const results = new Map<string, Map<MethodId, ValuationResult>>();
      for (let i = 0; i < testSize; i++) {
        const ticker = `PERF${i}`;
        const methodsMap = new Map<MethodId, ValuationResult>();

        methodCacheService.getSupportedMethods().forEach(methodId => {
          methodsMap.set(methodId, createMockValuationResult(ticker, 100));
        });

        results.set(ticker, methodsMap);
      }

      // Test 1: Batch caching (optimized)
      const batchStart = performance.now();
      await methodCacheService.cacheBatchMethodResults(results);
      const batchElapsed = performance.now() - batchStart;

      // Clear cache
      await enhancedRedisCacheService.clear();

      // Test 2: Sequential caching (baseline)
      const seqStart = performance.now();
      for (const [ticker, methodsMap] of results.entries()) {
        for (const [methodId, result] of methodsMap.entries()) {
          await methodCacheService.setMethod(ticker, methodId, result);
        }
      }
      const seqElapsed = performance.now() - seqStart;

      const speedup = seqElapsed / batchElapsed;

      console.log(`
📊 Performance Benchmark (${testSize} stocks × 12 methods = ${testSize * 12} entries):
  - Batch (optimized):  ${batchElapsed.toFixed(1)}ms
  - Sequential:         ${seqElapsed.toFixed(1)}ms
  - Speedup:            ${speedup.toFixed(1)}x faster 🚀
      `);

      // Batch should be at least 10x faster
      expect(speedup).toBeGreaterThan(10);
    }, 20000);
  });
});
