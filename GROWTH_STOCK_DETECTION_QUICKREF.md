# Growth Stock Detection - Quick Reference

## Quick Start

```typescript
import { isGrowthStock, getGrowthStockReason, getGrowthStockDetails } from './server/utils/stock-classifier';

// Basic detection
const isGrowth = isGrowthStock(
  1.8,      // beta
  0.40,     // epsGrowth (40% CAGR as decimal)
  0.35,     // revenueGrowth (35% CAGR as decimal)
  'Technology'  // sector (optional)
);

// Get explanation
const reason = getGrowthStockReason(1.8, 0.40, 0.35, 'Technology');
// Returns: "High beta (1.80, volatility indicator), Strong EPS growth (40.0% CAGR), ..."

// Get full details
const details = getGrowthStockDetails(1.8, 0.40, 0.35, 'Technology');
// Returns: { is_growth_stock: true, reason: "...", metrics: {...}, recommended_methods: [...], growth_parameters: {...} }
```

## Detection Criteria

| Criterion | Threshold | Weight |
|-----------|-----------|--------|
| Beta | > 1.5 | Core |
| EPS Growth CAGR | > 20% | Core |
| Revenue Growth CAGR | > 15% | Core |
| Tech Sector | Technology, Consumer Cyclical, Communication | Boost |

**Classification Rules:**
- ✅ Growth: 2+ core criteria met
- ✅ Growth: Tech sector + 1 core criterion + moderate metrics (beta > 1.2, EPS > 15% OR revenue > 12%)
- ❌ Not Growth: < 2 core criteria

## Input Parameters

```typescript
isGrowthStock(
  beta: number,              // Stock beta (volatility vs market)
  epsGrowth: number,         // EPS CAGR as decimal (0.20 = 20%)
  revenueGrowth: number,     // Revenue CAGR as decimal (0.15 = 15%)
  sector?: string            // Optional: Company sector
): boolean
```

## Recommended Methods for Growth Stocks

1. **growth-dcf-8y** - Primary method (8-year horizon)
2. **peg** - Price/Earnings to Growth
3. **psg** - Price/Sales to Growth
4. **dcf-fcf-20** - Traditional DCF with adjusted params

## Growth Parameters (DCF Models)

| Parameter | Growth Stock | Standard Stock |
|-----------|--------------|----------------|
| Max G_1_5 | 50% | 30% |
| Retention Factor | 70% | 60% |
| Terminal Growth | 3-5% | 2-3% |
| Time Horizon | 8 years | 20 years |

## Real-World Examples

### High Growth (✅ Classified)
```typescript
// NVDA
isGrowthStock(1.8, 0.40, 0.35, 'Technology') // true

// TSLA
isGrowthStock(2.0, 0.35, 0.30, 'Consumer Cyclical') // true
```

### Moderate Growth (⚠️ Borderline)
```typescript
// AMZN
isGrowthStock(1.2, 0.22, 0.20, 'Consumer Cyclical') // true (relaxed mode)

// GOOGL
isGrowthStock(1.1, 0.18, 0.15, 'Communication') // false (fails strict criteria)
```

### Value Stock (❌ Not Classified)
```typescript
// KO (Coca-Cola)
isGrowthStock(0.6, 0.05, 0.03, 'Consumer Defensive') // false

// Utility
isGrowthStock(0.8, 0.05, 0.03, 'Utilities') // false
```

## Integration Example

```typescript
// In valuation controller
import { isGrowthStock } from '@/server/utils/stock-classifier';

// Fetch company data
const profile = await fmpService.getCompanyProfile(ticker);
const financials = await fmpService.getFinancials(ticker);

// Calculate growth rates
const epsGrowth = calculateEPSGrowth(financials); // helper function
const revenueGrowth = calculateRevenueGrowth(financials); // helper function

// Detect growth stock
const isGrowth = isGrowthStock(
  profile.beta,
  epsGrowth,
  revenueGrowth,
  profile.sector
);

// Select appropriate methods
const methods = isGrowth
  ? ['growth-dcf-8y', 'peg', 'psg', 'dcf-fcf-20']
  : ['dcf-fcf-20', 'dcf-terminal-fcf', 'pe-mean', 'ps-mean'];

// Adjust DCF parameters
const maxG15 = isGrowth ? 0.50 : 0.30;
const timeHorizon = isGrowth ? 8 : 20;
```

## Helper Functions Needed

You'll need to implement these helpers to calculate growth rates from financial data:

```typescript
// Calculate 5-year EPS CAGR
function calculateEPSGrowth(financials: any[]): number {
  // Get EPS from 5 years ago and current
  const oldEPS = financials[4]?.eps || 0;
  const newEPS = financials[0]?.eps || 0;

  if (oldEPS <= 0 || newEPS <= 0) return 0;

  // CAGR formula: (newValue/oldValue)^(1/years) - 1
  return Math.pow(newEPS / oldEPS, 1/5) - 1;
}

// Calculate 5-year Revenue CAGR
function calculateRevenueGrowth(financials: any[]): number {
  const oldRevenue = financials[4]?.revenue || 0;
  const newRevenue = financials[0]?.revenue || 0;

  if (oldRevenue <= 0 || newRevenue <= 0) return 0;

  return Math.pow(newRevenue / oldRevenue, 1/5) - 1;
}
```

## Error Handling

The function handles edge cases gracefully:

```typescript
// Missing sector - still works
isGrowthStock(1.7, 0.25, 0.20, undefined) // true

// Zero values - returns false
isGrowthStock(0, 0, 0) // false

// Negative growth - returns false
isGrowthStock(1.5, -0.10, 0.05) // false
```

## Testing

Run the test suite:

```bash
cd "/Users/antoniofrancisco/Documents/teste 1"
npx tsx test-growth-stock-detection.ts
```

Expected output: All 6 tests pass ✅

---

**File Location:** `/server/utils/stock-classifier.ts` (lines 557-703)
**Test File:** `/test-growth-stock-detection.ts`
**Documentation:** `GROWTH_STOCK_DETECTION_IMPLEMENTATION_REPORT.md`
