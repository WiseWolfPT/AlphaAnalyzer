import { Router } from 'express';
import { backfillService } from '../../services/backfill-service';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/admin/backfill/jobs
 * Get all backfill jobs with pagination and filtering
 */
router.get('/jobs', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      symbol, 
      provider,
      sortBy = 'created_at',
      sortOrder = 'desc' 
    } = req.query;

    let query = supabase
      .from('backfill_jobs')
      .select('*');

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (symbol) {
      query = query.ilike('symbol', `%${symbol}%`);
    }
    if (provider) {
      query = query.eq('provider', provider);
    }

    // Apply sorting
    query = query.order(sortBy as string, { 
      ascending: sortOrder === 'asc' 
    });

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch backfill jobs:', error);
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }

    res.json({
      jobs: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error in GET /admin/backfill/jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/backfill/jobs
 * Create a new backfill job
 */
router.post('/jobs', async (req, res) => {
  try {
    const { 
      symbol, 
      startDate, 
      endDate, 
      priority = 5,
      dataTypes = ['aggregates'],
      provider = 'polygon'
    } = req.body;

    // Validate required fields
    if (!symbol || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: symbol, startDate, endDate' 
      });
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ 
        error: 'Start date must be before end date' 
      });
    }

    // Validate priority
    if (priority < 1 || priority > 10) {
      return res.status(400).json({ 
        error: 'Priority must be between 1 and 10' 
      });
    }

    // Check if job already exists for this symbol and date range
    const { data: existingJobs } = await supabase
      .from('backfill_jobs')
      .select('id')
      .eq('symbol', symbol.toUpperCase())
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .in('status', ['pending', 'running']);

    if (existingJobs && existingJobs.length > 0) {
      return res.status(409).json({ 
        error: 'A backfill job for this symbol and date range already exists' 
      });
    }

    // Create the job using the backfill service
    const jobId = await backfillService.addBackfillJob(
      symbol,
      startDate,
      endDate,
      dataTypes,
      priority
    );

    // Get the created job details
    const { data: jobData, error: fetchError } = await supabase
      .from('backfill_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch created job:', fetchError);
      return res.status(500).json({ error: 'Job created but failed to fetch details' });
    }

    res.status(201).json(jobData);
  } catch (error) {
    console.error('Error in POST /admin/backfill/jobs:', error);
    res.status(500).json({ error: 'Failed to create backfill job' });
  }
});

/**
 * GET /api/admin/backfill/jobs/:id
 * Get a specific backfill job
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('backfill_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in GET /admin/backfill/jobs/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/backfill/jobs/:id/pause
 * Pause a running backfill job
 */
router.post('/jobs/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const success = backfillService.pauseJob(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Job not found or cannot be paused' });
    }

    res.json({ message: 'Job paused successfully' });
  } catch (error) {
    console.error('Error in POST /admin/backfill/jobs/:id/pause:', error);
    res.status(500).json({ error: 'Failed to pause job' });
  }
});

/**
 * POST /api/admin/backfill/jobs/:id/resume
 * Resume a paused backfill job
 */
router.post('/jobs/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const success = backfillService.resumeJob(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Job not found or cannot be resumed' });
    }

    res.json({ message: 'Job resumed successfully' });
  } catch (error) {
    console.error('Error in POST /admin/backfill/jobs/:id/resume:', error);
    res.status(500).json({ error: 'Failed to resume job' });
  }
});

/**
 * POST /api/admin/backfill/jobs/:id/cancel
 * Cancel a backfill job
 */
router.post('/jobs/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const success = backfillService.cancelJob(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Job not found or cannot be cancelled' });
    }

    res.json({ message: 'Job cancelled successfully' });
  } catch (error) {
    console.error('Error in POST /admin/backfill/jobs/:id/cancel:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

/**
 * POST /api/admin/backfill/jobs/:id/retry
 * Retry a failed backfill job
 */
router.post('/jobs/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the job details
    const { data: job, error } = await supabase
      .from('backfill_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed jobs can be retried' });
    }

    if (job.retry_count >= job.max_retries) {
      return res.status(400).json({ error: 'Job has exceeded maximum retry attempts' });
    }

    // Reset job status and increment retry count
    const { error: updateError } = await supabase
      .from('backfill_jobs')
      .update({
        status: 'pending',
        retry_count: job.retry_count + 1,
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update job for retry:', updateError);
      return res.status(500).json({ error: 'Failed to retry job' });
    }

    res.json({ message: 'Job retry scheduled successfully' });
  } catch (error) {
    console.error('Error in POST /admin/backfill/jobs/:id/retry:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

/**
 * GET /api/admin/backfill/stats
 * Get backfill statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await backfillService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error in GET /admin/backfill/stats:', error);
    res.status(500).json({ error: 'Failed to get backfill statistics' });
  }
});

/**
 * GET /api/admin/backfill/progress
 * Get current backfill progress
 */
router.get('/progress', async (req, res) => {
  try {
    const progress = backfillService.getProgress();
    res.json(progress);
  } catch (error) {
    console.error('Error in GET /admin/backfill/progress:', error);
    res.status(500).json({ error: 'Failed to get backfill progress' });
  }
});

/**
 * GET /api/admin/backfill/symbols
 * Get symbol metadata for priority calculation
 */
router.get('/symbols', async (req, res) => {
  try {
    const { popular_only, limit = 100 } = req.query;

    let query = supabase
      .from('symbol_metadata')
      .select('*')
      .order('priority_score', { ascending: false });

    if (popular_only === 'true') {
      query = query.eq('is_popular', true);
    }

    query = query.limit(Number(limit));

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch symbol metadata:', error);
      return res.status(500).json({ error: 'Failed to fetch symbols' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error in GET /admin/backfill/symbols:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/backfill/symbols/:symbol/gaps
 * Get data gaps for a specific symbol
 */
router.get('/symbols/:symbol/gaps', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { 
      data_type = 'aggregates',
      start_date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
      end_date = new Date().toISOString().split('T')[0] // today
    } = req.query;

    const { data, error } = await supabase.rpc('get_data_gaps', {
      p_symbol: symbol.toUpperCase(),
      p_data_type: data_type,
      p_start_date: start_date,
      p_end_date: end_date
    });

    if (error) {
      console.error('Failed to get data gaps:', error);
      return res.status(500).json({ error: 'Failed to get data gaps' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error in GET /admin/backfill/symbols/:symbol/gaps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/backfill/bulk-create
 * Create multiple backfill jobs at once
 */
router.post('/bulk-create', async (req, res) => {
  try {
    const { jobs } = req.body;

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'Jobs array is required' });
    }

    if (jobs.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 jobs can be created at once' });
    }

    const results = {
      created: [] as string[],
      errors: [] as { job: any; error: string }[]
    };

    for (const job of jobs) {
      try {
        const jobId = await backfillService.addBackfillJob(
          job.symbol,
          job.startDate,
          job.endDate,
          job.dataTypes || ['aggregates'],
          job.priority || 5
        );
        results.created.push(jobId);
      } catch (error) {
        results.errors.push({
          job,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error in POST /admin/backfill/bulk-create:', error);
    res.status(500).json({ error: 'Failed to create bulk jobs' });
  }
});

/**
 * DELETE /api/admin/backfill/cleanup
 * Clean up old completed jobs
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const { keep_count = 1000 } = req.query;

    const { data: deletedCount, error } = await supabase.rpc('cleanup_old_backfill_jobs');

    if (error) {
      console.error('Failed to cleanup old jobs:', error);
      return res.status(500).json({ error: 'Failed to cleanup old jobs' });
    }

    res.json({ 
      message: 'Cleanup completed successfully',
      deletedCount: deletedCount || 0
    });
  } catch (error) {
    console.error('Error in DELETE /admin/backfill/cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup old jobs' });
  }
});

/**
 * GET /api/admin/backfill/providers
 * Get provider statistics and availability
 */
router.get('/providers', async (req, res) => {
  try {
    // Get job counts by provider
    const { data: providerStats, error } = await supabase
      .from('backfill_jobs')
      .select('provider, status')
      .order('provider');

    if (error) {
      console.error('Failed to get provider stats:', error);
      return res.status(500).json({ error: 'Failed to get provider statistics' });
    }

    // Group by provider and status
    const stats = (providerStats || []).reduce((acc, job) => {
      if (!acc[job.provider]) {
        acc[job.provider] = {
          provider: job.provider,
          total: 0,
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          paused: 0
        };
      }
      acc[job.provider].total++;
      acc[job.provider][job.status as keyof typeof acc[string]]++;
      return acc;
    }, {} as Record<string, any>);

    res.json(Object.values(stats));
  } catch (error) {
    console.error('Error in GET /admin/backfill/providers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;