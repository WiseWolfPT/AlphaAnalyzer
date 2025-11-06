# ONDA 7: Intelligent Warming Worker Monitoring Guide

**Created:** 2025-10-24
**Status:** Production Ready
**Architecture:** Redis-backed real-time monitoring with SSE

## Overview

Comprehensive observability system for the Intelligent Warming Worker that provides:
- **Real-time cache coverage** tracking (% of 1,493 stocks warmed)
- **API usage monitoring** (FMP rate limits & bandwidth)
- **Worker health status** (all 4 workers: earnings, warming, price, transcripts)
- **Queue metrics** (pending, in-progress, throughput)
- **Alerting system** (Slack/Discord/Email integration)

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Intelligent Warming Worker (Port 3006)          │
│  - Monitors 1,493 stocks × 14 valuation methods         │
│  - Event-driven cache warming via earnings calendar     │
│  - Rate limited: 4 req/s (FMP compliance)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Redis Cache (localhost:6379)                │
│  - Cache keys: iv:method:{TICKER}:{METHOD_ID}           │
│  - Queue: warming:queue, warming:in-progress            │
│  - Bandwidth: bandwidth:daily:{DATE}                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│      Monitoring API (/api/monitoring/warming/*)         │
│  - GET /overview       → Real-time dashboard data       │
│  - GET /cache-heatmap  → Coverage by stock              │
│  - GET /method-coverage → Coverage by method            │
│  - GET /real-time      → SSE stream (5s updates)        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CLI Monitoring Tools                        │
│  - watch-warming.sh       → Live dashboard              │
│  - daily-summary-warming.sh → Daily reports             │
└─────────────────────────────────────────────────────────┘
```

## 14 Valuation Methods Tracked

| Method ID | Name | Category |
|-----------|------|----------|
| `dcf20-ocf` | DCF-20 OCF | Proprietary |
| `dfcf20` | DFCF-20 FCF | Proprietary |
| `dni20` | DNI-20 Net Income | Proprietary |
| `dfcf-terminal` | DFCF Terminal (3-stage) | Proprietary |
| `ps-mean` | P/S Mean 5Y | Multiples |
| `pe-mean` | P/E Mean 5Y ex-NRI | Multiples |
| `pb-mean` | P/B Mean 5Y | Multiples |
| `peg` | PEG ex-NRI | Growth |
| `psg` | PSG | Growth |
| `pe-mean-no-nri` | P/E Mean without NRI | Multiples |
| `pb-mean-no-nri` | P/B Mean without NRI | Multiples |
| `oraclevalue` | OracleValue™ | Proprietary |
| `custom` | Custom Method | Proprietary |
| `fmp-dcf` | FMP DCF (external) | DCF |

## API Endpoints

### GET /api/monitoring/warming/overview

Real-time overview of entire warming system.

**Response:**
```json
{
  "success": true,
  "data": {
    "cache": {
      "totalStocks": 1493,
      "cachedStocks": 1247,
      "coveragePercent": "83.52",
      "hotness": {
        "hot": 450,    // <1h old
        "warm": 620,   // 1-12h old
        "cold": 177,   // 12-24h old
        "stale": 0     // >24h old
      }
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
      "earningsMonitor": {
        "name": "earnings-monitor",
        "status": "online",
        "uptime": 86400,
        "lastRunAt": "2025-10-24T10:00:00Z"
      },
      "intelligentWarming": {
        "name": "intelligent-warming-worker",
        "status": "online",
        "uptime": 172800
      },
      "priceWorker": {
        "name": "price-worker",
        "status": "online",
        "uptime": 259200
      },
      "transcriptsWorker": {
        "name": "transcripts-worker",
        "status": "online",
        "uptime": 345600
      }
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

### GET /api/monitoring/warming/cache-heatmap?limit=100

Visual heatmap showing cache coverage for individual stocks.

**Response:**
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
    },
    {
      "ticker": "MSFT",
      "cachedMethods": 12,
      "totalMethods": 14,
      "coverage": "85.71",
      "methods": [...]
    }
  ]
}
```

### GET /api/monitoring/warming/method-coverage

Coverage breakdown by valuation method.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "methodId": "dcf20-ocf",
      "cachedStocks": 1247,
      "totalStocks": 1493,
      "coveragePercent": "83.52"
    },
    {
      "methodId": "dfcf20",
      "cachedStocks": 1198,
      "totalStocks": 1493,
      "coveragePercent": "80.24"
    },
    ...
  ]
}
```

### GET /api/monitoring/warming/real-time

Server-Sent Events stream for real-time updates (every 5 seconds).

**Usage:**
```javascript
const eventSource = new EventSource('/api/monitoring/warming/real-time');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

**Event Data:**
```json
{
  "cache": {
    "cachedStocks": 1247,
    "coveragePercent": "83.52"
  },
  "bandwidth": {
    "percentUsed": "35.98",
    "status": "OK"
  },
  "queue": {
    "pending": 23,
    "completedToday": 1247
  },
  "timestamp": "2025-10-24T12:34:56.789Z"
}
```

## CLI Monitoring Tools

### watch-warming.sh - Live Dashboard

Real-time monitoring with auto-refresh every 5 seconds.

**Usage:**
```bash
# Local development
scripts/monitoring/watch-warming.sh

# Production
scripts/monitoring/watch-warming.sh https://128.140.45.28.sslip.io
```

**Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INTELLIGENT WARMING WORKER DASHBOARD
  2025-10-24 12:34:56
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CACHE COVERAGE
────────────────────────────────────────────────────────────────────
  Total Stocks:    1493
  Cached Stocks:   1247
  Coverage:        83.52%

  Hotness Distribution:
    🔥 Hot (<1h):     450
    🟠 Warm (1-12h):  620
    🔵 Cold (12-24h): 177
    ❄️  Stale (>24h):  0

📡 BANDWIDTH USAGE
────────────────────────────────────────────────────────────────────
  Used:            245.67 MB
  Budget:          682.67 MB
  Percent Used:    35.98%
  Status:          ✅ OK
  Projected EOD:   489.34 MB

🔌 API CALLS
────────────────────────────────────────────────────────────────────
  Today:           8234 calls
  Rate Limit:      4 calls/sec
  Budget Remaining: 437.00 MB

⚙️  WORKERS STATUS
────────────────────────────────────────────────────────────────────
  Earnings Monitor: ✅ Online
  Intelligent Warming: ✅ Online
  Price Worker: ✅ Online
  Transcripts Worker: ✅ Online

📋 WARMING QUEUE
────────────────────────────────────────────────────────────────────
  Pending:         23
  In Progress:     5
  Completed Today: 1247
  Avg Wait Time:   0.12 hours
  Throughput:      191.77 tasks/hour
```

### daily-summary-warming.sh - Daily Reports

Comprehensive daily report with recommendations.

**Usage:**
```bash
# Local
scripts/monitoring/daily-summary-warming.sh

# Production
scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io

# With email notification
REPORT_EMAIL=admin@alfalyzer.com scripts/monitoring/daily-summary-warming.sh
```

**Cron Setup (Midnight Daily):**
```cron
0 0 * * * cd '/home/teste 1' && scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io >> /var/log/alfalyzer/monitoring/daily-summary.log 2>&1
```

**Output File:** `/var/log/alfalyzer/monitoring/warming-summary-YYYY-MM-DD.txt`

## Alerting System

### WarmingAlertingService

Automatic monitoring with configurable alerts.

**Integration in server/index.ts:**
```typescript
import { warmingAlertingService } from './services/warming-alerting-service';

// Start monitoring on server startup
warmingAlertingService.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  warmingAlertingService.stop();
});
```

### Alert Conditions

| Condition | Level | Threshold | Action |
|-----------|-------|-----------|--------|
| Bandwidth > 95% | CRITICAL | 95% | Auto-pause warming worker |
| Bandwidth > 85% | WARNING | 85% | Monitor closely |
| Cache coverage < 50% | WARNING | 50% | Check worker health |
| Worker offline | CRITICAL | N/A | Restart worker |
| Queue backlog > 100 | WARNING | 100 tasks | Scale capacity |

### Alert Channels

#### 1. Structured Logger (Always Active)
All alerts logged to `/var/log/alfalyzer/monitoring/`

#### 2. Slack Integration
```bash
# .env.production
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### 3. Discord Integration
```bash
# .env.production
ALERT_DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
```

#### 4. Email (Future)
```bash
# .env.production
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_TO=admin@alfalyzer.com
```

### Cooldown System

Alerts have 1-hour cooldown to prevent spam:
- Same alert won't fire twice within 60 minutes
- Tracked per `{level}:{title}` combination
- Cooldown resets after threshold exceeded

## Cache Hotness Tiers

| Tier | Age | Description | Action |
|------|-----|-------------|--------|
| 🔥 Hot | < 1h | Fresh data | Serve immediately |
| 🟠 Warm | 1-12h | Recent data | Serve, consider refresh |
| 🔵 Cold | 12-24h | Aging data | Refresh on next access |
| ❄️ Stale | > 24h | Expired data | Force refresh |

## Performance Metrics

### SLOs (Service Level Objectives)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Cache Coverage | > 80% | 83.52% | ✅ GOOD |
| Bandwidth Usage | < 85% | 35.98% | ✅ GOOD |
| Queue Throughput | > 150 tasks/h | 191.77 tasks/h | ✅ GOOD |
| Worker Uptime | > 99% | 100% | ✅ GOOD |
| Avg Wait Time | < 1h | 0.12h | ✅ GOOD |

### Bandwidth Budget

- **Daily Budget:** 682.67 MB (20 GB / 30 days)
- **Monthly Limit:** 20 GB (FMP Professional)
- **Safety Thresholds:**
  - 70% = CAUTION (monitor)
  - 85% = WARNING (reduce frequency)
  - 95% = CRITICAL (auto-pause)

## Troubleshooting

### Issue: Cache coverage dropping

**Symptoms:**
- Coverage < 80%
- Many "cold" or "stale" entries
- Increasing queue backlog

**Diagnosis:**
```bash
# Check worker status
ssh root@128.140.45.28 "pm2 status intelligent-warming-worker"

# Check logs
ssh root@128.140.45.28 "pm2 logs intelligent-warming-worker --lines 50"

# Check Redis connection
curl https://128.140.45.28.sslip.io/api/health
```

**Solutions:**
1. Restart worker: `pm2 restart intelligent-warming-worker`
2. Clear stuck queue: Redis CLI → `DEL warming:queue`
3. Verify FMP API key valid
4. Check bandwidth not exceeded

### Issue: High bandwidth usage

**Symptoms:**
- Bandwidth > 85%
- Status: WARNING or CRITICAL
- Projected EOD > daily budget

**Diagnosis:**
```bash
# Check bandwidth history
curl https://128.140.45.28.sslip.io/api/bandwidth/history

# Check recent API calls
curl https://128.140.45.28.sslip.io/api/monitoring/warming/overview | jq '.data.apiCalls'
```

**Solutions:**
1. **Immediate:** Pause warming worker
2. **Short-term:** Reduce warming frequency
3. **Long-term:** Implement tiered warming (hot/warm/cold)
4. **Optimization:** Increase cache TTLs (currently 24h)

### Issue: Workers offline

**Symptoms:**
- Worker status: offline/degraded
- Health endpoint not responding
- CRITICAL alerts firing

**Diagnosis:**
```bash
# Check PM2 status
ssh root@128.140.45.28 "pm2 status"

# Check specific worker
ssh root@128.140.45.28 "pm2 show intelligent-warming-worker"

# Check logs for crashes
ssh root@128.140.45.28 "pm2 logs intelligent-warming-worker --err --lines 100"
```

**Solutions:**
```bash
# Restart specific worker
pm2 restart intelligent-warming-worker --update-env

# Restart all workers
pm2 restart all

# Reset and reload from ecosystem file
pm2 delete all && pm2 start ecosystem.config.cjs
```

## Production Deployment

### 1. Deploy Monitoring Routes

```bash
# Build server with new routes
npm run build:server

# Deploy to production
npm run deploy:server

# Restart backend
ssh root@128.140.45.28 "pm2 restart alfalyzer --update-env"
```

### 2. Setup Cron Jobs

```bash
# SSH to production
ssh root@128.140.45.28

# Edit crontab
crontab -e

# Add daily summary (midnight)
0 0 * * * cd '/home/teste 1' && scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io >> /var/log/alfalyzer/monitoring/daily-summary.log 2>&1

# Add hourly health check
0 * * * * cd '/home/teste 1' && curl -sf https://128.140.45.28.sslip.io/api/monitoring/warming/overview > /dev/null || pm2 restart intelligent-warming-worker
```

### 3. Configure Alerts

```bash
# Add to .env.production
echo "ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK" >> .env.production

# Restart to pick up new ENV
pm2 restart all --update-env
```

### 4. Enable Alerting Service

In `server/index.ts`, add after server start:
```typescript
import { warmingAlertingService } from './services/warming-alerting-service';

// Start monitoring
warmingAlertingService.start();

// Graceful shutdown
const shutdown = () => {
  warmingAlertingService.stop();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Dashboard Integration (Optional)

### Frontend React Component

Create `client/src/pages/monitoring-dashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function WarmingMonitoringDashboard() {
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    // Real-time updates via SSE
    const eventSource = new EventSource('/api/monitoring/warming/real-time');

    eventSource.onmessage = (event) => {
      setOverview(JSON.parse(event.data));
    };

    return () => eventSource.close();
  }, []);

  if (!overview) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {/* Cache Coverage */}
      <Card>
        <CardHeader>Cache Coverage</CardHeader>
        <CardContent>
          <Progress value={parseFloat(overview.cache.coveragePercent)} />
          <p className="mt-2">{overview.cache.cachedStocks} / 1,493 stocks</p>
        </CardContent>
      </Card>

      {/* Bandwidth */}
      <Card>
        <CardHeader>Bandwidth</CardHeader>
        <CardContent>
          <Progress
            value={parseFloat(overview.bandwidth.percentUsed)}
            className={overview.bandwidth.status === 'CRITICAL' ? 'bg-red-500' : ''}
          />
          <p className="mt-2">{overview.bandwidth.status}</p>
        </CardContent>
      </Card>

      {/* Queue */}
      <Card>
        <CardHeader>Warming Queue</CardHeader>
        <CardContent>
          <p>Pending: {overview.queue.pending}</p>
          <p>Completed: {overview.queue.completedToday}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Maintenance

### Weekly Tasks
- [ ] Review daily summary reports
- [ ] Check for trending increases in bandwidth
- [ ] Verify all workers online
- [ ] Monitor cache coverage trends

### Monthly Tasks
- [ ] Analyze bandwidth usage patterns
- [ ] Optimize cache TTLs if needed
- [ ] Review alert frequency
- [ ] Clean old log files

### Quarterly Tasks
- [ ] Review SLOs and adjust targets
- [ ] Evaluate need for scaling
- [ ] Update documentation
- [ ] Performance tuning

## Support

**Issues:** File in GitHub with label `monitoring`
**Logs:** `/var/log/alfalyzer/monitoring/`
**Docs:** This file + `CLAUDE.md`

---

**Last Updated:** 2025-10-24
**Version:** 1.0.0 (ONDA 7)
