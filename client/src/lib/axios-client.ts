// Axios Client with Vercel Header Workaround
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getAuthHeaderConfig, createAuthHeaders } from './auth-headers';

/**
 * Creates an axios instance with automatic auth header management
 * Handles Vercel's Authorization header bug by using X-Auth-Token in production
 */
export function createAxiosClient(baseURL?: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add the appropriate auth header
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
      
      if (token && config.headers) {
        const authConfig = getAuthHeaderConfig();
        config.headers[authConfig.headerName] = `Bearer ${token}`;
        
        console.log(`🔐 Axios: Using ${authConfig.headerName} header (${authConfig.environment})`);
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        console.error('🚫 Authentication error - clearing token');
        localStorage.removeItem('alfalyzer-token');
        localStorage.removeItem('auth-token');
        // Optionally redirect to login
        // window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Default axios client instance
 */
export const axiosClient = createAxiosClient();

/**
 * Helper function to make authenticated requests
 */
export async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('alfalyzer-token') || localStorage.getItem('auth-token');
  const headers = createAuthHeaders(token, options?.headers as Record<string, string>);
  
  return fetch(url, {
    ...options,
    headers,
  });
}