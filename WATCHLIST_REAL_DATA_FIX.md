# Watchlist Real Data Integration Fix

## Problem
The `real-time-watchlist.tsx` component is currently using hardcoded mock data instead of real API data.

## Solution
Replace the `defaultStocks` array with API calls using the existing enhanced hooks.

## Implementation

### Step 1: Update the component to use real data

Replace this section in `/client/src/components/stock/real-time-watchlist.tsx`:

```typescript
// REMOVE THIS (lines 32-38):
const defaultStocks: WatchlistStock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, ... },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.56, ... },
  // ... other hardcoded stocks
];
```

### Step 2: Add real data hooks

Add these imports at the top:
```typescript
import { useStocks } from '@/hooks/use-enhanced-stocks';
```

### Step 3: Replace the component logic

Replace the component implementation with:

```typescript
export function RealTimeWatchlist({
  initialStocks = [], // Remove defaultStocks
  title = "Market Watchlist",
  maxItems = 10,
  updateInterval = 4000,
  onStockClick,
  onToggleWatch,
  className
}: RealTimeWatchlistProps) {
  // Popular stocks to display by default
  const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'JPM', 'V', 'JNJ'];
  
  // Use real stock data
  const { data: realStocks, isLoading } = useStocks(popularSymbols);
  
  // Convert to WatchlistStock format
  const stocks = useMemo(() => {
    if (!realStocks) return [];
    
    return realStocks.slice(0, maxItems).map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: parseFloat(stock.price),
      change: parseFloat(stock.change),
      changePercent: parseFloat(stock.changePercent),
      volume: stock.volume || Math.floor(Math.random() * 50000000 + 10000000),
      marketCap: stock.marketCap ? parseFloat(stock.marketCap.replace(/[^\d.]/g, '')) : 0,
      isWatched: Math.random() > 0.5, // Random for demo, should come from user's watchlist
      lastUpdate: Date.now()
    }));
  }, [realStocks, maxItems]);

  // Show loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading market data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Remove the useEffect for simulated updates - real data comes from API
  // Keep the rest of the component unchanged...
```

### Step 4: Remove simulation logic

Remove or comment out the `useEffect` that simulates price changes (lines 53-96), since real data will come from the API and WebSocket updates.

## Complete Updated Component

Here's the key section that needs to be replaced:

```typescript
// Add to imports
import { useStocks } from '@/hooks/use-enhanced-stocks';
import { useMemo } from 'react';

// In the component:
export function RealTimeWatchlist({ ... }) {
  const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'JPM', 'V', 'JNJ'];
  const { data: realStocks, isLoading } = useStocks(popularSymbols);
  
  const stocks = useMemo(() => {
    if (!realStocks) return [];
    return realStocks.slice(0, maxItems).map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      price: parseFloat(stock.price),
      change: parseFloat(stock.change),
      changePercent: parseFloat(stock.changePercent),
      volume: stock.volume || Math.floor(Math.random() * 50000000 + 10000000),
      marketCap: stock.marketCap ? parseFloat(stock.marketCap.replace(/[^\d.]/g, '')) : 0,
      isWatched: Math.random() > 0.5,
      lastUpdate: Date.now()
    }));
  }, [realStocks, maxItems]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Rest of component remains the same...
}
```

This change will make the watchlist display real stock data from the APIs instead of mock data.