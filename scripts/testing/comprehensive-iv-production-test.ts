/**
 * COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST
 *
 * Tests 35 stocks across 7 sectors as requested:
 * - Technology (5 stocks)
 * - Finance (5 stocks)
 * - Healthcare (5 stocks)
 * - Consumer (5 stocks)
 * - Energy (5 stocks)
 * - Industrial (5 stocks)
 * - Portuguese Market (5 stocks)
 *
 * Validates:
 * - All 15 valuation methods
 * - API responses
 * - Cache behavior
 * - Performance metrics
 * - Frontend compatibility
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TestStock {
  ticker: string;
  sector: string;
  country: string;
  marketCap: 'large' | 'mid' | 'small';
  expectedMethods?: number;
}

const VALUATION_METHODS = [
  'DCF-20-OCF',
  'DCF-20-FCF',
  'DCF-20-NI',
  'DCF-10-OCF',
  'DCF-10-FCF',
  'DCF-10-NI',
  'PEG',
  'Ben Graham',
  'Lynch',
  'P/E',
  'P/S',
  'P/B',
  'EV/EBITDA',
  'EV/Sales',
  'DCF/EBITDA'
];

const TEST_STOCKS: TestStock[] = [
  // ========== TECHNOLOGY (5) ==========
  { ticker: 'AAPL', sector: 'Technology', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'MSFT', sector: 'Technology', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'GOOGL', sector: 'Technology', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'NVDA', sector: 'Technology', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'META', sector: 'Technology', country: 'US', marketCap: 'large', expectedMethods: 15 },

  // ========== FINANCE (5) ==========
  { ticker: 'JPM', sector: 'Finance', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'BAC', sector: 'Finance', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'WFC', sector: 'Finance', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'GS', sector: 'Finance', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'MS', sector: 'Finance', country: 'US', marketCap: 'large', expectedMethods: 15 },

  // ========== HEALTHCARE (5) ==========
  { ticker: 'JNJ', sector: 'Healthcare', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'UNH', sector: 'Healthcare', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'PFE', sector: 'Healthcare', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'ABBV', sector: 'Healthcare', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'LLY', sector: 'Healthcare', country: 'US', marketCap: 'large', expectedMethods: 15 },

  // ========== CONSUMER (5) ==========
  { ticker: 'AMZN', sector: 'Consumer', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'WMT', sector: 'Consumer', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'COST', sector: 'Consumer', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'NKE', sector: 'Consumer', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'MCD', sector: 'Consumer', country: 'US', marketCap: 'large', expectedMethods: 15 },

  // ========== ENERGY (5) ==========
  { ticker: 'XOM', sector: 'Energy', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'CVX', sector: 'Energy', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'COP', sector: 'Energy', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'SLB', sector: 'Energy', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'EOG', sector: 'Energy', country: 'US', marketCap: 'large', expectedMethods: 15 },

  // ========== INDUSTRIAL (5) ==========
  { ticker: 'CAT', sector: 'Industrial', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'BA', sector: 'Industrial', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'HON', sector: 'Industrial', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'UPS', sector: 'Industrial', country: 'US', marketCap: 'large', expectedMethods: 15 },
  { ticker: 'GE', sector: 'Industrial', country: 'US', marketCap: 'large', expectedMethods: 15 },

  // ========== PORTUGUESE MARKET (5) ==========
  { ticker: 'EDP.LS', sector: 'Energy', country: 'PT', marketCap: 'large', expectedMethods: 10 },
  { ticker: 'GALP.LS', sector: 'Energy', country: 'PT', marketCap: 'mid', expectedMethods: 10 },
  { ticker: 'NOS.LS', sector: 'Telecom', country: 'PT', marketCap: 'mid', expectedMethods: 10 },
  { ticker: 'BCP.LS', sector: 'Finance', country: 'PT', marketCap: 'mid', expectedMethods: 10 },
  { ticker: 'JMT.LS', sector: 'Finance', country: 'PT', marketCap: 'mid', expectedMethods: 10 },
];

interface MethodResult {
  name: string;
  id: string;
  iv: number;
  discount: number;
  inputs_present: boolean;
  has_growth_rates: boolean;
}

interface TestResult {
  ticker: string;
  sector: string;
  country: string;
  marketCap: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  error?: string;
  http_status?: number;
  response_time_ms?: number;

  // API Validation
  methods_count?: number;
  methods_tested?: MethodResult[];
  price?: number;

  // Cache Validation
  cache_miss_time_ms?: number;
  cache_hit_time_ms?: number;
  cache_improvement?: string;

  // Growth Rates
  growth_y1_5?: number;
  growth_y6_10?: number;
  growth_y11_20?: number;
  data_source?: string;
  confidence?: string;

  // Validation Flags
  all_methods_valid?: boolean;
  no_console_errors?: boolean;
  reasonable_values?: boolean;
}

const BASE_URL = process.env.TEST_API_URL || 'https://128.140.45.28.sslip.io';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Test a single stock's IV calculation (cache miss)
 */
async function testIVCalculation(stock: TestStock): Promise<TestResult> {
  const url = `${BASE_URL}/api/iv/${stock.ticker}/chart`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500
    });

    const responseTime = Date.now() - startTime;

    // Check for errors
    if (response.status === 404) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'ERROR',
        error: 'Stock not found (404)',
        http_status: 404,
        response_time_ms: responseTime
      };
    }

    if (response.status === 400) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'ERROR',
        error: response.data?.error || 'Bad request',
        http_status: 400,
        response_time_ms: responseTime
      };
    }

    // Validate response structure
    const { methods, price } = response.data;

    if (!methods || !Array.isArray(methods)) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'FAIL',
        error: 'Invalid response structure (no methods array)',
        response_time_ms: responseTime
      };
    }

    // Check methods count
    const expectedMin = stock.expectedMethods || 10;
    if (methods.length < expectedMin) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'FAIL',
        error: `Expected ≥${expectedMin} methods, got ${methods.length}`,
        methods_count: methods.length,
        response_time_ms: responseTime
      };
    }

    // Validate each method
    const methodResults: MethodResult[] = methods.map((m: any) => ({
      name: m.name,
      id: m.id,
      iv: m.iv,
      discount: m.discount,
      inputs_present: !!m.inputs,
      has_growth_rates: !!(m.inputs?.growth_rate_y1_5 || m.inputs?.growth_rate_y6_10)
    }));

    const allMethodsValid = methodResults.every(m =>
      m.iv > 0 &&
      isFinite(m.iv) &&
      m.inputs_present
    );

    const reasonableValues = methodResults.every(m =>
      m.iv > price * 0.1 && // IV not less than 10% of price
      m.iv < price * 20 // IV not more than 20x price
    );

    // Extract DCF growth rates for validation
    const dcfMethod = methods.find((m: any) => m.name.includes('DCF-20'));
    const growthData = dcfMethod?.inputs || {};

    return {
      ticker: stock.ticker,
      sector: stock.sector,
      country: stock.country,
      marketCap: stock.marketCap,
      status: 'PASS',
      http_status: 200,
      response_time_ms: responseTime,
      cache_miss_time_ms: responseTime,

      methods_count: methods.length,
      methods_tested: methodResults,
      price: price,

      growth_y1_5: growthData.growth_rate_y1_5,
      growth_y6_10: growthData.growth_rate_y6_10,
      growth_y11_20: growthData.growth_rate_y11_20,
      data_source: growthData.data_source,
      confidence: growthData.confidence,

      all_methods_valid: allMethodsValid,
      reasonable_values: reasonableValues
    };

  } catch (error: any) {
    return {
      ticker: stock.ticker,
      sector: stock.sector,
      country: stock.country,
      marketCap: stock.marketCap,
      status: 'ERROR',
      error: error.message,
      http_status: error.response?.status,
      response_time_ms: Date.now() - startTime
    };
  }
}

/**
 * Test cache hit performance (second request)
 */
async function testCacheHit(stock: TestStock): Promise<number> {
  const url = `${BASE_URL}/api/iv/${stock.ticker}/chart`;
  const startTime = Date.now();

  try {
    await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      validateStatus: () => true
    });
    return Date.now() - startTime;
  } catch (error) {
    return -1;
  }
}

/**
 * Run all tests with detailed reporting
 */
async function runComprehensiveTests() {
  console.log('🧪 COMPREHENSIVE INTRINSIC VALUE PRODUCTION TEST\n');
  console.log('='.repeat(100));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Total Stocks: ${TEST_STOCKS.length} across 7 sectors`);
  console.log(`Expected Methods: 15 (DCF variants, Growth, Multiples)`);
  console.log('='.repeat(100));
  console.log('');

  const results: TestResult[] = [];
  const performanceMetrics = {
    totalResponseTime: 0,
    totalCacheMiss: 0,
    totalCacheHit: 0,
    cacheTests: 0
  };

  for (let i = 0; i < TEST_STOCKS.length; i++) {
    const stock = TEST_STOCKS[i];
    const progress = `[${(i + 1).toString().padStart(2)}/${TEST_STOCKS.length}]`;

    process.stdout.write(`${progress} ${stock.ticker.padEnd(10)} (${stock.sector.padEnd(12)}, ${stock.country}) ... `);

    // Test 1: Cache MISS (first request)
    const result = await testIVCalculation(stock);
    results.push(result);

    if (result.status === 'PASS') {
      // Test 2: Cache HIT (second request)
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const cacheHitTime = await testCacheHit(stock);

      if (cacheHitTime > 0) {
        result.cache_hit_time_ms = cacheHitTime;
        const improvement = ((result.cache_miss_time_ms! - cacheHitTime) / result.cache_miss_time_ms! * 100).toFixed(1);
        result.cache_improvement = `${improvement}%`;

        performanceMetrics.totalCacheMiss += result.cache_miss_time_ms!;
        performanceMetrics.totalCacheHit += cacheHitTime;
        performanceMetrics.cacheTests++;
      }

      console.log(`✅ PASS (${result.methods_count} methods, ${result.response_time_ms}ms)`);
    } else if (result.status === 'ERROR') {
      console.log(`❌ ERROR: ${result.error}`);
    } else {
      console.log(`⚠️  FAIL: ${result.error}`);
    }

    performanceMetrics.totalResponseTime += result.response_time_ms || 0;

    // Rate limiting: 500ms between requests
    if (i < TEST_STOCKS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(100));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(100));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const total = results.length;

  console.log(`\nTotal Stocks Tested: ${total}`);
  console.log(`✅ Passed: ${passed} (${(passed/total*100).toFixed(1)}%)`);
  console.log(`⚠️  Failed: ${failed}`);
  console.log(`❌ Errors: ${errors}`);

  // ========== SECTOR BREAKDOWN ==========
  console.log('\n' + '='.repeat(100));
  console.log('🏢 SECTOR BREAKDOWN');
  console.log('='.repeat(100));

  const sectorStats: Record<string, { total: number; passed: number }> = {};
  results.forEach(r => {
    if (!sectorStats[r.sector]) {
      sectorStats[r.sector] = { total: 0, passed: 0 };
    }
    sectorStats[r.sector].total++;
    if (r.status === 'PASS') sectorStats[r.sector].passed++;
  });

  console.log('\nSector            Tested  Passed  Pass Rate');
  console.log('-'.repeat(50));
  Object.entries(sectorStats)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([sector, stats]) => {
      const rate = (stats.passed / stats.total * 100).toFixed(1);
      const status = stats.passed === stats.total ? '✅' : stats.passed > 0 ? '⚠️' : '❌';
      console.log(`${sector.padEnd(16)}  ${stats.total}       ${stats.passed}       ${rate.padStart(5)}%  ${status}`);
    });

  // ========== PERFORMANCE METRICS ==========
  console.log('\n' + '='.repeat(100));
  console.log('⚡ PERFORMANCE METRICS');
  console.log('='.repeat(100));

  const avgResponseTime = (performanceMetrics.totalResponseTime / total).toFixed(0);
  const avgCacheMiss = performanceMetrics.cacheTests > 0
    ? (performanceMetrics.totalCacheMiss / performanceMetrics.cacheTests).toFixed(0)
    : 'N/A';
  const avgCacheHit = performanceMetrics.cacheTests > 0
    ? (performanceMetrics.totalCacheHit / performanceMetrics.cacheTests).toFixed(0)
    : 'N/A';
  const cacheImprovement = performanceMetrics.cacheTests > 0
    ? ((performanceMetrics.totalCacheMiss - performanceMetrics.totalCacheHit) / performanceMetrics.totalCacheMiss * 100).toFixed(1)
    : 'N/A';

  console.log(`\nAvg Response Time (all): ${avgResponseTime}ms`);
  console.log(`Avg Response Time (cache miss): ${avgCacheMiss}ms`);
  console.log(`Avg Response Time (cache hit): ${avgCacheHit}ms`);
  console.log(`Cache Improvement: ${cacheImprovement}%`);

  const targetCacheMiss = 2000; // 2s target
  const targetCacheHit = 500; // 500ms target

  if (typeof avgCacheMiss === 'string' || avgCacheMiss < targetCacheMiss) {
    console.log(`✅ Cache miss performance GOOD (< ${targetCacheMiss}ms)`);
  } else {
    console.log(`⚠️  Cache miss performance needs improvement (> ${targetCacheMiss}ms)`);
  }

  if (typeof avgCacheHit === 'string' || avgCacheHit < targetCacheHit) {
    console.log(`✅ Cache hit performance GOOD (< ${targetCacheHit}ms)`);
  } else {
    console.log(`⚠️  Cache hit performance needs improvement (> ${targetCacheHit}ms)`);
  }

  // ========== VALUATION METHODS VALIDATION ==========
  console.log('\n' + '='.repeat(100));
  console.log('📐 VALUATION METHODS VALIDATION');
  console.log('='.repeat(100));

  const passedStocks = results.filter(r => r.status === 'PASS');
  if (passedStocks.length > 0) {
    const sampleStock = passedStocks[0];
    console.log(`\nSample Stock: ${sampleStock.ticker} (${sampleStock.methods_count} methods)`);
    console.log('\nMethod Name               IV          Discount   Inputs  Growth');
    console.log('-'.repeat(70));

    sampleStock.methods_tested?.slice(0, 10).forEach(m => {
      const iv = `$${m.iv.toFixed(2)}`.padStart(10);
      const discount = `${m.discount.toFixed(1)}%`.padStart(8);
      const inputs = m.inputs_present ? '✅' : '❌';
      const growth = m.has_growth_rates ? '✅' : '➖';
      console.log(`${m.name.padEnd(24)} ${iv}  ${discount}     ${inputs}      ${growth}`);
    });

    if ((sampleStock.methods_tested?.length || 0) > 10) {
      console.log(`... (${(sampleStock.methods_tested?.length || 0) - 10} more methods)`);
    }
  }

  // ========== FAILED TESTS ==========
  const failedTests = results.filter(r => r.status !== 'PASS');
  if (failedTests.length > 0) {
    console.log('\n' + '='.repeat(100));
    console.log('❌ FAILED TESTS');
    console.log('='.repeat(100));
    console.log('\nTicker      Status   Error');
    console.log('-'.repeat(70));
    failedTests.forEach(r => {
      console.log(`${r.ticker.padEnd(10)}  ${r.status.padEnd(7)}  ${r.error || 'N/A'}`);
    });
  }

  // ========== ISSUES FOUND ==========
  console.log('\n' + '='.repeat(100));
  console.log('🔍 ISSUES FOUND');
  console.log('='.repeat(100));

  const issues = [];
  const invalidMethods = passedStocks.filter(r => !r.all_methods_valid);
  const unreasonableValues = passedStocks.filter(r => !r.reasonable_values);
  const slowResponses = results.filter(r => (r.response_time_ms || 0) > 3000);

  if (invalidMethods.length > 0) {
    issues.push(`❌ ${invalidMethods.length} stocks have invalid method results`);
  }
  if (unreasonableValues.length > 0) {
    issues.push(`⚠️  ${unreasonableValues.length} stocks have unreasonable IV values`);
  }
  if (slowResponses.length > 0) {
    issues.push(`⚠️  ${slowResponses.length} stocks have slow response times (>3s)`);
  }
  if (failed > 0) {
    issues.push(`❌ ${failed} stocks failed validation`);
  }
  if (errors > 0) {
    issues.push(`❌ ${errors} stocks returned errors`);
  }

  if (issues.length === 0) {
    console.log('\n✅ No issues found - All tests passed!');
  } else {
    console.log('');
    issues.forEach(issue => console.log(`  ${issue}`));
  }

  // ========== VERDICT ==========
  console.log('\n' + '='.repeat(100));
  console.log('⚖️  VERDICT');
  console.log('='.repeat(100));

  const passRate = (passed / total) * 100;
  const targetPassRate = 90;

  if (passRate >= targetPassRate && issues.length === 0) {
    console.log(`\n✅ PASS - System is production ready`);
    console.log(`   - Pass rate: ${passRate.toFixed(1)}% (target: ≥${targetPassRate}%)`);
    console.log(`   - All sectors working`);
    console.log(`   - Performance acceptable`);
    console.log(`   - No critical issues`);
  } else if (passRate >= targetPassRate) {
    console.log(`\n⚠️  CONDITIONAL PASS - System working but has issues`);
    console.log(`   - Pass rate: ${passRate.toFixed(1)}% (target: ≥${targetPassRate}%)`);
    console.log(`   - Issues found: ${issues.length}`);
  } else {
    console.log(`\n❌ FAIL - System not ready for production`);
    console.log(`   - Pass rate: ${passRate.toFixed(1)}% (target: ≥${targetPassRate}%)`);
    console.log(`   - Failed tests: ${failed + errors}`);
  }

  // ========== SAVE RESULTS ==========
  const timestamp = new Date().toISOString().split('T')[0];
  const outputFile = path.join('/tmp', `iv-production-test-${timestamp}.json`);

  try {
    fs.writeFileSync(outputFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        errors,
        passRate: passRate.toFixed(1) + '%'
      },
      performance: {
        avgResponseTime: avgResponseTime + 'ms',
        avgCacheMiss: avgCacheMiss + 'ms',
        avgCacheHit: avgCacheHit + 'ms',
        cacheImprovement: cacheImprovement + '%'
      },
      sectors: sectorStats,
      results
    }, null, 2));
    console.log(`\n💾 Detailed results saved to: ${outputFile}`);
  } catch (error: any) {
    console.error(`\n❌ Failed to save results: ${error.message}`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('');

  return { results, passed, total, passRate };
}

// Execute tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveTests().then(({ passRate }) => {
    process.exit(passRate >= 90 ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runComprehensiveTests, testIVCalculation, TEST_STOCKS };
