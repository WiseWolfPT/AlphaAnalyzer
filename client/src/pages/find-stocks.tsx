import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { EnhancedStockCard } from "@/components/stock/enhanced-stock-card";
import { CompactStockCard } from "@/components/stock/compact-stock-card";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, TrendingUp, TrendingDown, Activity, Target, RefreshCw, Zap, AlertCircle, Filter, Grid3X3, List } from "lucide-react";
import { useAuth } from "@/contexts/simple-auth-offline";
import { cn } from "@/lib/utils";
import { useBatchQuotes } from "@/hooks/use-market-data";
import { ApiDiagnostic } from "@/components/debug/api-diagnostic";
import { env } from "@/lib/env";
import { TestAPIConnection } from "@/components/test-api-connection";

// Popular stocks to display
const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'META', 'NVDA', 'JPM', 'V', 'JNJ',
  'WMT', 'PG', 'UNH', 'DIS', 'MA'
];

// Mock data helpers (same as dashboard-enhanced)
function getCompanyName(symbol: string): string {
  const companyNames: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corporation',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'JNJ': 'Johnson & Johnson',
    'WMT': 'Walmart Inc.',
    'PG': 'Procter & Gamble Co.',
    'UNH': 'UnitedHealth Group Inc.',
    'DIS': 'The Walt Disney Company',
    'MA': 'Mastercard Incorporated'
  };
  return companyNames[symbol] || `${symbol} Corporation`;
}

function getIndustry(symbol: string): string {
  const industries: Record<string, string> = {
    'AAPL': 'Consumer Electronics',
    'MSFT': 'Software',
    'GOOGL': 'Internet Services',
    'AMZN': 'E-Commerce',
    'TSLA': 'Automotive',
    'META': 'Social Media',
    'NVDA': 'Semiconductors',
    'JPM': 'Banking',
    'V': 'Payment Services',
    'JNJ': 'Pharmaceuticals',
    'WMT': 'Retail',
    'PG': 'Consumer Goods',
    'UNH': 'Health Insurance',
    'DIS': 'Entertainment',
    'MA': 'Payment Services'
  };
  return industries[symbol] || 'Technology';
}

function getSector(symbol: string): string {
  const sectors: Record<string, string> = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'META': 'Technology',
    'NVDA': 'Technology',
    'JPM': 'Financial Services',
    'V': 'Financial Services',
    'JNJ': 'Healthcare',
    'WMT': 'Consumer Staples',
    'PG': 'Consumer Staples',
    'UNH': 'Healthcare',
    'DIS': 'Communication Services',
    'MA': 'Financial Services'
  };
  return sectors[symbol] || 'Technology';
}

export default function FindStocks() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [displayedSymbols, setDisplayedSymbols] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('alfalyzer-watchlist');
    return saved ? JSON.parse(saved) : POPULAR_SYMBOLS.slice(0, 9);
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use real market data
  const { data: quotesData, isLoading, error, refetch } = useBatchQuotes(displayedSymbols);

  // Debug logs
  console.log('Find Stocks Debug:', {
    displayedSymbols,
    quotesData,
    isLoading,
    error,
    hasQuotes: quotesData?.quotes?.length > 0,
    apiUrl: import.meta.env.VITE_API_URL || 'NOT SET'
  });

  // Transform the quotes data to match the component's expected format
  const stocks = quotesData?.quotes?.map((quote, index) => ({
    id: index + 1,
    symbol: quote.symbol,
    name: getCompanyName(quote.symbol),
    price: typeof quote.price === 'number' ? quote.price.toFixed(2) : '0.00',
    change: typeof quote.change === 'number' ? quote.change.toFixed(2) : '0.00',
    changePercent: typeof quote.changePercent === 'number' ? quote.changePercent.toFixed(2) : '0.00',
    marketCap: quote.marketCap ? `$${(quote.marketCap / 1e9).toFixed(2)}B` : 'N/A',
    sector: getSector(quote.symbol),
    industry: getIndustry(quote.symbol),
    eps: typeof quote.eps === 'number' ? quote.eps.toFixed(2) : 'N/A',
    peRatio: typeof quote.pe === 'number' ? quote.pe.toFixed(2) : 'N/A',
    logo: `/api/placeholder/40/40`,
    lastUpdated: new Date((quote.timestamp || Date.now() / 1000) * 1000),
    volume: quote.volume,
    high: quote.high,
    low: quote.low,
    open: quote.open,
    _isRealData: !quote._cached,
    _provider: quote.provider,
    _cached: quote._cached
  })) || [];

  const handleStockSelect = (symbol: string) => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleQuickInfoClick = (symbol: string) => {
    setLocation(`/stock/${symbol}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <BetaBanner />
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading real market data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error state if backend is not available
  if (error && stocks.length === 0) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <BetaBanner />
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Market Data Temporarily Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              We're having trouble connecting to our market data service.
            </p>
            <Button 
              onClick={() => refetch()}
              className="bg-teya-green hover:bg-teya-green-dark text-black"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Search className="w-8 h-8 text-teya-green" />
                🔍 Find Stocks
              </h1>
              <p className="text-muted-foreground">
                Discover and analyze stocks with powerful search and filtering tools
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                title="Refresh stock data"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-teya-green hover:bg-teya-green-dark text-black' : ''}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-teya-green hover:bg-teya-green-dark text-black' : ''}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Section */}
          <Card className="border-teya-green/20">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search stocks by symbol, name, or sector..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-teya-green/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teya-green/50 focus:border-teya-green"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer border-teya-green/30 hover:bg-teya-green/10"
                    onClick={() => setSearchQuery('Technology')}
                  >
                    Technology
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer border-teya-green/30 hover:bg-teya-green/10"
                    onClick={() => setSearchQuery('Healthcare')}
                  >
                    Healthcare
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer border-teya-green/30 hover:bg-teya-green/10"
                    onClick={() => setSearchQuery('Financial')}
                  >
                    Financial
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer border-teya-green/30 hover:bg-teya-green/10"
                    onClick={() => setSearchQuery('Consumer')}
                  >
                    Consumer
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-teya-green hover:bg-teya-green/10"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Beta Banner */}
        <BetaBanner />

        {/* API Diagnostic (Temporary - Remove in production) */}
        {env.NODE_ENV === 'development' || window.location.search.includes('debug') ? (
          <ApiDiagnostic />
        ) : null}

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {filteredStocks.length} stocks
                {searchQuery && ` for "${searchQuery}"`}
              </p>
              {quotesData && quotesData.quotes && quotesData.quotes.some(q => q._cached) && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="w-3 h-3 mr-1" />
                  {quotesData.quotes.some(q => q.provider === 'fallback') 
                    ? 'Demo data (backend unavailable)' 
                    : 'Some data from cache'}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>

          {/* Stock Cards Grid */}
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-4"
          )}>
            {filteredStocks.map((stock) => (
              <Card 
                key={stock.id}
                className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-border/50 hover:border-teya-green/30 overflow-hidden"
                onClick={() => handleStockSelect(stock.symbol)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        {stock.symbol.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{stock.symbol}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {stock.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">${parseFloat(stock.price).toFixed(2)}</span>
                      <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        parseFloat(stock.changePercent) >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {parseFloat(stock.changePercent) >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {parseFloat(stock.changePercent) >= 0 ? '+' : ''}{parseFloat(stock.changePercent).toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <span>{stock.sector}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredStocks.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No stocks found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search terms or browse popular stocks instead.
              </p>
              <Button 
                onClick={() => setSearchQuery('')}
                className="bg-teya-green hover:bg-teya-green-dark text-black"
              >
                Show All Stocks
              </Button>
            </div>
          )}
        </div>

        {/* API Test Component - TEMPORARY */}
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h3 className="text-lg font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
            🧪 API Connection Test (Temporary)
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
            This test component verifies that the API is properly connected and CORS is configured correctly.
          </p>
          <TestAPIConnection />
        </div>

        {/* Quick Actions */}
        <Card className="border-teya-green/20 bg-gradient-to-r from-teya-green/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold mb-2">Need help finding the right stocks?</h3>
                <p className="text-sm text-muted-foreground">
                  Explore our advanced tools and educational resources
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/intrinsic-value')}
                  className="border-teya-green/20 hover:bg-teya-green/10"
                >
                  Value Calculator
                </Button>
                <Button 
                  onClick={() => setLocation('/help')}
                  className="bg-teya-green hover:bg-teya-green-dark text-black"
                >
                  Get Help
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}