/**
 * Public Transcripts Routes - Roadmap V4
 * 
 * Public endpoints for viewing published transcripts
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TranscriptService } from '../services/transcript-service';
import { transcriptCacheService } from '../services/transcript-cache-service';
import { authMiddleware } from '../middleware/auth-middleware';
import { marketDataApiKey } from '../middleware/market-data-api-key';

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

    // 1. Verificar cache primeiro (apenas pedidos sem filtros e offset=0)
    const isDefaultListRequest = !filter.ticker && !filter.year && !filter.quarter && filter.offset === 0;
    if (isDefaultListRequest) {
      const cached = await transcriptCacheService.getCachedList();
      if (cached) {
        console.log('✅ Serving transcripts from cache (default list)');
        const sliced = cached.slice(0, filter.limit);
        return res.json({ success: true, data: sliced });
      }
    }

    // 2. Query DB se cache miss
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

    // 3. Cachear resultado apenas para pedidos default (sem filtros)
    if (isDefaultListRequest) {
      await transcriptCacheService.cacheList(publicData);
    }

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
 * GET /api/transcripts/auto-publish
 * TEMPORARY: Auto-publish reviewed transcripts (no auth for testing)
 */
router.get('/auto-publish', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Running auto-publish workflow for reviewed transcripts...');

    const publishedCount = await transcriptService.autoPublishReviewedTranscripts();

    res.json({
      success: true,
      message: `Auto-published ${publishedCount} transcripts`,
      publishedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in auto-publish workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-publish transcripts',
      details: error instanceof Error ? error.message : 'Unknown error',
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

/**
 * POST /api/transcripts/admin/auto-publish
 * Auto-publish all reviewed transcripts (API key protected)
 */
router.post('/admin/auto-publish', marketDataApiKey, async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting auto-publish workflow for reviewed transcripts...');

    const publishedCount = await transcriptService.autoPublishReviewedTranscripts();

    console.log(`✅ Auto-published ${publishedCount} transcripts from review to published status`);

    res.json({
      success: true,
      publishedCount,
      message: `Successfully auto-published ${publishedCount} transcripts from review status`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during auto-publish workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-publish transcripts',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * ========================================================================
 * ONDA 3 - TRANSCRIPTS API ROUTES (Task #5)
 * ========================================================================
 *
 * Cache-first strategy with PostgreSQL backend:
 * - Latest: Redis cache (7 days TTL) → PostgreSQL
 * - History: Direct PostgreSQL query (no cache)
 *
 * Memory Impact:
 * - Redis: ~10KB per symbol × 914 symbols = 9MB (3.5% of 256MB)
 * - History queries: Zero Redis footprint
 */

// Symbol validation schema
const symbolParamSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .regex(/^[A-Z0-9\-\.]+$/i, 'Invalid symbol format')
    .transform(val => val.toUpperCase().trim())
});

/**
 * GET /api/transcripts/symbol/:symbol
 *
 * Get latest transcript OR historical transcripts for a symbol
 *
 * Query Parameters:
 * - history=true: Returns last 5 years (up to 20 transcripts)
 * - (default): Returns latest transcript only
 *
 * Examples:
 * - GET /api/transcripts/symbol/AAPL → Latest transcript
 * - GET /api/transcripts/symbol/AAPL?history=true → Last 20 transcripts
 *
 * Response Format:
 * {
 *   "success": true,
 *   "data": {...} | [...],
 *   "timestamp": "2025-10-07T..."
 * }
 */
router.get('/symbol/:symbol', authService.optionalAuth(), async (req: Request, res: Response) => {
  try {
    // Validate symbol parameter
    const validation = symbolParamSchema.safeParse({ symbol: req.params.symbol });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SYMBOL',
        message: validation.error.errors[0].message,
        timestamp: new Date().toISOString()
      });
    }

    const { symbol } = validation.data;
    const isHistoryRequest = req.query.history === 'true';

    console.log(`📄 Transcript request: ${symbol} ${isHistoryRequest ? '(history)' : '(latest)'}`);

    // Route 1: Historical transcripts (last 5 years, no cache)
    if (isHistoryRequest) {
      const history = await transcriptCacheService.getHistory(symbol, 20);

      if (!history || history.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NO_TRANSCRIPTS_FOUND',
          message: `No historical transcripts found for ${symbol}`,
          symbol,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Found ${history.length} historical transcripts for ${symbol}`);

      return res.json({
        success: true,
        data: history,
        count: history.length,
        symbol,
        period: 'last_5_years',
        timestamp: new Date().toISOString()
      });
    }

    // Route 2: Latest transcript (Redis cache → PostgreSQL)
    const latest = await transcriptCacheService.getLatest(symbol);

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: 'NO_TRANSCRIPT_FOUND',
        message: `No published transcript found for ${symbol}`,
        symbol,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Latest transcript for ${symbol}: ${latest.quarter} ${latest.year}`);

    res.json({
      success: true,
      data: latest,
      symbol,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error fetching transcript for ${req.params.symbol}:`, error);

    res.status(500).json({
      success: false,
      error: 'TRANSCRIPT_FETCH_ERROR',
      message: 'Failed to fetch transcript data',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/transcripts/symbol/:symbol/full
 *
 * Get full transcript with raw content (for detail page)
 *
 * Query Parameters:
 * - quarter: Required (Q1, Q2, Q3, Q4)
 * - year: Required (2020-2025)
 *
 * Example:
 * GET /api/transcripts/symbol/AAPL/full?quarter=Q4&year=2024
 *
 * Response includes raw_transcript field (large payload)
 */
router.get('/symbol/:symbol/full', authService.optionalAuth(), async (req: Request, res: Response) => {
  try {
    // Validate symbol
    const symbolValidation = symbolParamSchema.safeParse({ symbol: req.params.symbol });

    if (!symbolValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SYMBOL',
        message: symbolValidation.error.errors[0].message,
        timestamp: new Date().toISOString()
      });
    }

    // Validate query parameters
    const querySchema = z.object({
      quarter: z.string()
        .regex(/^Q[1-4]$/i, 'Quarter must be Q1, Q2, Q3, or Q4')
        .transform(val => val.toUpperCase()),
      year: z.coerce.number()
        .int()
        .min(2020, 'Year must be 2020 or later')
        .max(new Date().getFullYear() + 1, 'Invalid future year')
    });

    const queryValidation = querySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PARAMETERS',
        message: queryValidation.error.errors[0].message,
        timestamp: new Date().toISOString()
      });
    }

    const { symbol } = symbolValidation.data;
    const { quarter, year } = queryValidation.data;

    console.log(`📄 Full transcript request: ${symbol} ${quarter} ${year}`);

    // Fetch full transcript (no cache for large content)
    const fullTranscript = await transcriptCacheService.getFullTranscript(symbol, quarter, year);

    if (!fullTranscript) {
      return res.status(404).json({
        success: false,
        error: 'TRANSCRIPT_NOT_FOUND',
        message: `No transcript found for ${symbol} ${quarter} ${year}`,
        symbol,
        quarter,
        year,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Full transcript fetched: ${symbol} ${quarter} ${year} (${(fullTranscript.raw_transcript?.length || 0) / 1024}KB)`);

    res.json({
      success: true,
      data: fullTranscript,
      symbol,
      quarter,
      year,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error fetching full transcript for ${req.params.symbol}:`, error);

    res.status(500).json({
      success: false,
      error: 'TRANSCRIPT_FETCH_ERROR',
      message: 'Failed to fetch full transcript',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/transcripts/cache/stats
 *
 * Get cache statistics for monitoring
 * Public endpoint (no auth required)
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await transcriptCacheService.getCacheStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);

    res.status(500).json({
      success: false,
      error: 'CACHE_STATS_ERROR',
      message: 'Failed to fetch cache statistics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
