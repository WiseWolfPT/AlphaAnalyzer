import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  BarChart3, 
  Calculator, 
  DollarSign,
  Loader2,
  X,
  Target,
  PieChart,
  Activity
} from "lucide-react";
import { useStock } from "@/hooks/use-enhanced-stocks";
import { useMockEnhancedValuation } from "@/hooks/use-enhanced-valuation";
import { EnhancedValuationDashboard } from "@/components/valuation/enhanced-valuation-dashboard";
import { useNormalizedStock, getStockPrice, getStockChangePercent, getStockChange, isStockPositive } from "@/lib/stock-data-normalizer";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { StockCardProps } from "./types";

export function EnhancedStockCardWithValuation({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick,
  onRemove,
  showRemove = false
}: StockCardProps) {
  const { data: rawStock, isLoading: stockLoading, error: stockError } = useStock(symbol);
  const stock = useNormalizedStock(rawStock);
  const currentPrice = getStockPrice(stock || {});
  const { data: enhancedValuation, isLoading: valuationLoading } = useMockEnhancedValuation(
    symbol, 
    currentPrice || 100
  );
  const [, setLocation] = useLocation();
  const [isValuationOpen, setIsValuationOpen] = useState(false);

  const handleChartsClick = () => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleValuationClick = () => {
    setIsValuationOpen(true);
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

  const isPositive = isStockPositive(stock);
  
  // Enhanced valuation data
  const hasEnhancedValuation = enhancedValuation && !valuationLoading;
  const consensusValue = hasEnhancedValuation ? enhancedValuation.consensus.value : null;
  const safetyMargin = hasEnhancedValuation && consensusValue 
    ? ((consensusValue - currentPrice) / currentPrice) * 100
    : null;
  const modelCount = hasEnhancedValuation ? enhancedValuation.models.length : 0;
  const confidenceScore = hasEnhancedValuation ? enhancedValuation.consensus.confidence * 100 : null;

  return (
    <>
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
              <span className="font-semibold">{Math.abs(getStockChangePercent(stock)).toFixed(2)}%</span>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg">{stock.symbol}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{stock.name}</p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <p className="text-2xl font-bold">${currentPrice.toFixed(2)}</p>
            <p className={cn(
              "text-sm",
              isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {isPositive ? '+' : ''}{getStockChange(stock).toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground text-xs">Market Cap</p>
              <p className="font-semibold">{typeof stock.marketCap === 'string' ? stock.marketCap : formatMarketCap(Number(stock.marketCap))}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground text-xs">Volume</p>
              <p className="font-semibold">{formatVolume(Number((stock as any)?.volume || 0))}</p>
            </div>
            
            {/* Enhanced Valuation Metrics */}
            {hasEnhancedValuation && consensusValue && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                <p className="text-muted-foreground text-xs">Consensus Value</p>
                <p className="font-semibold text-blue-600">${consensusValue.toFixed(2)}</p>
              </div>
            )}
            
            {hasEnhancedValuation && safetyMargin !== null && (
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

          {/* Enhanced Valuation Summary */}
          {hasEnhancedValuation && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Valuation Analysis</span>
                <Badge variant={
                  enhancedValuation.consensus.classification === 'undervalued' ? 'default' :
                  enhancedValuation.consensus.classification === 'overvalued' ? 'destructive' : 'secondary'
                } size="sm">
                  {enhancedValuation.consensus.classification}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="text-muted-foreground">Models</p>
                  <p className="font-semibold">{modelCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{confidenceScore?.toFixed(0)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Upside</p>
                  <p className={cn(
                    "font-semibold",
                    safetyMargin && safetyMargin > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {safetyMargin?.toFixed(0)}%
                  </p>
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
              Charts
            </Button>
            <Dialog open={isValuationOpen} onOpenChange={setIsValuationOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleValuationClick}
                >
                  <Calculator className="h-4 w-4 mr-1" />
                  Valuation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Enhanced Valuation Analysis - {symbol}
                  </DialogTitle>
                </DialogHeader>
                {hasEnhancedValuation ? (
                  <EnhancedValuationDashboard
                    symbol={symbol}
                    companyName={stock?.name || `${symbol} Inc.`}
                    currentPrice={currentPrice}
                    valuationData={enhancedValuation}
                    onRecalculate={() => {
                      // TODO: Implement recalculation
                      console.log('Recalculating valuation...');
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      {valuationLoading ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">Loading valuation models...</p>
                        </>
                      ) : (
                        <>
                          <Calculator className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No valuation data available</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
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