# Quick Start: IV Cache Burst Warming

## TL;DR

Warm all 1,493 Alfalyzer stocks with intrinsic value data in one burst:

```bash
# Production (run on server)
TARGET_URL=https://128.140.45.28.sslip.io \
  MARKET_DATA_API_KEY="your_key" \
  PGHOST=127.0.0.1 \
  PGDATABASE=alfalyzer_db \
  PGUSER=alfalyzer \
  PGPASSWORD="your_password" \
  scripts/cache-warmer-iv-full-universe-initial.sh
```

**Duration:** ~6 hours
**Bandwidth:** ~12 MB
**Result:** 95%+ cache hit rate for 24 hours

---

## Prerequisites

### 1. Check API Health
```bash
curl https://128.140.45.28.sslip.io/api/health
# Should return: {"status":"healthy"}
```

### 2. Verify PostgreSQL
```bash
node scripts/monitoring/check-pg.mjs
# Should show: "Connected in <Xms>"
```

### 3. Check Redis
```bash
redis-cli -a alfalyzer2025redis PING
# Should return: PONG
```

---

## Local Testing

### Dry Run (No API Calls)
```bash
TARGET_URL=http://localhost:3001 \
  scripts/cache-warmer-iv-full-universe-initial.sh --dry-run
```

**What it does:**
- Loads stock universe (1,493 symbols)
- Shows bandwidth/duration estimates
- Simulates loop without API calls
- Completes in ~30 seconds

**Expected output:**
```
[2025-10-24 16:30:00] [INFO] Loaded 1493 stocks for warming
[2025-10-24 16:30:01] [INFO] Estimated duration: 373 minutes (~6.2 hours)
[2025-10-24 16:30:01] [INFO] Estimated bandwidth: 11.65 MB
[2025-10-24 16:30:01] [INFO] DRY RUN - Skipping confirmation
[DRY RUN] Would warm: AAPL
[DRY RUN] Would warm: MSFT
...
[2025-10-24 16:30:30] [✅] ✅ Burst warming completed successfully (100.0% success rate)
```

### Test with Small Universe (10 stocks)
```bash
# Override universe with 10 stocks only
SYMBOLS_UNIVERSE="AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,JNJ,V" \
  TARGET_URL=http://localhost:3001 \
  scripts/cache-warmer-iv-full-universe-initial.sh
```

**What it does:**
- Warms only 10 stocks
- Completes in ~3 minutes
- Uses ~80 KB bandwidth
- Good for testing before full burst

---

## Production Deployment

### Step 1: SSH into Server
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
```

### Step 2: Set Environment
```bash
# Load production environment
source .env.production

# Or set manually:
export TARGET_URL=https://128.140.45.28.sslip.io
export MARKET_DATA_API_KEY="<your_fmp_key>"
export PGHOST=127.0.0.1
export PGPORT=5432
export PGUSER=alfalyzer
export PGPASSWORD="<your_pg_password>"
export PGDATABASE=alfalyzer_db
```

### Step 3: Run Burst
```bash
# With confirmation (10-second countdown)
scripts/cache-warmer-iv-full-universe-initial.sh

# Or skip confirmation (use with caution!)
yes | scripts/cache-warmer-iv-full-universe-initial.sh
```

### Step 4: Monitor Progress
```bash
# In separate terminal, watch logs
tail -f /var/log/alfalyzer/cache-warmer/iv-full-universe-*.log

# Or check progress file
watch -n 10 'cat /var/log/alfalyzer/cache-warmer/iv-full-universe-progress.txt'
```

### Step 5: Validate Results
```bash
# Check cache population
redis-cli -a alfalyzer2025redis KEYS "iv:chart:*" | wc -l
# Expected: ~1,493

# Test sample stock
curl -s https://128.140.45.28.sslip.io/api/iv/AAPL/chart | jq '.methods | length'
# Expected: 10-19 methods
```

---

## Monitoring During Burst

### Real-time Dashboard (tmux recommended)
```bash
# Create tmux session
tmux new -s iv-burst

# Window 1: Script running
scripts/cache-warmer-iv-full-universe-initial.sh

# Window 2: Log tail (Ctrl+B then C)
tail -f /var/log/alfalyzer/cache-warmer/iv-full-universe-*.log

# Window 3: Redis monitor (Ctrl+B then C)
watch -n 5 'redis-cli -a alfalyzer2025redis INFO memory | grep used_memory_human'

# Detach: Ctrl+B then D
# Reattach: tmux attach -t iv-burst
```

### Progress Tracking
The script logs progress every 10 stocks:

```
Progress: [10/1493] 0.7% | Success: 10 | Failed: 0 | Elapsed: 0.1m | ETA: 6.2m
Progress: [100/1493] 6.7% | Success: 98 | Failed: 2 | Elapsed: 0.8m | ETA: 5.5m
Progress: [500/1493] 33.5% | Success: 495 | Failed: 5 | Elapsed: 3.2m | ETA: 3.8m
...
```

### Alert Thresholds
- **Failure rate >10%**: Investigate API health
- **Duration >8 hours**: Check rate limiting
- **Bandwidth >15 MB**: Verify response sizes
- **Redis memory >200 MB**: Consider TTL reduction

---

## Troubleshooting

### "No stocks loaded"
```bash
# Verify PG connection
node scripts/monitoring/check-pg.mjs

# Or provide manual universe
export SYMBOLS_UNIVERSE="AAPL,MSFT,..."
```

### "HTTP 401" errors
```bash
# Check API key
echo $MARKET_DATA_API_KEY

# Verify in .env.production
grep FMP_API_KEY .env.production
```

### "HTTP 429" (rate limit)
```bash
# Script already uses 4 calls/sec (safe)
# If still rate limited, edit script:
CALLS_PER_SECOND=2  # More conservative
```

### Script killed by OOM
```bash
# Check memory
free -h

# Restart workers to free memory
pm2 restart all

# Reduce logging (edit script)
# Comment out detailed logs
```

---

## Post-Burst Checklist

- [ ] Verify cache hit rate >95% (`scripts/monitoring/check-cache.sh`)
- [ ] Test frontend IV page loads instantly
- [ ] Check Redis memory usage <256 MB
- [ ] Verify event-driven worker still running (`pm2 list`)
- [ ] Document actual bandwidth used vs. estimate
- [ ] Update monitoring dashboards with IV metrics

---

## Next Steps

1. **Monitor for 24 hours** - Verify cache stays warm
2. **Measure UX improvement** - Compare load times before/after
3. **Validate event-driven** - Check earnings calendar updates work
4. **Optional: Schedule monthly refresh** - Keep full universe fresh

---

## Emergency Rollback

If burst causes issues:

```bash
# Clear IV cache
redis-cli -a alfalyzer2025redis KEYS "iv:chart:*" | xargs redis-cli -a alfalyzer2025redis DEL

# Restart workers
pm2 restart all

# Verify API still responsive
curl https://128.140.45.28.sslip.io/api/health
```

Cache will rebuild on-demand (slower but functional).

---

## Support

- Full documentation: `/docs/CACHE_WARMING_IV_BURST.md`
- Stock universe helper: `/server/utils/stock-universe.ts`
- IV controller: `/server/controllers/iv-chart-controller.ts`
- Questions: Check `CLAUDE.md` or logs

---

**Pro Tip:** Run burst during off-peak hours (midnight-6am UTC) to minimize impact on active users.
