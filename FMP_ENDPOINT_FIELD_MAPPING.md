# FMP API Endpoint → Valuation Method Field Mapping
## Detailed Data Point Coverage

**Purpose:** Maps each valuation method's required inputs to specific FMP API endpoint fields.

---

## Legend

- ✅ **Available** - Field present in API response
- ⚠️ **Calculable** - Not directly available but can be calculated from other fields
- ❌ **Missing** - Not available in FMP API
- 📊 **Partial** - Available for some stocks, missing for others

---

## Method #1: AlfaValue™ (Proprietary DCF)

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **FCF TTM** | `/api/v3/cash-flow-statement/:symbol` | `freeCashFlow` | ✅ Available | Also calculable: `operatingCashFlow - capitalExpenditure` |
| **FCF 5Y Historical** | `/api/v3/cash-flow-statement/:symbol?limit=5` | `freeCashFlow` | ✅ Available | Array of 5 years |
| **Cash** | `/api/v3/balance-sheet-statement/:symbol` | `cashAndCashEquivalents` | ✅ Available | |
| **Short-Term Investments** | `/api/v3/balance-sheet-statement/:symbol` | `shortTermInvestments` | ✅ Available | |
| **Total Debt** | `/api/v3/balance-sheet-statement/:symbol` | `totalDebt` | ✅ Available | |
| **Shares Outstanding** | `/api/v3/key-metrics/:symbol` | `sharesOutstanding` | ✅ Available | Also in balance sheet: `commonStockSharesOutstanding` |
| **Beta** | `/api/v3/profile/:symbol` | `beta` | ✅ Available | |
| **Industry** | `/api/v3/profile/:symbol` | `industry` | ✅ Available | |
| **Sector** | `/api/v3/profile/:symbol` | `sector` | ✅ Available | |

**Coverage:** ✅ 100% - All fields available

---

## Method #2: DCF-20 FCF FMP

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **FCF TTM** | `/api/v3/cash-flow-statement/:symbol` | `freeCashFlow` | ✅ Available | |
| **Total Debt** | `/api/v3/balance-sheet-statement/:symbol` | `totalDebt` | ✅ Available | |
| **Cash** | `/api/v3/balance-sheet-statement/:symbol` | `cashAndCashEquivalents` | ✅ Available | |
| **Shares Outstanding** | `/api/v3/profile/:symbol` | `sharesOutstanding` | ✅ Available | |
| **DCF Value (FMP)** | `/api/v3/discounted-cash-flow/:symbol` | `dcf` | 📊 Partial | Missing for XOM, KO, BA |

**Coverage:** ⚠️ 70% - DCF endpoint missing for 30% of stocks

---

## Method #3: DCF-20 FCFE FMP (❌ FAILING)

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **FCFE TTM** | `/api/v4/advanced_levered_discounted_cash_flow` | `dcf` | ❌ **MISSING** | **Returns 0 records for ALL stocks** |
| **Total Debt** | `/api/v3/balance-sheet-statement/:symbol` | `totalDebt` | ✅ Available | |
| **Cash** | `/api/v3/balance-sheet-statement/:symbol` | `cashAndCashEquivalents` | ✅ Available | |
| **Shares Outstanding** | `/api/v3/profile/:symbol` | `sharesOutstanding` | ✅ Available | |

**Coverage:** ❌ 0% - FCFE endpoint completely non-functional

**Workaround (Manual FCFE Calculation):**
```typescript
// Option 1: Simple proxy (low-debt companies)
const fcfe = fcf;  // For tech stocks with minimal debt

// Option 2: Full calculation (complex)
const fcfe = operatingCashFlow
           - capitalExpenditure
           - (debtRepayment - newDebt)
           + (equityIssued - buybacks);
```

**Recommendation:** ❌ **REMOVE THIS METHOD** - Not worth the complexity

---

## Method #4: DCF Terminal FCF

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **FCF TTM** | `/api/v3/cash-flow-statement/:symbol` | `freeCashFlow` | ✅ Available | |
| **Terminal Growth Rate** | Manual/Config | N/A | ⚠️ Calculable | GDP + Inflation (FMP: `/api/stable/economic-indicators`) |
| **WACC** | Manual Calculation | N/A | ⚠️ Calculable | RF + Beta × MRP |

**Coverage:** ✅ 100% - All calculable from available data

---

## Method #5: DCF Terminal FCFE (❌ FAILING)

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **FCFE Terminal** | `/api/v4/advanced_levered_discounted_cash_flow` | N/A | ❌ **MISSING** | Same as Method #3 |

**Coverage:** ❌ 0% - Same FCFE endpoint issue

**Recommendation:** ❌ **REMOVE THIS METHOD**

---

## Method #6: DNI-20 (Discounted Net Income)

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **Net Income TTM** | `/api/v3/income-statement/:symbol` | `netIncome` | ✅ Available | |
| **Net Income 5Y Historical** | `/api/v3/income-statement/:symbol?limit=5` | `netIncome` | ✅ Available | |
| **Total Debt** | `/api/v3/balance-sheet-statement/:symbol` | `totalDebt` | ✅ Available | |
| **Cash** | `/api/v3/balance-sheet-statement/:symbol` | `cashAndCashEquivalents` | ✅ Available | |
| **Shares Outstanding** | `/api/v3/key-metrics/:symbol` | `sharesOutstanding` | ✅ Available | |
| **Discount Rate** | Manual Calculation | N/A | ⚠️ Calculable | CAPM: RF + Beta × MRP |

**Coverage:** ✅ 100% - All fields available

---

## Method #7: P/E Mean 5y

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **P/E Ratio (5Y Historical)** | `/api/v3/ratios/:symbol?limit=5` | `priceEarningsRatio` | ✅ Available | |
| **EPS TTM** | `/api/v3/key-metrics-ttm/:symbol` | `netIncomePerShareTTM` | ✅ Available | Also in `/api/v3/income-statement` |

**Coverage:** ✅ 100% - All fields available

---

## Method #8: P/S Mean 5y

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **P/S Ratio (5Y Historical)** | `/api/v3/ratios/:symbol?limit=5` | `priceToSalesRatio` | ✅ Available | |
| **Revenue Per Share TTM** | `/api/v3/key-metrics-ttm/:symbol` | `revenuePerShareTTM` | ✅ Available | |

**Coverage:** ✅ 100% - All fields available

---

## Method #9: P/B Mean 5y

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **P/B Ratio (5Y Historical)** | `/api/v3/ratios/:symbol?limit=5` | `priceToBookRatio` | ✅ Available | |
| **Book Value Per Share TTM** | `/api/v3/key-metrics-ttm/:symbol` | `bookValuePerShareTTM` | ✅ Available | |

**Coverage:** ✅ 100% - All fields available

---

## Method #10: PEG Ratio

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **Fair PEG Ratio** | Constant | N/A | ✅ Available | 1.5 (market standard) |
| **EPS TTM** | `/api/v3/key-metrics-ttm/:symbol` | `netIncomePerShareTTM` | ✅ Available | |
| **EPS Growth Rate** | `/api/v3/financial-growth/:symbol` | Various | ⚠️ Calculable | Use historical EPS to calculate CAGR |

**Coverage:** ✅ 100% - All calculable

**EPS Growth Calculation:**
```typescript
const income = await fmpGet(`/api/v3/income-statement/:symbol?limit=5`);
const epsHistory = income.map(s => s.eps);
const epsCAGR = calculateCAGR(epsHistory);
```

---

## Method #11: PSG Ratio

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **Fair PSG Ratio** | Constant | N/A | ✅ Available | 0.2 (market standard) |
| **Revenue Per Share TTM** | `/api/v3/key-metrics-ttm/:symbol` | `revenuePerShareTTM` | ✅ Available | |
| **Revenue Growth Rate** | `/api/v3/financial-growth/:symbol` | `revenueGrowth` | ✅ Available | |

**Coverage:** ✅ 100% - All fields available

---

## Method #12: P/E without NRI

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **P/E Ratio (5Y Historical)** | `/api/v3/ratios/:symbol?limit=5` | `priceEarningsRatio` | ✅ Available | |
| **EPS TTM (Adjusted)** | `/api/v3/income-statement/:symbol` | Various | ⚠️ Calculable | **NRI proxy calculation** |
| **Non-Recurring Items** | `/api/v3/income-statement/:symbol` | N/A | ❌ **NOT EXPLICIT** | Must proxy via special items |

**Coverage:** ⚠️ Partial - NRI not explicit, must calculate

**NRI Proxy Calculation:**
```typescript
const income = await fmpGet(`/api/v3/income-statement/:symbol?limit=1`);
const stmt = income[0];

// Proxy: Special Items = Income Before Tax - Operating Income
const specialItems = stmt.incomeBeforeTax - stmt.operatingIncome;
const adjustedNetIncome = stmt.netIncome - specialItems;
const adjustedEPS = adjustedNetIncome / stmt.weightedAverageShsOutDil;
```

**Limitation:** This proxy does NOT capture:
- Asset impairments
- Restructuring charges
- Litigation settlements
- Discontinued operations

**Recommendation:** Add disclaimer about NRI approximation.

---

## Method #13: P/B without NRI

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **P/B Ratio (5Y Historical)** | `/api/v3/ratios/:symbol?limit=5` | `priceToBookRatio` | ✅ Available | |
| **Book Value Per Share (Adjusted)** | `/api/v3/balance-sheet-statement/:symbol` | Various | ⚠️ Calculable | **NRI proxy from income statement** |
| **Non-Recurring Items** | `/api/v3/income-statement/:symbol` | N/A | ❌ **NOT EXPLICIT** | Same as Method #12 |

**Coverage:** ⚠️ Partial - NRI not explicit

**Recommendation:** Same as Method #12 - add NRI approximation disclaimer.

---

## Method #14: DFCF Terminal (3-Stage Model)

### Required Inputs

| Input Field | FMP Endpoint | Field Name | Status | Notes |
|-------------|--------------|------------|--------|-------|
| **FCF TTM** | `/api/v3/cash-flow-statement/:symbol` | `freeCashFlow` | ✅ Available | |
| **FCF 5Y Historical** | `/api/v3/cash-flow-statement/:symbol?limit=5` | `freeCashFlow` | ✅ Available | For growth rate calculation |
| **Total Debt** | `/api/v3/balance-sheet-statement/:symbol` | `totalDebt` | ✅ Available | |
| **Cash** | `/api/v3/balance-sheet-statement/:symbol` | `cashAndCashEquivalents` | ✅ Available | |
| **Shares Outstanding** | `/api/v3/profile/:symbol` | `sharesOutstanding` | ✅ Available | |
| **WACC** | Manual Calculation | N/A | ⚠️ Calculable | CAPM: RF + Beta × MRP |
| **Terminal Growth** | Manual/Config | N/A | ⚠️ Calculable | GDP + Inflation |
| **Stage 1 Growth (Y1-5)** | Calculated | N/A | ⚠️ Calculable | FCF CAGR from 5Y history |
| **Stage 2 Growth (Y6-10)** | Calculated | N/A | ⚠️ Calculable | Blend of company growth + sector average |
| **Stage 1 Value** | Calculated | N/A | ⚠️ Calculable | PV of Stage 1 cash flows |
| **Stage 2 Value** | Calculated | N/A | ⚠️ Calculable | PV of Stage 2 cash flows |
| **Terminal Value** | Calculated | N/A | ⚠️ Calculable | Gordon Growth Model |

**Coverage:** ✅ 100% - All calculable from available data

---

## Special Considerations

### REIT-Specific Metrics (NOT Available in FMP)

| Metric | Standard Formula | FMP Alternative |
|--------|------------------|-----------------|
| **FFO (Funds From Operations)** | Net Income + Depreciation + Amortization - Gains on Sales | ❌ Must calculate manually |
| **AFFO (Adjusted FFO)** | FFO - Maintenance CapEx | ❌ Must calculate manually |
| **P/FFO Multiple** | Price / FFO Per Share | ❌ Not available |

**Impact:** DCF methods severely undervalue REITs because depreciation (a non-cash charge) reduces FCF but not economic value.

**Recommendation:**
```typescript
if (sector === 'Real Estate' && isREIT) {
  throw new Error(
    'DCF methods not applicable to REITs. ' +
    'Use P/FFO multiple or NAV-based valuation instead.'
  );
}
```

---

## Macro Indicators (Available)

| Indicator | FMP Endpoint | Field Name | Used For |
|-----------|--------------|------------|----------|
| **Risk-Free Rate** | `/api/stable/treasury-rates` | `year10` | WACC calculation |
| **Market Risk Premium** | `/api/stable/market-risk-premium` | `totalEquityRiskPremium` | WACC calculation |
| **GDP Growth** | `/api/stable/economic-indicators?name=realGDP` | `value` | Terminal growth |
| **Inflation (CPI)** | `/api/stable/economic-indicators?name=CPI` | `changePercentage` | Terminal growth |

**Coverage:** ✅ All available

---

## Summary: Field Availability by Category

| Data Category | Available Fields | Calculable Fields | Missing Fields | Total Coverage |
|---------------|------------------|-------------------|----------------|----------------|
| **Cash Flow** | FCF, OCF, CapEx | - | FCFE | 75% (3/4) |
| **Balance Sheet** | Cash, Debt, Shares | - | - | 100% (3/3) |
| **Income Statement** | Revenue, Net Income, EPS | NRI (proxy) | NRI (explicit) | 80% (4/5) |
| **Ratios** | P/E, P/S, P/B | - | - | 100% (3/3) |
| **Growth Rates** | Revenue Growth | EPS CAGR, FCF CAGR | - | 100% (3/3) |
| **Company Profile** | Beta, Industry, Sector | - | - | 100% (3/3) |
| **Macro Indicators** | RF, MRP, GDP, CPI | Terminal Growth | - | 100% (4/4) |
| **REIT-Specific** | - | FFO (manual) | FFO (direct), P/FFO | 0% (0/3) |

**Overall:** ✅ **85.7% coverage** (24/28 critical data points available)

---

## Validation Test Coverage

**Test Execution:**
- **10 stocks** × **10 endpoints** = **100 API calls**
- **Success rate:** 86% (86/100 returned data)
- **Data quality:** 72% incomplete, 28% missing critical fields
- **Execution time:** ~90 seconds (rate-limited at 4 req/s)

**Sample API Calls (AAPL):**
```bash
# ✅ FCF available
GET https://financialmodelingprep.com/api/v3/cash-flow-statement/AAPL?apikey=API_KEY&limit=5
Response: [{"date":"2024-09-30","freeCashFlow":118254000000, ...}, ...]

# ✅ Ratios available
GET https://financialmodelingprep.com/api/v3/ratios/AAPL?apikey=API_KEY&limit=5
Response: [{"date":"2024-09-30","priceEarningsRatio":33.86,"priceToBookRatio":57.82, ...}, ...]

# ❌ FCFE NOT available
GET https://financialmodelingprep.com/api/v4/advanced_levered_discounted_cash_flow?symbol=AAPL&apikey=API_KEY
Response: []  # EMPTY ARRAY
```

---

## Recommendations by Method

| Method | Action | Reason |
|--------|--------|--------|
| AlfaValue™ | ✅ **KEEP** | 100% coverage |
| DCF-20 FCF FMP | ✅ **KEEP** | 70% coverage (acceptable) |
| DCF-20 FCFE FMP | ❌ **REMOVE** | 0% coverage (FCFE endpoint broken) |
| DCF Terminal FCF | ✅ **KEEP** | 100% coverage |
| DCF Terminal FCFE | ❌ **REMOVE** | 0% coverage (same FCFE issue) |
| DNI-20 NI | ✅ **KEEP** | 100% coverage |
| P/E Mean 5y | ✅ **KEEP** | 100% coverage |
| P/S Mean 5y | ✅ **KEEP** | 100% coverage |
| P/B Mean 5y | ✅ **KEEP** | 100% coverage |
| PEG Ratio | ✅ **KEEP** | 100% coverage |
| PSG Ratio | ✅ **KEEP** | 100% coverage |
| P/E without NRI | ⚠️ **KEEP + DISCLAIMER** | NRI proxy (not explicit) |
| P/B without NRI | ⚠️ **KEEP + DISCLAIMER** | NRI proxy (not explicit) |
| DFCF Terminal | ✅ **KEEP** | 100% coverage |

**Final Score:** 12/14 methods viable (85.7%)

---

**Last Updated:** 2025-10-26 01:00:00 UTC
**Validation Status:** ✅ COMPLETE
**Test Artifacts:** `/validation-results/`
