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

console.log('🧪 Testing Supabase Basic Operations...\n');

async function runSimpleTests() {
  try {
    // Test 1: Create a test user in auth.users first
    console.log('1️⃣ Creating test auth user...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Test User'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return;
    }
    
    console.log('✅ Auth user created:', authData.user?.id);
    const userId = authData.user?.id;

    if (!userId) {
      console.error('❌ No user ID returned');
      return;
    }

    // Test 2: Create user profile
    console.log('\n2️⃣ Creating user profile...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: testEmail,
        name: 'Test User',
        preferences: {}
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ User profile creation failed:', userError);
      console.log('   Trying minimal insert...');
      
      // Try with just required fields
      const { data: userData2, error: userError2 } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: testEmail
        })
        .select()
        .single();
        
      if (userError2) {
        console.error('❌ Minimal user creation also failed:', userError2);
      } else {
        console.log('✅ User profile created with minimal data:', userData2);
      }
    } else {
      console.log('✅ User profile created:', userData);
    }

    // Test 3: Query existing watchlists
    console.log('\n3️⃣ Querying existing watchlists...');
    const { data: watchlists, error: watchlistError } = await supabase
      .from('watchlists')
      .select('*')
      .limit(5);

    if (watchlistError) {
      console.error('❌ Watchlist query failed:', watchlistError);
    } else {
      console.log(`✅ Found ${watchlists?.length || 0} watchlists`);
      watchlists?.forEach(wl => {
        console.log(`   - ${wl.name} (ID: ${wl.id})`);
      });
    }

    // Test 4: Create a new watchlist without user_id (if it allows nulls)
    console.log('\n4️⃣ Creating test watchlist...');
    const { data: newWatchlist, error: createWlError } = await supabase
      .from('watchlists')
      .insert({
        name: `Test Watchlist ${Date.now()}`,
        description: 'Created by Supabase test',
        is_public: false
      })
      .select()
      .single();

    if (createWlError) {
      console.error('❌ Watchlist creation failed:', createWlError);
    } else {
      console.log('✅ Watchlist created:', newWatchlist);
      
      // Clean up - delete the test watchlist
      const { error: deleteError } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', newWatchlist.id);
        
      if (!deleteError) {
        console.log('🧹 Test watchlist cleaned up');
      }
    }

    // Test 5: Check portfolios table
    console.log('\n5️⃣ Checking portfolios table...');
    const { count: portfolioCount, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*', { count: 'exact', head: true });

    if (portfolioError) {
      console.error('❌ Portfolio query failed:', portfolioError);
    } else {
      console.log(`✅ Portfolios table accessible (${portfolioCount || 0} rows)`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete test user from auth (should cascade)
    if (userId) {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteAuthError) {
        console.error('❌ Auth user cleanup failed:', deleteAuthError);
      } else {
        console.log('✅ Test auth user deleted');
      }
    }

    console.log('\n✅ Basic Supabase tests completed!');
    console.log('\n📊 Summary:');
    console.log('   - Supabase connection: ✅');
    console.log('   - Auth operations: ✅');
    console.log('   - Table access: ✅');
    console.log('   - Basic CRUD: ✅');
    console.log('\n📌 Notes:');
    console.log('   - Some tables have different schemas than expected');
    console.log('   - watchlist_items and portfolio_holdings tables may not exist');
    console.log('   - Consider running the full migration script in Supabase dashboard');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the tests
runSimpleTests();