#!/usr/bin/env node

/**
 * Quick 5-stock validation test
 * Tests: NFLX, CRM, HON, TMO, DAL
 */

import { readFileSync } from 'fs';

const FMP_API_KEY = process.env.FMP_API_KEY;
const RATE_LIMIT_DELAY = 300; // 3.33 req/s = 200 calls/min
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000];

if (!FMP_API_KEY) {
  console.error('❌ ERROR: FMP_API_KEY environment variable not set');
  process.exit(1);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 0) {
  try {
    const response = await fetch(url);

    // Circuit breaker: Don't cache 429 responses
    if (response.status === 429) {
      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retries];
        console.log(`  ⚠️  Rate limit hit (429), backing off ${delay}ms... (retry ${retries + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return fetchWithRetry(url, retries + 1);
      }
      throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries`);
    }

    return response;
  } catch (error) {
    if (retries < MAX_RETRIES && error.message !== 'Rate limit exceeded after') {
      const delay = RETRY_DELAYS[retries];
      console.log(`  ⚠️  Network error, backing off ${delay}ms... (retry ${retries + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return fetchWithRetry(url, retries + 1);
    }
    throw error;
  }
}

async function testStock(ticker) {
  const baseUrl = 'https://financialmodelingprep.com/api/v3';
  const apiParam = `?apikey=${FMP_API_KEY}`;
  const limitParam = `?limit=5&apikey=${FMP_API_KEY}`;

  const endpoints = {
    incomeStatement: `${baseUrl}/income-statement/${ticker}${limitParam}`,
    balanceSheet: `${baseUrl}/balance-sheet-statement/${ticker}${limitParam}`,
    cashFlow: `${baseUrl}/cash-flow-statement/${ticker}${limitParam}`,
    profile: `${baseUrl}/profile/${ticker}${apiParam}`,
  };

  const result = {
    ticker,
    incomeStatement: false,
    balanceSheet: false,
    cashFlow: false,
    profile: false,
    yearsAvailable: 0,
    status: 'none',
    error: null,
  };

  try {
    // Test Income Statement
    const incomeResp = await fetchWithRetry(endpoints.incomeStatement);
    await sleep(RATE_LIMIT_DELAY);

    if (incomeResp.ok && incomeResp.status === 200) {
      const incomeData = await incomeResp.json();
      if (Array.isArray(incomeData) && incomeData.length > 0) {
        result.incomeStatement = true;
        result.yearsAvailable = Math.max(result.yearsAvailable, incomeData.length);
      }
    }

    // Test Balance Sheet
    const balanceResp = await fetchWithRetry(endpoints.balanceSheet);
    await sleep(RATE_LIMIT_DELAY);

    if (balanceResp.ok && balanceResp.status === 200) {
      const balanceData = await balanceResp.json();
      if (Array.isArray(balanceData) && balanceData.length > 0) {
        result.balanceSheet = true;
        result.yearsAvailable = Math.max(result.yearsAvailable, balanceData.length);
      }
    }

    // Test Cash Flow
    const cashFlowResp = await fetchWithRetry(endpoints.cashFlow);
    await sleep(RATE_LIMIT_DELAY);

    if (cashFlowResp.ok && cashFlowResp.status === 200) {
      const cashFlowData = await cashFlowResp.json();
      if (Array.isArray(cashFlowData) && cashFlowData.length > 0) {
        result.cashFlow = true;
        result.yearsAvailable = Math.max(result.yearsAvailable, cashFlowData.length);
      }
    }

    // Test Profile
    const profileResp = await fetchWithRetry(endpoints.profile);
    await sleep(RATE_LIMIT_DELAY);

    if (profileResp.ok && profileResp.status === 200) {
      const profileData = await profileResp.json();
      if (Array.isArray(profileData) && profileData.length > 0) {
        result.profile = true;
      }
    }

    // Classify status
    const statementsCount = [result.incomeStatement, result.balanceSheet, result.cashFlow].filter(Boolean).length;

    if (statementsCount === 3) {
      result.status = 'full';
    } else if (statementsCount > 0) {
      result.status = 'partial';
    } else {
      result.status = 'none';
    }

  } catch (error) {
    result.error = error.message;
    result.status = 'error';
  }

  return result;
}

async function main() {
  const testStocks = ['NFLX', 'CRM', 'HON', 'TMO', 'DAL'];

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          5-STOCK VALIDATION TEST (Rate Limit Fix)             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`🎯 Testing: ${testStocks.join(', ')}`);
  console.log(`⏱️  Rate Limit: 3.33 req/s (200 calls/min)`);
  console.log(`🔁 Max Retries: 3 with exponential backoff (2s, 5s, 10s)`);
  console.log(`⚡ Circuit Breaker: Active (won't cache 429s)\n`);
  console.log('━'.repeat(65) + '\n');

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < testStocks.length; i++) {
    const ticker = testStocks[i];
    console.log(`[${i + 1}/${testStocks.length}] Testing ${ticker}...`);

    const result = await testStock(ticker);
    results.push(result);

    const statusIcon = result.status === 'full' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${ticker}: ${result.status.toUpperCase()} | Income: ${result.incomeStatement ? '✅' : '❌'} | Balance: ${result.balanceSheet ? '✅' : '❌'} | Cash Flow: ${result.cashFlow ? '✅' : '❌'} | Profile: ${result.profile ? '✅' : '❌'} | Years: ${result.yearsAvailable}`);

    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    }

    console.log('');
  }

  const runtime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '━'.repeat(65) + '\n');
  console.log('📊 RESULTS SUMMARY:\n');

  const fullCount = results.filter(r => r.status === 'full').length;
  const partialCount = results.filter(r => r.status === 'partial').length;
  const noneCount = results.filter(r => r.status === 'none').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log(`✅ Full Coverage:    ${fullCount}/${testStocks.length} stocks`);
  console.log(`⚠️  Partial Coverage: ${partialCount}/${testStocks.length} stocks`);
  console.log(`❌ No Coverage:      ${noneCount}/${testStocks.length} stocks`);
  console.log(`🔴 Errors:           ${errorCount}/${testStocks.length} stocks`);
  console.log(`\n⏱️  Runtime: ${runtime}s`);
  console.log(`📈 Success Rate: ${((fullCount / testStocks.length) * 100).toFixed(1)}%\n`);

  const passed = fullCount === testStocks.length;

  if (passed) {
    console.log('✅ TEST PASSED: All stocks have full FMP coverage!');
    console.log('🚀 Ready for full 1,493-stock validation.\n');
  } else {
    console.log('⚠️  TEST FAILED: Some stocks missing data.');
    console.log('❌ Do NOT proceed with full validation until issues are resolved.\n');

    results.forEach(r => {
      if (r.status !== 'full') {
        console.log(`   ${r.ticker}: ${r.status} - ${r.error || 'Missing: ' + [!r.incomeStatement && 'Income', !r.balanceSheet && 'Balance', !r.cashFlow && 'CashFlow'].filter(Boolean).join(', ')}`);
      }
    });
  }

  process.exit(passed ? 0 : 1);
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
