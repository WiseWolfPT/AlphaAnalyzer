#!/usr/bin/env node

/**
 * AGENT 14: Negative IV Audit Script
 *
 * Validates that NO stocks return negative intrinsic values.
 * Tests the 8 affected stocks from Agent A report plus a wider sample.
 *
 * Usage:
 *   node scripts/validation/test-negative-iv-audit.mjs
 *   node scripts/validation/test-negative-iv-audit.mjs --full  # Test all methods
 */

import https from 'https';

const BASE_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io';
const FULL_MODE = process.argv.includes('--full');

// Agent A reported these 8 stocks with negative IVs
const AFFECTED_STOCKS = ['SO', 'ORCL', 'NEE', 'LLY', 'JPM', 'INTC', 'DUK', 'DE'];

// Extended test set for comprehensive validation
const EXTENDED_TEST_SET = [
  // Utilities (often have negative FCF due to capex)
  'SO', 'DUK', 'NEE', 'D', 'AEP',

  // Tech (may have negative FCF from buybacks/acquisitions)
  'ORCL', 'INTC', 'CSCO', 'IBM',

  // Pharma (high R&D, may have negative earnings)
  'LLY', 'BMY', 'PFE', 'MRK',

  // Banks (use P/TBV, not DCF)
  'JPM', 'BAC', 'C', 'WFC', 'GS',

  // Industrials (cyclical earnings)
  'DE', 'CAT', 'GE', 'HON',

  // Growth stocks (may have negative earnings)
  'TSLA', 'NVDA', 'META', 'GOOGL',
];

/**
 * Fetch IV chart data for a ticker
 */
async function fetchIVChart(ticker) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/api/iv/${ticker}/chart`;

    https.get(url, {
      rejectUnauthorized: false, // For self-signed certs
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON for ${ticker}: ${err.message}`));
          }
        } else if (res.statusCode === 422) {
          // ETF or not supported - this is valid
          resolve({ ticker, etf: true, methods: [] });
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${ticker}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Analyze IV data for negative values
 */
function analyzeIVData(data) {
  const { ticker, methods = [], alfaValue } = data;

  const issues = [];

  // Check AlfaValue
  if (alfaValue !== null && alfaValue < 0) {
    issues.push({
      method: 'AlfaValue',
      value: alfaValue,
      severity: 'CRITICAL',
    });
  }

  // Check each method
  methods.forEach((method) => {
    if (method.value !== null && method.value < 0) {
      issues.push({
        method: method.name || method.id,
        value: method.value,
        severity: 'ERROR',
      });
    }
  });

  return {
    ticker,
    valid: issues.length === 0,
    issues,
    methodCount: methods.length,
    validMethodCount: methods.filter(m => m.value !== null && m.value > 0).length,
  };
}

/**
 * Run audit on list of tickers
 */
async function runAudit(tickers) {
  console.log(`\n🔍 AGENT 14: Negative IV Audit`);
  console.log(`Testing ${tickers.length} stocks...`);
  console.log(`Target: ${BASE_URL}\n`);

  const results = [];
  let negativeCount = 0;
  let errorCount = 0;

  for (const ticker of tickers) {
    try {
      const data = await fetchIVChart(ticker);

      if (data.etf) {
        console.log(`✅ ${ticker.padEnd(6)} - ETF (correctly rejected)`);
        continue;
      }

      const analysis = analyzeIVData(data);
      results.push(analysis);

      if (!analysis.valid) {
        negativeCount++;
        console.log(`❌ ${ticker.padEnd(6)} - ${analysis.issues.length} negative IVs found:`);
        analysis.issues.forEach((issue) => {
          console.log(`   └─ ${issue.method}: ${issue.value.toFixed(2)} (${issue.severity})`);
        });
      } else {
        const coverage = analysis.validMethodCount > 0
          ? `${analysis.validMethodCount}/${analysis.methodCount} methods`
          : 'no valid methods';
        console.log(`✅ ${ticker.padEnd(6)} - No negative IVs (${coverage})`);
      }

      // Rate limiting: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      errorCount++;
      console.log(`⚠️  ${ticker.padEnd(6)} - Error: ${error.message}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 AUDIT SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total stocks tested: ${tickers.length}`);
  console.log(`Stocks with negative IVs: ${negativeCount} (${((negativeCount/tickers.length)*100).toFixed(1)}%)`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Success rate: ${(((tickers.length - negativeCount - errorCount) / tickers.length) * 100).toFixed(1)}%`);

  if (negativeCount === 0) {
    console.log(`\n✅ SUCCESS: No negative IVs detected!`);
  } else {
    console.log(`\n❌ FAILURE: ${negativeCount} stocks still have negative IVs`);
    console.log(`\nAffected stocks:`);
    results.filter(r => !r.valid).forEach((r) => {
      console.log(`  - ${r.ticker}: ${r.issues.map(i => i.method).join(', ')}`);
    });
  }

  return {
    totalTested: tickers.length,
    negativeCount,
    errorCount,
    successRate: ((tickers.length - negativeCount - errorCount) / tickers.length) * 100,
    results,
  };
}

// Main execution
(async () => {
  try {
    const testSet = FULL_MODE ? EXTENDED_TEST_SET : AFFECTED_STOCKS;

    console.log(`\n🎯 Mode: ${FULL_MODE ? 'FULL' : 'QUICK'} (${testSet.length} stocks)`);

    const audit = await runAudit(testSet);

    // Exit with error code if issues found
    if (audit.negativeCount > 0) {
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Audit failed: ${error.message}`);
    process.exit(1);
  }
})();
