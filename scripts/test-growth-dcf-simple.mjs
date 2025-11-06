/**
 * FASE 2C: Simple Growth DCF-8Y Test (ESM)
 *
 * Tests the calculateGrowthDCF8Y method with 4 growth stocks
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test stocks
const TEST_STOCKS = [
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'TSLA', name: 'Tesla' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'GOOGL', name: 'Google' },
];

async function testGrowthDCF() {
  console.log('\n' + '='.repeat(80));
  console.log('FASE 2C: Growth DCF-8Y Test');
  console.log('='.repeat(80) + '\n');

  // Import the growth DCF method
  const growthDCFModule = await import('../server/services/growth-dcf-8y-method.ts');
  const valuationServiceModule = await import('../server/services/valuation-service.ts');

  const { calculateGrowthDCF8Y } = growthDCFModule;
  const { valuationService } = valuationServiceModule;

  const results = [];

  for (const stock of TEST_STOCKS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${stock.ticker} (${stock.name})`);
    console.log('='.repeat(60));

    try {
      const result = await calculateGrowthDCF8Y(stock.ticker, valuationService);

      if (result) {
        console.log(`✅ SUCCESS`);
        console.log(`  IV: $${result.iv.toFixed(2)}`);
        console.log(`  FCF: $${result.fcf.toFixed(2)}M`);
        console.log(`  WACC: ${(result.wacc * 100).toFixed(2)}%`);
        console.log(`  Growth Y1-5: ${(result.growthY1_5 * 100).toFixed(2)}%`);
        console.log(`  Growth Y6-8: ${(result.growthY6_8 * 100).toFixed(2)}%`);
        console.log(`  Terminal: ${(result.terminalGrowth * 100).toFixed(2)}%`);
        console.log(`  Confidence: ${result.confidence}`);

        results.push({
          ticker: stock.ticker,
          name: stock.name,
          success: true,
          iv: result.iv,
          fcf: result.fcf,
          wacc: result.wacc,
          growthY1_5: result.growthY1_5,
          growthY6_8: result.growthY6_8,
          terminalGrowth: result.terminalGrowth,
          confidence: result.confidence,
        });
      } else {
        console.log(`❌ FAILED - Method returned null`);
        results.push({
          ticker: stock.ticker,
          name: stock.name,
          success: false,
          error: 'Method returned null',
        });
      }
    } catch (error) {
      console.log(`❌ ERROR - ${error.message}`);
      results.push({
        ticker: stock.ticker,
        name: stock.name,
        success: false,
        error: error.message,
      });
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  const successCount = results.filter(r => r.success).length;
  console.log(`Total: ${results.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${results.length - successCount}\n`);

  // Results table
  console.log('Results:');
  console.log('-'.repeat(80));
  results.forEach(r => {
    if (r.success) {
      console.log(`${r.ticker.padEnd(8)} | IV=$${r.iv.toFixed(2).padEnd(10)} | G(Y1-5)=${(r.growthY1_5 * 100).toFixed(2)}% | ✅`);
    } else {
      console.log(`${r.ticker.padEnd(8)} | ${r.error.substring(0, 50)} | ❌`);
    }
  });
  console.log('-'.repeat(80) + '\n');

  // Save results
  const fs = await import('fs');
  fs.writeFileSync(
    join(__dirname, '..', 'GROWTH_DCF_8Y_RESULTS.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Results saved to: GROWTH_DCF_8Y_RESULTS.json\n');

  process.exit(successCount === results.length ? 0 : 1);
}

testGrowthDCF().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
