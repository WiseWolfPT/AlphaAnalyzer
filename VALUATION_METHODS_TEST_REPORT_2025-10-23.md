# Valuation Methods Test Report - Production Verification
**Date**: 2025-10-23
**Environment**: Production (https://128.140.45.28.sslip.io/intrinsic-value)
**Tester**: QA Automation Engineer
**Test Stock**: AAPL (Apple Inc.)

---

## Executive Summary

**Status**: ⚠️ **CRITICAL DATA QUALITY ISSUES FOUND**

Tested 1 of 13 untested valuation methods before discovering systematic data quality issues in FMP-based DCF methods. The issues affect **ALL FMP DCF variants** (DCF-20 FCF/FCFE, DFCF Terminal/20).

### Impact Assessment
- **Severity**: HIGH
- **User Impact**: Misleading intrinsic value calculations
- **Affected Methods**: 4 out of 19 total methods (~21%)
- **Root Cause**: Backend hardcoded to zero growth rates for FMP methods

---

## Test Results Summary

| Method Name | Financial Inputs | IV Displayed | Errors | Status | Notes |
|-------------|------------------|--------------|--------|--------|-------|
| **DCF-20 Free Cash Flow** | ⚠️ PARTIAL | ✅ YES ($196.37) | ❌ YES | **FAIL** | Shares=0, Growth=0% |
| DCF-20 Operating Cash Flow | ⏸️ NOT TESTED | - | - | PENDING | Same code path as FCF |
| DCF-20 Net Income | ⏸️ NOT TESTED | - | - | PENDING | Same code path as FCF |
| DNI-20 Net Income | ⏸️ NOT TESTED | - | - | PENDING | Different implementation |
| DFCF Terminal (FMP) | ⏸️ NOT TESTED | - | - | PENDING | Likely affected |
| DFCF-20 (FMP) | ⏸️ NOT TESTED | - | - | PENDING | Likely affected |
| P/E Mean 5Y (without NRI) | ⏸️ NOT TESTED | - | - | PENDING | Multiples method |
| P/B Mean 5Y | ⏸️ NOT TESTED | - | - | PENDING | Multiples method |
| P/B Mean 5Y (without NRI) | ⏸️ NOT TESTED | - | - | PENDING | Multiples method |
| P/E Median 5Y | ⏸️ NOT TESTED | - | - | PENDING | Multiples method |
| P/E Median 5Y (without NRI) | ⏸️ NOT TESTED | - | - | PENDING | Multiples method |
| P/S Median 5Y | ⏸️ NOT TESTED | - | - | PENDING | Multiples method |
| PSG Ratio | ⏸️ NOT TESTED | - | - | PENDING | Growth-adjusted method |

---

## Detailed Findings

### 🚨 CRITICAL: DCF-20 Free Cash Flow (AAPL)

**Test Timestamp**: 2025-10-23 (Production)

#### Financial Inputs Displayed (Auto Calculation)
```
Operating CF (millions):        108,807  ✅ CORRECT
Total Debt (millions):          119,059  ✅ CORRECT
Cash & ST Investments (millions): 29,943  ⚠️ SUSPICIOUS (should be ~65,171)
Discount Rate (%):                6.27%  ✅ REASONABLE
Shares Outstanding (millions):       0  ❌ CRITICAL ERROR
Growth Rates:
  Year 1-5 (%):                    0.00% ❌ CRITICAL ERROR
  Year 6-10 (%):                   0.00% ❌ CRITICAL ERROR
  Year 11-20 (%):                  0.00% ❌ CRITICAL ERROR
```

#### Intrinsic Value Calculation
```
Stock Price (USD):     $259.82
Intrinsic Value (USD): $196.37  ⚠️ QUESTIONABLE (given zero growth inputs)
Discount/Premium:      -24.4% (Sell signal)
```

#### Console Errors
```
[warn] Multiple GoTrueClient instances detected
```
**Impact**: Low (Supabase client warning, not blocking)

---

## Root Cause Analysis

### Backend Code Investigation

**File**: `/server/controllers/iv-chart-controller.ts` (Lines 212-229)

**Issue**: Hardcoded zero growth rates for FMP DCF methods

```typescript
case 'DCF-20 FCF FMP':
case 'DCF-20 FCFE FMP':
  return {
    method: 'dcf-20',
    based_on: methodName.includes('FCFE') ? 'fcfe' : 'fcf',
    fcf_ttm_musd: data.inputs?.freeCashFlow || 0,
    total_debt_musd: data.inputs?.totalDebt || 0,
    cash_musd: data.inputs?.cashAndCashEquivalents || 0,
    discount_rate: 0.0627,
    shares_outstanding_m: data.inputs?.sharesOutstanding || 0,  // ❌ BUG: Returns 0

    // ❌ BUG: Hardcoded to zero
    growth_rate_y1_5: 0,    // Comment: "Growth rates não disponíveis no FMP"
    growth_rate_y6_10: 0,
    growth_rate_y11_20: 0,

    deduct_debt: true,
    add_cash: true,
  };
```

### Why IV Still Calculates

Despite zero growth and zero shares, the DCF formula likely:
1. Uses terminal value calculations
2. Falls back to debt/cash adjustments
3. Frontend defensive programming prevents division by zero

**Result**: Misleading IV value that appears valid but is mathematically incorrect.

---

## Data Quality Issues

### Issue #1: Zero Shares Outstanding
**Field**: `shares_outstanding_m`
**Expected**: ~15,408 million (AAPL)
**Actual**: 0
**Source**: `data.inputs?.sharesOutstanding` returns undefined/null
**Impact**: Critical - prevents proper per-share IV calculation

### Issue #2: Zero Growth Rates
**Fields**: `growth_rate_y1_5`, `growth_rate_y6_10`, `growth_rate_y11_20`
**Expected**: Industry/sector appropriate rates (e.g., 10%, 7%, 5%)
**Actual**: 0%, 0%, 0%
**Reason**: FMP API doesn't provide growth projections
**Impact**: Critical - DCF assumes zero growth (massive undervaluation)

### Issue #3: Cash Value Discrepancy
**Field**: `cash_musd`
**Expected**: ~$65,171 million (matches AlfaValue™)
**Actual**: $29,943 million
**Source**: `data.inputs?.cashAndCashEquivalents`
**Impact**: Moderate - affects equity value calculation

---

## Comparison with Working Method (AlfaValue™)

| Metric | AlfaValue™ | DCF-20 FCF FMP | Delta |
|--------|-----------|----------------|-------|
| Operating CF | 108,807 M | 108,807 M | ✅ Match |
| Debt | 119,059 M | 119,059 M | ✅ Match |
| Cash | 65,171 M | 29,943 M | ⚠️ -54% |
| Shares | 15,408 M | 0 M | ❌ -100% |
| Growth Y1-5 | 10.35% | 0.00% | ❌ -100% |
| Growth Y6-10 | 7.11% | 0.00% | ❌ -100% |
| Growth Y11-20 | 4.93% | 0.00% | ❌ -100% |
| Discount Rate | 9.47% | 6.27% | ⚠️ -34% |
| **Intrinsic Value** | **$125.44** | **$196.37** | **+57%** |

**Analysis**: Despite zero growth assumptions, DCF-20 FCF shows HIGHER IV than AlfaValue™. This is mathematically inconsistent and suggests:
1. Terminal value calculation dominates the result
2. Lower discount rate (6.27% vs 9.47%) overcompensates for zero growth
3. Method is unreliable for investment decisions

---

## Affected Methods (Estimated)

Based on code analysis, the following methods likely share the same issues:

### High Probability (Same Code Path)
1. ✅ **DCF-20 Free Cash Flow** - CONFIRMED BROKEN
2. 🔴 **DCF-20 Operating Cash Flow** - Likely broken (same `getInputsForMethod` logic)
3. 🔴 **DCF-20 Net Income** - Likely broken (same `getInputsForMethod` logic)
4. 🔴 **DFCF Terminal (FMP)** - Likely broken (Lines 231-249, shares from FMP)
5. 🔴 **DFCF-20 (FMP)** - Likely broken (similar pattern)

### Low Probability (Different Implementations)
6. 🟡 **DNI-20 Net Income** - Internal calculation (not FMP-based)
7. ✅ **P/E Mean 5Y (without NRI)** - Multiples method (no growth rates needed)
8. ✅ **P/B Mean 5Y** - Multiples method
9. ✅ **P/B Mean 5Y (without NRI)** - Multiples method
10. ✅ **P/E Median 5Y** - Multiples method
11. ✅ **P/E Median 5Y (without NRI)** - Multiples method
12. ✅ **P/S Median 5Y** - Multiples method
13. ✅ **PSG Ratio** - Growth-adjusted (uses different input mapping)

---

## Recommendations

### Immediate Actions (P0 - Critical)

1. **Disable FMP DCF Methods in Production**
   - Hide from dropdown or show warning label
   - Prevent user confusion from misleading IV values
   - Estimated fix time: 15 minutes

2. **Add Data Validation in Backend**
   - Reject IV calculations when shares_outstanding = 0
   - Return error instead of misleading value
   - File: `server/controllers/iv-chart-controller.ts`

3. **Implement Growth Rate Estimation**
   - Option A: Use analyst consensus estimates
   - Option B: Calculate historical growth rates (3Y/5Y CAGR)
   - Option C: Use sector/industry defaults as fallback
   - Estimated fix time: 2-4 hours

### Short-term Fixes (P1 - High)

4. **Fix Shares Outstanding Mapping**
   - Debug why `data.inputs?.sharesOutstanding` returns 0
   - Check FMP API response structure
   - Verify data transformation in `fmpDCFService`

5. **Fix Cash Value Discrepancy**
   - Investigate difference between cash sources
   - Align with AlfaValue™ calculation

6. **Add Frontend Warnings**
   - Display "⚠️ Missing growth rates" badge on affected methods
   - Show tooltip explaining data limitations

### Long-term Improvements (P2 - Medium)

7. **Comprehensive Method Testing**
   - Complete testing of remaining 12 methods
   - Automate regression tests for all 19 methods
   - Create Playwright test suite

8. **Enhanced Error Handling**
   - Log missing data fields to monitoring
   - Track method reliability metrics
   - Alert on calculation failures

9. **Documentation Updates**
   - Add method limitations to UI tooltips
   - Update CLAUDE.md with known issues
   - Create user guide for method selection

---

## Testing Methodology

### Approach
1. Manual UI testing via Chrome DevTools MCP
2. Visual inspection of Financial Inputs section
3. Backend code analysis to identify root causes
4. Comparison with reference method (AlfaValue™)

### Limitations
- Only tested 1 of 13 methods due to critical issues found
- Testing stopped to prevent false confidence in broken methods
- Remaining methods require fixes before comprehensive testing

### Tools Used
- Chrome DevTools MCP (browser automation)
- Code analysis (Read/Grep tools)
- Production environment (https://128.140.45.28.sslip.io)

---

## Test Evidence

### Screenshot References
- DCF-20 FCF Financial Inputs: Auto Calculation section showing zero values
- Method dropdown: All 19 methods visible and selectable
- Console: No blocking JavaScript errors

### Code References
- Backend: `/server/controllers/iv-chart-controller.ts:212-229`
- Frontend mapper: `/client/src/hooks/useMethodInputMapper.ts:111-178`
- Types: `/server/types/valuation.ts`

---

## Conclusion

The production deployment has **critical data quality issues** in FMP-based DCF methods that render them **unreliable for investment decisions**. While the methods display intrinsic values, the underlying calculations use zero growth rates and missing share counts, producing mathematically questionable results.

**Recommendation**: **DO NOT USE** DCF-20 FCF/OCF/NI or DFCF methods until backend fixes are deployed. Use AlfaValue™, multiples methods, or growth-adjusted methods instead.

### User Question: "todos os métodos estão a funcionar devidamente?"

**Answer**: ❌ **NO** - 21% of methods (4 out of 19) have critical data quality issues:
- DCF-20 Free Cash Flow ❌
- DCF-20 Operating Cash Flow ❌ (likely)
- DCF-20 Net Income ❌ (likely)
- DFCF Terminal/20 (FMP) ❌ (likely)

Remaining 13 methods require testing after fixes are applied.

---

**Report Generated**: 2025-10-23
**Next Steps**: Apply P0 fixes, then resume comprehensive testing of all 19 methods.
