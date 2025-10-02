#!/usr/bin/env node
// Build an EU universe using FMP /available-traded/list (filter by exchanges)

const API_KEY = process.env.FMP_API_KEY || '';
if (!API_KEY) { console.error('FMP_API_KEY missing'); process.exit(2); }

import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data', 'universe');

const TARGETS = [
  { name: 'XETRA', limit: 150 },
  { name: 'LSE', limit: 150 },
  { name: 'BME', limit: 60 }
];

function row(s, n='', ex='', sector='', industry=''){
  return `${s},${String(n||'').replace(/,/g,' ')},${ex},${String(sector||'').replace(/,/g,' ')},${String(industry||'').replace(/,/g,' ')}`;
}

async function fetchJson(url){
  const r = await fetch(url, { headers: { 'Accept':'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function main(){
  const url = `https://financialmodelingprep.com/api/v3/available-traded/list?apikey=${API_KEY}`;
  const data = await fetchJson(url);
  const byEx = new Map();
  for (const it of data){
    const ex = String(it.exchangeShortName || it.exchange || '').toUpperCase();
    const sym = String(it.symbol || '').toUpperCase();
    if (!sym || !ex) continue;
    if (!['XETRA','LSE','BME','EURONEXT','ENX'].includes(ex)) {
      // Heuristic for Euronext via symbol suffix
      if (!sym.endsWith('.PA') && !sym.endsWith('.AS') && !sym.endsWith('.BR') && !sym.endsWith('.LS')) continue;
    }
    if (String(it.type||'').toLowerCase() !== 'stock') continue;
    if (!byEx.has(ex)) byEx.set(ex, []);
    byEx.get(ex).push(it);
  }
  const outLines = [];
  let total = 0;
  // XETRA/LSE/BME straightforward limits
  for (const tgt of TARGETS){
    const arr = (byEx.get(tgt.name) || []).slice(0, tgt.limit);
    for (const it of arr){
      outLines.push(row(String(it.symbol).toUpperCase(), it.name||'', tgt.name, it.sector||'', it.industry||''));
    }
    total += arr.length;
    console.log(`${tgt.name}: ${arr.length}`);
  }
  // Euronext via suffix buckets: .PA (Paris), .AS (Amsterdam), .BR (Brussels), .LS (Lisbon)
  const enSuffixes = ['.PA','.AS','.BR','.LS'];
  for (const suf of enSuffixes){
    const take = data.filter(it => String(it.type||'').toLowerCase()==='stock' && String(it.symbol||'').toUpperCase().endsWith(suf)).slice(0, suf==='.LS'?40:100);
    for (const it of take){
      outLines.push(row(String(it.symbol).toUpperCase(), it.name||'', 'EURONEXT', it.sector||'', it.industry||''));
    }
    total += take.length;
    console.log(`EURONEXT ${suf}: ${take.length}`);
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR,'EUROPE_TOP500.csv'), outLines.join('\n')+'\n', 'utf8');
  console.log(`EUROPE_TOP500.csv written (${total})`);
}

main().catch(e=>{ console.error('EU_FETCH_ERR', e.message); process.exit(2); });
