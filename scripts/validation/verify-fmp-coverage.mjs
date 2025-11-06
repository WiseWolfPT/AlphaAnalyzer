#!/usr/bin/env node

/**
 * FMP API Coverage Verification Script
 * Tests all 1,493 stocks in Alfalyzer universe against FMP API
 *
 * Rate Limit: 3.5 req/s (285ms delay)
 * Runtime: ~10-12 minutes for full universe
 */

import { createRequire } from 'module';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const FMP_API_KEY = process.env.FMP_API_KEY;
const RATE_LIMIT_DELAY = 285; // ms between requests (3.5 req/s)
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

if (!FMP_API_KEY) {
  console.error('❌ ERROR: FMP_API_KEY environment variable not set');
  process.exit(1);
}

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry logic
async function fetchWithRetry(url, retries = 0) {
  try {
    const response = await fetch(url);

    if (response.status === 429 && retries < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retries];
      console.log(`⚠️  Rate limit hit, retrying in ${delay}ms... (attempt ${retries + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return fetchWithRetry(url, retries + 1);
    }

    return response;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retries];
      console.log(`⚠️  Network error, retrying in ${delay}ms... (attempt ${retries + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return fetchWithRetry(url, retries + 1);
    }
    throw error;
  }
}

// Test stock against FMP API
async function testStock(ticker) {
  const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`;
  const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${FMP_API_KEY}`;

  try {
    // Test profile endpoint
    const profileResponse = await fetchWithRetry(profileUrl);
    let profileOk = profileResponse.ok && profileResponse.status === 200;
    let profileData = null;
    if (profileOk) {
      profileData = await profileResponse.json();
      profileOk = Array.isArray(profileData) && profileData.length > 0;
    }

    await sleep(RATE_LIMIT_DELAY);

    // Test quote endpoint
    const quoteResponse = await fetchWithRetry(quoteUrl);
    let quoteOk = quoteResponse.ok && quoteResponse.status === 200;
    let quoteData = null;
    if (quoteOk) {
      quoteData = await quoteResponse.json();
      quoteOk = Array.isArray(quoteData) && quoteData.length > 0;
    }

    // Categorize result
    if (profileOk && quoteOk) {
      return { status: 'EXISTS', ticker, profileOk, quoteOk };
    } else if (quoteOk && !profileOk) {
      return { status: 'PARTIAL', ticker, profileOk, quoteOk };
    } else {
      return { status: 'MISSING', ticker, profileOk, quoteOk };
    }
  } catch (error) {
    console.error(`❌ Error testing ${ticker}:`, error.message);
    return { status: 'ERROR', ticker, error: error.message };
  }
}

// Load stock universe
async function loadUniverse() {
  console.log('📊 Loading stock universe...\n');

  // Try PostgreSQL first
  try {
    const pg = await import('pg');
    const { Client } = pg.default;

    const client = new Client({
      host: process.env.PGHOST || '127.0.0.1',
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || 'alfalyzer_db',
    });

    await client.connect();
    const result = await client.query('SELECT symbol FROM stocks ORDER BY symbol');
    await client.end();

    const symbols = result.rows.map(row => row.symbol);
    console.log(`✅ Loaded ${symbols.length} stocks from PostgreSQL\n`);
    return symbols;
  } catch (error) {
    console.log(`⚠️  PostgreSQL failed: ${error.message}`);
  }

  // Try CSV fallback
  const csvPath = join(process.cwd(), 'stock_universe_complete.csv');
  if (existsSync(csvPath)) {
    try {
      const csv = readFileSync(csvPath, 'utf-8');
      const lines = csv.split('\n').filter(line => line.trim());
      const symbols = lines.slice(1).map(line => line.split(',')[0].trim()).filter(Boolean);
      console.log(`✅ Loaded ${symbols.length} stocks from CSV\n`);
      return symbols;
    } catch (error) {
      console.log(`⚠️  CSV failed: ${error.message}`);
    }
  }

  // Hardcoded fallback - top 100 most common stocks
  console.log('⚠️  Using fallback stock list (top 100)\n');
  return [
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'UNH',
    'JNJ', 'JPM', 'V', 'PG', 'XOM', 'HD', 'CVX', 'MA', 'ABBV', 'PFE',
    'AVGO', 'COST', 'MRK', 'KO', 'ADBE', 'PEP', 'TMO', 'WMT', 'CSCO', 'ACN',
    'LLY', 'MCD', 'ABT', 'DHR', 'VZ', 'NKE', 'TXN', 'CMCSA', 'ORCL', 'NEE',
    'UPS', 'BMY', 'PM', 'COP', 'RTX', 'WFC', 'QCOM', 'MS', 'HON', 'UNP',
    'AMGN', 'LOW', 'BA', 'SBUX', 'INTC', 'ELV', 'CAT', 'SPGI', 'GE', 'DE',
    'AMD', 'BLK', 'INTU', 'AMAT', 'ADI', 'ADP', 'GILD', 'MDLZ', 'LMT', 'ISRG',
    'CI', 'BKNG', 'SYK', 'TJX', 'PLD', 'VRTX', 'MMC', 'CB', 'C', 'ZTS',
    'REGN', 'SO', 'DUK', 'EOG', 'MO', 'BSX', 'NOW', 'SCHW', 'CL', 'PNC',
    'BDX', 'CME', 'ITW', 'USB', 'SLB', 'APD', 'MMM', 'NSC', 'ETN', 'HUM'
  ];
}

// Main execution
async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   FMP API COVERAGE VERIFICATION                       ║');
  console.log('║   Alfalyzer Universe Test                             ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const universe = await loadUniverse();
  const totalStocks = universe.length;

  console.log(`🎯 Target: ${totalStocks} stocks`);
  console.log(`⏱️  Rate Limit: 3.5 req/s (285ms delay)`);
  console.log(`⏱️  Estimated Runtime: ~${Math.ceil(totalStocks * 2 * RATE_LIMIT_DELAY / 1000 / 60)} minutes\n`);
  console.log('━'.repeat(60) + '\n');

  const results = {
    tested: 0,
    exists: [],
    partial: [],
    missing: [],
    errors: [],
  };

  // Test each stock
  for (let i = 0; i < universe.length; i++) {
    const ticker = universe[i];
    const result = await testStock(ticker);

    results.tested++;

    if (result.status === 'EXISTS') {
      results.exists.push(ticker);
    } else if (result.status === 'PARTIAL') {
      results.partial.push(ticker);
    } else if (result.status === 'MISSING') {
      results.missing.push(ticker);
    } else {
      results.errors.push({ ticker, error: result.error });
    }

    // Progress tracking
    if ((i + 1) % 100 === 0 || i === universe.length - 1) {
      const progress = ((i + 1) / totalStocks * 100).toFixed(1);
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = (totalStocks - (i + 1)) / rate;
      const eta = Math.ceil(remaining / 60);

      console.log(`✓ Tested: ${i + 1}/${totalStocks} (${progress}%) | ETA: ${eta}m | Status: ${result.status}`);

      // Save checkpoint every 100 stocks
      if ((i + 1) % 100 === 0) {
        saveResults(results, totalStocks, startTime, true);
      }
    }

    await sleep(RATE_LIMIT_DELAY);
  }

  // Final save
  console.log('\n' + '━'.repeat(60) + '\n');
  saveResults(results, totalStocks, startTime, false);

  const runtime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ VERIFICATION COMPLETE`);
  console.log(`⏱️  Runtime: ${runtime} minutes`);
  console.log(`📊 Results saved to:`);
  console.log(`   - FMP_COVERAGE_REPORT.json`);
  console.log(`   - FMP_COVERAGE_SUMMARY.txt\n`);
}

// Save results to files
function saveResults(results, total, startTime, isCheckpoint) {
  const runtime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const existsPercent = ((results.exists.length / total) * 100).toFixed(1);
  const partialPercent = ((results.partial.length / total) * 100).toFixed(1);
  const missingPercent = ((results.missing.length / total) * 100).toFixed(1);

  // JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    runtime_minutes: parseFloat(runtime),
    total_stocks: total,
    tested: results.tested,
    summary: {
      exists: { count: results.exists.length, percent: parseFloat(existsPercent) },
      partial: { count: results.partial.length, percent: parseFloat(partialPercent) },
      missing: { count: results.missing.length, percent: parseFloat(missingPercent) },
      errors: { count: results.errors.length },
    },
    details: {
      exists: results.exists.sort(),
      partial: results.partial.sort(),
      missing: results.missing.sort(),
      errors: results.errors,
    },
  };

  writeFileSync('FMP_COVERAGE_REPORT.json', JSON.stringify(jsonReport, null, 2));

  // Text summary
  const txtReport = `
FMP API COVERAGE VERIFICATION REPORT
${'='.repeat(60)}

Generated: ${new Date().toISOString()}
Runtime: ${runtime} minutes
${isCheckpoint ? 'STATUS: CHECKPOINT (In Progress)' : 'STATUS: COMPLETE'}

SUMMARY
${'─'.repeat(60)}
Total Stocks: ${total}
Tested: ${results.tested}

✅ EXISTS (Full Data):    ${results.exists.length.toString().padStart(4)} stocks (${existsPercent}%)
⚠️  PARTIAL (Quote Only): ${results.partial.length.toString().padStart(4)} stocks (${partialPercent}%)
❌ MISSING (No Data):     ${results.missing.length.toString().padStart(4)} stocks (${missingPercent}%)
🔴 ERRORS:                ${results.errors.length.toString().padStart(4)} stocks

MISSING STOCKS (${results.missing.length} total)
${'─'.repeat(60)}
${results.missing.map((ticker, i) => `${(i + 1).toString().padStart(3)}. ${ticker}`).join('\n') || 'None'}

PARTIAL STOCKS (${results.partial.length} total)
${'─'.repeat(60)}
${results.partial.map((ticker, i) => `${(i + 1).toString().padStart(3)}. ${ticker}`).join('\n') || 'None'}

${results.errors.length > 0 ? `
ERRORS (${results.errors.length} total)
${'─'.repeat(60)}
${results.errors.map((e, i) => `${(i + 1).toString().padStart(3)}. ${e.ticker}: ${e.error}`).join('\n')}
` : ''}

NEXT STEPS
${'─'.repeat(60)}
1. Review MISSING stocks - verify if they exist via WebSearch
2. Categorize as: FMP GAP, DELISTED, or ETF
3. For FMP gaps, consider alternative data sources
4. Update stock universe if delisted stocks found

${'='.repeat(60)}
`;

  writeFileSync('FMP_COVERAGE_SUMMARY.txt', txtReport.trim());
}

// Run
main().catch(console.error);
