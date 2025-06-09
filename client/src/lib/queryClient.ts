import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getMockApiData } from "./mock-api";
import { realAPI } from "./real-api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Check if we're running in production/Vercel (no backend available)
const isProductionWithoutBackend = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('vercel.app') || 
         window.location.hostname.includes('netlify.app') ||
         (window.location.hostname === 'localhost' && window.location.port !== '3000');
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    try {
      console.log('🔄 Query for:', url);
      
      // Try real API first for stock data
      if (url === '/api/stocks') {
        console.log('📊 Fetching all stocks with real API enhancement');
        
        // Get mock data as base
        const mockData = getMockApiData(url);
        
        // Try to enhance first few stocks with real data
        const enhanced = await Promise.all(
          mockData.slice(0, 6).map(async (stock: any) => {
            try {
              const realData = await realAPI.getStockQuote(stock.symbol);
              return realData || stock;
            } catch {
              return stock;
            }
          })
        );
        
        // Combine enhanced data with remaining mock data
        return [...enhanced, ...mockData.slice(6)];
      }
      
      if (url.startsWith('/api/stocks/') && !url.includes('search')) {
        console.log('📈 Fetching individual stock data');
        
        const pathParts = url.split('/');
        const symbol = pathParts[pathParts.length - 1]?.toUpperCase();
        
        if (symbol) {
          // Try real API first
          const realData = await realAPI.getStockQuote(symbol);
          if (realData) {
            console.log('✅ Real API data found for', symbol);
            return realData;
          }
        }
        
        console.log('📦 Falling back to mock data for', symbol);
        const result = getMockApiData(url);
        if (!result) {
          throw new Error('Stock not found');
        }
        return result;
      }
      
      // For other endpoints, use mock data with slight delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = getMockApiData(url);
      console.log('📦 Mock data for:', url);
      
      if (result === null || result === undefined) {
        console.log('❌ No data found for URL:', url);
        if (url.includes('/api/stocks/') && !url.includes('search')) {
          throw new Error('Stock not found');
        }
      }
      
      return result;
    } catch (error) {
      console.error('❌ Query function error:', error);
      throw error;
    }

    // Commented out real API calls for now
    // const res = await fetch(url, {
    //   credentials: "include",
    // });
    // if (unauthorizedBehavior === "returnNull" && res.status === 401) {
    //   return null;
    // }
    // await throwIfResNotOk(res);
    // return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
