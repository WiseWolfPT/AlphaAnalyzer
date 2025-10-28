# FinancialInputsDynamic Component Usage Guide

## Overview
`FinancialInputsDynamic` is a React component that dynamically renders method-specific financial inputs based on valuation category (DCF, Growth-Adjusted, or Multiples).

## Location
`/client/src/components/stock/financial-inputs-dynamic.tsx`

## Component Props

```typescript
interface FinancialInputsDynamicProps {
  inputs: MappedInputs;           // From useMethodInputMapper hook
  mode: 'auto' | 'manual';        // Display mode
  onInputChange?: (field: string, value: number | boolean) => void;
  readonly?: boolean;              // Force read-only
}
```

## Usage Example

```tsx
import { FinancialInputsDynamic } from '@/components/stock/financial-inputs-dynamic';
import { useMethodInputMapper } from '@/hooks/useMethodInputMapper';

function IntrinsicValuePage() {
  const [selectedMethod, setSelectedMethod] = useState('alfavalue');
  const [calculationMode, setCalculationMode] = useState<'auto' | 'manual'>('auto');
  
  const valuationChartData = useQuery({
    queryKey: ['valuation-chart', ticker],
    queryFn: () => fetch(`/api/iv/${ticker}/chart`).then(r => r.json())
  });
  
  // Get typed inputs based on selected method
  const mappedInputs = useMethodInputMapper(
    selectedMethod,
    valuationChartData.data,
    null // alfaValueData deprecated
  );
  
  const handleInputChange = (field: string, value: number | boolean) => {
    console.log(`User changed ${field} to ${value}`);
    // Update manual calculations here
  };
  
  return (
    <FinancialInputsDynamic
      inputs={mappedInputs}
      mode={calculationMode}
      onInputChange={handleInputChange}
    />
  );
}
```

## Rendered Fields by Category

### DCF Methods (AlfaValue, DCF-20 variants, DFCF, DNI)
**Editable in Manual Mode:**
- Operating CF (millions)
- Total Debt (millions) + Deduct checkbox
- Cash & ST Investments (millions) + Add checkbox
- Discount Rate (%)
- Shares Outstanding (millions)
- Growth Rate Year 1-5 (%)
- Growth Rate Year 6-10 (%)
- Growth Rate Year 11-20 (%)

**Auto Mode:** All fields read-only

### Growth-Adjusted Methods (PEG, PSG)
**Editable in Manual Mode:**
- Fair PEG/PSG Ratio (user-defined benchmark)

**Always Read-Only:**
- Last Price ($)
- EPS without NRI / Sales per Share ($)
- Growth Rate (%)
- P/E Ratio (calculated)
- PEG/PSG Ratio (calculated)

### Multiples Methods (P/E Mean/Median, P/S, P/B)
**Always Read-Only:**
- Mean/Median Ratio (5-year average)
- Current Price ($)
- EPS / Sales / Book Value per Share ($)
- Historical Ratios (5 years visualization)

## Type Safety
Component uses TypeScript discriminated unions for type-safe rendering:

```typescript
if (inputs.type === 'dcf') {
  // TypeScript narrows to DCFInputs
  inputs.operatingCF; // ✅ Available
  inputs.fairRatio;   // ❌ Type error
}

if (inputs.type === 'growth-adjusted') {
  // TypeScript narrows to GrowthAdjustedInputs
  inputs.fairRatio;   // ✅ Available
  inputs.operatingCF; // ❌ Type error
}

if (inputs.type === 'multiples') {
  // TypeScript narrows to MultiplesInputs
  inputs.ratio;       // ✅ Available
  inputs.fairRatio;   // ❌ Type error
}
```

## Integration Points

### 1. Replace Old Static Component
**Before:**
```tsx
<FinancialInputsCard
  alfaValueData={alfaValueData}
  calculationMode={calculationMode}
/>
```

**After:**
```tsx
<FinancialInputsDynamic
  inputs={useMethodInputMapper(selectedMethod, chartData, null)}
  mode={calculationMode}
  onInputChange={handleInputChange}
/>
```

### 2. Hook Integration
Always use `useMethodInputMapper` to get properly typed inputs:

```tsx
const mappedInputs = useMethodInputMapper(
  'pe-mean',           // method_id
  valuationChartData,  // data from /api/iv/:ticker/chart
  null                 // alfaValueData (deprecated, always pass null)
);

// mappedInputs.type === 'multiples'
// mappedInputs.ratio, mappedInputs.currentPrice, etc. are type-safe
```

## Success Criteria ✅

- ✅ Component renders based on `inputs.type` discriminated union
- ✅ DCF shows: Operating CF, Debt, Cash, Discount Rate, 3 Growth Rates
- ✅ Growth shows: Fair Ratio (editable), Last Price, Metric, Growth Rate
- ✅ Multiples shows: Ratio (read-only), Current Price, Metric/Share, Historical Ratios
- ✅ TypeScript compilation successful
- ✅ No `alfaValueData` fallback anywhere
- ✅ Auto mode = all read-only
- ✅ Manual mode = editable fields where applicable

## Related Files
- Hook: `/client/src/hooks/useMethodInputMapper.ts`
- Types: Defined in hook file (DCFInputs, GrowthAdjustedInputs, MultiplesInputs)
- Utilities: `/client/src/lib/utils.ts` (formatNumber helper)
- UI Components: `/client/src/components/ui/` (card, label, input, checkbox)

## Testing Checklist
1. Select AlfaValue → Should show DCF fields
2. Select PEG → Should show Growth-Adjusted fields with Fair PEG Ratio
3. Select P/E Mean → Should show Multiples fields with 5Y average
4. Toggle Auto/Manual mode → Fields should become editable/read-only
5. Edit field in Manual mode → onInputChange callback should fire
6. Check TypeScript compilation → No type errors

