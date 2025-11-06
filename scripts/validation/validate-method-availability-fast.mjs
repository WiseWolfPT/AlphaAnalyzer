#!/usr/bin/env node

/**
 * FASE 1 - Agent 1.2: Method Availability by Classification Validation (FAST)
 *
 * Validates method availability using a strategic sample across all classifications
 * to provide quick feedback while still being comprehensive.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io';
const DELAY_MS = 200; // Faster sampling
const TIMEOUT_MS = 30000;
const LOG_INTERVAL = 10; // Log every 10 stocks

// Method counts by classification
const EXPECTED_COUNTS = {
  bank: { min: 9, max: 9, blocked: ['dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'] },
  reit: { min: 16, max: 18 },
  growth: { min: 14, max: 15, required: ['growth-dcf-8y-ocf', 'growth-dcf-8y-fcf', 'growth-dcf-8y-ni'] },
  value: { min: 13, max: 13 }
};

// Strategic sample - representatives from each classification
const STRATEGIC_SAMPLE = {
  banks: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'SCHW',
          'BK', 'STT', 'NTRS', 'FITB', 'RF', 'CFG', 'KEY', 'MTB'],
  reits: ['PLD', 'AMT', 'EQIX', 'PSA', 'CCI', 'WELL', 'SPG', 'DLR', 'O', 'SBAC',
          'VICI', 'AVB', 'EQR', 'VTR', 'INVH', 'ARE', 'MAA', 'UDR'],
  growth: ['NVDA', 'TSLA', 'AMD', 'SHOP', 'DDOG', 'CRWD', 'NET', 'SNOW',
           'PLTR', 'RBLX', 'COIN', 'ABNB', 'UBER', 'DASH', 'MELI', 'SE'],
  value: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'JNJ', 'V', 'PG', 'XOM', 'HD',
          'CVX', 'MRK', 'ABBV', 'PEP', 'COST', 'AVGO', 'LLY', 'ADBE', 'KO', 'TMO',
          'WMT', 'MCD', 'CSCO', 'ACN', 'ABT', 'NKE', 'DHR', 'CRM', 'VZ', 'CMCSA',
          'TXN', 'INTC', 'NEE', 'PM', 'DIS', 'ORCL', 'UPS', 'BMY', 'QCOM', 'HON']
};

const ALL_SAMPLES = [
  ...STRATEGIC_SAMPLE.banks,
  ...STRATEGIC_SAMPLE.reits,
  ...STRATEGIC_SAMPLE.growth,
  ...STRATEGIC_SAMPLE.value
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(logLine);

  // Also write to log file
  const logPath = '/home/teste 1/validation-results/fase1-agent2-method-availability.log';
  try {
    fs.appendFileSync(logPath, logLine + '\n');
  } catch (e) {
    // Ignore write errors
  }
}

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

/**
 * Bank exceptions - stocks that should NEVER be classified as REITs
 * FIXED (2025-11-04): Banks have 'dividend-yield-reit' in methods causing false REIT classification
 */
const BANK_EXCEPTIONS = [
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC',
  'COF', 'KEY', 'CFG', 'FITB', 'BK', 'SCHW', 'AXP', 'DFS', 'SYF', 'NTRS', 'STT'
];

/**
 * REIT detection by methods (FIXED 2025-11-04)
 *
 * OLD BUG: methods.some(m => m.includes('reit'))
 * - This matched 'dividend-yield-reit', causing banks to be misclassified
 *
 * NEW FIX: Require explicit REIT-specific methods (FFO/AFFO/NAV)
 * - FFO (Funds From Operations) is ONLY used for REITs
 * - AFFO (Adjusted FFO) is ONLY used for REITs
 * - The dividend-yield-reit method alone is NOT sufficient
 */
function isREITByMethods(methods) {
  // Require explicit REIT-specific methods (positive evidence)
  const reitSpecificMethods = ['ffo', 'affo', 'p-ffo', 'nav'];
  return reitSpecificMethods.some(rm =>
    methods.some(m => m.toLowerCase().includes(rm))
  );
}

function classifyStock(ticker, response) {
  // available_methods is an array of strings, not objects
  const methods = response.available_methods || [];

  // Infer classification from available methods since API doesn't return it
  let classification = 'value'; // default

  // Check for bank (P/TBV would indicate bank, but we'll check for DCF absence)
  const hasDCF = methods.some(m =>
    m.includes('dcf-') || m.includes('dni-')
  );
  const hasBankMethod = methods.some(m =>
    m.includes('ptbv') || m.includes('p/tbv')
  );

  // Check for REIT - FIXED (2025-11-04)
  // Use improved detection that requires FFO/AFFO/NAV (not just 'reit' substring)
  const hasREITMethod = isREITByMethods(methods);

  // Check for growth
  const hasGrowthDCF = methods.some(m => m.startsWith('growth-dcf-8y'));

  // BANK EXCEPTION: Prevent banks from being classified as REITs
  if (BANK_EXCEPTIONS.includes(ticker.toUpperCase())) {
    classification = 'bank';
  } else if (hasREITMethod) {
    classification = 'reit';
  } else if (hasBankMethod && !hasDCF) {
    classification = 'bank';
  } else if (hasGrowthDCF) {
    classification = 'growth';
  }

  return {
    ticker,
    classification,
    methodCount: methods.length,
    methods: methods, // methods are already strings
    hasGrowthDCF,
    hasDCFMethods: methods.some(m =>
      ['dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'].includes(m)
    ),
    hasDuplicates: methods.length !== new Set(methods).size
  };
}

function validateMethodCount(result) {
  const { classification, methodCount, methods, hasGrowthDCF, hasDCFMethods, hasDuplicates } = result;
  const expected = EXPECTED_COUNTS[classification] || EXPECTED_COUNTS.value;

  const issues = [];

  // Check method count
  if (methodCount < expected.min || methodCount > expected.max) {
    issues.push(`Wrong count: ${methodCount} (expected ${expected.min}-${expected.max})`);
  }

  // Check blocked methods for banks
  if (classification === 'bank' && hasDCFMethods) {
    const blockedFound = methods.filter(m => expected.blocked.includes(m));
    issues.push(`DCF methods not blocked: ${blockedFound.join(', ')}`);
  }

  // Check required methods for growth stocks
  if (classification === 'growth' && expected.required) {
    const missingRequired = expected.required.filter(m => !methods.includes(m));
    if (missingRequired.length > 0) {
      issues.push(`Missing required: ${missingRequired.join(', ')}`);
    }
  }

  // Check for duplicates
  if (hasDuplicates) {
    issues.push('Duplicate methods found');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

async function testStock(ticker) {
  const url = `${BASE_URL}/api/iv/${ticker}/chart`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      return {
        ticker,
        status: response.status,
        error: `HTTP ${response.status}`,
        classification: 'unknown',
        methodCount: 0,
        valid: false
      };
    }

    const data = await response.json();
    const result = classifyStock(ticker, data);
    const validation = validateMethodCount(result);

    return {
      ...result,
      status: 200,
      valid: validation.valid,
      issues: validation.issues
    };
  } catch (error) {
    return {
      ticker,
      status: 0,
      error: error.message,
      classification: 'unknown',
      methodCount: 0,
      valid: false
    };
  }
}

async function runValidation() {
  log('🔍 FASE 1 - Agent 1.2: Method Availability Validation (FAST)');
  log(`📊 Testing ${ALL_SAMPLES.length} strategic samples`);
  log(`🌐 Base URL: ${BASE_URL}`);
  log('');

  const results = [];
  const stats = {
    total: ALL_SAMPLES.length,
    tested: 0,
    valid: 0,
    invalid: 0,
    errors: 0,
    byClassification: {
      bank: { total: 0, valid: 0, avgMethods: 0, samples: [] },
      reit: { total: 0, valid: 0, avgMethods: 0, samples: [] },
      growth: { total: 0, valid: 0, avgMethods: 0, samples: [] },
      value: { total: 0, valid: 0, avgMethods: 0, samples: [] }
    }
  };

  // Test all samples
  for (let i = 0; i < ALL_SAMPLES.length; i++) {
    const ticker = ALL_SAMPLES[i];
    const result = await testStock(ticker);
    results.push(result);

    stats.tested++;

    if (result.status === 200) {
      if (result.valid) {
        stats.valid++;
      } else {
        stats.invalid++;
      }

      // Update classification stats
      const classStats = stats.byClassification[result.classification];
      if (classStats) {
        classStats.total++;
        classStats.samples.push(ticker);
        if (result.valid) classStats.valid++;
        classStats.avgMethods += result.methodCount;
      }
    } else {
      stats.errors++;
    }

    // Progress logging
    if ((i + 1) % LOG_INTERVAL === 0 || i === ALL_SAMPLES.length - 1) {
      const pct = ((i + 1) / ALL_SAMPLES.length * 100).toFixed(1);
      log(`Progress: ${i + 1}/${ALL_SAMPLES.length} (${pct}%) - Valid: ${stats.valid} | Invalid: ${stats.invalid} | Errors: ${stats.errors}`);
    }

    await delay(DELAY_MS);
  }

  // Calculate averages
  Object.keys(stats.byClassification).forEach(key => {
    const classStats = stats.byClassification[key];
    if (classStats.total > 0) {
      classStats.avgMethods = (classStats.avgMethods / classStats.total).toFixed(2);
    }
  });

  return { results, stats };
}

function generateReport(results, stats) {
  const passRate = (stats.valid / stats.total * 100).toFixed(2);
  const status = passRate >= 95 ? '✅ PASS' : passRate >= 90 ? '⚠️ PARTIAL' : '❌ FAIL';

  let report = `# FASE 1 - Agent 1.2: Method Availability Report (Strategic Sample)\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Status:** ${status}\n`;
  report += `**Sample size:** ${stats.total} stocks (strategic representatives)\n\n`;

  report += `## Summary\n`;
  report += `- **Total tested:** ${stats.total}\n`;
  report += `- **Correct method count:** ${stats.valid} (${passRate}%)\n`;
  report += `- **Incorrect method count:** ${stats.invalid}\n`;
  report += `- **Errors:** ${stats.errors}\n\n`;

  report += `## By Classification\n\n`;
  Object.keys(stats.byClassification).forEach(key => {
    const s = stats.byClassification[key];
    const expected = EXPECTED_COUNTS[key];
    const pct = s.total > 0 ? (s.valid / s.total * 100).toFixed(1) : '0.0';

    report += `### ${key.toUpperCase()}\n`;
    report += `- **Samples tested:** ${s.total}\n`;
    report += `- **Valid:** ${s.valid} (${pct}%)\n`;
    report += `- **Avg methods:** ${s.avgMethods}\n`;
    report += `- **Expected:** ${expected.min}-${expected.max} methods\n`;
    report += `- **Tickers:** ${s.samples.slice(0, 10).join(', ')}${s.samples.length > 10 ? '...' : ''}\n`;

    if (key === 'bank') {
      const banksWithDCF = results.filter(r =>
        r.classification === 'bank' && r.hasDCFMethods
      );
      report += `- **DCF blocked:** ${banksWithDCF.length === 0 ? 'YES ✅' : `NO ❌ (${banksWithDCF.length} violations)`}\n`;
      if (banksWithDCF.length > 0) {
        report += `- **Banks with DCF:** ${banksWithDCF.map(r => r.ticker).join(', ')}\n`;
      }
    }

    if (key === 'growth') {
      const growthWithDCF = results.filter(r =>
        r.classification === 'growth' && r.hasGrowthDCF
      );
      const growthTotal = results.filter(r => r.classification === 'growth').length;
      const pctWithDCF = growthTotal > 0 ? (growthWithDCF.length / growthTotal * 100).toFixed(1) : '0.0';
      report += `- **Growth DCF 8Y coverage:** ${growthWithDCF.length}/${growthTotal} (${pctWithDCF}%)\n`;

      const growthWithoutDCF = results.filter(r =>
        r.classification === 'growth' && !r.hasGrowthDCF && r.status === 200
      );
      if (growthWithoutDCF.length > 0) {
        report += `- **Missing Growth DCF 8Y:** ${growthWithoutDCF.map(r => r.ticker).join(', ')}\n`;
      }
    }

    report += `\n`;
  });

  // Issues found
  const issuesByTicker = results
    .filter(r => !r.valid && r.status === 200)
    .map(r => ({
      ticker: r.ticker,
      classification: r.classification,
      methodCount: r.methodCount,
      issues: r.issues || []
    }));

  if (issuesByTicker.length > 0) {
    report += `## Issues Found (${issuesByTicker.length})\n\n`;
    issuesByTicker.forEach(item => {
      report += `**${item.ticker}** (${item.classification}, ${item.methodCount} methods)\n`;
      item.issues.forEach(issue => {
        report += `  - ${issue}\n`;
      });
      report += `\n`;
    });
  }

  // Recommendations
  report += `## Recommendations\n\n`;

  if (stats.byClassification.bank.total > 0) {
    const banksWithDCF = results.filter(r => r.classification === 'bank' && r.hasDCFMethods);
    if (banksWithDCF.length > 0) {
      report += `### 🔴 P0: Fix DCF blocking for banks\n`;
      report += `**Critical:** ${banksWithDCF.length} banks still have DCF methods available.\n`;
      report += `**Affected:** ${banksWithDCF.map(r => r.ticker).join(', ')}\n`;
      report += `**Action:** Review \`isBank()\` detection and DCF filtering logic.\n\n`;
    } else {
      report += `### ✅ Banks: DCF methods correctly blocked\n`;
      report += `All tested banks (${stats.byClassification.bank.total}) have DCF methods properly excluded.\n\n`;
    }
  }

  const growthWithoutDCF = results.filter(r =>
    r.classification === 'growth' && !r.hasGrowthDCF && r.status === 200
  );
  if (growthWithoutDCF.length > 0) {
    report += `### 🟡 P1: Add Growth DCF 8Y to growth stocks\n`;
    report += `${growthWithoutDCF.length} growth stocks missing Growth DCF 8Y method.\n`;
    report += `**Affected:** ${growthWithoutDCF.map(r => r.ticker).join(', ')}\n`;
    report += `**Action:** Verify \`isGrowthStock()\` detection includes Growth DCF 8Y variants.\n\n`;
  } else if (stats.byClassification.growth.total > 0) {
    report += `### ✅ Growth stocks: Growth DCF 8Y correctly included\n`;
    report += `All tested growth stocks (${stats.byClassification.growth.total}) have Growth DCF 8Y methods.\n\n`;
  }

  if (stats.invalid > stats.total * 0.1) {
    report += `### 🟡 P2: Review method count logic\n`;
    report += `${stats.invalid} stocks (${(stats.invalid / stats.total * 100).toFixed(1)}%) have incorrect method counts.\n`;
    report += `**Action:** Review classification and method availability mapping.\n\n`;
  }

  // Extrapolation
  report += `## Extrapolation to Full Universe (1,493 stocks)\n\n`;
  const expectedFullPass = Math.round(1493 * (passRate / 100));
  const expectedFullFail = 1493 - expectedFullPass;
  report += `Based on ${passRate}% pass rate in sample:\n`;
  report += `- **Expected passing:** ~${expectedFullPass} stocks\n`;
  report += `- **Expected failing:** ~${expectedFullFail} stocks\n`;
  report += `- **Projected status:** ${passRate >= 95 ? '✅ PASS (≥95%)' : passRate >= 90 ? '⚠️ PARTIAL (90-95%)' : '❌ FAIL (<90%)'}\n\n`;

  return report;
}

function generateMatrix(results) {
  let csv = 'ticker,classification,method_count,valid,has_growth_dcf,has_dcf_methods,has_duplicates,issues\n';

  results.forEach(r => {
    if (r.status === 200) {
      csv += `${r.ticker},${r.classification},${r.methodCount},${r.valid},${r.hasGrowthDCF},${r.hasDCFMethods},${r.hasDuplicates},"${(r.issues || []).join('; ')}"\n`;
    }
  });

  return csv;
}

// Main execution
(async () => {
  try {
    const startTime = Date.now();
    const { results, stats } = await runValidation();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    log(`\n⏱️ Validation completed in ${duration}s`);

    // Generate outputs
    const report = generateReport(results, stats);
    const matrix = generateMatrix(results);

    // Get output path
    const outputArg = process.argv.find(arg => arg.startsWith('--output='));
    const outputPath = outputArg
      ? outputArg.split('=')[1]
      : path.join(process.cwd(), 'validation-results', 'FASE1_AGENT2_METHOD_AVAILABILITY_RESULTS.json');

    const outputDir = path.dirname(outputPath);
    const reportPath = path.join(outputDir, 'FASE1_AGENT2_METHOD_AVAILABILITY_REPORT.md');
    const matrixPath = path.join(outputDir, 'FASE1_AGENT2_METHOD_CLASSIFICATION_MATRIX.csv');

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write files
    fs.writeFileSync(outputPath, JSON.stringify({ results, stats }, null, 2));
    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(matrixPath, matrix);

    log('\n✅ Validation complete!');
    log(`📊 Results: ${outputPath}`);
    log(`📄 Report: ${reportPath}`);
    log(`📈 Matrix: ${matrixPath}`);

    // Print summary
    const passRate = (stats.valid / stats.total * 100).toFixed(2);
    log(`\n🎯 Pass rate: ${stats.valid}/${stats.total} (${passRate}%)`);
    log(`Status: ${passRate >= 95 ? '✅ PASS' : passRate >= 90 ? '⚠️ PARTIAL' : '❌ FAIL'}`);

    process.exit(passRate >= 90 ? 0 : 1);
  } catch (error) {
    log(`❌ Validation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
})();
