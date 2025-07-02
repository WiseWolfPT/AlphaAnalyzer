import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  EnhancedValuationResult, 
  ValuationModel, 
  ValuationSummary,
  ValuationModelType,
  ValuationParameters 
} from '@shared/schema';

// Enhanced Valuation Hooks for multiple models

// Hook for fetching comprehensive valuation analysis
export function useEnhancedValuation(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ['enhancedValuation', symbol],
    queryFn: async (): Promise<EnhancedValuationResult> => {
      const response = await fetch(`/api/valuation/enhanced/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch enhanced valuation');
      }
      return response.json();
    },
    enabled: enabled && !!symbol,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });
}

// Hook for fetching individual valuation models
export function useValuationModels(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ['valuationModels', symbol],
    queryFn: async (): Promise<ValuationModel[]> => {
      const response = await fetch(`/api/valuation/models/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch valuation models');
      }
      return response.json();
    },
    enabled: enabled && !!symbol,
    staleTime: 30 * 60 * 1000,
  });
}

// Hook for fetching valuation summary
export function useValuationSummary(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ['valuationSummary', symbol],
    queryFn: async (): Promise<ValuationSummary> => {
      const response = await fetch(`/api/valuation/summary/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch valuation summary');
      }
      return response.json();
    },
    enabled: enabled && !!symbol,
    staleTime: 30 * 60 * 1000,
  });
}

// Mutation for calculating specific valuation model
export function useCalculateValuationModel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      symbol: string;
      modelType: ValuationModelType;
      parameters: ValuationParameters;
    }) => {
      const response = await fetch('/api/valuation/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate valuation model');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['enhancedValuation', variables.symbol] });
      queryClient.invalidateQueries({ queryKey: ['valuationModels', variables.symbol] });
      queryClient.invalidateQueries({ queryKey: ['valuationSummary', variables.symbol] });
    },
  });
}

// Mutation for recalculating all valuation models
export function useRecalculateAllModels() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (symbol: string) => {
      const response = await fetch(`/api/valuation/recalculate/${symbol}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to recalculate all models');
      }
      
      return response.json();
    },
    onSuccess: (data, symbol) => {
      // Invalidate all valuation queries for this symbol
      queryClient.invalidateQueries({ queryKey: ['enhancedValuation', symbol] });
      queryClient.invalidateQueries({ queryKey: ['valuationModels', symbol] });
      queryClient.invalidateQueries({ queryKey: ['valuationSummary', symbol] });
      queryClient.invalidateQueries({ queryKey: ['intrinsicValue', symbol] }); // Legacy support
    },
  });
}

// Hook for Monte Carlo simulation
export function useMonteCarloSimulation() {
  return useMutation({
    mutationFn: async (params: {
      symbol: string;
      modelType: ValuationModelType;
      parameters: ValuationParameters;
      iterations?: number;
    }) => {
      const response = await fetch('/api/valuation/monte-carlo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to run Monte Carlo simulation');
      }
      
      return response.json();
    },
  });
}

// Hook for peer comparison data
export function usePeerComparison(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ['peerComparison', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/valuation/peer-comparison/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch peer comparison');
      }
      return response.json();
    },
    enabled: enabled && !!symbol,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
}

// Hook for sector valuation metrics
export function useSectorValuation(sector: string, enabled = true) {
  return useQuery({
    queryKey: ['sectorValuation', sector],
    queryFn: async () => {
      const response = await fetch(`/api/valuation/sector/${sector}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sector valuation');
      }
      return response.json();
    },
    enabled: enabled && !!sector,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
}

// Hook for historical valuation tracking
export function useHistoricalValuation(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ['historicalValuation', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/valuation/historical/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch historical valuation');
      }
      return response.json();
    },
    enabled: enabled && !!symbol,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
}

// Utility hook for valuation model parameters validation
export function useValidateModelParameters() {
  return useMutation({
    mutationFn: async (params: {
      modelType: ValuationModelType;
      parameters: ValuationParameters;
    }) => {
      const response = await fetch('/api/valuation/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate parameters');
      }
      
      return response.json();
    },
  });
}

// Custom hook for comprehensive valuation with all data
export function useComprehensiveValuation(symbol: string, enabled = true) {
  const enhancedValuation = useEnhancedValuation(symbol, enabled);
  const peerComparison = usePeerComparison(symbol, enabled);
  const historicalValuation = useHistoricalValuation(symbol, enabled);
  
  return {
    valuation: enhancedValuation,
    peers: peerComparison,
    historical: historicalValuation,
    isLoading: enhancedValuation.isLoading || peerComparison.isLoading || historicalValuation.isLoading,
    error: enhancedValuation.error || peerComparison.error || historicalValuation.error,
    refetch: () => {
      enhancedValuation.refetch();
      peerComparison.refetch();
      historicalValuation.refetch();
    }
  };
}

// Mock data generator for development/testing
export function generateMockValuationData(symbol: string, currentPrice: number): EnhancedValuationResult {
  const models: ValuationModel[] = [
    {
      id: 1,
      stockSymbol: symbol,
      modelType: 'dcf',
      intrinsicValue: currentPrice * (0.9 + Math.random() * 0.4), // ±20% variation
      currentPrice,
      valuation: 'undervalued',
      deltaPercent: 15.2,
      confidenceScore: 0.85,
      parameters: JSON.stringify({
        eps: 5.25,
        growthRate: 12,
        horizon: 10,
        requiredReturn: 10,
        marginOfSafety: 25
      }),
      lowEstimate: currentPrice * 0.8,
      highEstimate: currentPrice * 1.4,
      calculatedAt: new Date(),
      lastUpdated: new Date()
    },
    {
      id: 2,
      stockSymbol: symbol,
      modelType: 'pe_multiple',
      intrinsicValue: currentPrice * (0.85 + Math.random() * 0.3),
      currentPrice,
      valuation: 'neutral',
      deltaPercent: 8.7,
      confidenceScore: 0.72,
      parameters: JSON.stringify({
        currentEPS: 5.25,
        industryPE: 18.5,
        peerPEs: [16.2, 19.8, 17.5, 20.1],
        marginOfSafety: 20
      }),
      lowEstimate: currentPrice * 0.75,
      highEstimate: currentPrice * 1.25,
      calculatedAt: new Date(),
      lastUpdated: new Date()
    },
    {
      id: 3,
      stockSymbol: symbol,
      modelType: 'ddm',
      intrinsicValue: currentPrice * (0.92 + Math.random() * 0.25),
      currentPrice,
      valuation: 'undervalued',
      deltaPercent: 12.3,
      confidenceScore: 0.78,
      parameters: JSON.stringify({
        currentDividend: 2.50,
        dividendGrowthRate: 6,
        requiredReturn: 9,
        marginOfSafety: 20
      }),
      lowEstimate: currentPrice * 0.85,
      highEstimate: currentPrice * 1.15,
      calculatedAt: new Date(),
      lastUpdated: new Date()
    }
  ];

  const consensusValue = models.reduce((sum, model) => 
    sum + (model.intrinsicValue * (model.confidenceScore || 0.5)), 0
  ) / models.reduce((sum, model) => sum + (model.confidenceScore || 0.5), 0);

  const values = models.map(m => m.intrinsicValue);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - consensusValue, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const summary: ValuationSummary = {
    id: 1,
    stockSymbol: symbol,
    consensusValue: Number(consensusValue.toFixed(2)),
    consensusValuation: consensusValue > currentPrice * 1.1 ? 'undervalued' : 
                        consensusValue < currentPrice * 0.9 ? 'overvalued' : 'neutral',
    consensusConfidence: 0.78,
    modelCount: models.length,
    valueSpread: Number(stdDev.toFixed(2)),
    bullishValue: Math.max(...values),
    bearishValue: Math.min(...values),
    currentPrice,
    marketCap: null,
    lastUpdated: new Date()
  };

  return {
    symbol,
    currentPrice,
    models,
    summary,
    consensus: {
      value: consensusValue,
      classification: summary.consensusValuation || 'neutral',
      confidence: 0.78,
      spread: stdDev
    },
    ranges: {
      bullish: Math.max(...values),
      bearish: Math.min(...values),
      mostLikely: consensusValue
    }
  };
}

// Hook that provides mock data for development
export function useMockEnhancedValuation(symbol: string, currentPrice: number, enabled = true) {
  return useQuery({
    queryKey: ['mockEnhancedValuation', symbol],
    queryFn: () => Promise.resolve(generateMockValuationData(symbol, currentPrice)),
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes for development
  });
}