# Intrinsic Value Universe Test Specification
**ONDA 4.2 - Test 20 Diverse Stocks Across 5 Sectors**

**Date:** October 24, 2025
**Status:** ✅ Ready for Execution
**Test Script:** `/scripts/test-iv-universe.ts`

---

## 🎯 OBJECTIVE

Validate that the Intrinsic Value calculation system (post-ONDA 1-3 fixes) works correctly across:
- **5 diverse sectors** (Technology, Financial, Healthcare, Consumer, Energy/Materials)
- **20 stocks total** (4 per sector)
- **Geographic diversity** (US focus + 2 Portuguese + European)
- **Market cap diversity** (Large/Mid/Small)

---

## 📊 TEST COVERAGE: 20 STOCKS × 5 SECTORS

### 1. Technology (4 stocks)
| Ticker | Company | Country | Market Cap | Expected Y1-5 Growth |
|--------|---------|---------|------------|----------------------|
| AAPL | Apple | US | Large | 10.07% |
| MSFT | Microsoft | US | Large | 16.73% |
| NVDA | Nvidia | US | Large | 23.86% |
| ASML | ASML Holding | NL | Large | TBD |

**Characteristics:**
- High growth (10-25% Y1-5)
- Analyst data available (high confidence)
- Multiple DCF methods should return valid IVs

---

### 2. Financial Services (4 stocks)
| Ticker | Company | Country | Market Cap | Expected Y1-5 Growth |
|--------|---------|---------|------------|----------------------|
| JPM | JPMorgan Chase | US | Large | 7.79% |
| BAC | Bank of America | US | Large | 15.66% |
| V | Visa | US | Large | TBD |
| BCP.LS | Millennium BCP | PT | Mid | TBD |

**Characteristics:**
- Moderate growth (7-15% Y1-5)
- Strong fundamentals (book value matters)
- P/B ratio methods should work well
- **Portuguese stock included (BCP.LS)** ✅

---

### 3. Healthcare (4 stocks)
| Ticker | Company | Country | Market Cap | Expected Y1-5 Growth |
|--------|---------|---------|------------|----------------------|
| JNJ | Johnson & Johnson | US | Large | TBD |
| UNH | UnitedHealth | US | Large | TBD |
| PFE | Pfizer | US | Large | TBD |
| ROCHE.SW | Roche | CH | Large | TBD |

**Characteristics:**
- Stable growth (5-12% Y1-5)
- Mix of pharma + insurance
- Defensive characteristics

---

### 4. Consumer (4 stocks)
| Ticker | Company | Country | Market Cap | Category | Expected Y1-5 Growth |
|--------|---------|---------|------------|----------|----------------------|
| WMT | Walmart | US | Large | Defensive | 7.89% |
| PG | Procter & Gamble | US | Large | Defensive | 3.45% (reversion) |
| TSLA | Tesla | US | Large | Cyclical | 25.33% |
| NKE | Nike | US | Large | Cyclical | TBD |

**Characteristics:**
- Wide range (3-25% Y1-5)
- Defensive (WMT, PG) vs Cyclical (TSLA, NKE)
- Tests edge cases (low/high growth)
- **PG tests upward reversion** (Y6-10 > Y1-5)

---

### 5. Energy / Materials (4 stocks)
| Ticker | Company | Country | Market Cap | Expected Y1-5 Growth |
|--------|---------|---------|------------|----------------------|
| XOM | Exxon Mobil | US | Large | 8.08% |
| CVX | Chevron | US | Large | TBD |
| RIO | Rio Tinto | UK | Large | TBD |
| GALP.LS | Galp Energia | PT | Mid | TBD |

**Characteristics:**
- Cyclical patterns
- Year 6-10 may show upward reversion
- Tests sector-specific adjustments
- **Portuguese stock included (GALP.LS)** ✅

---

## ✅ SUCCESS CRITERIA (Per Stock)

### 1. API Response
- ✅ HTTP 200 OK
- ✅ Response has `methods` array
- ✅ Response has `price`, `ticker`, `macro_multiplier`

### 2. Valuation Methods Count
- ✅ **≥10 valuation methods** returned
- Expected methods:
  - 1 Proprietary (AlfaValue™)
  - 4 DCF External (FMP benchmarks)
  - 3 Multiples (P/E, P/S, P/B Mean 5y)
  - 2 Growth (PEG, PSG)
  - Additional: DNI-20, DFCF Terminal

### 3. Growth Rates (P0 Bug Fix Verification)
- ✅ **Growth Y1-5 ≠ 0%** (critical fix)
- ✅ **Growth Y6-10 ≠ 0%**
- ✅ Growth Y11-20 = 4% (terminal growth)
- ✅ Growth Y1-5 within ±5% of expected (if known)

### 4. Intrinsic Value Validity
- ✅ All IVs > 0
- ✅ IVs are finite numbers (not NaN/Infinity)
- ✅ Discount % calculated correctly: `(IV - Price) / Price × 100`

### 5. Method Inputs Present
- ✅ Each method has `inputs` object
- ✅ DCF methods include `growth_rate_y1_5`, `growth_rate_y6_10`, `growth_rate_y11_20`
- ✅ `data_source` field present (`analyst`, `historical`, `default`)
- ✅ `confidence` field present (`high`, `medium`, `low`)

---

## 🎯 EXPECTED OUTCOMES BY SECTOR

### Technology (High Growth)
- **Y1-5 Growth:** 10-25%
- **Analyst Data:** High availability (>90%)
- **Confidence:** High
- **Edge Cases:** NVDA (extreme growth 23.86%)

### Financial (Moderate Growth)
- **Y1-5 Growth:** 7-15%
- **Analyst Data:** High availability
- **Special:** P/B methods should work well
- **Edge Cases:** BCP.LS (Portuguese ticker format)

### Healthcare (Stable Growth)
- **Y1-5 Growth:** 5-12%
- **Analyst Data:** Moderate-High availability
- **Confidence:** Medium-High
- **Edge Cases:** ROCHE.SW (Swiss ticker format)

### Consumer (Wide Range)
- **Y1-5 Growth:** 3-25%
- **Analyst Data:** High availability
- **Edge Cases:**
  - PG: Low growth (3.45%) → upward reversion Y6-10
  - TSLA: Extreme growth (25.33%)

### Energy/Materials (Cyclical)
- **Y1-5 Growth:** 5-10%
- **Analyst Data:** Moderate availability
- **Edge Cases:**
  - XOM: Upward reversion Y6-10 (10.54% > 8.08%)
  - GALP.LS: Portuguese ticker format

---

## 📊 AGGREGATE SUCCESS METRICS

### Overall Success Rate
- **Target:** ≥90% (18/20 stocks)
- **Calculation:** `(PASS / Total) × 100`

### P0 Bug Fix Verification
- **Target:** 100% of passed stocks have non-zero growth rates
- **Calculation:** `(Stocks with growth ≠ 0 / Passed stocks) × 100`

### Sector Coverage
- **Target:** ≥3/4 stocks per sector pass
- **Calculation:** Per-sector success rate

### Portuguese Stocks
- **Target:** 2/2 Portuguese stocks pass (BCP.LS, GALP.LS)
- **Critical:** Validates international ticker formats

### Growth Rate Accuracy
- **Target:** ≥80% of known growths within ±5% variance
- **Stocks with known growth:** 10/20 (from GROWTH_RATE_DISCOVERY doc)

---

## 🔬 VALIDATION POINTS

### 1. P0 Bug Fix (Growth Rates ≠ 0%)
**Before Fix (ONDA 0):**
```typescript
growth_rate_y1_5: 0,   // ❌ Hardcoded zero
growth_rate_y6_10: 0,  // ❌ Hardcoded zero
growth_rate_y11_20: 0, // ❌ Hardcoded zero
```

**After Fix (ONDA 1.2):**
```typescript
growth_rate_y1_5: 0.1007,  // ✅ 10.07% (AAPL analyst consensus)
growth_rate_y6_10: 0.0726,  // ✅ 7.26% (adaptive decay)
growth_rate_y11_20: 0.04,   // ✅ 4.00% (terminal growth)
```

### 2. Data Source Attribution
Expected sources (priority order):
1. **`analyst`** - FMP analyst estimates (preferred, 90% large-cap)
2. **`historical`** - FCF CAGR fallback (mid-cap, 60% availability)
3. **`default`** - Conservative 8% (small-cap, last resort)

### 3. Confidence Levels
- **`high`** - Analyst data available, sector known, ≥5y history
- **`medium`** - Historical data only, or partial analyst coverage
- **`low`** - Default fallback, minimal data

### 4. Upward Reversion Cases
Stocks with Y1-5 < 6% should show **upward reversion** in Y6-10:
- **PG (3.45% → 5.77%)** ✅
- **XOM (8.08% → 10.54%)** ✅ (cyclical sector adjustment)

Formula:
```typescript
if (growth_y1_5 < 6%) {
  growth_y6_10 = max(growth_y1_5, (growth_y1_5 + 4%) / 2)
}
```

---

## 🚀 EXECUTION INSTRUCTIONS

### 1. Prerequisites
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1

# Ensure backend is running
npm run dev  # Or ensure production server is up

# Check backend health
curl http://localhost:3001/api/health
```

### 2. Run Tests
```bash
# Run locally (default: http://localhost:3001)
npx tsx scripts/test-iv-universe.ts

# Run against production
TEST_API_URL=https://128.140.45.28.sslip.io npx tsx scripts/test-iv-universe.ts
```

### 3. Expected Output
```
🧪 ONDA 4.2: Testing IV Calculations for 20 Diverse Stocks
================================================================================
Target API: http://localhost:3001
================================================================================

[1/20] Testing AAPL         (Technology            , US)... ✅ PASS (13 methods, analyst)
[2/20] Testing MSFT         (Technology            , US)... ✅ PASS (13 methods, analyst)
...
[19/20] Testing RIO          (Basic Materials       , UK)... ✅ PASS (11 methods, historical)
[20/20] Testing GALP.LS      (Energy                , PT)... ✅ PASS (10 methods, default)

================================================================================
📊 TEST SUMMARY
================================================================================

Total Stocks: 20
✅ Passed:    18 (90.0%)
⚠️ Failed:    1
❌ Errors:    1

🎉 SUCCESS: 90.0% ≥ 90.0% target

================================================================================
🐛 P0 BUG VERIFICATION (Growth Rates ≠ 0%)
================================================================================

Growth rates detected: 18/18 passed stocks
✅ P0 BUG FIXED: All stocks have non-zero growth rates
```

### 4. Results Location
Detailed JSON results saved to:
```
/tmp/iv-universe-test-results.json
```

---

## 📝 TEST DELIVERABLES

### 1. JSON Results (`/tmp/iv-universe-test-results.json`)
Contains per-stock:
- Status (PASS/FAIL/ERROR)
- Methods count
- Growth rates (Y1-5, Y6-10, Y11-20)
- Data source & confidence
- Sample IV & current price
- Expected vs actual growth variance

### 2. Console Output
- Real-time test progress
- Summary statistics
- P0 bug verification
- Growth rates sample
- Sector breakdown
- Portuguese stocks status
- Validation table (expected vs actual)

### 3. Sector Coverage Report
To be created in `/docs/SECTOR_COVERAGE_REPORT.md` after test execution.

---

## 🔧 TROUBLESHOOTING

### Backend Not Running
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Wait for startup, then run tests
sleep 10 && npx tsx scripts/test-iv-universe.ts
```

### API Timeout Errors
```bash
# Increase timeout in test script (default: 30s)
# Edit scripts/test-iv-universe.ts line 240
const REQUEST_TIMEOUT = 60000; // 60 seconds
```

### Rate Limiting
```bash
# Test script includes 500ms delay between requests
# If still hitting limits, increase delay at line 526
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
```

### Portuguese Stocks Not Found
```bash
# Check FMP supports .LS suffix
curl "https://financialmodelingprep.com/api/v3/profile/BCP.LS?apikey=$FMP_API_KEY"

# Alternative: Test with US-only first
# Comment out BCP.LS and GALP.LS in TEST_STOCKS array
```

---

## 📚 REFERENCES

- **Growth Rate Discovery:** `/GROWTH_RATE_DISCOVERY_2025-10-23.md`
- **Implementation Plan:** `/IMPLEMENTATION_MASTER_PLAN_2025-10-23.md`
- **Test Script:** `/scripts/test-iv-universe.ts`
- **IV Controller:** `/server/controllers/iv-chart-controller.ts`
- **Growth Estimator:** `/server/utils/growth-rate-estimator.ts`

---

## ✅ ACCEPTANCE CRITERIA

Test suite PASSES if:
1. ✅ ≥18/20 stocks return PASS status (90% success rate)
2. ✅ 100% of passed stocks have growth rates ≠ 0%
3. ✅ All passed stocks have ≥10 valuation methods
4. ✅ 2/2 Portuguese stocks pass (BCP.LS, GALP.LS)
5. ✅ ≥80% of known growths match within ±5% variance
6. ✅ No P0 bug recurrence (0% growth rates)

Test suite FAILS if:
- ❌ <18/20 stocks pass (<90% success rate)
- ❌ Any passed stock has 0% growth rates (P0 bug)
- ❌ Both Portuguese stocks fail
- ❌ <50% of known growths match within ±10% variance

---

**Last Updated:** October 24, 2025
**Test Script Version:** 1.0
**Status:** ✅ Ready for Execution
