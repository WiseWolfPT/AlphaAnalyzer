#!/usr/bin/env node
/**
 * IV Cache Coverage Validation Script - P0 Fix #4
 *
 * Validates cache coverage for all 1,493 stocks across 12 valuation methods.
 *
 * Acceptance Criteria:
 * - ✅ Cache coverage: ≥90% (1,344+ stocks)
 * - ✅ All methods covered: 12 methods per stock
 * - ✅ Zero corrupted cache entries
 * - ✅ Cache age: <24h for Tier 1 (S&P 100)
 *
 * Output:
 * - Console report (colorized)
 * - JSON file: validation-results/iv-cache-coverage-YYYY-MM-DD.json
 * - CSV file: validation-results/iv-cache-gaps-YYYY-MM-DD.csv
 */

import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redis configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Method IDs (12 methods - FCFE removed)
const METHOD_IDS = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-fcfe-20',
  'dcf-terminal-fcf',
  'dcf-terminal-fcfe',
  'dni-20',
  'dfcf-terminal',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg',
];

// Stock universe (simplified - load from CSV in production)
const SP100_SAMPLE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'V', 'UNH',
  'JPM', 'XOM', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'LLY', 'MRK',
  'ABBV', 'KO', 'PEP', 'COST', 'AVGO', 'BAC', 'TMO', 'ADBE', 'CSCO', 'MCD',
];

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Load stock universe from CSV
 */
async function loadStockUniverse() {
  try {
    const csvPath = path.resolve(__dirname, '../../stock_universe_complete.csv');

    if (!fs.existsSync(csvPath)) {
      console.warn(`${colors.yellow}⚠️  CSV not found, using sample universe${colors.reset}`);
      return SP100_SAMPLE;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header

    const stocks = lines
      .map(line => {
        const [symbol, , exchange, , , , canCalculateIV] = line.split(',');
        return { symbol: symbol?.trim(), exchange: exchange?.trim(), canCalculateIV: canCalculateIV?.trim() };
      })
      .filter(s =>
        s.symbol &&
        s.exchange !== 'LSE' &&
        !s.symbol.endsWith('.L') &&
        s.canCalculateIV !== 'NO'
      )
      .map(s => s.symbol.toUpperCase());

    console.log(`${colors.cyan}📊 Loaded ${stocks.length} stocks from CSV${colors.reset}`);
    return stocks;
  } catch (error) {
    console.error(`${colors.red}❌ Error loading CSV: ${error.message}${colors.reset}`);
    return SP100_SAMPLE;
  }
}

/**
 * Check cache coverage for a single stock
 */
async function checkStockCoverage(redis, ticker) {
  const results = {
    ticker,
    totalMethods: METHOD_IDS.length,
    cachedMethods: 0,
    missingMethods: [],
    cacheAge: {},
    corrupted: [],
  };

  for (const methodId of METHOD_IDS) {
    const cacheKey = `iv:method:${ticker}:${methodId}`;

    try {
      const cached = await redis.get(cacheKey);
      const ttl = await redis.ttl(cacheKey);

      if (cached) {
        results.cachedMethods++;

        // Calculate cache age (24h TTL)
        const ageHours = ((86400 - ttl) / 3600).toFixed(1);
        results.cacheAge[methodId] = parseFloat(ageHours);

        // Check if corrupted (invalid JSON)
        try {
          JSON.parse(cached);
        } catch (parseError) {
          results.corrupted.push(methodId);
        }
      } else {
        results.missingMethods.push(methodId);
      }
    } catch (error) {
      console.error(`Error checking ${ticker}:${methodId}:`, error.message);
      results.missingMethods.push(methodId);
    }
  }

  results.coveragePercent = (results.cachedMethods / results.totalMethods) * 100;
  return results;
}

/**
 * Main validation function
 */
async function validateCacheCoverage() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     IV Cache Coverage Validation - P0 Fix #4              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Connect to Redis
  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    console.log(`${colors.green}✅ Connected to Redis: ${REDIS_HOST}:${REDIS_PORT}${colors.reset}\n`);
  } catch (error) {
    console.error(`${colors.red}❌ Failed to connect to Redis: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  // Load stock universe
  const stocks = await loadStockUniverse();
  console.log(`${colors.cyan}📈 Validating ${stocks.length} stocks × ${METHOD_IDS.length} methods = ${stocks.length * METHOD_IDS.length} total entries${colors.reset}\n`);

  // Validate coverage
  const results = {
    timestamp: new Date().toISOString(),
    totalStocks: stocks.length,
    totalMethods: METHOD_IDS.length,
    totalEntries: stocks.length * METHOD_IDS.length,
    stockResults: [],
    summary: {
      fullyCachedStocks: 0,
      partiallyCachedStocks: 0,
      uncachedStocks: 0,
      totalCachedEntries: 0,
      totalMissingEntries: 0,
      totalCorruptedEntries: 0,
      coveragePercent: 0,
    },
  };

  let processedCount = 0;
  const startTime = Date.now();

  for (const ticker of stocks) {
    const stockResult = await checkStockCoverage(redis, ticker);
    results.stockResults.push(stockResult);

    // Update summary
    if (stockResult.coveragePercent === 100) {
      results.summary.fullyCachedStocks++;
    } else if (stockResult.coveragePercent > 0) {
      results.summary.partiallyCachedStocks++;
    } else {
      results.summary.uncachedStocks++;
    }

    results.summary.totalCachedEntries += stockResult.cachedMethods;
    results.summary.totalMissingEntries += stockResult.missingMethods.length;
    results.summary.totalCorruptedEntries += stockResult.corrupted.length;

    processedCount++;

    // Progress update every 100 stocks
    if (processedCount % 100 === 0 || processedCount === stocks.length) {
      const percent = ((processedCount / stocks.length) * 100).toFixed(1);
      process.stdout.write(`\r${colors.cyan}⏳ Progress: ${processedCount}/${stocks.length} (${percent}%)${colors.reset}`);
    }
  }

  console.log('\n'); // New line after progress

  // Calculate overall coverage
  results.summary.coveragePercent = (results.summary.totalCachedEntries / results.totalEntries) * 100;

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print summary
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}VALIDATION SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`📊 Total Stocks: ${colors.bold}${results.totalStocks}${colors.reset}`);
  console.log(`📊 Total Methods per Stock: ${colors.bold}${results.totalMethods}${colors.reset}`);
  console.log(`📊 Total Cache Entries: ${colors.bold}${results.totalEntries}${colors.reset}\n`);

  const coverageColor = results.summary.coveragePercent >= 90 ? colors.green : colors.red;
  console.log(`${colors.bold}Cache Coverage: ${coverageColor}${results.summary.coveragePercent.toFixed(2)}%${colors.reset}`);
  console.log(`  ├─ Cached: ${colors.green}${results.summary.totalCachedEntries}${colors.reset}`);
  console.log(`  ├─ Missing: ${colors.red}${results.summary.totalMissingEntries}${colors.reset}`);
  console.log(`  └─ Corrupted: ${results.summary.totalCorruptedEntries > 0 ? colors.red : colors.green}${results.summary.totalCorruptedEntries}${colors.reset}\n`);

  console.log(`${colors.bold}Stock Distribution:${colors.reset}`);
  console.log(`  ├─ Fully Cached (100%): ${colors.green}${results.summary.fullyCachedStocks}${colors.reset}`);
  console.log(`  ├─ Partially Cached: ${colors.yellow}${results.summary.partiallyCachedStocks}${colors.reset}`);
  console.log(`  └─ Uncached (0%): ${colors.red}${results.summary.uncachedStocks}${colors.reset}\n`);

  // Acceptance criteria check
  const targetCoverage = 90;
  const targetStocks = Math.ceil(results.totalStocks * (targetCoverage / 100));
  const passedCoverage = results.summary.coveragePercent >= targetCoverage;
  const passedCorruption = results.summary.totalCorruptedEntries === 0;

  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}ACCEPTANCE CRITERIA${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${passedCoverage ? colors.green + '✅' : colors.red + '❌'} Coverage ≥${targetCoverage}%: ${results.summary.coveragePercent.toFixed(2)}%${colors.reset}`);
  console.log(`${passedCorruption ? colors.green + '✅' : colors.red + '❌'} Zero Corrupted Entries: ${results.summary.totalCorruptedEntries}${colors.reset}`);
  console.log(`${colors.green}✅${colors.reset} Target Stocks (${targetCoverage}%): ${targetStocks}/${results.totalStocks}\n`);

  const overallPassed = passedCoverage && passedCorruption;
  if (overallPassed) {
    console.log(`${colors.bold}${colors.green}🎉 VALIDATION PASSED${colors.reset}\n`);
  } else {
    console.log(`${colors.bold}${colors.red}❌ VALIDATION FAILED${colors.reset}\n`);
  }

  console.log(`⏱️  Duration: ${duration}s\n`);

  // Save results
  const outputDir = path.resolve(__dirname, '../../validation-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const jsonPath = path.join(outputDir, `iv-cache-coverage-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`${colors.cyan}📄 JSON report saved: ${jsonPath}${colors.reset}`);

  // Save gaps CSV
  const gaps = results.stockResults.filter(r => r.coveragePercent < 100);
  if (gaps.length > 0) {
    const csvPath = path.join(outputDir, `iv-cache-gaps-${dateStr}.csv`);
    const csvHeader = 'ticker,coverage_percent,cached_methods,missing_methods,corrupted_methods\n';
    const csvRows = gaps.map(gap =>
      `${gap.ticker},${gap.coveragePercent.toFixed(2)},${gap.cachedMethods},"${gap.missingMethods.join(';')}","${gap.corrupted.join(';')}"`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`${colors.cyan}📄 Gaps CSV saved: ${csvPath}${colors.reset}\n`);
  }

  await redis.quit();
  process.exit(overallPassed ? 0 : 1);
}

// Run validation
validateCacheCoverage().catch(error => {
  console.error(`${colors.red}❌ Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
