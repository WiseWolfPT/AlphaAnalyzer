# Valuation Updater - Quick Start Guide

## ⚡ 5-Minute Deployment

### 1. Build (Local)
```bash
npm run build:server
```

**Verify Output:**
```bash
ls -lh dist/server/workers/valuation-updater.cjs
# Should show: ~81KB file
```

### 2. Deploy to Production
```bash
npm run deploy:server
```

**Or manual (reliable method):**
```bash
cd dist
tar czf /tmp/server-dist.tar.gz server/
scp /tmp/server-dist.tar.gz root@128.140.45.28:/tmp/
ssh root@128.140.45.28 'cd "/home/teste 1/dist" && rm -rf server && tar xzf /tmp/server-dist.tar.gz'
```

### 3. Deploy PM2 Configuration
```bash
npm run deploy:ecosystem
```

**Or manual:**
```bash
scp ecosystem.config.cjs root@128.140.45.28:"/home/teste 1/ecosystem.config.cjs"
```

### 4. Start Worker
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
pm2 reload ecosystem.config.cjs
pm2 start valuation-updater
pm2 save
```

### 5. Verify
```bash
# Check status
pm2 status valuation-updater

# View logs
pm2 logs valuation-updater --lines 50

# Health check
curl http://localhost:3004/health
```

## ✅ Success Criteria

You should see:
- PM2 Status: `online` or `stopped` (normal for cron-based worker)
- Health endpoint: Returns JSON with `status: "healthy"`
- Logs: Daily job completed successfully
- Redis cache: Contains updated IV values

## 📊 Expected Log Output

```
[2025-10-14T06:00:00.000Z] INFO: 🚀 Valuation Updater Worker starting...
[2025-10-14T06:00:00.123Z] INFO: Environment: production
[2025-10-14T06:00:00.234Z] INFO: 🎯 Detected DAILY trigger (default)
[2025-10-14T06:00:01.234Z] INFO: ✅ Updated US risk-free rate: 4.25% (source: fmp)
[2025-10-14T06:00:02.345Z] INFO: Hot set loaded: 100 tickers
[2025-10-14T06:02:45.678Z] INFO: 📊 DAILY Update Summary:
[2025-10-14T06:02:45.678Z] INFO:    ├─ Duration: 165s
[2025-10-14T06:02:45.678Z] INFO:    ├─ RF Updated: ✅
[2025-10-14T06:02:45.678Z] INFO:    ├─ IVs Calculated: 98/100 (98.0%)
[2025-10-14T06:02:45.678Z] INFO:    └─ Failures: 2
```

## 🔧 Common Commands

```bash
# Manual trigger (test run)
ssh root@128.140.45.28
pm2 restart valuation-updater

# View live logs
pm2 logs valuation-updater

# Check health
curl http://localhost:3004/health

# View log files
tail -f "/home/teste 1/logs/valuation-out.log"

# Stop worker
pm2 stop valuation-updater

# Delete worker (removes from PM2)
pm2 delete valuation-updater
```

## 🐛 Troubleshooting

### Worker Not Starting

**Check:** PM2 configuration syntax
```bash
pm2 show valuation-updater
```

**Fix:** Reload configuration
```bash
pm2 reload ecosystem.config.cjs
pm2 start valuation-updater
```

### Health Endpoint Not Responding

**Check:** Port 3004 availability
```bash
netstat -tuln | grep 3004
```

**Fix:** Ensure `WORKER_HEALTH_PORT=3004` in environment

### No IVs Being Calculated

**Check:** FMP API key
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
grep FMP_API_KEY .env.production
```

**Check:** Worker logs for errors
```bash
pm2 logs valuation-updater --err --lines 100
```

### High API Usage

**Temporary Fix:** Reduce hot set size
```bash
# Edit .env.production
HOT_SET_SIZE=50  # Reduce from 100 to 50
pm2 restart valuation-updater --update-env
```

## 📅 Scheduled Jobs

| Job | Schedule | Duration | API Calls |
|-----|----------|----------|-----------|
| Daily | 06:00 UTC | ~3 min | 100-200 |
| Monthly | 1st @ 07:00 UTC | ~1 min | 20-30 |
| Quarterly | 1st Q @ 08:00 UTC | ~10 min | 300-600 |

## 📖 Full Documentation

- **Architecture & Configuration:** [docs/VALUATION_UPDATER_WORKER.md](docs/VALUATION_UPDATER_WORKER.md)
- **Implementation Details:** [VALUATION_UPDATER_IMPLEMENTATION.md](VALUATION_UPDATER_IMPLEMENTATION.md)
- **FASE 2 Requirements:** [ALFALYZER_FINAL_CLAUDE.md](ALFALYZER_FINAL_CLAUDE.md) lines 1724-1754

## 🚨 Emergency Rollback

If worker causes issues:

```bash
ssh root@128.140.45.28
pm2 stop valuation-updater
pm2 delete valuation-updater
pm2 save
```

Worker will stop, existing IV caches remain valid.

## ✨ Next Steps

After successful deployment:

1. **Monitor first run:** Check logs for success rate >95%
2. **Verify cache:** Check Redis for updated IV values
3. **Test frontend:** Visit `/intrinsic-value?symbol=AAPL` to see updated IV
4. **Set up alerts:** Monitor worker status daily

## 📞 Support

**Logs:**
- `/home/teste 1/logs/valuation-out.log`
- `/home/teste 1/logs/valuation-err.log`

**Health Check:**
```bash
curl http://localhost:3004/health | jq .
```

**PM2 Dashboard:**
```bash
pm2 monit
```
