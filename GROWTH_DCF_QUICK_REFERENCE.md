# Growth DCF-8Y Quick Reference

## Method Overview

**Purpose:** Value high-growth tech stocks with sustained 20-50% growth rates

**Time Horizon:** 8 years (vs 20 for standard DCF)

**Target Companies:** NVDA, TSLA, AMZN, GOOGL, and similar growth leaders

---

## Key Parameters

| Parameter | Standard DCF-20 | Growth DCF-8Y | Change |
|-----------|----------------|---------------|--------|
| Max Growth (Y1-5) | 30% | **50%** | +67% ⬆️ |
| Retention Factor | 50% | **70%** | +40% ⬆️ |
| Terminal Growth | 4% (fixed) | **3-5%** | Range |
| Time Horizon | 20 years | **8 years** | -60% ⬇️ |

---

## Detection Criteria (Growth Stock)

```typescript
isGrowthStock(beta, epsGrowth, revenueGrowth, sector)
```

**Must meet 2 of 3:**
1. Beta > 1.5
2. EPS Growth > 20% CAGR
3. Revenue Growth > 15% CAGR

**OR:** Tech sector + Beta > 1.2 + (EPS > 15% OR Revenue > 12%)

---

## Formula (2-Stage Model)

**Stage 1 (Years 1-5):**
```
PV₁ = Σ(FCFₜ × (1 + g₁₋₅)ᵗ) / (1 + WACC)^(t-0.5)
```

**Stage 2 (Years 6-8):**
```
PV₂ = Σ(FCFₜ × (1 + g₆₋₈)ᵗ) / (1 + WACC)^(t-0.5)
where g₆₋₈ = g₁₋₅ × 0.70  (retention factor)
```

**Terminal Value (Beyond Year 8):**
```
TV = FCF₉ / (WACC - g_term)
PV_TV = TV / (1 + WACC)⁸
```

**Intrinsic Value:**
```
IV = (PV₁ + PV₂ + PV_TV + Cash - Debt) / Shares
```

---

## Files Created

1. **`server/services/growth-dcf-8y-method.ts`** - Main implementation
2. **`server/types/valuation.ts`** - Types (GrowthDCF8YResponse, MethodId)
3. **`server/utils/stock-classifier.ts`** - Detection functions
4. **`scripts/test-growth-dcf-8y.ts`** - Test suite

---

## Usage

```typescript
import { calculateGrowthDCF8Y } from './server/services/growth-dcf-8y-method';
import { valuationService } from './server/services/valuation-service';

const result = await calculateGrowthDCF8Y('NVDA', valuationService);

console.log({
  ticker: result.ticker,
  iv: result.iv,                    // $800-$1200 (example)
  fcf: result.fcf,                  // $50,000M
  wacc: result.wacc * 100,          // 12%
  growthY1_5: result.growthY1_5 * 100, // 40%
  growthY6_8: result.growthY6_8 * 100, // 28%
  terminal: result.terminalGrowth * 100 // 4%
});
```

---

## Integration Checklist

- [x] Types added to `valuation.ts`
- [x] Method implemented in `growth-dcf-8y-method.ts`
- [x] Growth detector added to `stock-classifier.ts`
- [x] Tests created in `scripts/test-growth-dcf-8y.ts`
- [ ] **TODO:** Add to `getAllValuationMethods()` in valuation-service
- [ ] **TODO:** Create API route `/api/valuation/growth-dcf-8y/:ticker`
- [ ] **TODO:** Add to frontend dropdown
- [ ] **TODO:** Add to useMethodInputMapper hook

---

## Test Stocks (Expected Results)

| Stock | Beta | Growth | Expected IV |
|-------|------|--------|-------------|
| NVDA | 1.75 | 40% | $800-$1,200 |
| TSLA | 2.00 | 35% | $200-$350 |
| AMZN | 1.20 | 22% | $150-$200 |
| GOOGL | 1.10 | 18% | $140-$180 |

---

## Validation

✅ IV > 0 and finite
✅ Growth Y1-5: 5-50%
✅ Growth Y6-8: 3-15%
✅ Terminal: 3-5%
✅ WACC: 5-15%
✅ Confidence: HIGH/MED/LOW
✅ Cache: 24h TTL

---

## When to Use

**Use Growth DCF-8Y:**
- Tech stocks with >20% growth
- Companies in secular growth markets (AI, EV, Cloud)
- Beta > 1.2 with visible growth runway
- Examples: NVDA, TSLA, AMZN, GOOGL

**Use Standard DCF-20:**
- Mature companies (<10% growth)
- Stable cash flows
- Low beta (<1.2)
- Examples: KO, PG, JNJ, WMT

---

**Last Updated:** 2025-10-28
**Status:** ✅ Implementation Complete - Ready for Integration
