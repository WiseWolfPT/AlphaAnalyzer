# Cache Optimization Migration Guide

## Executive Summary

This migration implements a **4-tier caching architecture** to achieve **77-88% faster response times** for cached data in the Alfalyzer backend.

### Performance Targets

| Metric | Current (Baseline) | Target | Improvement |
|--------|-------------------|--------|-------------|
| **L1 Hit Latency** | N/A | 1-2ms | New capability |
| **L2 Hit Latency** | ~177ms ❌ | 5-10ms | **94-97% faster** ✅ |
| **Cache Miss Latency** | ~177ms | 150-170ms | 4-15% faster |
| **Overall P95** | ~177ms | **20-40ms** | **77-88% faster** ✅ |
| **Cache Hit Rate** | 8.4% ❌ | 80-90% ✅ | **10x improvement** |

### Root Causes Identified

1. **91.6% Cache Miss Rate** → Most requests bypass cache entirely
2. **JSON Serialization Overhead** → 2-5ms per operation
3. **No In-Memory L1 Cache** → Every request hits Redis (~1-2ms network)
4. **No Pipelining** → Batch operations use sequential calls
5. **No Refresh-Ahead** → Cache expiry causes user-facing latency

---

## Architecture Overview

### New 4-Tier Caching System

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: L1 In-Memory Cache (LRU)                          │
│  - Latency: 1-2ms                                           │
│  - TTL: 60s                                                 │
│  - Size: 10MB (~1000 items)                                 │
│  - Expected: 40-50% of requests (hot stocks)               │
└─────────────────────────────────────────────────────────────┘
                      ↓ (miss)
┌─────────────────────────────────────────────────────────────┐
│  Tier 2: Redis with MessagePack                            │
│  - Latency: 5-10ms                                          │
│  - TTL: Various (60s-24h)                                   │
│  - Size: 256MB                                              │
│  - Expected: 35-40% of requests (cached but not hot)       │
└─────────────────────────────────────────────────────────────┘
                      ↓ (miss)
┌─────────────────────────────────────────────────────────────┐
│  Tier 3: Refresh-Ahead Pattern                             │
│  - Latency: 5-10ms (stale data)                            │
│  - Refresh: Background (non-blocking)                       │
│  - Expected: 5-10% of requests (near-expiry cache)         │
└─────────────────────────────────────────────────────────────┘
                      ↓ (miss)
┌─────────────────────────────────────────────────────────────┐
│  Tier 4: FMP API with Pipeline Optimization                │
│  - Latency: 150-200ms                                       │
│  - Optimization: Batch fetching                             │
│  - Expected: 5-10% of requests (true cache misses)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Steps

### Phase 1: Install Dependencies (5 minutes)

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1

# Install new dependencies
npm install lru-cache@11.0.0
npm install @msgpack/msgpack@3.0.0-beta2

# Verify installations
npm list lru-cache @msgpack/msgpack
```

### Phase 2: Deploy New Cache Service (NO DOWNTIME)

The new `EnhancedRedisCacheService` is **backward compatible** with the existing `RedisCacheService`. Migration can happen gradually without service interruption.

#### Option A: Gradual Migration (RECOMMENDED)

1. **Deploy new service alongside old** (both running)
2. **Migrate endpoints one at a time**
3. **Monitor performance metrics**
4. **Rollback if issues detected**

```typescript
// Example: Migrate SimpleCacheService first
// In server/services/simple-cache-service.ts

// OLD (Line 10):
import { redisCacheService } from '../cache/redis-cache-service';

// NEW:
import { enhancedRedisCacheService as redisCacheService } from '../cache/enhanced-redis-cache-service';
```

#### Option B: Full Cutover (FASTER, HIGHER RISK)

1. **Deploy all changes at once**
2. **Monitor closely for 1 hour**
3. **Rollback entire deployment if issues**

```bash
# Deploy to production
npm run deploy:full

# Monitor cache metrics
curl -H "X-API-Key: $MARKET_DATA_API_KEY" \
  https://128.140.45.28.sslip.io/api/cache/monitoring/stats

# Check for errors
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 | grep -i error"
```

### Phase 3: Add Monitoring Routes (5 minutes)

Add the new cache monitoring router to `server/routes.ts`:

```typescript
// Add import at top
import cacheMonitoringRouter from "./routes/cache-monitoring";

// Add route (around line 200, after other cache routes)
app.use("/api/cache/monitoring", cacheMonitoringRouter);
```

### Phase 4: Enable Refresh-Ahead (OPTIONAL, 10 minutes)

Implement refresh-ahead pattern for frequently accessed data:

```typescript
// Example: Update SimpleCacheService.getQuote()
import { getWithRefreshAhead } from '../utils/refresh-ahead-cache';

async getQuote(symbol: string): Promise<StockQuote | null> {
  const cacheKey = `quote:${symbol.toUpperCase()}`;

  return await getWithRefreshAhead(
    cacheKey,
    () => this.fetchQuoteFromAPI(symbol),
    60, // TTL
    0.2 // Refresh when 20% TTL remaining (12s)
  );
}
```

### Phase 5: Update Batch Operations (10 minutes)

Optimize batch operations to use pipelining:

```typescript
// Example: Update SimpleCacheService.getBatchQuotes()
async getBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const keys = symbols.map(s => `quote:${s.toUpperCase()}`);

  // Use optimized mget (single Redis round-trip)
  const cachedResults = await enhancedRedisCacheService.mget<StockQuote>(keys);

  // ... rest of logic
}
```

---

## Monitoring & Validation

### Key Metrics to Track

Monitor these endpoints after deployment:

#### 1. Cache Statistics (Human-Readable)
```bash
curl -H "X-API-Key: $MARKET_DATA_API_KEY" \
  https://128.140.45.28.sslip.io/api/cache/monitoring/stats
```

**Expected Response:**
```json
{
  "l1HitRate": "45.23%",
  "l2HitRate": "38.14%",
  "totalHitRate": "83.37%",
  "avgL1Latency": "1.23ms",
  "avgL2Latency": "7.45ms",
  "p95L1Latency": "2.10ms",
  "p95L2Latency": "12.30ms",
  "totalRequests": 15234,
  "l1Size": 847,
  "memoryUsage": "L1: 8.45MB",
  "performanceTarget": {
    "l1Latency": "<2ms",
    "l2Latency": "<10ms",
    "hitRate": ">80%",
    "status": "✅ ON TARGET"
  }
}
```

#### 2. Performance Dashboard
```bash
curl -H "X-API-Key: $MARKET_DATA_API_KEY" \
  https://128.140.45.28.sslip.io/api/cache/monitoring/performance
```

**Expected Response:**
```json
{
  "performanceScore": "92.50",
  "performanceGrade": "A",
  "recommendations": [
    "✅ Cache performance is optimal!"
  ]
}
```

#### 3. Health Check
```bash
curl https://128.140.45.28.sslip.io/api/cache/monitoring/health
```

---

## Benchmarking

### Before Migration (Baseline)

```bash
# Run benchmark
cd /Users/antoniofrancisco/Documents/teste\ 1
node scripts/benchmark-cache.mjs baseline

# Expected output:
# ❌ Cache Hit: 177.23ms (avg)
# ❌ Cache Miss: 181.45ms (avg)
# ❌ Hit Rate: 8.4%
```

### After Migration (Target)

```bash
# Run benchmark
node scripts/benchmark-cache.mjs optimized

# Expected output:
# ✅ L1 Cache Hit: 1.45ms (avg)
# ✅ L2 Cache Hit: 7.23ms (avg)
# ✅ Cache Miss: 165.34ms (avg)
# ✅ Hit Rate: 85.2%
# ✅ Overall P95: 35.67ms
```

---

## Rollback Plan

### If Issues Detected (< 5 minutes)

1. **Revert to old cache service:**
```typescript
// In all affected files, change back:
import { redisCacheService } from '../cache/redis-cache-service';
```

2. **Rebuild and deploy:**
```bash
npm run build:server
npm run deploy:server
```

3. **Verify rollback:**
```bash
ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 50 | grep 'Redis connected'"
```

### Rollback Triggers

Rollback immediately if:
- **Error rate > 5%** in first 30 minutes
- **P95 latency > 200ms** (worse than baseline)
- **Redis connection failures** (> 10 in 5 minutes)
- **Memory usage > 1GB** (L1 cache leak)

---

## Performance Validation Checklist

After migration, validate these metrics over **24 hours**:

- [ ] **L1 Hit Rate: 40-50%** (hot stocks cached in memory)
- [ ] **L2 Hit Rate: 35-40%** (Redis cache working)
- [ ] **Total Hit Rate: 80-90%** (overall caching effectiveness)
- [ ] **L1 Latency < 2ms** (in-memory fast path)
- [ ] **L2 Latency < 10ms** (Redis optimized)
- [ ] **P95 Latency < 40ms** (overall performance target)
- [ ] **Error Rate < 0.1%** (stability)
- [ ] **Memory Usage < 500MB** (L1 + L2 combined)

---

## Troubleshooting

### Issue: L1 Hit Rate Too Low (< 30%)

**Cause:** L1 cache size too small or TTL too short

**Fix:**
```typescript
// In enhanced-redis-cache-service.ts, increase L1 size
this.l1Cache = new LRU<string, any>({
  max: 2000, // Increase from 1000
  maxSize: 20 * 1024 * 1024, // Increase to 20MB
  ttl: 120000, // Increase to 2 minutes
});
```

### Issue: L2 Latency > 10ms

**Cause:** Redis network latency or serialization overhead

**Fix 1: Check Redis latency**
```bash
redis-cli -a alfalyzer2025redis --latency-history
```

**Fix 2: Verify MessagePack is being used**
```bash
# Check imports in enhanced-redis-cache-service.ts
grep "msgpack" server/cache/enhanced-redis-cache-service.ts
```

### Issue: Memory Usage Growing Unbounded

**Cause:** L1 cache not evicting old entries

**Fix:** Verify LRU eviction is working
```bash
# Check L1 size via API
curl https://128.140.45.28.sslip.io/api/cache/monitoring/stats | jq '.l1Size'

# Should be < 1000 (or configured max)
```

---

## Expected Impact

### Response Time Distribution (Before → After)

| Percentile | Before | After | Improvement |
|------------|--------|-------|-------------|
| P50 (Median) | 175ms | 8ms | **95.4%** |
| P95 | 180ms | 35ms | **80.6%** |
| P99 | 185ms | 160ms | **13.5%** |

### Cost Savings

- **FMP API Calls:** Reduced by 70-80% (hit rate improvement)
- **Redis Memory:** No change (256MB sufficient)
- **Server Memory:** +10-20MB (L1 cache)
- **Response Time SLO:** Achieved (<200ms P95)

---

## Next Steps (Post-Migration)

1. **Week 1:** Monitor metrics daily, fine-tune L1 size
2. **Week 2:** Implement refresh-ahead for remaining hot paths
3. **Week 3:** Analyze access patterns, optimize TTLs
4. **Week 4:** Document learnings, update runbook

---

## Support & Questions

**Contact:** Check `CLAUDE.md` for system status and known issues

**Monitoring Scripts:**
- `scripts/monitoring/check-cache.sh` - Quick cache stats
- `scripts/monitoring/monitor-all.sh` - Full system check

**Logs:**
- Local: `pm2 logs alfalyzer | grep EnhancedCache`
- Production: `ssh root@128.140.45.28 "pm2 logs alfalyzer --lines 100 | grep EnhancedCache"`

---

**Last Updated:** 2025-10-25
**Version:** 1.0.0
**Status:** Ready for Production
