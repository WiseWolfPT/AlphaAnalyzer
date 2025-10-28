# Alfalyzer Valuation Methods - Quick Reference

**Last Updated:** 2025-10-26

---

## Working Methods (10-12 depending on stock)

### 1. AlfaValue™ (Proprietary)
- **Category:** Proprietary
- **Formula:** FCF → PV(g1-5, g6-10, g11-20, DR) + Cash - Debt
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** General-purpose DCF for growing companies

### 2. DCF-20 FCF FMP
- **Category:** DCF (External)
- **Formula:** FMP 10y FCF projection (unlevered)
- **Status:** ✅ WORKING
- **Confidence:** HIGH
- **Best For:** Cross-validation with FMP benchmarks

### 3. DCF Terminal FCF FMP
- **Category:** DCF (External)
- **Formula:** FMP Terminal Value (Gordon Growth)
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** Mature companies with stable growth

### 4. DNI-20 NI
- **Category:** DCF (Internal)
- **Formula:** Σ(NI_t / (1 + WACC)^t) + Cash - Debt
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** Companies with negative FCF but positive earnings

### 5. DFCF Terminal
- **Category:** DCF (Internal)
- **Formula:** 3-Stage: PV(Stage1) + PV(Stage2) + PV(Terminal)
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** High-growth tech companies (multi-stage decline)

### 6. P/E Mean 5y
- **Category:** Multiples
- **Formula:** Mean(P/E₅ʸ) × EPS_TTM
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** Profitable companies with consistent earnings

### 7. P/S Mean 5y
- **Category:** Multiples
- **Formula:** Mean(P/S₅ʸ) × Sales_per_Share_TTM
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** Unprofitable but revenue-generating companies

### 8. P/B Mean 5y
- **Category:** Multiples
- **Formula:** Mean(P/B₅ʸ) × Book_Value_per_Share_TTM
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** Capital-intensive businesses (banks, industrials)

### 9. PEG Ratio
- **Category:** Growth
- **Formula:** Fair_PEG (1.5) × Growth% × EPS_TTM
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** Growth stocks with 10-30% EPS growth

### 10. PSG Ratio
- **Category:** Growth
- **Formula:** Fair_PSG (0.2) × Revenue_CAGR_3y × Sales_per_Share_TTM
- **Status:** ✅ WORKING
- **Confidence:** MED
- **Best For:** High-growth SaaS/tech companies

### 11. P/E Mean without NRI (Conditional)
- **Category:** Multiples
- **Formula:** Mean(P/E₅ʸ_adj) × Adjusted_EPS_TTM
- **Status:** ⚠️ PARTIAL (Works for MSFT, fails for AAPL)
- **Best For:** Companies with significant one-time items

### 12. P/B Mean without NRI (Conditional)
- **Category:** Multiples
- **Formula:** Mean(P/B₅ʸ_adj) × Adjusted_BVPS_TTM
- **Status:** ⚠️ PARTIAL (Works for MSFT, fails for AAPL)
- **Best For:** Asset-heavy companies with special items

---

## Failed Methods (Not Available)

### DCF-20 FCFE FMP
- **Status:** ❌ BROKEN (FMP API issue)
- **Reason:** FCFE data not available from FMP

### DCF Terminal FCFE FMP
- **Status:** ❌ BROKEN (FMP API issue)
- **Reason:** FCFE data not available from FMP

---

## Method Selection Guide

### Choose Based on Company Characteristics:

| Company Type | Recommended Methods |
|--------------|---------------------|
| **Tech Growth (AAPL, MSFT)** | AlfaValue™, DFCF Terminal, PEG |
| **Mature Dividend (KO, PG)** | DCF Terminal FCF, P/E Mean 5y |
| **Unprofitable SaaS** | P/S Mean 5y, PSG Ratio |
| **Value Stocks** | P/B Mean 5y, P/E Mean 5y |
| **Negative FCF** | DNI-20 NI, P/S Mean 5y |
| **High EPS Growth** | PEG Ratio, DFCF Terminal |
| **Low Revenue Growth** | Avoid PSG (will show extreme undervaluation) |

---

## Typical IV Ranges by Method (AAPL Example)

```
PSG Ratio:           $12   (ultra-conservative, revenue-based)
PEG Ratio:          $103   (conservative, growth-adjusted)
AlfaValue™:         $125   (proprietary DCF)
DNI-20 NI:          $123   (net income DCF)
P/B Mean 5y:        $193   (book value multiple)
DCF-20 FCF FMP:     $194   (FMP benchmark)
P/S Mean 5y:        $195   (revenue multiple)
DFCF Terminal:      $196   (3-stage DCF)
P/E Mean 5y:        $198   (earnings multiple)
DCF Terminal FCF:   $204   (terminal value focus)
```

**Consensus Range:** $193-$204 (excluding outliers)
**Current Price:** $262.82
**Consensus Discount:** -24% to -22% (overvalued)

---

## API Endpoints

### Get All Methods
```bash
GET https://128.140.45.28.sslip.io/api/iv/{ticker}/chart
```

**Response Time:** 144-170ms (all <200ms)

**Cache:** 24h TTL (first request ~150ms, cached <20ms)

### Example Request
```bash
curl https://128.140.45.28.sslip.io/api/iv/AAPL/chart
```

### Example Response Structure
```json
{
  "ticker": "AAPL",
  "price": 262.82,
  "methods": [
    {
      "name": "AlfaValue™",
      "method_id": "alfavalue",
      "category": "proprietary",
      "iv": 125.44,
      "discount_pct": -52.27,
      "formula": "FCF → PV(g1-5, g6-10, g11-20, DR) + Cash - Debt",
      "confidence": "MED",
      "source": "internal",
      "as_of": "2025-10-24",
      "inputs": { /* method-specific inputs */ }
    }
  ],
  "macro_multiplier": 1.0,
  "macro_sentiment": "neutral",
  "as_of": "2025-10-25"
}
```

---

## Common Issues & Troubleshooting

### Why do I see 10-12 methods instead of 14?

**Reason:** 4 methods may fail depending on data availability:
- `dcf-fcfe-20` (FMP API issue - always fails)
- `dcf-terminal-fcfe` (FMP API issue - always fails)
- `pe-mean-without-nri` (Special items calculation - stock-dependent)
- `pb-mean-without-nri` (Special items calculation - stock-dependent)

### Why is PSG showing $12 for AAPL?

**Reason:** Apple's revenue growth is only 2.25% (very low for tech), so PSG heavily penalizes the valuation. This is working as designed.

### Why do methods show different IVs?

**Expected Behavior:** Each method uses different assumptions:
- **DCF methods:** Focus on cash flow projection
- **Multiples:** Based on historical ratios
- **Growth:** Emphasize future growth rates

Wide variance (e.g., $12-$204) is normal and represents different investment philosophies.

---

## Growth Rate Sources (ONDA 1.2)

All DCF methods now use **dynamic growth rates** from:

1. **Analyst Estimates** (primary source)
   - FMP Analyst Estimates API
   - Consensus EPS/revenue forecasts
   - Confidence: HIGH

2. **Historical Data** (fallback)
   - 5-year CAGR calculation
   - Adjusted for sector caps
   - Confidence: MEDIUM

3. **Static Defaults** (last resort)
   - Technology: 12%
   - Healthcare: 8%
   - Consumer: 5%
   - Confidence: LOW

**Example (AAPL):**
- Y1-5: 10.35% (from analyst estimates)
- Y6-10: 7.11% (blended company + sector)
- Y11-20: 4.93% (terminal growth)

---

## Input Structures

### AlfaValue™
```typescript
{
  fcf_ttm_musd: number,           // TTM Free Cash Flow (millions)
  total_debt_musd: number,        // Total Debt
  cash_musd: number,              // Cash & Equivalents
  discount_rate: number,          // WACC (decimal)
  shares_outstanding_m: number,   // Shares Outstanding (millions)
  growth_rate_y1_5: number,       // Year 1-5 growth rate (decimal)
  growth_rate_y6_10: number,      // Year 6-10 growth rate
  growth_rate_y11_20: number,     // Year 11-20 terminal growth
  deduct_debt: boolean,           // Always true
  add_cash: boolean               // Always true
}
```

### DFCF Terminal
```typescript
{
  fcf_ttm_musd: number,
  stage1_years: 5,
  stage1_growth_rate: number,
  stage1_value: number,           // ✅ CALCULATED
  stage2_years: 5,
  stage2_growth_rate: number,
  stage2_value: number,           // ✅ CALCULATED
  terminal_growth_rate: number,
  terminal_value: number          // ✅ CALCULATED
}
```

### PEG Ratio
```typescript
{
  fair_peg_ratio: 1.5,            // Editable default
  eps_without_nri: number,
  pe_without_nri: number,
  growth_rate: number,            // EPS growth rate (decimal)
  peg_ratio_without_nri: number   // Current PEG (for comparison)
}
```

---

## Error Handling

### ETF Detection (✅ Working)
```bash
curl https://128.140.45.28.sslip.io/api/iv/SPY/chart

# Returns:
{
  "error": "ETF_NOT_SUPPORTED",
  "message": "SPY is an ETF...",
  "reason": "Known ETF list (140+ popular ETFs)",
  "alternative_methods": ["Price momentum", "Relative strength", ...]
}
```

### Invalid Symbol (⚠️ Generic Error)
```bash
curl https://128.140.45.28.sslip.io/api/iv/INVALIDXYZ/chart

# Returns:
{
  "error": "No price data found for INVALIDXYZ"
}
```

**Recommendation:** Should return HTTP 404 with clearer message.

---

## Performance Characteristics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Response Time (First) | 144-170ms | <500ms | ✅ PASS (60% under) |
| Response Time (Cached) | <20ms | <50ms | ✅ PASS |
| Cache Hit Rate | ~80% | >80% | ✅ PASS |
| FMP API Calls (Uncached) | 27 | N/A | - |
| FMP API Calls (Cached) | 0 | <10 | ✅ PASS |

---

## References

- **Full Validation Report:** `VALUATION_METHODS_VALIDATION_REPORT_2025-10-26.md`
- **Implementation:** `server/services/valuation-service.ts`
- **Controller:** `server/controllers/iv-chart-controller.ts`
- **Types:** `server/types/valuation.ts`
- **Method Cache:** `server/services/method-cache-service.ts`

---

**Quick Lookup:**
- Production URL: `https://128.140.45.28.sslip.io`
- Endpoint: `/api/iv/{ticker}/chart`
- Methods: 10-12 (depending on stock)
- Performance: <200ms
- Cache: 24h TTL
