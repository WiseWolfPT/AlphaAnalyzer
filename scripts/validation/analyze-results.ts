/**
 * Analyze IV Test Results
 *
 * Generates detailed analysis and priority fix list from test results
 *
 * Usage:
 *   npx tsx scripts/validation/analyze-results.ts validation-results/tier1-2025-10-26-results.json
 */

import fs from 'fs/promises';

interface TestResult {
  ticker: string;
  company_name: string;
  sector: string;
  exchange: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  http_code: number;
  methods_count: number;
  failed_methods_count: number;
  total_methods: number;
  response_time_ms: number;
  error_message?: string;
  failed_methods?: string[];
}

interface TestSummary {
  test_date: string;
  test_tier: string;
  total_stocks: number;
  passed: number;
  failed: number;
  errors: number;
  pass_rate: string;
  avg_response_time_ms: number;
  total_duration_ms: number;
  by_sector: Record<string, { passed: number; total: number; rate: string }>;
  by_http_code: Record<number, number>;
  by_exchange: Record<string, { passed: number; total: number; rate: string }>;
}

interface ResultsFile {
  summary: TestSummary;
  results: TestResult[];
}

async function analyzeResults(filePath: string) {
  console.log('\n========================================');
  console.log('IV TEST RESULTS ANALYSIS');
  console.log('========================================\n');

  // Load results
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const data: ResultsFile = JSON.parse(fileContent);
  const { summary, results } = data;

  console.log(`Analysis of: ${filePath}`);
  console.log(`Test Date: ${summary.test_date}`);
  console.log(`Tier: ${summary.test_tier}\n`);

  // Overall Stats
  console.log('OVERALL RESULTS:');
  console.log(`  Total Stocks: ${summary.total_stocks}`);
  console.log(`  Passed: ${summary.passed} (${summary.pass_rate})`);
  console.log(`  Failed: ${summary.failed} (${(summary.failed / summary.total_stocks * 100).toFixed(1)}%)`);
  console.log(`  Errors: ${summary.errors} (${(summary.errors / summary.total_stocks * 100).toFixed(1)}%)`);
  console.log(`  Avg Response Time: ${summary.avg_response_time_ms}ms`);
  console.log(`  Total Duration: ${Math.round(summary.total_duration_ms / 60000)} min\n`);

  // Success/Failure verdict
  const passRateNum = parseFloat(summary.pass_rate);
  if (passRateNum >= 80) {
    console.log('✅ SUCCESS: Pass rate exceeds 80% threshold\n');
  } else {
    console.log(`❌ FAILURE: Pass rate ${summary.pass_rate} below 80% threshold\n`);
  }

  // Error Pattern Analysis
  console.log('ERROR PATTERN ANALYSIS:');
  const errorStocks = results.filter(r => r.status === 'ERROR');
  const error502 = errorStocks.filter(r => r.http_code === 502);
  const error504 = errorStocks.filter(r => r.http_code === 504);
  const error404 = errorStocks.filter(r => r.http_code === 404);
  const errorTimeout = errorStocks.filter(r => r.error_message?.includes('ETIMEDOUT'));

  console.log(`  502 Bad Gateway: ${error502.length} stocks`);
  console.log(`  504 Gateway Timeout: ${error504.length} stocks`);
  console.log(`  404 Not Found: ${error404.length} stocks`);
  console.log(`  ETIMEDOUT: ${errorTimeout.length} stocks\n`);

  if (error502.length > 0) {
    console.log('  Top 502 errors:');
    error502.slice(0, 5).forEach(stock => {
      console.log(`    - ${stock.ticker} (${stock.company_name})`);
    });
    console.log();
  }

  // Method Failure Analysis
  console.log('METHOD FAILURE ANALYSIS:');
  const failedStocks = results.filter(r => r.status === 'FAIL');
  const methodFailureMap = new Map<string, number>();

  failedStocks.forEach(stock => {
    (stock.failed_methods || []).forEach(method => {
      methodFailureMap.set(method, (methodFailureMap.get(method) || 0) + 1);
    });
  });

  const sortedMethods = Array.from(methodFailureMap.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('  Most common method failures:');
  sortedMethods.slice(0, 10).forEach(([method, count]) => {
    console.log(`    ${method}: ${count} stocks`);
  });
  console.log();

  // Sector Deep Dive
  console.log('SECTOR DEEP DIVE (Lowest Pass Rates):');
  const sectorEntries = Object.entries(summary.by_sector)
    .sort((a, b) => parseFloat(a[1].rate) - parseFloat(b[1].rate));

  sectorEntries.slice(0, 5).forEach(([sector, stats]) => {
    console.log(`  ${sector}: ${stats.rate} (${stats.passed}/${stats.total})`);

    const sectorStocks = results.filter(r => r.sector === sector);
    const sectorErrors = sectorStocks.filter(r => r.status === 'ERROR');

    if (sectorErrors.length > 0) {
      console.log(`    Errors: ${sectorErrors.length} stocks`);
      sectorErrors.slice(0, 3).forEach(stock => {
        console.log(`      - ${stock.ticker}: ${stock.error_message || `HTTP ${stock.http_code}`}`);
      });
    }
  });
  console.log();

  // Priority Fix List
  console.log('========================================');
  console.log('PRIORITY FIX LIST');
  console.log('========================================\n');

  console.log('HIGH PRIORITY:');
  if (error502.length + error504.length > 10) {
    console.log(`  1. Backend Stability (${error502.length + error504.length} stocks with 502/504 errors)`);
    console.log('     - Investigate backend capacity issues');
    console.log('     - Check for memory leaks or timeouts');
    console.log('     - Consider scaling backend resources\n');
  }

  if (error404.length > 0) {
    console.log(`  2. Missing Stocks (${error404.length} stocks with 404 errors)`);
    console.log('     - Verify symbols in universe');
    console.log('     - Remove invalid/delisted stocks\n');
  }

  if (failedStocks.length > 10) {
    console.log(`  3. Data Quality (${failedStocks.length} stocks with insufficient methods)`);
    console.log('     - Contact FMP for data gaps');
    console.log('     - Implement alternative data sources');
    console.log('     - Review method requirements\n');
  }

  console.log('MEDIUM PRIORITY:');
  const slowStocks = results.filter(r => r.response_time_ms > 30000 && r.status !== 'ERROR');
  if (slowStocks.length > 0) {
    console.log(`  4. Performance (${slowStocks.length} stocks > 30s response time)`);
    console.log('     - Optimize IV calculation logic');
    console.log('     - Add caching for expensive operations');
    console.log('     - Profile slow stocks\n');
  }

  // Recommendations
  console.log('========================================');
  console.log('RECOMMENDATIONS');
  console.log('========================================\n');

  if (passRateNum >= 80) {
    console.log('✅ System is production-ready for IV calculations\n');
    console.log('Next steps:');
    console.log('  - Proceed with Tier 2 (sector coverage)');
    console.log('  - Deploy to production with monitoring');
    console.log('  - Address stocks with <12 methods opportunistically\n');
  } else if (passRateNum >= 70) {
    console.log('⚠️  System is mostly ready but needs improvements\n');
    console.log('Next steps:');
    console.log('  - Fix high-priority backend stability issues');
    console.log('  - Re-test after fixes');
    console.log('  - Consider launching with known limitations\n');
  } else {
    console.log('❌ System needs significant work before production\n');
    console.log('Next steps:');
    console.log('  - Debug systematic backend failures');
    console.log('  - Investigate data quality issues');
    console.log('  - Re-architecture if needed');
    console.log('  - Re-test after major fixes\n');
  }

  // Save detailed analysis
  const analysisPath = filePath.replace('.json', '-ANALYSIS.txt');
  const analysisContent = generateDetailedAnalysis(summary, results);
  await fs.writeFile(analysisPath, analysisContent);
  console.log(`Detailed analysis saved: ${analysisPath}\n`);
}

function generateDetailedAnalysis(summary: TestSummary, results: TestResult[]): string {
  let output = 'DETAILED IV TEST ANALYSIS\n';
  output += '='.repeat(80) + '\n\n';

  output += `Test Date: ${summary.test_date}\n`;
  output += `Tier: ${summary.test_tier}\n`;
  output += `Total Stocks: ${summary.total_stocks}\n`;
  output += `Pass Rate: ${summary.pass_rate}\n\n`;

  // List all ERROR stocks
  output += 'ERROR STOCKS:\n';
  output += '-'.repeat(80) + '\n';
  const errorStocks = results.filter(r => r.status === 'ERROR');
  errorStocks.forEach(stock => {
    output += `${stock.ticker.padEnd(10)} ${stock.company_name.padEnd(40)} HTTP ${stock.http_code} - ${stock.error_message || 'Unknown'}\n`;
  });
  output += '\n';

  // List all FAIL stocks
  output += 'FAILED STOCKS (Insufficient Methods):\n';
  output += '-'.repeat(80) + '\n';
  const failedStocks = results.filter(r => r.status === 'FAIL');
  failedStocks.forEach(stock => {
    output += `${stock.ticker.padEnd(10)} ${stock.company_name.padEnd(30)} Methods: ${stock.methods_count}/${stock.total_methods}\n`;
    if (stock.failed_methods && stock.failed_methods.length > 0) {
      output += `           Failed: ${stock.failed_methods.join(', ')}\n`;
    }
  });
  output += '\n';

  // Sector breakdown
  output += 'SECTOR BREAKDOWN:\n';
  output += '-'.repeat(80) + '\n';
  Object.entries(summary.by_sector)
    .sort((a, b) => parseFloat(b[1].rate) - parseFloat(a[1].rate))
    .forEach(([sector, stats]) => {
      output += `${sector.padEnd(30)} ${stats.passed}/${stats.total} (${stats.rate})\n`;
    });

  return output;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx tsx scripts/validation/analyze-results.ts <results.json>');
  process.exit(1);
}

analyzeResults(args[0]).catch(console.error);
