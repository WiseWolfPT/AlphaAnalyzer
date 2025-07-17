import { Router, Request, Response } from 'express';
import { jobQueue } from '../services/job-queue';
import { jobProcessor } from '../services/job-processor';
import { DataOrchestrator } from '../services/data-orchestrator';

const router = Router();

/**
 * Vercel Cron endpoint for Tier 1 updates (every 15 minutes)
 * High-priority stocks during market hours
 */
router.post('/update-tier-1', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting Tier 1 cron job...');
    
    // High-priority stocks
    const tier1Symbols = [
      'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 
      'META', 'NVDA', 'BRK.B', 'JPM', 'JNJ'
    ];

    // Add jobs to queue
    const jobs = tier1Symbols.map(symbol => ({
      type: 'update_stock_data',
      payload: { symbol, tier: 1 },
      options: { priority: 10, tier: 1 }
    }));

    await jobQueue.addBatchJobs(jobs);
    
    // Process jobs immediately for cron
    await jobProcessor.processNextBatch(tier1Symbols.length);
    
    const stats = await jobQueue.getJobStats();
    
    res.status(200).json({
      success: true,
      message: 'Tier 1 update completed',
      symbolsUpdated: tier1Symbols.length,
      stats
    });

  } catch (error) {
    console.error('❌ Tier 1 cron job failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Vercel Cron endpoint for Tier 2 updates (every 30 minutes)
 * Standard stocks
 */
router.post('/update-tier-2', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting Tier 2 cron job...');
    
    // Standard priority stocks
    const tier2Symbols = [
      'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 
      'ADBE', 'PYPL', 'DIS', 'V', 'MA'
    ];

    const jobs = tier2Symbols.map(symbol => ({
      type: 'update_stock_data',
      payload: { symbol, tier: 2 },
      options: { priority: 5, tier: 2 }
    }));

    await jobQueue.addBatchJobs(jobs);
    await jobProcessor.processNextBatch(tier2Symbols.length);
    
    const stats = await jobQueue.getJobStats();
    
    res.status(200).json({
      success: true,
      message: 'Tier 2 update completed',
      symbolsUpdated: tier2Symbols.length,
      stats
    });

  } catch (error) {
    console.error('❌ Tier 2 cron job failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Vercel Cron endpoint for market status check (every 5 minutes)
 */
router.post('/check-market', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting market status check...');
    
    await jobQueue.addJob('check_market_status', {}, { priority: 15 });
    await jobProcessor.processNextBatch(1);
    
    res.status(200).json({
      success: true,
      message: 'Market status check completed'
    });

  } catch (error) {
    console.error('❌ Market status check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Daily cleanup job (every 24 hours at 2 AM)
 */
router.post('/daily-cleanup', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting daily cleanup...');
    
    // Clean up old jobs
    const deletedJobs = await jobQueue.cleanupOldJobs(7); // 7 days old
    
    // Clean up old cache entries
    await jobQueue.addJob('cleanup_old_data', { daysOld: 30 }, { priority: 1 });
    await jobProcessor.processNextBatch(1);
    
    res.status(200).json({
      success: true,
      message: 'Daily cleanup completed',
      deletedJobs
    });

  } catch (error) {
    console.error('❌ Daily cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cache warm-up job (every hour)
 */
router.post('/warm-cache', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting cache warm-up...');
    
    const popularSymbols = [
      'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN',
      'META', 'NVDA', 'BRK.B', 'JPM', 'JNJ'
    ];
    
    await jobQueue.addJob('cache_warm_up', { symbols: popularSymbols }, { priority: 8 });
    await jobProcessor.processNextBatch(1);
    
    res.status(200).json({
      success: true,
      message: 'Cache warm-up completed',
      symbolsWarmed: popularSymbols.length
    });

  } catch (error) {
    console.error('❌ Cache warm-up failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Manual trigger for custom symbol updates
 */
router.post('/update-symbols', async (req: Request, res: Response) => {
  try {
    const { symbols, priority = 5 } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }

    console.log(`🚀 Manual update requested for ${symbols.length} symbols`);
    
    const jobs = symbols.map((symbol: string) => ({
      type: 'update_stock_data',
      payload: { symbol, tier: 999 }, // Manual tier
      options: { priority }
    }));

    await jobQueue.addBatchJobs(jobs);
    await jobProcessor.processNextBatch(symbols.length);
    
    res.status(200).json({
      success: true,
      message: 'Manual update completed',
      symbolsUpdated: symbols.length
    });

  } catch (error) {
    console.error('❌ Manual update failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for cron system
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = await jobQueue.getJobStats();
    const processorStatus = jobProcessor.getStatus();
    const dataOrchestrator = new DataOrchestrator();
    const orchestratorHealth = await dataOrchestrator.getHealthStatus();
    
    res.status(200).json({
      success: true,
      jobQueue: stats,
      processor: processorStatus,
      dataOrchestrator: orchestratorHealth,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cron health check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get job queue status and recent jobs
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const stats = await jobQueue.getJobStats();
    
    // Get recent jobs for debugging
    const { data: recentJobs } = await (jobQueue as any).supabase
      .from('job_queue')
      .select('id, type, status, created_at, last_error')
      .order('created_at', { ascending: false })
      .limit(20);
    
    res.status(200).json({
      success: true,
      stats,
      recentJobs: recentJobs || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to get cron status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;