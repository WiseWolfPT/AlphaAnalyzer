import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

/**
 * Valuation method data structure
 */
export interface ValuationMethod {
  name: string; // Method name (e.g., "AlfaValue™", "DCF-20 (FCF)")
  method_id: string; // Frontend identifier (kebab-case, e.g., "peg", "pe-mean")
  iv: number; // Intrinsic value calculated by this method
  discount_pct: number; // (IV - Price) / Price * 100
  category: 'proprietary' | 'dcf' | 'multiples' | 'growth'; // Method category
  confidence?: 'HIGH' | 'MED' | 'LOW'; // Confidence level
  formula?: string; // Short formula description
  inputs?: Record<string, string | number>; // Key inputs for tooltip
  description?: string; // Method description
}

/**
 * Props for ValuationMethodsChart component
 */
export interface ValuationMethodsChartProps {
  methods: ValuationMethod[]; // Array of valuation methods to display
  currentPrice: number; // Current stock price
  highlightMethod?: string; // Method name to highlight (e.g., "AlfaValue™")
  className?: string;
}

/**
 * Category colors for grouping
 */
const CATEGORY_COLORS = {
  proprietary: '#10b981', // Green (Teya Green)
  dcf: '#3b82f6', // Blue
  multiples: '#8b5cf6', // Purple
  growth: '#f59e0b', // Amber
};

/**
 * Category labels for legend
 */
const CATEGORY_LABELS = {
  proprietary: 'Proprietary',
  dcf: 'DCF Models',
  multiples: 'Historical Multiples',
  growth: 'Growth-Adjusted',
};

/**
 * Custom tooltip component for detailed method information
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload;
  const method: ValuationMethod = data.method;

  return (
    <div className="bg-background border border-border rounded-lg p-4 shadow-lg max-w-xs">
      <div className="space-y-2">
        <div className="font-bold text-foreground">{method.name}</div>

        {method.description && (
          <p className="text-xs text-muted-foreground">{method.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Intrinsic Value:</div>
          <div className="font-semibold text-right">
            ${method.iv.toFixed(2)}
          </div>

          <div className="text-muted-foreground">vs Current Price:</div>
          <div className={`font-semibold text-right ${
            method.discount_pct > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {method.discount_pct > 0 ? '+' : ''}{method.discount_pct.toFixed(1)}%
          </div>
        </div>

        {method.formula && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">Formula:</div>
            <div className="text-xs font-mono bg-secondary/30 p-2 rounded">
              {method.formula}
            </div>
          </div>
        )}

        {method.inputs && Object.keys(method.inputs).length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">Key Inputs:</div>
            <div className="space-y-1">
              {Object.entries(method.inputs).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {method.confidence && (
          <div className="pt-2 border-t border-border">
            <Badge
              variant={method.confidence === 'HIGH' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {method.confidence} Confidence
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Valuation Methods Chart Component
 *
 * Displays a horizontal bar chart comparing different valuation methods.
 * Features:
 * - Color-coded bars: Green (undervalued), Red (overvalued)
 * - Black vertical line: Current Price reference
 * - Green vertical line: Highlighted method (e.g., AlfaValue™)
 * - Grouped by category with different colors
 * - Interactive tooltips with formula + inputs + confidence
 *
 * @example
 * ```tsx
 * <ValuationMethodsChart
 *   methods={allMethods}
 *   currentPrice={252.29}
 *   highlightMethod="AlfaValue™"
 * />
 * ```
 */
export function ValuationMethodsChart({
  methods,
  currentPrice,
  highlightMethod,
  className,
}: ValuationMethodsChartProps) {
  // Transform methods for chart display
  const chartData = useMemo(() => {
    return methods
      .sort((a, b) => {
        // Sort by category first, then by IV value
        const categoryOrder = { proprietary: 0, dcf: 1, multiples: 2, growth: 3 };
        const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
        return catDiff !== 0 ? catDiff : b.iv - a.iv;
      })
      .map((method) => {
        // Support both exact matches and partial matches
        const isHighlighted = highlightMethod ? (
          method.name === highlightMethod ||
          method.name.toLowerCase().includes(highlightMethod.toLowerCase()) ||
          highlightMethod.toLowerCase().includes(method.name.toLowerCase())
        ) : false;

        return {
          method,
          name: method.name,
          value: method.iv,
          category: method.category,
          isHighlighted,
          isUndervalued: method.iv > currentPrice,
        };
      });
  }, [methods, currentPrice, highlightMethod]);

  // Find highlighted method value for reference line
  // Support both exact matches and partial matches (e.g., "alfavalue" matches "AlfaValue™")
  const highlightedValue = useMemo(() => {
    if (!highlightMethod) return null;

    // Try exact match first
    let method = methods.find(m => m.name === highlightMethod);

    // If no exact match, try case-insensitive partial match
    if (!method) {
      const searchTerm = highlightMethod.toLowerCase();
      method = methods.find(m =>
        m.name.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(m.name.toLowerCase())
      );
    }

    return method?.iv || null;
  }, [methods, highlightMethod]);

  // Calculate chart domain with padding
  const domain = useMemo(() => {
    const values = methods.map(m => m.iv);
    const min = Math.min(...values, currentPrice);
    const max = Math.max(...values, currentPrice);
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [methods, currentPrice]);

  if (methods.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No valuation methods available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Valuation Methods Comparison
          </CardTitle>

          <HoverCard>
            <HoverCardTrigger>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2 text-sm">
                <p className="font-semibold">How to read this chart:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <span className="text-green-600">Green bars</span>: Method suggests stock is undervalued</li>
                  <li>• <span className="text-red-600">Red bars</span>: Method suggests stock is overvalued</li>
                  <li>• <span className="font-semibold">Black line</span>: Current market price</li>
                  {highlightMethod && (
                    <li>• <span className="text-teya-green font-semibold">Green line</span>: {highlightMethod} (recommended)</li>
                  )}
                  <li>• Hover bars for detailed formula & inputs</li>
                </ul>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

              <XAxis
                type="number"
                domain={domain}
                tick={{ fontSize: 12, fill: '#e4e7eb' }}
                tickFormatter={(value) => `$${value}`}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fontSize: 12, fill: '#f0f1f3' }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="top"
                height={40}
                formatter={(value, entry: any) => {
                  if (value === 'value') {
                    return 'Intrinsic Value';
                  }
                  return value;
                }}
              />

              {/* Reference line for current price (black) */}
              <ReferenceLine
                x={currentPrice}
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                label={{
                  value: `Current: $${currentPrice.toFixed(2)}`,
                  position: 'top',
                  fill: 'hsl(var(--foreground))',
                  fontSize: 11,
                }}
              />

              {/* Reference line for highlighted method (green) */}
              {highlightedValue && (
                <ReferenceLine
                  x={highlightedValue}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: highlightMethod,
                    position: 'bottom',
                    fill: '#10b981',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />
              )}

              {/* Bar for each valuation method */}
              <Bar
                dataKey="value"
                name="Intrinsic Value"
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.isHighlighted
                        ? '#10b981' // Highlighted method (Teya Green)
                        : entry.isUndervalued
                        ? '#10b981' // Undervalued (Green)
                        : '#ef4444' // Overvalued (Red)
                    }
                    opacity={entry.isHighlighted ? 1 : 0.8}
                    strokeWidth={entry.isHighlighted ? 2 : 0}
                    stroke={entry.isHighlighted ? '#10b981' : 'none'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const hasData = methods.some(m => m.category === key);
            if (!hasData) return null;

            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] }}
                />
                <span className="text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
