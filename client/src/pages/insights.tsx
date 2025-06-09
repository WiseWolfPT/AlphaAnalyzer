import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { SectorTabs } from "@/components/stock/sector-tabs";
import { StockCard } from "@/components/stock/stock-card";
import { PerformanceModal } from "@/components/stock/performance-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Activity, Target } from "lucide-react";
import type { Stock } from "@shared/schema";

export default function Insights() {
  const [selectedSector, setSelectedSector] = useState<string>("S&P 500");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stocks, isLoading, error } = useQuery<Stock[]>({
    queryKey: ["/api/stocks"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: searchResults } = useQuery<Stock[]>({
    queryKey: [`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.target?.matches?.("input, textarea")) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      if (e.key === "Escape") {
        setShowPerformanceModal(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePerformanceClick = (stock: Stock) => {
    setSelectedStock(stock);
    setShowPerformanceModal(true);
  };

  const filteredStocks = stocks?.filter(stock => {
    if (selectedSector === "S&P 500") return true;
    if (selectedSector === "Most Trending") {
      return Math.abs(parseFloat(stock.changePercent)) > 2;
    }
    if (selectedSector === "Growth") {
      return stock.sector === "Technology";
    }
    if (selectedSector === "Dividend Growth") {
      return stock.sector === "Financial Services";
    }
    return stock.sector === selectedSector;
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Failed to Load Stocks</h1>
          <p className="text-muted-foreground">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Discover and analyze stocks with advanced metrics</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mt-8">
            <StockSearch 
              onSearch={setSearchQuery}
              searchResults={searchResults || []}
              onStockSelect={(stock) => {
                // Navigate to stock detail
                window.location.href = `/stock/${stock.symbol}`;
              }}
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
                <p className="text-lg font-bold text-emerald-500">Open</p>
              </div>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tracked Stocks</p>
                <p className="text-lg font-bold text-foreground">{stocks?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
                <p className="text-lg font-bold text-amber-500">+2.4%</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {isLoading ? (
            Array.from({ length: 20 }).map((_, index) => (
              <div key={index} className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : (
            filteredStocks?.map((stock) => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                onPerformanceClick={() => handlePerformanceClick(stock)}
              />
            ))
          )}
        </div>

        {/* Load More Button */}
        {!isLoading && filteredStocks && filteredStocks.length >= 20 && (
          <div className="flex justify-center mt-12">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-medium">
              Load More Stocks
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!filteredStocks || filteredStocks.length === 0) && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No stocks found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or search criteria to discover more stocks.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Performance Modal */}
      <PerformanceModal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        stock={selectedStock}
      />
    </MainLayout>
  );
}
