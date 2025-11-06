#!/usr/bin/env node
/**
 * Portuguese Stocks Validation Script
 *
 * Tests that Portuguese stocks work correctly with symbol mapper integration.
 * Validates both hyphenated (JMT-LS) and dot notation (JMT.LS) formats.
 */

import axios from 'axios';

const PORTUGUESE_STOCKS = [
  { symbol: 'NOS-LS', name: 'NOS SGPS SA' },
  { symbol: 'JMT-LS', name: 'Jerónimo Martins SGPS SA' },
  { symbol: 'ALTRI-LS', name: 'Altri SGPS SA' },
  { symbol: 'EDP-LS', name: 'EDP - Energias de Portugal SA' },
  { symbol: 'GALP-LS', name: 'Galp Energia SGPS SA' }
];

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3001';
const API_KEY = process.env.MARKET_DATA_API_KEY;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

/**
 * Test a single stock symbol
 */
async function testStock(symbol, name) {
  console.log(`\n${colors.cyan}Testing ${symbol} (${name})${colors.reset}`);

  try {
    // Test quote endpoint (uses simple cache service internally)
    const response = await axios.get(`${BASE_URL}/api/stocks/${symbol}/quote`, {
      headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
      timeout: 10000
    });

    if (response.status === 200 && response.data) {
      const quote = response.data;
      console.log(`  ${colors.green}✓ SUCCESS${colors.reset}`);
      console.log(`    Symbol: ${quote.symbol}`);
      console.log(`    Price: $${quote.price?.toFixed(2) || 'N/A'}`);
      console.log(`    Change: ${quote.changePercent?.toFixed(2)}%`);
      console.log(`    Volume: ${quote.volume?.toLocaleString() || 'N/A'}`);
      console.log(`    Provider: ${quote.provider}`);
      return { symbol, status: 'success', data: quote };
    } else {
      console.log(`  ${colors.red}✗ FAILED${colors.reset} - No data returned`);
      return { symbol, status: 'failed', error: 'No data' };
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ FAILED${colors.reset}`);
    console.log(`    Error: ${error.response?.data?.error || error.message}`);
    console.log(`    Status: ${error.response?.status || 'Network error'}`);
    return {
      symbol,
      status: 'error',
      error: error.response?.data?.error || error.message,
      statusCode: error.response?.status
    };
  }
}

/**
 * Test batch quote endpoint (multiple symbols at once)
 */
async function testBatchQuotes() {
  console.log(`\n${colors.bold}${colors.blue}BATCH QUOTE TEST${colors.reset}`);
  console.log(`Testing batch endpoint with all Portuguese stocks...`);

  const symbols = PORTUGUESE_STOCKS.map(s => s.symbol).join(',');

  try {
    const response = await axios.get(`${BASE_URL}/api/market-data/quotes/batch`, {
      params: { symbols },
      headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
      timeout: 15000
    });

    if (response.status === 200 && Array.isArray(response.data)) {
      console.log(`  ${colors.green}✓ BATCH SUCCESS${colors.reset}`);
      console.log(`    Returned: ${response.data.length}/${PORTUGUESE_STOCKS.length} symbols`);

      response.data.forEach(quote => {
        console.log(`    - ${quote.symbol}: $${quote.price?.toFixed(2) || 'N/A'}`);
      });

      return { status: 'success', count: response.data.length };
    } else {
      console.log(`  ${colors.red}✗ BATCH FAILED${colors.reset} - Invalid response`);
      return { status: 'failed' };
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ BATCH FAILED${colors.reset}`);
    console.log(`    Error: ${error.response?.data?.error || error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * Test alternative symbol formats (dot notation vs hyphen)
 */
async function testSymbolFormats() {
  console.log(`\n${colors.bold}${colors.blue}SYMBOL FORMAT TEST${colors.reset}`);
  console.log(`Testing both hyphenated and dot notation formats...`);

  const testCases = [
    { input: 'JMT-LS', expected: 'JMT.LS' },
    { input: 'JMT.LS', expected: 'JMT.LS' },
    { input: 'EDP-LS', expected: 'EDP.LS' },
    { input: 'EDP.LS', expected: 'EDP.LS' }
  ];

  const results = [];

  for (const { input, expected } of testCases) {
    try {
      const response = await axios.get(`${BASE_URL}/api/stocks/${input}/quote`, {
        headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
        timeout: 10000
      });

      const returned = response.data.symbol;
      const match = returned === expected;

      console.log(`  ${input} → ${returned} ${match ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);

      results.push({
        input,
        expected,
        returned,
        match
      });
    } catch (error) {
      console.log(`  ${input} → ${colors.red}ERROR${colors.reset} (${error.message})`);
      results.push({
        input,
        expected,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.match).length;
  console.log(`\n  Result: ${successCount}/${testCases.length} formats working correctly`);

  return results;
}

/**
 * Main test execution
 */
async function main() {
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}PORTUGUESE STOCKS VALIDATION${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY ? 'Configured ✓' : 'Not configured (may fail)'}`);
  console.log(`Stocks to test: ${PORTUGUESE_STOCKS.length}`);

  // Test individual stocks
  console.log(`\n${colors.bold}${colors.blue}INDIVIDUAL STOCK TESTS${colors.reset}`);
  const individualResults = [];

  for (const stock of PORTUGUESE_STOCKS) {
    const result = await testStock(stock.symbol, stock.name);
    individualResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }

  // Test batch quotes
  const batchResult = await testBatchQuotes();

  // Test symbol formats
  const formatResults = await testSymbolFormats();

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bold}SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}========================================${colors.reset}`);

  const successCount = individualResults.filter(r => r.status === 'success').length;
  const failedCount = individualResults.filter(r => r.status === 'failed').length;
  const errorCount = individualResults.filter(r => r.status === 'error').length;

  console.log(`\nIndividual Tests:`);
  console.log(`  ${colors.green}✓ Success: ${successCount}${colors.reset}`);
  console.log(`  ${colors.red}✗ Failed: ${failedCount}${colors.reset}`);
  console.log(`  ${colors.red}✗ Errors: ${errorCount}${colors.reset}`);

  console.log(`\nBatch Test: ${batchResult.status === 'success' ? colors.green + '✓ PASSED' : colors.red + '✗ FAILED'}${colors.reset}`);

  const formatSuccessCount = formatResults.filter(r => r.match).length;
  console.log(`\nFormat Test: ${formatSuccessCount}/${formatResults.length} formats working${colors.reset}`);

  // Overall result
  const overallSuccess = successCount === PORTUGUESE_STOCKS.length &&
                         batchResult.status === 'success' &&
                         formatSuccessCount === formatResults.length;

  console.log(`\n${colors.bold}Overall: ${overallSuccess ? colors.green + '✓ ALL TESTS PASSED' : colors.red + '✗ SOME TESTS FAILED'}${colors.reset}`);

  // Failed stocks details
  if (failedCount > 0 || errorCount > 0) {
    console.log(`\n${colors.bold}${colors.red}FAILED STOCKS:${colors.reset}`);
    individualResults
      .filter(r => r.status !== 'success')
      .forEach(r => {
        console.log(`  - ${r.symbol}: ${r.error || 'Unknown error'}`);
      });
  }

  // Exit code
  process.exit(overallSuccess ? 0 : 1);
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
