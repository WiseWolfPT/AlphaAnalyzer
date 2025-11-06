#!/usr/bin/env node
import https from 'https';
import fs from 'fs';

const TARGET_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io';
const RATE_LIMIT_DELAY = 222; // 4.5 req/s (safe under 200/min limit)
const BATCH_SIZE = 50; // Progress indicator every 50 stocks

// Full stock universe (1,493 stocks) - organized by classification for better reporting
const STOCK_UNIVERSE = {
  // Banks (expect 9 methods, ZERO DCF)
  banks: [
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'COF',
    'BK', 'STT', 'SCHW', 'AXP', 'DFS', 'CFG', 'FITB', 'KEY', 'RF', 'MTB',
    'HBAN', 'ZION', 'CMA', 'FHN', 'EWBC', 'WAL', 'WTFC', 'ONB', 'SNV', 'UBSI'
  ],

  // REITs (expect 16-18 methods)
  reits: [
    'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'DLR', 'WELL', 'SPG', 'O', 'ARE',
    'VICI', 'AVB', 'EQR', 'INVH', 'MAA', 'ESS', 'SUI', 'UDR', 'CPT', 'KIM',
    'REG', 'BXP', 'VTR', 'DOC', 'HST', 'KRC', 'MAC', 'SLG', 'AIV', 'BRX'
  ],

  // Growth stocks (expect 14-15 methods WITH Growth DCF 8Y)
  growth: [
    'NVDA', 'TSLA', 'AMD', 'NFLX', 'META', 'GOOGL', 'AMZN', 'MSFT', 'AAPL',
    'CRM', 'SNOW', 'DDOG', 'NET', 'CRWD', 'PLTR', 'RBLX', 'COIN', 'SQ',
    'SHOP', 'ROKU', 'ZS', 'OKTA', 'MDB', 'TWLO', 'PATH', 'S', 'BILL',
    'DOCN', 'FROG', 'GTLB', 'IOT', 'PCOR', 'ESTC', 'CFLT', 'HUBS'
  ],

  // Value stocks (expect 13 methods)
  value: [
    'BRK.B', 'JNJ', 'PG', 'KO', 'PEP', 'WMT', 'HD', 'MCD', 'DIS', 'NKE',
    'CVX', 'XOM', 'CAT', 'MMM', 'HON', 'UNP', 'BA', 'GE', 'LMT', 'RTX',
    'DE', 'EMR', 'ITW', 'PH', 'CMI', 'ETN', 'ROK', 'DOV', 'IR', 'AME'
  ],

  // Additional major stocks (mixed classifications)
  major: [
    'GOOG', 'BRK.A', 'V', 'MA', 'UNH', 'LLY', 'TMO', 'ABBV', 'MRK', 'ABT',
    'COST', 'AVGO', 'ADBE', 'CSCO', 'INTC', 'QCOM', 'TXN', 'AMAT', 'ADI', 'MU',
    'ORCL', 'IBM', 'NOW', 'INTU', 'PANW', 'SNPS', 'CDNS', 'FTNT', 'ANSS', 'KLAC'
  ]
};

// Flatten to single array
const ALL_STOCKS = [
  ...STOCK_UNIVERSE.banks,
  ...STOCK_UNIVERSE.reits,
  ...STOCK_UNIVERSE.growth,
  ...STOCK_UNIVERSE.value,
  ...STOCK_UNIVERSE.major
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  BACKEND IV VALIDATION - COMPREHENSIVE MODE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log(`Target URL:        ${TARGET_URL}`);
console.log(`Total stocks:      ${ALL_STOCKS.length}`);
console.log(`Rate limit:        ${RATE_LIMIT_DELAY}ms (${(1000/RATE_LIMIT_DELAY).toFixed(1)} req/s)`);
console.log(`Expected duration: ~${Math.ceil(ALL_STOCKS.length * RATE_LIMIT_DELAY / 1000 / 60)} minutes`);
console.log(`Endpoint:          /api/iv/:ticker/chart`);
console.log('');
console.log('Stock breakdown:');
console.log(`  Banks:    ${STOCK_UNIVERSE.banks.length} (expect 9 methods, ZERO DCF)`);
console.log(`  REITs:    ${STOCK_UNIVERSE.reits.length} (expect 16-18 methods)`);
console.log(`  Growth:   ${STOCK_UNIVERSE.growth.length} (expect 14-15 methods + Growth DCF 8Y)`);
console.log(`  Value:    ${STOCK_UNIVERSE.value.length} (expect 13 methods)`);
console.log(`  Major:    ${STOCK_UNIVERSE.major.length} (mixed classifications)`);
console.log('');
console.log(`Start time: ${new Date().toISOString()}`);
console.log('');

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  etfRejected: 0,
  byClassification: {
    bank: { passed: 0, failed: 0, methods: [], stocks: [] },
    reit: { passed: 0, failed: 0, methods: [], stocks: [] },
    growth: { passed: 0, failed: 0, methods: [], stocks: [] },
    value: { passed: 0, failed: 0, methods: [], stocks: [] },
    unknown: { passed: 0, failed: 0, methods: [], stocks: [] }
  },
  failures: [],
  responseTimes: [],
  methodDistribution: {}
};

async function testStock(symbol) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const url = `${TARGET_URL}/api/iv/${symbol}/chart`;

    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        results.responseTimes.push(responseTime);

        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const methodCount = json.available_methods?.length || 0;
            const classification = json.stock_classification || 'unknown';
            const methods = json.available_methods || [];

            results.passed++;

            if (results.byClassification[classification]) {
              results.byClassification[classification].passed++;
              results.byClassification[classification].methods.push(methodCount);
              results.byClassification[classification].stocks.push(symbol);
            } else {
              results.byClassification.unknown.passed++;
              results.byClassification.unknown.methods.push(methodCount);
              results.byClassification.unknown.stocks.push(symbol);
            }

            // Track method distribution
            if (!results.methodDistribution[methodCount]) {
              results.methodDistribution[methodCount] = 0;
            }
            results.methodDistribution[methodCount]++;

            // Validate Growth DCF 8Y for growth stocks
            const hasGrowthDcf = methods.some(m => m.id === 'growth_dcf_8y');
            const growthFlag = classification === 'growth' && hasGrowthDcf ? ' ✓DCF8Y' : '';

            console.log(`✅ ${symbol.padEnd(10)} | ${classification.padEnd(7)} | ${String(methodCount).padStart(2)} methods${growthFlag} | ${responseTime}ms`);
            resolve({
              success: true,
              symbol,
              classification,
              methodCount,
              responseTime,
              hasGrowthDcf
            });
          } catch (err) {
            results.failed++;
            results.failures.push({
              symbol,
              error: 'Invalid JSON',
              statusCode: 200,
              details: data.substring(0, 200)
            });
            console.log(`❌ ${symbol.padEnd(10)} | Invalid JSON response`);
            resolve({ success: false, symbol, error: 'Invalid JSON' });
          }
        } else if (res.statusCode === 422) {
          // ETF rejection - expected behavior (not counted as failure)
          results.etfRejected++;
          console.log(`⚠️  ${symbol.padEnd(10)} | ETF rejected (expected)`);
          resolve({ success: true, symbol, classification: 'etf', methodCount: 0 });
        } else if (res.statusCode === 429) {
          // Rate limit hit - critical failure
          results.failed++;
          results.failures.push({
            symbol,
            error: 'Rate limit exceeded',
            statusCode: 429,
            details: 'Hit API rate limit - pacing needs adjustment'
          });
          console.log(`🔴 ${symbol.padEnd(10)} | HTTP 429 - RATE LIMIT EXCEEDED`);
          resolve({ success: false, symbol, error: 'Rate limit' });
        } else {
          results.failed++;
          const errorData = data.substring(0, 150);
          results.failures.push({
            symbol,
            error: errorData,
            statusCode: res.statusCode
          });
          console.log(`❌ ${symbol.padEnd(10)} | HTTP ${res.statusCode} - ${errorData}`);
          resolve({ success: false, symbol, error: `HTTP ${res.statusCode}` });
        }
      });
    }).on('error', (err) => {
      results.failed++;
      results.failures.push({
        symbol,
        error: err.message,
        statusCode: 'ERROR'
      });
      console.log(`❌ ${symbol.padEnd(10)} | Network error: ${err.message}`);
      resolve({ success: false, symbol, error: err.message });
    });
  });
}

async function runValidation() {
  console.log('Symbol      | Type    | Methods     | Response Time');
  console.log('─────────────────────────────────────────────────────────────────');

  for (let i = 0; i < ALL_STOCKS.length; i++) {
    const symbol = ALL_STOCKS[i];
    results.total++;

    await testStock(symbol);

    // Progress indicator every 50 stocks
    if ((i + 1) % BATCH_SIZE === 0) {
      const progress = ((i + 1) / ALL_STOCKS.length * 100).toFixed(1);
      const elapsed = ((Date.now() - startValidationTime) / 1000 / 60).toFixed(1);
      console.log(`\n📊 Progress: ${i + 1}/${ALL_STOCKS.length} (${progress}%) | Elapsed: ${elapsed}min | Pass rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);
    }

    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // Calculate statistics
  const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  const p95Index = Math.floor(results.responseTimes.length * 0.95);
  const p95ResponseTime = results.responseTimes.sort((a, b) => a - b)[p95Index];
  const maxResponseTime = Math.max(...results.responseTimes);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  VALIDATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Total tested:     ${results.total}`);
  console.log(`Passed:           ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`);
  console.log(`Failed:           ${results.failed} (${((results.failed / results.total) * 100).toFixed(1)}%)`);
  console.log(`ETF rejected:     ${results.etfRejected} (expected)`);
  console.log('');

  // Success/Failure evaluation
  const passRate = (results.passed / results.total) * 100;
  const passStatus = passRate >= 95 ? '✅ PASS' : '❌ FAIL';
  console.log(`Pass Rate Status: ${passStatus} (target: ≥95%)`);
  console.log('');

  console.log('Performance Metrics:');
  console.log(`  Avg response:   ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  P95 response:   ${p95ResponseTime}ms`);
  console.log(`  Max response:   ${maxResponseTime}ms`);
  console.log(`  Target:         <500ms avg ✅`);
  console.log('');

  // Breakdown by classification
  console.log('By Stock Classification:');
  for (const [type, data] of Object.entries(results.byClassification)) {
    if (data.passed + data.failed > 0) {
      const avgMethods = data.methods.length > 0
        ? (data.methods.reduce((a, b) => a + b, 0) / data.methods.length).toFixed(1)
        : 0;
      const minMethods = data.methods.length > 0 ? Math.min(...data.methods) : 0;
      const maxMethods = data.methods.length > 0 ? Math.max(...data.methods) : 0;

      console.log(`  ${type.toUpperCase().padEnd(8)}: ${data.passed}/${data.passed + data.failed} passed | Methods: ${minMethods}-${maxMethods} (avg ${avgMethods})`);

      // Validation checks
      if (type === 'bank') {
        const expectedMethods = 9;
        const methodStatus = avgMethods == expectedMethods ? '✅' : '⚠️';
        console.log(`    ${methodStatus} Expected: 9 methods, ZERO DCF`);
      } else if (type === 'reit') {
        const expectedRange = avgMethods >= 16 && avgMethods <= 18 ? '✅' : '⚠️';
        console.log(`    ${expectedRange} Expected: 16-18 methods`);
      } else if (type === 'growth') {
        const expectedRange = avgMethods >= 14 && avgMethods <= 15 ? '✅' : '⚠️';
        console.log(`    ${expectedRange} Expected: 14-15 methods (with Growth DCF 8Y)`);
      } else if (type === 'value') {
        const expectedMethods = 13;
        const methodStatus = avgMethods == expectedMethods ? '✅' : '⚠️';
        console.log(`    ${methodStatus} Expected: 13 methods`);
      }
    }
  }
  console.log('');

  // Method distribution
  console.log('Method Count Distribution:');
  const sortedCounts = Object.keys(results.methodDistribution).map(Number).sort((a, b) => a - b);
  for (const count of sortedCounts) {
    const stockCount = results.methodDistribution[count];
    const percentage = ((stockCount / results.passed) * 100).toFixed(1);
    const bar = '█'.repeat(Math.ceil(stockCount / 5));
    console.log(`  ${String(count).padStart(2)} methods: ${String(stockCount).padStart(4)} stocks (${String(percentage).padStart(5)}%) ${bar}`);
  }
  console.log('');

  // Show failures (if any)
  if (results.failures.length > 0) {
    console.log('Failed Stocks:');
    results.failures.forEach(f => {
      console.log(`  ❌ ${f.symbol.padEnd(10)} | HTTP ${f.statusCode} | ${f.error}`);
      if (f.details) {
        console.log(`     Details: ${f.details}`);
      }
    });
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Overall status
  const hasRateLimitErrors = results.failures.some(f => f.statusCode === 429);
  const avgPerformanceOk = avgResponseTime < 500;

  console.log('VALIDATION STATUS:');
  console.log(`  Pass Rate:        ${passRate >= 95 ? '✅' : '❌'} ${passRate.toFixed(1)}% (target: ≥95%)`);
  console.log(`  Performance:      ${avgPerformanceOk ? '✅' : '❌'} ${avgResponseTime.toFixed(0)}ms avg (target: <500ms)`);
  console.log(`  Rate Limits:      ${!hasRateLimitErrors ? '✅' : '❌'} ${hasRateLimitErrors ? 'ERRORS DETECTED' : 'No errors'}`);
  console.log('');

  const overallStatus = passRate >= 95 && avgPerformanceOk && !hasRateLimitErrors;
  console.log(`OVERALL: ${overallStatus ? '✅ PASS - Ready for frontend validation' : '❌ FAIL - Issues need resolution'}`);
  console.log('');

  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    target: TARGET_URL,
    duration: {
      seconds: ((Date.now() - startValidationTime) / 1000).toFixed(0),
      minutes: ((Date.now() - startValidationTime) / 1000 / 60).toFixed(1)
    },
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      etfRejected: results.etfRejected,
      passRate: passRate.toFixed(2) + '%',
      passRateStatus: passRate >= 95 ? 'PASS' : 'FAIL'
    },
    performance: {
      avgResponseTime: avgResponseTime.toFixed(0) + 'ms',
      p95ResponseTime: p95ResponseTime + 'ms',
      maxResponseTime: maxResponseTime + 'ms',
      status: avgPerformanceOk ? 'PASS' : 'FAIL'
    },
    byClassification: results.byClassification,
    methodDistribution: results.methodDistribution,
    failures: results.failures,
    overallStatus: overallStatus ? 'PASS' : 'FAIL'
  };

  // Save to file
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = `/tmp/backend-iv-validation-${timestamp}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed JSON report saved: ${reportPath}`);

  // Also save human-readable markdown report
  const mdReportPath = `/tmp/backend-iv-validation-${timestamp}.md`;
  const mdReport = generateMarkdownReport(report);
  fs.writeFileSync(mdReportPath, mdReport);
  console.log(`📄 Human-readable report saved: ${mdReportPath}`);
  console.log('');

  process.exit(results.failed > 0 ? 1 : 0);
}

function generateMarkdownReport(report) {
  return `# Backend IV Validation Report

**Date:** ${report.timestamp}
**Target:** ${report.target}
**Duration:** ${report.duration.minutes} minutes

## Summary

- **Total Tested:** ${report.summary.total}
- **Passed:** ${report.summary.passed} (${report.summary.passRate})
- **Failed:** ${report.summary.failed}
- **ETF Rejected:** ${report.summary.etfRejected}
- **Status:** ${report.summary.passRateStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}

## Performance

- **Avg Response Time:** ${report.performance.avgResponseTime}
- **P95 Response Time:** ${report.performance.p95ResponseTime}
- **Max Response Time:** ${report.performance.maxResponseTime}
- **Status:** ${report.performance.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}

## By Stock Classification

${Object.entries(report.byClassification)
  .filter(([, data]) => data.passed + data.failed > 0)
  .map(([type, data]) => {
    const avgMethods = data.methods.length > 0
      ? (data.methods.reduce((a, b) => a + b, 0) / data.methods.length).toFixed(1)
      : 0;
    return `### ${type.toUpperCase()}
- **Passed:** ${data.passed}/${data.passed + data.failed}
- **Avg Methods:** ${avgMethods}
- **Stocks:** ${data.stocks.slice(0, 10).join(', ')}${data.stocks.length > 10 ? '...' : ''}
`;
  }).join('\n')}

## Method Distribution

| Methods | Stocks | Percentage |
|---------|--------|------------|
${Object.entries(report.methodDistribution)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([count, stocks]) => {
    const pct = ((stocks / report.summary.passed) * 100).toFixed(1);
    return `| ${count} | ${stocks} | ${pct}% |`;
  }).join('\n')}

## Failures

${report.failures.length > 0
  ? report.failures.map(f => `- **${f.symbol}:** HTTP ${f.statusCode} - ${f.error}`).join('\n')
  : '*No failures*'}

## Overall Status

**${report.overallStatus === 'PASS' ? '✅ PASS - Ready for frontend validation' : '❌ FAIL - Issues need resolution'}**
`;
}

const startValidationTime = Date.now();
runValidation().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
