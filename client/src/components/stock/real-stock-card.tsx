import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, TrendingUp, TrendingDown, ChartLine, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniChart } from "./mini-charts";
import { FeatureLimiter } from "@/components/beta/feature-limiter";
import { realDataService, type StockQuote } from "@/services/real-data-integration";
import { Skeleton } from "@/components/ui/skeleton";

interface RealStockCardProps {
  symbol: string;
  onPerformanceClick?: () => void;
  onQuickInfoClick?: () => void;
  showMiniChart?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function RealStockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick, 
  showMiniChart = true,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: RealStockCardProps) {
  const [stock, setStock] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 Fetching real-time data for ${symbol}...`);
      
      // Set a timeout for the API call to avoid hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000);
      });
      
      const dataPromise = realDataService.getStockQuote(symbol);
      const quote = await Promise.race([dataPromise, timeoutPromise]);
      
      if (quote) {
        setStock(quote);
        setLastUpdate(new Date());
        setError(null);
        console.log(`✅ Data received for ${symbol}:`, quote.source || 'unknown');
      } else {
        throw new Error(`No data available for ${symbol}`);
      }
    } catch (err) {
      console.error(`❌ Failed to fetch ${symbol}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      
      // If we don't have stock data yet, try to get mock data as fallback
      if (!stock) {
        try {
          // Import mock data directly as a last resort
          const { mockStocks } = await import('@/lib/mock-api');
          const mockStock = mockStocks.find(s => s.symbol === symbol.toUpperCase());
          
          if (mockStock) {
            const mockQuote = {
              symbol: mockStock.symbol,
              name: mockStock.name,
              price: mockStock.price,
              change: mockStock.change,
              changePercent: mockStock.changePercent,
              sector: mockStock.sector || 'Technology',
              marketCap: mockStock.marketCap || 'N/A',
              eps: mockStock.eps || 'N/A',
              peRatio: mockStock.peRatio || 'N/A',
              logo: mockStock.logo,
              lastUpdated: new Date(),
              source: 'mock' as const
            };
            
            setStock(mockQuote);
            setLastUpdate(new Date());
            setError(`API unavailable - showing demo data (${errorMessage})`);
            console.log(`📦 Using fallback mock data for ${symbol}`);
            return;
          }
        } catch (mockError) {
          console.error(`Even mock data failed for ${symbol}:`, mockError);
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();

    if (autoRefresh) {
      const interval = setInterval(fetchStockData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [symbol, autoRefresh, refreshInterval]);
  
  if (loading) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 mb-3" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error && !stock) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-6">
        <div className="text-center py-4">
          <p className="text-red-500 mb-1 font-semibold">Failed to load {symbol}</p>
          <p className="text-red-400 text-xs mb-3 opacity-80">{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchStockData}
            disabled={loading}
            className="border-red-500/30 hover:bg-red-500/10"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
            {loading ? 'Loading...' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  // Ensure stock is not null before accessing properties
  if (!stock) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-6">
        <div className="text-center text-red-500">Stock data unavailable</div>
      </div>
    );
  }

  const changePercent = typeof stock.changePercent === 'string' ? parseFloat(stock.changePercent) : stock.changePercent;
  const isPositive = !isNaN(changePercent) && changePercent >= 0;
  
  // Mock intrinsic value for now (in real app, this would come from backend)
  const currentPrice = parseFloat(stock.price || '0');
  const intrinsicValue = currentPrice * (1 + (Math.random() - 0.5) * 0.3); // ±15% variation
  const valuationDiff = ((currentPrice - intrinsicValue) / intrinsicValue) * 100;
  const isUndervalued = valuationDiff < 0;

  return (
    <Link href={`/stock/${stock.symbol}/charts`}>
      <div className="group relative bg-card/50 backdrop-blur-sm border border-chartreuse/30 hover:border-chartreuse rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-chartreuse/20 hover:-translate-y-1 hover:bg-gradient-to-br hover:from-chartreuse/5 hover:to-chartreuse/10">
        {/* Real-time indicator */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs px-1.5 py-0.5",
              stock.source === 'real' 
                ? "border-green-500/50 text-green-600" 
                : stock.source === 'mock'
                  ? "border-blue-500/50 text-blue-600"
                  : "border-orange-500/50 text-orange-600"
            )}
          >
            {stock.source === 'real' ? 'Live' : stock.source === 'mock' ? 'Demo' : 'Cached'}
          </Badge>
        </div>

        {/* Error indicator */}
        {error && stock && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant="outline" 
              className="text-xs px-1.5 py-0.5 border-yellow-500/50 text-yellow-600"
              title={error}
            >
              ⚠️ Demo
            </Badge>
          </div>
        )}

        {/* Action Icons */}
        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-chartreuse/10 hover:text-chartreuse transition-all duration-300"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickInfoClick?.();
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
              onPerformanceClick?.();
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
              {isPositive ? '+' : ''}{isNaN(changePercent) ? '0.00' : changePercent.toFixed(2)}%
            </div>
          </div>

          {/* Intrinsic Value Section */}
          <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Est. Value</span>
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
                {isUndervalued ? '' : '+'}{valuationDiff.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="text-foreground font-medium">{stock.marketCap || 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Change</span>
            <span className={cn(
              "font-medium",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {isPositive ? '+' : ''}${stock.change || '0.00'}
            </span>
          </div>
          
          {/* Last Update Time */}
          {lastUpdate && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}