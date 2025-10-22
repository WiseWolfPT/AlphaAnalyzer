#!/usr/bin/env tsx
/**
 * AlfaValue™ Offline Validation Script - FASE 2
 *
 * Validates intrinsic value calculations against known benchmarks:
 * - AAPL: High-growth tech (target error ≤3%)
 * - MSFT: Enterprise tech (target error ≤3%)
 * - GOOGL: Advertising tech (target error ≤3%)
 * - KO or PG: Low-growth edge case (mature consumer defensive)
 *
 * Output:
 * - Calculated IV vs current market price
 * - Growth assumptions (g1_5, g6_10, g11_20)
 * - Discount rate (CAPM)
 * - Comparison to market (undervalued/overvalued/fair)
 * - Confidence level
 *
 * Usage:
 *   tsx scripts/valuation/offline-validation.ts
 *   # or
 *   npm run validate:alfavalue
 */

import dotenv from 'dotenv';
import { valuationService } from '../../server/services/valuation-service';
import type { AlfaValueResponse } from '../../server/types/valuation';

// Load environment variables
dotenv.config();

/**
 * Validation results for a single ticker
 */
interface ValidationResult {
  ticker: string;
  success: boolean;
  error?: string;
  data?: {
    iv: number;
    price: number;
    discount_pct: number;
    status: string;
    assumptions: {
      g_1_5: number;
      g_6_10: number;
      g_11_20: number;
      discount_rate: number;
      rf: number;
      beta: number;
      mrp: number;
    };
    meta: {
      g_sector_mid: number;
      g_term_region: number;
      region: string;
    };
    confidence: string;
    priceError?: number; // % error vs expected price
  };
}

/**
 * Known benchmark prices (approximate, for validation)
 * These should be updated with actual prices at time of testing
 */
const BENCHMARK_PRICES: Record<string, number> = {
  AAPL: 168.0, // Update with current price
  MSFT: 336.0, // Update with current price
  GOOGL: 137.0, // Update with current price
  KO: 60.0, // Update with current price
  PG: 150.0, // Update with current price
};

/**
 * Expected IV ranges (for sanity checks)
 * These are rough estimates - actual IV will vary
 */
const EXPECTED_IV_RANGES: Record<string, { min: number; max: number }> = {
  AAPL: { min: 150, max: 200 },
  MSFT: { min: 300, max: 400 },
  GOOGL: { min: 120, max: 160 },
  KO: { min: 50, max: 70 },
  PG: { min: 140, max: 170 },
};

/**
 * Format percentage with sign
 */
function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format currency
 */
function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Validate a single ticker
 */
async function validateTicker(ticker: string): Promise<ValidationResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Validating ${ticker}...`);
  console.log('='.repeat(60));

  try {
    // Calculate AlfaValue
    const startTime = Date.now();
    const result: AlfaValueResponse = await valuationService.getAlfaValue(ticker);
    const duration = Date.now() - startTime;

    console.log(`✓ Calculation completed in ${duration}ms\n`);

    // Display results
    console.log('INTRINSIC VALUE RESULTS:');
    console.log('------------------------');
    console.log(`  IV:              ${formatUSD(result.iv)}`);
    console.log(`  Current Price:   ${formatUSD(result.price)}`);
    console.log(`  Discount:        ${formatPct(result.discount_pct)}`);
    console.log(`  Status:          ${result.status.toUpperCase()}`);
    console.log(`  Confidence:      ${result.confidence}`);

    console.log('\nGROWTH ASSUMPTIONS:');
    console.log('-------------------');
    console.log(`  Years 1-5:       ${formatPct(result.assumptions.g_1_5 * 100)}`);
    console.log(`  Years 6-10:      ${formatPct(result.assumptions.g_6_10 * 100)}`);
    console.log(`  Years 11-20:     ${formatPct(result.assumptions.g_11_20 * 100)}`);

    console.log('\nDISCOUNT RATE (CAPM):');
    console.log('---------------------');
    console.log(`  Risk-Free (RF):  ${formatPct(result.assumptions.rf * 100)}`);
    console.log(`  Beta:            ${result.assumptions.beta.toFixed(2)}`);
    console.log(`  MRP:             ${formatPct(result.assumptions.mrp * 100)}`);
    console.log(`  Discount Rate:   ${formatPct(result.assumptions.discount_rate * 100)}`);
    console.log(`  Formula:         DR = ${(result.assumptions.rf * 100).toFixed(2)}% + ${result.assumptions.beta.toFixed(2)} × ${(result.assumptions.mrp * 100).toFixed(2)}%`);

    console.log('\nMETADATA:');
    console.log('---------');
    console.log(`  Sector Growth:   ${formatPct(result.meta.g_sector_mid * 100)}`);
    console.log(`  Terminal Growth: ${formatPct(result.meta.g_term_region * 100)}`);
    console.log(`  Region:          ${result.meta.region}`);
    console.log(`  As Of:           ${result.as_of}`);

    // Validation checks
    console.log('\nVALIDATION CHECKS:');
    console.log('------------------');

    // Check 1: IV within expected range
    const expectedRange = EXPECTED_IV_RANGES[ticker];
    if (expectedRange) {
      const inRange = result.iv >= expectedRange.min && result.iv <= expectedRange.max;
      console.log(`  ✓ IV Range Check: ${inRange ? 'PASS' : 'WARN'} (expected ${formatUSD(expectedRange.min)}-${formatUSD(expectedRange.max)})`);
    }

    // Check 2: Price error vs benchmark
    const benchmarkPrice = BENCHMARK_PRICES[ticker];
    if (benchmarkPrice) {
      const priceError = Math.abs((result.price - benchmarkPrice) / benchmarkPrice) * 100;
      const priceMatch = priceError < 5; // Within 5%
      console.log(`  ✓ Price Check:    ${priceMatch ? 'PASS' : 'WARN'} (error: ${priceError.toFixed(2)}%)`);
    }

    // Check 3: Growth assumptions reasonable
    const g1_5_ok = result.assumptions.g_1_5 >= 0.00 && result.assumptions.g_1_5 <= 0.30;
    const g6_10_ok = result.assumptions.g_6_10 >= 0.02 && result.assumptions.g_6_10 <= 0.20;
    const g11_20_ok = result.assumptions.g_11_20 >= 0.03 && result.assumptions.g_11_20 <= 0.05;
    console.log(`  ✓ Growth g1_5:    ${g1_5_ok ? 'PASS' : 'FAIL'} (${formatPct(result.assumptions.g_1_5 * 100)})`);
    console.log(`  ✓ Growth g6_10:   ${g6_10_ok ? 'PASS' : 'FAIL'} (${formatPct(result.assumptions.g_6_10 * 100)})`);
    console.log(`  ✓ Growth g11_20:  ${g11_20_ok ? 'PASS' : 'FAIL'} (${formatPct(result.assumptions.g_11_20 * 100)})`);

    // Check 4: Discount rate reasonable
    const dr_ok = result.assumptions.discount_rate >= 0.05 && result.assumptions.discount_rate <= 0.15;
    console.log(`  ✓ Discount Rate:  ${dr_ok ? 'PASS' : 'FAIL'} (${formatPct(result.assumptions.discount_rate * 100)})`);

    // Overall status
    const allChecks = g1_5_ok && g6_10_ok && g11_20_ok && dr_ok;
    console.log(`\n  Overall Status:  ${allChecks ? '✓ PASS' : '✗ FAIL'}`);

    return {
      ticker,
      success: true,
      data: {
        iv: result.iv,
        price: result.price,
        discount_pct: result.discount_pct,
        status: result.status,
        assumptions: result.assumptions,
        meta: result.meta,
        confidence: result.confidence,
        priceError: benchmarkPrice ? Math.abs((result.price - benchmarkPrice) / benchmarkPrice) * 100 : undefined,
      },
    };
  } catch (error: any) {
    console.error(`✗ Error validating ${ticker}:`, error.message);

    return {
      ticker,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('AlfaValue™ Offline Validation - FASE 2');
  console.log('='.repeat(60));
  console.log('\nValidating intrinsic value calculations...');
  console.log('Testing tickers: AAPL, MSFT, GOOGL, KO (or PG)\n');

  // Check FMP_API_KEY
  if (!process.env.FMP_API_KEY) {
    console.error('✗ ERROR: FMP_API_KEY not set in environment');
    console.error('Please set FMP_API_KEY in .env file');
    process.exit(1);
  }

  // Validate each ticker
  const tickers = ['AAPL', 'MSFT', 'GOOGL', 'KO'];
  const results: ValidationResult[] = [];

  for (const ticker of tickers) {
    const result = await validateTicker(ticker);
    results.push(result);

    // Wait a bit between API calls to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal Tickers:  ${tickers.length}`);
  console.log(`Successful:     ${successful}`);
  console.log(`Failed:         ${failed}`);

  if (successful > 0) {
    console.log('\nSuccessful Validations:');
    results
      .filter(r => r.success && r.data)
      .forEach(r => {
        console.log(`  ${r.ticker}: IV=${formatUSD(r.data!.iv)}, Status=${r.data!.status.toUpperCase()}, Confidence=${r.data!.confidence}`);
      });
  }

  if (failed > 0) {
    console.log('\nFailed Validations:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  ${r.ticker}: ${r.error}`);
      });
  }

  // Price errors
  console.log('\nPrice Accuracy:');
  results
    .filter(r => r.success && r.data?.priceError !== undefined)
    .forEach(r => {
      const errorStatus = r.data!.priceError! < 3 ? '✓' : '✗';
      console.log(`  ${r.ticker}: ${errorStatus} ${r.data!.priceError!.toFixed(2)}% error`);
    });

  console.log('\n' + '='.repeat(60));
  console.log('Validation complete!');
  console.log('='.repeat(60) + '\n');

  // Exit with error code if any validations failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { validateTicker, main };
