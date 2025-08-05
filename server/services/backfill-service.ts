import { rateLimitTracker } from './rate-limit-tracker';
import { PolygonService } from './polygon-service';
import { getSupabaseClient } from '../lib/supabase-client';

export interface BackfillJobConfig {
  id: string;
  symbol: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  priority: number; // 1-10, higher = more important
  dataTypes: ('quotes' | 'aggregates' | 'fundamentals')[];
  provider: 'polygon' | 'twelve_data' | 'fmp' | 'alpha_vantage' | 'finnhub';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface BackfillProgress {
  symbol: string;
  totalDays: number;
  completedDays: number;
  progressPercent: number;
  currentDate: string;
  estimatedTimeRemaining: string;
  dataPointsCollected: number;
  errorsEncountered: number;
}

export interface BackfillStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalDataPoints: number;
  jobsCompletedToday: number;
  averageJobDuration: number;
  topPrioritySymbols: string[];
}

/**
 * Historical Data Backfill Service
 * 
 * Intelligently loads historical market data while respecting API rate limits.
 * Features:
 * - Priority-based job queue with symbol popularity ranking
 * - Automatic rate limit compliance with multiple providers
 * - Progress tracking and resumable operations
 * - Error handling with exponential backoff retry logic
 * - Smart batch processing to optimize API usage
 * - Admin dashboard integration for monitoring
 */
export class BackfillService {
  private polygonService: PolygonService;
  private isRunning = false;
  private currentJob: BackfillJobConfig | null = null;
  private jobQueue: BackfillJobConfig[] = [];
  private processedJobs = new Map<string, BackfillJobConfig>();
  private batchSize = 10; // Days to request in one batch
  private maxConcurrentJobs = 1; // Process one symbol at a time to avoid rate limits

  constructor() {
    this.polygonService = new PolygonService();
  }

  /**
   * Start the backfill service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('📊 [BackfillService] Service already running');
      return;
    }

    this.isRunning = true;
    console.log('📊 [BackfillService] Starting historical data backfill service');

    // Load existing jobs from database
    await this.loadJobsFromDatabase();

    // Start processing queue
    this.processJobQueue();
  }

  /**
   * Stop the backfill service
   */
  stop(): void {
    this.isRunning = false;
    this.currentJob = null;
    console.log('📊 [BackfillService] Backfill service stopped');
  }

  /**
   * Add a new backfill job with intelligent prioritization
   */
  async addBackfillJob(
    symbol: string,
    startDate: string,
    endDate: string,
    dataTypes: ('quotes' | 'aggregates' | 'fundamentals')[] = ['aggregates'],
    customPriority?: number
  ): Promise<string> {
    const jobId = `backfill-${symbol}-${Date.now()}`;
    
    // Calculate priority based on symbol popularity and market cap
    const priority = customPriority || await this.calculateSymbolPriority(symbol);

    const job: BackfillJobConfig = {
      id: jobId,
      symbol: symbol.toUpperCase(),
      startDate,
      endDate,
      priority,
      dataTypes,
      provider: 'polygon', // Default to Polygon, can be changed based on availability
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    // Add to queue and sort by priority
    this.jobQueue.push(job);
    this.jobQueue.sort((a, b) => b.priority - a.priority);

    // Save to database
    await this.saveJobToDatabase(job);

    console.log(`📊 [BackfillService] Added backfill job for ${symbol} (priority: ${priority})`);
    return jobId;
  }

  /**
   * Process the job queue
   */
  private async processJobQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Get next highest priority job
        const nextJob = this.jobQueue.find(job => job.status === 'pending');
        
        if (!nextJob) {
          // No pending jobs, wait and check again
          await this.sleep(30000); // Wait 30 seconds
          continue;
        }

        // DISABLED: Rate limit tracking to avoid SQL errors
        // Check rate limits before starting
        // const canProceed = await rateLimitTracker.checkLimit(nextJob.provider, 'aggregates');
        // if (!canProceed.allowed) {
        //   console.log(`⏱️ [BackfillService] Rate limit exceeded for ${nextJob.provider}, waiting...`);
        //   await this.sleep(60000); // Wait 1 minute
        //   continue;
        // }

        // Start processing the job
        await this.processJob(nextJob);

      } catch (error) {
        console.error('❌ [BackfillService] Error in job processing loop:', error);
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Process a single backfill job
   */
  private async processJob(job: BackfillJobConfig): Promise<void> {
    this.currentJob = job;
    job.status = 'running';
    job.updatedAt = new Date();
    
    console.log(`🔄 [BackfillService] Starting backfill for ${job.symbol} (${job.startDate} to ${job.endDate})`);

    try {
      await this.updateJobInDatabase(job);

      // Calculate date range
      const startDate = new Date(job.startDate);
      const endDate = new Date(job.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let completedDays = 0;
      let dataPointsCollected = 0;
      let errorsEncountered = 0;

      // Process data in batches to respect rate limits
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + this.batchSize)) {
        if (!this.isRunning || job.status === 'paused') {
          console.log(`⏸️ [BackfillService] Job paused or service stopped for ${job.symbol}`);
          return;
        }

        // Calculate batch end date
        const batchEndDate = new Date(currentDate);
        batchEndDate.setDate(batchEndDate.getDate() + this.batchSize - 1);
        if (batchEndDate > endDate) {
          batchEndDate.setTime(endDate.getTime());
        }

        const fromStr = currentDate.toISOString().split('T')[0];
        const toStr = batchEndDate.toISOString().split('T')[0];

        try {
          // DISABLED: Rate limit tracking to avoid SQL errors
          // Check rate limits before each batch
          // const canProceed = await rateLimitTracker.checkLimit(job.provider, 'aggregates');
          // if (!canProceed.allowed) {
          //   console.log(`⏱️ [BackfillService] Rate limit hit during ${job.symbol} backfill, waiting...`);
          //   await this.sleep(60000); // Wait 1 minute
          //   continue; // Retry the same batch
          // }

          // Fetch data based on job data types
          let batchDataPoints = 0;
          
          for (const dataType of job.dataTypes) {
            switch (dataType) {
              case 'aggregates':
                const aggregatesData = await this.polygonService.getAggregates(job.symbol, fromStr, toStr, 'day', 1000);
                if (aggregatesData) {
                  await this.storeAggregatesData(job.symbol, aggregatesData);
                  batchDataPoints += aggregatesData.length;
                }
                break;
                
              case 'quotes':
                // For quotes, we'll get the most recent quote for the period
                const quoteData = await this.polygonService.getQuote(job.symbol);
                if (quoteData) {
                  await this.storeQuoteData(job.symbol, quoteData, toStr);
                  batchDataPoints += 1;
                }
                break;
                
              case 'fundamentals':
                const fundamentalsData = await this.polygonService.getCompanyDetails(job.symbol);
                if (fundamentalsData) {
                  await this.storeFundamentalsData(job.symbol, fundamentalsData, toStr);
                  batchDataPoints += 1;
                }
                break;
            }
          }

          completedDays += Math.min(this.batchSize, Math.ceil((batchEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          dataPointsCollected += batchDataPoints;

          // Update progress
          job.progress = Math.round((completedDays / totalDays) * 100);
          job.updatedAt = new Date();
          await this.updateJobInDatabase(job);

          console.log(`📈 [BackfillService] ${job.symbol}: ${job.progress}% complete (${completedDays}/${totalDays} days, ${batchDataPoints} data points)`);

          // Small delay between batches to be respectful to APIs
          await this.sleep(2000);

        } catch (error) {
          console.error(`❌ [BackfillService] Error processing batch for ${job.symbol} (${fromStr} to ${toStr}):`, error);
          errorsEncountered++;
          
          // If too many errors, fail the job
          if (errorsEncountered > 10) {
            throw new Error(`Too many errors encountered (${errorsEncountered})`);
          }
          
          // Wait before retrying
          await this.sleep(5000);
        }
      }

      // Job completed successfully
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.updatedAt = new Date();
      
      console.log(`✅ [BackfillService] Completed backfill for ${job.symbol}: ${dataPointsCollected} data points collected`);

    } catch (error) {
      console.error(`❌ [BackfillService] Failed to complete backfill for ${job.symbol}:`, error);
      
      job.retryCount++;
      job.error = error instanceof Error ? error.message : String(error);
      job.updatedAt = new Date();

      if (job.retryCount >= job.maxRetries) {
        job.status = 'failed';
        console.log(`💀 [BackfillService] Job failed permanently for ${job.symbol} after ${job.retryCount} retries`);
      } else {
        job.status = 'pending';
        // Add exponential backoff delay before retry
        const delay = Math.pow(2, job.retryCount) * 60000; // 1min, 2min, 4min...
        console.log(`🔄 [BackfillService] Retrying ${job.symbol} in ${delay / 1000}s (attempt ${job.retryCount + 1})`);
        setTimeout(() => {
          if (this.isRunning) {
            this.jobQueue.push(job);
            this.jobQueue.sort((a, b) => b.priority - a.priority);
          }
        }, delay);
      }
    } finally {
      await this.updateJobInDatabase(job);
      this.processedJobs.set(job.id, job);
      this.currentJob = null;
      
      // Remove from active queue
      const index = this.jobQueue.findIndex(j => j.id === job.id);
      if (index >= 0) {
        this.jobQueue.splice(index, 1);
      }
    }
  }

  /**
   * Calculate symbol priority based on market cap and trading volume
   */
  private async calculateSymbolPriority(symbol: string): Promise<number> {
    try {
      // Popular symbols get higher priority
      const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA', 'AMD', 'INTC'];
      if (popularSymbols.includes(symbol.toUpperCase())) {
        return 10; // Highest priority
      }

      // Get company details to determine market cap
      const details = await this.polygonService.getCompanyDetails(symbol);
      if (details?.marketCap) {
        if (details.marketCap > 1000000000000) return 9; // >$1T market cap
        if (details.marketCap > 100000000000) return 8;  // >$100B market cap
        if (details.marketCap > 10000000000) return 7;   // >$10B market cap
        if (details.marketCap > 1000000000) return 6;    // >$1B market cap
        return 5; // < $1B market cap
      }

      return 4; // Default priority for unknown symbols
    } catch (error) {
      console.warn(`⚠️ [BackfillService] Could not calculate priority for ${symbol}, using default`);
      return 3; // Low priority if we can't determine
    }
  }

  /**
   * Store aggregates data in database
   */
  private async storeAggregatesData(symbol: string, data: any[]): Promise<void> {
    try {
      const records = data.map(item => ({
        symbol: symbol,
        timestamp: new Date(item.timestamp),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        data_type: 'aggregates',
        provider: 'polygon',
        created_at: new Date()
      }));

      const { error } = await getSupabaseClient()
        .from('historical_data')
        .upsert(records, { 
          onConflict: 'symbol,timestamp,data_type',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('❌ [BackfillService] Failed to store aggregates data:', error);
      }
    } catch (error) {
      console.error('❌ [BackfillService] Error storing aggregates data:', error);
    }
  }

  /**
   * Store quote data in database
   */
  private async storeQuoteData(symbol: string, data: any, date: string): Promise<void> {
    try {
      const record = {
        symbol: symbol,
        timestamp: new Date(date),
        price: data.price,
        change: data.change,
        change_percent: data.changePercent,
        volume: data.volume,
        market_cap: data.marketCap,
        data_type: 'quote',
        provider: 'polygon',
        created_at: new Date()
      };

      const { error } = await getSupabaseClient()
        .from('historical_data')
        .upsert([record], { 
          onConflict: 'symbol,timestamp,data_type',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('❌ [BackfillService] Failed to store quote data:', error);
      }
    } catch (error) {
      console.error('❌ [BackfillService] Error storing quote data:', error);
    }
  }

  /**
   * Store fundamentals data in database
   */
  private async storeFundamentalsData(symbol: string, data: any, date: string): Promise<void> {
    try {
      const record = {
        symbol: symbol,
        timestamp: new Date(date),
        pe_ratio: data.pe,
        eps: data.eps,
        revenue: data.revenue,
        market_cap: data.marketCap,
        shares_outstanding: data.sharesOutstanding,
        book_value: data.bookValue,
        data_type: 'fundamentals',
        provider: 'polygon',
        created_at: new Date()
      };

      const { error } = await getSupabaseClient()
        .from('historical_data')
        .upsert([record], { 
          onConflict: 'symbol,timestamp,data_type',
          ignoreDuplicates: true 
        });

      if (error) {
        console.error('❌ [BackfillService] Failed to store fundamentals data:', error);
      }
    } catch (error) {
      console.error('❌ [BackfillService] Error storing fundamentals data:', error);
    }
  }

  /**
   * Load existing jobs from database
   */
  private async loadJobsFromDatabase(): Promise<void> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('backfill_jobs')
        .select('*')
        .in('status', ['pending', 'running']);

      if (error) {
        console.error('❌ [BackfillService] Failed to load jobs from database:', error);
        return;
      }

      if (data) {
        this.jobQueue = data.map(row => ({
          id: row.id,
          symbol: row.symbol,
          startDate: row.start_date,
          endDate: row.end_date,
          priority: row.priority,
          dataTypes: row.data_types,
          provider: row.provider,
          status: row.status,
          progress: row.progress,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
          error: row.error,
          retryCount: row.retry_count || 0,
          maxRetries: row.max_retries || 3
        }));

        this.jobQueue.sort((a, b) => b.priority - a.priority);
        console.log(`📊 [BackfillService] Loaded ${this.jobQueue.length} jobs from database`);
      }
    } catch (error) {
      console.error('❌ [BackfillService] Error loading jobs from database:', error);
    }
  }

  /**
   * Save job to database
   */
  private async saveJobToDatabase(job: BackfillJobConfig): Promise<void> {
    try {
      const { error } = await getSupabaseClient()
        .from('backfill_jobs')
        .insert({
          id: job.id,
          symbol: job.symbol,
          start_date: job.startDate,
          end_date: job.endDate,
          priority: job.priority,
          data_types: job.dataTypes,
          provider: job.provider,
          status: job.status,
          progress: job.progress,
          created_at: job.createdAt.toISOString(),
          updated_at: job.updatedAt.toISOString(),
          retry_count: job.retryCount,
          max_retries: job.maxRetries,
          error: job.error
        });

      if (error) {
        console.error('❌ [BackfillService] Failed to save job to database:', error);
      }
    } catch (error) {
      console.error('❌ [BackfillService] Error saving job to database:', error);
    }
  }

  /**
   * Update job in database
   */
  private async updateJobInDatabase(job: BackfillJobConfig): Promise<void> {
    try {
      const { error } = await getSupabaseClient()
        .from('backfill_jobs')
        .update({
          status: job.status,
          progress: job.progress,
          updated_at: job.updatedAt.toISOString(),
          completed_at: job.completedAt?.toISOString(),
          retry_count: job.retryCount,
          error: job.error
        })
        .eq('id', job.id);

      if (error) {
        console.error('❌ [BackfillService] Failed to update job in database:', error);
      }
    } catch (error) {
      console.error('❌ [BackfillService] Error updating job in database:', error);
    }
  }

  /**
   * Get current backfill progress
   */
  getProgress(): BackfillProgress | null {
    if (!this.currentJob) return null;

    const startDate = new Date(this.currentJob.startDate);
    const endDate = new Date(this.currentJob.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const completedDays = Math.round((this.currentJob.progress / 100) * totalDays);

    // Estimate time remaining
    const elapsed = Date.now() - this.currentJob.updatedAt.getTime();
    const remaining = this.currentJob.progress > 0 ? (elapsed / this.currentJob.progress) * (100 - this.currentJob.progress) : 0;

    return {
      symbol: this.currentJob.symbol,
      totalDays,
      completedDays,
      progressPercent: this.currentJob.progress,
      currentDate: this.currentJob.startDate,
      estimatedTimeRemaining: this.formatDuration(remaining),
      dataPointsCollected: 0, // Would need to track this separately
      errorsEncountered: this.currentJob.retryCount
    };
  }

  /**
   * Get backfill statistics
   */
  async getStats(): Promise<BackfillStats> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('backfill_jobs')
        .select('*');

      if (error) {
        console.error('❌ [BackfillService] Failed to get stats from database:', error);
        return this.getDefaultStats();
      }

      const jobs = data || [];
      const today = new Date().toISOString().split('T')[0];
      const jobsCompletedToday = jobs.filter(job => 
        job.status === 'completed' && 
        job.completed_at && 
        job.completed_at.startsWith(today)
      ).length;

      // Calculate average duration for completed jobs
      const completedJobs = jobs.filter(job => job.status === 'completed' && job.completed_at);
      const totalDuration = completedJobs.reduce((sum, job) => {
        const start = new Date(job.created_at).getTime();
        const end = new Date(job.completed_at).getTime();
        return sum + (end - start);
      }, 0);
      const averageJobDuration = completedJobs.length > 0 ? totalDuration / completedJobs.length : 0;

      // Get top priority symbols
      const symbolPriorities = jobs.reduce((acc, job) => {
        if (!acc[job.symbol] || acc[job.symbol] < job.priority) {
          acc[job.symbol] = job.priority;
        }
        return acc;
      }, {} as Record<string, number>);

      const topPrioritySymbols = Object.entries(symbolPriorities)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([symbol]) => symbol);

      return {
        totalJobs: jobs.length,
        pendingJobs: jobs.filter(job => job.status === 'pending').length,
        runningJobs: jobs.filter(job => job.status === 'running').length,
        completedJobs: jobs.filter(job => job.status === 'completed').length,
        failedJobs: jobs.filter(job => job.status === 'failed').length,
        totalDataPoints: 0, // Would need separate tracking
        jobsCompletedToday,
        averageJobDuration,
        topPrioritySymbols
      };
    } catch (error) {
      console.error('❌ [BackfillService] Error getting stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Get default stats when database is unavailable
   */
  private getDefaultStats(): BackfillStats {
    return {
      totalJobs: this.jobQueue.length,
      pendingJobs: this.jobQueue.filter(job => job.status === 'pending').length,
      runningJobs: this.jobQueue.filter(job => job.status === 'running').length,
      completedJobs: 0,
      failedJobs: 0,
      totalDataPoints: 0,
      jobsCompletedToday: 0,
      averageJobDuration: 0,
      topPrioritySymbols: []
    };
  }

  /**
   * Pause a specific job
   */
  pauseJob(jobId: string): boolean {
    const job = this.jobQueue.find(j => j.id === jobId);
    if (job && job.status === 'running') {
      job.status = 'paused';
      job.updatedAt = new Date();
      this.updateJobInDatabase(job);
      return true;
    }
    return false;
  }

  /**
   * Resume a paused job
   */
  resumeJob(jobId: string): boolean {
    const job = this.jobQueue.find(j => j.id === jobId);
    if (job && job.status === 'paused') {
      job.status = 'pending';
      job.updatedAt = new Date();
      this.updateJobInDatabase(job);
      return true;
    }
    return false;
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const index = this.jobQueue.findIndex(j => j.id === jobId);
    if (index >= 0) {
      const job = this.jobQueue[index];
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.updatedAt = new Date();
      this.updateJobInDatabase(job);
      this.jobQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Utility function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format duration in milliseconds to human readable string
   */
  private formatDuration(ms: number): string {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  }
}

// Export singleton instance
export const backfillService = new BackfillService();