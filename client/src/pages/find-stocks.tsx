import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { UnifiedStockCard } from "@/components/stock/unified-stock-card";
import { RealtimeStockCard } from "@/components/stock/realtime-stock-card";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Activity, Target, RefreshCw, Zap, AlertCircle, Filter, Grid3X3, List, Wifi, ArrowUpIcon, ArrowDownIcon, Clock, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/temp-auth";
import { cn } from "@/lib/utils";
import { useCachedBatchQuotes, useDirectFMPBatchQuotes } from "@/hooks/use-cache-data";
import { TestAPIConnection } from "@/components/test-api-connection";
import { ConnectionTest } from "@/components/debug/connection-test";
import { MarketMovers } from "@/components/market/market-movers";

// All stocks from Supabase - expanded list
const ALL_STOCKS = [
  // Tech Giants
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA',
  // Financial
  'JPM', 'V', 'MA', 'BAC', 'WFC', 'BRK.B',
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'ABT', 'CVS', 'MDT', 'BMY',
  // Consumer
  'WMT', 'PG', 'DIS', 'NKE', 'MCD', 'COST', 'LOW', 'HD', 'PEP',
  // Energy & Industrials
  'XOM', 'CVX', 'UPS', 'UNP', 'HON', 'LIN', 'DHR',
  // Tech/Software
  'CRM', 'ORCL', 'ADBE', 'NFLX', 'PYPL', 'TXN', 'QCOM', 'AVGO', 'INTC',
  // Telecom & Others
  'VZ', 'CMCSA', 'NEE', 'PM', 'TSLA', 'ACN'
];

// Popular stocks for initial display
const POPULAR_SYMBOLS = ALL_STOCKS.slice(0, 15);

// Comprehensive company information
function getCompanyName(symbol: string): string {
  const companyNames: Record<string, string> = {
    // Tech Giants
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corporation',
    // Financial
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'MA': 'Mastercard Incorporated',
    'BAC': 'Bank of America Corp.',
    'WFC': 'Wells Fargo & Company',
    'BRK.B': 'Berkshire Hathaway Inc.',
    // Healthcare
    'JNJ': 'Johnson & Johnson',
    'UNH': 'UnitedHealth Group Inc.',
    'PFE': 'Pfizer Inc.',
    'ABBV': 'AbbVie Inc.',
    'TMO': 'Thermo Fisher Scientific Inc.',
    'ABT': 'Abbott Laboratories',
    'CVS': 'CVS Health Corporation',
    'MDT': 'Medtronic plc',
    'BMY': 'Bristol-Myers Squibb Co.',
    // Consumer
    'WMT': 'Walmart Inc.',
    'PG': 'Procter & Gamble Co.',
    'DIS': 'The Walt Disney Company',
    'NKE': 'Nike Inc.',
    'MCD': 'McDonald\'s Corporation',
    'COST': 'Costco Wholesale Corporation',
    'LOW': 'Lowe\'s Companies Inc.',
    'HD': 'The Home Depot Inc.',
    'PEP': 'PepsiCo Inc.',
    // Energy & Industrials
    'XOM': 'Exxon Mobil Corporation',
    'CVX': 'Chevron Corporation',
    'UPS': 'United Parcel Service Inc.',
    'UNP': 'Union Pacific Corporation',
    'HON': 'Honeywell International Inc.',
    'LIN': 'Linde plc',
    'DHR': 'Danaher Corporation',
    // Tech/Software
    'CRM': 'Salesforce Inc.',
    'ORCL': 'Oracle Corporation',
    'ADBE': 'Adobe Inc.',
    'NFLX': 'Netflix Inc.',
    'PYPL': 'PayPal Holdings Inc.',
    'TXN': 'Texas Instruments Inc.',
    'QCOM': 'QUALCOMM Inc.',
    'AVGO': 'Broadcom Inc.',
    'INTC': 'Intel Corporation',
    // Telecom & Others
    'VZ': 'Verizon Communications Inc.',
    'CMCSA': 'Comcast Corporation',
    'NEE': 'NextEra Energy Inc.',
    'PM': 'Philip Morris International Inc.',
    'TSLA': 'Tesla Inc.',
    'ACN': 'Accenture plc'
  };
  return companyNames[symbol] || `${symbol} Corporation`;
}

function getIndustry(symbol: string): string {
  const industries: Record<string, string> = {
    // Tech Giants
    'AAPL': 'Consumer Electronics',
    'MSFT': 'Software',
    'GOOGL': 'Internet Services',
    'AMZN': 'E-Commerce',
    'META': 'Social Media',
    'NVDA': 'Semiconductors',
    // Financial
    'JPM': 'Banking',
    'V': 'Payment Services',
    'MA': 'Payment Services',
    'BAC': 'Banking',
    'WFC': 'Banking',
    'BRK.B': 'Insurance & Investments',
    // Healthcare
    'JNJ': 'Pharmaceuticals',
    'UNH': 'Health Insurance',
    'PFE': 'Pharmaceuticals',
    'ABBV': 'Biotechnology',
    'TMO': 'Medical Equipment',
    'ABT': 'Medical Devices',
    'CVS': 'Healthcare Services',
    'MDT': 'Medical Devices',
    'BMY': 'Pharmaceuticals',
    // Consumer
    'WMT': 'Retail',
    'PG': 'Consumer Goods',
    'DIS': 'Entertainment',
    'NKE': 'Apparel & Footwear',
    'MCD': 'Restaurants',
    'COST': 'Retail',
    'LOW': 'Home Improvement',
    'HD': 'Home Improvement',
    'PEP': 'Beverages',
    // Energy & Industrials
    'XOM': 'Oil & Gas',
    'CVX': 'Oil & Gas',
    'UPS': 'Logistics',
    'UNP': 'Railroads',
    'HON': 'Industrial Conglomerate',
    'LIN': 'Industrial Gases',
    'DHR': 'Industrial Conglomerate',
    // Tech/Software
    'CRM': 'Software',
    'ORCL': 'Software',
    'ADBE': 'Software',
    'NFLX': 'Streaming Services',
    'PYPL': 'Payment Services',
    'TXN': 'Semiconductors',
    'QCOM': 'Semiconductors',
    'AVGO': 'Semiconductors',
    'INTC': 'Semiconductors',
    // Telecom & Others
    'VZ': 'Telecommunications',
    'CMCSA': 'Media & Cable',
    'NEE': 'Utilities',
    'PM': 'Tobacco',
    'TSLA': 'Automotive',
    'ACN': 'IT Services'
  };
  return industries[symbol] || 'Technology';
}

function getSector(symbol: string): string {
  const sectors: Record<string, string> = {
    // Technology
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'META': 'Technology',
    'NVDA': 'Technology',
    'CRM': 'Technology',
    'ORCL': 'Technology',
    'ADBE': 'Technology',
    'PYPL': 'Technology',
    'TXN': 'Technology',
    'QCOM': 'Technology',
    'AVGO': 'Technology',
    'INTC': 'Technology',
    'ACN': 'Technology',
    // Financial Services
    'JPM': 'Financial Services',
    'V': 'Financial Services',
    'MA': 'Financial Services',
    'BAC': 'Financial Services',
    'WFC': 'Financial Services',
    'BRK.B': 'Financial Services',
    // Healthcare
    'JNJ': 'Healthcare',
    'UNH': 'Healthcare',
    'PFE': 'Healthcare',
    'ABBV': 'Healthcare',
    'TMO': 'Healthcare',
    'ABT': 'Healthcare',
    'CVS': 'Healthcare',
    'MDT': 'Healthcare',
    'BMY': 'Healthcare',
    // Consumer Staples
    'WMT': 'Consumer Staples',
    'PG': 'Consumer Staples',
    'COST': 'Consumer Staples',
    'PEP': 'Consumer Staples',
    'PM': 'Consumer Staples',
    // Consumer Discretionary
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'NKE': 'Consumer Discretionary',
    'MCD': 'Consumer Discretionary',
    'LOW': 'Consumer Discretionary',
    'HD': 'Consumer Discretionary',
    // Communication Services
    'DIS': 'Communication Services',
    'NFLX': 'Communication Services',
    'CMCSA': 'Communication Services',
    'VZ': 'Communication Services',
    // Energy
    'XOM': 'Energy',
    'CVX': 'Energy',
    // Industrials
    'UPS': 'Industrials',
    'UNP': 'Industrials',
    'HON': 'Industrials',
    'LIN': 'Industrials',
    'DHR': 'Industrials',
    // Utilities
    'NEE': 'Utilities'
  };
  return sectors[symbol] || 'Technology';
}

export default function FindStocks() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [displayedSymbols, setDisplayedSymbols] = useState(() => {
    // Start with popular stocks to reduce initial load
    return POPULAR_SYMBOLS;
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [useRealtime, setUseRealtime] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('alphabetical');
  const [useDirectFMP, setUseDirectFMP] = useState(true); // PHASE 2: Use direct FMP by default
  
  // PHASE 2: Use direct FMP data (no cache) for real-time prices
  const directFMPQuery = useDirectFMPBatchQuotes(displayedSymbols, {
    enabled: useDirectFMP,
    onError: (error) => {
      console.error('Failed to fetch direct FMP quotes:', error);
    }
  });
  
  // Fallback to cached data if direct FMP fails
  const cachedQuery = useCachedBatchQuotes(displayedSymbols, {
    enabled: !useDirectFMP || directFMPQuery.isError,
    onError: (error) => {
      console.error('Failed to fetch cached quotes:', error);
    }
  });
  
  // Use direct FMP data if available, otherwise fall back to cached
  const { data: quotesData, isLoading, error, refetch, status, fetchStatus } = 
    useDirectFMP && !directFMPQuery.isError ? directFMPQuery : cachedQuery;

  // Run API connection test on mount
  useEffect(() => {
    console.log('🚀 Find Stocks page loaded');
  }, []);

  // Helper function to count stocks by sector
  const countStocksBySector = (sector: string): number => {
    if (sector === 'all') return ALL_STOCKS.length;
    return ALL_STOCKS.filter(symbol => getSector(symbol) === sector).length;
  };

  // Function to filter stocks by sector
  const filterBySector = (sector: string) => {
    setActiveFilter(sector);
    if (sector === 'all') {
      setDisplayedSymbols(ALL_STOCKS);
    } else {
      const filtered = ALL_STOCKS.filter(symbol => getSector(symbol) === sector);
      setDisplayedSymbols(filtered);
    }
    setSearchQuery(''); // Clear search when filtering
  };

  // Track stock popularity
  const trackStockView = (symbol: string) => {
    const views = JSON.parse(localStorage.getItem('stock-views') || '{}');
    views[symbol] = (views[symbol] || 0) + 1;
    views.lastUpdated = Date.now();
    localStorage.setItem('stock-views', JSON.stringify(views));
  };

  // Get most popular stocks
  const getMostPopularStocks = (limit: number = 10): string[] => {
    const views = JSON.parse(localStorage.getItem('stock-views') || '{}');
    delete views.lastUpdated;
    return Object.entries(views)
      .sort(([,a]: [string, any], [,b]: [string, any]) => b - a)
      .slice(0, limit)
      .map(([symbol]) => symbol);
  };

  // Debug logs
  console.log('Find Stocks Debug:', {
    displayedSymbols,
    quotesData,
    isLoading,
    error,
    status,
    fetchStatus,
    hasQuotes: quotesData?.quotes?.length > 0,
    apiUrl: 'Using Vercel Proxy',
    symbolsLength: displayedSymbols.length
  });

  // Transform the quotes data to match the component's expected format with error handling
  const stocks = React.useMemo(() => {
    // Safety check: ensure we have valid data before attempting to transform
    if (!quotesData?.quotes || !Array.isArray(quotesData.quotes)) {
      console.log('Quotes data not ready or invalid:', quotesData);
      return [];
    }
    
    try {
      return quotesData.quotes
        .filter(quote => quote != null) // Filter out null/undefined quotes
        .map((quote, index) => ({
        id: index + 1,
        symbol: quote.symbol || 'UNKNOWN',
        name: getCompanyName(quote.symbol || 'UNKNOWN'),
        price: (quote?.price != null && !isNaN(Number(quote.price))) ? Number(quote.price).toFixed(2) : '0.00',
        change: (quote?.change != null && !isNaN(Number(quote.change))) ? Number(quote.change).toFixed(2) : '0.00',
        changePercent: (quote?.changePercent != null && !isNaN(Number(quote.changePercent))) ? Number(quote.changePercent).toFixed(2) : '0.00',
        marketCap: (quote?.marketCap != null && !isNaN(Number(quote.marketCap)) && Number(quote.marketCap) > 0) ? `$${(Number(quote.marketCap) / 1e9).toFixed(2)}B` : 'N/A',
        sector: getSector(quote.symbol || 'UNKNOWN'),
        industry: getIndustry(quote.symbol || 'UNKNOWN'),
        eps: (quote?.eps != null && !isNaN(Number(quote.eps))) ? Number(quote.eps).toFixed(2) : 'N/A',
        peRatio: (quote?.pe != null && !isNaN(Number(quote.pe))) ? Number(quote.pe).toFixed(2) : 'N/A',
        logo: `/api/placeholder/40/40`,
        lastUpdated: new Date(quote.timestamp || Date.now()),
        volume: quote.volume || 0,
        high: quote.high || 0,
        low: quote.low || 0,
        open: quote.open || 0,
        _isRealData: !quote._cached,
        _provider: quote.provider || 'unknown',
        _cached: quote._cached || false
      }));
    } catch (err) {
      console.error('Error transforming quotes data:', err);
      return [];
    }
  }, [quotesData]);

  const handleStockSelect = (symbol: string) => {
    trackStockView(symbol); // Track popularity
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleQuickInfoClick = (symbol: string) => {
    trackStockView(symbol); // Track popularity
    setLocation(`/stock/${symbol}`);
  };

  // Function to handle special sections
  const showTopGainers = () => {
    const sorted = [...displayedSymbols].sort((a, b) => {
      const aChange = quotesData?.quotes?.find(q => q.symbol === a)?.changePercent || 0;
      const bChange = quotesData?.quotes?.find(q => q.symbol === b)?.changePercent || 0;
      return bChange - aChange;
    });
    setDisplayedSymbols(sorted.slice(0, 10));
    setActiveFilter('gainers');
  };

  const showTopLosers = () => {
    const sorted = [...displayedSymbols].sort((a, b) => {
      const aChange = quotesData?.quotes?.find(q => q.symbol === a)?.changePercent || 0;
      const bChange = quotesData?.quotes?.find(q => q.symbol === b)?.changePercent || 0;
      return aChange - bChange;
    });
    setDisplayedSymbols(sorted.slice(0, 10));
    setActiveFilter('losers');
  };

  const showMostPopular = () => {
    const popular = getMostPopularStocks(15);
    const validPopular = popular.filter(s => ALL_STOCKS.includes(s));
    setDisplayedSymbols(validPopular.length > 0 ? validPopular : POPULAR_SYMBOLS);
    setActiveFilter('popular');
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
          {/* Debug connection test */}
          <ConnectionTest />
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

  const filteredStocks = stocks.filter(stock => {
    // First check if stock is in displayed symbols (sector filter)
    if (!displayedSymbols.includes(stock.symbol)) return false;
    
    // Then apply search filter
    if (!searchQuery) return true;
    
    return (
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.industry.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
              {/* PHASE 2: Toggle between Direct FMP and Cached data */}
              <Button
                variant={useDirectFMP ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseDirectFMP(!useDirectFMP)}
                className={useDirectFMP ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                title={useDirectFMP ? "Using Direct FMP (Real-time)" : "Using Cached Data"}
              >
                <Zap className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">
                  {useDirectFMP ? 'Direct FMP' : 'Cached'}
                </span>
              </Button>
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
                variant={useRealtime ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseRealtime(!useRealtime)}
                className={useRealtime ? 'bg-teya-green hover:bg-teya-green-dark text-black' : ''}
                title="Alternar atualizações em tempo real"
              >
                <Wifi className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">Tempo Real</span>
              </Button>
              <div className="border-l pl-2 ml-2 flex items-center gap-1">
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
          </div>

          {/* Search Section */}
          <Card className="border-teya-green/20">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search 50+ stocks by symbol, name, or sector..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-teya-green/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teya-green/50 focus:border-teya-green"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={activeFilter === 'all' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'all' 
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('all')}
                  >
                    All Stocks ({countStocksBySector('all')})
                  </Badge>
                  <Badge 
                    variant={activeFilter === 'Technology' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'Technology'
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('Technology')}
                  >
                    Technology ({countStocksBySector('Technology')})
                  </Badge>
                  <Badge 
                    variant={activeFilter === 'Healthcare' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'Healthcare'
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('Healthcare')}
                  >
                    Healthcare ({countStocksBySector('Healthcare')})
                  </Badge>
                  <Badge 
                    variant={activeFilter === 'Financial Services' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'Financial Services'
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('Financial Services')}
                  >
                    Financial ({countStocksBySector('Financial Services')})
                  </Badge>
                  <Badge 
                    variant={activeFilter === 'Consumer Staples' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'Consumer Staples'
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('Consumer Staples')}
                  >
                    Consumer Staples ({countStocksBySector('Consumer Staples')})
                  </Badge>
                  <Badge 
                    variant={activeFilter === 'Consumer Discretionary' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'Consumer Discretionary'
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('Consumer Discretionary')}
                  >
                    Consumer ({countStocksBySector('Consumer Discretionary')})
                  </Badge>
                  <Badge 
                    variant={activeFilter === 'Energy' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'Energy'
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('Energy')}
                  >
                    Energy ({countStocksBySector('Energy')})
                  </Badge>
                  <Badge 
                    variant={activeFilter === 'Industrials' ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer",
                      activeFilter === 'Industrials'
                        ? "bg-teya-green text-black hover:bg-teya-green-dark" 
                        : "border-teya-green/30 hover:bg-teya-green/10"
                    )}
                    onClick={() => filterBySector('Industrials')}
                  >
                    Industrials ({countStocksBySector('Industrials')})
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Beta Banner */}
        <BetaBanner />

        {/* Market Movers Section - PHASE 2, Day 9 */}
        <MarketMovers />

        {/* Dynamic Sections - Special Categories */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20"
            onClick={showTopGainers}
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpIcon className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Top Gainers</h3>
            </div>
            <p className="text-sm text-muted-foreground">Biggest % gains today</p>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20"
            onClick={showTopLosers}
          >
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownIcon className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold">Top Losers</h3>
            </div>
            <p className="text-sm text-muted-foreground">Biggest % losses today</p>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20"
            onClick={showMostPopular}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold">Most Popular</h3>
            </div>
            <p className="text-sm text-muted-foreground">Most viewed stocks</p>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-teya-green/20"
            onClick={() => filterBySector('all')}
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">All Stocks</h3>
            </div>
            <p className="text-sm text-muted-foreground">{ALL_STOCKS.length} total stocks</p>
          </Card>
        </div>

        {/* API Diagnostic removed for production stability */}

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {filteredStocks.length} of {ALL_STOCKS.length} stocks
                {searchQuery && ` for "${searchQuery}"`}
                {activeFilter !== 'all' && ` in ${activeFilter}`}
              </p>
              {quotesData && quotesData._source && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    quotesData._source === 'fmp_direct' ? "border-green-500 text-green-600" : ""
                  )}
                >
                  <Activity className="w-3 h-3 mr-1" />
                  {quotesData._source === 'fmp_direct' 
                    ? '🎯 Real-time FMP Data' 
                    : quotesData.quotes?.some(q => q.provider === 'fallback')
                    ? 'Demo data (backend unavailable)' 
                    : 'Cached data'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value) => {
                setSortBy(value);
                // Apply sorting logic here
                const sorted = [...displayedSymbols].sort((a, b) => {
                  const aStock = stocks.find(s => s.symbol === a);
                  const bStock = stocks.find(s => s.symbol === b);
                  if (!aStock || !bStock) return 0;
                  
                  switch(value) {
                    case 'alphabetical':
                      return a.localeCompare(b);
                    case 'gainers':
                      const bChange = parseFloat(bStock.changePercent) || 0;
                      const aChange = parseFloat(aStock.changePercent) || 0;
                      return bChange - aChange;
                    case 'losers':
                      const aLosersChange = parseFloat(aStock.changePercent) || 0;
                      const bLosersChange = parseFloat(bStock.changePercent) || 0;
                      return aLosersChange - bLosersChange;
                    case 'volume':
                      return (bStock.volume || 0) - (aStock.volume || 0);
                    case 'marketCap':
                      // marketCap is already formatted as "$123.45B" or "N/A"
                      const aMarket = aStock.marketCap === 'N/A' ? 0 : parseFloat(aStock.marketCap.replace(/[^0-9.-]+/g,"")) || 0;
                      const bMarket = bStock.marketCap === 'N/A' ? 0 : parseFloat(bStock.marketCap.replace(/[^0-9.-]+/g,"")) || 0;
                      return bMarket - aMarket;
                    default:
                      return 0;
                  }
                });
                setDisplayedSymbols(sorted);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                  <SelectItem value="gainers">Top Gainers</SelectItem>
                  <SelectItem value="losers">Top Losers</SelectItem>
                  <SelectItem value="volume">Most Active</SelectItem>
                  <SelectItem value="marketCap">Market Cap</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </Button>
            </div>
          </div>

          {/* Error Alert - Non-blocking */}
          {error && !isLoading && (
            <Alert variant="default" className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                <strong>Limited connectivity:</strong> Some real-time data may be unavailable. 
                {stocks.length > 0 ? ' Showing cached data.' : ' Please try again later.'}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Stock Cards Grid */}
          <div className={cn(
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-4"
          )}>
            {useRealtime && viewMode === 'grid' ? (
              // Render realtime cards for displayed symbols
              displayedSymbols.map((symbol) => (
                <RealtimeStockCard
                  key={symbol}
                  symbol={symbol}
                  companyName={getCompanyName(symbol)}
                  industry={getIndustry(symbol)}
                  sector={getSector(symbol)}
                  onRemove={() => {
                    const newSymbols = displayedSymbols.filter(s => s !== symbol);
                    setDisplayedSymbols(newSymbols);
                    localStorage.setItem('alfalyzer-watchlist', JSON.stringify(newSymbols));
                  }}
                />
              ))
            ) : (
              // Render standard cards
              filteredStocks.map((stock) => (
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
                        <span className="text-lg font-bold">${stock.price}</span>
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-medium",
                          (parseFloat(stock.changePercent) || 0) >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {(parseFloat(stock.changePercent) || 0) >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {(parseFloat(stock.changePercent) || 0) >= 0 ? '+' : ''}{stock.changePercent}%
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <span>{stock.sector}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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