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

console.log('🔍 Testing Supabase Connection...\n');
console.log(`📍 URL: ${supabaseUrl}`);
console.log(`🔑 Key: ${supabaseKey ? '✅ Present' : '❌ Missing'}\n`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    console.log('📊 Testing database connection...');
    
    // Test 1: List tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10);
    
    if (tablesError) {
      // Try a simpler query
      console.log('📊 Trying alternative method...');
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (testError && testError.code === '42P01') {
        console.log('⚠️  Table "users" does not exist yet');
      } else if (testError) {
        throw testError;
      }
    } else {
      console.log('✅ Connected to Supabase successfully!');
      console.log(`📋 Found ${tables?.length || 0} tables in public schema`);
      tables?.forEach(t => console.log(`   - ${t.table_name}`));
    }
    
    // Test 2: Check if we can access auth functions
    console.log('\n🔐 Testing auth capabilities...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (authError) {
      console.log('⚠️  Auth admin functions not accessible (this is normal with anon key)');
    } else {
      console.log('✅ Auth admin functions accessible');
      console.log(`   Total users: ${users?.length || 0}`);
    }
    
    // Test 3: Try to create a test table
    console.log('\n🏗️  Testing table creation...');
    const { error: createError } = await supabase.rpc('create_test_table', {});
    
    if (createError && createError.code === '42883') {
      console.log('ℹ️  RPC function not found (expected)');
    } else if (createError) {
      console.log('ℹ️  Cannot create tables via RPC:', createError.message);
    }
    
    console.log('\n✅ Supabase connection test completed!');
    console.log('📌 Next steps:');
    console.log('   1. Create tables using Supabase dashboard or migration scripts');
    console.log('   2. Set up Row Level Security (RLS) policies');
    console.log('   3. Test CRUD operations');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testConnection();