#!/usr/bin/env node
/**
 * AGENT 16: GICS Sector Mapping (CSV-Only Version)
 *
 * Maps existing sector data from stock_universe_complete.csv to GICS 11 sectors.
 * No API calls - uses existing data only.
 *
 * Input: stock_universe_complete.csv
 * Output: server/data/gics-sector-mapping.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const STOCK_UNIVERSE_PATH = path.join(PROJECT_ROOT, 'stock_universe_complete.csv');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'server/data/gics-sector-mapping.json');

/**
 * GICS 11 Sector Mapping
 * Maps FMP sector names to standard GICS structure
 */
const GICS_MAPPING = {
  // Energy
  'Energy': 'Energy',

  // Materials
  'Basic Materials': 'Materials',
  'Materials': 'Materials',

  // Industrials
  'Industrials': 'Industrials',
  'Industrial Goods': 'Industrials',

  // Consumer Discretionary
  'Consumer Cyclical': 'Consumer Discretionary',
  'Consumer Discretionary': 'Consumer Discretionary',

  // Consumer Staples
  'Consumer Defensive': 'Consumer Staples',
  'Consumer Staples': 'Consumer Staples',

  // Health Care
  'Healthcare': 'Health Care',
  'Health Care': 'Health Care',

  // Financials
  'Financial Services': 'Financials',
  'Financial': 'Financials',
  'Financials': 'Financials',

  // Information Technology
  'Technology': 'Information Technology',
  'Information Technology': 'Information Technology',

  // Communication Services
  'Communication Services': 'Communication Services',
  'Communications': 'Communication Services',

  // Utilities
  'Utilities': 'Utilities',

  // Real Estate
  'Real Estate': 'Real Estate',
  'REIT': 'Real Estate',

  // Unknown/N/A
  'N/A': 'Unknown',
  'Unknown': 'Unknown',
};

/**
 * Load stock universe from CSV
 */
function loadStockUniverse() {
  console.log(`📂 Loading stock universe from: ${STOCK_UNIVERSE_PATH}`);

  const csvContent = fs.readFileSync(STOCK_UNIVERSE_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Filter: US stocks only (exclude LSE), YES to IV
  const validStocks = records.filter(stock => {
    return stock.exchange !== 'LSE' &&
           !stock.symbol.endsWith('.L') &&
           stock.can_calculate_iv === 'YES' &&
           stock.symbol.trim() !== '';
  });

  console.log(`✅ Loaded ${validStocks.length} valid US stocks`);
  return validStocks;
}

/**
 * Map sectors to GICS 11 structure
 */
function mapToGICS(stocks) {
  console.log(`\n🗂️  Mapping to GICS 11 sectors...`);

  const mapped = stocks.map(stock => {
    const gicsSector = GICS_MAPPING[stock.sector] || 'Unknown';

    return {
      symbol: stock.symbol.toUpperCase(),
      companyName: stock.company_name,
      exchange: stock.exchange,
      sector: stock.sector,
      industry: stock.industry,
      type: stock.type,
      gicsSector,
      originalSector: stock.sector,
      country: 'US',
      marketCap: null, // Not available in CSV
    };
  });

  return mapped;
}

/**
 * Generate sector statistics
 */
function generateSectorStats(data) {
  console.log(`\n📊 Generating sector statistics...`);

  const stats = {};

  for (const stock of data) {
    const sector = stock.gicsSector;
    if (!stats[sector]) {
      stats[sector] = {
        count: 0,
        stocks: [],
        sampleStocks: [],
      };
    }
    stats[sector].count++;
    stats[sector].stocks.push(stock.symbol);

    // Keep first 5 as samples
    if (stats[sector].sampleStocks.length < 5) {
      stats[sector].sampleStocks.push(stock.symbol);
    }
  }

  return stats;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 AGENT 16: GICS Sector Mapping (CSV-Only)\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Load stock universe
    const stocks = loadStockUniverse();

    // Step 2: Map to GICS 11 sectors
    const gicsMapped = mapToGICS(stocks);

    // Step 3: Generate statistics
    const stats = generateSectorStats(gicsMapped);

    // Step 4: Save results
    console.log(`\n💾 Saving to: ${OUTPUT_PATH}`);

    // Ensure directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(gicsMapped, null, 2));

    // Step 5: Display statistics
    console.log('\n📈 GICS Sector Distribution:');
    console.log('=' .repeat(60));

    const sortedStats = Object.entries(stats)
      .sort((a, b) => b[1].count - a[1].count);

    for (const [sector, data] of sortedStats) {
      const percentage = ((data.count / gicsMapped.length) * 100).toFixed(1);
      console.log(`${sector.padEnd(30)} ${data.count.toString().padStart(4)} stocks (${percentage}%)`);
      console.log(`  Sample: ${data.sampleStocks.join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Total: ${gicsMapped.length} stocks mapped to GICS 11 sectors`);
    console.log(`📁 Output saved to: ${OUTPUT_PATH}`);
    console.log('\nNext steps:');
    console.log('  1. Review server/data/gics-sector-mapping.json');
    console.log('  2. Implement GICSSectorService (server/services/gics-sector-service.ts)');
    console.log('  3. Add sector routes (server/routes/sector-routes.ts)');
    console.log('  4. Build frontend UI (client/src/pages/sectors.tsx)');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
