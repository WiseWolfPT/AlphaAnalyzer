import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  X
} from "lucide-react";
import { useStock } from "@/hooks/use-enhanced-stocks";
import { useNormalizedStock, getStockPrice, getStockChangePercent, getStockChange, isStockPositive } from "@/lib/stock-data-normalizer";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { memo, useMemo, useCallback } from "react";
import type { StockCardProps } from "./types";

export const CompactStockCard = memo(function CompactStockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick,
  onRemove,
  showRemove = false
}: StockCardProps) {
  const { data: rawStock, isLoading: stockLoading, error: stockError } = useStock(symbol);
  const stock = useNormalizedStock(rawStock);
  const [, setLocation] = useLocation();

  const handleCardClick = useCallback(() => {
    setLocation(`/stock/${symbol}/charts`);
  }, [symbol, setLocation]);

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(symbol);
  }, [onRemove, symbol]);

  // Memoize expensive calculations - ALWAYS called, even for loading/error states
  const calculations = useMemo(() => {
    if (!stock) {
      return {
        isPositive: false,
        currentPrice: 0,
        changePercent: 0
      };
    }
    
    const isPositive = isStockPositive(stock);
    const currentPrice = getStockPrice(stock);
    const changePercent = getStockChangePercent(stock);
    
    return {
      isPositive,
      currentPrice,
      changePercent
    };
  }, [stock]);

  const { isPositive, currentPrice, changePercent } = calculations;

  if (stockLoading) {
    return (
      <Card className="compact-card-loading">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stockError || !stock) {
    return (
      <Card className="compact-card-error">
        <CardContent className="p-4 text-center">
          <p className="text-red-500 text-sm font-medium">{symbol}</p>
          <p className="text-xs text-muted-foreground">Data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="compact-stock-card group relative cursor-pointer hover:shadow-md hover:shadow-chartreuse/20 hover:border-chartreuse/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
      onClick={handleCardClick}
      tabIndex={0} 
      role="button" 
      aria-label={`View ${stock.symbol} - ${stock.name}`}
    >
      {showRemove && onRemove && (
        <button
          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 shadow-md"
          onClick={handleRemoveClick}
          aria-label={`Remove ${stock.symbol}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      
      <CardContent className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo/Symbol */}
            <div className="w-8 h-8 bg-gradient-to-br from-chartreuse/20 to-chartreuse/10 border border-chartreuse/30 rounded-lg flex items-center justify-center group-hover:from-chartreuse/30 group-hover:to-chartreuse/20 transition-colors">
              <span className="text-xs font-bold text-chartreuse-dark">
                {stock.symbol.slice(0, 2)}
              </span>
            </div>
            
            {/* Symbol and Name */}
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight">{stock.symbol}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {stock.name}
              </p>
            </div>
          </div>
          
          {/* Price */}
          <div className="text-right">
            <p className="font-bold text-sm">${currentPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between">
          {/* Sector Badge */}
          <Badge 
            variant="secondary" 
            className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground border-0"
          >
            {stock.sector || 'Stock'}
          </Badge>
          
          {/* Change Percentage */}
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(changePercent).toFixed(2)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});