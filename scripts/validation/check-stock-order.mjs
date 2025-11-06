import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvContent = fs.readFileSync('stock_universe_complete.csv', 'utf-8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

const usStocks = records.filter((stock) => {
  const symbol = stock.symbol || '';
  const isEuronext = stock.exchange?.toUpperCase().includes('EURONEXT');
  const isLSE = stock.exchange?.toUpperCase().includes('LSE');
  const isXetra = stock.exchange?.toUpperCase().includes('XETRA');
  const isBME = stock.exchange?.toUpperCase().includes('BME');
  const hasEuropeanSuffix = symbol.includes('.L') || symbol.includes('.LS') ||
                             symbol.includes('.DE') || symbol.includes('.F') ||
                             symbol.includes('.MC') || symbol.includes('.PA') ||
                             symbol.includes('.AS') || symbol.includes('.MI');
  const isUsTickerFormat = /^[A-Z]{1,5}(-[A-Z])?$/.test(symbol);
  return !isEuronext && !isLSE && !isXetra && !isBME && !hasEuropeanSuffix && isUsTickerFormat;
});

console.log('Total US stocks:', usStocks.length);
console.log('\nFirst 30 stocks:');
console.log(usStocks.slice(0, 30).map((s, i) => `${i+1}. ${s.symbol}`).join('\n'));
console.log('\nStock 100:', usStocks[99]?.symbol);
console.log('Stock 200:', usStocks[199]?.symbol);
console.log('Stock 300:', usStocks[299]?.symbol);

// Check if major stocks are in the list
const majorStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
console.log('\nMajor stock positions:');
majorStocks.forEach(symbol => {
  const index = usStocks.findIndex(s => s.symbol === symbol);
  console.log(`${symbol}: position ${index + 1}`);
});

// Tier 2 selection (sector-based)
const stocksPerSector = 20;
const sectorMap = new Map();

usStocks.forEach(stock => {
  const sector = stock.sector || 'Unknown';
  if (!sectorMap.has(sector)) {
    sectorMap.set(sector, []);
  }
  sectorMap.get(sector).push(stock);
});

const tier2Selected = [];
sectorMap.forEach((stocks, sector) => {
  tier2Selected.push(...stocks.slice(0, stocksPerSector));
});

const tier2Final = tier2Selected.slice(0, 200);

console.log('\nTier 2 selection (first 20):');
console.log(tier2Final.slice(0, 20).map((s, i) => `${i+1}. ${s.symbol} (${s.sector})`).join('\n'));

console.log('\nChecking if major stocks are in Tier 2:');
majorStocks.forEach(symbol => {
  const inTier2 = tier2Final.find(s => s.symbol === symbol);
  console.log(`${symbol}: ${inTier2 ? 'YES' : 'NO'}`);
});
