/**
 * Test direct Supabase realtime publishing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be configured');
  process.exit(1);
}

// Create client for listening (anon key)
const supabaseListener = createClient(supabaseUrl, supabaseAnonKey);

// Create client for publishing (service key if available, otherwise anon)
const supabasePublisher = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(supabaseUrl, supabaseAnonKey);

async function testRealtimeDirectly() {
  console.log('🚀 Testing Supabase Realtime directly...\n');

  // 1. Subscribe to channel
  console.log('1️⃣ Subscribing to realtime channel...');
  const channel = supabaseListener
    .channel('stock-quotes')
    .on(
      'broadcast',
      { event: 'quote-update' },
      (payload) => {
        console.log('📨 Event received:', {
          symbol: payload.payload.symbol,
          price: payload.payload.price,
          change: payload.payload.change,
          timestamp: new Date(payload.payload.timestamp).toLocaleString()
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
    });

  // Wait for subscription
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Publish test event
  console.log('\n2️⃣ Publishing test event...');
  const testQuote = {
    symbol: 'AAPL',
    price: 195.42,
    change: 2.15,
    change_percent: 1.11,
    volume: 45678900,
    timestamp: new Date().toISOString(),
    provider: 'test'
  };

  const { error } = await channel.send({
    type: 'broadcast',
    event: 'quote-update',
    payload: testQuote
  });

  if (error) {
    console.error('❌ Error publishing event:', error);
  } else {
    console.log('✅ Event published successfully');
  }

  // 3. Test database insert
  console.log('\n3️⃣ Testing database insert to realtime_quotes...');
  const { data: insertData, error: insertError } = await supabasePublisher
    .from('realtime_quotes')
    .insert({
      symbol: testQuote.symbol,
      price: testQuote.price,
      change: testQuote.change,
      change_percent: testQuote.change_percent,
      volume: testQuote.volume,
      timestamp: testQuote.timestamp
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error inserting to database:', insertError);
  } else {
    console.log('✅ Data inserted to database:', insertData);
  }

  // 4. Wait for any broadcast events
  console.log('\n⏳ Waiting 5 seconds for events...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 5. Check realtime_quotes table
  console.log('\n4️⃣ Checking realtime_quotes table...');
  const { data: realtimeData, error: realtimeError } = await supabaseListener
    .from('realtime_quotes')
    .select('*')
    .eq('symbol', 'AAPL')
    .order('timestamp', { ascending: false })
    .limit(5);

  if (realtimeError) {
    console.error('❌ Error reading realtime_quotes:', realtimeError);
  } else if (realtimeData && realtimeData.length > 0) {
    console.log('✅ Recent quotes in database:');
    realtimeData.forEach((quote, index) => {
      console.log(`   ${index + 1}. ${quote.symbol}: $${quote.price} (${new Date(quote.timestamp).toLocaleString()})`);
    });
  } else {
    console.log('⚠️ No data found in realtime_quotes');
  }

  // Cleanup
  console.log('\n🏁 Test completed. Unsubscribing...');
  await channel.unsubscribe();
  process.exit(0);
}

// Run test
testRealtimeDirectly().catch(console.error);