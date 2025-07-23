import { db } from '../db/index';
import { subDays, format } from 'date-fns';

interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class PriceHistorySeeder {
  
  async seedPriceHistory() {
    console.log('📈 Seeding price history...');
    
    try {
      // Create price history table if it doesn't exist
      this.createPriceHistoryTable();
      
      // Get all stocks from cache
      const stocks = db().prepare(`
        SELECT symbol, price FROM stock_quotes_cache
      `).all() as any[];

      if (stocks.length === 0) {
        console.error('No stocks found in cache. Run main seed first.');
        return;
      }

      // Generate 30 days of price history for each stock
      const days = 30;
      let totalRecords = 0;

      for (const stock of stocks) {
        const history = this.generatePriceHistory(
          stock.symbol, 
          stock.price, 
          days
        );
        
        this.insertPriceHistory(stock.symbol, history);
        totalRecords += history.length;
      }

      console.log(`✅ Seeded ${totalRecords} price history records for ${stocks.length} stocks`);
      
      // Create summary statistics
      this.createSummaryStats();
      
    } catch (error) {
      console.error('❌ Error seeding price history:', error);
      throw error;
    }
  }

  private createPriceHistoryTable() {
    db().exec(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        date DATE NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, date)
      );
      
      CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date 
        ON price_history(symbol, date DESC);
      CREATE INDEX IF NOT EXISTS idx_price_history_date 
        ON price_history(date DESC);
    `);
  }

  private generatePriceHistory(
    symbol: string, 
    currentPrice: number, 
    days: number
  ): PricePoint[] {
    const history: PricePoint[] = [];
    let price = currentPrice;
    
    // Generate backwards from today
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      
      // Generate daily volatility based on asset type
      let volatility = 0.02; // 2% default
      
      if (symbol.includes('BTC') || symbol.includes('ETH')) {
        volatility = 0.05; // 5% for crypto
      } else if (symbol.includes('TSLA') || symbol.includes('NVDA')) {
        volatility = 0.03; // 3% for volatile stocks
      } else if (symbol.endsWith('.LS')) {
        volatility = 0.015; // 1.5% for Portuguese stocks
      }

      // Random walk with slight upward bias
      const change = (Math.random() - 0.48) * volatility;
      price = price * (1 + change);
      
      // Generate OHLC data
      const open = price * (1 + (Math.random() - 0.5) * 0.01);
      const dayRange = price * volatility * 0.8;
      const low = Math.min(open, price - Math.random() * dayRange);
      const high = Math.max(open, price + Math.random() * dayRange);
      const close = price;
      
      // Volume with weekly patterns (lower on weekends)
      const dayOfWeek = new Date(date).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseVolume = this.getBaseVolume(symbol);
      const volume = Math.floor(
        baseVolume * (isWeekend ? 0.3 : 1) * (0.7 + Math.random() * 0.6)
      );

      history.push({
        date,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });
    }

    // Adjust last day to match current price
    if (history.length > 0) {
      const lastDay = history[history.length - 1];
      const adjustment = currentPrice / lastDay.close;
      
      // Adjust all prices to align with current price
      history.forEach(day => {
        day.open = Number((day.open * adjustment).toFixed(2));
        day.high = Number((day.high * adjustment).toFixed(2));
        day.low = Number((day.low * adjustment).toFixed(2));
        day.close = Number((day.close * adjustment).toFixed(2));
      });
    }

    return history;
  }

  private getBaseVolume(symbol: string): number {
    // Return realistic base volumes for different asset types
    if (symbol === 'AAPL') return 75000000;
    if (symbol === 'MSFT') return 25000000;
    if (symbol === 'TSLA') return 120000000;
    if (symbol.includes('BTC')) return 25000000000;
    if (symbol.includes('ETH')) return 15000000000;
    if (symbol.endsWith('.LS')) return 1000000;
    return 10000000; // default
  }

  private insertPriceHistory(symbol: string, history: PricePoint[]) {
    const stmt = db().prepare(`
      INSERT OR REPLACE INTO price_history 
      (symbol, date, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db().transaction((records: PricePoint[]) => {
      for (const record of records) {
        stmt.run(
          symbol,
          record.date,
          record.open,
          record.high,
          record.low,
          record.close,
          record.volume
        );
      }
    });

    insertMany(history);
  }

  private createSummaryStats() {
    console.log('📊 Creating summary statistics...');
    
    // Create summary table
    db().exec(`
      CREATE TABLE IF NOT EXISTS price_summary_stats (
        symbol TEXT PRIMARY KEY,
        avg_price REAL,
        min_price REAL,
        max_price REAL,
        avg_volume INTEGER,
        volatility REAL,
        price_change_30d REAL,
        price_change_30d_pct REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Calculate and insert stats - simplified without window functions
    const stmt = db().prepare(`
      INSERT OR REPLACE INTO price_summary_stats 
      (symbol, avg_price, min_price, max_price, avg_volume, 
       volatility, price_change_30d, price_change_30d_pct)
      SELECT 
        symbol,
        AVG(close) as avg_price,
        MIN(low) as min_price,
        MAX(high) as max_price,
        AVG(volume) as avg_volume,
        -- Simple volatility approximation (high-low range as % of average)
        AVG((high - low) / close) as volatility,
        -- 30 day price change
        MAX(close) - MIN(close) as price_change_30d,
        ((MAX(close) - MIN(close)) / MIN(close)) * 100 as price_change_30d_pct
      FROM price_history
      GROUP BY symbol
    `);

    stmt.run();
    
    console.log('✅ Summary statistics created');
  }

  async verify() {
    console.log('🔍 Verifying price history...');
    
    const stats = db().prepare(`
      SELECT 
        COUNT(DISTINCT symbol) as symbols,
        COUNT(*) as total_records,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM price_history
    `).get() as any;

    console.log('\n📊 Price History Statistics:');
    console.log(`  Symbols with history: ${stats.symbols}`);
    console.log(`  Total records: ${stats.total_records}`);
    console.log(`  Date range: ${stats.earliest_date} to ${stats.latest_date}`);

    // Sample data
    const sample = db().prepare(`
      SELECT * FROM price_history 
      WHERE symbol = 'AAPL' 
      ORDER BY date DESC 
      LIMIT 5
    `).all() as any[];

    if (sample.length > 0) {
      console.log('\n📱 Sample Price History (AAPL - Last 5 days):');
      sample.forEach(day => {
        console.log(`  ${day.date}: O:${day.open} H:${day.high} L:${day.low} C:${day.close} V:${day.volume.toLocaleString()}`);
      });
    }

    // Summary stats sample
    const summaryStats = db().prepare(`
      SELECT * FROM price_summary_stats 
      WHERE symbol IN ('AAPL', 'GALP.LS', 'BTC-USD')
    `).all() as any[];

    if (summaryStats.length > 0) {
      console.log('\n📊 Sample Summary Statistics:');
      summaryStats.forEach(stat => {
        console.log(`  ${stat.symbol}:`);
        console.log(`    Avg Price: ${stat.avg_price.toFixed(2)}`);
        console.log(`    Range: ${stat.min_price.toFixed(2)} - ${stat.max_price.toFixed(2)}`);
        console.log(`    30d Change: ${stat.price_change_30d_pct.toFixed(2)}%`);
        console.log(`    Volatility: ${(stat.volatility * 100).toFixed(2)}%`);
      });
    }
  }

  async reset() {
    console.log('🗑️  Resetting price history...');
    
    try {
      db().exec(`
        DROP TABLE IF EXISTS price_history;
        DROP TABLE IF EXISTS price_summary_stats;
      `);
      
      console.log('✅ Price history reset completed');
    } catch (error) {
      console.error('❌ Error resetting price history:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const seeder = new PriceHistorySeeder();

  try {
    switch (command) {
      case 'seed':
        await seeder.seedPriceHistory();
        break;
      
      case 'reset':
        await seeder.reset();
        break;
        
      case 'verify':
        await seeder.verify();
        break;
      
      default:
        console.log('Usage:');
        console.log('  npm run seed:history        # Seed price history');
        console.log('  npm run seed:history:reset  # Reset price history');
        console.log('  npm run seed:history:verify # Verify price history');
    }
  } catch (error) {
    console.error('Price history seed operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { PriceHistorySeeder };