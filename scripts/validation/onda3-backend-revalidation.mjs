#!/usr/bin/env node
/**
 * ONDA 3: Backend Re-Validation (After ONDA 2 Fixes)
 * Tests same 100 stocks from ONDA 1 to measure improvement
 *
 * Target: ≥95/100 (95% pass rate)
 */

const BASE_URL = 'https://128.140.45.28.sslip.io';

// Exact same 100 stocks from ONDA 1
const STOCK_UNIVERSE = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'AMZN', 'NFLX', 'CRM', 'ADBE', 'ORCL', 'INTC', 'AMD', 'QCOM', 'CSCO'],
  'Financials': ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'USB', 'PNC', 'TFC', 'COF'],
  'Real Estate': ['AMT', 'PLD', 'EQIX', 'PSA', 'CCI', 'DLR', 'SPG', 'O', 'WELL', 'AVB'],
  'Healthcare': ['JNJ', 'UNH', 'LLY', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN'],
  'Consumer': ['WMT', 'PG', 'KO', 'PEP', 'COST', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PSX', 'VLO', 'MPC', 'OXY', 'HAL'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'ED', 'ES'],
  'Industrials': ['CAT', 'BA', 'GE', 'HON', 'UPS', 'RTX', 'LMT', 'MMM', 'DE', 'EMR'],
  'Materials': ['LIN', 'APD', 'SHW', 'ECL', 'NEM', 'FCX', 'DOW', 'DD', 'ALB', 'PPG'],
  'Communication': ['DIS', 'CMCSA', 'T', 'VZ', 'TMUS']
};

// ONDA 1 baseline results for comparison
const ONDA1_RESULTS = {
  'Technology': { pass: 12, total: 15 },
  'Financials': { pass: 9, total: 10 },
  'Real Estate': { pass: 1, total: 10 },
  'Healthcare': { pass: 5, total: 10 },
  'Consumer': { pass: 4, total: 10 },
  'Energy': { pass: 7, total: 10 },
  'Utilities': { pass: 0, total: 10 },
  'Industrials': { pass: 0, total: 10 },
  'Materials': { pass: 0, total: 10 },
  'Communication': { pass: 0, total: 5 }
};

// Validation rules matching ONDA 1 criteria
async function validateStock(symbol, sector) {
  const url = `${BASE_URL}/api/iv/${symbol}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return {
        pass: false,
        reason: `HTTP ${response.status}`,
        methodsCount: 0,
        hasNulls: false
      };
    }

    const data = await response.json();

    // Validation checks (same as ONDA 1)
    const hasNulls = data.methods?.some(m => m.method_id === null) ?? true;
    const methodsCount = data.methods?.length ?? 0;
    const methodsCountValid = methodsCount >= 8 && methodsCount <= 16;

    // Check for REIT-specific methods (key ONDA 2 fix validation)
    let hasReitMethods = true;
    if (sector === 'Real Estate') {
      const availableMethodIds = data.methods?.map(m => m.method_id) ?? [];
      hasReitMethods = availableMethodIds.some(id => id.includes('ffo') || id.includes('affo'));
    }

    const pass = response.ok && !hasNulls && methodsCountValid && hasReitMethods;

    return {
      pass,
      reason: pass ? 'OK' : buildFailureReason(response.status, hasNulls, methodsCountValid, hasReitMethods && sector === 'Real Estate'),
      methodsCount,
      hasNulls
    };

  } catch (error) {
    return {
      pass: false,
      reason: `Network error: ${error.message}`,
      methodsCount: 0,
      hasNulls: false
    };
  }
}

function buildFailureReason(status, hasNulls, methodsCountValid, missingReitMethods) {
  const reasons = [];
  if (status !== 200) reasons.push(`HTTP ${status}`);
  if (hasNulls) reasons.push('NULL method_id');
  if (!methodsCountValid) reasons.push('Invalid method count');
  if (missingReitMethods) reasons.push('Missing REIT methods (FFO/AFFO)');
  return reasons.join('; ');
}

async function runValidation() {
  console.log('BACKEND RE-VALIDATION (AFTER ONDA 2 FIXES)');
  console.log('==========================================\n');

  const results = {};
  let totalPass = 0;
  let totalTests = 0;
  let testCount = 0;

  for (const [sector, symbols] of Object.entries(STOCK_UNIVERSE)) {
    results[sector] = {
      pass: 0,
      total: symbols.length,
      failures: []
    };

    for (const symbol of symbols) {
      testCount++;
      const result = await validateStock(symbol, sector);

      if (result.pass) {
        results[sector].pass++;
        totalPass++;
      } else {
        results[sector].failures.push({
          symbol,
          reason: result.reason,
          methodsCount: result.methodsCount
        });
      }

      totalTests++;

      // Progress report every 20 stocks
      if (testCount % 20 === 0) {
        console.log(`Progress: ${testCount}/100 tested (${totalPass} pass so far)\n`);
      }

      // Rate limiting: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Final Report
  const passRate = ((totalPass / totalTests) * 100).toFixed(1);
  const improvement = totalPass - 38; // ONDA 1 baseline
  const targetMet = totalPass >= 95;

  console.log(`\nPASS RATE: ${totalPass}/${totalTests} (${passRate}%)`);
  console.log(`TARGET: 95/100 (95%)`);
  console.log(`STATUS: ${targetMet ? '✅ MET' : '❌ MISSED'}\n`);

  console.log('IMPROVEMENT vs ONDA 1:');
  console.log(`- ONDA 1: 38/100 (38%)`);
  console.log(`- ONDA 3: ${totalPass}/100 (${passRate}%)`);
  console.log(`- DELTA: +${improvement} stocks (+${(improvement / 100 * 100).toFixed(1)} points)\n`);

  console.log('SECTOR BREAKDOWN (vs ONDA 1):');
  for (const [sector, result] of Object.entries(results)) {
    const onda1 = ONDA1_RESULTS[sector];
    const onda3Rate = ((result.pass / result.total) * 100).toFixed(0);
    const onda1Rate = ((onda1.pass / onda1.total) * 100).toFixed(0);
    const delta = result.pass - onda1.pass;
    const marker = ['Real Estate', 'Utilities', 'Industrials', 'Materials', 'Communication'].includes(sector) ? ' ← KEY FIX' : '';

    console.log(`- ${sector}: ${result.pass}/${result.total} (${onda3Rate}%) [was ${onda1Rate}%] [${delta >= 0 ? '+' : ''}${delta}]${marker}`);
  }

  // Show failures if didn't meet target
  if (!targetMet) {
    console.log('\nREMAINING FAILURES:');
    let failureCount = 0;
    for (const [sector, result] of Object.entries(results)) {
      for (const failure of result.failures) {
        failureCount++;
        console.log(`${failureCount}. ${failure.symbol} (${sector}): ${failure.reason}`);
      }
    }
  } else {
    console.log('\n🎉 TARGET ACHIEVED! 95%+ pass rate.');
  }

  // Impact analysis
  console.log('\n\nIMPACT ANALYSIS:');
  const reitImpact = results['Real Estate'].pass - ONDA1_RESULTS['Real Estate'].pass;
  const utilitiesImpact = results['Utilities'].pass - ONDA1_RESULTS['Utilities'].pass;
  const materialsImpact = results['Materials'].pass - ONDA1_RESULTS['Materials'].pass;

  console.log(`- REIT fix impact: +${reitImpact} stocks (${ONDA1_RESULTS['Real Estate'].pass} → ${results['Real Estate'].pass})`);
  console.log(`- API fallback impact: +${utilitiesImpact + materialsImpact} stocks (inferred from Utilities + Materials)`);
  console.log(`- Total improvement: +${improvement} stocks`);

  process.exit(targetMet ? 0 : 1);
}

runValidation().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
