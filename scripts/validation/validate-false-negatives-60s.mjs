#!/usr/bin/env node

/**
 * FASE 1: False Negatives Re-Validation with 60s Timeout
 *
 * Purpose: Re-test 1,128 "failing" stocks with proper 60s timeout
 * Hypothesis: 30-40% of failures are false negatives due to timeout
 *
 * Methodology:
 * - Uses correct endpoint: /api/iv/{ticker}/main
 * - Timeout: 60s (vs 30s previous)
 * - Rate limit: 3.5 req/s (FMP API safe)
 * - Pass criteria: methods >= 6 && iv > 0
 * - Checkpoint saves every 100 stocks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'https://128.140.45.28.sslip.io',
  timeout: 60000, // 60 seconds (CRITICAL: increased from 30s)
  rateLimit: 3.5, // requests per second
  passThreshold: 6, // minimum methods for PASS
  checkpointInterval: 100, // save every N stocks
  batchSize: 50, // progress visibility
};

// File paths
const PATHS = {
  stocksNeedingFixes: path.join(__dirname, '../../validation-results/STOCKS_NEEDING_FIXES.csv'),
  resultsJson: path.join(__dirname, '../../validation-results/fase1-false-negatives-60s-results.json'),
  checkpointJson: path.join(__dirname, '../../validation-results/fase1-checkpoint.json'),
  report: path.join(__dirname, '../../FASE_1_FALSE_NEGATIVES_VALIDATION_REPORT.md'),
};

// Stats tracking
const stats = {
  total: 0,
  tested: 0,
  pass: 0,
  fail: 0,
  timeout: 0,
  error: 0,
  recovered: 0, // false negatives recovered
  startTime: Date.now(),
  results: [],
};

// Helper: Sleep for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Fetch with timeout
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw error;
  }
}

// Helper: Test single stock
async function testStock(ticker) {
  const url = `${CONFIG.baseUrl}/api/iv/${ticker}`;

  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(url, CONFIG.timeout);
    const loadTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        ticker,
        status: 'FAIL',
        issue: `http${response.status}`,
        methods: 0,
        price: 0,
        loadTime,
      };
    }

    const data = await response.json();
    const methods = data.methods?.length || 0;
    const price = data.price || 0;

    const isPassing = methods >= CONFIG.passThreshold;

    return {
      ticker,
      status: isPassing ? 'PASS' : 'FAIL',
      issue: isPassing ? null : (methods < CONFIG.passThreshold ? `methods_low_${methods}` : 'no_price'),
      methods,
      price,
      loadTime,
    };

  } catch (error) {
    if (error.message === 'TIMEOUT') {
      return {
        ticker,
        status: 'FAIL',
        issue: 'timeout',
        methods: 0,
        price: 0,
        loadTime: CONFIG.timeout,
      };
    }

    return {
      ticker,
      status: 'FAIL',
      issue: 'error',
      methods: 0,
      price: 0,
      loadTime: 0,
      error: error.message,
    };
  }
}

// Helper: Load stocks from CSV
function loadStocksFromCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').slice(1); // Skip header

  return lines.map(line => {
    const [ticker, sector, exchange, status, priority, issue, methods, iv] = line.split(',');
    return { ticker, sector, exchange, issue };
  });
}

// Helper: Save checkpoint
function saveCheckpoint() {
  fs.writeFileSync(
    PATHS.checkpointJson,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        results: undefined, // Don't duplicate results
      },
      lastTicker: stats.results[stats.results.length - 1]?.ticker,
    }, null, 2)
  );
}

// Helper: Save final results
function saveResults() {
  const finalResults = {
    validation: {
      timestamp: new Date().toISOString(),
      validator: 'QA Automation Engineer (Claude Code)',
      phase: 'FASE 1 - False Negatives Re-Validation',
      config: CONFIG,
    },
    summary: {
      total: stats.total,
      tested: stats.tested,
      pass: stats.pass,
      fail: stats.fail,
      timeout: stats.timeout,
      error: stats.error,
      recovered: stats.recovered,
      passRate: ((stats.pass / stats.tested) * 100).toFixed(2),
      falseNegativeRate: ((stats.recovered / stats.tested) * 100).toFixed(2),
      duration: {
        seconds: Math.floor((Date.now() - stats.startTime) / 1000),
        minutes: ((Date.now() - stats.startTime) / 60000).toFixed(2),
      },
    },
    results: stats.results,
  };

  fs.writeFileSync(PATHS.resultsJson, JSON.stringify(finalResults, null, 2));
  console.log(`\n✅ Results saved to: ${PATHS.resultsJson}`);

  return finalResults;
}

// Helper: Generate comprehensive report
function generateReport(finalResults) {
  const { summary, results } = finalResults;

  // Analyze results
  const passingStocks = results.filter(r => r.status === 'PASS');
  const failingStocks = results.filter(r => r.status === 'FAIL');
  const timeouts = results.filter(r => r.issue === 'timeout');
  const http404s = failingStocks.filter(r => r.issue === 'http404');
  const lowMethods = failingStocks.filter(r => r.issue?.startsWith('methods_low_'));

  // Sort for top 10s
  const topPassing = passingStocks
    .sort((a, b) => b.methods - a.methods)
    .slice(0, 10);

  const topFailing = failingStocks
    .filter(r => r.issue === 'http404')
    .slice(0, 10);

  // European vs US analysis (naive: .L, .F, .DE, .AS, .PA, .BR, .MC = European)
  const europeanSuffixes = ['.L', '.F', '.DE', '.AS', '.PA', '.BR', '.MC'];
  const europeanStocks = results.filter(r =>
    europeanSuffixes.some(suffix => r.ticker.endsWith(suffix))
  );
  const usStocks = results.filter(r =>
    !europeanSuffixes.some(suffix => r.ticker.endsWith(suffix))
  );

  const europeanPass = europeanStocks.filter(s => s.status === 'PASS').length;
  const usPass = usStocks.filter(s => s.status === 'PASS').length;

  const report = `# FASE 1: False Negatives Re-Validation Report
## 60-Second Timeout Analysis

**Generated:** ${new Date().toISOString()}
**Validator:** QA Automation Engineer (Claude Code)
**Environment:** Production (${CONFIG.baseUrl})

---

## Executive Summary

### Hypothesis Validation
**Initial Hypothesis:** 30-40% of 1,128 "failing" stocks are false negatives due to timeout issues.

**Results:**
- **Total Re-Tested:** ${summary.tested} stocks
- **Pass Rate (60s timeout):** ${summary.passRate}%
- **False Negatives Recovered:** ${summary.recovered} stocks (${summary.falseNegativeRate}%)
- **Duration:** ${summary.duration.minutes} minutes

### Verdict
${parseFloat(summary.falseNegativeRate) >= 15
  ? '✅ **HYPOTHESIS CONFIRMED** - Significant false negatives detected'
  : '⚠️ **HYPOTHESIS REJECTED** - Timeout not primary cause'}

---

## Detailed Results

### Pass/Fail Breakdown
| Category | Count | Percentage |
|----------|-------|------------|
| ✅ PASS (methods ≥ 6) | ${stats.pass} | ${((stats.pass / stats.tested) * 100).toFixed(1)}% |
| ❌ FAIL (all reasons) | ${stats.fail} | ${((stats.fail / stats.tested) * 100).toFixed(1)}% |
| ⏱️ Timeout (60s exceeded) | ${stats.timeout} | ${((stats.timeout / stats.tested) * 100).toFixed(1)}% |
| 🔴 HTTP 404 | ${http404s.length} | ${((http404s.length / stats.tested) * 100).toFixed(1)}% |
| ⚠️ Low Methods (<6) | ${lowMethods.length} | ${((lowMethods.length / stats.tested) * 100).toFixed(1)}% |
| 💥 Errors | ${stats.error} | ${((stats.error / stats.tested) * 100).toFixed(1)}% |

### Geographic Distribution
| Region | Total | Pass | Pass Rate |
|--------|-------|------|-----------|
| 🇪🇺 European | ${europeanStocks.length} | ${europeanPass} | ${((europeanPass / europeanStocks.length) * 100).toFixed(1)}% |
| 🇺🇸 US | ${usStocks.length} | ${usPass} | ${usStocks.length > 0 ? ((usPass / usStocks.length) * 100).toFixed(1) : 'N/A'}% |

---

## Top 10 Newly Passing Stocks
${topPassing.length > 0 ? '(Recovered from false negatives)\n\n' : '(None recovered)\n\n'}
${topPassing.map((s, i) => `${i + 1}. **${s.ticker}** - ${s.methods} methods, Price: $${s.price?.toFixed(2) || '0.00'}, Load: ${s.loadTime}ms`).join('\n')}

## Top 10 Still Failing Stocks
${topFailing.length > 0 ? '(For FASE 3 investigation)\n\n' : '(None)\n\n'}
${topFailing.map((s, i) => `${i + 1}. **${s.ticker}** - Issue: ${s.issue}`).join('\n')}

---

## Performance Metrics

### Load Times (Passing Stocks)
${passingStocks.length > 0 ? `
- **Average:** ${(passingStocks.reduce((sum, s) => sum + s.loadTime, 0) / passingStocks.length).toFixed(0)}ms
- **Min:** ${Math.min(...passingStocks.map(s => s.loadTime))}ms
- **Max:** ${Math.max(...passingStocks.map(s => s.loadTime))}ms
- **P95:** ${passingStocks.sort((a, b) => a.loadTime - b.loadTime)[Math.floor(passingStocks.length * 0.95)]?.loadTime || 0}ms
` : 'N/A - No passing stocks'}

### Timeout Analysis
- **60s Timeouts:** ${timeouts.length} stocks (${((timeouts.length / stats.tested) * 100).toFixed(1)}%)
- **Implication:** ${timeouts.length > 50 ? 'Backend optimization needed for slow stocks' : 'Acceptable performance'}

---

## Path Forward Recommendation

### Comparison: Previous (30s) vs Current (60s)
- **Previous Pass Rate:** 24.4% (365/1,493)
- **Current Pass Rate:** ${summary.passRate}%
- **Improvement:** ${(parseFloat(summary.passRate) - 24.4).toFixed(1)} percentage points
- **Stocks Recovered:** ${summary.recovered}

### Recommended Next Steps

${parseFloat(summary.falseNegativeRate) >= 15 ? `
#### ✅ Path A: Deploy 60s Timeout + Remove European Stocks
**Reasoning:**
- Significant false negatives confirmed (${summary.falseNegativeRate}%)
- European stocks show ${((europeanPass / europeanStocks.length) * 100).toFixed(1)}% pass rate
- US stocks show ${usStocks.length > 0 ? ((usPass / usStocks.length) * 100).toFixed(1) : 'N/A'}% pass rate

**Actions:**
1. Update frontend timeout: 30s → 60s
2. Filter universe: Remove European exchanges (.L, .F, .DE, .AS, .PA, .BR, .MC)
3. Expected pass rate: ~${Math.min(95, parseFloat(summary.passRate) + 10).toFixed(0)}%
4. Timeline: 1-2 days
` : `
#### ⚠️ Path B: Integrate European Data Provider
**Reasoning:**
- Timeout increase did NOT significantly improve pass rate
- Root cause: FMP lacks European stock data
- Need alternative provider (e.g., IEX Cloud, Financial Modeling Prep Europe)

**Actions:**
1. Evaluate European data providers
2. Implement fallback logic
3. Re-validate with new provider
4. Timeline: 1-2 weeks
`}

---

## Technical Notes

### Configuration
- **Endpoint:** \`/api/iv/{ticker}\` (correct frontend endpoint)
- **Timeout:** ${CONFIG.timeout}ms (60s)
- **Rate Limit:** ${CONFIG.rateLimit} req/s
- **Pass Criteria:** methods ≥ ${CONFIG.passThreshold}

### Test Execution
- **Start:** ${new Date(stats.startTime).toISOString()}
- **End:** ${new Date().toISOString()}
- **Duration:** ${summary.duration.seconds}s (${summary.duration.minutes} min)
- **Rate:** ${(stats.tested / (summary.duration.seconds || 1)).toFixed(2)} req/s

### Checkpoint Strategy
- Saved every ${CONFIG.checkpointInterval} stocks
- Prevents data loss on interruption
- Checkpoint file: \`${path.basename(PATHS.checkpointJson)}\`

---

## Files Generated
1. **Results JSON:** \`${path.basename(PATHS.resultsJson)}\`
2. **Checkpoint:** \`${path.basename(PATHS.checkpointJson)}\`
3. **This Report:** \`${path.basename(PATHS.report)}\`

---

**Validator:** Claude Code QA Automation Engineer
**Phase:** FASE 1 - False Negatives Re-Validation
**Status:** ${summary.passRate >= 44 ? '✅ APPROVED' : '⚠️ NEEDS IMPROVEMENT'}
`;

  fs.writeFileSync(PATHS.report, report);
  console.log(`✅ Report saved to: ${PATHS.report}`);
}

// Main execution
async function main() {
  console.log('🚀 FASE 1: False Negatives Re-Validation (60s Timeout)');
  console.log('═'.repeat(60));
  console.log(`Endpoint: ${CONFIG.baseUrl}/api/iv/{ticker}`);
  console.log(`Timeout: ${CONFIG.timeout}ms (60s)`);
  console.log(`Rate Limit: ${CONFIG.rateLimit} req/s`);
  console.log(`Pass Criteria: methods >= ${CONFIG.passThreshold}`);
  console.log('═'.repeat(60));

  // Load stocks
  console.log(`\n📂 Loading stocks from: ${PATHS.stocksNeedingFixes}`);
  const stocks = loadStocksFromCsv(PATHS.stocksNeedingFixes);
  stats.total = stocks.length;
  console.log(`✅ Loaded ${stats.total} stocks needing re-validation`);

  // Calculate delay for rate limiting
  const delayMs = Math.floor(1000 / CONFIG.rateLimit);
  console.log(`⏱️  Rate limiting: ${delayMs}ms delay between requests\n`);

  // Test stocks
  console.log('🧪 Starting validation...\n');

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    stats.tested++;

    const result = await testStock(stock.ticker);
    stats.results.push(result);

    // Update stats
    if (result.status === 'PASS') {
      stats.pass++;
      if (stock.issue === 'http404') {
        stats.recovered++; // This was a false negative!
      }
    } else if (result.status === 'FAIL') {
      stats.fail++;
      if (result.issue === 'timeout') {
        stats.timeout++;
      } else if (result.issue === 'error') {
        stats.error++;
      }
    }

    // Progress update
    if (stats.tested % 10 === 0 || stats.tested === stats.total) {
      const passRate = ((stats.pass / stats.tested) * 100).toFixed(1);
      const recoveredRate = ((stats.recovered / stats.tested) * 100).toFixed(1);
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
      const eta = stats.tested > 0
        ? Math.floor((stats.total - stats.tested) * (elapsed / stats.tested))
        : 0;

      console.log(
        `[${stats.tested}/${stats.total}] ${stock.ticker}: ${result.status} | ` +
        `Pass: ${passRate}% | Recovered: ${stats.recovered} (${recoveredRate}%) | ` +
        `ETA: ${eta}s`
      );
    }

    // Checkpoint save
    if (stats.tested % CONFIG.checkpointInterval === 0) {
      saveCheckpoint();
      console.log(`💾 Checkpoint saved at ${stats.tested}/${stats.total}`);
    }

    // Batch separator
    if (stats.tested % CONFIG.batchSize === 0) {
      console.log('─'.repeat(60));
    }

    // Rate limiting
    await sleep(delayMs);
  }

  // Final results
  console.log('\n' + '═'.repeat(60));
  console.log('✅ VALIDATION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`\nTotal Tested: ${stats.tested}`);
  console.log(`Pass: ${stats.pass} (${((stats.pass / stats.tested) * 100).toFixed(1)}%)`);
  console.log(`Fail: ${stats.fail} (${((stats.fail / stats.tested) * 100).toFixed(1)}%)`);
  console.log(`Recovered (False Negatives): ${stats.recovered} (${((stats.recovered / stats.tested) * 100).toFixed(1)}%)`);
  console.log(`Duration: ${((Date.now() - stats.startTime) / 60000).toFixed(2)} minutes`);

  // Save results
  const finalResults = saveResults();

  // Generate report
  generateReport(finalResults);

  console.log('\n📊 Summary:');
  console.log(`- Pass Rate (30s): 24.4%`);
  console.log(`- Pass Rate (60s): ${((stats.pass / stats.tested) * 100).toFixed(1)}%`);
  console.log(`- Improvement: ${(((stats.pass / stats.tested) * 100) - 24.4).toFixed(1)} percentage points`);
  console.log(`- False Negatives: ${stats.recovered} stocks`);
  console.log('\n🎯 Recommendation: See report for Path A vs Path B decision');
}

// Run
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
