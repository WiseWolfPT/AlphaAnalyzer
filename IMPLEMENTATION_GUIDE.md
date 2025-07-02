# 🚀 ALFALYZER IMPLEMENTATION GUIDE

**Last Updated**: 2025-06-28  
**Purpose**: Comprehensive guide for Claude (Opus/Sonnet) to implement Alfalyzer features efficiently

## 📋 PROJECT OVERVIEW

Alfalyzer is a financial analytics platform similar to Qualtrim, focused on providing real-time market data, advanced charts, and investment insights. Currently, the UI is built but most features use mock data.

### Current Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (to be migrated to Supabase)
- **APIs**: Alpha Vantage, Yahoo Finance, Polygon (configured but not connected)
- **State**: React Query + Context API
- **Routing**: Wouter (not React Router!)

## 🎯 CRITICAL IMPLEMENTATION NOTES

### 1. **ALWAYS CHECK BEFORE IMPLEMENTING**
```bash
# Check if component/feature already exists
grep -r "ComponentName" client/src/
# Check existing API structure
ls server/services/
# Check for mock data that needs replacing
grep -r "mock" client/src/
```

### 2. **ROUTING - USE WOUTER**
```typescript
// ❌ WRONG - Don't use React Router
import { useNavigate } from 'react-router-dom';

// ✅ CORRECT - Use Wouter
import { useLocation, useRoute } from 'wouter';
const [location, navigate] = useLocation();
```

### 3. **AUTH CONTEXT**
```typescript
// Current auth system
import { useAuth } from '@/contexts/simple-auth-offline';
// Will be migrated to Supabase Auth
```

### 4. **API STRUCTURE**
```typescript
// Frontend API calls go through services
client/src/services/
├── alpha-vantage.ts      // Stock data
├── finnhub.ts           // Alternative data
├── real-data-integration.ts  // Unified API layer
```

## 📦 IMPLEMENTATION PHASES

### PHASE 1: BACKEND & DATABASE (Priority: CRITICAL)

#### 1.1 Supabase Setup
```sql
-- Required tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
```

#### 1.2 Environment Variables

```bash
# SECURITY NOTICE
# -----------------------------------------------------------------
# Variables WITHOUT VITE_ prefix stay on the server (secure)
# Variables WITH VITE_ prefix are exposed in client-side JavaScript
#
# 1. .env (backend only - NEVER commit this)
#    SUPABASE_SERVICE_KEY=...
#    ALPHA_VANTAGE_API_KEY=...
#    TWELVE_DATA_API_KEY=...
#    FMP_API_KEY=...
#    FINNHUB_API_KEY=...
#    POLYGON_API_KEY=...
#    STRIPE_SECRET_KEY=...
#    STRIPE_WEBHOOK_SECRET=...
#
# 2. .env.public (frontend build - safe to expose)
#    VITE_SUPABASE_URL=...
#    VITE_SUPABASE_ANON_KEY=...
# -----------------------------------------------------------------
```

#### 1.3 Row Level Security Policies
```sql
-- CRITICAL: Add these policies after enabling RLS

-- Watchlists policies
CREATE POLICY "Users can read own watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watchlists" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- Portfolios policies
CREATE POLICY "Users can read own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );
```

#### 1.4 Subscriptions Table for Stripe
```sql
-- Subscriptions table for Stripe integration
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscription policies
CREATE POLICY "Users can read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

### PHASE 2: DATA INTEGRATION (Priority: HIGH)

#### 2.1 USE EXISTING CONFIGURED APIs
```typescript
// YOU ALREADY HAVE 4 APIs CONFIGURED - USE THEM!

// 1. TWELVE DATA (800 calls/day) - For real-time prices
const priceData = await twelveDataService.getQuote(symbol);
const historicalData = await twelveDataService.getTimeSeries(symbol);

// 2. FINANCIAL MODELING PREP (250 calls/day) - For fundamentals
const companyProfile = await fmpService.getCompanyProfile(symbol);
const financialStatements = await fmpService.getFinancialStatements(symbol);

// 3. FINNHUB (60 calls/min) - Fast backup for prices
const quote = await finnhubService.getQuote(symbol);
const companyNews = await finnhubService.getCompanyNews(symbol);

// 4. ALPHA VANTAGE (25 calls/day) - Deep fundamentals when needed
const incomeStatement = await alphaVantageService.getIncomeStatement(symbol);
const balanceSheet = await alphaVantageService.getBalanceSheet(symbol);
```

#### 2.2 Optimized API Usage Strategy (BACKEND ONLY)
```typescript
// IMPORTANT: This runs on Express backend, NOT in React!
// Frontend calls backend endpoints which then call external APIs

// server/services/unified-api-service.ts
export class UnifiedAPIService {
  constructor(
    private twelveData: TwelveDataService,
    private fmp: FMPService,
    private finnhub: FinnhubService,
    private alphaVantage: AlphaVantageService,
    private apiMonitor: APIMonitorService
  ) {}

  async getStockData(symbol: string, dataType: string) {
    // Log API usage for monitoring
    this.apiMonitor.trackRequest(dataType);
    
    try {
      switch(dataType) {
        case 'REAL_TIME_PRICE':
          // Use Twelve Data (800/day) or Finnhub (3600/hour)
          return await this.twelveData.getQuote(symbol);
          
        case 'FUNDAMENTALS':
          // Use FMP (250/day) with 24h cache
          return await this.fmp.getFundamentals(symbol);
          
        case 'HISTORICAL':
          // Use Twelve Data for charts
          return await this.twelveData.getTimeSeries(symbol);
          
        case 'DEEP_FINANCIALS':
          // Use Alpha Vantage (25/day) only when necessary
          return await this.alphaVantage.getFinancials(symbol);
      }
    } catch (error) {
      // Log error and try backup API
      this.apiMonitor.trackError(dataType, error);
      return this.fallbackToBackupAPI(symbol, dataType);
    }
  }
}

// API Flow Diagram:
// Frontend (React) → Backend (Express) → External APIs
// ┌────────┐  fetch   ┌───────────────┐  api_key  ┌───────────────┐
// │ React  │ ───────▶ │ /api/stock    │ ────────▶ │ TwelveData... │
// └────────┘          └───────────────┘            └───────────────┘
```

#### 2.3 Cache Strategy
```typescript
// Respect the cache times from API_INTEGRATION.md
const CACHE_DURATION = {
  price: 60,              // 1 minute (as configured)
  fundamentals: 86400,    // 24 hours (as configured)
  historical: 3600,       // 1 hour
  news: 1800             // 30 minutes
};
```

#### 2.4 BACKUP APIs (If Primary APIs Fail)
```typescript
// ADDITIONAL OPTIONS IF NEEDED:

// 1. POLYGON.IO (Alternative to Twelve Data)
// - 5 calls/minute free tier
// - Great for US market data
// - REST + WebSocket support
const polygonBackup = {
  endpoint: 'https://api.polygon.io/v2/aggs/ticker/{symbol}',
  quota: '5 calls/minute',
  bestFor: 'US stocks aggregates'
};

// 2. YAHOO FINANCE (Unofficial but reliable)
// - No official API but accessible via libraries
// - Unlimited calls (use responsibly)
// - Comprehensive data
// Python microservice recommended:
// pip install yfinance
// WARNING: Only for non-commercial use initially

// 3. MARKETSTACK (IEX Cloud replacement)
// - 1000 calls/month free
// - End-of-day data
// - Good for historical data
const marketstackBackup = {
  endpoint: 'http://api.marketstack.com/v1/',
  quota: '1000 calls/month',
  bestFor: 'EOD historical data'
};

// IMPLEMENTATION STRATEGY:
// 1. Try primary APIs first
// 2. If rate limited or error, try backup
// 3. Always respect rate limits
// 4. Log API usage for monitoring
```

### PHASE 3: FEATURE IMPLEMENTATION (Priority: HIGH)

#### 3.1 Find Stocks Page
```typescript
// Location: client/src/pages/find-stocks.tsx
// Currently: Empty page
// Implement:
// - Search with autocomplete
// - Popular stocks grid
// - Trending stocks
// - Navigation to stock details
```

#### 3.2 Stock Details Page
```typescript
// Create: client/src/pages/stock/[symbol].tsx
// Include:
// - Price chart (use Recharts, already installed)
// - Key metrics cards
// - Company info
// - Add to watchlist button
```

#### 3.3 Advanced Charts
```typescript
// Location: client/src/pages/AdvancedCharts.tsx
// Currently: Empty
// Implement grid of:
// - Revenue (quarterly bars)
// - EPS (quarterly bars)
// - Free Cash Flow
// - Net Income
// - EBITDA
// - Cash & Debt
// Use MetricCard component pattern
```

### PHASE 4: USER FEATURES (Priority: MEDIUM)

#### 4.1 Watchlists
```typescript
// Location: client/src/pages/watchlists.tsx
// Currently: Mock data
// Implement:
// - CRUD with Supabase
// - Real prices
// - Performance tracking
```

#### 4.2 Portfolios
```typescript
// Location: client/src/pages/portfolios.tsx
// Currently: Static mock
// Implement:
// - Transaction management
// - Holdings calculation
// - P&L tracking
```

### PHASE 5: MONETIZATION (Priority: MEDIUM)

#### 5.1 Stripe Setup
```typescript
// Products:
const PRODUCTS = {
  FREE: {
    watchlists: 3,
    stocks: 20,
    delay: '15min'
  },
  PRO: {
    price: 9.99,
    watchlists: 'unlimited',
    stocks: 'unlimited',
    delay: 'real-time'
  }
};
```

#### 5.2 Stripe Webhook Handler
```typescript
// server/routes/stripe-webhook.ts
import express from 'express';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase-admin';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// IMPORTANT: Use raw body for Stripe signature verification
router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutComplete(event.data.object);
          break;
          
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionChange(event.data.object);
          break;
          
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// Sync subscription status with database
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
    
  if (error) console.error('Failed to update subscription:', error);
}

// Daily cron job for subscription sync (backup)
export async function syncAllSubscriptions() {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id');
    
  for (const sub of subs || []) {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    await handleSubscriptionChange(stripeSub);
  }
}
```

## 🛠️ COMMON PATTERNS TO FOLLOW

### API Call Pattern
```typescript
// Always use React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['stock', symbol],
  queryFn: () => stockService.getStock(symbol),
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000
});
```

### Component Structure
```typescript
// Use this structure for new components
export function ComponentName({ prop1, prop2 }: Props) {
  // Hooks first
  const [state, setState] = useState();
  const { data } = useQuery(...);
  
  // Handlers
  const handleClick = () => {};
  
  // Early returns
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState />;
  
  // Main render
  return (
    <div className="space-y-4">
      {/* Content */}
    </div>
  );
}
```

### Error Handling
```typescript
// Always handle errors gracefully
try {
  const data = await api.getData();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Return cached data if available
  const cached = await cache.get(key);
  if (cached) return cached;
  throw error;
}
```

## 📊 MONITORING & OBSERVABILITY

### API Usage Monitoring
```typescript
// server/middleware/api-monitor.ts
import { Counter, Histogram } from 'prom-client';

const apiCallsCounter = new Counter({
  name: 'api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['provider', 'endpoint', 'status']
});

const apiLatencyHistogram = new Histogram({
  name: 'api_call_duration_seconds',
  help: 'API call latency',
  labelNames: ['provider', 'endpoint']
});

export const apiMonitor = {
  trackRequest: (provider: string, endpoint: string) => {
    const timer = apiLatencyHistogram.startTimer({ provider, endpoint });
    
    return {
      success: () => {
        timer();
        apiCallsCounter.inc({ provider, endpoint, status: 'success' });
      },
      error: () => {
        timer();
        apiCallsCounter.inc({ provider, endpoint, status: 'error' });
      }
    };
  },
  
  // Alert when approaching quota limits
  checkQuotaUsage: async () => {
    const usage = await getAPIUsageStats();
    
    if (usage.percentage > 80) {
      console.warn(`⚠️ API quota at ${usage.percentage}% for ${usage.provider}`);
      // Send alert to Slack/Email
    }
  }
};

// Log all API usage for debugging
export const logAPIUsage = (provider: string) => (req, res, next) => {
  console.log(`📊 API Call: ${provider} - ${req.path}`);
  req.apiProvider = provider;
  next();
};
```

### Real-time Data Strategy
```typescript
// Real-time flow using WebSocket + Supabase Realtime

// 1. Backend WebSocket Gateway (server/services/realtime-gateway.ts)
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

export class RealtimeGateway {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  async connectToTwelveData() {
    const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${process.env.TWELVE_DATA_API_KEY}`);
    
    ws.on('message', async (data) => {
      const priceUpdate = JSON.parse(data.toString());
      
      // Broadcast to Supabase Realtime channel
      await this.supabase
        .channel('stock-prices')
        .send({
          type: 'broadcast',
          event: 'price-update',
          payload: priceUpdate
        });
    });
  }
}

// 2. Frontend Hook (client/src/hooks/use-realtime-price.ts)
export function useRealtimePrice(symbol: string) {
  const [price, setPrice] = useState(null);
  
  useEffect(() => {
    const channel = supabase
      .channel('stock-prices')
      .on('broadcast', { event: 'price-update' }, (payload) => {
        if (payload.symbol === symbol) {
          setPrice(payload.price);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbol]);
  
  return price;
}

// Fallback: If WebSocket fails, use polling
const POLLING_INTERVAL = 60000; // 1 minute
```

## 🚀 CI/CD PIPELINE

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Lint code
      run: npm run lint
      
    - name: Type check
      run: npm run type-check
      
    - name: Run tests
      run: npm run test
      
    - name: Build application
      run: npm run build
      
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: npm audit --audit-level=high
      
    - name: Check for secrets
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        
  deploy:
    needs: [quality, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 🧪 AUTOMATED TESTING

### Test Setup
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### Example Tests
```typescript
// src/hooks/__tests__/use-stock-data.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStockData } from '../use-stock-data';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useStockData', () => {
  it('fetches stock data successfully', async () => {
    const { result } = renderHook(
      () => useStockData('AAPL'),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toHaveProperty('symbol', 'AAPL');
    expect(result.current.data).toHaveProperty('price');
  });
  
  it('handles API errors gracefully', async () => {
    const { result } = renderHook(
      () => useStockData('INVALID'),
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    
    expect(result.current.error).toBeDefined();
  });
});

// src/services/__tests__/api-contract.test.ts
describe('API Contract Tests', () => {
  it('TwelveData returns expected schema', async () => {
    const response = await twelveDataService.getQuote('AAPL');
    
    expect(response).toMatchSchema({
      symbol: expect.any(String),
      price: expect.any(Number),
      volume: expect.any(Number),
      timestamp: expect.any(String)
    });
  });
});
```

## 📝 DEVELOPMENT WORKFLOW

### 1. Start Development
```bash
# Terminal 1 - Start everything
cd /Users/antoniofrancisco/Documents/teste\ 1
./start-alfalyzer-bulletproof.sh

# Terminal 2 - Watch for TypeScript errors
npm run type-check -- --watch
```

### 2. Before Each Feature
```bash
# 1. Check if it exists
find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "FeatureName"

# 2. Check for TODOs
grep -r "TODO" client/src/

# 3. Check mock data to replace
grep -r "mock" client/src/pages/
```

### 3. Testing Approach
```typescript
// Manual testing checklist
□ Desktop view (1920x1080)
□ Mobile view (iPhone 12)
□ Dark mode (when implemented)
□ Error states
□ Loading states
□ Empty states
```

## ⚠️ CRITICAL WARNINGS

### DON'T DO THIS
```typescript
// ❌ Don't create new auth systems
// ❌ Don't use React Router (use Wouter)
// ❌ Don't modify UI components without checking design
// ❌ Don't make API calls without caching
// ❌ Don't commit API keys
```

### ALWAYS DO THIS
```typescript
// ✅ Check if component exists before creating
// ✅ Use TypeScript strict mode
// ✅ Handle loading and error states
// ✅ Cache API responses
// ✅ Test on mobile
// ✅ Follow existing patterns
// ✅ Add aria-labels and WCAG 2.1 AA compliance
// ✅ Prepare for i18n (use constants for text)
```

## 🚀 QUICK START COMMANDS

```bash
# Find files
find . -name "*.tsx" | grep -i stock

# Search codebase
grep -r "searchTerm" client/src/

# Check types
npm run type-check

# Format code
npm run format

# Build check
npm run build
```

## 📞 HELP & QUESTIONS

When stuck, check:
1. `/CLAUDE.md` - Original project documentation
2. `/README.md` - Setup instructions
3. Existing similar components for patterns
4. Mock data files for data structure

## 🎯 SUCCESS CRITERIA

Each implementation should:
- [ ] Replace mock data with real data
- [ ] Handle loading states
- [ ] Handle error states  
- [ ] Be mobile responsive
- [ ] Follow TypeScript types
- [ ] Include proper caching
- [ ] Have user feedback (toasts, loading indicators)
- [ ] Use environment variables properly (no VITE_ for secrets)
- [ ] Implement RLS policies for all database tables
- [ ] Have unit tests for critical paths
- [ ] Include monitoring/observability hooks
- [ ] Follow accessibility guidelines (WCAG 2.1 AA)
- [ ] Prepare for internationalization

---

**Remember**: The goal is to transform Alfalyzer from a beautiful UI with mock data into a fully functional financial analytics platform. Focus on one feature at a time, test thoroughly, and maintain code quality.

Good luck! 🚀