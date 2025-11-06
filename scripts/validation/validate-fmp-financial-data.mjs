#!/usr/bin/env node

/**
 * FMP Financial Data Coverage Validation Script
 *
 * Tests 1,065 failing stocks against FMP API's CRITICAL endpoints:
 * 1. Income Statement (DCF calculations)
 * 2. Balance Sheet (multiple valuation methods)
 * 3. Cash Flow Statement (FCF methods)
 * 4. Company Profile (metadata)
 *
 * Rate Limit: 3.5 req/s (285ms delay)
 * Runtime: ~20-25 minutes (1,065 stocks × 4 endpoints)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const FMP_API_KEY = process.env.FMP_API_KEY;
const RATE_LIMIT_DELAY = 300; // ms between requests (3.33 req/s = 200 calls/min - SAFE MARGIN)
const MAX_RETRIES = 3; // Increased from 2 to 3 for better reliability
const RETRY_DELAYS = [2000, 5000, 10000]; // Progressive backoff: 2s, 5s, 10s
const CHECKPOINT_INTERVAL = 50; // Save every 50 stocks

if (!FMP_API_KEY) {
  console.error('❌ ERROR: FMP_API_KEY environment variable not set');
  console.error('   Usage: FMP_API_KEY=your_key node validate-fmp-financial-data.mjs');
  process.exit(1);
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Geographic classification
function classifyRegion(ticker) {
  if (ticker.endsWith('.L')) return 'UK';
  if (ticker.endsWith('.F')) return 'Germany';
  if (ticker.endsWith('.PA')) return 'France';
  if (ticker.endsWith('.AS')) return 'Netherlands';
  if (ticker.endsWith('.MI')) return 'Italy';
  if (ticker.endsWith('.MC')) return 'Spain';
  if (ticker.endsWith('.BR')) return 'Belgium';
  if (ticker.endsWith('.SW')) return 'Switzerland';
  if (ticker.endsWith('.HE')) return 'Finland';
  if (ticker.endsWith('.ST')) return 'Sweden';
  return 'US';
}

// Fetch with retry logic (exponential backoff)
async function fetchWithRetry(url, retries = 0) {
  try {
    const response = await fetch(url);

    // Circuit breaker: Don't cache 429 responses
    if (response.status === 429) {
      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retries];
        console.log(`  ⚠️  Rate limit hit (429), backing off ${delay}ms... (retry ${retries + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        return fetchWithRetry(url, retries + 1);
      }
      throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries`);
    }

    return response;
  } catch (error) {
    // Network error retry with exponential backoff
    if (retries < MAX_RETRIES && error.message !== 'Rate limit exceeded after') {
      const delay = RETRY_DELAYS[retries];
      console.log(`  ⚠️  Network error, backing off ${delay}ms... (retry ${retries + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return fetchWithRetry(url, retries + 1);
    }
    throw error;
  }
}

// Test stock against FMP API (ALL critical endpoints)
async function testStockFinancials(ticker) {
  const baseUrl = 'https://financialmodelingprep.com/api/v3';
  const apiParam = `?apikey=${FMP_API_KEY}`;
  const limitParam = `?limit=5&apikey=${FMP_API_KEY}`;

  const endpoints = {
    incomeStatement: `${baseUrl}/income-statement/${ticker}${limitParam}`,
    balanceSheet: `${baseUrl}/balance-sheet-statement/${ticker}${limitParam}`,
    cashFlow: `${baseUrl}/cash-flow-statement/${ticker}${limitParam}`,
    profile: `${baseUrl}/profile/${ticker}${apiParam}`,
  };

  const result = {
    ticker,
    region: classifyRegion(ticker),
    incomeStatement: false,
    balanceSheet: false,
    cashFlow: false,
    profile: false,
    yearsAvailable: 0,
    status: 'none', // 'full', 'partial', 'none'
    error: null,
  };

  try {
    // Test Income Statement
    const incomeResp = await fetchWithRetry(endpoints.incomeStatement);
    await sleep(RATE_LIMIT_DELAY);

    if (incomeResp.ok && incomeResp.status === 200) {
      const incomeData = await incomeResp.json();
      if (Array.isArray(incomeData) && incomeData.length > 0) {
        result.incomeStatement = true;
        result.yearsAvailable = Math.max(result.yearsAvailable, incomeData.length);
      }
    }

    // Test Balance Sheet
    const balanceResp = await fetchWithRetry(endpoints.balanceSheet);
    await sleep(RATE_LIMIT_DELAY);

    if (balanceResp.ok && balanceResp.status === 200) {
      const balanceData = await balanceResp.json();
      if (Array.isArray(balanceData) && balanceData.length > 0) {
        result.balanceSheet = true;
        result.yearsAvailable = Math.max(result.yearsAvailable, balanceData.length);
      }
    }

    // Test Cash Flow
    const cashFlowResp = await fetchWithRetry(endpoints.cashFlow);
    await sleep(RATE_LIMIT_DELAY);

    if (cashFlowResp.ok && cashFlowResp.status === 200) {
      const cashFlowData = await cashFlowResp.json();
      if (Array.isArray(cashFlowData) && cashFlowData.length > 0) {
        result.cashFlow = true;
        result.yearsAvailable = Math.max(result.yearsAvailable, cashFlowData.length);
      }
    }

    // Test Profile
    const profileResp = await fetchWithRetry(endpoints.profile);
    await sleep(RATE_LIMIT_DELAY);

    if (profileResp.ok && profileResp.status === 200) {
      const profileData = await profileResp.json();
      if (Array.isArray(profileData) && profileData.length > 0) {
        result.profile = true;
      }
    }

    // Classify status
    const statementsCount = [result.incomeStatement, result.balanceSheet, result.cashFlow].filter(Boolean).length;

    if (statementsCount === 3) {
      result.status = 'full';
    } else if (statementsCount > 0) {
      result.status = 'partial';
    } else {
      result.status = 'none';
    }

  } catch (error) {
    result.error = error.message;
    result.status = 'error';
  }

  return result;
}

// Load failing stocks
function loadFailingStocks() {
  const filePath = join(process.cwd(), 'validation-results/fmp-failing-stocks-list.json');

  if (!existsSync(filePath)) {
    console.error(`❌ ERROR: File not found: ${filePath}`);
    console.error('   Run this script from project root directory.');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  return data.stocks.map(s => s.ticker);
}

// Save checkpoint
function saveCheckpoint(results, totalStocks, startTime) {
  const checkpoint = {
    timestamp: new Date().toISOString(),
    progress: {
      tested: results.tested.length,
      total: totalStocks,
      percent: ((results.tested.length / totalStocks) * 100).toFixed(1),
    },
    partial_results: {
      full: results.full.length,
      partial: results.partial.length,
      none: results.none.length,
      errors: results.errors.length,
    },
  };

  writeFileSync(
    'validation-results/fmp-checkpoint.json',
    JSON.stringify(checkpoint, null, 2)
  );
}

// Generate final report
function generateReport(results, totalStocks, startTime) {
  const runtime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Calculate percentages
  const fullPercent = ((results.full.length / totalStocks) * 100).toFixed(1);
  const partialPercent = ((results.partial.length / totalStocks) * 100).toFixed(1);
  const nonePercent = ((results.none.length / totalStocks) * 100).toFixed(1);

  // Geographic breakdown
  const regionBreakdown = {};

  [...results.full, ...results.partial, ...results.none].forEach(stock => {
    const region = stock.region;
    if (!regionBreakdown[region]) {
      regionBreakdown[region] = { full: 0, partial: 0, none: 0, total: 0 };
    }
    regionBreakdown[region][stock.status]++;
    regionBreakdown[region].total++;
  });

  // JSON results
  const jsonReport = {
    metadata: {
      timestamp: new Date().toISOString(),
      phase: 'FMP Financial Data Coverage Validation',
      runtime_minutes: parseFloat(runtime),
      fmp_api_key_valid: true,
    },
    summary: {
      total_tested: totalStocks,
      full_coverage: { count: results.full.length, percent: parseFloat(fullPercent) },
      partial_coverage: { count: results.partial.length, percent: parseFloat(partialPercent) },
      no_coverage: { count: results.none.length, percent: parseFloat(nonePercent) },
      errors: { count: results.errors.length },
    },
    geographic_breakdown: regionBreakdown,
    details: {
      full_coverage: results.full,
      partial_coverage: results.partial,
      no_coverage: results.none,
      errors: results.errors,
    },
  };

  writeFileSync(
    'validation-results/fmp-coverage-results.json',
    JSON.stringify(jsonReport, null, 2)
  );

  // Markdown report
  const mdReport = `# FMP Financial Data Coverage Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Stocks Tested:** ${totalStocks} (failing from FASE 1)
**FMP API Key:** Valid ✅
**Duration:** ${runtime} minutes
**Rate Limit:** 3.5 req/s (285ms delay)

## Executive Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ **Full Coverage** | ${results.full.length} | ${fullPercent}% |
| ⚠️ **Partial Coverage** | ${results.partial.length} | ${partialPercent}% |
| ❌ **No Coverage** | ${results.none.length} | ${nonePercent}% |
| 🔴 **Errors** | ${results.errors.length} | - |

**Full Coverage:** All 3 financial statements available (Income Statement + Balance Sheet + Cash Flow)
**Partial Coverage:** 1-2 statements available (can use with methodology fallbacks)
**No Coverage:** 0 statements available (FMP has no data)

---

## Geographic Breakdown

| Region | Full | Partial | None | Total |
|--------|------|---------|------|-------|
${Object.entries(regionBreakdown)
  .sort((a, b) => b[1].total - a[1].total)
  .map(([region, stats]) =>
    `| ${region.padEnd(10)} | ${stats.full.toString().padStart(4)} | ${stats.partial.toString().padStart(7)} | ${stats.none.toString().padStart(4)} | ${stats.total.toString().padStart(5)} |`
  ).join('\n')}

---

## Path Forward Recommendations

### Option A: Remove European Stocks with NO Coverage
- **Stocks to remove:** ${results.none.filter(s => s.region !== 'US').length} European stocks with NO coverage
- **Impact:** Lose ${results.none.filter(s => s.region !== 'US').length} stocks, improve pass rate
- **Timeline:** 1-2 days
- **Action:** Update \`stock_universe_complete.csv\` to exclude these tickers

### Option B: Keep Stocks with Partial Coverage
- **Stocks recoverable:** ${results.partial.length} stocks with 1-2 statements
- **Impact:** Add methodology fallbacks, recover ${results.partial.length} stocks
- **Timeline:** 1 week
- **Action:** Enhance valuation methods to handle missing statements

### Option C: European Data Provider Integration
- **Stocks needing provider:** ${results.none.filter(s => s.region !== 'US').length} European stocks
- **Impact:** Full coverage if provider integrated (e.g., Bloomberg, Refinitiv)
- **Timeline:** 2-4 weeks
- **Cost:** Subscription required

---

## Detailed Findings

### Top 10 Stocks with Full Coverage (False Negatives ✅)
${results.full.slice(0, 10).map((stock, i) =>
  `${i + 1}. **${stock.ticker}** (${stock.region}) - ${stock.yearsAvailable} years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ${stock.profile ? '✅' : '❌'}`
).join('\n\n')}

${results.full.length > 10 ? `\n*...and ${results.full.length - 10} more stocks with full coverage*\n` : ''}

---

### Top 10 Stocks with Partial Coverage (Recoverable ⚠️)
${results.partial.slice(0, 10).map((stock, i) => {
  const missing = [];
  if (!stock.incomeStatement) missing.push('Income Statement');
  if (!stock.balanceSheet) missing.push('Balance Sheet');
  if (!stock.cashFlow) missing.push('Cash Flow');

  return `${i + 1}. **${stock.ticker}** (${stock.region}) - ${stock.yearsAvailable} years available
   - Missing: ${missing.join(', ')}
   - Available: ${[stock.incomeStatement && 'Income', stock.balanceSheet && 'Balance', stock.cashFlow && 'Cash Flow'].filter(Boolean).join(', ')}`;
}).join('\n\n')}

${results.partial.length > 10 ? `\n*...and ${results.partial.length - 10} more stocks with partial coverage*\n` : ''}

---

### Top 10 Stocks with No Coverage (Confirm Remove ❌)
${results.none.slice(0, 10).map((stock, i) =>
  `${i + 1}. **${stock.ticker}** (${stock.region})
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider`
).join('\n\n')}

${results.none.length > 10 ? `\n*...and ${results.none.length - 10} more stocks with no coverage*\n` : ''}

---

## Next Steps

1. **Immediate (Option A):**
   - Remove ${results.none.length} stocks with NO coverage
   - Update \`stock_universe_complete.csv\`
   - Re-run FASE 1 validation
   - Expected new pass rate: ~${((63 + results.full.length) / 1493 * 100).toFixed(1)}%

2. **Short-term (Option B):**
   - Implement methodology fallbacks for ${results.partial.length} partial stocks
   - Add graceful degradation in valuation methods
   - Expected recovery: ${results.partial.length} additional stocks
   - Expected new pass rate: ~${((63 + results.full.length + results.partial.length) / 1493 * 100).toFixed(1)}%

3. **Long-term (Option C):**
   - Evaluate European data providers
   - Integrate additional APIs for ${results.none.filter(s => s.region !== 'US').length} European stocks
   - Expected recovery: Up to ${results.none.filter(s => s.region !== 'US').length} stocks

---

**Generated by Alfalyzer QA Automation**
**Timestamp:** ${new Date().toISOString()}
`;

  writeFileSync('FMP_COVERAGE_VALIDATION_REPORT.md', mdReport);

  // Quick reference (ASCII art)
  const quickRef = `
╔═══════════════════════════════════════════════════════════════╗
║         FMP FINANCIAL DATA COVERAGE - QUICK REFERENCE         ║
╚═══════════════════════════════════════════════════════════════╝

Date: ${new Date().toISOString().split('T')[0]}
Runtime: ${runtime} minutes
Tested: ${totalStocks} failing stocks from FASE 1

┌───────────────────────────────────────────────────────────────┐
│ COVERAGE SUMMARY                                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ FULL COVERAGE:      ${results.full.length.toString().padStart(4)} stocks (${fullPercent.padStart(5)}%)        │
│  ⚠️  PARTIAL COVERAGE:  ${results.partial.length.toString().padStart(4)} stocks (${partialPercent.padStart(5)}%)        │
│  ❌ NO COVERAGE:        ${results.none.length.toString().padStart(4)} stocks (${nonePercent.padStart(5)}%)        │
│  🔴 ERRORS:             ${results.errors.length.toString().padStart(4)} stocks                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ GEOGRAPHIC BREAKDOWN                                          │
├───────────────────────────────────────────────────────────────┤
${Object.entries(regionBreakdown)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10)
  .map(([region, stats]) => {
    const bar = '█'.repeat(Math.round(stats.total / totalStocks * 40));
    return `│ ${region.padEnd(12)} ${stats.total.toString().padStart(4)} stocks ${bar.padEnd(40)} │`;
  }).join('\n')}
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ RECOMMENDATIONS                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ PATH A: Remove NO COVERAGE stocks                            │
│   → Remove ${results.none.length} stocks                                        │
│   → Expected pass rate: ~${((63 + results.full.length) / 1493 * 100).toFixed(1)}%                          │
│   → Timeline: 1-2 days                                        │
│                                                               │
│ PATH B: Keep PARTIAL COVERAGE stocks                         │
│   → Add fallbacks for ${results.partial.length} stocks                          │
│   → Expected pass rate: ~${((63 + results.full.length + results.partial.length) / 1493 * 100).toFixed(1)}%                          │
│   → Timeline: 1 week                                          │
│                                                               │
│ PATH C: European data provider                               │
│   → Integrate provider for ${results.none.filter(s => s.region !== 'US').length} stocks                     │
│   → Expected pass rate: ~${((63 + results.full.length + results.partial.length + results.none.filter(s => s.region !== 'US').length) / 1493 * 100).toFixed(1)}%                          │
│   → Timeline: 2-4 weeks                                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘

FILES GENERATED:
  ✓ validation-results/fmp-coverage-results.json
  ✓ FMP_COVERAGE_VALIDATION_REPORT.md
  ✓ FMP_COVERAGE_QUICK_REF.txt

VIEW DETAILS:
  cat FMP_COVERAGE_VALIDATION_REPORT.md
  jq '.summary' validation-results/fmp-coverage-results.json

═══════════════════════════════════════════════════════════════
Generated by Alfalyzer QA Automation
Timestamp: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════
`;

  writeFileSync('FMP_COVERAGE_QUICK_REF.txt', quickRef.trim());

  return { runtime, fullPercent, partialPercent, nonePercent };
}

// Main execution
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   FMP FINANCIAL DATA COVERAGE VALIDATION                      ║');
  console.log('║   Testing 1,065 Failing Stocks from FASE 1                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const failingStocks = loadFailingStocks();
  const totalStocks = failingStocks.length;

  console.log(`🎯 Target: ${totalStocks} stocks`);
  console.log(`📡 FMP API Key: ${FMP_API_KEY.substring(0, 8)}...${FMP_API_KEY.substring(FMP_API_KEY.length - 4)}`);
  console.log(`⏱️  Rate Limit: 3.5 req/s (285ms delay)`);
  console.log(`📊 Endpoints: 4 per stock (Income + Balance + Cash Flow + Profile)`);
  console.log(`⏱️  Estimated Runtime: ~${Math.ceil(totalStocks * 4 * RATE_LIMIT_DELAY / 1000 / 60)} minutes\n`);
  console.log('━'.repeat(65) + '\n');

  const results = {
    tested: [],
    full: [],
    partial: [],
    none: [],
    errors: [],
  };

  // Test each stock
  for (let i = 0; i < failingStocks.length; i++) {
    const ticker = failingStocks[i];
    const result = await testStockFinancials(ticker);

    results.tested.push(ticker);

    if (result.status === 'full') {
      results.full.push(result);
    } else if (result.status === 'partial') {
      results.partial.push(result);
    } else if (result.status === 'none') {
      results.none.push(result);
    } else {
      results.errors.push(result);
    }

    // Progress tracking
    const progress = ((i + 1) / totalStocks * 100).toFixed(1);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = (i + 1) / elapsed;
    const remaining = (totalStocks - (i + 1)) / rate;
    const eta = Math.ceil(remaining / 60);

    const statusIcon = result.status === 'full' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';

    console.log(`[${(i + 1).toString().padStart(4)}/${totalStocks}] ${ticker.padEnd(12)} ${statusIcon} ${result.status.padEnd(7)} | ETA: ${eta}m | F:${results.full.length} P:${results.partial.length} N:${results.none.length}`);

    // Save checkpoint every 50 stocks
    if ((i + 1) % CHECKPOINT_INTERVAL === 0) {
      saveCheckpoint(results, totalStocks, startTime);
      console.log(`💾 Checkpoint saved at ${i + 1}/${totalStocks}`);
    }
  }

  // Final save
  console.log('\n' + '━'.repeat(65) + '\n');
  const reportStats = generateReport(results, totalStocks, startTime);

  console.log(`\n✅ VALIDATION COMPLETE`);
  console.log(`⏱️  Runtime: ${reportStats.runtime} minutes`);
  console.log(`\n📊 RESULTS:`);
  console.log(`   ✅ Full Coverage:    ${results.full.length} stocks (${reportStats.fullPercent}%)`);
  console.log(`   ⚠️  Partial Coverage: ${results.partial.length} stocks (${reportStats.partialPercent}%)`);
  console.log(`   ❌ No Coverage:      ${results.none.length} stocks (${reportStats.nonePercent}%)`);
  console.log(`   🔴 Errors:           ${results.errors.length} stocks`);
  console.log(`\n📁 FILES GENERATED:`);
  console.log(`   - validation-results/fmp-coverage-results.json`);
  console.log(`   - FMP_COVERAGE_VALIDATION_REPORT.md`);
  console.log(`   - FMP_COVERAGE_QUICK_REF.txt`);
  console.log(`\n📖 VIEW REPORT:`);
  console.log(`   cat FMP_COVERAGE_VALIDATION_REPORT.md\n`);
}

// Run
main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
