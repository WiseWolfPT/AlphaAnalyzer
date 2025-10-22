#!/usr/bin/env npx tsx
/**
 * Check RLS for ACTUAL tables that exist in Supabase
 * Based on real table list from Supabase Studio
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avjnfessefxtfurayybp.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMDQzNSwiZXhwIjoyMDY3OTA2NDM1fQ.NblNWyjz09cGRo6VBMY5zMscfDMX7v7yWXVMHgOwlq8';

// Tables that contain user-specific data (from your list)
const USER_DATA_TABLES = [
  'portfolios',           // User portfolios
  'portfolio_positions',  // Portfolio positions
  'watchlists',          // User watchlists
  'watchlist_stocks',    // Watchlist items
  'profiles',            // User profiles
  'users',               // User accounts
  'price_alerts',        // User alerts
  'realtime_alerts',     // User realtime alerts
  'user_sessions',       // User sessions
];

// Tables that should be public or read-only
const PUBLIC_TABLES = [
  'stocks',              // Stock list
  'stock_prices',        // Price data
  'historical_prices',   // Historical data
  'realtime_quotes',     // Market quotes
  'api_cache',          // Cache data
  'cache_quotes',       // Quote cache
];

async function checkTableRLS() {
  console.log('🔒 RLS Security Audit for Real Tables\n');
  console.log('=' .repeat(60));

  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const service = createClient(SUPABASE_URL, SERVICE_KEY);

  // Check user data tables
  console.log('\n📊 USER DATA TABLES (should block anonymous access):\n');

  for (const table of USER_DATA_TABLES) {
    const anonResult = await anon.from(table).select('*', { count: 'exact', head: true }).limit(1);
    const serviceResult = await service.from(table).select('*', { count: 'exact', head: true }).limit(1);

    const anonCanRead = !anonResult.error || anonResult.error.code !== 'PGRST301';
    const serviceCanRead = !serviceResult.error;

    let status = '';
    let icon = '';

    if (!serviceCanRead) {
      status = 'TABLE ERROR';
      icon = '❓';
    } else if (anonCanRead) {
      status = '🚨 EXPOSED TO ANONYMOUS';
      icon = '❌';
    } else {
      status = '✅ PROTECTED (RLS active)';
      icon = '🔒';
    }

    console.log(`${icon} ${table.padEnd(25)} → ${status}`);
  }

  // Check public tables
  console.log('\n📖 PUBLIC/CACHE TABLES (typically allow read access):\n');

  for (const table of PUBLIC_TABLES) {
    const anonResult = await anon.from(table).select('*', { count: 'exact', head: true }).limit(1);
    const anonCanRead = !anonResult.error || anonResult.error.code !== 'PGRST301';

    const status = anonCanRead ? 'PUBLIC READ' : 'RESTRICTED';
    const icon = anonCanRead ? '📖' : '🔒';

    console.log(`${icon} ${table.padEnd(25)} → ${status}`);
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📋 SECURITY RECOMMENDATIONS:\n');

  const exposedTables = [];
  for (const table of USER_DATA_TABLES) {
    const { error } = await anon.from(table).select('*', { count: 'exact', head: true }).limit(1);
    if (!error || error.code !== 'PGRST301') {
      exposedTables.push(table);
    }
  }

  if (exposedTables.length === 0) {
    console.log('✅ All user data tables are properly protected!');
  } else {
    console.log('⚠️  The following user data tables are EXPOSED to anonymous access:');
    exposedTables.forEach(t => console.log(`   - ${t}`));
    console.log('\nThese tables need RLS policies to protect user data!');
  }
}

checkTableRLS().catch(console.error);