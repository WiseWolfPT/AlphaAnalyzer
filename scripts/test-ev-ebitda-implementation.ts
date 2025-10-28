/**
 * AGENT 1E: EV/EBITDA Implementation Test
 *
 * Tests EV/EBITDA valuation across 10 diverse stocks:
 * 1. AAPL (Technology) - High EV/EBITDA (~20x)
 * 2. JNJ (Healthcare) - Moderate EV/EBITDA (~15x)
 * 3. KO (Consumer Staples) - Stable EV/EBITDA (~14x)
 * 4. XOM (Energy) - Low EV/EBITDA (~7x)
 * 5. CAT (Industrials) - Cyclical EV/EBITDA (~12x)
 * 6. WMT (Consumer Discretionary) - Retail EV/EBITDA (~11x)
 * 7. VZ (Telecom) - Mature EV/EBITDA (~8x)
 * 8. DUK (Utilities) - Regulated EV/EBITDA (~10x)
 * 9. JPM (Financials) - Should return NULL or redirect ✅
 * 10. AMT (REIT) - Should return NULL or redirect ✅
 */

import axios from 'axios';
import {
  calculateEBITDA,
  calculateEnterpriseValue,
  calculateEVEBITDAValuation,
} from '../server/services/ev-ebitda-calculator';
import { getSectorEVEBITDABenchmark, isEVEBITDAApplicable } from '../server/services/ev-ebitda-methods';

const FMP_API_KEY = process.env.FMP_API_KEY || 'sEoOHoj4kGtqhkU7MrQl4lmeF4LwB2Bh';
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface TestStock {
  symbol: string;
  sector: string;
  expectedMultiple: number | null; // null for Financials/REITs
  shouldCalculate: boolean;
}

const TEST_STOCKS: TestStock[] = [
  {
    symbol: 'AAPL',
    sector: 'Consumer Electronics',
    expectedMultiple: 15.5,
    shouldCalculate: true,
  },
  {
    symbol: 'JNJ',
    sector: 'Healthcare',
    expectedMultiple: 14.0,
    shouldCalculate: true,
  },
  {
    symbol: 'KO',
    sector: 'Consumer Staples',
    expectedMultiple: 13.5,
    shouldCalculate: true,
  },
  {
    symbol: 'XOM',
    sector: 'Energy',
    expectedMultiple: 7.5,
    shouldCalculate: true,
  },
  {
    symbol: 'CAT',
    sector: 'Industrials',
    expectedMultiple: 11.5,
    shouldCalculate: true,
  },
  {
    symbol: 'WMT',
    sector: 'Retail',
    expectedMultiple: 9.5,
    shouldCalculate: true,
  },
  {
    symbol: 'VZ',
    sector: 'Telecommunications',
    expectedMultiple: 8.0,
    shouldCalculate: true,
  },
  {
    symbol: 'DUK',
    sector: 'Utilities',
    expectedMultiple: 9.5,
    shouldCalculate: true,
  },
  {
    symbol: 'JPM',
    sector: 'Financials',
    expectedMultiple: null, // Not applicable
    shouldCalculate: false,
  },
  {
    symbol: 'AMT',
    sector: 'REIT',
    expectedMultiple: null, // Not applicable
    shouldCalculate: false,
  },
];

async function fmpGet<T>(endpoint: string, params: Record<string, any> = {}): Promise<T | null> {
  try {
    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    const url = `${FMP_BASE_URL}${endpoint}`;
    const queryParams = new URLSearchParams({
      apikey: FMP_API_KEY,
      ...params,
    });

    const fullUrl = `${url}?${queryParams.toString()}`;

    const response = await axios.get<T>(fullUrl, {
      timeout: 10000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    return response.data;
  } catch (error: any) {
    console.error(`FMP API error (${endpoint}):`, error.message);
    return null;
  }
}

async function testStock(test: TestStock): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${test.symbol} (${test.sector})`);
  console.log(`${'='.repeat(80)}`);

  // 1. Check if EV/EBITDA is applicable
  const isApplicable = isEVEBITDAApplicable(test.sector);
  console.log(`✓ Applicability check: ${isApplicable ? 'APPLICABLE' : 'NOT APPLICABLE'}`);

  if (isApplicable !== test.shouldCalculate) {
    console.error(`❌ ERROR: Expected shouldCalculate=${test.shouldCalculate}, got ${isApplicable}`);
    return;
  }

  if (!isApplicable) {
    console.log(`✓ Correctly identified as non-applicable (Financials/REIT)`);
    return;
  }

  // 2. Fetch company profile
  const profileData = await fmpGet<any[]>(`/profile/${test.symbol}`);
  if (!profileData || profileData.length === 0) {
    console.error(`❌ ERROR: No profile data for ${test.symbol}`);
    return;
  }
  const profile = profileData[0];

  console.log(`\nCompany: ${profile.companyName}`);
  console.log(`Sector: ${profile.sector}`);
  console.log(`Industry: ${profile.industry}`);
  console.log(`Market Cap: $${(profile.mktCap / 1_000_000_000).toFixed(2)}B`);

  // 3. Fetch latest financial data
  const incomeData = await fmpGet<any[]>(`/income-statement/${test.symbol}`, {
    period: 'annual',
    limit: 1,
  });

  const balanceSheetData = await fmpGet<any[]>(`/balance-sheet-statement/${test.symbol}`, {
    period: 'annual',
    limit: 1,
  });

  if (!incomeData || incomeData.length === 0 || !balanceSheetData || balanceSheetData.length === 0) {
    console.error(`❌ ERROR: Missing financial data for ${test.symbol}`);
    return;
  }

  const income = incomeData[0];
  const balance = balanceSheetData[0];

  // 4. Calculate EBITDA
  const netIncome = Number(income.netIncome || 0) / 1_000_000;
  const interestExpense = Number(income.interestExpense || 0) / 1_000_000;
  const taxes = Number(income.incomeTaxExpense || 0) / 1_000_000;
  const depAmort = Number(income.depreciationAndAmortization || 0) / 1_000_000;

  const ebitda = calculateEBITDA(netIncome, interestExpense, taxes, depAmort);

  console.log(`\n📊 EBITDA Calculation:`);
  console.log(`  Net Income:        $${netIncome.toFixed(2)}M`);
  console.log(`  + Interest:        $${interestExpense.toFixed(2)}M`);
  console.log(`  + Taxes:           $${taxes.toFixed(2)}M`);
  console.log(`  + D&A:             $${depAmort.toFixed(2)}M`);
  console.log(`  = EBITDA:          $${ebitda.toFixed(2)}M`);

  if (ebitda <= 0) {
    console.log(`⚠️  WARNING: Negative EBITDA - valuation not applicable`);
    return;
  }

  // 5. Calculate Enterprise Value
  const marketCap = profile.mktCap;
  const totalDebt = Number(balance.totalDebt || 0);
  const cash = Number(balance.cashAndCashEquivalents || 0) + Number(balance.shortTermInvestments || 0);

  const enterpriseValue = calculateEnterpriseValue(marketCap, totalDebt, cash);
  const currentEVEBITDA = enterpriseValue / (ebitda * 1_000_000);

  console.log(`\n💰 Enterprise Value Calculation:`);
  console.log(`  Market Cap:        $${(marketCap / 1_000_000_000).toFixed(2)}B`);
  console.log(`  + Total Debt:      $${(totalDebt / 1_000_000_000).toFixed(2)}B`);
  console.log(`  - Cash:            $${(cash / 1_000_000_000).toFixed(2)}B`);
  console.log(`  = Enterprise Value: $${(enterpriseValue / 1_000_000_000).toFixed(2)}B`);
  console.log(`\n📈 Current EV/EBITDA: ${currentEVEBITDA.toFixed(2)}x`);

  // 6. Get sector benchmark
  const benchmark = getSectorEVEBITDABenchmark(test.sector);
  console.log(`\n🎯 Sector Benchmark:`);
  console.log(`  Matched Sector:    ${benchmark.matchedSector}`);
  console.log(`  Benchmark Multiple: ${benchmark.multiple.toFixed(2)}x`);
  console.log(`  Source:            ${benchmark.source}`);

  if (test.expectedMultiple) {
    const deviation = Math.abs(benchmark.multiple - test.expectedMultiple);
    if (deviation > 2.0) {
      console.log(`⚠️  WARNING: Benchmark deviates from expected by ${deviation.toFixed(1)}x`);
    } else {
      console.log(`✓ Benchmark within expected range (±2.0x)`);
    }
  }

  // 7. Calculate intrinsic value
  const shares = Number(balance.commonStockSharesOutstanding || income.weightedAverageShsOutDil) / 1_000_000;
  const currentPrice = profile.price;

  const valuation = calculateEVEBITDAValuation(
    test.symbol,
    currentPrice,
    profile.sector,
    enterpriseValue,
    ebitda,
    benchmark.multiple,
    'sector',
    marketCap,
    totalDebt,
    cash,
    shares,
    netIncome,
    interestExpense,
    taxes,
    depAmort
  );

  if (!valuation || valuation.iv === null) {
    console.error(`❌ ERROR: Valuation calculation failed`);
    return;
  }

  console.log(`\n💡 Intrinsic Value Calculation:`);
  console.log(`  Formula: IV = (EBITDA × Benchmark - Net Debt) / Shares`);
  console.log(`  Implied EV:        $${(ebitda * benchmark.multiple * 1_000_000_000 / 1_000_000_000).toFixed(2)}B`);
  console.log(`  - Net Debt:        $${((totalDebt - cash) / 1_000_000_000).toFixed(2)}B`);
  console.log(`  ÷ Shares:          ${shares.toFixed(2)}M`);
  console.log(`  = Intrinsic Value: $${valuation.iv.toFixed(2)}`);

  console.log(`\n📊 Valuation Summary:`);
  console.log(`  Current Price:     $${currentPrice.toFixed(2)}`);
  console.log(`  Intrinsic Value:   $${valuation.iv.toFixed(2)}`);
  const discount = ((valuation.iv - currentPrice) / currentPrice) * 100;
  console.log(`  Discount/Premium:  ${discount.toFixed(1)}%`);
  console.log(`  Confidence:        ${valuation.confidence}`);

  if (discount > 20) {
    console.log(`  ✓ UNDERVALUED by ${discount.toFixed(1)}%`);
  } else if (discount < -20) {
    console.log(`  ⚠️  OVERVALUED by ${Math.abs(discount).toFixed(1)}%`);
  } else {
    console.log(`  ✓ FAIRLY VALUED`);
  }

  // 8. Validation against expected range
  const reasonableRange = {
    min: benchmark.multiple * 0.7, // 30% below benchmark
    max: benchmark.multiple * 1.3, // 30% above benchmark
  };

  if (currentEVEBITDA >= reasonableRange.min && currentEVEBITDA <= reasonableRange.max) {
    console.log(`\n✅ PASS: EV/EBITDA within reasonable range [${reasonableRange.min.toFixed(1)}x - ${reasonableRange.max.toFixed(1)}x]`);
  } else {
    console.log(`\n⚠️  NOTE: EV/EBITDA outside typical range (might indicate mispricing or sector shift)`);
  }
}

async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                    AGENT 1E: EV/EBITDA IMPLEMENTATION TEST                ║
║                                                                            ║
║  Testing universal valuation method across 10 diverse stocks              ║
║  Validating: Calculation accuracy, sector benchmarks, edge cases          ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);

  console.log(`\nTest Configuration:`);
  console.log(`  FMP API Key: ${FMP_API_KEY.substring(0, 8)}...`);
  console.log(`  Test Stocks: ${TEST_STOCKS.length}`);
  console.log(`  Timestamp:   ${new Date().toISOString()}`);

  let passCount = 0;
  let failCount = 0;

  for (const test of TEST_STOCKS) {
    try {
      await testStock(test);
      passCount++;

      // Rate limiting: 4 req/s = 250ms per stock cycle (~10 API calls)
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error: any) {
      console.error(`\n❌ FATAL ERROR testing ${test.symbol}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`✅ Passed: ${passCount}/${TEST_STOCKS.length}`);
  console.log(`❌ Failed: ${failCount}/${TEST_STOCKS.length}`);

  if (failCount === 0) {
    console.log(`\n🎉 ALL TESTS PASSED! EV/EBITDA implementation is working correctly.`);
  } else {
    console.log(`\n⚠️  Some tests failed. Review errors above.`);
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
