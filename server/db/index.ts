import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Connection pool simulation for better-sqlite3
class DatabasePool {
  private db: Database.Database | null = null;
  private statements: Map<string, Database.Statement> = new Map();
  private connectionAttempts = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    while (this.connectionAttempts < this.maxRetries) {
      try {
        this.connectionAttempts++;
        
        // Create database connection
        this.db = new Database(DB_PATH, {
          verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
        });

        // Configure for better performance
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = -64000'); // 64MB cache
        this.db.pragma('temp_store = MEMORY');
        this.db.pragma('mmap_size = 30000000000'); // 30GB mmap
        
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        
        // Test connection
        this.db.prepare('SELECT 1').get();
        
        console.log('Database connected successfully');
        this.connectionAttempts = 0; // Reset on success
        
        // Prepare common statements
        this.prepareCommonStatements();
        
        return;
      } catch (error) {
        console.error(`Database connection attempt ${this.connectionAttempts} failed:`, error);
        
        if (this.connectionAttempts >= this.maxRetries) {
          throw new Error(`Failed to connect to database after ${this.maxRetries} attempts`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  private prepareCommonStatements(): void {
    if (!this.db) return;

    try {
      // Check if tables exist before preparing statements
      const tables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];
      
      const tableNames = new Set(tables.map(t => t.name));
      
      // Only prepare statements for existing tables
      if (tableNames.has('users')) {
        this.statements.set('getUserById', this.db.prepare(`
          SELECT * FROM users WHERE id = ?
        `));

        this.statements.set('getUserByEmail', this.db.prepare(`
          SELECT * FROM users WHERE email = ?
        `));
      }

      if (tableNames.has('stocks')) {
        this.statements.set('getStockBySymbol', this.db.prepare(`
          SELECT * FROM stocks WHERE symbol = ?
        `));
      }

      if (tableNames.has('watchlists') && tableNames.has('watchlist_stocks') && tableNames.has('stocks')) {
        this.statements.set('getWatchlistByUserId', this.db.prepare(`
          SELECT w.*, s.* 
          FROM watchlists w
          JOIN watchlist_stocks ws ON w.id = ws.watchlist_id
          JOIN stocks s ON ws.stock_symbol = s.symbol
          WHERE w.user_id = ?
        `));
      }

      if (tableNames.has('transcripts')) {
        this.statements.set('getTranscriptsByTicker', this.db.prepare(`
          SELECT * FROM transcripts 
          WHERE ticker = ? AND status = 'published'
          ORDER BY year DESC, quarter DESC
        `));

        this.statements.set('getLatestTranscripts', this.db.prepare(`
          SELECT * FROM transcripts 
          WHERE status = 'published'
          ORDER BY published_at DESC
          LIMIT ?
        `));
      }
    } catch (error) {
      console.warn('Failed to prepare some statements:', error);
      // Continue without prepared statements
    }
  }

  // Get database instance
  getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  // Get prepared statement
  getStatement(name: string): Database.Statement {
    const statement = this.statements.get(name);
    if (!statement) {
      throw new Error(`Statement '${name}' not found`);
    }
    return statement;
  }

  // Execute with automatic retry
  async execute<T>(fn: (db: Database.Database) => T): Promise<T> {
    try {
      return fn(this.getDb());
    } catch (error: any) {
      // Check if it's a connection error
      if (error.code === 'SQLITE_CANTOPEN' || error.code === 'SQLITE_NOTADB') {
        console.error('Database connection lost, attempting to reconnect...');
        await this.connect();
        return fn(this.getDb());
      }
      throw error;
    }
  }

  // Transaction helper
  async transaction<T>(fn: (db: Database.Database) => T): Promise<T> {
    const db = this.getDb();
    return db.transaction(fn)(db);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.execute(db => 
        db.prepare('SELECT 1 as healthy').get()
      );
      return result?.healthy === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Close connection
  close(): void {
    if (this.db) {
      // Close all prepared statements
      this.statements.clear();
      
      // Close database
      this.db.close();
      this.db = null;
      
      console.log('Database connection closed');
    }
  }

  // Get database info
  getInfo(): any {
    if (!this.db) {
      return { connected: false };
    }

    return {
      connected: true,
      filename: this.db.name,
      memory: this.db.memory,
      readonly: this.db.readonly,
      open: this.db.open,
      inTransaction: this.db.inTransaction,
      tables: this.execute(db => 
        db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `).all()
      )
    };
  }
}

// Create singleton instance
const dbPool = new DatabasePool();

// Export convenience functions
export const db = dbPool.getDb.bind(dbPool);
export const execute = dbPool.execute.bind(dbPool);
export const transaction = dbPool.transaction.bind(dbPool);
export const healthCheck = dbPool.healthCheck.bind(dbPool);
export const getStatement = dbPool.getStatement.bind(dbPool);
export const getDbInfo = dbPool.getInfo.bind(dbPool);
export const closeDb = dbPool.close.bind(dbPool);

// Export the pool instance for advanced usage
export default dbPool;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing database connection...');
  closeDb();
  process.exit(0);
});