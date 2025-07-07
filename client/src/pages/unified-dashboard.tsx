import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { SectorTabs } from "@/components/stock/sector-tabs";
import { StockCard } from "@/components/stock/stock-card";
import { EnhancedStockCard } from "@/components/stock/enhanced-stock-card";
import { RealStockCard } from "@/components/stock/real-stock-card";
import { PerformanceModal } from "@/components/stock/performance-modal";
import { QuickInfoModal } from "@/components/stock/quick-info-modal";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StockCardSkeleton } from "@/components/ui/stock-card-skeleton";
import { TrendingUp, Activity, Target, RefreshCw, Zap, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Import hooks based on configuration
import { useQuery } from "@tanstack/react-query";
import { useStocks, useMarketIndices, useApiQuota, useWarmCache } from "@/hooks/use-enhanced-stocks";
import { realDataService } from "@/services/real-data-integration";
import { useAuth } from "@/contexts/simple-auth-offline";
import type { MockStock } from "@/lib/mock-api";
import type { Stock } from "@shared/schema";
import type { StockQuote } from "@/services/real-data-integration";

// Import modular cards for enhanced mode
import { TopGainersCard } from "@/components/dashboard/top-gainers-card";
import { TopLosersCard } from "@/components/dashboard/top-losers-card";
import { WatchlistAlertsCard } from "@/components/dashboard/watchlist-alerts-card";
import { PortfolioPerformanceCard } from "@/components/dashboard/portfolio-performance-card";
import { MarketSentimentCard } from "@/components/dashboard/market-sentiment-card";
import { EarningsCard } from "@/components/dashboard/earnings-card";
import { NewsHighlightsCard } from "@/components/dashboard/news-highlights-card";
import { SectorPerformanceCard } from "@/components/dashboard/sector-performance-card";

// Configuration types
export type DashboardVariant = 'basic' | 'enhanced' | 'modular' | 'safe' | 'real' | 'mixed';

export type DashboardFeature = 
  | 'search'
  | 'sectors'
  | 'quickInfo'
  | 'performance'
  | 'marketIndices'
  | 'apiQuota'
  | 'topGainers'
  | 'topLosers'
  | 'watchlistAlerts'
  | 'portfolio'
  | 'marketSentiment'
  | 'earnings'
  | 'news'
  | 'sectorPerformance'
  | 'refresh'
  | 'dataToggle';

export interface UnifiedDashboardProps {
  variant?: DashboardVariant;
  features?: DashboardFeature[];
  useRealData?: boolean;
  title?: string;
}

// Popular stocks to display
const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'META', 'NVDA', 'JPM', 'V', 'JNJ',
  'WMT', 'PG', 'UNH', 'DIS', 'MA'
];

// Mock data for safe mode
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
    marketCap: "1.9T",
    volume: "35.8M",
    pe: 25.7,
    sector: "Technology",
    logo: "https://logo.clearbit.com/google.com",
    intrinsicValue: 150.0,
    safetyMargin: -5.0
  }
];

// Default features by variant
const variantFeatures: Record<DashboardVariant, DashboardFeature[]> = {
  basic: ['search', 'sectors', 'refresh'],
  enhanced: ['search', 'sectors', 'marketIndices', 'apiQuota', 'refresh', 'quickInfo', 'performance'],
  modular: ['topGainers', 'topLosers', 'watchlistAlerts', 'portfolio', 'marketSentiment', 'earnings', 'news', 'sectorPerformance', 'refresh'],
  safe: ['search', 'sectors', 'quickInfo', 'performance'],
  real: ['search', 'sectors', 'refresh'],
  mixed: ['search', 'sectors', 'refresh', 'dataToggle', 'marketIndices']
};

export default function UnifiedDashboard({ 
  variant = 'enhanced',
  features = variantFeatures[variant],
  useRealData = variant !== 'safe',
  title
}: UnifiedDashboardProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedSector, setSelectedSector] = useState<string>("S&P 500");
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showQuickInfoModal, setShowQuickInfoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'real' | 'mock' | 'mixed'>(useRealData ? 'real' : 'mock');

  // Stock data based on variant
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced hooks (only for enhanced variant)
  const enhancedData = variant === 'enhanced' ? {
    stocks: useStocks(POPULAR_SYMBOLS),
    marketIndices: useMarketIndices(),
    apiQuota: useApiQuota(),
    warmCache: useWarmCache()
  } : null;

  // React Query for basic variant
  const queryData = variant === 'basic' || variant === 'safe' ? useQuery<MockStock[]>({
    queryKey: ["/api/stocks"],
    staleTime: 5 * 60 * 1000,
    enabled: variant === 'basic'
  }) : null;

  // Load data based on variant
  useEffect(() => {
    if (variant === 'safe') {
      setStocks(mockStocks);
      setLoading(false);
    } else if (variant === 'enhanced' && enhancedData) {
      setStocks(enhancedData.stocks.stocks || []);
      setLoading(enhancedData.stocks.isLoading);
      setError(enhancedData.stocks.error?.message || null);
    } else if (queryData) {
      setStocks(queryData.data || []);
      setLoading(queryData.isLoading);
      setError(queryData.error?.message || null);
    }
  }, [variant, enhancedData, queryData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const handleStockSelect = (stock: any) => {
    if (features.includes('quickInfo') || features.includes('performance')) {
      setSelectedStock(stock);
      setShowQuickInfoModal(true);
    } else {
      setLocation(`/stock/${stock.symbol}/charts`);
    }
  };

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Filter stocks by sector and search
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = !searchQuery || 
      stock.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSector = selectedSector === "S&P 500" || 
      stock.sector === selectedSector;
    
    return matchesSearch && matchesSector;
  });

  // Render modular dashboard (for 'modular' variant)
  if (variant === 'modular') {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                {title || `Good ${new Date().getHours() < 12 ? 'Morning' : 'Evening'}, ${user?.name || 'Investor'}`}
              </h1>
              <p className="text-gray-500 mt-1">Here's your market overview</p>
            </div>
            
            {features.includes('refresh') && (
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Last updated: {formatLastUpdated(lastUpdated)}
                </Badge>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            )}
          </div>

          {/* Modular Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.includes('topGainers') && <TopGainersCard />}
            {features.includes('topLosers') && <TopLosersCard />}
            {features.includes('watchlistAlerts') && <WatchlistAlertsCard />}
            {features.includes('portfolio') && <PortfolioPerformanceCard />}
            {features.includes('marketSentiment') && <MarketSentimentCard />}
            {features.includes('earnings') && <EarningsCard />}
            {features.includes('news') && <NewsHighlightsCard />}
            {features.includes('sectorPerformance') && <SectorPerformanceCard />}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Render standard dashboard layout (for other variants)
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* BETA Banner */}
        <div className="mb-6">
          <BetaBanner />
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {title || 'Market Insights'}
            </h1>
            <p className="text-gray-500 mt-1">
              Real-time market data and analysis
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {features.includes('dataToggle') && (
              <Button
                onClick={() => setDataSource(prev => prev === 'real' ? 'mock' : 'real')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {dataSource === 'real' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {dataSource === 'real' ? 'Live Data' : 'Demo Data'}
              </Button>
            )}
            
            {features.includes('refresh') && (
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Market Indices */}
        {features.includes('marketIndices') && enhancedData?.marketIndices && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(enhancedData.marketIndices.indices).map(([key, data]) => (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">{key.toUpperCase()}</p>
                      <p className="text-xl font-semibold">{data.value}</p>
                    </div>
                    <Badge variant={data.trend === 'up' ? 'default' : 'destructive'}>
                      {data.change}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search and Filters */}
        {features.includes('search') && (
          <div className="mb-6">
            <StockSearch 
              value={searchQuery}
              onChange={setSearchQuery}
              onStockSelect={handleStockSelect}
              size="default"
            />
          </div>
        )}
        
        {features.includes('sectors') && (
          <div className="mb-8">
            <SectorTabs 
              selectedSector={selectedSector} 
              onSectorChange={setSelectedSector}
            />
          </div>
        )}

        {/* API Quota Alert */}
        {features.includes('apiQuota') && enhancedData?.apiQuota && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              API Usage: {enhancedData.apiQuota.used}/{enhancedData.apiQuota.limit} calls today
            </AlertDescription>
          </Alert>
        )}

        {/* Stock Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <StockCardSkeleton key={i} />
            ))
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No stocks found</p>
            </div>
          ) : (
            filteredStocks.map((stock) => {
              // Choose card component based on variant
              const CardComponent = 
                variant === 'enhanced' ? EnhancedStockCard :
                variant === 'real' ? RealStockCard :
                StockCard;
                
              return (
                <CardComponent
                  key={stock.symbol || stock.id}
                  stock={stock}
                  onViewChart={() => setLocation(`/stock/${stock.symbol}/charts`)}
                  onQuickInfo={() => {
                    setSelectedStock(stock);
                    setShowQuickInfoModal(true);
                  }}
                  onPerformance={() => {
                    setSelectedStock(stock);
                    setShowPerformanceModal(true);
                  }}
                />
              );
            })
          )}
        </div>

        {/* Modals */}
        {features.includes('performance') && (
          <PerformanceModal 
            stock={selectedStock}
            isOpen={showPerformanceModal}
            onClose={() => setShowPerformanceModal(false)}
          />
        )}
        
        {features.includes('quickInfo') && (
          <QuickInfoModal
            stock={selectedStock}
            isOpen={showQuickInfoModal}
            onClose={() => setShowQuickInfoModal(false)}
          />
        )}
      </div>
    </MainLayout>
  );
}