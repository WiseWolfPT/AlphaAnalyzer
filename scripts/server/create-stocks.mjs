#!/usr/bin/env node
import { Client } from 'pg';

const cfg = {
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  user: process.env.PGUSER || 'alfalyzer',
  password: process.env.PGPASSWORD || 'changeme',
  database: process.env.PGDATABASE || 'alfalyzer_db',
  application_name: 'alfalyzer-stocks-setup'
};

const seed = [
  ['AAPL','Apple Inc.','NASDAQ','Technology','Consumer Electronics'],
  ['MSFT','Microsoft Corp.','NASDAQ','Technology','Software'],
  ['GOOGL','Alphabet Inc.','NASDAQ','Communication Services','Internet Content'],
  ['AMZN','Amazon.com Inc.','NASDAQ','Consumer Discretionary','Internet Retail'],
  ['META','Meta Platforms Inc.','NASDAQ','Communication Services','Social Media'],
  ['TSLA','Tesla Inc.','NASDAQ','Consumer Discretionary','Automotive'],
  ['NVDA','NVIDIA Corp.','NASDAQ','Technology','Semiconductors'],
  ['JPM','JPMorgan Chase & Co.','NYSE','Financials','Banking'],
  ['V','Visa Inc.','NYSE','Financials','Payments'],
  ['JNJ','Johnson & Johnson','NYSE','Health Care','Pharmaceuticals']
];

async function main(){
  const c = new Client(cfg);
  await c.connect();
  await c.query('CREATE TABLE IF NOT EXISTS public.stocks (symbol text PRIMARY KEY, company_name text, exchange text, sector text, industry text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())');
  await c.query('CREATE INDEX IF NOT EXISTS stocks_symbol_lower_idx ON public.stocks ((lower(symbol)))');
  for (const r of seed){
    await c.query('INSERT INTO public.stocks (symbol,company_name,exchange,sector,industry) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (symbol) DO NOTHING', r);
  }
  const res = await c.query('SELECT COUNT(*)::int AS c FROM public.stocks');
  console.log('stocks_total='+res.rows[0].c);
  await c.end();
}

main().catch(e=>{ console.error('PG_ERR', e.message); process.exit(2); });

