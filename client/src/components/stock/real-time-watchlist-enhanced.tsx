import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, Eye, MoreHorizontal, Star, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { realDataService } from "@/services/real-data-integration";
import type { StockQuote } from "@/services/real-data-integration";

interface WatchlistStock extends StockQuote {
  volume: number;
  isWatched: boolean;
}

interface RealTimeWatchlistProps {
  symbols?: string[];
  title?: string;
  maxItems?: number;
  updateInterval?: number;
  onStockClick?: (symbol: string) => void;
  onToggleWatch?: (symbol: string) => void;
  className?: string;
}

const defaultSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA'];

export function RealTimeWatchlistEnhanced({
  symbols = defaultSymbols,
  title = "Market Watchlist",
  maxItems = 10,
  updateInterval = 30000, // 30 seconds
  onStockClick,
  onToggleWatch,
  className
}: RealTimeWatchlistProps) {
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStocks, setUpdatingStocks] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchStockData = async () => {
    try {
      console.log('🔄 Fetching real-time stock data for watchlist...');
      const quotes = await realDataService.getBatchQuotes(symbols.slice(0, maxItems));
      
      const watchlistStocks: WatchlistStock[] = [];
      
      for (const [symbol, quote] of Object.entries(quotes)) {
        if (quote) {
          watchlistStocks.push({
            ...quote,
            volume: Math.floor(Math.random() * 50000000) + 10000000, // Mock volume for now
            isWatched: true
          });
        }
      }

      setStocks(watchlistStocks);
      setLoading(false);
      console.log('✅ Watchlist updated with real data');
    } catch (error) {
      console.error('❌ Failed to fetch watchlist data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStockData();

    // Set up interval for updates
    intervalRef.current = setInterval(() => {
      setUpdatingStocks(new Set(stocks.map(s => s.symbol)));
      fetchStockData().then(() => {
        setTimeout(() => setUpdatingStocks(new Set()), 600);
      });
    }, updateInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [symbols.join(','), updateInterval]);

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numPrice);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };

  const formatMarketCap = (marketCap: string) => {
    // Market cap is already formatted as string (e.g., "2.8T")
    return marketCap;
  };

  const getPriceChangeIcon = (changePercent: string | number) => {
    const numChange = typeof changePercent === 'string' ? parseFloat(changePercent) : changePercent;
    if (numChange > 0) return <TrendingUp className="h-4 w-4" />;
    if (numChange < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getPriceChangeColor = (changePercent: string | number) => {
    const numChange = typeof changePercent === 'string' ? parseFloat(changePercent) : changePercent;
    if (numChange > 0) return "text-green-600";
    if (numChange < 0) return "text-red-600";
    return "text-gray-500";
  };

  const handleWatchToggle = (symbol: string) => {
    setStocks(prev => prev.map(stock => 
      stock.symbol === symbol ? { ...stock, isWatched: !stock.isWatched } : stock
    ));
    onToggleWatch?.(symbol);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <Badge variant="secondary">Loading...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Fetching real-time data...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Real-time
            </Badge>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Market Cap</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stocks.map(stock => (
              <TableRow 
                key={stock.symbol}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  updatingStocks.has(stock.symbol) && "animate-pulse"
                )}
                onClick={() => onStockClick?.(stock.symbol)}
              >
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatchToggle(stock.symbol);
                    }}
                  >
                    <Star className={cn(
                      "h-4 w-4",
                      stock.isWatched && "fill-yellow-500 text-yellow-500"
                    )} />
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{stock.symbol}</TableCell>
                <TableCell className="text-muted-foreground max-w-[150px] truncate">
                  {stock.name}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatPrice(stock.price)}
                </TableCell>
                <TableCell className={cn("text-right", getPriceChangeColor(stock.changePercent))}>
                  <div className="flex items-center justify-end gap-1">
                    {getPriceChangeIcon(stock.changePercent)}
                    <span className="font-mono">
                      {(() => {
                        const change = typeof stock.changePercent === 'string' ? parseFloat(stock.changePercent) : stock.changePercent;
                        return isNaN(change) ? '0.00' : change.toFixed(2);
                      })()}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatVolume(stock.volume)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMarketCap(stock.marketCap)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onStockClick?.(stock.symbol)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleWatchToggle(stock.symbol)}>
                        <Star className="mr-2 h-4 w-4" />
                        {stock.isWatched ? 'Remove from' : 'Add to'} Watchlist
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}