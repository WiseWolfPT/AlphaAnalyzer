# All Methods NRI Status - Complete Audit

**Date:** 2025-10-24
**Audit:** ONDA 3.1
**Purpose:** Document NRI status for ALL 13 intrinsic value methods

---

## Summary Table

| # | Method | Category | Has NRI Variant? | Should Have NRI? | Status |
|---|--------|----------|------------------|------------------|--------|
| 1 | AlfaValue™ | Proprietary | ❌ No | ❌ No | ✅ OK |
| 2 | DCF-20 FCF | DCF | ❌ No | ❌ No | ✅ OK |
| 3 | DCF-20 FCFE | DCF | ❌ No | ❌ No | ✅ OK |
| 4 | DCF Terminal FCF | DCF | ❌ No | ❌ No | ✅ OK |
| 5 | DCF Terminal FCFE | DCF | ❌ No | ❌ No | ✅ OK |
| 6 | DNI-20 | DCF | ❌ No | ❌ No | ✅ OK |
| 7 | P/E Mean 5Y | Multiples | ✅ Yes | ✅ Yes | ✅ OK |
| 8 | P/E Mean 5Y (without NRI) | Multiples | N/A | ✅ Yes | ✅ OK |
| 9 | P/S Mean 5Y | Multiples | ❌ No | ❌ No | ✅ OK |
| 10 | P/B Mean 5Y | Multiples | ✅ Yes | ❌ NO | ⚠️ ERROR |
| 11 | P/B Mean 5Y (without NRI) | Multiples | N/A | ❌ NO | ⚠️ ERROR |
| 12 | PEG Ratio | Growth | 🔶 Implicit | ✅ Yes | 🔶 PARTIAL |
| 13 | PSG Ratio | Growth | ❌ No | ❌ No | ✅ OK |

**Legend:**
- ✅ OK = Correctly aligned with StockOracle
- ⚠️ ERROR = Should be removed
- 🔶 PARTIAL = Uses NRI internally but not exposed as separate method
- ❌ No = Does not have NRI variant
- ✅ Yes = Should have NRI variant

---

## Detailed Analysis

### 1. AlfaValue™ (Proprietary)

**Method ID:** `alfavalue`

**NRI Status:** ❌ No variant

**Should Have NRI?** ❌ No

**Rationale:**
- Proprietary 3-stage DCF model
- Uses free cash flow (FCF), not earnings
- Cash flow methodology doesn't use NRI adjustments
- FCF already excludes non-cash items by definition

**Status:** ✅ CORRECT

---

### 2-6. DCF Methods (5 methods)

**Method IDs:** `dcf-20-fcf`, `dcf-20-fcfe`, `dcf-terminal-fcf`, `dcf-terminal-fcfe`, `dni-20`

**NRI Status:** ❌ No variants

**Should Have NRI?** ❌ No

**Rationale:**
- DCF uses **cash flow**, not earnings
- Free Cash Flow = `Operating Cash Flow - CapEx`
- Cash flow already excludes many accrual-based distortions
- NRI affects earnings (P&L), not cash flow (statement of cash flows)
- DNI-20 uses net income but is DCF-style discounting (not multiple-based)

**Status:** ✅ CORRECT

---

### 7-8. P/E Mean Methods (2 methods)

#### 7. P/E Mean 5Y

**Method ID:** `pe-mean`

**NRI Status:** Base method (has NRI variant)

**Formula:** `Mean(P/E_5y) × EPS_TTM`

**Status:** ✅ CORRECT

---

#### 8. P/E Mean 5Y (without NRI)

**Method ID:** `pe-mean-without-nri`

**NRI Status:** ✅ Explicit NRI variant

**Should Have NRI?** ✅ Yes

**Formula:** `Mean(P/E_5y_adjusted) × Adjusted_EPS_TTM`

**Implementation:**
```typescript
// server/services/valuation-service.ts:1640-1642
const netIncome = Number(stmt.netIncome || 0);
const specialItems = Number(stmt.incomeBeforeTax || 0) - Number(stmt.operatingIncome || 0);
const adjustedNetIncome = netIncome - specialItems;
const adjustedEPS = adjustedNetIncome / shares;
```

**Rationale:**
- Earnings (net income) are affected by non-recurring items
- Special charges appear between operating income and pre-tax income
- Adjusting removes one-time distortions for better valuation
- StockOracle has this exact method

**Status:** ✅ CORRECT

---

### 9. P/S Mean 5Y (Multiples)

**Method ID:** `ps-mean`

**NRI Status:** ❌ No variant

**Should Have NRI?** ❌ No

**Formula:** `Mean(P/S_5y) × Sales_per_Share_TTM`

**Rationale:**
- Revenue is **top-line metric** (first line of income statement)
- Non-recurring items appear **below revenue** (in operating expenses or other income)
- Formula: `P/S = Price / Revenue per Share`
- Revenue is NOT affected by:
  - Restructuring charges (expense)
  - Lawsuit settlements (expense)
  - Asset sales (other income)
  - Tax adjustments (below revenue)
- StockOracle does NOT have P/S NRI variant

**Status:** ✅ CORRECT

---

### 10-11. P/B Mean Methods (2 methods) - ⚠️ ERROR FOUND

#### 10. P/B Mean 5Y

**Method ID:** `pb-mean`

**NRI Status:** Base method (has NRI variant - ERROR!)

**Formula:** `Mean(P/B_5y) × Book_Value_per_Share_TTM`

**Status:** ✅ Base method is correct, but should NOT have NRI variant

---

#### 11. P/B Mean 5Y (without NRI) - ⚠️ SHOULD NOT EXIST

**Method ID:** `pb-mean-without-nri`

**NRI Status:** ✅ Has NRI variant (ERROR!)

**Should Have NRI?** ❌ NO - **THIS IS THE ERROR**

**Formula:** `Mean(P/B_5y_adj) × Adjusted_BVPS_TTM`

**Why This is Wrong:**

1. **Book Value = Balance Sheet Metric**
   ```
   Book Value (Equity) = Total Assets - Total Liabilities
   ```
   - Balance sheet reflects financial position
   - NOT affected by income statement items

2. **NRI Affects Income Statement Only**
   ```
   Income Statement (P&L):
     Revenue
     - Operating Expenses
     = Operating Income
     ± Other Income/Expenses  ← NRI APPEARS HERE
     = Income Before Tax
     - Taxes
     = Net Income            ← Flows to retained earnings (equity)
   ```
   - NRI affects **net income** (P&L)
   - Net income flows to **retained earnings** (part of equity)
   - But this is CUMULATIVE over all years, not a "non-recurring" adjustment

3. **Implementation Admits No Adjustment**
   ```typescript
   // server/services/valuation-service.ts:1543
   // Comment: "no actual NRI adjustment in this simplified implementation"
   const pbRatio = Number(matchingRatio.priceToBookRatio);
   adjustedPBRatios.push(pbRatio);  // ❌ NO ADJUSTMENT HAPPENING
   ```

4. **StockOracle Does NOT Have This**
   - Only P/E and PEG have NRI variants
   - P/B and P/S do NOT have NRI variants

**Impact:**
- Method returns same results as regular P/B
- Creates confusion (users expect different results)
- Not aligned with StockOracle methodology

**Status:** ⚠️ ERROR - TO BE REMOVED

---

### 12. PEG Ratio (Growth) - 🔶 PARTIAL IMPLEMENTATION

**Method ID:** `peg`

**NRI Status:** 🔶 Implicit NRI (uses `epsWithoutNRI` internally)

**Should Have NRI?** ✅ Yes (but already implemented implicitly)

**Formula:** `Fair_PEG (1.5) × Growth% × EPS_TTM`

**Implementation:**
```typescript
// server/services/valuation-service-peg-psg-patch.ts:34
const epsWithoutNRI = Number(keyMetricsTTM[0].netIncomePerShareTTM || 0);
// Line 48-49: Uses clean EPS for P/E calculation
const peWithoutNRI = currentPrice / epsWithoutNRI;
```

**Rationale:**
- PEG is earnings-based (P/E ÷ Growth)
- Uses same EPS that should be adjusted for NRI
- Current implementation uses `netIncomePerShareTTM` which is clean TTM EPS

**StockOracle Alignment:**
- StockOracle has explicit "PEG Ratio (without NRI)" method
- Alfalyzer's PEG already uses clean EPS by default
- No separate "with NRI" vs "without NRI" variants

**Recommendation:**
- **Option 1:** Keep current (PEG always uses clean EPS) - SIMPLER
- **Option 2:** Add explicit "PEG without NRI" method ID - MORE ALIGNED

**Status:** 🔶 PARTIAL - Works correctly but not exposed as separate "without NRI" method

---

### 13. PSG Ratio (Growth)

**Method ID:** `psg`

**NRI Status:** ❌ No variant

**Should Have NRI?** ❌ No

**Formula:** `Fair_PSG (0.2) × Revenue_CAGR_3y × Sales_per_Share_TTM`

**Rationale:**
- PSG is revenue-based (P/S ÷ Growth)
- Uses sales per share, not earnings per share
- Revenue is top-line metric, unaffected by NRI
- Same logic as P/S Mean (no NRI applicable)
- StockOracle does NOT have PSG NRI variant

**Status:** ✅ CORRECT

---

## Summary by Category

### Proprietary (1 method)
- **AlfaValue™**: ✅ No NRI (correct)

### DCF Methods (5 methods)
- **All 5 DCF methods**: ✅ No NRI variants (correct)
- Rationale: Cash flow basis, not earnings basis

### Multiples (5 methods)
- **P/E Mean**: ✅ Correct (base method)
- **P/E Mean without NRI**: ✅ Correct (NRI variant)
- **P/S Mean**: ✅ Correct (no NRI - revenue unaffected)
- **P/B Mean**: ✅ Correct (base method)
- **P/B Mean without NRI**: ⚠️ ERROR (should not exist)

### Growth (2 methods)
- **PEG Ratio**: 🔶 Partial (uses clean EPS internally)
- **PSG Ratio**: ✅ Correct (no NRI - revenue-based)

---

## Alignment with StockOracle

### Methods That SHOULD Have NRI (per StockOracle)

| Method | StockOracle | Alfalyzer | Aligned? |
|--------|-------------|-----------|----------|
| P/E Mean | ✅ Has NRI | ✅ Has NRI | ✅ YES |
| PEG Ratio | ✅ Has NRI | 🔶 Implicit | 🔶 PARTIAL |

### Methods That SHOULD NOT Have NRI (per StockOracle)

| Method | StockOracle | Alfalyzer | Aligned? |
|--------|-------------|-----------|----------|
| P/B Mean | ❌ No NRI | ⚠️ Has NRI | ❌ NO |
| P/S Mean | ❌ No NRI | ✅ No NRI | ✅ YES |
| PSG Ratio | ❌ No NRI | ✅ No NRI | ✅ YES |
| DCF methods | ❌ No NRI | ✅ No NRI | ✅ YES |

**Alignment Score:** 4/6 = 67% (or 5/6 = 83% if PEG partial counts as correct)

**After P/B NRI Removal:** 5/5 = 100% ✅

---

## Financial Statement Context

### Where Each Metric Comes From

| Method | Financial Statement | Affected by NRI? |
|--------|---------------------|------------------|
| **P/E** | Income Statement (Net Income) | ✅ YES |
| **P/S** | Income Statement (Revenue) | ❌ NO (top-line) |
| **P/B** | Balance Sheet (Equity) | ❌ NO (position, not flow) |
| **PEG** | Income Statement (Net Income) | ✅ YES |
| **PSG** | Income Statement (Revenue) | ❌ NO (top-line) |
| **DCF** | Cash Flow Statement (OCF, FCF) | ❌ NO (different basis) |

### Income Statement Structure

```
Revenue                          ← P/S, PSG (NOT affected by NRI)
- Cost of Goods Sold
= Gross Profit
- Operating Expenses
= Operating Income               ← Normal operations
± Other Income/Expenses          ← NRI APPEARS HERE (special items)
= Income Before Tax
- Income Tax
= Net Income                     ← P/E, PEG (AFFECTED by NRI)
```

### Balance Sheet Structure

```
Assets
  Cash
  Accounts Receivable
  Inventory
  PP&E
  ...
= Total Assets

Liabilities
  Accounts Payable
  Debt
  ...
= Total Liabilities

Equity                          ← P/B (NOT directly affected by NRI)
  Common Stock
  Retained Earnings             ← Cumulative net income (all years)
= Total Equity
```

**Key Insight:** NRI affects ONE year's net income, but book value is cumulative position.

---

## Recommended Actions

### Immediate (ONDA 3.2)

1. **Remove P/B Mean without NRI**
   - Delete `calculatePBMeanWithoutNRI()` method
   - Remove `PBMeanWithoutNRIInputs` type
   - Update controller mappings
   - Remove tests

2. **Update documentation**
   - Mark P/B NRI as removed
   - Update method count (13 → 12)
   - Add explanation in AVAILABLE_METHODS.md

### Future Consideration (ONDA 4+)

3. **PEG "without NRI" explicit variant**
   - Current: Uses clean EPS implicitly
   - Option: Add explicit "PEG without NRI" method ID for UI clarity
   - Aligns with StockOracle's explicit separation
   - Decision: Defer to UI/UX review

---

## Conclusion

**ONDA 3.1 Audit Results:**
- **Total Methods:** 13
- **Correct:** 11 (85%)
- **Error:** 1 (P/B NRI)
- **Partial:** 1 (PEG - works but not explicit)

**After P/B NRI Removal:**
- **Total Methods:** 12
- **Correct:** 11 (92%)
- **Partial:** 1 (PEG - acceptable)
- **StockOracle Alignment:** 100% ✅

**Key Learning:**
- Only **earnings-based** methods (P/E, PEG) should have NRI variants
- **Revenue-based** methods (P/S, PSG) do NOT need NRI
- **Balance sheet** methods (P/B) do NOT need NRI
- **Cash flow** methods (DCF) use different methodology (no NRI)

---

**Audit Date:** 2025-10-24
**Audited By:** ONDA 3.1 NRI Consistency Check
**Status:** ✅ COMPLETE - 1 error identified (P/B NRI to be removed)
