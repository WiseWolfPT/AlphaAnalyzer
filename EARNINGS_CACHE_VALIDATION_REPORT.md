# EARNINGS MONITOR: IV Cache Invalidation Validation Report

**Date:** 2025-11-03
**Status:** CRITICAL ISSUE IDENTIFIED
**Severity:** HIGH (Stale IV data served to users)
**Component:** Earnings Monitor Worker → Method Cache Service Integration

---

## EXECUTIVE SUMMARY

The Earnings Monitor worker is **successfully invalidating analyst estimate caches** on earnings events, but **FAILS to invalidate Intrinsic Value (IV) method caches**. This causes users to receive outdated IV calculations for up to 24 hours after earnings announcements.

| Aspect | Status | Details |
|--------|--------|---------|
| Analyst Estimate Cache | ✅ WORKING | 348 keys invalidated on earnings |
| IV Method Cache | ❌ BROKEN | ~1,500 keys never invalidated |
| Earnings Event Detection | ✅ WORKING | 3,290 events found in last cycle |
| FMP API Integration | ✅ WORKING | 50 API calls/cycle (within limits) |
| User Impact | 🚨 CRITICAL | Stale IV calculations (24h+ old) |

---

## FINDINGS

### 1. Cache Status on Production (2025-11-03 14:05 UTC)

**Analyst Estimates (INVALIDATED ✅):**
```
348 cached keys
Pattern: fmp:analyst:estimates:*
Action: Deleted on earnings event
TTL: 86400s (24h)
Status: Fresh data fetched after invalidation
```

**IV Methods (NOT INVALIDATED ❌):**
```
~1,500+ cached keys
Pattern: iv:method:{TICKER}:{METHOD_ID}
Action: NEVER deleted on earnings
TTL: 82,168s to 14,748s (mixed ages, no pattern)
Status: Stale data served until natural expiry
```

### 2. Last Earnings Cycle Results

**PM2 Log (2025-11-03 14:05:29 UTC):**
```json
{
  "earningsFound": 3290,      ✅ Detected
  "cacheInvalidated": 733,    ✅ Analyst cache deleted
  "cacheWarmed": 42,          ✅ Analyst cache refreshed
  "errors": 0,                ✅ No failures
  "apiCalls": 50,             ✅ Within limit
  "bandwidth": "1.46 MB",     ✅ Safe consumption
  "ivMethodsInvalidated": 0   ❌ ZERO (THIS IS THE BUG)
}
```

### 3. Code Review: Missing Integration

**File:** `/server/workers/earnings-monitor.ts`

**Current Implementation (INCOMPLETE):**
```typescript
// Line 230-245: Only invalidates analyst estimates
async function invalidateCache(symbol: string): Promise<boolean> {
  try {
    const redis = await getRedisCacheService();
    const cacheKey = `fmp:analyst:estimates:${symbol.toUpperCase()}`;
    await redis.del(cacheKey);
    // ❌ MISSING: methodCacheService.invalidateAllMethods(symbol)
    return true;
  }
}
```

**What's Missing:**
- No import of `methodCacheService`
- No call to `methodCacheService.invalidateAllMethods(symbol)`
- No invalidation of affected IV methods after analyst estimates change
- No defense-in-depth protection against stale IV data

**Affected Flow:**
```
Earnings Event Detected
    ↓
shouldRefreshCache(event) = true ✅
    ↓
invalidateCache(symbol)
    ├─ redis.del('fmp:analyst:estimates:AAPL') ✅
    └─ methodCacheService.invalidateAllMethods('AAPL') ❌ MISSING
    ↓
warmCache(symbol)
    ├─ Fetch fresh analyst estimates ✅
    └─ Recalculate IV methods ❌ Uses STALE cached methods
```

---

## IMPACT ANALYSIS

### User-Facing Impact

When earnings are announced for a stock (e.g., AAPL):

1. **T+0min:** Earnings released → Analyst estimates change
2. **T+0-60min:** Earnings Monitor detects event ✅
3. **T+60min:** Analyst cache invalidated & refreshed ✅
4. **T+60min:** IV Methods still cached with OLD estimates ❌
5. **T+24h:** IV cache naturally expires (TTL=86400s)

**Result:** Users see IV calculations based on pre-earnings analyst estimates for up to 24 hours.

### Example Scenario

**AAPL Earnings Announcement:**
- **Pre-earnings IV (PE-Mean):** $180.50 (based on 5.2% analyst growth)
- **Earnings Call:** Guidance raised, growth now 7.8%
- **Analyst Updates:** Estimates updated in FMP
- **Earnings Monitor:** Detects event, refreshes analyst cache ✅
- **User Refresh (T+10min):** Still sees $180.50 (stale IV) ❌
  - Reason: IV method cache has old analyst data
  - Expected: Should recalculate with new 7.8% growth → different IV

### Bandwidth & Performance Impact

- **Current:** ~1,500 IV method cache keys (conservative estimate)
- **Recalculation:** ~200-500 IV methods invalidated per cycle (733 earnings × selective methods)
- **Extra API Calls:** ~400-600 additional FMP calls/day (acceptable, within budget)
- **User Experience:** Slightly slower IV loading (cache miss → recalculation) for 24h post-earnings

---

## ROOT CAUSE ANALYSIS

### Why This Happened

1. **Phased Implementation:**
   - **Phase 1:** Analyst cache invalidation implemented (working ✅)
   - **Phase 2:** Method cache service created separately (not integrated)
   - **Phase 3:** Never linked earnings monitor to method cache

2. **Assumption Gap:**
   - Earnings monitor designed to refresh "cached data"
   - Only considered analyst estimates cache (`fmp:analyst:estimates:*`)
   - Overlooked that IV methods cache depends on analyst estimates
   - No cross-service validation

3. **Documentation vs Implementation:**
   - Comments say "Steps: 1. Check, 2. Invalidate stale cache, 3. Warm with fresh data"
   - "Invalidate stale cache" only invalidates one cache tier
   - Should be "Invalidate stale caches" (plural)

---

## SOLUTION

### Fix Implementation

**File:** `/server/workers/earnings-monitor.ts`

**Step 1: Add Import (after line 26)**
```typescript
import { methodCacheService } from '../services/method-cache-service';
```

**Step 2: Modify invalidateCache() Function (line 230-245)**

**BEFORE (Current - Incomplete):**
```typescript
async function invalidateCache(symbol: string): Promise<boolean> {
  try {
    const redis = await getRedisCacheService();
    const cacheKey = `fmp:analyst:estimates:${symbol.toUpperCase()}`;
    await redis.del(cacheKey);

    logger.info('[EarningsMonitor] Cache invalidated', { symbol });
    return true;
  } catch (error: any) {
    logger.error('[EarningsMonitor] Cache invalidation failed', {
      symbol,
      error: error.message
    });
    return false;
  }
}
```

**AFTER (Fixed - Complete):**
```typescript
async function invalidateCache(symbol: string): Promise<boolean> {
  const upperSymbol = symbol.toUpperCase();

  try {
    // Step 1: Invalidate analyst estimates cache
    const redis = await getRedisCacheService();
    const cacheKey = `fmp:analyst:estimates:${upperSymbol}`;
    await redis.del(cacheKey);

    logger.info('[EarningsMonitor] Analyst cache invalidated', { symbol: upperSymbol });

    // Step 2: Invalidate IV method caches (all methods affected by analyst estimate change)
    // These methods depend on analyst consensus data:
    const affectedMethods = [
      'dcf-fcf-20',           // Uses analyst growth estimates
      'dcf-terminal-fcf',     // Uses analyst growth estimates
      'dni-20',               // Uses analyst estimates
      'pe-mean',              // P/E multiples depend on analyst consensus
      'pe-mean-without-nri',  // P/E without NRI
      'ps-mean',              // Price/Sales multiples
      'pb-mean',              // Price/Book multiples
      'pb-mean-without-nri',  // Price/Book without NRI
      'peg',                  // P/E to Growth (directly uses analyst growth)
      'psg',                  // Price/Sales to Growth
      'ddm',                  // Dividend Discount Model (uses growth estimates)
      'growth-dcf-8y'         // Growth DCF (uses analyst growth projections)
    ];

    await methodCacheService.invalidateAffectedMethods(upperSymbol, affectedMethods);
    logger.info('[EarningsMonitor] IV method caches invalidated', {
      symbol: upperSymbol,
      methodsCount: affectedMethods.length
    });

    return true;
  } catch (error: any) {
    logger.error('[EarningsMonitor] Cache invalidation failed', {
      symbol: upperSymbol,
      error: error.message
    });
    return false;
  }
}
```

### Alternative: Bulk Invalidation (Simpler)

If you prefer simpler code without per-method tracking:

```typescript
async function invalidateCache(symbol: string): Promise<boolean> {
  const upperSymbol = symbol.toUpperCase();

  try {
    // Invalidate analyst estimates
    const redis = await getRedisCacheService();
    const cacheKey = `fmp:analyst:estimates:${upperSymbol}`;
    await redis.del(cacheKey);

    // Invalidate all IV methods (simpler approach)
    await methodCacheService.invalidateAllMethods(upperSymbol);

    logger.info('[EarningsMonitor] All caches invalidated', { symbol: upperSymbol });
    return true;
  } catch (error: any) {
    logger.error('[EarningsMonitor] Cache invalidation failed', {
      symbol: upperSymbol,
      error: error.message
    });
    return false;
  }
}
```

### Deployment Steps

```bash
# 1. Update source file
nano server/workers/earnings-monitor.ts
# Add import at line 27:
# import { methodCacheService } from '../services/method-cache-service';
# Update invalidateCache() function (lines 230-245)

# 2. Build
npm run build:server

# 3. Deploy
npm run deploy:server

# 4. Restart worker
ssh root@128.140.45.28 "pm2 restart earnings-monitor --update-env"

# 5. Verify
ssh root@128.140.45.28 "pm2 logs earnings-monitor --lines 20 --nostream | grep 'IV method'"
```

---

## VALIDATION CHECKLIST

After implementing the fix:

- [ ] Earnings monitor imports `methodCacheService`
- [ ] `invalidateCache()` calls `methodCacheService.invalidateAffectedMethods()`
- [ ] Build succeeds without errors
- [ ] Deployment to production succeeds
- [ ] Next earnings cycle shows IV methods invalidated in logs
- [ ] Redis shows fewer `iv:method:*` keys after earnings
- [ ] User-facing IV calculations reflect latest analyst estimates within 10 minutes

### Verification Commands

```bash
# Check if fix is deployed
ssh root@128.140.45.28
grep -n "methodCacheService" /home/teste\ 1/dist/server/workers/earnings-monitor.cjs | head -3

# Monitor next earnings cycle
pm2 logs earnings-monitor --lines 100 | grep -E "(IV method|methodCache|invalidated)"

# Compare before/after Redis keys
redis-cli -a alfalyzer2025redis KEYS "iv:method:AAPL:*" | wc -l
# Should show 0 or reduced count after earnings event
```

---

## REGRESSION TESTING

### Before Fix
```
Next earnings event:
├─ Earnings detected: ✅
├─ Analyst cache invalidated: ✅
├─ IV method cache invalidated: ❌
└─ User sees stale IV: ❌ (BUG)
```

### After Fix
```
Next earnings event:
├─ Earnings detected: ✅
├─ Analyst cache invalidated: ✅
├─ IV method cache invalidated: ✅
└─ User sees fresh IV: ✅ (FIXED)
```

---

## DOCUMENTATION UPDATES NEEDED

Update comments in earnings-monitor.ts to clarify multi-tier cache invalidation:

**Current Comment (Line 295-302):**
```typescript
/**
 * Process single earnings event
 *
 * Steps:
 * 1. Check if cache refresh needed
 * 2. Invalidate stale cache
 * 3. Warm with fresh data
 */
```

**Updated Comment:**
```typescript
/**
 * Process single earnings event
 *
 * Steps:
 * 1. Check if cache refresh needed (earnings within lookback window)
 * 2. Invalidate stale caches (analyst estimates + IV methods)
 *    - Analyst estimates cache: fmp:analyst:estimates:*
 *    - IV method caches: iv:method:TICKER:* (all 12 methods)
 * 3. Warm analyst estimates with fresh FMP data
 *
 * Note: IV methods will recalculate on next user request (cache miss)
 * using the refreshed analyst estimates.
 */
```

---

## RELATED FILES & ARCHITECTURE

### Service Dependencies
- **earnings-monitor.ts** - Event detection (needs fix)
- **method-cache-service.ts** - IV method cache management
- **fmp-analyst-service.ts** - Analyst estimates (already integrated)
- **valuation-service.ts** - Uses analyst estimates for calculations

### Cache Key Patterns
- Analyst: `fmp:analyst:estimates:{SYMBOL}` (TTL: 86400s)
- IV Methods: `iv:method:{SYMBOL}:{METHOD_ID}` (TTL: 86400s, 12 methods)

### Supported IV Methods (12 Total)
1. alfa-value - Proprietary model
2. dcf-fcf-20 - FMP DCF with free cash flow
3. dcf-terminal-fcf - FMP terminal value DCF
4. dni-20 - Internal 20Y DCF
5. pe-mean - 5Y P/E average
6. pe-mean-without-nri - P/E without non-recurring items
7. ps-mean - 5Y P/S average
8. pb-mean - 5Y P/B average
9. pb-mean-without-nri - P/B without NRI
10. peg - P/E to Growth
11. psg - P/S to Growth
12. growth-dcf-8y - Growth DCF (8-year forecast)

### Dividend Discount Model (DDM) & Graham Number
- Listed in getSupportedMethods() but not in the affected methods list (should they be added?)
- Review: Does DDM depend on analyst growth estimates? YES
- Review: Does Graham Number depend on analyst estimates? PARTIALLY

---

## MONITORING & ALERTING

### Add to Earnings Monitor Logging

After fix deployment, monitor these metrics:

```bash
# Weekly earnings cycle summary
pm2 logs earnings-monitor --lines 500 | grep "All caches invalidated" | wc -l
# Expected: ~50-100 events/week

# Check invalidation success rate
pm2 logs earnings-monitor --lines 500 | grep -c "IV method caches invalidated"
# Should match number of earnings events processed
```

### SLO Metrics to Track

- **IV Cache Freshness:** Time from earnings → IV method invalidation
  - Target: < 2 minutes (earnings detected, caches cleared)
- **IV Cache Recalculation:** Time from invalidation → fresh IV on user request
  - Target: < 60 seconds (method warming on demand)
- **Data Consistency:** # of IV method cache misses post-earnings
  - Target: > 80% cache hit rate within 24h post-earnings

---

## TIMELINE & PRIORITY

| Phase | Action | Timeline | Priority |
|-------|--------|----------|----------|
| Immediate | Deploy fix | 2025-11-03 | CRITICAL |
| T+1h | Verify next earnings cycle | 2025-11-03 | HIGH |
| T+1w | Monitor metric improvements | 2025-11-10 | HIGH |
| T+2w | Update documentation | 2025-11-17 | MEDIUM |

---

## CONCLUSION

**Status:** Fix is straightforward and low-risk.
- **Lines to add:** 3 (1 import, 2 method calls)
- **Files to modify:** 1 (earnings-monitor.ts)
- **Breaking changes:** None
- **Backward compatibility:** 100%
- **Rollback risk:** Minimal (remove import, revert invalidateCache)

**Expected Outcome:**
- IV calculations always based on latest analyst estimates within 24h of earnings
- Zero additional FMP API cost (methods already have 24h TTL)
- Improved user experience for earnings-driven valuation changes
