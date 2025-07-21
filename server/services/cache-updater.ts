// Periodic cache updater service
// Updates database with fresh data from APIs
import { db } from '../db';
import { cacheQueries } from '../db/cache-schema';
import { fiscalAI } from './fiscal-ai-service';

interface StockSymbol {
  symbol: string;
  priority: number; // 1 = high priority (user watchlist), 2 = medium, 3 = low
}

export class CacheUpdaterService {
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;
  
  // Popular stocks to keep updated
  private defaultSymbols: StockSymbol[] = [
    // US Tech Giants
    { symbol: 'AAPL', priority: 1 },
    { symbol: 'MSFT', priority: 1 },
    { symbol: 'GOOGL', priority: 1 },
    { symbol: 'AMZN', priority: 1 },
    { symbol: 'META', priority: 1 },
    { symbol: 'NVDA', priority: 1 },
    { symbol: 'TSLA', priority: 1 },
    
    // Financial
    { symbol: 'JPM', priority: 2 },
    { symbol: 'BAC', priority: 2 },
    { symbol: 'V', priority: 2 },
    
    // EU Stocks
    { symbol: 'ASML', priority: 2 },
    { symbol: 'SAP', priority: 2 },
    { symbol: 'NVO', priority: 2 },
    
    // ETFs
    { symbol: 'SPY', priority: 1 },
    { symbol: 'QQQ', priority: 1 },
    { symbol: 'VTI', priority: 2 }
  ];
  
  // Start the cache updater
  start() {
    console.log('🚀 Starting cache updater service...');
    
    // Initial update
    this.updateCache();
    
    // Update every 1 minute for high priority stocks
    this.updateInterval = setInterval(() => {
      this.updateCache();
    }, 60 * 1000); // 1 minute
    
    // Update financial data every 6 hours
    setInterval(() => {
      this.updateFinancialData();
    }, 6 * 60 * 60 * 1000); // 6 hours
  }
  
  // Stop the cache updater
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  // Update stock quotes cache
  private async updateCache() {
    if (this.isUpdating) {
      console.log('⏳ Cache update already in progress, skipping...');
      return;
    }
    
    this.isUpdating = true;
    console.log('🔄 Updating cache...');
    
    try {
      // Get symbols that need updating
      const symbolsToUpdate = this.getSymbolsToUpdate();
      
      // Update in batches to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < symbolsToUpdate.length; i += batchSize) {
        const batch = symbolsToUpdate.slice(i, i + batchSize);
        await this.updateBatch(batch);
        
        // Small delay between batches
        if (i + batchSize < symbolsToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Clean old cache entries
      cacheQueries.cleanOldCache.run();
      
      console.log('✅ Cache update completed');
    } catch (error) {
      console.error('❌ Cache update error:', error);
    } finally {
      this.isUpdating = false;
    }
  }
  
  // Get symbols that need updating based on priority and last update time
  private getSymbolsToUpdate(): StockSymbol[] {
    const now = Date.now();
    const symbols: StockSymbol[] = [];
    
    // Check each symbol's last update time
    for (const stock of this.defaultSymbols) {
      const cached = cacheQueries.getStockQuote.get(stock.symbol) as any;
      
      if (!cached) {
        // Not in cache, needs update
        symbols.push(stock);
      } else {
        const lastUpdate = new Date(cached.updated_at).getTime();
        const timeSinceUpdate = now - lastUpdate;
        
        // Update based on priority
        if (stock.priority === 1 && timeSinceUpdate > 60 * 1000) { // 1 minute for high priority
          symbols.push(stock);
        } else if (stock.priority === 2 && timeSinceUpdate > 5 * 60 * 1000) { // 5 minutes for medium
          symbols.push(stock);
        } else if (stock.priority === 3 && timeSinceUpdate > 15 * 60 * 1000) { // 15 minutes for low
          symbols.push(stock);
        }
      }
    }
    
    // Also get user watchlist symbols from database
    try {
      const userSymbols = db.prepare(`
        SELECT DISTINCT symbol FROM watchlists 
        WHERE symbol NOT IN (${this.defaultSymbols.map(s => `'${s.symbol}'`).join(',')})
      `).all() as { symbol: string }[];
      
      userSymbols.forEach(({ symbol }) => {
        symbols.push({ symbol, priority: 1 }); // User watchlist is high priority
      });
    } catch (error) {
      // Watchlist table might not exist yet
    }
    
    return symbols;
  }
  
  // Update a batch of symbols
  private async updateBatch(symbols: StockSymbol[]) {
    const promises = symbols.map(async ({ symbol }) => {
      try {
        // Here we would call the actual API
        // For now, we'll use Alpha Vantage through our proxy
        const response = await fetch(`http://localhost:${process.env.PORT || 8000}/api/market-data/quote/${symbol}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Save to cache
          cacheQueries.upsertStockQuote.run(
            data.symbol,
            data.name,
            data.price,
            data.change,
            data.changePercent,
            data.volume || 0,
            data.marketCap || null,
            data.peRatio || null,
            data.eps || null,
            data.sector || null,
            data.industry || null,
            data.logo || null,
            new Date().toISOString()
          );
          
          console.log(`✅ Updated ${symbol}`);
        }
      } catch (error) {
        console.error(`❌ Failed to update ${symbol}:`, error.message);
      }
    });
    
    await Promise.all(promises);
  }
  
  // Update financial data (less frequent)
  private async updateFinancialData() {
    console.log('📊 Updating financial data...');
    
    if (!fiscalAI.isConfigured()) {
      console.log('⚠️ Fiscal.ai not configured, skipping financial data update');
      return;
    }
    
    try {
      // Update financial data for high priority stocks
      const highPrioritySymbols = this.defaultSymbols
        .filter(s => s.priority === 1)
        .map(s => s.symbol);
      
      for (const symbol of highPrioritySymbols) {
        try {
          await fiscalAI.getCompleteFinancials(symbol);
          console.log(`✅ Updated financials for ${symbol}`);
          
          // Delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Failed to update financials for ${symbol}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Financial data update error:', error);
    }
  }
  
  // Get cached quote from database
  static getCachedQuote(symbol: string): any {
    return cacheQueries.getStockQuote.get(symbol);
  }
  
  // Get multiple cached quotes
  static getCachedQuotes(symbols: string[]): any[] {
    return cacheQueries.getMultipleStockQuotes.all(JSON.stringify(symbols)) as any[];
  }
}

// Export singleton instance
export const cacheUpdater = new CacheUpdaterService();