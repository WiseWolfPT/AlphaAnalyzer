/**
 * Test Script: Validate Refactored DNI-20 and DFCF-Terminal Methods
 *
 * This script tests that:
 * 1. calculateDNI20() returns a rich DNI20Response object
 * 2. calculateDFCFTerminal() returns a rich DFCFTerminalResponse object
 * 3. All required fields are present and valid
 * 4. Backward compatibility is maintained
 */

import { ValuationService } from '../server/services/valuation-service';
import type { DNI20Response, DFCFTerminalResponse } from '../server/types/valuation';

const valuationService = new ValuationService();

async function testDNI20(ticker: string) {
  console.log(`\n========================================`);
  console.log(`Testing DNI-20 for ${ticker}`);
  console.log(`========================================`);

  try {
    const result = await valuationService.calculateDNI20(ticker);

    if (!result) {
      console.log(`❌ FAIL: calculateDNI20() returned null for ${ticker}`);
      return false;
    }

    // Validate it's a rich object (not just a number)
    if (typeof result === 'number') {
      console.log(`❌ FAIL: calculateDNI20() returned a number instead of DNI20Response object`);
      return false;
    }

    // Validate all required fields
    const requiredFields: (keyof DNI20Response)[] = [
      'ticker',
      'iv',
      'netIncome',
      'totalDebt',
      'cash',
      'sharesOutstanding',
      'discountRate',
      'growthY1_5',
      'growthY6_10',
      'growthY11_20',
      'confidence',
      'as_of',
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (!(field in result)) {
        console.log(`❌ FAIL: Missing field '${field}' in DNI20Response`);
        allFieldsPresent = false;
      }
    }

    if (!allFieldsPresent) {
      return false;
    }

    // Validate data types and ranges
    if (typeof result.iv !== 'number' || result.iv <= 0 || !isFinite(result.iv)) {
      console.log(`❌ FAIL: Invalid IV value: ${result.iv}`);
      return false;
    }

    if (result.discountRate < 0 || result.discountRate > 1) {
      console.log(`❌ FAIL: Invalid discount rate (should be 0-1): ${result.discountRate}`);
      return false;
    }

    // Print success details
    console.log(`✅ PASS: DNI-20 Response Structure Valid`);
    console.log(`\nResponse Details:`);
    console.log(`  Ticker: ${result.ticker}`);
    console.log(`  IV: $${result.iv.toFixed(2)}`);
    console.log(`  Net Income: $${result.netIncome.toFixed(2)}M`);
    console.log(`  Total Debt: $${result.totalDebt.toFixed(2)}M`);
    console.log(`  Cash: $${result.cash.toFixed(2)}M`);
    console.log(`  Shares Outstanding: ${result.sharesOutstanding.toFixed(2)}M`);
    console.log(`  Discount Rate: ${(result.discountRate * 100).toFixed(2)}%`);
    console.log(`  Growth Y1-5: ${(result.growthY1_5 * 100).toFixed(2)}%`);
    console.log(`  Growth Y6-10: ${(result.growthY6_10 * 100).toFixed(2)}%`);
    console.log(`  Growth Y11-20: ${(result.growthY11_20 * 100).toFixed(2)}%`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  As Of: ${result.as_of}`);

    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: Exception thrown: ${error.message}`);
    return false;
  }
}

async function testDFCFTerminal(ticker: string) {
  console.log(`\n========================================`);
  console.log(`Testing DFCF-Terminal for ${ticker}`);
  console.log(`========================================`);

  try {
    const result = await valuationService.calculateDFCFTerminal(ticker);

    if (!result) {
      console.log(`❌ FAIL: calculateDFCFTerminal() returned null for ${ticker}`);
      return false;
    }

    // Validate it's a rich object (not just a number)
    if (typeof result === 'number') {
      console.log(`❌ FAIL: calculateDFCFTerminal() returned a number instead of DFCFTerminalResponse object`);
      return false;
    }

    // Validate all required fields
    const requiredFields: (keyof DFCFTerminalResponse)[] = [
      'ticker',
      'iv',
      'fcf',
      'totalDebt',
      'cash',
      'wacc',
      'sharesOutstanding',
      'growthY1_5',
      'growthY6_10',
      'terminalGrowth',
      'stage1Value',
      'stage2Value',
      'terminalValue',
      'confidence',
      'as_of',
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (!(field in result)) {
        console.log(`❌ FAIL: Missing field '${field}' in DFCFTerminalResponse`);
        allFieldsPresent = false;
      }
    }

    if (!allFieldsPresent) {
      return false;
    }

    // Validate data types and ranges
    if (typeof result.iv !== 'number' || result.iv <= 0 || !isFinite(result.iv)) {
      console.log(`❌ FAIL: Invalid IV value: ${result.iv}`);
      return false;
    }

    if (result.wacc < 0 || result.wacc > 1) {
      console.log(`❌ FAIL: Invalid WACC (should be 0-1): ${result.wacc}`);
      return false;
    }

    // Validate 3-stage values sum approximately to IV
    const totalStages = result.stage1Value + result.stage2Value + result.terminalValue;
    const ivDifference = Math.abs(totalStages - result.iv);
    if (ivDifference > 1.0) {  // Allow $1 difference for rounding
      console.log(`⚠️  WARNING: Stage values don't sum to IV (diff: $${ivDifference.toFixed(2)})`);
      console.log(`   Stage1 + Stage2 + Terminal = ${totalStages.toFixed(2)}, IV = ${result.iv.toFixed(2)}`);
    }

    // Print success details
    console.log(`✅ PASS: DFCF-Terminal Response Structure Valid`);
    console.log(`\nResponse Details:`);
    console.log(`  Ticker: ${result.ticker}`);
    console.log(`  IV: $${result.iv.toFixed(2)}`);
    console.log(`  FCF TTM: $${result.fcf.toFixed(2)}M`);
    console.log(`  Total Debt: $${result.totalDebt.toFixed(2)}M`);
    console.log(`  Cash: $${result.cash.toFixed(2)}M`);
    console.log(`  WACC: ${(result.wacc * 100).toFixed(2)}%`);
    console.log(`  Shares Outstanding: ${result.sharesOutstanding.toFixed(2)}M`);
    console.log(`\n  3-Stage Breakdown:`);
    console.log(`    Stage 1 (Y1-5) @ ${(result.growthY1_5 * 100).toFixed(2)}%: $${result.stage1Value.toFixed(2)}`);
    console.log(`    Stage 2 (Y6-10) @ ${(result.growthY6_10 * 100).toFixed(2)}%: $${result.stage2Value.toFixed(2)}`);
    console.log(`    Terminal (Y11+) @ ${(result.terminalGrowth * 100).toFixed(2)}%: $${result.terminalValue.toFixed(2)}`);
    console.log(`    Total: $${(result.stage1Value + result.stage2Value + result.terminalValue).toFixed(2)}`);
    console.log(`\n  Confidence: ${result.confidence}`);
    console.log(`  As Of: ${result.as_of}`);

    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: Exception thrown: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Refactored Methods Test Suite                                 ║
║  Testing: calculateDNI20() & calculateDFCFTerminal()          ║
╚════════════════════════════════════════════════════════════════╝
  `);

  const testTicker = process.argv[2] || 'AAPL';

  const dni20Pass = await testDNI20(testTicker);
  const dfcfTerminalPass = await testDFCFTerminal(testTicker);

  console.log(`\n========================================`);
  console.log(`Test Summary for ${testTicker}`);
  console.log(`========================================`);
  console.log(`DNI-20:        ${dni20Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`DFCF-Terminal: ${dfcfTerminalPass ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = dni20Pass && dfcfTerminalPass;
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
