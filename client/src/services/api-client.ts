/**
 * Enhanced API Client with Coolify Cold Start Handling
 * Implements retry logic, error handling, and graceful cold start management
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { API_CONFIG, COLD_START_CONFIG } from '@/config/api';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  isColdStart?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  cached: boolean;
  expires_at?: string;
  provider?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private coldStartHandlers: Set<(isColdStart: boolean) => void> = new Set();
  private csrfToken: string | null = null;
  private csrfTokenPromise: Promise<string> | null = null;

  constructor() {
    // Use appropriate baseURL for each environment
    const baseURL = import.meta.env.DEV 
      ? 'http://localhost:3001' 
      : ''; // In production, use relative URLs (same origin)
    
    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
      withCredentials: true, // Enable cookies for CSRF
    });

    this.setupInterceptors();
    // Fetch CSRF token on initialization in production
    if (!import.meta.env.DEV) {
      this.fetchCsrfToken();
    }
  }

  private async fetchCsrfToken(): Promise<string> {
    // If we're already fetching, wait for that promise
    if (this.csrfTokenPromise) {
      return this.csrfTokenPromise;
    }

    // If we have a valid token, return it
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Start fetching
    this.csrfTokenPromise = this.client.get('/api/csrf-token')
      .then(response => {
        this.csrfToken = response.data.csrfToken;
        this.csrfTokenPromise = null;
        return this.csrfToken!;
      })
      .catch(error => {
        console.error('Failed to fetch CSRF token:', error);
        this.csrfTokenPromise = null;
        throw error;
      });

    return this.csrfTokenPromise;
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add API key for market data endpoints
        if (config.url?.includes('/market-data/')) {
          config.headers['X-API-Key'] = 'alfalyzer-mkt-2025-secure-key';
        }

        // Add CSRF token for state-changing requests in production
        if (!import.meta.env.DEV && 
            config.method && 
            ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase()) &&
            !config.url?.includes('/csrf-token')) {
          try {
            const csrfToken = await this.fetchCsrfToken();
            config.headers['X-CSRF-Token'] = csrfToken;
          } catch (error) {
            console.warn('Could not fetch CSRF token:', error);
            // Continue without CSRF token - server will reject if required
          }
        }

        // Add request timestamp for cold start detection
        config.metadata = { startTime: Date.now() };
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Calculate response time
        const startTime = response.config.metadata?.startTime || Date.now();
        const responseTime = Date.now() - startTime;
        
        // Check for cold start
        if (responseTime > COLD_START_CONFIG.threshold) {
          console.log(`🥶 Cold start detected: ${responseTime}ms response time`);
          this.notifyColdStartHandlers(true);
        } else {
          this.notifyColdStartHandlers(false);
        }
        
        // Log cache hits
        if (response.headers['x-cache-hit'] === 'true') {
          console.log(`✨ Cache HIT for ${response.config.url}`);
        }
        
        return response;
      },
      async (error: AxiosError) => {
        // Handle errors with retry logic
        return this.handleErrorWithRetry(error);
      }
    );
  }

  private async handleErrorWithRetry(error: AxiosError): Promise<any> {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number };
    
    if (!config) {
      return Promise.reject(this.formatError(error));
    }

    // Initialize retry count
    config._retryCount = config._retryCount || 0;

    // Check if we should retry
    if (this.shouldRetry(error) && config._retryCount < API_CONFIG.retry.attempts) {
      config._retryCount++;
      
      // Calculate retry delay with exponential backoff
      const delay = API_CONFIG.retry.delay * Math.pow(API_CONFIG.retry.backoffMultiplier, config._retryCount - 1);
      
      console.log(`🔄 Retrying request (attempt ${config._retryCount}/${API_CONFIG.retry.attempts}) after ${delay}ms`);
      
      // If it's a cold start, notify handlers
      if (this.isColdStartError(error)) {
        this.notifyColdStartHandlers(true);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return this.client.request(config);
    }

    // No more retries, reject with formatted error
    return Promise.reject(this.formatError(error));
  }

  private shouldRetry(error: AxiosError): boolean {
    // Don't retry client errors (4xx) except 401 (might be auth issue)
    if (error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 401) {
      return false;
    }

    // Retry network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || !error.response) {
      return true;
    }

    // Retry server errors (5xx)
    if (error.response && error.response.status >= 500) {
      return true;
    }

    return false;
  }

  private isColdStartError(error: AxiosError): boolean {
    // Check for timeout or no response (typical cold start symptoms)
    return error.code === 'ECONNABORTED' || 
           error.code === 'ETIMEDOUT' ||
           (!error.response && error.request);
  }

  private formatError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error
      const data = error.response.data as any;
      return {
        message: data?.message || data?.error || error.message,
        code: data?.code || error.code,
        status: error.response.status,
        isColdStart: false,
      };
    } else if (error.request) {
      // Request made but no response (possible cold start)
      return {
        message: COLD_START_CONFIG.message,
        code: 'COLD_START',
        isColdStart: true,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
        isColdStart: false,
      };
    }
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
  }

  private notifyColdStartHandlers(isColdStart: boolean) {
    this.coldStartHandlers.forEach(handler => handler(isColdStart));
  }

  // Public methods

  /**
   * Register a cold start handler
   */
  onColdStart(handler: (isColdStart: boolean) => void): () => void {
    this.coldStartHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.coldStartHandlers.delete(handler);
    };
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Health check with cold start detection
   */
  async checkHealth(): Promise<{
    status: string;
    timestamp: string;
    isColdStart: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.get<any>('/api/health');
      const responseTime = Date.now() - startTime;
      
      return {
        ...response,
        isColdStart: responseTime > COLD_START_CONFIG.threshold,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw {
        ...error,
        responseTime,
      };
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    localStorage.setItem('alfalyzer-token', token);
    localStorage.setItem('auth-token', token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    localStorage.removeItem('alfalyzer-token');
    localStorage.removeItem('auth-token');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { AxiosRequestConfig as RequestConfig };