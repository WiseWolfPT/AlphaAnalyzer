# FMP Data Coverage - Quick Reference
## Validation Results at a Glance

**Date:** 2025-10-26 | **Status:** ⚠️ ACTION REQUIRED

---

## TL;DR

✅ **12/14 methods can work** with FMP data
❌ **2/14 methods must be removed** (FCFE unavailable)
⚠️ **0/14 methods have perfect coverage** (all marked "incomplete")

---

## Critical Findings (30-Second Read)

| Finding | Impact | Action |
|---------|--------|--------|
| **FCFE endpoint returns 0 records** | DCF-20 FCFE & DCF Terminal FCFE fail | ❌ REMOVE both methods |
| **NRI data not explicit** | P/E/P/B without NRI use approximations | ⚠️ ADD disclaimer |
| **REIT FFO data missing** | DCF methods inaccurate for REITs | ⚠️ ADD sector detection |
| **30% of stocks have stale data** | IV calculations outdated (299 days old) | ⚠️ ADD freshness warning |

---

## Methods Status

### ✅ KEEP (10 methods)

1. AlfaValue™ - Partial coverage, works
2. DCF-20 FCF FMP - Partial coverage, works
3. DCF Terminal FCF - Partial coverage, works
4. DNI-20 NI - Partial coverage, works
5. DFCF Terminal - Partial coverage, works
6. P/E Mean 5y - Partial coverage, works
7. P/S Mean 5y - Partial coverage, works
8. P/B Mean 5y - Partial coverage, works
9. PEG Ratio - Partial coverage, works
10. PSG Ratio - Partial coverage, works

### ⚠️ KEEP WITH DISCLAIMERS (2 methods)

11. P/E without NRI - Partial coverage, **uses proxy calculation**
    - Add note: "NRI estimated from special items"
12. P/B without NRI - Partial coverage, **uses proxy calculation**
    - Add note: "NRI estimated from special items"

### ❌ REMOVE (2 methods)

13. DCF-20 FCFE FMP - **NO COVERAGE** - `/api/v4/advanced_levered_discounted_cash_flow` returns 0 records
14. DCF Terminal FCFE - **NO COVERAGE** - Same endpoint issue

---

## FMP Endpoint Health

| Endpoint | Works? | Quality | Issue |
|----------|--------|---------|-------|
| `/api/v3/cash-flow-statement/:symbol` | ✅ Yes | Incomplete | Missing some fields |
| `/api/v3/key-metrics/:symbol` | ✅ Yes | Incomplete | Missing some ratios |
| `/api/v3/profile/:symbol` | ✅ Yes | **POOR** | Most fields absent |
| `/api/v3/balance-sheet-statement/:symbol` | ✅ Yes | Incomplete | Missing ratios |
| `/api/v3/discounted-cash-flow/:symbol` | ⚠️ 70% | Incomplete | Missing for XOM, KO, BA |
| `/api/v4/advanced_levered_discounted_cash_flow` | ❌ **NO** | **NONE** | **Returns 0 records** |
| `/api/v3/income-statement/:symbol` | ✅ Yes | Incomplete | Missing per-share metrics |
| `/api/v3/ratios/:symbol` | ✅ Yes | Incomplete | Some ratios missing |
| `/api/v3/key-metrics-ttm/:symbol` | ✅ Yes | **POOR** | Most TTM metrics absent |
| `/api/v3/financial-growth/:symbol` | ✅ Yes | Incomplete | Partial growth data |

---

## Data Freshness by Stock

| Stock | Sector | Freshness | Status |
|-------|--------|-----------|--------|
| AAPL | Technology | 1 day | ✅ Fresh |
| JPM | Financials | 1 day | ✅ Fresh |
| JNJ | Healthcare | 1 day | ✅ Fresh |
| XOM | Energy | **299 days** | ❌ **STALE** |
| NEE | Utilities | 1 day | ✅ Fresh |
| AMT | Real Estate | 1 day | ✅ Fresh (but REIT issues) |
| TSLA | Technology | 1 day | ✅ Fresh |
| KO | Consumer Staples | **299 days** | ❌ **STALE** |
| BA | Industrials | **299 days** | ❌ **STALE** |
| WMT | Retail | 1 day | ✅ Fresh |

**Stale Data:** Companies with December fiscal year-end reporting in late January.

---

## Sector-Specific Recommendations

| Sector | Use These Methods | Avoid These Methods | Notes |
|--------|-------------------|---------------------|-------|
| **Technology** | AlfaValue™, DCF-20 FCF, PEG | - | Best data coverage |
| **Financials** | P/B Mean, P/E Mean | DCF methods | Banks have different cash flow dynamics |
| **Healthcare** | AlfaValue™, DCF-20 FCF, P/E Mean | - | Good coverage |
| **Energy** | P/E Mean, P/B Mean | DCF (stale data) | Wait for Q4 2025 |
| **Utilities** | Dividend Discount, P/B Mean | - | Stable dividend payers |
| **REITs** | **P/FFO (manual calc)** | **❌ ALL DCF methods** | FFO not available in FMP |
| **Consumer Staples** | P/E Mean, Dividend Discount | DCF (stale data) | Mature, low-growth |
| **Industrials** | P/E Mean | DCF (stale data) | Cyclical + stale = unreliable |
| **Retail** | AlfaValue™, P/S Mean, PEG | - | Good coverage |

---

## Implementation Checklist

### Must-Do (Ship-Blockers)

- [ ] Remove DCF-20 FCFE FMP from dropdown
- [ ] Remove DCF Terminal FCFE from dropdown
- [ ] Add REIT detection (exclude from DCF methods)
- [ ] Add data freshness warning (if > 180 days old)

### Should-Do (Quality)

- [ ] Add NRI calculation disclaimer for P/E/P/B without NRI methods
- [ ] Implement quarterly data fallback for stale annual data
- [ ] Add sector-specific method recommendations
- [ ] Improve error messages (e.g., "Missing field: sharesOutstanding")

### Nice-to-Have (Enhancements)

- [ ] Manual FCFE calculation (if we want to keep FCFE methods)
- [ ] Manual FFO calculation for REITs
- [ ] Data quality monitoring dashboard
- [ ] Display data source transparency ("Data as of: YYYY-MM-DD")

---

## Code Snippets

### 1. Remove FCFE Methods

```typescript
// In valuation-service.ts or relevant controller

const AVAILABLE_METHODS = [
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

```typescript
function checkDataFreshness(latestDate: string): { warning?: string } {
  const dataAge = (Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24);

  if (dataAge > 180) {
    return {
      warning: `Data is ${Math.floor(dataAge)} days old. IV calculation may be outdated. ` +
               `Consider waiting for next earnings report or use quarterly data.`
    };
  }

  return {};
}
```

### 3. REIT Detection

```typescript
function isREIT(profile: FMPCompanyProfile): boolean {
  return profile.sector === 'Real Estate' &&
         (profile.industry?.includes('REIT') || profile.isREIT);
}

function validateMethodForStock(methodId: string, profile: FMPCompanyProfile) {
  const DCF_METHODS = ['alfa-value', 'dcf-fcf-20', 'dcf-terminal-fcf', 'dni-20', 'dfcf-terminal'];

  if (isREIT(profile) && DCF_METHODS.includes(methodId)) {
    throw new Error(
      `DCF methods not applicable to REITs. ` +
      `Use P/FFO multiple or NAV-based valuation instead. ` +
      `Available methods: P/B Mean, Dividend Discount Model`
    );
  }
}
```

### 4. NRI Calculation (Proxy)

```typescript
async function calculateNRIProxy(ticker: string): Promise<number> {
  const income = await fmpGet<any[]>(`/api/v3/income-statement/${ticker}`, { limit: 1 });

  if (!income || income.length === 0) return 0;

  const stmt = income[0];
  // Proxy: Special Items = Income Before Tax - Operating Income
  const specialItems = (stmt.incomeBeforeTax || 0) - (stmt.operatingIncome || 0);

  return specialItems;
}

// In P/E without NRI method
const nriProxy = await calculateNRIProxy(ticker);
const adjustedNetIncome = netIncome - nriProxy;
const adjustedEPS = adjustedNetIncome / shares;

return {
  iv: meanPE * adjustedEPS,
  disclaimer: 'NRI estimated using special items proxy (incomeBeforeTax - operatingIncome). ' +
              'Actual NRI may include additional items not captured here.'
};
```

---

## Test Results Files

All validation artifacts:

```
validation-results/
├── fmp-coverage-matrix.csv      # Coverage by method (14 rows)
├── fmp-test-results.json        # Raw API responses (10 stocks × 10 endpoints)
└── fmp-gap-analysis.md          # Detailed gap analysis
```

**Validation Script:** `scripts/validate-fmp-data-coverage.ts`

---

## Questions? Troubleshooting

**Q: Why is FCFE endpoint returning 0 records?**
A: FMP API v4 endpoint `/advanced_levered_discounted_cash_flow` appears to be deprecated or requires premium subscription. Use FCF methods instead.

**Q: Why is data 299 days old for some stocks?**
A: Companies with December fiscal year-end (XOM, KO, BA) report Q4 in late January. Test run on Oct 26 = 9 months since last annual report. Use quarterly data or wait for Q4 2025.

**Q: Can we calculate FCFE manually?**
A: Yes, but complex. Requires tracking debt issuance, buybacks, etc. Not recommended unless FCFE is critical for your use case.

**Q: What about REITs?**
A: DCF methods don't work for REITs (depreciation distorts FCF). Need FFO (Funds From Operations) which FMP doesn't provide. Calculate manually or exclude REITs from DCF.

---

**Last Updated:** 2025-10-26 00:50:00 UTC
**Validation Status:** ✅ COMPLETE
**Recommended Action:** Implement "Must-Do" checklist before production deployment
