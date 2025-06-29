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
  Loader2,
  X
} from "lucide-react";
import { useStock, useIntrinsicValue } from "@/hooks/use-enhanced-stocks";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface EnhancedStockCardProps {
  symbol: string;
  onPerformanceClick?: () => void;
  onQuickInfoClick?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function EnhancedStockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick,
  onRemove,
  showRemove = false
}: EnhancedStockCardProps) {
  const { data: stock, isLoading: stockLoading, error: stockError } = useStock(symbol);
  const { data: intrinsicValue, isLoading: ivLoading } = useIntrinsicValue(symbol);
  const [, setLocation] = useLocation();

  const handleChartsClick = () => {
    setLocation(`/stock/${symbol}/charts`);
  };

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

  const isPositive = Number(stock.changePercent) >= 0;
  const hasIntrinsicValue = intrinsicValue && intrinsicValue.intrinsicValue;
  const safetyMargin = hasIntrinsicValue && stock.currentPrice && intrinsicValue.intrinsicValue
    ? ((Number(intrinsicValue.intrinsicValue) - Number(stock.currentPrice)) / Number(stock.currentPrice)) * 100
    : null;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow relative">
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 z-10"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
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
            <span className="font-semibold">{Math.abs(Number(stock.changePercent)).toFixed(2)}%</span>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-lg">{stock.symbol}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{stock.name}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold">${Number(stock.currentPrice).toFixed(2)}</p>
          <p className={cn(
            "text-sm",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? '+' : ''}{Number(stock.change).toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-muted-foreground text-xs">Market Cap</p>
            <p className="font-semibold">{typeof stock.marketCap === 'string' ? stock.marketCap : formatMarketCap(Number(stock.marketCap))}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-muted-foreground text-xs">Volume</p>
            <p className="font-semibold">{formatVolume(Number(stock.volume))}</p>
          </div>
          {stock.peRatio && (
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground text-xs">P/E Ratio</p>
              <p className="font-semibold">{Number(stock.peRatio).toFixed(2)}</p>
            </div>
          )}
          {hasIntrinsicValue && safetyMargin !== null && (
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground text-xs">Safety Margin</p>
              <p className={cn(
                "font-semibold",
                safetyMargin > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {Number(safetyMargin).toFixed(1)}%
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
                    <span className="font-semibold">${Number(intrinsicValue.intrinsicValue).toFixed(2)}</span>
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
            onClick={handleChartsClick}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Gráficos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMarketCap(value: number | string): string {
  const numValue = Number(value);
  if (isNaN(numValue)) return 'N/A';
  if (numValue >= 1e12) return `${(numValue / 1e12).toFixed(1)}T`;
  if (numValue >= 1e9) return `${(numValue / 1e9).toFixed(1)}B`;
  if (numValue >= 1e6) return `${(numValue / 1e6).toFixed(1)}M`;
  return numValue.toLocaleString();
}

function formatVolume(value: number | string): string {
  const numValue = Number(value);
  if (isNaN(numValue)) return 'N/A';
  if (numValue >= 1e6) return `${(numValue / 1e6).toFixed(1)}M`;
  if (numValue >= 1e3) return `${(numValue / 1e3).toFixed(1)}K`;
  return numValue.toLocaleString();
}