# Code Patterns & Snippets Guide

This document provides reusable code patterns and standardized snippets for consistent development across the Alfalyzer financial application.

## Table of Contents
1. [API Data Fetching Patterns](#api-data-fetching-patterns)
2. [Error Handling Patterns](#error-handling-patterns)
3. [Loading State Patterns](#loading-state-patterns)
4. [TypeScript Interface Patterns](#typescript-interface-patterns)
5. [Real-time Update Patterns](#real-time-update-patterns)
6. [Component Structure Patterns](#component-structure-patterns)
7. [Utility Functions](#utility-functions)

---

## API Data Fetching Patterns

### 1. Standard React Query Hook Pattern

```typescript
// Pattern: useFinancialData
import { useQuery } from '@tanstack/react-query';
import { useErrorHandler } from '@/hooks/use-error-handler';

interface UseFinancialDataOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
}

export function useFinancialData<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: UseFinancialDataOptions = {}
) {
  const errorHandler = useErrorHandler({
    showToast: true,
    autoRecover: true,
    maxRetries: 3
  });

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
    staleTime: options.staleTime || 30000, // 30 seconds
    cacheTime: options.cacheTime || 300000, // 5 minutes
    refetchInterval: options.refetchInterval,
    enabled: options.enabled,
    retry: (failureCount, error) => {
      return failureCount < 3 && errorHandler.canRetry;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}
```

### 2. Stock Data Fetching Hook

```typescript
// Pattern: Stock-specific data fetching
export function useStockData(symbol: string, options: UseFinancialDataOptions = {}) {
  return useFinancialData(
    ['stock', symbol],
    () => stocksAPI.get('/quote', { symbol, dataType: 'quote' }),
    {
      staleTime: 30000,
      cacheTime: 300000,
      enabled: !!symbol,
      ...options
    }
  );
}

export function useStockProfile(symbol: string) {
  return useFinancialData(
    ['stock-profile', symbol],
    () => stocksAPI.get('/profile', { symbol, dataType: 'profile' }),
    {
      staleTime: 600000, // 10 minutes
      cacheTime: 1800000, // 30 minutes
      enabled: !!symbol
    }
  );
}
```

### 3. API Metrics Tracking Pattern

```typescript
// Pattern: Automatic API tracking wrapper
export async function trackAPICall<T>(
  provider: string,
  endpoint: string,
  apiCall: () => Promise<T>,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    symbol?: string;
    dataType?: string;
    cacheHit?: boolean;
  } = {}
): Promise<T> {
  return apiMetricsCollector.trackAPICall(provider, endpoint, apiCall, options);
}

// Usage example:
const fetchStockData = async (symbol: string) => {
  return trackAPICall(
    'finnhub',
    '/quote',
    () => fetch(`/api/stock/${symbol}/quote`).then(res => res.json()),
    { symbol, dataType: 'quote' }
  );
};
```

---

## Error Handling Patterns

### 1. Standard Error Handler Hook

```typescript
// Pattern: Consistent error handling
export function useStandardErrorHandler() {
  return useErrorHandler({
    showToast: true,
    logErrors: true,
    autoRecover: false,
    maxRetries: 3,
    onError: (error) => {
      console.error('Application error:', error);
      // Additional error tracking logic
    },
    onRecover: (result) => {
      if (result.success) {
        console.log('Successfully recovered from error');
      }
    }
  });
}
```

### 2. Error Boundary Wrapper Pattern

```typescript
// Pattern: Component-specific error boundaries
import { StockDataErrorBoundary, CalculationErrorBoundary, ChartErrorBoundary } from '@/components/error/ErrorBoundary';

export const withStockDataErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => (
    <StockDataErrorBoundary>
      <Component {...props} />
    </StockDataErrorBoundary>
  );
};

// Usage:
const SafeStockChart = withStockDataErrorBoundary(StockChart);
```

### 3. Try-Catch Pattern with Error Classification

```typescript
// Pattern: Standardized error handling in functions
async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  context: { endpoint: string; method: string; symbol?: string }
): Promise<{ data: T | null; error: FinancialError | null }> {
  try {
    const data = await apiCall();
    return { data, error: null };
  } catch (error) {
    const financialError = ErrorFactory.createAPIError(
      context.endpoint,
      context.method,
      error as Error
    );
    
    // Log error for monitoring
    errorHandler.handleError(financialError);
    
    return { data: null, error: financialError };
  }
}
```

---

## Loading State Patterns

### 1. Standard Loading Component

```typescript
// Pattern: Consistent loading states
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'pulse';
}

export function LoadingState({ 
  message = "Loading...", 
  size = 'md',
  variant = 'spinner' 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (variant === 'spinner') {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Activity className={`${sizeClasses[size]} animate-spin mx-auto mb-4`} />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  // Add skeleton and pulse variants as needed
  return null;
}
```

### 2. Data Loading Hook Pattern

```typescript
// Pattern: Combined loading, error, and data states
export function useLoadingState<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FinancialError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const financialError = ErrorFactory.createAPIError('unknown', 'GET', err as Error);
      setError(financialError);
      throw financialError;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { loading, error, data, execute, reset };
}
```

---

## TypeScript Interface Patterns

### 1. Standard Stock Data Interface

```typescript
// Pattern: Comprehensive stock data typing
export interface StockData {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  marketCap: string;
  volume?: string;
  sector?: string;
  industry?: string;
  eps?: string;
  peRatio?: string;
  logo?: string;
  intrinsicValue?: string;
  lastUpdated: Date;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface StockProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  employees?: number;
  description?: string;
  website?: string;
  logo?: string;
}
```

### 2. API Response Patterns

```typescript
// Pattern: Standardized API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Type guard for API responses
export function isApiError<T>(response: ApiResult<T>): response is ApiError {
  return !response.success && 'error' in response;
}
```

### 3. Component Props Patterns

```typescript
// Pattern: Reusable component prop interfaces
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface StockComponentProps extends BaseComponentProps {
  symbol: string;
  onError?: (error: FinancialError) => void;
  onLoading?: (loading: boolean) => void;
}

export interface ChartComponentProps extends StockComponentProps {
  height?: number;
  timeframe?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';
  showControls?: boolean;
}
```

---

## Real-time Update Patterns

### 1. Real-time Data Hook

```typescript
// Pattern: WebSocket/polling for real-time data
export function useRealTimeData<T>(
  endpoint: string,
  options: {
    interval?: number;
    enabled?: boolean;
    transform?: (data: any) => T;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(endpoint);
      const result = await response.json();
      const transformedData = options.transform ? options.transform(result) : result;
      
      setData(transformedData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Real-time data fetch error:', error);
    }
  }, [endpoint, options.transform]);

  useEffect(() => {
    if (!options.enabled) return;

    // Initial fetch
    fetchData();

    // Set up polling
    intervalRef.current = setInterval(fetchData, options.interval || 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, options.enabled, options.interval]);

  return { data, lastUpdate, refresh: fetchData };
}
```

### 2. Auto-refresh Component Pattern

```typescript
// Pattern: Component with auto-refresh capability
interface AutoRefreshProps {
  enabled: boolean;
  interval: number;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function AutoRefresh({ enabled, interval, onRefresh, children }: AutoRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = async () => {
      setIsRefreshing(true);
      try {
        await onRefresh();
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Auto-refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    const intervalId = setInterval(refresh, interval);
    return () => clearInterval(intervalId);
  }, [enabled, interval, onRefresh]);

  return (
    <div className="relative">
      {children}
      {isRefreshing && (
        <div className="absolute top-2 right-2">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
```

---

## Component Structure Patterns

### 1. Standard Financial Component Structure

```typescript
// Pattern: Consistent component organization
interface StockComponentProps {
  symbol: string;
  className?: string;
  onError?: (error: FinancialError) => void;
}

export function StockComponent({ symbol, className, onError }: StockComponentProps) {
  // 1. Hooks (in order: state, context, custom hooks, effects)
  const [localState, setLocalState] = useState();
  const { data, loading, error } = useStockData(symbol);
  const errorHandler = useStandardErrorHandler();

  // 2. Effects
  useEffect(() => {
    if (error) {
      onError?.(error);
      errorHandler.handleError(error);
    }
  }, [error, onError, errorHandler]);

  // 3. Event handlers
  const handleClick = useCallback(() => {
    // Handle click
  }, []);

  // 4. Derived state/computed values
  const isPositive = data ? parseFloat(data.changePercent) >= 0 : false;

  // 5. Early returns for loading/error states
  if (loading) return <LoadingState message="Loading stock data..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => {}} />;
  if (!data) return null;

  // 6. Main render
  return (
    <div className={cn("stock-component", className)}>
      {/* Component content */}
    </div>
  );
}
```

### 2. Card Component Pattern

```typescript
// Pattern: Consistent card-based components
interface FinancialCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: string | number;
  change?: number;
  loading?: boolean;
  error?: FinancialError | null;
  className?: string;
  onClick?: () => void;
}

export function FinancialCard({
  title,
  subtitle,
  icon: Icon,
  value,
  change,
  loading,
  error,
  className,
  onClick
}: FinancialCardProps) {
  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-6 border-red-200", className)}>
        <div className="text-red-600 text-sm">
          {error.userMessage || 'Error loading data'}
        </div>
      </Card>
    );
  }

  const isPositive = change ? change >= 0 : undefined;

  return (
    <Card 
      className={cn(
        "p-6 cursor-pointer hover:shadow-lg transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
          <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          )}
        </div>
        
        {change !== undefined && (
          <div className={cn(
            "text-sm font-medium",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

## Utility Functions

### 1. Data Formatting Utilities

```typescript
// Pattern: Consistent data formatting
export const formatCurrency = (value: number | string, currency = 'USD'): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(numValue);
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};
```

### 2. Validation Utilities

```typescript
// Pattern: Input validation functions
export const validateStockSymbol = (symbol: string): boolean => {
  return /^[A-Z]{1,5}$/.test(symbol.toUpperCase());
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePositiveNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
};
```

### 3. State Management Utilities

```typescript
// Pattern: Reusable state management hooks
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
```

---

## Usage Guidelines

### 1. Pattern Selection
- Use `useFinancialData` for all API data fetching
- Wrap components with appropriate error boundaries
- Always include loading and error states
- Use TypeScript interfaces for consistent data structures

### 2. Error Handling
- Use `useStandardErrorHandler` for consistent error handling
- Always provide user-friendly error messages
- Log errors with sufficient context for debugging
- Implement retry logic for recoverable errors

### 3. Performance
- Use React Query for caching and background updates
- Implement proper memoization for expensive calculations
- Use skeleton loading states for better UX
- Track API metrics for performance monitoring

### 4. Code Organization
- Follow the component structure pattern
- Group related functionality in custom hooks
- Use consistent naming conventions
- Document complex business logic

This pattern guide ensures consistency, maintainability, and reliability across the Alfalyzer financial application.