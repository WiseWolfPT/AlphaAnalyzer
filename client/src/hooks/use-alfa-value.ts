import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Response from /api/iv/:ticker/main endpoint (FASE 1)
 */
export interface AlfaValueResponse {
  ticker: string;
  iv: number; // Intrinsic Value per share
  price: number; // Current price
  discount_pct: number; // (IV - Price) / Price * 100
  status: 'undervalued' | 'overvalued' | 'fair';
  assumptions: {
    g_1_5: number; // Growth rate years 1-5
    g_6_10: number; // Growth rate years 6-10
    g_11_20: number; // Growth rate years 11-20 (terminal)
    discount_rate: number; // WACC/DR
    rf: number; // Risk-free rate
    beta: number;
    mrp: number; // Market risk premium
  };
  inputs: {
    fcf_ttm_musd: number; // FCF TTM in millions USD
    fcf_5y_musd: number[]; // FCF 5-year history in millions USD
    cash_musd: number;
    debt_musd: number;
    shares_m: number; // Shares outstanding in millions
  };
  meta: {
    g_sector_mid: number;
    g_sector_source: 'dynamic' | 'sector' | 'static';
    g_term_region: number;
    region: string;
  };
  confidence: 'HIGH' | 'MED' | 'LOW';
  as_of: string; // YYYY-MM-DD
}

/**
 * Hook for fetching AlfaValue™ intrinsic value data
 *
 * @param ticker - Stock symbol (e.g., 'AAPL')
 * @returns Query result with AlfaValue data
 *
 * @example
 * const { data, isLoading, error } = useAlfaValue('AAPL');
 *
 * if (data) {
 *   console.log('IV:', data.iv);
 *   console.log('Status:', data.status);
 *   console.log('Discount:', data.discount_pct);
 * }
 */
export function useAlfaValue(ticker: string) {
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[useAlfaValue] Hook called:', { ticker, enabled: !!ticker });
  }

  return useQuery<AlfaValueResponse>({
    queryKey: queryKeys.alfaValueMain(ticker),
    queryFn: async () => {
      if (!ticker) {
        throw new Error('Ticker is required');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[useAlfaValue] Fetching data for:', ticker);
      }

      const response = await fetch(`/api/iv/${ticker}/main`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Intrinsic value data not available for ${ticker}`);
        }
        throw new Error(`Failed to fetch intrinsic value: ${response.statusText}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === 'development') {
        console.log('[useAlfaValue] Response received:', data);
      }

      return data;
    },
    enabled: !!ticker,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - intrinsic value changes rarely
    gcTime: 48 * 60 * 60 * 1000, // 48 hours - keep in cache longer
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Utility function to determine status badge color
 */
export function getStatusColor(status: AlfaValueResponse['status']) {
  switch (status) {
    case 'undervalued':
      return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'overvalued':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    case 'fair':
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  }
}

/**
 * Utility function to get status label
 */
export function getStatusLabel(status: AlfaValueResponse['status']): string {
  switch (status) {
    case 'undervalued':
      return 'Undervalued';
    case 'overvalued':
      return 'Overvalued';
    case 'fair':
      return 'Fairly Priced';
    default:
      return 'Unknown';
  }
}

/**
 * Utility function to get status icon
 */
export function getStatusIcon(status: AlfaValueResponse['status']): '▼' | '▲' | '=' {
  switch (status) {
    case 'undervalued':
      return '▼';
    case 'overvalued':
      return '▲';
    case 'fair':
      return '=';
    default:
      return '=';
  }
}
