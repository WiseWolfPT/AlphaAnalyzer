/**
 * @deprecated Use use-stock-queries.ts instead
 * This hook will be removed in FASE 3
 *
 * Legacy implementation using useState + useEffect pattern.
 * New code should use use-stock-queries.ts which provides:
 * - Automatic caching between navigations (prevents redundant API calls)
 * - Parallel request execution (faster initial load)
 * - Better error handling
 * - Automatic background refetching
 * - Query deduplication
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiConfig } from '@/lib/api-config';

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

export function useStockDetails(symbol: string) {
  const [data, setData] = useState<StockDetailsData>({
    profile: null,
    metrics: null,
    incomeStatements: [],
    news: [],
    historicalPrices: null,
    isLoading: true,
    error: null,
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (!symbol) return;

    const fetchStockDetails = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        // Prepare configured API key (optional for these endpoints, but harmless)
        const envApiKey = import.meta.env.VITE_MARKET_DATA_API_KEY;
        const metaApiKey = typeof document !== 'undefined'
          ? document.querySelector<HTMLMetaElement>('meta[name="market-data-api-key"]')?.getAttribute('content')
          : undefined;
        const fallbackApiKey = 'alfalyzer_demo_key_32_characters_minimum';
        const apiKey = envApiKey || metaApiKey || fallbackApiKey;

        const buildUrl = (path: string) => {
          const prefix = path.startsWith('/api') ? '' : '/api';
          const sep = path.includes('?') ? '&' : '?';
          return `${prefix}${path}${sep}api_key=${encodeURIComponent(apiKey)}`;
        };

        const fetchJson = async (path: string) => {
          try {
            const res = await fetch(buildUrl(path), {
              headers: { 'X-API-Key': apiKey, 'x-api-key': apiKey },
              credentials: 'include',
            });
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            return await res.json();
          } catch (err) {
            console.warn(`[StockDetails] Request failed for ${path}:`, err);
            return null;
          }
        };

        // Attempt cache-first endpoints (public, no auth) to avoid 401s in prod
        // Then resilient fallbacks to provider-backed routes if available
        const [profile, metricsData, incomeData, newsData, historicalData] = await Promise.all([
          // Profile: cache fundamentals (maps subset) → provider-backed → stocks route
          (async () => {
            const fundamentals = await fetchJson(`/cache/fundamentals/${symbol}`);
            if (fundamentals?.data) {
              const f = fundamentals.data;
              return {
                symbol,
                name: undefined,
                sector: undefined,
                industry: undefined,
                description: undefined,
                marketCap: f.marketCap ?? f.market_cap ?? 0,
                logo: '',
              } as Partial<StockProfile>;
            }
            return await fetchJson(`/market-data/profile/${symbol}`)
              || await fetchJson(`/market-data/fmp/profile/${symbol}`)
              || await fetchJson(`/stocks/${symbol}/profile`);
          })(),
          // Metrics: cache fundamentals → key-metrics → fmp proxy → stocks metrics
          (async () => {
            const fundamentals = await fetchJson(`/cache/fundamentals/${symbol}`);
            if (fundamentals?.data) {
              const f = fundamentals.data;
              return {
                peRatio: f.pe ?? f.peRatio ?? undefined,
                dividendYield: f.dividendYield ?? undefined,
                beta: f.beta ?? undefined,
                eps: f.eps ?? undefined,
                roe: f.roe ?? undefined,
                '52WeekLow': f.week52Low ?? f['52WeekLow'] ?? undefined,
                '52WeekHigh': f.week52High ?? f['52WeekHigh'] ?? undefined,
              } as StockMetrics;
            }
            return await fetchJson(`/market-data/key-metrics/${symbol}?period=quarter&limit=1`)
              || await fetchJson(`/market-data/fmp/key-metrics/${symbol}?period=quarter&limit=1`)
              || await fetchJson(`/stocks/${symbol}/metrics`);
          })(),
          // Income statements: cache-first → income-statement → fmp proxy → stocks financials
          (async () => {
            const fin = await fetchJson(`/cache/financials/${symbol}`);
            if (fin?.data) return fin;
            return await fetchJson(`/market-data/income-statement/${symbol}?period=quarter&limit=8`)
              || await fetchJson(`/market-data/fmp/income-statement/${symbol}?period=quarter&limit=8`)
              || await fetchJson(`/stocks/${symbol}/financials?period=quarterly`);
          })(),
          // News: provider-backed → fallback to empty list (no cache route yet)
          (async () => {
            return await fetchJson(`/market-data/news/${symbol}?limit=5`) 
              || { articles: [] };
          })(),
          // Historical: cache (1y) → provider-backed → fallback empty
          (async () => {
            return await fetchJson(`/cache/historical/${symbol}/1y`)
              || await fetchJson(`/market-data/historical-price-full/${symbol}`)
              || null;
          })(),
        ]);

        setData({
          profile: profile || null,
          metrics: metricsData?.data?.[0] || metricsData || metricsData?.data || null,
          incomeStatements: incomeData?.data || incomeData?.statements || incomeData?.income || [],
          news: newsData?.articles || newsData?.items || [],
          historicalPrices: historicalData?.data ? historicalData : historicalData || null,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        console.error('Error fetching stock details:', error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch stock details',
        }));
        // Only surface a toast if everything failed catastrophically
        toast({
          title: 'Partial data loaded',
          description: 'Some stock details may be missing temporarily.',
          variant: 'default',
        });
      }
    };

    fetchStockDetails();
  }, [symbol, toast]);

  return data;
}
