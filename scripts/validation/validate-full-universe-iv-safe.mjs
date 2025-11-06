#!/usr/bin/env node

/**
 * FASE 1 - Agent 1.1: Safe IV Validation (Cache-Aware)
 *
 * Tests all 1,493 stocks against production IV API with SAFE rate limiting.
 * Uses 1 req/s to avoid overwhelming FMP API (each IV calc = 10-15 FMP calls)
 *
 * Expected duration: ~25 minutes for 1,485 stocks
 */

import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROD_URL = 'https://128.140.45.28.sslip.io';
const RATE_LIMIT_DELAY = 1000; // 1 req/s - SAFE for cached responses
const PROGRESS_INTERVAL = 50;
const CHECKPOINT_INTERVAL = 100;

// Load stock universe from FMP coverage report
const fmpReport = JSON.parse(fs.readFileSync(join(__dirname, '../../FMP_COVERAGE_REPORT.json'), 'utf8'));
const allStocks = fmpReport.details.exists; // 1,485 stocks with FMP coverage

console.log(`\n${'='.repeat(80)}`);
console.log(`FASE 1 - AGENT 1.1: IV CALCULATION ACCURACY VALIDATION`);
console.log(`${'='.repeat(80)}`);
console.log(`Total stocks to test: ${allStocks.length}`);
console.log(`Target: ${PROD_URL}/api/iv/{TICKER}/chart`);
console.log(`Rate limit: 1 req/s (${RATE_LIMIT_DELAY}ms delay) - CACHE-SAFE`);
console.log(`Expected duration: ~${Math.ceil(allStocks.length / 60)} minutes`);
console.log(`Started: ${new Date().toISOString()}`);
console.log(`${'='.repeat(80)}\n`);

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  total_tested: 0,
  duration_minutes: 0,
  summary: {
    pass: 0,
    partial: 0,
    fail: 0,
    pass_rate: '0%'
  },
  by_sector: {},
  by_method_count: {
    '12-16': 0,
    '8-11': 0,
    '6-7': 0,
    '1-5': 0,
    '0': 0
  },
  by_error_type: {
    http_404: 0,
    http_422_etf: 0,
    http_429_rate_limit: 0,
    http_500: 0,
    method_count_low: 0,
    iv_zero: 0,
    timeout: 0,
    other: 0
  },
  failing_stocks: [],
  partial_stocks: [],
  passing_stocks: []
};

// Test a single stock
async function testStock(ticker) {
  return new Promise((resolve) => {
    const url = `${PROD_URL}/api/iv/${encodeURIComponent(ticker)}/chart`;
    const startTime = Date.now();

    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        try {
          const result = {
            ticker,
            status: res.statusCode,
            methods: 0,
            iv: 0,
            sector: 'Unknown',
            classification: 'unknown',
            responseTime,
            error: null,
            raw_response: null
          };

          if (res.statusCode === 200 && data) {
            const parsed = JSON.parse(data);

            // Extract available methods count
            if (parsed.available_methods && Array.isArray(parsed.available_methods)) {
              result.methods = parsed.available_methods.length;
            }

            // Extract intrinsic value from first method (AlfaValue™)
            // Backend returns array of methods, not top-level IV field
            if (parsed.methods && Array.isArray(parsed.methods) && parsed.methods.length > 0) {
              const firstMethod = parsed.methods[0];
              if (firstMethod.iv !== undefined && firstMethod.iv !== null) {
                result.iv = firstMethod.iv;
              }
            }

            // Extract classification and sector
            if (parsed.stock_classification) {
              result.classification = parsed.stock_classification;
            }
            if (parsed.sector) {
              result.sector = parsed.sector;
            }

            // Store failed methods for debugging
            if (parsed.failedMethods && parsed.failedMethods.length > 0) {
              result.raw_response = {
                failedMethods: parsed.failedMethods.slice(0, 3) // First 3 failures
              };
            }

          } else if (res.statusCode === 422) {
            // ETF rejection - expected behavior
            result.error = 'ETF_REJECTED';
          } else if (res.statusCode === 404) {
            result.error = 'HTTP 404 (profile missing)';
          } else if (res.statusCode === 429) {
            result.error = 'HTTP 429 (rate limit - CRITICAL)';
          } else if (res.statusCode === 500) {
            result.error = 'HTTP 500 (backend error)';
            // Try to extract error message
            try {
              const errorData = JSON.parse(data);
              if (errorData.error) {
                result.error += `: ${errorData.error}`;
              }
            } catch (e) {
              // Ignore parse errors
            }
          } else {
            result.error = `HTTP ${res.statusCode}`;
          }

          resolve(result);
        } catch (err) {
          resolve({
            ticker,
            status: res.statusCode,
            methods: 0,
            iv: 0,
            sector: 'Unknown',
            classification: 'unknown',
            responseTime: Date.now() - startTime,
            error: `Parse error: ${err.message}`
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        ticker,
        status: 0,
        methods: 0,
        iv: 0,
        sector: 'Unknown',
        classification: 'unknown',
        responseTime: Date.now() - startTime,
        error: `Request error: ${err.message}`
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        ticker,
        status: 0,
        methods: 0,
        iv: 0,
        sector: 'Unknown',
        classification: 'unknown',
        responseTime: 30000,
        error: 'Timeout (30s)'
      });
    });
  });
}

// Categorize result
function categorizeResult(result) {
  // ETF rejection = not counted (expected behavior)
  if (result.error === 'ETF_REJECTED') {
    results.by_error_type.http_422_etf++;
    return 'ETF';
  }

  // Pass: HTTP 200 + methods >= 6 + IV > 0
  if (result.status === 200 && result.methods >= 6 && result.iv > 0) {
    results.summary.pass++;
    results.passing_stocks.push(result);

    // Update sector stats
    if (!results.by_sector[result.sector]) {
      results.by_sector[result.sector] = { pass: 0, partial: 0, fail: 0 };
    }
    results.by_sector[result.sector].pass++;

    // Update method count distribution
    if (result.methods >= 12 && result.methods <= 16) {
      results.by_method_count['12-16']++;
    } else if (result.methods >= 8 && result.methods <= 11) {
      results.by_method_count['8-11']++;
    } else if (result.methods >= 6 && result.methods <= 7) {
      results.by_method_count['6-7']++;
    }

    return 'PASS';
  }

  // Partial: HTTP 200 but methods < 6 or IV = 0 (degraded service)
  if (result.status === 200) {
    results.summary.partial++;
    results.partial_stocks.push(result);

    if (!results.by_sector[result.sector]) {
      results.by_sector[result.sector] = { pass: 0, partial: 0, fail: 0 };
    }
    results.by_sector[result.sector].partial++;

    if (result.methods >= 1 && result.methods <= 5) {
      results.by_method_count['1-5']++;
    } else if (result.methods === 0) {
      results.by_method_count['0']++;
    }

    if (result.methods < 6) {
      results.by_error_type.method_count_low++;
    }
    if (result.iv === 0) {
      results.by_error_type.iv_zero++;
    }

    return 'PARTIAL';
  }

  // Fail: All other cases
  results.summary.fail++;
  results.failing_stocks.push(result);

  if (!results.by_sector[result.sector]) {
    results.by_sector[result.sector] = { pass: 0, partial: 0, fail: 0 };
  }
  results.by_sector[result.sector].fail++;

  results.by_method_count['0']++;

  // Categorize error type
  if (result.status === 404) {
    results.by_error_type.http_404++;
  } else if (result.status === 429) {
    results.by_error_type.http_429_rate_limit++;
  } else if (result.status === 500) {
    results.by_error_type.http_500++;
  } else if (result.error && result.error.includes('Timeout')) {
    results.by_error_type.timeout++;
  } else {
    results.by_error_type.other++;
  }

  return 'FAIL';
}

// Save checkpoint
function saveCheckpoint() {
  const checkpointPath = join(__dirname, '../../validation-results/checkpoint-fase1-agent1.json');
  fs.mkdirSync(dirname(checkpointPath), { recursive: true });
  fs.writeFileSync(checkpointPath, JSON.stringify(results, null, 2));
}

// Main validation loop
async function runValidation() {
  const startTime = Date.now();

  for (let i = 0; i < allStocks.length; i++) {
    const ticker = allStocks[i];

    try {
      const result = await testStock(ticker);
      const category = categorizeResult(result);
      results.total_tested++;

      // Progress log
      if ((i + 1) % PROGRESS_INTERVAL === 0) {
        const percent = ((i + 1) / allStocks.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        const passRate = ((results.summary.pass / results.total_tested) * 100).toFixed(1);
        console.log(`[${i + 1}/${allStocks.length}] ${percent}% | ${elapsed}min | Pass: ${results.summary.pass} (${passRate}%) | Partial: ${results.summary.partial} | Fail: ${results.summary.fail}`);
      }

      // Checkpoint
      if ((i + 1) % CHECKPOINT_INTERVAL === 0) {
        saveCheckpoint();
        console.log(`📋 Checkpoint saved (${i + 1} stocks tested)`);
      }

      // Rate limit delay
      if (i < allStocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } catch (err) {
      console.error(`❌ Error testing ${ticker}:`, err.message);
      results.summary.fail++;
      results.by_error_type.other++;
      results.failing_stocks.push({
        ticker,
        status: 0,
        methods: 0,
        iv: 0,
        sector: 'Unknown',
        classification: 'unknown',
        error: err.message
      });
    }
  }

  // Calculate final stats
  const endTime = Date.now();
  results.duration_minutes = ((endTime - startTime) / 1000 / 60).toFixed(1);
  results.summary.pass_rate = ((results.summary.pass / results.total_tested) * 100).toFixed(1) + '%';

  return results;
}

// Generate markdown report
function generateMarkdownReport(results) {
  const target = Math.ceil(1418); // 95% of 1,493
  const gap = target - results.summary.pass;
  const status = gap <= 0 ? '✅ TARGET MET' : '❌ BELOW TARGET';

  return `# FASE 1 - Agent 1.1: IV Calculation Accuracy Report

**Date:** ${results.timestamp}
**Duration:** ${results.duration_minutes} minutes
**Stocks Tested:** ${results.total_tested} / 1,493

## Executive Summary

**Overall Pass Rate:** ${results.summary.pass}/${results.total_tested} (${results.summary.pass_rate})
**Target:** ≥95% (1,418 stocks)
**Status:** ${status}
${gap > 0 ? `**Gap:** ${gap} stocks below target` : '**Exceeded target!**'}

### Result Breakdown
- ✅ **PASS:** ${results.summary.pass} stocks (${((results.summary.pass / results.total_tested) * 100).toFixed(1)}%)
- ⚠️ **PARTIAL:** ${results.summary.partial} stocks (${((results.summary.partial / results.total_tested) * 100).toFixed(1)}%)
- ❌ **FAIL:** ${results.summary.fail} stocks (${((results.summary.fail / results.total_tested) * 100).toFixed(1)}%)

## Pass Criteria
- ✅ **PASS:** HTTP 200 + ≥6 methods + IV > $0
- ⚠️ **PARTIAL:** HTTP 200 but <6 methods OR IV = $0 (degraded)
- ❌ **FAIL:** HTTP 404/429/500 or timeout

## Sector Performance

| Sector | Pass | Partial | Fail | Total | Pass Rate |
|--------|------|---------|------|-------|-----------|
${Object.entries(results.by_sector)
  .sort((a, b) => {
    const totalA = a[1].pass + a[1].partial + a[1].fail;
    const totalB = b[1].pass + b[1].partial + b[1].fail;
    const rateA = (a[1].pass / totalA) * 100;
    const rateB = (b[1].pass / totalB) * 100;
    return rateB - rateA;
  })
  .map(([sector, stats]) => {
    const total = stats.pass + stats.partial + stats.fail;
    const rate = ((stats.pass / total) * 100).toFixed(1);
    return `| ${sector.padEnd(14)} | ${String(stats.pass).padStart(4)} | ${String(stats.partial).padStart(7)} | ${String(stats.fail).padStart(4)} | ${String(total).padStart(5)} | ${String(rate).padStart(5)}% |`;
  })
  .join('\n')}

## Method Count Distribution

${Object.entries(results.by_method_count)
  .map(([range, count]) => {
    const pct = ((count / results.total_tested) * 100).toFixed(1);
    return `- **${range} methods:** ${count} stocks (${pct}%)`;
  })
  .join('\n')}

## Error Analysis

${Object.entries(results.by_error_type)
  .filter(([, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => {
    const pct = ((count / results.total_tested) * 100).toFixed(1);
    return `- **${type}:** ${count} stocks (${pct}%)`;
  })
  .join('\n')}

## Top 20 Failures

${results.failing_stocks.slice(0, 20).map((stock, i) =>
  `${i + 1}. **${stock.ticker}** (${stock.classification}): ${stock.error}`
).join('\n')}

${results.failing_stocks.length > 20 ? `\n*...and ${results.failing_stocks.length - 20} more failures*` : ''}

## Recommendations

${gap > 0 ? `
### P0 Issues (Critical)
1. **Rate Limit Errors:** ${results.by_error_type.http_429_rate_limit} stocks hit FMP rate limits
   - Action: Implement intelligent caching and request batching
2. **Profile Missing:** ${results.by_error_type.http_404} stocks return 404 errors
   - Action: Verify FMP coverage and add fallback data sources

### P1 Issues (High Priority)
1. **Low Method Count:** ${results.by_error_type.method_count_low} stocks have <6 methods
   - Action: Investigate missing financial data
2. **Zero IV:** ${results.by_error_type.iv_zero} stocks return $0 intrinsic value
   - Action: Review calculation logic for negative FCF cases
` : `
### System Status: ✅ PRODUCTION READY
- Target met! System is performing as expected
- Continue monitoring edge cases in partial results
- Focus on improving cache hit rates
`}

---
*Generated by FASE 1 - Agent 1.1 validation script*
`;
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting validation...\n');

    const validationResults = await runValidation();

    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total tested: ${validationResults.total_tested}/${allStocks.length}`);
    console.log(`Duration: ${validationResults.duration_minutes} minutes`);
    console.log(`Pass rate: ${validationResults.summary.pass_rate}`);
    console.log('='.repeat(80) + '\n');

    // Generate reports
    const timestamp = new Date().toISOString().split('T')[0];
    const mdReport = generateMarkdownReport(validationResults);

    // Save reports
    const reportsDir = join(__dirname, '../../validation-results');
    fs.mkdirSync(reportsDir, { recursive: true });

    const jsonPath = join(reportsDir, `FASE1_AGENT1_IV_CALCULATION_RESULTS.json`);
    const mdPath = join(reportsDir, `FASE1_AGENT1_IV_CALCULATION_REPORT.md`);
    const csvPath = join(reportsDir, `FASE1_AGENT1_DETAILED_${timestamp}.csv`);

    // Save JSON
    fs.writeFileSync(jsonPath, JSON.stringify(validationResults, null, 2));

    // Save markdown
    fs.writeFileSync(mdPath, mdReport);

    // Generate and save CSV
    const csv = [
      'Ticker,Status,Methods,IV,Sector,Classification,ResponseTime,Error,Result',
      ...validationResults.passing_stocks.map(s =>
        `${s.ticker},${s.status},${s.methods},${s.iv.toFixed(2)},${s.sector},${s.classification},${s.responseTime},,PASS`
      ),
      ...validationResults.partial_stocks.map(s =>
        `${s.ticker},${s.status},${s.methods},${s.iv.toFixed(2)},${s.sector},${s.classification},${s.responseTime},"${s.error || 'Low methods/Zero IV'}",PARTIAL`
      ),
      ...validationResults.failing_stocks.map(s =>
        `${s.ticker},${s.status},${s.methods},${s.iv.toFixed(2)},${s.sector},${s.classification},${s.responseTime},"${s.error || 'Unknown'}",FAIL`
      )
    ].join('\n');

    fs.writeFileSync(csvPath, csv);

    console.log('📄 REPORTS GENERATED:');
    console.log(`   - ${jsonPath}`);
    console.log(`   - ${mdPath}`);
    console.log(`   - ${csvPath}`);
    console.log('');

    // Print summary
    const target = 1418;
    const gap = target - validationResults.summary.pass;
    const passStatus = gap <= 0 ? '✅ PASS' : '❌ FAIL';

    console.log('FINAL SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Pass Rate: ${validationResults.summary.pass}/${validationResults.total_tested} (${validationResults.summary.pass_rate})`);
    console.log(`Target: ≥95% (${target} stocks)`);
    console.log(`Status: ${passStatus}`);
    if (gap > 0) {
      console.log(`Gap: ${gap} stocks below target`);
    }
    console.log('');
    console.log(`Top Issues:`);
    const topIssues = Object.entries(validationResults.by_error_type)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    topIssues.forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} stocks`);
    });
    console.log('='.repeat(80));

    process.exit(gap > 0 ? 1 : 0);

  } catch (err) {
    console.error('❌ FATAL ERROR:', err);
    process.exit(1);
  }
}

main();
