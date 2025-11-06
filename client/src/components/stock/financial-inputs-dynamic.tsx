import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MappedInputs } from '@/hooks/useMethodInputMapper';
import { formatNumber } from '@/lib/utils';

interface FinancialInputsDynamicProps {
  inputs: MappedInputs;
  mode: 'auto' | 'manual';
  onInputChange?: (field: string, value: number | boolean) => void;
  readonly?: boolean;
}

export function FinancialInputsDynamic({
  inputs,
  mode,
  onInputChange,
  readonly = false
}: FinancialInputsDynamicProps) {
  if (!inputs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Financial Inputs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No financial inputs available for this method.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isReadOnly = mode === 'auto' || readonly;

  // DCF Methods: Operating CF, Debt, Cash, Discount Rate, 3 Growth Rates
  if (inputs.type === 'dcf') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Financial Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Operating/Free Cash Flow */}
          <div>
            <Label htmlFor="operating-cf">Operating CF (millions)</Label>
            {isReadOnly ? (
              <p className="text-lg font-semibold">{formatNumber(inputs.operatingCF)}</p>
            ) : (
              <Input
                id="operating-cf"
                type="number"
                value={inputs.operatingCF}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  onInputChange?.('operatingCF', isNaN(value) ? 0 : value);
                }}
                className="mt-1"
              />
            )}
          </div>

          {/* Total Debt */}
          <div>
            <Label htmlFor="total-debt">Total Debt (millions)</Label>
            {isReadOnly ? (
              <p className="text-lg font-semibold">{formatNumber(inputs.totalDebt)}</p>
            ) : (
              <>
                <Input
                  id="total-debt"
                  type="number"
                  value={inputs.totalDebt}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    onInputChange?.('totalDebt', isNaN(value) ? 0 : value);
                  }}
                  className="mt-1"
                />
                <div className="flex items-center mt-2">
                  <Checkbox
                    id="deduct-debt"
                    checked={inputs.deductDebt}
                    onCheckedChange={(checked) => onInputChange?.('deductDebt', checked === true)}
                  />
                  <Label htmlFor="deduct-debt" className="ml-2 text-sm">
                    Deduct from Intrinsic Value
                  </Label>
                </div>
              </>
            )}
          </div>

          {/* Cash */}
          <div>
            <Label htmlFor="cash">Cash & ST Investments (millions)</Label>
            {isReadOnly ? (
              <p className="text-lg font-semibold">{formatNumber(inputs.cash)}</p>
            ) : (
              <>
                <Input
                  id="cash"
                  type="number"
                  value={inputs.cash}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    onInputChange?.('cash', isNaN(value) ? 0 : value);
                  }}
                  className="mt-1"
                />
                <div className="flex items-center mt-2">
                  <Checkbox
                    id="add-cash"
                    checked={inputs.addCash}
                    onCheckedChange={(checked) => onInputChange?.('addCash', checked === true)}
                  />
                  <Label htmlFor="add-cash" className="ml-2 text-sm">
                    Add to Intrinsic Value
                  </Label>
                </div>
              </>
            )}
          </div>

          {/* Discount Rate */}
          <div>
            <Label htmlFor="discount-rate">Discount Rate (%)</Label>
            {isReadOnly ? (
              <p className="text-lg font-semibold">{inputs.discountRate.toFixed(2)}%</p>
            ) : (
              <Input
                id="discount-rate"
                type="number"
                step="0.01"
                value={inputs.discountRate}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  onInputChange?.('discountRate', isNaN(value) ? 0 : value);
                }}
                className="mt-1"
              />
            )}
          </div>

          {/* Shares Outstanding */}
          <div>
            <Label htmlFor="shares">Shares Outstanding (millions)</Label>
            {isReadOnly ? (
              <>
                <p className="text-lg font-semibold">{formatNumber(inputs.shares)}</p>
                {/* BUG FIX #3: Warning when shares is 0 */}
                {inputs.shares === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ Shares Outstanding is 0. Data may be unavailable.
                  </p>
                )}
              </>
            ) : (
              <>
                <Input
                  id="shares"
                  type="number"
                  value={inputs.shares}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    onInputChange?.('shares', isNaN(value) ? 0 : value);
                  }}
                  className="mt-1"
                />
                {inputs.shares === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ Please enter shares outstanding manually
                  </p>
                )}
              </>
            )}
          </div>

          {/* 3-Stage Growth Rates */}
          <div className="pt-2 border-t">
            <Label className="text-sm font-semibold mb-2 block">Growth Rates</Label>

            <div className="space-y-3">
              <div>
                <Label htmlFor="growth-y1-5" className="text-sm">Year 1-5 (%)</Label>
                {isReadOnly ? (
                  <p className="text-sm font-medium">{inputs.growthY1_5.toFixed(2)}%</p>
                ) : (
                  <Input
                    id="growth-y1-5"
                    type="number"
                    step="0.01"
                    value={inputs.growthY1_5}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      onInputChange?.('growthY1_5', isNaN(value) ? 0 : value);
                    }}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="growth-y6-10" className="text-sm">Year 6-10 (%)</Label>
                {isReadOnly ? (
                  <p className="text-sm font-medium">{inputs.growthY6_10.toFixed(2)}%</p>
                ) : (
                  <Input
                    id="growth-y6-10"
                    type="number"
                    step="0.01"
                    value={inputs.growthY6_10}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      onInputChange?.('growthY6_10', isNaN(value) ? 0 : value);
                    }}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="growth-y11-20" className="text-sm">Year 11-20 (%)</Label>
                {isReadOnly ? (
                  <p className="text-sm font-medium">{inputs.growthY11_20.toFixed(2)}%</p>
                ) : (
                  <Input
                    id="growth-y11-20"
                    type="number"
                    step="0.01"
                    value={inputs.growthY11_20}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      onInputChange?.('growthY11_20', isNaN(value) ? 0 : value);
                    }}
                    className="mt-1"
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Growth-Adjusted Methods: PEG, PSG
  if (inputs.type === 'growth-adjusted') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Financial Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fair Ratio (EDITABLE in Manual mode) */}
          <div>
            <Label htmlFor="fair-ratio">Fair {inputs.metricName.includes('EPS') ? 'PEG' : 'PSG'} Ratio</Label>
            {isReadOnly ? (
              <p className="text-lg font-semibold">{inputs.fairRatio.toFixed(2)}</p>
            ) : (
              <Input
                id="fair-ratio"
                type="number"
                step="0.01"
                value={inputs.fairRatio}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  onInputChange?.('fairRatio', isNaN(value) ? 0 : value);
                }}
                className="mt-1"
                placeholder="1.5 for PEG, 0.2 for PSG"
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Default: {inputs.metricName.includes('EPS') ? '1.5 (PEG)' : '0.2 (PSG)'}
            </p>
          </div>

          {/* Last Price */}
          <div>
            <Label htmlFor="last-price">Last Price ($)</Label>
            <p className="text-lg font-semibold">{inputs.lastPrice.toFixed(2)}</p>
          </div>

          {/* Metric (EPS or Sales per Share) */}
          <div>
            <Label htmlFor="metric">{inputs.metricName} ($)</Label>
            <p className="text-lg font-semibold">{inputs.metric.toFixed(2)}</p>
          </div>

          {/* Growth Rate */}
          <div>
            <Label htmlFor="growth-rate">Growth Rate (%)</Label>
            <p className="text-lg font-semibold">{inputs.growthRate.toFixed(2)}%</p>
          </div>

          {/* Calculated Ratios (Read-only) */}
          {inputs.pe_without_nri && (
            <div>
              <Label htmlFor="pe-ratio">P/E Ratio (without NRI)</Label>
              <p className="text-lg font-semibold">{inputs.pe_without_nri.toFixed(2)}</p>
            </div>
          )}

          {inputs.peg_ratio_without_nri && (
            <div>
              <Label htmlFor="peg-ratio">PEG Ratio (calculated)</Label>
              <p className="text-lg font-semibold">{inputs.peg_ratio_without_nri.toFixed(2)}</p>
            </div>
          )}

          {inputs.ps_ratio && (
            <div>
              <Label htmlFor="ps-ratio">P/S Ratio</Label>
              <p className="text-lg font-semibold">{inputs.ps_ratio.toFixed(2)}</p>
            </div>
          )}

          {inputs.psg_ratio && (
            <div>
              <Label htmlFor="psg-ratio">PSG Ratio (calculated)</Label>
              <p className="text-lg font-semibold">{inputs.psg_ratio.toFixed(2)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Multiples Methods: P/E, P/S, P/B (Mean/Median)
  if (inputs.type === 'multiples') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Financial Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ratio (Mean/Median P/E, P/S, or P/B) - READ-ONLY */}
          <div>
            <Label htmlFor="ratio">{inputs.ratioName}</Label>
            <p className="text-lg font-semibold">{inputs.ratio.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Calculated from 5-year historical average
            </p>
          </div>

          {/* Current Price */}
          <div>
            <Label htmlFor="current-price">Current Price ($)</Label>
            <p className="text-lg font-semibold">{inputs.currentPrice.toFixed(2)}</p>
          </div>

          {/* Metric per Share (EPS, Sales, Book Value) */}
          <div>
            <Label htmlFor="metric-per-share">{inputs.metricName} ($)</Label>
            <p className="text-lg font-semibold">{inputs.metricPerShare.toFixed(2)}</p>
          </div>

          {/* Historical Ratios (Read-only chart or list) */}
          {inputs.historicalRatios.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">Historical Ratios (5 years)</Label>
              <div className="flex gap-2 text-sm">
                {inputs.historicalRatios.map((ratio, index) => (
                  <div key={index} className="text-center">
                    <p className="text-xs text-muted-foreground">Y{index + 1}</p>
                    <p className="font-medium">{ratio.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback (should never reach here)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Financial Inputs</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Unknown method type. Please contact support.
        </p>
      </CardContent>
    </Card>
  );
}
