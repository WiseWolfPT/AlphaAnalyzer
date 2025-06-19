// React hooks for financial application error handling
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { ErrorFactory, errorHandler as globalErrorHandler } from '@/lib/error-handler';
import { stocksAPI, calculationAPI, userAPI } from '@/lib/enhanced-api';
import type { 
  FinancialError, 
  ErrorCategory, 
  ErrorSeverity, 
  RecoveryStrategy,
  ErrorRecoveryResult 
} from '@shared/error-types';
import { toast } from '@/hooks/use-toast';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logErrors?: boolean;
  autoRecover?: boolean;
  maxRetries?: number;
  onError?: (error: FinancialError) => void;
  onRecover?: (result: ErrorRecoveryResult) => void;
}

interface ErrorState {
  error: FinancialError | null;
  isRecovering: boolean;
  retryCount: number;
  lastRecoveryAttempt: Date | null;
}

// Main error handling hook
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRecovering: false,
    retryCount: 0,
    lastRecoveryAttempt: null
  });

  const {
    showToast = true,
    logErrors = true,
    autoRecover = false,
    maxRetries = 3,
    onError,
    onRecover
  } = options;

  const handleError = useCallback(async (
    error: any,
    context?: Record<string, any>,
    recoveryOperation?: () => Promise<any>
  ): Promise<ErrorRecoveryResult | null> => {
    let financialError: FinancialError;

    // Convert error to FinancialError if needed
    if (error instanceof Error) {
      financialError = ErrorFactory.createAPIError(
        context?.endpoint || 'unknown',
        context?.method || 'GET',
        error
      );
    } else if ('category' in error) {
      financialError = error as FinancialError;
    } else {
      financialError = {
        id: `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: String(error),
        userMessage: 'An unexpected error occurred',
        timestamp: new Date(),
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryable: true,
        complianceLog: false,
        context
      };
    }

    // Update error state
    setErrorState(prev => ({
      error: financialError,
      isRecovering: false,
      retryCount: prev.retryCount,
      lastRecoveryAttempt: null
    }));

    // Call error callback
    onError?.(financialError);

    // Handle the error through global handler
    let recoveryResult: ErrorRecoveryResult | null = null;
    if (recoveryOperation || autoRecover) {
      recoveryResult = await globalErrorHandler.handleError(financialError, recoveryOperation);
      onRecover?.(recoveryResult);
    }

    // Show toast if enabled
    if (showToast) {
      toast({
        title: getErrorTitle(financialError.severity),
        description: financialError.userMessage,
        variant: getToastVariant(financialError.severity)
      });
    }

    return recoveryResult;
  }, [showToast, autoRecover, onError, onRecover]);

  const retry = useCallback(async (recoveryOperation?: () => Promise<any>) => {
    if (!errorState.error || errorState.retryCount >= maxRetries) return null;

    setErrorState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1,
      lastRecoveryAttempt: new Date()
    }));

    try {
      const result = await globalErrorHandler.handleError(errorState.error, recoveryOperation);
      
      if (result.success) {
        setErrorState({
          error: null,
          isRecovering: false,
          retryCount: 0,
          lastRecoveryAttempt: null
        });
      } else {
        setErrorState(prev => ({
          ...prev,
          isRecovering: false,
          error: result.error || prev.error
        }));
      }

      return result;
    } catch (error) {
      setErrorState(prev => ({
        ...prev,
        isRecovering: false
      }));
      return null;
    }
  }, [errorState.error, errorState.retryCount, maxRetries]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRecovering: false,
      retryCount: 0,
      lastRecoveryAttempt: null
    });
  }, []);

  return {
    ...errorState,
    handleError,
    retry,
    clearError,
    canRetry: errorState.error?.retryable && errorState.retryCount < maxRetries
  };
}

// Hook for handling API calls with error recovery
export function useFinancialAPI<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: UseQueryOptions<T> & UseErrorHandlerOptions = {}
) {
  const errorHandler = useErrorHandler(options);
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (error) {
        const result = await errorHandler.handleError(error, {
          endpoint: queryKey.join('/'),
          method: 'GET'
        }, queryFn);
        
        if (result?.success && result.data) {
          return result.data;
        }
        
        throw error;
      }
    },
    retry: (failureCount, error) => {
      return failureCount < (options.maxRetries || 3) && 
             errorHandler.canRetry;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}

// Hook for stock data with enhanced error handling
export function useStockData(symbol: string, options: UseErrorHandlerOptions = {}) {
  return useFinancialAPI(
    ['stock', symbol],
    () => stocksAPI.get(`/quote`, { symbol, dataType: 'quote' }),
    {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      ...options
    }
  );
}

// Hook for stock profile with fallback
export function useStockProfile(symbol: string, options: UseErrorHandlerOptions = {}) {
  return useFinancialAPI(
    ['stock-profile', symbol],
    () => stocksAPI.get(`/profile`, { symbol, dataType: 'profile' }),
    {
      staleTime: 600000, // 10 minutes
      cacheTime: 1800000, // 30 minutes
      ...options
    }
  );
}

// Hook for calculations with validation
export function useCalculation<T>(
  calculationType: string,
  inputs: Record<string, any>,
  options: UseErrorHandlerOptions = {}
) {
  const errorHandler = useErrorHandler(options);
  
  return useMutation({
    mutationFn: async () => {
      try {
        // Validate inputs before calculation
        validateCalculationInputs(calculationType, inputs);
        
        const result = await calculationAPI.post('/api/intrinsic-values/calculate', inputs);
        return result.data;
      } catch (error) {
        const calculationError = ErrorFactory.createCalculationError(
          calculationType,
          inputs,
          error as Error
        );
        
        const recovery = await errorHandler.handleError(calculationError);
        if (recovery?.success && recovery.data) {
          return recovery.data;
        }
        
        throw calculationError;
      }
    },
    ...options
  });
}

// Hook for monitoring error rates and metrics
export function useErrorMetrics() {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const updateMetrics = () => {
      const errorMetrics = globalErrorHandler.getMetrics();
      setMetrics(errorMetrics);
    };

    // Update immediately and then every 30 seconds
    updateMetrics();
    intervalRef.current = setInterval(updateMetrics, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const clearMetrics = useCallback(() => {
    globalErrorHandler.clearMetrics();
    setMetrics({});
  }, []);

  return { metrics, clearMetrics };
}

// Hook for circuit breaker status
export function useCircuitBreakerStatus() {
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateStatus = () => {
      // This would need to be implemented in the circuit breaker
      // For now, we'll simulate it
      setStatus({
        stockAPI: 'closed',
        calculationAPI: 'closed',
        userAPI: 'closed'
      });
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

// Hook for graceful degradation
export function useGracefulDegradation() {
  const [degradationLevel, setDegradationLevel] = useState<'none' | 'partial' | 'full'>('none');
  const errorMetrics = useErrorMetrics();

  useEffect(() => {
    const metrics = errorMetrics.metrics;
    const totalErrors = Object.values(metrics).reduce((sum, count) => sum + count, 0);
    
    if (totalErrors > 50) {
      setDegradationLevel('full');
    } else if (totalErrors > 20) {
      setDegradationLevel('partial');
    } else {
      setDegradationLevel('none');
    }
  }, [errorMetrics.metrics]);

  return {
    degradationLevel,
    isPartiallyDegraded: degradationLevel === 'partial',
    isFullyDegraded: degradationLevel === 'full',
    isOperational: degradationLevel === 'none'
  };
}

// Utility functions
function validateCalculationInputs(type: string, inputs: Record<string, any>): void {
  switch (type) {
    case 'intrinsic_value':
      if (!inputs.eps || inputs.eps <= 0) {
        throw new Error('EPS must be a positive number');
      }
      if (inputs.growthRate && (inputs.growthRate < -100 || inputs.growthRate > 100)) {
        throw new Error('Growth rate must be between -100% and 100%');
      }
      break;
    default:
      // Add other validation rules as needed
      break;
  }
}

function getErrorTitle(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.LOW: return 'Notice';
    case ErrorSeverity.MEDIUM: return 'Warning';
    case ErrorSeverity.HIGH: return 'Error';
    case ErrorSeverity.CRITICAL: return 'Critical Error';
    default: return 'Error';
  }
}

function getToastVariant(severity: ErrorSeverity): 'default' | 'destructive' {
  return [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(severity) 
    ? 'destructive' 
    : 'default';
}