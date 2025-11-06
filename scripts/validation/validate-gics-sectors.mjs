#!/usr/bin/env node

/**
 * AGENT 16: GICS Sector Validation Report
 *
 * Generates comprehensive validation report for GICS sector implementation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAPPING_FILE = path.join(__dirname, '../../server/data/gics-sector-mapping.json');

// GICS 11 Sectors
const GICS_11_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
];

function main() {
  console.log('='.repeat(80));
  console.log('AGENT 16: GICS SECTOR STRUCTURE VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log('');

  // Load mapping
  const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
  console.log(`Total stocks in mapping: ${mapping.length}`);
  console.log('');

  // Count by sector
  const sectorCounts = {};
  const sectorExamples = {};

  mapping.forEach(stock => {
    const sector = stock.gicsSector;
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;

    if (!sectorExamples[sector]) {
      sectorExamples[sector] = [];
    }
    if (sectorExamples[sector].length < 5) {
      sectorExamples[sector].push(stock.symbol);
    }
  });

  // Sector Distribution
  console.log('SECTOR DISTRIBUTION');
  console.log('-'.repeat(80));

  const sortedSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1]);

  sortedSectors.forEach(([sector, count]) => {
    const percentage = ((count / mapping.length) * 100).toFixed(1);
    const examples = sectorExamples[sector].join(', ');
    const isGICS11 = GICS_11_SECTORS.includes(sector) ? '✓' : ' ';

    console.log(`[${isGICS11}] ${sector.padEnd(30)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%)`);
    console.log(`    Examples: ${examples}`);
  });
  console.log('');

  // GICS 11 Compliance
  console.log('GICS 11-SECTOR COMPLIANCE');
  console.log('-'.repeat(80));

  const foundSectors = new Set(Object.keys(sectorCounts));
  const missingSectors = GICS_11_SECTORS.filter(s => !foundSectors.has(s));
  const extraSectors = Array.from(foundSectors).filter(s => !GICS_11_SECTORS.includes(s));

  GICS_11_SECTORS.forEach(sector => {
    const count = sectorCounts[sector] || 0;
    const status = count > 0 ? '✓ FOUND' : '✗ MISSING';
    console.log(`  ${status.padEnd(12)} ${sector.padEnd(30)} (${count} stocks)`);
  });
  console.log('');

  if (extraSectors.length > 0) {
    console.log('EXTRA SECTORS (non-GICS):');
    extraSectors.forEach(sector => {
      console.log(`  - ${sector} (${sectorCounts[sector]} stocks)`);
    });
    console.log('');
  }

  // Data Quality Metrics
  console.log('DATA QUALITY METRICS');
  console.log('-'.repeat(80));

  const withSector = mapping.filter(s => s.gicsSector && s.gicsSector !== 'Unknown' && s.gicsSector !== 'N/A').length;
  const unknownSector = mapping.filter(s => s.gicsSector === 'Unknown' || s.gicsSector === 'N/A').length;
  const completionRate = ((withSector / mapping.length) * 100).toFixed(1);

  console.log(`  Stocks with valid GICS sector:  ${withSector} (${completionRate}%)`);
  console.log(`  Stocks with Unknown sector:     ${unknownSector} (${((unknownSector / mapping.length) * 100).toFixed(1)}%)`);
  console.log(`  Total stock count:              ${mapping.length}`);
  console.log('');

  // Coverage by sector
  const gics11Count = GICS_11_SECTORS.reduce((sum, sector) => sum + (sectorCounts[sector] || 0), 0);
  const gics11Coverage = ((gics11Count / mapping.length) * 100).toFixed(1);

  console.log(`  Stocks in GICS 11 sectors:      ${gics11Count} (${gics11Coverage}%)`);
  console.log(`  Stocks outside GICS 11:         ${mapping.length - gics11Count}`);
  console.log('');

  // Regional Distribution
  console.log('REGIONAL DISTRIBUTION');
  console.log('-'.repeat(80));

  const regions = {};
  mapping.forEach(stock => {
    const country = stock.country || 'Unknown';
    regions[country] = (regions[country] || 0) + 1;
  });

  Object.entries(regions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([country, count]) => {
      const percentage = ((count / mapping.length) * 100).toFixed(1);
      console.log(`  ${country.padEnd(20)} ${count.toString().padStart(4)} (${percentage}%)`);
    });
  console.log('');

  // Top Stocks by Sector
  console.log('TOP STOCKS BY SECTOR (5 examples each)');
  console.log('-'.repeat(80));

  GICS_11_SECTORS.forEach(sector => {
    if (sectorCounts[sector]) {
      const examples = sectorExamples[sector].join(', ');
      console.log(`  ${sector}:`);
      console.log(`    ${examples}`);
    }
  });
  console.log('');

  // Summary Statistics
  console.log('SUMMARY');
  console.log('-'.repeat(80));
  console.log(`  Total Stocks:                   ${mapping.length}`);
  console.log(`  Unique Sectors:                 ${Object.keys(sectorCounts).length}`);
  console.log(`  GICS 11 Sectors Found:          ${GICS_11_SECTORS.filter(s => sectorCounts[s]).length}/11`);
  console.log(`  Coverage Rate:                  ${completionRate}%`);
  console.log(`  Unknown/Missing:                ${unknownSector} stocks`);
  console.log('');

  // Recommendations
  console.log('RECOMMENDATIONS');
  console.log('-'.repeat(80));

  if (unknownSector > 0) {
    console.log(`  1. Fetch sector data for ${unknownSector} Unknown stocks using FMP API`);
    console.log(`     Run: node scripts/fetch-missing-sectors.mjs`);
  }

  if (missingSectors.length > 0) {
    console.log(`  2. Missing GICS sectors: ${missingSectors.join(', ')}`);
  }

  const minSectorSize = 20;
  const smallSectors = GICS_11_SECTORS.filter(s => {
    const count = sectorCounts[s] || 0;
    return count > 0 && count < minSectorSize;
  });

  if (smallSectors.length > 0) {
    console.log(`  3. Small sectors (< ${minSectorSize} stocks): ${smallSectors.join(', ')}`);
    console.log(`     Consider expanding coverage or merging for warming strategies`);
  }

  console.log('');
  console.log('✓ Validation complete!');
}

main();
