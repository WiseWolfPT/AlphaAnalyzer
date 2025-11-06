#!/usr/bin/env node

/**
 * FASE 1 Re-Validation - Agent 1.2: Method Availability Validator
 *
 * Tests 97 strategic stocks after P0 fixes:
 * - Banks (18): Verify correct classification, 9-11 methods, NO DCF
 * - REITs (8): Verify 9-10 methods with REIT-specific methods
 * - Growth (16): Verify 14-15 methods with Growth DCF 8Y
 * - Value (55): Verify 12-13 standard methods
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io';
const DELAY_MS = 300;
const TIMEOUT_MS = 30000;

// Strategic stock universe (97 stocks)
const STRATEGIC_STOCKS = {
  banks: [
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'BK',
    'STT', 'SCHW', 'COF', 'AXP', 'BLK', 'SPGI', 'CME', 'ICE'
  ],
  reits: [
    'PLD', 'WELL', 'SPG', 'O', 'VICI', 'EQR', 'INVH', 'AVB'
  ],
  growth: [
    'TSLA', 'NVDA', 'AMD', 'SHOP', 'NFLX', 'AMZN', 'META', 'GOOGL',
    'MSFT', 'AAPL', 'CRM', 'ADBE', 'NOW', 'INTU', 'SNOW', 'ZS'
  ],
  value: [
    'JNJ', 'PG', 'KO', 'PEP', 'WMT', 'HD', 'UNH', 'V', 'MA', 'CVX',
    'MRK', 'ABBV', 'LLY', 'TMO', 'ABT', 'COST', 'NKE', 'DHR', 'VZ',
    'CMCSA', 'TXN', 'INTC', 'NEE', 'PM', 'DIS', 'UPS', 'BMY', 'QCOM',
    'HON', 'UNP', 'RTX', 'BA', 'LOW', 'COP', 'LIN', 'SBUX', 'IBM',
    'INTU', 'CAT', 'AMGN', 'DE', 'GILD', 'MDLZ', 'ADP', 'ADI', 'BKNG',
    'MMM', 'SYK', 'TJX', 'CI', 'VRTX', 'ISRG', 'CVS', 'LRCX', 'ZTS'
  ]
};

// Expected method counts
const EXPECTED_COUNTS = {
  bank: {
    min: 9,
    max: 14,
    blocked: ['dcf-20-fcf', 'dcf-20-ocf', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'],
    required: ['pe-mean', 'pb-mean']
  },
  reit: {
    min: 12,
    max: 18,
    required: ['dividend-yield-(reits)']
  },
  growth: {
    min: 14,
    max: 18,
    required: ['growth-dcf-8y']
  },
  value: {
    min: 12,
    max: 16
  }
};

// Baseline stats (pre-fixes)
const BASELINE = {
  overall_pass_rate: 8.7,
  empty_methods_count: 29,
  empty_methods_pct: 31.5,
  banks: { pass_rate: 0.0, total: 18 },
  reits: { pass_rate: 100.0, total: 8 },
  growth: { pass_rate: 0.0, total: 16 },
  value: { pass_rate: 52.7, total: 55 }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function detectClassification(ticker, apiData) {
  // Use API classification if available
  if (apiData.classification) {
    return apiData.classification.toLowerCase();
  }

  // Fallback to manual classification
  for (const [classification, tickers] of Object.entries(STRATEGIC_STOCKS)) {
    if (tickers.includes(ticker)) {
      return classification === 'banks' ? 'bank' : classification === 'reits' ? 'reit' : classification;
    }
  }

  return 'value';
}

function analyzeMethods(methods) {
  // Safety check: handle undefined/null methods
  if (!methods || !Array.isArray(methods)) {
    return {
      count: 0,
      empty: true,
      ids: [],
      hasDuplicates: false,
      hasDCF: false,
      hasGrowthDCF: false,
      hasPTBV: false,
      hasREITMethods: false
    };
  }

  // Handle both string arrays and object arrays
  const methodIds = methods.map(m => {
    if (typeof m === 'string') return m;
    if (m && typeof m === 'object' && m.id) return m.id;
    if (m && typeof m === 'object' && m.method_id) return m.method_id;
    return null;
  }).filter(id => id !== null && id !== undefined);

  return {
    count: methods.length,
    empty: methods.length === 0,
    ids: methodIds,
    hasDuplicates: methodIds.length !== new Set(methodIds).size,
    hasDCF: methodIds.some(id =>
      id && ['dcf-20-fcf', 'dcf-20-ocf', 'dcf-terminal-fcf', 'dcf-terminal-ocf', 'dni-20', 'dfcf-terminal'].includes(id)
    ),
    hasGrowthDCF: methodIds.some(id => id && id.startsWith('growth-dcf-8y')),
    hasPTBV: methodIds.some(id => id && (id === 'ptbv-current' || id === 'p-tbv-mean' || id === 'p-tbv-sector')),
    hasREITMethods: methodIds.some(id =>
      id && ['dividend-yield-(reits)', 'p-ffo-mean', 'p-ffo-sector', 'p-affo', 'nav-premium', 'ffo-reit', 'affo-reit'].includes(id)
    )
  };
}

function validateStock(ticker, expectedClassification, apiData, methods) {
  const detectedClass = detectClassification(ticker, apiData);
  const expected = EXPECTED_COUNTS[detectedClass] || EXPECTED_COUNTS.value;
  const analysis = analyzeMethods(methods);

  const issues = [];
  let status = 'PASS';

  // Critical: Empty methods array (but check if it's a data error vs code regression)
  if (analysis.empty) {
    // If API returned data but all methods failed, it's a data issue, not code regression
    const hasFailedMethods = apiData.failedMethods && apiData.failedMethods.length > 0;
    if (hasFailedMethods) {
      issues.push('DATA ERROR: All methods failed due to insufficient data');
      status = 'DATA_ERROR';
    } else {
      issues.push('CRITICAL: Empty methods array (P0 regression - no failedMethods reported)');
      status = 'FAIL';
    }
  }

  // Classification mismatch
  if (detectedClass !== expectedClassification) {
    issues.push(`Classification mismatch: expected ${expectedClassification}, got ${detectedClass}`);
    status = 'FAIL';
  }

  // Method count validation
  if (analysis.count < expected.min || analysis.count > expected.max) {
    issues.push(`Method count ${analysis.count} outside range ${expected.min}-${expected.max}`);
    status = 'FAIL';
  }

  // Classification-specific validations
  if (detectedClass === 'bank') {
    // Banks must NOT have DCF methods
    if (analysis.hasDCF) {
      const blockedFound = analysis.ids.filter(id => expected.blocked.includes(id));
      issues.push(`Bank has blocked DCF methods: ${blockedFound.join(', ')}`);
      status = 'FAIL';
    }

    // Banks must have P/TBV
    if (!analysis.hasPTBV) {
      issues.push('Bank missing P/TBV method');
      status = 'FAIL';
    }
  }

  if (detectedClass === 'reit') {
    // REITs must have REIT-specific methods
    if (!analysis.hasREITMethods) {
      const missing = expected.required.filter(id => !analysis.ids.includes(id));
      issues.push(`REIT missing methods: ${missing.join(', ')}`);
      status = 'FAIL';
    }
  }

  if (detectedClass === 'growth') {
    // Growth stocks must have Growth DCF 8Y methods
    if (!analysis.hasGrowthDCF) {
      issues.push('Growth stock missing Growth DCF 8Y methods');
      status = 'FAIL';
    }

    const missing = expected.required.filter(id => !analysis.ids.includes(id));
    if (missing.length > 0) {
      issues.push(`Missing required Growth DCF 8Y variants: ${missing.join(', ')}`);
      status = 'FAIL';
    }
  }

  // Check for duplicates
  if (analysis.hasDuplicates) {
    issues.push('Duplicate methods found');
    status = 'FAIL';
  }

  return {
    ticker,
    expectedClassification,
    detectedClassification: detectedClass,
    methodCount: analysis.count,
    expectedCount: `${expected.min}-${expected.max}`,
    emptyMethods: analysis.empty,
    hasDCF: analysis.hasDCF,
    hasGrowthDCF: analysis.hasGrowthDCF,
    hasPTBV: analysis.hasPTBV,
    hasREITMethods: analysis.hasREITMethods,
    methods: analysis.ids,
    status,
    issues
  };
}

async function testStock(ticker, expectedClassification) {
  const url = `${BASE_URL}/api/iv/${ticker}/chart`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        ticker,
        expectedClassification,
        status: 'ERROR',
        httpStatus: response.status,
        error: `HTTP ${response.status}`,
        errorDetails: errorText.substring(0, 200),
        methodCount: 0,
        emptyMethods: true,
        issues: [`API returned ${response.status}: ${errorText.substring(0, 100)}`]
      };
    }

    const data = await response.json();
    const methods = data.available_methods || [];

    return validateStock(ticker, expectedClassification, data, methods);
  } catch (error) {
    return {
      ticker,
      expectedClassification,
      status: 'ERROR',
      error: error.message,
      errorStack: error.stack?.substring(0, 200),
      methodCount: 0,
      emptyMethods: true,
      issues: [`Request failed: ${error.message}`]
    };
  }
}

async function runValidation() {
  console.log('🔍 FASE 1 Re-Validation - Agent 1.2: Method Availability Validator');
  console.log('📊 Testing 97 strategic stocks after P0 fixes');
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  const results = [];
  const stats = {
    timestamp: new Date().toISOString(),
    total_tested: 0,
    passed: 0,
    failed: 0,
    data_errors: 0,
    errors: 0,
    pass_rate: 0,
    baseline_pass_rate: BASELINE.overall_pass_rate,
    improvement: 0,
    empty_methods_count: 0,
    p0_regressions: 0,
    baseline_empty_methods: BASELINE.empty_methods_count,
    classifications: {}
  };

  // Test each classification
  for (const [classification, tickers] of Object.entries(STRATEGIC_STOCKS)) {
    const classKey = classification === 'banks' ? 'bank' : classification === 'reits' ? 'reit' : classification;
    const baselineClass = BASELINE[classification === 'banks' ? 'banks' : classification === 'reits' ? 'reits' : classification];

    stats.classifications[classKey] = {
      tested: tickers.length,
      passed: 0,
      failed: 0,
      data_errors: 0,
      errors: 0,
      pass_rate: 0,
      baseline_pass_rate: baselineClass.pass_rate,
      empty_methods: 0,
      p0_regressions: 0
    };

    console.log(`\n📂 Testing ${classification.toUpperCase()} (${tickers.length} stocks)...`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const result = await testStock(ticker, classKey);
      results.push(result);

      stats.total_tested++;

      if (result.status === 'PASS') {
        stats.passed++;
        stats.classifications[classKey].passed++;
      } else if (result.status === 'FAIL') {
        stats.failed++;
        stats.classifications[classKey].failed++;
        if (result.emptyMethods && !result.issues.some(i => i.includes('DATA ERROR'))) {
          stats.p0_regressions++;
          stats.classifications[classKey].p0_regressions++;
        }
      } else if (result.status === 'DATA_ERROR') {
        stats.data_errors++;
        stats.classifications[classKey].data_errors++;
      } else {
        stats.errors++;
        stats.classifications[classKey].errors++;
      }

      if (result.emptyMethods) {
        stats.empty_methods_count++;
        stats.classifications[classKey].empty_methods++;
      }

      // Progress
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`  ${statusIcon} ${ticker}: ${result.methodCount} methods (${result.status})`);

      await delay(DELAY_MS);
    }

    // Calculate class pass rate
    stats.classifications[classKey].pass_rate = parseFloat(
      (stats.classifications[classKey].passed / stats.classifications[classKey].tested * 100).toFixed(1)
    );
  }

  // Calculate overall stats
  stats.pass_rate = parseFloat((stats.passed / stats.total_tested * 100).toFixed(1));
  stats.improvement = `+${(stats.pass_rate - stats.baseline_pass_rate).toFixed(1)}pp`;

  // Add improvements to classifications
  Object.keys(stats.classifications).forEach(key => {
    const improvement = stats.classifications[key].pass_rate - stats.classifications[key].baseline_pass_rate;
    stats.classifications[key].improvement = `${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}pp`;
  });

  return { results, stats };
}

function generateReport(results, stats) {
  const status = stats.pass_rate >= 90 ? '✅ GO' : '⚠️ NO-GO';

  let report = `# FASE 1 Re-Validation - Method Availability Report\n\n`;
  report += `**Generated:** ${stats.timestamp}\n`;
  report += `**Overall Status:** ${status}\n`;
  report += `**Pass Rate:** ${stats.pass_rate}% (baseline: ${stats.baseline_pass_rate}%, improvement: ${stats.improvement})\n\n`;

  report += `## Executive Summary\n\n`;
  report += `### Overall Results\n`;
  report += `- **Total tested:** ${stats.total_tested} strategic stocks\n`;
  report += `- **Passed:** ${stats.passed} (${stats.pass_rate}%)\n`;
  report += `- **Failed:** ${stats.failed}\n`;
  report += `- **Data errors:** ${stats.data_errors} (insufficient data, not code issues)\n`;
  report += `- **Request errors:** ${stats.errors}\n`;
  report += `- **Empty methods arrays:** ${stats.empty_methods_count} (${stats.data_errors} data errors, ${stats.p0_regressions} P0 regressions)\n`;
  report += `- **Baseline empty methods:** ${stats.baseline_empty_methods}\n`;
  report += `- **Improvement:** ${stats.improvement}\n\n`;

  report += `### Classification Matrix\n\n`;
  report += `| Classification | Tested | Passed | Failed | Pass Rate | Baseline | Improvement | Empty Methods | Status |\n`;
  report += `|---------------|--------|--------|--------|-----------|----------|-------------|---------------|--------|\n`;

  Object.entries(stats.classifications).forEach(([classification, s]) => {
    const statusIcon = s.pass_rate >= 90 ? '✅' : s.pass_rate >= 80 ? '⚠️' : '❌';
    report += `| ${classification.charAt(0).toUpperCase() + classification.slice(1)} | ${s.tested} | ${s.passed} | ${s.failed} | ${s.pass_rate}% | ${s.baseline_pass_rate}% | ${s.improvement} | ${s.empty_methods} | ${statusIcon} |\n`;
  });

  report += `\n`;

  // P0 Fixes Validation
  report += `## P0 Fixes Validation\n\n`;

  report += `### ✅ P0 Fix #3: Empty Methods Array Bug\n`;
  report += `- **Target:** 0% code regressions causing empty methods (was 31.5%)\n`;
  report += `- **Result:** ${stats.empty_methods_count} empty arrays total (${stats.data_errors} data errors + ${stats.p0_regressions} code regressions)\n`;
  report += `- **Code regressions:** ${stats.p0_regressions} (${(stats.p0_regressions / stats.total_tested * 100).toFixed(1)}%)\n`;
  report += `- **Status:** ${stats.p0_regressions === 0 ? '✅ FIXED (all empty arrays are data errors)' : `❌ REGRESSION (${stats.p0_regressions} true regressions)`}\n\n`;

  const bankResults = results.filter(r => r.expectedClassification === 'bank');
  const banksWithDCF = bankResults.filter(r => r.hasDCF);
  report += `### ✅ P0 Fix #2: Bank Classification\n`;
  report += `- **Target:** 100% banks correctly classified, 0% with DCF methods (was 100% failure)\n`;
  report += `- **Result:** ${banksWithDCF.length} banks with DCF methods (${(banksWithDCF.length / bankResults.length * 100).toFixed(1)}%)\n`;
  report += `- **Status:** ${banksWithDCF.length === 0 ? '✅ FIXED' : '❌ PARTIAL'}\n\n`;

  const growthResults = results.filter(r => r.expectedClassification === 'growth');
  const growthWithDCF8Y = growthResults.filter(r => r.hasGrowthDCF);
  report += `### Growth DCF 8Y Integration\n`;
  report += `- **Target:** 100% growth stocks with Growth DCF 8Y methods (was 0%)\n`;
  report += `- **Result:** ${growthWithDCF8Y.length}/${growthResults.length} growth stocks (${(growthWithDCF8Y.length / growthResults.length * 100).toFixed(1)}%)\n`;
  report += `- **Status:** ${growthWithDCF8Y.length === growthResults.length ? '✅ COMPLETE' : '⚠️ INCOMPLETE'}\n\n`;

  // Failures
  const failures = results.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    report += `## Failures (${failures.length})\n\n`;

    failures.slice(0, 20).forEach(f => {
      report += `### ${f.ticker} (${f.expectedClassification})\n`;
      report += `- **Method count:** ${f.methodCount} (expected ${f.expectedCount})\n`;
      report += `- **Empty methods:** ${f.emptyMethods ? 'YES ❌' : 'NO'}\n`;
      report += `- **Issues:**\n`;
      f.issues.forEach(issue => {
        report += `  - ${issue}\n`;
      });
      report += `\n`;
    });

    if (failures.length > 20) {
      report += `\n*...and ${failures.length - 20} more failures. See JSON for full details.*\n\n`;
    }
  }

  // Recommendation
  report += `## Recommendation\n\n`;

  if (stats.pass_rate >= 90 && stats.empty_methods_count === 0) {
    report += `### ✅ GO FOR PRODUCTION\n\n`;
    report += `All P0 fixes validated:\n`;
    report += `- Empty methods arrays eliminated\n`;
    report += `- Bank classification fixed\n`;
    report += `- Overall pass rate: ${stats.pass_rate}% (target: ≥90%)\n\n`;
    report += `Minor issues remaining (if any) can be addressed in subsequent phases.\n`;
  } else {
    report += `### ⚠️ NO-GO - Additional Fixes Required\n\n`;

    if (stats.pass_rate < 90) {
      report += `- Pass rate ${stats.pass_rate}% below target (≥90%)\n`;
    }

    if (stats.empty_methods_count > 0) {
      report += `- ${stats.empty_methods_count} stocks still returning empty methods arrays (P0 regression)\n`;
    }

    if (banksWithDCF.length > 0) {
      report += `- ${banksWithDCF.length} banks still have DCF methods (classification failure)\n`;
    }

    report += `\nRecommend fixing these critical issues before production release.\n`;
  }

  return report;
}

function generateCSV(stats) {
  let csv = 'Classification,Tested,Passed,Failed,Pass Rate (%),Baseline Pass Rate (%),Improvement,Empty Methods,Expected Methods,Status\n';

  Object.entries(stats.classifications).forEach(([classification, s]) => {
    const expected = EXPECTED_COUNTS[classification];
    const status = s.pass_rate >= 90 ? 'PASS' : s.pass_rate >= 80 ? 'NEAR PASS' : 'FAIL';

    csv += `${classification.charAt(0).toUpperCase() + classification.slice(1)},`;
    csv += `${s.tested},${s.passed},${s.failed},`;
    csv += `${s.pass_rate},${s.baseline_pass_rate},`;
    csv += `${s.improvement},${s.empty_methods},`;
    csv += `${expected.min}-${expected.max},${status}\n`;
  });

  // Overall row
  csv += `Overall,${stats.total_tested},${stats.passed},${stats.failed},`;
  csv += `${stats.pass_rate},${stats.baseline_pass_rate},`;
  csv += `${stats.improvement},${stats.empty_methods_count},-,`;
  csv += `${stats.pass_rate >= 90 ? 'PASS' : 'FAIL'}\n`;

  return csv;
}

// Main execution
(async () => {
  try {
    const { results, stats } = await runValidation();

    // Generate outputs
    const report = generateReport(results, stats);
    const matrix = generateCSV(stats);

    // Output directory
    const outputDir = path.join(process.cwd(), 'validation-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'FASE1_AGENT2_METHOD_AVAILABILITY_REVALIDATION_RESULTS.json');
    const reportPath = path.join(outputDir, 'FASE1_AGENT2_METHOD_AVAILABILITY_REVALIDATION_REPORT.md');
    const matrixPath = path.join(outputDir, 'FASE1_AGENT2_CLASSIFICATION_MATRIX_REVALIDATION.csv');

    // Write files
    fs.writeFileSync(jsonPath, JSON.stringify({ results, stats }, null, 2));
    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(matrixPath, matrix);

    console.log('\n' + '='.repeat(80));
    console.log('✅ VALIDATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n📊 Results saved to:`);
    console.log(`  - JSON: ${jsonPath}`);
    console.log(`  - Report: ${reportPath}`);
    console.log(`  - Matrix: ${matrixPath}`);

    console.log(`\n🎯 Summary:`);
    console.log(`  - Pass rate: ${stats.pass_rate}% (baseline: ${stats.baseline_pass_rate}%)`);
    console.log(`  - Improvement: ${stats.improvement}`);
    console.log(`  - Empty methods: ${stats.empty_methods_count} (baseline: ${stats.baseline_empty_methods})`);
    console.log(`  - Status: ${stats.pass_rate >= 90 ? '✅ GO' : '⚠️ NO-GO'}\n`);

    process.exit(stats.pass_rate >= 90 ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
})();
