// Basic RLS verification (non-invasive)
import { createClient } from '@supabase/supabase-js';

const TABLES = [
  { name: 'portfolios', expectAnonReadable: false },
  { name: 'portfolio_positions', expectAnonReadable: false },
  { name: 'watchlists', expectAnonReadable: false },
  { name: 'watchlist_stocks', expectAnonReadable: false },
  { name: 'profiles', expectAnonReadable: false },
  { name: 'users', expectAnonReadable: false },
  { name: 'price_alerts', expectAnonReadable: false },
  { name: 'realtime_alerts', expectAnonReadable: false },
  { name: 'user_sessions', expectAnonReadable: false },
];

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function color(text, c = 'green') {
  const map = { green: '\u001b[32m', yellow: '\u001b[33m', red: '\u001b[31m', blue: '\u001b[34m' };
  return `${map[c] || ''}${text}\u001b[0m`;
}

function assertEnv() {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    console.log(color('Missing env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY', 'red'));
    process.exit(1);
  }
}

async function testTable(table) {
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  const resAnon = await anon.from(table.name).select('*', { count: 'exact', head: true }).limit(1);
  const resSvc = await svc.from(table.name).select('*', { count: 'exact', head: true }).limit(1);

  const anonReadable = !resAnon.error;
  const svcReadable = !resSvc.error;

  let status = 'UNKNOWN';
  let colorKey = 'yellow';
  if (svcReadable && !anonReadable && !table.expectAnonReadable) {
    status = 'RLS ENFORCED (anon blocked)'; colorKey = 'green';
  } else if (svcReadable && anonReadable && table.expectAnonReadable) {
    status = 'PUBLIC READ OK (by policy)'; colorKey = 'green';
  } else if (svcReadable && anonReadable && !table.expectAnonReadable) {
    status = 'WARNING: anon can read'; colorKey = 'red';
  } else if (!svcReadable) {
    status = 'SERVICE READ FAILED (check service key/policies)'; colorKey = 'red';
  }
  return { table: table.name, anonReadable, svcReadable, status, colorKey };
}

async function main() {
  assertEnv();
  console.log(color(`RLS verification for ${SUPABASE_URL}`, 'blue'));
  const results = [];
  for (const t of TABLES) {
    try {
      results.push(await testTable(t));
    } catch (e) {
      results.push({ table: t.name, status: (e && e.message) || String(e), colorKey: 'red' });
    }
  }
  for (const r of results) {
    console.log(color(`- ${r.table}: ${r.status}`, r.colorKey));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
