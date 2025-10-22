#!/usr/bin/env tsx
/**
 * Apply RLS policies to protect user data tables
 * CRITICAL: This fixes the security vulnerability found
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!);

async function applyRLSPolicies() {
  console.log('🔒 Applying RLS policies to protect user data...\n');

  // SQL for portfolios
  const portfoliosSQL = `
    BEGIN;
    -- Enable RLS
    ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

    -- Drop old policies if they exist
    DROP POLICY IF EXISTS portfolios_select ON public.portfolios;
    DROP POLICY IF EXISTS portfolios_insert ON public.portfolios;
    DROP POLICY IF EXISTS portfolios_update ON public.portfolios;
    DROP POLICY IF EXISTS portfolios_delete ON public.portfolios;

    -- Create owner-only policies
    CREATE POLICY portfolios_select
    ON public.portfolios
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

    CREATE POLICY portfolios_insert
    ON public.portfolios
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY portfolios_update
    ON public.portfolios
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY portfolios_delete
    ON public.portfolios
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

    -- Revoke all from anon
    REVOKE ALL ON public.portfolios FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
    COMMIT;
  `;

  // SQL for watchlists
  const watchlistsSQL = `
    BEGIN;
    ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS watchlists_select ON public.watchlists;
    DROP POLICY IF EXISTS watchlists_insert ON public.watchlists;
    DROP POLICY IF EXISTS watchlists_update ON public.watchlists;
    DROP POLICY IF EXISTS watchlists_delete ON public.watchlists;

    CREATE POLICY watchlists_select
    ON public.watchlists
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

    CREATE POLICY watchlists_insert
    ON public.watchlists
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY watchlists_update
    ON public.watchlists
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY watchlists_delete
    ON public.watchlists
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

    REVOKE ALL ON public.watchlists FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlists TO authenticated;
    COMMIT;
  `;

  // SQL for transactions
  const transactionsSQL = `
    BEGIN;
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS transactions_select ON public.transactions;
    DROP POLICY IF EXISTS transactions_insert ON public.transactions;
    DROP POLICY IF EXISTS transactions_update ON public.transactions;
    DROP POLICY IF EXISTS transactions_delete ON public.transactions;

    CREATE POLICY transactions_select
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

    CREATE POLICY transactions_insert
    ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY transactions_update
    ON public.transactions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

    CREATE POLICY transactions_delete
    ON public.transactions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

    REVOKE ALL ON public.transactions FROM anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
    COMMIT;
  `;

  // SQL for transcripts (public read, restricted write)
  const transcriptsSQL = `
    BEGIN;
    ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

    -- Drop old policies
    DROP POLICY IF EXISTS transcripts_read ON public.transcripts;

    -- Public read policy
    CREATE POLICY transcripts_read
    ON public.transcripts
    FOR SELECT
    TO anon, authenticated
    USING (true);

    -- Block DML for anon/auth (service_role bypasses RLS)
    REVOKE INSERT, UPDATE, DELETE ON public.transcripts FROM anon, authenticated;
    COMMIT;
  `;

  // Apply policies
  const tables = [
    { name: 'portfolios', sql: portfoliosSQL },
    { name: 'watchlists', sql: watchlistsSQL },
    { name: 'transactions', sql: transactionsSQL },
    { name: 'transcripts', sql: transcriptsSQL }
  ];

  for (const table of tables) {
    try {
      console.log(`📝 Applying RLS to ${table.name}...`);
      const { error } = await supabase.rpc('exec_sql', { query: table.sql }).single();

      if (error) {
        // Try direct approach if RPC doesn't work
        console.log(`⚠️  RPC failed, trying direct SQL...`);
        // Note: This won't work with client library, need actual SQL access
        console.error(`❌ Cannot apply RLS to ${table.name}: Need direct SQL access`);
        console.log('\n🚨 Please apply the following SQL in Supabase Studio SQL Editor:');
        console.log('─'.repeat(60));
        console.log(table.sql);
        console.log('─'.repeat(60));
      } else {
        console.log(`✅ RLS applied to ${table.name}`);
      }
    } catch (err) {
      console.error(`❌ Error applying RLS to ${table.name}:`, err);
      console.log('\n🚨 Please apply the following SQL in Supabase Studio SQL Editor:');
      console.log('─'.repeat(60));
      console.log(table.sql);
      console.log('─'.repeat(60));
    }
  }

  console.log('\n📊 RLS policies application complete!');
  console.log('Run "npm run security:check-rls" to verify the fix.');
}

applyRLSPolicies().catch(console.error);