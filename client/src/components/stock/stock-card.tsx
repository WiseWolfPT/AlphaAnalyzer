import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, TrendingUp, TrendingDown, ChartLine, LineChart, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniChart } from "./mini-charts";
import { FeatureLimiter } from "@/components/beta/feature-limiter";
import type { MockStock } from "@/lib/mock-api";

interface StockCardProps {
  stock: MockStock;
  onPerformanceClick: () => void;
  onQuickInfoClick: () => void;
  showMiniChart?: boolean;
}

export function StockCard({ stock, onPerformanceClick, onQuickInfoClick, showMiniChart = true }: StockCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const changePercent = parseFloat(stock.changePercent);
  const isPositive = changePercent >= 0;
  
  // Intrinsic value calculations
  const currentPrice = parseFloat(stock.price);
  const intrinsicValue = stock.intrinsicValue ? parseFloat(stock.intrinsicValue) : null;
  const valuationDiff = intrinsicValue ? ((currentPrice - intrinsicValue) / intrinsicValue) * 100 : null;
  const isUndervalued = valuationDiff ? valuationDiff < 0 : false;

  return (
    <Link href={`/stock/${stock.symbol}/charts`}>
      <div className="group relative bg-card/50 backdrop-blur-sm border border-chartreuse/30 hover:border-chartreuse rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-chartreuse/20 hover:-translate-y-1 hover:bg-gradient-to-br hover:from-chartreuse/5 hover:to-chartreuse/10">
        {/* Action Icons */}
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-chartreuse/10 hover:text-chartreuse transition-all duration-300"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickInfoClick();
            }}
            title="Quick Company Overview"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-chartreuse/10 hover:text-chartreuse transition-all duration-300"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPerformanceClick();
            }}
            title="View Performance Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-start gap-4 mb-4">
          {/* Company Logo */}
          <div className="w-12 h-12 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
            {stock.logo && !imageError ? (
              <img
                src={stock.logo}
                alt={`${stock.name} logo`}
                className="w-full h-full object-cover rounded-xl"
                onError={() => setImageError(true)}
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
            <span className="text-2xl font-bold text-foreground">${stock.price}</span>
            <div className={cn(
              "px-2 py-1 rounded-lg text-sm font-semibold",
              isPositive 
                ? "bg-emerald-500/10 text-emerald-500" 
                : "bg-red-500/10 text-red-500"
            )}>
              {isPositive ? '+' : ''}{stock.changePercent}%
            </div>
          </div>

          {/* Intrinsic Value Section */}
          {intrinsicValue && (
            <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Intrinsic Value</span>
                </div>
                <span className="text-sm font-bold text-primary">${intrinsicValue.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge 
                  variant={isUndervalued ? "default" : "secondary"}
                  className={cn(
                    "text-xs flex items-center gap-1",
                    isUndervalued 
                      ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" 
                      : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                  )}
                >
                  {isUndervalued ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isUndervalued ? 'Undervalued' : 'Overvalued'}
                </Badge>
                <span className={cn(
                  "text-xs font-medium",
                  isUndervalued ? "text-green-600" : "text-red-600"
                )}>
                  {isUndervalued ? '' : '+'}{valuationDiff?.toFixed(1)}%
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
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {isPositive ? '+' : ''}${stock.change}
            </span>
          </div>
          
          {/* Mini Chart */}
          {showMiniChart && (
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Price (1M)</span>
                <span className={cn(
                  "text-xs font-medium",
                  isPositive ? "text-emerald-500" : "text-red-500"
                )}>
                  {isPositive ? '↗' : '↘'} {Math.abs(changePercent).toFixed(1)}%
                </span>
              </div>
              <MiniChart stock={stock} type="price" height={40} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
