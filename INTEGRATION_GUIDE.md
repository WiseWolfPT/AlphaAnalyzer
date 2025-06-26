# Agent 4 - Code Patterns & Snippets Integration Guide

This guide demonstrates how to integrate the reusable patterns and templates created by Agent 4 into your existing components and future development.

## Files Created

1. **CODE_PATTERNS_AND_SNIPPETS.md** - Comprehensive patterns documentation
2. **client/src/types/financial-interfaces.ts** - Standardized TypeScript interfaces
3. **client/src/hooks/financial-hooks-templates.ts** - Reusable custom hooks
4. **client/src/components/templates/component-templates.tsx** - Component templates

## Quick Integration Examples

### 1. Upgrading Existing Components

#### Before (Inconsistent Pattern)
```typescript
// Old pattern - inconsistent error handling
function StockDetail({ symbol }: { symbol: string }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stocks/${symbol}`)
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error!</div>;
  
  return <div>{/* component content */}</div>;
}
```

#### After (Using New Patterns)
```typescript
// New pattern - consistent error handling and caching
import { useStockQuote } from '@/hooks/financial-hooks-templates';
import { LoadingState, ErrorDisplay } from '@/components/templates/component-templates';
import { StockDataErrorBoundary } from '@/components/error/ErrorBoundary';

function StockDetail({ symbol }: { symbol: string }) {
  const { data, loading, error } = useStockQuote(symbol, {
    autoRefresh: true,
    refreshInterval: 30000
  });

  if (loading) return <LoadingState message="Loading stock data..." />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <StockDataErrorBoundary>
      <div>{/* component content with data */}</div>
    </StockDataErrorBoundary>
  );
}
```

### 2. Creating New Components

#### Stock Card with Best Practices
```typescript
import { StockCard } from '@/components/templates/component-templates';
import { useStockData } from '@/hooks/financial-hooks-templates';

function WatchlistItem({ symbol }: { symbol: string }) {
  return (
    <StockCard
      symbol={symbol}
      onPerformanceClick={() => {
        // Navigate to performance page
        navigate(`/stock/${symbol}/performance`);
      }}
      onQuickInfoClick={() => {
        // Show quick info modal
        openQuickInfo(symbol);
      }}
      showMiniChart={true}
    />
  );
}
```

#### Financial Metrics Dashboard
```typescript
import { MetricsDashboard } from '@/components/templates/component-templates';
import { useSystemMetrics } from '@/hooks/financial-hooks-templates';

function AdminDashboard() {
  return (
    <MetricsDashboard
      timeRange="1h"
      autoRefresh={true}
      refreshInterval={30000}
    />
  );
}
```

### 3. API Integration with Tracking

#### Before (No Tracking)
```typescript
const fetchStockData = async (symbol: string) => {
  const response = await fetch(`/api/stocks/${symbol}`);
  return response.json();
};
```

#### After (With Metrics Tracking)
```typescript
import { trackAPICall } from '@/hooks/financial-hooks-templates';

const fetchStockData = async (symbol: string) => {
  return trackAPICall(
    'internal',
    `/stocks/${symbol}`,
    () => fetch(`/api/stocks/${symbol}`).then(res => res.json()),
    { symbol, dataType: 'quote' }
  );
};
```

### 4. Error Handling Integration

#### Component-Level Error Boundaries
```typescript
import { withStockDataErrorBoundary } from '@/components/error/ErrorBoundary';

// Wrap any stock-related component
const SafeStockChart = withStockDataErrorBoundary(StockChart);
const SafeStockDetails = withStockDataErrorBoundary(StockDetails);

// Use in your JSX
<SafeStockChart symbol="AAPL" />
<SafeStockDetails symbol="AAPL" />
```

#### Hook-Level Error Handling
```typescript
import { useStandardErrorHandler } from '@/hooks/financial-hooks-templates';

function MyComponent() {
  const errorHandler = useStandardErrorHandler();

  const handleApiCall = async () => {
    try {
      const data = await fetchSomeData();
      // Handle success
    } catch (error) {
      await errorHandler.handleError(error, {
        endpoint: '/some-endpoint',
        method: 'GET'
      });
    }
  };
}
```

## Integration Steps

### Step 1: Install Dependencies (if needed)
```bash
# If any new dependencies are required
npm install @tanstack/react-query lucide-react
```

### Step 2: Update Imports
```typescript
// Add these imports to your existing components
import { useFinancialData, useStockQuote } from '@/hooks/financial-hooks-templates';
import { LoadingState, ErrorDisplay, FinancialCard } from '@/components/templates/component-templates';
import type { StockData, ApiResult } from '@/types/financial-interfaces';
```

### Step 3: Replace Existing Patterns
```typescript
// Replace old loading states
// OLD: <div>Loading...</div>
// NEW: <LoadingState message="Loading..." />

// Replace old error handling
// OLD: {error && <div>Error occurred</div>}
// NEW: {error && <ErrorDisplay error={error} onRetry={retry} />}

// Replace old data fetching
// OLD: useEffect + fetch
// NEW: useFinancialData or useStockQuote
```

### Step 4: Add Error Boundaries
```typescript
// Wrap your main components
<StockDataErrorBoundary>
  <YourStockComponent />
</StockDataErrorBoundary>

<CalculationErrorBoundary>
  <YourCalculationComponent />
</CalculationErrorBoundary>
```

## Migration Checklist

### For Existing Components:
- [ ] Replace manual data fetching with `useFinancialData` hooks
- [ ] Replace loading states with `LoadingState` component
- [ ] Replace error handling with `ErrorDisplay` component
- [ ] Add appropriate error boundaries
- [ ] Update TypeScript interfaces to use standardized types
- [ ] Add API metrics tracking where applicable

### For New Components:
- [ ] Use component templates as starting points
- [ ] Follow the established component structure pattern
- [ ] Use standardized interfaces for props and data
- [ ] Implement proper error handling from the start
- [ ] Include loading states and error boundaries
- [ ] Add metrics tracking for API calls

### For API Integration:
- [ ] Wrap API calls with `trackAPICall` for metrics
- [ ] Use standardized error handling
- [ ] Implement proper retry logic
- [ ] Add caching where appropriate
- [ ] Follow the ApiResult<T> response pattern

## Best Practices Summary

### Component Structure
1. **Hooks first**: State, context, custom hooks, then effects
2. **Early returns**: Handle loading and error states first
3. **Event handlers**: Use useCallback for optimization
4. **Derived state**: Calculate values from props/state
5. **Main render**: Clean, readable JSX

### Error Handling
1. **Always provide user-friendly messages**
2. **Use appropriate error boundaries for different contexts**
3. **Include retry logic for recoverable errors**
4. **Log errors with sufficient context**
5. **Show loading states during retry attempts**

### Performance
1. **Use React Query for data fetching and caching**
2. **Implement proper memoization with useCallback/useMemo**
3. **Use skeleton loading for better UX**
4. **Track API metrics for monitoring**
5. **Implement auto-refresh for real-time data**

### TypeScript
1. **Use standardized interfaces from financial-interfaces.ts**
2. **Implement proper type guards for API responses**
3. **Use utility types for common patterns**
4. **Ensure all components have proper prop typing**
5. **Export types alongside components**

## Testing Integration

### Unit Tests
```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useStockQuote } from '@/hooks/financial-hooks-templates';

test('useStockQuote fetches data correctly', async () => {
  const { result, waitForNextUpdate } = renderHook(() => 
    useStockQuote('AAPL')
  );
  
  await waitForNextUpdate();
  
  expect(result.current.data).toBeDefined();
  expect(result.current.error).toBeNull();
});
```

### Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { StockCard } from '@/components/templates/component-templates';

test('StockCard displays stock information', () => {
  render(<StockCard symbol="AAPL" />);
  
  expect(screen.getByText('AAPL')).toBeInTheDocument();
  // Test loading state, error state, success state
});
```

## Monitoring and Metrics

### API Metrics Dashboard
The new patterns include built-in API metrics tracking. You can view:
- Total API calls and success rates
- Response times and performance metrics
- Error rates and types
- Cache hit rates
- Quota usage across providers

### Error Tracking
- All errors are automatically logged with context
- Error boundaries provide graceful fallbacks
- Retry logic is built into the patterns
- User-friendly error messages are displayed

## Future Development

### Adding New Components
1. Start with the component templates
2. Use the established hook patterns
3. Follow the TypeScript interface standards
4. Include proper error handling and loading states
5. Add metrics tracking for any API calls

### Extending Patterns
1. Add new hooks to financial-hooks-templates.ts
2. Create new component templates as needed
3. Update interfaces in financial-interfaces.ts
4. Document new patterns in CODE_PATTERNS_AND_SNIPPETS.md

This integration ensures consistency, reliability, and maintainability across the entire Alfalyzer application.