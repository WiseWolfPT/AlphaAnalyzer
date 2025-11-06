#!/usr/bin/env node

/**
 * Full Universe IV Validation - Tests all 1,493 stocks
 *
 * Tests every stock in the Alfalyzer universe against production IV API
 * and generates comprehensive validation report.
 */

import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROD_URL = 'https://128.140.45.28.sslip.io';
const RATE_LIMIT_DELAY = 285; // 3.5 req/s max
const PROGRESS_INTERVAL = 100;
const CHECKPOINT_INTERVAL = 250;

// Load stock universe
const fmpReport = JSON.parse(fs.readFileSync(join(__dirname, '../../FMP_COVERAGE_REPORT.json'), 'utf8'));
const allStocks = fmpReport.details.exists; // 1,485 stocks with FMP coverage

console.log(`\n${'='.repeat(60)}`);
console.log(`FULL UNIVERSE IV VALIDATION`);
console.log(`${'='.repeat(60)}`);
console.log(`Total stocks to test: ${allStocks.length}`);
console.log(`Target: https://128.140.45.28.sslip.io/api/iv/{TICKER}`);
console.log(`Rate limit: 3.5 req/s (${RATE_LIMIT_DELAY}ms delay)`);
console.log(`Started: ${new Date().toISOString()}`);
console.log(`${'='.repeat(60)}\n`);

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
    http_500: 0,
    method_count_low: 0,
    iv_zero: 0,
    other: 0
  },
  failing_stocks: [],
  partial_stocks: [],
  passing_stocks: []
};

// Sector classification helper
function classifySector(sector) {
  if (!sector) return 'Unknown';

  const sectorMap = {
    'technology': 'Technology',
    'financial': 'Financials',
    'reit': 'REITs',
    'healthcare': 'Healthcare',
    'consumer': 'Consumer',
    'energy': 'Energy',
    'utilities': 'Utilities',
    'industrial': 'Industrials',
    'materials': 'Materials',
    'communication': 'Communication'
  };

  const lowerSector = sector.toLowerCase();
  for (const [key, value] of Object.entries(sectorMap)) {
    if (lowerSector.includes(key)) return value;
  }

  return 'Other';
}

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
            sector: 'Unknown',
            error: null
          };

          if (res.statusCode === 200 && data) {
            const parsed = JSON.parse(data);

            // Extract methods count from available_methods array
            if (parsed.available_methods && Array.isArray(parsed.available_methods)) {
              result.methods = parsed.available_methods.length;
            }

            // Extract IV value - calculate median from methods array
            if (parsed.methods && Array.isArray(parsed.methods) && parsed.methods.length > 0) {
              const ivValues = parsed.methods.map(m => m.iv).filter(v => v > 0).sort((a, b) => a - b);
              if (ivValues.length > 0) {
                const mid = Math.floor(ivValues.length / 2);
                result.iv = ivValues.length % 2 === 0
                  ? (ivValues[mid - 1] + ivValues[mid]) / 2
                  : ivValues[mid];
              }
            }

            // Extract stock classification (replaces sector)
            if (parsed.stock_classification) {
              result.sector = parsed.stock_classification.charAt(0).toUpperCase() + parsed.stock_classification.slice(1);
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
            sector: 'Unknown',
            error: `Parse error: ${err.message}`
          });
        }
      });
    });

    req.on('error', (err) => {
      // Retry on 429
      if (err.message.includes('429')) {
        setTimeout(() => testStock(ticker).then(resolve).catch(reject), 2000);
      } else {
        resolve({
          ticker,
          status: 0,
          methods: 0,
          iv: 0,
          sector: 'Unknown',
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
        sector: 'Unknown',
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

  // Partial: HTTP 200 but methods < 6 or IV = 0
  if (result.status === 200 && (result.methods < 6 || result.iv === 0)) {
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

  // Fail: Everything else
  results.summary.fail++;
  results.failing_stocks.push(result);

  if (!results.by_sector[result.sector]) {
    results.by_sector[result.sector] = { pass: 0, partial: 0, fail: 0 };
  }
  results.by_sector[result.sector].fail++;

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

// Save checkpoint
function saveCheckpoint() {
  const checkpointPath = join(__dirname, '../../validation-results/checkpoint-iv-validation.json');
  fs.mkdirSync(dirname(checkpointPath), { recursive: true });
  fs.writeFileSync(checkpointPath, JSON.stringify(results, null, 2));
}

// Main test loop
async function runValidation() {
  const startTime = Date.now();

  for (let i = 0; i < allStocks.length; i++) {
    const ticker = allStocks[i];

    try {
      const result = await testStock(ticker);
      categorizeResult(result);
      results.total_tested++;

      // Progress log
      if ((i + 1) % PROGRESS_INTERVAL === 0) {
        const percent = ((i + 1) / allStocks.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`Progress: ${i + 1}/${allStocks.length} (${percent}%) - Elapsed: ${elapsed}min - Pass: ${results.summary.pass}, Partial: ${results.summary.partial}, Fail: ${results.summary.fail}`);
      }

      // Checkpoint
      if ((i + 1) % CHECKPOINT_INTERVAL === 0) {
        saveCheckpoint();
      }

      // Rate limit delay
      if (i < allStocks.length - 1) {
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
        sector: 'Unknown',
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

// Generate TXT report
function generateTxtReport(results) {
  let report = '';

  report += 'FULL UNIVERSE VALIDATION - 1,493 STOCKS\n';
  report += '='.repeat(60) + '\n';
  report += `Tested: ${results.total_tested} stocks (${((results.total_tested / 1493) * 100).toFixed(1)}% of universe)\n`;
  report += `Duration: ${results.duration_minutes} minutes\n`;
  report += `Date: ${results.timestamp}\n\n`;

  report += `OVERALL PASS RATE: ${results.summary.pass}/${results.total_tested} (${results.summary.pass_rate})\n`;
  report += `Target: 95% (1,418 stocks)\n`;
  const gap = 1418 - results.summary.pass;
  report += `Gap: ${gap > 0 ? gap : 0} stocks ${gap > 0 ? 'below' : 'above'} target\n\n`;

  report += 'PASS BREAKDOWN:\n';
  report += `✅ PASS: ${results.summary.pass} stocks (${((results.summary.pass / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `⚠️ PARTIAL: ${results.summary.partial} stocks (${((results.summary.partial / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `❌ FAIL: ${results.summary.fail} stocks (${((results.summary.fail / results.total_tested) * 100).toFixed(1)}%)\n\n`;

  report += 'SECTOR PERFORMANCE:\n';
  report += '| Sector        | Pass | Partial | Fail | Rate |\n';
  report += '|---------------|------|---------|------|------|\n';

  const sectors = Object.keys(results.by_sector).sort();
  for (const sector of sectors) {
    const stats = results.by_sector[sector];
    const total = stats.pass + stats.partial + stats.fail;
    const rate = ((stats.pass / total) * 100).toFixed(1);
    report += `| ${sector.padEnd(13)} | ${String(stats.pass).padStart(4)} | ${String(stats.partial).padStart(7)} | ${String(stats.fail).padStart(4)} | ${rate.padStart(4)}% |\n`;
  }

  report += '\nMETHOD COUNT DISTRIBUTION:\n';
  report += `- 12-16 methods: ${results.by_method_count['12-16']} stocks (${((results.by_method_count['12-16'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 8-11 methods: ${results.by_method_count['8-11']} stocks (${((results.by_method_count['8-11'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 6-7 methods: ${results.by_method_count['6-7']} stocks (${((results.by_method_count['6-7'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 1-5 methods: ${results.by_method_count['1-5']} stocks (${((results.by_method_count['1-5'] / results.total_tested) * 100).toFixed(1)}%)\n`;
  report += `- 0 methods: ${results.by_method_count['0']} stocks (${((results.by_method_count['0'] / results.total_tested) * 100).toFixed(1)}%)\n\n`;

  report += `TOP 20 FAILURES:\n`;
  const topFailures = results.failing_stocks.slice(0, 20);
  for (let i = 0; i < topFailures.length; i++) {
    const stock = topFailures[i];
    report += `${i + 1}. ${stock.ticker} (${stock.sector}): ${stock.error || 'Unknown error'}\n`;
  }

  report += '\nFAILURE PATTERNS:\n';
  report += `- HTTP 404: ${results.by_error_type.http_404} stocks\n`;
  report += `- HTTP 500: ${results.by_error_type.http_500} stocks\n`;
  report += `- Method count < 6: ${results.by_error_type.method_count_low} stocks\n`;
  report += `- IV = $0: ${results.by_error_type.iv_zero} stocks\n`;
  report += `- Other errors: ${results.by_error_type.other} stocks\n\n`;

  return report;
}

// Generate CSV report
function generateCsvReport(results) {
  let csv = 'Ticker,Status,Methods,IV,Sector,Error,Result\n';

  const allResults = [
    ...results.passing_stocks.map(s => ({ ...s, result: 'PASS' })),
    ...results.partial_stocks.map(s => ({ ...s, result: 'PARTIAL' })),
    ...results.failing_stocks.map(s => ({ ...s, result: 'FAIL' }))
  ];

  for (const stock of allResults) {
    csv += `${stock.ticker},${stock.status},${stock.methods},${stock.iv.toFixed(2)},${stock.sector},"${stock.error || ''}",${stock.result}\n`;
  }

  return csv;
}

// Main execution
async function main() {
  try {
    console.log('Starting validation...\n');

    const validationResults = await runValidation();

    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total tested: ${validationResults.total_tested}/${allStocks.length}`);
    console.log(`Duration: ${validationResults.duration_minutes} minutes`);
    console.log(`Pass rate: ${validationResults.summary.pass_rate}`);
    console.log('='.repeat(60) + '\n');

    // Generate reports
    const timestamp = new Date().toISOString().split('T')[0];
    const txtReport = generateTxtReport(validationResults);
    const csvReport = generateCsvReport(validationResults);

    // Save reports
    const reportsDir = join(__dirname, '../../validation-results');
    fs.mkdirSync(reportsDir, { recursive: true });

    const txtPath = join(reportsDir, `FULL_UNIVERSE_VALIDATION_${timestamp}.txt`);
    const jsonPath = join(reportsDir, `FULL_UNIVERSE_VALIDATION_${timestamp}.json`);
    const csvPath = join(reportsDir, `validation-${allStocks.length}-stocks.csv`);

    fs.writeFileSync(txtPath, txtReport);
    fs.writeFileSync(jsonPath, JSON.stringify(validationResults, null, 2));
    fs.writeFileSync(csvPath, csvReport);

    console.log('FILES GENERATED:');
    console.log(`- ${txtPath}`);
    console.log(`- ${jsonPath}`);
    console.log(`- ${csvPath}`);
    console.log('');

    // Print summary
    console.log('COMPACT SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Tested: ${validationResults.total_tested}/${allStocks.length} (100%)`);
    console.log(`Duration: ${validationResults.duration_minutes} minutes`);
    console.log('');
    console.log(`PASS RATE: ${validationResults.summary.pass}/${validationResults.total_tested} (${validationResults.summary.pass_rate})`);
    const target = 1418;
    const gap = target - validationResults.summary.pass;
    console.log(`Target: 95% (${target})`);
    console.log(`Status: ${gap <= 0 ? '✅ TARGET MET' : `❌ BELOW TARGET by ${gap} stocks`}`);
    console.log('');

    // Top issues
    console.log('TOP ISSUES:');
    const issues = [
      { type: 'HTTP 404 (profile missing)', count: validationResults.by_error_type.http_404 },
      { type: 'HTTP 500 (backend error)', count: validationResults.by_error_type.http_500 },
      { type: 'Method count < 6', count: validationResults.by_error_type.method_count_low },
      { type: 'IV = $0', count: validationResults.by_error_type.iv_zero },
      { type: 'Other errors', count: validationResults.by_error_type.other }
    ].sort((a, b) => b.count - a.count);

    for (const issue of issues.slice(0, 3)) {
      if (issue.count > 0) {
        console.log(`- ${issue.type}: ${issue.count} stocks`);
      }
    }
    console.log('');

    // Worst sectors
    const sectorStats = Object.entries(validationResults.by_sector)
      .map(([sector, stats]) => {
        const total = stats.pass + stats.partial + stats.fail;
        const rate = (stats.pass / total) * 100;
        return { sector, total, pass: stats.pass, rate };
      })
      .sort((a, b) => a.rate - b.rate);

    console.log('WORST SECTORS:');
    for (let i = 0; i < Math.min(3, sectorStats.length); i++) {
      const s = sectorStats[i];
      console.log(`${i + 1}. ${s.sector}: ${s.rate.toFixed(1)}% (${s.pass}/${s.total})`);
    }
    console.log('');

    console.log('BEST SECTORS:');
    for (let i = Math.max(0, sectorStats.length - 3); i < sectorStats.length; i++) {
      const s = sectorStats[i];
      const rank = sectorStats.length - i;
      console.log(`${rank}. ${s.sector}: ${s.rate.toFixed(1)}% (${s.pass}/${s.total})`);
    }
    console.log('');

    // Next steps
    console.log('NEXT STEPS:');
    if (gap > 0) {
      console.log('- Focus on fixing HTTP 404 errors (FMP profile fetch)');
      console.log('- Investigate method count < 6 (data quality)');
      console.log('- Review worst performing sectors');
    } else {
      console.log('- Target met! System is production ready');
      console.log('- Monitor edge cases in partial results');
    }
    console.log('='.repeat(60));

  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

main();
