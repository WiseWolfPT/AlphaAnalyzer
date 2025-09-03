import { useQuery } from '@tanstack/react-query';

export interface ExtendedSessionData {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export interface ExtendedHoursResponse {
  preMarket?: ExtendedSessionData | null;
  afterHours?: ExtendedSessionData | null;
  isExtendedHours: boolean;
  currentSession: 'pre-market' | 'regular' | 'after-hours' | 'closed';
}

const getApiUrl = () => (import.meta.env.DEV ? 'http://localhost:3001' : '');

export function useExtendedHours(symbol: string) {
  return useQuery<ExtendedHoursResponse>({
    queryKey: ['extended-hours', symbol],
    queryFn: async () => {
      const api = getApiUrl();
      const res = await fetch(`${api}/api/market-data/extended-hours/${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`Extended hours fetch failed: ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });
}
