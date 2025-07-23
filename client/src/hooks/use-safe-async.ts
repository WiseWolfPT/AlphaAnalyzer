/**
 * Custom hooks for safe async operations with built-in error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { handleError } from '@/services/error-handler-service';
import { useNotificationStore } from '@/stores/notification-store';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Hook for safe async operations with error handling
 */
export function useSafeAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
  dependencies: any[] = []
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
    retry: () => {},
  });

  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  const execute = useCallback(async () => {
    if (!mountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await asyncFunction();
      
      if (mountedRef.current) {
        setState({
          data,
          loading: false,
          error: null,
          retry: () => {
            retryCountRef.current++;
            execute();
          },
        });
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (error) {
      if (mountedRef.current) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        setState({
          data: null,
          loading: false,
          error: errorObj,
          retry: () => {
            retryCountRef.current++;
            execute();
          },
        });

        // Handle error with appropriate severity based on retry count
        await handleError(errorObj, {
          context: 'Async Operation',
          severity: retryCountRef.current > 2 ? 'high' : 'medium',
          showNotification: retryCountRef.current > 0, // Only show notification on retry
          retry: retryCountRef.current < 3,
        });
      }
    }
  }, [asyncFunction, ...dependencies]);

  useEffect(() => {
    if (immediate) {
      execute();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [execute, immediate]);

  return state;
}

/**
 * Hook for manual async operations with error handling
 */
export function useSafeAsyncCallback<T, Args extends any[]>(
  asyncFunction: (...args: Args) => Promise<T>
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args) => {
      if (!mountedRef.current) return;

      setState({ data: null, loading: true, error: null });

      try {
        const data = await asyncFunction(...args);
        
        if (mountedRef.current) {
          setState({ data, loading: false, error: null });
        }
        
        return data;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        if (mountedRef.current) {
          setState({ data: null, loading: false, error: errorObj });
        }

        await handleError(errorObj, {
          context: 'Async Callback',
          showNotification: true,
        });

        throw errorObj;
      }
    },
    [asyncFunction]
  );

  return {
    execute,
    ...state,
  };
}

/**
 * Hook for fetching data with automatic retry and caching
 */
export function useSafeFetch<T>(
  url: string,
  options?: RequestInit,
  config?: {
    retry?: boolean;
    retryCount?: number;
    retryDelay?: number;
    cache?: boolean;
    cacheTime?: number;
    onError?: (error: Error) => void;
    transformResponse?: (data: any) => T;
  }
): AsyncState<T> & { refetch: () => void } {
  const [trigger, setTrigger] = useState(0);
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);

  const fetchData = useCallback(async () => {
    // Check cache first
    if (config?.cache && cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      if (cacheAge < (config.cacheTime || 5 * 60 * 1000)) {
        return cacheRef.current.data;
      }
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const transformedData = config?.transformResponse ? config.transformResponse(data) : data;

    // Update cache
    if (config?.cache) {
      cacheRef.current = {
        data: transformedData,
        timestamp: Date.now(),
      };
    }

    return transformedData;
  }, [url, options, config]);

  const asyncState = useSafeAsync(fetchData, true, [trigger]);

  // Custom error handling
  useEffect(() => {
    if (asyncState.error && config?.onError) {
      config.onError(asyncState.error);
    }
  }, [asyncState.error, config?.onError]);

  const refetch = useCallback(() => {
    setTrigger(prev => prev + 1);
  }, []);

  return {
    ...asyncState,
    refetch,
  };
}

/**
 * Hook for handling form submissions with error handling
 */
export function useSafeForm<T>(
  onSubmit: (data: T) => Promise<void>,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showSuccess, showError } = useNotificationStore.getState();

  const handleSubmit = useCallback(
    async (data: T) => {
      setSubmitting(true);
      setError(null);

      try {
        await onSubmit(data);
        
        if (options?.successMessage) {
          showSuccess('Success', options.successMessage);
        }
        
        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setError(errorObj);

        if (options?.errorMessage) {
          showError('Error', options.errorMessage);
        } else {
          showError('Form Error', errorObj.message);
        }

        if (options?.onError) {
          options.onError(errorObj);
        }

        await handleError(errorObj, {
          context: 'Form Submission',
          category: 'validation',
          showNotification: false, // We already showed a notification
        });
      } finally {
        setSubmitting(false);
      }
    },
    [onSubmit, options, showSuccess, showError]
  );

  return {
    handleSubmit,
    submitting,
    error,
  };
}

/**
 * Hook for polling data with error handling
 */
export function useSafePoll<T>(
  asyncFunction: () => Promise<T>,
  interval: number,
  options?: {
    enabled?: boolean;
    onError?: (error: Error) => void;
    maxErrors?: number;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const errorCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const poll = useCallback(async () => {
    try {
      const result = await asyncFunction();
      setData(result);
      setError(null);
      errorCountRef.current = 0; // Reset error count on success
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setError(errorObj);
      errorCountRef.current++;

      if (options?.onError) {
        options.onError(errorObj);
      }

      // Stop polling if max errors reached
      if (options?.maxErrors && errorCountRef.current >= options.maxErrors) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        await handleError(errorObj, {
          context: 'Polling',
          severity: 'high',
          showNotification: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, options]);

  useEffect(() => {
    if (options?.enabled !== false) {
      // Initial poll
      poll();

      // Set up interval
      intervalRef.current = setInterval(poll, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [poll, interval, options?.enabled]);

  return { data, loading, error };
}