#!/usr/bin/env npx tsx
/**
 * Apply RLS policies via Supabase Management API
 * Using the access token to execute migrations
 */

const SUPABASE_ACCESS_TOKEN = 'sbp_0e96a81ade26119775079485e40975b99c6cbb13';
const PROJECT_REF = 'avjnfessefxtfurayybp';

async function applyMigration(name: string, sql: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/migrations`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        up: sql,
        down: '', // No rollback for now
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to apply ${name}: ${error}`);
  }

  return await response.json();
}

async function executeSQL(sql: string) {
  // Try direct SQL execution endpoint
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    // Try alternative endpoint
    const altResponse = await fetch(
      `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ACCESS_TOKEN,
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!altResponse.ok) {
      const error = await altResponse.text();
      console.error(`SQL execution failed: ${error}`);
      return false;
    }
    return await altResponse.json();
  }

  return await response.json();
}

async function main() {
  console.log('🔒 Applying RLS policies via Supabase Management API...\n');

  const migrations = [
    {
      name: 'enable_rls_portfolios',
      sql: `
        BEGIN;
        ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS portfolios_select ON public.portfolios;
        DROP POLICY IF EXISTS portfolios_insert ON public.portfolios;
        DROP POLICY IF EXISTS portfolios_update ON public.portfolios;
        DROP POLICY IF EXISTS portfolios_delete ON public.portfolios;
        CREATE POLICY portfolios_select ON public.portfolios FOR SELECT TO authenticated USING (user_id = auth.uid());
        CREATE POLICY portfolios_insert ON public.portfolios FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
        CREATE POLICY portfolios_update ON public.portfolios FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
        CREATE POLICY portfolios_delete ON public.portfolios FOR DELETE TO authenticated USING (user_id = auth.uid());
        REVOKE ALL ON public.portfolios FROM anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
        COMMIT;
      `
    },
    {
      name: 'enable_rls_watchlists',
      sql: `
        BEGIN;
        ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS watchlists_select ON public.watchlists;
        DROP POLICY IF EXISTS watchlists_insert ON public.watchlists;
        DROP POLICY IF EXISTS watchlists_update ON public.watchlists;
        DROP POLICY IF EXISTS watchlists_delete ON public.watchlists;
        CREATE POLICY watchlists_select ON public.watchlists FOR SELECT TO authenticated USING (user_id = auth.uid());
        CREATE POLICY watchlists_insert ON public.watchlists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
        CREATE POLICY watchlists_update ON public.watchlists FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
        CREATE POLICY watchlists_delete ON public.watchlists FOR DELETE TO authenticated USING (user_id = auth.uid());
        REVOKE ALL ON public.watchlists FROM anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlists TO authenticated;
        COMMIT;
      `
    },
    {
      name: 'enable_rls_transactions',
      sql: `
        BEGIN;
        ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS transactions_select ON public.transactions;
        DROP POLICY IF EXISTS transactions_insert ON public.transactions;
        DROP POLICY IF EXISTS transactions_update ON public.transactions;
        DROP POLICY IF EXISTS transactions_delete ON public.transactions;
        CREATE POLICY transactions_select ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
        CREATE POLICY transactions_insert ON public.transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
        CREATE POLICY transactions_update ON public.transactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
        CREATE POLICY transactions_delete ON public.transactions FOR DELETE TO authenticated USING (user_id = auth.uid());
        REVOKE ALL ON public.transactions FROM anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
        COMMIT;
      `
    },
    {
      name: 'adjust_rls_transcripts',
      sql: `
        BEGIN;
        ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS transcripts_read ON public.transcripts;
        CREATE POLICY transcripts_read ON public.transcripts FOR SELECT TO anon, authenticated USING (true);
        REVOKE INSERT, UPDATE, DELETE ON public.transcripts FROM anon, authenticated;
        COMMIT;
      `
    }
  ];

  for (const migration of migrations) {
    console.log(`📝 Applying ${migration.name}...`);

    try {
      // Try migration endpoint first
      const result = await applyMigration(migration.name, migration.sql);
      console.log(`✅ ${migration.name} applied successfully`);
    } catch (err) {
      console.log(`⚠️  Migration endpoint failed, trying direct SQL...`);

      // Try direct SQL execution
      const sqlResult = await executeSQL(migration.sql);
      if (sqlResult) {
        console.log(`✅ ${migration.name} applied via SQL`);
      } else {
        console.error(`❌ Failed to apply ${migration.name}`);
        console.log('\n🚨 Please apply manually in Supabase Studio:');
        console.log('─'.repeat(60));
        console.log(migration.sql);
        console.log('─'.repeat(60));
      }
    }
  }

  console.log('\n✅ Process complete! Run "npm run security:check-rls" to verify.');
}

main().catch(console.error);