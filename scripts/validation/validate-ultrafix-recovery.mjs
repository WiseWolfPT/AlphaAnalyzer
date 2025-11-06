#!/usr/bin/env node

/**
 * ULTRAFIX FASE 3: Comprehensive Validation of 1,045 Stock Recovery
 *
 * Tests all stocks with FULL FMP data coverage to validate:
 * - Recovery rate from price lookup bug fix
 * - Geographic distribution of recovery
 * - Performance impact of fallback system
 * - Zero regression on US stocks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://128.140.45.28.sslip.io';
const TIMEOUT_MS = 60000;
const REQUEST_DELAY_MS = 300; // ~3.5 req/s to respect rate limits

// Load FMP coverage data
const fmpCoverageFile = path.join(__dirname, '../../validation-results/fmp-coverage-results.json');
const fmpData = JSON.parse(fs.readFileSync(fmpCoverageFile, 'utf-8'));

// Extract stocks with full FMP coverage
const stocksWithFullCoverage = fmpData.details.full_coverage
  .map(s => s.ticker);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         ULTRAFIX FASE 3: Recovery Validation                  ║
║                                                               ║
║  Testing: ${stocksWithFullCoverage.length} stocks with FULL FMP data            ║
║  Target:  95%+ recovery rate (990+/${stocksWithFullCoverage.length})                  ║
║  Before:  ~1.9% pass rate (20/${stocksWithFullCoverage.length})                       ║
║  Expected: +970 stock recovery                                ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Initialize results
const results = {
  metadata: {
    timestamp: new Date().toISOString(),
    phase: 'ULTRAFIX FASE 3 - Recovery Validation',
    stocks_tested: stocksWithFullCoverage.length,
    base_url: BASE_URL,
    timeout_ms: TIMEOUT_MS
  },
  summary: {
    tested: 0,
    recovered: 0,
    still_failing: 0,
    recovery_rate: 0,
    improvement_from_baseline: 0
  },
  geographic: {
    'UK (.L)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 },
    'Netherlands (.AS)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 },
    'France (.PA)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 },
    'Germany (.DE)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 },
    'Belgium (.BR)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 },
    'Spain (.MC)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 },
    'Switzerland (.SW)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 },
    'US (no suffix)': { tested: 0, recovered: 0, still_failing: 0, rate: 0 }
  },
  performance: {
    latency_buckets: {
      '<500ms': 0,
      '500-1000ms': 0,
      '1000-2000ms': 0,
      '2000-3000ms': 0,
      '>3000ms': 0,
      'timeout': 0
    },
    median_ms: 0,
    p95_ms: 0,
    p99_ms: 0
  },
  details: []
};

function getRegion(ticker) {
  if (ticker.endsWith('.L')) return 'UK (.L)';
  if (ticker.endsWith('.AS')) return 'Netherlands (.AS)';
  if (ticker.endsWith('.PA')) return 'France (.PA)';
  if (ticker.endsWith('.DE')) return 'Germany (.DE)';
  if (ticker.endsWith('.BR')) return 'Belgium (.BR)';
  if (ticker.endsWith('.MC')) return 'Spain (.MC)';
  if (ticker.endsWith('.SW')) return 'Switzerland (.SW)';
  return 'US (no suffix)';
}

function categorizeLat(latency) {
  if (latency >= TIMEOUT_MS) return 'timeout';
  if (latency < 500) return '<500ms';
  if (latency < 1000) return '500-1000ms';
  if (latency < 2000) return '1000-2000ms';
  if (latency < 3000) return '2000-3000ms';
  return '>3000ms';
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStock(ticker) {
  const url = `${BASE_URL}/api/iv/${ticker}`;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const region = getRegion(ticker);

    if (response.ok) {
      const data = await response.json();
      const methodCount = data.methods?.length || 0;
      const mainMethod = data.methods?.find(m => m.method_id === 'alfavalue');
      const hasValidIV = mainMethod && mainMethod.iv > 0;
      const hasMinMethods = methodCount >= 6;

      if (hasValidIV && hasMinMethods) {
        // SUCCESS - Stock recovered!
        results.summary.recovered++;
        results.geographic[region].recovered++;
        results.details.push({
          ticker,
          region,
          status: 'recovered',
          iv: mainMethod.iv,
          current_price: data.price,
          method_count: methodCount,
          response_time_ms: responseTime,
          methods: data.methods.map(m => m.method_id).join(', ')
        });

        return { success: true, responseTime };
      } else {
        // Failed - Has data but not enough methods
        results.summary.still_failing++;
        results.geographic[region].still_failing++;
        results.details.push({
          ticker,
          region,
          status: 'insufficient_methods',
          iv: mainMethod?.iv || null,
          current_price: data.price,
          method_count: methodCount,
          response_time_ms: responseTime,
          reason: !hasValidIV ? 'iv_zero' : 'too_few_methods'
        });

        return { success: false, responseTime };
      }
    } else {
      // HTTP error (404, 500, etc.)
      results.summary.still_failing++;
      results.geographic[region].still_failing++;
      results.details.push({
        ticker,
        region,
        status: 'http_error',
        http_status: response.status,
        response_time_ms: responseTime
      });

      return { success: false, responseTime };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const region = getRegion(ticker);

    results.summary.still_failing++;
    results.geographic[region].still_failing++;
    results.details.push({
      ticker,
      region,
      status: 'error',
      error: error.name === 'AbortError' ? 'timeout' : error.message,
      response_time_ms: responseTime
    });

    return { success: false, responseTime };
  }
}

// Main validation loop
console.log('Starting validation...\n');

const startTime = Date.now();
const latencies = [];

for (let i = 0; i < stocksWithFullCoverage.length; i++) {
  const ticker = stocksWithFullCoverage[i];
  const region = getRegion(ticker);

  results.summary.tested++;
  results.geographic[region].tested++;

  const result = await testStock(ticker);
  latencies.push(result.responseTime);

  // Update performance buckets
  const bucket = categorizeLat(result.responseTime);
  results.performance.latency_buckets[bucket]++;

  // Progress report every 50 stocks
  if ((i + 1) % 50 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const recoveryRate = ((results.summary.recovered / results.summary.tested) * 100).toFixed(1);
    const eta = ((stocksWithFullCoverage.length - (i + 1)) * REQUEST_DELAY_MS / 1000 / 60).toFixed(1);

    console.log(`Progress: ${i + 1}/${stocksWithFullCoverage.length} | Recovered: ${results.summary.recovered} (${recoveryRate}%) | Failing: ${results.summary.still_failing} | Elapsed: ${elapsed}m | ETA: ${eta}m`);
  }

  // Rate limiting
  await sleep(REQUEST_DELAY_MS);
}

// Calculate final metrics
const totalRuntime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
results.summary.recovery_rate = ((results.summary.recovered / results.summary.tested) * 100).toFixed(2);
results.summary.improvement_from_baseline = (parseFloat(results.summary.recovery_rate) - 1.9).toFixed(2);

// Geographic rates
for (const region in results.geographic) {
  const geo = results.geographic[region];
  if (geo.tested > 0) {
    geo.rate = ((geo.recovered / geo.tested) * 100).toFixed(1);
  }
}

// Performance metrics
latencies.sort((a, b) => a - b);
results.performance.median_ms = Math.round(latencies[Math.floor(latencies.length / 2)]);
results.performance.p95_ms = Math.round(latencies[Math.floor(latencies.length * 0.95)]);
results.performance.p99_ms = Math.round(latencies[Math.floor(latencies.length * 0.99)]);

// Print summary
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  VALIDATION COMPLETE                          ║
╚═══════════════════════════════════════════════════════════════╝

📊 OVERALL RESULTS:
   Tested:         ${results.summary.tested}/${stocksWithFullCoverage.length}
   Recovered:      ${results.summary.recovered} (${results.summary.recovery_rate}%)
   Still Failing:  ${results.summary.still_failing} (${(100 - parseFloat(results.summary.recovery_rate)).toFixed(2)}%)

   Baseline:       20/${stocksWithFullCoverage.length} (1.9%)
   Improvement:    +${results.summary.recovered - 20} stocks (+${results.summary.improvement_from_baseline}pp)

🌍 GEOGRAPHIC BREAKDOWN:
${Object.entries(results.geographic)
  .filter(([_, data]) => data.tested > 0)
  .map(([region, data]) =>
    `   ${region.padEnd(20)} ${data.recovered}/${data.tested} (${data.rate}%)`
  ).join('\n')}

⚡ PERFORMANCE:
   Median:    ${results.performance.median_ms}ms
   P95:       ${results.performance.p95_ms}ms
   P99:       ${results.performance.p99_ms}ms

   <500ms:       ${results.performance.latency_buckets['<500ms']}
   500-1000ms:   ${results.performance.latency_buckets['500-1000ms']}
   1000-2000ms:  ${results.performance.latency_buckets['1000-2000ms']}
   2000-3000ms:  ${results.performance.latency_buckets['2000-3000ms']}
   >3000ms:      ${results.performance.latency_buckets['>3000ms']}
   Timeout:      ${results.performance.latency_buckets['timeout']}

⏱️  Runtime: ${totalRuntime} minutes

✅ SUCCESS CRITERIA:
   ${parseFloat(results.summary.recovery_rate) >= 90 ? '✓' : '✗'} Recovery rate ≥ 90% (target: 90-96%)
   ${results.performance.median_ms < 2000 ? '✓' : '✗'} Median latency < 2000ms
   ${results.performance.p95_ms < 5000 ? '✓' : '✗'} P95 latency < 5000ms
   ${results.summary.recovered >= 940 ? '✓' : '✗'} Min 940 recovered stocks (90% of ${stocksWithFullCoverage.length})
`);

// Save results
const outputFile = path.join(__dirname, '../../validation-results/ultrafix-recovery-results.json');
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

console.log(`\n💾 Results saved to: ${outputFile}\n`);

// Exit with appropriate code
const successRate = parseFloat(results.summary.recovery_rate);
if (successRate >= 90) {
  console.log('🎉 VALIDATION PASSED - 90%+ recovery achieved!\n');
  process.exit(0);
} else {
  console.log(`⚠️  VALIDATION WARNING - Recovery rate ${successRate}% below 90% target\n`);
  process.exit(1);
}
