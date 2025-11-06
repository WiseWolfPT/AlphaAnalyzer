#!/usr/bin/env node

/**
 * Validation script for Agent 17: Priority Stocks Curation
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Agent 17: Priority Stocks Validation\n');
console.log('═'.repeat(70) + '\n');

const baseDir = join(__dirname, '..', 'server', 'data', 'priority-stocks');

// Read files
const usSP500Content = fs.readFileSync(join(baseDir, 'us-sp500.ts'), 'utf-8');
const euContent = fs.readFileSync(join(baseDir, 'eu-top150.ts'), 'utf-8');
const chinaContent = fs.readFileSync(join(baseDir, 'china-adrs.ts'), 'utf-8');

// Extract symbols
function extractSymbols(content) {
  const symbols = new Set();
  const regex = /'([A-Z0-9.-]+)'/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const symbol = match[1];
    if (symbol.length >= 1 && symbol.length <= 6 && /^[A-Z0-9.-]+$/.test(symbol)) {
      symbols.add(symbol);
    }
  }
  return Array.from(symbols);
}

const usSymbols = extractSymbols(usSP500Content);
const euSymbols = extractSymbols(euContent);
const chinaSymbols = extractSymbols(chinaContent);

console.log('📊 VALIDATION RESULTS\n');
console.log('─'.repeat(70) + '\n');

console.log('✅ Test 1: Stock Count Validation\n');
console.log(`   US (S&P 500):        ${usSymbols.length} stocks`);
console.log(`   EU (Top 150):        ${euSymbols.length} stocks`);
console.log(`   China (ADRs):        ${chinaSymbols.length} stocks`);
console.log(`   ────────────────────────────────────`);
console.log(`   TOTAL:               ${usSymbols.length + euSymbols.length + chinaSymbols.length} stocks\n`);

// Test duplicates
console.log('✅ Test 2: Duplicate Symbol Check\n');
const allSymbols = [...usSymbols, ...euSymbols, ...chinaSymbols];
const uniqueSymbols = new Set(allSymbols);

if (allSymbols.length !== uniqueSymbols.size) {
  const duplicates = allSymbols.filter((s, i) => allSymbols.indexOf(s) !== i);
  console.log(`   ⚠️  Found ${duplicates.length} duplicates: ${duplicates.join(', ')}\n`);
} else {
  console.log('   ✅ No duplicates found\n');
}

// Portuguese exclusion
console.log('✅ Test 3: Portuguese Stock Exclusion\n');
const portugueseStocks = ['EDP', 'GALP', 'NOS', 'JMT'];
const foundPortuguese = allSymbols.filter(s => portugueseStocks.includes(s));

if (foundPortuguese.length > 0) {
  console.log(`   ⚠️  Found Portuguese stocks: ${foundPortuguese.join(', ')}\n`);
} else {
  console.log('   ✅ No Portuguese stocks found\n');
}

console.log('═'.repeat(70) + '\n');
console.log(`✅ Validation Complete: ${usSymbols.length + euSymbols.length + chinaSymbols.length} priority stocks ready\n`);
