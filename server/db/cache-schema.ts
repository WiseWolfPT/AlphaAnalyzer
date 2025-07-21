// Database schema for caching API data
import { db } from './index';

export function createCacheTables() {
  // Financial data cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, type)
    );
    
    CREATE INDEX IF NOT EXISTS idx_financial_cache_symbol ON financial_cache(symbol);
    CREATE INDEX IF NOT EXISTS idx_financial_cache_updated ON financial_cache(updated_at);
  `);
  
  // Stock quote cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_quotes_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT,
      price REAL,
      change REAL,
      change_percent REAL,
      volume INTEGER,
      market_cap TEXT,
      pe_ratio REAL,
      eps REAL,
      sector TEXT,
      industry TEXT,
      logo_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_stock_quotes_symbol ON stock_quotes_cache(symbol);
    CREATE INDEX IF NOT EXISTS idx_stock_quotes_updated ON stock_quotes_cache(updated_at);
  `);
  
  // Company profile cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_profiles_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT,
      description TEXT,
      sector TEXT,
      industry TEXT,
      website TEXT,
      ceo TEXT,
      employees INTEGER,
      headquarters TEXT,
      founded_year INTEGER,
      ipo_date TEXT,
      market_cap REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_company_profiles_symbol ON company_profiles_cache(symbol);
  `);
  
  // API usage tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      endpoint TEXT,
      symbol TEXT,
      response_time INTEGER,
      status_code INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage(provider);
    CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);
  `);
  
  // Market indices cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_indices_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT,
      value REAL,
      change REAL,
      change_percent REAL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_market_indices_symbol ON market_indices_cache(symbol);
  `);
  
  console.log('✅ Cache tables created successfully');
}

// Helper functions for cache management
export const cacheQueries = {
  // Insert or update stock quote
  upsertStockQuote: db.prepare(`
    INSERT OR REPLACE INTO stock_quotes_cache 
    (symbol, name, price, change, change_percent, volume, market_cap, pe_ratio, eps, sector, industry, logo_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
  // Get stock quote
  getStockQuote: db.prepare(`
    SELECT * FROM stock_quotes_cache 
    WHERE symbol = ? 
    AND updated_at > datetime('now', '-1 minute')
  `),
  
  // Get multiple stock quotes
  getMultipleStockQuotes: db.prepare(`
    SELECT * FROM stock_quotes_cache 
    WHERE symbol IN (SELECT value FROM json_each(?))
    AND updated_at > datetime('now', '-1 minute')
  `),
  
  // Clean old cache entries
  cleanOldCache: db.prepare(`
    DELETE FROM stock_quotes_cache 
    WHERE updated_at < datetime('now', '-1 day')
  `)
};