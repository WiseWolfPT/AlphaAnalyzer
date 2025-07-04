import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Types
export interface Fundamentals {
  symbol: string;
  marketCap: number;
  pe: number;
  eps: number;
  dividend: number;
  dividendYield: number;
  beta: number;
  week52High: number;
  week52Low: number;
  provider: string;
  timestamp: number;
}

export interface CompanyInfo {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  employees: number;
  provider: string;
  timestamp: number;
}

// Hook for fundamentals data
export function useFundamentals(symbol: string, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery<Fundamentals>({
    queryKey: ['fundamentals', symbol],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/market-data/stocks/${symbol}/fundamentals`
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch fundamentals');
      }
      
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 5 * 60 * 1000, // Default 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
  });
}

// Hook for company info
export function useCompanyInfo(symbol: string, options?: {
  enabled?: boolean;
}) {
  return useQuery<CompanyInfo>({
    queryKey: ['companyInfo', symbol],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v2/market-data/stocks/${symbol}/company`
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch company info');
      }
      
      return response.data.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 24 * 60 * 60 * 1000, // Consider stale after 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
    retry: 2,
  });
}

// Utility functions
export function formatMarketCap(marketCap: number | undefined): string {
  if (!marketCap) return '-';
  
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(2)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(2)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  }
  
  return `$${marketCap.toFixed(0)}`;
}

export function formatPE(pe: number | undefined): string {
  if (!pe || pe <= 0) return '-';
  return pe.toFixed(2);
}

export function formatDividendYield(yield: number | undefined): string {
  if (!yield || yield <= 0) return '-';
  return `${yield.toFixed(2)}%`;
}

export function formatBeta(beta: number | undefined): string {
  if (!beta) return '-';
  return beta.toFixed(2);
}