# Validation Suite Architecture

**Visual overview of the comprehensive validation system**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION SUITE OVERVIEW                     │
└─────────────────────────────────────────────────────────────────┘

INPUTS:
  ┌──────────────────┐
  │ Burst Warming    │  (6-7 hours, 1,493 symbols)
  │ COMPLETE         │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Run Orchestrator │  bash run-comprehensive-validation.sh
  └────────┬─────────┘
           │
           ▼

VALIDATION FLOW:
  ┌────────────────────────────────────────────────────────────┐
  │                    Pre-flight Checks                       │
  ├────────────────────────────────────────────────────────────┤
  │  ✓ Production accessible?                                  │
  │  ✓ Worker running?                                         │
  │  ✓ Node.js available?                                      │
  │  ✓ Burst complete?                                         │
  └─────────────────────────┬──────────────────────────────────┘
                            │
           ┌────────────────┴────────────────┐
           │                                  │
           ▼                                  ▼
  ┌─────────────────┐              ┌─────────────────┐
  │  API Tests      │              │ Manual Tests    │
  │  (Automated)    │              │ (Guided)        │
  └────────┬────────┘              └────────┬────────┘
           │                                  │
           ▼                                  ▼
  ┌─────────────────┐              ┌─────────────────┐
  │ Test 11-15      │              │ Test 1-10       │
  │ - Bandwidth     │              │ - Cache rates   │
  │ - Worker health │              │ - Growth rates  │
  │ - APIs          │              │                 │
  └────────┬────────┘              │ Test 16-17      │
           │                        │ - SSH checks    │
           │                        │                 │
           │                        │ Test 18-20      │
           │                        │ - UI/UX         │
           │                        └────────┬────────┘
           │                                  │
           └────────────────┬─────────────────┘
                            │
                            ▼
           ┌────────────────────────────────┐
           │     Generate Reports            │
           ├────────────────────────────────┤
           │  - API test results             │
           │  - Browser test results         │
           │  - SSH test results             │
           │  - Performance metrics          │
           │  - Success rate                 │
           │  - Recommendations              │
           └────────────────┬───────────────┘
                            │
                            ▼
           ┌────────────────────────────────┐
           │         Decision                │
           ├────────────────────────────────┤
           │  ≥95% → PRODUCTION READY ✅    │
           │  80-94% → REVIEW NEEDED ⚠️     │
           │  <80% → INVESTIGATE ❌         │
           └────────────────────────────────┘
```

---

## Test Distribution

```
20 COMPREHENSIVE TESTS
│
├─── Group 1: Cache Hit Rate (5 tests)
│    ├── Test 1: S&P 100 (AAPL) <500ms
│    ├── Test 2: S&P 500 (AMD) <500ms
│    ├── Test 3: Extended (SHOP) <500ms
│    ├── Test 4: Portuguese (BCP.LS) cached
│    └── Test 5: Small-cap (CLSK) works
│
├─── Group 2: Growth Rates (5 tests)
│    ├── Test 6: NOT 0%
│    ├── Test 7: Dynamic (AAPL ≠ NVDA)
│    ├── Test 8: Data source shown
│    ├── Test 9: Confidence shown
│    └── Test 10: Analyst count shown
│
├─── Group 3: Bandwidth Protection (4 tests)
│    ├── Test 11: Stats API ✅ AUTOMATED
│    ├── Test 12: History API ✅ AUTOMATED
│    ├── Test 13: Circuit breaker ✅ AUTOMATED
│    └── Test 14: Manual update ✅ AUTOMATED
│
├─── Group 4: Event-Driven Worker (3 tests)
│    ├── Test 15: Health endpoint ✅ AUTOMATED
│    ├── Test 16: Cache invalidation 🔧 SSH
│    └── Test 17: Earnings detection 🔧 SSH
│
└─── Group 5: UI/UX (3 tests)
     ├── Test 18: No median methods 🌐 BROWSER
     ├── Test 19: Custom dropdown 🌐 BROWSER
     └── Test 20: ETF detection 🌐 BROWSER

LEGEND:
✅ AUTOMATED  = Runs via Node.js (5 tests)
🌐 BROWSER   = Manual via DevTools MCP (13 tests)
🔧 SSH       = Manual via SSH (2 tests)
```

---

## File Structure

```
/Users/antoniofrancisco/Documents/teste 1/
│
├── scripts/validation/
│   ├── run-comprehensive-validation.sh
│   │   └─→ Main orchestrator (single entry point)
│   │
│   ├── chrome-devtools-comprehensive-test.mjs
│   │   └─→ Automated API tests (Node.js)
│   │
│   ├── chrome-devtools-browser-tests.md
│   │   └─→ Browser test instructions (DevTools MCP)
│   │
│   ├── README.md
│   │   └─→ Quick reference guide
│   │
│   └── ARCHITECTURE.md
│       └─→ This file (visual overview)
│
├── COMPREHENSIVE_VALIDATION_SETUP.md
│   └─→ Full setup documentation
│
├── VALIDATION_SUITE_READY.md
│   └─→ Ready-to-execute guide
│
└── [Generated Reports]
    ├── CHROME_DEVTOOLS_VALIDATION_2025-10-24.md
    │   └─→ Automated test results
    │
    └── VALIDATION_REPORT_2025-10-24_HH-MM-SS.md
        └─→ Overall summary
```

---

## Execution Flow Diagram

```
START
  │
  ├─→ Is burst complete? ────────→ NO ──→ EXIT (wait 6-7h)
  │                                │
  ├─→ YES                          │
  │                                │
  ├─→ Pre-flight checks            │
  │   ├─ Production accessible?    │
  │   ├─ Worker running?           │
  │   └─ Node.js available?        │
  │                                │
  ├─→ Run API tests (automated)    │
  │   │                            │
  │   ├─→ Test 11: Bandwidth stats      ✅ PASS
  │   ├─→ Test 12: Bandwidth history    ✅ PASS
  │   ├─→ Test 13: Circuit breaker      ✅ PASS
  │   ├─→ Test 14: Manual update        ⚠️ 403 (expected)
  │   └─→ Test 15: Worker health        ? (depends on worker)
  │                                │
  ├─→ Prompt for browser tests     │
  │   │                            │
  │   ├─→ User follows guide:      │
  │   │   chrome-devtools-browser-tests.md
  │   │                            │
  │   ├─→ Tests 1-10: Cache/Growth │
  │   └─→ Tests 18-20: UI/UX       │
  │                                │
  ├─→ Prompt for SSH tests         │
  │   │                            │
  │   ├─→ Test 16: Redis keys      │
  │   └─→ Test 17: PM2 logs        │
  │                                │
  ├─→ Generate reports             │
  │   ├─ API results               │
  │   ├─ Performance metrics       │
  │   └─ Recommendations           │
  │                                │
  └─→ Display summary              │
      │                            │
      ├─→ Success rate ≥95%? ──→ PRODUCTION READY ✅
      ├─→ Success rate 80-94%? ──→ REVIEW NEEDED ⚠️
      └─→ Success rate <80%? ───→ INVESTIGATE ❌
                                   │
                                  END
```

---

## Test Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                    DEPENDENCIES                              │
└──────────────────────────────────────────────────────────────┘

BURST WARMING (prerequisite)
  │
  ├─→ Creates cache entries for 1,493 symbols
  ├─→ Populates Redis with IV data
  ├─→ Warms FMP API cache
  └─→ Takes 6-7 hours
      │
      └─→ ENABLES:
          │
          ├─→ Group 1: Cache Hit Rate Tests
          │   │  (Tests rely on cached data)
          │   │
          │   └─→ Test 1-5: Load times <500ms
          │       (Only possible if cache populated)
          │
          ├─→ Group 2: Growth Rates Tests
          │   │  (Tests rely on real IV calculations)
          │   │
          │   └─→ Test 6-10: Verify NOT 0%
          │       (Only meaningful after burst)
          │
          └─→ Group 4: Worker Tests
              │  (Tests rely on worker state)
              │
              └─→ Test 15-17: Health & cache
                  (Worker must have run burst)

INDEPENDENT TESTS (no burst dependency):
  │
  ├─→ Group 3: Bandwidth Protection
  │   │  (APIs always available)
  │   │
  │   └─→ Test 11-14: API endpoints
  │
  └─→ Group 5: UI/UX
      │  (Frontend always available)
      │
      └─→ Test 18-20: Dropdown & ETF
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. BURST WARMING
   │
   ├─→ FMP API
   │   └─→ Fetches IV data for 1,493 symbols
   │
   ├─→ PostgreSQL
   │   └─→ Stores IV calculations
   │
   └─→ Redis
       └─→ Caches IV results (TTL: varies)

2. VALIDATION TESTS
   │
   ├─→ API Tests
   │   ├─→ Fetch from: https://128.140.45.28.sslip.io/api/*
   │   ├─→ Test endpoints: bandwidth, health, IV
   │   └─→ Verify responses: structure, values, headers
   │
   ├─→ Browser Tests
   │   ├─→ Navigate to: /intrinsic-value?symbol=AAPL
   │   ├─→ Measure: Load times, render times
   │   └─→ Extract: Growth rates, UI elements
   │
   └─→ SSH Tests
       ├─→ Redis: redis-cli KEYS 'iv:*'
       └─→ Logs: pm2 logs iv-worker

3. REPORT GENERATION
   │
   ├─→ Collect results from all test groups
   ├─→ Calculate success rate
   ├─→ Generate performance metrics
   └─→ Write Markdown reports
```

---

## Performance Targets

```
┌─────────────────────────────────────────────────────────────┐
│                  PERFORMANCE TARGETS                        │
└─────────────────────────────────────────────────────────────┘

CACHE HIT RATE:
  Target: >95%
  Measured: (iv:* cache hits) / (total IV requests)
  Success: After burst, >95% of requests served from cache

LOAD TIME:
  Target: <500ms (P95)
  Measured: performance.timing (navigation to loadEventEnd)
  Success: S&P 100/500 stocks load in <500ms

GROWTH RATES ACCURACY:
  Target: 0% false zeros
  Measured: (growth rates ≠ 0%) for all stocks
  Success: All stocks show real growth rates

API RESPONSE TIME:
  Target: <200ms (P95)
  Measured: API endpoint response times
  Success: /api/iv/* endpoints <200ms

WORKER HEALTH:
  Target: 99.9% uptime
  Measured: Health endpoint availability
  Success: Worker responds to /health

BANDWIDTH USAGE:
  Target: <85% of daily limit
  Measured: /api/bandwidth/stats
  Success: Daily usage <85% (circuit breaker inactive)
```

---

## Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING                           │
└─────────────────────────────────────────────────────────────┘

TEST FAILURE CATEGORIES:

1. EXPECTED FAILURES (not counted)
   │
   ├─→ Test 14: 403 (requires auth) ✓ OK
   └─→ Browser tests: "Requires MCP" ✓ OK (manual)

2. SOFT FAILURES (review needed)
   │
   ├─→ Load time 500-1000ms → Still functional
   ├─→ Growth rate variance → May be real
   └─→ Worker occasional downtime → Acceptable

3. HARD FAILURES (investigate)
   │
   ├─→ Growth rates = 0% → ONDA bug
   ├─→ Cache hit rate <80% → Burst failed
   ├─→ API 5xx errors → Backend issue
   └─→ Worker offline >1h → Critical issue

RETRY STRATEGY:

  Test fails once → Retry immediately (transient?)
  Test fails twice → Mark as failure
  Test fails thrice → Critical issue (investigate)

FALLBACK STRATEGY:

  API test fails → Check manually via curl
  Browser test fails → Try different browser/selector
  SSH test fails → Check SSH connectivity first
```

---

## Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                 SUCCESS METRICS DASHBOARD                   │
└─────────────────────────────────────────────────────────────┘

OVERALL SUCCESS RATE: X/20 tests passing (Y%)
  │
  ├─→ ≥95% (19/20) ────────────→ ✅ PRODUCTION READY
  ├─→ 80-94% (16-18/20) ────────→ ⚠️ REVIEW NEEDED
  └─→ <80% (<16/20) ────────────→ ❌ INVESTIGATE

GROUP BREAKDOWN:
  │
  ├─→ Cache Hit Rate: X/5 passing
  │   Target: 5/5 (100%)
  │   Critical: ≥4/5 (80%)
  │
  ├─→ Growth Rates: X/5 passing
  │   Target: 5/5 (100%)
  │   Critical: ≥4/5 (80%)
  │
  ├─→ Bandwidth: X/4 passing
  │   Target: 3/4 (75%) - Test 14 may fail
  │   Critical: ≥2/4 (50%)
  │
  ├─→ Worker: X/3 passing
  │   Target: 3/3 (100%)
  │   Critical: ≥2/3 (67%)
  │
  └─→ UI/UX: X/3 passing
      Target: 3/3 (100%)
      Critical: ≥2/3 (67%)

PERFORMANCE METRICS:
  │
  ├─→ Avg load time: XXXms (target <500ms)
  ├─→ Cache hit rate: XX% (target >95%)
  ├─→ API latency: XXms (target <200ms)
  └─→ Worker uptime: XX% (target >99.9%)
```

---

## Timeline

```
┌─────────────────────────────────────────────────────────────┐
│                        TIMELINE                             │
└─────────────────────────────────────────────────────────────┘

T-0h:  Start burst warming (Agent 1)
       └─→ Process 1,493 symbols

T+1h:  Burst warming in progress (20% complete)
T+2h:  Burst warming in progress (40% complete)
T+3h:  Burst warming in progress (60% complete)
T+4h:  Burst warming in progress (80% complete)
T+5h:  Burst warming in progress (95% complete)

T+6h:  Burst warming COMPLETE ✅
       └─→ Start validation (Agent 2)

T+6h05m: Pre-flight checks complete
T+6h10m: API tests complete (automated)
T+6h30m: Browser tests complete (manual)
T+6h35m: SSH tests complete (manual)
T+6h40m: Reports generated

T+6h45m: Validation COMPLETE ✅
         └─→ Review results & decide

T+7h:  Production use (if ≥95% pass rate)
```

---

**Last Updated:** 2025-10-24 19:32 UTC
**Status:** Architecture documented, ready for execution
