#!/usr/bin/env tsx

/**
 * Setup cache table in Supabase
 * Run this script to create the cache_quotes table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || 'https://avjnfessefxtfurayybp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required');
  process.exit(1);
}

async function setupCacheTable() {
  console.log('🔧 Setting up cache table in Supabase...');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read SQL file
    const sqlPath = join(__dirname, '../server/db/migrations/create-cache-quotes-table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('📝 Executing SQL migration...');
    
    // Execute SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query (may not work with all SQL)
      console.log('⚠️ exec_sql not available, trying alternative method...');
      
      // For now, we'll need to run this SQL directly in Supabase dashboard
      console.log('\n📋 Please run the following SQL in your Supabase SQL editor:');
      console.log('🔗 URL: https://supabase.com/dashboard/project/avjnfessefxtfurayybp/sql');
      console.log('\n' + sql);
      
      return;
    }
    
    console.log('✅ Cache table created successfully!');
    
    // Test the table
    console.log('\n🧪 Testing cache table...');
    const testKey = 'test_' + Date.now();
    const testData = { symbol: 'TEST', price: 123.45 };
    
    // Insert test data
    const { error: insertError } = await supabase
      .from('cache_quotes')
      .insert({
        key: testKey,
        data: testData,
        expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minute
        provider: 'test'
      });
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      return;
    }
    
    // Read test data
    const { data: readData, error: readError } = await supabase
      .from('cache_quotes')
      .select('*')
      .eq('key', testKey)
      .single();
    
    if (readError) {
      console.error('❌ Read test failed:', readError);
      return;
    }
    
    console.log('✅ Test successful! Cache table is working.');
    console.log('📊 Test data:', readData);
    
    // Clean up test data
    await supabase
      .from('cache_quotes')
      .delete()
      .eq('key', testKey);
    
  } catch (error) {
    console.error('❌ Error setting up cache table:', error);
  }
}

// Run setup
setupCacheTable().catch(console.error);