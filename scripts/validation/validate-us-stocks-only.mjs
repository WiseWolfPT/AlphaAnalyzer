#!/usr/bin/env node

/**
 * US Stocks IV Validation - Tests only US-listed stocks
 *
 * Filters out European tickers (.L, .AS, .DE, .PA, .MC, etc.)
 * to get true pass rate for production-ready stocks.
 */

import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROD_URL = 'https://128.140.45.28.sslip.io';
const RATE_LIMIT_DELAY = 285; // 3.5 req/s max
const PROGRESS_INTERVAL = 50;

// Load stock universe
const fmpReport = JSON.parse(fs.readFileSync(join(__dirname, '../../FMP_COVERAGE_REPORT.json'), 'utf8'));
const allStocks = fmpReport.details.exists;

// Filter to US-only stocks (no European exchanges)
const europeanExchanges = ['.L', '.AS', '.DE', '.PA', '.MC', '.BR', '.LS', '.F'];
const usStocks = allStocks.filter(ticker => {
  return !europeanExchanges.some(exchange => ticker.endsWith(exchange));
});

console.log(`\n${'='.repeat(60)}`);
console.log(`US STOCKS IV VALIDATION`);
console.log(`${'='.repeat(60)}`);
console.log(`Total universe: ${allStocks.length} stocks`);
console.log(`Filtered to US: ${usStocks.length} stocks`);
console.log(`Excluded European: ${allStocks.length - usStocks.length} stocks`);
console.log(`Target: https://128.140.45.28.sslip.io/api/iv/{TICKER}`);
console.log(`Started: ${new Date().toISOString()}`);
console.log(`${'='.repeat(60)}\n`);

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  total_tested: 0,
  total_universe: usStocks.length,
  duration_minutes: 0,
  summary: {
    pass: 0,
    partial: 0,
    fail: 0,
    pass_rate: '0%'
  },
  by_method_count: {
    '12-16': 0,
    '8-11': 0,
    '6-7': 0,
    '1-5': 0,
    '0': 0
  },
  by_error_type: {
    http_404: 0,
    http_500: 0,
    method_count_low: 0,
    iv_zero: 0,
    other: 0
  },
  failing_stocks: [],
  partial_stocks: [],
  passing_stocks: []
};

// Test a single stock
async function testStock(ticker) {
  return new Promise((resolve, reject) => {
    const url = `${PROD_URL}/api/iv/${encodeURIComponent(ticker)}`;

    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = {
            ticker,
            status: res.statusCode,
            methods: 0,
            iv: 0,
            error: null
          };

          if (res.statusCode === 200 && data) {
            const parsed = JSON.parse(data);

            if (parsed.methods && Array.isArray(parsed.methods)) {
              result.methods = parsed.methods.length;

              // Calculate median IV from methods (intrinsicValue field may be null)
              const methodIVs = parsed.methods
                .map(m => m.iv)
                .filter(iv => iv !== undefined && iv !== null && iv > 0)
                .sort((a, b) => a - b);

              if (methodIVs.length > 0) {
                const midIndex = Math.floor(methodIVs.length / 2);
                result.iv = methodIVs.length % 2 === 0
                  ? (methodIVs[midIndex - 1] + methodIVs[midIndex]) / 2
                  : methodIVs[midIndex];
              }
            }
          } else if (res.statusCode === 404) {
            result.error = 'HTTP 404 (profile missing)';
          } else if (res.statusCode === 500) {
            result.error = 'HTTP 500 (backend error)';
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
            error: `Parse error: ${err.message}`
          });
        }
      });
    });

    req.on('error', (err) => {
      if (err.message.includes('429')) {
        setTimeout(() => testStock(ticker).then(resolve).catch(reject), 2000);
      } else {
        resolve({
          ticker,
          status: 0,
          methods: 0,
          iv: 0,
          error: `Request error: ${err.message}`
        });
      }
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        ticker,
        status: 0,
        methods: 0,
        iv: 0,
        error: 'Timeout (30s)'
      });
    });
  });
}

// Categorize result
function categorizeResult(result) {
  // Pass: HTTP 200 + methods >= 6 + IV > 0
  if (result.status === 200 && result.methods >= 6 && result.iv > 0) {
    results.summary.pass++;
    results.passing_stocks.push(result);

    if (result.methods >= 12 && result.methods <= 16) {
      results.by_method_count['12-16']++;
    } else if (result.methods >= 8 && result.methods <= 11) {
      results.by_method_count['8-11']++;
    } else if (result.methods >= 6 && result.methods <= 7) {
      results.by_method_count['6-7']++;
    }

    return 'PASS';
  }

  // Partial: HTTP 200 but methods < 6 or IV = 0
  if (result.status === 200 && (result.methods < 6 || result.iv === 0)) {
    results.summary.partial++;
    results.partial_stocks.push(result);

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

  // Fail
  results.summary.fail++;
  results.failing_stocks.push(result);
  results.by_method_count['0']++;

  if (result.status === 404) {
    results.by_error_type.http_404++;
  } else if (result.status === 500) {
    results.by_error_type.http_500++;
  } else {
    results.by_error_type.other++;
  }

  return 'FAIL';
}

// Main test loop
async function runValidation() {
  const startTime = Date.now();

  for (let i = 0; i < usStocks.length; i++) {
    const ticker = usStocks[i];

    try {
      const result = await testStock(ticker);
      categorizeResult(result);
      results.total_tested++;

      if ((i + 1) % PROGRESS_INTERVAL === 0) {
        const percent = ((i + 1) / usStocks.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`Progress: ${i + 1}/${usStocks.length} (${percent}%) - Elapsed: ${elapsed}min - Pass: ${results.summary.pass}, Partial: ${results.summary.partial}, Fail: ${results.summary.fail}`);
      }

      if (i < usStocks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } catch (err) {
      console.error(`Error testing ${ticker}:`, err.message);
      results.summary.fail++;
      results.failing_stocks.push({
        ticker,
        status: 0,
        methods: 0,
        iv: 0,
        error: err.message
      });
    }
  }

  const endTime = Date.now();
  results.duration_minutes = ((endTime - startTime) / 1000 / 60).toFixed(1);
  results.summary.pass_rate = ((results.summary.pass / results.total_tested) * 100).toFixed(1) + '%';

  return results;
}

// Generate TXT report
function generateTxtReport(results) {
  let report = '';

  report += 'US STOCKS IV VALIDATION\n';
  report += '='.repeat(60) + '\n';
  report += `Tested: ${results.total_tested} US stocks\n`;
  report += `Duration: ${results.duration_minutes} minutes\n`;
  report += `Date: ${results.timestamp}\n\n`;

  report += `OVERALL PASS RATE: ${results.summary.pass}/${results.total_tested} (${results.summary.pass_rate})\n`;
  const target95 = Math.ceil(results.total_tested * 0.95);
  const gap = target95 - results.summary.pass;
  report += `Target 95%: ${target95} stocks\n`;
  report += `Gap: ${gap > 0 ? gap : 0} stocks ${gap > 0 ? 'below' : 'above'} target\n\n`;

  report += 'PASS BREAKDOWN:\n';
  report += `✅ PASS: ${results.summary.pass} stocks (${((results.summary.pass / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `⚠️ PARTIAL: ${results.summary.partial} stocks (${((results.summary.partial / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `❌ FAIL: ${results.summary.fail} stocks (${((results.summary.fail / results.total_tested) * 100).toFixed(1)}%)\n\n`;

  report += 'METHOD COUNT DISTRIBUTION:\n';
  report += `- 12-16 methods: ${results.by_method_count['12-16']} stocks (${((results.by_method_count['12-16'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 8-11 methods: ${results.by_method_count['8-11']} stocks (${((results.by_method_count['8-11'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 6-7 methods: ${results.by_method_count['6-7']} stocks (${((results.by_method_count['6-7'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 1-5 methods: ${results.by_method_count['1-5']} stocks (${((results.by_method_count['1-5'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 0 methods: ${results.by_method_count['0']} stocks (${((results.by_method_count['0'] / results.total_tested) * 100).toFixed(1)}%)\n\n`;

  report += `TOP 20 FAILURES:\n`;
  const topFailures = results.failing_stocks.slice(0, 20);
  for (let i = 0; i < topFailures.length; i++) {
    const stock = topFailures[i];
    report += `${i + 1}. ${stock.ticker}: ${stock.error || 'Unknown error'}\n`;
  }

  report += '\nFAILURE PATTERNS:\n';
  report += `- HTTP 404: ${results.by_error_type.http_404} stocks\n`;
  report += `- HTTP 500: ${results.by_error_type.http_500} stocks\n`;
  report += `- Method count < 6: ${results.by_error_type.method_count_low} stocks\n`;
  report += `- IV = $0: ${results.by_error_type.iv_zero} stocks\n`;
  report += `- Other errors: ${results.by_error_type.other} stocks\n\n`;

  return report;
}

// Main execution
async function main() {
  try {
    console.log('Starting US stocks validation...\n');

    const validationResults = await runValidation();

    console.log('\n' + '='.repeat(60));
    console.log('US STOCKS VALIDATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total tested: ${validationResults.total_tested} US stocks`);
    console.log(`Duration: ${validationResults.duration_minutes} minutes`);
    console.log(`Pass rate: ${validationResults.summary.pass_rate}`);
    console.log('='.repeat(60) + '\n');

    // Generate reports
    const timestamp = new Date().toISOString().split('T')[0];
    const txtReport = generateTxtReport(validationResults);

    // Save reports
    const reportsDir = join(__dirname, '../../validation-results');
    fs.mkdirSync(reportsDir, { recursive: true });

    const txtPath = join(reportsDir, `US_STOCKS_VALIDATION_${timestamp}.txt`);
    const jsonPath = join(reportsDir, `US_STOCKS_VALIDATION_${timestamp}.json`);

    fs.writeFileSync(txtPath, txtReport);
    fs.writeFileSync(jsonPath, JSON.stringify(validationResults, null, 2));

    console.log('FILES GENERATED:');
    console.log(`- ${txtPath}`);
    console.log(`- ${jsonPath}\n`);

    // Print summary
    console.log('COMPACT SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Tested: ${validationResults.total_tested} US stocks`);
    console.log(`Duration: ${validationResults.duration_minutes} minutes`);
    console.log('');
    console.log(`PASS RATE: ${validationResults.summary.pass}/${validationResults.total_tested} (${validationResults.summary.pass_rate})`);
    const target = Math.ceil(validationResults.total_tested * 0.95);
    const gap = target - validationResults.summary.pass;
    console.log(`Target 95%: ${target} stocks`);
    console.log(`Status: ${gap <= 0 ? '✅ TARGET MET' : `❌ BELOW TARGET by ${gap} stocks`}`);
    console.log('');

    console.log('TOP ISSUES:');
    const issues = [
      { type: 'HTTP 404 (profile missing)', count: validationResults.by_error_type.http_404 },
      { type: 'HTTP 500 (backend error)', count: validationResults.by_error_type.http_500 },
      { type: 'Method count < 6', count: validationResults.by_error_type.method_count_low },
      { type: 'IV = $0', count: validationResults.by_error_type.iv_zero }
    ].sort((a, b) => b.count - a.count);

    for (const issue of issues.slice(0, 3)) {
      if (issue.count > 0) {
        console.log(`- ${issue.type}: ${issue.count} stocks`);
      }
    }
    console.log('');

    console.log('METHOD COUNT BREAKDOWN:');
    console.log(`- Excellent (12-16): ${validationResults.by_method_count['12-16']} stocks`);
    console.log(`- Good (8-11): ${validationResults.by_method_count['8-11']} stocks`);
    console.log(`- Acceptable (6-7): ${validationResults.by_method_count['6-7']} stocks`);
    console.log(`- Partial (1-5): ${validationResults.by_method_count['1-5']} stocks`);
    console.log(`- Failing (0): ${validationResults.by_method_count['0']} stocks`);
    console.log('');

    console.log('NEXT STEPS:');
    if (gap > 0) {
      console.log('- Focus on fixing HTTP 404 errors (FMP profile fetch)');
      console.log('- Investigate method count < 6 (data quality)');
      console.log('- Consider excluding low-quality tickers from production');
    } else {
      console.log('- ✅ Target met! US stocks are production ready');
      console.log('- Monitor edge cases in partial results');
      console.log('- Consider improving European ticker coverage');
    }
    console.log('='.repeat(60));

  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

main();
