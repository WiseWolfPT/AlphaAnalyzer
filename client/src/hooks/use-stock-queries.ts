/**
 * Modern React Query-based Stock Details Hook
 * Replaces legacy use-stock-details.ts with proper caching and parallel queries
 *
 * Benefits:
 * - Automatic caching between navigations (prevents redundant API calls)
 * - Parallel request execution (faster initial load)
 * - Automatic background refetching (keeps data fresh)
 * - Built-in loading/error states
 * - Query deduplication (multiple components can safely use same query)
 */

import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';

// Types from legacy hook (preserved for compatibility)
interface StockProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  marketCap: number;
  logo: string;
  website?: string;
  ceo?: string;
  employees?: number;
  country?: string;
  exchange?: string;
  ipo?: string;
}

interface StockMetrics {
  peRatio?: number;
  pegRatio?: number;
  dividendYield?: number;
  beta?: number;
  eps?: number;
  roe?: number;
  bookValuePerShare?: number;
  priceToBookRatio?: number;
  '52WeekLow'?: number;
  '52WeekHigh'?: number;
}

interface IncomeStatement {
  date: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  ebitda: number;
  eps: number;
}

interface NewsArticle {
  title: string;
  text: string;
  url: string;
  publishedDate: string;
  site: string;
  image?: string;
}

interface StockDetailsData {
  profile: StockProfile | null;
  metrics: StockMetrics | null;
  incomeStatements: IncomeStatement[];
  news: NewsArticle[];
  historicalPrices: any;
  isLoading: boolean;
  error: string | null;
}

/**
 * Helper to build authenticated API URLs
 */
const buildAuthenticatedUrl = (path: string): string => {
  const apiKey = import.meta.env.VITE_MARKET_DATA_API_KEY || 'alfalyzer_demo_key_32_characters_minimum';

  const prefix = path.startsWith('/api') ? '' : '/api';
  const separator = path.includes('?') ? '&' : '?';
  return `${prefix}${path}${separator}api_key=${encodeURIComponent(apiKey)}`;
};

/**
 * Generic fetch function with error handling
 */
const fetchJson = async <T>(path: string): Promise<T | null> => {
  try {
    const url = buildAuthenticatedUrl(path);
    const apiKey = import.meta.env.VITE_MARKET_DATA_API_KEY || 'alfalyzer_demo_key_32_characters_minimum';

    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'x-api-key': apiKey,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[StockQueries] Request failed for ${path}:`, error);
    return null;
  }
};

/**
 * React Query-based Stock Details Hook
 *
 * Uses useQueries for parallel fetching with individual caching strategies
 * Each query has its own staleTime based on data volatility
 *
 * @param symbol - Stock ticker symbol
 * @returns Stock details data with loading/error states
 */
export function useStockDetails(symbol: string): StockDetailsData {
  const { toast } = useToast();

  // First, fetch fundamentals to check if we have the data
  const fundamentalsResult = useQueries({
    queries: [
      {
        queryKey: queryKeys.stockFundamentals(symbol),
        queryFn: async () => {
          return await fetchJson<any>(`/cache/fundamentals/${symbol}`)
            || await fetchJson<any>(`/market-data/fundamentals/${symbol}`)
            || await fetchJson<any>(`/market-data/fmp/profile/${symbol}`);
        },
        staleTime: 2 * 60 * 60 * 1000, // 2 hours - fundamentals update infrequently
        gcTime: 30 * 60 * 1000,
        retry: 2,
        enabled: !!symbol,
      },
    ],
  });

  const fundamentalsQuery = fundamentalsResult[0];
  const hasFundamentals = !!fundamentalsQuery.data?.data;

  // Define remaining queries with conditional fallbacks
  const queries = useQueries({
    queries: [
      // 1. Profile - ONLY fetch if fundamentals missing
      {
        queryKey: queryKeys.stockProfile(symbol),
        queryFn: async (): Promise<Partial<StockProfile> | null> => {
          // Fallback: fetch profile directly if fundamentals failed
          return await fetchJson<StockProfile>(`/market-data/profile/${symbol}`)
            || await fetchJson<StockProfile>(`/market-data/fmp/profile/${symbol}`)
            || await fetchJson<StockProfile>(`/stocks/${symbol}/profile`);
        },
        staleTime: 24 * 60 * 60 * 1000, // 24 hours - company info rarely changes
        gcTime: 30 * 60 * 1000,
        retry: 2,
        enabled: !!symbol && !hasFundamentals, // ✅ CONDITIONAL: Only if fundamentals missing
      },

      // 2. Metrics - ONLY fetch if fundamentals missing
      {
        queryKey: queryKeys.stockMetrics(symbol),
        queryFn: async (): Promise<StockMetrics | null> => {
          // Fallback: fetch metrics directly if fundamentals failed
          return await fetchJson<any>(`/market-data/key-metrics/${symbol}?period=quarter&limit=1`)
            || await fetchJson<any>(`/market-data/fmp/key-metrics/${symbol}?period=quarter&limit=1`)
            || await fetchJson<StockMetrics>(`/stocks/${symbol}/metrics`);
        },
        staleTime: 60 * 60 * 1000, // 1 hour
        gcTime: 30 * 60 * 1000,
        retry: 2,
        enabled: !!symbol && !hasFundamentals, // ✅ CONDITIONAL: Only if fundamentals missing
      },

      // 3. Income Statements - quarterly updates (2h cache)
      {
        queryKey: [...queryKeys.stock(symbol), 'income-statements'] as const,
        queryFn: async () => {
          const cached = await fetchJson<any>(`/cache/financials/${symbol}`);
          if (cached?.data) return cached;

          return await fetchJson<any>(`/market-data/income-statement/${symbol}?period=quarter&limit=8`)
            || await fetchJson<any>(`/market-data/fmp/income-statement/${symbol}?period=quarter&limit=8`)
            || await fetchJson<any>(`/stocks/${symbol}/financials?period=quarterly`);
        },
        staleTime: 2 * 60 * 60 * 1000, // 2 hours - financials update quarterly
        gcTime: 30 * 60 * 1000,
        retry: 2,
        enabled: !!symbol,
      },

      // 4. News - frequently updated (5min cache)
      {
        queryKey: queryKeys.stockNews(symbol),
        queryFn: async () => {
          return await fetchJson<any>(`/market-data/news/${symbol}?limit=5`)
            || { articles: [] };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - news updates frequently
        gcTime: 10 * 60 * 1000,
        retry: 2,
        enabled: !!symbol,
      },

      // 5. Historical Prices - moderate updates (30min cache)
      {
        queryKey: queryKeys.stockChart(symbol, { period: '1Y' }),
        queryFn: async () => {
          return await fetchJson<any>(`/cache/historical/${symbol}/1y`)
            || await fetchJson<any>(`/market-data/historical-price-full/${symbol}`)
            || null;
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
        gcTime: 30 * 60 * 1000,
        retry: 2,
        enabled: !!symbol,
      },
    ],
  });

  // Extract results (fundamentalsQuery already extracted above, other queries follow)
  const [profileQuery, metricsQuery, financialsQuery, newsQuery, historicalQuery] = queries;

  // Combine loading states - include fundamentalsQuery + other queries
  const allQueries = [fundamentalsQuery, ...queries];
  const isLoading = allQueries.some(q => q.isLoading);
  const isError = allQueries.some(q => q.isError);

  // Show toast only on catastrophic failure (all endpoints failed)
  const allFailed = allQueries.every(q => q.isError);
  if (allFailed && !isLoading) {
    toast({
      title: 'Partial data loaded',
      description: 'Some stock details may be missing temporarily.',
      variant: 'default',
    });
  }

  // Extract and normalize data (derive profile/metrics from fundamentals when available)
  const fundamentalsRaw = fundamentalsQuery.data;
  const metricsRaw = metricsQuery.data;
  const financialsRaw = financialsQuery.data;
  const newsRaw = newsQuery.data;
  const historicalRaw = historicalQuery.data;

  // Derive profile from fundamentals if available
  let profile: StockProfile | null = profileQuery.data as StockProfile | null;
  if (fundamentalsRaw?.data && !profile) {
    const f = fundamentalsRaw.data;
    profile = {
      symbol,
      name: f.companyName || f.name || symbol,
      sector: f.sector || '',
      industry: f.industry || '',
      description: f.description || '',
      marketCap: f.marketCap ?? f.market_cap ?? 0,
      logo: f.image || f.logo || '',
      website: f.website,
      ceo: f.ceo,
      employees: f.fullTimeEmployees || f.employees,
      country: f.country,
      exchange: f.exchangeShortName || f.exchange,
      ipo: f.ipoDate || f.ipo,
    };
  }

  // Derive metrics from fundamentals if available
  let metrics: StockMetrics | null = (metricsRaw?.data?.[0] || metricsRaw?.data || metricsRaw) as StockMetrics | null;
  if (fundamentalsRaw?.data && !metrics) {
    const f = fundamentalsRaw.data;
    metrics = {
      peRatio: f.pe ?? f.peRatio ?? undefined,
      dividendYield: f.dividendYield ?? undefined,
      beta: f.beta ?? undefined,
      eps: f.eps ?? undefined,
      roe: f.roe ?? undefined,
      '52WeekLow': f.week52Low ?? f['52WeekLow'] ?? undefined,
      '52WeekHigh': f.week52High ?? f['52WeekHigh'] ?? undefined,
    };
  }

  return {
    profile,
    metrics,
    incomeStatements: (financialsRaw?.data || financialsRaw?.statements || financialsRaw?.income || []) as IncomeStatement[],
    news: (newsRaw?.articles || newsRaw?.items || []) as NewsArticle[],
    historicalPrices: historicalRaw?.data ? historicalRaw : historicalRaw || null,
    isLoading,
    error: isError ? 'Failed to load some stock details' : null,
  };
}

/**
 * Extended query keys for stock details
 * Add these to query-keys.ts if not already present
 */
export const STOCK_QUERY_KEYS = {
  stockProfile: (symbol: string) => ['stocks', symbol, 'profile'] as const,
  stockMetrics: (symbol: string) => ['stocks', symbol, 'metrics'] as const,
  stockFinancials: (symbol: string) => ['stocks', symbol, 'financials'] as const,
};
