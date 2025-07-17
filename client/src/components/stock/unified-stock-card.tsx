/**
 * UNIFIED STOCK CARD COMPONENT
 * Consolidates all stock card variations into a single, flexible component
 * Replaces: stock-card.tsx, compact-stock-card.tsx, enhanced-stock-card.tsx, 
 *          enhanced-stock-card-with-valuation.tsx, real-stock-card.tsx
 */

import { useState, memo, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { trackFinancialAction } from "@/lib/logrocket";
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  ChartLine, 
  LineChart, 
  Info,
  Calculator,
  DollarSign,
  Loader2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniChart } from "./mini-charts";
import { FeatureLimiter } from "@/components/beta/feature-limiter";
import { useStock, useIntrinsicValue } from "@/hooks/use-enhanced-stocks";
import { useNormalizedStock, getStockPrice, getStockChangePercent, getStockChange, isStockPositive } from "@/lib/stock-data-normalizer";
import type { Stock } from "@shared/schema";

/**
 * Unified props interface for all stock card variants
 */
export interface UnifiedStockCardProps {
  /** Stock symbol or stock data object (backwards compatibility) */
  symbol?: string;
  stock?: Stock; // For backwards compatibility with original StockCard
  
  /** Card variant - determines layout and features */
  variant: 'compact' | 'standard' | 'enhanced';
  
  /** Visual and functional options */
  showMiniChart?: boolean;
  showValuation?: boolean;
  showRemove?: boolean;
  showActions?: boolean;
  
  /** Event handlers */
  onPerformanceClick?: () => void;
  onQuickInfoClick?: () => void;
  onRemove?: (symbol: string) => void;
  
  /** Styling */
  className?: string;
}

export const UnifiedStockCard = memo(function UnifiedStockCard({
  symbol: propSymbol,
  stock: propStock,
  variant,
  showMiniChart = true,
  showValuation = true,
  showRemove = false,
  showActions = true,
  onPerformanceClick,
  onQuickInfoClick,
  onRemove,
  className
}: UnifiedStockCardProps) {
  const [imageError, setImageError] = useState(false);
  const [, setLocation] = useLocation();
  
  // Handle both symbol prop and stock object (backwards compatibility)
  const stockSymbol = propSymbol || propStock?.symbol;
  
  if (!stockSymbol) {
    console.error('UnifiedStockCard: symbol or stock prop is required');
    return null;
  }
  
  // Fetch real data if using symbol prop, otherwise use provided stock data
  const { data: rawStock, isLoading: stockLoading, error: stockError } = useStock(stockSymbol);
  const { data: intrinsicValue, isLoading: ivLoading } = useIntrinsicValue(stockSymbol);
  
  // Use provided stock data or fetched data
  const stock = propStock || useNormalizedStock(rawStock);
  const isLoading = !propStock && stockLoading;
  
  // Memoized calculations
  const calculations = useMemo(() => {
    if (!stock) {
      return {
        isPositive: false,
        currentPrice: 0,
        changePercent: 0,
        change: 0,
        intrinsicValue: null,
        valuationDiff: null,
        isUndervalued: false
      };
    }
    
    const isPositive = propStock ? 
      parseFloat(stock.changePercent) >= 0 : 
      isStockPositive(stock);
    
    const currentPrice = propStock ? 
      parseFloat(stock.price) : 
      getStockPrice(stock);
    
    const changePercent = propStock ? 
      parseFloat(stock.changePercent) : 
      getStockChangePercent(stock);
    
    const change = propStock ? 
      stock.change : 
      getStockChange(stock);
    
    // Intrinsic value calculations
    const stockIntrinsicValue = propStock?.intrinsicValue ? 
      parseFloat(propStock.intrinsicValue) : 
      intrinsicValue;
    
    const valuationDiff = stockIntrinsicValue ? 
      ((currentPrice - stockIntrinsicValue) / stockIntrinsicValue) * 100 : 
      null;
    
    const isUndervalued = valuationDiff ? valuationDiff < 0 : false;
    
    return {
      isPositive,
      currentPrice,
      changePercent,
      change,
      intrinsicValue: stockIntrinsicValue,
      valuationDiff,
      isUndervalued
    };
  }, [stock, propStock, intrinsicValue]);
  
  // Event handlers with LogRocket tracking
  const handleCardClick = useCallback(() => {
    // Track stock card click in LogRocket
    trackFinancialAction('stock_card_clicked', stockSymbol, {
      variant,
      has_price: !!stock?.current_price,
      current_price: stock?.current_price,
      change_percent: calculations.changePercent,
    });
    
    setLocation(`/stock/${stockSymbol}/charts`);
  }, [stockSymbol, setLocation, variant, stock, calculations]);
  
  const handleQuickInfoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Track quick info click
    trackFinancialAction('stock_quick_info_clicked', stockSymbol, {
      variant,
      action: 'quick_info',
    });
    
    onQuickInfoClick?.();
  }, [onQuickInfoClick, stockSymbol, variant]);
  
  const handlePerformanceClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Track performance click
    trackFinancialAction('stock_performance_clicked', stockSymbol, {
      variant,
      action: 'performance',
    });
    
    onPerformanceClick?.();
  }, [onPerformanceClick, stockSymbol, variant]);
  
  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Track stock removal
    trackFinancialAction('stock_removed', stockSymbol, {
      variant,
      action: 'remove',
    });
    
    onRemove?.(stockSymbol);
  }, [onRemove, stockSymbol, variant]);
  
  // Loading state
  if (isLoading) {
    return <LoadingSkeleton variant={variant} />;
  }
  
  // Error state
  if (stockError || !stock) {
    return <ErrorState variant={variant} symbol={stockSymbol} />;
  }
  
  // Render based on variant
  switch (variant) {
    case 'compact':
      return (
        <CompactVariant
          stock={stock}
          calculations={calculations}
          showRemove={showRemove}
          showActions={showActions}
          onCardClick={handleCardClick}
          onQuickInfoClick={handleQuickInfoClick}
          onPerformanceClick={handlePerformanceClick}
          onRemoveClick={handleRemoveClick}
          className={className}
          imageError={imageError}
          setImageError={setImageError}
        />
      );
      
    case 'enhanced':
      return (
        <EnhancedVariant
          stock={stock}
          calculations={calculations}
          showMiniChart={showMiniChart}
          showValuation={showValuation}
          showRemove={showRemove}
          showActions={showActions}
          ivLoading={ivLoading}
          onCardClick={handleCardClick}
          onQuickInfoClick={handleQuickInfoClick}
          onPerformanceClick={handlePerformanceClick}
          onRemoveClick={handleRemoveClick}
          className={className}
          imageError={imageError}
          setImageError={setImageError}
        />
      );
      
    case 'standard':
    default:
      return (
        <StandardVariant
          stock={stock}
          calculations={calculations}
          showMiniChart={showMiniChart}
          showValuation={showValuation}
          showActions={showActions}
          onCardClick={handleCardClick}
          onQuickInfoClick={handleQuickInfoClick}
          onPerformanceClick={handlePerformanceClick}
          className={className}
          imageError={imageError}
          setImageError={setImageError}
        />
      );
  }
});

/**
 * COMPACT VARIANT
 * Minimal layout for lists and grids
 */
function CompactVariant({ 
  stock, 
  calculations, 
  showRemove, 
  showActions,
  onCardClick, 
  onQuickInfoClick, 
  onPerformanceClick, 
  onRemoveClick,
  className,
  imageError,
  setImageError
}: any) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        "bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-sm",
        "border-border/50 hover:border-primary/50",
        className
      )}
      onClick={onCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo */}
            <div className="w-8 h-8 rounded-lg bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
              {stock.logo && !imageError ? (
                <OptimizedImage
                  src={stock.logo}
                  alt={`${stock.name} logo`}
                  className="w-full h-full object-cover rounded-lg"
                  onError={() => setImageError(true)}
                  priority="low"
                  lazy
                />
              ) : (
                <span className="text-xs font-bold text-primary">
                  {stock.symbol.charAt(0)}
                </span>
              )}
            </div>
            
            {/* Stock info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{stock.symbol}</div>
              <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
            </div>
          </div>
          
          {/* Price and change */}
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-sm">${calculations.currentPrice.toFixed(2)}</div>
            <div className={cn(
              "text-xs font-medium",
              calculations.isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {calculations.isPositive ? '+' : ''}{calculations.changePercent.toFixed(1)}%
            </div>
          </div>
          
          {/* Actions */}
          {(showActions || showRemove) && (
            <div className="ml-2 flex gap-1">
              {showActions && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={onQuickInfoClick}
                >
                  <Info className="h-3 w-3" />
                </Button>
              )}
              {showRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={onRemoveClick}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * STANDARD VARIANT
 * Default layout matching original StockCard
 */
function StandardVariant({ 
  stock, 
  calculations, 
  showMiniChart, 
  showValuation, 
  showActions,
  onCardClick, 
  onQuickInfoClick, 
  onPerformanceClick,
  className,
  imageError,
  setImageError
}: any) {
  return (
    <div 
      className={cn(
        "group relative bg-card/50 backdrop-blur-sm border border-teya-green/30 hover:border-teya-green rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-teya-green/20 hover:-translate-y-1 hover:bg-gradient-to-br hover:from-teya-green/5 hover:to-teya-green/10",
        className
      )}
      onClick={onCardClick}
    >
      {/* Action Icons */}
      {showActions && (
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-teya-green/10 hover:text-teya-green transition-all duration-300"
            onClick={onQuickInfoClick}
            title="Quick Company Overview"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-teya-green/10 hover:text-teya-green transition-all duration-300"
            onClick={onPerformanceClick}
            title="View Performance Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        {/* Company Logo */}
        <div className="w-12 h-12 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
          {stock.logo && !imageError ? (
            <OptimizedImage
              src={stock.logo}
              alt={`${stock.name} logo`}
              className="w-full h-full object-cover rounded-xl"
              onError={() => setImageError(true)}
              priority="low"
              lazy
            />
          ) : (
            <span className="text-sm font-bold text-primary">
              {stock.symbol.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-lg">{stock.symbol}</div>
          <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-foreground">${calculations.currentPrice.toFixed(2)}</span>
          <div className={cn(
            "px-2 py-1 rounded-lg text-sm font-semibold",
            calculations.isPositive 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-red-500/10 text-red-500"
          )}>
            {calculations.isPositive ? '+' : ''}{calculations.changePercent.toFixed(1)}%
          </div>
        </div>

        {/* Intrinsic Value Section - REDESIGNED WITH FOCUS */}
        {showValuation && calculations.intrinsicValue && (
          <div className="bg-gradient-to-r from-teya-green/5 to-teya-green/10 border border-teya-green/20 rounded-lg p-4 space-y-3">
            {/* IV Header with prominent display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teya-green/20 rounded-lg">
                  <Calculator className="h-4 w-4 text-teya-green" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">Valor Intrínseco</span>
                  <div className="text-xs text-muted-foreground">DCF Model</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-teya-green">${calculations.intrinsicValue.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Fair Value</div>
              </div>
            </div>
            
            {/* Valuation Analysis with visual indicator */}
            <div className="flex items-center justify-between p-3 bg-background/60 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  calculations.isUndervalued ? "bg-green-500" : "bg-red-500"
                )} />
                <div>
                  <Badge 
                    variant={calculations.isUndervalued ? "default" : "secondary"}
                    className={cn(
                      "text-xs font-medium",
                      calculations.isUndervalued 
                        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200" 
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200"
                    )}
                  >
                    {calculations.isUndervalued ? (
                      <>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Subvalorizada
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Sobrevalorizada
                      </>
                    )}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "text-sm font-bold",
                  calculations.isUndervalued ? "text-green-600" : "text-red-600"
                )}>
                  {calculations.isUndervalued ? '' : '+'}{calculations.valuationDiff?.toFixed(1)}%
                </span>
                <div className="text-xs text-muted-foreground">vs. Preço</div>
              </div>
            </div>

            {/* Value Insight */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>
                {calculations.isUndervalued 
                  ? `Potencial upside de ${Math.abs(calculations.valuationDiff || 0).toFixed(0)}%`
                  : `Risco de correção de ${Math.abs(calculations.valuationDiff || 0).toFixed(0)}%`
                }
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Market Cap</span>
          <span className="text-foreground font-medium">{stock.marketCap}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Change</span>
          <span className={cn(
            "font-medium",
            calculations.isPositive ? "text-emerald-500" : "text-red-500"
          )}>
            {calculations.isPositive ? '+' : ''}${calculations.change}
          </span>
        </div>
        
        {/* Mini Chart */}
        {showMiniChart && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Price (1M)</span>
              <span className={cn(
                "text-xs font-medium",
                calculations.isPositive ? "text-emerald-500" : "text-red-500"
              )}>
                {calculations.isPositive ? '↗' : '↘'} {Math.abs(calculations.changePercent).toFixed(1)}%
              </span>
            </div>
            <MiniChart stock={stock} type="price" height={40} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ENHANCED VARIANT
 * Feature-rich layout with additional analytics
 */
function EnhancedVariant({ 
  stock, 
  calculations, 
  showMiniChart, 
  showValuation, 
  showRemove, 
  showActions,
  ivLoading,
  onCardClick, 
  onQuickInfoClick, 
  onPerformanceClick, 
  onRemoveClick,
  className,
  imageError,
  setImageError
}: any) {
  return (
    <Card className={cn("h-full hover:shadow-lg transition-shadow", className)}>
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
              {stock.logo && !imageError ? (
                <OptimizedImage
                  src={stock.logo}
                  alt={`${stock.name} logo`}
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setImageError(true)}
                  priority="low"
                  lazy
                />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {stock.symbol.charAt(0)}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg">{stock.symbol}</h3>
              <p className="text-sm text-muted-foreground truncate">{stock.name}</p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1">
            {showActions && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onQuickInfoClick}
                  className="h-8 w-8 p-0"
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onPerformanceClick}
                  className="h-8 w-8 p-0"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </>
            )}
            {showRemove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemoveClick}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent 
        className="space-y-4 cursor-pointer" 
        onClick={onCardClick}
      >
        {/* Price section */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">${calculations.currentPrice.toFixed(2)}</div>
          <div className={cn(
            "px-2 py-1 rounded text-sm font-semibold",
            calculations.isPositive 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" 
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          )}>
            <div className="flex items-center gap-1">
              {calculations.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {calculations.isPositive ? '+' : ''}{calculations.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Intrinsic Value Section - ENHANCED REDESIGN */}
        {showValuation && (
          <div className="space-y-3">
            {ivLoading ? (
              <div className="flex items-center justify-center p-4 bg-secondary/20 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Calculando valor intrínseco...</span>
              </div>
            ) : calculations.intrinsicValue ? (
              <div className="bg-gradient-to-br from-teya-green/10 to-teya-green/5 border border-teya-green/30 rounded-lg p-4 space-y-3">
                {/* IV Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-teya-green/20 rounded-lg">
                      <Calculator className="h-4 w-4 text-teya-green" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold">Valor Intrínseco</span>
                      <div className="text-xs text-muted-foreground">DCF Analysis</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-teya-green">${calculations.intrinsicValue.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Fair Value</div>
                  </div>
                </div>
                
                {/* Valuation Analysis */}
                {calculations.valuationDiff !== null && (
                  <div className="flex items-center justify-between p-3 bg-background/70 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        calculations.isUndervalued ? "bg-green-500" : "bg-red-500"
                      )} />
                      <Badge 
                        variant={calculations.isUndervalued ? "default" : "secondary"}
                        className={cn(
                          "font-medium",
                          calculations.isUndervalued 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200" 
                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200"
                        )}
                      >
                        {calculations.isUndervalued ? (
                          <>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Subvalorizada
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Sobrevalorizada
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-sm font-bold",
                        calculations.isUndervalued ? "text-green-600" : "text-red-600"
                      )}>
                        {calculations.valuationDiff > 0 ? '+' : ''}{calculations.valuationDiff.toFixed(1)}%
                      </span>
                      <div className="text-xs text-muted-foreground">vs. Mercado</div>
                    </div>
                  </div>
                )}

                {/* Investment Insight */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/40 p-2 rounded">
                  <Target className="h-3 w-3 mt-0.5" />
                  <span>
                    {calculations.isUndervalued 
                      ? `Oportunidade de investimento - potencial upside de ${Math.abs(calculations.valuationDiff || 0).toFixed(0)}%`
                      : `Avaliação premium - considere aguardar correção de ${Math.abs(calculations.valuationDiff || 0).toFixed(0)}%`
                    }
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 border border-dashed border-muted-foreground/30 rounded-lg">
                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Valor intrínseco não disponível</span>
              </div>
            )}
          </div>
        )}

        {/* Additional metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Market Cap</div>
            <div className="font-medium">{stock.marketCap}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Change</div>
            <div className={cn(
              "font-medium",
              calculations.isPositive ? "text-emerald-600" : "text-red-600"
            )}>
              {calculations.isPositive ? '+' : ''}${calculations.change}
            </div>
          </div>
        </div>

        {/* Mini Chart */}
        {showMiniChart && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Price Trend</span>
              <ChartLine className="h-3 w-3 text-muted-foreground" />
            </div>
            <MiniChart stock={stock} type="price" height={60} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * LOADING SKELETON
 */
function LoadingSkeleton({ variant }: { variant: string }) {
  if (variant === 'compact') {
    return (
      <Card className="cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'enhanced') {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Standard variant
  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/**
 * ERROR STATE
 */
function ErrorState({ variant, symbol }: { variant: string, symbol: string }) {
  const baseClass = variant === 'compact' ? "p-4" : "p-6";
  
  return (
    <div className={cn("bg-card/50 border border-border rounded-xl", baseClass)}>
      <div className="text-center text-muted-foreground">
        <div className="text-sm font-medium">{symbol}</div>
        <div className="text-xs">Failed to load data</div>
      </div>
    </div>
  );
}

export default UnifiedStockCard;