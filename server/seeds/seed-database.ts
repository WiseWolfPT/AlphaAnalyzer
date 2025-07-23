import { db } from '../db/index';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { ServerMarketDataService } from '../services/market-data-service';
import { createCacheTables } from '../db/cache-schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AssetData {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  country: string;
  currency: string;
  website_url?: string;
  description?: string;
}

interface SeedData {
  indices: AssetData[];
  portuguese_stocks: AssetData[];
  us_stocks: AssetData[];
  crypto: AssetData[];
}

class DatabaseSeeder {
  private marketDataService: ServerMarketDataService;
  
  constructor() {
    this.marketDataService = new ServerMarketDataService();
  }

  async seed() {
    console.log('🌱 Starting database seed...');

    try {
      // Ensure cache tables exist
      createCacheTables();
      
      // Load initial data
      const seedDataPath = path.join(__dirname, 'data', 'initial-assets.json');
      const seedData: SeedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

      // Create demo user
      await this.createDemoUser();

      // Seed stocks
      await this.seedStocks(seedData);

      // Seed market indices
      await this.seedMarketIndices(seedData.indices);

      // Fetch and cache real-time prices
      await this.fetchAndCachePrices(seedData);

      // Create demo watchlist
      await this.createDemoWatchlist();

      // Create demo portfolio
      await this.createDemoPortfolio();

      console.log('✅ Database seed completed successfully!');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }

  private async createDemoUser() {
    console.log('👤 Creating demo user...');
    
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const stmt = db().prepare(`
      INSERT OR IGNORE INTO users (username, email, password_hash, is_active, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      'demo',
      'demo@alfalyzer.com',
      hashedPassword,
      1,
      new Date().toISOString()
    );
  }

  private async seedStocks(seedData: SeedData) {
    console.log('📈 Seeding stocks...');
    
    const stmt = db().prepare(`
      INSERT OR REPLACE INTO stocks (
        symbol, name, exchange, sector, industry, 
        country, currency, website_url, description, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const allStocks = [
      ...seedData.portuguese_stocks,
      ...seedData.us_stocks,
      ...seedData.crypto
    ];

    for (const stock of allStocks) {
      stmt.run(
        stock.symbol,
        stock.name,
        stock.exchange,
        stock.sector || null,
        stock.industry || null,
        stock.country,
        stock.currency,
        stock.website_url || null,
        stock.description || null,
        1
      );
    }
    
    console.log(`  ✓ Seeded ${allStocks.length} stocks`);
  }

  private async seedMarketIndices(indices: AssetData[]) {
    console.log('📊 Seeding market indices...');
    
    const stmt = db().prepare(`
      INSERT OR REPLACE INTO market_indices_cache (
        symbol, name, value, change, change_percent, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Mock data for indices (will be replaced with real data)
    const mockIndices = {
      '^PSI20': { value: 6325.50, change: 45.25, changePercent: 0.72 },
      '^GSPC': { value: 4783.45, change: 23.56, changePercent: 0.49 },
      '^DJI': { value: 39087.38, change: 156.23, changePercent: 0.40 },
      '^IXIC': { value: 15282.01, change: -48.52, changePercent: -0.32 },
      '^FTSE': { value: 7683.91, change: 28.44, changePercent: 0.37 },
      '^GDAXI': { value: 16751.64, change: 92.18, changePercent: 0.55 }
    };

    for (const index of indices) {
      const mockData = mockIndices[index.symbol] || {
        value: 1000 + Math.random() * 9000,
        change: (Math.random() - 0.5) * 100,
        changePercent: (Math.random() - 0.5) * 2
      };

      stmt.run(
        index.symbol,
        index.name,
        mockData.value,
        mockData.change,
        mockData.changePercent,
        new Date().toISOString()
      );
    }
    
    console.log(`  ✓ Seeded ${indices.length} market indices`);
  }

  private async fetchAndCachePrices(seedData: SeedData) {
    console.log('💰 Fetching and caching real-time prices...');
    
    const stmt = db().prepare(`
      INSERT OR REPLACE INTO stock_quotes_cache (
        symbol, name, price, change, change_percent, 
        volume, market_cap, pe_ratio, eps, sector, 
        industry, logo_url, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Priority stocks to fetch real data for
    const prioritySymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA',
      'GALP.LS', 'EDP.LS', 'JMT.LS', 'BCP.LS'
    ];

    let successCount = 0;
    let fallbackCount = 0;

    for (const symbol of prioritySymbols) {
      try {
        // Try to fetch real data
        const quote = await this.marketDataService.getStockQuote(symbol);
        
        if (quote && quote.price) {
          const stock = [...seedData.portuguese_stocks, ...seedData.us_stocks]
            .find(s => s.symbol === symbol);
          
          stmt.run(
            symbol,
            stock?.name || quote.name || symbol,
            quote.price,
            quote.change || 0,
            quote.changePercent || 0,
            quote.volume || 0,
            quote.marketCap || null,
            quote.peRatio || null,
            quote.eps || null,
            stock?.sector || null,
            stock?.industry || null,
            null, // logo_url
            new Date().toISOString()
          );
          
          successCount++;
          console.log(`  ✓ Fetched real data for ${symbol}`);
        } else {
          throw new Error('No price data');
        }
      } catch (error) {
        // Use mock data as fallback
        fallbackCount++;
        const mockPrice = this.generateMockPrice(symbol);
        const stock = [...seedData.portuguese_stocks, ...seedData.us_stocks]
          .find(s => s.symbol === symbol);
        
        stmt.run(
          symbol,
          stock?.name || symbol,
          mockPrice.price,
          mockPrice.change,
          mockPrice.changePercent,
          mockPrice.volume,
          mockPrice.marketCap,
          mockPrice.peRatio,
          mockPrice.eps,
          stock?.sector || null,
          stock?.industry || null,
          null, // logo_url
          new Date().toISOString()
        );
        
        console.log(`  ⚠️  Using mock data for ${symbol}`);
      }

      // Avoid rate limiting
      await this.delay(500);
    }

    // Generate mock data for remaining stocks
    const allStocks = [...seedData.portuguese_stocks, ...seedData.us_stocks, ...seedData.crypto];
    const remainingStocks = allStocks.filter(s => !prioritySymbols.includes(s.symbol));
    
    for (const stock of remainingStocks) {
      const mockPrice = this.generateMockPrice(stock.symbol);
      
      stmt.run(
        stock.symbol,
        stock.name,
        mockPrice.price,
        mockPrice.change,
        mockPrice.changePercent,
        mockPrice.volume,
        mockPrice.marketCap,
        mockPrice.peRatio,
        mockPrice.eps,
        stock.sector || null,
        stock.industry || null,
        null, // logo_url
        new Date().toISOString()
      );
    }

    console.log(`  ✓ Cached prices: ${successCount} real, ${fallbackCount + remainingStocks.length} mock`);
  }

  private generateMockPrice(symbol: string) {
    // Generate realistic mock prices based on symbol type
    let basePrice = 100;
    let volume = 1000000;
    let marketCap = '1B';
    
    if (symbol.includes('BTC')) {
      basePrice = 45000 + Math.random() * 10000;
      volume = 25000000000;
      marketCap = '850B';
    } else if (symbol.includes('ETH')) {
      basePrice = 2500 + Math.random() * 500;
      volume = 15000000000;
      marketCap = '300B';
    } else if (['AAPL', 'MSFT', 'GOOGL', 'AMZN'].includes(symbol)) {
      basePrice = 150 + Math.random() * 200;
      volume = 50000000 + Math.random() * 30000000;
      marketCap = '1T';
    } else if (symbol.endsWith('.LS')) {
      basePrice = 5 + Math.random() * 25;
      volume = 500000 + Math.random() * 1500000;
      marketCap = '5B';
    } else {
      basePrice = 20 + Math.random() * 180;
      volume = 5000000 + Math.random() * 10000000;
      marketCap = '100B';
    }

    const change = (Math.random() - 0.5) * basePrice * 0.05; // ±2.5%
    const changePercent = (change / basePrice) * 100;
    const peRatio = 15 + Math.random() * 20;
    const eps = basePrice / peRatio;

    return {
      price: Number(basePrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: Math.floor(volume),
      marketCap,
      peRatio: Number(peRatio.toFixed(2)),
      eps: Number(eps.toFixed(2))
    };
  }

  private async createDemoWatchlist() {
    console.log('👁️  Creating demo watchlist...');
    
    // Get demo user ID
    const user = db().prepare('SELECT id FROM users WHERE username = ?').get('demo') as any;
    
    if (!user) {
      console.error('Demo user not found!');
      return;
    }

    // Create watchlist
    const watchlistStmt = db().prepare(`
      INSERT INTO watchlists (user_id, name, description, is_public)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = watchlistStmt.run(
      user.id,
      'My Tech Watchlist',
      'Top technology stocks to watch',
      0
    );

    const watchlistId = result.lastInsertRowid;

    // Add stocks to watchlist
    const stockStmt = db().prepare(`
      INSERT INTO watchlist_stocks (watchlist_id, stock_symbol, notes)
      VALUES (?, ?, ?)
    `);

    const techStocks = [
      { symbol: 'AAPL', notes: 'iPhone 16 launch impact' },
      { symbol: 'MSFT', notes: 'Azure growth potential' },
      { symbol: 'GOOGL', notes: 'AI developments' },
      { symbol: 'NVDA', notes: 'GPU demand surge' },
      { symbol: 'TSLA', notes: 'FSD progress' }
    ];

    for (const stock of techStocks) {
      stockStmt.run(watchlistId, stock.symbol, stock.notes);
    }

    console.log('  ✓ Created demo watchlist with 5 stocks');
  }

  private async createDemoPortfolio() {
    console.log('💼 Creating demo portfolio...');
    
    // Get demo user ID
    const user = db().prepare('SELECT id FROM users WHERE username = ?').get('demo') as any;
    
    if (!user) {
      console.error('Demo user not found!');
      return;
    }

    // Create portfolio
    const portfolioStmt = db().prepare(`
      INSERT INTO portfolios (user_id, name, description, currency, is_public)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = portfolioStmt.run(
      user.id,
      'Growth Portfolio',
      'Long-term growth focused portfolio',
      'USD',
      0
    );

    const portfolioId = result.lastInsertRowid;

    // Add holdings
    const holdingStmt = db().prepare(`
      INSERT INTO portfolio_holdings (
        portfolio_id, stock_symbol, quantity, average_price, purchase_date
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const transactionStmt = db().prepare(`
      INSERT INTO portfolio_transactions (
        portfolio_id, stock_symbol, transaction_type, 
        quantity, price, total_amount, transaction_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const holdings = [
      { symbol: 'AAPL', quantity: 50, avgPrice: 175.50, date: '2024-01-15' },
      { symbol: 'MSFT', quantity: 30, avgPrice: 380.25, date: '2024-02-01' },
      { symbol: 'GOOGL', quantity: 20, avgPrice: 142.75, date: '2024-01-20' },
      { symbol: 'TSLA', quantity: 15, avgPrice: 245.00, date: '2024-03-01' },
      { symbol: 'GALP.LS', quantity: 100, avgPrice: 12.50, date: '2024-02-15' }
    ];

    for (const holding of holdings) {
      // Add holding
      holdingStmt.run(
        portfolioId,
        holding.symbol,
        holding.quantity,
        holding.avgPrice,
        holding.date
      );

      // Add transaction
      transactionStmt.run(
        portfolioId,
        holding.symbol,
        'buy',
        holding.quantity,
        holding.avgPrice,
        holding.quantity * holding.avgPrice,
        holding.date
      );
    }

    console.log('  ✓ Created demo portfolio with 5 holdings');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async reset() {
    console.log('🗑️  Resetting database...');
    
    try {
      // Clear cache tables
      db().exec(`
        DELETE FROM financial_cache;
        DELETE FROM stock_quotes_cache;
        DELETE FROM company_profiles_cache;
        DELETE FROM api_usage;
        DELETE FROM market_indices_cache;
      `);
      
      // Clear user data (keeping structure)
      db().exec(`
        DELETE FROM portfolio_transactions;
        DELETE FROM portfolio_holdings;
        DELETE FROM portfolios;
        DELETE FROM watchlist_stocks;
        DELETE FROM watchlists;
        DELETE FROM users WHERE username = 'demo';
      `);
      
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      throw error;
    }
  }

  async verify() {
    console.log('🔍 Verifying seed data...');
    
    try {
      const counts = {
        users: db().prepare('SELECT COUNT(*) as count FROM users').get() as any,
        stocks: db().prepare('SELECT COUNT(*) as count FROM stocks').get() as any,
        quotes: db().prepare('SELECT COUNT(*) as count FROM stock_quotes_cache').get() as any,
        indices: db().prepare('SELECT COUNT(*) as count FROM market_indices_cache').get() as any,
        watchlists: db().prepare('SELECT COUNT(*) as count FROM watchlists').get() as any,
        portfolios: db().prepare('SELECT COUNT(*) as count FROM portfolios').get() as any
      };

      console.log('\n📊 Database Statistics:');
      console.log(`  Users: ${counts.users.count}`);
      console.log(`  Stocks: ${counts.stocks.count}`);
      console.log(`  Stock Quotes: ${counts.quotes.count}`);
      console.log(`  Market Indices: ${counts.indices.count}`);
      console.log(`  Watchlists: ${counts.watchlists.count}`);
      console.log(`  Portfolios: ${counts.portfolios.count}`);

      // Sample data
      const sampleStock = db().prepare(`
        SELECT s.*, sq.price, sq.change, sq.change_percent 
        FROM stocks s
        LEFT JOIN stock_quotes_cache sq ON s.symbol = sq.symbol
        WHERE s.symbol = 'AAPL'
      `).get() as any;

      if (sampleStock) {
        console.log('\n📱 Sample Stock (AAPL):');
        console.log(`  Name: ${sampleStock.name}`);
        console.log(`  Price: $${sampleStock.price}`);
        console.log(`  Change: ${sampleStock.change} (${sampleStock.change_percent}%)`);
      }

      console.log('\n✅ Verification completed');
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const seeder = new DatabaseSeeder();

  try {
    switch (command) {
      case 'seed':
        await seeder.seed();
        break;
      
      case 'reset':
        await seeder.reset();
        break;
      
      case 'reseed':
        await seeder.reset();
        await seeder.seed();
        break;
        
      case 'verify':
        await seeder.verify();
        break;
      
      default:
        console.log('Usage:');
        console.log('  npm run seed        # Seed the database');
        console.log('  npm run seed:reset  # Reset seed data');
        console.log('  npm run seed:reseed # Reset and reseed');
        console.log('  npm run seed:verify # Verify seed data');
    }
  } catch (error) {
    console.error('Seed operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { DatabaseSeeder };