#!/usr/bin/env tsx
/**
 * FASE 0 - Agent 3: Stock Universe Sector Analysis
 *
 * Analyzes the 1,493-stock universe to understand:
 * - Sector distribution
 * - Special categories (REITs, Banks, Growth stocks)
 * - Data quality metrics
 * - Geographic distribution
 * - Coverage gaps
 */

import fs from 'fs';
import path from 'path';

interface Stock {
  symbol: string;
  company_name: string;
  exchange: string;
  sector: string;
  industry: string;
  type: string;
  can_calculate_iv: string;
}

interface SectorStats {
  sector: string;
  count: number;
  percentage: number;
  sampleSymbols: string[];
}

interface AnalysisReport {
  overallStats: {
    totalStocks: number;
    usStocks: number;
    europeanStocks: number;
    portugueseStocks: number;
    reits: number;
    etfs: number;
  };
  sectorDistribution: SectorStats[];
  exchangeDistribution: { exchange: string; count: number; percentage: number }[];
  specialCategories: {
    reits: { count: number; symbols: string[] };
    banks: { count: number; symbols: string[] };
    utilities: { count: number; symbols: string[] };
    technolo gy: { count: number; symbols: string[] };
  };
  dataQuality: {
    withSector: number;
    withoutSector: number;
    withCompanyName: number;
    withoutCompanyName: number;
    isEtf: number;
    exchangeNA: number;
  };
  portugueseStocks: Stock[];
  topREITs: Stock[];
  topBanks: Stock[];
}

// Read CSV file
const csvPath = path.join(process.cwd(), 'stock_universe_complete.csv');
const csvData = fs.readFileSync(csvPath, 'utf-8');
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');

// Parse stocks
const stocks: Stock[] = lines.slice(1).map(line => {
  const values = line.split(',');
  return {
    symbol: values[0],
    company_name: values[1],
    exchange: values[2],
    sector: values[3],
    industry: values[4],
    type: values[5],
    can_calculate_iv: values[6]
  };
});

console.log('📊 FASE 0 - Stock Universe Sector Analysis\n');
console.log('='.repeat(80));
console.log(`Total Stocks Loaded: ${stocks.length}`);
console.log('='.repeat(80));

// 1. OVERALL STATISTICS
console.log('\n## 1. OVERALL STATISTICS\n');

const usStocks = stocks.filter(s =>
  ['NYSE', 'NASDAQ', 'AMEX', 'NYSEARCA', 'N/A'].includes(s.exchange) &&
  !s.symbol.includes('.') // Exclude European tickers with dots
);

const europeanStocks = stocks.filter(s =>
  ['EURONEXT', 'LSE', 'XETRA', 'BME', 'EURONEXT Lisbon'].includes(s.exchange) ||
  s.symbol.includes('.L') || s.symbol.includes('.LS') ||
  s.symbol.includes('.DE') || s.symbol.includes('.AS')
);

const portugueseStocks = stocks.filter(s =>
  s.symbol.includes('.LS') || s.type === 'PT_STOCK'
);

const reits = stocks.filter(s => s.type === 'REIT');
const etfs = stocks.filter(s => s.type === 'ETF');

console.log(`Total Stocks:        ${stocks.length}`);
console.log(`US Stocks:           ${usStocks.length} (${((usStocks.length / stocks.length) * 100).toFixed(1)}%)`);
console.log(`European Stocks:     ${europeanStocks.length} (${((europeanStocks.length / stocks.length) * 100).toFixed(1)}%)`);
console.log(`Portuguese Stocks:   ${portugueseStocks.length} (${((portugueseStocks.length / stocks.length) * 100).toFixed(1)}%)`);
console.log(`REITs:               ${reits.length} (${((reits.length / stocks.length) * 100).toFixed(1)}%)`);
console.log(`ETFs:                ${etfs.length} (${((etfs.length / stocks.length) * 100).toFixed(1)}%)`);

// 2. SECTOR DISTRIBUTION
console.log('\n## 2. SECTOR DISTRIBUTION\n');

const sectorMap = new Map<string, Stock[]>();
stocks.forEach(stock => {
  const sector = stock.sector || 'N/A';
  if (!sectorMap.has(sector)) {
    sectorMap.set(sector, []);
  }
  sectorMap.get(sector)!.push(stock);
});

const sectorStats: SectorStats[] = Array.from(sectorMap.entries())
  .map(([sector, stocks]) => ({
    sector,
    count: stocks.length,
    percentage: (stocks.length / stocks.length) * 100,
    sampleSymbols: stocks.slice(0, 3).map(s => s.symbol)
  }))
  .sort((a, b) => b.count - a.count);

console.log('Sector                          | Count | %     | Sample Symbols');
console.log('-'.repeat(75));
sectorStats.forEach(stat => {
  console.log(
    `${stat.sector.padEnd(30)} | ${String(stat.count).padStart(5)} | ${((stat.count / stocks.length) * 100).toFixed(1).padStart(5)}% | ${stat.sampleSymbols.join(', ')}`
  );
});

// 3. EXCHANGE DISTRIBUTION
console.log('\n## 3. EXCHANGE DISTRIBUTION\n');

const exchangeMap = new Map<string, number>();
stocks.forEach(stock => {
  const exchange = stock.exchange || 'N/A';
  exchangeMap.set(exchange, (exchangeMap.get(exchange) || 0) + 1);
});

const exchangeStats = Array.from(exchangeMap.entries())
  .map(([exchange, count]) => ({
    exchange,
    count,
    percentage: (count / stocks.length) * 100
  }))
  .sort((a, b) => b.count - a.count);

console.log('Exchange              | Count | %');
console.log('-'.repeat(50));
exchangeStats.forEach(stat => {
  console.log(
    `${stat.exchange.padEnd(20)} | ${String(stat.count).padStart(5)} | ${stat.percentage.toFixed(1).padStart(5)}%`
  );
});

// 4. SPECIAL CATEGORIES
console.log('\n## 4. SPECIAL CATEGORIES\n');

// REITs (already counted)
console.log(`\n### A. REITs (Real Estate Investment Trusts): ${reits.length}`);
console.log('Top 10 REITs:');
reits.slice(0, 10).forEach(reit => {
  console.log(`  - ${reit.symbol.padEnd(10)} ${reit.company_name}`);
});

// Banks (Financial Services + "Bank" in name OR major bank symbols)
const bankSymbols = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'TFC', 'BLK'];
const banks = stocks.filter(s =>
  (s.sector === 'Financial Services' && s.company_name.toLowerCase().includes('bank')) ||
  bankSymbols.includes(s.symbol) ||
  s.company_name.toLowerCase().includes(' bank ') ||
  s.company_name.toLowerCase().endsWith(' bank') ||
  s.company_name.toLowerCase().startsWith('banco ')
);

console.log(`\n### B. Banks (Financial Services with "Bank"): ${banks.length}`);
console.log('Top 10 Banks:');
banks.slice(0, 10).forEach(bank => {
  console.log(`  - ${bank.symbol.padEnd(10)} ${bank.company_name}`);
});

// Technology stocks
const techStocks = stocks.filter(s => s.sector === 'Technology');
console.log(`\n### C. Technology Stocks: ${techStocks.length}`);
console.log('Top 10 Tech:');
techStocks.slice(0, 10).forEach(tech => {
  console.log(`  - ${tech.symbol.padEnd(10)} ${tech.company_name}`);
});

// Utilities (often dividend stocks)
const utilities = stocks.filter(s => s.sector === 'Utilities');
console.log(`\n### D. Utilities (Dividend-Heavy): ${utilities.length}`);
console.log('Top 10 Utilities:');
utilities.slice(0, 10).forEach(util => {
  console.log(`  - ${util.symbol.padEnd(10)} ${util.company_name}`);
});

// 5. DATA QUALITY METRICS
console.log('\n## 5. DATA QUALITY METRICS\n');

const withSector = stocks.filter(s => s.sector && s.sector !== 'N/A').length;
const withoutSector = stocks.length - withSector;
const withCompanyName = stocks.filter(s => s.company_name && s.company_name.trim() !== '').length;
const withoutCompanyName = stocks.length - withCompanyName;
const exchangeNA = stocks.filter(s => s.exchange === 'N/A').length;

console.log(`Stocks with Sector Data:        ${withSector} (${((withSector / stocks.length) * 100).toFixed(1)}%)`);
console.log(`Stocks WITHOUT Sector Data:     ${withoutSector} (${((withoutSector / stocks.length) * 100).toFixed(1)}%)`);
console.log(`Stocks with Company Name:       ${withCompanyName} (${((withCompanyName / stocks.length) * 100).toFixed(1)}%)`);
console.log(`Stocks WITHOUT Company Name:    ${withoutCompanyName} (${((withoutCompanyName / stocks.length) * 100).toFixed(1)}%)`);
console.log(`Stocks with Exchange = N/A:     ${exchangeNA} (${((exchangeNA / stocks.length) * 100).toFixed(1)}%)`);
console.log(`ETFs Detected:                  ${etfs.length} (${((etfs.length / stocks.length) * 100).toFixed(1)}%)`);

// 6. PORTUGUESE STOCKS (CRITICAL for Alfalyzer)
console.log('\n## 6. PORTUGUESE STOCKS (Core Market Focus)\n');

console.log(`Total: ${portugueseStocks.length} stocks\n`);
console.log('Symbol       | Company Name                              | Sector');
console.log('-'.repeat(85));
portugueseStocks.forEach(pt => {
  console.log(
    `${pt.symbol.padEnd(12)} | ${(pt.company_name || 'N/A').padEnd(40)} | ${pt.sector || 'N/A'}`
  );
});

// 7. TESTING RECOMMENDATIONS
console.log('\n## 7. TESTING RECOMMENDATIONS BY SECTOR\n');

const testingRecommendations = [
  {
    sector: 'Technology',
    count: techStocks.length,
    testSamples: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'],
    priority: 'HIGH'
  },
  {
    sector: 'Financial Services',
    count: sectorMap.get('Financial Services')?.length || 0,
    testSamples: ['JPM', 'BAC', 'GS', 'MS', 'C'],
    priority: 'HIGH'
  },
  {
    sector: 'Healthcare',
    count: sectorMap.get('Healthcare')?.length || 0,
    testSamples: ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK'],
    priority: 'MEDIUM'
  },
  {
    sector: 'Consumer Cyclical',
    count: sectorMap.get('Consumer Cyclical')?.length || 0,
    testSamples: ['AMZN', 'TSLA', 'HD', 'NKE', 'SBUX'],
    priority: 'MEDIUM'
  },
  {
    sector: 'Real Estate (REITs)',
    count: reits.length,
    testSamples: ['AMT', 'EQIX', 'DLR', 'CCI', 'ARE'],
    priority: 'HIGH'
  },
  {
    sector: 'Portuguese Stocks',
    count: portugueseStocks.length,
    testSamples: portugueseStocks.slice(0, 5).map(s => s.symbol),
    priority: 'CRITICAL'
  }
];

console.log('Sector                  | Count | Priority | Test Samples');
console.log('-'.repeat(85));
testingRecommendations.forEach(rec => {
  console.log(
    `${rec.sector.padEnd(22)} | ${String(rec.count).padStart(5)} | ${rec.priority.padEnd(8)} | ${rec.testSamples.join(', ')}`
  );
});

// 8. SAVE CSV REPORT
console.log('\n## 8. GENERATING CSV REPORTS\n');

const sectorCSV = [
  'Sector,Stock Count,Percentage,Sample Symbols',
  ...sectorStats.map(s =>
    `"${s.sector}",${s.count},${((s.count / stocks.length) * 100).toFixed(1)}%,"${s.sampleSymbols.join(', ')}"`
  )
].join('\n');

const outputDir = path.join(process.cwd(), 'validation-results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sectorCSVPath = path.join(outputDir, 'FASE_0_SECTOR_DISTRIBUTION.csv');
fs.writeFileSync(sectorCSVPath, sectorCSV);
console.log(`✅ Saved: ${sectorCSVPath}`);

// Save special categories CSV
const specialCategoriesCSV = [
  'Category,Count,Sample Symbols',
  `REITs,${reits.length},"${reits.slice(0, 5).map(s => s.symbol).join(', ')}"`,
  `Banks,${banks.length},"${banks.slice(0, 5).map(s => s.symbol).join(', ')}"`,
  `Technology,${techStocks.length},"${techStocks.slice(0, 5).map(s => s.symbol).join(', ')}"`,
  `Utilities,${utilities.length},"${utilities.slice(0, 5).map(s => s.symbol).join(', ')}"`,
  `Portuguese,${portugueseStocks.length},"${portugueseStocks.slice(0, 5).map(s => s.symbol).join(', ')}"`,
  `ETFs,${etfs.length},"${etfs.map(s => s.symbol).join(', ')}"`
].join('\n');

const specialCSVPath = path.join(outputDir, 'FASE_0_SPECIAL_CATEGORIES.csv');
fs.writeFileSync(specialCSVPath, specialCategoriesCSV);
console.log(`✅ Saved: ${specialCSVPath}`);

// 9. KEY FINDINGS SUMMARY
console.log('\n' + '='.repeat(80));
console.log('## 9. KEY FINDINGS SUMMARY');
console.log('='.repeat(80));

console.log(`
✅ Total Universe: ${stocks.length} stocks
✅ US Coverage: ${usStocks.length} stocks (${((usStocks.length / stocks.length) * 100).toFixed(1)}%)
✅ European Coverage: ${europeanStocks.length} stocks (${((europeanStocks.length / stocks.length) * 100).toFixed(1)}%)

🎯 Special Categories:
   - Portuguese Stocks: ${portugueseStocks.length} (CRITICAL for Alfalyzer)
   - REITs: ${reits.length} (need FFO-based methods)
   - Banks: ${banks.length} (need book value focus)
   - Technology: ${techStocks.length} (high growth, analyst coverage)

⚠️ Data Quality Issues:
   - ${withoutSector} stocks missing sector (${((withoutSector / stocks.length) * 100).toFixed(1)}%)
   - ${exchangeNA} stocks with Exchange=N/A (${((exchangeNA / stocks.length) * 100).toFixed(1)}%)
   - ${withoutCompanyName} stocks missing company name (${((withoutCompanyName / stocks.length) * 100).toFixed(1)}%)

📊 Top Sectors:
   1. Technology: ${sectorStats[0].count} stocks (${((sectorStats[0].count / stocks.length) * 100).toFixed(1)}%)
   2. ${sectorStats[1].sector}: ${sectorStats[1].count} stocks (${((sectorStats[1].count / stocks.length) * 100).toFixed(1)}%)
   3. ${sectorStats[2].sector}: ${sectorStats[2].count} stocks (${((sectorStats[2].count / stocks.length) * 100).toFixed(1)}%)

📍 Next Steps:
   1. Test all ${portugueseStocks.length} Portuguese stocks (PRIORITY 1)
   2. Test ${reits.length} REITs with FFO methods (PRIORITY 2)
   3. Enrich ${withoutSector} stocks with sector data (PRIORITY 3)
   4. Fix ${exchangeNA} stocks with Exchange=N/A (PRIORITY 4)
`);

console.log('='.repeat(80));
console.log('✅ Analysis Complete');
console.log('='.repeat(80));
