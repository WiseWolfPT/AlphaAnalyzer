/**
 * Test script for Sector Defaults Fallback (Sub-Fase 3B)
 *
 * Tests P/E, P/S, P/B valuation methods with stocks that have missing data
 * to verify sector fallback functionality.
 *
 * Usage:
 *   ts-node scripts/test-sector-fallbacks.ts
 */

import axios from 'axios';

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.MARKET_DATA_API_KEY || '';

interface ValuationResult {
  ticker: string;
  iv: number | null;
  avgPE?: number;
  avgPS?: number;
  avgPB?: number;
  currentPrice: number;
  confidence: string;
  usedFallback?: boolean;
}

interface TestStock {
  ticker: string;
  sector: string;
  expectedIssue: string;
  description: string;
}

/**
 * Test stocks with known data issues
 * These should trigger sector fallbacks
 */
const TEST_STOCKS: TestStock[] = [
  {
    ticker: 'SPCE',
    sector: 'Industrials',
    expectedIssue: 'Negative EPS (growth company)',
    description: 'Virgin Galactic - space tourism startup with no positive earnings yet'
  },
  {
    ticker: 'UBER',
    sector: 'Technology',
    expectedIssue: 'Inconsistent earnings history',
    description: 'Uber - recently profitable, limited historical P/E data'
  },
  {
    ticker: 'DASH',
    sector: 'Technology',
    expectedIssue: 'Negative earnings',
    description: 'DoorDash - growth company with negative/volatile earnings'
  },
  {
    ticker: 'SNAP',
    sector: 'Communication Services',
    expectedIssue: 'Negative earnings',
    description: 'Snap Inc - social media company with inconsistent profitability'
  },
  {
    ticker: 'LCID',
    sector: 'Consumer Cyclical',
    expectedIssue: 'No earnings (EV startup)',
    description: 'Lucid Motors - early-stage EV manufacturer'
  }
];

/**
 * Fetch valuation with specific method
 */
async function fetchValuation(ticker: string, method: string): Promise<ValuationResult | null> {
  try {
    const url = `${API_BASE}/api/valuation/intrinsic-value/${ticker}?method=${method}`;
    const headers: Record<string, string> = {};

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const response = await axios.get(url, { headers, timeout: 30000 });

    if (response.data && response.data.iv !== null) {
      return response.data;
    }

    return null;
  } catch (error: any) {
    if (error.response) {
      console.error(`  ❌ Error ${error.response.status}: ${error.response.data?.error || 'Unknown error'}`);
    } else {
      console.error(`  ❌ Network error: ${error.message}`);
    }
    return null;
  }
}

/**
 * Test a single stock with all three methods
 */
async function testStock(stock: TestStock): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 Testing: ${stock.ticker} - ${stock.description}`);
  console.log(`   Sector: ${stock.sector}`);
  console.log(`   Expected Issue: ${stock.expectedIssue}`);
  console.log(`${'='.repeat(80)}`);

  const methods = ['pe', 'ps', 'pb'];
  const results: Record<string, ValuationResult | null> = {};

  for (const method of methods) {
    console.log(`\n🔍 Testing ${method.toUpperCase()} method...`);
    const result = await fetchValuation(stock.ticker, method);
    results[method] = result;

    if (result) {
      console.log(`  ✅ Method returned result:`);
      console.log(`     IV: $${result.iv?.toFixed(2) || 'N/A'}`);
      console.log(`     Current Price: $${result.currentPrice?.toFixed(2) || 'N/A'}`);
      console.log(`     Confidence: ${result.confidence}`);

      if (method === 'pe' && result.avgPE) {
        console.log(`     Avg P/E: ${result.avgPE.toFixed(2)}`);
      } else if (method === 'ps' && result.avgPS) {
        console.log(`     Avg P/S: ${result.avgPS.toFixed(2)}`);
      } else if (method === 'pb' && result.avgPB) {
        console.log(`     Avg P/B: ${result.avgPB.toFixed(2)}`);
      }

      // Low confidence indicates sector fallback was likely used
      if (result.confidence === 'LOW') {
        console.log(`     🎯 SECTOR FALLBACK LIKELY USED (confidence: LOW)`);
      }
    } else {
      console.log(`  ❌ Method returned NULL (no fallback worked)`);
    }

    // Rate limit: wait 300ms between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary for this stock
  console.log(`\n📈 Summary for ${stock.ticker}:`);
  const successfulMethods = methods.filter(m => results[m] !== null);
  console.log(`   Methods Available: ${successfulMethods.length}/3 (${successfulMethods.join(', ').toUpperCase()})`);

  if (successfulMethods.length === 0) {
    console.log(`   ⚠️  WARNING: No methods worked - sector fallback may be failing`);
  } else if (successfulMethods.length < 3) {
    console.log(`   ℹ️  Partial success - some methods still returning NULL`);
  } else {
    console.log(`   ✅ SUCCESS: All methods now work with sector fallbacks!`);
  }
}

/**
 * Test all stocks and generate report
 */
async function runTests(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        Sub-Fase 3B: Sector Defaults Fallback - Integration Test             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n🔧 Configuration:`);
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   API Key: ${API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Test Stocks: ${TEST_STOCKS.length}`);

  const startTime = Date.now();
  const stockResults: Record<string, number> = {};

  for (const stock of TEST_STOCKS) {
    await testStock(stock);

    // Count successful methods for this stock
    const methods = ['pe', 'ps', 'pb'];
    let successCount = 0;

    for (const method of methods) {
      const result = await fetchValuation(stock.ticker, method);
      if (result !== null) successCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    stockResults[stock.ticker] = successCount;

    // Wait between stocks to avoid rate limits
    console.log(`\n⏳ Waiting 2 seconds before next stock...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final report
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║                            FINAL REPORT                                      ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);

  console.log(`\n📊 Results by Stock:`);
  let totalMethods = 0;
  let totalSuccessful = 0;

  for (const stock of TEST_STOCKS) {
    const count = stockResults[stock.ticker];
    totalMethods += 3;
    totalSuccessful += count;

    const icon = count === 3 ? '✅' : count > 0 ? '⚠️' : '❌';
    console.log(`   ${icon} ${stock.ticker.padEnd(6)} - ${count}/3 methods (${stock.sector})`);
  }

  const successRate = ((totalSuccessful / totalMethods) * 100).toFixed(1);

  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Methods Tested: ${totalMethods}`);
  console.log(`   Successful Methods: ${totalSuccessful}`);
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`   Duration: ${duration}s`);

  console.log(`\n🎯 Expected Impact:`);
  console.log(`   BEFORE: Many of these stocks would return NULL (0% success)`);
  console.log(`   AFTER: Sector fallbacks provide estimates (target: >80% success)`);

  if (Number(successRate) >= 80) {
    console.log(`\n   ✅ SUCCESS: Sector fallbacks are working as expected!`);
  } else if (Number(successRate) >= 50) {
    console.log(`\n   ⚠️  PARTIAL: Some methods still failing - may need tuning`);
  } else {
    console.log(`\n   ❌ FAILURE: Sector fallbacks not working - investigation needed`);
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});
