/**
 * Test complete realtime flow by inserting quotes and checking if frontend receives them
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

// Create client for publishing (service key if available, otherwise anon)
const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : createClient(supabaseUrl, supabaseAnonKey);

async function simulateRealtimeQuotes() {
  console.log('🚀 Starting realtime quote simulation...\n');
  console.log('📱 Open the Alfalyzer app in your browser and navigate to:');
  console.log('   - Find Stocks page');
  console.log('   - Stock Charts page (for AAPL)');
  console.log('   - Intrinsic Value (search for AAPL)');
  console.log('\n⚡ Make sure "Tempo Real" toggle is ON (green)\n');
  
  console.log('⏳ Starting in 5 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
  let iteration = 0;
  
  const interval = setInterval(async () => {
    iteration++;
    
    for (const symbol of symbols) {
      // Generate realistic price movements
      const basePrice = {
        'AAPL': 195,
        'GOOGL': 155,
        'MSFT': 420,
        'TSLA': 260
      }[symbol] || 100;
      
      // Random walk with slight trend
      const trend = Math.sin(iteration / 10) * 0.02; // 2% wave
      const noise = (Math.random() - 0.5) * 0.01; // 1% random
      const priceMultiplier = 1 + trend + noise;
      
      const price = Number((basePrice * priceMultiplier).toFixed(2));
      const change = Number((price - basePrice).toFixed(2));
      const changePercent = Number(((change / basePrice) * 100).toFixed(2));
      
      const quote = {
        symbol,
        price,
        change,
        change_percent: changePercent,
        volume: Math.floor(10000000 + Math.random() * 5000000),
        timestamp: new Date().toISOString()
      };
      
      try {
        const { error } = await supabase
          .from('realtime_quotes')
          .insert(quote);
          
        if (error) {
          console.error(`❌ Error inserting ${symbol}:`, error.message);
        } else {
          console.log(`📊 ${new Date().toLocaleTimeString()} - ${symbol}: $${price} (${change >= 0 ? '+' : ''}${changePercent}%)`);
        }
      } catch (err) {
        console.error(`❌ Error:`, err);
      }
    }
    
    console.log(''); // Empty line between updates
  }, 3000); // Update every 3 seconds
  
  // Run for 2 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n✅ Simulation completed!');
    console.log('📊 Check your browser to see if prices were updating in real-time');
    process.exit(0);
  }, 120000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping simulation...');
  process.exit(0);
});

// Run simulation
simulateRealtimeQuotes().catch(console.error);