# IV Chart Controller Integration Guide - ONDA 7

## Purpose

This guide provides step-by-step instructions for integrating method-level caching into the IV Chart Controller.

---

## Current State Analysis

**File:** `/server/controllers/iv-chart-controller.ts`

**Lines 131-180:** The critical section that calculates all 14 methods in parallel

```typescript
// CURRENT IMPLEMENTATION (Lines 131-180)
const [
  alfaValue,
  dcfFCF,
  dcfFCFE,
  dcfTermFCF,
  dcfTermFCFE,
  dni20,
  peMean,
  peMeanNoNRI,
  psMean,
  pbMean,
  pbMeanNoNRI,
  peg,
  psg,
  dfcfTerminal,
] = await Promise.allSettled([
  // Proprietary
  valuationService.getAlfaValue(ticker),
  // DCF External (attach growth rates after fetch)
  fmpDCFService.getDCF_FCF_EXT(ticker).then(result => {
    if (result) result.growthRates = growthRates;
    return result;
  }),
  fmpDCFService.getDCF_FCFE_EXT(ticker).then(result => {
    if (result) result.growthRates = growthRates;
    return result;
  }),
  fmpDCFService.getDCF_TERM_EXT(ticker).then(result => {
    if (result) result.growthRates = growthRates;
    return result;
  }),
  fmpDCFService.getDCF_TERM_FCFE_EXT(ticker).then(result => {
    if (result) result.growthRates = growthRates;
    return result;
  }),
  // DCF Internal - NEW
  valuationService.calculateDNI20(ticker),
  // Multiples - Mean only (Median removed in ONDA 2.2)
  valuationService.calculatePEMean5Y(ticker),
  valuationService.calculatePEMeanWithoutNRI(ticker),
  valuationService.calculatePSMean5Y(ticker),
  valuationService.calculatePBMean5Y(ticker),
  valuationService.calculatePBMeanWithoutNRI(ticker),
  // Growth
  valuationService.calculatePEG(ticker),
  valuationService.calculatePSG(ticker),
  // Terminal Value - NEW
  valuationService.calculateDFCFTerminal(ticker),
]);
```

**Problems:**
1. All 14 methods calculated at once (30 FMP calls, 60s)
2. Cannot warm individual methods proactively
3. User-dependent: Only calculated on demand
4. Full-response cache doesn't help with warming

---

## Integration Strategy

### Option 1: Complete Replacement (Recommended)

Replace lines 131-180 with method-level caching:

```typescript
import { methodCacheService } from '../services/method-cache-service';
import type { MethodId } from '../types/valuation';

// Define method IDs to warm
const methodIds: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-fcfe-20',
  'dcf-terminal-fcf',
  'dcf-terminal-fcfe',
  'dni-20',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg',
  'dfcf-terminal',
];

// Warm all methods in parallel using method cache
const methodResults = await Promise.allSettled(
  methodIds.map(methodId => methodCacheService.warmMethod(ticker, methodId))
);

// Extract results (same pattern as before)
const [
  alfaValue,
  dcfFCF,
  dcfFCFE,
  dcfTermFCF,
  dcfTermFCFE,
  dni20,
  peMean,
  peMeanNoNRI,
  psMean,
  pbMean,
  pbMeanNoNRI,
  peg,
  psg,
  dfcfTerminal,
] = methodResults;

// Rest of controller logic remains unchanged
// The addMethod() calls (lines 443-569) work identically
```

**Benefits:**
- Minimal code changes
- Backward compatible
- Enables proactive warming
- <100ms for fully cached response

**Drawbacks:**
- Still requires mapping method results to variables
- Growth rates attachment logic needs adaptation

---

### Option 2: Hybrid Approach (Safest)

Keep both implementations with feature flag:

```typescript
const USE_METHOD_CACHE = process.env.USE_METHOD_CACHE === 'true';

let methodResults: PromiseSettledResult<any>[];

if (USE_METHOD_CACHE) {
  // NEW: Method-level caching approach
  const methodIds: MethodId[] = [/* ... */];
  methodResults = await Promise.allSettled(
    methodIds.map(methodId => methodCacheService.warmMethod(ticker, methodId))
  );
} else {
  // OLD: Original direct calls approach (fallback)
  methodResults = await Promise.allSettled([
    valuationService.getAlfaValue(ticker),
    fmpDCFService.getDCF_FCF_EXT(ticker).then(/* ... */),
    // ... rest of original calls
  ]);
}

// Extract results (works for both approaches)
const [alfaValue, dcfFCF, /* ... */] = methodResults;
```

**Benefits:**
- Zero-downtime migration
- Easy rollback via environment variable
- Both paths tested in production

**Drawbacks:**
- Code duplication
- Increased maintenance burden

---

### Option 3: Gradual Migration (Most Conservative)

Migrate one method at a time:

```typescript
// Step 1: Migrate alfa-value only
const alfaValue = await Promise.resolve()
  .then(() => methodCacheService.warmMethod(ticker, 'alfa-value'))
  .then(result => ({ status: 'fulfilled', value: result }))
  .catch(error => ({ status: 'rejected', reason: error }));

// Keep original calls for other methods
const [
  dcfFCF,
  dcfFCFE,
  // ... rest unchanged
] = await Promise.allSettled([
  fmpDCFService.getDCF_FCF_EXT(ticker).then(/* ... */),
  fmpDCFService.getDCF_FCFE_EXT(ticker).then(/* ... */),
  // ...
]);

// Step 2-14: Migrate other methods one by one in subsequent releases
```

**Benefits:**
- Lowest risk
- Incremental validation
- Easy to identify issues

**Drawbacks:**
- Slow migration
- Multiple deployment cycles
- Partial warming capability

---

## Recommended Implementation (Option 1)

### Step 1: Add Import

**Location:** Top of file after existing imports

```typescript
// EXISTING IMPORTS
import { Request, Response } from 'express';
import { valuationService } from '../services/valuation-service';
import { fmpDCFService } from '../services/fmp-dcf';
import { macroService } from '../services/macro-service';
import { logger } from '../lib/logger';
import { redisCacheService } from '../cache/redis-cache-service';
import { estimateGrowthRates } from '../utils/growth-rate-estimator';
import { isETF, getETFReason } from '../utils/stock-classifier';
import axios from 'axios';
import {
  IVChartResponse,
  ValuationMethod,
  DCFBaseMetric,
} from '../types/valuation';

// NEW IMPORTS (add these)
import { methodCacheService } from '../services/method-cache-service';
import type { MethodId } from '../types/valuation';
```

---

### Step 2: Define Method IDs

**Location:** Before line 131 (after growth rates estimation)

```typescript
// EXISTING CODE (lines 105-129)
const growthRates = await estimateGrowthRates({
  ticker,
  sector
});
logger.info(/* ... growth rates log ... */);

// NEW CODE (add after growth rates, before Promise.allSettled)
const methodIds: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  'dcf-fcfe-20',
  'dcf-terminal-fcf',
  'dcf-terminal-fcfe',
  'dni-20',
  'pe-mean',
  'pe-mean-without-nri',
  'ps-mean',
  'pb-mean',
  'pb-mean-without-nri',
  'peg',
  'psg',
  'dfcf-terminal',
];
```

---

### Step 3: Replace Promise.allSettled Call

**Location:** Lines 131-180

**BEFORE:**
```typescript
const [
  alfaValue,
  dcfFCF,
  dcfFCFE,
  dcfTermFCF,
  dcfTermFCFE,
  dni20,
  peMean,
  peMeanNoNRI,
  psMean,
  pbMean,
  pbMeanNoNRI,
  peg,
  psg,
  dfcfTerminal,
] = await Promise.allSettled([
  valuationService.getAlfaValue(ticker),
  fmpDCFService.getDCF_FCF_EXT(ticker).then(result => {
    if (result) result.growthRates = growthRates;
    return result;
  }),
  // ... 12 more method calls ...
]);
```

**AFTER:**
```typescript
// Calculate all methods using method-level cache
const methodResults = await Promise.allSettled(
  methodIds.map(methodId => methodCacheService.warmMethod(ticker, methodId))
);

// Extract results (maintain same structure for downstream code)
const [
  alfaValue,
  dcfFCF,
  dcfFCFE,
  dcfTermFCF,
  dcfTermFCFE,
  dni20,
  peMean,
  peMeanNoNRI,
  psMean,
  pbMean,
  pbMeanNoNRI,
  peg,
  psg,
  dfcfTerminal,
] = methodResults;

// IMPORTANT: Growth rates attachment
// The method cache service already stores growth rates in the cached result
// No need for .then(result => { result.growthRates = growthRates; return result; })
// The FMP DCF services should attach growth rates internally
```

---

### Step 4: Handle Growth Rates

**Challenge:** Current code attaches growth rates after fetching from FMP:

```typescript
fmpDCFService.getDCF_FCF_EXT(ticker).then(result => {
  if (result) result.growthRates = growthRates;
  return result;
})
```

**Solution:** Update `fmp-dcf.ts` to accept growth rates as parameter:

**File:** `/server/services/fmp-dcf.ts`

**Add to each DCF method:**
```typescript
// BEFORE
async getDCF_FCF_EXT(ticker: string): Promise<ExternalDCFResponse | null>

// AFTER
async getDCF_FCF_EXT(
  ticker: string,
  growthRates?: GrowthRateResult
): Promise<ExternalDCFResponse | null> {
  // ... existing logic ...

  const response: ExternalDCFResponse = {
    ticker: upperTicker,
    dcf,
    stock_price: stockPrice,
    date: data.date || new Date().toISOString().split('T')[0],
    method: 'DCF_FCF',
    source: 'fmp',
    confidence: 'HIGH',
    as_of: new Date().toISOString().split('T')[0],
    inputs: {/* ... */},
    growthRates: growthRates || null, // NEW: Store growth rates
  };

  // Cache result with growth rates included
  await redisCacheService.set(cacheKey, response, CACHE_TTL);
  return response;
}
```

**Then update MethodCacheService:**

**File:** `/server/services/method-cache-service.ts`

**Update calculateMethod to pass growth rates:**

```typescript
private async calculateMethod(
  ticker: string,
  methodId: MethodId,
  context?: { growthRates?: GrowthRateResult }
): Promise<ValuationResult> {
  const upperTicker = ticker.toUpperCase();

  switch (methodId) {
    case 'dcf-fcf-20':
      // Pass growth rates if available in context
      return await fmpDCFService.getDCF_FCF_EXT(
        upperTicker,
        context?.growthRates
      ) as any as ValuationResult;

    case 'dcf-fcfe-20':
      return await fmpDCFService.getDCF_FCFE_EXT(
        upperTicker,
        context?.growthRates
      ) as any as ValuationResult;

    // ... other methods
  }
}
```

**Alternative (Simpler):** Store growth rates in method cache key:

```typescript
// Cache key includes growth rates hash
const cacheKey = `iv:method:${upperTicker}:${methodId}:${growthRatesHash}`;
```

**Recommendation:** Keep it simple - store growth rates in the cached result, don't include in cache key. Growth rates change infrequently (analyst updates ~weekly).

---

### Step 5: Test Locally

```bash
# 1. Start backend
npm run backend

# 2. Test endpoint
curl http://localhost:3001/api/iv/AAPL/chart | jq

# 3. Verify method cache keys in Redis
redis-cli
> KEYS iv:method:AAPL:*
> GET iv:method:AAPL:alfa-value

# 4. Run tests
npm run test -- server/controllers/__tests__/iv-chart-controller.method-cache.test.ts
npm run test -- server/services/__tests__/method-cache-service.test.ts

# 5. Smoke test
npm run smoke:local:iv
```

---

### Step 6: Deploy to Production

```bash
# 1. Build server
npm run build:server

# 2. Deploy
npm run deploy:server

# 3. Restart PM2
npm run deploy:restart

# 4. Verify
npm run smoke:prod:iv

# 5. Check logs
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 50 | grep 'MethodCache'"
```

---

## Migration Checklist

### Pre-Migration
- [x] MethodCacheService implemented and tested
- [x] Integration tests written
- [ ] Growth rates handling strategy decided
- [ ] Local testing completed
- [ ] Rollback plan documented

### Migration
- [ ] Add imports to iv-chart-controller.ts
- [ ] Define methodIds array
- [ ] Replace Promise.allSettled call
- [ ] Handle growth rates (update fmp-dcf.ts OR use context parameter)
- [ ] Test locally (curl + Redis inspection)
- [ ] Run test suite

### Post-Migration
- [ ] Deploy to production
- [ ] Verify cache keys in production Redis
- [ ] Monitor logs for errors
- [ ] Check API usage (FMP dashboard)
- [ ] Validate response times (<100ms for cached)
- [ ] Start IV warming worker

---

## Monitoring After Migration

### Key Metrics

```bash
# Cache hit rate
redis-cli
> INFO stats
# Look for: keyspace_hits, keyspace_misses

# Method cache size
> DBSIZE
> KEYS iv:method:*
> MEMORY USAGE iv:method:AAPL:alfa-value

# Response time
curl -w "\nTime: %{time_total}s\n" http://localhost:3001/api/iv/AAPL/chart

# Logs
pm2 logs alfalyzer --lines 100 | grep "MethodCache"
# Expected:
# [MethodCache] HIT: AAPL:alfa-value
# [MethodCache] MISS: AAPL:dcf-fcf-20
# [MethodCache] CACHED: AAPL:dcf-fcf-20 (TTL: 86400s)
```

### Success Criteria

- ✅ Cache hit rate >80% after 24h of warming
- ✅ Response time <100ms for fully cached requests
- ✅ API calls <2,000/day (down from 85,393)
- ✅ Zero user-facing errors
- ✅ All 1,493 stocks proactively warmed

---

## Troubleshooting

### Issue: Methods returning null

**Symptom:** `methodCacheService.warmMethod` returns null or undefined

**Cause:** Method calculation failed (FMP API timeout, invalid data, etc.)

**Solution:**
```typescript
// Add defensive checks
if (result.status === 'fulfilled' && result.value && result.value.iv) {
  // Process result
} else {
  logger.warn(`Method ${methodId} failed or returned invalid result`);
}
```

---

### Issue: Growth rates not attached

**Symptom:** Dropdown inputs missing growth rate data

**Solution:** Ensure growth rates passed to `fmpDCFService` methods or stored in context

---

### Issue: Cache not populating

**Symptom:** Redis shows no `iv:method:*` keys

**Cause:** Cache write errors (Redis connection, permissions)

**Solution:**
```bash
# Check Redis connection
redis-cli PING
# Should return: PONG

# Check Redis logs
pm2 logs alfalyzer | grep Redis

# Test cache write manually
redis-cli SET test:key "test" EX 60
redis-cli GET test:key
```

---

### Issue: High API usage

**Symptom:** FMP API calls not reduced

**Cause:** Cache misses or warming worker not running

**Solution:**
```bash
# Check cache hit rate
redis-cli INFO stats | grep keyspace

# Verify warming worker running
pm2 status | grep iv-warming-worker

# Check warming logs
pm2 logs iv-warming-worker --lines 100
```

---

## Rollback Procedure

### Quick Rollback (Environment Variable)

If using Option 2 (Hybrid Approach):

```bash
# Disable method cache
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"
# Add: USE_METHOD_CACHE=false

# Restart
pm2 restart alfalyzer --update-env
```

---

### Full Rollback (Git Revert)

```bash
# Identify migration commit
git log --oneline | grep "method-level cache"

# Revert
git revert <commit-hash>

# Deploy
npm run deploy:full

# Verify
npm run smoke:prod:iv
```

---

## References

- [Method-Level Caching Architecture](/docs/METHOD_LEVEL_CACHING_ARCHITECTURE.md)
- [MethodCacheService Implementation](/server/services/method-cache-service.ts)
- [IV Chart Controller](/server/controllers/iv-chart-controller.ts)
- [FMP DCF Service](/server/services/fmp-dcf.ts)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Status:** Implementation Guide
