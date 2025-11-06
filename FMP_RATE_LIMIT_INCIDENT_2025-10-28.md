# FMP Rate Limit Incident Report
**Date:** 2025-10-28
**Severity:** P0 - Critical Production Outage
**Duration:** 2+ hours (16:02 UTC - ongoing)
**Impact:** 100% of Intrinsic Value API endpoints returning 502

## Incident Timeline

| Time (UTC) | Event |
|------------|-------|
| 16:02 | First FMP 429 error detected |
| 17:37 | FMP provider initialization failing |
| 18:07 | Backend restarted, still rate-limited |
| 18:15 | Incident documented |

## Root Cause Analysis

### Primary Cause: FMP Monthly Bandwidth Exhausted
- FMP Plan: 20GB/month
- Rate Limit Response: HTTP 429 "Limit Reach"
- No automatic fallback for IV calculations
- Backend cannot initialize FMP provider

### Contributing Factors

1. **Aggressive Cache Warming**
   - intelligent-warming-worker: Running continuously
   - iv-warming-worker: Active but logs empty
   - earnings-monitor: 50 calls logged
   - No bandwidth tracking visible in logs

2. **No Circuit Breaker**
   - Backend keeps trying to initialize FMP
   - No graceful degradation to cached data
   - 54 PM2 restarts indicate repeated failures

3. **Insufficient Monitoring**
   - Bandwidth usage at 0.00 MB (tracking broken?)
   - No alerts when FMP approaching limit
   - No dashboard showing real-time FMP status

## Impact Assessment

### Services Affected
- ✅ Stock Quotes: Working (cached)
- ❌ Intrinsic Value: 100% failing
- ❌ IV Chart: 100% failing
- ❌ Find Stocks: Likely failing
- ❌ Valuation Methods: Not accessible

### User Experience
- All IV pages show loading or errors
- Cannot view intrinsic value calculations
- Cannot compare valuation methods
- Historical IV charts unavailable

### Revenue Impact
- Free tier: Degraded experience
- Paid users: Cannot access core feature
- Estimated downtime: 2-6 hours total

## Technical Details

### Error Message
```
{
  "Error Message": "Limit Reach . Please upgrade your plan or visit our documentation at https://site.financialmodelingprep.com/",
  "status": 429
}
```

### Backend State
```
⚠️ FMP provider failed to initialize: Error: Failed to initialize fmp provider
[UnifiedAPIService] Initializing with providers: [ 'alphaVantage' ]
```

### Redis Cache State
- Total Keys: 1,751
- IV Calculations: 74 (4.95% of universe)
- IV Methods: 149
- Cache Hit Rate: 6.46%

### Bandwidth Tracking (Appears Broken)
```
Daily Budget: 682.67 MB
Used: 0.00 MB (0.00%)
Calls Today: 0
Status: OK
```

This suggests bandwidth tracker is NOT counting FMP calls correctly.

## Immediate Actions Taken

1. ✅ Documented incident in validation report
2. ✅ Verified backend code deployment (growth-dcf-8y fix present)
3. ✅ Checked Redis cache (working, low coverage)
4. ✅ Identified FMP as single point of failure

## Immediate Actions Required

### Stop the Bleeding
```bash
# 1. Disable warming workers to prevent further API calls
ssh root@128.140.45.28
pm2 stop intelligent-warming-worker
pm2 stop iv-warming-worker
pm2 stop earnings-monitor

# 2. Verify workers stopped
pm2 status

# 3. Monitor FMP recovery
watch -n 300 'curl -s "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=$FMP_API_KEY" | jq .'
```

### Implement Circuit Breaker (Backend Code)
Location: `/server/services/unified-api-service.ts`

```typescript
// Add circuit breaker state
private fmpCircuitOpen = false;
private fmpCircuitOpenUntil?: Date;

// Modify initialize()
async initialize() {
  // Check circuit breaker
  if (this.fmpCircuitOpen && this.fmpCircuitOpenUntil && new Date() < this.fmpCircuitOpenUntil) {
    log.warn(`FMP circuit breaker open until ${this.fmpCircuitOpenUntil.toISOString()}`);
    // Skip FMP initialization
    return;
  }

  try {
    await this.fmpProvider.initialize();
    this.fmpCircuitOpen = false; // Success, close circuit
  } catch (error) {
    if (error.message.includes('Limit Reach') || error.message.includes('429')) {
      // Open circuit for 1 hour
      this.fmpCircuitOpen = true;
      this.fmpCircuitOpenUntil = new Date(Date.now() + 3600000);
      log.error(`FMP rate limit hit. Circuit open until ${this.fmpCircuitOpenUntil.toISOString()}`);
    }
    throw error;
  }
}
```

### Add Graceful Degradation (IV Controller)
Location: `/server/controllers/iv-controller.ts`

```typescript
// Modify getIntrinsicValue()
async getIntrinsicValue(ticker: string) {
  try {
    // Try fresh calculation
    return await this.calculateIV(ticker);
  } catch (error) {
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      // Fallback to cache
      const cached = await this.redis.get(`iv:calc:${ticker}`);
      if (cached) {
        log.warn(`Serving stale IV for ${ticker} due to rate limit`);
        return {
          ...cached,
          stale: true,
          cached_at: cached.as_of
        };
      }
    }
    throw error;
  }
}
```

## Short-term Recovery Plan (Next 24 Hours)

### Phase 1: Stop Workers (Immediate)
- [ ] Stop intelligent-warming-worker
- [ ] Stop iv-warming-worker
- [ ] Stop earnings-monitor
- [ ] Verify no FMP calls being made

### Phase 2: Wait for FMP Reset (Next 6-12 hours)
- [ ] Monitor FMP API every hour
- [ ] Test with single AAPL request
- [ ] Document exact reset time
- [ ] Estimate when limit was hit

### Phase 3: Restart with Limits (After Reset)
```bash
# Set daily bandwidth budget (500 MB/day = 15 GB/month with buffer)
export FMP_DAILY_BANDWIDTH_MB=500

# Restart with env
pm2 restart intelligent-warming-worker --update-env
pm2 restart iv-warming-worker --update-env

# Monitor closely
pm2 logs intelligent-warming-worker --lines 100 | grep "bandwidth"
```

### Phase 4: Fix Bandwidth Tracking (Critical)
The bandwidth tracker showing "0.00 MB used" is a bug. Need to:

1. Check if BandwidthTracker is initialized
2. Verify it's hooked into FMP calls
3. Test with single call and confirm increment
4. Deploy fix if broken

## Medium-term Improvements (This Week)

### 1. Deploy Circuit Breaker Pattern
- Detect FMP failures quickly
- Auto-stop workers when rate limited
- Serve cached data gracefully
- Auto-recovery when FMP returns

### 2. Fix Bandwidth Tracking
- Investigate why showing 0.00 MB
- Ensure all FMP calls counted
- Add real-time dashboard
- Set alerts at 80%, 90%, 95%

### 3. Implement Daily Budget Enforcement
```typescript
// In warming workers
const dailyBudgetMB = process.env.FMP_DAILY_BANDWIDTH_MB || 500;
const usedToday = await bandwidthTracker.getUsage('2025-10-28');

if (usedToday >= dailyBudgetMB * 0.95) {
  log.warn('Approaching daily bandwidth limit, pausing worker');
  await sleep(3600000); // Sleep 1 hour
  return;
}
```

### 4. Add Backup Provider for Fundamentals
Options:
- **Polygon.io** ($199/month, unlimited) - Best option
- **IEX Cloud** ($9-99/month, limited) - Budget option
- **Yahoo Finance** (Free, unreliable) - Emergency fallback

## Long-term Architecture Changes (This Month)

### 1. Tiered Caching Strategy
```typescript
// Hot set: 100 stocks, refresh 1h
const hotStocks = ['AAPL', 'MSFT', 'NVDA', ...]; // Top 100 by volume
hotTTL = 3600;

// Warm set: 500 stocks, refresh 6h
const warmStocks = [...]; // Next 500
warmTTL = 21600;

// Cold set: rest, refresh 24h
coldTTL = 86400;
```

### 2. Multi-Provider Architecture
```typescript
class FundamentalsService {
  providers = [
    { name: 'fmp', priority: 1, bandwidth: 20000 },
    { name: 'polygon', priority: 2, bandwidth: Infinity },
    { name: 'iex', priority: 3, bandwidth: 5000 }
  ];

  async getFundamentals(ticker: string) {
    for (const provider of this.providers) {
      if (await provider.isHealthy() && await provider.hasQuota()) {
        try {
          return await provider.getFundamentals(ticker);
        } catch (error) {
          continue; // Try next provider
        }
      }
    }
    throw new Error('All providers unavailable');
  }
}
```

### 3. Request Prioritization
- User requests: Priority 1 (always serve)
- Cache warming: Priority 2 (pause if quota low)
- Bulk operations: Priority 3 (only when quota ample)

### 4. Upgrade FMP Plan (Option)
Current: $30/month (20 GB)
Next tier: $90/month (100 GB)

ROI Analysis:
- Cost: +$60/month
- Benefit: 5x bandwidth
- Alternative: Optimize + add backup provider
- Recommendation: Try optimization first

## Success Metrics (Post-Recovery)

### Operational
- [ ] FMP availability: 99.9%
- [ ] Bandwidth usage: <90% of limit
- [ ] Cache hit rate: >80%
- [ ] IV endpoint P95 latency: <500ms

### Monitoring
- [ ] Real-time FMP bandwidth dashboard
- [ ] PagerDuty alerts at 80%, 90%, 95%
- [ ] Daily bandwidth reports via email
- [ ] Weekly capacity planning review

### Resilience
- [ ] Circuit breaker prevents cascading failures
- [ ] Graceful degradation serves cached data
- [ ] Backup provider ready for failover
- [ ] Workers auto-pause when quota low

## Lessons Learned

### What Went Wrong
1. Single provider dependency (no backup)
2. Aggressive warming with no budget enforcement
3. Bandwidth tracking not working (showing 0.00 MB)
4. No alerts when approaching limit
5. No circuit breaker or graceful degradation

### What Went Right
1. Redis cache preserved some IV data
2. Quote service unaffected (separate cache)
3. Incident detected quickly
4. Backend architecture allows clean recovery

### Process Improvements
1. **Require bandwidth monitoring before deploying warming workers**
2. **Always implement circuit breakers for external APIs**
3. **Add quota checks before every worker cycle**
4. **Test failover scenarios regularly**
5. **Document rate limits in ENV variables**

## Owner Assignment

- **Incident Commander:** Backend Architect
- **Backend Fix:** Backend Architect
- **Monitoring Dashboard:** DevOps
- **Provider Evaluation:** Technical Lead
- **Post-mortem:** Backend Architect (this document)

## Status Updates

- **18:15 UTC:** Incident documented, root cause identified
- **Next Update:** When FMP reset confirmed (estimated 00:00 UTC tomorrow)
- **Final Update:** When full validation complete

## Contact

For questions about this incident:
- Technical: Backend Architect
- Business Impact: Product Manager
- User Communication: Support Team

---

**Document Status:** ACTIVE INCIDENT
**Last Updated:** 2025-10-28 18:20 UTC
**Next Review:** After FMP reset
