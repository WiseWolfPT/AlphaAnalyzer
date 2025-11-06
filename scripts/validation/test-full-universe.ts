/**
 * Comprehensive Intrinsic Value Test Suite
 *
 * Validates IV calculations across entire stock universe
 * Tests all 12 valuation methods per stock
 *
 * Usage:
 *   npx tsx scripts/validation/test-full-universe.ts --tier=1 --limit=100   # Smoke test
 *   npx tsx scripts/validation/test-full-universe.ts --tier=2 --limit=200   # Sector coverage
 *   npx tsx scripts/validation/test-full-universe.ts --tier=3 --full        # Full universe
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const BASE_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io';
const STOCK_UNIVERSE_CSV = './stock_universe_complete.csv';
const RESULTS_DIR = './validation-results';
const RATE_LIMIT_DELAY = 1000; // 1s = 1 req/s (conservative for IV calculations)
const REQUEST_TIMEOUT = 120000; // 2 minutes (learned from ONDA 2)
const MAX_RETRIES = 2; // Retry failed requests

interface StockInfo {
  symbol: string;
  company_name: string;
  exchange: string;
  sector: string;
  industry: string;
  type: string;
  can_calculate_iv: string;
}

interface TestResult {
  ticker: string;
  company_name: string;
  sector: string;
  exchange: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  http_code: number;
  methods_count: number;
  failed_methods_count: number;
  total_methods: number;
  response_time_ms: number;
  error_message?: string;
  failed_methods?: string[];
  timestamp: string;
}

interface TestSummary {
  test_date: string;
  test_tier: string;
  total_stocks: number;
  passed: number;
  failed: number;
  errors: number;
  pass_rate: string;
  avg_response_time_ms: number;
  total_duration_ms: number;
  by_sector: Record<string, { passed: number; total: number; rate: string }>;
  by_http_code: Record<number, number>;
  by_exchange: Record<string, { passed: number; total: number; rate: string }>;
}

/**
 * Load stock universe from CSV
 */
async function loadStockUniverse(): Promise<StockInfo[]> {
  console.log(`Loading stock universe from ${STOCK_UNIVERSE_CSV}...`);

  const csvContent = await fs.readFile(STOCK_UNIVERSE_CSV, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Filter to US stocks only (exclude European and Portuguese stocks)
  const usStocks = records.filter((stock: StockInfo) => {
    const symbol = stock.symbol || '';

    // Exclude European exchanges
    const isEuronext = stock.exchange?.toUpperCase().includes('EURONEXT');
    const isLSE = stock.exchange?.toUpperCase().includes('LSE');
    const isXetra = stock.exchange?.toUpperCase().includes('XETRA');
    const isBME = stock.exchange?.toUpperCase().includes('BME');

    // Exclude symbols with European suffixes
    const hasEuropeanSuffix = symbol.includes('.L') || symbol.includes('.LS') ||
                               symbol.includes('.DE') || symbol.includes('.F') ||
                               symbol.includes('.MC') || symbol.includes('.PA') ||
                               symbol.includes('.AS') || symbol.includes('.MI');

    // Only include if it's a clean US ticker (1-5 uppercase letters, optionally with -)
    const isUsTickerFormat = /^[A-Z]{1,5}(-[A-Z])?$/.test(symbol);

    return !isEuronext && !isLSE && !isXetra && !isBME && !hasEuropeanSuffix && isUsTickerFormat;
  });

  console.log(`Loaded ${usStocks.length} US stocks (excluded Euronext/Portuguese/LSE)`);
  return usStocks;
}

/**
 * Test a single stock's IV endpoint with retry logic
 */
async function testStock(stock: StockInfo, retries = MAX_RETRIES): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${BASE_URL}/api/iv/${stock.symbol}`, {
      timeout: REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500, // Accept 4xx errors
    });

    const responseTime = Date.now() - startTime;
    const methods = response.data.methods || [];
    const failedMethods = response.data.failedMethods || [];
    const totalMethods = methods.length + failedMethods.length;

    // Success criteria: At least 8/12 methods working (66%+ per stock)
    const passThreshold = 8;
    const isPassing = methods.length >= passThreshold;

    return {
      ticker: stock.symbol,
      company_name: stock.company_name,
      sector: stock.sector || 'Unknown',
      exchange: stock.exchange || 'Unknown',
      status: response.status === 200 ? (isPassing ? 'PASS' : 'FAIL') : 'ERROR',
      http_code: response.status,
      methods_count: methods.length,
      failed_methods_count: failedMethods.length,
      total_methods: totalMethods,
      response_time_ms: responseTime,
      failed_methods: failedMethods.map((m: any) => m.method),
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const httpCode = error.response?.status || 0;

    // Retry on 502/504 errors (server overload)
    if (retries > 0 && (httpCode === 502 || httpCode === 504 || error.code === 'ETIMEDOUT')) {
      console.log(`  Retrying ${stock.symbol} (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2s backoff
      return testStock(stock, retries - 1);
    }

    return {
      ticker: stock.symbol,
      company_name: stock.company_name,
      sector: stock.sector || 'Unknown',
      exchange: stock.exchange || 'Unknown',
      status: 'ERROR',
      http_code: httpCode,
      methods_count: 0,
      failed_methods_count: 0,
      total_methods: 0,
      response_time_ms: responseTime,
      error_message: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Select stocks for testing based on tier
 */
function selectStocksForTier(allStocks: StockInfo[], tier: string, limit?: number): StockInfo[] {
  if (tier === '1') {
    // Tier 1: Top 100 by market cap (use order in CSV as proxy)
    return allStocks.slice(0, limit || 100);
  } else if (tier === '2') {
    // Tier 2: Sector coverage - 20 stocks per sector
    const stocksPerSector = 20;
    const sectorMap = new Map<string, StockInfo[]>();

    allStocks.forEach(stock => {
      const sector = stock.sector || 'Unknown';
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, []);
      }
      sectorMap.get(sector)!.push(stock);
    });

    const selected: StockInfo[] = [];
    sectorMap.forEach((stocks, sector) => {
      selected.push(...stocks.slice(0, stocksPerSector));
    });

    return selected.slice(0, limit || 200);
  } else {
    // Tier 3: Full universe
    return allStocks;
  }
}

/**
 * Run comprehensive test suite
 */
async function runTests(tier: string, limit?: number, fullUniverse: boolean = false) {
  console.log('\n========================================');
  console.log('INTRINSIC VALUE FULL UNIVERSE TEST SUITE');
  console.log('========================================\n');

  const startTime = Date.now();

  // Load stock universe
  const allStocks = await loadStockUniverse();
  const stocksToTest = fullUniverse ? allStocks : selectStocksForTier(allStocks, tier, limit);

  console.log(`Test Tier: ${tier}`);
  console.log(`Stocks to test: ${stocksToTest.length}`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Rate limit: 1 req/s (${RATE_LIMIT_DELAY}ms delay)`);
  console.log(`Max retries: ${MAX_RETRIES}`);
  console.log(`Timeout: ${REQUEST_TIMEOUT}ms\n`);

  const estimatedMinutes = Math.ceil((stocksToTest.length * RATE_LIMIT_DELAY) / 60000);
  console.log(`Estimated time: ${estimatedMinutes} minutes (excluding retries)\n`);
  console.log('Starting tests...\n');

  // Run tests
  const results: TestResult[] = [];
  let passCount = 0;
  let failCount = 0;
  let errorCount = 0;
  const sectorStats = new Map<string, { passed: number; total: number }>();
  const httpCodeStats = new Map<number, number>();
  const exchangeStats = new Map<string, { passed: number; total: number }>();
  let totalResponseTime = 0;

  for (const [index, stock] of stocksToTest.entries()) {
    const result = await testStock(stock);
    results.push(result);

    // Update counters
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else errorCount++;

    totalResponseTime += result.response_time_ms;

    // Track by sector
    const sector = result.sector;
    if (!sectorStats.has(sector)) {
      sectorStats.set(sector, { passed: 0, total: 0 });
    }
    const sectorStat = sectorStats.get(sector)!;
    sectorStat.total++;
    if (result.status === 'PASS') sectorStat.passed++;

    // Track by exchange
    const exchange = result.exchange;
    if (!exchangeStats.has(exchange)) {
      exchangeStats.set(exchange, { passed: 0, total: 0 });
    }
    const exchangeStat = exchangeStats.get(exchange)!;
    exchangeStat.total++;
    if (result.status === 'PASS') exchangeStat.passed++;

    // Track HTTP codes
    httpCodeStats.set(result.http_code, (httpCodeStats.get(result.http_code) || 0) + 1);

    // Progress update every 50 stocks
    if ((index + 1) % 50 === 0 || index === stocksToTest.length - 1) {
      const progress = ((index + 1) / stocksToTest.length * 100).toFixed(1);
      const passRate = (passCount / (index + 1) * 100).toFixed(1);
      const avgResponseTime = Math.round(totalResponseTime / (index + 1));

      console.log(
        `Progress: ${index + 1}/${stocksToTest.length} (${progress}%) | ` +
        `Pass: ${passCount} (${passRate}%) | Fail: ${failCount} | Error: ${errorCount} | ` +
        `Avg: ${avgResponseTime}ms`
      );
    }

    // Rate limiting delay
    if (index < stocksToTest.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  const totalDuration = Date.now() - startTime;

  // Generate summary
  const summary: TestSummary = {
    test_date: new Date().toISOString().split('T')[0],
    test_tier: tier,
    total_stocks: stocksToTest.length,
    passed: passCount,
    failed: failCount,
    errors: errorCount,
    pass_rate: `${(passCount / stocksToTest.length * 100).toFixed(1)}%`,
    avg_response_time_ms: Math.round(totalResponseTime / stocksToTest.length),
    total_duration_ms: totalDuration,
    by_sector: Object.fromEntries(
      Array.from(sectorStats.entries()).map(([sector, stats]) => [
        sector,
        {
          passed: stats.passed,
          total: stats.total,
          rate: `${(stats.passed / stats.total * 100).toFixed(1)}%`,
        },
      ])
    ),
    by_http_code: Object.fromEntries(httpCodeStats),
    by_exchange: Object.fromEntries(
      Array.from(exchangeStats.entries()).map(([exchange, stats]) => [
        exchange,
        {
          passed: stats.passed,
          total: stats.total,
          rate: `${(stats.passed / stats.total * 100).toFixed(1)}%`,
        },
      ])
    ),
  };

  // Save results
  await saveResults(results, summary, tier);

  // Print final summary
  printSummary(summary, results);
}

/**
 * Save results to CSV, JSON, and Markdown
 */
async function saveResults(results: TestResult[], summary: TestSummary, tier: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const prefix = `tier${tier}-${timestamp}`;

  // Ensure results directory exists
  await fs.mkdir(RESULTS_DIR, { recursive: true });

  // Save CSV
  const csvPath = path.join(RESULTS_DIR, `${prefix}-results.csv`);
  const csvHeader = 'ticker,company_name,sector,exchange,status,http_code,methods_count,failed_count,total_methods,response_time_ms,error_message,failed_methods\n';
  const csvRows = results.map(r =>
    `${r.ticker},"${r.company_name}",${r.sector},${r.exchange},${r.status},${r.http_code},${r.methods_count},${r.failed_methods_count},${r.total_methods},${r.response_time_ms},"${r.error_message || ''}","${(r.failed_methods || []).join(';')}"`
  ).join('\n');
  await fs.writeFile(csvPath, csvHeader + csvRows);
  console.log(`\nCSV saved: ${csvPath}`);

  // Save JSON
  const jsonPath = path.join(RESULTS_DIR, `${prefix}-results.json`);
  await fs.writeFile(jsonPath, JSON.stringify({ summary, results }, null, 2));
  console.log(`JSON saved: ${jsonPath}`);

  // Save Markdown report
  const mdPath = path.join(RESULTS_DIR, `${prefix}-REPORT.md`);
  const markdown = generateMarkdownReport(summary, results);
  await fs.writeFile(mdPath, markdown);
  console.log(`Markdown report saved: ${mdPath}`);
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(summary: TestSummary, results: TestResult[]): string {
  const failedStocks = results.filter(r => r.status === 'FAIL');
  const errorStocks = results.filter(r => r.status === 'ERROR');

  return `# Intrinsic Value Test Report - Tier ${summary.test_tier}

**Date:** ${summary.test_date}
**Total Stocks Tested:** ${summary.total_stocks}
**Pass Rate:** ${summary.pass_rate}
**Average Response Time:** ${summary.avg_response_time_ms}ms
**Total Duration:** ${Math.round(summary.total_duration_ms / 60000)} minutes

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| PASS   | ${summary.passed} | ${summary.pass_rate} |
| FAIL   | ${summary.failed} | ${(summary.failed / summary.total_stocks * 100).toFixed(1)}% |
| ERROR  | ${summary.errors} | ${(summary.errors / summary.total_stocks * 100).toFixed(1)}% |

## Results by Sector

| Sector | Passed | Total | Pass Rate |
|--------|--------|-------|-----------|
${Object.entries(summary.by_sector)
  .sort((a, b) => parseFloat(b[1].rate) - parseFloat(a[1].rate))
  .map(([sector, stats]) => `| ${sector} | ${stats.passed} | ${stats.total} | ${stats.rate} |`)
  .join('\n')}

## Results by Exchange

| Exchange | Passed | Total | Pass Rate |
|----------|--------|-------|-----------|
${Object.entries(summary.by_exchange)
  .sort((a, b) => parseFloat(b[1].rate) - parseFloat(a[1].rate))
  .map(([exchange, stats]) => `| ${exchange} | ${stats.passed} | ${stats.total} | ${stats.rate} |`)
  .join('\n')}

## HTTP Status Codes

| Code | Count |
|------|-------|
${Object.entries(summary.by_http_code)
  .sort((a, b) => Number(b[1]) - Number(a[1]))
  .map(([code, count]) => `| ${code} | ${count} |`)
  .join('\n')}

## Failed Stocks (${failedStocks.length})

${failedStocks.length > 0 ? `
| Ticker | Company | Sector | Methods | Failed | Issue |
|--------|---------|--------|---------|--------|-------|
${failedStocks.slice(0, 50).map(r =>
  `| ${r.ticker} | ${r.company_name} | ${r.sector} | ${r.methods_count} | ${r.failed_methods_count} | Insufficient methods (<8) |`
).join('\n')}
${failedStocks.length > 50 ? `\n*... and ${failedStocks.length - 50} more*` : ''}
` : '*No failed stocks*'}

## Error Stocks (${errorStocks.length})

${errorStocks.length > 0 ? `
| Ticker | Company | HTTP Code | Error |
|--------|---------|-----------|-------|
${errorStocks.slice(0, 50).map(r =>
  `| ${r.ticker} | ${r.company_name} | ${r.http_code} | ${r.error_message || 'N/A'} |`
).join('\n')}
${errorStocks.length > 50 ? `\n*... and ${errorStocks.length - 50} more*` : ''}
` : '*No error stocks*'}

## Recommendations

${summary.passed / summary.total_stocks >= 0.80 ? '✅ **PASS**: Overall pass rate exceeds 80% threshold' : '❌ **FAIL**: Overall pass rate below 80% threshold'}

### Priority Fixes

1. **${errorStocks.filter(r => r.http_code === 404).length} stocks with 404 errors** - Missing from universe or invalid symbols
2. **${errorStocks.filter(r => r.http_code >= 500).length} stocks with 5xx errors** - Backend crashes/timeouts
3. **${failedStocks.length} stocks with insufficient methods** - Data gaps from FMP API

### Next Steps

${summary.passed / summary.total_stocks >= 0.80 ? `
- ✅ Continue to next tier or full validation
- Monitor stocks with <12 methods for data improvements
- Consider expanding to Portuguese stocks
` : `
- ❌ Debug stocks with systematic failures
- Investigate sectors with <70% pass rate
- Contact FMP for data quality issues
- Re-test after fixes applied
`}

---

*Generated by Intrinsic Value Test Suite - ${new Date().toISOString()}*
`;
}

/**
 * Print summary to console
 */
function printSummary(summary: TestSummary, results: TestResult[]) {
  console.log('\n========================================');
  console.log('TEST SUITE COMPLETE');
  console.log('========================================\n');

  console.log(`Total Stocks: ${summary.total_stocks}`);
  console.log(`Passed: ${summary.passed} (${summary.pass_rate})`);
  console.log(`Failed: ${summary.failed} (${(summary.failed / summary.total_stocks * 100).toFixed(1)}%)`);
  console.log(`Errors: ${summary.errors} (${(summary.errors / summary.total_stocks * 100).toFixed(1)}%)`);
  console.log(`\nAverage Response Time: ${summary.avg_response_time_ms}ms`);
  console.log(`Total Duration: ${Math.round(summary.total_duration_ms / 60000)} minutes\n`);

  if (summary.passed / summary.total_stocks >= 0.80) {
    console.log('✅ SUCCESS: Pass rate exceeds 80% threshold\n');
  } else {
    console.log('❌ FAILURE: Pass rate below 80% threshold\n');
  }

  console.log('Top 5 Sectors by Pass Rate:');
  Object.entries(summary.by_sector)
    .sort((a, b) => parseFloat(b[1].rate) - parseFloat(a[1].rate))
    .slice(0, 5)
    .forEach(([sector, stats]) => {
      console.log(`  ${sector}: ${stats.rate} (${stats.passed}/${stats.total})`);
    });

  console.log('\nHTTP Status Codes:');
  Object.entries(summary.by_http_code)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find(arg => arg.startsWith('--tier='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const fullArg = args.includes('--full');

  const tier = tierArg ? tierArg.split('=')[1] : '1';
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  await runTests(tier, limit, fullArg);
}

main().catch(console.error);
