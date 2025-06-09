import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { MockStock } from "@/lib/mock-api";

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: MockStock | null;
}

interface PerformanceMetric {
  period: string;
  value: number;
  color: string;
}

export function PerformanceModal({ isOpen, onClose, stock }: PerformanceModalProps) {
  if (!stock) return null;

  // Generate mock price data for the last 30 days
  const generatePriceData = () => {
    const data = [];
    const basePrice = parseFloat(stock.price);
    let currentPrice = basePrice;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some realistic price movement
      const change = (Math.random() - 0.5) * (basePrice * 0.02); // 2% max daily movement
      currentPrice = Math.max(currentPrice + change, basePrice * 0.8); // Don't go below 80% of current price
      
      data.push({
        date: date.toLocaleDateString(),
        price: parseFloat(currentPrice.toFixed(2))
      });
    }
    
    return data;
  };

  const priceData = generatePriceData();
  const isPositiveTrend = priceData[priceData.length - 1].price > priceData[0].price;

  // Mock performance data - in a real app, this would come from an API
  const performanceMetrics: PerformanceMetric[] = [
    { 
      period: "1M", 
      value: 5.67 + (Math.random() - 0.5) * 10, 
      color: "text-positive" 
    },
    { 
      period: "3M", 
      value: 12.34 + (Math.random() - 0.5) * 15, 
      color: "text-positive" 
    },
    { 
      period: "YTD", 
      value: -2.11 + (Math.random() - 0.5) * 20, 
      color: "text-negative" 
    },
    { 
      period: "1Y", 
      value: 28.91 + (Math.random() - 0.5) * 25, 
      color: "text-positive" 
    },
    { 
      period: "3Y (Ann.)", 
      value: 15.43 + (Math.random() - 0.5) * 20, 
      color: "text-positive" 
    },
    { 
      period: "5Y (Ann.)", 
      value: 18.76 + (Math.random() - 0.5) * 15, 
      color: "text-positive" 
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                {stock.logo ? (
                  <img
                    src={stock.logo}
                    alt={`${stock.name} logo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {stock.symbol.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <span className="font-semibold">{stock.symbol}</span>
                <span className="text-sm text-muted-foreground ml-2">Performance Metrics</span>
              </div>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current Price */}
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <span className="text-sm text-muted-foreground">Current Price</span>
            <div className="text-right">
              <div className="font-semibold">${stock.price}</div>
              <div className={cn(
                "text-sm",
                parseFloat(stock.changePercent) >= 0 ? "text-positive" : "text-negative"
              )}>
                {parseFloat(stock.changePercent) >= 0 ? '+' : ''}${stock.change} ({parseFloat(stock.changePercent) >= 0 ? '+' : ''}{stock.changePercent}%)
              </div>
            </div>
          </div>

          {/* Price Chart (30 days) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                30-Day Price Trend
              </h4>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isPositiveTrend ? "text-green-600" : "text-red-600"
              )}>
                {isPositiveTrend ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isPositiveTrend ? "Uptrend" : "Downtrend"}
              </div>
            </div>
            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceData}>
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={isPositiveTrend ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="0"
                  />
                  <Tooltip 
                    formatter={(value: any) => [`$${value}`, 'Price']}
                    labelStyle={{ color: '#1F2937' }}
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Historical Performance
            </h4>
            {performanceMetrics.map((metric) => (
              <div key={metric.period} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{metric.period}</span>
                <div className="flex items-center space-x-2">
                  {metric.value >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-positive" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-negative" />
                  )}
                  <span className={cn(
                    "font-medium text-sm",
                    metric.value >= 0 ? "text-positive" : "text-negative"
                  )}>
                    {metric.value >= 0 ? '+' : ''}{metric.value.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Metrics */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Key Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">P/E Ratio</span>
                <span className="font-medium">{stock.peRatio || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EPS</span>
                <span className="font-medium">${stock.eps || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market Cap</span>
                <span className="font-medium">{stock.marketCap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sector</span>
                <span className="font-medium">{stock.sector || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <Button 
              className="flex-1 bg-chart-1 hover:bg-chart-1/80 text-black"
              onClick={() => {
                // Navigate to stock detail page
                window.location.href = `/stock/${stock.symbol}`;
              }}
            >
              View Details
            </Button>
            <Button variant="outline" className="flex-1">
              Add to Watchlist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
