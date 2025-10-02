#!/usr/bin/env node

// PostgreSQL connectivity and schema sanity check for Phase 9 (Hybrid Architecture)
// Usage:
//   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=... PGPASSWORD=... PGDATABASE=... node scripts/monitoring/check-pg.mjs

import { Client } from 'pg';

const cfg = {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  application_name: 'alfalyzer-pg-check'
};

function color(t, c = 'green'){
  const map = { green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', blue: '\x1b[34m' };
  return `${map[c] || ''}${t}\x1b[0m`;
}

function ensureEnv(){
  const missing = [];
  for (const k of ['PGHOST','PGUSER','PGPASSWORD','PGDATABASE']) if (!process.env[k]) missing.push(k);
  if (missing.length) {
    console.error(color(`Missing env vars: ${missing.join(', ')}`, 'red'));
    process.exit(1);
  }
}

async function main(){
  ensureEnv();
  console.log(color(`Connecting to PG ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`, 'blue'));
  const c = new Client(cfg);
  try {
    const t0 = Date.now();
    await c.connect();
    const t1 = Date.now();
    console.log(color(`Connected in ${t1-t0}ms`, 'green'));

    // Simple roundtrip
    const now = await c.query('SELECT NOW() as now');
    console.log(color(`Server time: ${now.rows[0].now}`, 'green'));

    // Schema checks (optional)
    const checks = [
      { table: 'transcripts' },
      { table: 'stocks' },
    ];
    for (const ch of checks){
      const res = await c.query('SELECT to_regclass($1) AS t', [ `public.${ch.table}` ]);
      const exists = !!res.rows[0].t;
      console.log(exists ? color(`[SCHEMA] ${ch.table} exists`, 'green') : color(`[SCHEMA] ${ch.table} missing`, 'yellow'));
    }

    await c.end();
    console.log(color('PG check complete', 'green'));
  } catch (e) {
    console.error(color(`PG check failed: ${e.message}`, 'red'));
    try { await c.end(); } catch {}
    process.exit(2);
  }
}

main();

