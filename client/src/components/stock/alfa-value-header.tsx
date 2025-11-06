import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useAlfaValue, getStatusColor, getStatusLabel, getStatusIcon } from '@/hooks/use-alfa-value';
import { cn } from '@/lib/utils';
import { ValuationGauge } from '@/components/stock/valuation-gauge';

export interface AlfaValueHeaderProps {
  ticker: string;
}

/**
 * AlfaValueHeader Component
 *
 * Displays the AlfaValue™ (intrinsic value) at the top of the stock detail page.
 * Shows IV, current price, status badge, and discount/premium percentage.
 *
 * @param ticker - Stock symbol (e.g., 'AAPL')
 *
 * Features:
 * - Real-time intrinsic value calculation
 * - Status badge (Undervalued/Overvalued/Fairly Priced)
 * - Discount/Premium percentage
 * - Tooltip/Dialog with calculation assumptions
 * - Loading skeleton states
 * - Error handling
 * - Responsive design (desktop horizontal, mobile vertical)
 */
export function AlfaValueHeader({ ticker }: AlfaValueHeaderProps) {
  const { data, isLoading, error } = useAlfaValue(ticker);
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Fetch real-time quote for current price (updates every 60s)
  const { data: quoteData } = useQuery({
    queryKey: ['quote-realtime', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/market-data/quote/${ticker}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000, // 60s - refresh every minute
    refetchInterval: 60000, // Auto-refresh every minute
    enabled: !!ticker && !!data, // Only fetch if we have AlfaValue data
    retry: 1, // Retry once on failure
  });

  // Loading State
  if (isLoading) {
    return (
      <Card className="border-teya-green/20 bg-gradient-to-r from-teya-green/5 to-transparent">
        <CardContent className="p-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error State - Check for ETF-specific error first
  if (error || !data) {
    // Check if this is an ETF rejection error (status 422)
    const errorObj = error as any;
    if (errorObj?.statusCode === 422 && errorObj?.errorData?.error === 'ETF_NOT_SUPPORTED') {
      const etfError = errorObj.errorData;

      return (
        <Card className="border-blue-500/20 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardContent className="p-6">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {etfError.message}
              </AlertTitle>
              <AlertDescription className="space-y-3 mt-2">
                {etfError.reason && (
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {etfError.reason}
                  </p>
                )}

                {etfError.suggestion && (
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mt-2">
                    💡 {etfError.suggestion}
                  </p>
                )}

                {etfError.alternative_methods && etfError.alternative_methods.length > 0 && (
                  <div className="mt-3 p-3 bg-white dark:bg-blue-950/50 rounded-md border border-blue-100 dark:border-blue-900">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Alternative analysis methods:
                    </p>
                    <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      {etfError.alternative_methods.map((method: string, i: number) => (
                        <li key={i}>{method}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {etfError.documentation && (
                  <a
                    href={etfError.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline inline-flex items-center gap-1 mt-2"
                  >
                    Learn more about ETF valuation
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    // Generic error (404, network errors, etc.)
    return (
      <Card className="border-red-500/20">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Unable to calculate intrinsic value. Data may be unavailable for {ticker}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // BUG FIX #1: Handle null/0 intrinsic value (common for banks and financial institutions)
  // Banks cannot be valued using DCF because they have negative/irregular free cash flows
  const isInvalidIV = !data.iv || data.iv <= 0;

  if (isInvalidIV) {
    return (
      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
        <CardContent className="p-6">
          <Alert className="border-amber-500/20">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              <strong>DCF Valuation Not Applicable</strong>
              <p className="mt-2">
                Intrinsic value cannot be calculated using DCF for {ticker}.
                This is common for financial institutions (banks, insurance companies)
                which have negative or irregular free cash flows.
              </p>
              <p className="mt-2 text-sm">
                <strong>Recommended alternative methods:</strong> P/TBV (Price-to-Tangible Book Value),
                P/B (Price-to-Book), or P/E (Price-to-Earnings) multiples.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  // Use real-time price if available, fallback to cached price from AlfaValue
  const currentPrice = quoteData?.price ?? data.price;

  // Premium/Discount logic (absolute value for display)
  const isPremium = data.discount_pct < 0;  // Negative = overvalued = premium
  const isDiscount = data.discount_pct > 0;  // Positive = undervalued = discount
  const displayPercent = Math.abs(data.discount_pct);  // Always positive for display

  const statusColor = getStatusColor(data.status);
  const statusLabel = getStatusLabel(data.status);
  const statusIcon = getStatusIcon(data.status);

  const StatusIcon =
    data.status === 'undervalued'
      ? TrendingUp
      : data.status === 'overvalued'
      ? TrendingDown
      : Minus;

  return (
    <Card className="border-teya-green/20 bg-gradient-to-r from-teya-green/5 to-transparent">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">AlfaValue™</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Intrinsic value calculated using 20-year DCF model
                    <br />
                    with dynamic growth rates and WACC
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant="outline" className="text-xs">
            Updated: {new Date(data.as_of).toLocaleDateString()}
          </Badge>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Intrinsic Value */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground mb-1">Intrinsic Value</p>
            <p className="text-3xl md:text-4xl font-bold text-teya-green">{formatCurrency(data.iv)}</p>
          </div>

          {/* Current Price */}
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
            <p className="text-3xl md:text-4xl font-bold">{formatCurrency(currentPrice)}</p>
          </div>

          {/* Status & Discount/Premium */}
          <div className="flex flex-col items-center md:items-end justify-center gap-2">
            <Badge className={cn('text-sm px-3 py-1.5', statusColor)}>
              <StatusIcon className="h-4 w-4 mr-1" />
              {statusLabel} {statusIcon}
            </Badge>
            <div className="text-center md:text-right">
              <p
                className={cn(
                  'text-2xl font-bold',
                  isDiscount ? 'text-green-600' : isPremium ? 'text-red-600' : 'text-muted-foreground'
                )}
              >
                {displayPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {isDiscount ? 'Discount' : isPremium ? 'Premium' : 'Fair Value'}
              </p>
            </div>
          </div>
        </div>

        {/* View Assumptions Button */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <Dialog open={showAssumptions} onOpenChange={setShowAssumptions}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                <Info className="h-4 w-4 mr-2" />
                View Assumptions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Calculation Assumptions - {ticker}</DialogTitle>
                <DialogDescription>
                  AlfaValue™ is calculated using a 20-year Discounted Cash Flow (DCF) model with
                  dynamic growth rates and company-specific discount rate (WACC).
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Growth Rates */}
                <div>
                  <h4 className="font-semibold mb-3 text-teya-green">Growth Assumptions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Growth Years 1-5:</span>
                      <span className="font-medium">
                        {(data.assumptions.g_1_5 * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Growth Years 6-10:</span>
                      <span className="font-medium">
                        {(data.assumptions.g_6_10 * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Terminal Growth (11-20):</span>
                      <span className="font-medium">
                        {(data.assumptions.g_11_20 * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Discount Rate Components */}
                <div>
                  <h4 className="font-semibold mb-3 text-blue-600">Discount Rate (WACC)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk-Free Rate:</span>
                      <span className="font-medium">
                        {(data.assumptions.rf * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beta:</span>
                      <span className="font-medium">{data.assumptions.beta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Risk Premium:</span>
                      <span className="font-medium">
                        {(data.assumptions.mrp * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground font-medium">Discount Rate:</span>
                      <span className="font-bold text-blue-600">
                        {(data.assumptions.discount_rate * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Input Data */}
                <div>
                  <h4 className="font-semibold mb-3 text-purple-600">Financial Inputs</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FCF TTM:</span>
                      <span className="font-medium">${data.inputs.fcf_ttm_musd.toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash:</span>
                      <span className="font-medium">${data.inputs.cash_musd.toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Debt:</span>
                      <span className="font-medium">${data.inputs.debt_musd.toFixed(0)}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shares Outstanding:</span>
                      <span className="font-medium">{data.inputs.shares_m.toFixed(0)}M</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h4 className="font-semibold mb-3 text-amber-600">Additional Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sector Mid Growth:</span>
                      <span className="font-medium">
                        {(data.meta.g_sector_mid * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sector Source:</span>
                      <span className="font-medium capitalize">{data.meta.g_sector_source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regional Terminal:</span>
                      <span className="font-medium">
                        {(data.meta.g_term_region * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region:</span>
                      <span className="font-medium">{data.meta.region}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Confidence:</span>
                      <Badge
                        variant={
                          data.confidence === 'HIGH'
                            ? 'default'
                            : data.confidence === 'MED'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {data.confidence}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculation Date */}
              <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
                Calculated: {new Date(data.as_of).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} UTC
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Valuation Gauge - Visual feedback */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <ValuationGauge
            iv={data.iv}
            price={currentPrice}
            method="AlfaValue™"
            className="border-0 shadow-none bg-transparent"
          />
        </div>
      </CardContent>
    </Card>
  );
}
