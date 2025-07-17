/**
 * Admin AI Summary Routes - Phase 3 Implementation
 * 
 * Routes for generating AI-powered transcript summaries using Anthropic Claude
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { anthropicService } from '../../services/ai/anthropic-service';
import { TranscriptService } from '../../services/transcript-service';
import { authMiddleware } from '../../middleware/auth-middleware';

const router = Router();
const transcriptService = TranscriptService.getInstance();

// Validation schemas
const generateSummarySchema = z.object({
  transcriptId: z.number().positive(),
  priority: z.enum(['high', 'normal', 'low']).optional().default('normal'),
  maxTokens: z.number().min(100).max(2000).optional().default(1000)
});

const quickSummarySchema = z.object({
  transcript: z.string().min(100).max(20000),
  maxLength: z.number().min(100).max(1000).optional().default(500)
});

// Apply admin authentication to all routes
router.use(authMiddleware.instance.authenticate());
router.use(authMiddleware.instance.requirePermissions(['admin:transcripts']));

/**
 * POST /api/admin/ai-summary/generate
 * Generate AI summary for existing transcript
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { transcriptId, priority, maxTokens } = generateSummarySchema.parse(req.body);

    // Get transcript from database
    const transcript = await transcriptService.getTranscriptById(transcriptId);
    
    if (!transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found',
        timestamp: new Date().toISOString()
      });
    }

    if (!transcript.raw_transcript || transcript.raw_transcript.trim().length < 100) {
      return res.status(400).json({
        success: false,
        error: 'Transcript content is too short or missing',
        timestamp: new Date().toISOString()
      });
    }

    // Generate summary using Anthropic Claude
    const summaryResult = await anthropicService.generateTranscriptSummary({
      transcript: transcript.raw_transcript,
      ticker: transcript.ticker,
      companyName: transcript.company_name,
      quarter: transcript.quarter,
      year: transcript.year,
      priority,
      maxTokens
    });

    // Update transcript with AI summary
    const formattedSummary = this.formatSummaryForStorage(summaryResult);
    
    const updatedTranscript = await transcriptService.updateTranscript(transcriptId, {
      ai_summary: formattedSummary,
      status: transcript.status === 'pending' ? 'review' : transcript.status
    });

    res.json({
      success: true,
      data: {
        transcript: updatedTranscript,
        summary: summaryResult,
        usage: {
          model: summaryResult.model,
          tokensUsed: summaryResult.tokensUsed,
          estimatedCost: summaryResult.estimatedCostUSD,
          confidenceScore: summaryResult.confidenceScore
        }
      },
      message: 'AI summary generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating AI summary:', error);
    
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
      error: 'Failed to generate AI summary',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/ai-summary/quick-preview
 * Generate quick summary for preview purposes
 */
router.post('/quick-preview', async (req: Request, res: Response) => {
  try {
    const { transcript, maxLength } = quickSummarySchema.parse(req.body);

    const quickSummary = await anthropicService.generateQuickSummary(transcript, maxLength);

    res.json({
      success: true,
      data: {
        summary: quickSummary,
        inputLength: transcript.length,
        outputLength: quickSummary.length
      },
      message: 'Quick summary generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating quick summary:', error);
    
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
      error: 'Failed to generate quick summary',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/ai-summary/test-connection
 * Test Anthropic API connection
 */
router.get('/test-connection', async (req: Request, res: Response) => {
  try {
    const isConnected = await anthropicService.testConnection();

    res.json({
      success: true,
      data: {
        connected: isConnected,
        service: 'Anthropic Claude',
        timestamp: new Date().toISOString()
      },
      message: isConnected ? 'Connection successful' : 'Connection failed'
    });

  } catch (error) {
    console.error('Error testing AI service connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test connection',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/ai-summary/usage-stats
 * Get AI usage statistics
 */
router.get('/usage-stats', async (req: Request, res: Response) => {
  try {
    // This would be implemented with actual usage tracking
    // For now, return mock data structure
    const mockStats = {
      totalSummariesGenerated: 0,
      totalTokensUsed: 0,
      totalCostUSD: 0,
      averageConfidenceScore: 0,
      modelUsage: {
        'claude-3-haiku-20240307': 0,
        'claude-3-sonnet-20240229': 0,
        'claude-3-opus-20240229': 0
      },
      recentActivity: []
    };

    res.json({
      success: true,
      data: mockStats,
      message: 'Usage statistics retrieved',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching AI usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Format summary result for database storage
 */
function formatSummaryForStorage(summaryResult: any): string {
  const formatted = {
    generated_at: new Date().toISOString(),
    model_used: summaryResult.model,
    confidence_score: summaryResult.confidenceScore,
    summary: summaryResult.summary,
    key_insights: summaryResult.keyInsights,
    financial_highlights: summaryResult.financialHighlights,
    risk_factors: summaryResult.riskFactors,
    tokens_used: summaryResult.tokensUsed.total,
    estimated_cost_usd: summaryResult.estimatedCostUSD
  };

  return JSON.stringify(formatted, null, 2);
}

export default router;