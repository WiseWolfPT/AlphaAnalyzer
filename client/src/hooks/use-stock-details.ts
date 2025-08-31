import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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

        // Fetch all data in parallel
        const baseURL = import.meta.env.DEV ? 'http://localhost:3001' : '';
        const [
          profileRes,
          metricsRes,
          incomeRes,
          newsRes,
          historicalRes
        ] = await Promise.all([
          fetch(`${baseURL}/api/market-data/profile/${symbol}`),
          fetch(`${baseURL}/api/market-data/key-metrics/${symbol}?period=quarter&limit=1`),
          fetch(`${baseURL}/api/market-data/income-statement/${symbol}?period=quarter&limit=8`),
          fetch(`${baseURL}/api/market-data/news/${symbol}?limit=5`),
          fetch(`${baseURL}/api/market-data/historical-price-full/${symbol}`)
        ]);

        // Check for errors
        if (!profileRes.ok) throw new Error('Failed to fetch profile');
        if (!metricsRes.ok) throw new Error('Failed to fetch metrics');
        if (!incomeRes.ok) throw new Error('Failed to fetch financials');
        if (!newsRes.ok) throw new Error('Failed to fetch news');
        if (!historicalRes.ok) throw new Error('Failed to fetch historical prices');

        const [profile, metricsData, incomeData, newsData, historicalData] = await Promise.all([
          profileRes.json(),
          metricsRes.json(),
          incomeRes.json(),
          newsRes.json(),
          historicalRes.json()
        ]);

        setData({
          profile: profile || null,
          metrics: metricsData?.data?.[0] || null,
          incomeStatements: incomeData?.data || [],
          news: newsData?.articles || [],
          historicalPrices: historicalData || null,
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
        
        toast({
          title: 'Error',
          description: 'Failed to load stock details. Please try again.',
          variant: 'destructive',
        });
      }
    };

    fetchStockDetails();
  }, [symbol, toast]);

  return data;
}