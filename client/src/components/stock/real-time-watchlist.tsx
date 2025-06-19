import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Eye, MoreHorizontal, Star, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface WatchlistStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  isWatched: boolean;
  lastUpdate: number;
}

interface RealTimeWatchlistProps {
  initialStocks?: WatchlistStock[];
  title?: string;
  maxItems?: number;
  updateInterval?: number;
  onStockClick?: (symbol: string) => void;
  onToggleWatch?: (symbol: string) => void;
  className?: string;
}

const defaultStocks: WatchlistStock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change: 2.34, changePercent: 1.35, volume: 52000000, marketCap: 2800000000000, isWatched: true, lastUpdate: Date.now() },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.56, change: -1.23, changePercent: -0.85, volume: 28000000, marketCap: 1800000000000, isWatched: true, lastUpdate: Date.now() },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.85, change: 4.12, changePercent: 1.10, volume: 35000000, marketCap: 2800000000000, isWatched: false, lastUpdate: Date.now() },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 208.91, change: -5.67, changePercent: -2.64, volume: 95000000, marketCap: 663000000000, isWatched: true, lastUpdate: Date.now() },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 155.23, change: 0.89, changePercent: 0.58, volume: 42000000, marketCap: 1600000000000, isWatched: false, lastUpdate: Date.now() },
];

export function RealTimeWatchlist({
  initialStocks = defaultStocks,
  title = "Market Watchlist",
  maxItems = 10,
  updateInterval = 4000,
  onStockClick,
  onToggleWatch,
  className
}: RealTimeWatchlistProps) {
  const [stocks, setStocks] = useState<WatchlistStock[]>(initialStocks.slice(0, maxItems));
  const [updatingStocks, setUpdatingStocks] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const updateStocks = () => {
      setStocks(prevStocks => {
        const updatedStocks = prevStocks.map(stock => {
          // Randomly update some stocks
          if (Math.random() > 0.3) return stock;

          setUpdatingStocks(prev => new Set(prev).add(stock.symbol));
          
          // Simulate price movement
          const volatility = stock.symbol === 'TSLA' ? 0.015 : 0.008; // Tesla more volatile
          const randomChange = (Math.random() - 0.5) * 2 * volatility;
          const newPrice = stock.price * (1 + randomChange);
          const change = newPrice - (stock.price - stock.change); // Base price
          const changePercent = (change / (stock.price - stock.change)) * 100;
          
          // Update volume
          const volumeChange = (Math.random() - 0.5) * 0.2;
          const newVolume = Math.max(1000000, stock.volume * (1 + volumeChange));

          return {
            ...stock,
            price: newPrice,
            change,
            changePercent,
            volume: Math.floor(newVolume),
            lastUpdate: Date.now()
          };
        });

        // Clear updating indicators after animation
        setTimeout(() => {
          setUpdatingStocks(new Set());
        }, 600);

        return updatedStocks;
      });
    };

    intervalRef.current = setInterval(updateStocks, updateInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateInterval]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}T`;
    if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}B`;
    if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}M`;
    return marketCap.toString();
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };

  const getTrendIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUp className="h-3 w-3" />;
    if (changePercent < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-positive';
    if (changePercent < 0) return 'text-negative';
    return 'text-muted-foreground';
  };

  const handleStockClick = (symbol: string) => {
    onStockClick?.(symbol);
  };

  const handleToggleWatch = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWatch?.(symbol);
    setStocks(prev => prev.map(stock => 
      stock.symbol === symbol 
        ? { ...stock, isWatched: !stock.isWatched }
        : stock
    ));
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {title}
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="w-[100px] text-xs font-medium">Symbol</TableHead>
                <TableHead className="text-xs font-medium">Price</TableHead>
                <TableHead className="text-xs font-medium">Change</TableHead>
                <TableHead className="text-xs font-medium hidden sm:table-cell">Volume</TableHead>
                <TableHead className="text-xs font-medium hidden md:table-cell">Market Cap</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => {
                const isUpdating = updatingStocks.has(stock.symbol);
                return (
                  <TableRow
                    key={stock.symbol}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:bg-muted/50",
                      isUpdating && "bg-primary/5 animate-pulse"
                    )}
                    onClick={() => handleStockClick(stock.symbol)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => handleToggleWatch(stock.symbol, e)}
                        >
                          <Star 
                            className={cn(
                              "h-3 w-3",
                              stock.isWatched 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-muted-foreground hover:text-yellow-400"
                            )}
                          />
                        </Button>
                        <div>
                          <div className="font-semibold text-sm">{stock.symbol}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[80px]">
                            {stock.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className={cn(
                        "font-semibold transition-all duration-300",
                        isUpdating && "scale-105"
                      )}>
                        {formatPrice(stock.price)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "flex items-center gap-1 w-fit text-xs",
                            getTrendColor(stock.changePercent)
                          )}
                        >
                          {getTrendIcon(stock.changePercent)}
                          {stock.change >= 0 ? '+' : ''}
                          {formatPrice(stock.change)}
                        </Badge>
                        <div className={cn(
                          "text-xs",
                          getTrendColor(stock.changePercent)
                        )}>
                          {stock.changePercent >= 0 ? '+' : ''}
                          {stock.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-sm font-medium">
                        {formatVolume(stock.volume)}
                      </div>
                    </TableCell>
                    
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm font-medium">
                        {formatMarketCap(stock.marketCap)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStockClick(stock.symbol)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault();
                            handleToggleWatch(stock.symbol, e);
                          }}>
                            {stock.isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between p-4 border-t border-border/50 bg-muted/20">
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-positive rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}