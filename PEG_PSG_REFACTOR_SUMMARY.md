# PEG & PSG Refactoring Summary

## Overview
Refactored `calculatePEG()` and `calculatePSG()` methods in `/server/services/valuation-service.ts` to return rich response objects instead of simple numbers.

## Test-Driven Development Approach

### Test Specifications

#### calculatePEG() Tests
```typescript
describe('calculatePEG', () => {
  it('should return PEGValuationResponse with all required fields', async () => {
    const result = await valuationService.calculatePEG('AAPL');

    expect(result).toBeDefined();
    expect(result.ticker).toBe('AAPL');
    expect(result.iv).toBeGreaterThan(0);
    expect(result.currentPrice).toBeGreaterThan(0);
    expect(result.epsWithoutNRI).toBeGreaterThan(0);
    expect(result.peWithoutNRI).toBeGreaterThan(0);
    expect(result.epsGrowthRate).toBeDefined();
    expect(result.pegRatio).toBeGreaterThan(0);
    expect(result.fairPegRatio).toBe(1.5); // Default editable value
    expect(result.confidence).toBe('MED');
    expect(result.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should calculate PEG ratio correctly', async () => {
    // PEG = (P/E) / (Growth Rate × 100)
    const result = await valuationService.calculatePEG('AAPL');
    const expectedPeg = result.peWithoutNRI / (result.epsGrowthRate * 100);
    expect(result.pegRatio).toBeCloseTo(expectedPeg, 4);
  });

  it('should calculate intrinsic value using fair PEG ratio', async () => {
    // IV = Fair_PEG × (Growth Rate × 100) × EPS
    const result = await valuationService.calculatePEG('AAPL');
    const expectedIV = result.fairPegRatio * (result.epsGrowthRate * 100) * result.epsWithoutNRI;
    expect(result.iv).toBeCloseTo(expectedIV, 2);
  });

  it('should return null for invalid ticker', async () => {
    const result = await valuationService.calculatePEG('INVALID');
    expect(result).toBeNull();
  });

  it('should cache result for 24 hours', async () => {
    const result1 = await valuationService.calculatePEG('AAPL');
    const result2 = await valuationService.calculatePEG('AAPL');
    expect(result1).toEqual(result2);
  });
});
```

#### calculatePSG() Tests
```typescript
describe('calculatePSG', () => {
  it('should return PSGValuationResponse with all required fields', async () => {
    const result = await valuationService.calculatePSG('AAPL');

    expect(result).toBeDefined();
    expect(result.ticker).toBe('AAPL');
    expect(result.iv).toBeGreaterThan(0);
    expect(result.currentPrice).toBeGreaterThan(0);
    expect(result.salesPerShare).toBeGreaterThan(0);
    expect(result.psRatio).toBeGreaterThan(0);
    expect(result.revenueGrowthRate).toBeDefined();
    expect(result.psgRatio).toBeGreaterThan(0);
    expect(result.fairPsgRatio).toBe(0.2); // Default editable value (conservative)
    expect(result.confidence).toBe('MED');
    expect(result.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should calculate PSG ratio correctly', async () => {
    // PSG = (P/S) / (Growth Rate × 100)
    const result = await valuationService.calculatePSG('AAPL');
    const expectedPsg = result.psRatio / (result.revenueGrowthRate * 100);
    expect(result.psgRatio).toBeCloseTo(expectedPsg, 4);
  });

  it('should calculate intrinsic value using fair PSG ratio', async () => {
    // IV = Fair_PSG × (Growth Rate × 100) × Sales per Share
    const result = await valuationService.calculatePSG('AAPL');
    const expectedIV = result.fairPsgRatio * (result.revenueGrowthRate * 100) * result.salesPerShare;
    expect(result.iv).toBeCloseTo(expectedIV, 2);
  });

  it('should use 3-year CAGR for revenue growth', async () => {
    const result = await valuationService.calculatePSG('AAPL');
    // Growth rate should be reasonable (e.g., between -50% and 100%)
    expect(result.revenueGrowthRate).toBeGreaterThan(-0.5);
    expect(result.revenueGrowthRate).toBeLessThan(1.0);
  });

  it('should return null for companies with insufficient revenue history', async () => {
    // Companies with less than 4 years of data should return null
    const result = await valuationService.calculatePSG('IPO_STOCK');
    expect(result).toBeNull();
  });
});
```

## Implementation Changes

### 1. Import Additions (Line 38-41)

**BEFORE:**
```typescript
  DNI20Response,
  DFCFTerminalResponse,
  PEValuationResponse,
} from '../types/valuation';
```

**AFTER:**
```typescript
  DNI20Response,
  DFCFTerminalResponse,
  PEValuationResponse,
  PEGValuationResponse,
  PSGValuationResponse,
} from '../types/valuation';
```

### 2. calculatePEG() Method (Lines ~1078-1134)

**BEFORE:**
- Returns: `Promise<number | null>`
- Only cached the IV number
- No metadata about calculation inputs

**AFTER:**
- Returns: `Promise<PEGValuationResponse | null>`
- Caches the full response object
- Includes all calculation inputs for UI dropdowns

**Key Additions:**
1. `currentPrice` - fetched from `simpleCacheService.getQuote()`
2. `epsWithoutNRI` - renamed from `epsTTM` for clarity
3. `peWithoutNRI` - calculated as `currentPrice / epsWithoutNRI`
4. `epsGrowthRate` - renamed from `growthRate` for clarity
5. `pegRatio` - calculated as `peWithoutNRI / (epsGrowthRate × 100)`
6. `fairPegRatio` - default 1.5 (user-editable)
7. `confidence` - always 'MED'
8. `as_of` - calculation date in ISO format

**Formula Preserved:**
```typescript
IV = FAIR_PEG × (epsGrowthRate × 100) × epsWithoutNRI
```

### 3. calculatePSG() Method (Lines ~1136-1210)

**BEFORE:**
- Returns: `Promise<number | null>`
- Only cached the IV number
- No metadata about calculation inputs

**AFTER:**
- Returns: `Promise<PSGValuationResponse | null>`
- Caches the full response object
- Includes all calculation inputs for UI dropdowns

**Key Additions:**
1. `currentPrice` - fetched from `simpleCacheService.getQuote()`
2. `salesPerShare` - renamed from `revenuePerShareTTM` for clarity
3. `psRatio` - calculated as `currentPrice / salesPerShare`
4. `revenueGrowthRate` - renamed from `revenueCAGR` for clarity
5. `psgRatio` - calculated as `psRatio / (revenueGrowthRate × 100)`
6. `fairPsgRatio` - default 0.2 (user-editable, conservative)
7. `confidence` - always 'MED'
8. `as_of` - calculation date in ISO format

**Formula Preserved:**
```typescript
IV = FAIR_PSG × (revenueGrowthRate × 100) × salesPerShare
```

## Type Definitions (Already in `/server/types/valuation.ts`)

### PEGValuationResponse (Lines 648-659)
```typescript
export interface PEGValuationResponse {
  ticker: string;
  iv: number;
  currentPrice: number;
  epsWithoutNRI: number;
  peWithoutNRI: number;
  epsGrowthRate: number;
  pegRatio: number;
  fairPegRatio: number;    // Default 1.5 (editável)
  confidence: ValuationConfidence;
  as_of: string;
}
```

### PSGValuationResponse (Lines 664-675)
```typescript
export interface PSGValuationResponse {
  ticker: string;
  iv: number;
  currentPrice: number;
  salesPerShare: number;
  psRatio: number;
  revenueGrowthRate: number;
  psgRatio: number;
  fairPsgRatio: number;    // Default 0.2 (editável)
  confidence: ValuationConfidence;
  as_of: string;
}
```

## Critical Implementation Notes

### 1. EPS Without NRI
- **Field:** `epsWithoutNRI`
- **Source:** `keyMetricsTTM[0].netIncomePerShareTTM`
- **NOT** raw EPS with non-recurring items included
- This ensures clean earnings calculation

### 2. PE Without NRI
- **Field:** `peWithoutNRI`
- **Calculation:** `currentPrice / epsWithoutNRI`
- Uses adjusted EPS (without NRI) for accurate P/E ratio

### 3. Revenue Growth Rate
- **Field:** `revenueGrowthRate`
- **Method:** 3-year CAGR
- **Formula:** `Math.pow(revenues[0] / revenues[3], 1/3) - 1`
- **Not** 5-year like EPS growth

### 4. Fair Ratios are DEFAULTS
- **PEG:** `fairPegRatio = 1.5` (industry standard)
- **PSG:** `fairPsgRatio = 0.2` (conservative benchmark)
- These are **editable by user** in future UI implementations

## Backward Compatibility

### Breaking Changes
Methods now return objects instead of numbers. Callers must be updated:

**BEFORE:**
```typescript
const iv = await valuationService.calculatePEG('AAPL');
console.log(`IV: $${iv}`);
```

**AFTER:**
```typescript
const result = await valuationService.calculatePEG('AAPL');
console.log(`IV: $${result.iv}`);
console.log(`PEG Ratio: ${result.pegRatio}`);
console.log(`Fair PEG: ${result.fairPegRatio}`);
```

### Cache Impact
- Cache keys remain the same (e.g., `iv:calc:AAPL:peg`)
- Cache now stores full response object instead of just number
- TTL remains 24 hours (86400 seconds)
- Old cached numbers will be replaced on next fetch

## Files Modified

1. `/server/services/valuation-service.ts`
   - Line 38-41: Added imports
   - Lines ~1078-1163: `calculatePEG()` refactored
   - Lines ~1165-1227: `calculatePSG()` refactored

2. `/server/types/valuation.ts`
   - No changes needed (types already defined)

## Benefits

### 1. UI Dropdowns
Frontend can now display:
- Current Price vs Intrinsic Value
- Actual PEG/PSG ratios vs Fair benchmarks
- All calculation inputs for transparency

### 2. Educational Value
Users can see:
- How growth rates are calculated
- What fair ratios are being used
- Complete calculation methodology

### 3. Customization
Future UI can allow:
- Editing fairPegRatio (default 1.5)
- Editing fairPsgRatio (default 0.2)
- Comparing different scenarios

### 4. Consistency
Matches pattern used in:
- `DNI20Response`
- `DFCFTerminalResponse`
- Other valuation methods

## Validation Checklist

- [x] Types defined in `/server/types/valuation.ts`
- [x] Imports added to valuation-service.ts
- [x] calculatePEG() refactored with new signature
- [x] calculatePSG() refactored with new signature
- [x] All required fields populated
- [x] Formulas preserved exactly
- [x] Cache updated to store full objects
- [x] Logging enhanced with new fields
- [ ] Unit tests written and passing
- [ ] Integration tests updated
- [ ] API endpoints updated to use new response
- [ ] Frontend components updated to consume new response

## Next Steps

1. **Write Unit Tests** (TDD approach)
   - Create test file: `server/services/__tests__/valuation-service.peg-psg.test.ts`
   - Implement all test cases shown above
   - Ensure 100% coverage of new fields

2. **Update API Endpoints**
   - Check `/server/routes/valuation-routes.ts` (or equivalent)
   - Update any endpoint that calls `calculatePEG()` or `calculatePSG()`

3. **Frontend Integration**
   - Update hooks/services that fetch PEG/PSG data
   - Create UI dropdowns to display new fields
   - Add fair ratio editing capability

4. **Documentation**
   - Update API documentation with new response shapes
   - Create user guide explaining PEG/PSG calculations
   - Document fair ratio defaults and customization

## Code Reference

Full refactored implementations are available in:
`/server/services/valuation-service-peg-psg-patch.ts`

This file contains the complete methods ready to copy-paste if needed.

---

**Last Updated:** 2025-10-21
**Status:** Implementation Complete, Testing Pending
**Breaking Change:** Yes (return type changed from number to object)
