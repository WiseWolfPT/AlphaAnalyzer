#!/usr/bin/env npx tsx
/**
 * Check which tables actually exist in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avjnfessefxtfurayybp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMDQzNSwiZXhwIjoyMDY3OTA2NDM1fQ.NblNWyjz09cGRo6VBMY5zMscfDMX7v7yWXVMHgOwlq8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkTables() {
  console.log('🔍 Checking which tables exist in Supabase...\n');

  const tablesToCheck = [
    'portfolios',
    'watchlists',
    'transactions',
    'transcripts',
    'users',
    'profiles',
    'stocks',
    'quotes'
  ];

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`❌ ${table}: DOES NOT EXIST`);
        } else {
          console.log(`⚠️  ${table}: Exists but has error: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table}: EXISTS (${count ?? 0} rows)`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Error checking - ${err.message}`);
    }
  }

  console.log('\n📊 Now checking RLS status for EXISTING tables only...\n');

  // Re-check RLS with corrected table list
  const existingTables = ['portfolios', 'watchlists', 'transcripts']; // Remove transactions

  const anon = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q');

  for (const table of existingTables) {
    const { error } = await anon.from(table).select('*', { count: 'exact', head: true }).limit(1);

    if (error) {
      console.log(`✅ ${table}: RLS ENFORCED (anon blocked)`);
    } else {
      console.log(`❌ ${table}: WARNING - anon can read!`);
    }
  }
}

checkTables().catch(console.error);