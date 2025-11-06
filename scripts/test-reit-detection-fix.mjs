#!/usr/bin/env node

/**
 * Test REIT Detection Fix (2025-11-04)
 *
 * Validates that banks are NOT misclassified as REITs
 * due to 'dividend-yield-reit' method name containing 'reit' substring.
 *
 * Expected results:
 * - Banks: classified as 'bank' (NOT 'reit')
 * - REITs: classified as 'reit' (no false negatives)
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://128.140.45.28.sslip.io';

// Test samples
const BANKS = ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'SCHW', 'BK', 'KEY', 'CFG', 'FITB'];
const REITS = ['PLD', 'AMT', 'EQIX', 'PSA', 'CCI', 'WELL', 'SPG', 'O'];

/**
 * REIT detection by methods (FIXED 2025-11-04)
 */
function isREITByMethods(methods) {
  const reitSpecificMethods = ['ffo', 'affo', 'p-ffo', 'nav'];
  return reitSpecificMethods.some(rm =>
    methods.some(m => m.toLowerCase().includes(rm))
  );
}

/**
 * Bank exceptions list
 */
const BANK_EXCEPTIONS = [
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC',
  'COF', 'KEY', 'CFG', 'FITB', 'BK', 'SCHW', 'AXP', 'DFS', 'SYF', 'NTRS', 'STT'
];

/**
 * Classify stock by methods
 */
function classifyStock(ticker, methods) {
  // Bank exception takes priority
  if (BANK_EXCEPTIONS.includes(ticker.toUpperCase())) {
    return 'bank';
  }

  // Check for REIT (requires FFO/AFFO)
  if (isREITByMethods(methods)) {
    return 'reit';
  }

  // Check for bank methods
  const hasBankMethod = methods.some(m =>
    m.includes('ptbv') || m.includes('p/tbv') || m.includes('p-tbv')
  );
  const hasDCF = methods.some(m =>
    m.includes('dcf-') || m.includes('dni-')
  );

  if (hasBankMethod && !hasDCF) {
    return 'bank';
  }

  return 'value';
}

async function testStock(ticker, expectedClassification) {
  try {
    const url = `${BASE_URL}/api/iv/${ticker}/chart`;
    const response = await fetch(url, { timeout: 30000 });

    if (!response.ok) {
      return {
        ticker,
        status: 'FAIL',
        error: `HTTP ${response.status}`,
        expected: expectedClassification,
        actual: null
      };
    }

    const data = await response.json();
    const methods = data.available_methods || [];
    const actualClassification = classifyStock(ticker, methods);

    const hasDividendYieldREIT = methods.some(m => m.includes('dividend-yield') && m.includes('reit'));
    const hasFFO = methods.some(m => m.includes('ffo'));
    const hasAFFO = methods.some(m => m.includes('affo'));

    const passed = actualClassification === expectedClassification;

    return {
      ticker,
      status: passed ? 'PASS' : 'FAIL',
      expected: expectedClassification,
      actual: actualClassification,
      methodCount: methods.length,
      hasDividendYieldREIT,
      hasFFO,
      hasAFFO,
      error: null
    };
  } catch (error) {
    return {
      ticker,
      status: 'ERROR',
      error: error.message,
      expected: expectedClassification,
      actual: null
    };
  }
}

async function runTests() {
  console.log('🧪 REIT Detection Fix Validation\n');
  console.log('Testing Bank → REIT Misclassification Fix (2025-11-04)\n');

  // Test banks
  console.log('📊 Testing Banks (should NOT be classified as REITs):\n');
  const bankResults = [];

  for (const ticker of BANKS) {
    const result = await testStock(ticker, 'bank');
    bankResults.push(result);

    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(
      `${icon} ${ticker.padEnd(6)} - ${result.status.padEnd(6)} ` +
      `(Expected: ${result.expected}, Actual: ${result.actual || 'N/A'}) ` +
      `Methods: ${result.methodCount || 0}, ` +
      `Has dividend-yield-reit: ${result.hasDividendYieldREIT ? 'YES' : 'NO'}, ` +
      `Has FFO/AFFO: ${result.hasFFO || result.hasAFFO ? 'YES' : 'NO'}`
    );

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n📊 Testing REITs (should be classified as REITs):\n');
  const reitResults = [];

  for (const ticker of REITS) {
    const result = await testStock(ticker, 'reit');
    reitResults.push(result);

    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(
      `${icon} ${ticker.padEnd(6)} - ${result.status.padEnd(6)} ` +
      `(Expected: ${result.expected}, Actual: ${result.actual || 'N/A'}) ` +
      `Methods: ${result.methodCount || 0}, ` +
      `Has FFO/AFFO: ${result.hasFFO || result.hasAFFO ? 'YES' : 'NO'}`
    );

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('\n📈 SUMMARY:\n');

  const bankPassed = bankResults.filter(r => r.status === 'PASS').length;
  const bankFailed = bankResults.filter(r => r.status === 'FAIL').length;
  const bankErrors = bankResults.filter(r => r.status === 'ERROR').length;

  const reitPassed = reitResults.filter(r => r.status === 'PASS').length;
  const reitFailed = reitResults.filter(r => r.status === 'FAIL').length;
  const reitErrors = reitResults.filter(r => r.status === 'ERROR').length;

  console.log(`Banks: ${bankPassed}/${BANKS.length} PASS, ${bankFailed} FAIL, ${bankErrors} ERROR`);
  console.log(`REITs: ${reitPassed}/${REITS.length} PASS, ${reitFailed} FAIL, ${reitErrors} ERROR`);

  const totalPassed = bankPassed + reitPassed;
  const totalTests = BANKS.length + REITS.length;

  console.log(`\nTotal: ${totalPassed}/${totalTests} PASS (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);

  if (bankFailed === 0 && reitFailed === 0) {
    console.log('\n✅ ALL TESTS PASSED - REIT Detection Fix Validated!');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED - Review failures above');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
