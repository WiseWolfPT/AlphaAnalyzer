/**
 * Transcript AI Analyzer Service
 * Orchestrates AI analysis of earnings transcripts
 * Manages batch processing and analysis caching
 */

import { openaiService, AIAnalysisRequest, OpenAIModel } from './openai-service';
import { transcriptsPgRepo } from '../../repositories/transcripts-pg';
import { aiAnalysesPgRepo } from '../../repositories/ai-analyses-pg';
import { structuredLogger } from '../structured-logger';

export interface TranscriptAnalysis {
  id: string;
  transcriptId: string;
  analysisType: 'summary' | 'sentiment' | 'metrics' | 'insights';
  content: any; // JSON content varies by type
  model: OpenAIModel;
  confidenceScore: number;
  tokensUsed: number;
  costUSD: number;
  createdAt: Date;
}

export interface AnalysisRequest {
  transcriptId: string;
  types: ('summary' | 'sentiment' | 'metrics' | 'insights')[];
  priority?: 'high' | 'normal' | 'low';
  forceRegenerate?: boolean;
}

export interface BatchAnalysisResult {
  transcriptId: string;
  analyses: TranscriptAnalysis[];
  totalCost: number;
  totalTokens: number;
  processingTime: number;
  errors: string[];
}

class TranscriptAnalyzer {
  
  /**
   * Analyze a single transcript with specified analysis types
   */
  async analyzeTranscript(request: AnalysisRequest): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    const results: TranscriptAnalysis[] = [];
    const errors: string[] = [];
    let totalCost = 0;
    let totalTokens = 0;

    try {
      // Get transcript content
      const transcript = await this.getTranscriptContent(request.transcriptId);
      if (!transcript) {
        throw new Error(`Transcript not found: ${request.transcriptId}`);
      }

      // Check for existing analyses if not forcing regeneration
      const existingAnalyses = request.forceRegenerate 
        ? [] 
        : await this.getExistingAnalyses(request.transcriptId, request.types);

      // Filter out types that already have analyses
      const existingTypes = existingAnalyses.map(a => a.analysisType);
      const typesToAnalyze = request.types.filter(type => !existingTypes.includes(type));

      // Add existing analyses to results
      results.push(...existingAnalyses);

      // Process each analysis type
      for (const analysisType of typesToAnalyze) {
        try {
          const analysis = await this.performAnalysis(
            transcript.content,
            transcript.id,
            analysisType,
            request.priority || 'normal'
          );
          
          results.push(analysis);
          totalCost += analysis.costUSD;
          totalTokens += analysis.tokensUsed;

          structuredLogger.info('Transcript analysis completed', {
            transcriptId: request.transcriptId,
            analysisType,
            model: analysis.model,
            tokensUsed: analysis.tokensUsed,
            costUSD: analysis.costUSD
          });

        } catch (error) {
          const errorMsg = `Failed to analyze ${analysisType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          
          structuredLogger.error('Transcript analysis failed', {
            transcriptId: request.transcriptId,
            analysisType,
            error: errorMsg
          });
        }
      }

      return {
        transcriptId: request.transcriptId,
        analyses: results,
        totalCost,
        totalTokens,
        processingTime: Date.now() - startTime,
        errors
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      structuredLogger.error('Transcript analysis batch failed', {
        transcriptId: request.transcriptId,
        error: errorMsg
      });

      return {
        transcriptId: request.transcriptId,
        analyses: results,
        totalCost,
        totalTokens,
        processingTime: Date.now() - startTime,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Batch analyze multiple transcripts
   */
  async batchAnalyzeTranscripts(requests: AnalysisRequest[]): Promise<BatchAnalysisResult[]> {
    const results: BatchAnalysisResult[] = [];
    
    structuredLogger.info('Starting batch transcript analysis', {
      transcriptCount: requests.length,
      totalTypes: requests.reduce((sum, req) => sum + req.types.length, 0)
    });

    // Process with controlled concurrency to respect rate limits
    const concurrency = 2; // Process 2 transcripts at a time
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(request => 
        this.analyzeTranscript(request).catch(error => ({
          transcriptId: request.transcriptId,
          analyses: [],
          totalCost: 0,
          totalTokens: 0,
          processingTime: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + concurrency < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    const totalCost = results.reduce((sum, result) => sum + result.totalCost, 0);
    const totalTokens = results.reduce((sum, result) => sum + result.totalTokens, 0);
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);

    structuredLogger.info('Batch transcript analysis completed', {
      transcriptCount: requests.length,
      successfulAnalyses: results.filter(r => r.errors.length === 0).length,
      totalErrors,
      totalCost,
      totalTokens
    });

    return results;
  }

  /**
   * Get transcript content from PostgreSQL database
   */
  private async getTranscriptContent(transcriptId: string): Promise<{ id: string; content: string; } | null> {
    try {
      const transcript = await transcriptsPgRepo.getById(parseInt(transcriptId));

      if (!transcript) {
        structuredLogger.error('Transcript not found', { transcriptId });
        return null;
      }

      return {
        id: transcript.id.toString(),
        content: transcript.raw_transcript || ''
      };
    } catch (error) {
      structuredLogger.error('Failed to fetch transcript', {
        transcriptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get existing analyses for a transcript from PostgreSQL
   */
  private async getExistingAnalyses(
    transcriptId: string,
    types: string[]
  ): Promise<TranscriptAnalysis[]> {
    try {
      const analyses = await aiAnalysesPgRepo.getByTranscriptIdAndTypes(transcriptId, types);

      return analyses.map(row => ({
        id: row.id,
        transcriptId: row.transcript_id,
        analysisType: row.analysis_type as any,
        content: row.content,
        model: row.model_used as OpenAIModel,
        confidenceScore: row.confidence_score,
        tokensUsed: row.tokens_used,
        costUSD: row.cost_usd,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      structuredLogger.error('Failed to fetch existing analyses', {
        transcriptId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Perform single analysis and save to database
   */
  private async performAnalysis(
    content: string,
    transcriptId: string,
    analysisType: 'summary' | 'sentiment' | 'metrics' | 'insights',
    priority: 'high' | 'normal' | 'low'
  ): Promise<TranscriptAnalysis> {
    
    // Truncate content if too long to avoid token limits
    const maxContentLength = analysisType === 'summary' ? 8000 : 6000;
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...\n[Content truncated for analysis]'
      : content;

    const aiRequest: AIAnalysisRequest = {
      content: truncatedContent,
      type: analysisType,
      priority,
      maxTokens: analysisType === 'metrics' ? 500 : 800
    };

    const aiResponse = await openaiService.analyzeContent(aiRequest);

    // Parse content based on analysis type
    let parsedContent: any;
    try {
      if (analysisType === 'metrics') {
        parsedContent = JSON.parse(aiResponse.content);
      } else {
        parsedContent = { text: aiResponse.content };
      }
    } catch (error) {
      // If JSON parsing fails for metrics, wrap in text object
      parsedContent = { text: aiResponse.content };
    }

    // Save to PostgreSQL database
    const analysisData = await aiAnalysesPgRepo.create({
      transcript_id: transcriptId,
      model_used: aiResponse.model as any,
      analysis_type: analysisType,
      content: parsedContent,
      confidence_score: aiResponse.confidenceScore,
      tokens_used: aiResponse.tokensUsed.total,
      cost_usd: aiResponse.costUSD
    });

    if (!analysisData) {
      throw new Error('Failed to save analysis - no data returned');
    }

    return {
      id: analysisData.id,
      transcriptId,
      analysisType,
      content: parsedContent,
      model: aiResponse.model,
      confidenceScore: aiResponse.confidenceScore,
      tokensUsed: aiResponse.tokensUsed.total,
      costUSD: aiResponse.costUSD,
      createdAt: new Date(analysisData.created_at)
    };
  }

  /**
   * Get all analyses for a transcript
   */
  async getTranscriptAnalyses(transcriptId: string): Promise<TranscriptAnalysis[]> {
    return this.getExistingAnalyses(transcriptId, ['summary', 'sentiment', 'metrics', 'insights']);
  }

  /**
   * Get analysis statistics for admin dashboard from PostgreSQL
   */
  async getAnalysisStats(): Promise<{
    totalAnalyses: number;
    totalCost: number;
    totalTokens: number;
    analysesByType: Record<string, number>;
    analysesByModel: Record<string, number>;
    recentActivity: Array<{
      date: string;
      count: number;
      cost: number;
    }>;
  }> {
    try {
      return await aiAnalysesPgRepo.getStats();
    } catch (error) {
      structuredLogger.error('Failed to get analysis stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        totalAnalyses: 0,
        totalCost: 0,
        totalTokens: 0,
        analysesByType: {},
        analysesByModel: {},
        recentActivity: []
      };
    }
  }

}

export const transcriptAnalyzer = new TranscriptAnalyzer();