# Quick Recovery Guide - FMP Rate Limit Incident

## TL;DR
- **Status:** FMP API rate limited (HTTP 429) since 16:02 UTC
- **Impact:** 100% of IV endpoints returning 502 Bad Gateway
- **Code:** ✅ Growth DCF 8Y fix deployed and verified
- **Recovery:** 2-24 hours (waiting for FMP monthly reset)

## Immediate Actions (Run Now)

```bash
# 1. SSH to server
ssh root@128.140.45.28

# 2. Stop all warming workers
pm2 stop intelligent-warming-worker
pm2 stop iv-warming-worker
pm2 stop earnings-monitor
pm2 save

# 3. Verify stopped
pm2 status | grep -E "warming|monitor"
```

## Check FMP Status (Every Hour)

```bash
# From your local machine
export FMP_API_KEY="your_key_here"

curl -s "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=$FMP_API_KEY" | jq '.'

# If returns data: ✅ FMP recovered
# If "Limit Reach": ⚠️ Still rate limited
```

## After FMP Resets

### Step 1: Run Recovery Validation

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
export TARGET_URL=https://128.140.45.28.sslip.io
export FMP_API_KEY="your_key_here"

./scripts/recovery/fmp-recovery-validation.sh
```

**Expected:** 6-8 tests should pass

### Step 2: Restart Workers (If Tests Pass)

```bash
ssh root@128.140.45.28

# Set bandwidth limit
echo 'FMP_DAILY_BANDWIDTH_MB=500' >> /home/teste\ 1/.env.production

# Restart with limits
pm2 restart intelligent-warming-worker --update-env
pm2 restart iv-warming-worker --update-env
pm2 save

# Monitor for 10 minutes
pm2 logs intelligent-warming-worker --lines 50 | grep bandwidth
```

### Step 3: Full Validation

```bash
# Test growth stocks
for ticker in NVDA META GOOGL; do
  echo "Testing $ticker..."
  curl -s "https://128.140.45.28.sslip.io/api/iv/$ticker" | \
    jq '.methods[] | select(.method_id == "growth-dcf-8y")'
done

# Should return growth-dcf-8y method for all 3
```

## Monitoring Commands

```bash
# Backend status
ssh root@128.140.45.28 "pm2 status"

# Backend logs
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 50"

# Redis cache stats
ssh root@128.140.45.28 "redis-cli -a alfalyzer2025redis INFO stats | grep keyspace"

# Bandwidth usage (when monitoring endpoint fixed)
curl -s https://128.140.45.28.sslip.io/api/monitoring/warming/overview | jq '.bandwidth'
```

## Red Flags (Restart Required)

- Backend memory >800MB → Restart: `pm2 restart alfalyzer`
- 502 errors persist after FMP reset → Check logs: `pm2 logs alfalyzer --lines 100`
- Workers showing "0 calls" → Verify ENV: `pm2 env alfalyzer | grep FMP`
- Bandwidth still 0.00 MB → Bandwidth tracker broken (P1 issue)

## Success Criteria

✅ Ready to Deploy:
- FMP API responding (no 429 errors)
- Backend returning 200 for IV endpoints
- Growth stocks have growth-dcf-8y method
- Banks do NOT have growth-dcf-8y method
- Performance <500ms P95

## Files to Read

1. **VALIDATION_SUMMARY_2025-10-28.txt** - Quick overview
2. **FMP_RATE_LIMIT_INCIDENT_2025-10-28.md** - Full incident report
3. **BACKEND_VALIDATION_REPORT_2025-10-28.md** - Technical details

## Contact

- **Technical Issues:** Backend Architect
- **FMP Account:** Check FMP dashboard for reset time
- **Emergency:** Fallback to cache-only mode (graceful degradation)

## Emergency Fallback (If FMP Down >24h)

```typescript
// Add to server/controllers/iv-controller.ts
async getIntrinsicValue(ticker: string) {
  // Try cache first
  const cached = await this.redis.get(`iv:calc:${ticker}`);
  if (cached) {
    return {
      ...cached,
      stale: true,
      message: "FMP temporarily unavailable, serving cached data"
    };
  }

  // Then try fresh (will fail during rate limit)
  try {
    return await this.calculateIV(ticker);
  } catch (error) {
    throw new Error('No cached data available and FMP is down');
  }
}
```

Deploy with:
```bash
npm run build:server
npm run deploy:server
```

---

**Last Updated:** 2025-10-28 18:25 UTC
**Status:** ACTIVE INCIDENT
**Priority:** P0 (Critical)
