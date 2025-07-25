# 🚀 Alfalyzer Realtime System Guide

## Overview

The Alfalyzer platform now includes a comprehensive realtime quote system using Supabase Realtime. This allows users to see live price updates across all major pages without refreshing.

## Architecture

### Backend Flow
1. Market data is fetched from API providers (Alpha Vantage, Finnhub, etc.)
2. Data is cached in Supabase `cache.stock_quotes` table
3. Realtime updates are inserted into `public.realtime_quotes` table
4. Postgres changes trigger realtime events to subscribed clients

### Frontend Flow
1. Components use `useRealtimeQuote` hook to subscribe to updates
2. Supabase client listens to `postgres_changes` on `realtime_quotes` table
3. UI updates automatically when new quotes arrive
4. Visual indicators show realtime connection status

## Pages with Realtime Support

### 1. Find Stocks (`/find-stocks`)
- Toggle button in top-right to enable/disable realtime
- Green pulsing dot indicates active realtime connection
- Stock cards update prices automatically

### 2. Watchlists (`/watchlists`)
- Each watchlist has realtime toggle
- Prices and changes update for all stocks in watchlist
- Performance calculations update in real-time

### 3. Portfolios (`/portfolios`)
- Toggle per portfolio to enable realtime
- Holdings values and gains/losses update automatically
- Total portfolio value reflects current prices

### 4. Stock Charts (`/stock/:symbol/charts`)
- Realtime toggle in chart header
- Current price updates in header
- Chart data remains historical (not realtime)

### 5. Stock Detail (`/stock/:symbol`)
- Automatic realtime updates when available
- Price, change, and volume update in header

### 6. Compare (`/compare`)
- Global realtime toggle affects all comparison cards
- Intrinsic value calculations update with price changes

### 7. Intrinsic Value (`/intrinsic-value`)
- Realtime toggle for current price updates
- Valuation calculations automatically adjust
- Discount/premium percentages update dynamically

## Testing Realtime

### 1. Direct Database Test
```bash
# Test Supabase connection and inserts
npx tsx test-realtime-direct.ts
```

### 2. Complete Flow Test
```bash
# Simulate realtime quotes for testing
npx tsx test-complete-realtime-flow.ts
```

This will:
- Insert quotes every 3 seconds for AAPL, GOOGL, MSFT, TSLA
- Simulate realistic price movements
- Run for 2 minutes
- You should see prices updating in the browser

### 3. Backend Publishing Test
```bash
# Test backend realtime publishing
npx tsx test-realtime-publishing.ts
```

## Database Schema

### realtime_quotes table
```sql
CREATE TABLE public.realtime_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  change DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  volume BIGINT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.realtime_quotes ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Enable read access for all users" ON public.realtime_quotes
  FOR SELECT USING (true);
```

## Implementation Details

### Frontend Hook
```typescript
// Basic usage
const { quote, isConnected, error } = useRealtimeQuote('AAPL');

// With callback
const { quote, isConnected } = useRealtimeQuote('AAPL', (newQuote) => {
  console.log('Price updated:', newQuote.price);
});

// Multiple symbols
const { quotes, isConnected } = useRealtimeQuotes({
  symbols: ['AAPL', 'GOOGL', 'MSFT'],
  onUpdate: (quote) => {
    console.log(`${quote.symbol} updated to ${quote.price}`);
  }
});
```

### Visual Indicators
- **Green pulsing dot**: Active realtime connection
- **Toggle button**: Enable/disable realtime per page/component
- **Wifi icon**: Indicates realtime capability

## Performance Considerations

1. **Subscription Management**: Each component cleans up subscriptions on unmount
2. **Debouncing**: Price updates are immediate but UI updates are optimized
3. **Fallback**: When realtime is disabled, components show static data
4. **Error Handling**: Connection errors are caught and don't break the UI

## Troubleshooting

### No Updates Received
1. Check if realtime toggle is ON (green)
2. Verify Supabase connection in browser console
3. Check if `realtime_quotes` table has recent data
4. Ensure RLS policies allow read access

### Connection Issues
1. Check Supabase URL and anon key in `.env`
2. Verify internet connection
3. Check browser console for WebSocket errors
4. Try refreshing the page

### Performance Issues
1. Limit number of simultaneous subscriptions
2. Use single symbol hooks when possible
3. Disable realtime when not needed

## Future Enhancements

1. **Batch Updates**: Group multiple quotes in single event
2. **Compression**: Reduce data transfer for high-frequency updates
3. **Historical Playback**: Replay market sessions
4. **Custom Alerts**: Trigger notifications on price thresholds
5. **WebSocket Fallback**: Direct WebSocket connection for lower latency

## Backend Integration

To publish realtime quotes from the backend:

```typescript
// Using Supabase client
await supabase
  .from('realtime_quotes')
  .insert({
    symbol: 'AAPL',
    price: 195.42,
    change: 2.15,
    change_percent: 1.11,
    volume: 45678900,
    timestamp: new Date().toISOString()
  });
```

The insert automatically triggers realtime events to all subscribed clients.

## Security

- Read-only access for anonymous users
- Insert restricted to backend service role
- No sensitive data in realtime events
- Rate limiting on backend APIs

---

Created: July 24, 2025
Status: ✅ Fully Implemented and Tested