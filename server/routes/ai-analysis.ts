/**
 * AI Analysis Routes
 * Endpoints for OpenAI-powered transcript analysis
 */

import { Router } from 'express';
import { transcriptAnalyzer, AnalysisRequest } from '../services/ai/transcript-analyzer';
import { openaiService } from '../services/ai/openai-service';
import { structuredLogger } from '../services/structured-logger';
import { transcriptsPgRepo } from '../repositories/transcripts-pg';
import { aiAnalysesPgRepo } from '../repositories/ai-analyses-pg';

const router = Router();

/**
 * GET /api/ai/rate-limits
 * Get current OpenAI rate limit status
 */
router.get('/rate-limits', async (req, res) => {
  try {
    const rateLimits = openaiService.getRateLimitStatus();
    res.json({
      success: true,
      data: rateLimits
    });
  } catch (error) {
    structuredLogger.error('Failed to get rate limits', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status'
    });
  }
});

/**
 * POST /api/ai/analyze-transcript
 * Analyze a specific transcript with AI
 */
router.post('/analyze-transcript', async (req, res) => {
  try {
    const { transcriptId, types, priority = 'normal', forceRegenerate = false } = req.body;

    // Validate input
    if (!transcriptId) {
      return res.status(400).json({
        success: false,
        error: 'transcriptId is required'
      });
    }

    if (!types || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'types array is required and cannot be empty'
      });
    }

    const validTypes = ['summary', 'sentiment', 'metrics', 'insights'];
    const invalidTypes = types.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid analysis types: ${invalidTypes.join(', ')}`
      });
    }

    // Check if transcript exists in PostgreSQL local
    const transcript = await transcriptsPgRepo.getById(parseInt(transcriptId));

    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found'
      });
    }

    const analysisRequest: AnalysisRequest = {
      transcriptId,
      types,
      priority,
      forceRegenerate
    };

    const result = await transcriptAnalyzer.analyzeTranscript(analysisRequest);

    structuredLogger.info('Transcript analysis requested', {
      transcriptId,
      types,
      priority,
      forceRegenerate,
      successfulAnalyses: result.analyses.length,
      totalCost: result.totalCost,
      errors: result.errors.length
    });

    res.json({
      success: true,
      data: {
        transcript: {
          id: transcript.id,
          ticker: transcript.ticker,
          companyName: transcript.company_name
        },
        result
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    structuredLogger.error('AI analysis failed', { 
      error: errorMessage,
      transcriptId: req.body.transcriptId 
    });
    
    res.status(500).json({
      success: false,
      error: `Analysis failed: ${errorMessage}`
    });
  }
});

/**
 * POST /api/ai/batch-analyze
 * Batch analyze multiple transcripts
 */
router.post('/batch-analyze', async (req, res) => {
  try {
    const { requests } = req.body;

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'requests array is required and cannot be empty'
      });
    }

    // Validate each request
    for (const request of requests) {
      if (!request.transcriptId || !request.types || !Array.isArray(request.types)) {
        return res.status(400).json({
          success: false,
          error: 'Each request must have transcriptId and types array'
        });
      }
    }

    const results = await transcriptAnalyzer.batchAnalyzeTranscripts(requests);

    const totalCost = results.reduce((sum, result) => sum + result.totalCost, 0);
    const totalTokens = results.reduce((sum, result) => sum + result.totalTokens, 0);
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);

    structuredLogger.info('Batch analysis completed', {
      requestCount: requests.length,
      totalCost,
      totalTokens,
      totalErrors
    });

    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalRequests: requests.length,
          totalCost,
          totalTokens,
          totalErrors
        }
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    structuredLogger.error('Batch analysis failed', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      error: `Batch analysis failed: ${errorMessage}`
    });
  }
});

/**
 * GET /api/ai/analyses/:transcriptId
 * Get all analyses for a specific transcript
 */
router.get('/analyses/:transcriptId', async (req, res) => {
  try {
    const { transcriptId } = req.params;

    const analyses = await transcriptAnalyzer.getTranscriptAnalyses(transcriptId);

    res.json({
      success: true,
      data: {
        transcriptId,
        analyses
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    structuredLogger.error('Failed to get analyses', { 
      error: errorMessage,
      transcriptId: req.params.transcriptId 
    });
    
    res.status(500).json({
      success: false,
      error: `Failed to get analyses: ${errorMessage}`
    });
  }
});

/**
 * GET /api/ai/stats
 * Get AI analysis statistics for admin dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await transcriptAnalyzer.getAnalysisStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    structuredLogger.error('Failed to get AI stats', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      error: `Failed to get statistics: ${errorMessage}`
    });
  }
});

/**
 * GET /api/ai/health
 * Check AI service health
 */
router.get('/health', async (req, res) => {
  try {
    const rateLimits = openaiService.getRateLimitStatus();
    
    // Check if OpenAI service is available
    const isHealthy = Object.values(rateLimits).some(limit => limit.available);

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'rate_limited',
        openaiAvailable: isHealthy,
        rateLimits,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    structuredLogger.error('AI health check failed', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      error: `Health check failed: ${errorMessage}`,
      data: {
        status: 'unhealthy',
        openaiAvailable: false,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /api/ai/analyses/:analysisId
 * Delete a specific AI analysis
 */
router.delete('/analyses/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    const deleted = await aiAnalysesPgRepo.deleteById(analysisId);

    if (!deleted) {
      throw new Error(`Analysis not found or already deleted`);
    }

    structuredLogger.info('AI analysis deleted', { analysisId });

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    structuredLogger.error('Failed to delete analysis', { 
      error: errorMessage,
      analysisId: req.params.analysisId 
    });
    
    res.status(500).json({
      success: false,
      error: `Failed to delete analysis: ${errorMessage}`
    });
  }
});

export default router;