# Available Intrinsic Value Methods - Backend Reference

**Last Updated:** 2025-10-24 (ONDA 3.1)
**Status:** 12 Active Methods + 1 ERROR (P/B NRI to be removed)

---

## Summary

The Alfalyzer backend implements **12 correct intrinsic value calculation methods**, organized into 4 categories:

| Category | Count | Description |
|----------|-------|-------------|
| **Proprietary** | 1 | Alfalyzer's AlfaValue™ algorithm |
| **DCF Methods** | 5 | Discounted Cash Flow variants (20-year and terminal) |
| **Multiples** | 4 | P/E, P/S, P/B ratios (Mean only) + 1 ERROR (P/B NRI) |
| **Growth** | 2 | PEG and PSG ratios |

⚠️ **ONDA 3.1 Finding:** P/B Mean without NRI is an implementation error (see `NRI_CONFORMANCE_REPORT.md`)

---

## 1. Proprietary Method (1)

### 1.1 AlfaValue™
- **Method ID:** `alfavalue`
- **Category:** Proprietary
- **Formula:** `FCF → PV(g1-5, g6-10, g11-20, DR) + Cash - Debt`
- **Source:** Internal
- **Function:** `valuationService.getAlfaValue(ticker)`
- **Description:** Alfalyzer's proprietary 3-stage DCF model with dynamic growth rates and macro adjustments.

---

## 2. DCF Methods (5)

### 2.1 DCF-20 Free Cash Flow (FMP)
- **Method ID:** `dcf-20-fcf`
- **Category:** DCF
- **Formula:** `FMP 10y FCF projection (unlevered)`
- **Source:** FMP (Financial Modeling Prep)
- **Function:** `fmpDCFService.getDCF_FCF_EXT(ticker)`
- **Description:** 20-year DCF using free cash flow projections from FMP.

### 2.2 DCF-20 Free Cash Flow to Equity (FMP)
- **Method ID:** `dcf-20-fcfe`
- **Category:** DCF
- **Formula:** `FMP 10y FCFE projection (levered)`
- **Source:** FMP
- **Function:** `fmpDCFService.getDCF_FCFE_EXT(ticker)`
- **Description:** 20-year DCF using levered free cash flow (FCFE).

### 2.3 DCF Terminal FCF (FMP)
- **Method ID:** `dcf-terminal-fcf`
- **Category:** DCF
- **Formula:** `FMP Terminal Value (Gordon Growth)`
- **Source:** FMP
- **Function:** `fmpDCFService.getDCF_TERM_EXT(ticker)`
- **Description:** Terminal value DCF using Gordon Growth Model.

### 2.4 DCF Terminal FCFE (FMP)
- **Method ID:** `dcf-terminal-fcfe`
- **Category:** DCF
- **Formula:** `FMP Terminal Value Levered`
- **Source:** FMP
- **Function:** `fmpDCFService.getDCF_TERM_FCFE_EXT(ticker)`
- **Description:** Levered terminal value DCF.

### 2.5 DNI-20 Net Income
- **Method ID:** `dni-20`
- **Category:** DCF
- **Formula:** `Σ(NI_t / (1 + WACC)^t) + Cash - Debt`
- **Source:** Internal
- **Function:** `valuationService.calculateDNI20(ticker)`
- **Description:** 20-year DCF based on net income projections.

---

## 3. Multiples Methods (5)

**ONDA 2.2 Update:** Only **Mean** methods are implemented. Median methods were removed to align with StockOracle's methodology.

### 3.1 P/E Mean 5Y
- **Method ID:** `pe-mean`
- **Category:** Multiples
- **Formula:** `Mean(P/E_5y) × EPS_TTM`
- **Source:** Internal
- **Function:** `valuationService.calculatePEMean5Y(ticker)`
- **Description:** 5-year average P/E ratio multiplied by trailing 12-month EPS.

### 3.2 P/E Mean without NRI
- **Method ID:** `pe-mean-without-nri`
- **Category:** Multiples
- **Formula:** `Mean(P/E_5y_adj) × Adjusted_EPS_TTM`
- **Source:** Internal
- **Function:** `valuationService.calculatePEMeanWithoutNRI(ticker)`
- **Description:** Adjusted for Non-Recurring Items (NRI).

### 3.3 P/S Mean 5Y
- **Method ID:** `ps-mean`
- **Category:** Multiples
- **Formula:** `Mean(P/S_5y) × Sales_per_Share_TTM`
- **Source:** Internal
- **Function:** `valuationService.calculatePSMean5Y(ticker)`
- **Description:** 5-year average Price-to-Sales ratio.

### 3.4 P/B Mean 5Y
- **Method ID:** `pb-mean`
- **Category:** Multiples
- **Formula:** `Mean(P/B_5y) × Book_Value_per_Share_TTM`
- **Source:** Internal
- **Function:** `valuationService.calculatePBMean5Y(ticker)`
- **Description:** 5-year average Price-to-Book ratio.

### ❌ 3.5 P/B Mean without NRI (ERROR - TO BE REMOVED)
- **Method ID:** `pb-mean-without-nri`
- **Category:** Multiples
- **Formula:** `Mean(P/B_5y_adj) × Adjusted_BVPS_TTM`
- **Source:** Internal
- **Function:** `valuationService.calculatePBMeanWithoutNRI(ticker)`
- **Description:** Adjusted for Non-Recurring Items (NRI).
- **Status:** ⚠️ **IMPLEMENTATION ERROR** - Book value is NOT affected by non-recurring items. This method should not exist. See `NRI_CONFORMANCE_REPORT.md` for details.

---

## Understanding "Without NRI" Methods

### What is NRI?
**Non-Recurring Items (NRI)** are one-time charges or gains that distort earnings and make year-over-year comparisons difficult.

**Examples:**
- Restructuring costs
- Lawsuit settlements
- Asset impairments
- Goodwill write-downs
- One-time tax benefits

### Which Methods Should Have NRI Variants?

**✅ Applicable To:**
- **P/E Ratio** (earnings-based) - ✅ Implemented correctly
- **PEG Ratio** (earnings growth-based) - 🔜 To be implemented

**❌ NOT Applicable To:**
- **P/S Ratio** (revenue is top-line, unaffected by NRI)
- **P/B Ratio** (book value is balance sheet, not income statement) - ⚠️ Current implementation is ERROR
- **DCF methods** (cash flow adjustments are different)
- **PSG Ratio** (revenue-based)

### Why P/B Cannot Have NRI Adjustment

1. **Book Value = Equity (Balance Sheet item)**
   - Formula: `Total Assets - Total Liabilities`
   - Balance sheet reflects financial position, not performance

2. **NRI Affects Income Statement Only**
   - Non-recurring items flow through P&L (earnings)
   - They do NOT directly change balance sheet equity

3. **StockOracle Alignment**
   - StockOracle has P/E NRI and PEG NRI only
   - NO P/B NRI or P/S NRI variants exist

### NRI Calculation Formula (P/E only)

```typescript
// Current implementation (valuation-service.ts:1640-1642)
const netIncome = Number(stmt.netIncome || 0);
const specialItems = Number(stmt.incomeBeforeTax || 0) - Number(stmt.operatingIncome || 0);
const adjustedNetIncome = netIncome - specialItems;
const adjustedEPS = adjustedNetIncome / shares;

// Then use adjustedEPS in P/E calculation
const intrinsicValue = meanPE * adjustedEPS;
```

**Proxy Used:** `incomeBeforeTax - operatingIncome` captures special items between operating income and pre-tax income.

**Data Source:** FMP `/api/v3/income-statement/{ticker}` fields:
- `netIncome`
- `incomeBeforeTax`
- `operatingIncome`
- `weightedAverageShsOutDil`

---

## 4. Growth Methods (2)

### 4.1 PEG Ratio
- **Method ID:** `peg`
- **Category:** Growth
- **Formula:** `Fair_PEG (1.5) × Growth% × EPS_TTM`
- **Source:** Internal
- **Function:** `valuationService.calculatePEG(ticker)`
- **Description:** Price/Earnings-to-Growth ratio (default fair PEG = 1.5).

### 4.2 PSG Ratio
- **Method ID:** `psg`
- **Category:** Growth
- **Formula:** `Fair_PSG (0.2) × Revenue_CAGR_3y × Sales_per_Share_TTM`
- **Source:** Internal
- **Function:** `valuationService.calculatePSG(ticker)`
- **Description:** Price/Sales-to-Growth ratio (default fair PSG = 0.2).

---

## Removed Methods (ONDA 2.2)

The following **6 Median methods** were removed to align with StockOracle's methodology, which uses only Mean multiples:

1. ❌ `pe-median-5y` - P/E Ratio (5Y Median)
2. ❌ `pe-median-5y-without-nri` - P/E Ratio Without NRI (5Y Median)
3. ❌ `ps-median-5y` - P/S Ratio (5Y Median)
4. ❌ `pb-median-5y` - P/B Ratio (5Y Median)
5. ❌ `pb-median-5y-without-nri` - P/B Ratio Without NRI (5Y Median)
6. ❌ `peg-median-5y` - PEG Ratio (5Y Median)

**Reason:** StockOracle uses only Mean methods for multiples-based valuations. This alignment ensures methodology consistency across Alfalyzer.

**Type Compatibility:** The `medianPE`, `medianPS`, and `medianPB` fields remain in the response types (`PEValuationResponse`, `PSValuationResponse`, `PBValuationResponse`) as **deprecated optional fields** for backward compatibility but will always be `undefined` in practice.

---

## Controller Integration

All 13 methods are aggregated in the **IV Chart Controller** (`/server/controllers/iv-chart-controller.ts`):

```typescript
// Endpoint: GET /api/iv/:ticker/chart
export async function getIVChart(req: Request, res: Response): Promise<void>
```

**Response Structure:**
```typescript
interface IVChartResponse {
  ticker: string;
  price: number;
  methods: ValuationMethod[];  // Array of 13 methods
  macro_multiplier: number;
  macro_sentiment: string;
  as_of: string;
}
```

**Method Object:**
```typescript
interface ValuationMethod {
  name: string;
  method_id: string;          // Used for frontend lookups
  category: 'proprietary' | 'dcf' | 'multiples' | 'growth';
  iv: number;                 // Intrinsic value (macro-adjusted)
  discount_pct: number;       // (IV - Price) / Price * 100
  formula: string;
  confidence: 'HIGH' | 'MED' | 'LOW';
  source: 'internal' | 'fmp' | 'hybrid';
  as_of: string;
  inputs?: Record<string, any>;  // Method-specific inputs
}
```

---

## Data Sources

| Source | Methods | API | Cache TTL |
|--------|---------|-----|-----------|
| **Internal** | AlfaValue, DNI-20, Multiples (5), Growth (2) | FMP (data only) | 24h |
| **FMP External** | DCF-20 FCF/FCFE, DCF Terminal FCF/FCFE | FMP DCF API | 24h |

---

## Notes

1. **ETF Exclusion:** All methods return `IV_NOT_APPLICABLE` error for ETF symbols (SPY, QQQ, etc.).
2. **Macro Adjustment:** All IVs are multiplied by the macro multiplier (0.90-1.10) before being returned.
3. **Growth Rates:** DCF methods now use **dynamic growth rates** from analyst estimates + historical fallback (ONDA 1.2).
4. **Cache Strategy:** All methods cache responses for 24 hours to reduce FMP API calls.

---

## Future Enhancements (Planned)

- **OracleValue™** (METHOD #17): StockOracle's proprietary black-box method
- **Custom Method** (METHOD #18): User-configurable DCF with dropdowns for FCF/OCF/NI and debt/cash toggles

---

## See Also

- `/server/types/valuation.ts` - Full TypeScript type definitions
- `/server/services/valuation-service.ts` - Implementation of all 13 methods
- `/server/controllers/iv-chart-controller.ts` - Aggregation logic
- `ALFALYZER_STOCKORACLE_ALIGNMENT_PLAN.md` - Full alignment strategy

---

**End of Document**
