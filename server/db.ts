import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// For demo purposes, use SQLite
const dbPath = './dev.db';

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

try {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      change TEXT NOT NULL,
      change_percent TEXT NOT NULL,
      market_cap TEXT NOT NULL,
      sector TEXT,
      industry TEXT,
      eps TEXT,
      pe_ratio TEXT,
      logo TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watchlist_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watchlist_id INTEGER NOT NULL,
      stock_symbol TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS intrinsic_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_symbol TEXT NOT NULL,
      intrinsic_value TEXT NOT NULL,
      current_price TEXT NOT NULL,
      valuation TEXT NOT NULL,
      delta_percent TEXT NOT NULL,
      eps TEXT NOT NULL,
      growth_rate TEXT NOT NULL,
      pe_multiple TEXT NOT NULL,
      required_return TEXT NOT NULL,
      margin_of_safety TEXT NOT NULL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_symbol TEXT NOT NULL,
      date DATETIME NOT NULL,
      time TEXT NOT NULL,
      estimated_eps TEXT,
      estimated_revenue TEXT,
      actual_eps TEXT,
      actual_revenue TEXT
    );

    CREATE TABLE IF NOT EXISTS recent_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✓ Database initialized with SQLite');
} catch (error) {
  console.error('Database initialization failed:', error);
  throw error;
}