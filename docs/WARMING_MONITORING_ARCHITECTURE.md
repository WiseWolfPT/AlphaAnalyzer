# Intelligent Warming Worker Monitoring - Architecture

**ONDA 7 | 2025-10-24**

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ALFALYZER PLATFORM                                  │
│                     1,493 Stocks × 14 Valuation Methods                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKER ECOSYSTEM (PM2)                               │
├──────────────────────┬──────────────────────┬──────────────────────────────┤
│  Earnings Monitor    │ Intelligent Warming  │  Price Worker  │ Transcripts │
│  Port: 3005          │ Port: 3006 (future)  │  Port: 3002    │ Port: 3003  │
│  Status: Online      │ Status: Planning     │  Status: Online│ Status: Online
├──────────────────────┴──────────────────────┴──────────────────────────────┤
│  Event-driven cache │ IV method warming    │ Quote warming  │ Earnings docs│
│  invalidation       │ (14 methods/stock)   │ (real-time)    │ (7d window)  │
└──────────────────────┬──────────────────────┬────────────────┬──────────────┘
                       │                      │                │
                       └──────────┬───────────┴────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REDIS CACHE (localhost:6379)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Cache Keys:                                                                 │
│    - iv:method:{TICKER}:{METHOD_ID}  [14 methods × 1,493 stocks = 20,902]  │
│    - quote:{TICKER}                  [Real-time prices]                     │
│    - bandwidth:daily:{DATE}          [Bandwidth tracking]                   │
│    - warming:queue                   [Pending tasks]                        │
│    - warming:in-progress             [Active tasks]                         │
│                                                                              │
│  TTLs:                                                                       │
│    - IV methods: 24h (86400s)                                               │
│    - Quotes: 60s                                                             │
│    - Bandwidth: 24h                                                          │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   MONITORING API (Express Routes)                            │
│                 /api/monitoring/warming/*                                    │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│  GET /overview       │  GET /cache-heatmap  │  GET /method-coverage         │
│  - Complete dashboard│  - Coverage by stock │  - Coverage by method         │
│  - 5 metric groups   │  - Top N stocks      │  - All 14 methods             │
│  - JSON response     │  - Heatmap visual    │  - Individual stats           │
├──────────────────────┴──────────────────────┴───────────────────────────────┤
│  GET /real-time (Server-Sent Events)                                        │
│  - 5-second updates                                                          │
│  - Live metrics stream                                                       │
│  - Auto-reconnect                                                            │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │
           ┌───────────┴───────────┬──────────────────┐
           ▼                       ▼                  ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  CLI Dashboard       │ │  Alerting Service│ │  Daily Reports       │
│  watch-warming.sh    │ │  (Auto-monitoring│ │  daily-summary-*.sh  │
│  - Live 5s refresh   │ │  - Bandwidth 85% │ │  - Midnight cron     │
│  - Color-coded       │ │  - Coverage < 50%│ │  - 7-day history     │
│  - Terminal UI       │ │  - Workers down  │ │  - Recommendations   │
└──────────────────────┘ └────────┬─────────┘ └──────────────────────┘
                                  │
                    ┌─────────────┴────────────────┐
                    ▼                              ▼
          ┌──────────────────┐         ┌──────────────────┐
          │  Slack Webhook   │         │ Discord Webhook  │
          │  (Configurable)  │         │  (Configurable)  │
          └──────────────────┘         └──────────────────┘
```

## Data Flow

### 1. Cache Write Flow

```
User Request → Backend API → FMP API → Redis Cache → Response
                                  │
                                  └─→ Bandwidth Tracker (increment)
```

### 2. Monitoring Read Flow

```
CLI/Browser → /api/monitoring/warming/overview
                     │
                     ├─→ Redis: keys scan (iv:method:*)
                     ├─→ Redis: TTL analysis (hotness tiers)
                     ├─→ Redis: bandwidth stats
                     ├─→ Redis: queue metrics
                     ├─→ HTTP: worker health checks
                     │
                     └─→ JSON Response (aggregated)
```

### 3. Alert Flow

```
Scheduled Check (60s) → WarmingAlertingService
                              │
                              ├─→ Check bandwidth > 85%?
                              ├─→ Check coverage < 50%?
                              ├─→ Check workers online?
                              ├─→ Check queue backlog?
                              │
                              └─→ Alert? → Cooldown Check → Send Alert
                                                                 │
                                                ┌────────────────┼────────────┐
                                                ▼                ▼            ▼
                                          Logger           Slack        Discord
```

## Cache Coverage Model

### Method Coverage Calculation

```
Total Possible Entries = 1,493 stocks × 14 methods = 20,902 entries

For each method:
  Coverage % = (Stocks with method cached / 1,493) × 100

For each stock:
  Coverage % = (Methods cached / 14) × 100

Overall Coverage % = (Unique stocks with ANY method cached / 1,493) × 100
```

### Cache Hotness Tiers

```
Redis Key: iv:method:AAPL:dcf20-ocf
           └─ TTL = 86400s (24h)

Age = 86400s - current_ttl

┌─────────┬────────────┬─────────────────────────┐
│  Tier   │    Age     │      Action             │
├─────────┼────────────┼─────────────────────────┤
│ 🔥 Hot  │  < 1h      │ Serve immediately       │
│ 🟠 Warm │  1-12h     │ Serve, consider refresh │
│ 🔵 Cold │  12-24h    │ Refresh on next access  │
│ ❄️ Stale│  > 24h     │ Force refresh           │
└─────────┴────────────┴─────────────────────────┘
```

## Bandwidth Protection

### Daily Budget Calculation

```
FMP Monthly Limit: 20 GB
Days per month: 30
Daily Budget: 20 GB ÷ 30 = 682.67 MB/day

Thresholds:
  - 70% (477.87 MB) = CAUTION (monitor)
  - 85% (580.27 MB) = WARNING (reduce frequency)
  - 95% (648.54 MB) = CRITICAL (auto-pause)
```

### Request Tracking

```
Each API Call:
  1. Estimate bandwidth (KB) based on endpoint
  2. Increment: bandwidth:daily:{YYYY-MM-DD}
  3. Check if projected total exceeds threshold
  4. If > 95%: Return 503 Service Unavailable
  5. If > 85%: Add X-Bandwidth-Warning header
```

### Bandwidth Estimation

```javascript
const BANDWIDTH_ESTIMATES = {
  'analyst-estimates-opt': 0.8 KB,  // Gzipped + selective
  'cash-flow': 10 KB,
  'company-profile': 5 KB,
  'quote': 2 KB,
  'historical': 15 KB,
  'earnings-calendar': 20 KB,
  'default': 5 KB
}
```

## Worker Health Monitoring

### Health Check Protocol

```
Every 5 seconds (real-time endpoint):
  For each worker:
    1. HTTP GET http://localhost:{PORT}/health
    2. Timeout: 5 seconds
    3. Expected response:
       {
         "status": "healthy",
         "worker": "worker-name",
         "uptime": 86400,
         "lastRunAt": "ISO-8601",
         "lastCycleStats": {...}
       }
    4. Parse status: online | degraded | offline
```

### Worker Ports

| Worker | Port | Health Endpoint | Status |
|--------|------|-----------------|--------|
| Earnings Monitor | 3005 | ✅ Implemented | Online |
| Intelligent Warming | 3006 | ⚠️ Future | Planning |
| Price Worker | 3002 | ✅ Implemented | Online |
| Transcripts Worker | 3003 | ✅ Implemented | Online |

## Queue Metrics

### Queue Architecture (Future)

```
Warming Queue (Redis Lists):

warming:queue (FIFO)
  - LPUSH: Add new warming tasks
  - RPOP: Worker pulls next task
  - LLEN: Get pending count

warming:in-progress (Set)
  - SADD: Mark task as processing
  - SREM: Remove when complete
  - SCARD: Get in-progress count

warming:completed:{YYYY-MM-DD} (Counter)
  - INCR: Increment on completion
  - GET: Get daily completed count
  - EXPIRE: 24h TTL
```

### Throughput Calculation

```
Throughput (tasks/hour) = Completed Today ÷ Hours Elapsed

Example:
  Completed: 1247 tasks
  Time: 6.5 hours since midnight
  Throughput: 1247 ÷ 6.5 = 191.77 tasks/hour
```

## 14 Valuation Methods

### Method Categories

```
┌────────────────────────────────────────────────────────────┐
│                    PROPRIETARY (4)                          │
├──────────────────────┬─────────────────────────────────────┤
│ dcf20-ocf            │ DCF-20 Operating Cash Flow          │
│ dfcf20               │ DFCF-20 Free Cash Flow              │
│ dni20                │ DNI-20 Net Income                   │
│ dfcf-terminal        │ DFCF Terminal (3-stage)             │
└──────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     MULTIPLES (5)                           │
├──────────────────────┬─────────────────────────────────────┤
│ ps-mean              │ P/S Mean 5Y                         │
│ pe-mean              │ P/E Mean 5Y ex-NRI                  │
│ pb-mean              │ P/B Mean 5Y                         │
│ pe-mean-no-nri       │ P/E Mean without NRI                │
│ pb-mean-no-nri       │ P/B Mean without NRI                │
└──────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                      GROWTH (2)                             │
├──────────────────────┬─────────────────────────────────────┤
│ peg                  │ PEG ex-NRI                          │
│ psg                  │ PSG                                 │
└──────────────────────┴─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                      OTHER (3)                              │
├──────────────────────┬─────────────────────────────────────┤
│ oraclevalue          │ OracleValue™ (proprietary)          │
│ custom               │ Custom Method (user-defined)        │
│ fmp-dcf              │ FMP DCF (external API)              │
└──────────────────────┴─────────────────────────────────────┘
```

### Cache Key Pattern

```
iv:method:{TICKER}:{METHOD_ID}

Examples:
  iv:method:AAPL:dcf20-ocf
  iv:method:MSFT:dfcf-terminal
  iv:method:GOOGL:pe-mean
  iv:method:AMZN:oraclevalue

Total Possible Keys: 1,493 × 14 = 20,902
```

## API Response Formats

### GET /overview

```json
{
  "success": true,
  "data": {
    "cache": {
      "totalStocks": 1493,
      "cachedStocks": 1247,
      "coveragePercent": "83.52",
      "hotness": { "hot": 450, "warm": 620, "cold": 177, "stale": 0 }
    },
    "bandwidth": {
      "dailyUsed": "245.67 MB",
      "dailyBudget": "682.67 MB",
      "percentUsed": "35.98%",
      "status": "OK",
      "projectedEOD": "489.34 MB"
    },
    "apiCalls": {
      "today": 8234,
      "rateLimit": "4 calls/sec",
      "budgetRemaining": "437.00 MB"
    },
    "workers": {
      "earningsMonitor": { "status": "online", "uptime": 86400 },
      "intelligentWarming": { "status": "online", "uptime": 172800 },
      "priceWorker": { "status": "online", "uptime": 259200 },
      "transcriptsWorker": { "status": "online", "uptime": 345600 }
    },
    "warmingQueue": {
      "pending": 23,
      "inProgress": 5,
      "completedToday": 1247,
      "avgWaitTime": "0.12 hours",
      "throughput": "191.77 tasks/hour"
    },
    "timestamp": "2025-10-24T12:34:56.789Z"
  }
}
```

### GET /cache-heatmap?limit=20

```json
{
  "success": true,
  "data": [
    {
      "ticker": "AAPL",
      "cachedMethods": 14,
      "totalMethods": 14,
      "coverage": "100.00",
      "methods": [
        { "methodId": "dcf20-ocf", "cached": true },
        { "methodId": "dfcf20", "cached": true },
        ...
      ]
    }
  ]
}
```

### GET /real-time (SSE)

```
data: {"cache":{"cachedStocks":1247,"coveragePercent":"83.52"},"bandwidth":{"percentUsed":"35.98","status":"OK"},"queue":{"pending":23,"completedToday":1247},"timestamp":"2025-10-24T12:34:56.789Z"}

data: {"cache":{"cachedStocks":1248,"coveragePercent":"83.59"},"bandwidth":{"percentUsed":"36.02","status":"OK"},"queue":{"pending":22,"completedToday":1248},"timestamp":"2025-10-24T12:35:01.789Z"}
```

## Security Considerations

### Rate Limiting

```
General API: 100 req/min (existing)
Monitoring Endpoints: Inherit general limit
Real-time SSE: 1 connection per client (enforced by browser)
```

### Authentication

```
Monitoring Endpoints: Public (no auth required)
  - Read-only metrics
  - No sensitive data exposed
  - IP-based rate limiting

Admin Actions: Authentication required (future)
  - Pause/resume workers
  - Clear cache
  - Manual warming triggers
```

### Data Privacy

```
Exposed:
  ✅ Aggregate statistics (coverage %, bandwidth usage)
  ✅ Ticker symbols (public information)
  ✅ Worker status (operational data)

Protected:
  ❌ API keys (never exposed)
  ❌ User data (no PII in monitoring)
  ❌ Financial data values (only cache status)
```

## Performance Characteristics

### Response Times

| Endpoint | Target | Typical | Max |
|----------|--------|---------|-----|
| /overview | < 500ms | 120ms | 1000ms |
| /cache-heatmap | < 1000ms | 300ms | 2000ms |
| /method-coverage | < 800ms | 200ms | 1500ms |
| /real-time (SSE) | < 100ms | 50ms | 200ms |

### Resource Usage

```
Memory Impact:
  - Monitoring routes: ~5 MB
  - Alerting service: ~2 MB
  - SSE connections: ~100 KB per client
  Total: ~7 MB + (clients × 100 KB)

CPU Impact:
  - Redis key scans: Minimal (O(N) where N = 20,902)
  - Worker health checks: Negligible (4 HTTP requests/5s)
  - Alert checks: Minimal (60s interval)

Redis Impact:
  - Key scans: KEYS command (not ideal for production at scale)
  - Future optimization: SCAN with cursor for large datasets
```

## Scaling Considerations

### Current Limits

```
Stocks: 1,493
Methods: 14
Total Keys: 20,902
Workers: 4
SSE Connections: Unlimited (recommend < 100)
```

### Future Scaling

```
10,000 stocks × 14 methods = 140,000 keys

Optimizations needed:
  1. Replace KEYS with SCAN (non-blocking)
  2. Cache aggregated stats (5-minute TTL)
  3. Implement pagination for heatmap
  4. Add Redis read replicas
  5. Implement worker pool (multiple warming workers)
```

## Integration Points

### Existing Systems

```
1. Bandwidth Protection Middleware
   - Source: server/middleware/bandwidth-protection.ts
   - Integration: getBandwidthStatsForMonitoring()
   - Flow: Monitoring reads existing Redis counters

2. Redis Cache Service
   - Source: server/cache/redis-cache-service.ts
   - Integration: Direct Redis operations
   - Flow: Key scanning, TTL analysis

3. Worker Health Endpoints
   - Source: server/workers/*-worker.ts
   - Integration: HTTP health checks
   - Flow: GET http://localhost:{PORT}/health
```

### Future Integrations

```
1. Intelligent Warming Worker (planned)
   - Port: 3006
   - Health endpoint: /health
   - Queue operations: LPUSH/RPOP warming:queue

2. Frontend Dashboard (optional)
   - React component: client/src/pages/monitoring-dashboard.tsx
   - SSE subscription: /api/monitoring/warming/real-time
   - Real-time charts: Chart.js or Recharts

3. Grafana/Prometheus (long-term)
   - Metrics export endpoint: /metrics
   - Format: Prometheus text format
   - Scrape interval: 15s
```

---

**Architecture Version:** 1.0.0
**Last Updated:** 2025-10-24 (ONDA 7)
**Status:** Production Ready
