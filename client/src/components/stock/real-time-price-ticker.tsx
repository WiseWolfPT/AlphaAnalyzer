import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface RealTimePriceTickerProps {
  symbol: string;
  initialPrice?: number;
  className?: string;
  compact?: boolean;
  showVolume?: boolean;
  updateInterval?: number; // in milliseconds
}

export function RealTimePriceTicker({
  symbol,
  initialPrice = 100,
  className,
  compact = false,
  showVolume = true,
  updateInterval = 3000
}: RealTimePriceTickerProps) {
  const [priceData, setPriceData] = useState<PriceData>({
    symbol,
    price: initialPrice,
    change: 0,
    changePercent: 0,
    volume: 0,
    timestamp: Date.now()
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [prevPrice, setPrevPrice] = useState(initialPrice);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  // Simulate real-time price updates
  useEffect(() => {
    const updatePrice = () => {
      setIsUpdating(true);
      setPrevPrice(priceData.price);
      
      // Generate realistic price movement
      const volatility = 0.005; // 0.5% volatility
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const newPrice = priceData.price * (1 + randomChange);
      const change = newPrice - initialPrice;
      const changePercent = (change / initialPrice) * 100;
      const newVolume = Math.floor(Math.random() * 1000000) + 500000;
      
      setPriceData({
        symbol,
        price: newPrice,
        change,
        changePercent,
        volume: newVolume,
        timestamp: Date.now()
      });
      
      // Remove updating animation after 500ms
      setTimeout(() => setIsUpdating(false), 500);
    };
    
    intervalRef.current = setInterval(updatePrice, updateInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, initialPrice, updateInterval, priceData.price]);
  
  const getPriceDirection = () => {
    if (priceData.price > prevPrice) return 'up';
    if (priceData.price < prevPrice) return 'down';
    return 'neutral';
  };
  
  const direction = getPriceDirection();
  
  const getTrendIcon = () => {
    if (priceData.changePercent > 0) return <TrendingUp className="h-3 w-3" />;
    if (priceData.changePercent < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };
  
  const getTrendColor = () => {
    if (priceData.changePercent > 0) return 'text-positive';
    if (priceData.changePercent < 0) return 'text-negative';
    return 'text-neutral';
  };
  
  const getPriceColor = () => {
    if (direction === 'up') return 'text-positive';
    if (direction === 'down') return 'text-negative';
    return 'text-foreground';
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };
  
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };
  
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            {symbol}
          </span>
          <span 
            className={cn(
              "text-sm font-semibold transition-colors duration-300",
              getPriceColor(),
              isUpdating && "animate-pulse"
            )}
          >
            {formatPrice(priceData.price)}
          </span>
        </div>
        
        <Badge 
          variant="outline" 
          className={cn(
            "flex items-center gap-1 text-xs transition-all duration-300",
            getTrendColor(),
            isUpdating && "scale-105"
          )}
        >
          {getTrendIcon()}
          {priceData.changePercent >= 0 ? '+' : ''}
          {priceData.changePercent.toFixed(2)}%
        </Badge>
      </div>
    );
  }
  
  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md",
      isUpdating && "ring-2 ring-primary/20 shadow-lg",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{symbol}</h3>
            <div 
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                direction === 'up' ? "bg-positive animate-ping" : 
                direction === 'down' ? "bg-negative animate-ping" : 
                "bg-neutral"
              )}
            />
          </div>
          
          <div className="text-xs text-muted-foreground">
            Live
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div 
                className={cn(
                  "text-2xl font-bold transition-all duration-300",
                  getPriceColor(),
                  isUpdating && "scale-105"
                )}
              >
                {formatPrice(priceData.price)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-1",
                    getTrendColor()
                  )}
                >
                  {getTrendIcon()}
                  {priceData.change >= 0 ? '+' : ''}
                  {formatPrice(priceData.change)}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-1",
                    getTrendColor()
                  )}
                >
                  {priceData.changePercent >= 0 ? '+' : ''}
                  {priceData.changePercent.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>
          
          {showVolume && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium">{formatVolume(priceData.volume)}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last Updated</span>
            <span>
              {new Date(priceData.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid component for multiple tickers
interface PriceTickerGridProps {
  symbols: { symbol: string; initialPrice: number }[];
  className?: string;
  compact?: boolean;
  updateInterval?: number;
}

export function PriceTickerGrid({ 
  symbols, 
  className, 
  compact = false,
  updateInterval = 3000 
}: PriceTickerGridProps) {
  if (compact) {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", className)}>
        {symbols.map(({ symbol, initialPrice }) => (
          <RealTimePriceTicker
            key={symbol}
            symbol={symbol}
            initialPrice={initialPrice}
            compact={compact}
            updateInterval={updateInterval + Math.random() * 1000} // Stagger updates
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", className)}>
      {symbols.map(({ symbol, initialPrice }) => (
        <RealTimePriceTicker
          key={symbol}
          symbol={symbol}
          initialPrice={initialPrice}
          compact={compact}
          updateInterval={updateInterval + Math.random() * 1000} // Stagger updates
        />
      ))}
    </div>
  );
}