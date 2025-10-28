# Quarterly Fallback System - Quick Start Guide

**For Developers:** How to use the new Sub-Fase 3A quarterly fallback system in your valuation methods.

---

## TL;DR

Replace direct FMP calls with fallback functions to automatically try quarterly data when annual data is unavailable:

```typescript
// ❌ OLD WAY (fails if no annual data)
const incomeData = await fmpGet<any[]>(`/api/v3/income-statement/${ticker}`, {
  period: 'annual',
  limit: 5,
});

// ✅ NEW WAY (tries quarterly if annual unavailable)
const incomeStatement = await fetchFinancialStatementsWithFallback(ticker, 'income');
```

---

## Quick Examples

### Example 1: Single Statement Fetch

```typescript
import { fetchFinancialStatementsWithFallback } from '../utils/financial-statements-fallback';

// Fetch income statement (annual → quarterly → TTM)
const income = await fetchFinancialStatementsWithFallback('AAPL', 'income');

if (income) {
  const netIncome = income.netIncome;
  const revenue = income.revenue;
  const source = income.source; // 'annual' or 'quarterly-ttm'

  console.log(`Net Income: $${netIncome / 1e6}M (source: ${source})`);
}
```

### Example 2: Batch Fetch All Statements

```typescript
import { fetchAllStatementsWithFallback } from '../utils/financial-statements-fallback';

// Fetch all three statement types in parallel
const statements = await fetchAllStatementsWithFallback('MSFT');

if (statements.income && statements.balance && statements.cashflow) {
  const netIncome = statements.income.netIncome;
  const totalDebt = statements.balance.totalDebt;
  const fcf = statements.cashflow.freeCashFlow;

  // All statements are now available
}
```

### Example 3: Check Data Quality

```typescript
import { fetchFinancialStatementsWithFallback, getStatementQuality } from '../utils/financial-statements-fallback';

const income = await fetchFinancialStatementsWithFallback('TSLA', 'income');
const quality = getStatementQuality(income);

console.log(`Data available: ${quality.hasData}`);
console.log(`Source: ${quality.source}`);          // 'annual', 'quarterly-ttm', 'none'
console.log(`Confidence: ${quality.confidence}`);  // 'HIGH', 'MED', 'LOW'
console.log(`Quarters used: ${quality.quartersUsed || 'N/A'}`);
```

---

## Available Functions

### `fetchFinancialStatementsWithFallback()`

**Signature:**
```typescript
fetchFinancialStatementsWithFallback(
  symbol: string,
  statementType: 'income' | 'balance' | 'cashflow'
): Promise<FinancialStatement | null>
```

**Returns:** Normalized financial statement or `null` if no data available

**Usage:**
```typescript
const income = await fetchFinancialStatementsWithFallback('AAPL', 'income');
const balance = await fetchFinancialStatementsWithFallback('AAPL', 'balance');
const cashflow = await fetchFinancialStatementsWithFallback('AAPL', 'cashflow');
```

### `fetchAllStatementsWithFallback()`

**Signature:**
```typescript
fetchAllStatementsWithFallback(symbol: string): Promise<{
  income: FinancialStatement | null;
  balance: FinancialStatement | null;
  cashflow: FinancialStatement | null;
}>
```

**Returns:** Object with all three statement types (fetched in parallel)

**Usage:**
```typescript
const statements = await fetchAllStatementsWithFallback('GOOGL');

if (statements.income) {
  // Income statement available
}
if (statements.balance) {
  // Balance sheet available
}
if (statements.cashflow) {
  // Cash flow statement available
}
```

### `getStatementQuality()`

**Signature:**
```typescript
getStatementQuality(statement: FinancialStatement | null): {
  hasData: boolean;
  source: 'annual' | 'quarterly-ttm' | 'none';
  confidence: 'HIGH' | 'MED' | 'LOW';
  quartersUsed?: number;
}
```

**Returns:** Metadata about data quality and confidence level

**Usage:**
```typescript
const income = await fetchFinancialStatementsWithFallback('NVDA', 'income');
const quality = getStatementQuality(income);

if (quality.confidence === 'HIGH') {
  // Proceed with valuation
} else if (quality.confidence === 'MED') {
  // Proceed with caution (add disclaimer)
} else {
  // Skip valuation (insufficient data)
}
```

---

## Data Structure

### FinancialStatement Interface

```typescript
interface FinancialStatement {
  date: string;                  // Most recent date (e.g., "2024-12-31")
  symbol: string;                // Stock ticker
  period: 'annual' | 'quarterly' | 'ttm';
  reportedCurrency: string;      // "USD"
  calendarYear: string;          // "2024"

  // Income Statement Fields
  revenue?: number;              // In dollars (not millions!)
  netIncome?: number;
  operatingIncome?: number;
  ebitda?: number;
  eps?: number;
  epsdiluted?: number;
  weightedAverageShsOut?: number;
  weightedAverageShsOutDil?: number;

  // Balance Sheet Fields
  totalAssets?: number;
  totalLiabilities?: number;
  totalDebt?: number;
  netDebt?: number;
  cashAndCashEquivalents?: number;
  shortTermInvestments?: number;
  totalEquity?: number;
  commonStockSharesOutstanding?: number;
  intangibleAssets?: number;
  goodwill?: number;

  // Cash Flow Statement Fields
  operatingCashFlow?: number;
  capitalExpenditure?: number;
  freeCashFlow?: number;

  // Metadata
  source: 'annual' | 'quarterly-ttm';  // Which tier provided the data
  quartersUsed?: number;                // For TTM: number of quarters summed (1-4)
}
```

---

## Common Patterns

### Pattern 1: Valuation Method with Fallback

```typescript
async calculateMyValuationMethod(ticker: string): Promise<ValuationResponse | null> {
  const upperTicker = ticker.toUpperCase();

  // Use fallback for data fetch
  const statements = await fetchAllStatementsWithFallback(upperTicker);

  if (!statements.income || !statements.balance) {
    logger.warn(`Insufficient data for ${upperTicker}`);
    return null;
  }

  // Extract values (in millions)
  const netIncome = statements.income.netIncome / 1_000_000;
  const totalDebt = statements.balance.totalDebt / 1_000_000;
  const cash = (statements.balance.cashAndCashEquivalents || 0) / 1_000_000;

  // Check data quality
  const incomeQuality = getStatementQuality(statements.income);

  // Calculate intrinsic value
  const iv = /* your calculation */;

  // Set confidence based on data quality
  const confidence = incomeQuality.confidence === 'HIGH' ? 'HIGH' : 'MED';

  return {
    ticker: upperTicker,
    iv,
    confidence,
    // ... other fields
  };
}
```

### Pattern 2: Handling Historical Data

```typescript
async calculateWithHistoricalData(ticker: string): Promise<number> {
  const income = await fetchFinancialStatementsWithFallback(ticker, 'income');

  if (income?.source === 'annual') {
    // We have annual data, fetch full historical array
    const historicalIncome = await fmpGet<any[]>(`/api/v3/income-statement/${ticker}`, {
      period: 'annual',
      limit: 5,
    });

    const netIncome5y = historicalIncome.map(stmt => stmt.netIncome / 1_000_000);
    const cagr = calculateCAGR(netIncome5y);  // Full 5-year growth rate
    return cagr;

  } else if (income?.source === 'quarterly-ttm') {
    // We only have TTM data, can't calculate historical CAGR
    // Use TTM value with default/estimated growth rate
    const netIncomeTTM = income.netIncome / 1_000_000;
    const estimatedGrowth = 0.10;  // Default 10% growth estimate
    return estimatedGrowth;
  }

  return 0;  // No data available
}
```

### Pattern 3: Confidence-Based Fallback

```typescript
async valuateWithConfidence(ticker: string): Promise<ValuationResponse> {
  const income = await fetchFinancialStatementsWithFallback(ticker, 'income');
  const quality = getStatementQuality(income);

  let confidence: 'HIGH' | 'MED' | 'LOW';
  let note: string;

  if (quality.source === 'annual') {
    confidence = 'HIGH';
    note = 'Based on audited annual financial statements';
  } else if (quality.source === 'quarterly-ttm' && quality.quartersUsed === 4) {
    confidence = 'HIGH';
    note = 'Based on trailing twelve months (4 quarters)';
  } else if (quality.source === 'quarterly-ttm') {
    confidence = 'MED';
    note = `Based on ${quality.quartersUsed} quarters (partial year)`;
  } else {
    confidence = 'LOW';
    note = 'Insufficient financial data available';
  }

  return {
    ticker,
    iv: /* calculated value */,
    confidence,
    note,
  };
}
```

---

## Important Notes

### 1. Unit Conversion

**FMP API returns values in dollars (not millions!):**

```typescript
// ❌ WRONG - Will be 1000x too large
const netIncome = income.netIncome;

// ✅ CORRECT - Convert to millions
const netIncome_musd = income.netIncome / 1_000_000;
```

### 2. Balance Sheet = Point-in-Time

**Balance sheet uses most recent quarter (not sum):**

```typescript
// For balance sheet, TTM = most recent quarter only
const balance = await fetchFinancialStatementsWithFallback('AAPL', 'balance');

// This is the balance as of the most recent quarter-end
const totalDebt = balance.totalDebt;  // Snapshot, not sum
```

### 3. Income & Cash Flow = Cumulative

**Income and cash flow TTM = sum of 4 quarters:**

```typescript
// For income statement, TTM = sum of last 4 quarters
const income = await fetchFinancialStatementsWithFallback('AAPL', 'income');

// This is Q4 + Q3 + Q2 + Q1
const netIncome = income.netIncome;  // Sum of 4 quarters
```

### 4. Null Checks

**Always check for null before accessing fields:**

```typescript
const income = await fetchFinancialStatementsWithFallback('XYZ', 'income');

if (!income || !income.netIncome) {
  logger.warn('No income data available');
  return null;
}

// Safe to use now
const netIncome = income.netIncome;
```

---

## Migration Checklist

When updating existing valuation methods:

- [ ] Import fallback functions from `financial-statements-fallback`
- [ ] Replace `fmpGet()` calls with `fetchFinancialStatementsWithFallback()`
- [ ] Update variable names (e.g., `incomeData` → `incomeStatement`)
- [ ] Handle both `annual` and `quarterly-ttm` sources
- [ ] Adjust confidence level based on data quality
- [ ] Add unit tests for both annual and TTM data paths
- [ ] Update documentation/comments

---

## Testing

### Test Your Integration

```bash
# Run quarterly fallback test suite
npx tsx scripts/test-quarterly-fallback.ts

# Expected output:
# - Data source breakdown (Annual vs TTM)
# - Confidence levels (HIGH/MED/LOW)
# - Methods available per stock
# - Before/after comparison
```

### Manual Testing

```typescript
// In your test file
import { fetchFinancialStatementsWithFallback } from '../server/utils/financial-statements-fallback';

// Test with stock known to have annual data
const aapl = await fetchFinancialStatementsWithFallback('AAPL', 'income');
console.assert(aapl?.source === 'annual', 'AAPL should use annual data');

// Test with recent IPO (may use quarterly)
const newStock = await fetchFinancialStatementsWithFallback('ARM', 'income');
console.log('ARM source:', newStock?.source);  // May be 'quarterly-ttm'
```

---

## Troubleshooting

### Issue: Getting `null` result

**Cause:** No annual or quarterly data available for this stock

**Solution:**
```typescript
const income = await fetchFinancialStatementsWithFallback('XYZ', 'income');

if (!income) {
  logger.warn(`${ticker}: No financial data available (tried annual + quarterly)`);
  return null;
}
```

### Issue: TTM values seem wrong

**Cause:** Quarterly data may have reporting lag or fiscal year mismatch

**Solution:** Check quarters used and date:
```typescript
const income = await fetchFinancialStatementsWithFallback('ABC', 'income');

if (income?.source === 'quarterly-ttm') {
  logger.info(`Using TTM from ${income.quartersUsed} quarters, most recent: ${income.date}`);
}
```

### Issue: Confidence always LOW

**Cause:** Stock only has 1-2 quarters of data (not enough for full TTM)

**Solution:** Adjust minimum data requirements:
```typescript
const quality = getStatementQuality(income);

if (quality.quartersUsed && quality.quartersUsed < 4) {
  logger.warn(`Only ${quality.quartersUsed} quarters available, consider skipping valuation`);
}
```

---

## Performance Tips

1. **Use batch fetch when possible:**
   ```typescript
   // ✅ Good - Parallel fetch
   const statements = await fetchAllStatementsWithFallback('AAPL');

   // ❌ Slower - Sequential fetch
   const income = await fetchFinancialStatementsWithFallback('AAPL', 'income');
   const balance = await fetchFinancialStatementsWithFallback('AAPL', 'balance');
   const cashflow = await fetchFinancialStatementsWithFallback('AAPL', 'cashflow');
   ```

2. **Cache results when looping:**
   ```typescript
   // ✅ Good - Fetch once
   const income = await fetchFinancialStatementsWithFallback('AAPL', 'income');
   const ni1 = income.netIncome;
   const ni2 = income.netIncome;  // Reuse

   // ❌ Bad - Redundant fetches
   const ni1 = (await fetchFinancialStatementsWithFallback('AAPL', 'income')).netIncome;
   const ni2 = (await fetchFinancialStatementsWithFallback('AAPL', 'income')).netIncome;
   ```

3. **Early return on null:**
   ```typescript
   // ✅ Good - Fail fast
   const statements = await fetchAllStatementsWithFallback(ticker);
   if (!statements.income || !statements.balance) return null;

   // Now safe to proceed
   const netIncome = statements.income.netIncome;
   ```

---

## Further Reading

- **Full Implementation Report:** `SUB_FASE_3A_IMPLEMENTATION_REPORT.md`
- **Source Code:** `server/utils/financial-statements-fallback.ts`
- **Test Suite:** `scripts/test-quarterly-fallback.ts`
- **Integration Example:** `server/services/valuation-service.ts` (DNI20 method)

---

**Questions?** Check the full implementation report or source code comments.
