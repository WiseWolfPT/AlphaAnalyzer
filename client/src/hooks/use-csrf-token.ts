/**
 * CSRF Token Hook
 * Manages CSRF token fetching and refresh for secure API requests
 */

import { useState, useEffect, useCallback } from 'react';

// Helper to get API URL (consistent with other hooks)
const getApiUrl = () => (import.meta && import.meta.env && import.meta.env.DEV ? 'http://localhost:3001' : '');

interface CSRFTokenResponse {
  token: string;
  success: boolean;
}

export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const api = getApiUrl();
      const response = await fetch(`${api}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include' // Include cookies for session
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data: CSRFTokenResponse = await response.json();
      setToken(data.token);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(errorMessage);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch token on mount
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Refresh token function for when requests fail with 403
  const refreshToken = useCallback(async () => {
    await fetchToken();
  }, [fetchToken]);

  return {
    token,
    isLoading,
    error,
    refreshToken
  };
}

/**
 * Helper function to add CSRF token to fetch options
 */
export function addCSRFToken(token: string | null, options: RequestInit = {}): RequestInit {
  if (!token) return options;

  return {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token
    }
  };
}