import { Router } from 'express';
import { rateLimitTracker } from '../../services/rate-limit-tracker';
import { authMiddleware } from '../../middleware/auth-middleware';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authMiddleware.instance.authenticate());

/**
 * GET /api/admin/rate-limits/dashboard
 * Get comprehensive rate limit dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const dashboardData = await rateLimitTracker.getDashboardData();
    res.json(dashboardData);
  } catch (error) {
    console.error('❌ Failed to get rate limit dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/rate-limits/usage
 * Get current usage for all providers
 */
router.get('/usage', async (req, res) => {
  try {
    const usage = await rateLimitTracker.getAllUsage();
    res.json(usage);
  } catch (error) {
    console.error('❌ Failed to get rate limit usage:', error);
    res.status(500).json({ 
      error: 'Failed to fetch usage data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/rate-limits/usage/:provider
 * Get usage for a specific provider
 */
router.get('/usage/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const usage = await rateLimitTracker.getProviderUsage(provider);
    res.json(usage);
  } catch (error) {
    console.error('❌ Failed to get provider usage:', error);
    res.status(500).json({ 
      error: 'Failed to fetch provider usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/rate-limits/alerts
 * Get current quota alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await rateLimitTracker.checkAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('❌ Failed to get rate limit alerts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/rate-limits/performance
 * Get performance statistics
 */
router.get('/performance', async (req, res) => {
  try {
    const { provider, hours } = req.query;
    const performance = await rateLimitTracker.getPerformanceStats(
      provider as string,
      hours ? parseInt(hours as string) : 24
    );
    res.json(performance);
  } catch (error) {
    console.error('❌ Failed to get performance stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch performance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/rate-limits/best-provider
 * Get the best available provider for a given endpoint
 */
router.get('/best-provider', async (req, res) => {
  try {
    const { providers, endpoint } = req.query;
    
    if (!providers) {
      return res.status(400).json({ error: 'providers parameter is required' });
    }

    const providerList = (providers as string).split(',');
    const bestProvider = await rateLimitTracker.selectBestProvider(
      providerList,
      endpoint as string || 'quote'
    );
    
    res.json(bestProvider);
  } catch (error) {
    console.error('❌ Failed to select best provider:', error);
    res.status(500).json({ 
      error: 'Failed to select best provider',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/rate-limits/reset
 * Reset usage counters for a specific provider/endpoint (admin only)
 */
router.post('/reset', async (req, res) => {
  try {
    const { provider, endpoint } = req.body;
    
    if (!provider || !endpoint) {
      return res.status(400).json({ 
        error: 'provider and endpoint are required' 
      });
    }

    await rateLimitTracker.resetUsage(provider, endpoint);
    res.json({ 
      success: true, 
      message: `Reset usage for ${provider}/${endpoint}` 
    });
  } catch (error) {
    console.error('❌ Failed to reset usage:', error);
    res.status(500).json({ 
      error: 'Failed to reset usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/rate-limits/cleanup
 * Clean up old rate limit logs
 */
router.post('/cleanup', async (req, res) => {
  try {
    const deletedCount = await rateLimitTracker.cleanupOldLogs();
    res.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned up ${deletedCount} old log entries` 
    });
  } catch (error) {
    console.error('❌ Failed to cleanup logs:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/rate-limits/status
 * Get quick status overview
 */
router.get('/status', async (req, res) => {
  try {
    const [usage, alerts] = await Promise.all([
      rateLimitTracker.getAllUsage(),
      rateLimitTracker.checkAlerts()
    ]);

    const status = {
      timestamp: new Date().toISOString(),
      totalProviders: usage.length,
      activeProviders: usage.filter(u => u.used > 0).length,
      providersNearLimit: usage.filter(u => u.usagePercent >= 80).length,
      totalAlerts: alerts.summary.total,
      healthStatus: alerts.summary.warnings > 0 ? 'warning' : 
                   alerts.summary.alerts > 0 ? 'alert' : 'healthy'
    };

    res.json(status);
  } catch (error) {
    console.error('❌ Failed to get status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;