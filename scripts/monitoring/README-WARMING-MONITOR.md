# Warming Worker Monitoring - Quick Start

## Local Testing

### 1. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`.

### 2. Test API Endpoints

```bash
# Overview
curl http://localhost:3001/api/monitoring/warming/overview | jq

# Cache heatmap (top 20 stocks)
curl http://localhost:3001/api/monitoring/warming/cache-heatmap?limit=20 | jq

# Method coverage
curl http://localhost:3001/api/monitoring/warming/method-coverage | jq

# Bandwidth stats
curl http://localhost:3001/api/bandwidth/stats | jq
```

### 3. Run Live Dashboard

```bash
# Watch warming worker in real-time
scripts/monitoring/watch-warming.sh

# Or specify URL explicitly
scripts/monitoring/watch-warming.sh http://localhost:3001
```

### 4. Generate Daily Summary

```bash
# Generate report
scripts/monitoring/daily-summary-warming.sh

# Check output
cat scripts/monitoring/logs/warming-summary-$(date +%Y-%m-%d).txt
```

## Production Testing

### 1. Test Production Endpoints

```bash
# Overview
curl https://128.140.45.28.sslip.io/api/monitoring/warming/overview | jq

# Real-time stream (Ctrl+C to stop)
curl -N https://128.140.45.28.sslip.io/api/monitoring/warming/real-time
```

### 2. Watch Production Dashboard

```bash
scripts/monitoring/watch-warming.sh https://128.140.45.28.sslip.io
```

### 3. Generate Production Report

```bash
scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io
```

## Expected Output

### Cache Coverage (Good Health)
```
Total Stocks:    1493
Cached Stocks:   1247
Coverage:        83.52%

Hotness Distribution:
  🔥 Hot (<1h):     450
  🟠 Warm (1-12h):  620
  🔵 Cold (12-24h): 177
  ❄️  Stale (>24h):  0
```

### Bandwidth (Good Health)
```
Used:            245.67 MB
Budget:          682.67 MB
Percent Used:    35.98%
Status:          ✅ OK
Projected EOD:   489.34 MB
```

### Workers Status (All Online)
```
Earnings Monitor: ✅ Online
Intelligent Warming: ✅ Online
Price Worker: ✅ Online
Transcripts Worker: ✅ Online
```

## Troubleshooting

### "jq: command not found"

**macOS:**
```bash
brew install jq
```

**Ubuntu/Debian:**
```bash
sudo apt install jq
```

### "Failed to fetch data"

1. Check server is running:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Check Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. Check logs:
   ```bash
   npm run dev
   # Look for errors in console
   ```

### Empty Cache (0% coverage)

This is normal on fresh install. To populate cache:

1. **Visit intrinsic value pages:**
   - Navigate to http://localhost:3000/intrinsic-value/AAPL
   - This will trigger cache warming for AAPL

2. **Manually trigger warming** (if worker exists):
   ```bash
   # Check if warming worker is running
   pm2 list

   # Restart warming worker
   pm2 restart intelligent-warming-worker
   ```

3. **Wait for cache to populate:**
   - Cache coverage will increase over time
   - Check progress: `scripts/monitoring/watch-warming.sh`

## Integration with Existing Monitoring

This warming monitor complements existing system monitoring:

```bash
# Full system health check
scripts/monitoring/monitor-all.sh

# Warming worker specific
scripts/monitoring/watch-warming.sh
```

Both can run simultaneously for complete observability.

## Next Steps

1. **Enable alerting** (production only):
   ```bash
   # Add to .env.production
   ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK
   ALERT_DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR/WEBHOOK

   # Restart server
   pm2 restart alfalyzer --update-env
   ```

2. **Setup cron jobs** (production only):
   ```bash
   # SSH to production
   ssh root@128.140.45.28

   # Edit crontab
   crontab -e

   # Add daily summary
   0 0 * * * cd '/home/teste 1' && scripts/monitoring/daily-summary-warming.sh https://128.140.45.28.sslip.io >> /var/log/alfalyzer/monitoring/daily-summary.log 2>&1
   ```

3. **Build frontend dashboard** (optional):
   - Create React component at `client/src/pages/monitoring-dashboard.tsx`
   - Use SSE endpoint: `/api/monitoring/warming/real-time`
   - See `docs/WARMING_MONITORING_GUIDE.md` for example code

## Documentation

- **Full Guide:** `docs/WARMING_MONITORING_GUIDE.md`
- **Architecture:** `CLAUDE.md` (ONDA 7 section)
- **API Reference:** See endpoint comments in `server/routes/monitoring-warming.ts`
