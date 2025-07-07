#!/usr/bin/env tsx
/**
 * Migration script from SQLite to Supabase
 * 
 * This script migrates all data from the local SQLite database to Supabase
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../shared/schema';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize SQLite connection
const sqlitePath = process.env.DATABASE_PATH || path.join(__dirname, '../dev.db');
console.log(`📁 SQLite database path: ${sqlitePath}`);

const sqlite = new Database(sqlitePath);
const db = drizzle(sqlite, { schema });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration functions
async function migrateUsers() {
  console.log('\n🔄 Migrating users...');
  
  try {
    // Get all users from SQLite
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`  Found ${users.length} users to migrate`);
    
    if (users.length === 0) {
      console.log('  No users to migrate');
      return;
    }
    
    // Migrate each user
    for (const user of users) {
      try {
        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            username: user.username,
            role: user.role
          }
        });
        
        if (authError) {
          console.error(`  ❌ Failed to create auth user for ${user.email}:`, authError.message);
          continue;
        }
        
        // Create user record in users table
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authUser!.user.id,
            email: user.email,
            created_at: user.created_at,
            updated_at: user.updated_at
          });
        
        if (dbError) {
          console.error(`  ❌ Failed to create user record for ${user.email}:`, dbError.message);
          // Try to delete the auth user to maintain consistency
          await supabase.auth.admin.deleteUser(authUser!.user.id);
        } else {
          console.log(`  ✅ Migrated user: ${user.email}`);
        }
      } catch (error) {
        console.error(`  ❌ Error migrating user ${user.email}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching users from SQLite:', error);
  }
}

async function migrateStocks() {
  console.log('\n🔄 Migrating stocks...');
  
  try {
    const stocks = sqlite.prepare('SELECT * FROM stocks').all();
    console.log(`  Found ${stocks.length} stocks to migrate`);
    
    if (stocks.length === 0) {
      console.log('  No stocks to migrate');
      return;
    }
    
    // Batch insert stocks
    const stocksToInsert = stocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange || null,
      sector: stock.sector || null,
      industry: stock.industry || null,
      market_cap: stock.market_cap || null,
      created_at: stock.last_updated || new Date().toISOString(),
      updated_at: stock.last_updated || new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('stocks')
      .upsert(stocksToInsert, { onConflict: 'symbol' });
    
    if (error) {
      console.error('  ❌ Failed to migrate stocks:', error.message);
    } else {
      console.log(`  ✅ Migrated ${stocks.length} stocks`);
    }
  } catch (error) {
    console.error('❌ Error migrating stocks:', error);
  }
}

async function migrateWatchlists() {
  console.log('\n🔄 Migrating watchlists...');
  
  try {
    // Get watchlists
    const watchlists = sqlite.prepare('SELECT * FROM watchlists').all();
    console.log(`  Found ${watchlists.length} watchlists to migrate`);
    
    if (watchlists.length === 0) {
      console.log('  No watchlists to migrate');
      return;
    }
    
    // Get user email to ID mapping
    const { data: users } = await supabase.from('users').select('id, email');
    const userMap = new Map(users?.map(u => [u.email, u.id]) || []);
    
    // Also try to map by user_id if it's an email
    const sqliteUsers = sqlite.prepare('SELECT * FROM users').all();
    for (const user of sqliteUsers) {
      if (user.email && !userMap.has(user.user_id)) {
        const supabaseUser = users?.find(u => u.email === user.email);
        if (supabaseUser) {
          userMap.set(user.user_id || user.id.toString(), supabaseUser.id);
        }
      }
    }
    
    for (const watchlist of watchlists) {
      try {
        // Find the Supabase user ID
        const supabaseUserId = userMap.get(watchlist.user_id) || userMap.get(watchlist.user_id.toString());
        
        if (!supabaseUserId) {
          console.warn(`  ⚠️ Could not find user for watchlist "${watchlist.name}" (user_id: ${watchlist.user_id})`);
          continue;
        }
        
        // Create watchlist
        const { data: newWatchlist, error: watchlistError } = await supabase
          .from('watchlists')
          .insert({
            user_id: supabaseUserId,
            name: watchlist.name,
            description: null,
            is_default: watchlist.name === 'My Watchlist',
            created_at: watchlist.created_at || new Date().toISOString()
          })
          .select()
          .single();
        
        if (watchlistError) {
          console.error(`  ❌ Failed to create watchlist "${watchlist.name}":`, watchlistError.message);
          continue;
        }
        
        // Get watchlist stocks
        const watchlistStocks = sqlite
          .prepare('SELECT * FROM watchlist_stocks WHERE watchlist_id = ?')
          .all(watchlist.id);
        
        if (watchlistStocks.length > 0) {
          const itemsToInsert = watchlistStocks.map(ws => ({
            watchlist_id: newWatchlist.id,
            symbol: ws.stock_symbol,
            added_at: ws.added_at || new Date().toISOString()
          }));
          
          const { error: itemsError } = await supabase
            .from('watchlist_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            console.error(`  ❌ Failed to add items to watchlist "${watchlist.name}":`, itemsError.message);
          } else {
            console.log(`  ✅ Migrated watchlist "${watchlist.name}" with ${watchlistStocks.length} stocks`);
          }
        } else {
          console.log(`  ✅ Migrated watchlist "${watchlist.name}" (empty)`);
        }
      } catch (error) {
        console.error(`  ❌ Error migrating watchlist "${watchlist.name}":`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error migrating watchlists:', error);
  }
}

async function migrateTranscripts() {
  console.log('\n🔄 Migrating transcripts...');
  
  try {
    const transcripts = sqlite.prepare('SELECT * FROM transcripts').all();
    console.log(`  Found ${transcripts.length} transcripts to migrate`);
    
    if (transcripts.length === 0) {
      console.log('  No transcripts to migrate');
      return;
    }
    
    // Get user mapping
    const { data: users } = await supabase.from('users').select('id, email');
    const userMap = new Map(users?.map(u => [u.email, u.id]) || []);
    
    for (const transcript of transcripts) {
      try {
        const transcriptData: any = {
          ticker: transcript.ticker,
          company_name: transcript.company_name,
          quarter: transcript.quarter,
          year: transcript.year,
          call_date: transcript.call_date || null,
          call_time: transcript.call_time || null,
          raw_transcript: transcript.raw_transcript || null,
          ai_summary: transcript.ai_summary ? JSON.parse(transcript.ai_summary) : null,
          key_metrics: transcript.key_metrics ? JSON.parse(transcript.key_metrics) : null,
          sentiment_score: transcript.sentiment_score || null,
          status: transcript.status || 'pending',
          created_at: transcript.created_at || new Date().toISOString(),
          updated_at: transcript.updated_at || new Date().toISOString(),
          published_at: transcript.published_at || null,
          view_count: transcript.view_count || 0
        };
        
        // Map published_by if it exists
        if (transcript.published_by) {
          const publisherId = userMap.get(transcript.published_by.toString());
          if (publisherId) {
            transcriptData.published_by = publisherId;
          }
        }
        
        const { error } = await supabase
          .from('transcripts')
          .insert(transcriptData);
        
        if (error) {
          console.error(`  ❌ Failed to migrate transcript ${transcript.ticker} ${transcript.quarter} ${transcript.year}:`, error.message);
        } else {
          console.log(`  ✅ Migrated transcript: ${transcript.ticker} ${transcript.quarter} ${transcript.year}`);
        }
      } catch (error) {
        console.error(`  ❌ Error migrating transcript:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error migrating transcripts:', error);
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting migration from SQLite to Supabase...\n');
  
  try {
    // Test Supabase connection
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      process.exit(1);
    }
    console.log('✅ Connected to Supabase successfully');
    
    // Run migrations in order
    await migrateUsers();
    await migrateStocks();
    await migrateWatchlists();
    await migrateTranscripts();
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    sqlite.close();
  }
}

// Run migration
migrate();