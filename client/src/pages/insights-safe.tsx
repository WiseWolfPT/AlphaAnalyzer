import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { SectorTabs } from "@/components/stock/sector-tabs";
import { StockCard } from "@/components/stock/stock-card";
import { PerformanceModal } from "@/components/stock/performance-modal";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { TrendingUp, Activity, Target } from "lucide-react";

// Mock data - no API calls
const mockStocks = [
  {
    id: "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 175.43,
    change: 2.34,
    changePercent: 1.35,
    marketCap: "2.8T",
    volume: "45.2M",
    pe: 28.5,
    sector: "Technology",
    logo: "https://logo.clearbit.com/apple.com",
    intrinsicValue: 165.0,
    safetyMargin: 6.3
  },
  {
    id: "2", 
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.85,
    change: -1.24,
    changePercent: -0.32,
    marketCap: "2.8T",
    volume: "25.1M", 
    pe: 32.1,
    sector: "Technology",
    logo: "https://logo.clearbit.com/microsoft.com",
    intrinsicValue: 390.0,
    safetyMargin: -2.9
  },
  {
    id: "3",
    symbol: "GOOGL", 
    name: "Alphabet Inc.",
    price: 142.56,
    change: 3.21,
    changePercent: 2.30,
    marketCap: "1.8T",
    volume: "32.4M",
    pe: 25.8,
    sector: "Technology", 
    logo: "https://logo.clearbit.com/google.com",
    intrinsicValue: 155.0,
    safetyMargin: -8.0
  }
];

export default function InsightsSafe() {
  const [selectedSector, setSelectedSector] = useState<string>("S&P 500");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handlePerformanceClick = (stock: any) => {
    setSelectedStock(stock);
    setShowPerformanceModal(true);
  };

  const filteredStocks = mockStocks.filter(stock => 
    stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <BetaBanner />
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Discover and analyze stocks with advanced metrics
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="grid grid-cols-3 gap-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Market Status</span>
                </div>
                <div className="text-sm font-bold text-emerald-500">Open</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Activity className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tracked Stocks</span>
                </div>
                <div className="text-sm font-bold text-foreground">{mockStocks.length}</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Performance</span>
                </div>
                <div className="text-sm font-bold text-emerald-500">+2.4%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <StockSearch 
          onSearch={setSearchQuery}
          searchResults={[]}
          placeholder="Search stocks, ETFs, or companies..."
        />

        {/* Sector Tabs */}
        <div className="mb-8">
          <SectorTabs
            selectedSector={selectedSector}
            onSectorChange={setSelectedSector}
          />
        </div>

        {/* Stock Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredStocks.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onPerformanceClick={() => handlePerformanceClick(stock)}
            />
          ))}
        </div>

        {/* Load More Button */}
        <div className="flex justify-center mt-12">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-medium">
            Load More Stocks
          </Button>
        </div>

        {/* Empty State */}
        {filteredStocks.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No stocks found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria to discover more stocks.
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