/**
 * Public Transcripts Routes - Roadmap V4
 * 
 * Public endpoints for viewing published transcripts
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TranscriptService } from '../services/transcript-service';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const transcriptService = TranscriptService.getInstance();

// Optional authentication for rate limiting
const authService = authMiddleware.instance;

// Validation schemas
const publicFilterSchema = z.object({
  ticker: z.string().optional(),
  year: z.coerce.number().optional(),
  quarter: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0)
});

/**
 * GET /api/transcripts
 * Get published transcripts for public consumption
 */
router.get('/', authService.optionalAuth(), async (req: Request, res: Response) => {
  try {
    const filter = publicFilterSchema.parse(req.query);
    
    // Only show published transcripts to public
    const publicFilter = {
      ...filter,
      status: 'published'
    };
    
    const result = await transcriptService.getTranscripts(publicFilter);
    
    // Remove sensitive fields for public consumption
    const publicData = result.data.map(transcript => ({
      id: transcript.id,
      ticker: transcript.ticker,
      company_name: transcript.company_name,
      quarter: transcript.quarter,
      year: transcript.year,
      call_date: transcript.call_date,
      ai_summary: transcript.ai_summary,
      published_at: transcript.published_at,
      view_count: transcript.view_count
      // Exclude raw_transcript, status, created_at, metadata
    }));
    
    res.json({
      success: true,
      data: publicData,
      pagination: {
        total: result.total,
        limit: filter.limit,
        offset: filter.offset,
        hasMore: filter.offset + filter.limit < result.total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching public transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcripts',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/transcripts/recent
 * Get recent published transcripts
 */
router.get('/recent', authService.optionalAuth(), async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const recentLimit = limit ? Math.min(parseInt(limit as string), 20) : 5;
    
    const recentTranscripts = await transcriptService.getRecentTranscripts(recentLimit);
    
    // Remove sensitive fields
    const publicData = recentTranscripts.map(transcript => ({
      id: transcript.id,
      ticker: transcript.ticker,
      company_name: transcript.company_name,
      quarter: transcript.quarter,
      year: transcript.year,
      call_date: transcript.call_date,
      ai_summary: transcript.ai_summary,
      published_at: transcript.published_at,
      view_count: transcript.view_count
    }));
    
    res.json({
      success: true,
      data: publicData,
      count: publicData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching recent transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent transcripts',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/transcripts/:id
 * Get specific transcript by ID (published only)
 */
router.get('/:id', authService.optionalAuth(), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript ID',
        timestamp: new Date().toISOString()
      });
    }
    
    const transcript = await transcriptService.getTranscriptById(id);
    
    if (!transcript || transcript.status !== 'published') {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Increment view count
    await transcriptService.incrementViewCount(id);
    
    // Return public data including full transcript
    const publicData = {
      id: transcript.id,
      ticker: transcript.ticker,
      company_name: transcript.company_name,
      quarter: transcript.quarter,
      year: transcript.year,
      call_date: transcript.call_date,
      ai_summary: transcript.ai_summary,
      raw_transcript: transcript.raw_transcript, // Include full transcript for individual view
      published_at: transcript.published_at,
      view_count: (transcript.view_count || 0) + 1 // Show updated count
    };
    
    res.json({
      success: true,
      data: publicData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcript',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/transcripts/search
 * Search published transcripts
 */
router.get('/search', authService.optionalAuth(), async (req: Request, res: Response) => {
  try {
    const { q: query, limit } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const searchLimit = limit ? Math.min(parseInt(limit as string), 20) : 10;
    const results = await transcriptService.searchTranscripts(query, searchLimit);
    
    // Filter only published transcripts and remove sensitive fields
    const publicResults = results
      .filter(transcript => transcript.status === 'published')
      .map(transcript => ({
        id: transcript.id,
        ticker: transcript.ticker,
        company_name: transcript.company_name,
        quarter: transcript.quarter,
        year: transcript.year,
        call_date: transcript.call_date,
        ai_summary: transcript.ai_summary,
        published_at: transcript.published_at,
        view_count: transcript.view_count
      }));
    
    res.json({
      success: true,
      data: publicResults,
      query,
      count: publicResults.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search transcripts',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/transcripts/stats/public
 * Get public transcript statistics
 */
router.get('/stats/public', authService.optionalAuth(), async (req: Request, res: Response) => {
  try {
    const stats = await transcriptService.getTranscriptStats();
    
    // Return only public-friendly stats
    const publicStats = {
      totalPublished: stats.byStatus.published || 0,
      totalViews: stats.totalViews,
      averageViews: stats.averageViews,
      yearlyBreakdown: Object.entries(stats.byYear)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => b.year - a.year)
    };
    
    res.json({
      success: true,
      data: publicStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching public transcript stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcript statistics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;