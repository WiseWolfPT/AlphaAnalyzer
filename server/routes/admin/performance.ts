import { Router } from 'express';
import { performanceMonitor } from '../../services/performance-monitor';
import { performanceOptimizer } from '../../services/performance-optimizer';
import path from 'path';

const router = Router();

/**
 * GET /api/admin/performance/dashboard
 * Get comprehensive performance dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const healthStatus = performanceMonitor.getHealthStatus();
    const trends = performanceMonitor.getPerformanceTrends(24);
    
    // Get database file size and stats
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
    let dbStats = null;
    
    try {
      const fs = require('fs');
      const stats = fs.statSync(dbPath);
      dbStats = {
        size: stats.size,
        sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
        modified: stats.mtime
      };
    } catch (error) {
      console.warn('Could not get database stats:', error.message);
    }

    // Get performance optimizer stats if available
    let optimizerStats = null;
    try {
      const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
      const optimizer = performanceOptimizer(dbPath);
      optimizerStats = optimizer.getPerformanceStats();
    } catch (error) {
      console.warn('Could not get optimizer stats:', error.message);
    }

    const response = {
      health: healthStatus,
      trends,
      database: dbStats,
      optimizer: optimizerStats,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Performance dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/performance/metrics
 * Get detailed performance metrics with optional time range
 */
router.get('/metrics', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const includeRaw = req.query.includeRaw === 'true';

    const trends = performanceMonitor.getPerformanceTrends(hours);
    const healthStatus = performanceMonitor.getHealthStatus();

    const response = {
      trends,
      currentMetrics: healthStatus.metrics,
      summary: trends.summary,
      timeRange: trends.timeRange
    };

    if (includeRaw) {
      const exportData = performanceMonitor.exportPerformanceData();
      (response as any).rawData = exportData;
    }

    res.json(response);
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/performance/alerts
 * Get performance alerts with filtering
 */
router.get('/alerts', async (req, res) => {
  try {
    const severity = req.query.severity as string;
    const resolved = req.query.resolved === 'true';
    const limit = parseInt(req.query.limit as string) || 100;

    const healthStatus = performanceMonitor.getHealthStatus();
    let alerts = healthStatus.activeAlerts;

    // Apply filters
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === resolved);
    }

    // Limit results
    alerts = alerts.slice(0, limit);

    // Group alerts by type for summary
    const alertSummary = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      alerts,
      summary: {
        total: alerts.length,
        byType: alertSummary,
        bySeverity: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        }
      }
    });
  } catch (error) {
    console.error('Performance alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/performance/query-analysis
 * Get query performance analysis and recommendations
 */
router.get('/query-analysis', async (req, res) => {
  try {
    let analysis = null;
    
    try {
      const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
      const optimizer = performanceOptimizer(dbPath);
      analysis = optimizer.analyzeQueryPerformance();
    } catch (error) {
      console.warn('Could not get query analysis:', error.message);
      analysis = {
        slowestQueries: [],
        recommendations: ['Performance optimizer not available'],
        summary: {
          totalQueries: 0,
          avgExecutionTime: 0,
          cacheEfficiency: 0
        }
      };
    }

    res.json({
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Query analysis error:', error);
    res.status(500).json({
      error: 'Failed to perform query analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/performance/optimize
 * Trigger performance optimization
 */
router.post('/optimize', async (req, res) => {
  try {
    console.log('Admin requested performance optimization');
    
    const optimization = await performanceMonitor.optimizePerformance();
    
    res.json({
      success: true,
      message: 'Performance optimization completed',
      actions: optimization.actions,
      results: optimization.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Performance optimization error:', error);
    res.status(500).json({
      error: 'Performance optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/performance/cache/clear
 * Clear performance cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;
    
    try {
      const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
      const optimizer = performanceOptimizer(dbPath);
      optimizer.invalidateCache(pattern);
      
      res.json({
        success: true,
        message: pattern 
          ? `Cache entries matching "${pattern}" cleared`
          : 'All cache entries cleared',
        pattern,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'Performance optimizer not available',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/performance/database/stats
 * Get detailed database statistics
 */
router.get('/database/stats', async (req, res) => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
    
    const db = new Database(dbPath, { readonly: true });
    
    try {
      // Get table information
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableStats = [];
      
      for (const table of tables) {
        try {
          const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
          const tableInfo = db.prepare(`PRAGMA table_info(${table.name})`).all();
          const indexes = db.prepare(`PRAGMA index_list(${table.name})`).all();
          
          tableStats.push({
            name: table.name,
            rowCount: rowCount.count,
            columnCount: tableInfo.length,
            indexCount: indexes.length,
            columns: tableInfo.map(col => ({
              name: col.name,
              type: col.type,
              notNull: col.notnull === 1,
              primaryKey: col.pk === 1
            })),
            indexes: indexes.map(idx => idx.name)
          });
        } catch (error) {
          console.warn(`Could not get stats for table ${table.name}:`, error.message);
        }
      }
      
      // Get database file stats
      const fs = require('fs');
      const fileStats = fs.statSync(dbPath);
      
      // Get SQLite configuration
      const pragmas = {
        journalMode: db.pragma('journal_mode', { simple: true }),
        synchronous: db.pragma('synchronous', { simple: true }),
        cacheSize: db.pragma('cache_size', { simple: true }),
        tempStore: db.pragma('temp_store', { simple: true }),
        mmapSize: db.pragma('mmap_size', { simple: true })
      };
      
      db.close();
      
      res.json({
        database: {
          path: dbPath,
          size: fileStats.size,
          sizeFormatted: (fileStats.size / (1024 * 1024)).toFixed(2) + ' MB',
          modified: fileStats.mtime,
          tables: tableStats.length,
          totalRows: tableStats.reduce((sum, table) => sum + table.rowCount, 0)
        },
        tables: tableStats,
        configuration: pragmas,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      db.close();
      throw error;
    }
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch database statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/performance/database/optimize
 * Optimize database (VACUUM, ANALYZE, etc.)
 */
router.post('/database/optimize', async (req, res) => {
  try {
    const { operations } = req.body;
    const allowedOperations = ['analyze', 'optimize', 'vacuum'];
    const requestedOps = operations || ['analyze', 'optimize'];
    
    // Validate operations
    const validOps = requestedOps.filter((op: string) => allowedOperations.includes(op));
    
    if (validOps.length === 0) {
      return res.status(400).json({
        error: 'No valid operations specified',
        allowedOperations
      });
    }
    
    const Database = require('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'alfalyzer.db');
    const db = new Database(dbPath);
    
    const results: string[] = [];
    const startTime = Date.now();
    
    try {
      if (validOps.includes('analyze')) {
        db.exec('ANALYZE;');
        results.push('Database statistics updated (ANALYZE)');
      }
      
      if (validOps.includes('optimize')) {
        db.exec('PRAGMA optimize;');
        results.push('Database optimized (PRAGMA optimize)');
      }
      
      if (validOps.includes('vacuum')) {
        // VACUUM can be expensive, so warn about it
        console.log('🔄 [Performance] Starting VACUUM operation...');
        db.exec('VACUUM;');
        results.push('Database vacuumed (space reclaimed)');
      }
      
      db.close();
      
      const duration = Date.now() - startTime;
      
      res.json({
        success: true,
        message: 'Database optimization completed',
        operations: validOps,
        results,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      db.close();
      throw error;
    }
  } catch (error) {
    console.error('Database optimization error:', error);
    res.status(500).json({
      error: 'Database optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/performance/health
 * Get quick health check status
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = performanceMonitor.getHealthStatus();
    const memoryUsage = process.memoryUsage();
    
    const health = {
      status: healthStatus.status,
      uptime: process.uptime(),
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        usage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1) + '%'
      },
      alerts: {
        active: healthStatus.activeAlerts.length,
        critical: healthStatus.activeAlerts.filter(a => a.severity === 'critical').length
      },
      performance: {
        cacheHitRate: healthStatus.summary.cacheHitRate.toFixed(1) + '%'
      },
      timestamp: new Date().toISOString()
    };
    
    // Return appropriate HTTP status based on health
    const statusCode = healthStatus.status === 'critical' ? 503 : 
                      healthStatus.status === 'warning' ? 200 : 200;
    
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;