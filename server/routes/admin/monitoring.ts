/**
 * FASE 2 - DIA 8: Monitoring Dashboard Admin Routes
 * Admin endpoints for comprehensive monitoring, alerts, and system diagnostics
 */

import { Router } from 'express';
import HealthMonitor from '../../services/health-monitor';
import { performanceAnalytics } from '../../services/performance-analytics';
import { structuredLogger } from '../../services/structured-logger';
import { errorTracker } from '../../services/error-tracker';

const router = Router();

/**
 * GET /api/admin/monitoring/overview
 * Get comprehensive monitoring overview
 */
router.get('/overview', async (req, res) => {
  try {
    const healthMonitor = HealthMonitor.getInstance();
    
    // Get enhanced health status
    const healthStatus = await healthMonitor.getEnhancedHealthStatus();
    
    // Get performance analytics summary
    const analyticsStatus = performanceAnalytics.getAnalyticsSummary();
    
    // Get error tracking summary
    const errorReport = errorTracker.generateReport();
    
    // Get logger performance metrics
    const loggerStats = structuredLogger.getStats();
    
    const overview = {
      timestamp: new Date().toISOString(),
      system: {
        health: healthStatus.overall,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        hostname: require('os').hostname()
      },
      monitoring: {
        healthChecks: {
          active: healthStatus.monitoring.isActive,
          total: healthStatus.monitoring.metricsCount,
          alerts: healthStatus.monitoring.alertsCount
        },
        analytics: {
          active: analyticsStatus.systemHealth.overall !== 'critical',
          metrics: analyticsStatus.totalMetrics,
          trends: analyticsStatus.totalTrends,
          alerts: analyticsStatus.totalAlerts
        },
        errorTracking: {
          totalErrors: errorReport.summary.totalErrors,
          newErrors: errorReport.summary.newErrors,
          criticalErrors: errorReport.summary.criticalErrors,
          errorRate: errorReport.summary.errorRate
        },
        logging: {
          transports: loggerStats.transports.length,
          activeTransports: loggerStats.transports.filter(t => t.enabled).length,
          performanceMetrics: Object.keys(loggerStats.performanceMetrics).length
        }
      },
      alerts: {
        active: healthStatus.alerts.length + analyticsStatus.unresolvedAlerts,
        critical: analyticsStatus.criticalAlerts,
        recentAlerts: [
          ...healthStatus.alerts.slice(0, 3),
          ...performanceAnalytics.getAlerts({ resolved: false, limit: 3 })
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      },
      performance: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        },
        cpu: {
          usage: require('os').loadavg()[0],
          cores: require('os').cpus().length
        }
      }
    };

    res.json(overview);
  } catch (error) {
    console.error('Monitoring overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch monitoring overview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/monitoring/health
 * Get detailed health monitoring data
 */
router.get('/health', async (req, res) => {
  try {
    const healthMonitor = HealthMonitor.getInstance();
    const healthData = await healthMonitor.getEnhancedHealthStatus();
    
    res.json({
      status: healthData.overall,
      health: healthData.health,
      alerts: healthData.alerts,
      analytics: healthData.analytics,
      monitoring: healthData.monitoring,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health monitoring error:', error);
    res.status(500).json({
      error: 'Failed to fetch health monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/health/start
 * Start continuous health monitoring
 */
router.post('/health/start', async (req, res) => {
  try {
    const { interval = 30000 } = req.body;
    const healthMonitor = HealthMonitor.getInstance();
    
    healthMonitor.startContinuousMonitoring(interval);
    
    res.json({
      success: true,
      message: 'Health monitoring started',
      interval,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Start health monitoring error:', error);
    res.status(500).json({
      error: 'Failed to start health monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/health/stop
 * Stop continuous health monitoring
 */
router.post('/health/stop', async (req, res) => {
  try {
    const healthMonitor = HealthMonitor.getInstance();
    healthMonitor.stopContinuousMonitoring();
    
    res.json({
      success: true,
      message: 'Health monitoring stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stop health monitoring error:', error);
    res.status(500).json({
      error: 'Failed to stop health monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/monitoring/analytics
 * Get performance analytics data
 */
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = 60 } = req.query; // minutes
    
    const analytics = performanceAnalytics.getPerformanceAnalytics(parseInt(timeRange as string));
    const trends = performanceAnalytics.getTrends();
    const summary = performanceAnalytics.getAnalyticsSummary();
    
    res.json({
      analytics,
      trends,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/analytics/start
 * Start performance analytics
 */
router.post('/analytics/start', async (req, res) => {
  try {
    performanceAnalytics.start();
    
    res.json({
      success: true,
      message: 'Performance analytics started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Start analytics error:', error);
    res.status(500).json({
      error: 'Failed to start performance analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/analytics/stop
 * Stop performance analytics
 */
router.post('/analytics/stop', async (req, res) => {
  try {
    performanceAnalytics.stop();
    
    res.json({
      success: true,
      message: 'Performance analytics stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stop analytics error:', error);
    res.status(500).json({
      error: 'Failed to stop performance analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/monitoring/alerts
 * Get all alerts with filtering
 */
router.get('/alerts', async (req, res) => {
  try {
    const { 
      resolved = 'false',
      severity,
      type,
      source,
      limit = '50'
    } = req.query;

    const healthMonitor = HealthMonitor.getInstance();
    
    // Get health alerts
    const healthAlerts = healthMonitor.getAlerts({
      resolved: resolved === 'true',
      severity: severity as string,
      type: type as string,
      limit: parseInt(limit as string)
    });

    // Get performance alerts
    const perfAlerts = performanceAnalytics.getAlerts({
      resolved: resolved === 'true',
      severity: severity as string,
      type: type as string,
      limit: parseInt(limit as string)
    });

    // Get error alerts (from error tracker)
    const errorAlerts = errorTracker.getErrors({
      status: resolved === 'true' ? 'resolved' : undefined,
      severity: severity as any,
      limit: parseInt(limit as string)
    }).map(error => ({
      id: error.id,
      type: 'error',
      severity: error.severity,
      title: `Error: ${error.name}`,
      message: error.message,
      timestamp: error.lastSeen,
      resolved: error.status === 'resolved',
      source: 'error_tracker',
      metadata: {
        count: error.count,
        affectedUsers: error.affectedUsers.size,
        fingerprint: error.fingerprint
      }
    }));

    // Combine all alerts
    const allAlerts = [
      ...healthAlerts,
      ...perfAlerts,
      ...errorAlerts
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply source filter if specified
    const filteredAlerts = source 
      ? allAlerts.filter(alert => alert.source?.includes(source as string))
      : allAlerts;

    res.json({
      alerts: filteredAlerts.slice(0, parseInt(limit as string)),
      total: filteredAlerts.length,
      filters: { resolved, severity, type, source, limit },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/alerts/:alertId/resolve
 * Resolve a specific alert
 */
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution, resolvedBy = 'admin' } = req.body;

    const healthMonitor = HealthMonitor.getInstance();
    
    // Try to resolve in health monitor
    let resolved = healthMonitor.resolveAlert(alertId);
    
    // Try to resolve in error tracker if not found
    if (!resolved && alertId.startsWith('error_')) {
      resolved = errorTracker.updateErrorStatus(alertId, 'resolved', {
        resolvedAt: new Date(),
        resolvedBy,
        resolution: resolution || 'Manually resolved via admin panel'
      });
    }

    if (resolved) {
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        alertId,
        resolution,
        resolvedBy,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Alert not found',
        alertId
      });
    }
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/alerts/manual
 * Create a manual alert
 */
router.post('/alerts/manual', async (req, res) => {
  try {
    const {
      type = 'system',
      severity = 'medium',
      title,
      message,
      source = 'manual',
      metadata = {}
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        error: 'Title and message are required'
      });
    }

    const healthMonitor = HealthMonitor.getInstance();
    
    const alert = healthMonitor.createAlert({
      type,
      severity,
      title,
      message,
      source,
      metadata: {
        ...metadata,
        createdBy: 'admin',
        manual: true
      }
    });

    res.json({
      success: true,
      message: 'Manual alert created',
      alert,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create manual alert error:', error);
    res.status(500).json({
      error: 'Failed to create manual alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/monitoring/errors
 * Get error tracking data
 */
router.get('/errors', async (req, res) => {
  try {
    const {
      severity,
      type,
      status,
      hours = '24',
      limit = '50'
    } = req.query;

    const since = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);
    
    const errors = errorTracker.getErrors({
      severity: severity as any,
      type: type as any,
      status: status as any,
      since,
      limit: parseInt(limit as string)
    });

    const report = errorTracker.generateReport({
      start: since,
      end: new Date()
    });

    res.json({
      errors,
      report,
      filters: { severity, type, status, hours, limit },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get errors error:', error);
    res.status(500).json({
      error: 'Failed to fetch error data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/errors/track
 * Manually track an error
 */
router.post('/errors/track', async (req, res) => {
  try {
    const { message, stack, customData = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Error message is required'
      });
    }

    const error = new Error(message);
    if (stack) error.stack = stack;

    const errorId = errorTracker.trackError(error, {
      customData: {
        ...customData,
        source: 'manual_admin',
        createdBy: 'admin'
      }
    });

    res.json({
      success: true,
      message: 'Error tracked successfully',
      errorId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Track error manually error:', error);
    res.status(500).json({
      error: 'Failed to track error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/monitoring/logs
 * Get structured logging statistics
 */
router.get('/logs', async (req, res) => {
  try {
    const loggerStats = structuredLogger.getStats();
    
    res.json({
      stats: loggerStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      error: 'Failed to fetch logging data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/monitoring/logs/test
 * Test logging system with sample logs
 */
router.post('/logs/test', async (req, res) => {
  try {
    const { level = 'info', message = 'Test log message', metadata = {} } = req.body;

    const logger = structuredLogger.child({ 
      source: 'admin_test',
      requestId: `test_${Date.now()}`
    });

    switch (level) {
      case 'debug':
        logger.debug(message, metadata);
        break;
      case 'info':
        logger.info(message, metadata);
        break;
      case 'warn':
        logger.warn(message, metadata);
        break;
      case 'error':
        logger.error(message, new Error(message), metadata);
        break;
      case 'fatal':
        logger.fatal(message, new Error(message), metadata);
        break;
      default:
        logger.info(message, metadata);
    }

    res.json({
      success: true,
      message: 'Test log created',
      level,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test logs error:', error);
    res.status(500).json({
      error: 'Failed to create test log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/monitoring/export
 * Export all monitoring data
 */
router.get('/export', async (req, res) => {
  try {
    const healthMonitor = HealthMonitor.getInstance();
    
    const exportData = {
      health: healthMonitor.exportMonitoringData(),
      analytics: performanceAnalytics.exportData(),
      errors: errorTracker.exportData(),
      logs: structuredLogger.getStats(),
      exportTimestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV
      }
    };

    res.json(exportData);
  } catch (error) {
    console.error('Export monitoring data error:', error);
    res.status(500).json({
      error: 'Failed to export monitoring data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;