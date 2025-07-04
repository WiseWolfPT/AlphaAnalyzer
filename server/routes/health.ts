/**
 * Enhanced Health Check Routes
 * Provides comprehensive health monitoring with auto-recovery capabilities
 */

import { Router, Request, Response } from 'express';
import HealthMonitor from '../services/health-monitor';
import kvRouter from './health/kv';
import { getTTFBStats, getTTFBRecommendations } from '../middleware/ttfb-middleware';

const router = Router();
const healthMonitor = HealthMonitor.getInstance();

// ROADMAP V4: Mount KV health router
router.use('/kv', kvRouter);

/**
 * TTFB Performance endpoint - Roadmap V4
 * GET /api/health/ttfb
 */
router.get('/ttfb', (req: Request, res: Response) => {
  try {
    const stats = getTTFBStats();
    const recommendations = getTTFBRecommendations();
    
    res.json({
      ...stats,
      recommendations,
      targets: {
        cacheHitTTFB: '< 300ms',
        averageTTFB: '< 1000ms',
        cacheHitRate: '> 80%'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get TTFB statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Quick health check - fast response for load balancers
 * GET /api/health/quick
 */
router.get('/quick', async (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_quick');
    
    const result = await healthMonitor.quickHealthCheck();
    
    res.status(200).json(result);
  } catch (error) {
    healthMonitor.recordError('health_quick');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Comprehensive health check
 * GET /api/health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_detailed');
    
    const result = await healthMonitor.performHealthCheck();
    
    // Set appropriate HTTP status based on health
    let statusCode = 200;
    if (result.status === 'degraded') {
      statusCode = 200; // Still healthy but with warnings
    } else if (result.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }
    
    res.status(statusCode).json(result);
  } catch (error) {
    healthMonitor.recordError('health_detailed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: [],
      system: {},
    });
  }
});

/**
 * Readiness probe - indicates if service is ready to accept traffic
 * GET /api/health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_ready');
    
    const result = await healthMonitor.performHealthCheck();
    
    // Service is ready if it's healthy or degraded (but not unhealthy)
    const isReady = result.status !== 'unhealthy';
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        uptime: result.uptime,
        checks: result.checks.filter(check => check.status === 'critical').length === 0,
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Critical health checks failed',
        critical_failures: result.checks.filter(check => check.status === 'critical').length,
      });
    }
  } catch (error) {
    healthMonitor.recordError('health_ready');
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Liveness probe - indicates if service is alive
 * GET /api/health/live
 */
router.get('/live', async (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_live');
    
    // Simple liveness check - just verify the service is responding
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
    });
  } catch (error) {
    healthMonitor.recordError('health_live');
    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Metrics endpoint - for monitoring systems
 * GET /api/health/metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_metrics');
    
    const result = await healthMonitor.performHealthCheck();
    
    // Format metrics for Prometheus-style monitoring
    const metrics = {
      // Service metrics
      service_status: result.status === 'healthy' ? 1 : result.status === 'degraded' ? 0.5 : 0,
      service_uptime_seconds: Math.floor(result.uptime / 1000),
      service_response_time_ms: result.performance.responseTime,
      
      // System metrics
      system_cpu_usage: result.system.cpu.usage,
      system_memory_usage_mb: result.system.memory.used,
      system_memory_percentage: result.system.memory.percentage,
      system_load_average_1m: result.system.cpu.loadAverage[0],
      
      // Health check metrics
      health_checks_total: result.checks.length,
      health_checks_healthy: result.checks.filter(c => c.status === 'healthy').length,
      health_checks_warning: result.checks.filter(c => c.status === 'warning').length,
      health_checks_critical: result.checks.filter(c => c.status === 'critical').length,
      
      // Performance metrics
      requests_per_minute: result.performance.requestsPerMinute || 0,
      error_rate_percentage: result.performance.errorRate || 0,
      
      // Recovery metrics
      recovery_attempts_total: result.recovery?.attempts || 0,
      recovery_enabled: result.recovery?.enabled ? 1 : 0,
      
      // Timestamp
      timestamp: Date.now(),
    };
    
    res.status(200).json(metrics);
  } catch (error) {
    healthMonitor.recordError('health_metrics');
    res.status(503).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    });
  }
});

/**
 * Recovery endpoint - trigger manual recovery
 * POST /api/health/recover
 */
router.post('/recover', async (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_recover');
    
    const recoveryResult = await healthMonitor.attemptAutoRecovery();
    
    if (recoveryResult) {
      res.status(200).json({
        status: 'recovery_successful',
        timestamp: new Date().toISOString(),
        message: 'Auto-recovery completed successfully',
      });
    } else {
      res.status(500).json({
        status: 'recovery_failed',
        timestamp: new Date().toISOString(),
        message: 'Auto-recovery failed',
      });
    }
  } catch (error) {
    healthMonitor.recordError('health_recover');
    res.status(500).json({
      status: 'recovery_error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Recovery status endpoint
 * GET /api/health/recovery
 */
router.get('/recovery', (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_recovery_status');
    
    const status = healthMonitor.getRecoveryStatus();
    
    res.status(200).json({
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    healthMonitor.recordError('health_recovery_status');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Configure recovery settings
 * PUT /api/health/recovery/config
 */
router.put('/recovery/config', (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_recovery_config');
    
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid configuration: enabled must be a boolean',
        timestamp: new Date().toISOString(),
      });
    }
    
    healthMonitor.setAutoRecovery(enabled);
    
    res.status(200).json({
      status: 'configuration_updated',
      enabled,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    healthMonitor.recordError('health_recovery_config');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Legacy health endpoint for backwards compatibility
 * GET /api/health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    healthMonitor.recordRequest('health_legacy');
    
    // Simple health check for backwards compatibility
    const result = await healthMonitor.quickHealthCheck();
    
    res.status(200).json({
      status: "healthy",
      timestamp: result.timestamp,
      version: "1.0.0",
      uptime: Math.floor(result.uptime / 1000),
      env: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    healthMonitor.recordError('health_legacy');
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check with specific component
 * GET /api/health/check/:component
 */
router.get('/check/:component', async (req: Request, res: Response) => {
  try {
    const component = req.params.component;
    healthMonitor.recordRequest(`health_check_${component}`);
    
    const result = await healthMonitor.performHealthCheck();
    const componentCheck = result.checks.find(check => 
      check.name === component || check.name.includes(component)
    );
    
    if (componentCheck) {
      const statusCode = componentCheck.status === 'healthy' ? 200 :
                        componentCheck.status === 'warning' ? 200 : 503;
      
      res.status(statusCode).json({
        component,
        ...componentCheck,
      });
    } else {
      res.status(404).json({
        error: `Component '${component}' not found`,
        available_components: result.checks.map(check => check.name),
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    healthMonitor.recordError(`health_check_${req.params.component}`);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;