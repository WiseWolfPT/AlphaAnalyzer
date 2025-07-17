/**
 * Anthropic Claude Service - Phase 3 Implementation
 * 
 * Service for generating AI-powered transcript summaries using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { structuredLogger } from '../structured-logger';

export type AnthropicModel = 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307' | 'claude-3-opus-20240229';

export interface TranscriptSummaryRequest {
  transcript: string;
  ticker: string;
  companyName: string;
  quarter: string;
  year: number;
  priority?: 'high' | 'normal' | 'low';
  maxTokens?: number;
}

export interface TranscriptSummaryResponse {
  summary: string;
  keyInsights: string[];
  financialHighlights: string[];
  riskFactors: string[];
  model: AnthropicModel;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  estimatedCostUSD: number;
  confidenceScore: number;
}

class AnthropicService {
  private client: Anthropic;
  private readonly DEFAULT_MODEL: AnthropicModel = 'claude-3-sonnet-20240229';
  
  // Pricing per 1M tokens (as of 2025)
  private readonly PRICING = {
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 }
  };

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Generate a comprehensive summary of an earnings call transcript
   */
  async generateTranscriptSummary(request: TranscriptSummaryRequest): Promise<TranscriptSummaryResponse> {
    try {
      const model = this.selectModel(request.priority || 'normal');
      const maxTokens = request.maxTokens || 1000;

      // Prepare the system prompt for earnings call analysis
      const systemPrompt = this.buildSystemPrompt();
      
      // Prepare the user prompt with transcript content
      const userPrompt = this.buildUserPrompt(request);

      structuredLogger.info('Generating transcript summary with Anthropic Claude', {
        ticker: request.ticker,
        quarter: request.quarter,
        year: request.year,
        model,
        transcriptLength: request.transcript.length,
        maxTokens
      });

      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      // Parse the structured response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const parsedSummary = this.parseStructuredResponse(content.text);
      
      // Calculate token usage and cost
      const tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens
      };

      const estimatedCostUSD = this.calculateCost(model, tokensUsed);

      const result: TranscriptSummaryResponse = {
        ...parsedSummary,
        model,
        tokensUsed,
        estimatedCostUSD,
        confidenceScore: this.calculateConfidenceScore(content.text, request.transcript)
      };

      structuredLogger.info('Transcript summary generated successfully', {
        ticker: request.ticker,
        model,
        tokensUsed: tokensUsed.total,
        estimatedCostUSD,
        confidenceScore: result.confidenceScore
      });

      return result;

    } catch (error) {
      structuredLogger.error('Failed to generate transcript summary', {
        ticker: request.ticker,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error(`Failed to generate transcript summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a quick summary for preview purposes
   */
  async generateQuickSummary(transcript: string, maxLength: number = 500): Promise<string> {
    try {
      const truncatedTranscript = transcript.length > 3000 
        ? transcript.substring(0, 3000) + '...'
        : transcript;

      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Use fastest model for quick summaries
        max_tokens: 200,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `Please provide a brief 2-3 sentence summary of this earnings call transcript:\n\n${truncatedTranscript}`
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return content.text.trim();

    } catch (error) {
      structuredLogger.error('Failed to generate quick summary', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to generate quick summary');
    }
  }

  /**
   * Build the system prompt for transcript analysis
   */
  private buildSystemPrompt(): string {
    return `You are a expert financial analyst specializing in earnings call analysis. Your task is to analyze earnings call transcripts and provide structured, insightful summaries.

Please analyze the transcript and provide your response in the following JSON structure:

{
  "summary": "A comprehensive 3-4 paragraph summary of the key points from the earnings call",
  "keyInsights": [
    "Insight 1: Major business development or strategic initiative",
    "Insight 2: Notable performance metric or trend",
    "Insight 3: Management commentary on future outlook"
  ],
  "financialHighlights": [
    "Revenue: $X.X billion (up/down X% YoY)",
    "Net income: $X.X billion (up/down X% YoY)", 
    "EPS: $X.XX (vs $X.XX expected)",
    "Other key financial metrics mentioned"
  ],
  "riskFactors": [
    "Risk 1: Market headwinds or challenges mentioned",
    "Risk 2: Regulatory or competitive concerns",
    "Risk 3: Operational or financial risks highlighted"
  ]
}

Focus on:
- Financial performance vs. expectations
- Forward guidance and outlook
- Key business developments and strategic initiatives
- Management commentary on market conditions
- Investor concerns from Q&A section

Provide accurate, fact-based analysis based only on information contained in the transcript.`;
  }

  /**
   * Build the user prompt with transcript content
   */
  private buildUserPrompt(request: TranscriptSummaryRequest): string {
    // Truncate transcript if too long to avoid token limits
    const maxTranscriptLength = 15000; // Conservative limit for context
    const truncatedTranscript = request.transcript.length > maxTranscriptLength
      ? request.transcript.substring(0, maxTranscriptLength) + '\n\n[Transcript truncated for analysis]'
      : request.transcript;

    return `Company: ${request.companyName} (${request.ticker})
Quarter: ${request.quarter} ${request.year}

Earnings Call Transcript:
${truncatedTranscript}

Please analyze this earnings call transcript and provide a structured summary following the JSON format specified in the system prompt.`;
  }

  /**
   * Parse the structured response from Claude
   */
  private parseStructuredResponse(response: string): {
    summary: string;
    keyInsights: string[];
    financialHighlights: string[];
    riskFactors: string[];
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '',
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
          financialHighlights: Array.isArray(parsed.financialHighlights) ? parsed.financialHighlights : [],
          riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : []
        };
      }
    } catch (error) {
      structuredLogger.warn('Failed to parse structured JSON response, falling back to text parsing', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Fallback: parse sections from text response
    return this.parseTextResponse(response);
  }

  /**
   * Fallback method to parse text response when JSON parsing fails
   */
  private parseTextResponse(response: string): {
    summary: string;
    keyInsights: string[];
    financialHighlights: string[];
    riskFactors: string[];
  } {
    const lines = response.split('\n').map(line => line.trim()).filter(line => line);
    
    let summary = '';
    const keyInsights: string[] = [];
    const financialHighlights: string[] = [];
    const riskFactors: string[] = [];
    
    let currentSection = 'summary';
    
    for (const line of lines) {
      if (line.toLowerCase().includes('key insight') || line.toLowerCase().includes('insight')) {
        currentSection = 'insights';
        continue;
      } else if (line.toLowerCase().includes('financial') || line.toLowerCase().includes('highlight')) {
        currentSection = 'financial';
        continue;
      } else if (line.toLowerCase().includes('risk') || line.toLowerCase().includes('challenge')) {
        currentSection = 'risks';
        continue;
      }
      
      if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
        const cleanLine = line.replace(/^[-•\d.]\s*/, '').trim();
        if (cleanLine) {
          switch (currentSection) {
            case 'insights':
              keyInsights.push(cleanLine);
              break;
            case 'financial':
              financialHighlights.push(cleanLine);
              break;
            case 'risks':
              riskFactors.push(cleanLine);
              break;
          }
        }
      } else if (currentSection === 'summary' && line.length > 20) {
        summary += (summary ? ' ' : '') + line;
      }
    }
    
    return {
      summary: summary || 'Summary could not be extracted from the response.',
      keyInsights: keyInsights.length > 0 ? keyInsights : ['Key insights extraction failed'],
      financialHighlights: financialHighlights.length > 0 ? financialHighlights : ['Financial highlights extraction failed'],
      riskFactors: riskFactors.length > 0 ? riskFactors : ['Risk factors extraction failed']
    };
  }

  /**
   * Select appropriate model based on priority
   */
  private selectModel(priority: 'high' | 'normal' | 'low'): AnthropicModel {
    switch (priority) {
      case 'high':
        return 'claude-3-opus-20240229'; // Most capable but expensive
      case 'low':
        return 'claude-3-haiku-20240307'; // Fast and economical
      default:
        return 'claude-3-sonnet-20240229'; // Balanced option
    }
  }

  /**
   * Calculate estimated cost based on token usage
   */
  private calculateCost(model: AnthropicModel, tokensUsed: { input: number; output: number }): number {
    const pricing = this.PRICING[model];
    const inputCost = (tokensUsed.input / 1_000_000) * pricing.input;
    const outputCost = (tokensUsed.output / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidenceScore(response: string, originalTranscript: string): number {
    let score = 0.5; // Base score
    
    // Check if response contains structured data
    if (response.includes('summary') && response.includes('insight')) {
      score += 0.2;
    }
    
    // Check response length appropriateness
    if (response.length > 200 && response.length < 3000) {
      score += 0.2;
    }
    
    // Check if response contains financial data
    if (response.match(/\$[\d,.]+(?: billion| million)?/gi)) {
      score += 0.1;
    }
    
    // Clamp between 0 and 1
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Test the service connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      });

      return response.content[0].type === 'text';
    } catch (error) {
      structuredLogger.error('Anthropic service connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export const anthropicService = new AnthropicService();