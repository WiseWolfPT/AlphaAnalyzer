import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getMockApiData } from "./mock-api";
import { realAPI } from "./real-api";
import { enhancedFetch, environment, apiConfig } from "./api-config";

// Get authentication headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  return {};
}

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
  try {
    // Use enhanced fetch with retry logic and proper error handling
    const res = await enhancedFetch(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...getAuthHeaders(),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Log the error in development
    if (environment.debug) {
      console.error(`🔴 API Request failed: ${method} ${url}`, error);
    }
    throw error;
  }
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
      
      // FIXED: Always try real backend API first
      try {
        const fullURL = url.startsWith('/api') ? `${apiConfig.baseURL}${url}` : url;
        const res = await fetch(fullURL, {
          credentials: "include",
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });
        
        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Backend API success for:', url);
          return data;
        } else {
          console.warn('⚠️ Backend API failed, falling back to mock:', res.status, res.statusText);
        }
      } catch (fetchError) {
        console.warn('⚠️ Backend fetch failed, falling back to mock:', fetchError);
      }
      
      // FALLBACK: Use enhanced mock data with real API integration
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
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (not Infinity for real-time data)
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2, // Retry failed requests
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});
