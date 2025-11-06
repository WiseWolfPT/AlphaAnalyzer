# Data Quality Quick Fixes - Implementation Guide

**Timeline:** 1 Week
**Cost:** ZERO (developer time only)
**Impact:** +100 stocks upgraded from Tier 3 to Tier 2

---

## Priority 1: Quarterly Data Fallback

### Problem
25% of stocks have only annual financial statements, limiting historical analysis.

### Solution
Add quarterly fallback when annual data is incomplete.

### Implementation

**File:** `server/services/fmp-service.ts`

```typescript
/**
 * Fetch financial statements with quarterly fallback
 */
async function fetchFinancialStatementsWithFallback(
  symbol: string,
  statement: 'income' | 'balance' | 'cash-flow',
  limit: number = 5
): Promise<any[]> {
  const logger = this.logger;

  // Try annual first (preferred)
  const annual = await this.fetchFinancialStatement(symbol, statement, 'annual', limit);

  if (annual && annual.length >= limit) {
    logger.info(`[FMP] ${symbol} ${statement}: Got ${annual.length} annual periods`);
    return annual;
  }

  // Fallback to quarterly
  logger.warn(`[FMP] ${symbol} ${statement}: Annual incomplete (${annual?.length || 0}), trying quarterly`);
  const quarterly = await this.fetchFinancialStatement(symbol, statement, 'quarter', limit * 4);

  if (quarterly && quarterly.length > 0) {
    // Convert quarterly to annual-equivalent (sum last 4 quarters = TTM)
    const annualized = convertQuarterlyToAnnual(quarterly, limit);
    logger.info(`[FMP] ${symbol} ${statement}: Synthesized ${annualized.length} annual periods from quarterly`);
    return annualized;
  }

  // Return whatever we got
  return annual || [];
}

/**
 * Convert quarterly data to annual-equivalent (Trailing Twelve Months)
 */
function convertQuarterlyToAnnual(quarterly: any[], numYears: number): any[] {
  const annual: any[] = [];

  for (let i = 0; i < numYears * 4; i += 4) {
    if (i + 3 >= quarterly.length) break;

    const q1 = quarterly[i];
    const q2 = quarterly[i + 1];
    const q3 = quarterly[i + 2];
    const q4 = quarterly[i + 3];

    // Sum financials (income statement, cash flow)
    const ttm = {
      date: q1.date, // Most recent quarter date
      symbol: q1.symbol,
      reportedCurrency: q1.reportedCurrency,
      revenue: (q1.revenue || 0) + (q2.revenue || 0) + (q3.revenue || 0) + (q4.revenue || 0),
      netIncome: (q1.netIncome || 0) + (q2.netIncome || 0) + (q3.netIncome || 0) + (q4.netIncome || 0),
      eps: (q1.eps || 0) + (q2.eps || 0) + (q3.eps || 0) + (q4.eps || 0),
      // Add more fields as needed
      period: 'TTM',
      source: 'quarterly-synthesized'
    };

    annual.push(ttm);
  }

  return annual;
}
```

**Testing:**
```bash
# Test with stock that has quarterly-only data
curl "http://localhost:3001/api/intrinsic-value/RIVN?method=dcf-fcf"
# Should now work instead of failing
```

---

## Priority 2: Sector-Average Defaults

### Problem
Missing valuation ratios prevent certain methods from working.

### Solution
Use sector-average P/E, P/S, P/B when stock-specific data is missing.

### Implementation

**File:** `server/utils/sector-defaults.ts` (new file)

```typescript
/**
 * Sector-average valuation multiples
 * Data source: Industry averages from S&P 500
 */
export const SECTOR_DEFAULTS = {
  Technology: {
    pe: 28.5,
    ps: 5.2,
    pb: 6.8,
    evToEbitda: 18.2,
    dividendYield: 0.8
  },
  Healthcare: {
    pe: 22.3,
    ps: 3.1,
    pb: 4.2,
    evToEbitda: 15.8,
    dividendYield: 1.5
  },
  Financial: {
    pe: 12.8,
    ps: 2.4,
    pb: 1.3,
    evToEbitda: null, // Not applicable for financials
    dividendYield: 2.8
  },
  'Consumer Cyclical': {
    pe: 18.7,
    ps: 1.2,
    pb: 3.4,
    evToEbitda: 12.5,
    dividendYield: 1.9
  },
  'Consumer Defensive': {
    pe: 21.2,
    ps: 1.8,
    pb: 5.1,
    evToEbitda: 14.3,
    dividendYield: 2.3
  },
  Industrials: {
    pe: 19.4,
    ps: 1.5,
    pb: 3.2,
    evToEbitda: 13.7,
    dividendYield: 1.7
  },
  Energy: {
    pe: 14.2,
    ps: 1.1,
    pb: 1.6,
    evToEbitda: 8.9,
    dividendYield: 3.2
  },
  Utilities: {
    pe: 16.8,
    ps: 2.1,
    pb: 1.7,
    evToEbitda: 11.4,
    dividendYield: 3.5
  },
  'Real Estate': {
    pe: 32.4,
    ps: 7.2,
    pb: 2.1,
    evToEbitda: 18.9,
    dividendYield: 3.8
  },
  'Communication Services': {
    pe: 17.3,
    ps: 2.8,
    pb: 2.9,
    evToEbitda: 12.1,
    dividendYield: 1.2
  },
  'Basic Materials': {
    pe: 15.6,
    ps: 1.3,
    pb: 2.4,
    evToEbitda: 9.8,
    dividendYield: 2.1
  }
};

/**
 * Get sector default for a specific ratio
 */
export function getSectorDefault(
  sector: string,
  ratio: 'pe' | 'ps' | 'pb' | 'evToEbitda' | 'dividendYield'
): number | null {
  const sectorData = SECTOR_DEFAULTS[sector as keyof typeof SECTOR_DEFAULTS];
  if (!sectorData) return null;

  return sectorData[ratio];
}

/**
 * Apply sector defaults to incomplete financial data
 */
export function applySecreactorDefaults(data: any, sector: string): any {
  const enhanced = { ...data };

  // P/E ratio
  if (!enhanced.pe && sector) {
    enhanced.pe = getSectorDefault(sector, 'pe');
    enhanced.peSource = 'sector-average';
  }

  // P/S ratio
  if (!enhanced.ps && sector) {
    enhanced.ps = getSectorDefault(sector, 'ps');
    enhanced.psSource = 'sector-average';
  }

  // P/B ratio
  if (!enhanced.pb && sector) {
    enhanced.pb = getSectorDefault(sector, 'pb');
    enhanced.pbSource = 'sector-average';
  }

  // Dividend Yield
  if (!enhanced.dividendYield && sector) {
    enhanced.dividendYield = getSectorDefault(sector, 'dividendYield');
    enhanced.dividendYieldSource = 'sector-average';
  }

  return enhanced;
}
```

**Usage in IV calculations:**
```typescript
// In intrinsic-value-controller.ts
import { applySecreactorDefaults } from '../utils/sector-defaults';

const financialData = await fmpService.getFinancialData(symbol);
const profile = await fmpService.getCompanyProfile(symbol);

// Apply sector defaults for missing data
const enhancedData = applySecreactorDefaults(financialData, profile.sector);

// Now use enhancedData for calculations
const intrinsicValue = calculateIntrinsicValue(enhancedData, method);
```

---

## Priority 3: Data Freshness Badges

### Problem
Users don't know if data is current or stale.

### Solution
Add visual badges indicating data freshness.

### Implementation

**Backend - Add freshness metadata:**

```typescript
// In FMP service response
interface DataFreshnessMetadata {
  freshness: 'fresh' | 'stale' | 'very-stale';
  dataAgeDays: number;
  lastUpdated: string;
  warning?: string;
}

function calculateDataFreshness(latestDate: string): DataFreshnessMetadata {
  const latest = new Date(latestDate);
  const ageDays = Math.floor((Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24));

  let freshness: 'fresh' | 'stale' | 'very-stale';
  let warning: string | undefined;

  if (ageDays < 30) {
    freshness = 'fresh';
  } else if (ageDays < 90) {
    freshness = 'stale';
    warning = `Data is ${ageDays} days old. Results may be less accurate.`;
  } else {
    freshness = 'very-stale';
    warning = `Data is ${ageDays} days old. Exercise caution with these estimates.`;
  }

  return {
    freshness,
    dataAgeDays: ageDays,
    lastUpdated: latestDate,
    warning
  };
}

// Add to API response
{
  symbol: "AAPL",
  intrinsicValue: 175.23,
  currentPrice: 168.50,
  // ... other fields
  dataFreshness: {
    freshness: "fresh",
    dataAgeDays: 12,
    lastUpdated: "2025-10-14",
    warning: undefined
  }
}
```

**Frontend - Display badges:**

```tsx
// client/src/components/data-freshness-badge.tsx
interface DataFreshnessBadgeProps {
  freshness: 'fresh' | 'stale' | 'very-stale';
  dataAgeDays: number;
  lastUpdated: string;
  warning?: string;
}

export function DataFreshnessBadge({
  freshness,
  dataAgeDays,
  lastUpdated,
  warning
}: DataFreshnessBadgeProps) {
  const getBadgeStyle = () => {
    switch (freshness) {
      case 'fresh':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stale':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'very-stale':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getIcon = () => {
    switch (freshness) {
      case 'fresh':
        return '✓';
      case 'stale':
        return '⚠';
      case 'very-stale':
        return '⚠';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 text-xs font-semibold rounded border ${getBadgeStyle()}`}>
        {getIcon()} {freshness === 'fresh' ? 'Fresh Data' : `${dataAgeDays}d old`}
      </span>
      {warning && (
        <span className="text-xs text-gray-500" title={warning}>
          ℹ️
        </span>
      )}
    </div>
  );
}
```

---

## Priority 4: Limited Data Warning Flag

### Problem
Tier 4 stocks (Grade D/F) produce unreliable estimates but users aren't warned.

### Solution
Add prominent "Limited Data" warning for low-quality stocks.

### Implementation

```typescript
// In intrinsic-value-controller.ts
function calculateDataQualityGrade(data: any): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  limitedData: boolean;
  limitedDataReason?: string;
} {
  let score = 0;

  // Financial statements (30 pts)
  if (data.incomeStatement?.length >= 5) score += 10;
  if (data.balanceSheet?.length >= 5) score += 10;
  if (data.cashFlow?.length >= 5) score += 10;

  // Ratios (25 pts)
  if (data.ratios?.length >= 5) score += 25;

  // Profile (15 pts)
  if (data.profile?.sector) score += 5;
  if (data.profile?.exchange) score += 5;
  if (data.profile?.mktCap > 0) score += 5;

  // Dividends (15 pts)
  if (data.dividends?.historical?.length >= 20) score += 15;

  // Recent data (15 pts)
  const dataAge = calculateDataAgeDays(data);
  if (dataAge < 90) score += 10;
  if (data.profile?.price > 0) score += 5;

  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const limitedData = score < 60;

  let limitedDataReason: string | undefined;
  if (limitedData) {
    const missing: string[] = [];
    if (data.incomeStatement?.length < 5) missing.push('incomplete financial history');
    if (!data.dividends) missing.push('no dividend data');
    if (dataAge > 90) missing.push('stale data');

    limitedDataReason = `Limited data available: ${missing.join(', ')}. Estimates may be unreliable.`;
  }

  return { grade, score, limitedData, limitedDataReason };
}

// Add to API response
{
  symbol: "XYZ",
  intrinsicValue: 12.34,
  dataQuality: {
    grade: "D",
    score: 48,
    limitedData: true,
    limitedDataReason: "Limited data available: incomplete financial history, no dividend data. Estimates may be unreliable."
  }
}
```

**Frontend warning component:**

```tsx
// client/src/components/limited-data-warning.tsx
export function LimitedDataWarning({ reason }: { reason: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="font-semibold text-red-900 mb-1">Limited Data Available</h3>
          <p className="text-sm text-red-800">{reason}</p>
          <p className="text-xs text-red-700 mt-2">
            Intrinsic value estimates may be unreliable. Use these results with caution.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Priority 5: Fallback Cascade Logic

### Problem
Single data source failures cause complete calculation failures.

### Solution
Implement fallback cascade: Quarterly → Annual → TTM → Sector Average.

### Implementation

```typescript
/**
 * Fetch data with comprehensive fallback cascade
 */
async function fetchDataWithFallback(
  symbol: string,
  field: string
): Promise<{ value: any; source: string }> {
  const logger = this.logger;

  // 1. Try quarterly data (most recent)
  try {
    const quarterly = await this.fetchQuarterly(symbol, field);
    if (quarterly) {
      logger.info(`[Fallback] ${symbol} ${field}: Got quarterly data`);
      return { value: quarterly, source: 'quarterly' };
    }
  } catch (error) {
    logger.warn(`[Fallback] ${symbol} ${field}: Quarterly failed, trying annual`);
  }

  // 2. Try annual data
  try {
    const annual = await this.fetchAnnual(symbol, field);
    if (annual) {
      logger.info(`[Fallback] ${symbol} ${field}: Got annual data`);
      return { value: annual, source: 'annual' };
    }
  } catch (error) {
    logger.warn(`[Fallback] ${symbol} ${field}: Annual failed, trying TTM`);
  }

  // 3. Try TTM (Trailing Twelve Months)
  try {
    const ttm = await this.calculateTTM(symbol, field);
    if (ttm) {
      logger.info(`[Fallback] ${symbol} ${field}: Calculated TTM`);
      return { value: ttm, source: 'ttm-calculated' };
    }
  } catch (error) {
    logger.warn(`[Fallback] ${symbol} ${field}: TTM failed, trying sector average`);
  }

  // 4. Use sector average as last resort
  const profile = await this.getCompanyProfile(symbol);
  const sectorDefault = getSectorDefault(profile.sector, field);

  if (sectorDefault !== null) {
    logger.warn(`[Fallback] ${symbol} ${field}: Using sector average (${profile.sector})`);
    return { value: sectorDefault, source: 'sector-average' };
  }

  // 5. Complete failure
  logger.error(`[Fallback] ${symbol} ${field}: All fallbacks exhausted`);
  throw new Error(`Unable to fetch ${field} for ${symbol} (all fallbacks failed)`);
}
```

---

## Testing Checklist

- [ ] **Quarterly Fallback:** Test with recent IPO (e.g., RIVN, LCID)
- [ ] **Sector Defaults:** Test with stock missing P/E ratio
- [ ] **Data Freshness:** Verify badges display correctly (Fresh/Stale/Very Stale)
- [ ] **Limited Data Warning:** Test with Grade D/F stock
- [ ] **Fallback Cascade:** Test with stock having sparse data

---

## Rollout Plan

### Day 1-2: Backend Implementation
- Add quarterly fallback logic
- Implement sector defaults utility
- Add data freshness calculation
- Add data quality grading

### Day 3-4: Frontend Implementation
- Create DataFreshnessBadge component
- Create LimitedDataWarning component
- Update IntrinsicValuePage to show badges/warnings

### Day 5: Testing
- Unit tests for fallback logic
- Integration tests with real stocks
- Manual QA on frontend

### Day 6-7: Deployment & Monitoring
- Deploy to production
- Monitor error rates (should decrease)
- Track method success rates (should increase)
- Collect user feedback

---

## Expected Results

### Before Implementation
- Method success rate: ~85%
- Tier 3 stocks: 254 (17%)
- User complaints: "Missing data errors"

### After Implementation
- Method success rate: ~95% (+10%)
- Tier 3 → Tier 2: ~100 stocks upgraded
- User complaints: Reduced by 50%
- Transparency: Users see data quality clearly

---

## Monitoring & Validation

```typescript
// Add telemetry to track fallback usage
logger.info('[DataQuality] Fallback stats', {
  symbol,
  quarterlySuccess: quarterly ? 1 : 0,
  annualFallback: annual ? 1 : 0,
  ttmFallback: ttm ? 1 : 0,
  sectorDefaultUsed: sectorDefault ? 1 : 0
});

// Track data quality distribution
logger.info('[DataQuality] Grade distribution', {
  gradeA: gradeACount,
  gradeB: gradeBCount,
  gradeC: gradeCCount,
  gradeD: gradeDCount,
  gradeF: gradeFCount
});
```

---

**Timeline:** 1 Week
**Developer Effort:** 16-24 hours
**Cost:** $0 (internal development only)
**Impact:** +100 stocks improved, +10% method success rate

**Status:** ✅ Ready for Implementation

