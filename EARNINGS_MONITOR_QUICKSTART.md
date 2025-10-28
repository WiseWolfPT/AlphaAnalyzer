# Earnings Monitor - Quick Start Guide

## TL;DR - Deploy in 3 Commands

```bash
# 1. Deploy worker
./scripts/deploy-earnings-monitor.sh

# 2. Validate deployment
./scripts/monitoring/validate-earnings-monitor.sh --remote

# 3. Monitor logs
ssh root@128.140.45.28 "pm2 logs earnings-monitor --lines 50"
```

## What This Worker Does

**Problem**: After companies report earnings, analyst estimates change, but our cached data becomes stale.

**Solution**: Earnings Monitor automatically detects when companies report earnings and refreshes the cache with fresh analyst consensus data.

## How It Works

1. **Every 1 hour**: Fetch earnings calendar from FMP
2. **Detect events**: Find earnings that happened in last 48 hours
3. **Invalidate cache**: Remove stale `fmp:analyst:estimates:{SYMBOL}` keys
4. **Warm cache**: Fetch fresh analyst estimates and store in Redis

## Key Metrics (Expected)

```
Normal Day:
- 21 API calls/day (1 calendar + ~20 checks)
- 0.63 MB/day bandwidth
- 0-5 cache refreshes/day

Earnings Season:
- 120 API calls/day peak
- 3.6 MB/day bandwidth
- 10-30 cache refreshes/day

Safety Limits:
- 50 calls/cycle (circuit breaker)
- 200 MB memory limit
- 4 req/s rate limiting
```

## Health Check

```bash
# Quick health check
curl http://localhost:3005/health | jq '.status'

# Full stats
curl http://localhost:3005/health | jq
```

## Common Commands

```bash
# View logs (last 50 lines)
pm2 logs earnings-monitor --lines 50

# Restart worker
pm2 restart earnings-monitor

# Check memory usage
pm2 describe earnings-monitor | grep memory

# View bandwidth usage
pm2 logs earnings-monitor | grep "Bandwidth report"
```

## Configuration (Optional)

Edit `.env.production` on server:

```bash
# Change refresh interval (default: 1 hour)
EARNINGS_MONITOR_INTERVAL_MS=3600000

# Change lookback window (default: 48 hours)
EARNINGS_LOOKBACK_HOURS=48

# Change lookahead window (default: 2 days)
EARNINGS_LOOKAHEAD_DAYS=2
```

Then restart:
```bash
pm2 restart earnings-monitor --update-env
```

## Troubleshooting One-Liners

```bash
# Worker not running?
pm2 list | grep earnings-monitor

# Errors?
pm2 logs earnings-monitor --err --lines 20

# High memory?
pm2 restart earnings-monitor

# API calls too high?
pm2 logs earnings-monitor | grep "apiCalls" | tail -10

# Cache not refreshing?
redis-cli KEYS "fmp:analyst:estimates:*" | wc -l
```

## Integration Test

```bash
# 1. Pick a recent earnings stock (e.g., AAPL if earnings this week)
SYMBOL="AAPL"

# 2. Check current cache
redis-cli GET "fmp:analyst:estimates:${SYMBOL}"

# 3. Check worker logs for this symbol
pm2 logs earnings-monitor | grep "${SYMBOL}"

# 4. Verify cache was refreshed
redis-cli TTL "fmp:analyst:estimates:${SYMBOL}"
# Should show ~86400 seconds (24h) if recently refreshed
```

## Success Indicators

✅ Worker shows "online" in PM2
✅ Health endpoint returns `"status": "healthy"`
✅ Logs show "Cycle complete" every hour
✅ API calls per cycle < 50
✅ Memory usage < 200 MB
✅ No errors in error log

## When to Check This Worker

- **After earnings seasons** (Jan, Apr, Jul, Oct): Verify high activity handled
- **Weekly**: Quick health check (`pm2 list`)
- **Monthly**: Review bandwidth usage in logs
- **On deployment**: Run validation script

## Files Reference

```
Worker:          /server/workers/earnings-monitor.ts
Compiled:        /dist/server/workers/earnings-monitor.cjs
PM2 Config:      /ecosystem.config.cjs (line 109-137)
Logs:            /logs/earnings-monitor-*.log
Health:          http://localhost:3005/health
Deploy Script:   /scripts/deploy-earnings-monitor.sh
Validate Script: /scripts/monitoring/validate-earnings-monitor.sh
Full Docs:       /EARNINGS_MONITOR_DEPLOYMENT.md
```

## Architecture Context

This worker follows the **exact same pattern** as `transcripts-worker.ts`, which achieved:
- ✅ 99.997% API call reduction (319,910 → 9 calls/cycle)
- ✅ Event-driven discovery (not universe sweep)
- ✅ Production-grade safety features
- ✅ Zero bandwidth incidents since deployment

Pattern reuse = battle-tested reliability 🚀

---

**Quick Links:**
- Full deployment guide: `EARNINGS_MONITOR_DEPLOYMENT.md`
- System architecture: `CLAUDE.md`
- Transcripts worker reference: `/server/workers/transcripts-worker.ts`
