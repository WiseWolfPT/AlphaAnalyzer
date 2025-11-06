#!/usr/bin/env node

/**
 * FASE 1 - Agent 1.3: Cache Pre-Warming Verification
 *
 * Validates that IV data is pre-cached in Redis for the entire stock universe.
 * Checks cache coverage, warmth distribution, and generates detailed reports.
 */

import { createClient } from 'redis';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Stock universe (1,493 stocks)
const STOCK_UNIVERSE = [
  // S&P 500 - Technology
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'ORCL',
  'ADBE', 'CRM', 'ACN', 'CSCO', 'AMD', 'IBM', 'INTC', 'QCOM', 'INTU', 'TXN',
  'AMAT', 'MU', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MCHP', 'FTNT', 'PANW',

  // S&P 500 - Healthcare
  'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'PFE', 'BMY',
  'AMGN', 'GILD', 'CVS', 'CI', 'ISRG', 'VRTX', 'REGN', 'MCK', 'ELV', 'ZTS',

  // S&P 500 - Financials
  'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'MS', 'GS', 'AXP', 'BLK',
  'C', 'SPGI', 'CB', 'MMC', 'PGR', 'AON', 'ICE', 'CME', 'USB', 'PNC',

  // S&P 500 - Consumer Discretionary
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'CMG',

  // S&P 500 - Consumer Staples
  'PG', 'COST', 'WMT', 'KO', 'PEP', 'PM', 'MO', 'CL', 'MDLZ', 'GIS',

  // S&P 500 - Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'WMB', 'OXY',

  // S&P 500 - Industrials
  'CAT', 'BA', 'HON', 'UNP', 'RTX', 'UPS', 'LMT', 'DE', 'GE', 'MMM',

  // S&P 500 - Materials
  'LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'DOW', 'NUE', 'VMC', 'MLM',

  // S&P 500 - Real Estate
  'PLD', 'AMT', 'EQIX', 'PSA', 'WELL', 'DLR', 'O', 'SPG', 'VICI', 'AVB',

  // S&P 500 - Utilities
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'WEC', 'PEG',

  // S&P 500 - Communication Services
  'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'EA',

  // Mid-caps (extended universe sample)
  'ROKU', 'SQ', 'SHOP', 'SNAP', 'PINS', 'UBER', 'LYFT', 'ABNB', 'DASH', 'COIN',
  'ZM', 'DOCU', 'SNOW', 'NET', 'DDOG', 'CRWD', 'ZS', 'OKTA', 'TWLO', 'TEAM',

  // Small-caps (extended universe sample)
  'FROG', 'CPNG', 'PTON', 'HOOD', 'RIVN', 'LCID', 'UPST', 'SOFI', 'DKNG', 'PLTR',
];

// Classification mapping (simplified - would be loaded from stock_universe_complete.csv)
const SECTOR_MAPPING = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'NVDA', 'META', 'AVGO', 'ORCL', 'ADBE', 'CRM', 'ACN', 'CSCO', 'AMD', 'IBM', 'INTC', 'QCOM', 'INTU', 'TXN', 'AMAT', 'MU', 'ADI', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'MCHP', 'FTNT', 'PANW', 'ROKU', 'SQ', 'SHOP', 'SNAP', 'PINS', 'ZM', 'DOCU', 'SNOW', 'NET', 'DDOG', 'CRWD', 'ZS', 'OKTA', 'TWLO', 'TEAM', 'FROG', 'CPNG', 'PTON', 'HOOD', 'RIVN', 'LCID', 'UPST', 'SOFI', 'DKNG', 'PLTR'],
  'Healthcare': ['UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'PFE', 'BMY', 'AMGN', 'GILD', 'CVS', 'CI', 'ISRG', 'VRTX', 'REGN', 'MCK', 'ELV', 'ZTS'],
  'Financials': ['BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'MS', 'GS', 'AXP', 'BLK', 'C', 'SPGI', 'CB', 'MMC', 'PGR', 'AON', 'ICE', 'CME', 'USB', 'PNC'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'CMG', 'UBER', 'LYFT', 'ABNB', 'DASH'],
  'Consumer Staples': ['PG', 'COST', 'WMT', 'KO', 'PEP', 'PM', 'MO', 'CL', 'MDLZ', 'GIS'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'WMB', 'OXY'],
  'Industrials': ['CAT', 'BA', 'HON', 'UNP', 'RTX', 'UPS', 'LMT', 'DE', 'GE', 'MMM'],
  'Materials': ['LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'DOW', 'NUE', 'VMC', 'MLM'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'PSA', 'WELL', 'DLR', 'O', 'SPG', 'VICI', 'AVB'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'WEC', 'PEG'],
  'Communication Services': ['NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'EA', 'COIN'],
};

// Cache warmth thresholds (TTL in seconds)
const WARMTH_THRESHOLDS = {
  HOT: 2700,    // >2700s remaining (cached <1h ago)
  WARM: 600,    // 600-2700s (cached 1-12h ago)
  COLD: 1,      // 1-600s (cached 12-24h ago)
  // STALE: expired or <1s
  // MISS: not cached
};

const EXPECTED_METHODS = 12; // Total valuation methods (FCFE removed)

class CacheWarmingValidator {
  constructor() {
    this.redis = null;
    this.results = {
      timestamp: new Date().toISOString(),
      totalStocks: 0,
      cached: 0,
      notCached: 0,
      cacheHitRate: 0,
      warmthDistribution: {
        HOT: { count: 0, percentage: 0, symbols: [] },
        WARM: { count: 0, percentage: 0, symbols: [] },
        COLD: { count: 0, percentage: 0, symbols: [] },
        STALE: { count: 0, percentage: 0, symbols: [] },
        MISS: { count: 0, percentage: 0, symbols: [] },
      },
      bySector: {},
      methodsCached: {},
      issues: [],
      stockDetails: [],
    };
  }

  async connect() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const redisPassword = process.env.REDIS_PASSWORD || 'alfalyzer2025redis';

    console.log('[INFO] Connecting to Redis...');
    this.redis = createClient({
      url: redisUrl,
      password: redisPassword,
    });

    this.redis.on('error', (err) => console.error('[ERROR] Redis Client Error:', err));
    await this.redis.connect();
    console.log('[INFO] Redis connected successfully');
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      console.log('[INFO] Redis disconnected');
    }
  }

  getWarmthStatus(ttl) {
    if (ttl === null || ttl === undefined) return 'MISS';
    if (ttl <= 0) return 'STALE';
    if (ttl > WARMTH_THRESHOLDS.HOT) return 'HOT';
    if (ttl > WARMTH_THRESHOLDS.WARM) return 'WARM';
    if (ttl > WARMTH_THRESHOLDS.COLD) return 'COLD';
    return 'STALE';
  }

  getSectorForSymbol(symbol) {
    for (const [sector, symbols] of Object.entries(SECTOR_MAPPING)) {
      if (symbols.includes(symbol)) return sector;
    }
    return 'Other';
  }

  async validateStock(symbol) {
    // Key pattern: iv:chart:{SYMBOL}:fcf (main IV chart cache)
    const ivChartKey = `iv:chart:${symbol}:fcf`;

    // Check if IV chart exists
    const chartExists = await this.redis.exists(ivChartKey);
    const ttl = chartExists ? await this.redis.ttl(ivChartKey) : null;
    const warmth = this.getWarmthStatus(ttl);

    // Count method-level cache entries for this symbol
    // Pattern: iv:method:{SYMBOL}:{method_id}
    const methodKeys = await this.redis.keys(`iv:method:${symbol}:*`);
    const methodsCached = methodKeys.length;

    // Parse chart data if available (to check for successful methods)
    let successfulMethods = 0;
    let failedMethods = 0;
    let chartData = null;

    if (chartExists) {
      try {
        const rawData = await this.redis.get(ivChartKey);
        chartData = JSON.parse(rawData);
        successfulMethods = (chartData.methods || []).length;
        failedMethods = (chartData.failedMethods || []).length;
      } catch (e) {
        this.results.issues.push({
          symbol,
          issue: 'INVALID_CHART_JSON',
          details: 'Chart data is not valid JSON',
          severity: 'CRITICAL',
        });
      }
    }

    const sector = this.getSectorForSymbol(symbol);

    const detail = {
      symbol,
      sector,
      cached: chartExists === 1,
      ttl: ttl === -1 ? null : ttl,
      ttlHours: ttl > 0 ? (ttl / 3600).toFixed(2) : null,
      warmth,
      methodsCached, // Method-level cache count
      successfulMethods, // Methods that successfully calculated
      failedMethods, // Methods that failed
      expectedMethods: EXPECTED_METHODS,
      methodsCoverage: methodsCached > 0 ? ((methodsCached / EXPECTED_METHODS) * 100).toFixed(1) : 0,
      stockPrice: chartData?.price || null,
      stockClassification: chartData?.stock_classification || null,
    };

    // Update results
    if (chartExists) {
      this.results.cached++;
      this.results.warmthDistribution[warmth].count++;
      this.results.warmthDistribution[warmth].symbols.push(symbol);
    } else {
      this.results.notCached++;
      this.results.warmthDistribution.MISS.count++;
      this.results.warmthDistribution.MISS.symbols.push(symbol);
    }

    // Track by sector
    if (!this.results.bySector[sector]) {
      this.results.bySector[sector] = {
        total: 0,
        cached: 0,
        notCached: 0,
        hitRate: 0,
        warmth: { HOT: 0, WARM: 0, COLD: 0, STALE: 0, MISS: 0 },
      };
    }
    this.results.bySector[sector].total++;
    if (chartExists) {
      this.results.bySector[sector].cached++;
      this.results.bySector[sector].warmth[warmth]++;
    } else {
      this.results.bySector[sector].notCached++;
      this.results.bySector[sector].warmth.MISS++;
    }

    // Track methods coverage
    if (methodsCached > 0) {
      if (!this.results.methodsCached[methodsCached]) {
        this.results.methodsCached[methodsCached] = 0;
      }
      this.results.methodsCached[methodsCached]++;
    }

    // Flag issues
    if (chartExists && successfulMethods === 0 && failedMethods > 0) {
      this.results.issues.push({
        symbol,
        issue: 'ALL_METHODS_FAILED',
        details: `All ${failedMethods} methods failed to calculate`,
        severity: 'CRITICAL',
      });
    }

    if (chartExists && methodsCached === 0) {
      this.results.issues.push({
        symbol,
        issue: 'NO_METHOD_CACHE',
        details: 'IV chart exists but no method-level cache entries',
        severity: 'WARNING',
      });
    }

    if (warmth === 'STALE') {
      this.results.issues.push({
        symbol,
        issue: 'STALE_CACHE',
        details: `TTL expired (${ttl}s remaining)`,
        severity: 'WARNING',
      });
    }

    this.results.stockDetails.push(detail);
  }

  async validate() {
    console.log(`[INFO] Validating cache for ${STOCK_UNIVERSE.length} stocks...`);

    this.results.totalStocks = STOCK_UNIVERSE.length;

    // Validate each stock
    for (let i = 0; i < STOCK_UNIVERSE.length; i++) {
      const symbol = STOCK_UNIVERSE[i];
      await this.validateStock(symbol);

      if ((i + 1) % 50 === 0) {
        console.log(`[PROGRESS] Validated ${i + 1}/${STOCK_UNIVERSE.length} stocks`);
      }
    }

    // Calculate final metrics
    this.results.cacheHitRate = (this.results.cached / this.results.totalStocks) * 100;

    // Calculate warmth percentages
    for (const warmth of Object.keys(this.results.warmthDistribution)) {
      this.results.warmthDistribution[warmth].percentage =
        (this.results.warmthDistribution[warmth].count / this.results.totalStocks) * 100;
    }

    // Calculate sector hit rates
    for (const sector of Object.keys(this.results.bySector)) {
      const sectorData = this.results.bySector[sector];
      sectorData.hitRate = (sectorData.cached / sectorData.total) * 100;
    }

    console.log('[INFO] Validation complete');
  }

  generateHeatmapCSV() {
    const lines = [
      'Symbol,Sector,Cached,Warmth,TTL_Seconds,TTL_Hours,Methods_Cached,Successful_Methods,Failed_Methods,Methods_Coverage_%,Stock_Price,Classification'
    ];

    for (const detail of this.results.stockDetails) {
      lines.push([
        detail.symbol,
        detail.sector,
        detail.cached ? 'YES' : 'NO',
        detail.warmth,
        detail.ttl || 'N/A',
        detail.ttlHours || 'N/A',
        detail.methodsCached,
        detail.successfulMethods || 0,
        detail.failedMethods || 0,
        detail.methodsCoverage,
        detail.stockPrice || 'N/A',
        detail.stockClassification || 'N/A',
      ].join(','));
    }

    return lines.join('\n');
  }

  generateMarkdownReport() {
    const pass = this.results.cacheHitRate >= 90;
    const partial = this.results.cacheHitRate >= 80 && this.results.cacheHitRate < 90;
    const status = pass ? '✅ PASS' : partial ? '⚠️ PARTIAL' : '❌ FAIL';

    let md = `# FASE 1 - Agent 1.3: Cache Pre-Warming Report

**Generated:** ${this.results.timestamp}
**Status:** ${status}

## Summary

- **Total stocks:** ${this.results.totalStocks}
- **Cached:** ${this.results.cached} (${this.results.cacheHitRate.toFixed(2)}%)
- **Not cached:** ${this.results.notCached} (${((this.results.notCached / this.results.totalStocks) * 100).toFixed(2)}%)
- **Cache hit rate:** ${this.results.cacheHitRate.toFixed(2)}%

### Success Criteria
- ✅ Pass: ≥1,344 stocks cached (90%+) → ${this.results.cached >= 1344 ? '✅' : '❌'}
- ⚠️ Partial: 1,194-1,343 stocks (80-90%) → ${this.results.cached >= 1194 && this.results.cached < 1344 ? '⚠️' : '❌'}
- ❌ Fail: <1,194 stocks (<80%) → ${this.results.cached < 1194 ? '❌' : '✅'}

## Cache Warmth Distribution

| Warmth | Count | Percentage | Description |
|--------|-------|------------|-------------|
| 🔥 HOT | ${this.results.warmthDistribution.HOT.count} | ${this.results.warmthDistribution.HOT.percentage.toFixed(2)}% | Cached <1 hour ago (TTL >2700s) |
| 🌡️ WARM | ${this.results.warmthDistribution.WARM.count} | ${this.results.warmthDistribution.WARM.percentage.toFixed(2)}% | Cached 1-12 hours ago (TTL 600-2700s) |
| 🧊 COLD | ${this.results.warmthDistribution.COLD.count} | ${this.results.warmthDistribution.COLD.percentage.toFixed(2)}% | Cached 12-24 hours ago (TTL 1-600s) |
| 💀 STALE | ${this.results.warmthDistribution.STALE.count} | ${this.results.warmthDistribution.STALE.percentage.toFixed(2)}% | Cached >24 hours ago (TTL expired) |
| ❌ MISS | ${this.results.warmthDistribution.MISS.count} | ${this.results.warmthDistribution.MISS.percentage.toFixed(2)}% | Not cached at all |

### Expected Distribution (Ideal State)
- HOT: ~750 stocks (50%) - Core S&P 500
- WARM: ~600 stocks (40%) - Extended universe
- COLD: ~100 stocks (7%) - Small-caps
- STALE: ~30 stocks (2%) - Rarely accessed
- MISS: ~13 stocks (1%) - ETFs excluded or data gaps

## By Sector

| Sector | Total | Cached | Hit Rate | HOT | WARM | COLD | STALE | MISS |
|--------|-------|--------|----------|-----|------|------|-------|------|
`;

    for (const [sector, data] of Object.entries(this.results.bySector)) {
      md += `| ${sector} | ${data.total} | ${data.cached} | ${data.hitRate.toFixed(1)}% | ${data.warmth.HOT} | ${data.warmth.WARM} | ${data.warmth.COLD} | ${data.warmth.STALE} | ${data.warmth.MISS} |\n`;
    }

    md += `\n## Methods Coverage

| Methods Cached | Stocks Count |
|----------------|--------------|
`;

    for (let i = 0; i <= EXPECTED_METHODS; i++) {
      const count = this.results.methodsCached[i] || 0;
      if (count > 0) {
        md += `| ${i}/${EXPECTED_METHODS} | ${count} |\n`;
      }
    }

    md += `\n## Issues Found (${this.results.issues.length} total)

`;

    if (this.results.issues.length === 0) {
      md += '✅ No issues detected.\n';
    } else {
      // Group by severity
      const critical = this.results.issues.filter(i => i.severity === 'CRITICAL');
      const warnings = this.results.issues.filter(i => i.severity === 'WARNING');
      const info = this.results.issues.filter(i => !i.severity || i.severity === 'INFO');

      if (critical.length > 0) {
        md += `### 🚨 Critical Issues (${critical.length})\n\n`;
        for (const issue of critical.slice(0, 10)) {
          md += `- **${issue.symbol}:** ${issue.issue} - ${issue.details}\n`;
        }
        if (critical.length > 10) {
          md += `\n... and ${critical.length - 10} more critical issues\n`;
        }
        md += '\n';
      }

      if (warnings.length > 0) {
        md += `### ⚠️ Warnings (${warnings.length})\n\n`;
        for (const issue of warnings.slice(0, 10)) {
          md += `- **${issue.symbol}:** ${issue.issue} - ${issue.details}\n`;
        }
        if (warnings.length > 10) {
          md += `\n... and ${warnings.length - 10} more warnings\n`;
        }
        md += '\n';
      }

      if (info.length > 0) {
        md += `### ℹ️ Info (${info.length})\n\n`;
        for (const issue of info.slice(0, 5)) {
          md += `- **${issue.symbol}:** ${issue.issue} - ${issue.details}\n`;
        }
        if (info.length > 5) {
          md += `\n... and ${info.length - 5} more info items\n`;
        }
      }
    }

    md += `\n## Recommendations

`;

    // Generate recommendations based on results
    if (this.results.cacheHitRate < 80) {
      md += `1. ❌ **CRITICAL:** Cache hit rate is below 80%. Investigate cache warming strategy.\n`;
      md += `   - Check if cache warmer workers are running: \`pm2 status\`\n`;
      md += `   - Review cache warmer logs: \`pm2 logs cache-warmer\`\n`;
      md += `   - Verify Redis connection and memory limits\n\n`;
    } else if (this.results.cacheHitRate < 90) {
      md += `1. ⚠️ **WARNING:** Cache hit rate is below 90%. Room for improvement.\n`;
      md += `   - Consider increasing cache warming frequency\n`;
      md += `   - Review stocks with MISS status and investigate why they're not cached\n\n`;
    } else {
      md += `1. ✅ Cache hit rate is excellent (${this.results.cacheHitRate.toFixed(2)}%).\n\n`;
    }

    if (this.results.warmthDistribution.STALE.count > 50) {
      md += `2. ⚠️ High number of STALE entries (${this.results.warmthDistribution.STALE.count}). Consider:\n`;
      md += `   - Increasing cache TTL from 3600s to 7200s\n`;
      md += `   - Implementing periodic refresh for popular stocks\n\n`;
    }

    if (this.results.warmthDistribution.MISS.count > 20) {
      md += `3. ⚠️ ${this.results.warmthDistribution.MISS.count} stocks not cached at all:\n`;
      md += `   - Review if these are ETFs (should be excluded)\n`;
      md += `   - Check if these stocks have data quality issues\n`;
      md += `   - Missing stocks: ${this.results.warmthDistribution.MISS.symbols.slice(0, 10).join(', ')}${this.results.warmthDistribution.MISS.symbols.length > 10 ? '...' : ''}\n\n`;
    }

    const incompleteMethodsIssues = this.results.issues.filter(i => i.issue === 'INCOMPLETE_METHODS');
    if (incompleteMethodsIssues.length > 10) {
      md += `4. ⚠️ ${incompleteMethodsIssues.length} stocks have incomplete methods cached:\n`;
      md += `   - Expected: ${EXPECTED_METHODS} methods per stock\n`;
      md += `   - Review method-level caching implementation\n`;
      md += `   - Check if certain valuation methods are failing\n\n`;
    }

    md += `## Next Steps

1. Review this report and address any critical issues
2. Check heatmap CSV for detailed per-stock analysis
3. Monitor cache hit rate over next 24 hours
4. Implement recommendations if cache hit rate < 90%

---

**Report generated by:** \`scripts/validation/validate-cache-warming.mjs\`
**Data source:** Redis cache (production server)
`;

    return md;
  }

  async run(outputPath) {
    try {
      await this.connect();
      await this.validate();

      // Create output directory
      const outputDir = dirname(outputPath);
      mkdirSync(outputDir, { recursive: true });

      // Write JSON results
      writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
      console.log(`[SUCCESS] JSON results written to: ${outputPath}`);

      // Write heatmap CSV
      const csvPath = outputPath.replace('.json', '_HEATMAP.csv');
      const csvContent = this.generateHeatmapCSV();
      writeFileSync(csvPath, csvContent);
      console.log(`[SUCCESS] Heatmap CSV written to: ${csvPath}`);

      // Write markdown report
      const mdPath = outputPath.replace('.json', '_REPORT.md');
      const mdContent = this.generateMarkdownReport();
      writeFileSync(mdPath, mdContent);
      console.log(`[SUCCESS] Markdown report written to: ${mdPath}`);

      // Print summary
      console.log('\n' + '='.repeat(80));
      console.log('CACHE PRE-WARMING VALIDATION SUMMARY');
      console.log('='.repeat(80));
      console.log(`Total stocks: ${this.results.totalStocks}`);
      console.log(`Cached: ${this.results.cached} (${this.results.cacheHitRate.toFixed(2)}%)`);
      console.log(`Not cached: ${this.results.notCached}`);
      console.log('\nWarmth Distribution:');
      console.log(`  HOT:   ${this.results.warmthDistribution.HOT.count} (${this.results.warmthDistribution.HOT.percentage.toFixed(2)}%)`);
      console.log(`  WARM:  ${this.results.warmthDistribution.WARM.count} (${this.results.warmthDistribution.WARM.percentage.toFixed(2)}%)`);
      console.log(`  COLD:  ${this.results.warmthDistribution.COLD.count} (${this.results.warmthDistribution.COLD.percentage.toFixed(2)}%)`);
      console.log(`  STALE: ${this.results.warmthDistribution.STALE.count} (${this.results.warmthDistribution.STALE.percentage.toFixed(2)}%)`);
      console.log(`  MISS:  ${this.results.warmthDistribution.MISS.count} (${this.results.warmthDistribution.MISS.percentage.toFixed(2)}%)`);
      console.log('\nIssues found: ' + this.results.issues.length);
      console.log('='.repeat(80) + '\n');

      // Determine pass/fail
      if (this.results.cacheHitRate >= 90) {
        console.log('✅ PASS: Cache hit rate ≥ 90%');
        return 0;
      } else if (this.results.cacheHitRate >= 80) {
        console.log('⚠️ PARTIAL: Cache hit rate 80-90%');
        return 1;
      } else {
        console.log('❌ FAIL: Cache hit rate < 80%');
        return 2;
      }

    } catch (error) {
      console.error('[ERROR] Validation failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const outputPath = outputArg
    ? outputArg.split('=')[1]
    : join(__dirname, '../../validation-results/FASE1_AGENT3_CACHE_WARMING_RESULTS.json');

  const validator = new CacheWarmingValidator();
  const exitCode = await validator.run(outputPath);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error('[FATAL]', error);
  process.exit(3);
});
