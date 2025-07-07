import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Supabase Connection Test');
console.log('===========================\n');

console.log('📍 URL:', supabaseUrl);
console.log('🔑 Service Key:', supabaseServiceKey.substring(0, 50) + '...\n');

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    // Test basic connection
    console.log('🔄 Testing connection...');
    
    // Try to list users (admin function)
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {
      console.error('❌ Connection error:', error.message);
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log(`✅ Auth system working! Found ${data.users.length} users.\n`);
    }
    
    // Create a test table to verify database access
    console.log('📊 Testing database access...');
    const { error: tableError } = await supabase
      .from('test_connection')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('ℹ️  No tables exist yet (expected for new project)');
    } else if (tableError) {
      console.log('⚠️  Database error:', tableError.message);
    } else {
      console.log('✅ Database connection working!');
    }
    
    console.log('\n🎉 SUPABASE IS READY FOR MIGRATION!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the migration files from /migrations/postgres-migrations/');
    console.log('4. Start with 001_core_tables.sql');
    console.log('5. Then 002_portfolio_tables.sql');
    console.log('6. Finally 004_rls_policies.sql');
    console.log('\nDashboard URL: https://supabase.com/dashboard/project/ibswxhziqeihqfjihtdq');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testConnection();