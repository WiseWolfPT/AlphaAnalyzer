#!/usr/bin/env node

/**
 * Fetch S&P 500 company data from FMP API
 * Maps to GICS sectors for priority stock curation
 */

import 'dotenv/config';

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY not found in environment');
  process.exit(1);
}

// GICS Sector mapping from Agent 16
const GICS_SECTORS = {
  10: 'Energy',
  15: 'Materials',
  20: 'Industrials',
  25: 'Consumer Discretionary',
  30: 'Consumer Staples',
  35: 'Health Care',
  40: 'Financials',
  45: 'Information Technology',
  50: 'Communication Services',
  55: 'Utilities',
  60: 'Real Estate'
};

async function fetchSP500Constituents() {
  console.log('🔍 Fetching S&P 500 constituents from FMP...\n');

  try {
    const url = `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${FMP_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.length} S&P 500 companies\n`);

    return data;
  } catch (error) {
    console.error('❌ Error fetching S&P 500 data:', error.message);
    process.exit(1);
  }
}

async function enrichWithSectorData(constituents) {
  console.log('🔍 Enriching with sector data from company profiles...\n');

  const enriched = [];
  const batchSize = 100; // FMP allows batch profile requests

  for (let i = 0; i < constituents.length; i += batchSize) {
    const batch = constituents.slice(i, i + batchSize);
    const symbols = batch.map(c => c.symbol).join(',');

    try {
      const url = `https://financialmodelingprep.com/api/v3/profile/${symbols}?apikey=${FMP_API_KEY}`;
      const response = await fetch(url);
      const profiles = await response.json();

      // Merge profile data with constituent data
      for (const profile of profiles) {
        const constituent = batch.find(c => c.symbol === profile.symbol);
        if (constituent && profile.sector) {
          enriched.push({
            symbol: profile.symbol,
            name: profile.companyName,
            sector: profile.sector,
            industry: profile.industry,
            marketCap: profile.mktCap,
            exchange: profile.exchangeShortName
          });
        }
      }

      console.log(`  Processed ${Math.min(i + batchSize, constituents.length)}/${constituents.length} stocks...`);

      // Rate limiting: 4 req/s max
      if (i + batchSize < constituents.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`⚠️  Error processing batch ${i}-${i + batchSize}:`, error.message);
    }
  }

  console.log(`\n✅ Enriched ${enriched.length} stocks with sector data\n`);
  return enriched;
}

function mapToGICSSectors(stocks) {
  // FMP uses different sector names, map to GICS
  const sectorMapping = {
    'Technology': 'Information Technology',
    'Healthcare': 'Health Care',
    'Financial Services': 'Financials',
    'Consumer Cyclical': 'Consumer Discretionary',
    'Consumer Defensive': 'Consumer Staples',
    'Communication Services': 'Communication Services',
    'Energy': 'Energy',
    'Industrials': 'Industrials',
    'Basic Materials': 'Materials',
    'Real Estate': 'Real Estate',
    'Utilities': 'Utilities'
  };

  const bySector = {};

  for (const stock of stocks) {
    const gicsSector = sectorMapping[stock.sector] || stock.sector;

    if (!bySector[gicsSector]) {
      bySector[gicsSector] = [];
    }

    bySector[gicsSector].push({
      symbol: stock.symbol,
      name: stock.name,
      industry: stock.industry,
      marketCap: stock.marketCap
    });
  }

  // Sort by market cap within each sector
  for (const sector in bySector) {
    bySector[sector].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  }

  return bySector;
}

function generateTypeScriptFile(bySector) {
  console.log('📝 Generating TypeScript file...\n');

  let tsContent = `/**
 * S&P 500 Priority Stocks
 *
 * Curated list of all 500 S&P 500 companies organized by GICS sector.
 * This list receives highest priority in the intelligent warming system.
 *
 * Generated: ${new Date().toISOString()}
 * Source: FMP S&P 500 constituent API
 */

export const US_SP500_STOCKS: Record<string, string[]> = {\n`;

  let totalCount = 0;
  const sectorStats = {};

  for (const sector of Object.keys(bySector).sort()) {
    const stocks = bySector[sector];
    const symbols = stocks.map(s => s.symbol);

    sectorStats[sector] = symbols.length;
    totalCount += symbols.length;

    tsContent += `  '${sector}': [\n`;

    // Split into lines of 10 symbols for readability
    for (let i = 0; i < symbols.length; i += 10) {
      const chunk = symbols.slice(i, i + 10);
      tsContent += `    ${chunk.map(s => `'${s}'`).join(', ')},\n`;
    }

    tsContent += `  ],\n\n`;
  }

  tsContent += `};\n\n`;
  tsContent += `/**
 * Flattened array of all S&P 500 stocks (${totalCount} total)
 */
export const ALL_US_SP500 = Object.values(US_SP500_STOCKS).flat();\n\n`;

  tsContent += `/**
 * Sector statistics
 */
export const US_SP500_SECTOR_STATS = ${JSON.stringify(sectorStats, null, 2)};\n`;

  return { tsContent, totalCount, sectorStats };
}

async function main() {
  console.log('🚀 Agent 17: S&P 500 Priority Stock Curation\n');
  console.log('═'.repeat(60) + '\n');

  // Step 1: Fetch S&P 500 constituents
  const constituents = await fetchSP500Constituents();

  // Step 2: Enrich with sector data
  const enrichedStocks = await enrichWithSectorData(constituents);

  // Step 3: Map to GICS sectors
  const bySector = mapToGICSSectors(enrichedStocks);

  // Step 4: Generate TypeScript file
  const { tsContent, totalCount, sectorStats } = generateTypeScriptFile(bySector);

  // Step 5: Write file
  const outputPath = '/Users/antoniofrancisco/Documents/teste 1/server/data/priority-stocks/us-sp500.ts';
  const fs = await import('fs');
  fs.writeFileSync(outputPath, tsContent, 'utf-8');

  console.log(`✅ Generated: ${outputPath}\n`);
  console.log('📊 S&P 500 Statistics:\n');
  console.log(`   Total stocks: ${totalCount}`);
  console.log(`   Sectors: ${Object.keys(sectorStats).length}\n`);

  console.log('   Sector Breakdown:');
  for (const [sector, count] of Object.entries(sectorStats).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / totalCount) * 100).toFixed(1);
    console.log(`   • ${sector}: ${count} stocks (${pct}%)`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ S&P 500 curation complete!\n');
}

main().catch(console.error);
