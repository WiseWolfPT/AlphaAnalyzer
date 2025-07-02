# Supabase Client Usage Guide

This guide explains how to use the Supabase clients in the Alfalyzer application.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Frontend Client Usage](#frontend-client-usage)
3. [Backend Admin Client Usage](#backend-admin-client-usage)
4. [Type Safety](#type-safety)
5. [Real-time Subscriptions](#real-time-subscriptions)
6. [Common Patterns](#common-patterns)

## Environment Setup

### Frontend Environment Variables
```bash
# .env (frontend)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend Environment Variables
```bash
# .env (backend)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Frontend Client Usage

### Authentication

```typescript
import { supabase, auth } from '@/lib/supabase';

// Sign up new user
const { data, error } = await auth.signUp('user@email.com', 'password', {
  full_name: 'John Doe'
});

// Sign in
const { data, error } = await auth.signIn('user@email.com', 'password');

// Sign out
await auth.signOut();

// Get current session
const { data: { session } } = await auth.getSession();

// Listen to auth changes
const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});
```

### Working with Watchlists

```typescript
import { db, helpers } from '@/lib/supabase';

// Get user's watchlists
const watchlists = await db.getUserWatchlists(userId);

// Create a new watchlist
const watchlist = await db.createWatchlist({
  user_id: userId,
  name: 'Tech Stocks',
  description: 'My favorite technology companies',
  is_default: false
});

// Add item to watchlist
const item = await db.addWatchlistItem({
  watchlist_id: watchlist.id,
  symbol: 'AAPL',
  notes: 'Watching for dip below $150',
  alert_price: 150.00
});

// Get watchlist items
const items = await db.getWatchlistItems(watchlist.id);

// Remove item from watchlist
await db.removeWatchlistItem(watchlist.id, 'AAPL');

// Get default watchlist
const defaultWatchlist = await helpers.getDefaultWatchlist(userId);
```

### Portfolio Management

```typescript
import { db, helpers } from '@/lib/supabase';

// Create portfolio
const portfolio = await db.createPortfolio({
  user_id: userId,
  name: 'Retirement Portfolio',
  description: 'Long-term investments',
  currency: 'USD',
  is_default: true
});

// Add transaction
const transaction = await db.createTransaction({
  portfolio_id: portfolio.id,
  symbol: 'MSFT',
  type: 'buy',
  quantity: 10,
  price: 350.50,
  fees: 9.99,
  date: '2025-06-29',
  notes: 'Initial position'
});

// Get portfolio holdings (automatically calculated)
const holdings = await db.getPortfolioHoldings(portfolio.id);

// Get portfolio performance history
const performance = await db.getPortfolioPerformance(portfolio.id, 90); // Last 90 days

// Calculate total portfolio value
const totalValue = await helpers.calculatePortfolioValue(portfolio.id);

// Record dividend
const dividend = await db.createDividend({
  portfolio_id: portfolio.id,
  symbol: 'MSFT',
  amount: 68.00,
  payment_date: '2025-06-15',
  ex_dividend_date: '2025-05-15',
  shares_owned: 10,
  amount_per_share: 0.68
});

// Add cash to portfolio
const cashDeposit = await db.createCashTransaction({
  portfolio_id: portfolio.id,
  type: 'deposit',
  amount: 5000,
  date: '2025-06-01',
  description: 'Monthly contribution'
});
```

## Backend Admin Client Usage

### Basic Setup

```typescript
import { supabaseAdmin, db, helpers } from '@/lib/supabase-admin';

// Admin client bypasses Row Level Security
// Use with caution - only for server-side operations
```

### User Management

```typescript
// Get user by ID
const user = await db.users.getById(userId);

// Get user by email
const user = await db.users.getByEmail('user@email.com');

// Create user
const newUser = await db.users.create('newuser@email.com');

// Update user
const updatedUser = await db.users.update(userId, {
  email: 'newemail@email.com'
});
```

### Subscription Management

```typescript
// Get user subscription
const subscription = await db.subscriptions.getByUserId(userId);

// Update subscription from Stripe webhook
const updatedSub = await db.subscriptions.upsert({
  user_id: userId,
  stripe_customer_id: 'cus_xxx',
  stripe_subscription_id: 'sub_xxx',
  stripe_price_id: 'price_xxx',
  status: 'active',
  current_period_start: '2025-06-01T00:00:00Z',
  current_period_end: '2025-07-01T00:00:00Z'
});

// Check if user has active subscription
const hasActiveSub = await helpers.hasActiveSubscription(userId);
```

### Portfolio Operations

```typescript
// Update holding prices in bulk
await db.portfolios.updateHoldingPrices([
  { id: holdingId1, current_price: 155.50 },
  { id: holdingId2, current_price: 380.25 }
]);

// Record daily portfolio performance
await db.portfolios.recordPerformance({
  portfolio_id: portfolioId,
  date: '2025-06-29',
  total_value: 25000,
  total_cost: 20000,
  cash_balance: 1000
});

// Refresh portfolio summary (materialized view)
await helpers.refreshPortfolioSummary();

// Force recalculation of holdings
await helpers.updatePortfolioHoldings(portfolioId);
```

## Type Safety

### Import Types

```typescript
import type {
  User,
  Watchlist,
  WatchlistItem,
  Portfolio,
  Transaction,
  Holding,
  Dividend,
  Subscription,
  InsertTransaction,
  UpdatePortfolio
} from '@/shared/types/database';

import { TransactionType, Currency, SubscriptionStatus } from '@/shared/types/enums';
```

### Type Guards

```typescript
import { isValidTransactionType, isValidCurrency } from '@/shared/types/enums';

// Validate transaction type
if (!isValidTransactionType(type)) {
  throw new Error('Invalid transaction type');
}

// Validate currency
if (!isValidCurrency(currency)) {
  throw new Error('Invalid currency');
}
```

## Real-time Subscriptions

### Frontend Real-time

```typescript
import { realtime } from '@/lib/supabase';

// Subscribe to watchlist changes
const watchlistChannel = realtime.subscribeToWatchlists(userId, (payload) => {
  console.log('Watchlist changed:', payload);
  // Update UI accordingly
});

// Subscribe to portfolio holdings updates
const holdingsChannel = realtime.subscribeToHoldings(portfolioId, (payload) => {
  console.log('Holdings updated:', payload);
  // Refresh holdings display
});

// Unsubscribe when done
realtime.unsubscribe(watchlistChannel);

// Or unsubscribe all
realtime.unsubscribeAll();
```

## Common Patterns

### Loading User Data on App Start

```typescript
import { helpers } from '@/lib/supabase';

// Get all user data in one call
const { user, watchlists, portfolios, subscription } = await helpers.getUserData(userId);

// Check subscription status
if (!subscription || subscription.status !== 'active') {
  // Show upgrade prompt
}
```

### Batch Operations

```typescript
// Get items for multiple watchlists
const watchlistIds = watchlists.map(w => w.id);
const itemsMap = await helpers.getMultipleWatchlistItems(watchlistIds);

// Access items for each watchlist
watchlists.forEach(watchlist => {
  const items = itemsMap.get(watchlist.id) || [];
  console.log(`${watchlist.name} has ${items.length} items`);
});
```

### Error Handling

```typescript
try {
  const portfolio = await db.createPortfolio({
    user_id: userId,
    name: 'New Portfolio'
  });
  
  if (!portfolio) {
    throw new Error('Failed to create portfolio');
  }
  
  // Success handling
} catch (error) {
  console.error('Error creating portfolio:', error);
  // Show user-friendly error message
}
```

### Using with React Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/supabase';

// Fetch watchlists
const { data: watchlists } = useQuery({
  queryKey: ['watchlists', userId],
  queryFn: () => db.getUserWatchlists(userId)
});

// Create watchlist mutation
const queryClient = useQueryClient();
const createWatchlistMutation = useMutation({
  mutationFn: (data: InsertWatchlist) => db.createWatchlist(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['watchlists', userId] });
  }
});
```

## Security Best Practices

1. **Never expose service role key to frontend** - It bypasses all Row Level Security
2. **Always validate user permissions** before performing sensitive operations
3. **Use Row Level Security policies** to protect data at the database level
4. **Sanitize user input** before storing in database
5. **Log security-sensitive operations** for audit trail

## Migration from Old Schema

If you're migrating from the old schema, here are the key changes:

1. `profiles` table → `users` table
2. `watchlist_stocks` → `watchlist_items`
3. `stock_alerts` → Not implemented in new schema (can be added if needed)
4. New tables: `holdings`, `dividends`, `portfolio_performance`, `cash_transactions`
5. Subscriptions now tracked in dedicated `subscriptions` table

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Ensure `.env` files are properly configured
   - Restart dev server after changing environment variables

2. **"Row Level Security violation"**
   - Check that user is authenticated
   - Verify RLS policies allow the operation
   - Use admin client for server-side operations

3. **"Holdings not updating after transaction"**
   - Database triggers should handle this automatically
   - Force update with `helpers.updatePortfolioHoldings(portfolioId)`

4. **Real-time not working**
   - Check that real-time is enabled in Supabase dashboard
   - Verify channel names and filters are correct
   - Check browser console for WebSocket errors