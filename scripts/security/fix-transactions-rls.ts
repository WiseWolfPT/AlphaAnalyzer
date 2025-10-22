#!/usr/bin/env npx tsx
/**
 * Apply RLS specifically to transactions table
 * Using direct Supabase client with service role
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avjnfessefxtfurayybp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6InNlcnZpY2Ffcm9sZSIsImlhdCI6MTc1MjMzMDQzNSwiZXhwIjoyMDY3OTA2NDM1fQ.NblNWyjz09cGRo6VBMY5zMscfDMX7v7yWXVMHgOwlq8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function applyTransactionsRLS() {
  console.log('🔒 Attempting to fix transactions table RLS...\n');

  // Try different approaches
  const approaches = [
    // Approach 1: Using rpc if function exists
    async () => {
      console.log('Trying approach 1: RPC exec_sql...');
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
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
        `
      });
      if (error) throw error;
      return data;
    },

    // Approach 2: Direct REST API with service role
    async () => {
      console.log('Trying approach 2: Direct REST API...');
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: `
            BEGIN;
            ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS transactions_select ON public.transactions;
            CREATE POLICY transactions_select ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
            DROP POLICY IF EXISTS transactions_insert ON public.transactions;
            CREATE POLICY transactions_insert ON public.transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
            DROP POLICY IF EXISTS transactions_update ON public.transactions;
            CREATE POLICY transactions_update ON public.transactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
            DROP POLICY IF EXISTS transactions_delete ON public.transactions;
            CREATE POLICY transactions_delete ON public.transactions FOR DELETE TO authenticated USING (user_id = auth.uid());
            REVOKE ALL ON public.transactions FROM anon;
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
            COMMIT;
          `
        })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    },

    // Approach 3: Using pg endpoint
    async () => {
      console.log('Trying approach 3: PG endpoint...');
      const response = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS transactions_select ON public.transactions CASCADE;
            DROP POLICY IF EXISTS transactions_insert ON public.transactions CASCADE;
            DROP POLICY IF EXISTS transactions_update ON public.transactions CASCADE;
            DROP POLICY IF EXISTS transactions_delete ON public.transactions CASCADE;
            CREATE POLICY transactions_select ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
            CREATE POLICY transactions_insert ON public.transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
            CREATE POLICY transactions_update ON public.transactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
            CREATE POLICY transactions_delete ON public.transactions FOR DELETE TO authenticated USING (user_id = auth.uid());
            REVOKE ALL ON public.transactions FROM anon;
            GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
          `
        })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return await response.json();
    }
  ];

  // Try each approach
  for (let i = 0; i < approaches.length; i++) {
    try {
      const result = await approaches[i]();
      console.log(`✅ Success with approach ${i + 1}!`);
      return true;
    } catch (err) {
      console.log(`❌ Approach ${i + 1} failed:`, err.message?.substring(0, 100));
    }
  }

  console.log('\n🔴 All automated approaches failed.');
  console.log('\n📋 Please apply this SQL manually in Supabase Studio:');
  console.log('─'.repeat(60));
  console.log(`
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
  `);
  console.log('─'.repeat(60));

  return false;
}

async function verifyFix() {
  console.log('\n🔍 Verifying current RLS status...');

  const anon = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q');

  const { error } = await anon.from('transactions').select('*', { count: 'exact', head: true }).limit(1);

  if (error) {
    console.log('✅ Transactions table is NOW PROTECTED (anon blocked)');
    return true;
  } else {
    console.log('❌ Transactions table is STILL EXPOSED to anonymous access');
    return false;
  }
}

async function main() {
  const applied = await applyTransactionsRLS();

  if (applied) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for changes to propagate
    await verifyFix();
  }
}

main().catch(console.error);