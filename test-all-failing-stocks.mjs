#!/usr/bin/env node
/**
 * Comprehensive test for all 12 previously failing stocks
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

const FAILING_STOCKS = [
  // REITs (5)
  { symbol: 'ARE', category: 'REIT' },
  { symbol: 'BXP', category: 'REIT' },
  { symbol: 'FRT', category: 'REIT' },
  { symbol: 'O', category: 'REIT' },
  { symbol: 'VICI', category: 'REIT' },

  // Value stocks (5)
  { symbol: 'CVX', category: 'Value' },
  { symbol: 'XOM', category: 'Value' },
  { symbol: 'JNJ', category: 'Value' },
  { symbol: 'PG', category: 'Value' },
  { symbol: 'KO', category: 'Value' },

  // Banks (2 known failing)
  { symbol: 'C', category: 'Bank' },
  { symbol: 'WFC', category: 'Bank' }
];

async function testStock(symbol, category) {
  const url = `${BASE_URL}/api/iv/${symbol}/chart`;

  try {
    const response = await fetch(url);
    const status = response.status;

    if (status === 200) {
      const data = await response.json();
      return { symbol, category, status, success: true, methods: data.methods?.length || 0 };
    } else {
      const text = await response.text();
      return { symbol, category, status, success: false, error: text.substring(0, 100) };
    }
  } catch (error) {
    return { symbol, category, status: 0, success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Testing all 12 previously failing stocks...\n');

  const results = [];

  for (const stock of FAILING_STOCKS) {
    const result = await testStock(stock.symbol, stock.category);

    if (result.success) {
      console.log(`✅ ${result.symbol.padEnd(6)} (${result.category.padEnd(5)}): ${result.methods} methods`);
    } else {
      console.log(`❌ ${result.symbol.padEnd(6)} (${result.category.padEnd(5)}): ${result.status} - ${result.error}`);
    }

    results.push(result);

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '═'.repeat(60));

  // Group by category
  const byCategory = results.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = { total: 0, success: 0, failed: 0 };
    acc[r.category].total++;
    if (r.success) acc[r.category].success++;
    else acc[r.category].failed++;
    return acc;
  }, {});

  console.log('\n📊 Results by Category:\n');
  Object.entries(byCategory).forEach(([cat, stats]) => {
    const rate = ((stats.success / stats.total) * 100).toFixed(0);
    const icon = stats.failed === 0 ? '✅' : '⚠️';
    console.log(`${icon} ${cat}: ${stats.success}/${stats.total} (${rate}%)`);
  });

  const totalSuccess = results.filter(r => r.success).length;
  const totalFailed = results.filter(r => !r.success).length;
  const successRate = ((totalSuccess / results.length) * 100).toFixed(1);

  console.log('\n📈 Overall Results:');
  console.log(`   Success: ${totalSuccess}/${results.length} (${successRate}%)`);
  console.log(`   Failed:  ${totalFailed}/${results.length}`);

  if (totalFailed > 0) {
    console.log('\n⚠️  Failed stocks:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.symbol} (${r.category}): ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ Perfect! All stocks working. Bug is fixed.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
