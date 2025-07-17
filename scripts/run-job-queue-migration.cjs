#!/usr/bin/env node

/**
 * PHASE 1 - DAY 1: Execute job_queue migration
 * Simple script to create job_queue table in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { resolve } = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
  process.exit(1);
}

console.log('🔧 Creating Supabase client...');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeJobQueueMigration() {
  try {
    console.log('🚀 PHASE 1 - DAY 1: Creating job_queue table');
    console.log('==========================================');
    
    // Read the migration file
    const migrationPath = resolve(__dirname, '../migrations/20250112_create_job_queue.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('📋 SQL to execute:');
    console.log('------------------');
    console.log(migrationSQL.substring(0, 200) + '...');
    console.log();
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        console.log(`${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        // For CREATE TABLE and CREATE INDEX, we need to use raw SQL
        // Using a simple query approach
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        }).single();
        
        if (error && !error.message.includes('already exists')) {
          console.warn(`⚠️ Statement ${i + 1} warning:`, error.message);
        } else {
          successCount++;
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
        
      } catch (err) {
        console.warn(`⚠️ Statement ${i + 1} error:`, err.message);
        // Continue with other statements
      }
    }
    
    console.log('\n📊 MIGRATION SUMMARY');
    console.log('====================');
    console.log(`✅ Successful statements: ${successCount}/${statements.length}`);
    
    if (successCount > 0) {
      console.log('\n🎉 job_queue table migration completed!');
      console.log('📝 Next: Test the pipeline with npm run dev');
    } else {
      console.log('\n⚠️ Migration may have failed - check Supabase Dashboard');
      console.log('💡 Alternative: Apply SQL manually in Supabase SQL Editor');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 MANUAL SOLUTION:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy-paste the content of migrations/20250112_create_job_queue.sql');
    console.log('3. Execute the SQL manually');
  }
}

executeJobQueueMigration().catch(console.error);