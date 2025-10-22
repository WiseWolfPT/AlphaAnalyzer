import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ValuationGauge } from './valuation-gauge';
import { Calculator, Save, FolderOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onMyCalculationChange,
  onCalculate,
  onSave,
  onLoad,
  className,
}: DualValuationLayoutProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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

          {/* Financial Inputs (Read-only) */}
          <div className="space-y-4 p-4 bg-secondary/10 rounded-lg">
            <h4 className="font-semibold text-sm mb-3">Financial Inputs</h4>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Operating CF (millions)</Label>
                <div className="mt-1 font-mono text-sm font-medium">{autoCalculation.operatingCF.toLocaleString()}</div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Total Debt (M)</Label>
                <div className="mt-1 font-mono text-sm font-medium">{autoCalculation.totalDebt.toLocaleString()}</div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Cash (M)</Label>
                <div className="mt-1 font-mono text-sm font-medium">{autoCalculation.cash.toLocaleString()}</div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Discount Rate</Label>
                <div className="mt-1 font-mono text-sm font-medium">{autoCalculation.discountRate.toFixed(2)}%</div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Shares (M)</Label>
                <div className="mt-1 font-mono text-sm font-medium">{autoCalculation.shares.toLocaleString()}</div>
              </div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <Label className="text-sm font-semibold">Growth Rates</Label>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Year 1-5</Label>
                  <span className="font-mono text-sm font-medium text-green-600">{autoCalculation.growth_1_5.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Year 6-10</Label>
                  <span className="font-mono text-sm font-medium text-green-600">{autoCalculation.growth_6_10.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">Year 11-20</Label>
                  <span className="font-mono text-sm font-medium text-green-600">{autoCalculation.growth_11_20.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
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

          {/* Financial Inputs (Editable Form) */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Financial Inputs</h4>

            <div className="space-y-4">
              {/* Operating CF */}
              <div className="space-y-2">
                <Label htmlFor="my-cf" className="text-sm">Operating CF (millions)</Label>
                <Input
                  id="my-cf"
                  type="number"
                  step="0.01"
                  value={myCalculation.operatingCF}
                  onChange={(e) => onMyCalculationChange('operatingCF', parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              {/* Total Debt */}
              <div className="space-y-2">
                <Label htmlFor="my-debt" className="text-sm">Total Debt (millions)</Label>
                <Input
                  id="my-debt"
                  type="number"
                  step="0.01"
                  value={myCalculation.totalDebt}
                  onChange={(e) => onMyCalculationChange('totalDebt', parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
                <div className="flex items-center space-x-2 pl-1">
                  <Checkbox
                    id="deduct-debt"
                    checked={myCalculation.deductDebt}
                    onCheckedChange={(checked) => onMyCalculationChange('deductDebt', checked as boolean)}
                  />
                  <Label htmlFor="deduct-debt" className="text-xs text-muted-foreground cursor-pointer">
                    Deduct from Intrinsic Value
                  </Label>
                </div>
              </div>

              {/* Cash */}
              <div className="space-y-2">
                <Label htmlFor="my-cash" className="text-sm">Cash & ST Investments (millions)</Label>
                <Input
                  id="my-cash"
                  type="number"
                  step="0.01"
                  value={myCalculation.cash}
                  onChange={(e) => onMyCalculationChange('cash', parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
                <div className="flex items-center space-x-2 pl-1">
                  <Checkbox
                    id="add-cash"
                    checked={myCalculation.addCash}
                    onCheckedChange={(checked) => onMyCalculationChange('addCash', checked as boolean)}
                  />
                  <Label htmlFor="add-cash" className="text-xs text-muted-foreground cursor-pointer">
                    Add to Intrinsic Value
                  </Label>
                </div>
              </div>

              {/* Discount Rate */}
              <div className="space-y-2">
                <Label htmlFor="my-rate" className="text-sm">Discount Rate (%)</Label>
                <Input
                  id="my-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={myCalculation.discountRate}
                  onChange={(e) => onMyCalculationChange('discountRate', parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              {/* Shares Outstanding */}
              <div className="space-y-2">
                <Label htmlFor="my-shares" className="text-sm">Shares Outstanding (millions)</Label>
                <Input
                  id="my-shares"
                  type="number"
                  step="0.01"
                  value={myCalculation.shares}
                  onChange={(e) => onMyCalculationChange('shares', parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              {/* Growth Rates Section */}
              <div className="pt-3 border-t space-y-3">
                <Label className="font-semibold text-sm">Growth Rates</Label>

                <div className="space-y-2">
                  <Label htmlFor="growth-1-5" className="text-xs text-muted-foreground">
                    Growth Rate (Year 1-5) %
                  </Label>
                  <Input
                    id="growth-1-5"
                    type="number"
                    step="0.01"
                    min="-100"
                    max="100"
                    value={myCalculation.growth_1_5}
                    onChange={(e) => onMyCalculationChange('growth_1_5', parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="growth-6-10" className="text-xs text-muted-foreground">
                    Growth Rate (Year 6-10) %
                  </Label>
                  <Input
                    id="growth-6-10"
                    type="number"
                    step="0.01"
                    min="-100"
                    max="100"
                    value={myCalculation.growth_6_10}
                    onChange={(e) => onMyCalculationChange('growth_6_10', parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="growth-11-20" className="text-xs text-muted-foreground">
                    Growth Rate (Year 11-20) %
                  </Label>
                  <Input
                    id="growth-11-20"
                    type="number"
                    step="0.01"
                    min="-100"
                    max="100"
                    value={myCalculation.growth_11_20}
                    onChange={(e) => onMyCalculationChange('growth_11_20', parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Calculate Button */}
              <Button
                onClick={onCalculate}
                className="w-full mt-4 bg-teya-green hover:bg-teya-green-dark text-black font-semibold"
                size="lg"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
