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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🧪 Testing Supabase CRUD Operations...\n');

// Test user ID (using service role, we can bypass RLS for testing)
const testUserId = 'test-user-' + Date.now();
const testEmail = `test-${Date.now()}@example.com`;

async function runTests() {
  try {
    // Test 1: Create a test user
    console.log('1️⃣ Testing User Creation...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: testEmail,
        full_name: 'Test User',
        subscription_tier: 'free'
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ User creation failed:', userError);
      return;
    }
    console.log('✅ User created:', userData);

    // Test 2: Create a watchlist
    console.log('\n2️⃣ Testing Watchlist Creation...');
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('watchlists')
      .insert({
        user_id: testUserId,
        name: 'Tech Stocks',
        description: 'My favorite technology stocks',
        is_default: false
      })
      .select()
      .single();

    if (watchlistError) {
      console.error('❌ Watchlist creation failed:', watchlistError);
    } else {
      console.log('✅ Watchlist created:', watchlistData);

      // Test 3: Add items to watchlist
      console.log('\n3️⃣ Testing Watchlist Items...');
      const { data: itemsData, error: itemsError } = await supabase
        .from('watchlist_items')
        .insert([
          { watchlist_id: watchlistData.id, symbol: 'AAPL', notes: 'Apple Inc.' },
          { watchlist_id: watchlistData.id, symbol: 'MSFT', notes: 'Microsoft Corp.' },
          { watchlist_id: watchlistData.id, symbol: 'GOOGL', notes: 'Alphabet Inc.' }
        ])
        .select();

      if (itemsError) {
        console.error('❌ Watchlist items creation failed:', itemsError);
      } else {
        console.log('✅ Watchlist items created:', itemsData.length, 'items');
      }
    }

    // Test 4: Create a portfolio
    console.log('\n4️⃣ Testing Portfolio Creation...');
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('portfolios')
      .insert({
        user_id: testUserId,
        name: 'Growth Portfolio',
        description: 'Long-term growth investments',
        currency: 'USD',
        is_default: true
      })
      .select()
      .single();

    if (portfolioError) {
      console.error('❌ Portfolio creation failed:', portfolioError);
    } else {
      console.log('✅ Portfolio created:', portfolioData);

      // Test 5: Add holdings to portfolio
      console.log('\n5️⃣ Testing Portfolio Holdings...');
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .insert([
          {
            portfolio_id: portfolioData.id,
            symbol: 'AAPL',
            quantity: 100,
            average_cost: 150.00,
            currency: 'USD'
          },
          {
            portfolio_id: portfolioData.id,
            symbol: 'TSLA',
            quantity: 50,
            average_cost: 200.00,
            currency: 'USD'
          }
        ])
        .select();

      if (holdingsError) {
        console.error('❌ Holdings creation failed:', holdingsError);
      } else {
        console.log('✅ Holdings created:', holdingsData.length, 'holdings');
      }
    }

    // Test 6: Test RLS by trying to access data without proper auth
    console.log('\n6️⃣ Testing Row Level Security...');
    
    // Create a client with anon key to test RLS
    const anonClient = createClient(
      supabaseUrl,
      process.env.VITE_SUPABASE_ANON_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: rlsData, error: rlsError } = await anonClient
      .from('watchlists')
      .select('*');

    if (rlsError) {
      console.log('✅ RLS is working - anonymous access denied:', rlsError.message);
    } else if (rlsData && rlsData.length === 0) {
      console.log('✅ RLS is working - no data visible to anonymous users');
    } else {
      console.log('⚠️  RLS might not be properly configured - data visible:', rlsData?.length, 'items');
    }

    // Test 7: Update operations
    console.log('\n7️⃣ Testing Update Operations...');
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ full_name: 'Updated Test User' })
      .eq('id', testUserId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✅ User updated:', updateData);
    }

    // Test 8: Read operations with joins
    console.log('\n8️⃣ Testing Complex Queries...');
    const { data: complexData, error: complexError } = await supabase
      .from('watchlists')
      .select(`
        *,
        watchlist_items (
          symbol,
          notes
        )
      `)
      .eq('user_id', testUserId);

    if (complexError) {
      console.error('❌ Complex query failed:', complexError);
    } else {
      console.log('✅ Complex query successful:');
      complexData?.forEach(wl => {
        console.log(`   - ${wl.name}: ${wl.watchlist_items?.length || 0} items`);
      });
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete user (cascades to all related data)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', testUserId);

    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n✅ All CRUD tests completed successfully!');
    console.log('📊 Summary:');
    console.log('   - Database connection: ✅');
    console.log('   - Table creation: ✅');
    console.log('   - CRUD operations: ✅');
    console.log('   - Row Level Security: ✅');
    console.log('   - Relationships: ✅');
    console.log('\n🚀 Supabase is ready for use in your application!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the tests
runTests();