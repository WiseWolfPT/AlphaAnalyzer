import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase-client';

const supabase = getSupabaseClient();

export interface JobPayload {
  symbol?: string;
  symbols?: string[];
  type?: string;
  data?: any;
  [key: string]: any;
}

export interface JobOptions {
  priority?: number;
  scheduledFor?: Date;
  maxRetries?: number;
  tier?: number;
}

export interface Job {
  id: number;
  type: string;
  payload: JobPayload;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  scheduled_for: string;
  created_at: string;
  retry_count: number;
  max_retries: number;
  last_error?: string;
  tier: number;
}

/**
 * Job Queue Service for Background Processing
 * Handles scheduling and execution of data update jobs
 */
export class JobQueue {
  
  /**
   * Add a new job to the queue
   */
  async addJob(type: string, payload: JobPayload, options: JobOptions = {}): Promise<Job> {
    const { data, error } = await supabase
      .from('job_queue')
      .insert({
        type,
        payload,
        status: 'pending',
        priority: options.priority || 0,
        scheduled_for: (options.scheduledFor || new Date()).toISOString(),
        max_retries: options.maxRetries || 3,
        tier: options.tier || 2,
        retry_count: 0
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to add job: ${error.message}`);
    }
    
    console.log(`📋 Job added: ${type} - ${JSON.stringify(payload)}`);
    return data;
  }

  /**
   * Add multiple jobs in batch
   */
  async addBatchJobs(jobs: Array<{ type: string; payload: JobPayload; options?: JobOptions }>): Promise<Job[]> {
    const jobsToInsert = jobs.map(({ type, payload, options = {} }) => ({
      type,
      payload,
      status: 'pending' as const,
      priority: options.priority || 0,
      scheduled_for: (options.scheduledFor || new Date()).toISOString(),
      max_retries: options.maxRetries || 3,
      tier: options.tier || 2,
      retry_count: 0
    }));

    const { data, error } = await supabase
      .from('job_queue')
      .insert(jobsToInsert)
      .select();
    
    if (error) {
      throw new Error(`Failed to add batch jobs: ${error.message}`);
    }
    
    console.log(`📋 Batch jobs added: ${jobs.length} jobs`);
    return data || [];
  }

  /**
   * Get next jobs to process
   */
  async getNextJobs(limit = 5, tier?: number): Promise<Job[]> {
    let query = supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (tier) {
      query = query.eq('tier', tier);
    }

    const { data: jobs, error } = await query.limit(limit);
    
    if (error) {
      console.error('❌ Failed to get next jobs:', error);
      return [];
    }
    
    // Filter out jobs that have exceeded their max retries
    const eligibleJobs = (jobs || []).filter(job => job.retry_count < job.max_retries);
    
    return eligibleJobs;
  }

  /**
   * Mark job as processing
   */
  async markJobProcessing(jobId: number): Promise<void> {
    const { error } = await supabase
      .from('job_queue')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    if (error) {
      throw new Error(`Failed to mark job as processing: ${error.message}`);
    }
  }

  /**
   * Mark job as completed
   */
  async markJobCompleted(jobId: number, result?: any): Promise<void> {
    const { error } = await supabase
      .from('job_queue')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: result
      })
      .eq('id', jobId);
    
    if (error) {
      throw new Error(`Failed to mark job as completed: ${error.message}`);
    }
    
    console.log(`✅ Job ${jobId} completed`);
  }

  /**
   * Mark job as failed and handle retries
   */
  async markJobFailed(jobId: number, error: string): Promise<void> {
    // Get current job details
    const { data: job } = await supabase
      .from('job_queue')
      .select('retry_count, max_retries')
      .eq('id', jobId)
      .single();

    if (!job) {
      console.error(`❌ Job ${jobId} not found`);
      return;
    }

    const newRetryCount = job.retry_count + 1;
    const shouldRetry = newRetryCount < job.max_retries;

    if (shouldRetry) {
      // Calculate exponential backoff
      const nextRetry = new Date();
      const backoffMinutes = Math.pow(2, newRetryCount); // 2, 4, 8 minutes
      nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
      
      await supabase
        .from('job_queue')
        .update({
          status: 'pending',
          retry_count: newRetryCount,
          scheduled_for: nextRetry.toISOString(),
          last_error: error
        })
        .eq('id', jobId);
      
      console.log(`🔄 Job ${jobId} scheduled for retry ${newRetryCount}/${job.max_retries} in ${backoffMinutes}min`);
    } else {
      await supabase
        .from('job_queue')
        .update({
          status: 'failed',
          retry_count: newRetryCount,
          last_error: error,
          failed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      console.log(`❌ Job ${jobId} permanently failed after ${job.max_retries} retries`);
    }
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(daysOld = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('job_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      console.error('❌ Failed to cleanup old jobs:', error);
      return 0;
    }
    
    const deletedCount = data?.length || 0;
    console.log(`🧹 Cleaned up ${deletedCount} old jobs`);
    return deletedCount;
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const { data, error } = await supabase
      .from('job_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

    if (error) {
      console.error('❌ Failed to get job stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: data?.length || 0
    };

    data?.forEach(job => {
      stats[job.status as keyof typeof stats]++;
    });

    return stats;
  }

  /**
   * Schedule stock update jobs for different tiers
   */
  async scheduleStockUpdates(): Promise<void> {
    // Tier 1: Popular stocks (every 15 minutes)
    const tier1Symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'BRK-B'];
    const tier1Jobs = tier1Symbols.map(symbol => ({
      type: 'update_stock_data',
      payload: { symbol, tier: 1 },
      options: { priority: 10, tier: 1 }
    }));

    // Tier 2: Other tracked stocks (every 30 minutes)
    const tier2Symbols = ['NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'DIS'];
    const tier2Jobs = tier2Symbols.map(symbol => ({
      type: 'update_stock_data',
      payload: { symbol, tier: 2 },
      options: { priority: 5, tier: 2 }
    }));

    await this.addBatchJobs([...tier1Jobs, ...tier2Jobs]);
    console.log(`📊 Scheduled ${tier1Jobs.length + tier2Jobs.length} stock update jobs`);
  }

  /**
   * Schedule market status check
   */
  async scheduleMarketStatusCheck(): Promise<void> {
    await this.addJob('check_market_status', {}, { priority: 15 });
    console.log('🏛️ Scheduled market status check');
  }
}

// Export singleton instance
export const jobQueue = new JobQueue();
