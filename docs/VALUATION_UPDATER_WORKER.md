# Valuation Updater Worker - FASE 2 AlfaValue™

## Overview

The **valuation-updater** worker maintains freshness of AlfaValue™ intrinsic valuation data through scheduled updates. It runs as a PM2 managed process with cron-based execution.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Valuation Updater Worker                │
│         (PM2 + Cron Scheduling)                 │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌────────┐  ┌─────────┐  ┌──────────┐
│ DAILY  │  │ MONTHLY │  │QUARTERLY │
│06:00UTC│  │07:00UTC │  │08:00UTC  │
└────────┘  └─────────┘  └──────────┘
    │             │             │
    ▼             ▼             ▼
┌─────────────────────────────────────┐
│      ValuationService (Existing)    │
│   + SimpleCacheService (Existing)   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  FMP API + Redis Cache              │
└─────────────────────────────────────┘
```

## Job Types

### Daily Job (06:00 UTC)

**Purpose:** Keep valuation inputs fresh and invalidate stale calculations

**Actions:**
1. Update risk-free rates (US 10Y Treasury)
   - Invalidates RF cache for all regions
   - Forces fresh fetch from FMP treasury-rates API
   - Auto-caches new values with 24h TTL

2. Recalculate intrinsic value for hot set (top 100 tickers)
   - Invalidates existing IV cache entries
   - Calculates fresh IV using latest market data
   - Each calculation includes FCF, balance sheet, and market data
   - Rate limited to 1 ticker/second (conservative FMP usage)

**Runtime:** ~2-3 minutes for 100 tickers

**API Usage:** ~100-200 FMP calls (profile + statements per ticker)

### Monthly Job (1st of month, 07:00 UTC)

**Purpose:** Maintain sector growth rates and validate market risk premiums

**Actions:**
1. Rebuild g_sector_mid growth rates
   - Invalidates all sector growth caches (12 sectors)
   - Forces recalculation from peer analysis
   - Used for years 6-10 growth stage in DCF model

2. Validate MRP coverage
   - Tests FMP MRP API for 6 regions (US, EU, CN, BR, UK, JP)
   - Validates fallback behavior for uncovered regions
   - Logs coverage status for monitoring

**Runtime:** ~30-60 seconds

**API Usage:** ~20-30 FMP calls

### Quarterly Job (1st of quarter, 08:00 UTC)

**Purpose:** Full refresh with latest financial statements

**Actions:**
1. Update FCF series for entire universe
   - Fetches latest cash flow statements from FMP
   - Recalculates 5-year FCF CAGR (years 1-5 growth)
   - Rebuilds entire IV cache with fresh fundamentals

2. Recalculate IV for full universe
   - Currently uses hot set (100 tickers)
   - TODO: Expand to full 1000+ ticker universe
   - Rate limited to 1 ticker/2 seconds (conservative)

**Runtime:** ~5-10 minutes for 100 tickers (will scale to ~30-40 minutes for 1000)

**API Usage:** ~300-600 FMP calls for full universe

## Configuration

### Environment Variables

```bash
# Worker behavior
HOT_SET_SIZE=100                      # Top N tickers for daily updates
SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE=1000 # Full universe size
WORKER_HEALTH_PORT=3004               # Health check HTTP endpoint

# Cron schedules
VALUATION_DAILY_CRON='0 6 * * *'      # 06:00 UTC daily
VALUATION_MONTHLY_CRON='0 7 1 * *'    # 07:00 UTC on 1st of month
VALUATION_QUARTERLY_CRON='0 8 1 */3 *' # 08:00 UTC on 1st of quarter

# Database (optional - for dynamic ticker lists)
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=alfalyzer
PGPASSWORD=<your_password>
PGDATABASE=alfalyzer_db
```

### PM2 Configuration

Located in `ecosystem.config.cjs`:

```javascript
{
  name: 'valuation-updater',
  script: 'dist/server/workers/valuation-updater.cjs',
  autorestart: false, // Cron-based, exits after each run
  cron_restart: '0 6 * * *', // Daily at 06:00 UTC
  env: {
    NODE_ENV: 'production',
    WORKER_HEALTH_PORT: 3004,
    HOT_SET_SIZE: '100'
  }
}
```

## Deployment

### 1. Build Worker

```bash
# Compile TypeScript to CJS for PM2
npm run build:server

# Verify compiled output
ls -lh dist/server/workers/valuation-updater.cjs
```

### 2. Deploy to Production

```bash
# Option A: Full deploy (frontend + backend)
npm run deploy:full

# Option B: Server only
npm run deploy:server

# Or manual (with tar+scp for reliability)
cd dist
tar czf /tmp/server-dist.tar.gz server/
scp /tmp/server-dist.tar.gz root@128.140.45.28:/tmp/
ssh root@128.140.45.28 'cd "/home/teste 1/dist" && rm -rf server && tar xzf /tmp/server-dist.tar.gz'
```

### 3. Start Worker via PM2

```bash
# SSH to production server
ssh root@128.140.45.28
cd "/home/teste 1"

# Reload PM2 configuration
pm2 reload ecosystem.config.cjs

# Start valuation-updater
pm2 start valuation-updater

# Save PM2 state
pm2 save
```

### 4. Verify Operation

```bash
# Check worker status
pm2 status valuation-updater

# View logs (real-time)
pm2 logs valuation-updater --lines 50

# View log files
tail -f /home/teste\ 1/logs/valuation-out.log
tail -f /home/teste\ 1/logs/valuation-err.log

# Check health endpoint
curl http://localhost:3004/health
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3004/health
```

**Response:**
```json
{
  "status": "healthy",
  "worker": "valuation-updater",
  "lastRunAt": "2025-10-14T06:00:15.234Z",
  "lastRunType": "daily",
  "lastRunStatus": "success",
  "uptime": 123.45,
  "memory": {
    "rss": 98304000,
    "heapTotal": 45056000,
    "heapUsed": 32768000
  }
}
```

### Expected Log Output

**Daily Job:**
```
[2025-10-14T06:00:00.000Z] INFO: 🚀 Valuation Updater Worker starting...
[2025-10-14T06:00:00.123Z] INFO: 🌅 Starting DAILY valuation update
[2025-10-14T06:00:00.456Z] INFO: 📈 Step 1: Updating risk-free rates
[2025-10-14T06:00:01.234Z] INFO: ✅ Updated US risk-free rate: 4.25% (source: fmp)
[2025-10-14T06:00:01.567Z] INFO: 📊 Step 2: Recalculating IV for hot set (100 tickers)
[2025-10-14T06:00:02.890Z] INFO: Hot set loaded: 100 tickers
[2025-10-14T06:00:03.123Z] INFO: ✅ [1/100] AAPL: $195.42 (undervalued, 12.3%)
...
[2025-10-14T06:02:45.678Z] INFO: 📊 DAILY Update Summary:
[2025-10-14T06:02:45.678Z] INFO:    ├─ Duration: 165s
[2025-10-14T06:02:45.678Z] INFO:    ├─ RF Updated: ✅
[2025-10-14T06:02:45.678Z] INFO:    ├─ IVs Calculated: 98/100 (98.0%)
[2025-10-14T06:02:45.678Z] INFO:    └─ Failures: 2
```

### Key Metrics to Monitor

1. **Success Rate**: Should be >95% for daily updates
2. **Runtime**: Daily <5min, Monthly <2min, Quarterly <45min
3. **API Usage**: Track against FMP limits (20GB/month, 750 calls/15min)
4. **Memory Usage**: Should stay <500MB (max_memory_restart configured)
5. **Error Rate**: Monitor `valuation-err.log` for patterns

## Troubleshooting

### Worker Not Running

```bash
# Check PM2 status
pm2 status valuation-updater

# If not listed, add from ecosystem.config.cjs
pm2 start ecosystem.config.cjs --only valuation-updater

# If stopped, restart
pm2 restart valuation-updater
```

### High API Usage

**Symptoms:**
- FMP bandwidth exceeded errors
- 429 rate limit responses
- Incomplete calculations

**Solutions:**
1. Reduce `HOT_SET_SIZE` temporarily
2. Increase rate limiting delays in code
3. Skip quarterly job until next cycle
4. Review FMP API usage dashboard

### Missing IV Calculations

**Symptoms:**
- IV cache returning `null` for tickers
- Frontend showing "Calculation Pending"

**Diagnosis:**
```bash
# Check Redis cache
redis-cli
> keys valuation:iv:*
> get valuation:iv:AAPL

# Manual trigger
ssh root@128.140.45.28
pm2 trigger valuation-updater
```

### PostgreSQL Connection Errors

**Symptoms:**
```
Failed to load tickers from PostgreSQL, using built-in list
```

**Solutions:**
1. Verify PG credentials in `.env.production`
2. Check PG service status: `systemctl status postgresql`
3. Test connection: `psql -h 127.0.0.1 -U alfalyzer -d alfalyzer_db`
4. Falls back gracefully to built-in ticker list

## Manual Execution

### Trigger Job Manually

```bash
# SSH to production
ssh root@128.140.45.28
cd "/home/teste 1"

# Restart worker (will detect job type based on date)
pm2 restart valuation-updater

# Force specific job type (edit temporarily)
# NODE_ENV=production node dist/server/workers/valuation-updater.cjs
```

### Test Locally

```bash
# Development mode
npm run dev

# In another terminal
node server/workers/valuation-updater.ts
```

## Performance Optimization

### Current Bottlenecks

1. **FMP API Rate Limits**: 4 req/s hard limit
2. **Sequential Processing**: One ticker at a time
3. **Cache Invalidation**: Blocks until Redis confirms

### Future Enhancements

1. **Parallel Processing**: Process 5-10 tickers concurrently
2. **Smart Invalidation**: Only invalidate changed tickers
3. **Incremental Updates**: Update only stale IVs (>24h old)
4. **Batch API Calls**: Group profile/statement requests
5. **Full Universe**: Expand from 100 to 1000+ tickers

## Cost Analysis

### FMP API Usage

**Daily:** 100-200 calls/day × 30 days = 3,000-6,000 calls/month
**Monthly:** 20-30 calls/month
**Quarterly:** 300-600 calls/quarter = 100-200 calls/month

**Total:** ~3,120-6,230 calls/month

**Bandwidth:** ~90-180 MB/month (well under 20GB limit)

### Server Resources

**CPU:** Minimal (<5% during execution)
**Memory:** 100-200MB peak, 50MB idle
**Disk:** <10MB logs/month
**Network:** ~180MB/month total

### Estimated Costs

**FMP API:** $14/month (Professional plan)
**Server:** €3.79/month (shared with other workers)
**Redis:** Included (256MB allocation)
**PostgreSQL:** Included (local instance)

**Total Incremental Cost:** $0/month (uses existing infrastructure)

## Maintenance Schedule

### Daily
- Monitor success rate in logs
- Check health endpoint availability

### Weekly
- Review error patterns in `valuation-err.log`
- Validate RF and MRP freshness
- Check FMP API usage dashboard

### Monthly
- Archive old logs (`logs/valuation-*.log`)
- Review quarterly job performance
- Update ticker lists if needed

### Quarterly
- Audit full universe calculations
- Review FMP API costs and limits
- Optimize hot set composition

## Related Documentation

- [ALFALYZER_FINAL_CLAUDE.md](../ALFALYZER_FINAL_CLAUDE.md) - FASE 2 requirements (lines 1724-1754)
- [server/services/valuation-service.ts](../server/services/valuation-service.ts) - Core valuation logic
- [server/types/valuation.ts](../server/types/valuation.ts) - Type definitions
- [ecosystem.config.cjs](../ecosystem.config.cjs) - PM2 configuration

## Support

**Logs Location:**
- Output: `/home/teste 1/logs/valuation-out.log`
- Errors: `/home/teste 1/logs/valuation-err.log`
- Combined: `/home/teste 1/logs/valuation-combined.log`

**Health Check:** `curl http://localhost:3004/health`

**PM2 Commands:**
```bash
pm2 status valuation-updater
pm2 logs valuation-updater
pm2 restart valuation-updater
pm2 stop valuation-updater
pm2 delete valuation-updater
```
