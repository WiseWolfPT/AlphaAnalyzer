#!/usr/bin/env node
// Extra universe from FMP available-traded/list: EURONEXT (all venues) and US AMEX small caps

const API_KEY = process.env.FMP_API_KEY || '';
if (!API_KEY) { console.error('FMP_API_KEY missing'); process.exit(2); }

import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data', 'universe');

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
  const euronext = [];
  const amex = [];
  for (const it of data){
    const ex = String(it.exchangeShortName || '').toUpperCase();
    const t = String(it.type||'').toLowerCase();
    if (t !== 'stock') continue;
    const s = String(it.symbol||'').toUpperCase();
    if (!s) continue;
    if (ex.includes('EURONEXT') && euronext.length < 200){
      euronext.push(row(s, it.name||'', ex, it.sector||'', it.industry||''));
    }
    if (ex === 'AMEX' && amex.length < 300){
      amex.push(row(s, it.name||'', ex, it.sector||'', it.industry||''));
    }
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, 'EURONEXT_TOP200.csv'), euronext.join('\n')+'\n', 'utf8');
  await fs.writeFile(path.join(DATA_DIR, 'US_AMEX_TOP300.csv'), amex.join('\n')+'\n', 'utf8');
  console.log(`EURONEXT_TOP200: ${euronext.length}, US_AMEX_TOP300: ${amex.length}`);
}

main().catch(e=>{ console.error('EXTRA_FETCH_ERR', e.message); process.exit(2); });

