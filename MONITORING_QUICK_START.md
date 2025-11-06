# Rate Limit Monitoring - Quick Start Guide

## TL;DR - Emergency Commands

```bash
# Stop validation NOW
ssh root@128.140.45.28 'pkill -f validate-v2.mjs'

# Check current status
scripts/monitoring/rate-limit-alert.sh

# Real-time monitoring
scripts/monitoring/watch-rate-limit.sh https://128.140.45.28.sslip.io
```

---

## What Happened

**Status:** 🔴 CRITICAL - Rate limiter is failing completely

- **418 HTTP 429 errors** in last 1000 log lines (41.8% error rate!)
- **Cache service DOWN** (0 keys, should be 1000+)
- **Validation running** but hitting FMP rate limits constantly
- **Agent 1's fix NOT deployed** yet to production

---

## Monitoring Scripts Available

### 1. Real-Time Dashboard (Continuous)
```bash
scripts/monitoring/watch-rate-limit.sh https://128.140.45.28.sslip.io
```
- Updates every 5 seconds
- Shows: rate, status, cache metrics, system health
- Color-coded alerts (🟢 OK, 🟡 WARNING, 🔴 CRITICAL)

### 2. Validation Progress Monitor
```bash
scripts/monitoring/watch-validation.sh
```
- Live tail of validation log
- Highlights progress, checkpoints, errors
- Auto-detects latest validation run

### 3. Quick Snapshot
```bash
scripts/monitoring/rate-limit-snapshot.sh https://128.140.45.28.sslip.io
```
- One-time status check
- Full system health report
- Recent FMP API activity
- PM2 process status

### 4. Emergency Alert
```bash
scripts/monitoring/rate-limit-alert.sh
```
- Counts 429 errors across time windows
- Shows validation progress
- Provides stop command if critical

---

## Alert Thresholds

| Status | Rate (calls/min) | Action |
|--------|------------------|--------|
| 🟢 OK | 0-220 | Continue monitoring |
| 🟡 WARNING | 221-280 | Watch closely, prepare to intervene |
| 🔴 CRITICAL | 281+ | STOP validation immediately |

**Current:** 🔴 CRITICAL (429 errors = rate limiter not working)

---

## Current System Metrics (20:41 UTC)

```
API Status:        ✅ healthy
Redis Connected:   ⚠️  unknown
Cache Size:        🔴 0 keys (should be 1000+)
Cache Memory:      🔴 0MB

Validation:        60/1,493 stocks (4.0%)
ETA:               45 minutes
Status:            🔴 Running but failing

429 Errors:
  Last 100 lines:  86 errors
  Last 200 lines:  102 errors
  Last 500 lines:  343 errors
  Last 1000 lines: 418 errors
```

---

## Root Causes Identified

1. **Rate Limiter Not Deployed**
   - Agent 1's fix not in production yet
   - No enforcement of 200 calls/min limit
   - Burst requests hitting FMP

2. **Cache Service Down**
   - 0 keys in cache (empty)
   - All requests hit API fresh
   - No cache hits = maximum API load

3. **Validation Script Design**
   - No built-in rate limiting
   - 4-6 API calls per stock (burst)
   - No delays between requests

4. **Redis Connection Issue**
   - Health endpoint reports "unknown"
   - Cache writes may be failing

---

## Immediate Actions Required

### 1. STOP Validation (CRITICAL)
```bash
ssh root@128.140.45.28 'pkill -f validate-v2.mjs'
```

### 2. Check Redis
```bash
ssh root@128.140.45.28 'redis-cli ping'
ssh root@128.140.45.28 'redis-cli INFO stats'
```

### 3. Coordinate with Agent 1
- Ensure rate limiter fix is ready
- Deploy to production
- Test with single stock first

### 4. Fix Cache Service
- Investigate why cache is empty
- Verify Redis connection
- Test cache writes

### 5. Resume Validation (ONLY AFTER FIXES)
```bash
# Test with 10 stocks first
cd "/home/teste 1"
timeout 300 node scripts/validation/validate-v2.mjs --limit 10 | tee /tmp/validation-test-10.log

# Monitor with:
scripts/monitoring/rate-limit-alert.sh

# If successful (0 errors), run full validation
```

---

## Monitoring During Validation

### Terminal 1: Rate Limit Dashboard
```bash
scripts/monitoring/watch-rate-limit.sh https://128.140.45.28.sslip.io
```

### Terminal 2: Validation Progress
```bash
scripts/monitoring/watch-validation.sh
```

### Terminal 3: Periodic Alerts
```bash
watch -n 30 'scripts/monitoring/rate-limit-alert.sh'
```

---

## Success Criteria

Before resuming full validation, ensure:

- ✅ **0 (zero) HTTP 429 errors** in test run
- ✅ **Cache size > 100 keys** after 10 stocks
- ✅ **Rate < 200 calls/min** consistently
- ✅ **Cache hit rate > 30%** (improving over time)
- ✅ **Redis connected** (health endpoint)

---

## Files Created

### Scripts (Executable)
- `/home/teste 1/scripts/monitoring/watch-rate-limit.sh`
- `/home/teste 1/scripts/monitoring/watch-validation.sh`
- `/home/teste 1/scripts/monitoring/rate-limit-snapshot.sh`
- `/home/teste 1/scripts/monitoring/rate-limit-alert.sh`

### Reports (Documentation)
- `RATE_LIMIT_MONITORING_REPORT.md` - Full technical report
- `MONITORING_DASHBOARD_SUMMARY.txt` - Visual dashboard snapshot
- `MONITORING_QUICK_START.md` - This file

---

## Contact

**Mission:** Real-time rate limit monitoring for FMP API
**Status:** 🔴 CRITICAL ALERT - Immediate action required
**Agent:** DevOps Monitoring Agent
**Timestamp:** 2025-11-03 20:41 UTC

---

## Next Steps

1. ✅ Monitoring infrastructure deployed (DONE)
2. 🔴 Stop validation (REQUIRED NOW)
3. 🔴 Fix rate limiter + cache (CRITICAL)
4. 🟡 Test with 10 stocks (AFTER FIXES)
5. 🟢 Resume full validation (AFTER SUCCESS)

---

**Remember:** Do NOT resume validation until:
- Rate limiter deployed and tested
- Cache service working (>100 keys)
- Test run shows 0 (zero) 429 errors

Use monitoring scripts to verify success before proceeding!
