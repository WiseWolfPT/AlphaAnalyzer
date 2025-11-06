/**
 * Materials + REIT Investigation Script
 * Tests failing stocks to identify root causes
 */

import axios from 'axios';

const API_BASE = 'https://128.140.45.28.sslip.io';

// Materials sector (0% pass rate)
const MATERIALS_STOCKS = ['LIN', 'APD', 'SHW', 'ECL', 'NEM', 'FCX', 'DOW', 'DD', 'ALB', 'PPG'];

// REITs (30% pass rate - test failing ones)
const FAILING_REITS = ['PSA', 'EQIX', 'PLD', 'WELL', 'DLR', 'AVB', 'SPG'];

interface InvestigationResult {
  ticker: string;
  status: 'success' | 'http_error' | 'no_methods' | 'low_methods';
  httpStatus?: number;
  methodCount?: number;
  failedMethodCount?: number;
  errorType?: string;
  sampleFailures?: Array<{ method_id: string; reason: string }>;
}

async function testStock(ticker: string): Promise<InvestigationResult> {
  try {
    console.log(`\n[${ticker}] Testing intrinsic value endpoint...`);

    const response = await axios.get(`${API_BASE}/api/iv/${ticker}/chart`, {
      timeout: 30000,
      validateStatus: () => true, // Accept all status codes
    });

    console.log(`[${ticker}] HTTP ${response.status}`);

    if (response.status === 404) {
      return {
        ticker,
        status: 'http_error',
        httpStatus: 404,
        errorType: 'NO_PROFILE',
      };
    }

    if (response.status !== 200) {
      return {
        ticker,
        status: 'http_error',
        httpStatus: response.status,
        errorType: response.data?.error || 'UNKNOWN',
      };
    }

    const data = response.data;
    const methodCount = data.methods?.length || 0;
    const failedCount = data.failedMethods?.length || 0;

    console.log(`[${ticker}] Methods: ${methodCount} success, ${failedCount} failed`);

    if (methodCount === 0) {
      return {
        ticker,
        status: 'no_methods',
        methodCount: 0,
        failedMethodCount: failedCount,
        sampleFailures: data.failedMethods?.slice(0, 3) || [],
      };
    }

    if (methodCount < 8) {
      return {
        ticker,
        status: 'low_methods',
        methodCount,
        failedMethodCount: failedCount,
        sampleFailures: data.failedMethods?.slice(0, 3) || [],
      };
    }

    return {
      ticker,
      status: 'success',
      methodCount,
      failedMethodCount: failedCount,
    };
  } catch (error: any) {
    console.error(`[${ticker}] Request error:`, error.message);
    return {
      ticker,
      status: 'http_error',
      errorType: error.code || 'NETWORK_ERROR',
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('MATERIALS + REIT INVESTIGATION');
  console.log('='.repeat(80));

  // Test Materials sector
  console.log('\n📊 PART 1: MATERIALS SECTOR (0% pass - 10 stocks)');
  console.log('-'.repeat(80));

  const materialsResults: InvestigationResult[] = [];
  for (const ticker of MATERIALS_STOCKS) {
    const result = await testStock(ticker);
    materialsResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }

  // Test failing REITs
  console.log('\n\n🏢 PART 2: REIT SECTOR (30% pass - 7 failing stocks)');
  console.log('-'.repeat(80));

  const reitResults: InvestigationResult[] = [];
  for (const ticker of FAILING_REITS) {
    const result = await testStock(ticker);
    reitResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }

  // Analyze Materials results
  console.log('\n\n📈 MATERIALS ANALYSIS');
  console.log('='.repeat(80));

  const materialsByStatus = materialsResults.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nStatus Distribution:');
  Object.entries(materialsByStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} stocks`);
  });

  const http404Materials = materialsResults.filter(r => r.httpStatus === 404);
  const noMethodsMaterials = materialsResults.filter(r => r.status === 'no_methods');
  const lowMethodsMaterials = materialsResults.filter(r => r.status === 'low_methods');

  if (http404Materials.length > 0) {
    const tickers = http404Materials.map(r => r.ticker).join(', ');
    console.log(`\n❌ HTTP 404 (No Profile): ${tickers}`);
    console.log('   Root Cause: FMP API does not have company profile data');
  }

  if (noMethodsMaterials.length > 0) {
    const tickers = noMethodsMaterials.map(r => r.ticker).join(', ');
    console.log(`\n⚠️  0 Methods: ${tickers}`);
    console.log('\n   Sample Failures:');
    noMethodsMaterials.slice(0, 2).forEach(r => {
      console.log(`\n   ${r.ticker}:`);
      r.sampleFailures?.forEach(f => console.log(`     - ${f.method_id}: ${f.reason}`));
    });
  }

  if (lowMethodsMaterials.length > 0) {
    const tickers = lowMethodsMaterials.map(r => r.ticker).join(', ');
    console.log(`\n⚠️  Low Methods (<8): ${tickers}`);
  }

  // Analyze REIT results
  console.log('\n\n📈 REIT ANALYSIS');
  console.log('='.repeat(80));

  const reitsByStatus = reitResults.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nStatus Distribution:');
  Object.entries(reitsByStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} stocks`);
  });

  const http404REITs = reitResults.filter(r => r.httpStatus === 404);
  const noMethodsREITs = reitResults.filter(r => r.status === 'no_methods');
  const lowMethodsREITs = reitResults.filter(r => r.status === 'low_methods');

  if (http404REITs.length > 0) {
    const tickers = http404REITs.map(r => r.ticker).join(', ');
    console.log(`\n❌ HTTP 404 (No Profile): ${tickers}`);
  }

  if (noMethodsREITs.length > 0) {
    const tickers = noMethodsREITs.map(r => r.ticker).join(', ');
    console.log(`\n⚠️  0 Methods: ${tickers}`);
    console.log('\n   Sample Failures:');
    noMethodsREITs.slice(0, 2).forEach(r => {
      console.log(`\n   ${r.ticker}:`);
      r.sampleFailures?.forEach(f => console.log(`     - ${f.method_id}: ${f.reason}`));
    });
  }

  if (lowMethodsREITs.length > 0) {
    const tickers = lowMethodsREITs.map(r => r.ticker).join(', ');
    console.log(`\n⚠️  Low Methods (<8): ${tickers}`);
  }

  // Final summary
  console.log('\n\n📋 EXECUTIVE SUMMARY');
  console.log('='.repeat(80));

  const materialsRootCause = http404Materials.length > 0
    ? 'API DATA GAP (FMP missing profiles)'
    : noMethodsMaterials.length > 0
    ? 'CALCULATION ERROR (financial data issues)'
    : 'UNKNOWN';

  const reitRootCause = http404REITs.length > 0
    ? 'API DATA GAP (FMP missing profiles)'
    : noMethodsREITs.length > 0
    ? 'REIT METHOD CALCULATION ERROR'
    : 'UNKNOWN';

  console.log(`\nMATERIALS ROOT CAUSE: ${materialsRootCause}`);
  console.log(`REIT ROOT CAUSE: ${reitRootCause}`);

  console.log(`\nMATERIALS FIXABLE: ${materialsRootCause.includes('CALCULATION') ? 'YES' : 'NO'}`);
  console.log(`REIT FIXABLE: ${reitRootCause.includes('CALCULATION') ? 'YES' : 'NO'}`);
}

main().catch(console.error);
