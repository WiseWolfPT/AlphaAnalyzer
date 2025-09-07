import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiConfig } from "./api-config";

// Get authentication headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Ensure market data requests include API key from build env
  const apiKey = import.meta.env.VITE_MARKET_DATA_API_KEY;
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  return headers;
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
    // Build full URL without duplicating /api prefix
    let fullURL: string;
    if (url.startsWith('http')) {
      fullURL = url;
    } else if (url.startsWith('/api')) {
      fullURL = url; // already absolute API path
    } else {
      fullURL = `${apiConfig.baseURL}${url}`;
    }
    
    const res = await fetch(fullURL, {
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
    console.error(`🔴 API Request failed: ${method} ${url}`, error);
    throw error;
  }
}


type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    try {
      console.log('🔄 Query for:', url);
      
      // Always try real backend API first
      try {
        const fullURL = url.startsWith('http')
          ? url
          : (url.startsWith('/api') ? url : `${apiConfig.baseURL}${url}`);
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
          console.warn('⚠️ Backend API failed:', res.status, res.statusText);
          // Don't fall back to mock - let the error bubble up
          throw new Error(`API request failed: ${res.status} ${res.statusText}`);
        }
      } catch (fetchError) {
        console.warn('⚠️ Backend fetch failed:', fetchError);
        throw fetchError;
      }
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
      gcTime: 10 * 60 * 1000, // 10 minutes (TanStack Query v5)
      retry: 2, // Retry failed requests
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});
