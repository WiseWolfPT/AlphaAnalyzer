# Technical Deep Dive: IV Cache Invalidation on Earnings Events

## Problem Statement

**Current Behavior:**
- Earnings events trigger invalidation of analyst estimate cache (`fmp:analyst:estimates:*`)
- IV method caches (`iv:method:*`) are NOT invalidated
- Users receive stale IV calculations for 24+ hours post-earnings

**Expected Behavior:**
- Both caches should be invalidated together
- IV methods should recalculate with fresh analyst data on next user request
- Users receive fresh IV within minutes of earnings

---

## Architecture: Multi-Tier Cache System

### Tier 1: Analyst Estimates Cache
```
Key Pattern: fmp:analyst:estimates:{SYMBOL}
Source: FMP API /api/v3/analyst-estimates/{symbol}
TTL: 86400s (24h)
Service: fmp-analyst-service.ts
Responsibility: Stores analyst consensus on EPS/revenue growth
Used By: Valuation calculations (DCF, DDM, PEG, etc.)
Invalidated: YES (on earnings) ✅
```

### Tier 2: IV Method Cache
```
Key Pattern: iv:method:{SYMBOL}:{METHOD_ID}
Source: valuationService.calculateX() methods
TTL: 86400s (24h)
Service: method-cache-service.ts
Responsibility: Caches calculated intrinsic values
Used By: Frontend IV endpoint (/api/iv/{ticker}/chart)
Invalidated: NO (on earnings) ❌
```

### Tier 3: Redis Quote Cache
```
Key Pattern: quote:{SYMBOL} (and variations)
Source: Market data APIs (Alpha Vantage, Finnhub, FMP, Polygon)
TTL: 60s (1m)
Service: simple-cache-service.ts
Responsibility: Real-time stock prices
Used By: IV calculations, portfolio values, market data endpoint
Invalidated: On TTL expiry only (acceptable for prices)
```

---

## Data Flow Analysis

### Scenario: AAPL Earnings Announcement (2025-11-03)

**T+0min: Earnings Released**
```
Event: AAPL Q4 2025 earnings announced
Market Data Updates:
  - New stock price published
  - Analyst estimates updated in FMP
  - Options implied volatility changes
  - Revenue guidance updated
```

**T+5min: FMP Calendar Updated**
```
FMP Earnings Calendar:
  - /api/v3/earnings_calendar shows AAPL with today's date
  - Includes reported EPS and guidance
```

**T+60min: Earnings Monitor Detects Event (Every Hour Cycle)**
```
earnings-monitor.ts runCycle() executes:

1. fetchEarningsCalendar(from, to)
   └─ API: /api/v3/earnings_calendar?from=2025-11-01&to=2025-11-03
   └─ Finds: { symbol: 'AAPL', date: '2025-11-03', ... }

2. shouldRefreshCache(event)
   └─ Checks: date is within 48h lookback? YES ✅
   └─ Returns: true

3. processEarningsEvent(event)
   └─ Calls: invalidateCache('AAPL')
   └─ Action 1: redis.del('fmp:analyst:estimates:AAPL') ✅
   └─ Action 2: (MISSING) methodCacheService.invalidateAllMethods('AAPL')
   └─ Calls: warmCache('AAPL')
   └─ Fetches: Fresh analyst estimates from FMP
   └─ Stores: fmp:analyst:estimates:AAPL with fresh data ✅
```

**T+61min: User Requests IV for AAPL**
```
Frontend Request:
  GET /api/iv/AAPL/chart

Backend Processing:
  1. iv-chart-controller.getChart('AAPL')
  2. For each method in [12 methods]:
     a. methodCacheService.getMethod('AAPL', method)
     b. Cache hit? Return cached result ❌ (STALE - uses old analyst data)
     c. Cache miss? Recalculate (would use fresh analyst data) ✅

Current Behavior: ALWAYS cache hit (cache not invalidated)
Result: User sees old IV based on pre-earnings analysts ❌

Expected Behavior: Cache miss on first request
Result: User sees fresh IV within ~5-10 seconds ✅
```

**T+24h: Cache Natural Expiry**
```
After 24h TTL expires:
  - Old iv:method:AAPL:* keys auto-expire
  - Next user request recalculates with fresh analyst data
  - User finally sees updated IV ✅ (but 24h late)
```

---

## Code Flow: Invalidation Chain

### Current (Broken) Flow

```
Earnings Event Detected
    │
    └─→ shouldRefreshCache()
        │
        └─→ true (earnings within 48h)
            │
            └─→ invalidateCache(symbol)
                │
                ├─→ redis.del('fmp:analyst:estimates:AAPL')  ✅
                │   └─ Fresh data fetched on warmCache()
                │
                └─→ (END OF FUNCTION)
                    ❌ NO IV METHOD INVALIDATION
                    ❌ NO METHOD CACHE CLEARING
                    ❌ NO INVALIDATEALLMETHODS() CALL
                    │
                    └─→ User sees STALE IV
                        └─ Based on old analyst consensus
                        └─ For up to 24 hours
```

### Fixed Flow

```
Earnings Event Detected
    │
    └─→ shouldRefreshCache()
        │
        └─→ true (earnings within 48h)
            │
            └─→ invalidateCache(symbol)
                │
                ├─→ redis.del('fmp:analyst:estimates:AAPL')  ✅
                │
                ├─→ methodCacheService.invalidateAllMethods('AAPL')  ✅
                │   ├─ Gets: redis.keys('iv:method:AAPL:*')
                │   └─ Deletes: All matching keys (12 methods)
                │
                └─→ (END OF FUNCTION)
                    └─→ warmCache(symbol)
                        ├─ Fetches fresh analyst estimates
                        └─ On next user request:
                           ├─ Cache miss for all IV methods
                           ├─ Recalculates with fresh analysts
                           └─ User sees FRESH IV ✅
```

---

## Methods Depending on Analyst Estimates

### Direct Dependency (Use Analyst Data Directly)

| Method | Uses | Impact |
|--------|------|--------|
| `dcf-fcf-20` | Growth rate, FCF projections | HIGH - Growth essential for NPV |
| `dcf-terminal-fcf` | Terminal growth rate | HIGH - Terminal value critical |
| `growth-dcf-8y` | 8Y growth projections | HIGH - Core growth metric |
| `peg` | P/E to Growth | HIGH - Growth rate in denominator |
| `psg` | P/S to Growth | HIGH - Growth rate in denominator |
| `ddm` | Dividend growth rate | HIGH - Dividend projections |

### Indirect Dependency (Affects Multiples)

| Method | Uses | Impact |
|--------|------|--------|
| `pe-mean` | Historical P/E mean (affected by growth changes) | MEDIUM |
| `pe-mean-without-nri` | P/E without non-recurring items | MEDIUM |
| `ps-mean` | Historical P/S mean | MEDIUM |
| `pb-mean` | Historical P/B mean | MEDIUM |
| `pb-mean-without-nri` | P/B without NRI | MEDIUM |
| `dni-20` | Long-term earnings growth | MEDIUM |

### Potentially Affected (Review Needed)

| Method | Status | Note |
|--------|--------|------|
| `alfa-value` | LIKELY | Proprietary - needs review |
| `p-tbv-mean` | MAYBE | Bank valuations - unclear |
| `p-tbv-sector` | MAYBE | Sector-relative - unclear |
| `ffo-reit` | MAYBE | REIT metrics - unclear |
| `affo-reit` | MAYBE | REIT metrics - unclear |
| `p-ffo-mean` | MAYBE | REIT multiples - unclear |
| `p-ffo-sector` | MAYBE | REIT multiples - unclear |
| `dividend-yield-reit` | MAYBE | Dividend-based - unclear |

**Action:** Conservative approach: invalidate ALL methods. Cost is minimal (cache miss on next request), benefit is high (no stale IV).

---

## Performance Impact Analysis

### Cache Operations Performance

**Current (Broken):**
- Analyst cache: 1 DEL operation per earnings event
- IV method cache: 0 operations per earnings event
- User request response time: <100ms (cache hit)
- Calculation time: N/A (served from cache)

**After Fix:**
- Analyst cache: 1 DEL operation per earnings event
- IV method cache: 12 DEL operations per earnings event
- User request response time: 2-5 seconds (cache miss → recalculation)
- Calculation time: 1-4 seconds per method

### Bandwidth Impact

**Current:**
- Analyst data: ~30KB per estimate (1x per earnings)
- IV calculations: Use cached analyst data (no FMP calls)

**After Fix:**
- Analyst data: ~30KB per estimate (1x per earnings)
- IV calculations: No change (methods still 24h TTL after fresh calc)
- Additional FMP calls: ~0 (methods don't call FMP directly)
- Additional CPU: ~50-100ms per ticker per cycle

### Expected Load Impact

**Worst Case: Earnings Season**
- Earnings per day: ~50 stocks
- IV methods per stock: 12
- Cache misses generated: 50 × 12 = 600 misses
- Recalculation time: 600 × 2s = 1200s = 20 minutes distributed
- Peak load: 5-10 concurrent recalculations (manageable)

**Mitigation:** Cache miss storms handled by `inFlightRequests` Map in methodCacheService (line 36).

---

## Dependencies & Imports

### Required Import
```typescript
import { methodCacheService } from '../services/method-cache-service';
```

**Location in earnings-monitor.ts:**
- Add after line 26 (after `fmpRateLimiter` import)
- Before line 28 (before config loading)

**Available Methods:**
```typescript
methodCacheService.invalidateMethod(ticker, methodId)         // Single method
methodCacheService.invalidateAffectedMethods(ticker, methods) // List of methods
methodCacheService.invalidateAllMethods(ticker)               // All 12 methods
```

---

## Testing Strategy

### Unit Test: Invalidation Function

```typescript
// test-earnings-invalidation.ts
import { methodCacheService } from '../services/method-cache-service';
import * as earningsMonitor from '../workers/earnings-monitor';

describe('Earnings Monitor - Cache Invalidation', () => {
  it('should invalidate analyst and IV caches on earnings', async () => {
    const symbol = 'AAPL';

    // Setup: Add test data to cache
    await methodCacheService.setMethod(symbol, 'pe-mean', {
      intrinsicValue: 180.50,
      method: 'pe-mean'
    });

    // Execute: Trigger invalidation
    await invalidateCache(symbol);

    // Verify: Cache cleared
    const cached = await methodCacheService.getMethod(symbol, 'pe-mean');
    expect(cached).toBeNull();
  });
});
```

### Integration Test: Full Earnings Cycle

```typescript
// test-earnings-full-cycle.ts
describe('Earnings Monitor - Full Cycle', () => {
  it('should process earnings and refresh both caches', async () => {
    // Verify: Pre-earnings state
    const beforeAnalyst = await redis.get('fmp:analyst:estimates:AAPL');
    const beforeIV = await methodCacheService.getMethod('AAPL', 'pe-mean');

    // Execute: Simulate earnings event
    const event = {
      symbol: 'AAPL',
      date: new Date().toISOString().split('T')[0],
      // ... other fields
    };
    const result = await processEarningsEvent(event);

    // Verify: Caches cleared
    const afterAnalyst = await redis.get('fmp:analyst:estimates:AAPL');
    const afterIV = await methodCacheService.getMethod('AAPL', 'pe-mean');

    expect(afterAnalyst).not.toEqual(beforeAnalyst); // Refreshed
    expect(afterIV).toBeNull(); // Invalidated
    expect(result.invalidated).toBe(true);
  });
});
```

### Production Validation

```bash
# Check logs after earnings event
pm2 logs earnings-monitor --lines 200 | grep -E "(IV method|invalidated|warmed)"

# Compare Redis keys before/after
before=$(redis-cli -a alfalyzer2025redis KEYS "iv:method:AAPL:*" | wc -l)
# ... trigger earnings event ...
after=$(redis-cli -a alfalyzer2025redis KEYS "iv:method:AAPL:*" | wc -l)
echo "Keys reduced from $before to $after"
```

---

## Error Handling

### Scenarios

1. **methodCacheService Import Fails**
   - Error: Module not found
   - Impact: Worker crashes on startup
   - Recovery: Fix import path, rebuild, redeploy

2. **invalidateAllMethods Throws Exception**
   - Current: Caught by invalidateCache try-catch
   - Result: Returns false, analyst cache invalidated, IV cache not
   - Recovery: Automatic (next earnings cycle retries)

3. **Redis Connection Lost**
   - Current: Both invalidations fail
   - Result: Stale analyst AND IV caches
   - Recovery: Worker retries on next cycle, Redis connection restored

4. **FMP API Timeout (After Invalidation)**
   - Current: Analyst cache cleared but not refreshed
   - Result: IV methods recalculate with MISSING analyst data (null)
   - Recovery: Analyst cache stores null/empty, IV cache queries handle gracefully

### Defensive Coding

The existing invalidateCache try-catch already handles method invalidation errors:

```typescript
try {
  // Both analyst and IV cache invalidation happens here
  const redis = await getRedisCacheService();
  const cacheKey = `fmp:analyst:estimates:${symbol}`;
  await redis.del(cacheKey);

  await methodCacheService.invalidateAllMethods(symbol);

  logger.info('[EarningsMonitor] All caches invalidated', { symbol });
  return true;
} catch (error: any) {
  // If EITHER invalidation fails, entire operation fails
  // This is acceptable - retry on next cycle
  logger.error('[EarningsMonitor] Cache invalidation failed', {
    symbol,
    error: error.message
  });
  return false;
}
```

---

## Performance Characteristics

### Invalidation Time

```
invalidateAllMethods(symbol) timing:
├─ redis.keys('iv:method:AAPL:*')  : ~1-5ms (pattern scan)
├─ redis.del(key1)                 : ~0.1ms × 12 = 1.2ms
├─ Promise.allSettled()            : ~2-10ms (parallel)
└─ Total                          : ~5-20ms per stock

Per earnings cycle (50 stocks):
├─ 50 × 20ms = 1 second total
└─ Negligible vs FMP API calls (50 × 1 second each)
```

### Cache Miss Handling

```
User request after earnings (cache miss):
├─ methodCacheService.getMethod()  : ~1ms (cache hit)
├─ not cached, so:
├─ calculateMethod(ticker, method)  : 1-4 seconds
│  ├─ valuationService.calculate()  : 500-3000ms
│  └─ Analyst data from Redis       : ~1ms
├─ setMethod() to cache             : ~1-5ms
└─ Response to user                : 2-5 seconds
```

---

## Observability & Monitoring

### Logs to Track

**Success Scenario:**
```
2025-11-03T14:05:29Z [EarningsMonitor] Analyst cache invalidated { symbol: AAPL }
2025-11-03T14:05:29Z [EarningsMonitor] IV method caches invalidated { symbol: AAPL, methodsCount: 12 }
2025-11-03T14:05:30Z [EarningsMonitor] Cache warmed { symbol: AAPL, estimates: 5 }
```

**Error Scenario:**
```
2025-11-03T14:05:29Z [EarningsMonitor] Cache invalidation failed { symbol: AAPL, error: "ECONNREFUSED" }
```

### Metrics to Track

```javascript
// Add to methodCacheService.invalidateAllMethods():
const invalidationStart = Date.now();
const keysToDelete = await redis.keys(pattern);
// ... perform deletion ...
const invalidationTime = Date.now() - invalidationStart;

logger.info('[MethodCache] Invalidation complete', {
  ticker: upperTicker,
  methodsDeleted: keysToDelete.length,
  durationMs: invalidationTime,
  status: keysToDelete.length > 0 ? 'invalidated' : 'no_keys'
});
```

---

## Rollback Plan

### If Issues Occur Post-Deployment

**Quick Rollback (5 minutes):**
```bash
# 1. Edit earnings-monitor.ts
nano server/workers/earnings-monitor.ts

# 2. Remove methodCacheService import (line 27)
# 3. Revert invalidateCache() to original (lines 230-245)

# 4. Rebuild and redeploy
npm run build:server
npm run deploy:server

# 5. Restart
ssh root@128.140.45.28 "pm2 restart earnings-monitor"

# 6. Verify
ssh root@128.140.45.28 "pm2 logs earnings-monitor --lines 20 | grep -i error"
```

**Expected Behavior After Rollback:**
- Analyst caches still invalidated ✅
- IV caches NOT invalidated (back to original behavior)
- User sees stale IV for 24h post-earnings (original issue)

---

## Related Code References

### Method Cache Service (Source of Truth)
- File: `/server/services/method-cache-service.ts`
- Key Methods:
  - `invalidateMethod()` - Single method (line 230)
  - `invalidateAllMethods()` - All 12 methods (line 245)
  - `invalidateAffectedMethods()` - Selective methods (line 278)

### Earnings Monitor (To Be Fixed)
- File: `/server/workers/earnings-monitor.ts`
- Function: `invalidateCache()` (line 230)
- Function: `processEarningsEvent()` (line 303)

### Valuation Service (Uses Cached Methods)
- File: `/server/services/valuation-service.ts`
- Methods: `calculatePEMean5Y()`, `calculateDCF()`, etc.

### FMP Analyst Service (Source of Analyst Data)
- File: `/server/services/fmp-analyst-service.ts`
- Method: `getAnalystEstimates()` (source of estimates)

---

## Summary

This fix closes a critical gap in the cache invalidation strategy by ensuring both analyst estimate and IV method caches are cleared on earnings events. The implementation is straightforward, low-risk, and provides immediate user value through fresh IV calculations post-earnings.
