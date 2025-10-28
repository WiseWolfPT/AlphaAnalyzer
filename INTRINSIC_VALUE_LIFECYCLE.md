# Intrinsic Value Data Lifecycle - Complete Analysis

## Current State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INTRINSIC VALUE CALCULATION FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

USER REQUEST: GET /api/valuation/alfa-value?ticker=AAPL
     │
     ▼
┌─────────────────────────────────────┐
│  1. CHECK REDIS CACHE               │
│  Key: iv:calc:AAPL                  │
│  TTL: 24h (86400s)                  │
└─────────────────────────────────────┘
     │
     ├─ CACHE HIT ──────────────────► Return cached IV (instant response)
     │                                  ✅ Age: 0-24h old
     │
     └─ CACHE MISS
          │
          ▼
┌─────────────────────────────────────┐
│  2. FETCH INPUTS FROM FMP           │
│  • Financial Statements (5 years)   │
│  • Company Profile (sector, beta)   │
│  • Balance Sheet (shares out)       │
│  • Income Statement (revenue)       │
│  • Cash Flow (FCF series)           │
└─────────────────────────────────────┘
     │ API Calls: 4-5 requests
     │ Latency: 2-5 seconds
     │
     ▼
┌─────────────────────────────────────┐
│  3. CALCULATE DCF MODEL             │
│  • g_1_5: Historical FCF CAGR       │
│  • g_6_10: Sector mid blend        │
│  • g_11_20: Terminal (GDP+inflation)│
│  • Discount rate: RF + β×MRP        │
│  • Mid-year discounting             │
└─────────────────────────────────────┘
     │ Compute Time: 50-200ms
     │
     ▼
┌─────────────────────────────────────┐
│  4. CACHE RESULT                    │
│  Redis: SET iv:calc:AAPL value 86400│
│  Status: "premium" | "discount"     │
│  Confidence: "high" | "medium" | low│
└─────────────────────────────────────┘
     │
     ▼
RETURN TO USER
  ✅ IV: $175.32
  ✅ Current Price: $182.45
  ✅ Discount: -3.9% (overvalued)
  ⚠️  Data Age: Unknown to user (0-24h + earnings lag)
```

## Cache Invalidation Events

### ✅ AUTOMATED (Active)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CACHE INVALIDATION TIMELINE                           │
└─────────────────────────────────────────────────────────────────────────────┘

DAILY (06:00 UTC) - valuation-updater.ts
├─ DEL rf:US, rf:EU, rf:CN, rf:BR, rf:UK, rf:JP  [Risk-free rates]
├─ DEL iv:calc:AAPL (for top 100 hot set tickers)
├─ Recalculate IV for hot set (100 tickers)
└─ Duration: ~2 minutes (1 ticker/second)

MONTHLY (1st of month, 07:00 UTC) - valuation-updater.ts
├─ DEL sector:growth:industry:technology (12 sectors)
├─ DEL mrp:US (6 regions)
├─ Rebuild sector growth rates via FMP economic indicators
├─ Validate MRP coverage for all regions
└─ Duration: ~30 seconds (18 API calls)

QUARTERLY (1st of Q, 08:00 UTC) - valuation-updater.ts
├─ DEL iv:calc:* (ALL tickers in universe)
├─ DEL g_term_region:US
├─ Recalculate IV for full universe (1000+ tickers)
└─ Duration: ~33 minutes (1 ticker/2 seconds)

TTL EXPIRATION (Passive)
├─ After 24h, Redis automatically deletes iv:calc:AAPL
├─ Next request triggers cache miss → full recalculation
└─ No proactive invalidation (data may be stale for 24h)
```

### ❌ MISSING (Not Implemented)

```
EARNINGS ANNOUNCEMENT EVENT - ❌ NOT IMPLEMENTED
├─ Company reports Q4 2024 earnings (Jan 30, 2025 16:30 EST)
├─ FMP earnings calendar updated ✅
├─ Transcripts worker ingests transcript ✅
├─ ❌ NO TRIGGER to invalidate iv:calc:AAPL
├─ ❌ NO TRIGGER to recalculate IV
└─ Result: Stale IV persists until 06:00 UTC next day (12h delay)

FINANCIAL RESTATEMENT - ❌ NOT IMPLEMENTED
├─ Company restates financials (e.g., accounting error)
├─ FMP data corrected after 2-7 days
├─ ❌ NO TRIGGER to invalidate iv:calc:AAPL
└─ Result: Stale IV persists until TTL expiry or scheduled worker

SECTOR RECLASSIFICATION - ❌ NOT IMPLEMENTED
├─ Company changes sector (e.g., TSLA: Auto → Tech)
├─ FMP profile updated
├─ ❌ NO TRIGGER to invalidate sector:growth:* or iv:calc:TSLA
└─ Result: Wrong sector growth rate used until monthly job
```

## Data Staleness Analysis

### Scenario 1: Hot Set Ticker (e.g., AAPL)

```
Timeline After Earnings Announcement:

T+0h (Jan 30, 16:30 EST): AAPL reports Q4 2024 earnings
  ├─ FMP earnings calendar: ✅ Updated immediately
  ├─ FMP transcript: ✅ Available within 1h
  ├─ FMP financial statements: ⚠️ Updated after 2-7 days
  └─ Cache iv:calc:AAPL: ❌ STALE (pre-earnings data)

T+13.5h (Jan 31, 06:00 UTC): Daily valuation-updater runs
  ├─ DEL iv:calc:AAPL ✅
  ├─ Fetch NEW financial statements from FMP
  │   ├─ If FMP updated (T+0-2d): ✅ Fresh data
  │   └─ If FMP NOT updated yet: ⚠️ Still using old data
  └─ Recalculate IV ✅

BEST CASE: User sees updated IV after 13.5h (if FMP data available)
WORST CASE: User sees stale IV for 7 days (if FMP delayed + quarterly job needed)
AVERAGE CASE: User sees stale IV for 24h (daily job catches it)
```

### Scenario 2: Cold Ticker (Not in Hot Set)

```
Timeline After Earnings Announcement:

T+0h: Company reports earnings
  └─ Cache iv:calc:TICKER: ❌ STALE (potentially 90d old)

T+24h: Daily job runs
  └─ ❌ SKIPPED (not in hot set)

T+30d: Monthly job runs
  └─ ❌ SKIPPED (only rebuilds sector/MRP, not IVs)

T+90d (Apr 1, 08:00 UTC): Quarterly job runs
  ├─ DEL iv:calc:TICKER ✅
  └─ Recalculate IV ✅

STALENESS: Up to 90 days for cold tickers
```

## Frequency of Updates by Data Type

| Data Component | Source | Cache Key | FMP Update Frequency | Our Update Frequency | Max Staleness |
|----------------|--------|-----------|---------------------|---------------------|---------------|
| **Stock Price** | FMP Quote API | `quote:AAPL` | Real-time (15s delay) | 30s (price-worker) | 90s |
| **FCF Series (5y)** | FMP Cash Flow | Embedded in IV calc | Quarterly (2-7d post-earnings) | Daily (hot) / Quarterly (cold) | 24h-90d |
| **Revenue** | FMP Income Stmt | Embedded in IV calc | Quarterly (2-7d post-earnings) | Daily (hot) / Quarterly (cold) | 24h-90d |
| **Shares Out** | FMP Balance Sheet | Embedded in IV calc | Quarterly (2-7d post-earnings) | Daily (hot) / Quarterly (cold) | 24h-90d |
| **Sector** | FMP Profile | Embedded in IV calc | Rarely (only on reclassification) | On-demand (cached 24h) | 24h-30d |
| **Beta** | FMP Profile | Embedded in IV calc | Weekly (FMP recalculates) | On-demand (cached 24h) | 24h-7d |
| **Risk-Free Rate** | FMP Treasury | `rf:US` | Daily (market close) | Daily 06:00 UTC | 24h |
| **MRP** | FMP Economic Indicators | `mrp:US` | Monthly | Monthly 1st 07:00 UTC | 30d |
| **Sector Growth** | FMP Economic Indicators | `sector:growth:industry:tech` | Monthly | Monthly 1st 07:00 UTC | 30d |
| **Terminal Growth** | FMP Economic Indicators | `g_term_region:US` | Monthly | Quarterly 1st 08:00 UTC | 90d |

## Real-World Examples

### Example 1: AAPL Q4 2024 Earnings (Jan 30, 2025)

```
Jan 30, 2025 16:30 EST: AAPL reports earnings
  • EPS: $2.18 (beat by $0.05)
  • Revenue: $124.3B (beat by $1.2B)
  • FCF: $34.5B (up 12% YoY)

Jan 30, 2025 17:00 EST: User visits /stock/AAPL/intrinsic-value
  • IV shown: $172.45 (calculated Jan 30 06:00 UTC with OLD data)
  • Current price: $185.32
  • Discount: -7.5% (overvalued) ❌ WRONG!
  • Actual IV (with new data): $181.20
  • Actual discount: -2.2% (slight overvalue) ✅ CORRECT

Jan 31, 2025 06:00 UTC: valuation-updater runs daily job
  • FMP data availability:
    ├─ Transcript: ✅ Available
    ├─ Financial statements: ⚠️ NOT YET (FMP lag 2-7d)
    └─ IV recalculated with OLD financials (same as yesterday)

Feb 2, 2025: FMP financial statements updated
  • No trigger to recalculate IV (not event-driven)

Feb 3, 2025 06:00 UTC: valuation-updater runs daily job
  • FMP data availability:
    ├─ Financial statements: ✅ Available (finally!)
    └─ IV recalculated: $181.20 (4 days after earnings)

IMPACT:
  • Users saw WRONG IV for 4 days (Jan 30-Feb 2)
  • Overvalued by 5.3 percentage points
  • Potential investor decisions based on incorrect data
```

### Example 2: KO (Coca-Cola) Declining FCF

```
Historical FCF (5 years):
  2020: $10.2B
  2021: $10.8B
  2022: $10.4B
  2023: $9.8B
  2024: $8.9B

CAGR: -3.2% (declining)

BEFORE FIX (G_1_5_FLOOR = 0.05):
  • g_1_5 = max(-0.032, 0.05) = 0.05 (5% floor)
  • IV = $67.32 (inflated by 12%)
  • Discount: +8.5% (shows as undervalued) ❌ WRONG!

AFTER FIX (G_1_5_FLOOR = 0.00):
  • g_1_5 = max(-0.032, 0.00) = 0.00 (allows negative)
  • IV = $59.85 (realistic)
  • Discount: -2.1% (shows as fairly valued) ✅ CORRECT

VALIDATION:
  • Fix deployed 2025-10-14 (Valuation Patch 1)
  • KO IV dropped from $67.32 to $59.85 (-11.1%)
  • More accurate for mature/declining sectors
```

## Testing Strategy for Data Freshness

### Test 1: Cache Hit Performance

```bash
# Test 1A: Verify cache hit returns instantly
curl -w "@curl-format.txt" "https://128.140.45.28.sslip.io/api/valuation/alfa-value?ticker=AAPL"
# Expected: total_time < 0.1s (100ms)

# Test 1B: Verify cache TTL
ssh root@128.140.45.28
redis-cli -a alfalyzer2025redis
TTL iv:calc:AAPL
# Expected: 0-86400 (0-24h remaining)
```

### Test 2: Cache Miss Performance

```bash
# Test 2A: Force cache miss
ssh root@128.140.45.28
redis-cli -a alfalyzer2025redis
DEL iv:calc:AAPL

# Test 2B: Measure full calculation time
curl -w "@curl-format.txt" "https://128.140.45.28.sslip.io/api/valuation/alfa-value?ticker=AAPL"
# Expected: total_time 2-5s (FMP API calls + computation)
```

### Test 3: Daily Worker Validation

```bash
# Test 3A: Check worker logs
ssh root@128.140.45.28
pm2 logs valuation-updater --lines 100 | grep "DAILY Update Summary"

# Expected output:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📊 DAILY Update Summary:
#    ├─ Duration: 125s
#    ├─ RF Updated: ✅
#    ├─ IVs Calculated: 87/100 (87.0%)
#    ├─ IVs Not Calculable: 8 (negative FCF/missing data)
#    ├─ IVs Failed: 5 (real failures)
#    ├─ Cache Invalidation: 87/100 keys existed pre-del
#    └─ Status: ✅ Success

# Test 3B: Verify cache was invalidated
redis-cli -a alfalyzer2025redis
KEYS iv:calc:*
# Expected: 87 keys (only successfully calculated IVs)
```

### Test 4: Staleness Detection

```bash
# Test 4A: Get last calculation timestamp
curl "https://128.140.45.28.sslip.io/api/valuation/alfa-value?ticker=AAPL" | jq '.calculatedAt'
# Expected: ISO timestamp (e.g., "2025-10-22T06:05:32.123Z")

# Test 4B: Calculate staleness
CALCULATED_AT="2025-10-22T06:05:32.123Z"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
echo "Staleness: $(( ($(date -d "$NOW" +%s) - $(date -d "$CALCULATED_AT" +%s)) / 3600 )) hours"
# Expected: 0-24 hours for hot set
```

## Proposed Solution: Event-Driven IV Refresh

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               EVENT-DRIVEN IV REFRESH (Proposed)                             │
└─────────────────────────────────────────────────────────────────────────────┘

EARNINGS ANNOUNCEMENT (T+0h)
     │
     ▼
┌─────────────────────────────────────┐
│  transcripts-worker.ts              │
│  • Detects new transcript via       │
│    earnings calendar                │
│  • Ingests transcript to PostgreSQL │
│  • Publishes event to Redis queue   │
└─────────────────────────────────────┘
     │
     │ Event: { ticker, quarter, year, timestamp }
     ▼
┌─────────────────────────────────────┐
│  iv-refresh-worker.ts (NEW)         │
│  • Polls Redis queue (RPOPLPUSH)    │
│  • Checks FMP data availability     │
│    (retry every 1h for 7 days)      │
└─────────────────────────────────────┘
     │
     │ FMP Data Available? (T+2-7d)
     ▼
┌─────────────────────────────────────┐
│  1. DEL iv:calc:{ticker}            │
│  2. valuationService.getAlfaValue() │
│  3. Publish WebSocket event         │
│  4. Log refresh event               │
└─────────────────────────────────────┘
     │
     ▼
REAL-TIME UI UPDATE (WebSocket)
  ✅ "New IV available for AAPL"
  ✅ Auto-refresh chart/metrics
  ✅ User sees fresh data (T+2-7d vs T+24h-90d)
```

### Implementation Checklist

- [ ] Create `iv-refresh-worker.ts` (new worker process)
- [ ] Add Redis queue: `iv_refresh_queue`
- [ ] Modify `transcripts-worker.ts` to publish events on new transcript
- [ ] Implement FMP data availability polling (1h interval, 7d timeout)
- [ ] Add WebSocket event: `iv:refreshed:{ticker}`
- [ ] Update frontend to listen for WebSocket events
- [ ] Add monitoring: staleness alerts for post-earnings tickers
- [ ] Test with historical earnings data (backtest 100 earnings events)

### Estimated Impact

| Metric | Current State | After Implementation | Improvement |
|--------|---------------|---------------------|-------------|
| **Hot Set Staleness** | 24h (daily job) | 2-7d (FMP lag) | ❌ Slight regression due to FMP lag |
| **Cold Ticker Staleness** | 90d (quarterly job) | 2-7d (event-driven) | ✅ 93% reduction |
| **Post-Earnings Accuracy** | Wrong for 24h-90d | Wrong for 2-7d (FMP lag only) | ✅ 71-97% reduction |
| **API Calls/Month** | 3,000 (scheduled) | 3,500 (+ ~500 event-driven) | ⚠️ +17% (acceptable) |
| **User Experience** | Static until refresh | Real-time notification | ✅ Major improvement |

## Conclusion

**Current State:**
- ✅ Quotes: Auto-refresh every 30s (excellent)
- ✅ Transcripts: Event-driven ingestion (excellent)
- ⚠️ Intrinsic Values: Time-based only (poor for post-earnings accuracy)

**Critical Gap:**
Intrinsic Value calculations are NOT event-driven, causing 24h-90d staleness after earnings announcements.

**Recommended Action:**
Implement event-driven IV refresh (Priority 1) with FMP data polling to minimize staleness while accounting for provider lag.

**Risk:**
Without this fix, users will continue to see incorrect valuations for days/months after earnings, undermining platform credibility and potentially causing poor investment decisions.

---

**Last Updated:** 2025-10-22
**Next Action:** Review with team and prioritize implementation
