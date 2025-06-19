import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { EnhancedStockCard } from "@/components/stock/enhanced-stock-card";
import { PerformanceModal } from "@/components/stock/performance-modal";
import { QuickInfoModal } from "@/components/stock/quick-info-modal";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Activity, Target, RefreshCw, Zap, AlertCircle } from "lucide-react";
import { useStocks, useMarketIndices, useApiQuota, useWarmCache } from "@/hooks/use-enhanced-stocks";
import { cn } from "@/lib/utils";

// Popular stocks to display
const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'META', 'NVDA', 'JPM', 'V', 'JNJ',
  'WMT', 'PG', 'UNH', 'DIS', 'MA'
];

export default function EnhancedDashboard() {
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [modalType, setModalType] = useState<"performance" | "info" | null>(null);
  const [displayedSymbols, setDisplayedSymbols] = useState(POPULAR_SYMBOLS.slice(0, 9));
  
  const { data: stocks, isLoading: stocksLoading } = useStocks(displayedSymbols);
  const { data: marketIndices, isLoading: indicesLoading } = useMarketIndices();
  const { data: quotaStatus } = useApiQuota();
  const { mutate: warmCache, isPending: isWarmingCache } = useWarmCache();

  // Warm cache on mount
  useEffect(() => {
    warmCache();
  }, []);

  const handleStockClick = (symbol: string, type: "performance" | "info") => {
    const stock = stocks?.find(s => s.symbol === symbol);
    if (stock) {
      setSelectedStock(stock);
      setModalType(type);
    }
  };

  const handleAddStock = (symbol: string) => {
    if (!displayedSymbols.includes(symbol.toUpperCase())) {
      setDisplayedSymbols([...displayedSymbols, symbol.toUpperCase()]);
    }
  };

  const marketStats = [
    {
      label: "S&P 500",
      value: marketIndices?.sp500?.value.toFixed(2) || "0.00",
      change: marketIndices?.sp500?.change || 0,
      icon: TrendingUp,
    },
    {
      label: "Dow Jones",
      value: marketIndices?.dow?.value.toFixed(2) || "0.00",
      change: marketIndices?.dow?.change || 0,
      icon: Activity,
    },
    {
      label: "Nasdaq",
      value: marketIndices?.nasdaq?.value.toFixed(2) || "0.00",
      change: marketIndices?.nasdaq?.change || 0,
      icon: Target,
    },
  ];

  // Calculate API usage
  const apiUsage = quotaStatus ? Array.from(quotaStatus.values()).map(quota => ({
    provider: quota.provider.toUpperCase(),
    percentage: (quota.used / quota.limit) * 100,
    remaining: quota.remaining,
    limit: quota.limit
  })) : [];

  return (
    <MainLayout>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <BetaBanner />
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Market Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time market data and analysis</p>
          </div>
          
          <div className="flex gap-2">
            <StockSearch onStockSelect={handleAddStock} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => warmCache()}
              disabled={isWarmingCache}
            >
              <RefreshCw className={cn("h-4 w-4", isWarmingCache && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {marketStats.map((stat) => {
            const Icon = stat.icon;
            const isPositive = stat.change >= 0;
            
            return (
              <div
                key={stat.label}
                className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {indicesLoading ? "..." : stat.value}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {isPositive ? "+" : ""}{stat.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* API Usage Alert */}
        {apiUsage.length > 0 && (
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">API Usage Status</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {apiUsage.map((api) => (
                  <div key={api.provider} className="text-sm">
                    <span className="font-medium">{api.provider}:</span>{" "}
                    <span className={cn(
                      api.percentage > 80 ? "text-red-600 dark:text-red-400" :
                      api.percentage > 50 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-green-600 dark:text-green-400"
                    )}>
                      {api.percentage.toFixed(0)}% used
                    </span>
                    <span className="text-muted-foreground text-xs block">
                      {api.remaining}/{api.limit} remaining
                    </span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stock Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Watchlist</h2>
            <Badge variant="secondary">
              {stocksLoading ? "Loading..." : `${stocks?.length || 0} Stocks`}
            </Badge>
          </div>
          
          {stocksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : stocks && stocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedSymbols.map((symbol) => (
                <EnhancedStockCard
                  key={symbol}
                  symbol={symbol}
                  onPerformanceClick={() => handleStockClick(symbol, "performance")}
                  onQuickInfoClick={() => handleStockClick(symbol, "info")}
                />
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No stocks found. Try searching for a stock symbol above.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Live Data Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span>Live market data</span>
        </div>
      </div>

      {/* Modals */}
      {selectedStock && modalType === "performance" && (
        <PerformanceModal
          stock={selectedStock}
          isOpen={true}
          onClose={() => {
            setSelectedStock(null);
            setModalType(null);
          }}
        />
      )}
      
      {selectedStock && modalType === "info" && (
        <QuickInfoModal
          stock={selectedStock}
          isOpen={true}
          onClose={() => {
            setSelectedStock(null);
            setModalType(null);
          }}
        />
      )}
    </MainLayout>
  );
}