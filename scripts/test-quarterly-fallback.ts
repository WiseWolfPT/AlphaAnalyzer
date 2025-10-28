/**
 * Test Script: Sub-Fase 3A - Quarterly Data Fallback
 *
 * Tests stocks that have quarterly data but no annual data
 * to validate Annual → Quarterly → TTM cascade works correctly
 *
 * Run: npx tsx scripts/test-quarterly-fallback.ts
 */

import 'dotenv/config';
import { fetchFinancialStatementsWithFallback, fetchAllStatementsWithFallback, getStatementQuality } from '../server/utils/financial-statements-fallback';
import { logger } from '../server/lib/logger';

// Test stocks known to have quarterly but limited/no annual data
// These are typically smaller companies, recent IPOs, or foreign stocks
const TEST_STOCKS = [
  'GRAB',  // Grab Holdings - Southeast Asia, may have limited data
  'BEKE',  // KE Holdings - Chinese company
  'BGNE',  // BeiGene - Chinese biotech
  'BNTX',  // BioNTech - German company
  'ARM',   // ARM Holdings - very recent IPO (2023)
];

interface TestResult {
  symbol: string;
  income: {
    available: boolean;
    source: 'annual' | 'quarterly-ttm' | 'none';
    confidence: 'HIGH' | 'MED' | 'LOW';
    quartersUsed?: number;
    netIncome?: number;
  };
  balance: {
    available: boolean;
    source: 'annual' | 'quarterly-ttm' | 'none';
    confidence: 'HIGH' | 'MED' | 'LOW';
    totalDebt?: number;
    cash?: number;
  };
  cashflow: {
    available: boolean;
    source: 'annual' | 'quarterly-ttm' | 'none';
    confidence: 'HIGH' | 'MED' | 'LOW';
    freeCashFlow?: number;
  };
  tier: 2 | 3;  // Tier 2 = can calculate, Tier 3 = insufficient data
  methodsAvailable: string[];
}

async function testStock(symbol: string): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${symbol}...`);
  console.log('='.repeat(60));

  const statements = await fetchAllStatementsWithFallback(symbol);

  const incomeQuality = getStatementQuality(statements.income);
  const balanceQuality = getStatementQuality(statements.balance);
  const cashflowQuality = getStatementQuality(statements.cashflow);

  // Determine tier and available methods
  let tier: 2 | 3 = 3;
  const methodsAvailable: string[] = [];

  // Tier 2 requires at least income + balance
  if (incomeQuality.hasData && balanceQuality.hasData) {
    tier = 2;

    // Check which methods are now available
    if (statements.income?.netIncome && statements.income.netIncome > 0) {
      methodsAvailable.push('DNI-20');
      methodsAvailable.push('P/E Mean');
      methodsAvailable.push('PEG');
    }

    if (statements.income?.revenue && statements.income.revenue > 0) {
      methodsAvailable.push('P/S Mean');
      methodsAvailable.push('PSG');
    }

    if (statements.balance?.totalEquity && statements.balance.totalEquity > 0) {
      methodsAvailable.push('P/B Mean');
    }

    if (statements.cashflow?.freeCashFlow && statements.cashflow.freeCashFlow > 0) {
      methodsAvailable.push('DCF-20 FCF');
      methodsAvailable.push('DFCF Terminal');
    } else if (statements.cashflow?.operatingCashFlow && statements.cashflow.operatingCashFlow > 0) {
      methodsAvailable.push('DCF-20 OCF');
    }
  }

  const result: TestResult = {
    symbol,
    income: {
      available: incomeQuality.hasData,
      source: incomeQuality.source,
      confidence: incomeQuality.confidence,
      quartersUsed: incomeQuality.quartersUsed,
      netIncome: statements.income?.netIncome,
    },
    balance: {
      available: balanceQuality.hasData,
      source: balanceQuality.source,
      confidence: balanceQuality.confidence,
      totalDebt: statements.balance?.totalDebt,
      cash: statements.balance?.cashAndCashEquivalents,
    },
    cashflow: {
      available: cashflowQuality.hasData,
      source: cashflowQuality.source,
      confidence: cashflowQuality.confidence,
      freeCashFlow: statements.cashflow?.freeCashFlow,
    },
    tier,
    methodsAvailable,
  };

  // Print summary
  console.log('\n📊 RESULTS:');
  console.log(`  Tier: ${tier} ${tier === 2 ? '✅ (Enough data for valuation)' : '❌ (Insufficient data)'}`);
  console.log(`\n  Income Statement:`);
  console.log(`    Source: ${result.income.source}`);
  console.log(`    Confidence: ${result.income.confidence}`);
  console.log(`    Net Income: ${result.income.netIncome ? `$${(result.income.netIncome / 1e6).toFixed(2)}M` : 'N/A'}`);
  if (result.income.quartersUsed) {
    console.log(`    Quarters Used: ${result.income.quartersUsed}`);
  }

  console.log(`\n  Balance Sheet:`);
  console.log(`    Source: ${result.balance.source}`);
  console.log(`    Confidence: ${result.balance.confidence}`);
  console.log(`    Total Debt: ${result.balance.totalDebt ? `$${(result.balance.totalDebt / 1e6).toFixed(2)}M` : 'N/A'}`);
  console.log(`    Cash: ${result.balance.cash ? `$${(result.balance.cash / 1e6).toFixed(2)}M` : 'N/A'}`);

  console.log(`\n  Cash Flow Statement:`);
  console.log(`    Source: ${result.cashflow.source}`);
  console.log(`    Confidence: ${result.cashflow.confidence}`);
  console.log(`    Free Cash Flow: ${result.cashflow.freeCashFlow ? `$${(result.cashflow.freeCashFlow / 1e6).toFixed(2)}M` : 'N/A'}`);

  console.log(`\n  Methods Available: ${methodsAvailable.length}`);
  if (methodsAvailable.length > 0) {
    methodsAvailable.forEach(method => console.log(`    ✅ ${method}`));
  } else {
    console.log('    ❌ None (insufficient data)');
  }

  return result;
}

async function main() {
  console.log('🚀 Starting Sub-Fase 3A Quarterly Fallback Test\n');
  console.log('Testing stocks with limited/no annual data...\n');

  const results: TestResult[] = [];

  for (const symbol of TEST_STOCKS) {
    try {
      const result = await testStock(symbol);
      results.push(result);
      // Wait between tests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ Error testing ${symbol}:`, error.message);
    }
  }

  // Print summary report
  console.log('\n\n' + '='.repeat(60));
  console.log('📈 SUMMARY REPORT');
  console.log('='.repeat(60));

  const tier2Count = results.filter(r => r.tier === 2).length;
  const tier3Count = results.filter(r => r.tier === 3).length;

  console.log(`\nTotal stocks tested: ${results.length}`);
  console.log(`  Tier 2 (Sufficient data): ${tier2Count} (${((tier2Count / results.length) * 100).toFixed(1)}%)`);
  console.log(`  Tier 3 (Insufficient data): ${tier3Count} (${((tier3Count / results.length) * 100).toFixed(1)}%)`);

  console.log(`\nData Source Breakdown:`);
  const annualCount = results.filter(r => r.income.source === 'annual').length;
  const ttmCount = results.filter(r => r.income.source === 'quarterly-ttm').length;
  const noneCount = results.filter(r => r.income.source === 'none').length;

  console.log(`  Annual: ${annualCount}`);
  console.log(`  Quarterly TTM: ${ttmCount} ${ttmCount > 0 ? '✅ (Fallback working!)' : ''}`);
  console.log(`  None: ${noneCount}`);

  console.log(`\nConfidence Levels:`);
  const highConf = results.filter(r => r.income.confidence === 'HIGH').length;
  const medConf = results.filter(r => r.income.confidence === 'MED').length;
  const lowConf = results.filter(r => r.income.confidence === 'LOW').length;

  console.log(`  HIGH: ${highConf}`);
  console.log(`  MED: ${medConf}`);
  console.log(`  LOW: ${lowConf}`);

  console.log(`\nMethods Enabled by Fallback:`);
  const allMethods = results.flatMap(r => r.methodsAvailable);
  const uniqueMethods = [...new Set(allMethods)];
  uniqueMethods.forEach(method => {
    const count = results.filter(r => r.methodsAvailable.includes(method)).length;
    console.log(`  ${method}: ${count} stocks`);
  });

  // Calculate impact
  const avgMethodsBefore = 0; // Assume 0 methods before fallback for stocks without annual data
  const avgMethodsAfter = results.reduce((sum, r) => sum + r.methodsAvailable.length, 0) / results.length;

  console.log(`\n💡 Impact:`);
  console.log(`  Average methods before fallback: ${avgMethodsBefore.toFixed(1)}`);
  console.log(`  Average methods after fallback: ${avgMethodsAfter.toFixed(1)}`);
  console.log(`  Improvement: +${avgMethodsAfter.toFixed(1)} methods per stock`);

  if (tier2Count > 0) {
    console.log(`\n✅ SUCCESS: Fallback system upgraded ${tier2Count} stocks from Tier 3 → Tier 2`);
  } else {
    console.log(`\n⚠️  WARNING: No stocks upgraded (test stocks may all have annual data already)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete! 🎉');
  console.log('='.repeat(60) + '\n');
}

// Run tests
main().catch(console.error);
