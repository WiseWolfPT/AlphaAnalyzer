#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Inspecting Supabase Schema...\n');

async function inspectSchema() {
  try {
    // Get one row from each table to see the structure
    const tables = [
      'users',
      'watchlists',
      'watchlist_items',
      'portfolios',
      'portfolio_holdings'
    ];

    for (const table of tables) {
      console.log(`\n📊 Table: ${table}`);
      console.log('─'.repeat(50));
      
      try {
        // First, try to get a single row to see columns
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ Error: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log('✅ Columns found:');
          Object.keys(data[0]).forEach(col => {
            const value = data[0][col];
            const type = value === null ? 'null' : typeof value;
            console.log(`   - ${col}: ${type}`);
          });
        } else {
          console.log('⚠️  Table exists but is empty');
          
          // Try to insert a dummy row to see what columns are expected
          const { error: insertError } = await supabase
            .from(table)
            .insert({})
            .select();
            
          if (insertError && insertError.message) {
            // Parse error message to find required columns
            console.log('📝 From error message:');
            console.log(`   ${insertError.message}`);
          }
        }
      } catch (e) {
        console.log(`❌ Failed to inspect: ${e}`);
      }
    }

    // Try to get table information from information_schema
    console.log('\n\n📋 Checking Information Schema...');
    console.log('─'.repeat(50));
    
    // Check users table columns specifically
    const { data: userColumns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' })
      .single();
      
    if (columnsError) {
      console.log('ℹ️  Cannot access information_schema directly');
      
      // Try alternative approach - check auth.users
      console.log('\n🔐 Checking auth.users structure...');
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      if (!authError && authData?.users && authData.users.length > 0) {
        console.log('✅ Auth user structure:');
        const user = authData.users[0];
        Object.keys(user).forEach(key => {
          console.log(`   - ${key}`);
        });
      }
    } else {
      console.log('✅ Users table columns:', userColumns);
    }

  } catch (error) {
    console.error('❌ Schema inspection failed:', error);
  }
}

// Run the inspection
inspectSchema();