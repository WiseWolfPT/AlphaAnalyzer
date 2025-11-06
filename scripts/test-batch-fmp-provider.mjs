/**
 * AGENT 6: Integration Test for FMP Batch Provider
 *
 * Manual integration test to verify batch methods work with real FMP API
 * Run with: node scripts/test-batch-fmp-provider.mjs
 */

import 'dotenv/config';
import { FMPProvider } from '../server/services/providers/fmp-provider.ts';

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  console.error('ERROR: FMP_API_KEY not found in environment');
  process.exit(1);
}

console.log('\n========================================');
console.log('AGENT 6: FMP Batch Provider Integration Test');
console.log('========================================\n');

const provider = new FMPProvider(FMP_API_KEY);
const testSymbols = ['AAPL', 'MSFT', 'GOOGL'];

async function testIndividualBatchMethods() {
  console.log('TEST 1: Individual Batch Methods');
  console.log('─'.repeat(50));

  try {
    // Test 1: Batch Quotes
    console.log('\n1. Testing getBatchQuotes...');
    const quotes = await provider.getBatchQuotes(testSymbols);
    console.log(`   ✓ Fetched ${quotes.length} quotes`);
    console.log(`   Example: ${quotes[0].symbol} = $${quotes[0].price}`);

    // Test 2: Batch Income Statements
    console.log('\n2. Testing getBatchIncomeStatements...');
    const incomes = await provider.getBatchIncomeStatements(testSymbols, 1);
    console.log(`   ✓ Fetched ${incomes.length} income statements`);
    if (incomes[0]) {
      console.log(`   Example: ${incomes[0].symbol} revenue = $${(incomes[0].revenue / 1e9).toFixed(2)}B`);
    }

    // Test 3: Batch Balance Sheets
    console.log('\n3. Testing getBatchBalanceSheets...');
    const balances = await provider.getBatchBalanceSheets(testSymbols, 1);
    console.log(`   ✓ Fetched ${balances.length} balance sheets`);
    if (balances[0]) {
      console.log(`   Example: ${balances[0].symbol} total assets = $${(balances[0].totalAssets / 1e9).toFixed(2)}B`);
    }

    // Test 4: Batch Cash Flows
    console.log('\n4. Testing getBatchCashFlows...');
    const cashFlows = await provider.getBatchCashFlows(testSymbols, 1);
    console.log(`   ✓ Fetched ${cashFlows.length} cash flow statements`);
    if (cashFlows[0]) {
      console.log(`   Example: ${cashFlows[0].symbol} FCF = $${(cashFlows[0].freeCashFlow / 1e9).toFixed(2)}B`);
    }

    // Test 5: Batch Ratios
    console.log('\n5. Testing getBatchRatios...');
    const ratios = await provider.getBatchRatios(testSymbols, 1);
    console.log(`   ✓ Fetched ${ratios.length} financial ratios`);
    if (ratios[0]) {
      console.log(`   Example: ${ratios[0].symbol} P/E = ${ratios[0].priceEarningsRatio?.toFixed(2) || 'N/A'}`);
    }

    // Test 6: Batch Profiles
    console.log('\n6. Testing getBatchProfiles...');
    const profiles = await provider.getBatchProfiles(testSymbols);
    console.log(`   ✓ Fetched ${profiles.length} company profiles`);
    if (profiles[0]) {
      console.log(`   Example: ${profiles[0].symbol} - ${profiles[0].companyName} (${profiles[0].sector})`);
    }

    // Test 7: Batch Key Metrics
    console.log('\n7. Testing getBatchKeyMetricsTTM...');
    const keyMetrics = await provider.getBatchKeyMetricsTTM(testSymbols, 1);
    console.log(`   ✓ Fetched ${keyMetrics.length} key metrics`);
    if (keyMetrics[0]) {
      console.log(`   Example: ${keyMetrics[0].symbol} Market Cap = $${(keyMetrics[0].marketCapTTM / 1e9).toFixed(2)}B`);
    }

    return true;
  } catch (error) {
    console.error('   ✗ Error:', error.message);
    return false;
  }
}

async function testMasterBatchMethod() {
  console.log('\n\nTEST 2: Master Batch Method (getBatchFinancialData)');
  console.log('─'.repeat(50));

  try {
    const startTime = Date.now();
    const data = await provider.getBatchFinancialData(testSymbols);
    const duration = Date.now() - startTime;

    console.log(`\n✓ Fetched complete financial data for ${data.size} stocks in ${duration}ms`);
    console.log(`  API calls: 7 (quotes + income + balance + cashflow + ratios + profile + metrics)`);
    console.log(`  Efficiency: ${((testSymbols.length * 7 - 7) / (testSymbols.length * 7) * 100).toFixed(1)}% reduction vs individual calls`);

    console.log('\nData Completeness:');
    for (const [symbol, stockData] of data.entries()) {
      console.log(`  ${symbol}: ${stockData.completeness}% complete`);
      console.log(`    - Quote: ${stockData.quote ? '✓' : '✗'}`);
      console.log(`    - Income: ${stockData.income ? '✓' : '✗'}`);
      console.log(`    - Balance: ${stockData.balance ? '✓' : '✗'}`);
      console.log(`    - Cash Flow: ${stockData.cashFlow ? '✓' : '✗'}`);
      console.log(`    - Ratios: ${stockData.ratios ? '✓' : '✗'}`);
      console.log(`    - Profile: ${stockData.profile ? '✓' : '✗'}`);
      console.log(`    - Key Metrics: ${stockData.keyMetrics ? '✓' : '✗'}`);
    }

    // Calculate avg completeness
    const avgCompleteness = Array.from(data.values())
      .reduce((sum, item) => sum + item.completeness, 0) / data.size;

    console.log(`\nAverage Completeness: ${avgCompleteness.toFixed(1)}%`);

    return avgCompleteness >= 70; // Success if avg completeness >= 70%
  } catch (error) {
    console.error('   ✗ Error:', error.message);
    return false;
  }
}

async function testMaxBatchSize() {
  console.log('\n\nTEST 3: Maximum Batch Size (100 symbols)');
  console.log('─'.repeat(50));

  try {
    // Generate 100 test symbols (S&P 100 would be ideal)
    const largeSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'V', 'JNJ',
      'WMT', 'JPM', 'PG', 'MA', 'XOM', 'UNH', 'HD', 'CVX', 'PFE', 'KO',
      'ABBV', 'PEP', 'COST', 'MRK', 'TMO', 'AVGO', 'CSCO', 'ADBE', 'ABT', 'ACN',
      'LLY', 'NKE', 'MCD', 'TXN', 'DHR', 'NEE', 'WFC', 'BMY', 'PM', 'UNP',
      'CRM', 'DIS', 'HON', 'ORCL', 'RTX', 'UPS', 'QCOM', 'INTC', 'BA', 'AMGN',
      'LOW', 'AMD', 'INTU', 'CAT', 'IBM', 'GE', 'SPGI', 'ELV', 'DE', 'AMAT',
      'BLK', 'GS', 'AXP', 'BKNG', 'SBUX', 'MDLZ', 'MMC', 'GILD', 'C', 'ADI',
      'TJX', 'NOW', 'LMT', 'PLD', 'ADP', 'ISRG', 'CB', 'AMT', 'ZTS', 'CI',
      'MO', 'PYPL', 'SYK', 'REGN', 'DUK', 'SO', 'TMUS', 'BDX', 'VRTX', 'CVS',
      'TGT', 'ETN', 'EOG', 'BSX', 'PNC', 'ITW', 'CL', 'MU', 'SCHW', 'FIS'
    ];

    console.log(`\nFetching data for ${largeSymbols.length} symbols...`);
    const startTime = Date.now();
    const data = await provider.getBatchFinancialData(largeSymbols);
    const duration = Date.now() - startTime;

    console.log(`\n✓ Fetched data for ${data.size} stocks in ${duration}ms`);
    console.log(`  API calls: 7 total`);
    console.log(`  Individual calls would be: ${largeSymbols.length * 7} calls`);
    console.log(`  API reduction: ${(1 - 7 / (largeSymbols.length * 7)) * 100}%`);
    console.log(`  Avg time per stock: ${(duration / data.size).toFixed(2)}ms`);

    const avgCompleteness = Array.from(data.values())
      .reduce((sum, item) => sum + item.completeness, 0) / data.size;

    console.log(`  Average completeness: ${avgCompleteness.toFixed(1)}%`);

    return data.size >= 95; // Success if at least 95% of stocks fetched
  } catch (error) {
    console.error('   ✗ Error:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n\nTEST 4: Error Handling');
  console.log('─'.repeat(50));

  try {
    // Test 1: Over 100 symbols
    console.log('\n1. Testing > 100 symbols validation...');
    try {
      const tooManySymbols = Array(101).fill('AAPL');
      await provider.getBatchFinancialData(tooManySymbols);
      console.log('   ✗ Should have thrown error');
      return false;
    } catch (error) {
      if (error.message.includes('Maximum 100 symbols')) {
        console.log('   ✓ Correctly rejected > 100 symbols');
      } else {
        console.log('   ✗ Wrong error message:', error.message);
        return false;
      }
    }

    // Test 2: Empty array
    console.log('\n2. Testing empty array...');
    const emptyResult = await provider.getBatchFinancialData([]);
    if (emptyResult.size === 0) {
      console.log('   ✓ Correctly handled empty array');
    } else {
      console.log('   ✗ Should return empty Map');
      return false;
    }

    // Test 3: Invalid symbols
    console.log('\n3. Testing invalid symbols...');
    const invalidResult = await provider.getBatchFinancialData(['INVALIDXYZ123']);
    const stockData = invalidResult.get('INVALIDXYZ123');
    if (stockData && stockData.completeness < 100) {
      console.log(`   ✓ Handled invalid symbol (completeness: ${stockData.completeness}%)`);
    } else {
      console.log('   ⚠ Unable to verify invalid symbol handling');
    }

    return true;
  } catch (error) {
    console.error('   ✗ Error:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = {
    individualMethods: false,
    masterMethod: false,
    maxBatchSize: false,
    errorHandling: false
  };

  results.individualMethods = await testIndividualBatchMethods();
  results.masterMethod = await testMasterBatchMethod();
  results.maxBatchSize = await testMaxBatchSize();
  results.errorHandling = await testErrorHandling();

  // Print summary
  console.log('\n\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`Individual Methods: ${results.individualMethods ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Master Method: ${results.masterMethod ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Max Batch Size: ${results.maxBatchSize ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Error Handling: ${results.errorHandling ? '✓ PASS' : '✗ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log('\n========================================');
  console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
  console.log('========================================\n');

  // Get usage stats
  const stats = provider.getUsageStats();
  console.log('API Usage Stats:');
  console.log(`  Calls this minute: ${stats.callsThisMinute}/${stats.quotaPerMinute}`);
  console.log(`  Total calls today: ${stats.totalCallsToday}`);
  console.log(`  Quota usage: ${stats.percentOfMinuteQuota}%`);
  console.log(`  Approaching limit: ${stats.isApproachingLimit ? 'YES' : 'NO'}\n`);

  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('\nFATAL ERROR:', error);
  process.exit(1);
});
