# Growth Stock Detection - Integration Guide

**Status:** Implementation Complete ✅ | Integration Pending ⏳
**Target:** Phase 2C - Auto-detect growth stocks and apply specialized valuation

---

## 🎯 Integration Checklist

### Step 1: Backend Integration (Valuation Controller)

**File:** `/server/controllers/valuation-controller.ts`

```typescript
import { isGrowthStock, getGrowthStockDetails } from '../utils/stock-classifier';

// In your valuation calculation function
async function calculateIntrinsicValue(ticker: string, method: string) {
  // 1. Fetch company data
  const profile = await fmpService.getCompanyProfile(ticker);
  const financials = await fmpService.getFinancials(ticker);

  // 2. Calculate growth rates (implement these helpers)
  const epsGrowth = calculateEPSGrowth(financials);
  const revenueGrowth = calculateRevenueGrowth(financials);

  // 3. Detect growth stock
  const growthDetails = getGrowthStockDetails(
    profile.beta,
    epsGrowth,
    revenueGrowth,
    profile.sector
  );

  // 4. Select appropriate method if auto-mode
  if (method === 'auto') {
    method = growthDetails.is_growth_stock
      ? 'growth-dcf-8y'  // Use growth-specific method
      : 'dcf-fcf-20';     // Use standard method
  }

  // 5. Adjust parameters for growth stocks
  const dcfParams = {
    maxG15: growthDetails.is_growth_stock ? 0.50 : 0.30,
    timeHorizon: growthDetails.is_growth_stock ? 8 : 20,
    terminalGrowth: growthDetails.is_growth_stock ? 0.04 : 0.025,
    retentionFactor: growthDetails.is_growth_stock ? 0.70 : 0.60,
  };

  // 6. Calculate valuation
  const result = await valuationService.calculate(ticker, method, dcfParams);

  // 7. Return with classification metadata
  return {
    ...result,
    classification: {
      is_growth_stock: growthDetails.is_growth_stock,
      reason: growthDetails.reason,
      recommended_methods: growthDetails.recommended_methods,
    }
  };
}
```

### Step 2: Implement Helper Functions

**File:** `/server/utils/financial-calculators.ts` (create if doesn't exist)

```typescript
/**
 * Calculate 5-year EPS CAGR from financial statements
 *
 * @param financials - Array of annual financial statements (newest first)
 * @returns EPS CAGR as decimal (0.20 = 20%)
 */
export function calculateEPSGrowth(financials: any[]): number {
  if (!financials || financials.length < 5) {
    return 0; // Not enough history
  }

  // Get EPS from 5 years ago (index 4) and current (index 0)
  const oldEPS = financials[4]?.eps || financials[4]?.netIncomePerShare;
  const newEPS = financials[0]?.eps || financials[0]?.netIncomePerShare;

  // Handle invalid data
  if (!oldEPS || !newEPS || oldEPS <= 0 || newEPS <= 0) {
    return 0;
  }

  // CAGR formula: (ending_value / beginning_value)^(1/years) - 1
  const cagr = Math.pow(newEPS / oldEPS, 1/5) - 1;

  // Cap at reasonable range (-50% to 200%)
  return Math.max(-0.50, Math.min(2.00, cagr));
}

/**
 * Calculate 5-year Revenue CAGR from financial statements
 *
 * @param financials - Array of annual financial statements (newest first)
 * @returns Revenue CAGR as decimal (0.15 = 15%)
 */
export function calculateRevenueGrowth(financials: any[]): number {
  if (!financials || financials.length < 5) {
    return 0;
  }

  const oldRevenue = financials[4]?.revenue;
  const newRevenue = financials[0]?.revenue;

  if (!oldRevenue || !newRevenue || oldRevenue <= 0 || newRevenue <= 0) {
    return 0;
  }

  const cagr = Math.pow(newRevenue / oldRevenue, 1/5) - 1;

  // Cap at reasonable range (-30% to 150%)
  return Math.max(-0.30, Math.min(1.50, cagr));
}

/**
 * Get financial metrics for growth stock detection
 *
 * @param ticker - Stock ticker symbol
 * @returns Object with beta, epsGrowth, revenueGrowth, sector
 */
export async function getGrowthMetrics(ticker: string) {
  const [profile, financials] = await Promise.all([
    fmpService.getCompanyProfile(ticker),
    fmpService.getFinancials(ticker, 5), // Get 5 years of data
  ]);

  return {
    beta: profile.beta ?? 1.0,
    epsGrowth: calculateEPSGrowth(financials),
    revenueGrowth: calculateRevenueGrowth(financials),
    sector: profile.sector,
  };
}
```

### Step 3: Frontend Integration (UI Badge)

**File:** `/client/src/components/stock/GrowthStockBadge.tsx` (new)

```typescript
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface GrowthStockBadgeProps {
  isGrowthStock: boolean;
  reason?: string | null;
}

export function GrowthStockBadge({ isGrowthStock, reason }: GrowthStockBadgeProps) {
  if (!isGrowthStock) return null;

  return (
    <Badge variant="default" className="bg-green-600 text-white">
      <TrendingUp className="w-3 h-3 mr-1" />
      Growth Stock
      {reason && (
        <span className="ml-2 text-xs opacity-80" title={reason}>
          ⓘ
        </span>
      )}
    </Badge>
  );
}
```

**Usage in Intrinsic Value page:**

```typescript
import { GrowthStockBadge } from '@/components/stock/GrowthStockBadge';

// In your component
<div className="flex items-center gap-2">
  <h2>{companyProfile.companyName}</h2>
  <GrowthStockBadge
    isGrowthStock={valuationData.classification?.is_growth_stock}
    reason={valuationData.classification?.reason}
  />
</div>
```

### Step 4: Method Selector Integration

**File:** `/client/src/components/valuation/MethodSelector.tsx`

Add growth stock recommendations to the dropdown:

```typescript
// If growth stock detected, highlight recommended methods
const recommendedMethods = valuationData.classification?.recommended_methods || [];

<Select value={selectedMethod} onValueChange={setSelectedMethod}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {methods.map(method => (
      <SelectItem
        key={method.id}
        value={method.id}
        className={recommendedMethods.includes(method.id) ? 'bg-green-50' : ''}
      >
        {method.name}
        {recommendedMethods.includes(method.id) && ' ⭐'}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Step 5: API Response Schema

**Update valuation API response to include classification:**

```typescript
// GET /api/valuation/:ticker/:method
{
  ticker: "NVDA",
  method: "growth-dcf-8y",
  intrinsicValue: 450.00,
  currentPrice: 420.00,
  upside: 7.14,

  // NEW: Growth stock classification
  classification: {
    is_growth_stock: true,
    reason: "High beta (1.80, volatility indicator), Strong EPS growth (40.0% CAGR), Strong revenue growth (35.0% CAGR), Growth-oriented sector (Technology)",
    metrics: {
      beta: "1.80",
      eps_growth_cagr: "40.0%",
      revenue_growth_cagr: "35.0%",
      sector: "Technology"
    },
    recommended_methods: ["growth-dcf-8y", "peg", "psg", "dcf-fcf-20"],
    growth_parameters: {
      max_g1_5: "50%",
      retention_factor: "70%",
      terminal_growth: "3-5%",
      time_horizon: "8 years"
    }
  },

  inputs: { ... },
  outputs: { ... }
}
```

---

## 🧪 Testing Checklist

### Backend Tests

```bash
# Test helper functions
npx tsx server/utils/__tests__/financial-calculators.test.ts

# Test integration
curl http://localhost:3001/api/valuation/NVDA/auto
# Should return growth-dcf-8y method with classification metadata
```

### Frontend Tests

1. **Navigate to Intrinsic Value page**
2. **Search for NVDA** → Should show "Growth Stock" badge
3. **Check method dropdown** → Recommended methods highlighted with ⭐
4. **View calculation details** → Should show growth parameters (max G_1_5 = 50%)

### Edge Case Tests

Test these stocks:
- **NVDA** (high growth) → ✅ Should classify as growth
- **KO** (value) → ❌ Should NOT classify as growth
- **AMZN** (moderate) → ✅ Should classify as growth (relaxed mode)
- **GOOGL** (borderline) → ⚠️ May or may not classify (depends on current metrics)

---

## 📊 Monitoring

Add logging to track classification accuracy:

```typescript
logger.info('Growth stock classification', {
  ticker,
  is_growth_stock: growthDetails.is_growth_stock,
  beta: profile.beta,
  eps_growth: epsGrowth,
  revenue_growth: revenueGrowth,
  sector: profile.sector,
  reason: growthDetails.reason,
});
```

Monitor these metrics:
- **Classification rate:** % of stocks classified as growth
- **Method selection:** How often auto-mode selects growth-dcf-8y
- **User overrides:** When users manually change from recommended method

---

## 🚨 Common Issues

### Issue 1: Missing Financial Data
**Problem:** API returns incomplete financial history
**Solution:** Handle gracefully with fallback to 0 growth

```typescript
const epsGrowth = calculateEPSGrowth(financials) || 0;
const revenueGrowth = calculateRevenueGrowth(financials) || 0;
```

### Issue 2: Negative Growth Rates
**Problem:** Companies with declining metrics return negative CAGR
**Solution:** Cap at -50% minimum, don't classify as growth

```typescript
const cagr = Math.max(-0.50, Math.pow(newEPS / oldEPS, 1/5) - 1);
```

### Issue 3: Beta Unavailable
**Problem:** Profile doesn't include beta data
**Solution:** Default to 1.0 (market average)

```typescript
const beta = profile.beta ?? 1.0;
```

---

## 📚 Resources

- **Implementation:** `server/utils/stock-classifier.ts` (lines 557-703)
- **Tests:** `test-growth-stock-detection.ts`
- **Documentation:** `GROWTH_STOCK_DETECTION_IMPLEMENTATION_REPORT.md`
- **Quick Reference:** `GROWTH_STOCK_DETECTION_QUICKREF.md`

---

## ✅ Integration Timeline

1. **Day 1:** Implement helper functions (`calculateEPSGrowth`, `calculateRevenueGrowth`)
2. **Day 2:** Integrate into valuation controller
3. **Day 3:** Add frontend badge and method highlighting
4. **Day 4:** Test with real stocks (NVDA, TSLA, AMZN, KO)
5. **Day 5:** Deploy to production and monitor

---

**Status:** Ready for Integration ✅
**Estimated Effort:** 2-3 days
**Dependencies:** FMP API (financial statements), company profiles

---

**Last Updated:** 2025-10-28
