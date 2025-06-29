import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Target, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { type StockQuote } from "@/services/real-data-integration";

export default function SimpleDashboard() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [marketIndices, setMarketIndices] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [loadingIndices, setLoadingIndices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRealData, setUseRealData] = useState(true);
  const [dataSource, setDataSource] = useState<'real' | 'mock' | 'mixed'>('mixed');
  const [, setLocation] = useLocation();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([fetchStocks(), fetchMarketIndices()]);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Using cached or fallback data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async () => {
    setLoadingStocks(true);
    try {
      if (useRealData) {
        console.log('🔄 Fetching real stock data...');
        
        // Define popular stock symbols to fetch
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM'];
        
        // Use backend API to fetch real data
        const response = await fetch(`/api/stocks/realtime/${symbols.join(',')}`);
        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`);
        }
        
        const stockQuotes = await response.json();
        const stockArray = Object.values(stockQuotes).filter(Boolean).map((stockData: any) => ({
          symbol: stockData.symbol,
          name: stockData.name || `${stockData.symbol} Corp`,
          price: parseFloat(stockData.price || stockData.currentPrice || '0'),
          change: parseFloat(stockData.change || '0'),
          changePercent: parseFloat(stockData.changePercent || '0'),
          sector: stockData.sector || 'Technology',
          marketCap: stockData.marketCap || 'N/A',
          eps: stockData.eps || 'N/A',
          peRatio: stockData.peRatio || 'N/A',
          logo: stockData.logo,
          lastUpdated: new Date(stockData.lastUpdated || Date.now()),
          source: stockData.source || 'real'
        }));
        
        // Determine data source based on actual results
        const realCount = stockArray.filter(s => s.source === 'real').length;
        const mockCount = stockArray.filter(s => s.source === 'mock').length;
        
        if (realCount > 0 && mockCount === 0) {
          setDataSource('real');
        } else if (realCount === 0 && mockCount > 0) {
          setDataSource('mock');
        } else {
          setDataSource('mixed');
        }
        
        setStocks(stockArray);
        console.log(`✅ Fetched ${stockArray.length} stocks (${realCount} real, ${mockCount} mock)`);
      } else {
        // Fallback to server API (mock data)
        console.log('📦 Using mock data from server...');
        const stocksResponse = await fetch('/api/stocks?mode=mock');
        const stocksData = await stocksResponse.json();
        setStocks(stocksData);
        setDataSource('mock');
      }
    } catch (error) {
      console.error('❌ Error fetching stocks:', error);
      
      // Emergency fallback to server mock data
      try {
        const stocksResponse = await fetch('/api/stocks?mode=mock');
        const stocksData = await stocksResponse.json();
        setStocks(stocksData);
        setDataSource('mock');
      } catch (fallbackError) {
        console.error('❌ Emergency stock fallback failed:', fallbackError);
        throw fallbackError;
      }
    } finally {
      setLoadingStocks(false);
    }
  };

  const fetchMarketIndices = async () => {
    setLoadingIndices(true);
    try {
      if (useRealData) {
        // Use backend API for market indices
        const response = await fetch('/api/market-indices');
        if (response.ok) {
          const indices = await response.json();
          setMarketIndices(indices);
        } else {
          throw new Error('Backend API error for market indices');
        }
      } else {
        const indicesResponse = await fetch('/api/market-indices');
        const indicesData = await indicesResponse.json();
        setMarketIndices(indicesData);
      }
    } catch (error) {
      console.error('❌ Error fetching market indices:', error);
      
      // Fallback to server API
      try {
        const indicesResponse = await fetch('/api/market-indices');
        const indicesData = await indicesResponse.json();
        setMarketIndices(indicesData);
      } catch (fallbackError) {
        console.error('❌ Emergency indices fallback failed:', fallbackError);
        throw fallbackError;
      }
    } finally {
      setLoadingIndices(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [useRealData]);

  const handleStockClick = (symbol: string) => {
    setLocation(`/stock/${symbol}`);
  };

  const toggleDataSource = () => {
    setUseRealData(!useRealData);
  };

  const getDataSourceIcon = () => {
    switch (dataSource) {
      case 'real':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'mock':
        return <WifiOff className="h-4 w-4 text-orange-500" />;
      case 'mixed':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDataSourceText = () => {
    switch (dataSource) {
      case 'real':
        return 'Real Data';
      case 'mock':
        return 'Mock Data';
      case 'mixed':
        return 'Mixed Data';
      default:
        return 'No Data';
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

  return (
    <MainLayout>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <BetaBanner />
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">Connection Issue:</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Market Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">Real-time market data and analysis</p>
              <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 rounded-md">
                {getDataSourceIcon()}
                <span className="text-xs font-medium">{getDataSourceText()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <StockSearch onStockSelect={() => {}} />
            <Button
              variant="outline"
              onClick={toggleDataSource}
              className="flex items-center gap-2"
              title={useRealData ? "Switch to Mock Data" : "Switch to Real Data"}
            >
              {useRealData ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span className="hidden sm:inline">{useRealData ? "Real" : "Mock"}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Market Indices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingIndices ? (
            // Loading skeleton for market indices
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            marketStats.map((stat) => {
              const Icon = stat.icon;
              const isPositive = stat.change >= 0;
              return (
                <Card key={stat.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="text-sm font-medium">{stat.label}</h3>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className={cn(
                      "text-xs flex items-center",
                      isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {isPositive ? "+" : ""}{stat.change.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Stock Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Stocks</h2>
            <div className="flex items-center gap-2">
              {loadingStocks && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Badge variant="secondary">
                {loadingStocks ? "Loading..." : `${stocks.length} Stocks`}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loadingStocks && stocks.length === 0 ? (
              // Loading skeleton for stock cards
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 bg-gray-200 rounded"></div>
                        <div className="h-3 w-3 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded"></div>
                    </div>
                    <div>
                      <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-8 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded w-12"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              stocks.map((stock) => {
              const change = parseFloat(stock.change || '0');
              const changePercent = parseFloat(stock.changePercent || '0');
              const isPositive = change >= 0;
              
              return (
                <Card 
                  key={stock.symbol} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleStockClick(stock.symbol)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {stock.logo && (
                          <img 
                            src={stock.logo} 
                            alt={stock.name} 
                            className="w-12 h-12 rounded"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        )}
                        {stock.source && (
                          <div className="flex items-center">
                            {stock.source === 'real' ? (
                              <Wifi className="h-3 w-3 text-green-500" title="Real Data" />
                            ) : (
                              <WifiOff className="h-3 w-3 text-orange-500" title="Mock Data" />
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant={isPositive ? "default" : "destructive"}>
                        {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{stock.symbol}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{stock.name}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-2xl font-bold">${stock.price}</span>
                        <span className={cn(
                          "text-sm font-medium",
                          isPositive ? "text-green-600" : "text-red-600"
                        )}>
                          {isPositive ? "+" : ""}${Math.abs(change).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Market Cap</span>
                        <span>{stock.marketCap}</span>
                      </div>
                      {stock.peRatio && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>P/E Ratio</span>
                          <span>{stock.peRatio}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}