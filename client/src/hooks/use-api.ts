import { useState, useCallback } from 'react';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Custom hook for making API calls with httpOnly cookie authentication
 * Always includes credentials for cookie-based auth
 */
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Fetch with authentication cookies
   * Automatically handles token expiry and refresh
   */
  const fetchWithAuth = useCallback(async <T = any>(
    url: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // CRITICAL: Always include cookies
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      // Handle token expiry
      if (response.status === 401) {
        const data = await response.json();
        
        if (data.code === 'TOKEN_EXPIRED') {
          // Try to refresh token
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (refreshResponse.ok) {
            // Retry original request with new token
            const retryResponse = await fetch(url, {
              ...options,
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              }
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              return { data: retryData, error: null, loading: false };
            }
          } else {
            // Refresh failed, redirect to login
            window.location.href = '/login';
            return { data: null, error: 'Session expired', loading: false };
          }
        }
        
        return { data: null, error: data.error || 'Unauthorized', loading: false };
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || errorData?.message || `Error: ${response.status}`;
        setError(errorMessage);
        return { data: null, error: errorMessage, loading: false };
      }
      
      const data = await response.json();
      setLoading(false);
      return { data, error: null, loading: false };
      
    } catch (err: any) {
      const errorMessage = err.message || 'Network error';
      setError(errorMessage);
      setLoading(false);
      return { data: null, error: errorMessage, loading: false };
    }
  }, []);
  
  /**
   * GET request
   */
  const get = useCallback(async <T = any>(url: string): Promise<ApiResponse<T>> => {
    return fetchWithAuth<T>(url, { method: 'GET' });
  }, [fetchWithAuth]);
  
  /**
   * POST request
   */
  const post = useCallback(async <T = any>(
    url: string,
    body?: any
  ): Promise<ApiResponse<T>> => {
    return fetchWithAuth<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }, [fetchWithAuth]);
  
  /**
   * PUT request
   */
  const put = useCallback(async <T = any>(
    url: string,
    body?: any
  ): Promise<ApiResponse<T>> => {
    return fetchWithAuth<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }, [fetchWithAuth]);
  
  /**
   * DELETE request
   */
  const del = useCallback(async <T = any>(url: string): Promise<ApiResponse<T>> => {
    return fetchWithAuth<T>(url, { method: 'DELETE' });
  }, [fetchWithAuth]);
  
  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async () => {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return { isAuthenticated: true, user: data.data || data.user || data };
    }
    
    return { isAuthenticated: false, user: null };
  }, []);
  
  /**
   * Logout
   */
  const logout = useCallback(async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      window.location.href = '/login';
    }
  }, []);
  
  return {
    loading,
    error,
    fetchWithAuth,
    get,
    post,
    put,
    delete: del,
    checkAuth,
    logout
  };
};

/**
 * Standalone function for making authenticated API calls
 * Useful when you don't need the hook's state management
 */
export const apiCall = async <T = any>(
  url: string,
  options: ApiOptions = {}
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    const data = await response.json();
    
    if (data.code === 'TOKEN_EXPIRED') {
      // Try to refresh
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (refreshResponse.ok) {
        // Retry original request
        const retryResponse = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (retryResponse.ok) {
          return retryResponse.json();
        }
      }
      
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    
    throw new Error(data.error || 'Unauthorized');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || errorData?.message || `Error: ${response.status}`);
  }
  
  return response.json();
};

export default useApi;