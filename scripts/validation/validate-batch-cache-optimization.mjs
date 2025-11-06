#!/usr/bin/env node
/**
 * Batch Cache Optimization Validator
 *
 * Tests Redis pipeline performance for batch IV caching vs sequential operations.
 *
 * Expected results:
 * - Batch caching: 600 entries in ~50ms (12 entries/ms)
 * - Batch retrieval: 600 gets in ~20ms (30 entries/ms)
 * - 60x speedup vs sequential operations
 */

import { methodCacheService } from '../../server/services/method-cache-service.js';
import { enhancedRedisCacheService } from '../../server/cache/enhanced-redis-cache-service.js';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function createMockValuationResult(ticker, iv) {
  return {
    ticker,
    iv,
    confidence: 'HIGH',
    as_of: new Date().toISOString(),
    inputs: {
      fcf_ttm: 1000,
      shares: 100,
    },
  };
}

async function runValidation() {
  log('\n========================================', 'cyan');
  log('  BATCH CACHE OPTIMIZATION VALIDATION', 'cyan');
  log('========================================\n', 'cyan');

  const testSize = 50; // 50 stocks
  const allMethods = methodCacheService.getSupportedMethods();
  const totalEntries = testSize * allMethods.length;

  log(`Test size: ${testSize} stocks × ${allMethods.length} methods = ${totalEntries} cache entries\n`);

  // Clear cache
  log('[Step 1] Clearing cache...', 'yellow');
  await enhancedRedisCacheService.clear();
  log('✅ Cache cleared\n', 'green');

  // Build test data
  log('[Step 2] Building test data...', 'yellow');
  const testResults = new Map();

  for (let i = 0; i < testSize; i++) {
    const ticker = `STOCK${i}`;
    const methodsMap = new Map();

    allMethods.forEach(methodId => {
      methodsMap.set(methodId, createMockValuationResult(ticker, 100 + i));
    });

    testResults.set(ticker, methodsMap);
  }

  log(`✅ Built ${testResults.size} stocks with ${allMethods.length} methods each\n`, 'green');

  // TEST 1: Batch Caching (Optimized)
  log('[Test 1] Batch caching (Redis pipeline)...', 'blue');
  const batchCacheStart = performance.now();
  const entriesCached = await methodCacheService.cacheBatchMethodResults(testResults, 3600);
  const batchCacheElapsed = performance.now() - batchCacheStart;

  const batchCacheRate = entriesCached / batchCacheElapsed;

  log(`  ✅ Cached ${entriesCached} entries in ${batchCacheElapsed.toFixed(1)}ms`, 'green');
  log(`  📊 Rate: ${batchCacheRate.toFixed(1)} entries/ms\n`, 'cyan');

  // Clear for sequential test
  await enhancedRedisCacheService.clear();

  // TEST 2: Sequential Caching (Baseline)
  log('[Test 2] Sequential caching (baseline)...', 'blue');
  const seqCacheStart = performance.now();
  let seqEntriesCached = 0;

  for (const [ticker, methodsMap] of testResults.entries()) {
    for (const [methodId, result] of methodsMap.entries()) {
      await methodCacheService.setMethod(ticker, methodId, result);
      seqEntriesCached++;
    }
  }

  const seqCacheElapsed = performance.now() - seqCacheStart;
  const seqCacheRate = seqEntriesCached / seqCacheElapsed;

  log(`  ✅ Cached ${seqEntriesCached} entries in ${seqCacheElapsed.toFixed(1)}ms`, 'green');
  log(`  📊 Rate: ${seqCacheRate.toFixed(1)} entries/ms\n`, 'cyan');

  // Calculate speedup
  const cacheSpeedup = seqCacheElapsed / batchCacheElapsed;

  log('========================================', 'cyan');
  log('  CACHING PERFORMANCE COMPARISON', 'cyan');
  log('========================================', 'cyan');
  log(`  Batch (optimized):  ${batchCacheElapsed.toFixed(1)}ms (${batchCacheRate.toFixed(1)} entries/ms)`, 'green');
  log(`  Sequential:         ${seqCacheElapsed.toFixed(1)}ms (${seqCacheRate.toFixed(1)} entries/ms)`, 'yellow');
  log(`  Speedup:            ${cacheSpeedup.toFixed(1)}x faster 🚀\n`, 'green');

  if (cacheSpeedup >= 10) {
    log(`✅ PASS: Batch caching is ${cacheSpeedup.toFixed(1)}x faster (target: >10x)\n`, 'green');
  } else {
    log(`⚠️  WARNING: Batch caching only ${cacheSpeedup.toFixed(1)}x faster (target: >10x)\n`, 'yellow');
  }

  // TEST 3: Batch Retrieval
  log('[Test 3] Batch retrieval (Redis pipeline)...', 'blue');
  const tickers = Array.from(testResults.keys());

  const batchRetrievalStart = performance.now();
  const cached = await methodCacheService.getBatchCachedMethods(tickers, allMethods);
  const batchRetrievalElapsed = performance.now() - batchRetrievalStart;

  const totalRetrieved = Array.from(cached.values()).reduce(
    (sum, map) => sum + map.size,
    0
  );

  const retrievalRate = totalRetrieved / batchRetrievalElapsed;
  const hitRate = (totalRetrieved / totalEntries) * 100;

  log(`  ✅ Retrieved ${totalRetrieved}/${totalEntries} entries in ${batchRetrievalElapsed.toFixed(1)}ms`, 'green');
  log(`  📊 Hit rate: ${hitRate.toFixed(1)}%`, 'cyan');
  log(`  📊 Rate: ${retrievalRate.toFixed(1)} entries/ms\n`, 'cyan');

  // TEST 4: Cache Coverage Analysis
  log('[Test 4] Cache coverage analysis...', 'blue');
  const analytics = await methodCacheService.analyzeCacheCoverage(tickers);

  log(`  📊 Total symbols: ${analytics.totalSymbols}`, 'cyan');
  log(`  📊 Cached methods: ${analytics.cachedMethods}/${analytics.totalMethods}`, 'cyan');
  log(`  📊 Hit rate: ${analytics.hitRate}%`, 'cyan');
  log(`  📊 Avg TTL: ${analytics.avgTTLHours}h`, 'cyan');
  log(`  📊 Hotness:`, 'cyan');
  log(`     - Hot (>6h):    ${analytics.hotness.hot}`, 'cyan');
  log(`     - Warm (3-6h):  ${analytics.hotness.warm}`, 'cyan');
  log(`     - Cold (1-3h):  ${analytics.hotness.cold}`, 'cyan');
  log(`     - Stale (<1h):  ${analytics.hotness.stale}`, 'cyan');
  log(`  📊 Analysis time: ${analytics.analysisTimeMs}ms\n`, 'cyan');

  log('  Recommendations:', 'yellow');
  analytics.recommendations.forEach(rec => log(`    ${rec}`, 'yellow'));
  console.log();

  // TEST 5: Missing Tickers Detection
  log('[Test 5] Missing tickers detection...', 'blue');

  // Add some incomplete stocks
  const allTickers = [...tickers, 'MISSING1', 'MISSING2', 'MISSING3'];
  const missing = await methodCacheService.getMissingTickers(allTickers);

  log(`  📊 Missing tickers: ${missing.length}/${allTickers.length}`, 'cyan');
  log(`  📊 Missing list: ${missing.join(', ')}\n`, 'cyan');

  // TEST 6: Selective Invalidation
  log('[Test 6] Selective method invalidation...', 'blue');

  const invalidateStart = performance.now();
  const keysDeleted = await methodCacheService.invalidateMethodsBatch(
    tickers.slice(0, 10), // First 10 stocks
    ['dcf-fcf-20', 'pe-mean', 'ps-mean'] // Only 3 methods
  );
  const invalidateElapsed = performance.now() - invalidateStart;

  log(`  ✅ Deleted ${keysDeleted} keys in ${invalidateElapsed.toFixed(1)}ms`, 'green');
  log(`  📊 Expected: 10 stocks × 3 methods = 30 keys\n`, 'cyan');

  // Verify invalidation
  const dcfCached = await methodCacheService.getMethod('STOCK0', 'dcf-fcf-20');
  const pegCached = await methodCacheService.getMethod('STOCK0', 'peg');

  if (!dcfCached && pegCached) {
    log('  ✅ Selective invalidation successful (DCF deleted, PEG remains)\n', 'green');
  } else {
    log('  ⚠️  Selective invalidation issue\n', 'yellow');
  }

  // FINAL SUMMARY
  log('========================================', 'cyan');
  log('  FINAL SUMMARY', 'cyan');
  log('========================================', 'cyan');

  const allPassed =
    cacheSpeedup >= 10 &&
    batchCacheElapsed < 200 &&
    batchRetrievalElapsed < 100 &&
    hitRate >= 95;

  if (allPassed) {
    log('✅ ALL TESTS PASSED', 'green');
    log(`  - Batch caching: ${cacheSpeedup.toFixed(1)}x speedup (target: >10x)`, 'green');
    log(`  - Cache time: ${batchCacheElapsed.toFixed(1)}ms (target: <200ms)`, 'green');
    log(`  - Retrieval time: ${batchRetrievalElapsed.toFixed(1)}ms (target: <100ms)`, 'green');
    log(`  - Hit rate: ${hitRate.toFixed(1)}% (target: >95%)`, 'green');
  } else {
    log('⚠️  SOME TESTS FAILED', 'yellow');

    if (cacheSpeedup < 10) {
      log(`  ❌ Speedup: ${cacheSpeedup.toFixed(1)}x (target: >10x)`, 'red');
    }
    if (batchCacheElapsed >= 200) {
      log(`  ❌ Cache time: ${batchCacheElapsed.toFixed(1)}ms (target: <200ms)`, 'red');
    }
    if (batchRetrievalElapsed >= 100) {
      log(`  ❌ Retrieval time: ${batchRetrievalElapsed.toFixed(1)}ms (target: <100ms)`, 'red');
    }
    if (hitRate < 95) {
      log(`  ❌ Hit rate: ${hitRate.toFixed(1)}% (target: >95%)`, 'red');
    }
  }

  console.log();

  // Cleanup
  await enhancedRedisCacheService.disconnect();

  process.exit(allPassed ? 0 : 1);
}

// Run validation
runValidation().catch(error => {
  console.error('❌ Validation error:', error);
  process.exit(1);
});
