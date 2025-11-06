#!/usr/bin/env node

/**
 * AGENT 16: Fetch Missing GICS Sector Data
 *
 * This script fetches sector information from FMP API for all stocks
 * that currently have "Unknown" or "N/A" sector classification.
 *
 * It will:
 * 1. Load the existing gics-sector-mapping.json
 * 2. Identify stocks with Unknown sectors
 * 3. Fetch profile data from FMP API (with rate limiting)
 * 4. Update the mapping with proper GICS sectors
 * 5. Save the updated mapping back to file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FMP_API_KEY = process.env.FMP_API_KEY;
const MAPPING_FILE = path.join(__dirname, '../server/data/gics-sector-mapping.json');
const BATCH_SIZE = 10;
const RATE_LIMIT_DELAY = 250; // 4 requests per second = 250ms delay

// GICS sector normalization mapping
const SECTOR_MAPPING = {
  'Technology': 'Information Technology',
  'Financial Services': 'Financials',
  'Financial': 'Financials',
  'Healthcare': 'Health Care',
  'Consumer Cyclical': 'Consumer Discretionary',
  'Consumer Defensive': 'Consumer Staples',
  'Basic Materials': 'Materials',
  'Telecommunication Services': 'Communication Services',
  'Real Estate': 'Real Estate',
  'Utilities': 'Utilities',
  'Energy': 'Energy',
  'Industrials': 'Industrials',
};

function normalizeGICSSector(apiSector) {
  if (!apiSector || apiSector === 'N/A') return 'Unknown';
  return SECTOR_MAPPING[apiSector] || apiSector;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchStockProfile(symbol) {
  try {
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`  ✗ HTTP ${response.status} for ${symbol}`);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.error(`  ✗ No data for ${symbol}`);
      return null;
    }

    const profile = data[0];
    return {
      sector: normalizeGICSSector(profile.sector),
      industry: profile.industry || 'N/A',
      country: profile.country || 'US',
      marketCap: profile.mktCap || null,
      originalSector: profile.sector || 'N/A',
    };
  } catch (error) {
    console.error(`  ✗ Error fetching ${symbol}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('AGENT 16: GICS Sector Data Fetcher');
  console.log('='.repeat(80));
  console.log('');

  if (!FMP_API_KEY) {
    console.error('Error: FMP_API_KEY environment variable not set');
    process.exit(1);
  }

  // Load existing mapping
  console.log(`Loading mapping from: ${MAPPING_FILE}`);
  const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  console.log(`Total stocks in mapping: ${mapping.length}`);

  // Find stocks with Unknown sectors
  const unknownStocks = mapping.filter(stock =>
    stock.gicsSector === 'Unknown' || stock.gicsSector === 'N/A'
  );
  console.log(`Stocks with Unknown sector: ${unknownStocks.length}`);
  console.log('');

  if (unknownStocks.length === 0) {
    console.log('✓ All stocks already have sector data. Nothing to do!');
    return;
  }

  console.log(`Will fetch sector data for ${unknownStocks.length} stocks...`);
  console.log(`Estimated time: ${Math.ceil(unknownStocks.length * RATE_LIMIT_DELAY / 1000 / 60)} minutes`);
  console.log('');

  // Process in batches
  let updated = 0;
  let failed = 0;
  let stillUnknown = 0;

  for (let i = 0; i < unknownStocks.length; i++) {
    const stock = unknownStocks[i];
    const progress = `[${i + 1}/${unknownStocks.length}]`;

    console.log(`${progress} Fetching: ${stock.symbol} (${stock.companyName})`);

    const profile = await fetchStockProfile(stock.symbol);

    if (profile) {
      if (profile.sector !== 'Unknown') {
        // Update the stock in the main mapping
        const index = mapping.findIndex(s => s.symbol === stock.symbol);
        if (index !== -1) {
          mapping[index].gicsSector = profile.sector;
          mapping[index].industry = profile.industry;
          mapping[index].country = profile.country;
          mapping[index].marketCap = profile.marketCap;
          mapping[index].originalSector = profile.originalSector;
        }

        console.log(`  ✓ Updated: ${profile.sector} (${profile.industry})`);
        updated++;
      } else {
        console.log(`  ⚠ Still Unknown (no sector from FMP)`);
        stillUnknown++;
      }
    } else {
      failed++;
    }

    // Rate limiting
    if ((i + 1) % BATCH_SIZE === 0) {
      console.log('');
      console.log(`Progress: ${updated} updated, ${stillUnknown} still unknown, ${failed} failed`);
      console.log('Rate limiting... waiting 2.5 seconds...');
      console.log('');
      await sleep(2500);
    } else {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  // Save updated mapping
  console.log('');
  console.log('='.repeat(80));
  console.log('Saving updated mapping...');
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
  console.log(`✓ Saved to: ${MAPPING_FILE}`);

  // Final statistics
  console.log('');
  console.log('='.repeat(80));
  console.log('FINAL STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total processed:       ${unknownStocks.length}`);
  console.log(`Successfully updated:  ${updated}`);
  console.log(`Still unknown:         ${stillUnknown}`);
  console.log(`Failed to fetch:       ${failed}`);
  console.log('');

  // Calculate new sector distribution
  const sectorCounts = {};
  mapping.forEach(stock => {
    sectorCounts[stock.gicsSector] = (sectorCounts[stock.gicsSector] || 0) + 1;
  });

  console.log('Updated Sector Distribution:');
  console.log('-'.repeat(80));
  Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sector, count]) => {
      const percentage = ((count / mapping.length) * 100).toFixed(1);
      console.log(`  ${sector.padEnd(30)} ${count.toString().padStart(4)} (${percentage}%)`);
    });
  console.log('');
  console.log('✓ Done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
