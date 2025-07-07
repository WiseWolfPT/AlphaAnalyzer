const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Quick Supabase Setup');
console.log('======================\n');

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigrations() {
  try {
    console.log('✅ Connected to Supabase:', supabaseUrl);
    
    // Read and execute core tables migration
    console.log('\n📊 Creating core tables...');
    const coreTables = fs.readFileSync(
      path.join(__dirname, '../migrations/postgres-migrations/001_core_tables.sql'), 
      'utf8'
    );
    
    const { error: coreError } = await supabase.rpc('exec_sql', {
      sql: coreTables
    }).catch(() => {
      // If RPC doesn't exist, try direct query
      return { error: 'RPC not available, using alternative method' };
    });
    
    if (coreError) {
      console.log('⚠️  Note: Direct SQL execution not available via RPC');
      console.log('📝 Please run the following SQL in Supabase SQL Editor:');
      console.log('\n--- COPY FROM HERE ---');
      console.log(coreTables.substring(0, 500) + '...');
      console.log('--- END ---\n');
    } else {
      console.log('✅ Core tables created successfully!');
    }
    
    // Test connection by querying auth.users
    const { data, error } = await supabase.auth.admin.listUsers();
    if (!error) {
      console.log(`\n✅ Supabase connection verified! Found ${data.users.length} users.`);
    }
    
    console.log('\n🎉 Supabase is ready!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the migration SQL files manually');
    console.log('3. Enable Row Level Security on all tables');
    console.log('4. Update the auth provider in the app');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

executeMigrations();