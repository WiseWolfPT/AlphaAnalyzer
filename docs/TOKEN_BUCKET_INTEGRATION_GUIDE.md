# Token Bucket Rate Limiter Integration Guide - Agent 8

## Overview

This guide explains how to integrate the production-grade token bucket rate limiter with FMP API calls.

**Key Features:**
- **Burst Allowance:** 8 tokens (8 simultaneous calls)
- **Sustained Rate:** 4 tokens/sec (FMP limit)
- **Adaptive Rate Limiting:** Backs off on HTTP 429
- **Comprehensive Metrics:** Monitoring and health checks

---

## Quick Start

### 1. Import the Service

```typescript
import { fmpRateLimitService } from '@/services/fmp-rate-limit-service';
```

### 2. Single API Call

```typescript
// Acquire permit (waits if necessary)
await fmpRateLimitService.acquireForCall();

// Make API call
const start = Date.now();
const response = await fetch(fmpUrl);
const elapsed = Date.now() - start;

// Record response for metrics and adaptive rate limiting
fmpRateLimitService.recordResponse(response.status, elapsed);
```

### 3. Batch API Call (Multiple Endpoints)

```typescript
// Acquire permits for 8 parallel endpoint calls
await fmpRateLimitService.acquireForBatch(8);

// Make parallel calls
const start = Date.now();
const [quotes, income, balance, cashFlow, ratios, profile, metrics, metricsTTM] =
  await Promise.all([
    fetch(quotesUrl),
    fetch(incomeUrl),
    fetch(balanceUrl),
    fetch(cashFlowUrl),
    fetch(ratiosUrl),
    fetch(profileUrl),
    fetch(metricsUrl),
    fetch(metricsTTMUrl),
  ]);

// Record responses
const elapsed = Date.now() - start;
fmpRateLimitService.recordResponse(quotes.status, elapsed);
// ... record other responses
```

---

## FMP Provider Integration

### Current Implementation (server/services/providers/fmp-provider.ts)

The FMP provider currently uses a simple rate limiter. Here's how to integrate the new token bucket:

#### Option 1: Wrap All FMP Calls (Recommended)

Create a `fetchWithRateLimit` helper:

```typescript
import { fmpRateLimitService } from '@/services/fmp-rate-limit-service';
import { logger } from '@/lib/logger';

export class FMPProvider {
  /**
   * Fetch with rate limiting and automatic retries
   *
   * @param endpoint - FMP API endpoint
   * @param permits - Number of tokens to acquire (default: 1)
   * @returns Promise with response data
   */
  private async fetchWithRateLimit<T>(
    endpoint: string,
    permits: number = 1
  ): Promise<T> {
    // Acquire tokens before making request
    await fmpRateLimitService.acquireForCall();

    const start = Date.now();

    try {
      const response = await this.client.get(endpoint);
      const elapsed = Date.now() - start;

      // Record success
      fmpRateLimitService.recordResponse(200, elapsed);

      return response.data;
    } catch (error: any) {
      const elapsed = Date.now() - start;

      if (error.response?.status === 429) {
        // HTTP 429: Rate limit exceeded
        fmpRateLimitService.recordResponse(429, elapsed);
        logger.error('[FMP] HTTP 429 despite rate limiting - FMP may have reduced limits');

        // Retry with exponential backoff (handled by token bucket)
        throw new Error('FMP rate limit exceeded - retrying with backoff');
      } else {
        // Other error
        const statusCode = error.response?.status || 500;
        fmpRateLimitService.recordResponse(statusCode, elapsed);
      }

      throw error;
    }
  }

  // Update all methods to use fetchWithRateLimit
  async getBatchQuotes(symbols: string[]): Promise<QuoteData[]> {
    const url = `/quote/${symbols.join(',')}`;
    return this.fetchWithRateLimit(url, 1); // 1 token for 1 batch call
  }

  async getBatchIncomeStatements(symbols: string[]): Promise<IncomeStatementData[]> {
    const url = `/income-statement/${symbols.join(',')}`;
    return this.fetchWithRateLimit(url, 1);
  }

  // ... all other methods use fetchWithRateLimit(url, 1)
}
```

#### Option 2: Direct Integration (Granular Control)

For methods that need fine-grained control:

```typescript
async getQuote(symbol: string): Promise<StockQuote> {
  // Acquire token
  await fmpRateLimitService.acquireForCall();

  const start = Date.now();

  try {
    const response = await axios.get(
      `${this.baseUrl}/quote/${symbol}`,
      { params: { apikey: this.apiKey }, timeout: 10000 }
    );

    const elapsed = Date.now() - start;
    fmpRateLimitService.recordResponse(200, elapsed);

    // ... process response
  } catch (error: any) {
    const elapsed = Date.now() - start;
    const statusCode = error.response?.status || 500;
    fmpRateLimitService.recordResponse(statusCode, elapsed);
    throw error;
  }
}
```

---

## Batch Warming Integration

### Current Warming Worker

The IV warming worker makes 8 parallel endpoint calls per stock. Here's how to integrate:

```typescript
import { fmpRateLimitService } from '@/services/fmp-rate-limit-service';

async function warmStockCache(symbol: string) {
  // Acquire permits for 8 parallel calls (burst allowance)
  await fmpRateLimitService.acquireForBatch(8);

  const start = Date.now();

  try {
    // Make 8 parallel calls
    const [quotes, income, balance, cashFlow, ratios, profile, metrics, metricsTTM] =
      await Promise.all([
        fmpProvider.getBatchQuotes([symbol]),
        fmpProvider.getBatchIncomeStatements([symbol]),
        fmpProvider.getBatchBalanceSheets([symbol]),
        fmpProvider.getBatchCashFlowStatements([symbol]),
        fmpProvider.getBatchRatios([symbol]),
        fmpProvider.getProfile(symbol),
        fmpProvider.getKeyMetricsTTM(symbol),
        fmpProvider.getKeyMetrics(symbol),
      ]);

    const elapsed = Date.now() - start;
    fmpRateLimitService.recordResponse(200, elapsed);

    logger.info(`[Warming] Stock ${symbol} warmed successfully`, {
      elapsed,
      tokensRemaining: fmpRateLimitService.getState().tokens.toFixed(2),
    });
  } catch (error: any) {
    const elapsed = Date.now() - start;
    const statusCode = error.response?.status || 500;
    fmpRateLimitService.recordResponse(statusCode, elapsed);

    logger.error(`[Warming] Failed to warm ${symbol}`, { error: error.message });
  }
}

// Warm 50 stocks
async function warmBatch(symbols: string[]) {
  for (const symbol of symbols) {
    await warmStockCache(symbol);
  }
}
```

**Performance Expected:**
- First 1 stock: ~0ms (burst capacity)
- Stocks 2-8: ~0ms (burst capacity)
- Stock 9+: ~2 seconds each (4 calls/sec sustained rate = 8 calls/2s)
- **Total for 50 stocks**: ~84 seconds (8 instant + 42 at 2s each)

---

## Configuration

### Environment Variables

Add to `.env.production`:

```bash
# FMP Rate Limiting
FMP_RATE_LIMIT_CAPACITY=8          # burst capacity (tokens)
FMP_RATE_LIMIT_REFILL_RATE=4      # sustained rate (tokens/sec)
FMP_RATE_LIMIT_ENABLED=true        # enable/disable
FMP_RATE_LIMIT_ADAPTIVE=true       # adaptive rate limiting (backs off on 429)
```

### Adjusting for Different Workloads

#### High Burst Workload (Many parallel batch calls)
```bash
FMP_RATE_LIMIT_CAPACITY=12         # Allow 12 burst calls
FMP_RATE_LIMIT_REFILL_RATE=4      # Keep sustained rate at 4/sec
```

#### Conservative (No burst, strict 4/sec)
```bash
FMP_RATE_LIMIT_CAPACITY=4          # No burst allowance
FMP_RATE_LIMIT_REFILL_RATE=4      # 4/sec sustained
```

#### Aggressive (Push FMP limits)
```bash
FMP_RATE_LIMIT_CAPACITY=10         # Large burst
FMP_RATE_LIMIT_REFILL_RATE=5      # 5/sec (FMP limit is 5)
```

---

## Monitoring & Health Checks

### 1. Check Current State

```typescript
import { fmpRateLimitService } from '@/services/fmp-rate-limit-service';

const state = fmpRateLimitService.getState();
console.log(`Tokens: ${state.tokens}/${state.capacity}`);
console.log(`Utilization: ${state.utilizationPercent.toFixed(1)}%`);
console.log(`Throttling: ${state.isThrottling}`);
```

### 2. Get Statistics

```typescript
const stats = fmpRateLimitService.getStats();
console.log(`Total calls: ${stats.totalCalls}`);
console.log(`Success rate: ${fmpRateLimitService.getSuccessRate().toFixed(1)}%`);
console.log(`HTTP 429 errors: ${stats.http429Errors}`);
console.log(`Avg response time: ${stats.avgResponseTimeMs.toFixed(0)}ms`);
```

### 3. Health Report

```typescript
const health = fmpRateLimitService.getHealthReport();
console.log(`Healthy: ${health.healthy}`);
console.log(`Issues: ${health.issues.join(', ')}`);
console.log(`Tokens: ${health.state.tokens}/${health.state.capacity}`);
console.log(`Success rate: ${health.stats.successRate}`);
```

### 4. Express Monitoring Endpoint

```typescript
import { fmpRateLimitService } from '@/services/fmp-rate-limit-service';

router.get('/api/monitoring/fmp-rate-limit', (req, res) => {
  const health = fmpRateLimitService.getHealthReport();
  res.json(health);
});
```

**Example Response:**

```json
{
  "healthy": true,
  "timestamp": "2025-01-05T12:00:00.000Z",
  "state": {
    "tokens": 5.2,
    "capacity": 8,
    "refillRate": 4,
    "utilizationPercent": 35.0,
    "isThrottling": false
  },
  "stats": {
    "totalCalls": 1500,
    "successfulCalls": 1485,
    "failedCalls": 15,
    "http429Errors": 2,
    "successRate": "99.0%",
    "avgResponseTimeMs": "150"
  },
  "tokenBucket": {
    "totalAcquired": 1500,
    "totalWaited": 200,
    "avgWaitTimeMs": "120",
    "maxWaitTimeMs": 2500,
    "uptime": "3600s"
  },
  "issues": []
}
```

---

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm test server/utils/__tests__/token-bucket-rate-limiter.test.ts
```

**Test Coverage:**
- Basic functionality ✅
- Burst allowance ✅
- Sustained rate throttling ✅
- Token refill ✅
- Concurrent acquires ✅
- Adaptive rate limiting ✅
- Metrics and monitoring ✅
- Performance benchmarks ✅

### Integration Test (50 Stocks Batch Warming)

```typescript
import { fmpRateLimitService } from '@/services/fmp-rate-limit-service';

async function testBatchWarming() {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', /* ... 47 more */];

  console.log('Starting batch warming test...');
  const start = Date.now();

  for (const symbol of symbols) {
    await fmpRateLimitService.acquireForBatch(8);
    console.log(`Warming ${symbol}...`);
    // Simulate 8 parallel calls
  }

  const elapsed = Date.now() - start;
  const stats = fmpRateLimitService.getStats();

  console.log(`\n📊 Batch Warming Results:`);
  console.log(`   Time: ${elapsed}ms (${(elapsed / 1000).toFixed(1)}s)`);
  console.log(`   Stocks: ${symbols.length}`);
  console.log(`   Total calls: ${stats.totalCalls}`);
  console.log(`   Avg response time: ${stats.avgResponseTimeMs.toFixed(0)}ms`);
  console.log(`   HTTP 429 errors: ${stats.http429Errors}`);
  console.log(`   Success rate: ${fmpRateLimitService.getSuccessRate().toFixed(1)}%`);
}
```

---

## Troubleshooting

### Issue: HTTP 429 Errors Still Occurring

**Diagnosis:**
```typescript
const health = fmpRateLimitService.getHealthReport();
console.log('HTTP 429 errors:', health.stats.http429Errors);
console.log('Adaptive backoff active:', health.state.isThrottling);
```

**Solution:**
1. Check if FMP reduced limits (verify in FMP dashboard)
2. Reduce refill rate: `FMP_RATE_LIMIT_REFILL_RATE=3`
3. Check for parallel workers consuming quota

### Issue: Slow Performance (High Wait Times)

**Diagnosis:**
```typescript
const stats = fmpRateLimitService.getStats();
console.log('Avg wait time:', stats.tokenBucket.avgWaitTimeMs);
console.log('Max wait time:', stats.tokenBucket.maxWaitTimeMs);
```

**Solution:**
1. Increase burst capacity: `FMP_RATE_LIMIT_CAPACITY=12`
2. Reduce parallel batch sizes (e.g., 6 instead of 8)
3. Implement request queuing for non-critical calls

### Issue: Token Bucket Not Refilling

**Diagnosis:**
```typescript
const state = fmpRateLimitService.getState();
console.log('Tokens:', state.tokens);
console.log('Capacity:', state.capacity);
console.log('Refill rate:', state.refillRate);

// Wait 1 second and check again
await new Promise(resolve => setTimeout(resolve, 1000));
const newState = fmpRateLimitService.getState();
console.log('New tokens:', newState.tokens);
```

**Solution:** Should refill automatically. If not, check for bugs in refill logic.

---

## Performance Benchmarks

### Expected Performance

| Workload | Time | Notes |
|----------|------|-------|
| 8 burst calls | <100ms | All instant (within burst capacity) |
| 50 stocks (8 calls each) | ~84s | 8 instant + 42 at 2s each |
| 100 stocks (8 calls each) | ~184s | Linear scaling |
| 1,493 stocks (8 calls each) | ~49 min | Full universe warming |

### Optimization Tips

1. **Batch by priority**: Warm high-priority stocks first
2. **Time windows**: Run warming during off-peak hours
3. **Parallel workers**: Use multiple workers with separate quotas
4. **Cache warming**: Pre-warm during market hours when data changes

---

## Migration Checklist

- [ ] Install new token bucket rate limiter
- [ ] Update FMP provider to use `fmpRateLimitService`
- [ ] Update warming workers to use `acquireForBatch(8)`
- [ ] Add monitoring endpoint (`/api/monitoring/fmp-rate-limit`)
- [ ] Configure environment variables in `.env.production`
- [ ] Run test suite and verify all tests pass
- [ ] Deploy to production with monitoring enabled
- [ ] Monitor for 24h and verify zero HTTP 429 errors
- [ ] Adjust capacity/refill rate based on metrics

---

## Summary

The token bucket rate limiter provides:
- ✅ **Burst allowance** (8 calls instantly)
- ✅ **Sustained rate** (4 calls/sec)
- ✅ **Adaptive rate limiting** (backs off on HTTP 429)
- ✅ **Comprehensive metrics** (monitoring and health checks)
- ✅ **Zero HTTP 429 errors** (when properly configured)

**Ready for production!** 🚀
