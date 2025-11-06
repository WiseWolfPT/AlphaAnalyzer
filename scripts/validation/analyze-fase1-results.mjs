#!/usr/bin/env node

/**
 * FASE 1 - Agent 1.1: Results Analyzer
 *
 * Analyzes validation results and generates executive summary
 * with segmentation by market (US vs International)
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load results
const resultsPath = join(__dirname, '../../validation-results/FASE1_AGENT1_IV_CALCULATION_RESULTS.json');

if (!fs.existsSync(resultsPath)) {
  console.error('❌ Results file not found:', resultsPath);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

console.log('\n' + '='.repeat(80));
console.log('FASE 1 - AGENT 1.1: RESULTS ANALYSIS');
console.log('='.repeat(80));

// Segment by market (US vs International)
function isUSStock(ticker) {
  // International suffixes
  const intlSuffixes = ['.L', '.AS', '.PA', '.F', '.BR', '.MC', '.MI', '.ST', '.HE', '.CO', '.OL', '.VI', '.SW', '.HK', '.TO', '.V'];

  return !intlSuffixes.some(suffix => ticker.endsWith(suffix));
}

// Segment results
const usStocks = {
  pass: results.passing_stocks.filter(s => isUSStock(s.ticker)),
  partial: results.partial_stocks.filter(s => isUSStock(s.ticker)),
  fail: results.failing_stocks.filter(s => isUSStock(s.ticker))
};

const intlStocks = {
  pass: results.passing_stocks.filter(s => !isUSStock(s.ticker)),
  partial: results.partial_stocks.filter(s => !isUSStock(s.ticker)),
  fail: results.failing_stocks.filter(s => !isUSStock(s.ticker))
};

const usTotal = usStocks.pass.length + usStocks.partial.length + usStocks.fail.length;
const intlTotal = intlStocks.pass.length + intlStocks.partial.length + intlStocks.fail.length;

const usPassRate = ((usStocks.pass.length / usTotal) * 100).toFixed(1);
const intlPassRate = ((intlStocks.pass.length / intlTotal) * 100).toFixed(1);

console.log('\nOVERALL RESULTS:');
console.log(`Total tested: ${results.total_tested}`);
console.log(`US stocks: ${usTotal} (${((usTotal / results.total_tested) * 100).toFixed(1)}%)`);
console.log(`International: ${intlTotal} (${((intlTotal / results.total_tested) * 100).toFixed(1)}%)`);
console.log('');

console.log('US MARKET PERFORMANCE:');
console.log(`  Pass: ${usStocks.pass.length} (${usPassRate}%)`);
console.log(`  Partial: ${usStocks.partial.length} (${((usStocks.partial.length / usTotal) * 100).toFixed(1)}%)`);
console.log(`  Fail: ${usStocks.fail.length} (${((usStocks.fail.length / usTotal) * 100).toFixed(1)}%)`);
console.log(`  Status: ${usPassRate >= 95 ? '✅ PASS (≥95%)' : usPassRate >= 90 ? '⚠️ PARTIAL (90-95%)' : '❌ FAIL (<90%)'}`);
console.log('');

console.log('INTERNATIONAL MARKET PERFORMANCE:');
console.log(`  Pass: ${intlStocks.pass.length} (${intlPassRate}%)`);
console.log(`  Partial: ${intlStocks.partial.length} (${((intlStocks.partial.length / intlTotal) * 100).toFixed(1)}%)`);
console.log(`  Fail: ${intlStocks.fail.length} (${((intlStocks.fail.length / intlTotal) * 100).toFixed(1)}%)`);
console.log(`  Status: ${intlPassRate >= 70 ? '✅ ACCEPTABLE (≥70%)' : '⚠️ NEEDS IMPROVEMENT (<70%)'}`);
console.log('');

// Top failing sectors
console.log('TOP FAILING SECTORS (US):');
const usSectorFails = {};
usStocks.fail.forEach(s => {
  const sector = s.sector || 'Unknown';
  usSectorFails[sector] = (usSectorFails[sector] || 0) + 1;
});

Object.entries(usSectorFails)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([sector, count]) => {
    console.log(`  ${sector}: ${count} stocks`);
  });

console.log('');

// Error breakdown
console.log('ERROR BREAKDOWN:');
Object.entries(results.by_error_type)
  .filter(([, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    const pct = ((count / results.total_tested) * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${pct}%)`);
  });

console.log('');
console.log('RECOMMENDATIONS:');
if (usPassRate >= 95) {
  console.log('  ✅ US market validation PASSED - system ready for production');
  console.log('  ℹ️  International stocks have expected lower coverage due to FMP data limitations');
} else if (usPassRate >= 90) {
  console.log('  ⚠️  US market near target - investigate partial stocks');
  console.log('  📋 Priority: Fix method count issues for US stocks');
} else {
  console.log('  ❌ US market validation FAILED - critical issues need resolution');
  console.log('  🚨 Priority: Fix profile/data fetching for US stocks');
}

console.log('='.repeat(80));
console.log('');

// Export segmented summary
const summary = {
  overall: {
    total: results.total_tested,
    pass: results.summary.pass,
    partial: results.summary.partial,
    fail: results.summary.fail,
    pass_rate: results.summary.pass_rate
  },
  us_market: {
    total: usTotal,
    pass: usStocks.pass.length,
    partial: usStocks.partial.length,
    fail: usStocks.fail.length,
    pass_rate: usPassRate + '%',
    status: usPassRate >= 95 ? 'PASS' : usPassRate >= 90 ? 'PARTIAL' : 'FAIL'
  },
  international: {
    total: intlTotal,
    pass: intlStocks.pass.length,
    partial: intlStocks.partial.length,
    fail: intlStocks.fail.length,
    pass_rate: intlPassRate + '%'
  },
  top_us_failures: Object.entries(usSectorFails)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => ({ sector, count }))
};

const summaryPath = join(__dirname, '../../validation-results/FASE1_AGENT1_EXECUTIVE_SUMMARY.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`📄 Executive summary saved: ${summaryPath}`);
console.log('');
