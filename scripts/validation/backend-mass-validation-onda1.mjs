#!/usr/bin/env node

/**
 * Backend Mass Validation - ONDA 1
 * Tests 100 stocks across all sectors against production
 * Validates Growth DCF 8Y deployment (commit d45c719b)
 */

import https from 'https';

const BASE_URL = 'https://128.140.45.28.sslip.io';
const TIMEOUT_MS = 10000; // 10s timeout

// Test universe stratified by sector
const TEST_UNIVERSE = {
  Technology: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'AMZN', 'NFLX', 'CRM', 'ADBE', 'ORCL', 'INTC', 'AMD', 'QCOM', 'CSCO'],
  Financials: ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'USB', 'PNC', 'TFC', 'COF'],
  'Real Estate': ['AMT', 'PLD', 'EQIX', 'PSA', 'CCI', 'DLR', 'SPG', 'O', 'WELL', 'AVB'],
  Healthcare: ['JNJ', 'UNH', 'LLY', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN'],
  Consumer: ['WMT', 'PG', 'KO', 'PEP', 'COST', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT'],
  Energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PSX', 'VLO', 'MPC', 'OXY', 'HAL'],
  Utilities: ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'ED', 'ES'],
  Industrials: ['CAT', 'BA', 'GE', 'HON', 'UPS', 'RTX', 'LMT', 'MMM', 'DE', 'EMR'],
  Materials: ['LIN', 'APD', 'SHW', 'ECL', 'NEM', 'FCX', 'DOW', 'DD', 'ALB', 'PPG'],
  Communication: ['DIS', 'CMCSA', 'T', 'VZ', 'TMUS']
};

// Known growth stocks (should have growth-dcf-8y)
const GROWTH_STOCKS = new Set(['NVDA', 'TSLA', 'META', 'AMZN', 'NFLX', 'CRM', 'ADBE', 'AMD']);

// Known banks (should have P/TBV)
const BANKS = new Set(['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'USB', 'PNC', 'TFC', 'COF']);

// Known REITs (should have FFO/AFFO methods)
const REITS = new Set(['AMT', 'PLD', 'EQIX', 'PSA', 'CCI', 'DLR', 'SPG', 'O', 'WELL', 'AVB']);

function fetchIV(symbol) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const url = `${BASE_URL}/api/iv/${symbol}`;

    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        try {
          const json = JSON.parse(data);
          resolve({
            symbol,
            status: res.statusCode,
            responseTime,
            data: json
          });
        } catch (err) {
          resolve({
            symbol,
            status: res.statusCode,
            responseTime,
            error: 'JSON parse error',
            raw: data.substring(0, 200)
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        symbol,
        status: 0,
        responseTime: Date.now() - startTime,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        symbol,
        status: 0,
        responseTime: TIMEOUT_MS,
        error: 'Request timeout'
      });
    });
  });
}

function validateResult(result, sector) {
  const issues = [];

  // HTTP status check
  if (result.status !== 200) {
    issues.push(`HTTP ${result.status || 'ERROR'}`);
    return { passed: false, issues: issues.join(', '), criticalError: true };
  }

  // Response time check
  if (result.responseTime > 5000) {
    issues.push(`Slow response: ${result.responseTime}ms`);
  }

  // Data structure check
  if (!result.data || typeof result.data !== 'object') {
    issues.push('Invalid response structure');
    return { passed: false, issues: issues.join(', '), criticalError: true };
  }

  const { symbol, methods, inputs } = result.data;

  // Methods check (new API structure uses 'methods' instead of 'valuations')
  if (!methods || !Array.isArray(methods)) {
    issues.push('Missing methods array');
    return { passed: false, issues: issues.join(', '), criticalError: true };
  }

  // Method count check (warning only, not a failure)
  const methodCount = methods.length;
  const methodCountWarning = methodCount < 8 || methodCount > 16;
  if (methodCountWarning) {
    issues.push(`[WARNING] Method count out of range: ${methodCount}`);
  }

  // NULL method_id check
  const nullMethods = methods.filter(v => !v.method_id || v.method_id === null);
  if (nullMethods.length > 0) {
    issues.push(`${nullMethods.length} NULL method_id values`);
  }

  // Zero IV check
  const zeroIVs = methods.filter(v => !v.iv || v.iv <= 0);
  if (zeroIVs.length === methods.length) {
    issues.push('All IVs are $0');
  }

  // Sector-specific checks (warnings only, not failures)
  if (REITS.has(symbol)) {
    const hasFFO = methods.some(v =>
      v.method_id && (v.method_id.includes('ffo') || v.method_id.includes('affo'))
    );
    if (!hasFFO) {
      issues.push('[WARNING] REIT missing FFO/AFFO methods');
    }
  }

  if (BANKS.has(symbol)) {
    const hasPTBV = methods.some(v =>
      v.method_id && v.method_id.includes('ptbv')
    );
    if (!hasPTBV) {
      issues.push('[WARNING] Bank missing P/TBV method');
    }
  }

  if (GROWTH_STOCKS.has(symbol)) {
    const hasGrowthDCF = methods.some(v =>
      v.method_id && v.method_id === 'growth-dcf-8y'
    );
    if (!hasGrowthDCF) {
      issues.push('[WARNING] Growth stock missing growth-dcf-8y');
    }
  }

  // Financial inputs check
  if (inputs) {
    const hasValidInputs = inputs.fcf || inputs.ocf || inputs.netIncome;
    if (!hasValidInputs) {
      issues.push('Missing critical financial inputs');
    }
  }

  // Filter out warnings for pass/fail determination
  const criticalIssues = issues.filter(i => !i.startsWith('[WARNING]'));

  return {
    passed: criticalIssues.length === 0 || (criticalIssues.length === 1 && criticalIssues[0].startsWith('Slow response')),
    issues: issues.join(', ') || 'OK',
    methodCount,
    responseTime: result.responseTime,
    hasGrowthDCF: methods.some(v => v.method_id === 'growth-dcf-8y'),
    hasPTBV: methods.some(v => v.method_id && v.method_id.includes('ptbv')),
    hasFFO: methods.some(v => v.method_id && (v.method_id.includes('ffo') || v.method_id.includes('affo')))
  };
}

async function runValidation() {
  console.log('Starting Backend Mass Validation - ONDA 1');
  console.log('Target:', BASE_URL);
  console.log('Commit: d45c719b (Growth DCF 8Y Complete)');
  console.log('Total stocks:', Object.values(TEST_UNIVERSE).flat().length);
  console.log('---\n');

  const results = {};
  const sectorStats = {};

  for (const [sector, symbols] of Object.entries(TEST_UNIVERSE)) {
    console.log(`Testing ${sector} (${symbols.length} stocks)...`);

    sectorStats[sector] = {
      tested: symbols.length,
      passed: 0,
      failed: 0,
      results: []
    };

    for (const symbol of symbols) {
      process.stdout.write(`  ${symbol}... `);

      const result = await fetchIV(symbol);
      const validation = validateResult(result, sector);

      const stockResult = {
        symbol,
        sector,
        ...validation,
        rawResult: result
      };

      results[symbol] = stockResult;
      sectorStats[sector].results.push(stockResult);

      if (validation.passed) {
        sectorStats[sector].passed++;
        console.log(`✅ (${result.responseTime}ms, ${validation.methodCount} methods)`);
      } else {
        sectorStats[sector].failed++;
        console.log(`❌ ${validation.issues}`);
      }

      // Rate limiting: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('');
  }

  // Generate report
  return { results, sectorStats };
}

function generateMarkdownReport(results, sectorStats) {
  const totalTested = Object.keys(results).length;
  const totalPassed = Object.values(results).filter(r => r.passed).length;
  const totalFailed = totalTested - totalPassed;
  const passRate = ((totalPassed / totalTested) * 100).toFixed(1);

  let grade = 'F';
  if (passRate >= 95) grade = 'A';
  else if (passRate >= 90) grade = 'B';
  else if (passRate >= 80) grade = 'C';
  else if (passRate >= 70) grade = 'D';

  const passed = Object.values(results).filter(r => r.passed);
  const failed = Object.values(results).filter(r => !r.passed);

  // Group failures by issue type
  const issueGroups = {};
  failed.forEach(f => {
    const issue = f.issues.split(',')[0].trim(); // Primary issue
    if (!issueGroups[issue]) issueGroups[issue] = [];
    issueGroups[issue].push(f);
  });

  // Critical findings
  const growthStockStatus = [...GROWTH_STOCKS].map(s => ({
    symbol: s,
    hasGrowthDCF: results[s]?.hasGrowthDCF,
    status: results[s]?.passed
  }));

  const bankStatus = [...BANKS].map(s => ({
    symbol: s,
    hasPTBV: results[s]?.hasPTBV,
    status: results[s]?.passed
  }));

  const reitStatus = [...REITS].map(s => ({
    symbol: s,
    hasFFO: results[s]?.hasFFO,
    status: results[s]?.passed
  }));

  let report = `# Backend Mass Validation Report - ONDA 1
**Date:** ${new Date().toISOString().split('T')[0]}
**Commit:** d45c719b (Growth DCF 8Y Complete)
**Environment:** Production (https://128.140.45.28.sslip.io)
**Test Duration:** ${new Date().toISOString()}

## Executive Summary
- **Total Tested:** ${totalTested}
- **Passed:** ${totalPassed}/${totalTested} (${passRate}%)
- **Failed:** ${totalFailed}/${totalTested} (${(100 - passRate).toFixed(1)}%)
- **Grade:** ${grade}

## Pass Rate by Sector
| Sector | Tested | Passed | Failed | Pass Rate |
|--------|--------|--------|--------|-----------|
`;

  Object.entries(sectorStats).forEach(([sector, stats]) => {
    const rate = ((stats.passed / stats.tested) * 100).toFixed(1);
    report += `| ${sector} | ${stats.tested} | ${stats.passed} | ${stats.failed} | ${rate}% |\n`;
  });

  report += `\n## Detailed Results\n\n`;

  // Passed stocks (summary)
  report += `### ✅ Passed Stocks (${totalPassed})\n\n`;
  report += `| Symbol | Sector | Methods | Response Time | Growth DCF 8Y | P/TBV | FFO |\n`;
  report += `|--------|--------|---------|---------------|---------------|-------|-----|\n`;

  passed.slice(0, 100).forEach(r => {
    report += `| ${r.symbol} | ${r.sector} | ${r.methodCount} | ${r.responseTime}ms | ${r.hasGrowthDCF ? '✅' : '—'} | ${r.hasPTBV ? '✅' : '—'} | ${r.hasFFO ? '✅' : '—'} |\n`;
  });

  // Failed stocks (detailed)
  if (failed.length > 0) {
    report += `\n### ❌ Failed Stocks (${totalFailed})\n\n`;

    failed.forEach(r => {
      report += `#### ${r.symbol} (${r.sector})\n`;
      report += `- **Issues:** ${r.issues}\n`;
      report += `- **Response Time:** ${r.responseTime}ms\n`;
      report += `- **HTTP Status:** ${r.rawResult.status}\n`;

      if (r.methodCount) {
        report += `- **Method Count:** ${r.methodCount}\n`;
      }

      if (r.rawResult.error) {
        report += `- **Error:** ${r.rawResult.error}\n`;
      }

      if (r.rawResult.data?.methods) {
        const methodIds = r.rawResult.data.methods.map(v => v.method_id).join(', ');
        report += `- **Methods Found:** ${methodIds}\n`;
      }

      report += `\n`;
    });
  }

  // Critical findings
  report += `## Critical Findings\n\n`;

  // Growth DCF 8Y deployment
  const growthWithDCF = growthStockStatus.filter(s => s.hasGrowthDCF).length;
  const growthTotal = growthStockStatus.length;
  report += `### Growth DCF 8Y Deployment\n`;
  report += `- **Status:** ${growthWithDCF === growthTotal ? '✅ CONFIRMED' : '⚠️ PARTIAL'}\n`;
  report += `- **Coverage:** ${growthWithDCF}/${growthTotal} growth stocks have growth-dcf-8y method\n`;

  const missingGrowthDCF = growthStockStatus.filter(s => !s.hasGrowthDCF);
  if (missingGrowthDCF.length > 0) {
    report += `- **Missing:** ${missingGrowthDCF.map(s => s.symbol).join(', ')}\n`;
  }
  report += `\n`;

  // Sector-specific methods
  report += `### Sector-Specific Methods\n`;

  const banksWithPTBV = bankStatus.filter(s => s.hasPTBV).length;
  report += `- **Banks (P/TBV):** ${banksWithPTBV}/${bankStatus.length} banks have P/TBV method\n`;
  if (banksWithPTBV < bankStatus.length) {
    const missing = bankStatus.filter(s => !s.hasPTBV).map(s => s.symbol).join(', ');
    report += `  - Missing: ${missing}\n`;
  }

  const reitsWithFFO = reitStatus.filter(s => s.hasFFO).length;
  report += `- **REITs (FFO/AFFO):** ${reitsWithFFO}/${reitStatus.length} REITs have FFO/AFFO methods\n`;
  if (reitsWithFFO < reitStatus.length) {
    const missing = reitStatus.filter(s => !s.hasFFO).map(s => s.symbol).join(', ');
    report += `  - Missing: ${missing}\n`;
  }
  report += `\n`;

  // Top issues
  report += `## Top Issues\n\n`;
  const sortedIssues = Object.entries(issueGroups).sort((a, b) => b[1].length - a[1].length);

  sortedIssues.slice(0, 5).forEach(([issue, stocks], idx) => {
    report += `${idx + 1}. **${issue}** - ${stocks.length} stocks affected\n`;
    report += `   - Symbols: ${stocks.map(s => s.symbol).join(', ')}\n`;
  });

  if (sortedIssues.length === 0) {
    report += `No common issues detected.\n`;
  }

  // Recommendations
  report += `\n## Recommendations\n\n`;

  if (passRate >= 95) {
    report += `✅ **System is production-ready.** Pass rate exceeds 95% threshold.\n\n`;
  } else {
    report += `⚠️ **Action required.** Pass rate below 95% threshold.\n\n`;
  }

  if (failed.length > 0) {
    const criticalErrors = failed.filter(f => f.criticalError);
    if (criticalErrors.length > 0) {
      report += `1. **Fix critical errors first** (${criticalErrors.length} stocks with HTTP/parse errors)\n`;
    }

    if (missingGrowthDCF.length > 0) {
      report += `2. **Investigate Growth DCF 8Y detection** - ${missingGrowthDCF.length} growth stocks missing method\n`;
    }

    if (sortedIssues.length > 0) {
      report += `3. **Address common issues:**\n`;
      sortedIssues.slice(0, 3).forEach(([issue]) => {
        report += `   - ${issue}\n`;
      });
    }
  } else {
    report += `No issues detected. All systems operational.\n`;
  }

  report += `\n---\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Test Script:** scripts/validation/backend-mass-validation-onda1.mjs\n`;

  return report;
}

// Main execution
(async () => {
  try {
    const { results, sectorStats } = await runValidation();
    const report = generateMarkdownReport(results, sectorStats);

    console.log('\n=== REPORT GENERATED ===\n');
    console.log(report);

    // Save to file
    const fs = await import('fs');
    const reportPath = '/Users/antoniofrancisco/Documents/teste 1/BACKEND_MASS_VALIDATION_REPORT_ONDA1.md';
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`\nReport saved to: ${reportPath}`);

  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
})();
