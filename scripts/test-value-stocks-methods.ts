/**
 * SUB-FASE 2D: Test Value Stocks Methods
 *
 * Tests Graham Number and DDM methods with 4 dividend aristocrats:
 * - JNJ (Johnson & Johnson): Healthcare, 61 years dividend growth
 * - PG (Procter & Gamble): Consumer staples, 67 years dividend growth
 * - KO (Coca-Cola): Beverages, 61 years dividend growth
 * - T (AT&T): Telecommunications, high dividend yield
 */

import { valuationService } from '../server/services/valuation-service';
import { logger } from '../server/lib/logger';

const TEST_STOCKS = [
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples' },
  { symbol: 'KO', name: 'Coca-Cola', sector: 'Beverages' },
  { symbol: 'T', name: 'AT&T', sector: 'Telecommunications' }
];

interface TestResult {
  symbol: string;
  name: string;
  sector: string;
  grahamNumber: {
    success: boolean;
    iv: number | null;
    eps: number | null;
    bookValuePerShare: number | null;
    confidence: string | null;
    error?: string;
  };
  ddm: {
    success: boolean;
    iv: number | null;
    annualDividend: number | null;
    dividendGrowthRate: number | null;
    payoutRatio: number | null;
    confidence: string | null;
    warning?: string;
    error?: string;
  };
}

async function testValueStock(symbol: string, name: string, sector: string): Promise<TestResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing ${symbol} - ${name} (${sector})`);
  console.log(`${'='.repeat(80)}\n`);

  const result: TestResult = {
    symbol,
    name,
    sector,
    grahamNumber: { success: false, iv: null, eps: null, bookValuePerShare: null, confidence: null },
    ddm: { success: false, iv: null, annualDividend: null, dividendGrowthRate: null, payoutRatio: null, confidence: null }
  };

  // Test 1: Graham Number
  console.log(`\n[1] Testing Graham Number for ${symbol}...`);
  try {
    const grahamResult = await valuationService.calculateGrahamNumber(symbol);

    if (grahamResult) {
      result.grahamNumber = {
        success: true,
        iv: grahamResult.iv,
        eps: grahamResult.eps,
        bookValuePerShare: grahamResult.bookValuePerShare,
        confidence: grahamResult.confidence
      };

      console.log(`✅ Graham Number calculated successfully:`);
      console.log(`   Intrinsic Value: $${grahamResult.iv.toFixed(2)}`);
      console.log(`   Current Price: $${grahamResult.currentPrice.toFixed(2)}`);
      console.log(`   EPS (TTM): $${grahamResult.eps.toFixed(2)}`);
      console.log(`   Book Value Per Share: $${grahamResult.bookValuePerShare.toFixed(2)}`);
      console.log(`   Confidence: ${grahamResult.confidence}`);

      const discount = ((grahamResult.iv / grahamResult.currentPrice) - 1) * 100;
      console.log(`   Discount: ${discount.toFixed(1)}% ${discount > 0 ? '(undervalued)' : '(overvalued)'}`);
    } else {
      result.grahamNumber.error = 'Method returned null';
      console.log(`❌ Graham Number: No result (likely missing data)`);
    }
  } catch (error: any) {
    result.grahamNumber.error = error.message;
    console.log(`❌ Graham Number failed: ${error.message}`);
  }

  // Test 2: Dividend Discount Model (DDM)
  console.log(`\n[2] Testing DDM for ${symbol}...`);
  try {
    const ddmResult = await valuationService.calculateDDM(symbol);

    if (ddmResult) {
      result.ddm = {
        success: true,
        iv: ddmResult.iv,
        annualDividend: ddmResult.annualDividend,
        dividendGrowthRate: ddmResult.dividendGrowthRate,
        payoutRatio: ddmResult.payoutRatio,
        confidence: ddmResult.confidence,
        warning: ddmResult.warning
      };

      console.log(`✅ DDM calculated successfully:`);
      console.log(`   Intrinsic Value: $${ddmResult.iv.toFixed(2)}`);
      console.log(`   Current Price: $${ddmResult.currentPrice.toFixed(2)}`);
      console.log(`   Annual Dividend: $${ddmResult.annualDividend.toFixed(2)}`);
      console.log(`   Dividend Growth Rate: ${(ddmResult.dividendGrowthRate * 100).toFixed(2)}%`);
      console.log(`   Discount Rate: ${(ddmResult.discountRate * 100).toFixed(2)}%`);
      console.log(`   Payout Ratio: ${(ddmResult.payoutRatio * 100).toFixed(1)}%`);
      console.log(`   Confidence: ${ddmResult.confidence}`);

      if (ddmResult.warning) {
        console.log(`   ⚠️ Warning: ${ddmResult.warning}`);
      }

      const discount = ((ddmResult.iv / ddmResult.currentPrice) - 1) * 100;
      console.log(`   Discount: ${discount.toFixed(1)}% ${discount > 0 ? '(undervalued)' : '(overvalued)'}`);
    } else {
      result.ddm.error = 'Method returned null';
      console.log(`❌ DDM: No result (likely no dividend history)`);
    }
  } catch (error: any) {
    result.ddm.error = error.message;
    console.log(`❌ DDM failed: ${error.message}`);
  }

  return result;
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' SUB-FASE 2D: Value Stocks Methods Test '.padStart(50).padEnd(78) + '║');
  console.log('║' + ' Testing Graham Number & DDM with Dividend Aristocrats '.padStart(55).padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');

  const results: TestResult[] = [];

  for (const stock of TEST_STOCKS) {
    const result = await testValueStock(stock.symbol, stock.name, stock.sector);
    results.push(result);

    // Wait 2 seconds between stocks to avoid rate limits
    if (stock !== TEST_STOCKS[TEST_STOCKS.length - 1]) {
      console.log('\n⏳ Waiting 2 seconds before next stock...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary Report
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('SUMMARY REPORT');
  console.log(`${'='.repeat(80)}\n`);

  console.log('Graham Number Results:');
  console.log('─'.repeat(80));
  results.forEach(r => {
    const status = r.grahamNumber.success ? '✅' : '❌';
    const iv = r.grahamNumber.iv ? `$${r.grahamNumber.iv.toFixed(2)}` : 'N/A';
    const confidence = r.grahamNumber.confidence || 'N/A';
    console.log(`${status} ${r.symbol.padEnd(5)} | IV: ${iv.padEnd(10)} | Confidence: ${confidence.padEnd(5)} | ${r.name}`);
  });

  console.log('\n');
  console.log('DDM Results:');
  console.log('─'.repeat(80));
  results.forEach(r => {
    const status = r.ddm.success ? '✅' : '❌';
    const iv = r.ddm.iv ? `$${r.ddm.iv.toFixed(2)}` : 'N/A';
    const confidence = r.ddm.confidence || 'N/A';
    const payout = r.ddm.payoutRatio !== null ? `${(r.ddm.payoutRatio * 100).toFixed(1)}%` : 'N/A';
    console.log(`${status} ${r.symbol.padEnd(5)} | IV: ${iv.padEnd(10)} | Payout: ${payout.padEnd(6)} | Confidence: ${confidence.padEnd(5)} | ${r.name}`);
    if (r.ddm.warning) {
      console.log(`       ⚠️ ${r.ddm.warning}`);
    }
  });

  // Statistics
  console.log('\n');
  console.log('Statistics:');
  console.log('─'.repeat(80));

  const grahamSuccessCount = results.filter(r => r.grahamNumber.success).length;
  const ddmSuccessCount = results.filter(r => r.ddm.success).length;

  console.log(`Graham Number: ${grahamSuccessCount}/${results.length} stocks successfully valued (${(grahamSuccessCount / results.length * 100).toFixed(0)}%)`);
  console.log(`DDM: ${ddmSuccessCount}/${results.length} stocks successfully valued (${(ddmSuccessCount / results.length * 100).toFixed(0)}%)`);

  const highPayoutStocks = results.filter(r => r.ddm.payoutRatio !== null && r.ddm.payoutRatio > 0.80);
  if (highPayoutStocks.length > 0) {
    console.log(`\n⚠️ High payout ratio warnings: ${highPayoutStocks.length} stocks`);
    highPayoutStocks.forEach(s => {
      console.log(`   - ${s.symbol}: ${(s.ddm.payoutRatio! * 100).toFixed(1)}%`);
    });
  }

  console.log('\n✅ Test completed successfully!\n');
}

// Run tests
main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
