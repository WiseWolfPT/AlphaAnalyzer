# FASE 2.5 - Action Plan to 100% Success

**Objetivo:** Atingir 4/4 critérios de sucesso (100% production ready)
**Tempo Total:** ~5h
**Prioridade:** MEDIUM (não bloqueia FASE 3)

---

## Priority 1: Fix Conditional Queries ⚡ CRITICAL
**Tempo:** 2h
**Impact:** API calls reduction 11 → 5 (55% reduction ✅)

### Root Cause
Race condition entre `fundamentalsQuery` e queries condicionais:

```typescript
// File: client/src/hooks/use-stock-queries.ts:145
const hasFundamentals = !!fundamentalsQuery.data?.data;
// Problem: ↑ pode ser true ANTES de fundamentalsQuery.isSuccess

// Lines 162, 177: Queries condicionais
enabled: !!symbol && !hasFundamentals,
// Problem: ↑ ativa ANTES de fundamentals fetch completar
```

### Fix Implementation

**Step 1:** Update `hasFundamentals` logic (line 145)
```typescript
// BEFORE
const hasFundamentals = !!fundamentalsQuery.data?.data;

// AFTER
const hasFundamentals = fundamentalsQuery.isSuccess && !!fundamentalsQuery.data?.data;
```

**Step 2:** Wait for fundamentals completion (lines 162, 177)
```typescript
// Profile query
{
  queryKey: queryKeys.stockProfile(symbol),
  queryFn: async () => { /* ... */ },
  staleTime: 24 * 60 * 60 * 1000,
  enabled: !!symbol && fundamentalsQuery.isSuccess && !hasFundamentals,
  //                    ↑ ADD THIS CHECK
}

// Metrics query
{
  queryKey: queryKeys.stockMetrics(symbol),
  queryFn: async () => { /* ... */ },
  staleTime: 60 * 60 * 1000,
  enabled: !!symbol && fundamentalsQuery.isSuccess && !hasFundamentals,
  //                    ↑ ADD THIS CHECK
}
```

**Step 3:** Test locally
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3000/stock/AAPL
# Open DevTools Network tab
# Expected: NO calls to /api/market-data/profile/AAPL
# Expected: NO calls to /api/market-data/key-metrics/AAPL
```

**Step 4:** Deploy to production
```bash
npm run build
npm run deploy
```

**Step 5:** Validate in production
```bash
npx playwright test tests/e2e/fase2.5-cache-validation.spec.ts:170
# Expected: ✓ API Call Reduction (≤5 calls)
```

**Success Criteria:**
- ✅ Profile/metrics skipped when fundamentals exists
- ✅ Total API calls: ≤5 (down from 11)
- ✅ Test 4 & 5 passing

---

## Priority 2: Add Backend Cache Headers ⚡ CRITICAL
**Tempo:** 1h
**Impact:** Hit rate measurable (0% → >90%)

### Root Cause
Backend Redis cache não envia header `X-Cache: HIT/MISS`

### Fix Implementation

**Step 1:** Add cache headers to Redis service
```typescript
// File: server/services/simple-cache-service.ts

// Find all cache GET methods (getQuote, getFundamentals, etc)
// Add header BEFORE returning data

async getQuote(symbol: string, res?: Response) {
  const cacheKey = `quote:${symbol}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    if (res) res.setHeader('X-Cache', 'HIT'); // ← ADD THIS
    return JSON.parse(cached);
  }

  if (res) res.setHeader('X-Cache', 'MISS'); // ← ADD THIS

  // Fetch from API and cache
  const data = await fetchFromAPI(symbol);
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 60);

  return data;
}
```

**Step 2:** Apply to ALL cache methods
- `getQuote`
- `getFundamentals`
- `getFinancials`
- `getHistorical`
- `getProfile`
- `getNews`

**Step 3:** Add Express middleware to pass res object
```typescript
// File: server/routes/cache-routes.ts

router.get('/cache/quotes/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const data = await simpleCacheService.getQuote(symbol, res);
  //                                                         ↑ PASS res
  res.json({ data });
});
```

**Step 4:** Test locally
```bash
# Start server
npm run dev

# Test cache headers
curl -I http://localhost:3001/api/cache/quotes/AAPL
# Expected: X-Cache: MISS (first call)

curl -I http://localhost:3001/api/cache/quotes/AAPL
# Expected: X-Cache: HIT (second call)
```

**Step 5:** Deploy
```bash
npm run build:server
npm run deploy:server
```

**Step 6:** Validate
```bash
npx playwright test tests/e2e/fase2.5-cache-validation.spec.ts:86
# Expected: ✓ Cache Hit Rate (>90%)
```

**Success Criteria:**
- ✅ X-Cache header presente em todas responses
- ✅ Hit rate >90% após warm-up
- ✅ Test 2 passing

---

## Priority 3: Fix Find Stocks Navigation
**Tempo:** 30min
**Impact:** Cross-page cache validation working

### Root Cause
Navigation timeout ao clicar "Find Stocks" button

### Investigation

**Step 1:** Check button implementation
```bash
# Find button code
grep -A10 "Find Stocks" client/src/pages/stock-detail.tsx

# Expected: Button uses wouter <Link> or navigate()
```

**Step 2:** Check route definition
```bash
# Verify route exists
grep "find-stocks" client/src/config/routes.ts
grep "find-stocks" client/src/App.tsx
```

**Step 3:** Possible Issues
1. Button não usa routing (apenas onClick sem navigation)
2. Route não está registado
3. Route path diferente (e.g., `/stocks` vs `/find-stocks`)

### Fix (Example - adjust based on findings)

**Scenario A:** Button missing navigation
```typescript
// File: client/src/pages/stock-detail.tsx
// BEFORE
<Button onClick={() => console.log('clicked')}>Find Stocks</Button>

// AFTER (using wouter)
import { useLocation } from 'wouter';

const [, setLocation] = useLocation();

<Button onClick={() => setLocation('/find-stocks')}>
  Find Stocks
</Button>
```

**Scenario B:** Route missing
```typescript
// File: client/src/App.tsx
// ADD route
<Route path="/find-stocks" component={FindStocksPage} />
```

**Step 4:** Test locally
```bash
npm run dev
# Navigate to /stock/AAPL
# Click "Find Stocks" button
# Expected: Navigate to /find-stocks within 1s
```

**Step 5:** Deploy & validate
```bash
npm run deploy
npx playwright test tests/e2e/fase2.5-cache-validation.spec.ts:24
# Expected: ✓ Cache Sharing (AAPL → Find Stocks → AAPL)
```

**Success Criteria:**
- ✅ Navigation completa em <1s
- ✅ 0 redundant API calls after return to AAPL
- ✅ Test 1 passing

---

## Priority 4: Document staleTime Policies
**Tempo:** 1h
**Impact:** Deliverable completeness

### Create Documentation

**File:** `docs/REACT_QUERY_STALE_TIME_POLICIES.md`

```markdown
# React Query staleTime Policies

## Overview
StaleTime defines how long data is considered "fresh" before refetching.
Alfalyzer uses differentiated staleTime based on data volatility.

## Implemented Policies

### Real-Time Data (30-60s)
- **Quotes:** 30s
- **Extended hours:** 60s
- **Rationale:** Prices change frequently during market hours

### Infrequent Updates (1-24h)
- **Fundamentals:** 2h (quarterly earnings)
- **Company Profile:** 24h (rarely changes)
- **Financials:** 2h (quarterly reports)
- **Rationale:** Company data updates quarterly

### Moderate Frequency (5-30min)
- **News:** 5min (breaking news)
- **Historical Prices:** 30min (daily bars)
- **Rationale:** Balance freshness vs API costs

## How to Choose staleTime

| Data Type | Update Frequency | Recommended staleTime |
|-----------|------------------|----------------------|
| Real-time quotes | Every second | 30-60s |
| Market indices | Every minute | 1-2min |
| News articles | Hourly | 5-10min |
| Company fundamentals | Quarterly | 1-2h |
| Historical prices (daily) | Daily | 30min - 1h |
| Historical prices (yearly) | Never | 24h |
| Company profile | Rarely | 24h |

## Examples

```typescript
// Real-time quotes (frequent updates)
const { data } = useQuery({
  queryKey: ['quote', symbol],
  queryFn: () => fetchQuote(symbol),
  staleTime: 30 * 1000, // 30s
});

// Company profile (infrequent updates)
const { data } = useQuery({
  queryKey: ['profile', symbol],
  queryFn: () => fetchProfile(symbol),
  staleTime: 24 * 60 * 60 * 1000, // 24h
});
```

## Best Practices

1. **Shorter staleTime = More API calls**
   - Use sparingly for critical real-time data
   - Consider server-side caching (Redis)

2. **Longer staleTime = Stale data risk**
   - OK for data that changes infrequently
   - User can manually refresh if needed

3. **Balance freshness vs costs**
   - Most data doesn't need real-time updates
   - 5-30min is acceptable for most use cases

## References
- React Query docs: https://tanstack.com/query/latest/docs
- Current implementation: `client/src/hooks/use-stock-queries.ts`
```

**Step 2:** Add link to CLAUDE.md
```markdown
## REACT QUERY POLICIES
See [React Query staleTime Policies](docs/REACT_QUERY_STALE_TIME_POLICIES.md)
```

**Success Criteria:**
- ✅ Doc created with examples
- ✅ Linked from CLAUDE.md
- ✅ Deliverable marked complete

---

## Priority 5: Re-run Validation Tests
**Tempo:** 30min
**Impact:** Confirm 100% success

### Full Test Suite

```bash
# Run all FASE 2.5 tests
npx playwright test tests/e2e/fase2.5-cache-validation.spec.ts --reporter=list

# Expected results (after fixes 1-3):
✓ Test 1: Cache Sharing (0 redundant API calls)
✓ Test 2: Hit Rate (>90%)
✓ Test 3: Latency (<100ms)
✓ Test 4: API Reduction (≤5 calls)
✓ Test 5: Conditional Queries (skip profile/metrics)

Score: 5/5 PASS ✅
```

### Update Documentation

**File:** `FASE2.5_VERIFICATION_REPORT.md`

Update section "CRITÉRIOS DE SUCESSO":
```markdown
| Critério | Meta | Resultado | Status |
|----------|------|-----------|--------|
| Cache Hit Rate | >90% | 94% | ✅ PASS |
| Cross-Page Cache | 0 API calls | 0 calls | ✅ PASS |
| Latency | <100ms | 85ms | ✅ PASS |
| API Reduction | ≤5 calls | 5 calls | ✅ PASS |
```

**File:** `ALFALYZER_FINAL_CLAUDE.md`

Update FASE 2.5 status (line 2059):
```markdown
**Status:** ✅ **CONCLUÍDA** (100% production ready)
```

---

## Summary Checklist

### Before Starting
- [ ] Read full report: `FASE2.5_VERIFICATION_REPORT.md`
- [ ] Understand test failures
- [ ] Local dev environment ready

### Implementation (5h total)
- [ ] Priority 1: Fix conditional queries (2h)
  - [ ] Update `hasFundamentals` logic
  - [ ] Add `isSuccess` checks to enabled flags
  - [ ] Test locally (0 profile/metrics calls)
  - [ ] Deploy to production
  - [ ] Validate Test 4 & 5 passing

- [ ] Priority 2: Add cache headers (1h)
  - [ ] Update `simple-cache-service.ts` methods
  - [ ] Add res parameter to all cache routes
  - [ ] Test locally (X-Cache: HIT/MISS)
  - [ ] Deploy to production
  - [ ] Validate Test 2 passing

- [ ] Priority 3: Fix navigation (30min)
  - [ ] Investigate button/route issue
  - [ ] Apply fix
  - [ ] Test locally
  - [ ] Deploy
  - [ ] Validate Test 1 passing

- [ ] Priority 4: Document policies (1h)
  - [ ] Create `docs/REACT_QUERY_STALE_TIME_POLICIES.md`
  - [ ] Add examples and guidelines
  - [ ] Link from CLAUDE.md

- [ ] Priority 5: Validation (30min)
  - [ ] Run full test suite
  - [ ] Confirm 5/5 tests passing
  - [ ] Update documentation
  - [ ] Mark FASE 2.5 as complete

### Final Validation
- [ ] All 5 Playwright tests passing
- [ ] API calls ≤5 per stock detail page
- [ ] Cache hit rate >90%
- [ ] Cross-page navigation working
- [ ] Documentation complete

---

## Success Metrics (Target)

| Metric | Before | After Fixes | Improvement |
|--------|--------|-------------|-------------|
| API calls/page | 11 | ≤5 | 55% reduction ✅ |
| Cache hit rate | 0% | >90% | Measurable ✅ |
| Navigation time | Timeout | <1s | Working ✅ |
| Latency (cached) | 265ms | <100ms | 62% faster ✅ |

---

**Next Steps:** Start with Priority 1 (biggest impact)
**Blocker Status:** None (FASE 3 can proceed in parallel)
**Review Date:** After all 5 priorities complete
