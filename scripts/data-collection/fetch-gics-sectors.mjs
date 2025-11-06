#!/usr/bin/env node
/**
 * AGENT 16: GICS Sector Data Collection
 *
 * Fetches sector and industry data for all 1,493 stocks and maps them
 * to the standard GICS 11-sector structure.
 *
 * Input: stock_universe_complete.csv
 * Output: server/data/gics-sector-mapping.json
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FMP_API_KEY = process.env.FMP_API_KEY;
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const STOCK_UNIVERSE_PATH = path.join(PROJECT_ROOT, 'stock_universe_complete.csv');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'server/data/gics-sector-mapping.json');

// Rate limiting
const RATE_LIMIT_MS = 250; // 4 req/s (FMP limit)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
 * Fetch sector data from FMP (for stocks missing sector in CSV)
 */
async function enrichSectorData(stocks) {
  console.log(`\n🔍 Enriching sector data from FMP API...`);

  const enriched = [];
  let apiCalls = 0;
  let skipped = 0;

  for (const stock of stocks) {
    // If CSV already has sector data, use it
    if (stock.sector && stock.sector !== 'N/A' && stock.industry && stock.industry !== 'N/A') {
      enriched.push({
        symbol: stock.symbol.toUpperCase(),
        companyName: stock.company_name,
        exchange: stock.exchange,
        sector: stock.sector,
        industry: stock.industry,
        type: stock.type,
        marketCap: null,
        country: 'US',
      });
      skipped++;
      continue;
    }

    // Fetch from FMP if missing
    try {
      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/profile/${stock.symbol}`,
        {
          params: { apikey: FMP_API_KEY },
          timeout: 10000,
        }
      );

      const data = response.data[0];
      if (data) {
        enriched.push({
          symbol: stock.symbol.toUpperCase(),
          companyName: data.companyName || stock.company_name,
          exchange: data.exchangeShortName || stock.exchange,
          sector: data.sector || 'Unknown',
          industry: data.industry || 'Unknown',
          type: stock.type,
          marketCap: data.mktCap,
          country: data.country || 'US',
        });
        apiCalls++;
      } else {
        // FMP returned empty, use CSV data
        enriched.push({
          symbol: stock.symbol.toUpperCase(),
          companyName: stock.company_name,
          exchange: stock.exchange,
          sector: stock.sector || 'Unknown',
          industry: stock.industry || 'Unknown',
          type: stock.type,
          marketCap: null,
          country: 'US',
        });
      }

      // Respect rate limit
      await sleep(RATE_LIMIT_MS);
    } catch (error) {
      console.error(`❌ Failed to fetch ${stock.symbol}:`, error.message);

      // Fallback to CSV data
      enriched.push({
        symbol: stock.symbol.toUpperCase(),
        companyName: stock.company_name,
        exchange: stock.exchange,
        sector: stock.sector || 'Unknown',
        industry: stock.industry || 'Unknown',
        type: stock.type,
        marketCap: null,
        country: 'US',
      });
    }
  }

  console.log(`✅ Enrichment complete: ${apiCalls} API calls, ${skipped} skipped (had data)`);
  return enriched;
}

/**
 * Map sectors to GICS 11 structure
 */
function mapToGICS(stocks) {
  console.log(`\n🗂️  Mapping to GICS 11 sectors...`);

  const mapped = stocks.map(stock => {
    const gicsSector = GICS_MAPPING[stock.sector] || 'Unknown';

    return {
      ...stock,
      gicsSector,
      originalSector: stock.sector,
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
        topByMarketCap: [],
      };
    }
    stats[sector].count++;
    stats[sector].stocks.push(stock.symbol);
  }

  // Sort stocks by market cap for each sector (top 5)
  for (const sector in stats) {
    const sectorStocks = data
      .filter(s => s.gicsSector === sector)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 5);

    stats[sector].topByMarketCap = sectorStocks.map(s => ({
      symbol: s.symbol,
      marketCap: s.marketCap,
    }));
  }

  return stats;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 AGENT 16: GICS Sector Data Collection\n');
  console.log('=' .repeat(60));

  // Validate FMP API key
  if (!FMP_API_KEY) {
    console.error('❌ Error: FMP_API_KEY environment variable not set');
    process.exit(1);
  }

  try {
    // Step 1: Load stock universe
    const stocks = loadStockUniverse();

    // Step 2: Enrich with FMP data (if needed)
    const enriched = await enrichSectorData(stocks);

    // Step 3: Map to GICS 11 sectors
    const gicsMapped = mapToGICS(enriched);

    // Step 4: Generate statistics
    const stats = generateSectorStats(gicsMapped);

    // Step 5: Save results
    console.log(`\n💾 Saving to: ${OUTPUT_PATH}`);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(gicsMapped, null, 2));

    // Step 6: Display statistics
    console.log('\n📈 GICS Sector Distribution:');
    console.log('=' .repeat(60));

    const sortedStats = Object.entries(stats)
      .sort((a, b) => b[1].count - a[1].count);

    for (const [sector, data] of sortedStats) {
      const percentage = ((data.count / gicsMapped.length) * 100).toFixed(1);
      console.log(`${sector.padEnd(30)} ${data.count.toString().padStart(4)} stocks (${percentage}%)`);
      console.log(`  Top 5: ${data.topByMarketCap.map(s => s.symbol).join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Total: ${gicsMapped.length} stocks mapped to GICS 11 sectors`);
    console.log(`📁 Output saved to: ${OUTPUT_PATH}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
