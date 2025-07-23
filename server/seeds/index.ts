import { DatabaseSeeder } from './seed-database';
import { PriceHistorySeeder } from './seed-price-history';

/**
 * Master seed script that runs all seeders in the correct order
 */
class MasterSeeder {
  private databaseSeeder: DatabaseSeeder;
  private priceHistorySeeder: PriceHistorySeeder;

  constructor() {
    this.databaseSeeder = new DatabaseSeeder();
    this.priceHistorySeeder = new PriceHistorySeeder();
  }

  async seedAll() {
    console.log('🌱 Running complete database seed...\n');
    
    try {
      // 1. Seed base data (users, stocks, watchlists, portfolios)
      await this.databaseSeeder.seed();
      
      console.log('\n');
      
      // 2. Seed price history
      await this.priceHistorySeeder.seedPriceHistory();
      
      console.log('\n✨ Complete seed finished successfully!\n');
      
      // 3. Verify everything
      await this.verifyAll();
      
    } catch (error) {
      console.error('\n❌ Master seed failed:', error);
      throw error;
    }
  }

  async resetAll() {
    console.log('🗑️  Resetting all seed data...\n');
    
    try {
      await this.priceHistorySeeder.reset();
      await this.databaseSeeder.reset();
      
      console.log('\n✅ All data reset completed');
    } catch (error) {
      console.error('\n❌ Reset failed:', error);
      throw error;
    }
  }

  async reseedAll() {
    console.log('♻️  Resetting and reseeding all data...\n');
    
    try {
      await this.resetAll();
      console.log('\n');
      await this.seedAll();
    } catch (error) {
      console.error('\n❌ Reseed failed:', error);
      throw error;
    }
  }

  async verifyAll() {
    console.log('🔍 Verifying all seed data...\n');
    
    try {
      await this.databaseSeeder.verify();
      console.log('\n');
      await this.priceHistorySeeder.verify();
      
      // Additional cross-table verification
      this.verifyCrossTables();
      
    } catch (error) {
      console.error('\n❌ Verification failed:', error);
      throw error;
    }
  }

  private verifyCrossTables() {
    console.log('\n🔗 Cross-table verification:');
    
    // Check that all stocks in price history exist in stocks table
    const orphanedPrices = db().prepare(`
      SELECT COUNT(DISTINCT ph.symbol) as count
      FROM price_history ph
      LEFT JOIN stocks s ON ph.symbol = s.symbol
      WHERE s.symbol IS NULL
    `).get() as any;
    
    console.log(`  Orphaned price records: ${orphanedPrices.count}`);
    
    // Check cache freshness
    const cacheStats = db().prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN updated_at > datetime('now', '-5 minutes') THEN 1 END) as fresh,
        COUNT(CASE WHEN updated_at < datetime('now', '-1 hour') THEN 1 END) as stale
      FROM stock_quotes_cache
    `).get() as any;
    
    console.log(`  Cache status: ${cacheStats.fresh} fresh, ${cacheStats.stale} stale (of ${cacheStats.total} total)`);
    
    // Portfolio value estimate
    const portfolioValue = db().prepare(`
      SELECT 
        p.name,
        SUM(ph.quantity * sq.price) as total_value
      FROM portfolios p
      JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
      JOIN stock_quotes_cache sq ON ph.stock_symbol = sq.symbol
      GROUP BY p.id
    `).all() as any[];
    
    if (portfolioValue.length > 0) {
      console.log('\n💰 Portfolio Values:');
      portfolioValue.forEach(pf => {
        console.log(`  ${pf.name}: $${pf.total_value?.toLocaleString() || 'N/A'}`);
      });
    }
  }

  async refreshPrices() {
    console.log('🔄 Refreshing real-time prices...\n');
    
    try {
      // This would fetch fresh prices from APIs
      console.log('⚠️  Price refresh not implemented yet');
      console.log('    Run "npm run seed:reseed" to regenerate all data');
    } catch (error) {
      console.error('\n❌ Price refresh failed:', error);
      throw error;
    }
  }
}

// Import db for cross-table verification
import { db } from '../db/index';

// CLI interface
async function main() {
  const command = process.argv[2];
  const seeder = new MasterSeeder();

  const startTime = Date.now();

  try {
    switch (command) {
      case 'all':
      case undefined:
        await seeder.seedAll();
        break;
      
      case 'reset':
        await seeder.resetAll();
        break;
      
      case 'reseed':
        await seeder.reseedAll();
        break;
        
      case 'verify':
        await seeder.verifyAll();
        break;
        
      case 'refresh':
        await seeder.refreshPrices();
        break;
      
      default:
        console.log('📚 Alfalyzer Database Seeder\n');
        console.log('Usage:');
        console.log('  npm run seed          # Seed all data (default)');
        console.log('  npm run seed:reset    # Reset all seed data');
        console.log('  npm run seed:reseed   # Reset and reseed everything');
        console.log('  npm run seed:verify   # Verify all seed data');
        console.log('  npm run seed:refresh  # Refresh real-time prices');
        console.log('\nIndividual seeders:');
        console.log('  npm run seed:db       # Seed only base database');
        console.log('  npm run seed:history  # Seed only price history');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Operation completed in ${duration}s`);
    
  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { MasterSeeder };