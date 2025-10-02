#!/usr/bin/env node
import { Client } from 'pg';

const cfg = {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  application_name: 'alfalyzer-stocks-count'
};

async function main(){
  const c = new Client(cfg);
  await c.connect();
  const res = await c.query('SELECT COUNT(*)::int AS c FROM public.stocks');
  await c.end();
  const n = res.rows?.[0]?.c ?? 0;
  console.log(String(n));
}

main().catch(e=>{ console.error('COUNT_ERR', e.message); process.exit(2); });

