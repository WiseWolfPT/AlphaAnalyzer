# Defensive Programming Quick Reference

**For Alfalyzer Development Team**

This guide provides patterns and anti-patterns for writing crash-resistant React/TypeScript code.

---

## The Golden Rule

> **NEVER call `.toFixed()` on a value that could be null or undefined**

Every production crash from null values is preventable with defensive programming.

---

## Quick Patterns

### ❌ UNSAFE (Will Crash)

```tsx
// Direct .toFixed() on API data
<div>${price.toFixed(2)}</div>

// Direct .toFixed() on calculations
<span>{changePercent.toFixed(1)}%</span>

// Array access without checks
const firstItem = array[0].value;

// Any types
const data: any = await fetchData();
```

### ✅ SAFE (Crash-Resistant)

```tsx
// Nullish coalescing before .toFixed()
<div>${(price ?? 0).toFixed(2)}</div>

// Safe calculations with fallbacks
<span>{(changePercent ?? 0).toFixed(1)}%</span>

// Optional chaining for array access
const firstItem = array[0]?.value ?? 0;

// Proper typing
const data: PriceData = await fetchData();
```

---

## Common Scenarios

### 1. Displaying Prices

```tsx
// ❌ UNSAFE - Crashes if API returns null
<div className="price">${stock.price.toFixed(2)}</div>

// ✅ SAFE - Always displays valid price
<div className="price">${(stock.price ?? 0).toFixed(2)}</div>

// ✅ BETTER - Shows loading state
{stock.price != null ? (
  <div className="price">${stock.price.toFixed(2)}</div>
) : (
  <div className="price text-muted">Loading...</div>
)}
```

### 2. Percentage Changes

```tsx
// ❌ UNSAFE - Crashes if calculation returns NaN
const changePercent = ((current - previous) / previous) * 100;
<span>{changePercent.toFixed(1)}%</span>

// ✅ SAFE - Handles null, zero, and NaN
const changePercent =
  current != null && previous != null && previous !== 0
    ? ((current - previous) / previous) * 100
    : 0;
<span>{(isFinite(changePercent) ? changePercent : 0).toFixed(1)}%</span>

// ✅ BEST - Use utility function
import { safePercentageChange } from '@/utils/safe-formatting';
const changePercent = safePercentageChange(current, previous);
<span>{changePercent.toFixed(1)}%</span>
```

### 3. Chart Tooltips

```tsx
// ❌ UNSAFE - Crashes if payload data is incomplete
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return <div>${payload[0].value.toFixed(2)}</div>;
  }
  return null;
};

// ✅ SAFE - Defensive extraction
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const value = payload[0]?.value ?? 0;
    return <div>${value.toFixed(2)}</div>;
  }
  return null;
};

// ✅ BEST - Use SafeChartTooltip wrapper
import { SafeChartTooltip } from '@/components/charts/safe-chart-tooltip';
const CustomTooltip = (props: TooltipProps) => (
  <SafeChartTooltip
    {...props}
    formatter={(value) => <div>${value.toFixed(2)}</div>}
  />
);
```

### 4. Volume Formatting

```tsx
// ❌ UNSAFE - Crashes if volume is null
const formatVolume = (volume: number) => {
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  return volume.toFixed(0);
};

// ✅ SAFE - Handles null
const formatVolume = (volume: number | null | undefined) => {
  const safeVolume = volume ?? 0;
  if (safeVolume >= 1e6) return `${(safeVolume / 1e6).toFixed(1)}M`;
  return safeVolume.toFixed(0);
};

// ✅ BEST - Use utility
import { formatVolume } from '@/utils/safe-formatting';
<div>Volume: {formatVolume(stock.volume)}</div>
```

### 5. Array Access

```tsx
// ❌ UNSAFE - Crashes if array is empty
const latestPrice = priceData[0].close;

// ✅ SAFE - Optional chaining + nullish coalescing
const latestPrice = priceData[0]?.close ?? 0;

// ✅ BETTER - Check array length first
const latestPrice = priceData.length > 0
  ? priceData[0].close ?? 0
  : 0;
```

### 6. WebSocket/Real-time Data

```tsx
// ❌ UNSAFE - WebSocket can send incomplete data
const RealtimePrice = ({ quote }: { quote: Quote }) => (
  <div>${quote.price.toFixed(2)}</div>
);

// ✅ SAFE - Always defensive with real-time data
const RealtimePrice = ({ quote }: { quote: Quote }) => (
  <div>${(quote?.price ?? 0).toFixed(2)}</div>
);

// ✅ BEST - Show connection state
const RealtimePrice = ({ quote, isConnected }: Props) => {
  if (!isConnected || quote?.price == null) {
    return <div className="text-muted">Connecting...</div>;
  }
  return <div>${quote.price.toFixed(2)}</div>;
};
```

---

## Utility Functions (Reusable)

Create `/client/src/utils/safe-formatting.ts`:

```typescript
/**
 * Safely formats a number with fixed decimals
 * Handles null, undefined, NaN, Infinity
 */
export function safeToFixed(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value == null || !isFinite(value)) {
    return (0).toFixed(decimals);
  }
  return value.toFixed(decimals);
}

/**
 * Safely calculates percentage change
 * Handles division by zero and null values
 */
export function safePercentageChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number {
  if (current == null || previous == null || previous === 0) {
    return 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Formats volume with M/B/K suffixes
 */
export function formatVolume(
  volume: number | null | undefined
): string {
  const safe = volume ?? 0;
  if (safe >= 1e9) return `${safeToFixed(safe / 1e9, 1)}B`;
  if (safe >= 1e6) return `${safeToFixed(safe / 1e6, 1)}M`;
  if (safe >= 1e3) return `${safeToFixed(safe / 1e3, 1)}K`;
  return safeToFixed(safe, 0);
}

/**
 * Formats market cap with proper suffixes
 */
export function formatMarketCap(
  marketCap: number | null | undefined
): string {
  const safe = marketCap ?? 0;
  if (safe >= 1e12) return `$${safeToFixed(safe / 1e12, 2)}T`;
  if (safe >= 1e9) return `$${safeToFixed(safe / 1e9, 2)}B`;
  if (safe >= 1e6) return `$${safeToFixed(safe / 1e6, 2)}M`;
  return `$${safeToFixed(safe, 2)}`;
}
```

---

## Error Handling

### ❌ UNSAFE (Loses Type Info)

```typescript
try {
  const data = await fetchData();
} catch (error: any) {
  console.error(error.message); // error could be anything
}
```

### ✅ SAFE (Type Guards)

```typescript
try {
  const data = await fetchData();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Type Safety

### ❌ AVOID `any`

```typescript
// Bypasses all TypeScript safety
interface Props {
  data: any;
  handler: (value: any) => any;
}
```

### ✅ USE PROPER TYPES

```typescript
// Explicit types catch errors at compile time
interface Props {
  data: PriceData;
  handler: (value: number) => void;
}

// Use generics for flexibility
interface Props<T> {
  data: T;
  handler: (value: T) => void;
}
```

---

## Code Review Checklist

Before approving a PR, check for:

- [ ] All `.toFixed()` calls have nullish coalescing: `(value ?? 0).toFixed(2)`
- [ ] Array access uses optional chaining: `array[0]?.property`
- [ ] No `any` types (unless absolutely necessary with comment justification)
- [ ] Error handling uses `unknown` type + type guards
- [ ] WebSocket/API data always validated before use
- [ ] Percentage calculations handle division by zero
- [ ] Loading states shown when data is null

---

## ESLint Configuration

Add to `.eslintrc.json`:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-non-null-assertion": "error"
  }
}
```

---

## Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
# Check for unsafe .toFixed() patterns
if git diff --cached --name-only | grep -q '\.tsx\?$'; then
  FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$')

  for FILE in $FILES; do
    if grep -E '\.toFixed\(' "$FILE" | grep -qv '??'; then
      echo "❌ ERROR: $FILE has unsafe .toFixed() without null checks"
      echo "Use: (value ?? 0).toFixed(2)"
      exit 1
    fi
  done
fi
```

---

## Testing Defensive Code

```typescript
import { safeToFixed, safePercentageChange } from './safe-formatting';

describe('Defensive formatting', () => {
  it('handles null gracefully', () => {
    expect(safeToFixed(null)).toBe('0.00');
    expect(safePercentageChange(null, 100)).toBe(0);
  });

  it('handles NaN', () => {
    expect(safeToFixed(NaN)).toBe('0.00');
    expect(safeToFixed(Infinity)).toBe('0.00');
  });

  it('handles division by zero', () => {
    expect(safePercentageChange(100, 0)).toBe(0);
  });
});
```

---

## Real-world Examples from Codebase

### Before (Unsafe)

```tsx
// components/stock/valuation-gauge.tsx (CRASHED IN PRODUCTION)
<div className="text-3xl font-bold">
  ${iv.toFixed(2)}  {/* ❌ Crashed when iv was null */}
</div>
```

### After (Safe)

```tsx
// components/stock/valuation-gauge.tsx (FIXED)
<div className="text-3xl font-bold">
  ${(iv ?? 0).toFixed(2)}  {/* ✅ Never crashes */}
</div>
```

---

## When to Be Extra Defensive

**ALWAYS be defensive when:**
- 📡 Displaying API data (FMP, Alpha Vantage, etc.)
- 🔌 Handling WebSocket messages (real-time quotes)
- 📁 Processing user uploads (CSV imports)
- 🧮 Performing calculations (could produce NaN)
- 📊 Rendering chart data (incomplete datasets)
- 🔄 Working with arrays (could be empty)

**Less critical (but still recommended):**
- 📝 Debug logs / console output
- 🧪 Test mock data (already validated)
- ⚙️ Internal computed values (from guaranteed sources)

---

## Summary

1. **Always use `(value ?? 0).toFixed(2)` for API/WebSocket data**
2. **Check arrays before accessing: `array[0]?.property ?? defaultValue`**
3. **Avoid `any` type - use proper interfaces or `unknown` + type guards**
4. **Create reusable utilities for common formatting patterns**
5. **Test edge cases: null, undefined, NaN, Infinity, empty arrays**
6. **Use ESLint + pre-commit hooks to enforce rules**

---

**Remember:** Every crash prevented is a better user experience. Defensive programming is not paranoia—it's professionalism.

**Last updated:** 2025-10-28
**Maintained by:** Alfalyzer Dev Team
