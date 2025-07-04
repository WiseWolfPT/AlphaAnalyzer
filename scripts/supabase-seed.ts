/**
 * Supabase Seed Script - Roadmap V4
 * 
 * Creates minimal test data for development and testing:
 * - 5 test users (demo+N@alfalyzer.com)
 * - 20 random favorite stocks
 * - Sample watchlists and portfolios
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️  Development mode detected - Supabase not configured:');
  console.log('   - SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  console.log('\n🚀 Using local SQLite database for development.');
  console.log('   To use Supabase, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  console.log('   For production setup, see docs/DEPLOY_PRODUCTION.md\n');
  process.exit(0);
}

// Initialize Supabase client with service role key
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Sample stock symbols for seeding
const SAMPLE_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 
  'DIS', 'JPM', 'V', 'MA', 'WMT', 'HD', 'PG', 'JNJ', 'UNH', 'BAC',
  'XOM', 'CVX', 'PFE', 'KO', 'PEP', 'COST', 'ABBV', 'TMO', 'ACN', 'CRM'
];

interface TestUser {
  email: string;
  password: string;
  role: 'user' | 'admin';
  displayName: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'demo+1@alfalyzer.com',
    password: 'Demo123!@#',
    role: 'admin',
    displayName: 'Admin Demo'
  },
  {
    email: 'demo+2@alfalyzer.com', 
    password: 'Demo123!@#',
    role: 'user',
    displayName: 'User Demo 2'
  },
  {
    email: 'demo+3@alfalyzer.com',
    password: 'Demo123!@#', 
    role: 'user',
    displayName: 'User Demo 3'
  },
  {
    email: 'demo+4@alfalyzer.com',
    password: 'Demo123!@#',
    role: 'user', 
    displayName: 'User Demo 4'
  },
  {
    email: 'demo+5@alfalyzer.com',
    password: 'Demo123!@#',
    role: 'user',
    displayName: 'User Demo 5'
  }
];

/**
 * Create test users in Supabase Auth
 */
async function createTestUsers(): Promise<string[]> {
  console.log('👥 Creating test users...');
  const userIds: string[] = [];

  for (const user of TEST_USERS) {
    try {
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          role: user.role,
          displayName: user.displayName,
          createdBy: 'seed-script',
          createdAt: new Date().toISOString()
        }
      });

      if (error) {
        console.warn(`⚠️ Failed to create user ${user.email}:`, error.message);
        continue;
      }

      if (data.user) {
        userIds.push(data.user.id);
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      }

    } catch (error) {
      console.warn(`⚠️ Error creating user ${user.email}:`, error);
    }
  }

  return userIds;
}

/**
 * Create sample watchlists for users
 */
async function createSampleWatchlists(userIds: string[]): Promise<void> {
  console.log('📊 Creating sample watchlists...');

  for (const userId of userIds) {
    try {
      // Create a personal watchlist
      const { data: watchlist, error: watchlistError } = await supabase
        .from('watchlists')
        .insert({
          user_id: userId,
          name: 'My Portfolio',
          description: 'Main investment watchlist',
          is_public: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (watchlistError) {
        console.warn(`⚠️ Failed to create watchlist for user ${userId}:`, watchlistError.message);
        continue;
      }

      // Add random stocks to watchlist
      const randomStocks = SAMPLE_STOCKS
        .sort(() => Math.random() - 0.5)
        .slice(0, 5 + Math.floor(Math.random() * 5)); // 5-10 stocks

      const watchlistItems = randomStocks.map(symbol => ({
        watchlist_id: watchlist.id,
        symbol: symbol,
        added_at: new Date().toISOString(),
        notes: `Added via seed script for ${symbol}`
      }));

      const { error: itemsError } = await supabase
        .from('watchlist_items')
        .insert(watchlistItems);

      if (itemsError) {
        console.warn(`⚠️ Failed to add stocks to watchlist:`, itemsError.message);
      } else {
        console.log(`✅ Created watchlist with ${randomStocks.length} stocks for user ${userId.substring(0, 8)}...`);
      }

    } catch (error) {
      console.warn(`⚠️ Error creating watchlist for user ${userId}:`, error);
    }
  }
}

/**
 * Create sample portfolio data
 */
async function createSamplePortfolios(userIds: string[]): Promise<void> {
  console.log('💼 Creating sample portfolios...');

  for (const userId of userIds) {
    try {
      // Create a portfolio
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          user_id: userId,
          name: 'Main Portfolio',
          description: 'Primary investment portfolio',
          initial_value: 10000.00,
          current_value: 10000.00 + (Math.random() - 0.5) * 2000, // Random gain/loss
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (portfolioError) {
        console.warn(`⚠️ Failed to create portfolio for user ${userId}:`, portfolioError.message);
        continue;
      }

      // Add some portfolio positions
      const randomStocks = SAMPLE_STOCKS
        .sort(() => Math.random() - 0.5)
        .slice(0, 3 + Math.floor(Math.random() * 3)); // 3-6 positions

      const positions = randomStocks.map(symbol => ({
        portfolio_id: portfolio.id,
        symbol: symbol,
        quantity: Math.floor(Math.random() * 100) + 1,
        average_price: 50 + Math.random() * 200, // Random price between $50-250
        current_price: 50 + Math.random() * 200,
        purchased_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(), // Random date in last year
        created_at: new Date().toISOString()
      }));

      const { error: positionsError } = await supabase
        .from('portfolio_positions')
        .insert(positions);

      if (positionsError) {
        console.warn(`⚠️ Failed to add positions to portfolio:`, positionsError.message);
      } else {
        console.log(`✅ Created portfolio with ${positions.length} positions for user ${userId.substring(0, 8)}...`);
      }

    } catch (error) {
      console.warn(`⚠️ Error creating portfolio for user ${userId}:`, error);
    }
  }
}

/**
 * Create sample transcript data (for admin users)
 */
async function createSampleTranscripts(): Promise<void> {
  console.log('📝 Creating sample transcripts...');

  const sampleTranscripts = [
    {
      ticker: 'AAPL',
      company_name: 'Apple Inc.',
      quarter: 'Q4',
      year: 2024,
      call_date: '2024-02-01',
      raw_transcript: 'Sample earnings call transcript for Apple Q4 2024...',
      ai_summary: {
        highlights: ['Strong iPhone sales', 'Services growth', 'New product launches'],
        sentiment: 'positive',
        key_metrics: { revenue: '119.58B', eps: '2.18' }
      },
      status: 'published',
      published_at: new Date().toISOString(),
      view_count: Math.floor(Math.random() * 1000)
    },
    {
      ticker: 'MSFT',
      company_name: 'Microsoft Corporation',
      quarter: 'Q4',
      year: 2024,
      call_date: '2024-01-24',
      raw_transcript: 'Sample earnings call transcript for Microsoft Q4 2024...',
      ai_summary: {
        highlights: ['Azure growth', 'AI integration', 'Productivity suite expansion'],
        sentiment: 'positive',
        key_metrics: { revenue: '62.02B', eps: '2.93' }
      },
      status: 'published',
      published_at: new Date().toISOString(),
      view_count: Math.floor(Math.random() * 800)
    },
    {
      ticker: 'GOOGL',
      company_name: 'Alphabet Inc.',
      quarter: 'Q4',
      year: 2024,
      call_date: '2024-02-06',
      raw_transcript: 'Sample earnings call transcript for Alphabet Q4 2024...',
      ai_summary: {
        highlights: ['Search revenue growth', 'YouTube performance', 'Cloud expansion'],
        sentiment: 'positive',
        key_metrics: { revenue: '80.54B', eps: '1.64' }
      },
      status: 'published',
      published_at: new Date().toISOString(),
      view_count: Math.floor(Math.random() * 600)
    }
  ];

  try {
    const { error } = await supabase
      .from('transcripts')
      .insert(sampleTranscripts);

    if (error) {
      console.warn('⚠️ Failed to create sample transcripts:', error.message);
    } else {
      console.log(`✅ Created ${sampleTranscripts.length} sample transcripts`);
    }

  } catch (error) {
    console.warn('⚠️ Error creating transcripts:', error);
  }
}

/**
 * Main seed function
 */
async function runSeed(): Promise<void> {
  console.log('🌱 Starting Supabase seed process...');
  console.log('📍 Supabase URL:', supabaseUrl);
  
  try {
    // Test Supabase connection
    const { error: connectionError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Failed to connect to Supabase:', connectionError.message);
      console.error('💡 Make sure your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct');
      process.exit(1);
    }

    console.log('✅ Connected to Supabase successfully');

    // Create test users
    const userIds = await createTestUsers();
    console.log(`✅ Created ${userIds.length} test users`);

    if (userIds.length > 0) {
      // Create sample data for users
      await createSampleWatchlists(userIds);
      await createSamplePortfolios(userIds);
    }

    // Create sample transcripts
    await createSampleTranscripts();

    console.log('\n🎉 Seed process completed successfully!');
    console.log('\n📋 Test Users Created:');
    TEST_USERS.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - Password: ${user.password}`);
    });
    
    console.log('\n💡 You can now:');
    console.log('   - Login with any of the test users above');
    console.log('   - Access admin features with demo+1@alfalyzer.com');
    console.log('   - View sample watchlists and portfolios');
    console.log('   - Test transcript functionality');

  } catch (error) {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

export { runSeed };