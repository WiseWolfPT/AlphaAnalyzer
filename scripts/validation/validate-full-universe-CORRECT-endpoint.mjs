#!/usr/bin/env node
/**
 * FINAL VALIDATION - CORRECT ENDPOINT
 *
 * Tests ALL 1,493 stocks using /api/iv/{ticker} (CORRECT endpoint with methods array)
 * Note: /api/iv/{ticker}/main returns only Growth DCF 8Y (no methods array)
 *
 * Pass Criteria:
 * - ✅ PASS: Has methods array AND methods >= 6
 * - ⚠️ PARTIAL: Has methods BUT methods < 6
 * - ❌ FAIL: HTTP error OR no methods array
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://128.140.45.28.sslip.io';
const RATE_LIMIT_DELAY = 285; // 3.5 req/s
const PROGRESS_INTERVAL = 100;

// Results tracking
const results = {
  pass: 0,
  partial: 0,
  fail: 0,
  total: 0,
  duration: 0,
  byIssueType: {
    http404: [],
    http500: [],
    ivZero: [],
    methodsLow: [],
    rateLimit: [],
    other: []
  },
  bySector: {},
  byRegion: {
    us: { pass: 0, partial: 0, fail: 0, total: 0 },
    europe: { pass: 0, partial: 0, fail: 0, total: 0 }
  },
  detailedResults: [],
  topPassing: [],
  topFailing: []
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with timeout
async function fetchWithTimeout(url, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Test single stock
async function testStock(ticker, sector, exchange) {
  const url = `${BASE_URL}/api/iv/${ticker}`;

  try {
    const response = await fetchWithTimeout(url);

    // HTTP errors
    if (!response.ok) {
      const status = response.status;
      const issueType = status === 404 ? 'http404' :
                       status === 429 ? 'rateLimit' :
                       status >= 500 ? 'http500' : 'other';

      results.byIssueType[issueType].push({ ticker, sector, exchange, status });
      return {
        ticker,
        sector,
        exchange,
        status: 'FAIL',
        httpStatus: status,
        issueType,
        iv: null,
        methods: 0
      };
    }

    // Parse response
    const data = await response.json();

    // Check if data is valid
    if (!data || typeof data !== 'object') {
      results.byIssueType.other.push({ ticker, sector, exchange, reason: 'Invalid response' });
      return {
        ticker,
        sector,
        exchange,
        status: 'FAIL',
        httpStatus: 200,
        issueType: 'other',
        iv: null,
        methods: 0
      };
    }

    const methods = data.methods || [];
    const methodCount = methods.length;
    const price = data.price || null;

    // Calculate average IV from methods
    let avgIV = 0;
    if (methodCount > 0) {
      const validIVs = methods.filter(m => m.iv && m.iv > 0).map(m => m.iv);
      if (validIVs.length > 0) {
        avgIV = validIVs.reduce((sum, iv) => sum + iv, 0) / validIVs.length;
      }
    }

    // Determine status
    let status;
    let issueType = null;

    if (methodCount >= 6) {
      status = 'PASS';
    } else if (methodCount > 0) {
      status = 'PARTIAL';
      issueType = 'methodsLow';
      results.byIssueType.methodsLow.push({ ticker, sector, exchange, methodCount, avgIV });
    } else {
      status = 'FAIL';
      issueType = 'other';
      results.byIssueType.other.push({ ticker, sector, exchange, reason: 'No methods returned' });
    }

    return {
      ticker,
      sector,
      exchange,
      status,
      httpStatus: 200,
      issueType,
      iv: avgIV,
      methods: methodCount,
      currentPrice: price,
      methodNames: methods.map(m => m.method)
    };

  } catch (error) {
    results.byIssueType.other.push({
      ticker,
      sector,
      exchange,
      reason: error.message
    });

    return {
      ticker,
      sector,
      exchange,
      status: 'FAIL',
      httpStatus: null,
      issueType: 'other',
      iv: null,
      methods: 0,
      error: error.message
    };
  }
}

// Main validation
async function runValidation() {
  console.log('🚀 FINAL VALIDATION - CORRECT ENDPOINT');
  console.log('=====================================');
  console.log(`Endpoint: ${BASE_URL}/api/iv/{ticker} ✅\n`);

  const startTime = Date.now();

  // Read stock universe
  const csvPath = path.join(__dirname, '../../stock_universe_complete.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1).filter(line => line.trim());

  console.log(`📊 Testing ${lines.length} stocks...`);
  console.log(`⏱️ Rate limit: ${RATE_LIMIT_DELAY}ms delay (3.5 req/s)`);
  console.log(`⏰ Estimated time: ${Math.ceil(lines.length * RATE_LIMIT_DELAY / 1000 / 60)} minutes\n`);

  // Process each stock
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const [ticker, sector, exchange] = line.split(',').map(s => s.trim());

    if (!ticker) continue;

    // Test stock
    const result = await testStock(ticker, sector, exchange);
    results.detailedResults.push(result);

    // Update counters
    results.total++;
    results[result.status.toLowerCase()]++;

    // Track by sector
    if (!results.bySector[sector]) {
      results.bySector[sector] = { pass: 0, partial: 0, fail: 0, total: 0 };
    }
    results.bySector[sector][result.status.toLowerCase()]++;
    results.bySector[sector].total++;

    // Track by region
    const region = exchange === 'US' ? 'us' : 'europe';
    results.byRegion[region][result.status.toLowerCase()]++;
    results.byRegion[region].total++;

    // Progress update
    if ((i + 1) % PROGRESS_INTERVAL === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const passRate = ((results.pass / results.total) * 100).toFixed(1);
      console.log(`✓ Progress: ${i + 1}/${lines.length} (${passRate}% pass rate) - ${elapsed}m elapsed`);
    }

    // Rate limiting
    if (i < lines.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  results.duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Sort results
  results.topPassing = results.detailedResults
    .filter(r => r.status === 'PASS')
    .sort((a, b) => b.methods - a.methods)
    .slice(0, 20);

  results.topFailing = results.detailedResults
    .filter(r => r.status === 'FAIL')
    .slice(0, 20);

  return results;
}

// Generate summary report
function generateSummary(results) {
  const passRate = ((results.pass / results.total) * 100).toFixed(1);
  const partialRate = ((results.partial / results.total) * 100).toFixed(1);
  const failRate = ((results.fail / results.total) * 100).toFixed(1);

  const target = Math.ceil(results.total * 0.95);
  const statusEmoji = results.pass >= target ? '✅' :
                     results.pass >= target * 0.9 ? '⚠️' : '❌';

  const usPassRate = ((results.byRegion.us.pass / results.byRegion.us.total) * 100).toFixed(1);
  const euPassRate = ((results.byRegion.europe.pass / results.byRegion.europe.total) * 100).toFixed(1);

  // Sort sectors
  const sectorStats = Object.entries(results.bySector)
    .map(([name, stats]) => ({
      name,
      passRate: ((stats.pass / stats.total) * 100).toFixed(1),
      pass: stats.pass,
      total: stats.total
    }))
    .sort((a, b) => parseFloat(b.passRate) - parseFloat(a.passRate));

  const topSectors = sectorStats.slice(0, 5);
  const bottomSectors = sectorStats.slice(-5).reverse();

  // Method distribution
  const excellentMethods = results.detailedResults.filter(r => r.methods >= 12 && r.status === 'PASS').length;
  const goodMethods = results.detailedResults.filter(r => r.methods >= 8 && r.methods < 12 && r.status === 'PASS').length;
  const acceptableMethods = results.detailedResults.filter(r => r.methods >= 6 && r.methods < 8 && r.status === 'PASS').length;

  let summary = `
FINAL VALIDATION - CORRECT ENDPOINT
====================================
Tested: ${results.total}/${results.total} (100%)
Duration: ${results.duration} minutes
Endpoint: /api/iv/{ticker} ✅

OVERALL PASS RATE: ${results.pass}/${results.total} (${passRate}%)
Target: 95% (${target} stocks)
Status: ${statusEmoji} ${results.pass >= target ? 'MET' : results.pass >= target * 0.9 ? 'CLOSE' : 'BELOW'}

PASS BREAKDOWN:
✅ PASS (methods≥6): ${results.pass} stocks (${passRate}%)
⚠️ PARTIAL (methods<6): ${results.partial} stocks (${partialRate}%)
❌ FAIL (errors): ${results.fail} stocks (${failRate}%)

US STOCKS: ${results.byRegion.us.pass}/${results.byRegion.us.total} (${usPassRate}%)
EUROPEAN STOCKS: ${results.byRegion.europe.pass}/${results.byRegion.europe.total} (${euPassRate}%)

TOP 5 SECTORS (BEST):
${topSectors.map((s, i) => `${i+1}. ${s.name}: ${s.passRate}% (${s.pass}/${s.total})`).join('\n')}

BOTTOM 5 SECTORS (WORST):
${bottomSectors.map((s, i) => `${i+1}. ${s.name}: ${s.passRate}% (${s.pass}/${s.total})`).join('\n')}

FAILURE PATTERNS:
- HTTP 404: ${results.byIssueType.http404.length} stocks
- HTTP 500: ${results.byIssueType.http500.length} stocks
- Methods < 6: ${results.byIssueType.methodsLow.length} stocks
- Rate limit: ${results.byIssueType.rateLimit.length} stocks
- Other: ${results.byIssueType.other.length} stocks

TOP 20 FAILING STOCKS:
${results.topFailing.slice(0, 20).map((s, i) =>
  `${i+1}. ${s.ticker} (${s.sector}): ${s.issueType || 'HTTP ' + s.httpStatus}`
).join('\n')}

READY FOR PRODUCTION:
- ${excellentMethods} stocks with 12-16 methods (excellent)
- ${goodMethods} stocks with 8-11 methods (good)
- ${acceptableMethods} stocks with 6-7 methods (acceptable)

NEED FIXES:
Priority 1 (HTTP 404): ${results.byIssueType.http404.length} stocks
Priority 2 (HTTP 500): ${results.byIssueType.http500.length} stocks
Priority 3 (methods<6): ${results.byIssueType.methodsLow.length} stocks

COMPARISON VS PREVIOUS:
This validates the ACTUAL production endpoint used by frontend
Endpoint: /api/iv/{ticker} (returns methods array)
Pass rate: ${passRate}%

FILES GENERATED:
- FINAL_VALIDATION_CORRECT_ENDPOINT_2025-10-30.json
- FINAL_VALIDATION_SUMMARY.txt
- STOCKS_NEEDING_FIXES.csv (prioritized list)
`;

  return summary;
}

// Generate CSV of stocks needing fixes
function generateFixesCSV(results) {
  const needsFixes = results.detailedResults
    .filter(r => r.status === 'FAIL' || r.status === 'PARTIAL')
    .map(r => ({
      ticker: r.ticker,
      sector: r.sector,
      exchange: r.exchange,
      status: r.status,
      priority: r.status === 'FAIL' && r.httpStatus === 404 ? 1 :
               r.status === 'FAIL' && r.httpStatus >= 500 ? 1 :
               r.status === 'PARTIAL' && r.iv === 0 ? 2 : 3,
      issue: r.issueType || `HTTP ${r.httpStatus}`,
      methods: r.methods,
      iv: r.iv
    }))
    .sort((a, b) => a.priority - b.priority || b.methods - a.methods);

  let csv = 'ticker,sector,exchange,status,priority,issue,methods,iv\n';
  csv += needsFixes.map(s =>
    `${s.ticker},${s.sector},${s.exchange},${s.status},${s.priority},${s.issue},${s.methods},${s.iv}`
  ).join('\n');

  return csv;
}

// Execute validation
console.log('Starting validation...\n');

runValidation()
  .then(results => {
    console.log('\n✅ Validation complete!\n');

    // Generate outputs
    const summary = generateSummary(results);
    const fixesCSV = generateFixesCSV(results);

    // Save files
    const outputDir = path.join(__dirname, '../../validation-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];

    fs.writeFileSync(
      path.join(outputDir, `FINAL_VALIDATION_CORRECT_ENDPOINT_${timestamp}.json`),
      JSON.stringify(results, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'FINAL_VALIDATION_SUMMARY.txt'),
      summary
    );

    fs.writeFileSync(
      path.join(outputDir, 'STOCKS_NEEDING_FIXES.csv'),
      fixesCSV
    );

    // Print summary
    console.log(summary);

    console.log('\n📁 Files saved to validation-results/');
    console.log(`   - FINAL_VALIDATION_CORRECT_ENDPOINT_${timestamp}.json`);
    console.log('   - FINAL_VALIDATION_SUMMARY.txt');
    console.log('   - STOCKS_NEEDING_FIXES.csv');
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
