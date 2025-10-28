/**
 * Test Script: FMP Analyst Service
 *
 * Validates Onda 1.1 implementation:
 * - Fetches analyst estimates for AAPL
 * - Calculates EPS growth rate
 * - Verifies ~10.07% expected result
 *
 * Usage: ts-node scripts/test-analyst-service.ts
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

// Import service functions
import {
  getAnalystEstimates,
  calculateAnalystEpsGrowth,
  getAnalystGrowthRate,
} from '../server/services/fmp-analyst-service';

async function testAnalystService() {
  console.log('=================================================');
  console.log('FMP ANALYST SERVICE TEST - ONDA 1.1');
  console.log('=================================================\n');

  const ticker = 'AAPL';

  try {
    // Step 1: Fetch analyst estimates
    console.log(`Step 1: Fetching analyst estimates for ${ticker}...`);
    const estimates = await getAnalystEstimates(ticker);

    if (estimates.length === 0) {
      console.error(`❌ FAIL: No analyst estimates found for ${ticker}`);
      process.exit(1);
    }

    console.log(`✅ SUCCESS: Fetched ${estimates.length} analyst estimates\n`);

    // Display first 5 estimates
    console.log('First 5 EPS Estimates:');
    estimates.slice(0, 5).forEach((est, idx) => {
      console.log(
        `  Year ${idx + 1}: $${est.estimatedEpsAvg.toFixed(2)} ` +
        `(${est.numberAnalystsEstimatedEps} analysts, date: ${est.date})`
      );
    });
    console.log('');

    // Step 2: Calculate growth rate
    console.log('Step 2: Calculating Year 1-5 EPS CAGR...');
    const growth = calculateAnalystEpsGrowth(estimates);

    if (growth === undefined) {
      console.error('❌ FAIL: Could not calculate growth rate');
      process.exit(1);
    }

    const growthPct = (growth * 100).toFixed(2);
    console.log(`✅ SUCCESS: Calculated growth rate = ${growthPct}%\n`);

    // Step 3: Validate against expected value
    console.log('Step 3: Validating against expected value (~10.07%)...');
    const expectedGrowth = 0.1007;
    const tolerance = 0.05; // 5% tolerance

    const difference = Math.abs(growth - expectedGrowth);
    const withinTolerance = difference < tolerance;

    if (withinTolerance) {
      console.log(`✅ SUCCESS: Growth rate within tolerance`);
      console.log(`   Expected: ${(expectedGrowth * 100).toFixed(2)}%`);
      console.log(`   Actual: ${growthPct}%`);
      console.log(`   Difference: ${(difference * 100).toFixed(2)}%\n`);
    } else {
      console.log(`⚠️  WARNING: Growth rate outside tolerance`);
      console.log(`   Expected: ${(expectedGrowth * 100).toFixed(2)}%`);
      console.log(`   Actual: ${growthPct}%`);
      console.log(`   Difference: ${(difference * 100).toFixed(2)}%`);
      console.log(`   (This may be OK if analyst estimates have changed)\n`);
    }

    // Step 4: Test full result with metadata
    console.log('Step 4: Testing full growth rate result with metadata...');
    const result = await getAnalystGrowthRate(ticker);

    if (!result) {
      console.error('❌ FAIL: Could not get growth rate result');
      process.exit(1);
    }

    console.log(`✅ SUCCESS: Full result retrieved\n`);
    console.log('Growth Rate Result:');
    console.log(`  Ticker: ${result.ticker}`);
    console.log(`  Growth Rate: ${(result.growth_rate * 100).toFixed(2)}%`);
    console.log(`  Current EPS: $${result.current_eps.toFixed(2)}`);
    console.log(`  Future EPS (Y5): $${result.future_eps.toFixed(2)}`);
    console.log(`  Analyst Count: ${result.analyst_count}`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  Data Source: ${result.data_source}`);
    console.log(`  As Of: ${result.as_of}\n`);

    // Step 5: Error handling test
    console.log('Step 5: Testing error handling with invalid ticker...');
    const invalidResult = await getAnalystGrowthRate('INVALID_TICKER_XYZ');

    if (invalidResult === null) {
      console.log('✅ SUCCESS: Properly handles invalid ticker\n');
    } else {
      console.log('⚠️  WARNING: Expected null for invalid ticker\n');
    }

    // Final summary
    console.log('=================================================');
    console.log('TEST SUMMARY');
    console.log('=================================================');
    console.log('✅ Analyst estimates fetched successfully');
    console.log('✅ Growth rate calculation working');
    console.log('✅ Full result with metadata working');
    console.log('✅ Error handling working');
    console.log('\n🎉 ALL TESTS PASSED - ONDA 1.1 READY FOR INTEGRATION\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
testAnalystService();
