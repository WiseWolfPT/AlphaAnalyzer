import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseData() {
  console.log('🔍 Checking Supabase data...\n');

  try {
    // 1. List all tables
    console.log('📋 Listing tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('Note: Cannot list tables directly, checking known tables...\n');
    } else if (tables) {
      console.log('Tables found:', tables.map(t => t.table_name).join(', '));
    }

    // 2. Count stocks
    console.log('\n📊 Checking stocks table...');
    const { count: stocksCount, error: stocksError } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true });

    if (stocksError) {
      console.log('❌ Error accessing stocks table:', stocksError.message);
    } else {
      console.log(`✅ Stocks table has ${stocksCount || 0} records`);
      
      // Get a sample stock
      const { data: sampleStock } = await supabase
        .from('stocks')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleStock) {
        console.log('Sample stock:', JSON.stringify(sampleStock, null, 2));
      }
    }

    // 3. Count historical_prices
    console.log('\n📈 Checking historical_prices table...');
    const { count: pricesCount, error: pricesError } = await supabase
      .from('historical_prices')
      .select('*', { count: 'exact', head: true });

    if (pricesError) {
      console.log('❌ Error accessing historical_prices table:', pricesError.message);
    } else {
      console.log(`✅ Historical_prices table has ${pricesCount || 0} records`);
      
      // Get recent prices
      const { data: recentPrices } = await supabase
        .from('historical_prices')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);
      
      if (recentPrices && recentPrices.length > 0) {
        console.log(`Most recent price date: ${recentPrices[0].date}`);
      }
    }

    // 4. Check rate_limits
    console.log('\n⏱️ Checking rate_limits table...');
    const { data: rateLimits, error: rateLimitsError } = await supabase
      .from('rate_limits')
      .select('*');

    if (rateLimitsError) {
      console.log('❌ Error accessing rate_limits table:', rateLimitsError.message);
    } else {
      console.log(`✅ Rate_limits table has ${rateLimits?.length || 0} records`);
      if (rateLimits && rateLimits.length > 0) {
        console.log('Rate limits:', JSON.stringify(rateLimits, null, 2));
      }
    }

    // 5. Try to list all public tables using a different approach
    console.log('\n📂 Attempting to discover all tables...');
    const knownTables = [
      'stocks',
      'historical_prices',
      'rate_limits',
      'users',
      'watchlists',
      'watchlist_items',
      'portfolios',
      'portfolio_items',
      'transcripts',
      'earnings_calendar',
      'market_movers',
      'api_usage',
      'error_logs'
    ];

    for (const tableName of knownTables) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`  ✅ ${tableName}: ${count || 0} records`);
      } else if (error.code === '42P01') {
        // Table doesn't exist
        console.log(`  ⚠️  ${tableName}: table does not exist`);
      } else {
        console.log(`  ❌ ${tableName}: ${error.message}`);
      }
    }

    console.log('\n✅ Supabase data check complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkSupabaseData();