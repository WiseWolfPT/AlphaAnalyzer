import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for ValuationGauge component
 */
export interface ValuationGaugeProps {
  iv: number; // Intrinsic Value
  price: number; // Current Price
  method?: string; // Method name (optional)
  className?: string;
}

/**
 * Valuation status based on discount/premium
 */
type ValuationStatus = 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell';

/**
 * Calculate valuation status and gauge position
 */
function calculateValuationMetrics(iv: number, price: number) {
  // Defensive programming: handle null/undefined/NaN values
  const safeIv = iv ?? 0;
  const safePrice = price ?? 0;

  // Discount percentage: (IV - Price) / Price * 100
  // Positive = Undervalued (discount), Negative = Overvalued (premium)
  const discountPct = safePrice !== 0 ? ((safeIv - safePrice) / safePrice) * 100 : 0;

  // Determine status based on discount/premium thresholds
  let status: ValuationStatus;
  if (discountPct >= 30) {
    status = 'strong-buy'; // >30% discount
  } else if (discountPct >= 15) {
    status = 'buy'; // 15-30% discount
  } else if (discountPct >= -15) {
    status = 'hold'; // -15% to +15% (fair value range)
  } else if (discountPct >= -30) {
    status = 'sell'; // -15% to -30% premium
  } else {
    status = 'strong-sell'; // >30% premium
  }

  // Calculate gauge angle (0° to 180°)
  // CORRECT mapping (GREEN LEFT, RED RIGHT):
  // +50% → 0° (Strong Buy extreme left - dark green)
  // +30% → 30° (Strong Buy / Buy boundary)
  // +15% → 60° (Buy / Hold boundary)
  //   0% → 105° (Hold center - yellow)
  // -15% → 120° (Hold / Sell boundary)
  // -30% → 150° (Sell / Strong Sell boundary)
  // -50% → 180° (Strong Sell extreme right - dark red)

  const clampedDiscount = Math.max(-50, Math.min(50, discountPct));

  // Piecewise linear mapping
  let angle: number;
  if (clampedDiscount >= 30) {
    // Strong Buy zone: +30% to +50% → 0° to 30° (DARK GREEN LEFT)
    angle = 30 - ((clampedDiscount - 30) / 20) * 30;
  } else if (clampedDiscount >= 15) {
    // Buy zone: +15% to +30% → 30° to 60° (LIGHT GREEN LEFT)
    angle = 60 - ((clampedDiscount - 15) / 15) * 30;
  } else if (clampedDiscount >= -15) {
    // Hold zone: -15% to +15% → 60° to 120° (YELLOW CENTER at 90°)
    angle = 90 - (clampedDiscount / 15) * 30;
  } else if (clampedDiscount >= -30) {
    // Sell zone: -30% to -15% → 120° to 150° (LIGHT RED RIGHT)
    angle = 120 + ((Math.abs(clampedDiscount) - 15) / 15) * 30;
  } else {
    // Strong Sell zone: -50% to -30% → 150° to 180° (DARK RED RIGHT)
    angle = 150 + ((Math.abs(clampedDiscount) - 30) / 20) * 30;
  }

  return { discountPct, status, angle };
}

/**
 * Get status color and label
 */
function getStatusConfig(status: ValuationStatus) {
  const configs = {
    'strong-buy': {
      color: '#10b981', // Green
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      textColor: 'text-green-600',
      label: 'Strong Buy',
      icon: TrendingUp,
    },
    'buy': {
      color: '#34d399', // Light Green
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20',
      textColor: 'text-green-500',
      label: 'Buy',
      icon: TrendingUp,
    },
    'hold': {
      color: '#fbbf24', // Amber
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      textColor: 'text-amber-600',
      label: 'Hold',
      icon: Minus,
    },
    'sell': {
      color: '#f87171', // Light Red
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/20',
      textColor: 'text-red-500',
      label: 'Sell',
      icon: TrendingDown,
    },
    'strong-sell': {
      color: '#ef4444', // Red
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      textColor: 'text-red-600',
      label: 'Strong Sell',
      icon: TrendingDown,
    },
  };

  return configs[status];
}

/**
 * Valuation Gauge Component
 *
 * Displays a 180° arc gauge showing the valuation status of a stock.
 *
 * Visual Design (Perfect Symmetry - Yellow CENTERED at 90°):
 * - Dark red zone (0-60°): Strong premium (≤-30% overvalued) - Strong Sell
 * - Light red zone (60-75°): Moderate premium (-15% to -30% overvalued) - Sell
 * - Yellow zone (75-105°): Fair value (±15%) - Hold [CENTERED at 90°]
 * - Light green zone (105-120°): Moderate discount (15-30% undervalued) - Buy
 * - Dark green zone (120-180°): Strong discount (≥30% undervalued) - Strong Buy
 * - Pointer: Animated indicator showing current price position
 * - Center: Displays intrinsic value and discount percentage
 *
 * @example
 * ```tsx
 * <ValuationGauge
 *   iv={199.61}
 *   price={252.29}
 *   method="AlfaValue™"
 * />
 * ```
 */
export function ValuationGauge({
  iv,
  price,
  method,
  className,
}: ValuationGaugeProps) {
  const { discountPct, status, angle } = useMemo(
    () => calculateValuationMetrics(iv, price),
    [iv, price]
  );

  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  // Animated pointer (starts at 0° and animates to final position)
  const [animatedAngle, setAnimatedAngle] = useState(0);

  useEffect(() => {
    // Start animation after component mounts (like a car fuel gauge)
    const timer = setTimeout(() => {
      setAnimatedAngle(angle);
    }, 100); // Small delay for smooth animation

    return () => clearTimeout(timer);
  }, [angle]);

  // SVG semicircle gauge (180° arc like car speedometer)
  const gaugeRadius = 90;
  const centerX = 120;
  const centerY = 130; // Moved down so semicircle sits at bottom

  // Calculate pointer rotation for CSS transform
  // Gauge angles: 0° = left (horizontal left), 90° = top, 180° = right (horizontal right)
  // SVG default: 0° = right, so we need to rotate from -180° (left) position
  // animatedAngle 0° → rotate(-180°), animatedAngle 90° → rotate(-90°), animatedAngle 180° → rotate(0°)
  const pointerRotation = animatedAngle - 180;
  const pointerLength = 75;

  // Arc paths for different zones (semicircle: left to right)
  const createArcPath = (startAngle: number, endAngle: number) => {
    // Convert gauge angles to SVG radians
    // 0° gauge = π radians (left), 180° gauge = 0 radians (right)
    const startRad = Math.PI - (startAngle * Math.PI) / 180;
    const endRad = Math.PI - (endAngle * Math.PI) / 180;

    const x1 = centerX + gaugeRadius * Math.cos(startRad);
    const y1 = centerY - gaugeRadius * Math.sin(startRad);
    const x2 = centerX + gaugeRadius * Math.cos(endRad);
    const y2 = centerY - gaugeRadius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${gaugeRadius} ${gaugeRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          Valuation Gauge
          {method && (
            <Badge variant="outline" className="ml-auto">
              {method}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col items-center space-y-6">
        {/* SVG Gauge */}
        <div className="relative">
          <svg width="240" height="140" viewBox="0 0 240 140" className="overflow-visible">
            {/* Background arc (full 180°) */}
            <path
              d={createArcPath(0, 180)}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="20"
              strokeLinecap="round"
              opacity={0.2}
            />

            {/* Dark Green zone: 0-30° (Strong Buy) - LEFT SIDE */}
            <path
              d={createArcPath(0, 30)}
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeLinecap="round"
              opacity={0.8}
            />

            {/* Light Green zone: 30-60° (Buy) - LEFT SIDE */}
            <path
              d={createArcPath(30, 60)}
              fill="none"
              stroke="#34d399"
              strokeWidth="20"
              strokeLinecap="round"
              opacity={0.9}
            />

            {/* Yellow zone: 60-120° (Hold) - CENTER */}
            <path
              d={createArcPath(60, 120)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="20"
              strokeLinecap="round"
              opacity={0.7}
            />

            {/* Light Red zone: 120-150° (Sell) - RIGHT SIDE */}
            <path
              d={createArcPath(120, 150)}
              fill="none"
              stroke="#f87171"
              strokeWidth="20"
              strokeLinecap="round"
              opacity={0.7}
            />

            {/* Dark Red zone: 150-180° (Strong Sell) - RIGHT SIDE */}
            <path
              d={createArcPath(150, 180)}
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeLinecap="round"
              opacity={0.8}
            />

            {/* Pointer (animated with CSS transform) */}
            <g
              style={{
                transform: `rotate(${pointerRotation}deg)`,
                transformOrigin: `${centerX}px ${centerY}px`,
                transition: 'transform 700ms ease-out'
              }}
            >
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX + pointerLength}
                y2={centerY}
                stroke="#f5f5f5"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx={centerX}
                cy={centerY}
                r="6"
                fill="#f5f5f5"
                stroke="#333333"
                strokeWidth="2"
              />
              <circle
                cx={centerX + pointerLength}
                cy={centerY}
                r="8"
                fill="#f5f5f5"
                stroke="#333333"
                strokeWidth="2"
              />
            </g>

            {/* Left label: Undervalued - Aligned with left arc tip */}
            <text
              x="30"
              y="155"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              Undervalued
            </text>

            {/* Center top label: Intrinsic Value */}
            <text
              x={centerX}
              y="25"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              Intrinsic Value
            </text>

            {/* Right label: Overvalued - Aligned with right arc tip */}
            <text
              x="210"
              y="155"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
            >
              Overvalued
            </text>
          </svg>
        </div>

        {/* Center Values */}
        <div className="text-center space-y-2 -mt-8">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Intrinsic Value</div>
            <div className="text-3xl font-bold text-primary">
              ${(iv ?? 0).toFixed(2)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Current Price</div>
            <div className="text-xl font-semibold">
              ${(price ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className={cn(
          'w-full p-4 rounded-lg border text-center space-y-2',
          config.bgColor,
          config.borderColor
        )}>
          <div className="flex items-center justify-center gap-2">
            <StatusIcon className={cn('h-5 w-5', config.textColor)} />
            <span className={cn('text-xl font-bold', config.textColor)}>
              {config.label}
            </span>
          </div>

          <div className={cn('text-2xl font-bold', config.textColor)}>
            {discountPct >= 0 ? '+' : ''}{(discountPct ?? 0).toFixed(1)}%
          </div>

          <div className="text-sm text-muted-foreground">
            {discountPct >= 0 ? 'Discount to Fair Value' : 'Premium to Fair Value'}
          </div>
        </div>

        {/* Legend */}
        <div className="w-full grid grid-cols-5 gap-2 text-xs text-center">
          <div className="space-y-1">
            <div className="w-full h-2 bg-green-500 rounded" />
            <div className="text-muted-foreground">Strong Buy</div>
            <div className="font-medium">≥30%</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-green-400 rounded" />
            <div className="text-muted-foreground">Buy</div>
            <div className="font-medium">15-30%</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-amber-500 rounded" />
            <div className="text-muted-foreground">Hold</div>
            <div className="font-medium">±15%</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-red-400 rounded" />
            <div className="text-muted-foreground">Sell</div>
            <div className="font-medium">-15 to -30%</div>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-red-500 rounded" />
            <div className="text-muted-foreground">Strong Sell</div>
            <div className="font-medium">≤-30%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
