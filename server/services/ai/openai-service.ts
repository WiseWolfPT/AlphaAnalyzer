/**
 * OpenAI Integration Service
 * Handles all interactions with OpenAI API for financial analysis
 * Respects rate limits for Tier 1 account
 */

import OpenAI from 'openai';
import { structuredLogger } from '../structured-logger';

// Rate limits for OpenAI Tier 1
const RATE_LIMITS = {
  'gpt-4o-mini': {
    tpm: 50000,  // tokens per minute
    rpm: 500,    // requests per minute
    inputCost: 0.15,   // per 1M tokens
    outputCost: 0.60   // per 1M tokens
  },
  'gpt-3.5-turbo': {
    tpm: 200000,
    rpm: 500,
    inputCost: 0.50,
    outputCost: 1.50
  }
} as const;

export type OpenAIModel = keyof typeof RATE_LIMITS;

export interface AIAnalysisRequest {
  content: string;
  type: 'summary' | 'sentiment' | 'metrics' | 'insights';
  priority: 'high' | 'normal' | 'low';
  maxTokens?: number;
}

export interface AIAnalysisResponse {
  content: string;
  model: OpenAIModel;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costUSD: number;
  confidenceScore: number;
  processingTime: number;
}

class OpenAIService {
  private client: OpenAI;
  private requestCount: Map<string, number> = new Map();
  private tokenCount: Map<string, number> = new Map();
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey,
    });
    
    // Reset counters every minute
    setInterval(() => {
      this.requestCount.clear();
      this.tokenCount.clear();
    }, 60000);
  }

  /**
   * Choose optimal model based on priority and current usage
   */
  private selectModel(priority: 'high' | 'normal' | 'low'): OpenAIModel {
    const currentTime = new Date().toISOString().slice(0, 16); // minute precision
    
    const miniRequests = this.requestCount.get(`gpt-4o-mini-${currentTime}`) || 0;
    const turboRequests = this.requestCount.get(`gpt-3.5-turbo-${currentTime}`) || 0;
    
    const miniTokens = this.tokenCount.get(`gpt-4o-mini-${currentTime}`) || 0;
    const turboTokens = this.tokenCount.get(`gpt-3.5-turbo-${currentTime}`) || 0;
    
    // For high priority and if we haven't hit mini limits, use gpt-4o-mini
    if (priority === 'high' && 
        miniRequests < RATE_LIMITS['gpt-4o-mini'].rpm * 0.8 && 
        miniTokens < RATE_LIMITS['gpt-4o-mini'].tpm * 0.8) {
      return 'gpt-4o-mini';
    }
    
    // Otherwise use turbo if available
    if (turboRequests < RATE_LIMITS['gpt-3.5-turbo'].rpm * 0.8 && 
        turboTokens < RATE_LIMITS['gpt-3.5-turbo'].tpm * 0.8) {
      return 'gpt-3.5-turbo';
    }
    
    // Default to mini if turbo is saturated
    return 'gpt-4o-mini';
  }

  /**
   * Track usage for rate limiting
   */
  private trackUsage(model: OpenAIModel, tokensUsed: number) {
    const currentTime = new Date().toISOString().slice(0, 16);
    const requestKey = `${model}-${currentTime}`;
    const tokenKey = `${model}-${currentTime}`;
    
    this.requestCount.set(requestKey, (this.requestCount.get(requestKey) || 0) + 1);
    this.tokenCount.set(tokenKey, (this.tokenCount.get(tokenKey) || 0) + tokensUsed);
  }

  /**
   * Calculate cost based on model and token usage
   */
  private calculateCost(model: OpenAIModel, inputTokens: number, outputTokens: number): number {
    const limits = RATE_LIMITS[model];
    const inputCost = (inputTokens / 1000000) * limits.inputCost;
    const outputCost = (outputTokens / 1000000) * limits.outputCost;
    return inputCost + outputCost;
  }

  /**
   * Generate AI analysis for financial content
   */
  async analyzeContent(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const startTime = Date.now();
    const model = this.selectModel(request.priority);
    
    try {
      const systemPrompt = this.getSystemPrompt(request.type);
      
      const completion = await this.client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.content }
        ],
        max_tokens: request.maxTokens || 1000,
        temperature: 0.3, // Lower temperature for financial analysis
        response_format: request.type === 'metrics' ? { type: 'json_object' } : undefined
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const tokensUsed = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      };

      const costUSD = this.calculateCost(model, tokensUsed.input, tokensUsed.output);
      
      // Track usage for rate limiting
      this.trackUsage(model, tokensUsed.total);
      
      // Log the analysis
      structuredLogger.info('AI analysis completed', {
        model,
        type: request.type,
        priority: request.priority,
        tokensUsed: tokensUsed.total,
        costUSD,
        processingTime: Date.now() - startTime
      });

      return {
        content: response,
        model,
        tokensUsed,
        costUSD,
        confidenceScore: this.calculateConfidenceScore(model, request.type),
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      structuredLogger.error('OpenAI analysis failed', {
        model,
        type: request.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });
      
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get system prompt based on analysis type
   */
  private getSystemPrompt(type: AIAnalysisRequest['type']): string {
    const basePrompt = `You are a expert financial analyst specializing in earnings call analysis. Provide accurate, concise, and actionable insights.`;

    switch (type) {
      case 'summary':
        return `${basePrompt} 

Summarize this earnings transcript in 3-4 bullet points focusing on:
- Key financial metrics and performance highlights
- Major strategic announcements or guidance updates  
- Management's outlook and forward-looking statements
- Any significant risks or challenges mentioned

Keep it concise but comprehensive.`;

      case 'sentiment':
        return `${basePrompt}

Analyze the sentiment of this earnings transcript and provide:
- Overall sentiment score (1-10, where 1=very negative, 10=very positive)
- Key sentiment drivers (what's making it positive/negative)
- Management confidence level
- Market reaction predictions

Be objective and evidence-based in your assessment.`;

      case 'metrics':
        return `${basePrompt}

Extract key financial metrics from this transcript and return as JSON with these fields:
{
  "revenue": {"current": number, "yoy_growth": number, "guidance": string},
  "earnings": {"eps": number, "yoy_growth": number, "beat_estimates": boolean},
  "margins": {"gross": number, "operating": number, "net": number},
  "guidance": {"updated": boolean, "direction": "raised"|"lowered"|"maintained", "details": string},
  "key_metrics": [{"name": string, "value": string, "change": string}]
}

Only include metrics explicitly mentioned in the transcript.`;

      case 'insights':
        return `${basePrompt}

Provide strategic insights from this earnings transcript:
- What are the 2-3 most important takeaways for investors?
- What competitive advantages or challenges are evident?
- What trends or market dynamics are affecting the business?
- What should investors watch for in future quarters?

Focus on actionable intelligence for investment decisions.`;

      default:
        return basePrompt;
    }
  }

  /**
   * Calculate confidence score based on model and analysis type
   */
  private calculateConfidenceScore(model: OpenAIModel, type: AIAnalysisRequest['type']): number {
    let baseScore = model === 'gpt-4o-mini' ? 0.85 : 0.75;
    
    // Adjust based on analysis type
    switch (type) {
      case 'metrics':
        baseScore *= 0.95; // High confidence for structured data
        break;
      case 'summary':
        baseScore *= 0.90;
        break;
      case 'sentiment':
        baseScore *= 0.80; // More subjective
        break;
      case 'insights':
        baseScore *= 0.75; // Most subjective
        break;
    }
    
    return Math.round(baseScore * 100) / 100;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): Record<OpenAIModel, { requests: number; tokens: number; available: boolean }> {
    const currentTime = new Date().toISOString().slice(0, 16);
    
    return {
      'gpt-4o-mini': {
        requests: this.requestCount.get(`gpt-4o-mini-${currentTime}`) || 0,
        tokens: this.tokenCount.get(`gpt-4o-mini-${currentTime}`) || 0,
        available: (this.requestCount.get(`gpt-4o-mini-${currentTime}`) || 0) < RATE_LIMITS['gpt-4o-mini'].rpm * 0.9
      },
      'gpt-3.5-turbo': {
        requests: this.requestCount.get(`gpt-3.5-turbo-${currentTime}`) || 0,
        tokens: this.tokenCount.get(`gpt-3.5-turbo-${currentTime}`) || 0,
        available: (this.requestCount.get(`gpt-3.5-turbo-${currentTime}`) || 0) < RATE_LIMITS['gpt-3.5-turbo'].rpm * 0.9
      }
    };
  }
}

export const openaiService = new OpenAIService();