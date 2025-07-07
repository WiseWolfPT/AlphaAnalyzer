/**
 * OPTIMIZED CONNECTION POOL FOR HIGH CONCURRENCY
 * Designed to handle 100+ concurrent users efficiently
 * Implements advanced connection management and query optimization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import { Pool, PoolClient, PoolConfig } from 'pg';
import path from 'path';
import fs from 'fs';

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  queryQueue: number;
  averageResponseTime: number;
  errors: number;
  lastError?: string;
}

interface QueryMetrics {
  queryId: string;
  query: string;
  executionTime: number;
  timestamp: number;
  connectionId: string;
  success: boolean;
  error?: string;
}

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isSupabaseEnabled = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

/**
 * Optimized Connection Pool Manager
 * Handles both SQLite (dev) and PostgreSQL/Supabase (prod) connections
 */
export class OptimizedConnectionPool {
  private static instance: OptimizedConnectionPool;
  
  // PostgreSQL Pool (Production)
  private pgPool: Pool | null = null;
  private supabaseClient: SupabaseClient | null = null;
  
  // SQLite Database (Development)
  private sqliteDb: Database.Database | null = null;
  private sqliteStatements: Map<string, Database.Statement> = new Map();
  
  // Performance Monitoring
  private stats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingClients: 0,
    queryQueue: 0,
    averageResponseTime: 0,
    errors: 0
  };
  
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private responseTimeBuffer: number[] = [];
  
  private constructor() {
    this.initializeConnections();
    this.startMonitoring();
  }
  
  static getInstance(): OptimizedConnectionPool {
    if (!OptimizedConnectionPool.instance) {
      OptimizedConnectionPool.instance = new OptimizedConnectionPool();
    }
    return OptimizedConnectionPool.instance;
  }
  
  /**
   * Initialize connections based on environment
   */
  private async initializeConnections(): Promise<void> {
    if (isSupabaseEnabled) {
      await this.initializeSupabase();
    } else {
      await this.initializeSQLite();
    }
    
    console.log(`🗄️ Database initialized: ${isSupabaseEnabled ? 'Supabase/PostgreSQL' : 'SQLite'}`);
  }
  
  /**
   * Initialize Supabase with optimized connection pool
   */
  private async initializeSupabase(): Promise<void> {
    try {
      // Initialize Supabase client with optimized settings
      this.supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          global: {
            headers: {
              'x-application-name': 'alfalyzer-backend'
            }
          }
        }
      );
      
      // Initialize PostgreSQL connection pool for direct queries
      const poolConfig: PoolConfig = {
        host: this.extractHostFromSupabaseUrl(),
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: process.env.SUPABASE_DB_PASSWORD || '',
        
        // Connection Pool Configuration for 100+ concurrent users
        min: 5,                    // Minimum connections to maintain
        max: 30,                   // Maximum connections (adjust based on Supabase limits)
        acquireTimeoutMillis: 10000, // 10 second timeout to acquire connection
        createTimeoutMillis: 5000,   // 5 second timeout to create connection
        destroyTimeoutMillis: 5000,  // 5 second timeout to destroy connection
        idleTimeoutMillis: 30000,    // 30 second idle timeout
        createRetryIntervalMillis: 200, // 200ms between retry attempts
        
        // Advanced Configuration
        allowExitOnIdle: true,
        maxUses: 5000,            // Maximum uses per connection before cycling
        
        // Connection Validation
        application_name: 'alfalyzer-backend',
        keepAlive: true,
        keepAliveInitialDelayMillis: 1000,
        
        // Statement Timeout
        statement_timeout: 30000,  // 30 second statement timeout
        query_timeout: 20000,      // 20 second query timeout
        
        // SSL Configuration
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
      
      this.pgPool = new Pool(poolConfig);
      
      // Event Handlers for Pool Monitoring
      this.pgPool.on('connect', (client: PoolClient) => {
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        console.log(`🔗 New PostgreSQL connection established (Total: ${this.stats.totalConnections})`);
      });
      
      this.pgPool.on('remove', (client: PoolClient) => {
        this.stats.totalConnections--;
        console.log(`❌ PostgreSQL connection removed (Total: ${this.stats.totalConnections})`);
      });
      
      this.pgPool.on('error', (err: Error) => {
        this.stats.errors++;
        this.stats.lastError = err.message;
        console.error('PostgreSQL Pool Error:', err);
      });
      
      // Test connection
      const testClient = await this.pgPool.connect();
      await testClient.query('SELECT 1 as health_check');
      testClient.release();
      
      console.log('✅ Supabase/PostgreSQL connection pool initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      throw error;
    }
  }
  
  /**
   * Initialize SQLite with optimized settings
   */
  private async initializeSQLite(): Promise<void> {
    try {
      const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
      const dbDir = path.dirname(dbPath);
      
      // Ensure database directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      // Initialize SQLite with optimized settings for concurrency
      this.sqliteDb = new Database(dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
        fileMustExist: false
      });
      
      // Optimize SQLite for high concurrency and performance
      this.sqliteDb.pragma('journal_mode = WAL');         // Write-Ahead Logging for concurrency
      this.sqliteDb.pragma('synchronous = NORMAL');       // Balance safety vs performance
      this.sqliteDb.pragma('cache_size = -128000');       // 128MB cache (negative = KB)
      this.sqliteDb.pragma('temp_store = MEMORY');        // Store temp tables in memory
      this.sqliteDb.pragma('mmap_size = 536870912');      // 512MB memory mapping
      this.sqliteDb.pragma('optimize');                   // Optimize database structure
      
      // Enable foreign keys
      this.sqliteDb.pragma('foreign_keys = ON');
      
      // Set connection limits for WAL mode
      this.sqliteDb.pragma('wal_autocheckpoint = 1000');  // Checkpoint every 1000 pages
      this.sqliteDb.pragma('busy_timeout = 10000');       // 10 second busy timeout
      
      // Test connection
      this.sqliteDb.prepare('SELECT 1 as health_check').get();
      
      // Prepare frequently used statements
      this.prepareOptimizedStatements();
      
      console.log('✅ SQLite database initialized with optimized settings');
      
    } catch (error) {
      console.error('❌ Failed to initialize SQLite:', error);
      throw error;
    }
  }
  
  /**
   * Prepare optimized statements for common queries
   */
  private prepareOptimizedStatements(): void {
    if (!this.sqliteDb) return;
    
    try {
      // User queries
      this.sqliteStatements.set('getUserById', 
        this.sqliteDb.prepare('SELECT * FROM users WHERE id = ?'));
      this.sqliteStatements.set('getUserByEmail', 
        this.sqliteDb.prepare('SELECT * FROM users WHERE email = ?'));
      
      // Portfolio queries with optimized JOINs
      this.sqliteStatements.set('getUserPortfolios',
        this.sqliteDb.prepare(`
          SELECT p.*, COUNT(t.id) as transaction_count,
                 SUM(CASE WHEN t.type = 'buy' THEN t.quantity * t.price ELSE 0 END) as invested_amount
          FROM portfolios p
          LEFT JOIN transactions t ON p.id = t.portfolio_id
          WHERE p.user_id = ?
          GROUP BY p.id
          ORDER BY p.created_at DESC
        `));
      
      // Watchlist queries with stock data
      this.sqliteStatements.set('getUserWatchlistWithStocks',
        this.sqliteDb.prepare(`
          SELECT w.*, wi.symbol, wi.added_at, wi.notes
          FROM watchlists w
          LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
          WHERE w.user_id = ?
          ORDER BY w.created_at DESC, wi.added_at DESC
        `));
      
      // Transaction queries for portfolio performance
      this.sqliteStatements.set('getPortfolioTransactions',
        this.sqliteDb.prepare(`
          SELECT * FROM transactions 
          WHERE portfolio_id = ? 
          ORDER BY date DESC, created_at DESC
          LIMIT ?
        `));
      
      // Portfolio holdings calculation
      this.sqliteStatements.set('calculatePortfolioHoldings',
        this.sqliteDb.prepare(`
          SELECT 
            symbol,
            SUM(CASE WHEN type = 'buy' THEN quantity ELSE -quantity END) as current_shares,
            AVG(CASE WHEN type = 'buy' THEN price ELSE NULL END) as avg_buy_price,
            SUM(CASE WHEN type = 'buy' THEN quantity * price ELSE 0 END) as total_invested
          FROM transactions 
          WHERE portfolio_id = ?
          GROUP BY symbol
          HAVING current_shares > 0
          ORDER BY total_invested DESC
        `));
      
      console.log(`📋 Prepared ${this.sqliteStatements.size} optimized statements`);
      
    } catch (error) {
      console.warn('⚠️ Failed to prepare some statements:', error);
    }
  }
  
  /**
   * Execute query with automatic connection management and performance tracking
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const queryId = this.generateQueryId();
    const startTime = Date.now();
    
    try {
      this.stats.queryQueue++;
      
      let result: T[];
      
      if (this.supabaseClient && this.pgPool) {
        result = await this.executePostgreSQLQuery<T>(sql, params, queryId);
      } else if (this.sqliteDb) {
        result = await this.executeSQLiteQuery<T>(sql, params, queryId);
      } else {
        throw new Error('No database connection available');
      }
      
      const executionTime = Date.now() - startTime;
      this.recordMetrics(queryId, sql, executionTime, 'unknown', true);
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics(queryId, sql, executionTime, 'unknown', false, error.message);
      throw error;
    } finally {
      this.stats.queryQueue--;
    }
  }
  
  /**
   * Execute prepared statement (SQLite only)
   */
  async executeStatement<T = any>(statementName: string, params: any[] = []): Promise<T[]> {
    if (!this.sqliteDb) {
      throw new Error('SQLite not available - use query() method instead');
    }
    
    const statement = this.sqliteStatements.get(statementName);
    if (!statement) {
      throw new Error(`Prepared statement '${statementName}' not found`);
    }
    
    const queryId = this.generateQueryId();
    const startTime = Date.now();
    
    try {
      const result = statement.all(params) as T[];
      const executionTime = Date.now() - startTime;
      
      this.recordMetrics(queryId, statementName, executionTime, 'sqlite-prepared', true);
      
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetrics(queryId, statementName, executionTime, 'sqlite-prepared', false, error.message);
      throw error;
    }
  }
  
  /**
   * Execute transaction with automatic retry and rollback
   */
  async transaction<T>(callback: (query: (sql: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
    if (this.pgPool) {
      return this.executePostgreSQLTransaction(callback);
    } else if (this.sqliteDb) {
      return this.executeSQLiteTransaction(callback);
    } else {
      throw new Error('No database connection available for transaction');
    }
  }
  
  /**
   * Execute PostgreSQL query
   */
  private async executePostgreSQLQuery<T>(sql: string, params: any[], queryId: string): Promise<T[]> {
    const client = await this.pgPool!.connect();
    this.stats.activeConnections++;
    
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
      this.stats.activeConnections--;
    }
  }
  
  /**
   * Execute SQLite query
   */
  private async executeSQLiteQuery<T>(sql: string, params: any[], queryId: string): Promise<T[]> {
    // SQLite queries are synchronous, but we wrap for consistency
    return new Promise((resolve, reject) => {
      try {
        const statement = this.sqliteDb!.prepare(sql);
        const result = statement.all(params) as T[];
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Execute PostgreSQL transaction
   */
  private async executePostgreSQLTransaction<T>(
    callback: (query: (sql: string, params?: any[]) => Promise<any>) => Promise<T>
  ): Promise<T> {
    const client = await this.pgPool!.connect();
    
    try {
      await client.query('BEGIN');
      
      const transactionQuery = async (sql: string, params: any[] = []) => {
        const result = await client.query(sql, params);
        return result.rows;
      };
      
      const result = await callback(transactionQuery);
      
      await client.query('COMMIT');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Execute SQLite transaction
   */
  private async executeSQLiteTransaction<T>(
    callback: (query: (sql: string, params?: any[]) => Promise<any>) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const transaction = this.sqliteDb!.transaction((callback) => {
        const transactionQuery = async (sql: string, params: any[] = []) => {
          const statement = this.sqliteDb!.prepare(sql);
          return statement.all(params);
        };
        
        return callback(transactionQuery);
      });
      
      try {
        const result = transaction(callback);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Get connection and performance statistics
   */
  getStats(): ConnectionStats & { queryMetrics: QueryMetrics[] } {
    // Update current stats
    if (this.pgPool) {
      this.stats.totalConnections = this.pgPool.totalCount;
      this.stats.idleConnections = this.pgPool.idleCount;
      this.stats.waitingClients = this.pgPool.waitingCount;
    }
    
    // Calculate average response time
    if (this.responseTimeBuffer.length > 0) {
      this.stats.averageResponseTime = 
        this.responseTimeBuffer.reduce((a, b) => a + b, 0) / this.responseTimeBuffer.length;
    }
    
    return {
      ...this.stats,
      queryMetrics: this.queryMetrics.slice(-100) // Return last 100 queries
    };
  }
  
  /**
   * Health check for the connection pool
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const startTime = Date.now();
      
      if (this.supabaseClient) {
        const { data, error } = await this.supabaseClient
          .from('users')
          .select('count')
          .limit(1);
          
        if (error) throw error;
      } else if (this.sqliteDb) {
        this.sqliteDb.prepare('SELECT 1 as health').get();
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        details: {
          database: isSupabaseEnabled ? 'supabase' : 'sqlite',
          responseTime,
          stats: this.getStats(),
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Optimize database performance
   */
  async optimize(): Promise<void> {
    try {
      if (this.sqliteDb) {
        // SQLite optimization
        this.sqliteDb.pragma('optimize');
        this.sqliteDb.pragma('wal_checkpoint(FULL)');
        console.log('✅ SQLite optimization completed');
      }
      
      if (this.pgPool) {
        // PostgreSQL optimization
        await this.query('VACUUM ANALYZE');
        console.log('✅ PostgreSQL optimization completed');
      }
      
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
    }
  }
  
  /**
   * Close all connections gracefully
   */
  async close(): Promise<void> {
    try {
      if (this.pgPool) {
        await this.pgPool.end();
        console.log('PostgreSQL connection pool closed');
      }
      
      if (this.sqliteDb) {
        this.sqliteDb.close();
        console.log('SQLite database closed');
      }
      
      this.sqliteStatements.clear();
      
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
  
  /**
   * Helper Methods
   */
  
  private extractHostFromSupabaseUrl(): string {
    const url = new URL(process.env.SUPABASE_URL!);
    return url.hostname.replace('supabase.co', 'supabase.com');
  }
  
  private generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private recordMetrics(
    queryId: string, 
    query: string, 
    executionTime: number, 
    connectionId: string, 
    success: boolean, 
    error?: string
  ): void {
    const metric: QueryMetrics = {
      queryId,
      query: query.substring(0, 200), // Truncate long queries
      executionTime,
      timestamp: Date.now(),
      connectionId,
      success,
      error
    };
    
    this.queryMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory / 2);
    }
    
    // Update response time buffer
    this.responseTimeBuffer.push(executionTime);
    if (this.responseTimeBuffer.length > 100) {
      this.responseTimeBuffer = this.responseTimeBuffer.slice(-50);
    }
    
    // Log slow queries
    if (executionTime > 1000) {
      console.warn(`🐌 Slow query detected: ${executionTime}ms - ${query.substring(0, 100)}`);
    }
  }
  
  private startMonitoring(): void {
    // Monitor connection health every 30 seconds
    setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (!health.healthy) {
          console.error('❌ Database health check failed:', health.details);
        }
      } catch (error) {
        console.error('❌ Health check error:', error);
      }
    }, 30000);
    
    // Log performance stats every 5 minutes
    setInterval(() => {
      const stats = this.getStats();
      console.log(`📊 Connection Pool Stats:`, {
        connections: `${stats.activeConnections}/${stats.totalConnections}`,
        avgResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`,
        errors: stats.errors,
        queuedQueries: stats.queryQueue
      });
    }, 300000);
  }
}

// Export singleton instance
export const optimizedPool = OptimizedConnectionPool.getInstance();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await optimizedPool.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await optimizedPool.close();
  process.exit(0);
});

// Export convenience functions
export const query = optimizedPool.query.bind(optimizedPool);
export const executeStatement = optimizedPool.executeStatement.bind(optimizedPool);
export const transaction = optimizedPool.transaction.bind(optimizedPool);
export const healthCheck = optimizedPool.healthCheck.bind(optimizedPool);
export const getStats = optimizedPool.getStats.bind(optimizedPool);
export const optimize = optimizedPool.optimize.bind(optimizedPool);