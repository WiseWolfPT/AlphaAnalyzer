# Agents 6-7-8: Batch Infrastructure Specifications

**Date**: 2025-11-05
**Purpose**: Define exact deliverables for batch processing infrastructure
**Blocker For**: Agent 9 (Warming Worker Batch Migration)

---

## AGENT 6: FMP Batch Data Fetching

**File**: `server/services/providers/fmp-batch-provider.ts` (NEW)

**Mission**: Reduce 400 individual FMP API calls → 8 batch API calls

---

### Deliverable 1: Batch Financial Data Fetcher

```typescript
export interface BatchFinancialData {
  profile: FMPCompanyProfile | null;
  incomeStatement: FMPFinancialStatement[] | null;
  balanceSheet: FMPFinancialStatement[] | null;
  cashFlow: FMPFinancialStatement[] | null;
  keyMetrics: any[] | null;
  ratios: any[] | null;
  dcf: any[] | null;
  growthRates: any[] | null;
}

export class FMPBatchProvider {
  /**
   * Fetch ALL financial data for multiple stocks in batch
   *
   * FMP API Endpoints (batch-enabled):
   * 1. /api/v3/profile/{symbol1,symbol2,...}
   * 2. /api/v3/income-statement/{symbol1,symbol2,...}?limit=5
   * 3. /api/v3/balance-sheet-statement/{symbol1,symbol2,...}?limit=5
   * 4. /api/v3/cash-flow-statement/{symbol1,symbol2,...}?limit=5
   * 5. /api/v3/key-metrics/{symbol1,symbol2,...}?limit=5
   * 6. /api/v3/ratios/{symbol1,symbol2,...}?limit=5
   * 7. /api/v4/advanced_discounted_cash_flow?symbols={symbol1,symbol2,...}
   * 8. /api/v3/financial-growth/{symbol1,symbol2,...}?limit=5
   *
   * @param symbols Array of stock symbols (max 50 per batch)
   * @returns Map of symbol → financial data
   */
  async getBatchFinancialData(
    symbols: string[]
  ): Promise<Map<string, BatchFinancialData>>;

  /**
   * Batch fetch with rate limiting and retry logic
   *
   * Features:
   * - Token bucket rate limiter (4 req/s)
   * - Exponential backoff on HTTP 429
   * - Partial failure handling (return what succeeded)
   * - Gzip compression support
   * - Bandwidth tracking
   */
  async fetchBatchEndpoint<T>(
    endpoint: string,
    symbols: string[],
    params?: Record<string, any>
  ): Promise<Map<string, T>>;
}
```

**Performance Requirements:**
- ✅ 8 API calls for 50 stocks (vs 400 individual)
- ✅ <2 seconds total fetch time
- ✅ Handle partial failures (return available data)
- ✅ Retry on HTTP 429 with exponential backoff
- ✅ Track bandwidth usage

**Error Handling:**
```typescript
// Partial failure example:
const results = await getBatchFinancialData(['AAPL', 'MSFT', 'INVALID']);

// Returns:
Map {
  'AAPL' => { profile: {...}, incomeStatement: [...], ... },
  'MSFT' => { profile: {...}, incomeStatement: [...], ... },
  'INVALID' => { profile: null, incomeStatement: null, ... } // Missing data
}
```

**Integration Points:**
- Uses existing `FMPProvider` for rate limiting
- Integrates with `warmingThrottle` for bandwidth tracking
- Returns data in format compatible with `valuationService`

---

## AGENT 7: Batch Valuation Service

**File**: `server/services/batch-valuation-service.ts` (NEW)

**Mission**: Calculate IV for 50 stocks using shared data (no redundant fetches)

---

### Deliverable 1: Batch Intrinsic Value Calculator

```typescript
export interface BatchValuationOptions {
  methods?: MethodId[]; // Which methods to calculate (default: all 12)
  useCache?: boolean; // Check cache first (default: true)
  skipClassification?: boolean; // Use pre-classified types (default: false)
}

export interface IntrinsicValueResults {
  methods: Map<MethodId, ValuationResult>;
  classification: StockClassification; // 'bank' | 'reit' | 'growth' | 'value'
  availableMethods: MethodId[]; // Methods valid for this stock type
  timestamp: string;
}

export class BatchValuationService {
  /**
   * Calculate intrinsic value for multiple stocks
   *
   * Strategy:
   * 1. Fetch financial data once for all stocks (8 API calls)
   * 2. Classify stocks by sector/industry (determines available methods)
   * 3. Calculate methods in parallel (Promise.allSettled)
   * 4. Return results map with partial failures isolated
   *
   * @param symbols Array of stock symbols
   * @param options Calculation options
   * @returns Map of symbol → IV results
   */
  async calculateBatchIntrinsicValues(
    symbols: string[],
    options?: BatchValuationOptions
  ): Promise<Map<string, IntrinsicValueResults>>;

  /**
   * Classify multiple stocks in batch
   *
   * Classification Rules:
   * - Banks: Skip DCF methods (use PTBV instead)
   * - REITs: Use PTBV + DDM (skip FCF-based methods)
   * - Growth: Use Growth DCF 8Y + high-growth assumptions
   * - Value: Use all methods
   *
   * @param symbols Array of stock symbols
   * @returns Map of symbol → classification
   */
  async classifyBatchStocks(
    symbols: string[]
  ): Promise<Map<string, StockClassification>>;

  /**
   * Calculate single method for multiple stocks
   * (Used for progressive warming)
   *
   * @param symbols Array of stock symbols
   * @param methodId Specific method to calculate
   * @returns Map of symbol → method result
   */
  async calculateBatchMethod(
    symbols: string[],
    methodId: MethodId
  ): Promise<Map<string, ValuationResult>>;
}
```

**Performance Requirements:**
- ✅ Calculate 50 stocks × 12 methods in <5 seconds
- ✅ Reuse financial data across methods (fetch once)
- ✅ Parallel method execution (Promise.allSettled)
- ✅ Error isolation (one stock failure doesn't block others)
- ✅ Method filtering by stock type

**Method Availability by Stock Type:**
```typescript
const METHOD_AVAILABILITY = {
  bank: [
    'alfa-value',
    'ptbv',           // Primary for banks
    'pe-mean',
    'pb-mean',
    'ddm'             // If dividend-paying
    // Skips: DCF methods (unreliable for banks)
  ],
  reit: [
    'alfa-value',
    'ptbv',           // Primary for REITs
    'ddm',            // REITs are dividend-focused
    'pe-mean',
    'pb-mean'
    // Skips: FCF-based DCF (REITs don't generate traditional FCF)
  ],
  growth: [
    'alfa-value',
    'growth-dcf-8y',  // Primary for growth stocks
    'dcf-fcf-20',
    'dcf-terminal-fcf',
    'pe-mean',
    'ps-mean',
    'peg',
    'psg'
    // Uses high-growth assumptions
  ],
  value: [
    // All 12 methods available
    'alfa-value',
    'dcf-fcf-20',
    'dcf-terminal-fcf',
    'dni-20',
    'dfcf-terminal',
    'pe-mean',
    'pe-mean-without-nri',
    'ps-mean',
    'pb-mean',
    'pb-mean-without-nri',
    'peg',
    'psg'
  ]
};
```

**Integration Points:**
- Uses `FMPBatchProvider` for data fetching
- Uses existing `valuationService` calculation logic
- Returns data compatible with `methodCacheService`

---

## AGENT 8: Batch Cache Service

**File**: `server/services/batch-cache-service.ts` (NEW)

**Mission**: Optimize Redis operations for batch warming (reduce round-trips)

---

### Deliverable 1: Batch Method Cache

```typescript
export interface BatchWarmingResults {
  success: string[]; // Tickers successfully warmed
  failed: string[]; // Tickers that failed
  cached: string[]; // Tickers already cached (no work needed)
  apiCalls: number; // Total API calls made
  bandwidthBytes: number; // Total bandwidth used
  durationMs: number; // Total time taken
}

export class BatchCacheService {
  /**
   * Warm multiple methods for multiple stocks
   *
   * Strategy:
   * 1. Check cache for all stocks (Redis MGET)
   * 2. Identify missing stocks
   * 3. Calculate missing stocks in batch
   * 4. Store results (Redis MSET)
   *
   * @param requests Array of {ticker, methodId} pairs
   * @param batchSize Max stocks per batch (default: 50)
   * @returns Warming results
   */
  async warmBatchMethods(
    requests: Array<{ticker: string, methodId: MethodId}>,
    batchSize?: number
  ): Promise<BatchWarmingResults>;

  /**
   * Get multiple cached methods at once
   *
   * Uses Redis MGET for single round-trip:
   * MGET iv:method:AAPL:alfa-value iv:method:MSFT:alfa-value ...
   *
   * @param requests Array of {ticker, methodId} pairs
   * @returns Map of cache key → result
   */
  async getBatchMethods(
    requests: Array<{ticker: string, methodId: MethodId}>
  ): Promise<Map<string, ValuationResult | null>>;

  /**
   * Store multiple method results at once
   *
   * Uses Redis MSET for single round-trip:
   * MSET iv:method:AAPL:alfa-value {...} iv:method:MSFT:alfa-value {...}
   *
   * @param results Map of cache key → result
   * @param ttl Time-to-live in seconds (default: 24h)
   */
  async setBatchMethods(
    results: Map<string, ValuationResult>,
    ttl?: number
  ): Promise<void>;

  /**
   * Invalidate multiple methods at once
   *
   * Uses Redis DEL pipeline:
   * DEL iv:method:AAPL:* iv:method:MSFT:*
   *
   * @param tickers Array of stock tickers
   * @param methods Optional: specific methods to invalidate (default: all)
   */
  async invalidateBatchMethods(
    tickers: string[],
    methods?: MethodId[]
  ): Promise<void>;
}
```

**Performance Requirements:**
- ✅ 50 cache operations in <50ms (1ms per stock)
- ✅ Use Redis pipelines (MGET/MSET/DEL)
- ✅ Handle cache misses gracefully
- ✅ Support TTL per method
- ✅ Thundering herd protection

**Redis Pipeline Optimization:**
```typescript
// BAD: 50 round-trips (50ms+)
for (const ticker of tickers) {
  const cached = await redis.get(`iv:method:${ticker}:alfa-value`);
}

// GOOD: 1 round-trip (<1ms)
const keys = tickers.map(t => `iv:method:${t}:alfa-value`);
const results = await redis.mget(...keys);
```

**Integration Points:**
- Extends `methodCacheService` with batch methods
- Uses `enhancedRedisCacheService` for Redis operations
- Compatible with existing cache key format

---

## INTEGRATION EXAMPLE (Agent 9)

Once Agents 6-7-8 complete, Agent 9 will refactor the warming worker:

```typescript
// OLD: Individual processing (400 API calls)
for (const task of tasks) {
  const result = await warmMethod(task.ticker, task.methodId);
  await sleep(250); // Rate limiting
}

// NEW: Batch processing (8 API calls)
async function warmingCycle() {
  // 1. Get next batch
  const tasks = await warmingQueueService.getNextBatch(50);
  const symbols = [...new Set(tasks.map(t => t.ticker))];

  // 2. Batch validate (already optimized)
  const validSymbols = await fmpDataValidator.validateBatch(symbols);

  // 3. Check cache for all stocks (1 Redis round-trip)
  const cacheResults = await batchCacheService.getBatchMethods(
    validSymbols.map(s => ({ ticker: s, methodId: 'alfa-value' }))
  );

  // 4. Identify missing stocks
  const missingSymbols = validSymbols.filter(s => !cacheResults.get(s));

  // 5. Calculate batch intrinsic values (8 API calls for 50 stocks)
  const ivResults = await batchValuationService.calculateBatchIntrinsicValues(
    missingSymbols,
    { methods: METHOD_IDS, useCache: true }
  );

  // 6. Store results (1 Redis round-trip)
  await batchCacheService.setBatchMethods(ivResults);

  // 7. Update queue
  for (const [symbol, result] of ivResults.entries()) {
    await warmingQueueService.markCompleted(symbol, 'alfa-value');
  }

  logger.info(
    `Cycle complete: ${missingSymbols.length} calculated, ` +
    `${cacheResults.size - missingSymbols.length} cached, ` +
    `8 API calls, 2s duration`
  );
}
```

**Performance Comparison:**

| Metric | Old (Individual) | New (Batch) | Improvement |
|--------|------------------|-------------|-------------|
| API Calls | 400 | 8 | **98% reduction** |
| Cycle Time | 12.5s | 2s | **6.25x faster** |
| Throughput | 240 stocks/h | 1,500 stocks/h | **6.25x increase** |
| Cache Hits | N/A | 70%+ | **Instant response** |
| Bandwidth | 12 MB | 0.24 MB | **98% reduction** |

---

## TESTING REQUIREMENTS

Each agent must deliver unit tests:

### Agent 6 Tests
```typescript
describe('FMPBatchProvider', () => {
  it('should fetch 50 stocks with 8 API calls', async () => {
    const results = await provider.getBatchFinancialData(symbols);
    expect(apiCallSpy).toHaveBeenCalledTimes(8);
    expect(results.size).toBe(50);
  });

  it('should handle partial failures', async () => {
    // Mock 40 success, 10 failures
    const results = await provider.getBatchFinancialData(symbols);
    expect(results.size).toBe(50);
    expect([...results.values()].filter(d => d.profile).length).toBe(40);
  });

  it('should retry on HTTP 429', async () => {
    // Mock rate limit error, then success
    const results = await provider.getBatchFinancialData(symbols);
    expect(apiCallSpy).toHaveBeenCalledTimes(2); // 1 fail + 1 retry
  });
});
```

### Agent 7 Tests
```typescript
describe('BatchValuationService', () => {
  it('should calculate 50 stocks in <5 seconds', async () => {
    const start = Date.now();
    const results = await service.calculateBatchIntrinsicValues(symbols);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
    expect(results.size).toBe(50);
  });

  it('should reuse financial data across methods', async () => {
    const results = await service.calculateBatchIntrinsicValues(symbols);

    // Should fetch data once, use for all methods
    expect(fetchSpy).toHaveBeenCalledTimes(8); // Not 8 × 12 = 96
  });

  it('should classify stocks correctly', async () => {
    const classifications = await service.classifyBatchStocks(['JPM', 'O', 'NVDA']);

    expect(classifications.get('JPM')).toBe('bank');
    expect(classifications.get('O')).toBe('reit');
    expect(classifications.get('NVDA')).toBe('growth');
  });
});
```

### Agent 8 Tests
```typescript
describe('BatchCacheService', () => {
  it('should use Redis MGET for batch retrieval', async () => {
    const results = await service.getBatchMethods(requests);

    expect(redisMgetSpy).toHaveBeenCalledTimes(1);
    expect(results.size).toBe(50);
  });

  it('should use Redis MSET for batch storage', async () => {
    await service.setBatchMethods(results);

    expect(redisMsetSpy).toHaveBeenCalledTimes(1);
  });

  it('should complete 50 operations in <50ms', async () => {
    const start = Date.now();
    await service.warmBatchMethods(requests);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });
});
```

---

## DELIVERABLE CHECKLIST

### Agent 6: FMP Batch Provider ☐
- [ ] `FMPBatchProvider` class with 8 batch endpoints
- [ ] Rate limiting (4 req/s with token bucket)
- [ ] Retry logic (exponential backoff on HTTP 429)
- [ ] Partial failure handling
- [ ] Bandwidth tracking
- [ ] Unit tests (90%+ coverage)
- [ ] Integration tests with real FMP API
- [ ] Documentation

### Agent 7: Batch Valuation Service ☐
- [ ] `BatchValuationService` class
- [ ] `calculateBatchIntrinsicValues(symbols, options)`
- [ ] `classifyBatchStocks(symbols)`
- [ ] `calculateBatchMethod(symbols, methodId)`
- [ ] Shared data optimization
- [ ] Parallel method execution
- [ ] Error isolation
- [ ] Unit tests (90%+ coverage)
- [ ] Performance benchmarks (<5s for 50 stocks)
- [ ] Documentation

### Agent 8: Batch Cache Service ☐
- [ ] `BatchCacheService` class
- [ ] `warmBatchMethods(requests, batchSize)`
- [ ] `getBatchMethods(requests)` with Redis MGET
- [ ] `setBatchMethods(results, ttl)` with Redis MSET
- [ ] `invalidateBatchMethods(tickers, methods)`
- [ ] Pipeline optimization
- [ ] Thundering herd protection
- [ ] Unit tests (90%+ coverage)
- [ ] Performance benchmarks (<50ms for 50 ops)
- [ ] Documentation

---

## TIMELINE ESTIMATE

- **Agent 6**: 2-3 hours (FMP batch fetching)
- **Agent 7**: 2-3 hours (batch valuation calculations)
- **Agent 8**: 1-2 hours (batch cache service)
- **Agent 9**: 1.5 hours (warming worker refactor)

**Total**: 6.5-9.5 hours for complete batch migration

---

## SUCCESS CRITERIA

### Performance Metrics
- ✅ 98% API call reduction (400 → 8)
- ✅ 6.25x throughput increase (240 → 1,500 stocks/hour)
- ✅ 95% faster cycles (12.5s → 2s)
- ✅ 100% cache coverage in 1 hour (1,493 stocks)

### Quality Metrics
- ✅ 90%+ test coverage for all agents
- ✅ Zero breaking changes to existing code
- ✅ Backwards compatible (individual methods still work)
- ✅ Comprehensive error handling
- ✅ Production-ready monitoring

### Operational Metrics
- ✅ <1% bandwidth usage (18 MB/day of 20 GB limit)
- ✅ <200 FMP calls/minute (well below 300 limit)
- ✅ 70%+ cache hit rate
- ✅ <100ms P95 latency for cached responses

---

**Agents 6, 7, 8: Please proceed with specifications above.**
**Agent 9: Resume after dependencies complete.**
