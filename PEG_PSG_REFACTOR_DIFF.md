# PEG & PSG Refactoring - Detailed Diff

## File: `/server/services/valuation-service.ts`

### Change 1: Import Additions (Line ~40)

```diff
  DNI20Response,
  DFCFTerminalResponse,
  PEValuationResponse,
+ PEGValuationResponse,
+ PSGValuationResponse,
} from '../types/valuation';
```

---

### Change 2: calculatePEG() Method Signature & Return Type

#### Method Signature
```diff
- async calculatePEG(ticker: string): Promise<number | null> {
+ async calculatePEG(ticker: string): Promise<PEGValuationResponse | null> {
```

#### Cache Type
```diff
- const cached = await redisCacheService.get<number>(cacheKey);
+ const cached = await redisCacheService.get<PEGValuationResponse>(cacheKey);
```

#### New Variable Names (for clarity)
```diff
- const epsTTM = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
- if (epsTTM <= 0) {
-   logger.warn(`[ValuationService] Invalid EPS TTM for ${upperTicker}: ${epsTTM}`);
+ const epsWithoutNRI = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
+ if (epsWithoutNRI <= 0) {
+   logger.warn(`[ValuationService] Invalid EPS TTM for ${upperTicker}: ${epsWithoutNRI}`);
```

```diff
- const growthRate = alfaValueData.assumptions.g_1_5; // Use 5y growth rate
+ const epsGrowthRate = alfaValueData.assumptions.g_1_5; // Use 5y growth rate (decimal)
```

#### New Fields Added
```diff
+ // Get current market price
+ const quote = await this.simpleCacheService.getQuote(upperTicker);
+ if (!quote) {
+   logger.warn(`[ValuationService] No quote data for ${upperTicker}`);
+   return null;
+ }
+ const currentPrice = quote.price;
+
+ // Calculate P/E ratio without NRI
+ const peWithoutNRI = currentPrice / epsWithoutNRI;
+
+ // Calculate PEG ratio: (P/E) / (Growth Rate × 100)
+ const pegRatio = peWithoutNRI / (epsGrowthRate * 100);
```

#### IV Calculation (updated variable names)
```diff
- const iv = FAIR_PEG * (growthRate * 100) * epsTTM;
+ const iv = FAIR_PEG * (epsGrowthRate * 100) * epsWithoutNRI;
```

#### Enhanced Logging
```diff
- logger.info(`[ValuationService] PEG for ${upperTicker}: FairPEG=${FAIR_PEG}, Growth=${(growthRate*100).toFixed(2)}%, EPS=${epsTTM.toFixed(2)}, IV=$${iv.toFixed(2)}`);
+ logger.info(`[ValuationService] PEG for ${upperTicker}: FairPEG=${FAIR_PEG}, Growth=${(epsGrowthRate*100).toFixed(2)}%, EPS=${epsWithoutNRI.toFixed(2)}, PE=${peWithoutNRI.toFixed(2)}, PEG=${pegRatio.toFixed(2)}, IV=$${iv.toFixed(2)}`);
```

#### Return Object Instead of Number
```diff
+ const response: PEGValuationResponse = {
+   ticker: upperTicker,
+   iv,
+   currentPrice,
+   epsWithoutNRI,
+   peWithoutNRI,
+   epsGrowthRate,
+   pegRatio,
+   fairPegRatio: FAIR_PEG,
+   confidence: 'MED',
+   as_of: new Date().toISOString().split('T')[0],
+ };
+
  // Cache for 24h
- await redisCacheService.set(cacheKey, iv, 86400);
+ await redisCacheService.set(cacheKey, response, 86400);

- return iv;
+ return response;
```

---

### Change 3: calculatePSG() Method Signature & Return Type

#### Method Signature
```diff
- async calculatePSG(ticker: string): Promise<number | null> {
+ async calculatePSG(ticker: string): Promise<PSGValuationResponse | null> {
```

#### Cache Type
```diff
- const cached = await redisCacheService.get<number>(cacheKey);
+ const cached = await redisCacheService.get<PSGValuationResponse>(cacheKey);
```

#### New Variable Names (for clarity)
```diff
- const revenueCAGR = Math.pow(revenues[0] / revenues[3], 1 / 3) - 1;
+ const revenueGrowthRate = Math.pow(revenues[0] / revenues[3], 1 / 3) - 1;
```

```diff
- const revenuePerShareTTM = Number(keyMetricsTTM[0].revenuePerShareTTM || 0);
- if (revenuePerShareTTM <= 0) {
-   logger.warn(`[ValuationService] Invalid revenue per share TTM for ${upperTicker}: ${revenuePerShareTTM}`);
+ const salesPerShare = Number(keyMetricsTTM[0].revenuePerShareTTM || 0);
+ if (salesPerShare <= 0) {
+   logger.warn(`[ValuationService] Invalid revenue per share TTM for ${upperTicker}: ${salesPerShare}`);
```

#### New Fields Added
```diff
+ // Get current market price
+ const quote = await this.simpleCacheService.getQuote(upperTicker);
+ if (!quote) {
+   logger.warn(`[ValuationService] No quote data for ${upperTicker}`);
+   return null;
+ }
+ const currentPrice = quote.price;
+
+ // Calculate P/S ratio
+ const psRatio = currentPrice / salesPerShare;
+
+ // Calculate PSG ratio: (P/S) / (Growth Rate × 100)
+ const psgRatio = psRatio / (revenueGrowthRate * 100);
```

#### IV Calculation (updated variable names)
```diff
- const iv = FAIR_PSG * (revenueCAGR * 100) * revenuePerShareTTM;
+ const iv = FAIR_PSG * (revenueGrowthRate * 100) * salesPerShare;
```

#### Enhanced Logging
```diff
- logger.info(`[ValuationService] PSG for ${upperTicker}: FairPSG=${FAIR_PSG}, CAGR=${(revenueCAGR*100).toFixed(2)}%, SPS=${revenuePerShareTTM.toFixed(2)}, IV=$${iv.toFixed(2)}`);
+ logger.info(`[ValuationService] PSG for ${upperTicker}: FairPSG=${FAIR_PSG}, CAGR=${(revenueGrowthRate*100).toFixed(2)}%, SPS=${salesPerShare.toFixed(2)}, PS=${psRatio.toFixed(2)}, PSG=${psgRatio.toFixed(2)}, IV=$${iv.toFixed(2)}`);
```

#### Return Object Instead of Number
```diff
+ const response: PSGValuationResponse = {
+   ticker: upperTicker,
+   iv,
+   currentPrice,
+   salesPerShare,
+   psRatio,
+   revenueGrowthRate,
+   psgRatio,
+   fairPsgRatio: FAIR_PSG,
+   confidence: 'MED',
+   as_of: new Date().toISOString().split('T')[0],
+ };
+
  // Cache for 24h
- await redisCacheService.set(cacheKey, iv, 86400);
+ await redisCacheService.set(cacheKey, response, 86400);

- return iv;
+ return response;
```

---

## Summary of Changes

| Aspect | calculatePEG() | calculatePSG() |
|--------|---------------|---------------|
| Return Type | `number \| null` → `PEGValuationResponse \| null` | `number \| null` → `PSGValuationResponse \| null` |
| Cache Type | `number` → `PEGValuationResponse` | `number` → `PSGValuationResponse` |
| New Fields | 7 (currentPrice, epsWithoutNRI, peWithoutNRI, epsGrowthRate, pegRatio, fairPegRatio, confidence, as_of) | 7 (currentPrice, salesPerShare, psRatio, revenueGrowthRate, psgRatio, fairPsgRatio, confidence, as_of) |
| Variable Renames | `epsTTM` → `epsWithoutNRI`, `growthRate` → `epsGrowthRate` | `revenueCAGR` → `revenueGrowthRate`, `revenuePerShareTTM` → `salesPerShare` |
| Formula | Unchanged | Unchanged |
| Breaking | Yes | Yes |

---

## Testing Requirements

### Unit Tests Needed

1. **Response Shape**
   - All fields present
   - Correct types
   - No undefined values

2. **Calculations**
   - PEG = (P/E) / (Growth × 100)
   - PSG = (P/S) / (Growth × 100)
   - IV = Fair Ratio × (Growth × 100) × Per-Share Metric

3. **Edge Cases**
   - Invalid ticker → null
   - Missing data → null
   - Negative growth → handled gracefully

4. **Caching**
   - First call fetches data
   - Second call returns cached response
   - TTL = 24 hours

### Integration Tests Needed

1. **API Endpoints**
   - Response matches new shape
   - Frontend can parse response
   - Backward compatibility handled

2. **Performance**
   - No regression in response time
   - Cache hit rate maintained

---

## Manual Verification Steps

```bash
# 1. Build server
npm run build:server

# 2. Start server
npm run dev

# 3. Test PEG endpoint
curl http://localhost:3001/api/valuation/peg/AAPL | jq

# Expected shape:
{
  "ticker": "AAPL",
  "iv": 150.23,
  "currentPrice": 175.50,
  "epsWithoutNRI": 6.61,
  "peWithoutNRI": 26.55,
  "epsGrowthRate": 0.1007,
  "pegRatio": 2.64,
  "fairPegRatio": 1.5,
  "confidence": "MED",
  "as_of": "2025-10-21"
}

# 4. Test PSG endpoint
curl http://localhost:3001/api/valuation/psg/AAPL | jq

# Expected shape:
{
  "ticker": "AAPL",
  "iv": 48.59,
  "currentPrice": 175.50,
  "salesPerShare": 27.34,
  "psRatio": 6.42,
  "revenueGrowthRate": 0.0547,
  "psgRatio": 11.74,
  "fairPsgRatio": 0.2,
  "confidence": "MED",
  "as_of": "2025-10-21"
}
```

---

**Generated:** 2025-10-21
**TDD Approach:** Red → Green → Refactor
**Status:** Ready for Manual Application + Testing
