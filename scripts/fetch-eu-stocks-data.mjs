#!/usr/bin/env node

/**
 * Fetch top European stocks from major exchanges
 * Focuses on: Germany, France, UK, Netherlands, Switzerland, Nordic
 * EXCLUDES: Portuguese stocks (per user requirement)
 */

import 'dotenv/config';

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY not found in environment');
  process.exit(1);
}

// Target allocation by country
const TARGET_ALLOCATION = {
  Germany: 30,
  France: 25,
  UK: 20,
  Netherlands: 15,
  Switzerland: 15,
  Sweden: 10,
  Spain: 10,
  Italy: 10,
  Belgium: 5,
  Denmark: 5,
  Norway: 5
};

// Major European exchanges (EXCLUDING Lisbon)
const EU_EXCHANGES = [
  'XETRA',      // Germany (Frankfurt)
  'LSE',        // UK (London)
  'EPA',        // France (Euronext Paris)
  'AMS',        // Netherlands (Amsterdam)
  'SIX',        // Switzerland (Zurich)
  'STO',        // Sweden (Stockholm)
  'BME',        // Spain (Madrid)
  'MIL',        // Italy (Milan)
  'EBR',        // Belgium (Brussels)
  'CPH',        // Denmark (Copenhagen)
  'OSE'         // Norway (Oslo)
];

// Known top European stocks (manual curation for quality)
const PRIORITY_EU_STOCKS = {
  // Germany (30)
  Germany: [
    'SAP', 'SIE', 'ALV', 'BAS', 'VOW3', 'BAYN', 'MBG', 'DTE', 'BMW',
    'MUV2', 'ADS', 'DB1', 'EOAN', 'DAI', 'IFX', 'HEN3', 'RWE', 'FRE',
    'LHA', 'BOSS', 'PAH3', 'CON', 'DPW', 'HEI', 'BEI', 'FME', 'CBK',
    'MRK', 'VNA', 'DTG'
  ],

  // France (25)
  France: [
    'MC', 'OR', 'SAN', 'AIR', 'BNP', 'TTE', 'EL', 'CS', 'AI', 'SU',
    'CAP', 'DSY', 'RMS', 'BN', 'ORA', 'VIE', 'SGO', 'ENGI', 'DG',
    'GLE', 'ACA', 'KER', 'URW', 'VIV', 'STM'
  ],

  // UK (20)
  UK: [
    'HSBA', 'AZN', 'ULVR', 'DGE', 'SHEL', 'BP', 'GSK', 'RIO', 'LSEG',
    'NG', 'RELX', 'BARC', 'REL', 'VOD', 'LLOY', 'BATS', 'NWG', 'PRU',
    'BHP', 'IMB'
  ],

  // Netherlands (15)
  Netherlands: [
    'ASML', 'PHIA', 'HEIA', 'INGA', 'KPN', 'UNA', 'ABN', 'RAND',
    'AD', 'WKL', 'DSM', 'NN', 'AKZA', 'ASM', 'BESI'
  ],

  // Switzerland (15)
  Switzerland: [
    'NESN', 'ROG', 'NOVN', 'UHR', 'ZURN', 'ABB', 'SIKA', 'GIVN',
    'LONN', 'SREN', 'CSGN', 'CFR', 'UBSG', 'GEBN', 'ALC'
  ],

  // Sweden (10)
  Sweden: [
    'VOLV-B', 'ATCO-A', 'ERIC-B', 'HM-B', 'SAND', 'SEB-A', 'ABB',
    'INVE-B', 'SWED-A', 'ASSA-B'
  ],

  // Spain (10)
  Spain: [
    'ITX', 'IBE', 'CABK', 'SAN', 'TEF', 'REP', 'BBVA', 'FER',
    'ENG', 'ACS'
  ],

  // Italy (10)
  Italy: [
    'ENI', 'ISP', 'ENEL', 'UCG', 'STM', 'TIT', 'RACE', 'ATL',
    'G', 'FCA'
  ],

  // Belgium (5)
  Belgium: [
    'ABI', 'KBC', 'ACKB', 'UCB', 'GBLB'
  ],

  // Denmark (5)
  Denmark: [
    'NOVO-B', 'DSV', 'MAERSK-B', 'CARL-B', 'COLO-B'
  ],

  // Norway (5)
  Norway: [
    'EQNR', 'DNB', 'TEL', 'MOWI', 'ORK'
  ]
};

// FMP sector to GICS mapping
const SECTOR_MAPPING = {
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

async function fetchStockProfile(symbol) {
  try {
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const profiles = await response.json();
    return profiles[0] || null;
  } catch (error) {
    return null;
  }
}

async function enrichEUStocks() {
  console.log('🔍 Enriching European stocks with sector data...\n');

  const enriched = [];
  const bySector = {};
  const byCountry = {};

  let processed = 0;
  const totalStocks = Object.values(PRIORITY_EU_STOCKS).flat().length;

  for (const [country, symbols] of Object.entries(PRIORITY_EU_STOCKS)) {
    console.log(`\n🇪🇺 Processing ${country} (${symbols.length} stocks)...`);

    for (const symbol of symbols) {
      const profile = await fetchStockProfile(symbol);

      if (profile && profile.sector) {
        const gicsSector = SECTOR_MAPPING[profile.sector] || profile.sector;

        const stockInfo = {
          symbol: profile.symbol,
          name: profile.companyName,
          country,
          sector: gicsSector,
          industry: profile.industry,
          marketCap: profile.mktCap,
          exchange: profile.exchangeShortName
        };

        enriched.push(stockInfo);

        // Group by sector
        if (!bySector[gicsSector]) {
          bySector[gicsSector] = [];
        }
        bySector[gicsSector].push(stockInfo);

        // Group by country
        if (!byCountry[country]) {
          byCountry[country] = [];
        }
        byCountry[country].push(stockInfo);

        console.log(`  ✅ ${symbol.padEnd(12)} | ${profile.companyName.substring(0, 30).padEnd(30)} | ${gicsSector}`);
      } else {
        console.log(`  ⚠️  ${symbol.padEnd(12)} | Profile not found or invalid`);
      }

      processed++;

      // Rate limiting: 4 req/s
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`\n✅ Enriched ${enriched.length}/${totalStocks} stocks\n`);

  return { enriched, bySector, byCountry };
}

function generateTypeScriptFile(enriched, bySector, byCountry) {
  console.log('📝 Generating TypeScript files...\n');

  // Sort stocks by market cap within each sector
  for (const sector in bySector) {
    bySector[sector].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  }

  // Generate main EU file
  let tsContent = `/**
 * European Priority Stocks
 *
 * Curated list of top European stocks from major exchanges.
 * Organized by GICS sector and country.
 *
 * EXCLUDES: Portuguese stocks (per user requirement)
 *
 * Generated: ${new Date().toISOString()}
 * Source: Manual curation + FMP profiles
 * Total: ${enriched.length} stocks
 */

export const EU_TOP_STOCKS: Record<string, string[]> = {\n`;

  const sectorStats = {};

  for (const sector of Object.keys(bySector).sort()) {
    const stocks = bySector[sector];
    const symbols = stocks.map(s => s.symbol);

    sectorStats[sector] = symbols.length;

    tsContent += `  '${sector}': [\n`;

    // Split into lines of 8 symbols for readability
    for (let i = 0; i < symbols.length; i += 8) {
      const chunk = symbols.slice(i, i + 8);
      tsContent += `    ${chunk.map(s => `'${s}'`).join(', ')},\n`;
    }

    tsContent += `  ],\n\n`;
  }

  tsContent += `};\n\n`;

  // Add by-country grouping
  tsContent += `/**
 * European stocks grouped by country
 */
export const EU_STOCKS_BY_COUNTRY: Record<string, string[]> = {\n`;

  for (const country of Object.keys(byCountry).sort()) {
    const stocks = byCountry[country];
    const symbols = stocks.map(s => s.symbol);

    tsContent += `  '${country}': [\n`;

    for (let i = 0; i < symbols.length; i += 8) {
      const chunk = symbols.slice(i, i + 8);
      tsContent += `    ${chunk.map(s => `'${s}'`).join(', ')},\n`;
    }

    tsContent += `  ],\n\n`;
  }

  tsContent += `};\n\n`;

  tsContent += `/**
 * Flattened array of all EU priority stocks (${enriched.length} total)
 */
export const ALL_EU_STOCKS = Object.values(EU_TOP_STOCKS).flat();\n\n`;

  tsContent += `/**
 * Sector and country statistics
 */
export const EU_STOCKS_STATS = {
  sectorBreakdown: ${JSON.stringify(sectorStats, null, 2)},
  countryBreakdown: ${JSON.stringify(
    Object.fromEntries(
      Object.entries(byCountry).map(([country, stocks]) => [country, stocks.length])
    ),
    null,
    2
  )}
};\n`;

  return { tsContent, sectorStats };
}

async function main() {
  console.log('🚀 Agent 17: European Priority Stock Curation\n');
  console.log('═'.repeat(60));

  // Step 1: Enrich with FMP data
  const { enriched, bySector, byCountry } = await enrichEUStocks();

  // Step 2: Generate TypeScript file
  const { tsContent, sectorStats } = generateTypeScriptFile(enriched, bySector, byCountry);

  // Step 3: Write file
  const outputPath = '/Users/antoniofrancisco/Documents/teste 1/server/data/priority-stocks/eu-top150.ts';
  const fs = await import('fs');
  fs.writeFileSync(outputPath, tsContent, 'utf-8');

  console.log(`✅ Generated: ${outputPath}\n`);
  console.log('📊 European Stocks Statistics:\n');
  console.log(`   Total stocks: ${enriched.length}`);
  console.log(`   Countries: ${Object.keys(byCountry).length}`);
  console.log(`   Sectors: ${Object.keys(sectorStats).length}\n`);

  console.log('   Sector Breakdown:');
  const total = enriched.length;
  for (const [sector, count] of Object.entries(sectorStats).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`   • ${sector}: ${count} stocks (${pct}%)`);
  }

  console.log('\n   Country Breakdown:');
  for (const [country, stocks] of Object.entries(byCountry).sort((a, b) => b.length - a.length)) {
    const pct = ((stocks.length / total) * 100).toFixed(1);
    console.log(`   • ${country}: ${stocks.length} stocks (${pct}%)`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ European stock curation complete!\n');
}

main().catch(console.error);
