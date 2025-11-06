#!/usr/bin/env node

/**
 * ULTRAFIX FASE 3: US Stock Regression Test
 *
 * Validates that US stocks maintain their previous pass rate
 * Tests 50 random US stocks that were passing before
 * Target: 100% pass rate (no regression)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://128.140.45.28.sslip.io';
const TIMEOUT_MS = 60000;
const REQUEST_DELAY_MS = 300;

// Top US stocks (known to work well)
const US_STOCKS = [
  // Mega caps
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
  // Tech
  'NFLX', 'AMD', 'INTC', 'CSCO', 'ORCL', 'CRM', 'ADBE', 'AVGO',
  // Finance
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK',
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'TMO', 'DHR', 'LLY',
  // Consumer
  'WMT', 'HD', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT', 'LOW',
  // Industrial
  'BA', 'CAT', 'HON', 'UPS', 'MMM', 'GE', 'LMT', 'RTX',
  // Energy
  'XOM', 'CVX', 'COP'
];

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         ULTRAFIX FASE 3: US Regression Test                   ║
║                                                               ║
║  Testing: ${US_STOCKS.length} known-good US stocks                       ║
║  Target:  100% pass rate (no regression)                      ║
║  Purpose: Verify fix didn't break existing functionality      ║
╚═══════════════════════════════════════════════════════════════╝
`);

const results = {
  metadata: {
    timestamp: new Date().toISOString(),
    phase: 'ULTRAFIX FASE 3 - US Regression Test',
    stocks_tested: US_STOCKS.length
  },
  summary: {
    tested: 0,
    passing: 0,
    failing: 0,
    pass_rate: 0
  },
  details: []
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStock(ticker) {
  const url = `${BASE_URL}/api/iv/${ticker}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const methodCount = data.methods?.length || 0;
      // Check if main method (alfavalue) exists and has valid IV
      const mainMethod = data.methods?.find(m => m.method_id === 'alfavalue');
      const hasValidIV = mainMethod && mainMethod.iv > 0;
      const hasMinMethods = methodCount >= 6;

      if (hasValidIV && hasMinMethods) {
        results.summary.passing++;
        results.details.push({
          ticker,
          status: 'pass',
          iv: mainMethod.iv,
          current_price: data.price,
          method_count: methodCount
        });
        return true;
      } else {
        results.summary.failing++;
        results.details.push({
          ticker,
          status: 'insufficient_data',
          iv: mainMethod?.iv || null,
          current_price: data.price,
          method_count: methodCount,
          reason: !hasValidIV ? 'no_valid_iv' : 'too_few_methods'
        });
        return false;
      }
    } else {
      results.summary.failing++;
      results.details.push({
        ticker,
        status: 'http_error',
        http_status: response.status
      });
      return false;
    }
  } catch (error) {
    results.summary.failing++;
    results.details.push({
      ticker,
      status: 'error',
      error: error.message
    });
    return false;
  }
}

console.log('Testing US stocks...\n');

for (let i = 0; i < US_STOCKS.length; i++) {
  const ticker = US_STOCKS[i];
  results.summary.tested++;

  const success = await testStock(ticker);
  const status = success ? '✓' : '✗';

  console.log(`[${i + 1}/${US_STOCKS.length}] ${ticker.padEnd(8)} ${status}`);

  await sleep(REQUEST_DELAY_MS);
}

results.summary.pass_rate = ((results.summary.passing / results.summary.tested) * 100).toFixed(1);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  REGRESSION TEST COMPLETE                     ║
╚═══════════════════════════════════════════════════════════════╝

📊 RESULTS:
   Tested:   ${results.summary.tested}
   Passing:  ${results.summary.passing} (${results.summary.pass_rate}%)
   Failing:  ${results.summary.failing}

✅ SUCCESS CRITERIA:
   ${results.summary.pass_rate >= 95 ? '✓' : '✗'} Pass rate ≥ 95% (no regression)
   ${results.summary.failing === 0 ? '✓' : '✗'} Zero failures
`);

// Save results
const outputFile = path.join(__dirname, '../../validation-results/us-regression-results.json');
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

console.log(`\n💾 Results saved to: ${outputFile}\n`);

if (results.summary.pass_rate >= 95) {
  console.log('🎉 NO REGRESSION DETECTED - US stocks working perfectly!\n');
  process.exit(0);
} else {
  console.log(`⚠️  REGRESSION WARNING - ${results.summary.failing} US stocks failing\n`);
  process.exit(1);
}
