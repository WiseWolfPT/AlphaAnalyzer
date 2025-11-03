import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { ValuationMethod } from '@/components/stock/valuation-methods-chart';

/**
 * Base metric type for DCF calculations
 */
export type BasedOn = 'fcf' | 'ocf' | 'ni';

/**
 * Response from /api/iv/:ticker/chart endpoint (FASE 3)
 */
export interface ValuationChartResponse {
  ticker: string;
  price: number; // Current stock price
  as_of: string; // YYYY-MM-DD
  methods: ValuationMethod[]; // Array of all valuation methods
  available_methods?: string[]; // NEW (FASE 2): Dynamic list of available method IDs
  stock_classification?: 'growth' | 'value' | 'bank' | 'reit'; // NEW (FASE 2): Stock type
  recommended_method?: string; // Name of recommended method (e.g., "AlfaValue™")
  confidence?: 'HIGH' | 'MED' | 'LOW'; // Overall confidence
  metadata?: {
    calculation_time_ms: number;
    methods_count: number;
    categories: string[];
  };
}

/**
 * Options for useValuationChart hook
 */
export interface UseValuationChartOptions {
  basedOn?: BasedOn; // Base metric for DCF methods (default: 'fcf')
  excludeNRI?: boolean; // Exclude non-recurring items (default: false)
  enabled?: boolean; // Enable/disable query
  staleTime?: number; // Cache stale time (default: 1h)
  retry?: number; // Retry attempts (default: 3)
}

/**
 * Hook for fetching comprehensive valuation chart data
 *
 * Fetches all valuation methods (10+) for a given ticker, including:
 * - Proprietary: AlfaValue™
 * - DCF: Internal (FCF/OCF/NI), External (FMP benchmarks)
 * - Multiples: P/E, P/S, P/B (Mean and Median)
 * - Growth-Adjusted: PEG, PSG
 *
 * @param ticker - Stock symbol (e.g., 'AAPL')
 * @param options - Configuration options
 * @returns Query result with all valuation methods
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useValuationChart('AAPL', {
 *   basedOn: 'fcf',
 *   excludeNRI: false
 * });
 *
 * if (data) {
 *   console.log('Methods:', data.methods.length);
 *   console.log('Price:', data.price);
 *   console.log('Recommended:', data.recommended_method);
 * }
 * ```
 */
export function useValuationChart(
  ticker: string,
  options: UseValuationChartOptions = {}
) {
  const {
    basedOn = 'fcf',
    excludeNRI = false,
    enabled = true,
    staleTime = 60 * 60 * 1000, // 1 hour default
    retry = 3,
  } = options;

  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[useValuationChart] Hook called:', {
      ticker,
      basedOn,
      excludeNRI,
      enabled: enabled && !!ticker,
    });
  }

  return useQuery<ValuationChartResponse>({
    queryKey: queryKeys.valuationChart(ticker, basedOn, excludeNRI),
    queryFn: async () => {
      if (!ticker) {
        throw new Error('Ticker is required');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[useValuationChart] Fetching data for:', ticker);
      }

      // Build query parameters
      const params = new URLSearchParams({
        based_on: basedOn,
        exclude_nri: excludeNRI.toString(),
      });

      const response = await fetch(`/api/iv/${ticker}/chart?${params}`);

      if (!response.ok) {
        // Handle 422 ETF rejection with structured error data
        if (response.status === 422) {
          const errorData = await response.json();
          // Attach error data to the Error object so components can access it
          const error = new Error(errorData.message || 'ETF not supported') as any;
          error.statusCode = 422;
          error.errorData = errorData;
          throw error;
        }
        if (response.status === 404) {
          throw new Error(`Valuation chart data not available for ${ticker}`);
        }
        if (response.status === 400) {
          const error = await response.json();
          throw new Error(error.error || 'Invalid request parameters');
        }
        throw new Error(`Failed to fetch valuation chart: ${response.statusText}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === 'development') {
        console.log('[useValuationChart] Response received:', {
          ticker: data.ticker,
          methods_count: data.methods?.length,
          price: data.price,
        });
      }

      return data;
    },
    enabled: enabled && !!ticker,
    staleTime, // Data valid for configured duration
    gcTime: staleTime * 2, // Keep in cache 2x longer
    retry, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Utility function to filter methods by category
 */
export function filterMethodsByCategory(
  methods: ValuationMethod[],
  category: ValuationMethod['category']
): ValuationMethod[] {
  return methods.filter(m => m.category === category);
}

/**
 * Utility function to get best method (highest confidence)
 */
export function getBestMethod(methods: ValuationMethod[]): ValuationMethod | null {
  if (methods.length === 0) return null;

  const confidenceOrder = { HIGH: 3, MED: 2, LOW: 1 };

  return methods.reduce((best, current) => {
    const bestConf = confidenceOrder[best.confidence || 'LOW'];
    const currConf = confidenceOrder[current.confidence || 'LOW'];
    return currConf > bestConf ? current : best;
  });
}

/**
 * Utility function to calculate average intrinsic value
 */
export function getAverageIV(methods: ValuationMethod[]): number {
  if (methods.length === 0) return 0;
  const sum = methods.reduce((acc, m) => acc + m.iv, 0);
  return sum / methods.length;
}

/**
 * Utility function to get consensus status
 */
export function getConsensusStatus(
  methods: ValuationMethod[],
  currentPrice: number
): 'undervalued' | 'overvalued' | 'mixed' {
  if (methods.length === 0) return 'mixed';

  const undervalued = methods.filter(m => m.iv > currentPrice).length;
  const total = methods.length;
  const ratio = undervalued / total;

  if (ratio >= 0.7) return 'undervalued';
  if (ratio <= 0.3) return 'overvalued';
  return 'mixed';
}
