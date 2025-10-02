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

Extract comprehensive financial metrics from this earnings transcript. Return as JSON with these fields:
{
  "revenue": {
    "current_quarter": number,
    "prior_year_quarter": number,
    "yoy_growth_percent": number,
    "sequential_growth_percent": number,
    "by_segment": [{"name": string, "value": number, "growth": number}],
    "guidance_next_quarter": string,
    "guidance_full_year": string
  },
  "earnings": {
    "gaap_eps": number,
    "non_gaap_eps": number,
    "consensus_estimate": number,
    "beat_miss_amount": number,
    "yoy_growth_percent": number,
    "net_income": number,
    "adjusted_ebitda": number
  },
  "margins": {
    "gross_margin": number,
    "gross_margin_yoy_change": number,
    "operating_margin": number,
    "operating_margin_yoy_change": number,
    "net_margin": number,
    "ebitda_margin": number
  },
  "cash_flow": {
    "operating_cash_flow": number,
    "free_cash_flow": number,
    "capex": number,
    "cash_position": number,
    "debt_position": number
  },
  "guidance": {
    "updated": boolean,
    "direction": "raised"|"lowered"|"maintained"|"initiated",
    "revenue_guidance": {"q_next": string, "fy": string},
    "eps_guidance": {"q_next": string, "fy": string},
    "key_assumptions": [string],
    "confidence_level": "high"|"moderate"|"cautious"
  },
  "operational_metrics": {
    "customer_metrics": [{"name": string, "value": string, "change": string}],
    "product_metrics": [{"name": string, "value": string, "change": string}],
    "efficiency_metrics": [{"name": string, "value": string, "change": string}]
  },
  "stock_specific_kpis": [
    {"name": string, "value": string, "yoy_change": string, "context": string}
  ],
  "management_highlights": [string],
  "notable_comparisons": [
    {"metric": string, "vs_consensus": string, "vs_prior_year": string}
  ]
}

Extract ALL financial metrics mentioned. For missing values use null. Be precise with numbers.`;

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

  /**
   * Generate structured transcript summary with specific format for UI
   */
  async generateTranscriptSummary(params: {
    transcript: string;
    ticker: string;
    quarter: string;
    year: number;
  }): Promise<any> {
    const prompt = `
      Analyze this ${params.quarter} ${params.year} earnings call transcript for ${params.ticker}.

      Provide a JSON response with:
      {
        "summary": "Executive summary in 3-4 sentences focusing on key performance and strategic updates",
        "keyInsights": [
          "Most important strategic or operational development",
          "Key performance driver or trend",
          "Critical forward-looking statement or guidance change"
        ],
        "financialHighlights": [
          "Revenue: $X.X billion (±X% YoY, ±X% QoQ) - beat/miss by X%",
          "EPS: $X.XX GAAP / $X.XX non-GAAP (±X% YoY) - beat/miss consensus by $X.XX",
          "Margins: Gross X% (±Xbps YoY), Operating X% (±Xbps YoY)",
          "Free Cash Flow: $X.X billion (±X% YoY)",
          "Guidance: [Raised/Lowered/Maintained] - Q[X] Revenue $X-X billion, EPS $X.XX-X.XX"
        ],
        "risks": [
          "Primary risk factor or concern mentioned",
          "Secondary challenge or headwind",
          "Market or operational uncertainty"
        ],
        "outlook": "Management's tone and specific guidance for next quarter and full year",
        "sentiment": "positive|neutral|negative",
        "stockSpecificMetrics": [
          "For tech: ARR, CAC, churn rate, cloud growth",
          "For retail: same-store sales, e-commerce %, inventory turnover",
          "For finance: NIM, loan growth, credit quality",
          "Include actual numbers and YoY changes"
        ]
      }

      Transcript excerpt:
      ${params.transcript.substring(0, 8000)}
    `;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'You are a financial analyst. Respond only with valid JSON.'
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
}

export const openaiService = new OpenAIService();