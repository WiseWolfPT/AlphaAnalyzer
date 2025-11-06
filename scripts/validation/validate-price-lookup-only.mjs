#!/usr/bin/env node

/**
 * PRICE LOOKUP VALIDATION (Post-Fix)
 * ===================================
 * Tests ONLY the price lookup fix (simpleCacheService.getQuote())
 * Does NOT test full IV calculation (separate concern)
 *
 * Test Universe: 767 US stocks (NYSE, NASDAQ, AMEX)
 * Expected Runtime: ~4-5 minutes (767 stocks ÷ 3.5 req/s)
 *
 * Success Criteria:
 * - Pass rate ≥ 93% (715/767 stocks)
 * - "No price data found" errors eliminated
 * - Compare vs baseline (252/785 = 32.1% before fix)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'https://128.140.45.28.sslip.io';
const RATE_LIMIT = 0.5; // req/s (VERY conservative to avoid 429s)
const DELAY_MS = Math.ceil(1000 / RATE_LIMIT);
const TIMEOUT_MS = 10000;

// Results tracking
const results = {
  pass: [],
  fail: [],
  errors: {},
  startTime: new Date().toISOString(),
  endTime: null,
  durationMinutes: 0,
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Load US stocks from CSV
 */
function loadUSStocks() {
  const csvPath = path.join(__dirname, '../../stock_universe_complete.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1); // Skip header

  const usStocks = lines
    .filter(line => line.trim())
    .map(line => {
      const [symbol, name] = line.split(',');
      return { symbol: symbol.trim(), name: name?.trim() || '' };
    })
    .filter(stock => {
      // Filter US stocks only (no European exchanges)
      const symbol = stock.symbol;
      if (symbol.includes('.L') || symbol.includes('.AS') ||
          symbol.includes('.DE') || symbol.includes('.PA')) {
        return false;
      }
      // Valid US ticker pattern: 1-5 uppercase letters
      return /^[A-Z]{1,5}$/.test(symbol);
    });

  console.log(`✓ Loaded ${usStocks.length} US stocks from CSV`);
  return usStocks;
}

/**
 * Test price lookup for a single stock
 */
async function testPriceLookup(symbol) {
  const url = `${BASE_URL}/api/market-data/quote/${symbol}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        symbol,
        error: `HTTP ${response.status}`,
        errorType: 'http_error'
      };
    }

    const data = await response.json();

    // Check if price exists and is valid
    if (!data.price || data.price <= 0) {
      return {
        success: false,
        symbol,
        error: 'No price data found',
        errorType: 'no_price',
        data
      };
    }

    return {
      success: true,
      symbol,
      price: data.price,
      name: data.name || '',
      change: data.change || 0,
      changePercent: data.changesPercentage || 0
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        symbol,
        error: 'Timeout',
        errorType: 'timeout'
      };
    }

    return {
      success: false,
      symbol,
      error: error.message,
      errorType: 'network_error'
    };
  }
}

/**
 * Run validation for all stocks
 */
async function runValidation() {
  const stocks = loadUSStocks();
  const total = stocks.length;

  console.log(`\n${'='.repeat(60)}`);
  console.log('PRICE LOOKUP VALIDATION - POST FIX');
  console.log(`${'='.repeat(60)}`);
  console.log(`Testing: ${total} US stocks`);
  console.log(`Rate limit: ${RATE_LIMIT} req/s`);
  console.log(`Estimated time: ${Math.ceil(total / RATE_LIMIT / 60)} minutes`);
  console.log(`${'='.repeat(60)}\n`);

  let processed = 0;
  let lastProgressUpdate = Date.now();

  for (const stock of stocks) {
    const result = await testPriceLookup(stock.symbol);

    if (result.success) {
      results.pass.push({
        symbol: result.symbol,
        price: result.price,
        name: result.name
      });
    } else {
      results.fail.push({
        symbol: result.symbol,
        error: result.error,
        errorType: result.errorType
      });

      // Track error types
      results.errors[result.errorType] = (results.errors[result.errorType] || 0) + 1;
    }

    processed++;

    // Progress update every 2 seconds
    if (Date.now() - lastProgressUpdate > 2000) {
      const passRate = ((results.pass.length / processed) * 100).toFixed(1);
      const elapsed = Math.ceil((Date.now() - new Date(results.startTime).getTime()) / 1000 / 60);
      process.stdout.write(`\r✓ ${processed}/${total} | Pass: ${results.pass.length} (${passRate}%) | Fail: ${results.fail.length} | Elapsed: ${elapsed}m`);
      lastProgressUpdate = Date.now();
    }

    // Rate limiting
    if (processed < total) {
      await sleep(DELAY_MS);
    }
  }

  results.endTime = new Date().toISOString();
  const duration = (new Date(results.endTime) - new Date(results.startTime)) / 1000 / 60;
  results.durationMinutes = duration.toFixed(2);

  console.log('\n\n✅ Validation complete!\n');
}

/**
 * Generate summary report
 */
function generateReport() {
  const total = results.pass.length + results.fail.length;
  const passRate = ((results.pass.length / total) * 100).toFixed(1);
  const targetRate = 93;
  const targetMet = parseFloat(passRate) >= targetRate;

  // Baseline comparison (before fix)
  const baselinePass = 252;
  const baselineTotal = 785;
  const baselineRate = ((baselinePass / baselineTotal) * 100).toFixed(1);
  const improvement = results.pass.length - Math.floor(baselinePass * total / baselineTotal);
  const improvementPp = (parseFloat(passRate) - parseFloat(baselineRate)).toFixed(1);

  // Build summary report
  const report = [
    'PRICE LOOKUP VALIDATION - COMPLETE',
    '===================================',
    `Tested: ${total} US stocks`,
    `Duration: ${results.durationMinutes} minutes`,
    '',
    `PASS RATE: ${results.pass.length}/${total} (${passRate}%)`,
    `Target: ${targetRate}% (${Math.ceil(total * targetRate / 100)} stocks)`,
    `Status: ${targetMet ? '✅ TARGET MET' : '❌ BELOW TARGET'}`,
    '',
    'IMPROVEMENT:',
    `Before Fix: ${Math.floor(baselinePass * total / baselineTotal)}/${total} (${baselineRate}%)`,
    `After Fix: ${results.pass.length}/${total} (${passRate}%)`,
    `Recovery: +${improvement} stocks (+${improvementPp}pp)`,
    '',
    `REMAINING ISSUES (${results.fail.length} stocks):`,
  ];

  // Error type breakdown
  Object.entries(results.errors)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count], idx) => {
      report.push(`${idx + 1}. ${type}: ${count} stocks`);
    });

  report.push('');
  report.push('SAMPLE PASSING STOCKS:');

  // Show 5 random passing stocks
  const passSamples = results.pass
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  passSamples.forEach(stock => {
    report.push(`✅ ${stock.symbol}: $${stock.price.toFixed(2)} - ${stock.name}`);
  });

  // Show sample failing stocks (if any)
  if (results.fail.length > 0) {
    report.push('');
    report.push('SAMPLE FAILING STOCKS:');

    const failSamples = results.fail.slice(0, 5);
    failSamples.forEach(stock => {
      report.push(`❌ ${stock.symbol}: ${stock.error} (${stock.errorType})`);
    });
  }

  report.push('');
  report.push('CONCLUSION:');

  if (targetMet && results.errors['no_price'] === 0) {
    report.push('Price lookup fix SUCCESS ✅');
    report.push('- Target pass rate achieved');
    report.push('- "No price data found" errors eliminated');
    report.push('- simpleCacheService.getQuote() working as expected');
  } else if (targetMet) {
    report.push('Price lookup fix PARTIAL SUCCESS ⚠️');
    report.push('- Target pass rate achieved');
    report.push(`- ${results.errors['no_price'] || 0} "No price data found" errors remain`);
  } else {
    report.push('Price lookup fix INCOMPLETE ❌');
    report.push(`- Pass rate ${passRate}% below target ${targetRate}%`);
    report.push(`- ${results.errors['no_price'] || 0} "No price data found" errors remain`);
  }

  return report.join('\n');
}

/**
 * Save results to files
 */
function saveResults() {
  const timestamp = new Date().toISOString().split('T')[0];
  const outputDir = path.join(__dirname, '../../');

  // Save detailed JSON
  const jsonPath = path.join(outputDir, `PRICE_LOOKUP_VALIDATION_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✓ Detailed results: ${jsonPath}`);

  // Save summary report
  const summaryPath = path.join(outputDir, 'PRICE_LOOKUP_SUMMARY.txt');
  const summary = generateReport();
  fs.writeFileSync(summaryPath, summary);
  console.log(`✓ Summary report: ${summaryPath}`);

  // Print summary to console
  console.log('\n' + summary);

  // Save CSV of failing stocks for analysis
  if (results.fail.length > 0) {
    const csvPath = path.join(outputDir, `PRICE_LOOKUP_FAILURES_${timestamp}.csv`);
    const csvLines = ['symbol,error,errorType'];
    results.fail.forEach(f => {
      csvLines.push(`${f.symbol},"${f.error}",${f.errorType}`);
    });
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`✓ Failures CSV: ${csvPath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await runValidation();
    saveResults();

    // Exit with error code if target not met
    const passRate = (results.pass.length / (results.pass.length + results.fail.length)) * 100;
    process.exit(passRate >= 93 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

main();
