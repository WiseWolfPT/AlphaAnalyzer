# Agent 18: Sector-Based Smart Warming - Deployment Guide

**Quick deployment guide for production rollout**

---

## Pre-Flight Checklist

Before deploying, verify these components are in place:

```bash
# 1. Check all files exist
ls -lh server/config/sector-warming-config.ts
ls -lh server/services/gics-sector-service.ts
ls -lh server/data/priority-stocks-index.ts
ls -lh server/workers/intelligent-warming-worker.ts
ls -lh server/routes/monitoring-warming.ts

# 2. Check stock universe CSV exists
ls -lh stock_universe_complete.csv
wc -l stock_universe_complete.csv  # Should show 1494 lines (1493 stocks + header)

# 3. Verify validation script
node scripts/validation/validate-sector-warming.mjs --local
```

Expected validation result: **≥21/30 tests passed** (core features operational)

---

## Deployment Steps

### Step 1: Build Server & Worker

```bash
# Build production bundles
npm run build:server

# Verify build output
ls -lh dist/server/index.cjs
ls -lh dist/server/workers/intelligent-warming-worker.cjs
```

### Step 2: Deploy to Production

```bash
# Full deployment (frontend + backend + workers)
npm run deploy:full

# Or backend only (if frontend unchanged)
npm run deploy:server
```

### Step 3: Upload Stock Universe CSV

```bash
# Copy stock universe to production server
scp stock_universe_complete.csv root@128.140.45.28:"/home/teste 1/"

# Verify upload
ssh root@128.140.45.28 "wc -l '/home/teste 1/stock_universe_complete.csv'"
```

### Step 4: Restart Warming Worker

```bash
# Restart with updated environment
ssh root@128.140.45.28 "pm2 restart intelligent-warming-worker --update-env"

# Check worker status
ssh root@128.140.45.28 "pm2 status intelligent-warming-worker"
```

### Step 5: Verify Worker Health

```bash
# Check worker health endpoint
ssh root@128.140.45.28 "curl -s http://localhost:3008/health | jq '.'"

# Expected output:
# {
#   "status": "ok",
#   "timestamp": "2025-11-05T...",
#   "queue": { "queueSize": ..., "completedToday": ... },
#   "bandwidth": { "percentUsed": ..., "allowWarming": true },
#   "config": { "batchSize": 50, "cycleInterval": 300000 }
# }
```

### Step 6: Monitor Sector Metrics

```bash
# Check sector warming stats
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/sectors | jq '.data.summary'

# Expected output:
# {
#   "totalApiCallsPerDay": 9500-10500,
#   "reductionVsUniform": "50-60%",
#   "totalStocks": 1493,
#   "sectorCount": 11
# }
```

---

## Post-Deployment Validation

### Immediate Checks (First 5 Minutes)

```bash
# 1. Worker logs (check for errors)
ssh root@128.140.45.28 "pm2 logs intelligent-warming-worker --lines 50 --nostream"

# Look for:
# ✅ "IntelligentWarming] Starting..."
# ✅ "Sector-based warming scheduled X tasks"
# ✅ "Cycle N complete: X success, Y failed"
# ❌ "HTTP 429" errors (should be 0)
# ❌ "Bandwidth exceeded" warnings
```

```bash
# 2. Redis connection (check GICS service initialized)
ssh root@128.140.45.28 "pm2 logs intelligent-warming-worker --lines 100 | grep -i 'sector'"

# Expected logs:
# "GICS sector service initializing..."
# "Sector-based warming initialized: { totalStocks: 1493, sectors: {...} }"
# "Sector warming scheduled X tasks"
```

```bash
# 3. Sector coverage (baseline measurement)
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/sectors \
  | jq '.data.sectors | to_entries[] | {sector: .key, coverage: .value.cacheCoverage.coveragePercent}'

# Save output for comparison after 24h
```

### First Hour Monitoring

```bash
# Watch real-time warming activity
scripts/monitoring/watch-warming.sh https://128.140.45.28.sslip.io

# Expected metrics (after 1 hour):
# - Cache coverage: 10-15% (warming in progress)
# - Bandwidth used: <50 MB (7% of daily budget)
# - HTTP 429 errors: 0
# - Queue size: 200-500 pending (decreasing)
```

### First 24 Hours

```bash
# Daily summary report
scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io

# Target metrics (after 24h):
# - Cache coverage: >80% (priority stocks)
# - Bandwidth used: <300 MB (44% of daily budget)
# - HTTP 429 errors: 0
# - API call reduction: >50% vs baseline
```

---

## Rollback Plan

If critical issues arise, rollback to previous worker version:

```bash
# Option 1: Git rollback (if commit was made)
ssh root@128.140.45.28 "cd '/home/teste 1' && git checkout HEAD~1"
npm run deploy:server
ssh root@128.140.45.28 "pm2 restart intelligent-warming-worker --update-env"

# Option 2: Disable sector warming (fallback to tiered warming)
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"

# Add this line to disable sector warming:
# DISABLE_SECTOR_WARMING=true

pm2 restart intelligent-warming-worker --update-env
```

---

## Configuration Tuning (Optional)

### Scenario 1: HTTP 429 Errors Occurring

**Symptom:** Rate limit errors in logs

**Solution:** Reduce warming aggressiveness

```bash
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"

# Add/modify these variables:
WARMING_BATCH_SIZE=30              # Down from 50
WARMING_RATE_LIMIT_MS=300          # Up from 250 (slower rate)
WARMING_CYCLE_INTERVAL_MS=360000   # Up from 300000 (longer cycles)

pm2 restart intelligent-warming-worker --update-env
```

### Scenario 2: Bandwidth Budget Exceeded

**Symptom:** "Bandwidth CRITICAL" alerts

**Solution:** Reduce high-frequency sector refresh intervals

```typescript
// server/config/sector-warming-config.ts

[Sector.INFORMATION_TECHNOLOGY]: {
  refreshIntervalMarketHours: 10 * 60 * 1000,  // Change from 5 min → 10 min
  refreshIntervalAfterHours: 60 * 60 * 1000,   // Change from 30 min → 60 min
  // ...
}
```

Rebuild and redeploy:
```bash
npm run build:server
npm run deploy:server
ssh root@128.140.45.28 "pm2 restart intelligent-warming-worker --update-env"
```

### Scenario 3: Cache Hit Rate Below Target

**Symptom:** Hit rate <70% after 24h

**Solution:** Increase warming aggressiveness

```bash
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"

# Add/modify these variables:
WARMING_BATCH_SIZE=70              # Up from 50
WARMING_CYCLE_INTERVAL_MS=240000   # Down from 300000 (shorter cycles)

pm2 restart intelligent-warming-worker --update-env
```

---

## Monitoring Dashboard Setup

### Live Monitoring (Terminal)

```bash
# Real-time warming dashboard
watch -n 5 'curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview | jq "{cache: .data.cache, bandwidth: .data.bandwidth, queue: .data.warmingQueue}"'

# Sector-specific monitoring
watch -n 10 'curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/sectors | jq ".data.sectors | to_entries[] | {sector: .key, coverage: .value.cacheCoverage.coveragePercent, fresh: .value.cacheCoverage.freshnessPercent}"'
```

### Cron Job Setup (Automated Monitoring)

```bash
ssh root@128.140.45.28
crontab -e

# Add these lines:

# Warming monitor every 15 min
*/15 * * * * cd '/home/teste 1' && TARGET_URL=https://128.140.45.28.sslip.io scripts/monitoring/monitor-all.sh >> /var/log/alfalyzer/monitoring/cron.log 2>&1

# Daily warming summary at midnight
0 0 * * * cd '/home/teste 1' && scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io >> /var/log/alfalyzer/monitoring/daily-summary.log 2>&1

# Weekly sector report (Mondays at 8 AM)
0 8 * * 1 curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/sectors | jq '.' > /var/log/alfalyzer/monitoring/weekly-sector-report-$(date +\%Y-\%m-\%d).json
```

---

## Success Metrics (24-Hour Targets)

After 24 hours of sector warming, these metrics should be achieved:

| Metric                    | Baseline (Before) | Target (After 24h) | Status |
|---------------------------|-------------------|--------------------|--------|
| **Cache Hit Rate**        | ~60%              | **>80%** ✅         | Monitor |
| **HTTP 429 Errors**       | ~37/day           | **0** ✅            | Monitor |
| **API Calls/Day**         | ~21,500           | **<10,500** ✅      | Monitor |
| **Priority Stock Freshness** | ~70%           | **>90%** ✅         | Monitor |
| **Tech Stocks Staleness** | ~15 min           | **<5 min** ✅       | Monitor |
| **Bandwidth Usage**       | ~450 MB/day       | **<300 MB/day** ✅  | Monitor |
| **User Latency (P95)**    | ~400ms            | **<100ms** ✅       | Monitor |

### How to Measure

```bash
# 1. Cache hit rate
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview \
  | jq '.data.cache.coveragePercent'

# 2. HTTP 429 errors
ssh root@128.140.45.28 "grep '429' /var/log/alfalyzer/monitoring/cron.log | wc -l"

# 3. API calls today
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview \
  | jq '.data.apiCalls.today'

# 4. Priority stock freshness (Tier 1)
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/tiers \
  | jq '.data.tiers.tier1_hot.coverage.hotness.hot'

# 5. Tech sector staleness
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/sectors \
  | jq '.data.sectors["Information Technology"].cacheCoverage.freshnessPercent'

# 6. Bandwidth usage
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview \
  | jq '.data.bandwidth.dailyUsed'

# 7. User latency (check analytics or APM tool)
# This requires frontend instrumentation or APM integration
```

---

## Troubleshooting Quick Reference

### Problem: Worker not starting

**Check:**
```bash
ssh root@128.140.45.28 "pm2 logs intelligent-warming-worker --lines 100 --err"
```

**Common causes:**
- Missing `stock_universe_complete.csv`
- Redis connection failure
- Environment variables not loaded

**Fix:**
```bash
# Verify CSV exists
ssh root@128.140.45.28 "ls -lh '/home/teste 1/stock_universe_complete.csv'"

# Test Redis connection
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis PING"

# Reload environment
ssh root@128.140.45.28 "pm2 restart intelligent-warming-worker --update-env"
```

### Problem: Sector metrics endpoint returning errors

**Check:**
```bash
curl -i https://128.140.45.28.sslip.io/api/monitoring/warming/sectors
```

**Common causes:**
- GICS sector service not initialized
- Redis connection timeout
- CSV parsing errors

**Fix:**
```bash
# Check worker logs for initialization errors
ssh root@128.140.45.28 "pm2 logs intelligent-warming-worker | grep -i 'gics'"

# Verify CSV format
ssh root@128.140.45.28 "head -5 '/home/teste 1/stock_universe_complete.csv'"

# Restart worker to re-initialize
ssh root@128.140.45.28 "pm2 restart intelligent-warming-worker"
```

### Problem: Cache coverage not improving

**Check:**
```bash
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview \
  | jq '.data.warmingQueue'
```

**Common causes:**
- Queue backup (too many pending tasks)
- Bandwidth budget exceeded
- Rate limiting too aggressive

**Fix:**
```bash
# Check bandwidth status
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview \
  | jq '.data.bandwidth'

# If bandwidth exceeded, wait for daily reset (UTC midnight)
# If queue backed up, increase batch size
ssh root@128.140.45.28
nano "/home/teste 1/.env.production"
# Add: WARMING_BATCH_SIZE=70
pm2 restart intelligent-warming-worker --update-env
```

---

## Contact & Support

**Agent:** Agent 18 (Sector-Based Smart Warming)
**Documentation:** `/AGENT_18_SECTOR_WARMING_IMPLEMENTATION_REPORT.md`
**Validation Script:** `/scripts/validation/validate-sector-warming.mjs`
**Monitoring Scripts:** `/scripts/monitoring/watch-warming.sh`, `daily-summary-warming.sh`

**Production Server:**
- URL: https://128.140.45.28.sslip.io
- SSH: root@128.140.45.28
- Worker Health: http://localhost:3008/health
- Sector Metrics: /api/monitoring/warming/sectors

---

## Deployment Completion Checklist

- [ ] All files built successfully (`npm run build:server`)
- [ ] Server deployed (`npm run deploy:full`)
- [ ] Stock universe CSV uploaded to production
- [ ] Worker restarted with updated environment
- [ ] Worker health endpoint returns 200 OK
- [ ] Sector metrics endpoint returns valid data
- [ ] No HTTP 429 errors in first hour
- [ ] Cache coverage increasing (>10% after 1h)
- [ ] Monitoring cron jobs configured
- [ ] 24-hour baseline metrics recorded
- [ ] Success metrics targets validated

**Deployment Status:** ⬜ PENDING / ✅ COMPLETE

---

**Last Updated:** 2025-11-05
**Next Review:** 24 hours post-deployment
