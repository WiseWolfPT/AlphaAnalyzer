#!/usr/bin/env node
/**
 * Test script for getProfile() fix
 *
 * Tests 3 stocks:
 * - ARE (REIT)
 * - CVX (Value stock)
 * - C (Bank)
 *
 * Expected: All should return 200 OK (not 500 error)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';
const TEST_STOCKS = [
  { symbol: 'ARE', type: 'REIT' },
  { symbol: 'CVX', type: 'Value' },
  { symbol: 'C', type: 'Bank' }
];

async function testIVEndpoint(symbol, type) {
  const url = `${BASE_URL}/api/iv/${symbol}/chart`;

  try {
    const response = await fetch(url);
    const status = response.status;

    if (status === 200) {
      const data = await response.json();
      console.log(`✅ ${symbol} (${type}): SUCCESS - Got ${data.methods?.length || 0} methods`);
      return { symbol, type, status, success: true };
    } else if (status === 422) {
      const data = await response.json();
      console.log(`⚠️  ${symbol} (${type}): ETF rejection (expected for ETFs) - ${data.error}`);
      return { symbol, type, status, success: true, etf: true };
    } else if (status === 500) {
      const text = await response.text();
      console.log(`❌ ${symbol} (${type}): FAILED with 500 - ${text.substring(0, 200)}`);
      return { symbol, type, status, success: false, error: text };
    } else {
      const text = await response.text();
      console.log(`⚠️  ${symbol} (${type}): Status ${status} - ${text.substring(0, 200)}`);
      return { symbol, type, status, success: false, error: text };
    }
  } catch (error) {
    console.log(`❌ ${symbol} (${type}): Network error - ${error.message}`);
    return { symbol, type, status: 0, success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Testing getProfile() fix with 3 stocks...\n');

  const results = [];

  for (const stock of TEST_STOCKS) {
    const result = await testIVEndpoint(stock.symbol, stock.type);
    results.push(result);

    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Summary:');
  console.log('═'.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (failed.length > 0) {
    console.log('\n⚠️  Failed stocks:');
    failed.forEach(r => {
      console.log(`  - ${r.symbol} (${r.type}): ${r.error?.substring(0, 100) || 'Unknown error'}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! getProfile() fix is working.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
