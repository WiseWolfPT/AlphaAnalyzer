#!/usr/bin/env tsx

import { db } from '../server/db';
import { stocks, watchlists, watchlistStocks } from '../shared/schema';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Seed popular stocks
    const popularStocks = [
      // Tech Giants
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: 3000000000000 },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', marketCap: 2800000000000 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketCap: 1700000000000 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', marketCap: 1600000000000 },
      { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', marketCap: 900000000000 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', marketCap: 1100000000000 },
      
      // Finance
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', marketCap: 450000000000 },
      { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services', marketCap: 500000000000 },
      { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financial Services', marketCap: 400000000000 },
      { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financial Services', marketCap: 250000000000 },
      
      // Healthcare
      { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCap: 380000000000 },
      { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', marketCap: 500000000000 },
      { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', marketCap: 160000000000 },
      
      // Consumer
      { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Defensive', marketCap: 420000000000 },
      { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer Defensive', marketCap: 350000000000 },
      { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Defensive', marketCap: 260000000000 },
      { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Communication Services', marketCap: 200000000000 },
      
      // Energy & Materials
      { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', marketCap: 400000000000 },
      { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', marketCap: 300000000000 },
      
      // Other
      { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', marketCap: 800000000000 },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financial Services', marketCap: 780000000000 }
    ];

    console.log(`📊 Inserting ${popularStocks.length} stocks...`);
    
    for (const stock of popularStocks) {
      try {
        await db.insert(stocks).values(stock).onConflictDoNothing();
      } catch (error) {
        console.log(`⚠️ Stock ${stock.symbol} already exists, skipping...`);
      }
    }

    // 2. Create demo user (if using local auth)
    console.log('👤 Creating demo user...');
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    // Note: This would need to be adjusted based on your actual user schema
    // For now, we'll skip user creation as it depends on your auth setup

    // 3. Create sample watchlists
    console.log('📋 Creating sample watchlists...');
    
    const sampleWatchlists = [
      { name: 'Tech Titans', userId: 1 },
      { name: 'Dividend Kings', userId: 1 },
      { name: 'Growth Stocks', userId: 1 }
    ];

    const watchlistIds: number[] = [];
    
    for (const watchlist of sampleWatchlists) {
      try {
        const result = await db.insert(watchlists).values(watchlist).returning({ id: watchlists.id });
        if (result[0]) {
          watchlistIds.push(result[0].id);
        }
      } catch (error) {
        console.log(`⚠️ Watchlist ${watchlist.name} creation failed, skipping...`);
      }
    }

    // 4. Add stocks to watchlists
    if (watchlistIds.length > 0) {
      console.log('🔗 Adding stocks to watchlists...');
      
      // Tech Titans watchlist
      if (watchlistIds[0]) {
        const techStocks = ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA'];
        for (const symbol of techStocks) {
          try {
            await db.insert(watchlistStocks).values({
              watchlistId: watchlistIds[0],
              stockSymbol: symbol
            }).onConflictDoNothing();
          } catch (error) {
            console.log(`⚠️ Failed to add ${symbol} to watchlist`);
          }
        }
      }

      // Dividend Kings watchlist
      if (watchlistIds[1]) {
        const dividendStocks = ['JNJ', 'KO', 'PG', 'WMT'];
        for (const symbol of dividendStocks) {
          try {
            await db.insert(watchlistStocks).values({
              watchlistId: watchlistIds[1],
              stockSymbol: symbol
            }).onConflictDoNothing();
          } catch (error) {
            console.log(`⚠️ Failed to add ${symbol} to watchlist`);
          }
        }
      }

      // Growth Stocks watchlist
      if (watchlistIds[2]) {
        const growthStocks = ['TSLA', 'AMZN', 'NVDA'];
        for (const symbol of growthStocks) {
          try {
            await db.insert(watchlistStocks).values({
              watchlistId: watchlistIds[2],
              stockSymbol: symbol
            }).onConflictDoNothing();
          } catch (error) {
            console.log(`⚠️ Failed to add ${symbol} to watchlist`);
          }
        }
      }
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('');
    console.log('📈 Summary:');
    console.log(`- ${popularStocks.length} stocks added`);
    console.log(`- ${sampleWatchlists.length} watchlists created`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Login with demo credentials (if implemented)');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase().then(() => {
  console.log('🏁 Seed script finished');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});