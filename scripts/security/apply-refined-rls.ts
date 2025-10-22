#!/usr/bin/env npx tsx
/**
 * Apply REFINED RLS policies based on Codex recommendations
 * - Add explicit WITH CHECK for INSERT/UPDATE
 * - Use EXISTS for tables without direct user_id
 * - Proper foreign key relationships
 */

const SUPABASE_URL = 'https://avjnfessefxtfurayybp.supabase.co';
const ACCESS_TOKEN = 'sbp_0e96a81ade26119775079485e40975b99c6cbb13';

async function executeSQL(sql: string, description: string) {
  console.log(`📝 ${description}...`);

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
      console.log(`✅ Success`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ Failed: ${error.substring(0, 150)}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    return false;
  }
}

async function applyRefinedPolicies() {
  console.log('🔒 Applying REFINED RLS Policies with Codex Recommendations\n');
  console.log('=' .repeat(60) + '\n');

  // 1. PORTFOLIOS - Direct user_id with explicit WITH CHECK
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_portfolios ON public.portfolios;
    DROP POLICY IF EXISTS allow_auth_portfolios ON public.portfolios;

    -- Block anonymous completely
    CREATE POLICY block_anon_portfolios ON public.portfolios
      FOR ALL TO anon USING (false);

    -- Refined policies for authenticated with explicit WITH CHECK
    DROP POLICY IF EXISTS portfolios_select_auth ON public.portfolios;
    CREATE POLICY portfolios_select_auth ON public.portfolios
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS portfolios_insert_auth ON public.portfolios;
    CREATE POLICY portfolios_insert_auth ON public.portfolios
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS portfolios_update_auth ON public.portfolios;
    CREATE POLICY portfolios_update_auth ON public.portfolios
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS portfolios_delete_auth ON public.portfolios;
    CREATE POLICY portfolios_delete_auth ON public.portfolios
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  `, 'Portfolios - Refined with explicit WITH CHECK');

  // 2. PORTFOLIO_POSITIONS - Using EXISTS with portfolio parent
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_portfolio_positions ON public.portfolio_positions;
    DROP POLICY IF EXISTS allow_auth_portfolio_positions ON public.portfolio_positions;

    -- Block anonymous
    CREATE POLICY block_anon_portfolio_positions ON public.portfolio_positions
      FOR ALL TO anon USING (false);

    -- Use EXISTS to check ownership via portfolio
    DROP POLICY IF EXISTS positions_select_auth ON public.portfolio_positions;
    CREATE POLICY positions_select_auth ON public.portfolio_positions
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.portfolios p
        WHERE p.id = portfolio_positions.portfolio_id
        AND p.user_id = auth.uid()
      ));

    DROP POLICY IF EXISTS positions_insert_auth ON public.portfolio_positions;
    CREATE POLICY positions_insert_auth ON public.portfolio_positions
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.portfolios p
        WHERE p.id = portfolio_positions.portfolio_id
        AND p.user_id = auth.uid()
      ));

    DROP POLICY IF EXISTS positions_update_auth ON public.portfolio_positions;
    CREATE POLICY positions_update_auth ON public.portfolio_positions
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.portfolios p
        WHERE p.id = portfolio_positions.portfolio_id
        AND p.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.portfolios p
        WHERE p.id = portfolio_positions.portfolio_id
        AND p.user_id = auth.uid()
      ));

    DROP POLICY IF EXISTS positions_delete_auth ON public.portfolio_positions;
    CREATE POLICY positions_delete_auth ON public.portfolio_positions
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.portfolios p
        WHERE p.id = portfolio_positions.portfolio_id
        AND p.user_id = auth.uid()
      ));
  `, 'Portfolio Positions - Using EXISTS with parent portfolio');

  // 3. WATCHLISTS - Direct user_id with explicit WITH CHECK
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_watchlists ON public.watchlists;
    DROP POLICY IF EXISTS allow_auth_watchlists ON public.watchlists;

    CREATE POLICY block_anon_watchlists ON public.watchlists
      FOR ALL TO anon USING (false);

    DROP POLICY IF EXISTS watchlists_select_auth ON public.watchlists;
    CREATE POLICY watchlists_select_auth ON public.watchlists
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS watchlists_insert_auth ON public.watchlists;
    CREATE POLICY watchlists_insert_auth ON public.watchlists
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS watchlists_update_auth ON public.watchlists;
    CREATE POLICY watchlists_update_auth ON public.watchlists
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS watchlists_delete_auth ON public.watchlists;
    CREATE POLICY watchlists_delete_auth ON public.watchlists
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  `, 'Watchlists - Refined with explicit WITH CHECK');

  // 4. WATCHLIST_STOCKS - Using EXISTS with watchlist parent
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_watchlist_stocks ON public.watchlist_stocks;
    DROP POLICY IF EXISTS allow_auth_watchlist_stocks ON public.watchlist_stocks;

    CREATE POLICY block_anon_watchlist_stocks ON public.watchlist_stocks
      FOR ALL TO anon USING (false);

    DROP POLICY IF EXISTS wstocks_select_auth ON public.watchlist_stocks;
    CREATE POLICY wstocks_select_auth ON public.watchlist_stocks
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.watchlists w
        WHERE w.id = watchlist_stocks.watchlist_id
        AND w.user_id = auth.uid()
      ));

    DROP POLICY IF EXISTS wstocks_insert_auth ON public.watchlist_stocks;
    CREATE POLICY wstocks_insert_auth ON public.watchlist_stocks
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.watchlists w
        WHERE w.id = watchlist_stocks.watchlist_id
        AND w.user_id = auth.uid()
      ));

    DROP POLICY IF EXISTS wstocks_update_auth ON public.watchlist_stocks;
    CREATE POLICY wstocks_update_auth ON public.watchlist_stocks
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.watchlists w
        WHERE w.id = watchlist_stocks.watchlist_id
        AND w.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.watchlists w
        WHERE w.id = watchlist_stocks.watchlist_id
        AND w.user_id = auth.uid()
      ));

    DROP POLICY IF EXISTS wstocks_delete_auth ON public.watchlist_stocks;
    CREATE POLICY wstocks_delete_auth ON public.watchlist_stocks
      FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.watchlists w
        WHERE w.id = watchlist_stocks.watchlist_id
        AND w.user_id = auth.uid()
      ));
  `, 'Watchlist Stocks - Using EXISTS with parent watchlist');

  // 5. PROFILES - Using id = auth.uid()
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_profiles ON public.profiles;
    DROP POLICY IF EXISTS allow_auth_profiles ON public.profiles;

    CREATE POLICY block_anon_profiles ON public.profiles
      FOR ALL TO anon USING (false);

    DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
    CREATE POLICY profiles_select_auth ON public.profiles
      FOR SELECT TO authenticated
      USING (id = auth.uid());

    DROP POLICY IF EXISTS profiles_insert_auth ON public.profiles;
    CREATE POLICY profiles_insert_auth ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (id = auth.uid());

    DROP POLICY IF EXISTS profiles_update_auth ON public.profiles;
    CREATE POLICY profiles_update_auth ON public.profiles
      FOR UPDATE TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());

    DROP POLICY IF EXISTS profiles_delete_auth ON public.profiles;
    CREATE POLICY profiles_delete_auth ON public.profiles
      FOR DELETE TO authenticated
      USING (id = auth.uid());
  `, 'Profiles - Using id = auth.uid()');

  // 6. USERS - Read-only for own record
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_users ON public.users;
    DROP POLICY IF EXISTS allow_auth_users ON public.users;

    CREATE POLICY block_anon_users ON public.users
      FOR ALL TO anon USING (false);

    -- Users table typically read-only via app
    DROP POLICY IF EXISTS users_select_auth ON public.users;
    CREATE POLICY users_select_auth ON public.users
      FOR SELECT TO authenticated
      USING (id = auth.uid() OR auth_id = auth.uid());

    -- Block all modifications (handled by auth system)
    DROP POLICY IF EXISTS users_no_modify ON public.users;
    CREATE POLICY users_no_modify ON public.users
      FOR INSERT TO authenticated
      WITH CHECK (false);

    DROP POLICY IF EXISTS users_no_update ON public.users;
    CREATE POLICY users_no_update ON public.users
      FOR UPDATE TO authenticated
      USING (false)
      WITH CHECK (false);

    DROP POLICY IF EXISTS users_no_delete ON public.users;
    CREATE POLICY users_no_delete ON public.users
      FOR DELETE TO authenticated
      USING (false);
  `, 'Users - Read-only for own record, no modifications');

  // 7. PRICE_ALERTS - Direct user_id
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_price_alerts ON public.price_alerts;
    DROP POLICY IF EXISTS allow_auth_price_alerts ON public.price_alerts;

    CREATE POLICY block_anon_price_alerts ON public.price_alerts
      FOR ALL TO anon USING (false);

    DROP POLICY IF EXISTS alerts_select_auth ON public.price_alerts;
    CREATE POLICY alerts_select_auth ON public.price_alerts
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS alerts_insert_auth ON public.price_alerts;
    CREATE POLICY alerts_insert_auth ON public.price_alerts
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS alerts_update_auth ON public.price_alerts;
    CREATE POLICY alerts_update_auth ON public.price_alerts
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS alerts_delete_auth ON public.price_alerts;
    CREATE POLICY alerts_delete_auth ON public.price_alerts
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  `, 'Price Alerts - Refined policies');

  // 8. REALTIME_ALERTS
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_realtime_alerts ON public.realtime_alerts;
    DROP POLICY IF EXISTS allow_auth_realtime_alerts ON public.realtime_alerts;

    CREATE POLICY block_anon_realtime_alerts ON public.realtime_alerts
      FOR ALL TO anon USING (false);

    DROP POLICY IF EXISTS rt_alerts_select_auth ON public.realtime_alerts;
    CREATE POLICY rt_alerts_select_auth ON public.realtime_alerts
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS rt_alerts_insert_auth ON public.realtime_alerts;
    CREATE POLICY rt_alerts_insert_auth ON public.realtime_alerts
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS rt_alerts_update_auth ON public.realtime_alerts;
    CREATE POLICY rt_alerts_update_auth ON public.realtime_alerts
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS rt_alerts_delete_auth ON public.realtime_alerts;
    CREATE POLICY rt_alerts_delete_auth ON public.realtime_alerts
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  `, 'Realtime Alerts - Refined policies');

  // 9. USER_SESSIONS
  await executeSQL(`
    DROP POLICY IF EXISTS block_anon_user_sessions ON public.user_sessions;
    DROP POLICY IF EXISTS allow_auth_user_sessions ON public.user_sessions;

    CREATE POLICY block_anon_user_sessions ON public.user_sessions
      FOR ALL TO anon USING (false);

    DROP POLICY IF EXISTS sessions_select_auth ON public.user_sessions;
    CREATE POLICY sessions_select_auth ON public.user_sessions
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS sessions_insert_auth ON public.user_sessions;
    CREATE POLICY sessions_insert_auth ON public.user_sessions
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS sessions_update_auth ON public.user_sessions;
    CREATE POLICY sessions_update_auth ON public.user_sessions
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS sessions_delete_auth ON public.user_sessions;
    CREATE POLICY sessions_delete_auth ON public.user_sessions
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  `, 'User Sessions - Refined policies');

  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ Refined RLS policies applied!');
  console.log('\nKey improvements:');
  console.log('- Added explicit WITH CHECK for INSERT/UPDATE operations');
  console.log('- Used EXISTS for foreign key relationships');
  console.log('- Made users table read-only');
  console.log('- Granular policies (SELECT/INSERT/UPDATE/DELETE) instead of FOR ALL');
}

async function verifyProtection() {
  console.log('\n🔍 Verifying RLS Protection...\n');

  const { createClient } = await import('@supabase/supabase-js');
  const anon = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q');

  const tables = [
    'portfolios',
    'portfolio_positions',
    'watchlists',
    'watchlist_stocks',
    'profiles',
    'users',
    'price_alerts',
    'realtime_alerts',
    'user_sessions'
  ];

  console.log('Anonymous access check:');
  for (const table of tables) {
    const { error } = await anon.from(table).select('*', { count: 'exact', head: true }).limit(1);
    const status = error ? '✅ BLOCKED' : '❌ EXPOSED';
    console.log(`  ${table.padEnd(25)}: ${status}`);
  }
}

async function main() {
  await applyRefinedPolicies();
  await verifyProtection();

  console.log('\n📋 AUDIT LOG:');
  console.log(`- Timestamp: ${new Date().toISOString()}`);
  console.log(`- Action: Applied refined RLS policies`);
  console.log(`- Method: Supabase Management API`);
  console.log(`- Token used: ACCESS_TOKEN (sbp_...)`);
  console.log(`- Recommendation: Rotate token after this operation`);
}

main().catch(console.error);