/**
 * ETF Detection Test Script - ONDA 4.1
 *
 * Tests the enhanced ETF detection system with 10 test cases
 * (5 ETFs + 5 Stocks)
 *
 * Usage: npx tsx scripts/test-etf-detection.ts
 */

import { isETF, getETFReason, getClassificationDetails } from '../server/utils/stock-classifier';

// Test cases: 5 ETFs + 5 Stocks
const testCases = [
  // === ETFs (should be detected) ===
  {
    ticker: 'SPY',
    expected: true,
    type: 'Market ETF',
    description: 'SPDR S&P 500 ETF Trust - Most popular US ETF',
  },
  {
    ticker: 'QQQ',
    expected: true,
    type: 'Nasdaq ETF',
    description: 'Invesco QQQ Trust - Nasdaq-100 tracker',
  },
  {
    ticker: 'XLF',
    expected: true,
    type: 'Sector ETF',
    description: 'Financial Select Sector SPDR Fund',
  },
  {
    ticker: 'ARKK',
    expected: true,
    type: 'Thematic ETF',
    description: 'ARK Innovation ETF',
  },
  {
    ticker: 'GLD',
    expected: true,
    type: 'Commodity ETF',
    description: 'SPDR Gold Shares',
  },

  // === Stocks (should NOT be detected as ETFs) ===
  {
    ticker: 'AAPL',
    expected: false,
    type: 'Stock',
    description: 'Apple Inc.',
  },
  {
    ticker: 'MSFT',
    expected: false,
    type: 'Stock',
    description: 'Microsoft Corporation',
  },
  {
    ticker: 'GOOGL',
    expected: false,
    type: 'Stock',
    description: 'Alphabet Inc.',
  },
  {
    ticker: 'JPM',
    expected: false,
    type: 'Stock',
    description: 'JPMorgan Chase & Co.',
  },
  {
    ticker: 'TSLA',
    expected: false,
    type: 'Stock',
    description: 'Tesla Inc.',
  },
];

/**
 * Mock company profile for testing
 * In production, this would come from FMP API
 */
function getMockProfile(ticker: string) {
  const etfProfiles: Record<string, any> = {
    SPY: {
      type: 'etf',
      companyName: 'SPDR S&P 500 ETF Trust',
      isEtf: true,
    },
    QQQ: {
      type: 'etf',
      companyName: 'Invesco QQQ Trust',
      isEtf: true,
    },
    XLF: {
      type: 'etf',
      companyName: 'Financial Select Sector SPDR Fund',
      isEtf: true,
    },
    ARKK: {
      type: 'etf',
      companyName: 'ARK Innovation ETF',
      isEtf: true,
    },
    GLD: {
      type: 'etf',
      companyName: 'SPDR Gold Shares',
      isEtf: true,
    },
  };

  const stockProfiles: Record<string, any> = {
    AAPL: {
      type: 'stock',
      companyName: 'Apple Inc.',
      isEtf: false,
    },
    MSFT: {
      type: 'stock',
      companyName: 'Microsoft Corporation',
      isEtf: false,
    },
    GOOGL: {
      type: 'stock',
      companyName: 'Alphabet Inc. Class A',
      isEtf: false,
    },
    JPM: {
      type: 'stock',
      companyName: 'JPMorgan Chase & Co.',
      isEtf: false,
    },
    TSLA: {
      type: 'stock',
      companyName: 'Tesla, Inc.',
      isEtf: false,
    },
  };

  return etfProfiles[ticker] || stockProfiles[ticker] || null;
}

/**
 * Run tests
 */
function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ETF DETECTION TEST SUITE - ONDA 4.1');
  console.log('═══════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const profile = getMockProfile(testCase.ticker);
    const result = isETF(testCase.ticker, profile);
    const reason = getETFReason(testCase.ticker, profile);
    const isCorrect = result === testCase.expected;

    if (isCorrect) {
      passed++;
      console.log(`✅ ${testCase.ticker}: PASS`);
    } else {
      failed++;
      console.log(`❌ ${testCase.ticker}: FAIL`);
    }

    console.log(`   Type: ${testCase.type}`);
    console.log(`   Description: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expected ? 'ETF' : 'Stock'}`);
    console.log(`   Detected: ${result ? 'ETF' : 'Stock'}`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total Tests: ${testCases.length}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(
    `  Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`
  );
  console.log('═══════════════════════════════════════════════════════\n');

  // Detailed classification for SPY (example)
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DETAILED CLASSIFICATION EXAMPLE (SPY)');
  console.log('═══════════════════════════════════════════════════════');
  const spyProfile = getMockProfile('SPY');
  const spyDetails = getClassificationDetails('SPY', spyProfile);
  console.log(JSON.stringify(spyDetails, null, 2));
  console.log('');

  // Exit with code 1 if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
