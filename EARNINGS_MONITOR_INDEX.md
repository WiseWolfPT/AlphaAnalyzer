# Earnings Monitor Worker - Complete Index

## Quick Navigation

### 🚀 Getting Started
1. **Quick Start**: [`EARNINGS_MONITOR_QUICKSTART.md`](./EARNINGS_MONITOR_QUICKSTART.md) - Deploy in 3 commands
2. **Full Guide**: [`EARNINGS_MONITOR_DEPLOYMENT.md`](./EARNINGS_MONITOR_DEPLOYMENT.md) - Complete deployment documentation
3. **Summary**: [`EARNINGS_MONITOR_SUMMARY.md`](./EARNINGS_MONITOR_SUMMARY.md) - Implementation overview

### 📁 File Locations

#### Implementation
- **Worker Source**: `/server/workers/earnings-monitor.ts` (13 KB)
- **Compiled Worker**: `/dist/server/workers/earnings-monitor.cjs` (43 KB)
- **Pattern Reference**: `/server/workers/transcripts-worker.ts` (proven implementation)

#### Configuration
- **PM2 Config**: `/ecosystem.config.cjs` (lines 109-137)
- **Build Script**: `/scripts/build-server.mjs` (lines 120-124)
- **Environment**: `.env.production` (variables listed below)

#### Deployment
- **Deploy Script**: `/scripts/deploy-earnings-monitor.sh`
- **Validation Script**: `/scripts/monitoring/validate-earnings-monitor.sh`
- **Health Endpoint**: `http://localhost:3005/health`

#### Documentation
- **Quick Start**: `/EARNINGS_MONITOR_QUICKSTART.md` (4.2 KB)
- **Deployment Guide**: `/EARNINGS_MONITOR_DEPLOYMENT.md` (9.7 KB)
- **Implementation Summary**: `/EARNINGS_MONITOR_SUMMARY.md` (11 KB)
- **This Index**: `/EARNINGS_MONITOR_INDEX.md`

#### Dependencies
- **FMP Analyst Service**: `/server/services/fmp-analyst-service.ts`
- **Redis Cache Service**: `/server/cache/redis-cache-service.ts`
- **Rate Limiter**: `/server/lib/rate-limiter.ts`
- **Structured Logger**: `/server/services/structured-logger.ts`

### 🎯 Quick Actions

```bash
# Deploy (complete automated process)
./scripts/deploy-earnings-monitor.sh

# Validate deployment
./scripts/monitoring/validate-earnings-monitor.sh --remote

# Check health
ssh root@128.140.45.28 "curl -s http://localhost:3005/health | jq"

# View logs
ssh root@128.140.45.28 "pm2 logs earnings-monitor --lines 50"

# Restart worker
ssh root@128.140.45.28 "pm2 restart earnings-monitor"

# Stop worker (rollback)
ssh root@128.140.45.28 "pm2 stop earnings-monitor"
```

### 📊 Key Metrics

```
Normal Operation:
- Interval: 1 hour
- API calls: 25-50/day
- Bandwidth: 0.75-1.5 MB/day
- Memory: 50-150 MB
- Cache refreshes: 0-5/day

Earnings Season:
- API calls: 120-240/day
- Bandwidth: 3.6-7.2 MB/day
- Cache refreshes: 10-30/day

Safety Limits:
- Max calls/cycle: 50 (circuit breaker)
- Max memory: 200 MB (PM2 restart)
- Rate limit: 4 req/s (token bucket)
```

### 🔧 Configuration Reference

Environment variables in `.env.production`:

```bash
# Required
FMP_API_KEY=your_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=alfalyzer2025redis

# Worker configuration (optional, defaults shown)
WORKER_HEALTH_PORT=3005
EARNINGS_MONITOR_INTERVAL_MS=3600000  # 1 hour
EARNINGS_LOOKBACK_HOURS=48            # Check last 48h
EARNINGS_LOOKAHEAD_DAYS=2             # Check next 2 days
EARNINGS_MAX_CALLS_PER_CYCLE=50       # Circuit breaker
```

### 📖 Documentation Map

```
EARNINGS_MONITOR_INDEX.md (this file)
├── Quick Start Guide → EARNINGS_MONITOR_QUICKSTART.md
│   ├── 3-command deployment
│   ├── Health check commands
│   ├── Common troubleshooting
│   └── Integration test steps
│
├── Deployment Guide → EARNINGS_MONITOR_DEPLOYMENT.md
│   ├── Architecture overview
│   ├── Detailed deployment steps
│   ├── Configuration reference
│   ├── Health monitoring
│   ├── Bandwidth analysis
│   ├── Log file locations
│   ├── PM2 commands
│   ├── Troubleshooting guide
│   ├── Integration with IV system
│   ├── Performance benchmarks
│   ├── Rollback procedure
│   └── Future enhancements
│
└── Implementation Summary → EARNINGS_MONITOR_SUMMARY.md
    ├── Deliverables list
    ├── Architecture diagram
    ├── Pattern adherence analysis
    ├── Bandwidth analysis
    ├── Integration details
    ├── Deployment checklist
    ├── Success metrics
    ├── Rollback plan
    ├── Future enhancements
    └── References
```

### 🏗️ Architecture Summary

```
Event-Driven Earnings Monitor
│
├── Discovery Phase (runs every hour)
│   └── Fetch FMP earnings calendar (last 48h + next 2d)
│
├── Detection Phase
│   ├── Parse earnings events
│   ├── Filter events from last 48 hours
│   └── Validate symbols and dates
│
├── Invalidation Phase
│   └── Remove stale cache keys (fmp:analyst:estimates:*)
│
└── Warming Phase
    ├── Call getAnalystEstimates() for each symbol
    ├── Fresh data automatically cached (24h TTL)
    └── Rate limited (4 req/s)
```

### 🛡️ Safety Features

1. **Rate Limiting**: Token bucket (4 req/s)
2. **Circuit Breaker**: Max 50 calls/cycle
3. **Bandwidth Tracking**: Per-cycle and daily monitoring
4. **Error Handling**: Try/catch with exponential backoff
5. **Memory Protection**: PM2 restart at 200 MB
6. **Health Monitoring**: HTTP endpoint on port 3005
7. **Structured Logging**: Winston-compatible logger
8. **Graceful Shutdown**: Clean PM2 integration

### 🎓 Pattern Reference

This worker follows the **exact pattern** of `transcripts-worker.ts`:

| Component | Implementation | Status |
|-----------|----------------|--------|
| Event-driven discovery | ✅ FMP earnings calendar | Identical |
| Rate limiting | ✅ fmpRateLimiter (4 req/s) | Identical |
| Bandwidth tracking | ✅ trackBandwidth() | Identical |
| Circuit breaker | ✅ MAX_CALLS_PER_CYCLE | Identical |
| Health endpoint | ✅ HTTP server | Identical |
| Error handling | ✅ Try/catch + backoff | Identical |
| Logging | ✅ structuredLogger | Identical |
| PM2 integration | ✅ ecosystem.config.cjs | Identical |

**Result**: Transcripts worker achieved 99.997% API reduction (319,910 → 9 calls/cycle)

### 📈 Expected Results

#### Week 1
- 175-350 API calls total
- 5-10 MB bandwidth
- 0-35 cache refreshes
- Zero errors expected

#### Month 1
- 750-1,500 API calls
- 22.5-45 MB bandwidth
- 0-150 cache refreshes
- Stable memory usage

#### Earnings Season Month
- 3,600-7,200 API calls
- 108-216 MB bandwidth
- 300-900 cache refreshes
- Still well within limits

### 🧪 Testing Strategy

```bash
# 1. Local Build Test
npm run build:server
# Verify: dist/server/workers/earnings-monitor.cjs exists

# 2. Deployment Test
./scripts/deploy-earnings-monitor.sh
# Verify: Script completes successfully

# 3. Health Check
./scripts/monitoring/validate-earnings-monitor.sh --remote
# Verify: All checks pass

# 4. First Cycle Monitor
ssh root@128.140.45.28 "pm2 logs earnings-monitor --lines 100"
# Verify: "Cycle complete" appears

# 5. Cache Integration Test
# (After first cycle with earnings events)
redis-cli GET "fmp:analyst:estimates:AAPL"
redis-cli TTL "fmp:analyst:estimates:AAPL"
# Verify: Data exists, TTL ~86400 seconds
```

### 🔄 Maintenance Schedule

```
Daily: Automatic (no action needed)
- Worker runs every hour
- PM2 auto-restarts on crash
- Self-monitoring via health endpoint

Weekly: Quick check (2 minutes)
- Run: pm2 list | grep earnings-monitor
- Verify: Status = "online"
- Check: Memory usage stable

Monthly: Full review (10 minutes)
- Run: ./scripts/monitoring/validate-earnings-monitor.sh --remote
- Review: Bandwidth usage logs
- Verify: No accumulated errors
- Check: Cache hit rates maintained
```

### 📞 Support Resources

```
Documentation:
├── Quick Start → EARNINGS_MONITOR_QUICKSTART.md
├── Full Guide → EARNINGS_MONITOR_DEPLOYMENT.md
└── Summary → EARNINGS_MONITOR_SUMMARY.md

System Context:
├── Architecture → CLAUDE.md
├── Pattern Reference → /server/workers/transcripts-worker.ts
└── FMP Service → /server/services/fmp-analyst-service.ts

Monitoring:
├── Health Endpoint → http://localhost:3005/health
├── PM2 Logs → pm2 logs earnings-monitor
└── Validation Script → ./scripts/monitoring/validate-earnings-monitor.sh
```

### ⚡ Emergency Procedures

```bash
# Worker Crash
pm2 restart earnings-monitor

# High Memory
pm2 restart earnings-monitor
# (PM2 auto-restarts at 200 MB anyway)

# High API Calls
# 1. Check logs for errors causing retries
pm2 logs earnings-monitor --err --lines 50
# 2. Verify circuit breaker working (should stop at 50)
pm2 logs earnings-monitor | grep "Bandwidth report"

# Rollback (if needed)
pm2 stop earnings-monitor
# System continues working with automatic cache TTL expiry
```

### 🎯 Success Indicators

✅ PM2 shows "online" status
✅ Health endpoint returns 200 OK
✅ Logs show hourly "Cycle complete"
✅ API calls < 50/cycle
✅ Memory usage < 200 MB
✅ Zero errors in error log
✅ Cache refreshes working (check Redis TTL)
✅ IV calculations use fresh post-earnings data

---

## Next Steps

1. **Review Documentation**
   - Read: `EARNINGS_MONITOR_QUICKSTART.md` (5 min)
   - Skim: `EARNINGS_MONITOR_DEPLOYMENT.md` (15 min)
   - Reference: `EARNINGS_MONITOR_SUMMARY.md` (as needed)

2. **Deploy to Production**
   ```bash
   ./scripts/deploy-earnings-monitor.sh
   ```

3. **Validate Deployment**
   ```bash
   ./scripts/monitoring/validate-earnings-monitor.sh --remote
   ```

4. **Monitor First 24h**
   - Check logs every 2 hours
   - Verify cycle completion
   - Confirm API calls within limits

5. **Week 1 Review**
   - Run full validation
   - Check bandwidth usage
   - Verify cache integration working

---

**Implementation Date**: 2025-10-24
**Status**: ✅ Ready for Production
**Estimated Deployment Time**: 5-10 minutes
**Risk Level**: Low (follows proven pattern)
**Pattern Source**: transcripts-worker.ts (99% API reduction achieved)
**Documentation Coverage**: 100% (24.9 KB across 3 files)
