# Token Bucket Rate Limiter - Integration Guide

## Overview

The `fmpRateLimiter` singleton implements a Token Bucket algorithm to enforce FMP API rate limits (4 req/s with headroom for the 5 req/s limit).

**File:** `/server/lib/rate-limiter.ts`

## Configuration

- **Capacity:** 4 tokens
- **Refill Rate:** 4 tokens/second
- **Algorithm:** Token Bucket with continuous refill
- **Behavior:** Blocks (async wait) when tokens are exhausted

## Basic Usage

### Simple API Call

```typescript
import { fmpRateLimiter } from '@/lib/rate-limiter';

async function getQuote(symbol: string) {
  // Wait for token availability
  await fmpRateLimiter.take();

  // Make API call
  const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${API_KEY}`);
  return response.json();
}
```

### Batch Request (Multiple Tokens)

```typescript
import { fmpRateLimiter } from '@/lib/rate-limiter';

async function getBatchQuotes(symbols: string[]) {
  // Consume tokens equal to number of symbols
  const tokenCount = symbols.length;
  await fmpRateLimiter.take(tokenCount);

  // Make batch API call
  const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${API_KEY}`);
  return response.json();
}
```

### Monitoring Token Availability

```typescript
import { fmpRateLimiter } from '@/lib/rate-limiter';

// Check current token count
const availableTokens = fmpRateLimiter.getTokens();
console.log(`Available tokens: ${availableTokens}/4`);

// Use in health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rateLimiter: {
      availableTokens: fmpRateLimiter.getTokens(),
      capacity: 4
    }
  });
});
```

## Integration with FMP Services

### Pattern 1: Quote Service

```typescript
// server/services/fmp-quote-service.ts
import { fmpRateLimiter } from '@/lib/rate-limiter';

export class FMPQuoteService {
  async getQuote(symbol: string) {
    // Rate limit before API call
    await fmpRateLimiter.take();

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getBatchQuotes(symbols: string[]) {
    // Take tokens equal to symbol count
    await fmpRateLimiter.take(symbols.length);

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${this.apiKey}`
    );

    return await response.json();
  }
}
```

### Pattern 2: Worker Integration

```typescript
// server/workers/price-worker.ts
import { fmpRateLimiter } from '@/lib/rate-limiter';

async function updatePricesWorker() {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];

  for (const symbol of symbols) {
    // Rate limiting is automatic
    await fmpRateLimiter.take();

    const quote = await fetchQuoteFromFMP(symbol);
    await updateCache(symbol, quote);

    console.log(`Updated ${symbol} (${fmpRateLimiter.getTokens()} tokens remaining)`);
  }
}

// Run every 5 minutes
setInterval(updatePricesWorker, 5 * 60 * 1000);
```

### Pattern 3: Concurrent Requests (Safe)

```typescript
import { fmpRateLimiter } from '@/lib/rate-limiter';

async function updateMultipleSymbols(symbols: string[]) {
  // These will execute concurrently, but rate-limited
  const promises = symbols.map(async (symbol) => {
    await fmpRateLimiter.take();
    return fetchQuoteFromFMP(symbol);
  });

  // All requests respect the 4 req/s limit
  const quotes = await Promise.all(promises);
  return quotes;
}

// Example: 100 symbols will take ~25 seconds (4 req/s)
await updateMultipleSymbols(Array.from({ length: 100 }, (_, i) => `SYM${i}`));
```

## Expected Behavior

### Scenario 1: Low Load (< 4 req/s)
```typescript
// Instant execution (tokens available)
await fmpRateLimiter.take(); // 0ms wait
await fmpRateLimiter.take(); // 0ms wait
await fmpRateLimiter.take(); // 0ms wait
```

### Scenario 2: Burst Load (> 4 req/s)
```typescript
// First 4 requests: instant
await fmpRateLimiter.take(); // 0ms
await fmpRateLimiter.take(); // 0ms
await fmpRateLimiter.take(); // 0ms
await fmpRateLimiter.take(); // 0ms

// 5th request: waits ~250ms (1 token refill)
await fmpRateLimiter.take(); // ~250ms wait

// 6th request: waits ~250ms more
await fmpRateLimiter.take(); // ~250ms wait
```

### Scenario 3: Sustained Load
```typescript
// 100 requests = 25 seconds total
// (4 req/s steady state)
const start = Date.now();

for (let i = 0; i < 100; i++) {
  await fmpRateLimiter.take();
  await makeFMPCall();
}

console.log(`Elapsed: ${Date.now() - start}ms`); // ~25000ms
```

## Migration Checklist

### Files to Update

- [ ] `server/services/fmp-quote-service.ts` - Add rate limiting to all FMP calls
- [ ] `server/workers/price-worker.ts` - Integrate rate limiter in worker loop
- [ ] `server/workers/transcripts-worker.ts` - Add rate limiting to transcript fetches
- [ ] `server/routes/market-data.ts` - Rate limit batch endpoints
- [ ] `server/services/simple-cache-service.ts` - Rate limit cache-miss FMP calls

### Example Migration

**Before:**
```typescript
async function getQuote(symbol: string) {
  const response = await fetch(`https://fmp.com/api/v3/quote/${symbol}`);
  return response.json();
}
```

**After:**
```typescript
import { fmpRateLimiter } from '@/lib/rate-limiter';

async function getQuote(symbol: string) {
  await fmpRateLimiter.take(); // Add this line
  const response = await fetch(`https://fmp.com/api/v3/quote/${symbol}`);
  return response.json();
}
```

## Testing

Run the test suite:
```bash
npm test server/lib/rate-limiter.test.ts
```

Tests verify:
- Token consumption and refill
- Blocking behavior when exhausted
- Capacity limits (4 tokens max)
- Concurrent request handling
- 4 req/s rate enforcement

## Monitoring

Add to health check endpoint:
```typescript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rateLimiter: {
      availableTokens: fmpRateLimiter.getTokens(),
      capacity: 4,
      refillRate: '4 tokens/second'
    }
  });
});
```

## Performance Impact

- **Minimal overhead:** ~0.1ms per `take()` call when tokens available
- **Memory footprint:** <1KB (single instance)
- **CPU usage:** Negligible (simple arithmetic)
- **Blocking:** Only when rate limit approached (expected behavior)

## FAQ

### Q: What happens if I call `take(10)` but only 4 tokens exist?
A: The method will wait until 10 tokens are available (2.5 seconds at 4 tokens/s).

### Q: Can I have multiple rate limiters for different APIs?
A: Yes, create separate instances:
```typescript
export const alphaVantageRateLimiter = new TokenBucket(5, 5); // 5 req/s
export const fmpRateLimiter = new TokenBucket(4, 4); // 4 req/s
```

### Q: How do I disable rate limiting for testing?
A: Mock the `take()` method:
```typescript
import { fmpRateLimiter } from '@/lib/rate-limiter';

// In test setup
vi.spyOn(fmpRateLimiter, 'take').mockResolvedValue(undefined);
```

### Q: What if FMP changes their rate limit to 10 req/s?
A: Update the singleton:
```typescript
export const fmpRateLimiter = new TokenBucket(10, 10);
```

## References

- **Algorithm:** Token Bucket (RFC 2697)
- **Specification:** Lines 234-273 of `ALFALYZER_UI-UX_EXECUTION_PLAN_FINAL.md`
- **Implementation:** `/server/lib/rate-limiter.ts`
- **Tests:** `/server/lib/rate-limiter.test.ts`
