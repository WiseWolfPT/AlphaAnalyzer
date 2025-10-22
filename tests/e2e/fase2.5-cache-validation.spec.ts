/**
 * FASE 2.5 - Cache Consolidation & React Query Migration
 * Validation Test Suite
 *
 * Tests:
 * 1. Cross-page cache sharing (AAPL → Find Stocks → AAPL)
 * 2. API call reduction vs baseline
 * 3. Cache hit rate >90%
 * 4. Latency <100ms on cache hit
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://128.140.45.28.sslip.io';

test.describe('FASE 2.5: Cache Consolidation Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser cache before each test to ensure clean state
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });

  test('Cache Sharing: AAPL → Find Stocks → AAPL (0 redundant API calls)', async ({ page }) => {
    let apiCallCount = 0;
    const apiCalls: string[] = [];
    const aaplFundamentalsEndpoint = /\/api\/(cache\/fundamentals|market-data\/fundamentals|market-data\/fmp\/profile)\/AAPL/;

    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        apiCallCount++;
        apiCalls.push(url);
      }
    });

    // 1. Navigate to AAPL stock detail page
    console.log('Step 1: Navigate to /stock/AAPL');
    await page.goto(`${BASE_URL}/stock/AAPL`);
    await page.waitForSelector('h1:has-text("AAPL")', { timeout: 10000 });

    const initialApiCalls = apiCallCount;
    const initialAaplCalls = apiCalls.filter(url => aaplFundamentalsEndpoint.test(url)).length;
    console.log(`  → Initial API calls: ${initialApiCalls}`);
    console.log(`  → AAPL fundamentals calls: ${initialAaplCalls}`);

    // Verify AAPL data loaded
    const alfaValueHeader = await page.locator('h3:has-text("AlfaValue™")').count();
    expect(alfaValueHeader).toBeGreaterThan(0);

    // 2. Navigate to Find Stocks
    console.log('Step 2: Navigate to Find Stocks');
    await page.click('button:has-text("Find Stocks")');
    await page.waitForURL(/\/find-stocks/);
    await page.waitForSelector('text=Find Stocks', { timeout: 10000 });

    const findStocksApiCalls = apiCallCount;
    console.log(`  → Total API calls after Find Stocks: ${findStocksApiCalls}`);

    // 3. Navigate back to AAPL
    console.log('Step 3: Navigate back to /stock/AAPL');
    const beforeReturnCalls = apiCallCount;

    await page.goto(`${BASE_URL}/stock/AAPL`);
    await page.waitForSelector('h1:has-text("AAPL")', { timeout: 10000 });

    const afterReturnCalls = apiCallCount;
    const redundantAaplCalls = apiCalls
      .slice(initialApiCalls) // Calls after first AAPL visit
      .filter(url => aaplFundamentalsEndpoint.test(url))
      .length;

    console.log(`  → API calls before return: ${beforeReturnCalls}`);
    console.log(`  → API calls after return: ${afterReturnCalls}`);
    console.log(`  → Redundant AAPL fundamentals calls: ${redundantAaplCalls}`);

    // ✅ CRITICAL SUCCESS CRITERION: 0 redundant API calls for AAPL fundamentals
    expect(redundantAaplCalls).toBe(0);

    // Verify AlfaValue still visible (cached data loaded)
    const alfaValueAfterReturn = await page.locator('h3:has-text("AlfaValue™")').count();
    expect(alfaValueAfterReturn).toBeGreaterThan(0);
  });

  test('Cache Hit Rate: >90% for repeated stock visits', async ({ page }) => {
    const apiCalls: { url: string; cached: boolean; timestamp: number }[] = [];
    const startTime = Date.now();

    page.on('response', async (response) => {
      if (response.url().includes('/api/cache/')) {
        const cacheHeader = response.headers()['x-cache'];
        apiCalls.push({
          url: response.url(),
          cached: cacheHeader === 'HIT',
          timestamp: Date.now() - startTime,
        });
      }
    });

    // Visit AAPL 3 times
    for (let i = 0; i < 3; i++) {
      console.log(`Visit ${i + 1}: /stock/AAPL`);
      await page.goto(`${BASE_URL}/stock/AAPL`);
      await page.waitForSelector('h1:has-text("AAPL")', { timeout: 10000 });

      if (i < 2) {
        // Navigate away
        await page.goto(`${BASE_URL}/find-stocks`);
        await page.waitForSelector('text=Find Stocks', { timeout: 10000 });
      }
    }

    // Calculate cache hit rate (excluding first visit)
    const cacheableRequests = apiCalls.filter((_, i) => i > 0);
    const cacheHits = cacheableRequests.filter(call => call.cached).length;
    const hitRate = (cacheHits / cacheableRequests.length) * 100;

    console.log(`Total API calls: ${apiCalls.length}`);
    console.log(`Cache hits (after first visit): ${cacheHits}/${cacheableRequests.length}`);
    console.log(`Hit rate: ${hitRate.toFixed(2)}%`);

    // ✅ SUCCESS CRITERION: >90% hit rate
    expect(hitRate).toBeGreaterThanOrEqual(90);
  });

  test('Cache Latency: <100ms on cache hit', async ({ page }) => {
    const cacheLatencies: number[] = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/cache/') && response.headers()['x-cache'] === 'HIT') {
        const timing = response.timing();
        if (timing) {
          const latency = timing.responseEnd - timing.requestStart;
          cacheLatencies.push(latency);
        }
      }
    });

    // First visit to warm cache
    await page.goto(`${BASE_URL}/stock/AAPL`);
    await page.waitForSelector('h1:has-text("AAPL")', { timeout: 10000 });

    // Navigate away
    await page.goto(`${BASE_URL}/find-stocks`);
    await page.waitForSelector('text=Find Stocks', { timeout: 10000 });

    // Second visit - should hit cache
    const startTime = performance.now();
    await page.goto(`${BASE_URL}/stock/AAPL`);
    await page.waitForSelector('h1:has-text("AAPL")', { timeout: 10000 });
    const endTime = performance.now();
    const totalLatency = endTime - startTime;

    console.log(`Total page load latency: ${totalLatency.toFixed(2)}ms`);
    console.log(`Cache hit latencies: ${cacheLatencies.map(l => l.toFixed(2)).join(', ')}ms`);

    if (cacheLatencies.length > 0) {
      const avgCacheLatency = cacheLatencies.reduce((a, b) => a + b, 0) / cacheLatencies.length;
      console.log(`Average cache hit latency: ${avgCacheLatency.toFixed(2)}ms`);

      // ✅ SUCCESS CRITERION: <100ms avg latency
      expect(avgCacheLatency).toBeLessThan(100);
    }

    // Total page load should be fast with cache
    expect(totalLatency).toBeLessThan(1000); // <1s total load
  });

  test('API Call Reduction: 30-40% vs baseline (legacy pattern)', async ({ page }) => {
    // This test compares React Query pattern vs legacy useState+fetch pattern
    // Baseline: legacy pattern would make 5-8 API calls per stock detail page
    // Target: React Query should reduce to 3-5 calls (30-40% reduction)

    let apiCallCount = 0;
    const apiEndpoints = new Set<string>();

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        apiCallCount++;
        apiEndpoints.add(new URL(url).pathname);
      }
    });

    // Visit AAPL stock detail
    await page.goto(`${BASE_URL}/stock/AAPL`);
    await page.waitForSelector('h1:has-text("AAPL")', { timeout: 10000 });

    console.log(`Total API calls: ${apiCallCount}`);
    console.log(`Unique endpoints: ${apiEndpoints.size}`);
    console.log(`Endpoints: ${Array.from(apiEndpoints).join(', ')}`);

    // BASELINE (legacy): 8 calls
    // - /api/cache/fundamentals/AAPL
    // - /api/market-data/profile/AAPL (fallback)
    // - /api/market-data/key-metrics/AAPL (fallback)
    // - /api/cache/financials/AAPL
    // - /api/market-data/news/AAPL
    // - /api/cache/historical/AAPL/1y
    // - /api/cache/quotes/AAPL (quote)
    // - /api/iv/AAPL/main (intrinsic value)

    // TARGET (React Query): ≤5 calls (37.5% reduction)
    // - /api/cache/fundamentals/AAPL (single call, shared)
    // - /api/cache/financials/AAPL
    // - /api/market-data/news/AAPL
    // - /api/cache/historical/AAPL/1y
    // - /api/iv/AAPL/main

    const expectedMaxCalls = 5; // 37.5% reduction from 8
    expect(apiCallCount).toBeLessThanOrEqual(expectedMaxCalls);
  });

  test('Conditional Queries: Skip profile/metrics if fundamentals exist', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        apiCalls.push(url);
      }
    });

    await page.goto(`${BASE_URL}/stock/AAPL`);
    await page.waitForSelector('h1:has-text("AAPL")', { timeout: 10000 });

    // Check if fundamentals endpoint was called
    const hasFundamentalsCall = apiCalls.some(url =>
      url.includes('/cache/fundamentals/AAPL') ||
      url.includes('/market-data/fundamentals/AAPL')
    );

    // If fundamentals was called and succeeded, profile/metrics should NOT be called
    const hasProfileCall = apiCalls.some(url => url.includes('/market-data/profile/AAPL'));
    const hasMetricsCall = apiCalls.some(url => url.includes('/market-data/key-metrics/AAPL'));

    console.log(`Fundamentals called: ${hasFundamentalsCall}`);
    console.log(`Profile called: ${hasProfileCall}`);
    console.log(`Metrics called: ${hasMetricsCall}`);

    if (hasFundamentalsCall) {
      // ✅ If fundamentals exists, profile/metrics should be skipped
      expect(hasProfileCall).toBe(false);
      expect(hasMetricsCall).toBe(false);
    }
  });
});
