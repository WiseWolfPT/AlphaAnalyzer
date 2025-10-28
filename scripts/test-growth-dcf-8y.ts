/**
 * FASE 2C: Growth DCF-8Y Test Script
 *
 * Tests the high-growth DCF implementation with 4 stocks:
 * - TSLA (Tesla): High growth, high volatility
 * - NVDA (NVIDIA): 40%+ revenue growth
 * - AMZN (Amazon): Consistent growth
 * - GOOGL (Google): Tech growth leader
 *
 * Validates:
 * 1. IV calculation returns valid numbers (not null, not zero)
 * 2. Growth rates are within expected ranges
 * 3. WACC calculation is reasonable
 * 4. Method works with growth-rate-estimator integration
 */

import { calculateGrowthDCF8Y } from '../server/services/growth-dcf-8y-method';
import { valuationService } from '../server/services/valuation-service';
import { isGrowthStock, getGrowthStockDetails } from '../server/utils/stock-classifier';
import { logger } from '../server/lib/logger';

// Test stocks (ordered by expected growth rate)
const TEST_STOCKS = [
  { ticker: 'NVDA', name: 'NVIDIA', expectedGrowth: '>30%', expectedBeta: '>1.5' },
  { ticker: 'TSLA', name: 'Tesla', expectedGrowth: '>25%', expectedBeta: '>1.8' },
  { ticker: 'AMZN', name: 'Amazon', expectedGrowth: '>20%', expectedBeta: '>1.1' },
  { ticker: 'GOOGL', name: 'Google', expectedGrowth: '>15%', expectedBeta: '>1.0' },
];

interface TestResult {
  ticker: string;
  name: string;
  success: boolean;
  iv: number | null;
  fcf: number | null;
  wacc: number | null;
  growthY1_5: number | null;
  growthY6_8: number | null;
  terminalGrowth: number | null;
  confidence: string | null;
  isGrowthStock: boolean;
  growthReason: string | null;
  error?: string;
  timestamp: string;
}

async function testStock(ticker: string, name: string): Promise<TestResult> {
  const startTime = Date.now();

  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`Testing: ${ticker} (${name})`);
  logger.info('='.repeat(60));

  try {
    // Step 1: Get profile to check if it's a growth stock
    const profile = await valuationService.getProfile(ticker);
    if (!profile) {
      return {
        ticker,
        name,
        success: false,
        iv: null,
        fcf: null,
        wacc: null,
        growthY1_5: null,
        growthY6_8: null,
        terminalGrowth: null,
        confidence: null,
        isGrowthStock: false,
        growthReason: null,
        error: 'Profile data not available',
        timestamp: new Date().toISOString(),
      };
    }

    // Check growth stock classification (using dummy growth rates for now)
    // In production, these would come from historical data
    const beta = profile.beta || 1.0;
    const dummyEpsGrowth = 0.20; // 20% (placeholder)
    const dummyRevenueGrowth = 0.15; // 15% (placeholder)

    const growthDetails = getGrowthStockDetails(
      beta,
      dummyEpsGrowth,
      dummyRevenueGrowth,
      profile.sector
    );

    logger.info(`Growth Stock Classification: ${growthDetails.is_growth_stock ? 'YES' : 'NO'}`);
    if (growthDetails.reason) {
      logger.info(`Reason: ${growthDetails.reason}`);
    }

    // Step 2: Calculate Growth DCF-8Y
    logger.info(`\nCalculating Growth DCF-8Y...`);
    const result = await calculateGrowthDCF8Y(ticker, valuationService);

    if (!result) {
      return {
        ticker,
        name,
        success: false,
        iv: null,
        fcf: null,
        wacc: null,
        growthY1_5: null,
        growthY6_8: null,
        terminalGrowth: null,
        confidence: null,
        isGrowthStock: growthDetails.is_growth_stock,
        growthReason: growthDetails.reason,
        error: 'DCF calculation returned null',
        timestamp: new Date().toISOString(),
      };
    }

    // Step 3: Validate result
    const validations = {
      iv_valid: result.iv > 0 && isFinite(result.iv),
      fcf_valid: result.fcf !== 0 && isFinite(result.fcf),
      wacc_valid: result.wacc > 0.05 && result.wacc < 0.20,
      growth_y1_5_valid: result.growthY1_5 >= 0.05 && result.growthY1_5 <= 0.50,
      growth_y6_8_valid: result.growthY6_8 >= 0.03 && result.growthY6_8 <= 0.15,
      terminal_valid: result.terminalGrowth >= 0.03 && result.terminalGrowth <= 0.05,
    };

    const allValid = Object.values(validations).every(Boolean);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info(`\n✅ SUCCESS - ${ticker}`);
    logger.info(`IV: $${result.iv.toFixed(2)}`);
    logger.info(`FCF: $${result.fcf.toFixed(2)}M`);
    logger.info(`WACC: ${(result.wacc * 100).toFixed(2)}%`);
    logger.info(`Growth Y1-5: ${(result.growthY1_5 * 100).toFixed(2)}%`);
    logger.info(`Growth Y6-8: ${(result.growthY6_8 * 100).toFixed(2)}%`);
    logger.info(`Terminal Growth: ${(result.terminalGrowth * 100).toFixed(2)}%`);
    logger.info(`Confidence: ${result.confidence}`);
    logger.info(`Calculation time: ${elapsedTime}s`);
    logger.info(`Validations: ${JSON.stringify(validations, null, 2)}`);

    return {
      ticker,
      name,
      success: allValid,
      iv: result.iv,
      fcf: result.fcf,
      wacc: result.wacc,
      growthY1_5: result.growthY1_5,
      growthY6_8: result.growthY6_8,
      terminalGrowth: result.terminalGrowth,
      confidence: result.confidence,
      isGrowthStock: growthDetails.is_growth_stock,
      growthReason: growthDetails.reason,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error(`❌ ERROR - ${ticker}: ${error.message}`);

    return {
      ticker,
      name,
      success: false,
      iv: null,
      fcf: null,
      wacc: null,
      growthY1_5: null,
      growthY6_8: null,
      terminalGrowth: null,
      confidence: null,
      isGrowthStock: false,
      growthReason: null,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('FASE 2C: Growth DCF-8Y Validation Test');
  console.log('Testing high-growth stocks with 8-year DCF model');
  console.log('='.repeat(80) + '\n');

  const results: TestResult[] = [];

  // Test all stocks sequentially
  for (const stock of TEST_STOCKS) {
    const result = await testStock(stock.ticker, stock.name);
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY REPORT');
  console.log('='.repeat(80) + '\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%\n`);

  // Detailed results table
  console.log('Detailed Results:');
  console.log('-'.repeat(80));
  console.log(
    `${'Ticker'.padEnd(8)} | ${'IV'.padEnd(12)} | ${'G(Y1-5)'.padEnd(10)} | ${'G(Y6-8)'.padEnd(10)} | ${'WACC'.padEnd(8)} | ${'Status'.padEnd(10)}`
  );
  console.log('-'.repeat(80));

  for (const result of results) {
    const ivStr = result.iv ? `$${result.iv.toFixed(2)}`.padEnd(12) : 'N/A'.padEnd(12);
    const g15Str = result.growthY1_5 ? `${(result.growthY1_5 * 100).toFixed(2)}%`.padEnd(10) : 'N/A'.padEnd(10);
    const g68Str = result.growthY6_8 ? `${(result.growthY6_8 * 100).toFixed(2)}%`.padEnd(10) : 'N/A'.padEnd(10);
    const waccStr = result.wacc ? `${(result.wacc * 100).toFixed(2)}%`.padEnd(8) : 'N/A'.padEnd(8);
    const statusStr = result.success ? '✅ PASS'.padEnd(10) : '❌ FAIL'.padEnd(10);

    console.log(
      `${result.ticker.padEnd(8)} | ${ivStr} | ${g15Str} | ${g68Str} | ${waccStr} | ${statusStr}`
    );

    if (result.error) {
      console.log(`  └─ Error: ${result.error}`);
    }
  }

  console.log('-'.repeat(80) + '\n');

  // Growth Stock Classification Summary
  console.log('Growth Stock Classification:');
  console.log('-'.repeat(80));
  for (const result of results) {
    const classification = result.isGrowthStock ? '✓ Growth Stock' : '✗ Standard Stock';
    console.log(`${result.ticker.padEnd(8)} | ${classification}`);
    if (result.growthReason) {
      console.log(`  └─ ${result.growthReason}`);
    }
  }
  console.log('-'.repeat(80) + '\n');

  // Key Insights
  console.log('Key Insights:');
  console.log('-'.repeat(80));

  const avgIV = results.filter(r => r.iv !== null).reduce((sum, r) => sum + r.iv!, 0) / results.filter(r => r.iv !== null).length;
  const avgGrowthY15 = results.filter(r => r.growthY1_5 !== null).reduce((sum, r) => sum + r.growthY1_5!, 0) / results.filter(r => r.growthY1_5 !== null).length;
  const avgGrowthY68 = results.filter(r => r.growthY6_8 !== null).reduce((sum, r) => sum + r.growthY6_8!, 0) / results.filter(r => r.growthY6_8 !== null).length;
  const avgWACC = results.filter(r => r.wacc !== null).reduce((sum, r) => sum + r.wacc!, 0) / results.filter(r => r.wacc !== null).length;

  console.log(`Average IV: $${avgIV.toFixed(2)}`);
  console.log(`Average Growth (Y1-5): ${(avgGrowthY15 * 100).toFixed(2)}%`);
  console.log(`Average Growth (Y6-8): ${(avgGrowthY68 * 100).toFixed(2)}%`);
  console.log(`Average WACC: ${(avgWACC * 100).toFixed(2)}%`);
  console.log(`Growth rate retention: ${((avgGrowthY68 / avgGrowthY15) * 100).toFixed(1)}%`);
  console.log('-'.repeat(80) + '\n');

  // Export results to JSON
  const fs = await import('fs');
  const outputPath = '/Users/antoniofrancisco/Documents/teste 1/GROWTH_DCF_8Y_TEST_RESULTS.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results exported to: ${outputPath}\n`);

  process.exit(successCount === results.length ? 0 : 1);
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
