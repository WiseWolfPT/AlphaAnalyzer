import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ValuationGauge } from './valuation-gauge';
import { Calculator, Save, FolderOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinancialInputsDynamic } from './financial-inputs-dynamic';
import { MappedInputs } from '@/hooks/useMethodInputMapper';

/**
 * Auto calculation data (read-only from backend)
 */
export interface AutoCalculation {
  stockPrice: number;
  iv: number;
  premium: number;
  operatingCF: number;
  totalDebt: number;
  cash: number;
  discountRate: number;
  shares: number;
  growth_1_5: number;
  growth_6_10: number;
  growth_11_20: number;
}

/**
 * My calculation data (user-editable)
 */
export interface MyCalculation {
  stockPrice: number;
  iv: number;
  premium: number;
  operatingCF: number;
  totalDebt: number;
  cash: number;
  discountRate: number;
  shares: number;
  growth_1_5: number;
  growth_6_10: number;
  growth_11_20: number;
  deductDebt: boolean;
  addCash: boolean;
}

/**
 * Props for DualValuationLayout component
 */
export interface DualValuationLayoutProps {
  method: string; // Current valuation method
  autoCalculation: AutoCalculation; // Backend-calculated values
  myCalculation: MyCalculation; // User-editable values
  mappedInputs: MappedInputs; // Mapped inputs from useMethodInputMapper
  onMyCalculationChange: (field: string, value: number | boolean) => void;
  onCalculate: () => void;
  onSave: () => void;
  onLoad: () => void;
  className?: string;
}

/**
 * DualValuationLayout Component
 *
 * Displays side-by-side comparison of Auto Calculation vs My Calculation.
 * Features:
 * - Left column: Read-only backend values with gauge
 * - Right column: Editable form with Save/Load/Calculate buttons
 * - 2 gauges side-by-side showing Auto vs Custom valuation
 * - All financial inputs visible (Growth rates, Shares, Debt, Cash, etc.)
 * - Responsive: Stacks vertically on mobile
 *
 * @example
 * ```tsx
 * <DualValuationLayout
 *   method="dcf-20-fcf"
 *   autoCalculation={autoData}
 *   myCalculation={customData}
 *   onMyCalculationChange={handleChange}
 *   onCalculate={handleCalculate}
 *   onSave={handleSave}
 *   onLoad={handleLoad}
 * />
 * ```
 */
export function DualValuationLayout({
  method,
  autoCalculation,
  myCalculation,
  mappedInputs,
  onMyCalculationChange,
  onCalculate,
  onSave,
  onLoad,
  className,
}: DualValuationLayoutProps) {
  // BUG FIX #2: Defensive programming for price formatting
  const formatCurrency = (value: number | null | undefined) => {
    // Handle null/undefined/NaN gracefully
    const safeValue = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  };

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
      {/* LEFT COLUMN - AUTO CALCULATION (Read-only) */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Auto Calculation
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Section */}
          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stock price (USD)</span>
              <span className="font-semibold text-lg">{formatCurrency(autoCalculation.stockPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Intrinsic value (USD)</span>
              <span className="font-semibold text-lg text-primary">{formatCurrency(autoCalculation.iv)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Discount (-) / Premium (+)</span>
              <div className="flex items-center gap-2">
                {autoCalculation.premium >= 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                <span className={cn(
                  'font-bold text-lg',
                  autoCalculation.premium >= 0 ? 'text-red-500' : 'text-green-500'
                )}>
                  {autoCalculation.premium.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Gauge Visualization */}
          <div className="py-4">
            <ValuationGauge
              iv={autoCalculation.iv}
              price={autoCalculation.stockPrice}
              method="Auto"
            />
          </div>

          {/* Financial Inputs (Read-only) - Dynamic based on method */}
          <FinancialInputsDynamic
            inputs={mappedInputs}
            mode="auto"
            readonly
          />
        </CardContent>
      </Card>

      {/* RIGHT COLUMN - MY CALCULATION (Editable) */}
      <Card className="border-teya-green/20">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-teya-green" />
              My Calculation
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onLoad}>
                <FolderOpen className="h-4 w-4 mr-1" />
                Load
              </Button>
              <Button variant="outline" size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Section */}
          <div className="space-y-3 p-4 bg-teya-green/10 rounded-lg border border-teya-green/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Stock price (USD)</span>
              <span className="font-semibold text-lg">{formatCurrency(myCalculation.stockPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Intrinsic value (USD)</span>
              <span className="font-semibold text-lg text-teya-green">{formatCurrency(myCalculation.iv)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Discount (-) / Premium (+)</span>
              <div className="flex items-center gap-2">
                {myCalculation.premium >= 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                <span className={cn(
                  'font-bold text-lg',
                  myCalculation.premium >= 0 ? 'text-red-500' : 'text-green-500'
                )}>
                  {myCalculation.premium.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Gauge Visualization */}
          <div className="py-4">
            <ValuationGauge
              iv={myCalculation.iv}
              price={myCalculation.stockPrice}
              method="Custom"
            />
          </div>

          {/* Financial Inputs (Editable Form) - Dynamic based on method */}
          <FinancialInputsDynamic
            inputs={mappedInputs}
            mode="manual"
            onInputChange={onMyCalculationChange}
          />

          {/* Calculate Button */}
          <Button
            onClick={onCalculate}
            className="w-full mt-4 bg-teya-green hover:bg-teya-green-dark text-black font-semibold"
            size="lg"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
