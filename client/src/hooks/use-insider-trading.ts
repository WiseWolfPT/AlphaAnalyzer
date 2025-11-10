import { useQuery } from '@tanstack/react-query';

export interface InsiderTrade {
  transactionDate: string;
  filingDate: string;
  transactionType: 'Buy' | 'Sell';
  securitiesOwned: number;
  securitiesTransacted: number;
  price: number;
  reportingName: string;
  typeOfOwner: string;
}

/**
 * Hook to fetch insider trading data for a stock
 *
 * @param symbol - Stock ticker symbol
 * @param limit - Number of trades to fetch (default: 50)
 * @returns React Query result with insider trades data
 */
export function useInsiderTrading(symbol: string, limit = 50) {
  return useQuery<InsiderTrade[]>({
    queryKey: ['insider-trading', symbol, limit],
    queryFn: async () => {
      const res = await fetch(`/api/insider-trading/${symbol}?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch insider trading');
      return res.json();
    },
    staleTime: 6 * 60 * 60 * 1000, // 6h
    enabled: !!symbol,
  });
}
