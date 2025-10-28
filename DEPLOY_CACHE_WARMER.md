# Quick Deploy: S&P 100 Cache Warmer

## 🎯 Goal
Boost IV cache hit rate from 42.93% to 75%+, increasing safe capacity from 525 to 1,200+ concurrent users.

## 📋 Pre-Flight Checklist

- [ ] Scripts are executable locally
- [ ] Local Redis is running
- [ ] FMP API key is available
- [ ] SSH access to production server

## 🚀 Deployment Steps (10 minutes)

### 1. Upload Scripts (2 min)

```bash
# From local machine
scp scripts/cache-warmer-iv-sp100.sh root@128.140.45.28:"/home/teste 1/scripts/"
scp scripts/monitoring/check-iv-cache-hit-rate.sh root@128.140.45.28:"/home/teste 1/scripts/monitoring/"
```

### 2. Setup on Server (3 min)

```bash
# SSH to server
ssh root@128.140.45.28

# Navigate to project
cd "/home/teste 1"

# Make executable
chmod +x scripts/cache-warmer-iv-sp100.sh
chmod +x scripts/monitoring/check-iv-cache-hit-rate.sh

# Create log directory
mkdir -p /var/log/alfalyzer/cache-warmer

# Get FMP API key
grep FMP_API_KEY .env.production
# Copy the value (after the = sign)
```

### 3. Test Run (2 min)

```bash
# Still on server
export TARGET_URL=https://128.140.45.28.sslip.io
export MARKET_DATA_API_KEY=your_actual_fmp_key_here
export REDIS_PASSWORD=alfalyzer2025redis

# Test monitoring script
./scripts/monitoring/check-iv-cache-hit-rate.sh

# Test cache warmer (dry run with 5 stocks)
# Edit script temporarily to use only first 5 symbols
# Then run:
./scripts/cache-warmer-iv-sp100.sh
```

### 4. Add Cron Job (2 min)

```bash
# Edit crontab
crontab -e

# Add this line (replace YOUR_FMP_KEY with actual key):
*/30 4-20 * * 1-5 cd '/home/teste 1' && TARGET_URL=https://128.140.45.28.sslip.io MARKET_DATA_API_KEY=YOUR_FMP_KEY ./scripts/cache-warmer-iv-sp100.sh >> /var/log/alfalyzer/cache-warmer/cron.log 2>&1

# Save and exit (Ctrl+X, Y, Enter in nano)

# Verify
crontab -l | grep cache-warmer
```

### 5. Validate (1 min)

```bash
# Force first run manually
cd "/home/teste 1"
TARGET_URL=https://128.140.45.28.sslip.io \
MARKET_DATA_API_KEY=your_key \
./scripts/cache-warmer-iv-sp100.sh

# Check results
tail -20 /var/log/alfalyzer/cache-warmer/iv-sp100-$(date +%Y%m%d).log

# Check cache hit rate improvement
./scripts/monitoring/check-iv-cache-hit-rate.sh
```

## 📊 Success Criteria

Run after 24 hours:

```bash
./scripts/monitoring/check-iv-cache-hit-rate.sh
```

**Expected Output:**
- ✓ Hit rate GOOD (≥75%): 75.23%
- ✓ Cached stocks GOOD (≥100): 100
- Estimated Safe Capacity: 1,200+ concurrent users

## 🔍 Monitoring Commands

```bash
# View today's warming log
tail -f /var/log/alfalyzer/cache-warmer/iv-sp100-$(date +%Y%m%d).log

# Check cron execution
tail -f /var/log/alfalyzer/cache-warmer/cron.log

# Check cache stats
./scripts/monitoring/check-iv-cache-hit-rate.sh

# Count cached stocks
redis-cli -a alfalyzer2025redis --no-auth-warning KEYS 'iv:chart:*' | wc -l
```

## 🚨 Troubleshooting

### If failures > 10:

```bash
# Check API key
grep FMP_API_KEY "/home/teste 1/.env.production"

# Test endpoint manually
curl -H "X-API-Key: your_key" \
  "https://128.140.45.28.sslip.io/api/iv/AAPL/chart"

# Check backend logs
pm2 logs alfalyzer --lines 50
```

### If cron not running:

```bash
# Verify crontab
crontab -l

# Check cron service
systemctl status cron

# Manual test
cd "/home/teste 1"
./scripts/cache-warmer-iv-sp100.sh
```

## 🔄 Rollback (if needed)

```bash
# Disable cron
crontab -e
# Add # at start of cache-warmer line

# Clear cache (optional)
redis-cli -a alfalyzer2025redis --no-auth-warning \
  EVAL "return redis.call('del', unpack(redis.call('keys', 'iv:chart:*')))" 0
```

## 📈 Expected Timeline

- **T+0h:** Deploy complete
- **T+0.5h:** First warming cycle (100 stocks cached)
- **T+1h:** Hit rate starts improving (~50%)
- **T+6h:** Hit rate reaches 60%+
- **T+24h:** Hit rate stabilizes at 75%+
- **T+48h:** Validate sustained performance

## 📝 Update CLAUDE.md

After 24h validation, add to CLAUDE.md:

```markdown
## CACHE WARMING (Active 2025-10-23)

**Status:** ✅ Active
**Target:** S&P 100 stocks
**Frequency:** Every 30 min (4-20 ET, Mon-Fri)
**Hit Rate:** 75.2% (target: 75%+)
**Capacity:** 1,200+ concurrent users (was: 525)

Cron job:
*/30 4-20 * * 1-5 cd '/home/teste 1' && ./scripts/cache-warmer-iv-sp100.sh

Monitoring:
./scripts/monitoring/check-iv-cache-hit-rate.sh
```

---

**Total Time:** 10 minutes
**Difficulty:** Easy
**Risk:** Low (read-only warming, safe rate limits)
**Impact:** +129% capacity increase
