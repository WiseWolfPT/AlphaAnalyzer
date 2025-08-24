/**
 * Fetch with Retry Logic and Exponential Backoff
 * For resilient API calls with automatic retry on failure
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors and 5xx server errors
    if (error.name === 'NetworkError' || error.name === 'TypeError') {
      return true;
    }
    
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Retry on specific error messages
    const retryableMessages = [
      'network',
      'timeout',
      'fetch',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  },
  onRetry: (error, attempt, delay) => {
    console.warn(`[FetchWithRetry] Retry attempt ${attempt} after ${delay}ms:`, error.message);
  }
};

/**
 * Sleep utility for delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const calculateDelay = (
  attempt: number, 
  initialDelay: number, 
  maxDelay: number, 
  backoffFactor: number
): number => {
  const exponentialDelay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
  return Math.min(jitteredDelay, maxDelay);
};

/**
 * Enhanced fetch with retry logic and exponential backoff
 */
export async function fetchWithRetry<T = any>(
  url: string | URL,
  init?: RequestInit,
  options?: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is OK
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        
        // Try to get error details from response
        try {
          const errorData = await response.text();
          error.message = errorData || error.message;
        } catch {
          // Ignore parse errors
        }
        
        throw error;
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as any;
      }
      
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (attempt === config.maxRetries || !config.retryCondition(error, attempt)) {
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffFactor
      );
      
      // Call retry callback
      config.onRetry(error, attempt, delay);
      
      // Wait before next attempt
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Wrapper for API calls with automatic retry
 */
export class ResilientApiClient {
  private baseUrl: string;
  private defaultOptions: RetryOptions;
  
  constructor(baseUrl: string, defaultOptions?: RetryOptions) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions || {};
  }
  
  private getUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }
  
  async get<T>(endpoint: string, options?: RequestInit & { retry?: RetryOptions }): Promise<T> {
    const { retry, ...fetchOptions } = options || {};
    
    return fetchWithRetry<T>(
      this.getUrl(endpoint),
      {
        ...fetchOptions,
        method: 'GET'
      },
      { ...this.defaultOptions, ...retry }
    );
  }
  
  async post<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestInit & { retry?: RetryOptions }
  ): Promise<T> {
    const { retry, ...fetchOptions } = options || {};
    
    return fetchWithRetry<T>(
      this.getUrl(endpoint),
      {
        ...fetchOptions,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        },
        body: data ? JSON.stringify(data) : undefined
      },
      { ...this.defaultOptions, ...retry }
    );
  }
  
  async put<T>(
    endpoint: string, 
    data?: any, 
    options?: RequestInit & { retry?: RetryOptions }
  ): Promise<T> {
    const { retry, ...fetchOptions } = options || {};
    
    return fetchWithRetry<T>(
      this.getUrl(endpoint),
      {
        ...fetchOptions,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        },
        body: data ? JSON.stringify(data) : undefined
      },
      { ...this.defaultOptions, ...retry }
    );
  }
  
  async delete<T>(endpoint: string, options?: RequestInit & { retry?: RetryOptions }): Promise<T> {
    const { retry, ...fetchOptions } = options || {};
    
    return fetchWithRetry<T>(
      this.getUrl(endpoint),
      {
        ...fetchOptions,
        method: 'DELETE'
      },
      { ...this.defaultOptions, ...retry }
    );
  }
}

/**
 * React hook for fetch with retry
 */
import { useState, useCallback } from 'react';

export function useFetchWithRetry<T = any>(options?: RetryOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const execute = useCallback(async (url: string, init?: RequestInit) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchWithRetry<T>(url, init, options);
      setData(result);
      return result;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);
  
  return {
    execute,
    loading,
    error,
    data,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    }
  };
}

// Export singleton instance with default configuration
export const resilientApi = new ResilientApiClient(
  import.meta.env.VITE_API_BASE_URL || '/api',
  {
    maxRetries: 3,
    initialDelay: 1000,
    onRetry: (error, attempt, delay) => {
      console.log(`[API Retry] Attempt ${attempt} after ${delay}ms - Error: ${error.message}`);
    }
  }
);