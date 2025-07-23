#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

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

console.log('🚀 Running Supabase Migration...\n');

// Read the migration SQL file
const migrationSQL = readFileSync(join(__dirname, 'supabase-migration.sql'), 'utf-8');

// Note: Supabase doesn't support running raw SQL through the client SDK
// You need to run this SQL in the Supabase Dashboard SQL Editor

console.log('📋 Migration SQL has been prepared.');
console.log('\n⚠️  IMPORTANT: Supabase client SDK cannot execute raw SQL migrations.');
console.log('\n📌 To apply this migration:');
console.log('   1. Go to your Supabase Dashboard: https://app.supabase.com');
console.log('   2. Select your project (avjnfessefxtfurayybp)');
console.log('   3. Navigate to SQL Editor');
console.log('   4. Copy and paste the contents of scripts/supabase-migration.sql');
console.log('   5. Click "Run" to execute the migration');
console.log('\n🔗 Direct link to SQL Editor:');
console.log(`   https://app.supabase.com/project/avjnfessefxtfurayybp/sql/new`);

// Create a test script to verify tables after migration
const testScript = `
-- Test if tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
`;

console.log('\n📝 After running the migration, test with this query:');
console.log(testScript);

// Save the migration status
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingTables() {
  console.log('\n🔍 Checking existing tables...');
  
  const tables = [
    'users',
    'watchlists',
    'watchlist_items',
    'portfolios',
    'portfolio_holdings',
    'portfolio_transactions',
    'stock_alerts',
    'user_preferences',
    'saved_searches',
    'activity_log'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error && error.code === '42P01') {
        console.log(`   ❌ ${table} - Not found`);
      } else if (error) {
        console.log(`   ⚠️  ${table} - Error: ${error.message}`);
      } else {
        console.log(`   ✅ ${table} - Exists (${count || 0} rows)`);
      }
    } catch (e) {
      console.log(`   ❌ ${table} - Error checking`);
    }
  }
}

// Check current status
await checkExistingTables();

console.log('\n✅ Migration preparation complete!');
console.log('📌 Next steps:');
console.log('   1. Run the migration in Supabase Dashboard');
console.log('   2. Execute npm run supabase:test to verify');
console.log('   3. Start using the database in your application');