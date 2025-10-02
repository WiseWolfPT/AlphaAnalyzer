/**
 * Admin Transcripts Routes - Roadmap V4
 * 
 * CRUD operations for transcript management in admin panel
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TranscriptService } from '../../services/transcript-service';
import { logAdminAction } from '../../utils/admin-audit';
import { EventCategory, AuditSeverity } from '../../security/compliance-audit';

const router = Router();
const transcriptService = TranscriptService.getInstance();

// Validation schemas
const transcriptCreateSchema = z.object({
  ticker: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Ticker must be uppercase letters'),
  company_name: z.string().min(1).max(200),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  year: z.number().min(2020).max(2030),
  call_date: z.string().optional(),
  raw_transcript: z.string().optional(),
  ai_summary: z.string().optional(),
  status: z.enum(['pending', 'review', 'published', 'archived']).optional()
});

const transcriptUpdateSchema = z.object({
  id: z.number().positive(),
  ticker: z.string().min(1).max(10).regex(/^[A-Z]+$/).optional(),
  company_name: z.string().min(1).max(200).optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
  year: z.number().min(2020).max(2030).optional(),
  call_date: z.string().optional(),
  raw_transcript: z.string().optional(),
  ai_summary: z.string().optional(),
  status: z.enum(['pending', 'review', 'published', 'archived']).optional()
});

const transcriptFilterSchema = z.object({
  ticker: z.string().optional(),
  status: z.string().optional(),
  year: z.coerce.number().optional(),
  quarter: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

// Require explicit admin permission for transcript management
router.use(async (req, res, next) => {
  const hasPermission = req.adminUser?.isSuperAdmin || req.adminUser?.permissions.includes('admin:transcripts');

  if (!hasPermission) {
    await logAdminAction({
      req,
      action: 'transcript_admin_access_denied',
      resource: 'transcripts_admin',
      success: false,
      category: EventCategory.AUTHORIZATION,
      severity: AuditSeverity.HIGH,
      details: {
        reason: 'missing_admin_transcripts_permission',
      },
    });

    return res.status(403).json({
      success: false,
      error: 'ADMIN_TRANSCRIPTS_PERMISSION_REQUIRED',
      message: 'You need admin transcripts permission to access this resource.',
      timestamp: new Date().toISOString(),
    });
  }

  next();
});

/**
 * GET /api/admin/transcripts
 * Get all transcripts with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter = transcriptFilterSchema.parse(req.query);
    const result = await transcriptService.getTranscripts(filter);
    
    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: filter.limit,
        offset: filter.offset,
        hasMore: filter.offset + filter.limit < result.total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcripts',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/transcripts/stats
 * Get transcript statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await transcriptService.getTranscriptStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transcript stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcript statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/transcripts/pending
 * Get transcripts that need review
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const pendingTranscripts = await transcriptService.getPendingTranscripts();
    
    res.json({
      success: true,
      data: pendingTranscripts,
      count: pendingTranscripts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pending transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending transcripts',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/transcripts/search
 * Search transcripts by content
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q: query, limit } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const searchLimit = limit ? parseInt(limit as string) : 10;
    const results = await transcriptService.searchTranscripts(query, searchLimit);
    
    res.json({
      success: true,
      data: results,
      query,
      count: results.length,
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
 * GET /api/admin/transcripts/:id
 * Get transcript by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
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
    
    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: transcript,
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
 * POST /api/admin/transcripts
 * Create new transcript
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = transcriptCreateSchema.parse(req.body);
    const transcript = await transcriptService.createTranscript(data);
    await logAdminAction({
      req,
      action: 'transcript_create',
      resource: `transcript:${transcript?.id ?? 'unknown'}`,
      success: true,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.HIGH,
      details: {
        ticker: data.ticker,
        status: transcript?.status,
      },
    });
    
    res.status(201).json({
      success: true,
      data: transcript,
      message: 'Transcript created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating transcript:', error);

    await logAdminAction({
      req,
      action: 'transcript_create',
      resource: 'transcript',
      success: false,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.HIGH,
      details: {
        reason: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        issues: error instanceof z.ZodError ? error.errors : undefined,
      },
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create transcript',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/admin/transcripts/:id
 * Update transcript
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript ID',
        timestamp: new Date().toISOString()
      });
    }
    
    const data = transcriptUpdateSchema.parse({ ...req.body, id });
    const transcript = await transcriptService.updateTranscript(id, data);
    
    if (!transcript) {
      await logAdminAction({
        req,
        action: 'transcript_update',
        resource: `transcript:${id}`,
        success: false,
        category: EventCategory.DATA_MODIFICATION,
        severity: AuditSeverity.HIGH,
        details: { reason: 'not_found' },
      });
      return res.status(404).json({
        success: false,
        error: 'Transcript not found',
        timestamp: new Date().toISOString()
      });
    }
    
    await logAdminAction({
      req,
      action: 'transcript_update',
      resource: `transcript:${id}`,
      success: true,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.MEDIUM,
      details: {
        ticker: transcript.ticker,
        status: transcript.status,
      },
    });

    res.json({
      success: true,
      data: transcript,
      message: 'Transcript updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating transcript:', error);

    await logAdminAction({
      req,
      action: 'transcript_update',
      resource: `transcript:${req.params.id}`,
      success: false,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.HIGH,
      details: {
        reason: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        issues: error instanceof z.ZodError ? error.errors : undefined,
      },
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update transcript',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/admin/transcripts/:id
 * Delete transcript
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript ID',
        timestamp: new Date().toISOString()
      });
    }
    
    const success = await transcriptService.deleteTranscript(id);
    
    if (!success) {
      await logAdminAction({
        req,
        action: 'transcript_delete',
        resource: `transcript:${id}`,
        success: false,
        category: EventCategory.DATA_MODIFICATION,
        severity: AuditSeverity.HIGH,
        details: { reason: 'not_found' },
      });
      return res.status(404).json({
        success: false,
        error: 'Transcript not found',
        timestamp: new Date().toISOString()
      });
    }
    
    await logAdminAction({
      req,
      action: 'transcript_delete',
      resource: `transcript:${id}`,
      success: true,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.HIGH,
    });

    res.json({
      success: true,
      message: 'Transcript deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting transcript:', error);

    await logAdminAction({
      req,
      action: 'transcript_delete',
      resource: `transcript:${req.params.id}`,
      success: false,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.HIGH,
      details: {
        reason: 'internal_error',
        message: error instanceof Error ? error.message : 'unknown_error',
      },
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete transcript',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/transcripts/:id/publish
 * Publish transcript (change status to published)
 */
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript ID',
        timestamp: new Date().toISOString()
      });
    }

    const transcript = await transcriptService.updateTranscript(id, {
      status: 'published'
    });

    if (!transcript) {
      await logAdminAction({
        req,
        action: 'transcript_publish',
        resource: `transcript:${id}`,
        success: false,
        category: EventCategory.DATA_MODIFICATION,
        severity: AuditSeverity.MEDIUM,
        details: { reason: 'not_found' },
      });
      return res.status(404).json({
        success: false,
        error: 'Transcript not found',
        timestamp: new Date().toISOString()
      });
    }

    await logAdminAction({
      req,
      action: 'transcript_publish',
      resource: `transcript:${id}`,
      success: true,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.MEDIUM,
      details: {
        ticker: transcript.ticker,
      },
    });

    res.json({
      success: true,
      data: transcript,
      message: 'Transcript published successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error publishing transcript:', error);

    await logAdminAction({
      req,
      action: 'transcript_publish',
      resource: `transcript:${req.params.id}`,
      success: false,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.MEDIUM,
      details: {
        reason: 'internal_error',
        message: error instanceof Error ? error.message : 'unknown_error',
      },
    });
    res.status(500).json({
      success: false,
      error: 'Failed to publish transcript',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/transcripts/bulk/publish
 * Auto-publish all transcripts in review status that have complete data
 */
router.post('/bulk/publish', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting bulk auto-publish of reviewed transcripts...');

    const publishedCount = await transcriptService.autoPublishReviewedTranscripts();

    console.log(`✅ Auto-published ${publishedCount} transcripts`);

    await logAdminAction({
      req,
      action: 'transcript_bulk_publish',
      resource: 'transcripts:bulk_publish',
      success: true,
      category: EventCategory.DATA_MODIFICATION,
      severity: publishedCount > 0 ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
      details: { publishedCount },
    });

    res.json({
      success: true,
      publishedCount,
      message: `Successfully auto-published ${publishedCount} transcripts from review to published status`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during bulk auto-publish:', error);

    await logAdminAction({
      req,
      action: 'transcript_bulk_publish',
      resource: 'transcripts:bulk_publish',
      success: false,
      category: EventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.MEDIUM,
      details: {
        reason: 'internal_error',
        message: error instanceof Error ? error.message : 'unknown_error',
      },
    });
    res.status(500).json({
      success: false,
      error: 'Failed to auto-publish transcripts',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/transcripts/bulk/status
 * Bulk update transcript status
 */
router.post('/bulk/status', async (req: Request, res: Response) => {
  try {
    const { fromStatus, toStatus } = req.body;

    if (!fromStatus || !toStatus) {
      return res.status(400).json({
        success: false,
        error: 'Both fromStatus and toStatus are required',
        timestamp: new Date().toISOString()
      });
    }

    const validStatuses = ['pending', 'review', 'published', 'archived'];
    if (!validStatuses.includes(fromStatus) || !validStatuses.includes(toStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: pending, review, published, archived',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔄 Bulk updating transcripts from ${fromStatus} to ${toStatus}...`);

    const updatedCount = await transcriptService.bulkUpdateStatus(fromStatus, toStatus);

    console.log(`✅ Updated ${updatedCount} transcripts from ${fromStatus} to ${toStatus}`);

    res.json({
      success: true,
      updatedCount,
      fromStatus,
      toStatus,
      message: `Successfully updated ${updatedCount} transcripts from ${fromStatus} to ${toStatus}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during bulk status update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transcript statuses',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/transcripts/auto-publish
 * Auto-publish all reviewed transcripts that have complete data
 */
router.post('/auto-publish', async (req: Request, res: Response) => {
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
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
