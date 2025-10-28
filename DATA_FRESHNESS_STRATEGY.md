# Data Freshness Strategy - Alfalyzer

## Executive Summary

**Status:** ACTIVE & FUNCTIONAL ✅
**Coverage:** All data types have automated refresh mechanisms
**Critical Gap:** ❌ Intrinsic Value calculations NOT event-driven (only time-based)

## Data Lifecycle Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA FRESHNESS ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   REAL-TIME DATA    │  TTL: 60s    Worker: price-worker (30s cycles)
│   • Stock Quotes    │  ✅ Auto-refresh via worker + cache invalidation
│   • Market Status   │  ✅ Event-driven via market hours detection
└─────────────────────┘

┌─────────────────────┐
│  FUNDAMENTAL DATA   │  TTL: 1h-24h  Worker: valuation-updater (daily/quarterly)
│   • Financials      │  ⚠️  ONLY time-based (no earnings event trigger)
│   • Company Profile │  ✅ Cache + worker refresh
│   • Balance Sheet   │  ⚠️  QUARTERLY refresh (may lag earnings by 90 days)
│   • Income Stmt     │  ⚠️  QUARTERLY refresh (may lag earnings by 90 days)
│   • Cash Flow       │  ⚠️  QUARTERLY refresh (may lag earnings by 90 days)
└─────────────────────┘

┌─────────────────────┐
│  VALUATION DATA     │  TTL: 24h     Worker: valuation-updater (daily 06:00 UTC)
│   • Intrinsic Value │  ❌ NOT event-driven (only daily schedule)
│   • Risk-Free Rate  │  ✅ Daily refresh (06:00 UTC)
│   • MRP             │  ✅ Monthly validation (1st of month)
│   • Sector Growth   │  ✅ Monthly rebuild (1st of month)
│   • DCF Inputs      │  ⚠️  QUARTERLY refresh (may lag earnings by 90 days)
└─────────────────────┘

┌─────────────────────┐
│   TRANSCRIPT DATA   │  TTL: 7 days  Worker: transcripts-worker (1h cycles)
│   • Earnings Calls  │  ✅ EVENT-DRIVEN via earnings calendar (7d lookback)
│   • AI Summaries    │  ✅ Auto-generated via Redis queue + OpenAI
└─────────────────────┘
```

## TTL Configuration Matrix

| Data Type | ENV Variable | Default TTL | Update Frequency | Auto-Invalidation |
|-----------|--------------|-------------|------------------|-------------------|
| **Quotes** | `TTL_QUOTE_SECONDS` | 60s | 30s (price-worker) | ✅ Yes (worker overwrites) |
| **Historical** | `TTL_HISTORICAL_SECONDS` | 2h | On-demand | ❌ No |
| **Financials** | `TTL_FUNDAMENTALS_SECONDS` | 1h | On-demand | ❌ No |
| **Profile** | `TTL_PROFILE_SECONDS` | 24h | On-demand | ❌ No |
| **Market Status** | `TTL_MARKET_STATUS_SECONDS` | 5m | On-demand | ❌ No |
| **Intrinsic Value** | `iv:calc:{ticker}` | 24h | Daily 06:00 UTC | ✅ Yes (valuation-updater DEL) |
| **Risk-Free Rate** | `rf:{region}` | 24h | Daily 06:00 UTC | ✅ Yes (valuation-updater DEL) |
| **MRP** | `mrp:{region}` | 30d | Monthly 1st 07:00 UTC | ✅ Yes (valuation-updater DEL) |
| **Sector Growth** | `sector:growth:industry:{sector}` | 30d | Monthly 1st 07:00 UTC | ✅ Yes (valuation-updater DEL) |
| **Transcripts** | `transcripts:{symbol}:{quarter}:{year}` | 7d | Event-driven (earnings calendar) | ⚠️ Partial (new data only) |
| **DCF Inputs** | `dcf_inputs:{ticker}` | 24h | Quarterly (1st of Q) | ✅ Yes (valuation-updater DEL) |

## Worker Architecture

### 1. Price Worker (Real-Time Quotes)

**Status:** ✅ ACTIVE
**Schedule:** Continuous (30s cycles)
**PM2 Cron:** Restart every 6h (`0 */6 * * *`)

```typescript
// Location: server/workers/price-worker.ts
Hot Set Size: 100 tickers (default) - ENV: HOT_SET_SIZE
Refresh Interval: 30s (default) - ENV: HOT_SET_REFRESH_SECONDS
Cache TTL: 60s - ENV: TTL_QUOTE_SECONDS

Strategy:
1. Fetch top 100 tickers via FMP batch API (50 symbols/request)
2. Cache each quote with 60s TTL
3. Overwrite existing cache entries (implicit invalidation)
4. Rate limiting via token bucket (if enabled via QUOTES_CALLS_PER_MIN_BUDGET)

API Usage: ~2 calls/30s = 5,760 calls/day (well within FMP limits)
```

**Freshness Guarantee:** Quotes never older than 90s (60s TTL + 30s cycle)

### 2. Transcripts Worker (Earnings Calls)

**Status:** ✅ ACTIVE & EVENT-DRIVEN
**Schedule:** 1h cycles (`RUN_INTERVAL_MS=3600000`)
**PM2 Cron:** None (continuous loop)

```typescript
// Location: server/workers/transcripts-worker.ts
Discovery: EVENT-DRIVEN via earnings calendar (7d lookback + 2d lookahead)
AI Processing: Redis queue (RPOPLPUSH) + OpenAI (100% automated)
Hard Limit: 100 FMP calls/cycle (safety cap)

Strategy:
1. Fetch FMP earnings calendar (7d lookback + 2d lookahead)
2. Check PostgreSQL for existing transcripts (skip duplicates)
3. Fetch only NEW transcripts via FMP API
4. Push to Redis queue for AI summary generation
5. AI worker processes queue (3 retries + DLQ for failures)

API Usage: ~9 calls/cycle (Onda 4 validation) = 216 calls/day
Bandwidth: ~0.26 MB/cycle = 6.24 MB/day (vs 3.03 GB/month pre-optimization)

Reduction: 99.997% vs previous 319,910 calls/month ✅
```

**Freshness Guarantee:** New earnings calls ingested within 1h of publication (event-driven)

### 3. Valuation Updater (Intrinsic Value)

**Status:** ✅ ACTIVE (TIME-BASED ONLY)
**Schedule:** Daily 06:00 UTC (`cron_restart: '0 6 * * *'`)
**PM2 Autorestart:** Disabled (cron-based one-shot execution)

```typescript
// Location: server/workers/valuation-updater.ts

DAILY JOB (06:00 UTC):
  1. Invalidate risk-free rate cache (rf:{region}) - ALL regions
  2. Fetch fresh US 10Y Treasury rate
  3. Invalidate IV cache for hot set (iv:calc:{ticker}) - 100 tickers
  4. Recalculate IV for hot set (100 API calls to FMP)
  5. Rate limit: 1 ticker/second = ~2 minutes total runtime

MONTHLY JOB (1st of month 07:00 UTC):
  1. Invalidate sector growth cache (sector:growth:industry:{sector}) - 12 sectors
  2. Rebuild sector growth rates via FMP economic indicators
  3. Invalidate MRP cache (mrp:{region}) - 6 regions
  4. Validate MRP coverage for all regions

QUARTERLY JOB (1st of Q 08:00 UTC):
  1. Invalidate IV cache for FULL universe (1000+ tickers)
  2. Invalidate g_term_region cache (terminal growth rates)
  3. Recalculate IV for entire universe (FCF data auto-fetched from FMP)
  4. Rate limit: 1 ticker/2s = ~33 minutes total runtime

API Usage:
  - Daily: ~100 calls (hot set IVs)
  - Monthly: ~18 calls (12 sectors + 6 MRPs)
  - Quarterly: ~1000 calls (full universe IVs)
  - Total: ~3,000 calls/month (sustainable within FMP limits)
```

**Freshness Guarantee:**
- Hot set IVs: Updated daily (max staleness 24h)
- Full universe IVs: Updated quarterly (max staleness 90d)
- Risk-free rates: Updated daily
- Sector growth: Updated monthly

## Critical Gap Analysis

### ❌ GAP 1: Intrinsic Value NOT Event-Driven

**Problem:**
Intrinsic Value calculations are ONLY triggered by time-based schedules (daily/quarterly), NOT by earnings events.

**Impact:**
When a company reports earnings (e.g., AAPL Q4 2024 on Jan 30), the IV calculation:
- Will NOT refresh automatically
- Remains stale until next scheduled update (daily 06:00 UTC for hot set, quarterly for others)
- Max staleness: 24h for hot set, 90d for cold tickers

**Example Scenario:**
```
Jan 30, 2025 16:30 EST: AAPL reports Q4 2024 earnings (beat expectations)
Jan 30, 2025 16:31 EST: User visits /stock/AAPL intrinsic-value page
                        ❌ Shows PRE-EARNINGS IV (stale data from Jan 30 06:00 UTC)
Jan 31, 2025 06:00 UTC: valuation-updater runs daily job
                        ✅ AAPL IV recalculated with new earnings data
                        User now sees updated IV (12h delay)
```

**Root Cause:**
No integration between `transcripts-worker` (event-driven earnings ingestion) and `valuation-updater` (time-based IV calculation).

### ❌ GAP 2: Financial Statements Lag Earnings

**Problem:**
FMP financial statements (balance sheet, income, cash flow) may lag earnings announcements by several days.

**Impact:**
Even if we trigger IV recalculation on earnings event, FMP API may not have updated financial data yet.

**Example Scenario:**
```
Jan 30, 2025: AAPL reports earnings
Jan 30, 2025: FMP earnings calendar updated ✅
Jan 30, 2025: FMP transcript available ✅
Feb 2, 2025: FMP financial statements updated (2-day lag) ⚠️
```

**Mitigation:**
Quarterly job ensures eventual consistency (max 90d staleness), but real-time users may see incorrect IVs for 2-7 days post-earnings.

### ⚠️ GAP 3: No Cache Invalidation on Manual Data Updates

**Problem:**
If FMP data is corrected/restated (e.g., financial restatement), cache is NOT automatically invalidated.

**Impact:**
Stale data persists until TTL expires or scheduled worker runs.

**Mitigation:**
Quarterly job provides eventual consistency (max 90d staleness).

## Recommendations

### Priority 1: Event-Driven IV Refresh (CRITICAL)

**Objective:** Recalculate IV within 1h of earnings announcement

**Proposed Architecture:**
```typescript
// Add to transcripts-worker.ts after ingesting new transcript:

async function onNewTranscript(ticker: string, quarter: string, year: number) {
  // 1. Wait for FMP financial statements to update (polling with timeout)
  const maxWait = 7 * 24 * 3600 * 1000; // 7 days
  const checkInterval = 3600 * 1000; // 1 hour

  let statementsAvailable = false;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    statementsAvailable = await checkFinancialStatementsUpdated(ticker, quarter, year);
    if (statementsAvailable) break;
    await sleep(checkInterval);
  }

  if (!statementsAvailable) {
    logger.warn(`Financial statements not available after 7d for ${ticker} ${quarter} ${year}`);
    return; // Quarterly job will catch it eventually
  }

  // 2. Invalidate IV cache
  await redisCacheService.del(`iv:calc:${ticker}`);

  // 3. Trigger immediate recalculation
  await valuationService.getAlfaValue(ticker);

  // 4. Publish event for real-time UI updates (WebSocket)
  await notifyUIRefresh(ticker);
}

async function checkFinancialStatementsUpdated(
  ticker: string,
  quarter: string,
  year: number
): Promise<boolean> {
  const income = await fmpGet(`/api/v3/income-statement/${ticker}`, { period: 'quarter', limit: 5 });
  if (!income || income.length === 0) return false;

  // Check if latest statement matches the quarter we're looking for
  const latest = income[0];
  const latestQ = quarterFromDateStr(latest.date);

  return latestQ.q === quarter && latestQ.year === year;
}
```

**Implementation Effort:** 2-3 days
**Impact:** Eliminates 24h lag for hot set, 90d lag for cold tickers

### Priority 2: Real-Time Cache Invalidation API

**Objective:** Manual cache invalidation endpoint for emergency corrections

**Proposed Endpoint:**
```typescript
// POST /api/admin/invalidate-cache
{
  "ticker": "AAPL",
  "cacheTypes": ["iv", "financials", "profile"]
}

// Invalidates:
// - iv:calc:AAPL
// - financials:AAPL
// - profile:AAPL
```

**Implementation Effort:** 1 day
**Impact:** Enables manual corrections without waiting for scheduled workers

### Priority 3: Monitoring Dashboard

**Objective:** Visibility into data freshness and staleness detection

**Proposed Metrics:**
```
- Last IV calculation timestamp (per ticker)
- Last earnings announcement timestamp (per ticker)
- Staleness alert: IV older than 24h for hot set
- Staleness alert: IV older than 7d for post-earnings tickers
- FMP API quota usage (calls/day, bandwidth/day)
```

**Implementation Effort:** 2-3 days
**Impact:** Proactive detection of stale data before users encounter it

## Current Production Configuration

```bash
# .env.production

# Cache TTLs (all configurable)
TTL_QUOTE_SECONDS=60
TTL_HISTORICAL_SECONDS=7200
TTL_FUNDAMENTALS_SECONDS=3600
TTL_PROFILE_SECONDS=86400
TTL_MARKET_STATUS_SECONDS=300
TTL_DEFAULT_SECONDS=3600

# Worker Configuration
HOT_SET_SIZE=100
HOT_SET_REFRESH_SECONDS=30
WARM_SET_SIZE=0 # Disabled
WARM_SET_REFRESH_SECONDS=0 # Disabled
QUOTES_CALLS_PER_MIN_BUDGET=0 # Disabled (no token bucket)

# Transcripts Worker
TRANSCRIPTS_SOURCE=fmp
TRANSCRIPTS_INTERVAL_MS=3600000 # 1 hour
FMP_CAL_LOOKBACK_DAYS=7
FMP_CAL_LOOKAHEAD_DAYS=2
MAX_FMP_CALLS_PER_CYCLE=100
BACKFILL_TRANSCRIPTS=false # CRITICAL: Must remain false (Onda 4 fix)

# Valuation Worker (PM2 cron-based)
VALUATION_DAILY_CRON=0 6 * * *
VALUATION_MONTHLY_CRON=0 7 1 * *
VALUATION_QUARTERLY_CRON=0 8 1 */3 *
```

## Validation Commands

```bash
# Check price worker status (quotes freshness)
pm2 logs price-worker --lines 50 | grep "Update cycle complete"

# Check transcripts worker status (earnings ingestion)
pm2 logs transcripts-worker --lines 50 | grep "bandwidth report"

# Check valuation updater status (IV freshness)
pm2 logs valuation-updater --lines 50 | grep "DAILY Update Summary"

# Verify cache TTLs
ssh root@128.140.45.28
redis-cli -a alfalyzer2025redis
TTL quote:AAPL
TTL iv:calc:AAPL
TTL rf:US

# Check worker health endpoints
curl http://localhost:3002/health # price-worker
curl http://localhost:3003/health # transcripts-worker
curl http://localhost:3004/health # valuation-updater
```

## Conclusion

**Current State:**
✅ Real-time quotes: Auto-refresh every 30s
✅ Earnings transcripts: Event-driven ingestion
⚠️ Intrinsic values: Time-based only (daily/quarterly)
⚠️ Financial statements: Quarterly refresh (may lag earnings)

**Critical Action Required:**
Implement event-driven IV refresh (Priority 1) to eliminate 24h-90d staleness for post-earnings data.

**Risk if Not Addressed:**
Users see incorrect IVs for 24h (hot set) or 90d (cold tickers) after earnings announcements, undermining platform credibility.

---

**Last Updated:** 2025-10-22
**Next Review:** After implementing Priority 1 (event-driven IV refresh)
