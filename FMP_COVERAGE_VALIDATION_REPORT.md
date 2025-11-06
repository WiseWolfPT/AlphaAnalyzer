# FMP Financial Data Coverage Report

**Date:** 2025-10-30
**Stocks Tested:** 1065 (failing from FASE 1)
**FMP API Key:** Valid ✅
**Duration:** 29.9 minutes
**Rate Limit:** 3.5 req/s (285ms delay)

## Executive Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ **Full Coverage** | 1045 | 98.1% |
| ⚠️ **Partial Coverage** | 3 | 0.3% |
| ❌ **No Coverage** | 17 | 1.6% |
| 🔴 **Errors** | 0 | - |

**Full Coverage:** All 3 financial statements available (Income Statement + Balance Sheet + Cash Flow)
**Partial Coverage:** 1-2 statements available (can use with methodology fallbacks)
**No Coverage:** 0 statements available (FMP has no data)

---

## Geographic Breakdown

| Region | Full | Partial | None | Total |
|--------|------|---------|------|-------|
| US         |  604 |       2 |   10 |   616 |
| UK         |  104 |       0 |    0 |   104 |
| France     |   87 |       0 |    0 |    87 |
| Belgium    |   82 |       1 |    3 |    86 |
| Netherlands |   78 |       0 |    0 |    78 |
| Spain      |   46 |       0 |    3 |    49 |
| Germany    |   44 |       0 |    1 |    45 |

---

## Path Forward Recommendations

### Option A: Remove European Stocks with NO Coverage
- **Stocks to remove:** 7 European stocks with NO coverage
- **Impact:** Lose 7 stocks, improve pass rate
- **Timeline:** 1-2 days
- **Action:** Update `stock_universe_complete.csv` to exclude these tickers

### Option B: Keep Stocks with Partial Coverage
- **Stocks recoverable:** 3 stocks with 1-2 statements
- **Impact:** Add methodology fallbacks, recover 3 stocks
- **Timeline:** 1 week
- **Action:** Enhance valuation methods to handle missing statements

### Option C: European Data Provider Integration
- **Stocks needing provider:** 7 European stocks
- **Impact:** Full coverage if provider integrated (e.g., Bloomberg, Refinitiv)
- **Timeline:** 2-4 weeks
- **Cost:** Subscription required

---

## Detailed Findings

### Top 10 Stocks with Full Coverage (False Negatives ✅)
1. **0QVW.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

2. **0QZP.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

3. **0R1D.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

4. **0R3M.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

5. **0RDB.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

6. **0REW.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

7. **0RP4.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

8. **0RPW.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

9. **0RUM.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅

10. **0T9J.L** (UK) - 5 years available
   - Income Statement: ✅
   - Balance Sheet: ✅
   - Cash Flow: ✅
   - Profile: ✅


*...and 1035 more stocks with full coverage*


---

### Top 10 Stocks with Partial Coverage (Recoverable ⚠️)
1. **ABX.DE** (US) - 5 years available
   - Missing: Cash Flow
   - Available: Income, Balance

2. **MLMAZ.BR** (Belgium) - 5 years available
   - Missing: Cash Flow
   - Available: Income, Balance

3. **NSRX** (US) - 3 years available
   - Missing: Balance Sheet, Cash Flow
   - Available: Income



---

### Top 10 Stocks with No Coverage (Confirm Remove ❌)
1. **2ZR.F** (Germany)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

2. **BE0941243520.BR** (Belgium)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

3. **BMW** (US)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

4. **BP.** (US)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

5. **CAC40.CSV** (US)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

6. **DAX.CSV** (US)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

7. **FLSP.BR** (Belgium)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

8. **FTSE100.CSV** (US)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

9. **HSBA** (US)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider

10. **SIE** (US)
   - FMP Status: No financial data available
   - Recommendation: Remove from universe or find alternative provider


*...and 7 more stocks with no coverage*


---

## Next Steps

1. **Immediate (Option A):**
   - Remove 17 stocks with NO coverage
   - Update `stock_universe_complete.csv`
   - Re-run FASE 1 validation
   - Expected new pass rate: ~74.2%

2. **Short-term (Option B):**
   - Implement methodology fallbacks for 3 partial stocks
   - Add graceful degradation in valuation methods
   - Expected recovery: 3 additional stocks
   - Expected new pass rate: ~74.4%

3. **Long-term (Option C):**
   - Evaluate European data providers
   - Integrate additional APIs for 7 European stocks
   - Expected recovery: Up to 7 stocks

---

**Generated by Alfalyzer QA Automation**
**Timestamp:** 2025-10-30T21:33:54.549Z
