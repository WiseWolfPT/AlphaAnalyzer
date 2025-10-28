/**
 * ONDA 4.2: Test 20 Diverse Stocks Across 5 Sectors
 *
 * Validates that Intrinsic Value calculations work correctly for:
 * - 5 sectors (Technology, Financial, Healthcare, Consumer, Energy/Materials)
 * - 4 stocks per sector (80 total tests)
 * - Mix of large/mid/small cap
 * - 2 Portuguese stocks (Alfalyzer focus)
 *
 * SUCCESS CRITERIA:
 * - ✅ ≥18/20 stocks return valid IVs (90% success rate)
 * - ✅ Growth rates ≠ 0% (P0 bug fix verification)
 * - ✅ ≥10 valuation methods per stock
 * - ✅ Portuguese stocks (.LS suffix) working
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TestStock {
  ticker: string;
  sector: string;
  country: string;
  marketCap: 'large' | 'mid' | 'small';
  expectedGrowthY1_5?: number; // Known from GROWTH_RATE_DISCOVERY_2025-10-23.md
}

const TEST_STOCKS: TestStock[] = [
  // ========== TECHNOLOGY (4) ==========
  {
    ticker: 'AAPL',
    sector: 'Technology',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.1007 // 10.07% from discovery doc
  },
  {
    ticker: 'MSFT',
    sector: 'Technology',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.1673 // 16.73% from discovery doc
  },
  {
    ticker: 'NVDA',
    sector: 'Technology',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.2386 // 23.86% from discovery doc
  },
  {
    ticker: 'ASML',
    sector: 'Technology',
    country: 'NL',
    marketCap: 'large' // European semiconductor leader
  },

  // ========== FINANCIAL SERVICES (4) ==========
  {
    ticker: 'JPM',
    sector: 'Financial Services',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.0779 // 7.79% from discovery doc
  },
  {
    ticker: 'BAC',
    sector: 'Financial Services',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.1566 // 15.66% from discovery doc
  },
  {
    ticker: 'V',
    sector: 'Financial Services',
    country: 'US',
    marketCap: 'large' // Payments network
  },
  {
    ticker: 'BCP.LS',
    sector: 'Financial Services',
    country: 'PT',
    marketCap: 'mid' // 🇵🇹 Portuguese bank (Millennium BCP)
  },

  // ========== HEALTHCARE (4) ==========
  {
    ticker: 'JNJ',
    sector: 'Healthcare',
    country: 'US',
    marketCap: 'large' // Pharma + Consumer Health
  },
  {
    ticker: 'UNH',
    sector: 'Healthcare',
    country: 'US',
    marketCap: 'large' // Health insurance
  },
  {
    ticker: 'PFE',
    sector: 'Healthcare',
    country: 'US',
    marketCap: 'large' // Pharma (Pfizer)
  },
  {
    ticker: 'ROCHE.SW',
    sector: 'Healthcare',
    country: 'CH',
    marketCap: 'large' // Swiss pharma
  },

  // ========== CONSUMER (4) - Mix Defensive + Cyclical ==========
  {
    ticker: 'WMT',
    sector: 'Consumer Defensive',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.0789 // 7.89% from discovery doc
  },
  {
    ticker: 'PG',
    sector: 'Consumer Defensive',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.0345 // 3.45% from discovery doc (reversion case)
  },
  {
    ticker: 'TSLA',
    sector: 'Consumer Cyclical',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.2533 // 25.33% from discovery doc
  },
  {
    ticker: 'NKE',
    sector: 'Consumer Cyclical',
    country: 'US',
    marketCap: 'large' // Apparel/footwear
  },

  // ========== ENERGY / MATERIALS (4) - Cyclical ==========
  {
    ticker: 'XOM',
    sector: 'Energy',
    country: 'US',
    marketCap: 'large',
    expectedGrowthY1_5: 0.0808 // 8.08% from discovery doc (upward reversion Y6-10)
  },
  {
    ticker: 'CVX',
    sector: 'Energy',
    country: 'US',
    marketCap: 'large' // Chevron
  },
  {
    ticker: 'RIO',
    sector: 'Basic Materials',
    country: 'UK',
    marketCap: 'large' // Rio Tinto (mining)
  },
  {
    ticker: 'GALP.LS',
    sector: 'Energy',
    country: 'PT',
    marketCap: 'mid' // 🇵🇹 Portuguese energy (Galp Energia)
  },
];

interface TestResult {
  ticker: string;
  sector: string;
  country: string;
  marketCap: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  error?: string;
  http_status?: number;
  methods_count?: number;
  growth_y1_5?: number;
  growth_y6_10?: number;
  growth_y11_20?: number;
  data_source?: string;
  confidence?: string;
  sample_iv?: number;
  current_price?: number;
  expected_growth?: number;
  growth_variance?: number;
  note?: string;
}

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Test a single stock's IV calculation
 */
async function testIVCalculation(stock: TestStock): Promise<TestResult> {
  const url = `${BASE_URL}/api/iv/${stock.ticker}/chart`;

  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500 // Don't throw on 4xx
    });

    // Check for 404 (stock not found)
    if (response.status === 404) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'ERROR',
        error: 'Stock not found (404)',
        http_status: 404
      };
    }

    // Check for 400 (ETF or invalid)
    if (response.status === 400) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'ERROR',
        error: response.data?.error || 'Bad request',
        http_status: 400
      };
    }

    // Validate response structure
    const methods = response.data.methods;

    if (!methods || methods.length < 10) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'FAIL',
        error: `Expected ≥10 methods, got ${methods?.length || 0}`
      };
    }

    // Check for DCF-20 method with growth rates (P0 bug verification)
    const dcf20 = methods.find((m: any) =>
      m.name.includes('DCF-20') || m.name.includes('DCF Terminal')
    );

    if (!dcf20 || !dcf20.inputs) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'FAIL',
        error: 'No DCF-20 method found with inputs'
      };
    }

    const {
      growth_rate_y1_5,
      growth_rate_y6_10,
      growth_rate_y11_20,
      data_source,
      confidence
    } = dcf20.inputs;

    // CRITICAL: Validate growth rates are NOT zero (P0 bug fix verification)
    if (growth_rate_y1_5 === 0 && growth_rate_y6_10 === 0) {
      return {
        ticker: stock.ticker,
        sector: stock.sector,
        country: stock.country,
        marketCap: stock.marketCap,
        status: 'FAIL',
        error: '❌ P0 BUG NOT FIXED: Growth rates still 0%'
      };
    }

    // Check expected growth (if provided from discovery doc)
    let growthVariance: number | undefined;
    if (stock.expectedGrowthY1_5 !== undefined) {
      growthVariance = Math.abs(growth_rate_y1_5 - stock.expectedGrowthY1_5);
      if (growthVariance > 0.05) { // 5% tolerance
        console.warn(`  ⚠️ ${stock.ticker}: Y1-5 growth ${(growth_rate_y1_5 * 100).toFixed(2)}% differs from expected ${(stock.expectedGrowthY1_5 * 100).toFixed(2)}%`);
      }
    }

    return {
      ticker: stock.ticker,
      sector: stock.sector,
      country: stock.country,
      marketCap: stock.marketCap,
      status: 'PASS',
      methods_count: methods.length,
      growth_y1_5: growth_rate_y1_5,
      growth_y6_10: growth_rate_y6_10,
      growth_y11_20: growth_rate_y11_20,
      data_source: data_source || 'unknown',
      confidence: confidence || 'unknown',
      sample_iv: dcf20.iv,
      current_price: response.data.price,
      expected_growth: stock.expectedGrowthY1_5,
      growth_variance: growthVariance
    };

  } catch (error: any) {
    return {
      ticker: stock.ticker,
      sector: stock.sector,
      country: stock.country,
      marketCap: stock.marketCap,
      status: 'ERROR',
      error: error.message,
      http_status: error.response?.status
    };
  }
}

/**
 * Run all tests sequentially to avoid rate limiting
 */
async function runTests() {
  console.log('🧪 ONDA 4.2: Testing IV Calculations for 20 Diverse Stocks\n');
  console.log('='.repeat(80));
  console.log(`Target API: ${BASE_URL}`);
  console.log('='.repeat(80));
  console.log('');

  const results: TestResult[] = [];

  for (let i = 0; i < TEST_STOCKS.length; i++) {
    const stock = TEST_STOCKS[i];
    const progress = `[${i + 1}/${TEST_STOCKS.length}]`;

    process.stdout.write(`${progress} Testing ${stock.ticker.padEnd(12)} (${stock.sector.substring(0, 20).padEnd(20)}, ${stock.country})... `);

    const result = await testIVCalculation(stock);
    results.push(result);

    if (result.status === 'PASS') {
      console.log(`✅ PASS (${result.methods_count} methods, ${result.data_source})`);
    } else if (result.status === 'ERROR') {
      console.log(`❌ ERROR: ${result.error}`);
    } else {
      console.log(`⚠️ FAIL: ${result.error}`);
    }

    // Rate limiting: Wait 500ms between requests
    if (i < TEST_STOCKS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const total = results.length;

  console.log(`\nTotal Stocks: ${total}`);
  console.log(`✅ Passed:    ${passed} (${(passed/total*100).toFixed(1)}%)`);
  console.log(`⚠️ Failed:    ${failed}`);
  console.log(`❌ Errors:    ${errors}`);

  const successRate = (passed / total) * 100;
  const targetSuccess = 90; // 90% success rate required (18/20)

  if (successRate >= targetSuccess) {
    console.log(`\n🎉 SUCCESS: ${successRate.toFixed(1)}% ≥ ${targetSuccess}% target`);
  } else {
    console.log(`\n❌ FAILURE: ${successRate.toFixed(1)}% < ${targetSuccess}% target`);
  }

  // ========== P0 BUG VERIFICATION ==========
  console.log('\n' + '='.repeat(80));
  console.log('🐛 P0 BUG VERIFICATION (Growth Rates ≠ 0%)');
  console.log('='.repeat(80));

  const withGrowth = results.filter(r => r.growth_y1_5 !== undefined && r.growth_y1_5 !== 0);
  console.log(`\nGrowth rates detected: ${withGrowth.length}/${passed} passed stocks`);

  if (withGrowth.length === passed) {
    console.log('✅ P0 BUG FIXED: All stocks have non-zero growth rates');
  } else {
    console.log(`⚠️ P0 BUG PARTIAL: ${passed - withGrowth.length} stocks still have 0% growth`);
  }

  // ========== GROWTH RATES SAMPLE ==========
  if (withGrowth.length > 0) {
    console.log('\n📈 Sample Growth Rates (Y1-5):');
    console.log('-'.repeat(80));
    console.log('Ticker        Sector                Y1-5     Y6-10    Y11-20   Source      Conf');
    console.log('-'.repeat(80));

    withGrowth.slice(0, 10).forEach(r => {
      const ticker = r.ticker.padEnd(12);
      const sector = r.sector.substring(0, 20).padEnd(20);
      const y1_5 = `${(r.growth_y1_5! * 100).toFixed(2)}%`.padEnd(8);
      const y6_10 = `${(r.growth_y6_10! * 100).toFixed(2)}%`.padEnd(8);
      const y11_20 = `${(r.growth_y11_20! * 100).toFixed(2)}%`.padEnd(8);
      const source = (r.data_source || 'unknown').padEnd(11);
      const conf = r.confidence || 'unknown';

      console.log(`${ticker} ${sector} ${y1_5} ${y6_10} ${y11_20} ${source} ${conf}`);
    });

    if (withGrowth.length > 10) {
      console.log(`... (${withGrowth.length - 10} more stocks)`);
    }
  }

  // ========== SECTOR BREAKDOWN ==========
  console.log('\n' + '='.repeat(80));
  console.log('🏢 SECTOR BREAKDOWN');
  console.log('='.repeat(80));

  const sectorStats: Record<string, { total: number; passed: number; avgGrowth: number }> = {};

  results.forEach(r => {
    if (!sectorStats[r.sector]) {
      sectorStats[r.sector] = { total: 0, passed: 0, avgGrowth: 0 };
    }
    sectorStats[r.sector].total++;
    if (r.status === 'PASS') {
      sectorStats[r.sector].passed++;
      if (r.growth_y1_5 !== undefined) {
        sectorStats[r.sector].avgGrowth += r.growth_y1_5;
      }
    }
  });

  console.log('\nSector                    Passed/Total  Success%  Avg Y1-5 Growth');
  console.log('-'.repeat(80));

  Object.entries(sectorStats)
    .sort((a, b) => b[1].passed - a[1].passed)
    .forEach(([sector, stats]) => {
      const sectorName = sector.substring(0, 25).padEnd(25);
      const ratio = `${stats.passed}/${stats.total}`.padEnd(13);
      const successPct = `${(stats.passed / stats.total * 100).toFixed(1)}%`.padEnd(9);
      const avgGrowth = stats.passed > 0
        ? `${(stats.avgGrowth / stats.passed * 100).toFixed(2)}%`
        : 'N/A';

      console.log(`${sectorName} ${ratio} ${successPct} ${avgGrowth}`);
    });

  // ========== PORTUGUESE STOCKS ==========
  console.log('\n' + '='.repeat(80));
  console.log('🇵🇹 PORTUGUESE STOCKS (Alfalyzer Focus)');
  console.log('='.repeat(80));

  const portugueseStocks = results.filter(r => r.country === 'PT');

  if (portugueseStocks.length > 0) {
    console.log('\nTicker        Status    Methods   Y1-5 Growth   Data Source');
    console.log('-'.repeat(80));

    portugueseStocks.forEach(r => {
      const ticker = r.ticker.padEnd(12);
      const status = r.status.padEnd(9);
      const methods = r.methods_count ? `${r.methods_count}`.padEnd(9) : 'N/A      ';
      const growth = r.growth_y1_5 ? `${(r.growth_y1_5 * 100).toFixed(2)}%`.padEnd(13) : 'N/A          ';
      const source = r.data_source || 'N/A';

      console.log(`${ticker} ${status} ${methods} ${growth} ${source}`);
    });

    const ptPassed = portugueseStocks.filter(r => r.status === 'PASS').length;
    console.log(`\n✅ Portuguese stocks: ${ptPassed}/${portugueseStocks.length} passed`);
  } else {
    console.log('\n⚠️ No Portuguese stocks found in test set');
  }

  // ========== EXPECTED VS ACTUAL (Validation) ==========
  const withExpected = results.filter(r => r.expected_growth !== undefined);

  if (withExpected.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 VALIDATION: Expected vs Actual Growth (from GROWTH_RATE_DISCOVERY doc)');
    console.log('='.repeat(80));

    console.log('\nTicker        Expected   Actual     Variance   Status');
    console.log('-'.repeat(80));

    withExpected.forEach(r => {
      const ticker = r.ticker.padEnd(12);
      const expected = `${(r.expected_growth! * 100).toFixed(2)}%`.padEnd(10);
      const actual = r.growth_y1_5 ? `${(r.growth_y1_5 * 100).toFixed(2)}%`.padEnd(10) : 'N/A       ';
      const variance = r.growth_variance !== undefined
        ? `${(r.growth_variance * 100).toFixed(2)}%`.padEnd(10)
        : 'N/A       ';

      const status = r.growth_variance !== undefined && r.growth_variance <= 0.05
        ? '✅ Match'
        : r.growth_variance !== undefined && r.growth_variance <= 0.10
        ? '⚠️ Close'
        : '❌ Diff';

      console.log(`${ticker} ${expected} ${actual} ${variance} ${status}`);
    });
  }

  // ========== SAVE DETAILED RESULTS ==========
  const outputDir = '/tmp';
  const outputFile = path.join(outputDir, 'iv-universe-test-results.json');

  try {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${outputFile}`);
  } catch (error: any) {
    console.error(`\n❌ Failed to save results: ${error.message}`);
  }

  // ========== EXIT CODE ==========
  const exitCode = successRate >= targetSuccess ? 0 : 1;

  console.log('\n' + '='.repeat(80));
  console.log(`Exit code: ${exitCode} (${exitCode === 0 ? 'SUCCESS' : 'FAILURE'})`);
  console.log('='.repeat(80));
  console.log('');

  return { results, exitCode };
}

// Run tests
// Note: In ES modules, we check if this is the main module differently
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  runTests().then(({ exitCode }) => {
    process.exit(exitCode);
  });
}

export { runTests, testIVCalculation, TEST_STOCKS };
