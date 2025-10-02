#!/usr/bin/env node
// Fetch index constituents from FMP and seed into PG via data/universe CSVs

import { promises as fs } from 'fs';
import path from 'path';

const API_KEY = process.env.FMP_API_KEY || process.env.FMP || '';
if (!API_KEY) {
  console.error('FMP_API_KEY missing in env');
  process.exit(2);
}

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data', 'universe');

const INDEX_ENDPOINTS = [
  { name: 'SP500', url: 'https://financialmodelingprep.com/api/v3/sp500_constituent' },
  { name: 'NASDAQ100', url: 'https://financialmodelingprep.com/api/v3/nasdaq_constituent' },
  { name: 'DOW30', url: 'https://financialmodelingprep.com/api/v3/dowjones_constituent' },
  { name: 'DAX', url: 'https://financialmodelingprep.com/api/v3/dax_constituent' },
  { name: 'CAC40', url: 'https://financialmodelingprep.com/api/v3/cac40_constituent' },
  { name: 'FTSE100', url: 'https://financialmodelingprep.com/api/v3/ftse100_constituent' },
  { name: 'IBEX35', url: 'https://financialmodelingprep.com/api/v3/ibex35_constituent' },
  { name: 'PSI20', url: 'https://financialmodelingprep.com/api/v3/psi20_constituent' },
  // If available; if not, will skip
  { name: 'RUSSELL2000', url: 'https://financialmodelingprep.com/api/v3/russell2000_constituent' }
];

function row(symbol, name='', exchange='', sector='', industry='') {
  return `${symbol},${name.replace(/,/g,' ')},${exchange},${sector.replace(/,/g,' ')},${industry.replace(/,/g,' ')}`;
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function writeCsv(file, records) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, records.join('\n') + '\n', 'utf8');
  await fs.rename(tmp, file);
}

async function fetchIndex(name, baseUrl) {
  const url = `${baseUrl}?apikey=${API_KEY}`;
  try {
    const data = await fetchJson(url);
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[${name}] empty response`);
      return [];
    }
    // Normalize different shapes (symbol/name or with fields)
    const lines = [];
    for (const it of data) {
      const sym = String(it.symbol || it.ticker || it.Symbol || '').trim().toUpperCase();
      if (!sym) continue;
      const n = String(it.name || it.companyName || it.Name || '').trim();
      const ex = String(it.exchange || it.exchangeShortName || '').trim();
      const sec = String(it.sector || '').trim();
      const ind = String(it.industry || '').trim();
      lines.push(row(sym, n, ex, sec, ind));
    }
    const out = path.join(DATA_DIR, `${name}.csv`);
    await writeCsv(out, lines);
    console.log(`[${name}] fetched ${lines.length} → ${out}`);
    return lines.map(l => l.split(',')[0]);
  } catch (e) {
    console.warn(`[${name}] skipped (${e.message})`);
    return [];
  }
}

async function main(){
  const all = new Set();
  for (const ep of INDEX_ENDPOINTS) {
    const syms = await fetchIndex(ep.name, ep.url);
    syms.forEach(s => all.add(s));
  }
  // Add a small ADR Asia set to ensure coverage if endpoint missing
  ['TSM','BABA','JD','BIDU','PDD','NVO','ASML','SONY','TM','TCEHY'].forEach(s => all.add(s));
  console.log(`Total unique symbols prepared: ${all.size}`);
  console.log('Seeding into PG via scripts/server/seed-universe-from-files.mjs ...');
  // Run the existing seed script by spawning node (simple approach)
  const { spawn } = await import('node:child_process');
  const p = spawn(process.execPath, [path.join(ROOT, 'scripts/server/seed-universe-from-files.mjs')], {
    stdio: 'inherit',
    env: process.env
  });
  p.on('exit', (code) => process.exit(code));
}

main().catch(e=>{ console.error('FMP_UNIVERSE_ERR', e.message); process.exit(2); });

