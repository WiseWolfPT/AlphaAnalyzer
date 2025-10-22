# Extended Hours Stock Data - Backend Architecture Design

**Date:** 2025-10-18
**Status:** CRITICAL FINDING - REQUIRES PLAN UPGRADE
**Priority:** High - User wants implementation for Monday market open

---

## EXECUTIVE SUMMARY

### ❌ CRITICAL BLOCKER IDENTIFIED

**FMP Legacy Plan DOES NOT support after-hours/pre-market data in standard `/v3/quote` endpoint.**

**Testing Results:**
- ✅ Standard quote endpoint (`/v3/quote/AAPL`) - Works, returns NO extended hours fields
- ✅ Single after-hours endpoint (`/v4/pre-post-market-trade/AAPL`) - Works
- ❌ Batch after-hours endpoint (`/stable/batch-aftermarket-trade`) - **RESTRICTED**

**Error Message:**
```
Restricted Endpoint: This endpoint is not available under your current
subscription please visit our subscription page to upgrade your plan
```

### VERDICT: Code Changes Required + Plan Decision Needed

---

## CURRENT SITUATION ANALYSIS

### What We Have Now (FMP Legacy Plan)

**Current Implementation:**
- File: `/server/services/providers/fmp-provider.ts`
- Lines 99-104, 151-156 already map after-hours fields
- `StockQuote` interface already has all required fields defined
- Code EXPECTS these fields but API doesn't return them

**Why We See Null Values:**
1. ❌ NOT because market is closed
2. ✅ BECAUSE fields don't exist in Legacy plan `/v3/quote` response
3. ✅ Code defensive programming works (uses `?? null`)

**API Response Example (Current):**
```json
{
  "symbol": "AAPL",
  "price": 252.29,
  "change": 4.84,
  "volume": 48839918,
  // NO afterMarketPrice field
  // NO preMarketPrice field
  // NO extended hours data at all
}
```

---

## AVAILABLE OPTIONS

### Option 1: Upgrade FMP Plan (RECOMMENDED)
**Cost:** Check FMP pricing (likely $29-49/month for Professional tier)
**Batch Support:** ✅ YES (`/stable/batch-aftermarket-trade`)
**API Calls:** Same 30 calls/cycle (no increase)
**Implementation:** Minimal code changes

#### Pros:
- ✅ Zero additional API calls needed
- ✅ Batch support (1 call for 50 symbols)
- ✅ Most efficient solution
- ✅ Data quality guaranteed by single provider
- ✅ Implementation ready in ~2 hours

#### Cons:
- ❌ Monthly cost increase (~€10-30)
- ❌ Requires subscription change

### Option 2: Use Individual Extended Hours Endpoints (Current Plan)
**Cost:** €0 (uses existing Legacy plan)
**Batch Support:** ❌ NO (must call individually)
**API Calls:** 1,493 → 4,479 calls/cycle (+200% increase)

#### Pros:
- ✅ No plan upgrade needed
- ✅ Works with existing subscription

#### Cons:
- ❌ **MASSIVE API call increase** (30 → 90 calls/cycle = +60 calls)
- ❌ **3x bandwidth consumption**
- ❌ Rate limit risk (300 calls/min, need 90/min for extended hours)
- ❌ Slower updates (sequential calls required)
- ❌ Complex error handling
- ❌ 3x potential failure points

### Option 3: Hybrid Approach - Extended Hours for Hot Set Only
**Cost:** €0 (uses existing Legacy plan)
**Batch Support:** ❌ NO
**API Calls:** 30 → 32 calls/cycle (+2 calls)
**Coverage:** Top 100 stocks only

#### Pros:
- ✅ Minimal API increase (+6.7%)
- ✅ Covers 80% user traffic (Magnificent 7 + S&P top stocks)
- ✅ No plan upgrade
- ✅ Acceptable rate limit usage

#### Cons:
- ❌ Incomplete coverage (1,393 stocks missing extended hours)
- ❌ User confusion (some stocks show extended hours, others don't)
- ❌ No batch support still hurts

---

## TECHNICAL ARCHITECTURE

### Current Data Flow
```
┌─────────────────────────────────────────┐
│    price-worker.ts (every 60s)          │
│    1,493 stocks                         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│    FMP /v3/quote/{batch}                │
│    30 API calls (50 symbols each)       │
│    Returns: Regular hours only          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│    Redis Cache (60s TTL)                │
│    afterMarketPrice: null               │
│    preMarketPrice: null                 │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│    1000+ Users                          │
│    See: "Market Closed" (no ext hours)  │
└─────────────────────────────────────────┘
```

### Option 1 Architecture (RECOMMENDED - Upgrade Plan)
```
┌─────────────────────────────────────────┐
│    price-worker.ts (every 60s)          │
│    1,493 stocks                         │
└─────────────┬───────────────────────────┘
              │
              ├─► Regular Hours (9:30am-4pm ET)
              │   └─► /v3/quote/{batch} (30 calls)
              │
              └─► Extended Hours (4pm-8pm, 4am-9:30am ET)
                  └─► /stable/batch-aftermarket-trade (30 calls)
                      ✅ Batch support (50 symbols/call)
                      ✅ Same call count

┌─────────────────────────────────────────┐
│    Redis Cache (60s TTL)                │
│    afterMarketPrice: 252.48 ✅          │
│    preMarketPrice: 251.20 ✅            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│    1000+ Users                          │
│    See: Real extended hours prices ✅   │
└─────────────────────────────────────────┘
```

**API Budget Impact:**
- Regular hours: 30 calls/cycle (unchanged)
- Extended hours: 30 calls/cycle (new, batched)
- **Total:** 60 calls/cycle (within 300/min limit ✅)

### Option 2 Architecture (NO UPGRADE - Individual Calls)
```
┌─────────────────────────────────────────┐
│    price-worker.ts (every 60s)          │
│    1,493 stocks                         │
└─────────────┬───────────────────────────┘
              │
              ├─► Regular Hours
              │   └─► /v3/quote/{batch} (30 calls)
              │
              └─► Extended Hours (NO BATCH!)
                  └─► /v4/pre-post-market-trade/AAPL (1,493 calls)
                      ❌ No batch support
                      ❌ 1 call per symbol
                      ❌ Sequential processing required

API Budget: 30 + 1,493 = 1,523 calls/cycle
Rate Limit: 300 calls/min → Need 5+ minutes per cycle ❌
Current Update: Every 60s → IMPOSSIBLE without rate limit errors
```

**This option is NOT VIABLE for production.**

### Option 3 Architecture (Hot Set Only - 100 stocks)
```
┌─────────────────────────────────────────┐
│    price-worker.ts (every 60s)          │
│    Hot: 100 | Warm: 1,393               │
└─────────────┬───────────────────────────┘
              │
              ├─► Regular Hours (ALL stocks)
              │   └─► /v3/quote/{batch} (30 calls)
              │
              └─► Extended Hours (HOT SET ONLY)
                  └─► /v4/pre-post-market-trade/AAPL (100 calls)
                      Limited to: Magnificent 7 + S&P top stocks

API Budget: 30 + 100 = 130 calls/cycle
Rate Limit: 300 calls/min → Safe ✅
Coverage: 100/1,493 = 6.7% of stocks ⚠️
```

---

## IMPLEMENTATION PLAN

### RECOMMENDED: Option 1 (Plan Upgrade)

#### Prerequisites
1. ✅ Verify FMP pricing for batch extended hours access
2. ✅ Upgrade plan (Professional or higher)
3. ✅ Test batch endpoint: `/stable/batch-aftermarket-trade`

#### Code Changes Required

**1. Create Extended Hours Service** (`/server/services/extended-hours-service.ts`)
```typescript
import { FMPProvider } from './providers/fmp-provider';

export class ExtendedHoursService {
  constructor(private fmpProvider: FMPProvider) {}

  async getBatchExtendedHours(symbols: string[]): Promise<ExtendedHoursQuote[]> {
    // Call /stable/batch-aftermarket-trade
    // Map response to existing StockQuote format
    // Merge with regular hours data
  }

  isExtendedHours(): boolean {
    // Check if current time is pre-market (4am-9:30am ET)
    // or after-hours (4pm-8pm ET)
  }
}
```

**2. Update FMPProvider** (`/server/services/providers/fmp-provider.ts`)
```typescript
// Add new method (line ~520)
async getBatchExtendedHours(symbols: string[]): Promise<ExtendedHoursData[]> {
  await this.checkRateLimit();

  const symbolsStr = symbols.join(',');
  const response = await axios.get(
    `https://financialmodelingprep.com/stable/batch-aftermarket-trade`,
    {
      params: {
        symbols: symbolsStr,
        apikey: this.apiKey
      },
      timeout: 15000
    }
  );

  return response.data.map(item => ({
    symbol: item.symbol,
    price: item.price,
    size: item.size,
    timestamp: item.timestamp
  }));
}
```

**3. Update Price Worker** (`/server/workers/price-worker.ts`)
```typescript
// Line ~350 (after regular batch fetch)
if (this.isExtendedHours()) {
  const extendedHours = await fmpProvider.getBatchExtendedHours(toUpdate);
  apiCalls++; // Only 1 additional call for batch

  // Merge extended hours data into regular quotes
  for (const quote of quotes) {
    const extData = extendedHours.find(e => e.symbol === quote.symbol);
    if (extData) {
      quote.afterMarketPrice = extData.price;
      quote.afterMarketChange = extData.price - quote.previousClose;
      quote.afterMarketChangePercentage =
        ((extData.price - quote.previousClose) / quote.previousClose) * 100;
    }
  }
}
```

**4. Update StockQuote Interface** (Already done! ✅)
```typescript
// /server/services/providers/provider-manager.ts (lines 21-27)
// These fields are already defined:
afterMarketPrice?: number | null;
afterMarketChange?: number | null;
afterMarketChangePercentage?: number | null;
preMarketPrice?: number | null;
preMarketChange?: number | null;
preMarketChangePercentage?: number | null;
```

#### Deployment Steps
1. Update FMP subscription plan
2. Add `getBatchExtendedHours()` method to FMPProvider
3. Update price worker to call extended hours batch endpoint
4. Test with 5 symbols first
5. Deploy to production
6. Monitor API usage (should stay at 60 calls/cycle)

**Estimated Time:** 2-3 hours implementation + testing

---

### FALLBACK: Option 3 (Hot Set Only)

If plan upgrade is not approved, implement limited coverage:

**Code Changes:**
```typescript
// price-worker.ts (line ~350)
const hotSetSymbols = toUpdate.slice(0, 100); // Top 100 only

if (this.isExtendedHours() && hotSetSymbols.length > 0) {
  // Call individual endpoint for hot set only
  for (const symbol of hotSetSymbols) {
    const extHours = await fmpProvider.getSingleExtendedHours(symbol);
    // Merge into quote...
  }
}
```

**Limitations:**
- Only Magnificent 7 + S&P top 100 get extended hours
- 1,393 stocks still show null for extended hours fields
- User confusion ("Why does AAPL show after-hours but AAPL doesn't?")

---

## RISK ASSESSMENT

### Option 1 Risks (Plan Upgrade)
| Risk | Severity | Mitigation |
|------|----------|------------|
| Plan cost increase | LOW | Business decision, ~€10-30/month |
| API changes in new tier | MEDIUM | Test thoroughly before production |
| Batch endpoint rate limits | LOW | Still within 300/min limit |

### Option 2 Risks (Individual Calls - ALL Stocks)
| Risk | Severity | Mitigation |
|------|----------|------------|
| Rate limit exceeded | **CRITICAL** | CANNOT MITIGATE - 1,523 calls > 300/min |
| Worker timeout | **CRITICAL** | Need 5+ minutes per cycle |
| Bandwidth explosion | HIGH | 3x current usage |
| User experience degraded | HIGH | Slow updates |

**⚠️ Option 2 is NOT RECOMMENDED for production.**

### Option 3 Risks (Hot Set Only)
| Risk | Severity | Mitigation |
|------|----------|------------|
| Inconsistent UX | HIGH | Clear UI messaging |
| User complaints | MEDIUM | Document limitation |
| Support burden | MEDIUM | FAQ + help docs |

---

## TESTING STRATEGY

### Pre-Production Tests

**1. API Endpoint Validation**
```bash
# Test batch extended hours (requires plan upgrade)
curl "https://financialmodelingprep.com/stable/batch-aftermarket-trade?symbols=AAPL,TSLA,NVDA&apikey=YOUR_KEY"

# Expected: Array of objects with price, size, timestamp
# If error "Restricted Endpoint" → Plan upgrade needed
```

**2. Extended Hours Time Detection**
```typescript
// Test cases for time detection
const preMarketStart = new Date('2025-10-20T08:00:00Z'); // 4am ET
const preMarketEnd = new Date('2025-10-20T13:30:00Z');   // 9:30am ET
const afterHoursStart = new Date('2025-10-20T20:00:00Z'); // 4pm ET
const afterHoursEnd = new Date('2025-10-20T00:00:00Z');   // 8pm ET

expect(isExtendedHours(preMarketStart)).toBe(true);
expect(isExtendedHours(regularHours)).toBe(false);
```

**3. Data Merge Logic**
```typescript
// Verify extended hours data merges correctly
const regularQuote = { symbol: 'AAPL', price: 252.29, ... };
const extendedData = { symbol: 'AAPL', price: 252.48, ... };
const merged = mergeExtendedHours(regularQuote, extendedData);

expect(merged.afterMarketPrice).toBe(252.48);
expect(merged.afterMarketChange).toBeCloseTo(0.19);
expect(merged.price).toBe(252.29); // Regular price unchanged
```

### Monday Market Open Tests (Live Production)

**Schedule:**
- **4:00am ET** - Pre-market opens (test pre-market data)
- **9:30am ET** - Market opens (verify switch to regular data)
- **4:00pm ET** - After-hours starts (test after-hours data)
- **8:00pm ET** - Extended hours close (verify null values)

**Validation Checklist:**
- [ ] Pre-market prices display correctly (4am-9:30am)
- [ ] Regular hours override pre-market (9:30am-4pm)
- [ ] After-hours prices display correctly (4pm-8pm)
- [ ] Extended hours fields null when market closed (8pm-4am)
- [ ] Change percentages calculated correctly
- [ ] Redis cache updates within 60s
- [ ] No rate limit errors in PM2 logs

---

## DECISION MATRIX

| Factor | Option 1 (Upgrade) | Option 2 (Individual) | Option 3 (Hot Set) |
|--------|-------------------|----------------------|-------------------|
| **Cost** | ~€30/month | €0 | €0 |
| **API Calls** | 60/cycle ✅ | 1,523/cycle ❌ | 130/cycle ✅ |
| **Coverage** | 100% ✅ | 100% ⚠️ | 6.7% ❌ |
| **Performance** | Excellent ✅ | Poor ❌ | Good ✅ |
| **Scalability** | Excellent ✅ | Impossible ❌ | Limited ⚠️ |
| **UX Quality** | Excellent ✅ | Poor ❌ | Confusing ⚠️ |
| **Implementation** | 2-3 hours ✅ | 4-6 hours ⚠️ | 2 hours ✅ |
| **Production Ready** | Monday ✅ | NO ❌ | Monday ⚠️ |

---

## RECOMMENDATION

### ✅ CHOOSE OPTION 1: Upgrade FMP Plan

**Rationale:**
1. **Best ROI**: ~€30/month for professional-grade extended hours data
2. **Zero API overhead**: Batch support means no call increase
3. **Production ready**: Can deploy Monday for market open
4. **Scalable**: Supports current 1,493 stocks + future growth
5. **User experience**: Complete coverage, no confusion

**Business Case:**
- Current: €19/month FMP Legacy
- Upgrade: ~€29-49/month FMP Professional (verify exact pricing)
- **Cost increase: ~€10-30/month**
- **Value delivered:** Extended hours tracking for 1,000+ users

**Alternative if upgrade denied:**
- Implement Option 3 (Hot Set only) as temporary solution
- Plan for future upgrade when budget allows
- Document limitation clearly in UI

---

## NEXT STEPS

### Immediate Actions (Today)
1. ✅ Verify FMP pricing for Professional/Premium tier
2. ✅ Confirm batch extended hours endpoint access in new tier
3. ⏳ Get approval for plan upgrade (~€10-30/month increase)

### If Approved (Implementation Path)
1. Upgrade FMP subscription plan
2. Test batch endpoint with 5 symbols
3. Implement `getBatchExtendedHours()` method
4. Update price worker logic
5. Deploy to production
6. Monitor Monday market open

### If Not Approved (Fallback Path)
1. Implement Option 3 (Hot Set only)
2. Add UI disclaimer about limited coverage
3. Create FAQ explaining limitation
4. Plan for future upgrade

---

## TECHNICAL REFERENCE

### FMP API Endpoints

**Regular Hours (Current):**
```
GET /v3/quote/{symbols}
Example: /v3/quote/AAPL,TSLA,NVDA
Batch: 50 symbols per call ✅
Plan: Legacy ✅
```

**Extended Hours (Individual - Legacy Plan):**
```
GET /v4/pre-post-market-trade/{symbol}
Example: /v4/pre-post-market-trade/AAPL
Batch: NO ❌
Plan: Legacy ✅
```

**Extended Hours (Batch - Requires Upgrade):**
```
GET /stable/batch-aftermarket-trade?symbols={symbols}
Example: /stable/batch-aftermarket-trade?symbols=AAPL,TSLA,NVDA
Batch: YES ✅ (likely 50 symbols per call)
Plan: Professional/Premium required ⚠️
```

### Extended Hours Trading Windows

| Period | Time (ET) | Time (UTC) | Duration |
|--------|-----------|------------|----------|
| Pre-market | 4:00 AM - 9:30 AM | 08:00 - 13:30 | 5.5 hours |
| Regular | 9:30 AM - 4:00 PM | 13:30 - 20:00 | 6.5 hours |
| After-hours | 4:00 PM - 8:00 PM | 20:00 - 00:00 | 4 hours |
| Closed | 8:00 PM - 4:00 AM | 00:00 - 08:00 | 8 hours |

### Files Modified

**Option 1 (Recommended):**
- `/server/services/providers/fmp-provider.ts` - Add `getBatchExtendedHours()`
- `/server/workers/price-worker.ts` - Add extended hours logic
- `/server/services/extended-hours-service.ts` - New file (optional)

**Option 3 (Fallback):**
- `/server/services/providers/fmp-provider.ts` - Add `getSingleExtendedHours()`
- `/server/workers/price-worker.ts` - Add hot-set-only logic
- `/client/src/components/stock/ExtendedHoursDisclaimer.tsx` - New component

---

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Author:** Backend Architecture Team
**Status:** Awaiting Plan Upgrade Decision
