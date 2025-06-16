import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Target, TrendingUp, TrendingDown, ExternalLink, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { MockStock } from "@/lib/mock-api";

interface QuickInfoModalProps {
  stock: MockStock | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickInfoModal({ stock, isOpen, onClose }: QuickInfoModalProps) {
  if (!stock) return null;

  const changePercent = parseFloat(stock.changePercent);
  const isPositive = changePercent >= 0;
  const currentPrice = parseFloat(stock.price);
  const intrinsicValue = stock.intrinsicValue ? parseFloat(stock.intrinsicValue) : null;
  const valuationDiff = intrinsicValue ? ((currentPrice - intrinsicValue) / intrinsicValue) * 100 : null;
  const isUndervalued = valuationDiff ? valuationDiff < 0 : false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
              {stock.logo ? (
                <img
                  src={stock.logo}
                  alt={`${stock.name} logo`}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {stock.symbol.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-lg">{stock.symbol}</div>
              <div className="text-sm text-muted-foreground font-normal">{stock.name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Price & Change */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">${stock.price}</span>
            <div className={cn(
              "px-2 py-1 rounded-lg text-sm font-semibold flex items-center gap-1",
              isPositive 
                ? "bg-emerald-500/10 text-emerald-500" 
                : "bg-red-500/10 text-red-500"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}{stock.changePercent}%
            </div>
          </div>

          <Separator />

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Cap</span>
              <span className="font-medium">{stock.marketCap}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change</span>
              <span className={cn(
                "font-medium",
                isPositive ? "text-emerald-500" : "text-red-500"
              )}>
                {isPositive ? '+' : ''}${stock.change}
              </span>
            </div>
            {stock.peRatio && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">P/E Ratio</span>
                <span className="font-medium">{stock.peRatio}</span>
              </div>
            )}
            {stock.eps && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">EPS</span>
                <span className="font-medium">${stock.eps}</span>
              </div>
            )}
          </div>

          {/* Intrinsic Value Section */}
          {intrinsicValue && (
            <>
              <Separator />
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
            </>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Link href={`/stock/${stock.symbol}/charts`} className="flex-1">
              <Button className="w-full" onClick={onClose}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Advanced Charts
              </Button>
            </Link>
            <Button variant="outline" size="icon" title="Company Website">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}