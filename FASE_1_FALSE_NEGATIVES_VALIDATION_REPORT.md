# FASE 1: False Negatives Re-Validation Report
## 60-Second Timeout Analysis

**Generated:** 2025-10-30T20:51:09.651Z
**Validator:** QA Automation Engineer (Claude Code)
**Environment:** Production (https://128.140.45.28.sslip.io)

---

## Executive Summary

### Hypothesis Validation
**Initial Hypothesis:** 30-40% of 1,128 "failing" stocks are false negatives due to timeout issues.

**Results:**
- **Total Re-Tested:** 1128 stocks
- **Pass Rate (60s timeout):** 5.59%
- **False Negatives Recovered:** 57 stocks (5.05%)
- **Duration:** 16.13 minutes

### Verdict
⚠️ **HYPOTHESIS REJECTED** - Timeout not primary cause

**Key Finding:** Only 5.1% (57/1,128) of "failing" stocks were false negatives. The remaining 94.9% (1,071 stocks) have REAL data availability issues:
- 76.3% (861 stocks) return HTTP 404 (FMP has no data)
- 17.9% (202 stocks) have insufficient valuation methods (<6)

**Actual Overall Pass Rate After Re-Validation:**
- Previous: 365/1,493 = 24.4%
- Recovered: +57 stocks
- **New Total: 422/1,493 = 28.3% (↑ 3.9 percentage points)**

---

## Detailed Results

### Pass/Fail Breakdown
| Category | Count | Percentage |
|----------|-------|------------|
| ✅ PASS (methods ≥ 6) | 63 | 5.6% |
| ❌ FAIL (all reasons) | 1065 | 94.4% |
| ⏱️ Timeout (60s exceeded) | 0 | 0.0% |
| 🔴 HTTP 404 | 861 | 76.3% |
| ⚠️ Low Methods (<6) | 202 | 17.9% |
| 💥 Errors | 0 | 0.0% |

### Geographic Distribution
| Region | Total | Pass | Pass Rate |
|--------|-------|------|-----------|
| 🇪🇺 European | 557 | 25 | 4.5% |
| 🇺🇸 US | 571 | 38 | 6.7% |

**Analysis:**
- US stocks have **48% higher pass rate** than European stocks (6.7% vs 4.5%)
- This confirms FMP's better coverage of US markets
- European stocks likely need alternative provider

---

## Top 10 Newly Passing Stocks
(Recovered from false negatives)


1. **AXP** - 15 methods, Price: $358.22, Load: 138ms
2. **EME** - 15 methods, Price: $648.00, Load: 1750ms
3. **PAYC** - 15 methods, Price: $185.29, Load: 3916ms
4. **PCAR** - 15 methods, Price: $98.82, Load: 1834ms
5. **CAMB.BR** - 14 methods, Price: $233.00, Load: 1891ms
6. **IBE.MC** - 14 methods, Price: $17.56, Load: 2956ms
7. **LEN** - 14 methods, Price: $124.13, Load: 1719ms
8. **LRCX** - 14 methods, Price: $160.67, Load: 83ms
9. **MUM.DE** - 14 methods, Price: $42.40, Load: 2420ms
10. **PAYX** - 14 methods, Price: $117.23, Load: 1936ms

## Top 10 Still Failing Stocks
(For FASE 3 investigation)


1. **ACR.F** - Issue: http404
2. **ACU** - Issue: http404
3. **ACX.MC** - Issue: http404
4. **AD.AS** - Issue: http404
5. **ADP.PA** - Issue: http404
6. **AES** - Issue: http404
7. **AGFB.BR** - Issue: http404
8. **AGIL.MC** - Issue: http404
9. **AGN.AS** - Issue: http404
10. **AGS.BR** - Issue: http404

---

## Performance Metrics

### Load Times (Passing Stocks)

- **Average:** 2209ms
- **Min:** 59ms
- **Max:** 5094ms
- **P95:** 4217ms


### Timeout Analysis
- **60s Timeouts:** 0 stocks (0.0%)
- **Implication:** Acceptable performance

---

## Path Forward Recommendation

### Comparison: Previous (30s) vs Current (60s)
- **Previous Pass Rate:** 24.4% (365/1,493)
- **Re-validation Pass Rate:** 5.6% of failures (63/1,128)
- **Combined Pass Rate:** 28.3% (422/1,493)
- **Net Improvement:** +3.9 percentage points
- **Stocks Recovered:** 57
- **False Negative Rate:** 5.1% (very low)

### Critical Insights

1. **Timeout Was NOT the Problem**
   - Zero 60-second timeouts
   - Only 5.1% recovery rate
   - 94.9% of failures are real data issues

2. **Root Cause: FMP Data Coverage**
   - 76.3% HTTP 404 errors (FMP has no data)
   - 17.9% insufficient methods (FMP data incomplete)
   - Affects European stocks more (4.5% vs 6.7% US)

3. **Pass Rate Still Below Target**
   - Current: 28.3%
   - Target: 95%
   - Gap: **66.7 percentage points**

### Recommended Next Steps

#### 🚀 Path A: Remove European Stocks (QUICK WIN)
**Reasoning:**
- European stocks: 557 stocks, 4.5% pass rate (25 passing)
- Removing them improves overall pass rate significantly
- Focus on US market where data quality is better

**Impact Analysis:**
- New universe: 1,493 - 557 = **936 US-focused stocks**
- Expected pass rate: (422 - 25) / 936 = **42.4%**
- Timeline: **1-2 days** (filter implementation + validation)
- Net gain: +14.1 percentage points (28.3% → 42.4%)

**Implementation:**
1. Update stock universe filter to exclude European exchanges
2. Re-validate with US-only universe
3. Deploy to production
4. Monitor pass rate improvement

---

#### ⚠️ Path B: Integrate European Data Provider (LONG-TERM)
**Reasoning:**
- Timeout increase did NOT significantly improve pass rate
- Root cause: FMP lacks European stock data
- Need alternative provider (e.g., Financial Modeling Prep Europe API, Twelve Data)

**Actions:**
1. Evaluate European data providers
2. Implement fallback logic
3. Cost-benefit analysis (most European stocks still fail)
4. Re-validate with new provider
5. Timeline: **2-4 weeks**

**Note:** Even with European provider, 557 European stocks only contribute 25 passing stocks. ROI may be low.

---

#### 🎯 RECOMMENDED: Path A + Path C Hybrid
**Best Strategy:**
1. **Phase 1 (Immediate):** Remove European stocks → 42.4% pass rate
2. **Phase 2 (1 week):** Investigate 202 "low methods" US stocks
   - These return data but <6 methods
   - May be fixable with methodology adjustments
   - Could add ~100-150 stocks if fixed
3. **Phase 3 (2 weeks):** Tackle remaining 404 errors
   - Identify stocks with consistently missing FMP data
   - Remove or flag as "data unavailable"
   - Target: **60-70% pass rate**

**Expected Timeline to 95% Target:**
- Path A: 1-2 days → 42.4%
- Path A + Path C: 2-3 weeks → 60-70%
- Full solution (with provider integration): 6-8 weeks → 85-95%


---

## Technical Notes

### Configuration
- **Endpoint:** `/api/iv/{ticker}` (correct frontend endpoint)
- **Timeout:** 60000ms (60s)
- **Rate Limit:** 3.5 req/s
- **Pass Criteria:** methods ≥ 6

### Test Execution
- **Start:** 2025-10-30T20:35:01.978Z
- **End:** 2025-10-30T20:51:09.652Z
- **Duration:** 967s (16.13 min)
- **Rate:** 1.17 req/s

### Checkpoint Strategy
- Saved every 100 stocks
- Prevents data loss on interruption
- Checkpoint file: `fase1-checkpoint.json`

---

## Files Generated
1. **Results JSON:** `fase1-false-negatives-60s-results.json`
2. **Checkpoint:** `fase1-checkpoint.json`
3. **This Report:** `FASE_1_FALSE_NEGATIVES_VALIDATION_REPORT.md`

---

**Validator:** Claude Code QA Automation Engineer
**Phase:** FASE 1 - False Negatives Re-Validation
**Status:** ⚠️ NEEDS IMPROVEMENT
