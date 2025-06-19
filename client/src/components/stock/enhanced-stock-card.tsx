import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  BarChart3, 
  Calculator, 
  DollarSign,
  Loader2
} from "lucide-react";
import { useStock, useIntrinsicValue } from "@/hooks/use-enhanced-stocks";
import { cn } from "@/lib/utils";

interface EnhancedStockCardProps {
  symbol: string;
  onPerformanceClick?: () => void;
  onQuickInfoClick?: () => void;
}

export function EnhancedStockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick 
}: EnhancedStockCardProps) {
  const { data: stock, isLoading: stockLoading, error: stockError } = useStock(symbol);
  const { data: intrinsicValue, isLoading: ivLoading } = useIntrinsicValue(symbol);

  if (stockLoading) {
    return (
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Skeleton className="h-12 w-12 rounded" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-6 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-4" />
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stockError || !stock) {
    return (
      <Card className="h-full border-red-200 dark:border-red-900">
        <CardContent className="flex flex-col items-center justify-center h-full py-8">
          <p className="text-red-600 dark:text-red-400 mb-2">Failed to load stock data</p>
          <p className="text-sm text-muted-foreground">{symbol}</p>
        </CardContent>
      </Card>
    );
  }

  const isPositive = stock.changePercent >= 0;
  const hasIntrinsicValue = intrinsicValue && intrinsicValue.intrinsicValue;
  const safetyMargin = hasIntrinsicValue && stock.currentPrice && intrinsicValue.intrinsicValue
    ? ((intrinsicValue.intrinsicValue - stock.currentPrice) / stock.currentPrice) * 100
    : null;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-chartreuse/10 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-chartreuse-dark">
                {stock.symbol.slice(0, 2)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {stock.sector || 'Stock'}
            </Badge>
          </div>
          <div className={cn(
            "flex items-center gap-1",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="font-semibold">{Math.abs(stock.changePercent).toFixed(2)}%</span>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-lg">{stock.symbol}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{stock.name}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold">${stock.currentPrice.toFixed(2)}</p>
          <p className={cn(
            "text-sm",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? '+' : ''}{stock.change.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-muted-foreground text-xs">Market Cap</p>
            <p className="font-semibold">{formatMarketCap(stock.marketCap)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-muted-foreground text-xs">Volume</p>
            <p className="font-semibold">{formatVolume(stock.volume)}</p>
          </div>
          {stock.peRatio && (
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground text-xs">P/E Ratio</p>
              <p className="font-semibold">{stock.peRatio.toFixed(2)}</p>
            </div>
          )}
          {hasIntrinsicValue && safetyMargin !== null && (
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground text-xs">Safety Margin</p>
              <p className={cn(
                "font-semibold",
                safetyMargin > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {safetyMargin.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {hasIntrinsicValue && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Intrinsic Value</span>
              <div className="flex items-center gap-2">
                {ivLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 text-chartreuse" />
                    <span className="font-semibold">${intrinsicValue.intrinsicValue.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onQuickInfoClick}
          >
            <Info className="h-4 w-4 mr-1" />
            Info
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onPerformanceClick}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Charts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

function formatVolume(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}