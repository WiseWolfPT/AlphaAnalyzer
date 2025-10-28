# Data Freshness Executive Summary

**Date:** 2025-10-22
**Analyst:** TDD System Architect
**Status:** ⚠️ CRITICAL GAP IDENTIFIED

## Quick Answer to User's Question

> "se está atualizado para estes valores irem atualizando com o decorrer do tempo e nao serem estáticos para sempre"

**Short Answer:** ⚠️ **SIM e NÃO**

- ✅ **SIM** para preços de ações: Atualizam automaticamente a cada 30 segundos
- ✅ **SIM** para earnings transcripts: Ingestão automática baseada em eventos
- ❌ **NÃO** para valores intrínsecos: Atualizam apenas em horários fixos (diariamente para top 100, trimestralmente para o resto)

**Problema Crítico:** Quando uma empresa anuncia earnings (ex: AAPL reporta Q4 em 30 Jan), o valor intrínseco (IV) **NÃO** é recalculado automaticamente. Os utilizadores veem dados desatualizados por 24h-90 dias dependendo do ticker.

## System Overview

### ✅ What's Working (Auto-Refresh Active)

```
1. STOCK QUOTES (Excellent)
   ├─ Worker: price-worker.ts
   ├─ Frequency: Every 30 seconds
   ├─ Cache TTL: 60 seconds
   ├─ Coverage: Top 100 tickers
   └─ Max Staleness: 90 seconds ✅

2. EARNINGS TRANSCRIPTS (Excellent)
   ├─ Worker: transcripts-worker.ts
   ├─ Strategy: EVENT-DRIVEN (earnings calendar)
   ├─ Frequency: 1-hour cycles
   ├─ Detection Window: 7 days lookback + 2 days lookahead
   └─ Latency: New transcripts ingested within 1h ✅

3. RISK-FREE RATES (Good)
   ├─ Worker: valuation-updater.ts
   ├─ Frequency: Daily at 06:00 UTC
   ├─ Coverage: 6 regions (US, EU, CN, BR, UK, JP)
   └─ Max Staleness: 24 hours ✅

4. SECTOR GROWTH RATES (Good)
   ├─ Worker: valuation-updater.ts
   ├─ Frequency: Monthly on 1st at 07:00 UTC
   ├─ Coverage: 12 sectors
   └─ Max Staleness: 30 days ✅
```

### ❌ What's NOT Working (Critical Gap)

```
5. INTRINSIC VALUES (CRITICAL GAP) ⚠️
   ├─ Worker: valuation-updater.ts
   ├─ Strategy: TIME-BASED ONLY (NOT event-driven)
   ├─ Frequency:
   │   ├─ Daily 06:00 UTC → Top 100 tickers (hot set)
   │   └─ Quarterly 1st at 08:00 UTC → Full universe (1000+ tickers)
   ├─ Problem: No automatic refresh on earnings announcements
   ├─ Max Staleness:
   │   ├─ Hot set: 24 hours ⚠️
   │   └─ Cold tickers: 90 days ❌ CRITICAL
   └─ Impact: Users see WRONG valuations for days/months after earnings
```

## Real-World Impact Example

### Scenario: AAPL Q4 2024 Earnings (Jan 30, 2025)

```
Jan 30, 2025 16:30 EST: AAPL reports Q4 2024 earnings
├─ EPS: $2.18 (beat by $0.05)
├─ Revenue: $124.3B (beat by $1.2B)
└─ FCF: $34.5B (up 12% YoY)

Jan 30, 2025 17:00 EST: User visits /stock/AAPL/intrinsic-value

SYSTEM SHOWS (WRONG - Stale Data):
├─ IV: $172.45 (calculated at 06:00 UTC with OLD data)
├─ Current Price: $185.32
├─ Discount: -7.5% (overvalued)
└─ Recommendation: "SELL or AVOID" ❌

ACTUAL CORRECT VALUES (with new earnings):
├─ IV: $181.20 (12% FCF growth applied)
├─ Current Price: $185.32
├─ Discount: -2.2% (slight overvalue)
└─ Recommendation: "HOLD or MONITOR" ✅

STALENESS DURATION:
├─ FMP updates financial statements: 2-7 days after earnings
├─ Our daily worker runs: Next day at 06:00 UTC
├─ BUT worker fetches FMP data that's still old (2-7d lag)
└─ Total staleness: 2-7 days (FMP lag) + 0-24h (our worker lag)

WORST CASE: User sees WRONG valuation for 8 days (7d FMP + 1d worker)
BEST CASE: User sees WRONG valuation for 13.5 hours (if FMP updates immediately)
AVERAGE CASE: User sees WRONG valuation for 4 days
```

### Impact on Investment Decisions

**Scenario A:** User relies on stale IV showing "overvalued -7.5%"
- Decision: Sells AAPL shares at $185
- Outcome: Misses 10% rally to $203 over next 2 weeks (based on improved fundamentals)
- Loss: Opportunity cost of ~$18/share

**Scenario B:** User checks IV 4 days later (after FMP update)
- Decision: Sees "fairly valued -2.2%", holds position
- Outcome: Captures rally to $203
- Gain: $18/share profit

**Platform Credibility Risk:**
If users discover IVs are stale, they lose trust in all platform data, even data that IS fresh (quotes, transcripts).

## Root Cause Analysis

### Why Isn't IV Event-Driven?

1. **Architectural Separation:**
   - `transcripts-worker.ts`: Knows about earnings events ✅
   - `valuation-updater.ts`: Knows about IV calculation ✅
   - **NO BRIDGE:** No communication between the two workers ❌

2. **FMP Provider Lag:**
   - Earnings announced: T+0h
   - Transcript available: T+1h ✅
   - **Financial statements updated: T+2-7 days** ⚠️
   - Even if we trigger IV refresh immediately, FMP data is stale

3. **Historical Design Decision:**
   - Valuation worker designed for scheduled maintenance (daily/quarterly)
   - NOT designed for real-time event response
   - Assumption: "24h staleness acceptable" (valid for macro data, NOT for earnings-driven IVs)

## TTL Configuration Matrix

| Data Type | Cache Key | Default TTL | Worker Frequency | Staleness Risk |
|-----------|-----------|-------------|------------------|----------------|
| Stock Quotes | `quote:{ticker}` | 60s | 30s (continuous) | ✅ Low (90s max) |
| Historical Prices | `historical:{ticker}` | 2h | On-demand | ✅ Low (fixed historical) |
| Financials | `financials:{ticker}` | 1h | On-demand | ⚠️ Medium (quarterly data) |
| Company Profile | `profile:{ticker}` | 24h | On-demand | ✅ Low (rarely changes) |
| Market Status | `market:status` | 5m | On-demand | ✅ Low (binary state) |
| **Intrinsic Value** | `iv:calc:{ticker}` | 24h | Daily (hot) / Quarterly (cold) | ❌ **HIGH (24h-90d)** |
| Risk-Free Rate | `rf:{region}` | 24h | Daily 06:00 UTC | ✅ Low (daily updates) |
| MRP | `mrp:{region}` | 30d | Monthly 1st | ✅ Low (slow-changing) |
| Sector Growth | `sector:growth:*` | 30d | Monthly 1st | ✅ Low (slow-changing) |
| Transcripts | `transcripts:{symbol}:{q}:{y}` | 7d | Event-driven (1h cycles) | ✅ Low (event-driven) |

## Recommendations (Prioritized)

### Priority 1: Event-Driven IV Refresh ⚠️ CRITICAL

**Objective:** Reduce IV staleness from 24h-90d to 2-7d (FMP lag only)

**Implementation:**
```typescript
// Step 1: Modify transcripts-worker.ts
async function onNewTranscript(ticker: string, quarter: string, year: number) {
  // Publish event to Redis queue
  await redisClient.lpush('iv_refresh_queue', JSON.stringify({
    ticker,
    quarter,
    year,
    timestamp: new Date().toISOString(),
    reason: 'earnings_announcement'
  }));
}

// Step 2: Create new iv-refresh-worker.ts
async function ivRefreshWorker() {
  while (true) {
    // Poll queue (RPOPLPUSH for atomicity)
    const event = await redisClient.rpoplpush('iv_refresh_queue', 'iv_refresh_processing');
    if (!event) {
      await sleep(60000); // 1 minute backoff
      continue;
    }

    const { ticker, quarter, year } = JSON.parse(event);

    // Check if FMP financial statements updated (poll every 1h for 7 days)
    const statementsReady = await pollFmpDataAvailability(ticker, quarter, year, {
      maxWaitTime: 7 * 24 * 3600 * 1000, // 7 days
      checkInterval: 3600 * 1000 // 1 hour
    });

    if (!statementsReady) {
      logger.warn(`FMP data not available after 7d for ${ticker} ${quarter} ${year} - will catch in quarterly job`);
      await redisClient.lrem('iv_refresh_processing', 1, event);
      continue;
    }

    // Invalidate cache + recalculate
    await redisCacheService.del(`iv:calc:${ticker}`);
    const newIV = await valuationService.getAlfaValue(ticker);

    // Publish WebSocket event for real-time UI update
    await wsServer.broadcast({
      type: 'iv:refreshed',
      ticker,
      iv: newIV.iv,
      timestamp: new Date().toISOString()
    });

    // Remove from processing queue
    await redisClient.lrem('iv_refresh_processing', 1, event);
    logger.info(`IV refreshed for ${ticker} (post-earnings)`);
  }
}
```

**Effort:** 2-3 days (1 dev)
**Impact:** 93% reduction in staleness for cold tickers (90d → 7d max)
**Risk:** +17% API usage (~500 event-driven calls/month)

### Priority 2: Staleness Monitoring Dashboard

**Objective:** Detect stale IVs before users complain

**Metrics:**
```typescript
// Add to valuation-service.ts response
interface AlfaValueResponse {
  iv: number;
  // ... existing fields

  // NEW FIELDS:
  calculatedAt: string; // ISO timestamp of last calculation
  dataFreshnessWarning?: string; // "IV may be stale - earnings reported 4 days ago"
  lastEarningsDate?: string; // From transcripts table
  daysSinceEarnings?: number; // Auto-calculated
}

// Dashboard query (new endpoint)
GET /api/admin/staleness-report
Response:
{
  "hotSet": {
    "totalTickers": 100,
    "staleCount": 5,
    "staleTickers": [
      {
        "ticker": "AAPL",
        "lastCalc": "2025-01-30T06:00:00Z",
        "lastEarnings": "2025-01-30T16:30:00Z",
        "staleDays": 4,
        "severity": "high"
      }
    ]
  },
  "postEarningsTickers": {
    "totalCount": 23,
    "staleCount": 18,
    "avgStaleDays": 5.2
  }
}
```

**Effort:** 1 day
**Impact:** Proactive detection, reduces user complaints

### Priority 3: Manual Cache Invalidation Endpoint

**Objective:** Emergency tool for fixing stale data

**Implementation:**
```typescript
// POST /api/admin/invalidate-cache
// Auth: Admin API key required
{
  "ticker": "AAPL",
  "cacheTypes": ["iv", "financials", "profile"],
  "reason": "Financial restatement"
}

Response:
{
  "invalidated": [
    "iv:calc:AAPL",
    "financials:AAPL",
    "profile:AAPL"
  ],
  "recalculated": {
    "iv": {
      "old": 172.45,
      "new": 181.20,
      "change_pct": 5.1
    }
  }
}
```

**Effort:** 1 day
**Impact:** Manual fix capability (reduces support burden)

## Validation & Testing

### Test Plan: Event-Driven IV Refresh

```bash
# Test 1: Simulate earnings announcement
curl -X POST http://localhost:3001/api/test/simulate-earnings \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "quarter": "Q4",
    "year": 2024,
    "transcript": "...mock transcript...",
    "financials": {...mock financials...}
  }'

# Expected:
# 1. Event published to iv_refresh_queue ✅
# 2. iv-refresh-worker picks up event within 1 minute ✅
# 3. FMP data check passes immediately (mocked) ✅
# 4. Cache iv:calc:AAPL invalidated ✅
# 5. New IV calculated ✅
# 6. WebSocket event broadcast ✅
# Total latency: < 2 minutes ✅

# Test 2: Verify FMP data polling (delayed availability)
curl -X POST http://localhost:3001/api/test/simulate-earnings \
  -d '{ "ticker": "MSFT", "fmpDelay": 172800000 }' # 2 days

# Expected:
# 1. Event published to iv_refresh_queue ✅
# 2. Worker polls FMP every 1h for 2 days ✅
# 3. On T+2d, FMP data available ✅
# 4. IV recalculated ✅
# Total latency: 2 days (FMP lag) ✅

# Test 3: Timeout scenario (FMP never updates)
curl -X POST http://localhost:3001/api/test/simulate-earnings \
  -d '{ "ticker": "TSLA", "fmpDelay": 999999999 }' # Never

# Expected:
# 1. Worker polls for 7 days ✅
# 2. After 7d, timeout logged ✅
# 3. Event moved to DLQ ✅
# 4. Quarterly job will catch it eventually ✅
```

### Monitoring Queries

```bash
# Check iv_refresh_queue depth
redis-cli -a alfalyzer2025redis LLEN iv_refresh_queue
# Expected: 0-10 (should drain within hours)

# Check processing queue (stuck tasks)
redis-cli -a alfalyzer2025redis LLEN iv_refresh_processing
# Expected: 0-2 (should be small, items move quickly)

# Get last 10 refresh events
redis-cli -a alfalyzer2025redis LRANGE iv_refresh_history 0 9
# Expected: JSON logs of recent refreshes

# Count stale IVs (older than 24h post-earnings)
curl http://localhost:3001/api/admin/staleness-report | jq '.postEarningsTickers.staleCount'
# Expected: < 5 (after implementing event-driven refresh)
```

## Conclusion

### Current State Assessment

✅ **Strengths:**
- Real-time quotes (30s refresh)
- Event-driven transcript ingestion
- Comprehensive worker architecture
- Configurable TTLs via environment variables

❌ **Critical Weakness:**
- Intrinsic Values NOT event-driven
- Users see stale IVs for 24h-90d after earnings
- Platform credibility at risk

### Immediate Actions Required

1. **Implement Priority 1** (Event-Driven IV Refresh) - 2-3 days
2. **Deploy to staging** - Test with historical earnings data
3. **Monitor for 7 days** - Validate FMP data lag assumptions
4. **Deploy to production** - Gradual rollout (10% → 50% → 100%)
5. **Implement Priority 2** (Staleness Monitoring) - 1 day
6. **Document in CLAUDE.md** - Update operational procedures

### Success Metrics (Post-Implementation)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| IV staleness (hot set) | 24h | 7d (FMP lag) | Avg time between earnings and IV refresh |
| IV staleness (cold tickers) | 90d | 7d (FMP lag) | Same as above |
| Post-earnings accuracy | 0% (wrong for days) | 90% (within 7d) | % of tickers refreshed within 7d of earnings |
| User complaints re: stale data | Unknown | < 1/week | Support ticket tracking |
| API quota usage | 3,000 calls/mo | 3,500 calls/mo | FMP dashboard |

### Risk Mitigation

**Risk 1:** FMP data lag longer than 7 days
- Mitigation: Quarterly job provides ultimate fallback (max 90d)
- Monitoring: Alert if timeout count > 5% of events

**Risk 2:** API quota exceeded due to event-driven calls
- Mitigation: Hard cap at 500 event-driven calls/month (monitor closely)
- Fallback: Disable event-driven refresh, rely on scheduled jobs

**Risk 3:** IV calculation errors cause cascade failures
- Mitigation: Robust error handling + DLQ for failed tasks
- Monitoring: Alert if DLQ depth > 10 items

---

**Prepared by:** TDD System Architect
**Review Date:** 2025-10-22
**Next Review:** After Priority 1 implementation
**Stakeholders:** Product, Engineering, Data Science
