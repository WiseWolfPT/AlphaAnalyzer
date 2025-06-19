import { useState, useEffect } from "react";
import { Calculator, TrendingUp, TrendingDown, Info, RotateCcw, Copy, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { 
  calculateIntrinsicValue, 
  calculateOptimalPE, 
  formatCurrency, 
  formatPercentage,
  getValuationColor,
  getValuationBorderColor,
  type IntrinsicValueParams 
} from "@/lib/intrinsic-value";

interface IntrinsicValueCalculatorProps {
  symbol?: string;
  currentPrice?: number;
  currentEPS?: number;
  currentPE?: number;
  className?: string;
  onCalculationChange?: (result: any) => void;
}

export function IntrinsicValueCalculator({
  symbol = "AAPL",
  currentPrice = 175.43,
  currentEPS = 6.16,
  currentPE = 28.5,
  className,
  onCalculationChange
}: IntrinsicValueCalculatorProps) {
  const [params, setParams] = useState<IntrinsicValueParams>({
    eps: currentEPS,
    growthRate: 8,
    horizon: 10,
    peMultiple: calculateOptimalPE(currentPE, 8),
    requiredReturn: 12,
    marginOfSafety: 25
  });

  const [result, setResult] = useState(calculateIntrinsicValue(currentPrice, params));
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    try {
      const newResult = calculateIntrinsicValue(currentPrice, params);
      setResult(newResult);
      setErrors([]);
      onCalculationChange?.(newResult);
    } catch (error) {
      setErrors(['Calculation error occurred']);
    }
  }, [params, currentPrice, onCalculationChange]);

  const updateParam = (key: keyof IntrinsicValueParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setParams({
      eps: currentEPS,
      growthRate: 8,
      horizon: 10,
      peMultiple: calculateOptimalPE(currentPE, 8),
      requiredReturn: 12,
      marginOfSafety: 25
    });
  };

  const copyToClipboard = () => {
    const summary = `${symbol} Intrinsic Value Analysis
Current Price: ${formatCurrency(currentPrice)}
Intrinsic Value: ${formatCurrency(result.intrinsicValue)}
Valuation: ${result.valuation.toUpperCase()}
Margin: ${formatPercentage(result.deltaPercent)}

Parameters:
EPS: ${formatCurrency(params.eps)}
Growth Rate: ${params.growthRate}%
Horizon: ${params.horizon} years
PE Multiple: ${params.peMultiple}x
Required Return: ${params.requiredReturn}%
Margin of Safety: ${params.marginOfSafety}%`;
    
    navigator.clipboard.writeText(summary);
  };

  const getValuationDescription = () => {
    switch (result.valuation) {
      case 'undervalued':
        return 'The stock appears to be trading below its intrinsic value.';
      case 'overvalued':
        return 'The stock appears to be trading above its intrinsic value.';
      case 'neutral':
        return 'The stock appears to be fairly valued.';
      default:
        return '';
    }
  };

  return (
    <TooltipProvider>
      <Card className={cn("w-full max-w-4xl", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Intrinsic Value Calculator
            <Badge variant="outline" className="text-xs">
              {symbol}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Price Display */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Current Market Price</div>
              <div className="text-2xl font-bold">{formatCurrency(currentPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Current EPS</div>
              <div className="text-lg font-semibold">{formatCurrency(currentEPS)}</div>
            </div>
          </div>

          {/* Parameters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Input Parameters
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust these parameters to customize the valuation model</p>
                  </TooltipContent>
                </Tooltip>
              </h3>

              {/* EPS Input */}
              <div className="space-y-2">
                <Label htmlFor="eps" className="flex items-center gap-2">
                  Earnings Per Share (EPS)
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current annual earnings per share</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="eps"
                  type="number"
                  step="0.01"
                  value={params.eps}
                  onChange={(e) => updateParam('eps', parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              {/* Growth Rate Slider */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  Annual Growth Rate: {params.growthRate}%
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expected annual earnings growth rate</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  value={[params.growthRate]}
                  onValueChange={([value]) => updateParam('growthRate', value)}
                  max={25}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                </div>
              </div>

              {/* Time Horizon Slider */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  Time Horizon: {params.horizon} years
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Investment time horizon for projections</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  value={[params.horizon]}
                  onValueChange={([value]) => updateParam('horizon', value)}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 year</span>
                  <span>20 years</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* PE Multiple Input */}
              <div className="space-y-2">
                <Label htmlFor="pe" className="flex items-center gap-2">
                  P/E Multiple
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expected P/E ratio at end of time horizon</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="pe"
                  type="number"
                  step="0.1"
                  value={params.peMultiple}
                  onChange={(e) => updateParam('peMultiple', parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
                <div className="text-xs text-muted-foreground">
                  Current P/E: {currentPE.toFixed(1)}x
                </div>
              </div>

              {/* Required Return Slider */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  Required Return: {params.requiredReturn}%
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Minimum acceptable annual return</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  value={[params.requiredReturn]}
                  onValueChange={([value]) => updateParam('requiredReturn', value)}
                  max={30}
                  min={5}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5%</span>
                  <span>30%</span>
                </div>
              </div>

              {/* Margin of Safety Slider */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  Margin of Safety: {params.marginOfSafety}%
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Safety buffer for uncertainty</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  value={[params.marginOfSafety]}
                  onValueChange={([value]) => updateParam('marginOfSafety', value)}
                  max={50}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Results Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Valuation Results</h3>
            
            {/* Main Result Display */}
            <div className={cn(
              "p-6 rounded-lg border-2 transition-all duration-300",
              getValuationBorderColor(result.valuation),
              result.valuation === 'undervalued' ? 'bg-positive/5' :
              result.valuation === 'overvalued' ? 'bg-negative/5' :
              'bg-neutral/5'
            )}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Intrinsic Value</div>
                  <div className="text-3xl font-bold">{formatCurrency(result.intrinsicValue)}</div>
                </div>
                <div className="text-right">
                  <Badge className={cn("text-sm", getValuationColor(result.valuation))}>
                    {result.valuation.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1 mt-2">
                    {result.deltaPercent > 0 ? (
                      <TrendingUp className="h-4 w-4 text-positive" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-negative" />
                    )}
                    <span className={cn(
                      "font-semibold",
                      result.deltaPercent > 0 ? "text-positive" : "text-negative"
                    )}>
                      {formatPercentage(Math.abs(result.deltaPercent))}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {getValuationDescription()}
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Future EPS</div>
                <div className="text-lg font-semibold">{formatCurrency(result.futureEPS)}</div>
                <div className="text-xs text-muted-foreground">In {params.horizon} years</div>
              </Card>
              
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Future Price</div>
                <div className="text-lg font-semibold">{formatCurrency(result.futurePrice)}</div>
                <div className="text-xs text-muted-foreground">At {params.peMultiple}x P/E</div>
              </Card>
              
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Present Value</div>
                <div className="text-lg font-semibold">{formatCurrency(result.presentValue)}</div>
                <div className="text-xs text-muted-foreground">Before margin of safety</div>
              </Card>
              
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Price Difference</div>
                <div className={cn(
                  "text-lg font-semibold",
                  result.intrinsicValue > currentPrice ? "text-positive" : "text-negative"
                )}>
                  {formatCurrency(Math.abs(result.intrinsicValue - currentPrice))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {result.intrinsicValue > currentPrice ? "Undervalued by" : "Overvalued by"}
                </div>
              </Card>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="text-sm text-destructive">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}