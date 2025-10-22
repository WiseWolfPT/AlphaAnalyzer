#!/usr/bin/env npx tsx
/**
 * Emergency RLS application - Block all anonymous access
 */

const SUPABASE_URL = 'https://avjnfessefxtfurayybp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMDQzNSwiZXhwIjoyMDY3OTA2NDM1fQ.NblNWyjz09cGRo6VBMY5zMscfDMX7v7yWXVMHgOwlq8';
const ACCESS_TOKEN = 'sbp_0e96a81ade26119775079485e40975b99c6cbb13';

async function applyRLS() {
  console.log('🚨 Applying EMERGENCY RLS policies...\n');

  const tables = [
    { name: 'portfolios', userColumn: 'user_id' },
    { name: 'portfolio_positions', userColumn: 'user_id' },
    { name: 'watchlists', userColumn: 'user_id' },
    { name: 'profiles', userColumn: 'id' },
    { name: 'users', userColumn: 'id' },
    { name: 'price_alerts', userColumn: 'user_id' },
    { name: 'realtime_alerts', userColumn: 'user_id' },
    { name: 'user_sessions', userColumn: 'user_id' },
  ];

  // Special handling for watchlist_stocks (needs join)
  const watchlistStocksSQL = `
    DROP POLICY IF EXISTS block_anon_watchlist_stocks ON public.watchlist_stocks;
    CREATE POLICY block_anon_watchlist_stocks ON public.watchlist_stocks
      FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS allow_auth_watchlist_stocks ON public.watchlist_stocks;
    CREATE POLICY allow_auth_watchlist_stocks ON public.watchlist_stocks
      FOR ALL TO authenticated USING (
        watchlist_id IN (SELECT id FROM public.watchlists WHERE user_id = auth.uid())
      );
  `;

  for (const table of tables) {
    const sql = `
      DROP POLICY IF EXISTS block_anon_${table.name} ON public.${table.name};
      CREATE POLICY block_anon_${table.name} ON public.${table.name}
        FOR ALL TO anon USING (false);
      DROP POLICY IF EXISTS allow_auth_${table.name} ON public.${table.name};
      CREATE POLICY allow_auth_${table.name} ON public.${table.name}
        FOR ALL TO authenticated USING (${table.userColumn} = auth.uid());
    `;

    console.log(`📝 Applying RLS to ${table.name}...`);

    // Try Management API
    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/avjnfessefxtfurayybp/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sql }),
        }
      );

      if (response.ok) {
        console.log(`✅ ${table.name} protected`);
      } else {
        const error = await response.text();
        console.log(`❌ ${table.name} failed: ${error.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`❌ ${table.name} error: ${err.message}`);
    }
  }

  // Apply watchlist_stocks special case
  console.log(`📝 Applying RLS to watchlist_stocks...`);
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/avjnfessefxtfurayybp/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: watchlistStocksSQL }),
      }
    );

    if (response.ok) {
      console.log(`✅ watchlist_stocks protected`);
    } else {
      const error = await response.text();
      console.log(`❌ watchlist_stocks failed: ${error.substring(0, 100)}`);
    }
  } catch (err) {
    console.log(`❌ watchlist_stocks error: ${err.message}`);
  }

  console.log('\n✅ Process complete! Now verifying...\n');

  // Verify
  const { createClient } = await import('@supabase/supabase-js');
  const anon = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q');

  console.log('🔍 Verification Results:');
  const allTables = [...tables.map(t => t.name), 'watchlist_stocks'];

  for (const table of allTables) {
    const { error } = await anon.from(table).select('*', { count: 'exact', head: true }).limit(1);
    const status = error ? '✅ BLOCKED' : '❌ STILL EXPOSED';
    console.log(`  ${table}: ${status}`);
  }
}

applyRLS().catch(console.error);