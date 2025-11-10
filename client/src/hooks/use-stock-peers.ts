import { useQuery } from '@tanstack/react-query';

interface StockPeer {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number;
}

/**
 * Hook to fetch stock peers (companies in the same sector)
 *
 * @param symbol - Stock ticker symbol
 * @returns React Query result with peers data
 */
export function useStockPeers(symbol: string) {
  return useQuery<StockPeer[]>({
    queryKey: ['stock-peers', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market-data/stocks/${symbol}/peers`);
      if (!res.ok) throw new Error('Failed to fetch peers');
      return res.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h
    enabled: !!symbol,
  });
}
