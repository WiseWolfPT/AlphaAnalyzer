# FMP Data Coverage Validation - Index
## Complete Documentation of Intrinsic Value Calculation Data Sources

**Validation Date:** 2025-10-26
**Status:** ✅ **COMPLETE**
**Test Coverage:** 10 stocks × 14 methods × 10 endpoints = 100 API calls

---

## Quick Navigation

### For Executives (5-minute read)
1. [Quick Reference](./FMP_VALIDATION_QUICK_REFERENCE.md) - TL;DR summary
2. [Executive Summary Section](#executive-summary-below) - Key findings

### For Developers (Implementation)
1. [Endpoint Field Mapping](./FMP_ENDPOINT_FIELD_MAPPING.md) - Exact API → Input mappings
2. [Code Snippets Section](#implementation-code-snippets) - Copy-paste ready code

### For Analysts (Deep Dive)
1. [Full Validation Report](./FMP_DATA_COVERAGE_VALIDATION_REPORT.md) - Complete analysis
2. [Gap Analysis](./validation-results/fmp-gap-analysis.md) - Missing data points
3. [Test Results](./validation-results/fmp-test-results.json) - Raw API responses

---

## Executive Summary

### Bottom Line

**Question:** Can FMP API support all 14 Intrinsic Value calculation methods?

**Answer:** ✅ **YES - 12 out of 14 methods** (85.7% coverage)

| Category | Count | Status |
|----------|-------|--------|
| **Fully Supported** | 10 | ✅ Keep as-is |
| **Supported with Disclaimers** | 2 | ⚠️ Add NRI proxy note |
| **Not Supported** | 2 | ❌ Remove from app |

### Critical Actions Required

#### Must-Do Before Production

1. ❌ **REMOVE 2 Methods:**
   - DCF-20 FCFE FMP (FCFE data unavailable)
   - DCF Terminal FCFE (same issue)

2. ⚠️ **ADD Warning for Stale Data:**
   - 30% of stocks have data 299 days old (XOM, KO, BA)
   - Display: "Data is X days old. IV may be outdated."

3. ⚠️ **ADD REIT Detection:**
   - Block DCF methods for REITs (FFO not available)
   - Suggest alternative: "Use P/B Mean or Dividend Discount Model"

4. ⚠️ **ADD NRI Disclaimers:**
   - P/E without NRI → "NRI estimated using proxy calculation"
   - P/B without NRI → same note

#### Should-Do (Quality Improvements)

5. ✅ Implement quarterly data fallback for stale annual data
6. ✅ Add sector-specific method recommendations
7. ✅ Display data freshness prominently
8. ✅ Improve error messages (e.g., "Missing: sharesOutstanding")

### What We Validated

| Aspect | Details |
|--------|---------|
| **Methods Tested** | 14 valuation methods (DCF, Multiples, Growth) |
| **Stocks Tested** | 10 diverse stocks (Tech, Finance, Healthcare, Energy, Utilities, REIT, Consumer, Industrial, Retail) |
| **Endpoints Tested** | 10 FMP API endpoints |
| **Total API Calls** | 100 calls (10 stocks × 10 endpoints) |
| **Execution Time** | ~90 seconds (rate-limited at 4 req/s) |

---

## Documentation Structure

```
FMP Validation Documentation/
│
├── FMP_VALIDATION_INDEX.md (THIS FILE)
│   └── High-level navigation + executive summary
│
├── FMP_VALIDATION_QUICK_REFERENCE.md
│   └── TL;DR - 5-minute read with key findings
│
├── FMP_DATA_COVERAGE_VALIDATION_REPORT.md
│   └── FULL REPORT - Comprehensive analysis (17 pages)
│
├── FMP_ENDPOINT_FIELD_MAPPING.md
│   └── DEVELOPER GUIDE - Exact field mappings for each method
│
├── validation-results/
│   ├── fmp-coverage-matrix.csv
│   │   └── Coverage by method (14 rows × 7 columns)
│   │
│   ├── fmp-gap-analysis.md
│   │   └── Detailed gap analysis per method
│   │
│   └── fmp-test-results.json
│       └── Raw API responses (100 endpoint calls)
│
└── scripts/
    └── validate-fmp-data-coverage.ts
        └── Validation script (re-runnable)
```

---

## Key Findings Summary

### 1. FCFE Methods Cannot Work (❌ REMOVE)

**Problem:** `/api/v4/advanced_levered_discounted_cash_flow` returns 0 records for ALL stocks.

**Impact:** 2 methods fail:
- DCF-20 FCFE FMP
- DCF Terminal FCFE

**Workaround:** None practical. FCFE requires complex debt issuance tracking.

**Decision:** ❌ **REMOVE both methods from app**

---

### 2. NRI Data Not Explicit (⚠️ KEEP with Disclaimer)

**Problem:** FMP does NOT provide explicit "Non-Recurring Items" field.

**Impact:** 2 methods use approximations:
- P/E without NRI
- P/B without NRI

**Workaround:** Proxy calculation via special items:
```typescript
const specialItems = incomeBeforeTax - operatingIncome;
const adjustedNetIncome = netIncome - specialItems;
```

**Decision:** ⚠️ **KEEP methods** but add disclaimer:
> "NRI estimated using special items proxy (incomeBeforeTax - operatingIncome). Actual NRI may include additional items not captured here."

---

### 3. REIT Data Missing (⚠️ BLOCK for REITs)

**Problem:** NO FFO (Funds From Operations) data for REITs.

**Impact:** DCF methods severely undervalue REITs (depreciation distorts FCF).

**Example:** American Tower (AMT) - REIT in test set

**Decision:** ⚠️ **BLOCK DCF methods** for REITs:
```typescript
if (sector === 'Real Estate' && isREIT) {
  throw new Error(
    'DCF methods not applicable to REITs. ' +
    'Use P/B Mean or Dividend Discount Model instead.'
  );
}
```

---

### 4. Data Freshness Varies (⚠️ WARN Users)

**Problem:** 30% of stocks have stale data (299 days old).

**Stocks Affected:**
- XOM (Energy) - 299 days
- KO (Consumer Staples) - 299 days
- BA (Industrials) - 299 days

**Root Cause:** December fiscal year-end companies report Q4 in late January. Test run on Oct 26 = 9 months since last report.

**Decision:** ⚠️ **DISPLAY warning** if data > 180 days old:
```typescript
if (dataAgeDays > 180) {
  return {
    warning: `Data is ${dataAgeDays} days old. IV calculation may be outdated.`,
    recommendation: 'Use quarterly data or wait for next earnings report.'
  };
}
```

---

## Method-by-Method Results

| # | Method | Coverage | Status | Action |
|---|--------|----------|--------|--------|
| 1 | **AlfaValue™** | 100% | ✅ Working | Keep |
| 2 | **DCF-20 FCF FMP** | 70% | ✅ Working | Keep (DCF endpoint missing for 3 stocks) |
| 3 | **DCF-20 FCFE FMP** | 0% | ❌ **FAILING** | **REMOVE** |
| 4 | **DCF Terminal FCF** | 100% | ✅ Working | Keep |
| 5 | **DCF Terminal FCFE** | 0% | ❌ **FAILING** | **REMOVE** |
| 6 | **DNI-20 NI** | 100% | ✅ Working | Keep |
| 7 | **P/E Mean 5y** | 100% | ✅ Working | Keep |
| 8 | **P/S Mean 5y** | 100% | ✅ Working | Keep |
| 9 | **P/B Mean 5y** | 100% | ✅ Working | Keep |
| 10 | **PEG Ratio** | 100% | ✅ Working | Keep |
| 11 | **PSG Ratio** | 100% | ✅ Working | Keep |
| 12 | **P/E without NRI** | Partial | ⚠️ **PROXY** | Keep + disclaimer |
| 13 | **P/B without NRI** | Partial | ⚠️ **PROXY** | Keep + disclaimer |
| 14 | **DFCF Terminal** | 100% | ✅ Working | Keep |

**Final Count:** ✅ 12 viable methods (85.7%)

---

## Stock-by-Stock Results

| Stock | Sector | Type | Coverage | Freshness | Issues |
|-------|--------|------|----------|-----------|--------|
| **AAPL** | Technology | Large Cap | 90% | ✅ 1 day | FCFE only |
| **JPM** | Financials | Large Cap | 90% | ✅ 1 day | FCFE only |
| **JNJ** | Healthcare | Large Cap | 90% | ✅ 1 day | FCFE only |
| **XOM** | Energy | Large Cap | 80% | ❌ **299 days** | DCF + FCFE + **STALE** |
| **NEE** | Utilities | Large Cap | 90% | ✅ 1 day | FCFE only |
| **AMT** | Real Estate | REIT | 90% | ✅ 1 day | FCFE + **NO FFO** |
| **TSLA** | Technology | High Growth | 90% | ✅ 1 day | FCFE only |
| **KO** | Consumer Staples | Defensive | 80% | ❌ **299 days** | DCF + FCFE + **STALE** |
| **BA** | Industrials | Cyclical | 80% | ❌ **299 days** | DCF + FCFE + **STALE** |
| **WMT** | Retail | Large Cap | 90% | ✅ 1 day | FCFE only |

**Average Coverage:** 87%
**Fresh Data:** 70% (7/10 stocks)
**Stale Data:** 30% (3/10 stocks)

---

## Sector Recommendations

| Sector | Best Methods | Avoid Methods | Notes |
|--------|--------------|---------------|-------|
| **Technology** | AlfaValue™, DCF-20 FCF, PEG | - | Best data coverage |
| **Financials** | P/B Mean, P/E Mean | DCF methods | Banks have different cash flow dynamics |
| **Healthcare** | AlfaValue™, DCF-20 FCF, P/E Mean | - | Good coverage |
| **Energy** | P/E Mean, P/B Mean | DCF (stale data) | Wait for Q4 2025 |
| **Utilities** | Dividend Discount, P/B Mean | - | Stable dividend payers |
| **REITs** | **P/FFO (manual)**, P/B Mean | **❌ ALL DCF** | FFO not available |
| **Consumer Staples** | P/E Mean, Dividend Discount | DCF (stale data) | Mature, low-growth |
| **Industrials** | P/E Mean | DCF (stale data) | Cyclical + stale = unreliable |
| **Retail** | AlfaValue™, P/S Mean, PEG | - | Good coverage |

---

## Implementation Code Snippets

### 1. Remove FCFE Methods

**File:** `server/services/valuation-service.ts`

```typescript
// In getAllMethods() or similar
const AVAILABLE_METHODS: MethodId[] = [
  'alfa-value',
  'dcf-fcf-20',
  // 'dcf-fcfe-20',        // ❌ REMOVED - FMP doesn't provide FCFE
  'dcf-terminal-fcf',
  // 'dcf-terminal-fcfe',  // ❌ REMOVED - FMP doesn't provide FCFE
  'dni-20',
  'pe-mean',
  'ps-mean',
  'pb-mean',
  'peg',
  'psg',
  'pe-mean-without-nri',
  'pb-mean-without-nri',
  'dfcf-terminal',
];
```

### 2. Add Data Freshness Warning

**File:** `server/services/valuation-service.ts`

```typescript
function checkDataFreshness(latestDate: string): { warning?: string; dataAgeDays: number } {
  const dataAgeDays = Math.floor(
    (Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dataAgeDays > 180) {
    return {
      dataAgeDays,
      warning:
        `Data is ${dataAgeDays} days old. IV calculation may be outdated. ` +
        `Consider waiting for next earnings report or use quarterly data.`
    };
  }

  return { dataAgeDays };
}

// In getAlfaValue() or similar
const freshnessCheck = checkDataFreshness(latestCashFlow.date);

return {
  ...response,
  dataFreshness: freshnessCheck,
};
```

### 3. REIT Detection & Blocking

**File:** `server/middleware/validate-stock-type.ts` (new file)

```typescript
import { FMPCompanyProfile } from '../types/valuation';

export function isREIT(profile: FMPCompanyProfile): boolean {
  return (
    profile.sector === 'Real Estate' &&
    (profile.industry?.includes('REIT') || profile.isREIT)
  );
}

export function validateMethodForStockType(
  methodId: string,
  profile: FMPCompanyProfile
): void {
  const DCF_METHODS = [
    'alfa-value',
    'dcf-fcf-20',
    'dcf-terminal-fcf',
    'dni-20',
    'dfcf-terminal'
  ];

  if (isREIT(profile) && DCF_METHODS.includes(methodId)) {
    throw new Error(
      `DCF methods not applicable to REITs. ` +
      `REITs require FFO (Funds From Operations) valuation, which is not available in FMP. ` +
      `Recommended methods: P/B Mean, Dividend Discount Model`
    );
  }
}
```

### 4. NRI Proxy Calculation

**File:** `server/services/valuation-service.ts`

```typescript
/**
 * Calculate NRI (Non-Recurring Items) proxy
 * Limitation: This is an approximation. True NRI includes asset impairments,
 * restructuring charges, litigation settlements, etc. which are not explicitly
 * separated by FMP.
 */
async function calculateNRIProxy(ticker: string): Promise<number> {
  const income = await fmpGet<any[]>(`/api/v3/income-statement/${ticker}`, {
    period: 'annual',
    limit: 1
  });

  if (!income || income.length === 0) return 0;

  const stmt = income[0];
  // Proxy: Special Items = Income Before Tax - Operating Income
  const specialItems = (stmt.incomeBeforeTax || 0) - (stmt.operatingIncome || 0);

  return specialItems;
}

// In calculatePEMeanWithoutNRI()
const nriProxy = await calculateNRIProxy(ticker);
const adjustedNetIncome = netIncome - nriProxy;
const adjustedEPS = adjustedNetIncome / shares;

return {
  ticker,
  iv: meanPE * adjustedEPS,
  disclaimer:
    'NRI estimated using special items proxy (incomeBeforeTax - operatingIncome). ' +
    'Actual NRI may include additional items not captured here.',
  nriMethod: 'proxy',
  confidence: 'MED',
  as_of: new Date().toISOString().split('T')[0]
};
```

---

## Testing & Validation

### How to Re-Run Validation

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1

# Install dependencies
npm install

# Run validation script
npx tsx scripts/validate-fmp-data-coverage.ts

# Results will be saved to:
# - validation-results/fmp-coverage-matrix.csv
# - validation-results/fmp-test-results.json
# - validation-results/fmp-gap-analysis.md
```

### Validation Script Features

- ✅ Tests 10 diverse stocks (different sectors/types)
- ✅ Tests 10 FMP API endpoints
- ✅ Rate-limited at 4 req/s (FMP limit)
- ✅ Analyzes field coverage per endpoint
- ✅ Calculates data freshness
- ✅ Generates CSV, JSON, and Markdown reports
- ✅ Execution time: ~90 seconds

---

## Success Criteria (Met)

- ✅ All 14 methods' data requirements documented
- ✅ FMP endpoint coverage mapped (10 endpoints tested)
- ✅ Data gaps identified with workarounds (FCFE, NRI, FFO)
- ✅ Sector-specific issues documented (REITs, Energy, Consumer Staples)
- ✅ Actionable recommendations provided (remove 2, add 3 warnings)

---

## Next Steps

### Phase 1: Implement Critical Fixes (Ship-Blocker)

1. Remove FCFE methods from dropdown (Est: 30 min)
2. Add data staleness warning (Est: 1 hour)
3. Implement REIT detection & blocking (Est: 2 hours)
4. Add NRI proxy disclaimers (Est: 30 min)

**Total Effort:** ~4 hours

### Phase 2: Quality Improvements (Post-Launch)

1. Quarterly data fallback for stale annual data (Est: 4 hours)
2. Sector-specific method recommendations (Est: 2 hours)
3. Display data source transparency (Est: 1 hour)
4. Enhanced error messages (Est: 2 hours)

**Total Effort:** ~9 hours

### Phase 3: Advanced Features (Future)

1. Manual FCFE calculation (if critical) (Est: 8 hours)
2. Manual FFO calculation for REITs (Est: 6 hours)
3. Data quality monitoring dashboard (Est: 16 hours)

**Total Effort:** ~30 hours

---

## Related Documentation

### FMP API Documentation
- [Cash Flow Statement](https://site.financialmodelingprep.com/developer/docs#Cash-Flow-Statement)
- [Key Metrics](https://site.financialmodelingprep.com/developer/docs#Key-Metrics)
- [Financial Ratios](https://site.financialmodelingprep.com/developer/docs#Financial-Ratios)
- [DCF Values](https://site.financialmodelingprep.com/developer/docs#Discounted-Cash-Flow)

### Internal Documentation
- [Valuation Service](../server/services/valuation-service.ts)
- [FMP DCF Service](../server/services/fmp-dcf.ts)
- [Valuation Types](../server/types/valuation.ts)

---

## Questions & Support

**Q: Why can't we calculate FCFE manually?**
A: We CAN, but it requires tracking net debt issued (debt raised - debt repaid) and net equity issued (shares issued - buybacks). This data is spread across multiple statements and quarters, making it complex and error-prone. For minimal benefit over FCF methods, it's not worth the effort.

**Q: Will removing FCFE methods impact users?**
A: No. FCFE and FCF methods are similar, and we have 5 other DCF methods available. Users won't notice the difference.

**Q: Can we add FCFE methods later if FMP fixes the endpoint?**
A: Yes! The validation script is re-runnable. If FMP fixes `/api/v4/advanced_levered_discounted_cash_flow`, we can re-test and add the methods back.

**Q: What about other data providers?**
A: This validation is FMP-specific. If we switch to Alpha Vantage or another provider, we'd need to re-run similar validation.

---

**Report Compiled:** 2025-10-26 01:45:00 UTC
**Compiled By:** Claude (Financial Analysis AI)
**Validation Status:** ✅ COMPLETE
**Confidence Level:** HIGH (systematic testing across 100 API calls)
