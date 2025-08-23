import { jobQueue, Job, JobPayload } from './job-queue';
import { DataOrchestrator } from './data-orchestrator';
// import { PolygonService } from './polygon-service'; // Removed - keeping only FMP + Alpha Vantage
import { ServerMarketDataService } from './market-data-service';

/**
 * Job Processor - Executes background jobs
 * Handles different job types and processes them asynchronously
 */
export class JobProcessor {
  private dataOrchestrator: DataOrchestrator;
  // private polygonService: PolygonService; // Removed - keeping only FMP + Alpha Vantage
  private marketDataService: ServerMarketDataService;
  private isProcessing = false;

  constructor() {
    this.dataOrchestrator = new DataOrchestrator();
    // this.polygonService = new PolygonService(); // Removed - keeping only FMP + Alpha Vantage
    this.marketDataService = new ServerMarketDataService();
  }

  /**
   * Start processing jobs continuously
   */
  async startProcessing(intervalMs = 30000): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Job processor already running');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting job processor...');

    const processLoop = async () => {
      if (!this.isProcessing) return;

      try {
        await this.processNextBatch();
      } catch (error) {
        console.error('❌ Error in job processing loop:', error);
      }

      // Schedule next iteration
      setTimeout(processLoop, intervalMs);
    };

    processLoop();
  }

  /**
   * Stop processing jobs
   */
  stopProcessing(): void {
    this.isProcessing = false;
    console.log('🛑 Job processor stopped');
  }

  /**
   * Process next batch of jobs
   */
  async processNextBatch(batchSize = 5): Promise<void> {
    const jobs = await jobQueue.getNextJobs(batchSize);
    
    if (jobs.length === 0) {
      return; // No jobs to process
    }

    console.log(`🔄 Processing ${jobs.length} jobs...`);

    // Process jobs in parallel
    const promises = jobs.map(job => this.processJob(job));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single job
   */
  async processJob(job: Job): Promise<void> {
    try {
      await jobQueue.markJobProcessing(job.id);
      console.log(`🔧 Processing job ${job.id}: ${job.type}`);

      let result: any;

      switch (job.type) {
        case 'update_stock_data':
          result = await this.processStockUpdate(job.payload);
          break;
        
        case 'update_market_status':
          result = await this.processMarketStatusUpdate(job.payload);
          break;
        
        case 'bulk_stock_update':
          result = await this.processBulkStockUpdate(job.payload);
          break;
        
        case 'check_market_status':
          result = await this.processMarketStatusCheck(job.payload);
          break;
        
        case 'cleanup_old_data':
          result = await this.processDataCleanup(job.payload);
          break;
        
        case 'cache_warm_up':
          result = await this.processCacheWarmUp(job.payload);
          break;
        
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await jobQueue.markJobCompleted(job.id, result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Job ${job.id} failed:`, errorMessage);
      await jobQueue.markJobFailed(job.id, errorMessage);
    }
  }

  /**
   * Process stock data update for a single symbol
   */
  private async processStockUpdate(payload: JobPayload): Promise<any> {
    const { symbol, tier } = payload;
    
    if (!symbol) {
      throw new Error('Symbol is required for stock update');
    }

    console.log(`📈 Updating stock data for ${symbol} (tier ${tier})`);

    // Use data orchestrator to get data with fallback
    const stockData = await this.dataOrchestrator.updateStockData(symbol);
    
    if (!stockData) {
      throw new Error(`Failed to get data for ${symbol}`);
    }

    return {
      symbol,
      lastPrice: stockData.price,
      volume: stockData.volume,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Process bulk stock updates
   */
  private async processBulkStockUpdate(payload: JobPayload): Promise<any> {
    const { symbols } = payload;
    
    if (!symbols || !Array.isArray(symbols)) {
      throw new Error('Symbols array is required for bulk update');
    }

    console.log(`📊 Bulk updating ${symbols.length} stocks`);

    const results = [];
    const errors = [];

    for (const symbol of symbols) {
      try {
        const result = await this.processStockUpdate({ symbol });
        results.push(result);
      } catch (error) {
        errors.push({ symbol, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return {
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Process market status update
   */
  private async processMarketStatusUpdate(payload: JobPayload): Promise<any> {
    console.log('🏛️ Updating market status');

    const marketStatus = await this.marketDataService.getMarketStatus();
    
    // Store market status in database
    // Implementation depends on your market status storage strategy
    
    return {
      isOpen: marketStatus.isOpen,
      session: marketStatus.session,
      nextClose: marketStatus.nextClose,
      nextOpen: marketStatus.nextOpen,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Process market status check
   */
  private async processMarketStatusCheck(payload: JobPayload): Promise<any> {
    console.log('🔍 Checking market status');

    const isMarketOpen = await this.marketDataService.isMarketOpen();
    
    if (isMarketOpen) {
      // Schedule more frequent updates during market hours
      await jobQueue.scheduleStockUpdates();
      console.log('📈 Market is open - scheduled frequent updates');
    } else {
      console.log('🌙 Market is closed - reduced update frequency');
    }

    return { isMarketOpen, checkedAt: new Date().toISOString() };
  }

  /**
   * Process data cleanup
   */
  private async processDataCleanup(payload: JobPayload): Promise<any> {
    const { daysOld = 30 } = payload;
    
    console.log(`🧹 Cleaning up data older than ${daysOld} days`);

    // Clean up old job queue entries
    const deletedJobs = await jobQueue.cleanupOldJobs(daysOld);
    
    // Clean up old cache entries
    // Implementation depends on your cache cleanup strategy
    
    return {
      deletedJobs,
      cleanedAt: new Date().toISOString()
    };
  }

  /**
   * Process cache warm-up
   */
  private async processCacheWarmUp(payload: JobPayload): Promise<any> {
    const { symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'] } = payload;
    
    console.log(`🔥 Warming up cache for ${symbols.length} symbols`);

    const results = [];
    
    for (const symbol of symbols) {
      try {
        await this.dataOrchestrator.warmCache(symbol);
        results.push({ symbol, status: 'success' });
      } catch (error) {
        results.push({ 
          symbol, 
          status: 'failed', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return {
      warmedSymbols: results.filter(r => r.status === 'success').length,
      failedSymbols: results.filter(r => r.status === 'failed').length,
      results,
      warmedAt: new Date().toISOString()
    };
  }

  /**
   * Get processor status
   */
  getStatus(): { isProcessing: boolean; uptime: number } {
    return {
      isProcessing: this.isProcessing,
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
export const jobProcessor = new JobProcessor();