/**
 * React Query hooks for AI Analysis API
 * Provides caching, error handling, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

// Types
export interface AIAnalysis {
  id: string;
  transcriptId: string;
  analysisType: 'summary' | 'sentiment' | 'metrics' | 'insights';
  content: any;
  model: 'gpt-4o-mini' | 'gpt-3.5-turbo';
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
  analyses: AIAnalysis[];
  totalCost: number;
  totalTokens: number;
  processingTime: number;
  errors: string[];
}

export interface AIStatsResponse {
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
}

export interface RateLimitStatus {
  'gpt-4o-mini': {
    requests: number;
    tokens: number;
    available: boolean;
  };
  'gpt-3.5-turbo': {
    requests: number;
    tokens: number;
    available: boolean;
  };
}

// API Functions
const analyzeTranscript = async (request: AnalysisRequest): Promise<BatchAnalysisResult> => {
  const response = await fetch('/api/ai/analyze-transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Analysis failed');
  }

  const data = await response.json();
  return data.data.result;
};

const batchAnalyzeTranscripts = async (requests: AnalysisRequest[]): Promise<BatchAnalysisResult[]> => {
  const response = await fetch('/api/ai/batch-analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Batch analysis failed');
  }

  const data = await response.json();
  return data.data.results;
};

const getTranscriptAnalyses = async (transcriptId: string): Promise<AIAnalysis[]> => {
  const response = await fetch(`/api/ai/analyses/${transcriptId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch analyses');
  }

  const data = await response.json();
  return data.data.analyses;
};

const getAIStats = async (): Promise<AIStatsResponse> => {
  const response = await fetch('/api/ai/stats');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch AI stats');
  }

  const data = await response.json();
  return data.data;
};

const getRateLimits = async (): Promise<RateLimitStatus> => {
  const response = await fetch('/api/ai/rate-limits');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch rate limits');
  }

  const data = await response.json();
  return data.data;
};

const getAIHealth = async () => {
  const response = await fetch('/api/ai/health');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Health check failed');
  }

  const data = await response.json();
  return data.data;
};

const deleteAnalysis = async (analysisId: string): Promise<void> => {
  const response = await fetch(`/api/ai/analyses/${analysisId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete analysis');
  }
};

// Query Keys
const aiQueryKeys = {
  all: ['ai'] as const,
  analyses: () => [...aiQueryKeys.all, 'analyses'] as const,
  transcriptAnalyses: (transcriptId: string) => [...aiQueryKeys.analyses(), transcriptId] as const,
  stats: () => [...aiQueryKeys.all, 'stats'] as const,
  rateLimits: () => [...aiQueryKeys.all, 'rate-limits'] as const,
  health: () => [...aiQueryKeys.all, 'health'] as const,
};

// Hooks
export function useTranscriptAnalyses(transcriptId: string) {
  return useQuery({
    queryKey: aiQueryKeys.transcriptAnalyses(transcriptId),
    queryFn: () => getTranscriptAnalyses(transcriptId),
    enabled: !!transcriptId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAnalyzeTranscript() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: analyzeTranscript,
    onSuccess: (data, variables) => {
      // Update the transcript analyses cache
      queryClient.setQueryData(
        aiQueryKeys.transcriptAnalyses(variables.transcriptId),
        (oldData: AIAnalysis[] | undefined) => {
          const newAnalyses = data.analyses;
          if (!oldData) return newAnalyses;

          // Merge new analyses with existing ones, replacing duplicates
          const merged = [...oldData];
          newAnalyses.forEach(newAnalysis => {
            const existingIndex = merged.findIndex(
              existing => existing.analysisType === newAnalysis.analysisType
            );
            if (existingIndex >= 0) {
              merged[existingIndex] = newAnalysis;
            } else {
              merged.push(newAnalysis);
            }
          });
          return merged;
        }
      );

      // Invalidate stats to refresh totals
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.stats() });

      toast({
        title: "Analysis Complete",
        description: `Generated ${data.analyses.length} analyses. Cost: $${data.totalCost.toFixed(3)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBatchAnalyzeTranscripts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: batchAnalyzeTranscripts,
    onSuccess: (data) => {
      // Update caches for all processed transcripts
      data.forEach(result => {
        queryClient.setQueryData(
          aiQueryKeys.transcriptAnalyses(result.transcriptId),
          result.analyses
        );
      });

      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.stats() });

      const totalCost = data.reduce((sum, result) => sum + result.totalCost, 0);
      const totalAnalyses = data.reduce((sum, result) => sum + result.analyses.length, 0);

      toast({
        title: "Batch Analysis Complete",
        description: `Generated ${totalAnalyses} analyses for ${data.length} transcripts. Total cost: $${totalCost.toFixed(3)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Batch Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAIStats() {
  return useQuery({
    queryKey: aiQueryKeys.stats(),
    queryFn: getAIStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRateLimits() {
  return useQuery({
    queryKey: aiQueryKeys.rateLimits(),
    queryFn: getRateLimits,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

export function useAIHealth() {
  return useQuery({
    queryKey: aiQueryKeys.health(),
    queryFn: getAIHealth,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteAnalysis,
    onSuccess: (_, analysisId) => {
      // Invalidate all transcript analyses since we don't know which transcript it belonged to
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.analyses() });
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.stats() });

      toast({
        title: "Analysis Deleted",
        description: "The AI analysis has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Utility hooks for specific analysis types
export function useTranscriptSummary(transcriptId: string) {
  const { data: analyses } = useTranscriptAnalyses(transcriptId);
  return analyses?.find(analysis => analysis.analysisType === 'summary');
}

export function useTranscriptSentiment(transcriptId: string) {
  const { data: analyses } = useTranscriptAnalyses(transcriptId);
  return analyses?.find(analysis => analysis.analysisType === 'sentiment');
}

export function useTranscriptMetrics(transcriptId: string) {
  const { data: analyses } = useTranscriptAnalyses(transcriptId);
  return analyses?.find(analysis => analysis.analysisType === 'metrics');
}

export function useTranscriptInsights(transcriptId: string) {
  const { data: analyses } = useTranscriptAnalyses(transcriptId);
  return analyses?.find(analysis => analysis.analysisType === 'insights');
}

// Cost tracking hook
export function useAICostSummary() {
  const { data: stats } = useAIStats();
  
  return {
    totalCost: stats?.totalCost || 0,
    totalTokens: stats?.totalTokens || 0,
    totalAnalyses: stats?.totalAnalyses || 0,
    averageCostPerAnalysis: stats?.totalAnalyses ? (stats.totalCost / stats.totalAnalyses) : 0,
    averageTokensPerAnalysis: stats?.totalAnalyses ? (stats.totalTokens / stats.totalAnalyses) : 0,
  };
}