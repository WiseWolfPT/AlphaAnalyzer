import { useQuery } from '@tanstack/react-query';
import { apiConfig } from '@/lib/api-config';

interface CompanyProfile {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  ceo: string;
  website: string;
  exchange: string;
  country: string;
  marketCap: number;
  employees: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  logo: string;
  beta?: number;
  lastDiv?: number;
  changes?: number;
  ipoDate?: string;
  phone?: string;
}

interface KeyMetrics {
  peRatio?: number;
  pegRatio?: number;
  priceToBookRatio?: number;
  priceToSalesRatio?: number;
  dividendYield?: number;
  eps?: number;
  roe?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  grossProfitMargin?: number;
  operatingProfitMargin?: number;
  netProfitMargin?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  freeCashFlowYield?: number;
}

async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  try {
    const baseUrl = apiConfig.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/stocks/${symbol}/profile`);
    
    if (!response.ok) {
      console.error('Failed to fetch company profile:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return null;
  }
}

async function fetchKeyMetrics(symbol: string): Promise<KeyMetrics | null> {
  try {
    const baseUrl = apiConfig.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/stocks/${symbol}/metrics`);
    
    if (!response.ok) {
      console.error('Failed to fetch key metrics:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching key metrics:', error);
    return null;
  }
}

export function useCompanyProfile(symbol: string) {
  return useQuery({
    queryKey: ['company-profile', symbol],
    queryFn: () => fetchCompanyProfile(symbol),
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    enabled: !!symbol,
    retry: 2
  });
}

export function useKeyMetrics(symbol: string) {
  return useQuery({
    queryKey: ['key-metrics', symbol],
    queryFn: () => fetchKeyMetrics(symbol),
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    enabled: !!symbol,
    retry: 2
  });
}

// Combined hook for both profile and metrics
export function useCompanyData(symbol: string) {
  const profileQuery = useCompanyProfile(symbol);
  const metricsQuery = useKeyMetrics(symbol);
  
  return {
    profile: profileQuery.data,
    metrics: metricsQuery.data,
    isLoading: profileQuery.isLoading || metricsQuery.isLoading,
    error: profileQuery.error || metricsQuery.error,
    refetch: () => {
      profileQuery.refetch();
      metricsQuery.refetch();
    }
  };
}