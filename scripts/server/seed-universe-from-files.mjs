#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { Client } from 'pg';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data', 'universe');

const cfg = {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  application_name: 'alfalyzer-seed-universe'
};

async function loadCsvSymbols(file){
  const txt = await fs.readFile(file, 'utf8');
  const lines = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines){
    if (line.startsWith('#')) continue;
    const [symbol, name='', exchange='', sector='', industry=''] = line.split(',').map(s=>s.trim());
    if (!symbol || !symbol.match(/^[A-Za-z0-9.-]+$/)) continue;
    rows.push([symbol.toUpperCase(), name, exchange, sector, industry]);
  }
  return rows;
}

async function main(){
  const exists = await fs.stat(DATA_DIR).then(()=>true).catch(()=>false);
  if (!exists) {
    console.error('Data dir not found:', DATA_DIR);
    process.exit(2);
  }
  const files = (await fs.readdir(DATA_DIR)).filter(f=>f.endsWith('.csv'));
  if (!files.length) {
    console.error('No CSV files found in', DATA_DIR);
    process.exit(2);
  }
  const c = new Client(cfg);
  await c.connect();
  await c.query('CREATE TABLE IF NOT EXISTS public.stocks (symbol text PRIMARY KEY, company_name text, exchange text, sector text, industry text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())');
  await c.query('CREATE INDEX IF NOT EXISTS stocks_symbol_lower_idx ON public.stocks ((lower(symbol)))');
  let inserted = 0;
  for (const f of files){
    const abs = path.join(DATA_DIR, f);
    const rows = await loadCsvSymbols(abs);
    for (const r of rows){
      await c.query('INSERT INTO public.stocks (symbol,company_name,exchange,sector,industry) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (symbol) DO NOTHING', r);
      inserted++;
    }
    console.log(`seeded ${rows.length} from ${f}`);
  }
  const res = await c.query('SELECT COUNT(*)::int AS c FROM public.stocks');
  console.log('stocks_total='+res.rows[0].c+', newly_inserted~='+inserted);
  await c.end();
}

main().catch(e=>{ console.error('SEED_ERR', e.message); process.exit(2); });

