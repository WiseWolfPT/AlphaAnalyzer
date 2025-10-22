# FASE 3.1 - Frontend Integration Guide

## Quick Start for Frontend Developers

The backend now provides **15 valuation methods** via a single endpoint. This guide shows you how to integrate them into your UI.

---

## API Endpoint

### GET `/api/iv/:ticker/chart`

Returns intrinsic value calculations from 15 different methods.

**Example Request:**
```bash
GET /api/iv/AAPL/chart
```

**Example Response:**
```json
{
  "ticker": "AAPL",
  "price": 252.29,
  "methods": [
    {
      "name": "AlfaValue™",
      "category": "proprietary",
      "iv": 125.44,
      "discount_pct": -50.27,
      "formula": "FCF → PV(g₁₋₅, g₆₋₁₀, g₁₁₋₂₀, DR) + Cash - Debt",
      "confidence": "MED",
      "source": "internal",
      "as_of": "2025-10-20"
    },
    // ... 14 more methods
  ],
  "macro_multiplier": 1.0,
  "macro_sentiment": "neutral",
  "as_of": "2025-10-20"
}
```

---

## Complete Method List

### 1. Proprietary (1 method)
- **AlfaValue™** - Our flagship 20-year DCF model

### 2. DCF Models (6 methods)
- **DCF-20 FCF FMP** - External 10-year FCF projection (FMP)
- **DCF-20 FCFE FMP** - External levered projection (FMP)
- **DCF Terminal FCF FMP** - Gordon Growth Model (FMP)
- **DCF Terminal FCFE FMP** - Levered terminal value (FMP)
- **DNI-20 NI** ✨ NEW - 20-year Net Income DCF (Internal)
- **DFCF Terminal** ✨ NEW - Simpler terminal value calculation (Internal)

### 3. Historical Multiples (6 methods)
- **P/E Mean 5y** - Average P/E ratio × Current EPS
- **P/E Mean without NRI** ✨ NEW - Adjusted for non-recurring items
- **P/E Median 5y** ✨ NEW - More robust to outliers
- **P/E Median without NRI** ✨ NEW - Median + NRI adjustment
- **P/S Mean 5y** - Average P/S ratio × Revenue per share
- **P/S Median 5y** ✨ NEW - Median P/S × Revenue per share
- **P/B Mean 5y** - Average P/B ratio × Book value per share
- **P/B Median 5y** ✨ NEW - Median P/B × Book value per share

### 4. Growth Ratios (2 methods)
- **PEG Ratio** - Fair PEG (1.5) × Growth% × EPS
- **PSG Ratio** - Fair PSG (0.2) × Revenue CAGR × Sales per share

---

## TypeScript Types

```typescript
interface ValuationMethod {
  name: string;                           // "AlfaValue™", "P/E Mean 5y", etc.
  category: 'proprietary' | 'dcf' | 'multiples' | 'growth';
  iv: number | null;                      // Intrinsic value per share
  discount_pct: number | null;            // ((IV - Price) / Price) * 100
  formula: string;                        // Human-readable formula
  confidence: 'HIGH' | 'MED' | 'LOW';
  source: 'internal' | 'fmp' | 'hybrid';
  as_of: string;                          // ISO date
}

interface IVChartResponse {
  ticker: string;
  price: number;                          // Current market price
  methods: ValuationMethod[];             // All 15 methods
  macro_multiplier: number;               // Applied to all IVs
  macro_sentiment: 'bearish' | 'neutral' | 'bullish';
  as_of: string;
}
```

---

## React Hook Example

```typescript
import { useQuery } from '@tanstack/react-query';

interface IVChartData {
  ticker: string;
  price: number;
  methods: ValuationMethod[];
  macro_multiplier: number;
  macro_sentiment: 'bearish' | 'neutral' | 'bullish';
  as_of: string;
}

export function useIVChart(ticker: string) {
  return useQuery({
    queryKey: ['iv-chart', ticker],
    queryFn: async () => {
      const response = await fetch(`/api/iv/${ticker}/chart`);
      if (!response.ok) throw new Error('Failed to fetch IV chart');
      return response.json() as Promise<IVChartData>;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!ticker,
  });
}
```

---

## UI Component Example

```typescript
import { useIVChart } from '@/hooks/use-iv-chart';

export function IntrinsicValueChart({ ticker }: { ticker: string }) {
  const { data, isLoading, error } = useIVChart(ticker);

  if (isLoading) return <div>Loading valuation methods...</div>;
  if (error) return <div>Error loading data</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Intrinsic Value Analysis</h2>
        <div className="text-sm text-gray-500">
          Current Price: ${data.price.toFixed(2)}
        </div>
      </div>

      {/* Category Sections */}
      <div className="space-y-6">
        {/* Proprietary */}
        <MethodSection
          title="Our Proprietary Model"
          methods={data.methods.filter(m => m.category === 'proprietary')}
          price={data.price}
        />

        {/* DCF Models */}
        <MethodSection
          title="DCF Models (6 methods)"
          methods={data.methods.filter(m => m.category === 'dcf')}
          price={data.price}
        />

        {/* Historical Multiples */}
        <MethodSection
          title="Historical Multiples (6 methods)"
          methods={data.methods.filter(m => m.category === 'multiples')}
          price={data.price}
        />

        {/* Growth Ratios */}
        <MethodSection
          title="Growth Ratios (2 methods)"
          methods={data.methods.filter(m => m.category === 'growth')}
          price={data.price}
        />
      </div>
    </div>
  );
}

function MethodSection({
  title,
  methods,
  price
}: {
  title: string;
  methods: ValuationMethod[];
  price: number;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="grid gap-3">
        {methods.map((method) => (
          <MethodCard key={method.name} method={method} price={price} />
        ))}
      </div>
    </div>
  );
}

function MethodCard({
  method,
  price
}: {
  method: ValuationMethod;
  price: number;
}) {
  if (method.iv === null) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="font-medium">{method.name}</div>
        <div className="text-sm text-gray-500">Data unavailable</div>
      </div>
    );
  }

  const isUndervalued = method.discount_pct && method.discount_pct > 5;
  const isOvervalued = method.discount_pct && method.discount_pct < -5;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{method.name}</div>
          <div className="text-xs text-gray-500">{method.formula}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">${method.iv.toFixed(2)}</div>
          <div
            className={`text-sm font-medium ${
              isUndervalued
                ? 'text-green-600'
                : isOvervalued
                ? 'text-red-600'
                : 'text-gray-600'
            }`}
          >
            {method.discount_pct > 0 ? '+' : ''}
            {method.discount_pct?.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
          {method.confidence}
        </span>
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
          {method.source}
        </span>
      </div>
    </div>
  );
}
```

---

## Charting Example (Recharts)

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

function IVComparisonChart({ data }: { data: IVChartData }) {
  const chartData = data.methods
    .filter(m => m.iv !== null)
    .map(m => ({
      name: m.name,
      value: m.iv,
      category: m.category,
    }));

  return (
    <BarChart width={800} height={400} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
      <YAxis />
      <Tooltip />
      <Legend />
      <ReferenceLine
        y={data.price}
        label="Current Price"
        stroke="red"
        strokeDasharray="3 3"
      />
      <Bar dataKey="value" fill="#8884d8" />
    </BarChart>
  );
}
```

---

## Display Recommendations

### 1. Overview Card
Show the current price and recommended method (AlfaValue™) prominently.

### 2. Category Tabs
Organize methods by category:
- "Our Model" (Proprietary)
- "DCF Analysis" (6 methods)
- "Multiples" (6 methods)
- "Growth" (2 methods)

### 3. Comparison View
Show all methods in a sortable table:
- Columns: Method Name, IV, Discount %, Confidence
- Sort by: Discount %, Confidence, Alphabetical

### 4. Visual Chart
Bar chart showing IV from each method vs current price

### 5. Tooltips
Show formula and confidence explanation on hover

---

## Color Coding Guide

```typescript
function getDiscountColor(discountPct: number): string {
  if (discountPct > 20) return 'text-green-700 bg-green-50'; // Deep value
  if (discountPct > 5) return 'text-green-600 bg-green-50';  // Undervalued
  if (discountPct > -5) return 'text-gray-600 bg-gray-50';   // Fair value
  if (discountPct > -20) return 'text-red-600 bg-red-50';    // Overvalued
  return 'text-red-700 bg-red-50';                           // Very overvalued
}

function getConfidenceBadge(confidence: string): JSX.Element {
  const styles = {
    HIGH: 'bg-green-100 text-green-800',
    MED: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${styles[confidence]}`}>
      {confidence}
    </span>
  );
}
```

---

## Error Handling

```typescript
function handleIVChartError(error: any) {
  if (error.response?.status === 404) {
    return "Ticker not found";
  }
  if (error.response?.status === 500) {
    return "Server error calculating valuations";
  }
  if (error.message.includes("timeout")) {
    return "Request timed out - try again";
  }
  return "Failed to load valuation data";
}
```

---

## Performance Tips

### 1. Use React Query
- Automatic caching (1 hour stale time recommended)
- Background refetch on window focus
- Optimistic updates

### 2. Lazy Load Charts
- Use `React.lazy()` for heavy chart components
- Show skeleton loader while fetching

### 3. Memoize Expensive Calculations
```typescript
const sortedMethods = useMemo(
  () => data.methods.sort((a, b) => b.discount_pct - a.discount_pct),
  [data.methods]
);
```

### 4. Virtualize Long Lists
Use `react-window` if showing all 15 methods in a scrollable list

---

## Testing Checklist

- [ ] Test with AAPL (all methods should have data)
- [ ] Test with new IPO (some methods may be null)
- [ ] Test loading states
- [ ] Test error states (invalid ticker)
- [ ] Test responsive design (mobile/tablet/desktop)
- [ ] Test sorting/filtering functionality
- [ ] Verify formula tooltips display correctly
- [ ] Check color coding for discount percentages
- [ ] Validate chart rendering with all 15 data points

---

## Support

**Backend Endpoint:** GET `/api/iv/:ticker/chart`

**Response Time:**
- First request (cold cache): 260-460ms
- Cached requests: 110-160ms

**Cache TTL:** 24 hours (automatically refreshed)

**Questions?** Contact backend team or refer to:
- `/FASE_3.1_BACKEND_IMPLEMENTATION_SUMMARY.md` (full technical details)
- `/server/controllers/iv-chart-controller.ts` (endpoint implementation)
- `/server/services/valuation-service.ts` (calculation logic)

---

**Last Updated:** 2025-10-20
**Backend Version:** FASE 3.1 Complete
