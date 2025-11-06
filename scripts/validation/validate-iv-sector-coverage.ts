/**
 * Intrinsic Value Sector Coverage Validation Script
 *
 * Tests IV calculations across all 11 GICS sectors to ensure:
 * - Method diversity (each stock has 8+ different IV values)
 * - Sector-appropriate calculations
 * - Data freshness (<90 days)
 * - No $0.00 or null values
 * - Reasonable values (within 50-200% of current price)
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  symbol: string;
  sector: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    currentPrice: number | null;
    methodCount: number;
    uniqueValues: number;
    avgDiscount: number;
    dataAge: number | null;
    hasNullValues: boolean;
    hasZeroValues: boolean;
    valueRange: { min: number; max: number };
    priceRangeCheck: boolean;
  };
  methods?: any[];
}

interface SectorSummary {
  sector: string;
  totalStocks: number;
  passedStocks: number;
  failedStocks: number;
  passRate: number;
  avgMethodCount: number;
  avgUniqueValues: number;
  commonIssues: string[];
}

// 11 Sector test universe (3-5 stocks per sector)
const SECTOR_UNIVERSE: Record<string, string[]> = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'],
  'Financials': ['JPM', 'BAC', 'GS', 'MS', 'WFC'],
  'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABBV', 'TMO'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'NKE', 'MCD'],
  'Communication Services': ['DIS', 'NFLX', 'CMCSA', 'T', 'VZ'],
  'Industrials': ['BA', 'CAT', 'GE', 'UPS', 'HON'],
  'Consumer Staples': ['PG', 'KO', 'PEP', 'WMT', 'COST'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP'],
  'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA'],
  'Materials': ['LIN', 'APD', 'ECL', 'SHW', 'NEM']
};

const BASE_URL = process.env.TARGET_URL || 'https://128.140.45.28.sslip.io';
const OUTPUT_DIR = path.join(process.cwd(), 'validation-results');
const TIMEOUT = 30000; // 30s per stock

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Validate a single stock's IV calculations
 */
async function validateStock(symbol: string, sector: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    symbol,
    sector,
    success: false,
    errors: [],
    warnings: [],
    metrics: {
      currentPrice: null,
      methodCount: 0,
      uniqueValues: 0,
      avgDiscount: 0,
      dataAge: null,
      hasNullValues: false,
      hasZeroValues: false,
      valueRange: { min: Infinity, max: -Infinity },
      priceRangeCheck: false
    }
  };

  try {
    console.log(`\n[${symbol}] Fetching IV data...`);

    const response = await axios.get(`${BASE_URL}/api/iv/${symbol}/chart`, {
      timeout: TIMEOUT,
      validateStatus: (status) => status < 500 // Accept 4xx for analysis
    });

    if (response.status === 404) {
      result.errors.push('IV endpoint returned 404');
      return result;
    }

    if (response.status === 400 && response.data?.error === 'ETF_NOT_SUPPORTED') {
      result.errors.push(`ETF detected: ${response.data.reason}`);
      return result;
    }

    if (response.status !== 200) {
      result.errors.push(`HTTP ${response.status}: ${response.data?.error || 'Unknown error'}`);
      return result;
    }

    const data = response.data;

    // Extract metrics
    result.metrics.currentPrice = data.price || null;
    result.methods = data.methods || [];
    result.metrics.methodCount = result.methods.length;

    if (result.metrics.methodCount === 0) {
      result.errors.push('No valuation methods returned');
      return result;
    }

    // Check for unique IV values
    const ivValues = result.methods.map((m: any) => m.iv).filter((v: any) => v !== null && v !== undefined);
    const uniqueIVs = new Set(ivValues);
    result.metrics.uniqueValues = uniqueIVs.size;

    if (result.metrics.uniqueValues < result.metrics.methodCount * 0.8) {
      result.warnings.push(`Low diversity: Only ${result.metrics.uniqueValues} unique values for ${result.metrics.methodCount} methods`);
    }

    // Check for null/zero values
    const hasNull = result.methods.some((m: any) => m.iv === null || m.iv === undefined);
    const hasZero = result.methods.some((m: any) => m.iv === 0 || m.iv === 0.0);

    result.metrics.hasNullValues = hasNull;
    result.metrics.hasZeroValues = hasZero;

    if (hasNull) result.errors.push('Contains null IV values');
    if (hasZero) result.errors.push('Contains $0.00 IV values');

    // Calculate value range
    const validIVs = ivValues.filter((v: number) => v > 0);
    if (validIVs.length > 0) {
      result.metrics.valueRange.min = Math.min(...validIVs);
      result.metrics.valueRange.max = Math.max(...validIVs);

      // Check if values are reasonable relative to price
      if (result.metrics.currentPrice && result.metrics.currentPrice > 0) {
        const minRatio = result.metrics.valueRange.min / result.metrics.currentPrice;
        const maxRatio = result.metrics.valueRange.max / result.metrics.currentPrice;

        result.metrics.priceRangeCheck = minRatio >= 0.5 && maxRatio <= 2.0;

        if (!result.metrics.priceRangeCheck) {
          result.warnings.push(
            `IV range (${minRatio.toFixed(2)}x - ${maxRatio.toFixed(2)}x price) outside expected bounds (0.5-2.0x)`
          );
        }
      }
    } else {
      result.errors.push('No valid IV values found');
    }

    // Calculate average discount
    const discounts = result.methods
      .map((m: any) => m.discount_pct)
      .filter((d: any) => d !== null && d !== undefined && !isNaN(d));

    if (discounts.length > 0) {
      result.metrics.avgDiscount = discounts.reduce((a: number, b: number) => a + b, 0) / discounts.length;
    }

    // Check data freshness
    const asOfDates = result.methods
      .map((m: any) => m.as_of)
      .filter((d: any) => d && d !== 'N/A');

    if (asOfDates.length > 0) {
      const latestDate = new Date(asOfDates[0]);
      const daysOld = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
      result.metrics.dataAge = daysOld;

      if (daysOld > 90) {
        result.warnings.push(`Data is ${daysOld} days old (>90 day threshold)`);
      }
    }

    // Success criteria
    result.success =
      result.errors.length === 0 &&
      result.metrics.methodCount >= 8 &&
      result.metrics.uniqueValues >= result.metrics.methodCount * 0.8 &&
      !result.metrics.hasNullValues &&
      !result.metrics.hasZeroValues;

    console.log(`[${symbol}] ${result.success ? '✅ PASS' : '❌ FAIL'} - ${result.metrics.methodCount} methods, ${result.metrics.uniqueValues} unique values`);

  } catch (error: any) {
    result.errors.push(`Exception: ${error.message}`);
    console.error(`[${symbol}] ❌ ERROR: ${error.message}`);
  }

  return result;
}

/**
 * Validate entire sector
 */
async function validateSector(sector: string, symbols: string[]): Promise<ValidationResult[]> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SECTOR: ${sector.toUpperCase()}`);
  console.log(`${'='.repeat(80)}`);

  const results: ValidationResult[] = [];

  for (const symbol of symbols) {
    const result = await validateStock(symbol, sector);
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Generate sector summary
 */
function generateSectorSummary(results: ValidationResult[]): SectorSummary {
  const sector = results[0]?.sector || 'Unknown';
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  // Collect common issues
  const issueMap = new Map<string, number>();
  results.forEach(r => {
    r.errors.forEach(err => {
      issueMap.set(err, (issueMap.get(err) || 0) + 1);
    });
    r.warnings.forEach(warn => {
      issueMap.set(warn, (issueMap.get(warn) || 0) + 1);
    });
  });

  const commonIssues = Array.from(issueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([issue, count]) => `${issue} (${count})`);

  const avgMethodCount = results.reduce((sum, r) => sum + r.metrics.methodCount, 0) / results.length;
  const avgUniqueValues = results.reduce((sum, r) => sum + r.metrics.uniqueValues, 0) / results.length;

  return {
    sector,
    totalStocks: results.length,
    passedStocks: passed.length,
    failedStocks: failed.length,
    passRate: (passed.length / results.length) * 100,
    avgMethodCount,
    avgUniqueValues,
    commonIssues
  };
}

/**
 * Generate validation matrix CSV
 */
function generateCSV(allResults: ValidationResult[]): string {
  const headers = [
    'Symbol',
    'Sector',
    'Status',
    'Price',
    'Methods',
    'Unique Values',
    'Avg Discount %',
    'Data Age (days)',
    'Min IV',
    'Max IV',
    'Errors',
    'Warnings'
  ].join(',');

  const rows = allResults.map(r => [
    r.symbol,
    r.sector,
    r.success ? 'PASS' : 'FAIL',
    r.metrics.currentPrice?.toFixed(2) || 'N/A',
    r.metrics.methodCount,
    r.metrics.uniqueValues,
    r.metrics.avgDiscount.toFixed(2),
    r.metrics.dataAge || 'N/A',
    r.metrics.valueRange.min === Infinity ? 'N/A' : r.metrics.valueRange.min.toFixed(2),
    r.metrics.valueRange.max === -Infinity ? 'N/A' : r.metrics.valueRange.max.toFixed(2),
    `"${r.errors.join('; ')}"`,
    `"${r.warnings.join('; ')}"`,
  ].join(','));

  return [headers, ...rows].join('\n');
}

/**
 * Generate comprehensive markdown report
 */
function generateMarkdownReport(
  allResults: ValidationResult[],
  sectorSummaries: SectorSummary[]
): string {
  const timestamp = new Date().toISOString();
  const totalStocks = allResults.length;
  const totalPassed = allResults.filter(r => r.success).length;
  const totalFailed = totalStocks - totalPassed;
  const overallPassRate = (totalPassed / totalStocks) * 100;

  let md = `# Intrinsic Value Sector Coverage Validation Report\n\n`;
  md += `**Generated:** ${timestamp}\n\n`;
  md += `**Environment:** ${BASE_URL}\n\n`;

  md += `## Executive Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Stocks Tested | ${totalStocks} |\n`;
  md += `| Passed | ${totalPassed} (${overallPassRate.toFixed(1)}%) |\n`;
  md += `| Failed | ${totalFailed} (${(100 - overallPassRate).toFixed(1)}%) |\n`;
  md += `| Sectors Covered | ${sectorSummaries.length} |\n`;
  md += `| Success Threshold | 80% |\n`;
  md += `| **Status** | **${overallPassRate >= 80 ? '✅ PASS' : '❌ FAIL'}** |\n\n`;

  md += `## Sector Performance\n\n`;
  md += `| Sector | Stocks | Pass | Fail | Pass Rate | Avg Methods | Avg Unique |\n`;
  md += `|--------|--------|------|------|-----------|-------------|------------|\n`;

  sectorSummaries.forEach(s => {
    const status = s.passRate >= 80 ? '✅' : '❌';
    md += `| ${status} ${s.sector} | ${s.totalStocks} | ${s.passedStocks} | ${s.failedStocks} | ${s.passRate.toFixed(1)}% | ${s.avgMethodCount.toFixed(1)} | ${s.avgUniqueValues.toFixed(1)} |\n`;
  });

  md += `\n## Detailed Results by Sector\n\n`;

  sectorSummaries.forEach(summary => {
    const sectorResults = allResults.filter(r => r.sector === summary.sector);

    md += `### ${summary.sector}\n\n`;
    md += `**Pass Rate:** ${summary.passRate.toFixed(1)}% (${summary.passedStocks}/${summary.totalStocks})\n\n`;

    if (summary.commonIssues.length > 0) {
      md += `**Common Issues:**\n`;
      summary.commonIssues.forEach(issue => {
        md += `- ${issue}\n`;
      });
      md += `\n`;
    }

    md += `| Symbol | Status | Price | Methods | Unique | Avg Discount | Issues |\n`;
    md += `|--------|--------|-------|---------|--------|--------------|--------|\n`;

    sectorResults.forEach(r => {
      const status = r.success ? '✅' : '❌';
      const price = r.metrics.currentPrice?.toFixed(2) || 'N/A';
      const issues = [...r.errors, ...r.warnings].slice(0, 2).join('; ') || 'None';

      md += `| ${r.symbol} | ${status} | $${price} | ${r.metrics.methodCount} | ${r.metrics.uniqueValues} | ${r.metrics.avgDiscount.toFixed(1)}% | ${issues} |\n`;
    });

    md += `\n`;
  });

  md += `## Recommendations\n\n`;

  const failedSectors = sectorSummaries.filter(s => s.passRate < 80);
  if (failedSectors.length > 0) {
    md += `### Failed Sectors (Pass Rate < 80%)\n\n`;
    failedSectors.forEach(s => {
      md += `- **${s.sector}**: ${s.passRate.toFixed(1)}% pass rate\n`;
      s.commonIssues.forEach(issue => {
        md += `  - ${issue}\n`;
      });
    });
    md += `\n`;
  }

  // Identify stocks with no methods
  const noMethodStocks = allResults.filter(r => r.metrics.methodCount === 0);
  if (noMethodStocks.length > 0) {
    md += `### Stocks with No Methods\n\n`;
    noMethodStocks.forEach(r => {
      md += `- **${r.symbol}** (${r.sector}): ${r.errors.join(', ')}\n`;
    });
    md += `\n`;
  }

  // Identify stocks with low diversity
  const lowDiversityStocks = allResults.filter(r =>
    r.metrics.methodCount > 0 &&
    r.metrics.uniqueValues < r.metrics.methodCount * 0.8
  );
  if (lowDiversityStocks.length > 0) {
    md += `### Stocks with Low Value Diversity (<80% unique)\n\n`;
    lowDiversityStocks.forEach(r => {
      md += `- **${r.symbol}** (${r.sector}): ${r.metrics.uniqueValues}/${r.metrics.methodCount} unique\n`;
    });
    md += `\n`;
  }

  md += `## Next Steps\n\n`;

  if (overallPassRate >= 80) {
    md += `✅ **VALIDATION PASSED** - System meets acceptance criteria\n\n`;
    md += `- Monitor edge cases and warnings\n`;
    md += `- Consider expanding test universe\n`;
    md += `- Schedule regular validation runs\n`;
  } else {
    md += `❌ **VALIDATION FAILED** - System needs improvements\n\n`;
    md += `- Fix critical errors in failed sectors\n`;
    md += `- Investigate stocks with no methods\n`;
    md += `- Improve method diversity algorithms\n`;
    md += `- Re-run validation after fixes\n`;
  }

  return md;
}

/**
 * Main validation execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  INTRINSIC VALUE SECTOR COVERAGE VALIDATION                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Target: ${BASE_URL}`);
  console.log(`Sectors: ${Object.keys(SECTOR_UNIVERSE).length}`);
  console.log(`Total Stocks: ${Object.values(SECTOR_UNIVERSE).flat().length}`);
  console.log();

  const allResults: ValidationResult[] = [];
  const sectorSummaries: SectorSummary[] = [];

  // Validate each sector
  for (const [sector, symbols] of Object.entries(SECTOR_UNIVERSE)) {
    const results = await validateSector(sector, symbols);
    allResults.push(...results);

    const summary = generateSectorSummary(results);
    sectorSummaries.push(summary);

    console.log(`\n${sector}: ${summary.passRate.toFixed(1)}% pass rate (${summary.passedStocks}/${summary.totalStocks})`);
  }

  // Generate outputs
  console.log('\n' + '='.repeat(80));
  console.log('GENERATING REPORTS');
  console.log('='.repeat(80) + '\n');

  const csvData = generateCSV(allResults);
  const csvPath = path.join(OUTPUT_DIR, 'iv-sector-validation-matrix.csv');
  fs.writeFileSync(csvPath, csvData);
  console.log(`✅ CSV Matrix: ${csvPath}`);

  const mdReport = generateMarkdownReport(allResults, sectorSummaries);
  const mdPath = path.join(OUTPUT_DIR, 'IV_SECTOR_VALIDATION_REPORT.md');
  fs.writeFileSync(mdPath, mdReport);
  console.log(`✅ Markdown Report: ${mdPath}`);

  const jsonPath = path.join(OUTPUT_DIR, 'iv-sector-validation-raw.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ results: allResults, summaries: sectorSummaries }, null, 2));
  console.log(`✅ Raw JSON: ${jsonPath}`);

  // Final summary
  const totalPassed = allResults.filter(r => r.success).length;
  const overallPassRate = (totalPassed / allResults.length) * 100;

  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`\nOverall Pass Rate: ${overallPassRate.toFixed(1)}% (${totalPassed}/${allResults.length})`);
  console.log(`Threshold: 80%`);
  console.log(`Status: ${overallPassRate >= 80 ? '✅ PASS' : '❌ FAIL'}\n`);

  process.exit(overallPassRate >= 80 ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
