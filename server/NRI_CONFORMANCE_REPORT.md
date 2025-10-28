# NRI Conformance Report - ONDA 3.1

## Verification Date: 2025-10-24

## CRITICAL FINDING

**ERROR CONFIRMED**: `P/B Mean 5Y (without NRI)` exists and should NOT exist.

## Summary

- **Methods WITH "Without NRI"**: 2 found (1 correct, 1 WRONG)
- **StockOracle Alignment**: 50% (1/2 correct)
- **Action Required**: Remove P/B NRI variant

---

## Methods WITH "Without NRI" (should be 2)

**Note:** PEG method uses "EPS without NRI" implicitly but doesn't have a separate "without NRI" variant in the UI. This is acceptable since PEG always uses clean EPS.

### 1. P/E Mean 5Y (without NRI) - ✅ CORRECT

**Method ID**: `pe-mean-without-nri`

**Location**:
- Type: `server/types/valuation.ts:518` (PEMeanWithoutNRIInputs)
- Service: `server/services/valuation-service.ts:1613` (calculatePEMeanWithoutNRI)
- Controller: `server/controllers/iv-chart-controller.ts:189,416-417`

**Implementation**:
```typescript
// Lines 1639-1642: Adjusts for special items (NRI)
const netIncome = Number(stmt.netIncome || 0);
const specialItems = Number(stmt.incomeBeforeTax || 0) - Number(stmt.operatingIncome || 0);
const adjustedNetIncome = netIncome - specialItems;
```

**Status**: ✅ **CORRECT** - Earnings (net income) are affected by non-recurring items.

**Rationale**:
- Non-recurring items appear in income statement
- Adjusting earnings normalizes P/E ratio
- Aligns with StockOracle methodology

---

### 2. P/B Mean 5Y (without NRI) - ❌ **WRONG**

**Method ID**: `pb-mean-without-nri`

**Location**:
- Type: `server/types/valuation.ts:527` (PBMeanWithoutNRIInputs)
- Service: `server/services/valuation-service.ts:1497` (calculatePBMeanWithoutNRI)
- Controller: `server/controllers/iv-chart-controller.ts:192,422-423`

**Implementation Issue**:
```typescript
// Line 1543: Comment admits no actual NRI adjustment
// "Use P/B ratio from ratios endpoint directly (no actual NRI adjustment in this simplified implementation)"
const matchingRatio = ratiosData.find(r => r.date === date);
if (matchingRatio && matchingRatio.priceToBookRatio > 0) {
  const pbRatio = Number(matchingRatio.priceToBookRatio);
  adjustedPBRatios.push(pbRatio);  // ❌ NO ADJUSTMENT HAPPENING
}
```

**Status**: ❌ **WRONG** - Book value is NOT affected by non-recurring items.

**Why P/B Cannot Have NRI Adjustment**:

1. **Book Value = Equity (Balance Sheet)**
   - Total Assets - Total Liabilities
   - Balance sheet item, not income statement
   - Non-recurring items affect P&L, not balance sheet

2. **NRI Affects Income Statement Only**
   - Special charges (restructuring, lawsuits)
   - One-time gains (asset sales)
   - These flow through earnings, not equity

3. **StockOracle Does NOT Have P/B NRI**
   - Only P/E and PEG have "without NRI" variants
   - P/B and P/S use raw metrics

**Impact**:
- Method exists but does NOTHING different from regular P/B
- Creates confusion (users expect different results)
- Not aligned with StockOracle methodology

---

## Methods WITHOUT "Without NRI" (verified correct)

### P/S Mean 5Y - ✅ No NRI variant

**Status**: ✅ **CORRECT** - Revenue is not affected by NRI

**Rationale**:
- Revenue is top-line metric (before all expenses)
- Non-recurring items appear below revenue line
- P/S uses sales, which don't include NRI

### PSG Ratio - ✅ No NRI variant

**Status**: ✅ **CORRECT** - Revenue-based, not earnings-based

**Rationale**:
- Formula: P/S ÷ Revenue Growth Rate
- Based on sales metrics, not earnings
- No earnings to adjust for NRI

### DCF Methods - ✅ No NRI variants

**Status**: ✅ **CORRECT** - Cash flow basis different from earnings

**Rationale**:
- DCF uses free cash flow (FCF), not net income
- FCF already excludes many non-cash items
- Cash flow adjustments are different methodology

---

## Technical Analysis: What is NRI?

### Definition
**Non-Recurring Items (NRI)**: One-time charges/gains that distort earnings

### Common Examples
1. **Charges (reduce earnings)**:
   - Restructuring costs
   - Lawsuit settlements
   - Asset impairments
   - Goodwill write-downs

2. **Gains (increase earnings)**:
   - Asset sales
   - Tax settlements
   - Insurance proceeds

### Why Adjust for NRI?
- Makes P/E ratio comparable year-over-year
- Shows "normalized" profitability
- Better valuation for stable businesses

### Where NRI Appears
- **Income Statement**: `incomeBeforeTax - operatingIncome` (proxy for special items)
- **NOT in Balance Sheet**: Book value unchanged by NRI
- **NOT in Revenue**: Top-line metric, before expenses

---

## Errors Found and Fixed

### ❌ P/B "Without NRI" - TO BE REMOVED

**Files to update**:

1. **server/types/valuation.ts** (line 527-531)
   - Remove `PBMeanWithoutNRIInputs` interface

2. **server/services/valuation-service.ts** (line 1497-1607)
   - Remove `calculatePBMeanWithoutNRI()` method

3. **server/controllers/iv-chart-controller.ts**
   - Line 192: Remove from calculation array
   - Lines 422-423: Remove from method name mapping

4. **Tests to update**:
   - `server/services/__tests__/valuation-service.multiples.test.ts:246` - Remove P/B NRI tests
   - `server/services/__tests__/valuation-multiples.refactor.test.ts:170` - Remove P/B NRI test

---

## Alignment with StockOracle

### Current Status: 50% Aligned

**Correct Implementations**:
- ✅ P/E Mean 5Y (without NRI) - correct
- ✅ No P/S NRI variant - correct
- ✅ No PSG NRI variant - correct
- ✅ No DCF NRI variants - correct

**Incorrect Implementations**:
- ❌ P/B Mean 5Y (without NRI) - should not exist

### After Removal: 100% Aligned

Once P/B NRI is removed:
- Only P/E (and PEG if implemented) will have NRI variants
- Matches StockOracle exactly
- No conceptual errors in methodology

---

## Recommended Actions

### Immediate (ONDA 3.1)
1. Remove `calculatePBMeanWithoutNRI()` from valuation service
2. Remove `PBMeanWithoutNRIInputs` from types
3. Remove P/B NRI from controller mappings
4. Update tests to remove P/B NRI references

### Documentation
1. Update `AVAILABLE_METHODS.md` with NRI section
2. Add comment in code explaining why only P/E has NRI
3. Document NRI calculation methodology

### Future (PEG "without NRI" consideration)
**Current Status:** PEG already uses `epsWithoutNRI` internally (see `valuation-service-peg-psg-patch.ts:34`).

**StockOracle Alignment:**
- StockOracle shows "PEG Ratio (without NRI)" as separate method
- Alfalyzer's PEG uses clean EPS by default (from `netIncomePerShareTTM`)

**Recommendation:**
- **Option 1:** Keep current implementation (PEG always uses clean EPS)
- **Option 2:** Add explicit "PEG without NRI" method ID for UI clarity
- **Decision:** Defer to ONDA 4+ after UI/UX review

---

## Implementation Notes

### NRI Calculation Formula (P/E only)

```typescript
// Current implementation (valuation-service.ts:1640-1642)
const netIncome = Number(stmt.netIncome || 0);
const specialItems = Number(stmt.incomeBeforeTax || 0) - Number(stmt.operatingIncome || 0);
const adjustedNetIncome = netIncome - specialItems;
const adjustedEPS = adjustedNetIncome / shares;
```

**Proxy Used**: `incomeBeforeTax - operatingIncome`
- Captures special items between operating income and pre-tax income
- Not perfect but reasonable approximation
- FMP doesn't expose explicit "specialItems" field

### Alternative NRI Sources (if needed)

1. **FMP Income Statement**: `totalOtherIncomeExpensesNet`
2. **FMP Income Statement**: `extraordinaryItems` (if available)
3. **Manual calculation**: Compare operating income to pre-tax income

---

## Conclusion

**Current State**: Implementation error - P/B has NRI variant when it shouldn't.

**Root Cause**: Misunderstanding of which financial metrics are affected by non-recurring items.

**Impact**: Low (method does nothing different from regular P/B, but creates confusion).

**Fix Complexity**: Low (simple deletion of unused code).

**Post-Fix Alignment**: 100% with StockOracle methodology.

---

## References

1. **CRITICAL_FINDINGS_2025-10-23.md** (lines 182-185)
2. **StockOracle Screenshots**: `/Users/antoniofrancisco/Documents/teste 1/stockoraclescreenshots`
3. **StockOracle Analysis**: `/tmp/stockoracle-intrinsic-value-complete-analysis.md`

---

**Report Generated**: 2025-10-24
**Verified By**: ONDA 3.1 Conformance Check
**Status**: CRITICAL ERROR IDENTIFIED - P/B NRI must be removed
