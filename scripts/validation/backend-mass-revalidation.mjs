#!/usr/bin/env node

/**
 * BACKEND MASS RE-VALIDATION (POST-FIXES)
 * Tests 100-stock stratified sample against production API
 * Expected: 54% → 95%+ pass rate after 3 fixes
 */

import https from 'https';

const API_BASE = 'https://128.140.45.28.sslip.io/api/iv';
const RATE_LIMIT_DELAY = 300; // 300ms between calls (3.33 req/s, under 4 req/s limit)
const RETRY_DELAY = 60000; // 60s if rate limited

// Test universe - 100 stocks stratified by sector
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

// REIT symbols for sector-specific validation
const REITS = new Set(['AMT', 'PLD', 'EQIX', 'PSA', 'CCI', 'DLR', 'SPG', 'O', 'WELL', 'AVB']);

// Bank symbols for P/TBV validation
const BANKS = new Set(['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'USB', 'PNC', 'TFC', 'COF']);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchIV(symbol) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/${symbol}`;

    https.get(url, {
      rejectUnauthorized: false // Accept self-signed cert
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            parseError: true
          });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function validateStock(symbol, response, sector) {
  const result = {
    symbol,
    sector,
    status: 'FAIL',
    httpStatus: response.status,
    methodCount: 0,
    intrinsicValue: 0,
    errors: [],
    warnings: [],
    methods: []
  };

  // Check HTTP status
  if (response.status !== 200) {
    result.errors.push(`HTTP ${response.status}`);
    if (response.status === 429) {
      result.errors.push('Rate limited');
    } else if (response.status === 404) {
      result.errors.push('Not found');
    } else if (response.status >= 500) {
      result.errors.push('Server error');
    }
    return result;
  }

  // Check parse error
  if (response.parseError) {
    result.errors.push('JSON parse error');
    return result;
  }

  const data = response.data;

  // Check methods array
  if (!data.methods || !Array.isArray(data.methods)) {
    result.errors.push('No methods array');
    return result;
  }

  result.methods = data.methods.map(m => m.name);
  result.methodCount = data.methods.length;

  // Check minimum method threshold (NEW: 6 methods)
  if (result.methodCount < 6) {
    result.warnings.push(`Only ${result.methodCount} methods (threshold: 6)`);
    result.status = 'PARTIAL';
  }

  // Check intrinsic value - calculate median from methods
  if (result.methodCount > 0) {
    const ivValues = data.methods
      .map(m => m.iv)
      .filter(iv => iv !== null && iv !== undefined && iv > 0)
      .sort((a, b) => a - b);

    if (ivValues.length > 0) {
      // Calculate median
      const mid = Math.floor(ivValues.length / 2);
      result.intrinsicValue = ivValues.length % 2 === 0
        ? (ivValues[mid - 1] + ivValues[mid]) / 2
        : ivValues[mid];
    } else {
      result.warnings.push('No valid IV values in methods');
    }
  }

  // Sector-specific validations
  if (REITS.has(symbol)) {
    const hasFFO = result.methods.some(m => m.toLowerCase().includes('ffo') || m.toLowerCase().includes('affo'));
    if (!hasFFO && result.methodCount >= 6) {
      result.warnings.push('REIT missing FFO/AFFO methods');
    }
  }

  if (BANKS.has(symbol)) {
    const hasPTBV = result.methods.some(m => m.toLowerCase().includes('ptbv') || m.toLowerCase().includes('tangible'));
    if (!hasPTBV && result.methodCount >= 6) {
      result.warnings.push('Bank missing P/TBV method');
    }
  }

  // Determine final status
  if (result.errors.length === 0) {
    if (result.methodCount >= 6 && result.intrinsicValue > 0) {
      result.status = 'PASS';
    } else if (result.methodCount >= 6) {
      result.status = 'PARTIAL';
    }
  }

  return result;
}

async function runValidation() {
  console.log('🔍 BACKEND MASS RE-VALIDATION (POST-FIXES)');
  console.log('==========================================\n');

  const startTime = Date.now();
  const results = [];
  const sectorResults = {};

  let totalTested = 0;
  let rateLimitHits = 0;

  // Initialize sector tracking
  for (const sector in TEST_UNIVERSE) {
    sectorResults[sector] = {
      pass: 0,
      partial: 0,
      fail: 0,
      total: TEST_UNIVERSE[sector].length
    };
  }

  // Test each stock
  for (const sector in TEST_UNIVERSE) {
    console.log(`\n📊 Testing ${sector} (${TEST_UNIVERSE[sector].length} stocks)...`);

    for (const symbol of TEST_UNIVERSE[sector]) {
      totalTested++;
      process.stdout.write(`  ${symbol}... `);

      try {
        const response = await fetchIV(symbol);
        const result = validateStock(symbol, response, sector);
        results.push(result);

        // Update sector stats
        if (result.status === 'PASS') {
          sectorResults[sector].pass++;
          console.log('✅ PASS');
        } else if (result.status === 'PARTIAL') {
          sectorResults[sector].partial++;
          console.log(`⚠️  PARTIAL (${result.warnings.join(', ')})`);
        } else {
          sectorResults[sector].fail++;
          console.log(`❌ FAIL (${result.errors.join(', ')})`);
        }

        // Track rate limits
        if (response.status === 429) {
          rateLimitHits++;
          console.log(`  ⏳ Rate limited, waiting ${RETRY_DELAY/1000}s...`);
          await sleep(RETRY_DELAY);
        }

        // Rate limit protection
        await sleep(RATE_LIMIT_DELAY);

      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        results.push({
          symbol,
          sector,
          status: 'FAIL',
          errors: [error.message]
        });
        sectorResults[sector].fail++;
      }
    }
  }

  // Calculate summary stats
  const passCount = results.filter(r => r.status === 'PASS').length;
  const partialCount = results.filter(r => r.status === 'PARTIAL').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const passRate = ((passCount / totalTested) * 100).toFixed(1);

  const http404 = results.filter(r => r.httpStatus === 404).length;
  const http500 = results.filter(r => r.httpStatus >= 500).length;
  const methodsBelow6 = results.filter(r => r.methodCount > 0 && r.methodCount < 6).length;
  const ivZero = results.filter(r => r.intrinsicValue === 0 && r.methodCount > 0).length;

  const duration = ((Date.now() - startTime) / 60000).toFixed(1);

  // Print final report
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('BACKEND MASS VALIDATION (POST-FIXES) - FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Tested: ${totalTested} stocks (stratified sample)`);
  console.log(`Pass Rate: ${passCount}/${totalTested} (${passRate}%)`);
  console.log(`Partial: ${partialCount} (${((partialCount/totalTested)*100).toFixed(1)}%)`);
  console.log(`Fail: ${failCount} (${((failCount/totalTested)*100).toFixed(1)}%)`);
  console.log(`Target: 95% (95/100)`);
  console.log(`Status: ${passRate >= 95 ? '✅ TARGET MET' : '❌ BELOW TARGET'}\n`);

  console.log('SECTOR BREAKDOWN:');
  console.log('┌───────────────┬──────┬───────┬──────┬───────┐');
  console.log('│ Sector        │ Pass │ Part. │ Fail │ Rate  │');
  console.log('├───────────────┼──────┼───────┼──────┼───────┤');

  for (const sector in sectorResults) {
    const s = sectorResults[sector];
    const rate = ((s.pass / s.total) * 100).toFixed(0);
    console.log(`│ ${sector.padEnd(13)} │ ${String(s.pass).padStart(4)} │ ${String(s.partial).padStart(5)} │ ${String(s.fail).padStart(4)} │ ${String(rate).padStart(4)}% │`);
  }
  console.log('└───────────────┴──────┴───────┴──────┴───────┘\n');

  // Print failures
  if (failCount > 0) {
    console.log(`FAILURES (${failCount} stocks):`);
    const failures = results.filter(r => r.status === 'FAIL');
    failures.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.symbol} (${f.sector}): ${f.errors.join(', ')}`);
    });
    console.log('');
  }

  // Print partials
  if (partialCount > 0) {
    console.log(`PARTIAL PASSES (${partialCount} stocks):`);
    const partials = results.filter(r => r.status === 'PARTIAL');
    partials.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.symbol} (${p.sector}): ${p.warnings.join(', ')}`);
    });
    console.log('');
  }

  console.log('TOP ISSUES:');
  console.log(`- HTTP 404: ${http404} stocks`);
  console.log(`- HTTP 500: ${http500} stocks`);
  console.log(`- Method count < 6: ${methodsBelow6} stocks`);
  console.log(`- IV = $0: ${ivZero} stocks\n`);

  console.log('COMPARISON TO ONDA 3:');
  console.log(`Previous: 54/100 (54%)`);
  console.log(`Current: ${passCount}/100 (${passRate}%)`);
  console.log(`Improvement: +${passCount - 54} stocks (+${(parseFloat(passRate) - 54).toFixed(1)}%)\n`);

  console.log('VALIDATION NOTES:');
  console.log(`- Rate limits encountered: ${rateLimitHits > 0 ? 'YES' : 'NO'} (${rateLimitHits} times)`);
  console.log(`- Cache freshness: PRODUCTION`);
  console.log(`- Test duration: ${duration} minutes\n`);

  // Grade
  let grade = 'F';
  if (passRate >= 95) grade = 'A';
  else if (passRate >= 85) grade = 'B';
  else if (passRate >= 75) grade = 'C';
  else if (passRate >= 65) grade = 'D';

  const prodReady = passRate >= 95 ? 'YES' : (passRate >= 85 ? 'CONDITIONAL' : 'NO');

  console.log(`GRADE: ${grade}`);
  console.log(`Production Ready: ${prodReady}`);
  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Save detailed results
  const reportPath = `/Users/antoniofrancisco/Documents/teste 1/BACKEND_REVALIDATION_POST_FIXES_${new Date().toISOString().split('T')[0]}.json`;
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      tested: totalTested,
      pass: passCount,
      partial: partialCount,
      fail: failCount,
      passRate: parseFloat(passRate),
      grade,
      productionReady: prodReady,
      duration: parseFloat(duration),
      rateLimitHits
    },
    sectorResults,
    detailedResults: results
  }, null, 2));

  console.log(`📄 Detailed results saved: ${reportPath}\n`);
}

// Run validation
runValidation().catch(console.error);
