import { Router, Request, Response } from 'express';
import { cronManager } from '../services/cron/cron-manager';
import { cronSecurityMiddleware, cronLoggingMiddleware, cronRateLimitMiddleware } from '../middleware/cron-security';
import { logger } from '../lib/logger';

const router = Router();

// Apply security middleware to all cron routes
router.use(cronSecurityMiddleware);
router.use(cronLoggingMiddleware);
router.use(cronRateLimitMiddleware(20, 60)); // 20 requests per hour

/**
 * Get status of all cron jobs
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = cronManager.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('[CRON] Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cron status'
    });
  }
});

/**
 * Manually trigger a specific cron job
 */
router.post('/trigger/:jobName', async (req: Request, res: Response) => {
  try {
    const { jobName } = req.params;
    
    logger.info(`[CRON] Manual trigger requested for job: ${jobName}`);
    
    await cronManager.triggerJob(jobName);
    
    res.json({
      success: true,
      message: `Job ${jobName} triggered successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`[CRON] Failed to trigger job:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger job'
    });
  }
});

/**
 * Keep-alive endpoint for preventing cold starts
 */
router.post('/keep-alive', async (req: Request, res: Response) => {
  try {
    logger.info('[CRON] Keep-alive endpoint called');
    
    await cronManager.triggerJob('keep-alive');
    
    res.json({
      success: true,
      message: 'Keep-alive triggered',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[CRON] Keep-alive failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Keep-alive failed'
    });
  }
});

/**
 * Cache warmer endpoint
 */
router.post('/warm-cache', async (req: Request, res: Response) => {
  try {
    logger.info('[CRON] Cache warming requested');
    
    await cronManager.triggerJob('cache-warmer');
    
    res.json({
      success: true,
      message: 'Cache warming triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[CRON] Cache warming failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Cache warming failed'
    });
  }
});

/**
 * Cache cleanup endpoint
 */
router.post('/cleanup-cache', async (req: Request, res: Response) => {
  try {
    logger.info('[CRON] Cache cleanup requested');
    
    await cronManager.triggerJob('cache-cleanup');
    
    res.json({
      success: true,
      message: 'Cache cleanup triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[CRON] Cache cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Cache cleanup failed'
    });
  }
});

/**
 * Monitor API quotas
 */
router.post('/monitor-quotas', async (req: Request, res: Response) => {
  try {
    logger.info('[CRON] API quota monitoring requested');
    
    await cronManager.triggerJob('quota-monitor');
    
    res.json({
      success: true,
      message: 'Quota monitoring triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[CRON] Quota monitoring failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Quota monitoring failed'
    });
  }
});

/**
 * Stop all cron jobs (emergency endpoint)
 */
router.post('/stop-all', async (req: Request, res: Response) => {
  try {
    logger.warn('[CRON] STOPPING ALL CRON JOBS!');
    
    cronManager.stopAll();
    
    res.json({
      success: true,
      message: 'All cron jobs stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[CRON] Failed to stop jobs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop jobs'
    });
  }
});

/**
 * Restart all cron jobs
 */
router.post('/restart-all', async (req: Request, res: Response) => {
  try {
    logger.info('[CRON] Restarting all cron jobs');
    
    cronManager.stopAll();
    await cronManager.startAll();
    
    res.json({
      success: true,
      message: 'All cron jobs restarted',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[CRON] Failed to restart jobs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restart jobs'
    });
  }
});

export default router;