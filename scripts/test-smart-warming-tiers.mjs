#!/usr/bin/env node

/**
 * AGENT 12: Smart Warming Tiers - Validation Script
 *
 * Tests tier configuration and API call projections
 */

import {
  getStockTier,
  getRefreshInterval,
  getStockPriority,
  shouldWarm,
  getTierStats,
  calculateExpectedApiCalls,
  initializeTiers,
  getStocksByTier
} from '../server/data/stock-tiers.ts';

console.log('🧪 AGENT 12: Smart Warming Tiers Validation\n');
console.log('═'.repeat(60));

// Mock universe data
const mockSP100 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
const mockSP500 = ['TSLA', 'AMD', 'INTC', 'QCOM', 'TXN'];
const mockExtended = ['ROKU', 'SNAP', 'SPOT', 'SQ', 'SHOP'];

console.log('\n1️⃣  INITIALIZING TIERS...\n');
initializeTiers(mockSP100, mockSP500, mockExtended);

const tierStats = getTierStats();
console.log('Tier Statistics:');
console.log(`  Tier 1 (HOT):    ${tierStats.tier1_hot.count} stocks`);
console.log(`  Tier 2 (WARM):   ${tierStats.tier2_warm.count} stocks`);
console.log(`  Tier 3 (COLD):   ${tierStats.tier3_cold.count} stocks`);
console.log(`  Total:           ${tierStats.total} stocks`);

console.log('\n2️⃣  TESTING TIER IDENTIFICATION...\n');

const testTickers = [
  { ticker: 'AAPL', expectedTier: 'tier1_hot', expectedPriority: 10 },
  { ticker: 'MSFT', expectedTier: 'tier1_hot', expectedPriority: 10 },
  { ticker: 'TSLA', expectedTier: 'tier2_warm', expectedPriority: 5 },
  { ticker: 'AMD', expectedTier: 'tier2_warm', expectedPriority: 5 },
  { ticker: 'ROKU', expectedTier: 'tier3_cold', expectedPriority: 1 },
  { ticker: 'SNAP', expectedTier: 'tier3_cold', expectedPriority: 1 }
];

let passed = 0;
let failed = 0;

for (const { ticker, expectedTier, expectedPriority } of testTickers) {
  const tier = getStockTier(ticker);
  const priority = getStockPriority(ticker);

  if (tier === expectedTier && priority === expectedPriority) {
    console.log(`  ✅ ${ticker.padEnd(5)} → ${tier} (priority ${priority})`);
    passed++;
  } else {
    console.log(`  ❌ ${ticker.padEnd(5)} → Expected ${expectedTier}, got ${tier}`);
    failed++;
  }
}

console.log('\n3️⃣  TESTING REFRESH INTERVALS...\n');

const intervalTests = [
  { ticker: 'AAPL', marketOpen: true, expected: 5 * 60 * 1000, desc: 'Tier 1, market open' },
  { ticker: 'AAPL', marketOpen: false, expected: 30 * 60 * 1000, desc: 'Tier 1, after hours' },
  { ticker: 'TSLA', marketOpen: true, expected: 30 * 60 * 1000, desc: 'Tier 2, market open' },
  { ticker: 'TSLA', marketOpen: false, expected: 2 * 60 * 60 * 1000, desc: 'Tier 2, after hours' },
  { ticker: 'ROKU', marketOpen: true, expected: 24 * 60 * 60 * 1000, desc: 'Tier 3, on-demand' }
];

for (const { ticker, marketOpen, expected, desc } of intervalTests) {
  const interval = getRefreshInterval(ticker, marketOpen);

  if (interval === expected) {
    const minutes = Math.round(interval / 60000);
    console.log(`  ✅ ${desc.padEnd(30)} → ${minutes} min`);
    passed++;
  } else {
    console.log(`  ❌ ${desc.padEnd(30)} → Expected ${expected / 60000} min, got ${interval / 60000} min`);
    failed++;
  }
}

console.log('\n4️⃣  TESTING WARMING LOGIC...\n');

const warmingTests = [
  {
    ticker: 'AAPL',
    lastWarmed: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    marketOpen: true,
    expected: true,
    desc: 'Tier 1, stale (>5 min during market)'
  },
  {
    ticker: 'AAPL',
    lastWarmed: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
    marketOpen: true,
    expected: false,
    desc: 'Tier 1, fresh (<5 min during market)'
  },
  {
    ticker: 'TSLA',
    lastWarmed: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
    marketOpen: true,
    expected: true,
    desc: 'Tier 2, stale (>30 min during market)'
  },
  {
    ticker: 'ROKU',
    lastWarmed: null,
    marketOpen: true,
    expected: true,
    desc: 'Tier 3, never warmed'
  }
];

for (const { ticker, lastWarmed, marketOpen, expected, desc } of warmingTests) {
  const needsWarm = shouldWarm(ticker, lastWarmed, marketOpen);

  if (needsWarm === expected) {
    console.log(`  ✅ ${desc.padEnd(40)} → ${needsWarm ? 'WARM' : 'SKIP'}`);
    passed++;
  } else {
    console.log(`  ❌ ${desc.padEnd(40)} → Expected ${expected}, got ${needsWarm}`);
    failed++;
  }
}

console.log('\n5️⃣  API CALL PROJECTION...\n');

const apiProjection = calculateExpectedApiCalls();

console.log('Expected Daily API Calls:');
console.log(`  Tier 1:          ${apiProjection.tier1.toLocaleString()} calls`);
console.log(`  Tier 2:          ${apiProjection.tier2.toLocaleString()} calls`);
console.log(`  Tier 3:          ${apiProjection.tier3.toLocaleString()} calls`);
console.log(`  Total:           ${apiProjection.total.toLocaleString()} calls`);
console.log(`  Reduction:       ${apiProjection.reduction}% vs hourly warming`);

// Validate reduction is significant
if (apiProjection.reduction > 0) {
  console.log(`\n  ✅ API call reduction: ${apiProjection.reduction}%`);
  passed++;
} else {
  console.log(`\n  ❌ No API call reduction achieved`);
  failed++;
}

console.log('\n6️⃣  TIER RETRIEVAL...\n');

const tier1Stocks = getStocksByTier('tier1_hot');
const tier2Stocks = getStocksByTier('tier2_warm');
const tier3Stocks = getStocksByTier('tier3_cold');

console.log(`  Tier 1 stocks: ${tier1Stocks.join(', ')}`);
console.log(`  Tier 2 stocks: ${tier2Stocks.join(', ')}`);
console.log(`  Tier 3 stocks: ${tier3Stocks.join(', ')}`);

if (tier1Stocks.includes('AAPL') && tier2Stocks.includes('TSLA') && tier3Stocks.includes('ROKU')) {
  console.log(`\n  ✅ Tier retrieval working correctly`);
  passed++;
} else {
  console.log(`\n  ❌ Tier retrieval failed`);
  failed++;
}

console.log('\n═'.repeat(60));
console.log(`\n📊 TEST RESULTS: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ ALL TESTS PASSED - Smart Warming Tiers working correctly!\n');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - Review implementation\n');
  process.exit(1);
}
