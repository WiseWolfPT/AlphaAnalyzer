import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { RealStockCard } from "@/components/stock/real-stock-card";
import { RealTimeWatchlistEnhanced } from "@/components/stock/real-time-watchlist-enhanced";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Activity, Globe } from "lucide-react";
import { realDataService } from "@/services/real-data-integration";
import { marketApi } from "@/lib/api";

export default function RealTimeDemo() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [marketIndices, setMarketIndices] = useState<any>(null);

  const topStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
  const techStocks = ['NVDA', 'AMD', 'INTC', 'AMZN'];

  const fetchMarketIndices = async () => {
    try {
      const indices = await marketApi.getIndices();
      setMarketIndices(indices);
    } catch (error) {
      console.error('Failed to fetch market indices:', error);
    }
  };

  useEffect(() => {
    fetchMarketIndices();
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchMarketIndices();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Real-Time Market Data</h1>
            <p className="text-muted-foreground">
              Live stock prices from multiple data providers
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>

        {/* Market Indices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Market Indices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">DOW</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {marketIndices?.dow?.value ? marketIndices.dow.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '34,567.89'}
                </div>
                <div className={`text-sm ${(marketIndices?.dow?.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(marketIndices?.dow?.change || 0) >= 0 ? '+' : ''}{marketIndices?.dow?.change?.toFixed(2) || '0.52'}%
                </div>
              </div>
              
              <div className="p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">S&P 500</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {marketIndices?.sp500?.value ? marketIndices.sp500.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '4,234.56'}
                </div>
                <div className={`text-sm ${(marketIndices?.sp500?.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(marketIndices?.sp500?.change || 0) >= 0 ? '+' : ''}{marketIndices?.sp500?.change?.toFixed(2) || '0.31'}%
                </div>
              </div>
              
              <div className="p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">NASDAQ</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {marketIndices?.nasdaq?.value ? marketIndices.nasdaq.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '13,789.12'}
                </div>
                <div className={`text-sm ${(marketIndices?.nasdaq?.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(marketIndices?.nasdaq?.change || 0) >= 0 ? '+' : ''}{marketIndices?.nasdaq?.change?.toFixed(2) || '-0.18'}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Watchlist - Temporarily disabled to fix errors */}
        {/* 
        <RealTimeWatchlistEnhanced 
          key={`watchlist-${refreshKey}`}
          symbols={[...topStocks, ...techStocks]}
          title="Live Market Watchlist"
          updateInterval={30000}
        />
        */}

        {/* Top Stocks Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Stocks - Real-Time Prices
            </h2>
            <Badge variant="outline" className="text-xs">
              Updates every 30s
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topStocks.map(symbol => (
              <RealStockCard 
                key={`${symbol}-${refreshKey}`}
                symbol={symbol}
                showMiniChart={false}
                autoRefresh={true}
                refreshInterval={30000}
              />
            ))}
          </div>
        </div>

        {/* Tech Stocks Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tech Stocks</h2>
            <Badge variant="outline" className="text-xs">
              Real-Time Data
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {techStocks.map(symbol => (
              <RealStockCard 
                key={`${symbol}-${refreshKey}`}
                symbol={symbol}
                showMiniChart={false}
                autoRefresh={true}
                refreshInterval={30000}
              />
            ))}
          </div>
        </div>

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle>API Provider Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={async () => {
                const health = await realDataService.checkProviderHealth();
                console.log('Provider Health:', health);
                alert(`Provider Health Check:\n${JSON.stringify(health, null, 2)}`);
              }}
              variant="outline"
              size="sm"
            >
              Check Provider Health
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}