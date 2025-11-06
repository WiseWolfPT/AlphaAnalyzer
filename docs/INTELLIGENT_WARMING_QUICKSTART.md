# Intelligent Warming Scheduler - Quick Start Guide

**ONDA 7** - Priority-Based Cache Warming System

---

## TL;DR

The Intelligent Warming Scheduler automatically warms ALL 1,493 stocks × 14 valuation methods (20,902 total) based on priority, without exceeding bandwidth limits.

**Key Features:**
- Priority-based queue (S&P 100 > S&P 500 > Extended)
- User activity tracking (boosts priority)
- Bandwidth-aware throttling (stops at 85%)
- Continuous operation (50 tasks every 5 minutes)
- 68.9% daily coverage (14,400 tasks/day)

---

## Quick Deploy (Production)

### 1. Build Worker

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
npm run build:server
```

### 2. Deploy to Server

```bash
# Use tar+scp method (most reliable)
cd dist
tar czf /tmp/server-dist.tar.gz server/
scp /tmp/server-dist.tar.gz root@128.140.45.28:/tmp/

# Extract on server
ssh root@128.140.45.28 'cd "/home/teste 1/dist" && tar xzf /tmp/server-dist.tar.gz'
```

### 3. Start Worker

```bash
ssh root@128.140.45.28

# Start intelligent warming worker
pm2 start ecosystem.config.cjs --only intelligent-warming-worker

# Verify status
pm2 status

# Check logs
pm2 logs intelligent-warming-worker --lines 50
```

### 4. Verify Health

```bash
# Health endpoint
curl http://localhost:3006/health | jq

# Expected response:
{
  "status": "ok",
  "queue": { "queueSize": 1250, ... },
  "bandwidth": { "percentUsed": 0.09, ... }
}
```

---

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure ENV

```bash
# .env (local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=alfalyzer2025redis

PGHOST=127.0.0.1
PGPORT=5432
PGUSER=alfalyzer
PGPASSWORD=********
PGDATABASE=alfalyzer_db

FMP_API_KEY=********
```

### 3. Start Redis

```bash
redis-server
```

### 4. Run Worker

```bash
# Build
npm run build:server

# Run
node dist/server/workers/intelligent-warming-worker.cjs
```

---

## Usage

### Track User View (Boost Priority)

When user views a stock:

```typescript
import { analyticsService } from '@/server/services/analytics-service';
import { warmingQueueService } from '@/server/services/warming-queue-service';

// Track view
await analyticsService.trackView('AAPL');

// Boost priority (all 14 methods for AAPL jump to front of queue)
await warmingQueueService.boostPriority('AAPL', 2);
```

### Manual Queue Management

```typescript
import { warmingQueueService } from '@/server/services/warming-queue-service';

// Schedule Tier 1 (S&P 100) tasks
await warmingQueueService.scheduleTier1(sp100Tickers, methodIds);

// Get queue stats
const stats = await warmingQueueService.getStats();
console.log(stats);
// { queueSize: 1250, completedToday: 850, failedToday: 5, avgPriority: 3.2 }

// Clear queue (admin only)
await warmingQueueService.clearQueue();
```

### Check Bandwidth Usage

```typescript
import { warmingThrottle } from '@/server/middleware/warming-throttle';

// Check budget
const budget = await warmingThrottle.checkBandwidthBudget();
console.log(budget);
// { allowWarming: true, percentUsed: 0.09, throttleRate: 'normal' }

// Get report
const report = await warmingThrottle.getBandwidthReport();
console.log(report);
```

---

## Monitoring

### PM2 Logs

```bash
# Real-time logs
pm2 logs intelligent-warming-worker

# Last 100 lines
pm2 logs intelligent-warming-worker --lines 100

# Filter for cycles
pm2 logs intelligent-warming-worker | grep "Cycle"

# Filter for bandwidth reports
pm2 logs intelligent-warming-worker | grep "Bandwidth"
```

### Redis Inspection

```bash
redis-cli -a alfalyzer2025redis

# Queue size
ZCARD warming:queue

# Top 10 tasks (highest priority)
ZRANGE warming:queue 0 9 WITHSCORES

# Completed tasks today
HLEN warming:completed:2025-10-24

# Bandwidth usage (KB)
GET bandwidth:daily:2025-10-24

# Convert to MB
GET bandwidth:daily:2025-10-24
# Result: 45600 → 45.6 MB
```

### Health Check

```bash
# HTTP endpoint
curl http://localhost:3006/health

# JSON formatted
curl http://localhost:3006/health | jq

# Check specific field
curl -s http://localhost:3006/health | jq '.queue.queueSize'
```

---

## Configuration

### Tuning Parameters

Edit `/home/teste 1/.env.production`:

```bash
# Batch size (tasks per cycle)
WARMING_BATCH_SIZE=50          # Default: 50 (increase for faster coverage)

# Cycle interval (milliseconds)
WARMING_CYCLE_INTERVAL_MS=300000  # Default: 5 min (decrease for faster cycles)

# Rate limit (milliseconds delay between calls)
WARMING_RATE_LIMIT_MS=250      # Default: 250ms = 4 calls/sec

# Bandwidth limits
FMP_MONTHLY_LIMIT_GB=20        # FMP limit
FMP_DAILY_BUDGET_MB=666        # Daily budget (~20GB / 30 days)
```

### Restart After Config Change

```bash
pm2 restart intelligent-warming-worker --update-env
```

---

## Troubleshooting

### Worker Not Starting

```bash
# Check PM2 errors
pm2 logs intelligent-warming-worker --err --lines 50

# Common issues:
# - Redis not connected: Check REDIS_PASSWORD
# - PG not connected: Check PGHOST/PGPASSWORD
# - Port conflict: Check WORKER_HEALTH_PORT
```

### Queue Empty

```bash
# Check queue size
redis-cli -a alfalyzer2025redis ZCARD warming:queue

# If 0, manually schedule tasks
ssh root@128.140.45.28
node -e "
  const { warmingQueueService } = require('./dist/server/services/warming-queue-service.js');
  const sp100 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
  const methods = ['dcf20-ocf', 'dfcf20', 'peg', 'ps-mean'];
  warmingQueueService.scheduleTier1(sp100, methods).then(() => console.log('Done'));
"
```

### Bandwidth Exceeded

```bash
# Check current usage
redis-cli -a alfalyzer2025redis GET bandwidth:daily:2025-10-24

# If ≥85%, worker auto-pauses
# Wait until next day or manually reset (admin only):
redis-cli -a alfalyzer2025redis DEL bandwidth:daily:2025-10-24
redis-cli -a alfalyzer2025redis DEL bandwidth:calls:daily:2025-10-24

# Restart worker
pm2 restart intelligent-warming-worker
```

### High Memory Usage

```bash
# Check memory
pm2 status intelligent-warming-worker

# If >300 MB, restart
pm2 restart intelligent-warming-worker

# Reduce batch size
nano /home/teste\ 1/.env.production
# Set WARMING_BATCH_SIZE=25
pm2 restart intelligent-warming-worker --update-env
```

---

## Testing

### Unit Tests

```bash
# Run tests
npm test

# Test specific service
npm test -- warming-queue-service
npm test -- adaptive-warming-strategy
npm test -- warming-throttle
```

### Integration Test

```bash
# Start worker locally
npm run build:server
node dist/server/workers/intelligent-warming-worker.cjs

# In another terminal, track views
curl -X POST http://localhost:3001/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "event": "view"}'

# Check if AAPL priority boosted
redis-cli -a alfalyzer2025redis ZRANGE warming:queue 0 10 | grep AAPL
```

---

## Performance Expectations

### Normal Operation

| Metric | Expected | Actual (Monitor) |
|--------|----------|------------------|
| Tasks/Cycle | 50 | Check logs |
| Cycles/Hour | 12 | Check logs |
| Tasks/Day | 14,400 | Check Redis |
| API Calls/Day | <2,000 | Check Redis |
| Bandwidth/Day | <25 MB | Check Redis |
| Queue Size | 500-2,000 | Check Redis |
| Memory | <300 MB | Check PM2 |

### Alerts

- ⚠️ Bandwidth ≥70%: Throttled (2 calls/sec)
- 🛑 Bandwidth ≥85%: Stopped (wait until next day)
- ⚠️ Queue Size >5,000: Increase WARMING_BATCH_SIZE
- ⚠️ Failure Rate >5%: Check failed tasks (HGETALL warming:failed:YYYY-MM-DD)

---

## Commands Cheat Sheet

```bash
# PM2
pm2 start ecosystem.config.cjs --only intelligent-warming-worker
pm2 restart intelligent-warming-worker
pm2 stop intelligent-warming-worker
pm2 logs intelligent-warming-worker
pm2 status

# Health
curl http://localhost:3006/health | jq

# Redis
redis-cli -a alfalyzer2025redis
ZCARD warming:queue
ZRANGE warming:queue 0 49
HLEN warming:completed:2025-10-24
GET bandwidth:daily:2025-10-24

# Monitoring
tail -f /home/teste\ 1/logs/intelligent-warming-combined.log
pm2 monit
```

---

## Quick Reference: File Locations

```
server/
  services/
    warming-queue-service.ts          # Priority queue (Redis sorted sets)
    adaptive-warming-strategy.ts      # Priority calculation (5 factors)
    analytics-service.ts              # User activity tracking
  middleware/
    warming-throttle.ts               # Bandwidth-aware throttling
  workers/
    intelligent-warming-worker.ts     # Main worker (5-min cycles)

docs/
  INTELLIGENT_WARMING_SCHEDULER.md    # Full documentation
  INTELLIGENT_WARMING_QUICKSTART.md   # This file

ecosystem.config.cjs                  # PM2 configuration
.env.production                       # Production ENV vars
```

---

## Support

- **Full Docs:** `/docs/INTELLIGENT_WARMING_SCHEDULER.md`
- **Production Guide:** `CLAUDE.md`
- **Health Endpoint:** `http://localhost:3006/health`
- **PM2 Logs:** `pm2 logs intelligent-warming-worker`

---

**Last Updated:** 2025-10-24
**Status:** ✅ Production Ready
