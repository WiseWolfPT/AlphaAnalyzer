import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { SectorTabs } from "@/components/stock/sector-tabs";
import { RealStockCard } from "@/components/stock/real-stock-card";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Activity, Target, RefreshCw } from "lucide-react";
import { realDataService } from "@/services/real-data-integration";

export default function InsightsReal() {
  const [selectedSector, setSelectedSector] = useState<string>("S&P 500");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Major stocks organized by sectors - using only stocks we know work
  const stocksBySector = {
    "S&P 500": ['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
    "Technology": ['AAPL', 'GOOGL', 'MSFT', 'NVDA'],
    "Growth": ['TSLA', 'NVDA', 'AMD', 'AMZN'],
    "Financial Services": ['JPM', 'BAC', 'V', 'MA'],
    "Healthcare": ['JNJ', 'UNH', 'PFE', 'ABBV'],
    "Consumer": ['WMT', 'HD', 'MCD', 'NKE'],
    "Most Trending": ['TSLA', 'NVDA', 'AMD', 'AAPL']
  };

  const currentStocks = stocksBySector[selectedSector as keyof typeof stocksBySector] || stocksBySector["S&P 500"];

  useEffect(() => {
    // Simulate loading time
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [selectedSector, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleStockSelect = (stock: any) => {
    window.location.href = `/stock/${stock.symbol}/charts`;
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* BETA Banner */}
        <div className="mb-6">
          <BetaBanner />
        </div>

        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chartreuse/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Real-Time Dashboard</h1>
                <p className="text-muted-foreground">Live stock prices and market analysis</p>
              </div>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mt-8">
            <StockSearch 
              onSearch={setSearchQuery}
              searchResults={[]}
              onStockSelect={handleStockSelect}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">Market Status</p>
                <p className="text-lg font-bold text-emerald-500">Live</p>
              </div>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tracked Stocks</p>
                <p className="text-lg font-bold text-foreground">{currentStocks.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Data Source</p>
                <p className="text-lg font-bold text-amber-500">Real-Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sector Tabs */}
        <div className="mb-8">
          <SectorTabs 
            selectedSector={selectedSector}
            onSectorChange={setSelectedSector}
          />
        </div>

        {/* Stock Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {selectedSector} Stocks
            </h2>
            <div className="text-sm text-muted-foreground">
              Updates every 30 seconds
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card/50 border rounded-xl p-6">
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
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentStocks.map(symbol => (
                <RealStockCard 
                  key={`${symbol}-${refreshKey}`}
                  symbol={symbol}
                  showMiniChart={false}
                  autoRefresh={true}
                  refreshInterval={30000}
                />
              ))}
            </div>
          )}
        </div>

        {/* Market Performance Section */}
        <div className="mt-12 space-y-6">
          <h2 className="text-xl font-semibold">Market Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">DOW JONES</h3>
                <p className="text-2xl font-bold text-foreground">34,567.89</p>
                <p className="text-sm text-green-600">+0.52%</p>
              </div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">S&P 500</h3>
                <p className="text-2xl font-bold text-foreground">4,234.56</p>
                <p className="text-sm text-green-600">+0.31%</p>
              </div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">NASDAQ</h3>
                <p className="text-2xl font-bold text-foreground">13,789.12</p>
                <p className="text-sm text-red-600">-0.18%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}