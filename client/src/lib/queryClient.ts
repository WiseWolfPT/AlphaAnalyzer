import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getMockApiData } from "./mock-api";

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
      // Always use mock data for now (since we don't have backend deployed)
      console.log('Using mock data for:', url);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = getMockApiData(url);
      console.log('Mock data result:', result);
      
      // Only throw error if result is null/undefined, not for empty arrays or objects
      if (result === null || result === undefined) {
        console.log('No data found for URL:', url);
        if (url.includes('/api/stocks/') && !url.includes('search')) {
          throw new Error('Stock not found');
        }
      }
      
      return result;
    } catch (error) {
      console.error('Query function error:', error);
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
