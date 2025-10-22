#!/usr/bin/env npx tsx
/**
 * Check table schemas to understand foreign key relationships
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avjnfessefxtfurayybp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMDQzNSwiZXhwIjoyMDY3OTA2NDM1fQ.NblNWyjz09cGRo6VBMY5zMscfDMX7v7yWXVMHgOwlq8';

async function checkSchemas() {
  console.log('📊 Checking Table Schemas for Foreign Key Relationships\n');
  console.log('=' .repeat(60) + '\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Tables to check
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

  for (const table of tables) {
    console.log(`\n📋 Table: ${table}`);
    console.log('-'.repeat(40));

    try {
      // Get one row to check structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`Error: ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`Columns: ${columns.join(', ')}`);

        // Check for owner columns
        const ownerColumns = columns.filter(col =>
          col.includes('user_id') ||
          col.includes('owner_id') ||
          col === 'id' && table === 'users' ||
          col === 'id' && table === 'profiles'
        );

        const foreignKeys = columns.filter(col =>
          col.includes('_id') &&
          !col.includes('user_id') &&
          !col.includes('owner_id')
        );

        if (ownerColumns.length > 0) {
          console.log(`✅ Owner column: ${ownerColumns.join(', ')}`);
        } else {
          console.log(`⚠️  No direct owner column found`);
        }

        if (foreignKeys.length > 0) {
          console.log(`🔗 Foreign keys: ${foreignKeys.join(', ')}`);
        }
      } else {
        console.log('Table is empty - checking structure via error message...');

        // Try to insert invalid data to see column requirements
        const { error: insertError } = await supabase
          .from(table)
          .insert({});

        if (insertError) {
          // Parse error to find required columns
          const errorStr = insertError.message;
          if (errorStr.includes('null value') || errorStr.includes('required')) {
            console.log(`Structure hint from error: ${errorStr.substring(0, 200)}`);
          }
        }
      }
    } catch (err) {
      console.log(`Error checking ${table}: ${err.message}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n🔍 Analysis Summary:\n');

  console.log('Tables WITH direct user_id:');
  console.log('- portfolios, watchlists, price_alerts, realtime_alerts, user_sessions\n');

  console.log('Tables with ID as owner reference:');
  console.log('- users (id = user), profiles (id = user)\n');

  console.log('Tables needing JOIN for ownership:');
  console.log('- portfolio_positions → portfolios.user_id');
  console.log('- watchlist_stocks → watchlists.user_id\n');
}

checkSchemas().catch(console.error);