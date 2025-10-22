# Cache Optimization Audit & Implementation Plan

## Executive Summary

**Current State:** Application is making excessive API calls during navigation. Redis cache shows good hit rate (3656 hits, 335 misses = 91.6%), but significant optimization opportunities exist.

**Goal:** Reduce API calls by 30-50% through better cache utilization and frontend optimization.

**Estimated Impact:**
- API cost reduction: ~40% (from $14.99/month baseline)
- Page load improvement: 200-500ms faster
- Better user experience with instant data display

---

## 1. Current Architecture Analysis

### ✅ What's Working Well

1. **Redis Cache Service** (`simple-cache-service.ts`)
   - Solid implementation with differentiated TTLs
   - Thundering herd protection (in-flight request tracking)
   - Hit/miss counters for monitoring
   - TTL Configuration:
     - Quotes: 60s
     - Historical: 2h (7200s)
     - Financials: 1h (3600s)
     - Profiles: 24h (86400s)
     - Market Status: 5min (300s)

2. **Backend Caching**
   - `/api/market-data/quote/:symbol` - uses simpleCacheService ✅
   - `/api/market-data/quotes/batch` - uses simpleCacheService ✅
   - `/api/market-data/chart/:symbol/:period` - Redis cached (2h TTL) ✅
   - `/api/market-data/market-status` - Redis cached (3min TTL) ✅
   - `/api/market-data/search` - Redis cached (24h TTL) ✅

3. **React Query Setup**
   - Already in use with proper queryKey patterns
   - Basic staleTime/cacheTime configuration

---

## 2. Critical Issues Found

### ❌ Issue 1: Duplicate Data Fetching on Stock Detail Page

**Location:** `/client/src/pages/stock-detail.tsx`

**Problem:** Multiple hooks fetching same/overlapping data:
```typescript
// Line 127: Company profile #1
const { profile, metrics, isLoading: isLoadingCompany } = useCompanyData(symbol);

// Line 130: Cached quote
const { data: cachedQuote, isLoading: isLoadingQuote } = useCachedQuote(symbol);

// Line 132: Extended hours
const { data: extendedHours } = useExtendedHours(symbol);

// Line 143-150: Company profile #2 (duplicate!)
const {
  profile: detailedProfile,  // <-- DUPLICATE
  metrics: detailedMetrics,  // <-- DUPLICATE
  incomeStatements,
  news,
  historicalPrices,
  isLoading: isLoadingDetails
} = useStockDetails(symbol);
```

**Impact:** 2x API calls for profile/metrics data per page load.

**Root Cause:** `useStockDetails` hook (lines 113-171) makes waterfall requests:
1. `/cache/fundamentals/${symbol}` (fails, not implemented)
2. `/market-data/profile/${symbol}` (API call)
3. `/market-data/fmp/profile/${symbol}` (fallback API call)
4. `/stocks/${symbol}/profile` (fallback API call)

Same pattern repeats for metrics, income, news, historical.

---

### ❌ Issue 2: Missing Cache Endpoints

**Frontend expects but backend doesn't implement:**

1. `/api/cache/fundamentals/${symbol}` - **NOT FOUND**
   - Called by `useStockDetails` (line 116)
   - Expected: cached company fundamentals
   - Current: Always fails → triggers API call

2. `/api/cache/financials/${symbol}` - **NOT FOUND**
   - Called by `useStockDetails` (line 154)
   - Expected: cached financial data
   - Current: Always fails → triggers API call

3. `/api/cache/historical/${symbol}/{period}` - **NOT FOUND**
   - Called by `useStockDetails` (line 167)
   - Called by `useCachedHistorical` (line 118)
   - Expected: cached historical prices
   - Current: Always fails → triggers API call

4. `/api/cache/news/${symbol}` - **NOT FOUND**
   - Called by `useCachedNews` (line 261)
   - Expected: cached news articles
   - Current: Always fails → triggers API call

---

### ❌ Issue 3: Inefficient React Query Configuration

**Location:** `/client/src/hooks/use-cache-data.ts`

**Problems:**

1. **Too Short staleTime for profile data:**
```typescript
// Line 104: Profile data refetches every 60s (too aggressive)
staleTime: 60 * 1000, // Should be 5-10 minutes
```

2. **Unnecessary refetchInterval:**
```typescript
// Line 107: Polls every 60s even when data hasn't changed
refetchInterval: 60 * 1000, // Should be removed for static data
```

3. **Compare page inefficiency:**
   - Uses `useCachedQuote` for each stock individually
   - Should use batch endpoint instead
   - 4 stocks = 4 API calls instead of 1 batch call

---

### ❌ Issue 4: FMP Proxy Endpoints Not Cached

**Location:** `/server/routes/market-data.ts` (lines 1807-2125)

**Uncached endpoints:**
- `/api/market-data/fmp/key-metrics/:symbol` (line 1807)
- `/api/market-data/fmp/income-statement/:symbol` (line 1861)
- `/api/market-data/fmp/balance-sheet-statement/:symbol` (line 1915)
- `/api/market-data/fmp/cash-flow-statement/:symbol` (line 1969)
- `/api/market-data/fmp/profile/:symbol` (line 2023) - **HAS cache!** ✅
- `/api/market-data/fmp/quote-short/:symbol` (line 2080)

**Impact:** Every request = FMP API call (expensive)

---

### ❌ Issue 5: Navigation Pattern Issues

**Problem:** When user navigates AAPL → MSFT → AAPL:
1. First AAPL visit: All data fetched (correct)
2. MSFT visit: All data fetched (correct)
3. Second AAPL visit: **React Query cache expired**, refetches everything

**Root Cause:** Default gcTime (garbage collection) too short:
```typescript
gcTime: 120_000, // 2 minutes - data deleted after this
```

---

## 3. Optimization Implementation Plan

### Phase 1: Backend Cache Layer (High Impact, 4 hours)

#### 1.1 Add Missing Cache Endpoints

**Create:** `/server/routes/cache-routes.ts` additions

```typescript
/**
 * GET /api/cache/fundamentals/:symbol
 * Cached company profile + key metrics (1 hour TTL)
 */
router.get('/fundamentals/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { redisCacheService } = await import('../cache/redis-cache-service');

  const cacheKey = `fundamentals:${symbol.toUpperCase()}`;
  const cached = await redisCacheService.get(cacheKey);

  if (cached) {
    return res.json({ data: cached, _cached: true, _source: 'redis' });
  }

  // Fetch from FMP and cache
  const fmp = new FMPProvider(process.env.FMP_API_KEY || '');
  const [profile, metrics] = await Promise.all([
    fmp.getFundamentals(symbol),
    fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?period=quarter&limit=1&apikey=${process.env.FMP_API_KEY}`)
  ]);

  const data = { ...profile, ...(await metrics.json())[0] };
  await redisCacheService.set(cacheKey, data, 3600); // 1 hour

  res.json({ data, _cached: false, _source: 'fmp' });
});
```

**Similar implementations for:**
- `/api/cache/financials/:symbol` (income statements, 1h TTL)
- `/api/cache/historical/:symbol/:period` (historical prices, 2h TTL)
- `/api/cache/news/:symbol` (news articles, 30min TTL)

#### 1.2 Add Redis Cache to FMP Proxy Endpoints

**Update:** `/server/routes/market-data.ts`

```typescript
// Line 1807: Add caching to key-metrics
router.get('/fmp/key-metrics/:symbol', async (req: Request, res: Response) => {
  const { symbol } = validation.data;
  const period = req.query.period || 'quarter';
  const limit = req.query.limit || '10';

  // Add Redis cache check
  const { redisCacheService } = await import('../cache/redis-cache-service');
  const cacheKey = `fmp:key-metrics:${symbol}:${period}:${limit}`;
  const cached = await redisCacheService.get(cacheKey);

  if (cached) {
    return res.json({ ...cached, _cached: true });
  }

  // ... existing fetch logic ...
  await redisCacheService.set(cacheKey, response.data, 3600); // 1 hour
  res.json(response.data);
});
```

**Apply same pattern to:**
- `/fmp/income-statement/:symbol` (1h TTL)
- `/fmp/balance-sheet-statement/:symbol` (1h TTL)
- `/fmp/cash-flow-statement/:symbol` (1h TTL)
- `/fmp/quote-short/:symbol` (60s TTL)

---

### Phase 2: Frontend Optimization (High Impact, 2 hours)

#### 2.1 Fix Stock Detail Page Duplicate Fetching

**Update:** `/client/src/pages/stock-detail.tsx`

```typescript
// BEFORE (lines 127-150): Multiple overlapping hooks
const { profile, metrics } = useCompanyData(symbol);
const { profile: detailedProfile, metrics: detailedMetrics } = useStockDetails(symbol);

// AFTER: Single unified hook
const { profile, metrics, incomeStatements, news, historicalPrices } = useStockDetails(symbol);
```

**Remove:** `useCompanyData` hook usage (redundant)

#### 2.2 Optimize useStockDetails Hook

**Update:** `/client/src/hooks/use-stock-details.ts`

```typescript
// BEFORE (lines 113-171): Waterfall requests with multiple fallbacks
const [profile, metricsData, ...] = await Promise.all([
  (async () => {
    const fundamentals = await fetchJson(`/cache/fundamentals/${symbol}`);
    if (fundamentals?.data) return fundamentals.data;
    return await fetchJson(`/market-data/profile/${symbol}`)
      || await fetchJson(`/market-data/fmp/profile/${symbol}`)
      || await fetchJson(`/stocks/${symbol}/profile`);
  })(),
  // ...
]);

// AFTER: Cache-first, single fallback
const [profile, metricsData, ...] = await Promise.all([
  fetchJson(`/cache/fundamentals/${symbol}`) // Now implemented! ✅
    .then(r => r?.data || fetchJson(`/market-data/fmp/profile/${symbol}`)),
  // ...
]);
```

#### 2.3 Optimize React Query Configuration

**Update:** `/client/src/hooks/use-cache-data.ts`

```typescript
// Quotes: Real-time, short cache
export function useCachedQuote(symbol: string) {
  return useQuery({
    queryKey: ['cache', 'quote', symbol],
    // ...
    staleTime: 60_000,        // 60s (keep)
    gcTime: 5 * 60_000,       // 5min (was 2min) - persist longer
    refetchInterval: 60_000,  // 60s (keep for real-time)
  });
}

// Fundamentals: Static data, long cache
export function useCachedFundamentals(symbol: string) {
  return useQuery({
    queryKey: ['cache', 'fundamentals', symbol],
    // ...
    staleTime: 10 * 60_000,   // 10min (was 2h, too long)
    gcTime: 30 * 60_000,      // 30min (was 4h)
    refetchInterval: false,   // No polling (static data)
  });
}

// Historical: Semi-static, moderate cache
export function useCachedHistorical(symbol: string, period: string) {
  return useQuery({
    queryKey: ['cache', 'historical', symbol, period],
    // ...
    staleTime: 2 * 60 * 60_000,  // 2h (keep)
    gcTime: 6 * 60 * 60_000,     // 6h (was 2h)
    refetchInterval: false,      // No polling
  });
}
```

#### 2.4 Batch Fetching for Compare Page

**Update:** `/client/src/pages/compare.tsx`

```typescript
// BEFORE: 4 individual requests
comparisonStocks.map(stock => {
  const { data } = useCachedQuote(stock.symbol); // 4x API calls
});

// AFTER: Single batch request
const symbols = comparisonStocks.map(s => s.symbol);
const { data: batchQuotes } = useCachedBatchQuotes(symbols); // 1x API call
```

---

### Phase 3: Advanced Optimization (Medium Impact, 2 hours)

#### 3.1 Implement HTTP Cache Headers

**Update:** `/server/routes/market-data.ts`

```typescript
// Add cache headers for public endpoints
router.get('/quote/:symbol', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.set('Vary', 'Accept-Encoding');
  // ... existing logic
});

router.get('/fmp/profile/:symbol', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 24h
  res.set('Vary', 'Accept-Encoding');
  // ... existing logic
});
```

#### 3.2 Implement SWR (Stale-While-Revalidate)

**Update:** React Query config for profile data

```typescript
export function useCachedFundamentals(symbol: string) {
  return useQuery({
    queryKey: ['cache', 'fundamentals', symbol],
    // ...
    staleTime: 10 * 60_000,          // 10min
    gcTime: 30 * 60_000,             // 30min
    refetchOnMount: 'always',        // SWR: show stale, fetch fresh
    refetchOnReconnect: true,        // Refetch on reconnect
    placeholderData: keepPreviousData, // Show stale while loading
  });
}
```

---

## 4. Implementation Checklist

### Backend (4 hours)

- [ ] Create `/api/cache/fundamentals/:symbol` endpoint
  - [ ] Fetch from FMP profile + key-metrics
  - [ ] Cache with 1h TTL
  - [ ] Return normalized data structure

- [ ] Create `/api/cache/financials/:symbol` endpoint
  - [ ] Fetch income statements from FMP
  - [ ] Cache with 1h TTL
  - [ ] Support period parameter (quarterly/annual)

- [ ] Create `/api/cache/historical/:symbol/:period` endpoint
  - [ ] Fetch historical prices from FMP
  - [ ] Cache with 2h TTL
  - [ ] Support period: 1D, 5D, 1M, 3M, 6M, 1Y, 5Y

- [ ] Create `/api/cache/news/:symbol` endpoint
  - [ ] Fetch news from FMP
  - [ ] Cache with 30min TTL
  - [ ] Limit to 10 articles

- [ ] Add Redis cache to FMP proxy endpoints:
  - [ ] `/fmp/key-metrics/:symbol` (1h TTL)
  - [ ] `/fmp/income-statement/:symbol` (1h TTL)
  - [ ] `/fmp/balance-sheet-statement/:symbol` (1h TTL)
  - [ ] `/fmp/cash-flow-statement/:symbol` (1h TTL)
  - [ ] `/fmp/quote-short/:symbol` (60s TTL)

- [ ] Add HTTP cache headers to public endpoints
  - [ ] Quote endpoints: 60s
  - [ ] Profile endpoints: 24h
  - [ ] Financial endpoints: 1h

### Frontend (2 hours)

- [ ] Fix stock-detail.tsx duplicate fetching
  - [ ] Remove `useCompanyData` hook
  - [ ] Use only `useStockDetails` hook
  - [ ] Update component to use unified data source

- [ ] Optimize useStockDetails hook
  - [ ] Use new `/api/cache/fundamentals/:symbol`
  - [ ] Use new `/api/cache/financials/:symbol`
  - [ ] Use new `/api/cache/historical/:symbol/:period`
  - [ ] Use new `/api/cache/news/:symbol`
  - [ ] Remove waterfall fallback chains

- [ ] Update React Query configurations
  - [ ] Increase gcTime for all hooks (5-30min)
  - [ ] Remove refetchInterval from static data hooks
  - [ ] Adjust staleTime based on data volatility

- [ ] Optimize compare.tsx
  - [ ] Use `useCachedBatchQuotes` instead of individual `useCachedQuote`
  - [ ] Single API call for all comparison stocks

- [ ] Implement SWR pattern
  - [ ] Add `refetchOnMount: 'always'` to profile hooks
  - [ ] Add `placeholderData: keepPreviousData`

---

## 5. Expected Results

### Before Optimization
```
Stock Detail Page Load (AAPL):
- API Calls: 8-10 requests
  - Quote: 1 call
  - Profile: 2 calls (duplicate)
  - Metrics: 2 calls (duplicate)
  - Income: 1 call
  - News: 1 call
  - Historical: 1 call
  - Intrinsic Value: 1 call

Compare Page (4 stocks):
- API Calls: 4 requests (individual quotes)

Navigation AAPL → MSFT → AAPL:
- Total API Calls: 16-20 (no cache persistence)
```

### After Optimization
```
Stock Detail Page Load (AAPL):
- API Calls: 0-1 requests (cache hit on 2nd load)
  - First load: 5 calls (fundamentals, financials, historical, news, IV)
  - Second load: 0 calls (all cached)

Compare Page (4 stocks):
- API Calls: 1 request (batch endpoint)

Navigation AAPL → MSFT → AAPL:
- Total API Calls: 6 (50% reduction)
  - AAPL first: 5 calls
  - MSFT: 5 calls
  - AAPL second: 0 calls (cache hit)
```

### Performance Metrics
- **API Call Reduction:** 40-50%
- **Page Load Time:** 200-500ms faster
- **Cache Hit Rate:** 91.6% → 95%+ (target)
- **Cost Savings:** ~$6/month (40% of $14.99)

---

## 6. Testing Plan

### Unit Tests
```bash
# Backend cache endpoints
npm test server/routes/cache-routes.test.ts

# Frontend hooks
npm test client/src/hooks/use-cache-data.test.ts
```

### Integration Tests
```typescript
// Test cache-first flow
describe('Stock Detail Cache Flow', () => {
  it('should use cached data on second page load', async () => {
    // Visit AAPL
    const { rerender } = render(<StockDetail symbol="AAPL" />);
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument());

    // Check API calls
    expect(mockFetch).toHaveBeenCalledTimes(5); // Initial load

    // Navigate away and back
    rerender(<StockDetail symbol="MSFT" />);
    await waitFor(() => expect(screen.getByText('Microsoft')).toBeInTheDocument());

    rerender(<StockDetail symbol="AAPL" />);
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument());

    // Should use cache
    expect(mockFetch).toHaveBeenCalledTimes(10); // 5 for MSFT, 0 for AAPL (cached)
  });
});
```

### Performance Monitoring
```typescript
// Add to monitoring dashboard
const metrics = {
  apiCallsPerPageLoad: [],
  cacheHitRate: 0,
  avgPageLoadTime: 0,
};

// Track in production
window.addEventListener('load', () => {
  const apiCalls = performance.getEntriesByType('resource')
    .filter(r => r.name.includes('/api/'))
    .length;

  metrics.apiCallsPerPageLoad.push(apiCalls);

  // Send to analytics
  analytics.track('page_performance', metrics);
});
```

---

## 7. Rollout Strategy

### Week 1: Backend Implementation
- Day 1-2: Implement cache endpoints
- Day 3: Add Redis cache to FMP proxies
- Day 4: Add HTTP cache headers
- Day 5: Testing & bug fixes

### Week 2: Frontend Implementation
- Day 1-2: Fix duplicate fetching issues
- Day 3: Optimize React Query configs
- Day 4: Implement batch fetching
- Day 5: Testing & monitoring

### Week 3: Monitoring & Tuning
- Monitor cache hit rates
- Adjust TTLs based on usage patterns
- Fine-tune React Query parameters
- Document best practices

---

## 8. Monitoring & Alerts

### Key Metrics to Track
```typescript
// Redis Cache Metrics
const cacheMetrics = {
  hitRate: (hits / (hits + misses)) * 100,
  avgHitRate: 95, // Target
  quoteCacheSize: keys.length,
  memoryUsage: '256MB',
};

// Alert if hit rate < 90%
if (cacheMetrics.hitRate < 90) {
  logger.warn('Cache hit rate below target', cacheMetrics);
}

// FMP API Usage
const apiMetrics = {
  callsPerMinute: 0,
  callsPerDay: 0,
  costPerDay: (callsPerDay / 300) * (14.99 / 30),
};

// Alert if approaching limit
if (apiMetrics.callsPerMinute > 250) {
  logger.error('Approaching FMP rate limit', apiMetrics);
}
```

### Dashboard Queries
```sql
-- Cache performance over time
SELECT
  DATE(timestamp) as date,
  SUM(cache_hits) as hits,
  SUM(cache_misses) as misses,
  (SUM(cache_hits) / (SUM(cache_hits) + SUM(cache_misses))) * 100 as hit_rate
FROM cache_metrics
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- API cost tracking
SELECT
  DATE(timestamp) as date,
  COUNT(*) as api_calls,
  (COUNT(*) / 300.0) * 14.99 as estimated_cost
FROM api_calls
WHERE provider = 'fmp'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

## 9. Success Criteria

### Quantitative Goals
- ✅ API call reduction: 30-50%
- ✅ Cache hit rate: >95%
- ✅ Page load time: <500ms (cached)
- ✅ Memory usage: <300MB Redis
- ✅ Cost reduction: >$6/month

### Qualitative Goals
- ✅ Instant page navigation (cached routes)
- ✅ No loading spinners on repeat visits
- ✅ Smooth user experience
- ✅ No data staleness issues
- ✅ Maintainable cache strategy

---

## 10. Risk Mitigation

### Risk 1: Cache Staleness
**Mitigation:**
- Set appropriate TTLs per data type
- Implement cache invalidation on data updates
- Add manual refresh button for users

### Risk 2: Memory Exhaustion
**Mitigation:**
- Monitor Redis memory usage
- Implement LRU eviction policy
- Set max memory limit (256MB → 512MB if needed)

### Risk 3: Cache Warming Delay
**Mitigation:**
- Pre-warm cache for popular stocks (top 50)
- Implement background refresh for hot data
- Add loading states for cache misses

### Risk 4: Breaking Changes
**Mitigation:**
- Feature flag for new cache endpoints
- Gradual rollout (10% → 50% → 100%)
- Quick rollback plan

---

## Appendix A: Cache Key Patterns

```typescript
// Quotes (60s TTL)
`quote:${symbol}`

// Fundamentals (1h TTL)
`fundamentals:${symbol}`

// Financials (1h TTL)
`financials:${symbol}:${period}`

// Historical (2h TTL)
`historical:${symbol}:${period}`

// News (30min TTL)
`news:${symbol}`

// Company Profile (24h TTL)
`profile:${symbol}`

// Search Results (24h TTL)
`search:${query}`

// Market Status (5min TTL)
`market:status`

// Batch Quotes (60s TTL)
`quote:${symbol}` (individual keys)
```

---

## Appendix B: Environment Variables

```bash
# Cache TTL Configuration (optional overrides)
TTL_QUOTE_SECONDS=60
TTL_HISTORICAL_SECONDS=7200
TTL_FUNDAMENTALS_SECONDS=3600
TTL_PROFILE_SECONDS=86400
TTL_MARKET_STATUS_SECONDS=300
TTL_DEFAULT_SECONDS=3600

# Redis Configuration
REDIS_URL=redis://127.0.0.1:6379
REDIS_PASSWORD=alfalyzer2025redis
REDIS_MAX_MEMORY=256mb
REDIS_EVICTION_POLICY=allkeys-lru

# FMP API
FMP_API_KEY=<your_key>
FMP_RATE_LIMIT=300  # calls per minute
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**Author:** Claude Code (Cache Optimization Specialist)
**Priority:** P3 (Quick Win)
**Estimated Hours:** 6-8 hours total
