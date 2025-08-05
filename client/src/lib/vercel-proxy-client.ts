/**
 * Vercel Proxy Client Configuration
 * 
 * This module configures the API client to work with the Vercel proxy authentication
 */

// Check if we're running on Vercel
// In browser, we need to use import.meta.env instead of process.env
export const isVercelDeployment = typeof window !== 'undefined' 
  ? (import.meta.env.VERCEL === '1' || window.location.hostname.includes('vercel.app'))
  : (process.env.VERCEL === '1');

// Get proxy secret from environment
const PROXY_SECRET = typeof window !== 'undefined'
  ? (import.meta.env.VITE_VERCEL_PROXY_SECRET || import.meta.env.VERCEL_PROXY_SECRET)
  : (process.env.VERCEL_PROXY_SECRET || process.env.NEXT_PUBLIC_VERCEL_PROXY_SECRET);

/**
 * Add Vercel proxy headers to a request
 */
export function addVercelProxyHeaders(headers: HeadersInit = {}): HeadersInit {
  const newHeaders = new Headers(headers);
  
  // Add proxy secret if configured
  if (PROXY_SECRET && isVercelDeployment) {
    newHeaders.set('x-vercel-proxy-secret', PROXY_SECRET);
  }
  
  // Add custom headers to help backend identify proxy requests
  if (isVercelDeployment) {
    newHeaders.set('x-vercel-proxy', '1');
    newHeaders.set('x-vercel-edge', 'true');
  }
  
  return newHeaders;
}

/**
 * Create a fetch wrapper that automatically adds Vercel proxy headers
 */
export function createProxyFetch(baseUrl: string) {
  return async function proxyFetch(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${baseUrl}${endpoint}`;
    
    // Add proxy headers
    const headers = addVercelProxyHeaders(options.headers);
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Proxy fetch:', {
        url,
        isVercel: isVercelDeployment,
        hasSecret: !!PROXY_SECRET,
        headers: Object.fromEntries(headers.entries()),
      });
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      // Log response status in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📥 Proxy response:', {
          status: response.status,
          ok: response.ok,
          url: response.url,
        });
      }
      
      return response;
    } catch (error) {
      console.error('❌ Proxy fetch error:', error);
      throw error;
    }
  };
}

/**
 * API client configured for Vercel proxy
 */
export class VercelProxyAPIClient {
  private baseUrl: string;
  private fetch: ReturnType<typeof createProxyFetch>;
  
  constructor(baseUrl: string = '') {
    // CRITICAL: Always use relative paths to go through Vercel proxy
    // The proxy is configured in vercel.json to redirect /api/* to the Coolify backend
    this.baseUrl = baseUrl;
    this.fetch = createProxyFetch(baseUrl);
  }
  
  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.fetch(endpoint, {
      ...options,
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await this.fetch(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.fetch(endpoint, {
      ...options,
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Create default instance
export const proxyAPI = new VercelProxyAPIClient();

/**
 * React Hook for using the proxy API client
 */
export function useVercelProxyAPI() {
  return {
    api: proxyAPI,
    isVercel: isVercelDeployment,
    hasProxyAuth: isVercelDeployment && !!PROXY_SECRET,
  };
}

/**
 * Example usage in a React component:
 * 
 * ```tsx
 * import { useVercelProxyAPI } from '@/lib/vercel-proxy-client';
 * 
 * function MarketData({ symbol }: { symbol: string }) {
 *   const { api, isVercel } = useVercelProxyAPI();
 *   const [data, setData] = useState(null);
 *   
 *   useEffect(() => {
 *     api.get(`/api/market-data/${symbol}`)
 *       .then(setData)
 *       .catch(console.error);
 *   }, [symbol]);
 *   
 *   return (
 *     <div>
 *       {isVercel && <span>🚀 Running on Vercel</span>}
 *       {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
 *     </div>
 *   );
 * }
 * ```
 */