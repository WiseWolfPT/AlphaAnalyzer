/**
 * Aggregate validation results from all tiers
 * Generates comprehensive analysis and executive summary
 */

import fs from 'fs';
import path from 'path';

const RESULTS_DIR = './validation-results';

// Read all tier results
const tier1 = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, 'tier1-2025-10-26-results.json'), 'utf-8'));
const tier2 = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, 'tier2-2025-10-27-results.json'), 'utf-8'));
const tier3 = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, 'tier3-2025-10-27-results.json'), 'utf-8'));

// Combine all results
const allResults = [
  ...tier1.results,
  ...tier2.results,
  ...tier3.results
];

// Remove duplicates (Tier 1 stocks are also in Tier 3)
const uniqueResults = [];
const seenTickers = new Set();

for (const result of allResults) {
  if (!seenTickers.has(result.ticker)) {
    uniqueResults.push(result);
    seenTickers.add(result.ticker);
  }
}

console.log(`Total unique stocks tested: ${uniqueResults.length}`);

// Calculate overall metrics
const passed = uniqueResults.filter(r => r.status === 'PASS').length;
const failed = uniqueResults.filter(r => r.status === 'FAIL').length;
const errors = uniqueResults.filter(r => r.status === 'ERROR').length;
const passRate = ((passed / uniqueResults.length) * 100).toFixed(1);

console.log(`\nOverall Results:`);
console.log(`  PASS: ${passed} (${passRate}%)`);
console.log(`  FAIL: ${failed} (${((failed / uniqueResults.length) * 100).toFixed(1)}%)`);
console.log(`  ERROR: ${errors} (${((errors / uniqueResults.length) * 100).toFixed(1)}%)`);

// Sector breakdown
const sectorStats = new Map();
uniqueResults.forEach(r => {
  const sector = r.sector;
  if (!sectorStats.has(sector)) {
    sectorStats.set(sector, { passed: 0, failed: 0, errors: 0, total: 0 });
  }
  const stats = sectorStats.get(sector);
  stats.total++;
  if (r.status === 'PASS') stats.passed++;
  else if (r.status === 'FAIL') stats.failed++;
  else stats.errors++;
});

console.log(`\nSector Breakdown:`);
const sortedSectors = Array.from(sectorStats.entries()).sort((a, b) => {
  const rateA = (a[1].passed / a[1].total) * 100;
  const rateB = (b[1].passed / b[1].total) * 100;
  return rateB - rateA;
});

sortedSectors.forEach(([sector, stats]) => {
  const rate = ((stats.passed / stats.total) * 100).toFixed(1);
  console.log(`  ${sector}: ${rate}% (${stats.passed}/${stats.total}) - ${stats.errors} errors, ${stats.failed} insufficient methods`);
});

// HTTP code breakdown
const httpCodeStats = new Map();
uniqueResults.forEach(r => {
  const code = r.http_code;
  httpCodeStats.set(code, (httpCodeStats.get(code) || 0) + 1);
});

console.log(`\nHTTP Status Codes:`);
Array.from(httpCodeStats.entries()).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
  console.log(`  ${code}: ${count}`);
});

// Error analysis
const errors404 = uniqueResults.filter(r => r.http_code === 404);
const errors502 = uniqueResults.filter(r => r.http_code === 502);
const errors400 = uniqueResults.filter(r => r.http_code === 400);

console.log(`\nError Analysis:`);
console.log(`  404 (No price data): ${errors404.length} stocks`);
console.log(`  502 (Server timeout): ${errors502.length} stocks`);
console.log(`  400 (Bad request): ${errors400.length} stocks`);

// Critical findings
console.log(`\n=== CRITICAL FINDINGS ===`);
console.log(`1. Database Coverage: Only ${passed + failed} of ${uniqueResults.length} stocks (${((passed + failed) / uniqueResults.length * 100).toFixed(1)}%) have price data in production`);
console.log(`2. Missing Data: ${errors404.length} stocks (${((errors404.length / uniqueResults.length) * 100).toFixed(1)}%) missing from production database`);
console.log(`3. Insufficient Methods: ${failed} stocks (${((failed / uniqueResults.length) * 100).toFixed(1)}%) have <8 methods working`);
console.log(`4. Worst Sector: Utilities (${sortedSectors.find(([s]) => s === 'Utilities')?.[1]?.passed || 0} passed)`);

// Top failing stocks
const topFailing = uniqueResults
  .filter(r => r.status === 'FAIL')
  .sort((a, b) => a.methods_count - b.methods_count)
  .slice(0, 20);

console.log(`\nTop 20 Failing Stocks (ordered by methods count):`);
topFailing.forEach((r, i) => {
  console.log(`${i + 1}. ${r.ticker} (${r.company_name}) - ${r.methods_count}/12 methods, ${r.sector}`);
});

// Sample 404 errors
console.log(`\nSample 404 Errors (major stocks):`);
const major404 = errors404.filter(r =>
  ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'BIIB', 'CVS'].includes(r.ticker)
);
major404.forEach(r => {
  console.log(`  ${r.ticker} (${r.company_name}) - ${r.sector}`);
});

// Write summary JSON
const summary = {
  test_date: '2025-10-27',
  total_stocks: uniqueResults.length,
  passed,
  failed,
  errors,
  pass_rate: passRate + '%',
  tier1_summary: tier1.summary,
  tier2_summary: tier2.summary,
  tier3_summary: tier3.summary,
  sector_breakdown: Object.fromEntries(
    Array.from(sectorStats.entries()).map(([sector, stats]) => [
      sector,
      {
        ...stats,
        pass_rate: ((stats.passed / stats.total) * 100).toFixed(1) + '%'
      }
    ])
  ),
  http_codes: Object.fromEntries(httpCodeStats),
  critical_findings: {
    database_coverage_pct: ((passed + failed) / uniqueResults.length * 100).toFixed(1),
    missing_stocks: errors404.length,
    insufficient_methods: failed,
    major_stocks_404: major404.map(r => r.ticker)
  }
};

fs.writeFileSync(
  path.join(RESULTS_DIR, 'FULL_UNIVERSE_SUMMARY.json'),
  JSON.stringify(summary, null, 2)
);

console.log(`\n✅ Summary saved to ${path.join(RESULTS_DIR, 'FULL_UNIVERSE_SUMMARY.json')}`);
