import Database from 'better-sqlite3';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

/**
 * Performance Optimizer Service
 * 
 * Provides comprehensive performance optimization including:
 * - Query optimization and analysis
 * - Connection pooling management
 * - L2 caching layer
 * - Performance monitoring and metrics
 */

export interface QueryPerformanceMetrics {
  queryHash: string;
  query: string;
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
  timestamp: Date;
  context?: string;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  poolSize: number;
  connectionsCreated: number;
  connectionsDestroyed: number;
  avgConnectionTime: number;
  peakUsage: number;
}

export interface PerformanceConfig {
  connectionPool: {
    maxConnections: number;
    minConnections: number;
    idleTimeout: number;
    maxAge: number;
  };
  cache: {
    maxSize: number;
    ttl: number;
    updateAgeOnGet: boolean;
  };
  monitoring: {
    slowQueryThreshold: number;
    metricsRetentionDays: number;
    enableDetailedMetrics: boolean;
  };
}

class ConnectionPool {
  private connections: Database.Database[] = [];
  private activeConnections = new Set<Database.Database>();
  private stats: ConnectionPoolStats;
  private config: PerformanceConfig['connectionPool'];
  private dbPath: string;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string, config: PerformanceConfig['connectionPool']) {
    this.dbPath = dbPath;
    this.config = config;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      poolSize: 0,
      connectionsCreated: 0,
      connectionsDestroyed: 0,
      avgConnectionTime: 0,
      peakUsage: 0
    };

    // Initialize minimum connections
    this.initializePool();
    
    // Start cleanup routine
    this.startCleanupRoutine();
  }

  private initializePool(): void {
    for (let i = 0; i < this.config.minConnections; i++) {
      this.createConnection();
    }
    console.log(`📊 [ConnectionPool] Initialized with ${this.config.minConnections} connections`);
  }

  private createConnection(): Database.Database {
    try {
      const conn = new Database(this.dbPath, {
        readonly: false,
        fileMustExist: true
      });

      // Optimize SQLite for performance
      conn.pragma('journal_mode = WAL');
      conn.pragma('synchronous = NORMAL');
      conn.pragma('cache_size = -64000'); // 64MB cache
      conn.pragma('temp_store = MEMORY');
      conn.pragma('mmap_size = 268435456'); // 256MB memory map

      this.connections.push(conn);
      this.stats.connectionsCreated++;
      this.stats.totalConnections++;
      this.stats.poolSize++;

      return conn;
    } catch (error) {
      console.error('❌ [ConnectionPool] Failed to create connection:', error);
      throw error;
    }
  }

  async acquire(): Promise<Database.Database> {
    const startTime = Date.now();

    // Try to get an idle connection
    const idleConnection = this.connections.find(conn => !this.activeConnections.has(conn));
    
    if (idleConnection) {
      this.activeConnections.add(idleConnection);
      this.updateStats();
      return idleConnection;
    }

    // Create new connection if under max limit
    if (this.connections.length < this.config.maxConnections) {
      const newConnection = this.createConnection();
      this.activeConnections.add(newConnection);
      this.updateStats();
      return newConnection;
    }

    // Wait for a connection to become available
    console.warn('⚠️ [ConnectionPool] Pool exhausted, waiting for available connection...');
    return new Promise((resolve) => {
      const checkForConnection = () => {
        const available = this.connections.find(conn => !this.activeConnections.has(conn));
        if (available) {
          this.activeConnections.add(available);
          this.updateStats();
          resolve(available);
        } else {
          setTimeout(checkForConnection, 10);
        }
      };
      checkForConnection();
    });
  }

  release(connection: Database.Database): void {
    this.activeConnections.delete(connection);
    this.updateStats();
  }

  private updateStats(): void {
    this.stats.activeConnections = this.activeConnections.size;
    this.stats.idleConnections = this.connections.length - this.activeConnections.size;
    this.stats.peakUsage = Math.max(this.stats.peakUsage, this.stats.activeConnections);
  }

  private startCleanupRoutine(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const connectionsToClose: Database.Database[] = [];

    // Remove idle connections over the minimum
    let idleCount = 0;
    for (const conn of this.connections) {
      if (!this.activeConnections.has(conn)) {
        idleCount++;
        if (idleCount > this.config.minConnections) {
          connectionsToClose.push(conn);
        }
      }
    }

    // Close excess connections
    for (const conn of connectionsToClose) {
      try {
        conn.close();
        this.connections = this.connections.filter(c => c !== conn);
        this.stats.connectionsDestroyed++;
        this.stats.totalConnections--;
        this.stats.poolSize--;
      } catch (error) {
        console.error('❌ [ConnectionPool] Error closing connection:', error);
      }
    }

    if (connectionsToClose.length > 0) {
      console.log(`🧹 [ConnectionPool] Cleaned up ${connectionsToClose.length} idle connections`);
    }
  }

  getStats(): ConnectionPoolStats {
    return { ...this.stats };
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const conn of this.connections) {
      try {
        conn.close();
      } catch (error) {
        console.error('❌ [ConnectionPool] Error closing connection during shutdown:', error);
      }
    }

    this.connections = [];
    this.activeConnections.clear();
    this.stats.totalConnections = 0;
    this.stats.poolSize = 0;
  }
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer | null = null;
  private connectionPool: ConnectionPool;
  private queryCache: LRUCache<string, any>;
  private performanceMetrics: QueryPerformanceMetrics[] = [];
  private config: PerformanceConfig;
  private metricsCleanupInterval: NodeJS.Timeout | null = null;

  private constructor(dbPath: string, config?: Partial<PerformanceConfig>) {
    this.config = {
      connectionPool: {
        maxConnections: config?.connectionPool?.maxConnections || 10,
        minConnections: config?.connectionPool?.minConnections || 2,
        idleTimeout: config?.connectionPool?.idleTimeout || 300000, // 5 minutes
        maxAge: config?.connectionPool?.maxAge || 3600000 // 1 hour
      },
      cache: {
        maxSize: config?.cache?.maxSize || 1000,
        ttl: config?.cache?.ttl || 300000, // 5 minutes
        updateAgeOnGet: config?.cache?.updateAgeOnGet || true
      },
      monitoring: {
        slowQueryThreshold: config?.monitoring?.slowQueryThreshold || 100, // 100ms
        metricsRetentionDays: config?.monitoring?.metricsRetentionDays || 7,
        enableDetailedMetrics: config?.monitoring?.enableDetailedMetrics || true
      }
    };

    this.connectionPool = new ConnectionPool(dbPath, this.config.connectionPool);
    
    this.queryCache = new LRUCache({
      max: this.config.cache.maxSize,
      ttl: this.config.cache.ttl,
      updateAgeOnGet: this.config.cache.updateAgeOnGet
    });

    this.startMetricsCleanup();
    console.log('🚀 [PerformanceOptimizer] Initialized with connection pooling and L2 cache');
  }

  static getInstance(dbPath?: string, config?: Partial<PerformanceConfig>): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      if (!dbPath) {
        throw new Error('Database path required for first initialization');
      }
      PerformanceOptimizer.instance = new PerformanceOptimizer(dbPath, config);
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Execute optimized query with caching and performance monitoring
   */
  async executeQuery<T = any>(
    query: string, 
    params: any[] = [], 
    options: { 
      useCache?: boolean; 
      cacheKey?: string; 
      context?: string;
      readonly?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, params);
    const cacheKey = options.cacheKey || queryHash;

    // Check cache first if enabled
    if (options.useCache !== false && this.queryCache.has(cacheKey)) {
      const cachedResult = this.queryCache.get(cacheKey);
      
      if (this.config.monitoring.enableDetailedMetrics) {
        this.recordMetrics({
          queryHash,
          query: this.sanitizeQuery(query),
          executionTime: Date.now() - startTime,
          rowsReturned: Array.isArray(cachedResult) ? cachedResult.length : 1,
          cacheHit: true,
          timestamp: new Date(),
          context: options.context
        });
      }

      return cachedResult;
    }

    // Execute query with connection pooling
    const connection = await this.connectionPool.acquire();
    
    try {
      let result: T;
      
      if (params.length > 0) {
        const stmt = connection.prepare(query);
        result = stmt.all(...params) as T;
      } else {
        result = connection.prepare(query).all() as T;
      }

      this.connectionPool.release(connection);

      // Cache result if caching is enabled
      if (options.useCache !== false) {
        this.queryCache.set(cacheKey, result);
      }

      // Record performance metrics
      const executionTime = Date.now() - startTime;
      
      if (this.config.monitoring.enableDetailedMetrics) {
        this.recordMetrics({
          queryHash,
          query: this.sanitizeQuery(query),
          executionTime,
          rowsReturned: Array.isArray(result) ? result.length : 1,
          cacheHit: false,
          timestamp: new Date(),
          context: options.context
        });
      }

      // Log slow queries
      if (executionTime > this.config.monitoring.slowQueryThreshold) {
        console.warn(`🐌 [PerformanceOptimizer] Slow query detected (${executionTime}ms):`, 
          this.sanitizeQuery(query));
      }

      return result;

    } catch (error) {
      this.connectionPool.release(connection);
      console.error('❌ [PerformanceOptimizer] Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute optimized single row query
   */
  async executeQuerySingle<T = any>(
    query: string, 
    params: any[] = [], 
    options: { useCache?: boolean; cacheKey?: string; context?: string } = {}
  ): Promise<T | null> {
    const results = await this.executeQuery<T[]>(query, params, options);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  }

  /**
   * Execute transaction with connection pooling
   */
  async executeTransaction<T>(
    callback: (connection: Database.Database) => T
  ): Promise<T> {
    const connection = await this.connectionPool.acquire();
    const transaction = connection.transaction(callback);
    
    try {
      const result = transaction();
      this.connectionPool.release(connection);
      return result;
    } catch (error) {
      this.connectionPool.release(connection);
      throw error;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateCache(pattern?: string): void {
    if (pattern) {
      const keysToDelete: string[] = [];
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.queryCache.delete(key));
      console.log(`🗑️ [PerformanceOptimizer] Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
    } else {
      this.queryCache.clear();
      console.log('🗑️ [PerformanceOptimizer] Cleared all cache entries');
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    connectionPool: ConnectionPoolStats;
    cache: {
      size: number;
      maxSize: number;
      hits: number;
      misses: number;
      hitRate: number;
    };
    queries: {
      total: number;
      avgExecutionTime: number;
      slowQueries: number;
      cacheHitRate: number;
    };
  } {
    const poolStats = this.connectionPool.getStats();
    
    const totalQueries = this.performanceMetrics.length;
    const cacheHits = this.performanceMetrics.filter(m => m.cacheHit).length;
    const slowQueries = this.performanceMetrics.filter(
      m => m.executionTime > this.config.monitoring.slowQueryThreshold
    ).length;
    
    const avgExecutionTime = totalQueries > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0;

    return {
      connectionPool: poolStats,
      cache: {
        size: this.queryCache.size,
        maxSize: this.config.cache.maxSize,
        hits: cacheHits,
        misses: totalQueries - cacheHits,
        hitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
      },
      queries: {
        total: totalQueries,
        avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
        slowQueries,
        cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
      }
    };
  }

  /**
   * Analyze query performance and suggest optimizations
   */
  analyzeQueryPerformance(): {
    slowestQueries: QueryPerformanceMetrics[];
    recommendations: string[];
    summary: {
      totalQueries: number;
      avgExecutionTime: number;
      cacheEfficiency: number;
    };
  } {
    const slowestQueries = [...this.performanceMetrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const recommendations: string[] = [];
    const cacheHitRate = this.getPerformanceStats().cache.hitRate;
    
    if (cacheHitRate < 70) {
      recommendations.push('Consider increasing cache TTL or adjusting cache strategy');
    }
    
    if (slowestQueries.length > 0 && slowestQueries[0].executionTime > 500) {
      recommendations.push('Add database indexes for frequently queried columns');
    }

    const poolStats = this.connectionPool.getStats();
    if (poolStats.peakUsage > poolStats.poolSize * 0.8) {
      recommendations.push('Consider increasing connection pool size');
    }

    return {
      slowestQueries,
      recommendations,
      summary: {
        totalQueries: this.performanceMetrics.length,
        avgExecutionTime: this.getPerformanceStats().queries.avgExecutionTime,
        cacheEfficiency: cacheHitRate
      }
    };
  }

  private generateQueryHash(query: string, params: any[]): string {
    const content = query + JSON.stringify(params);
    return createHash('md5').update(content).digest('hex');
  }

  private sanitizeQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim();
  }

  private recordMetrics(metrics: QueryPerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only recent metrics to prevent memory issues
    const maxMetrics = 10000;
    if (this.performanceMetrics.length > maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-maxMetrics);
    }
  }

  private startMetricsCleanup(): void {
    this.metricsCleanupInterval = setInterval(() => {
      const cutoffDate = new Date(Date.now() - (this.config.monitoring.metricsRetentionDays * 24 * 60 * 60 * 1000));
      const beforeCount = this.performanceMetrics.length;
      this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoffDate);
      const afterCount = this.performanceMetrics.length;
      
      if (beforeCount !== afterCount) {
        console.log(`🧹 [PerformanceOptimizer] Cleaned up ${beforeCount - afterCount} old metrics`);
      }
    }, 3600000); // Run every hour
  }

  async shutdown(): Promise<void> {
    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
    }
    
    await this.connectionPool.close();
    this.queryCache.clear();
    
    console.log('🛑 [PerformanceOptimizer] Shutdown complete');
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance;