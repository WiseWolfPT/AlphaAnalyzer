import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, BarChart3, Clock, Zap } from "lucide-react";
import { useAuth } from "@/contexts/simple-auth-offline";
import { cn } from "@/lib/utils";

// Import all dashboard cards
import { TopGainersCard } from "./top-gainers-card";
import { TopLosersCard } from "./top-losers-card";
import { WatchlistAlertsCard } from "./watchlist-alerts-card";
import { PortfolioPerformanceCard } from "./portfolio-performance-card";
import { MarketSentimentCard } from "./market-sentiment-card";
import { EarningsCard } from "./earnings-card";
import { NewsHighlightsCard } from "./news-highlights-card";
import { SectorPerformanceCard } from "./sector-performance-card";

// Market overview data
const marketOverview = {
  sp500: { value: "4,712.34", change: "+1.24%", trend: "up" as const },
  nasdaq: { value: "14,789.45", change: "+1.89%", trend: "up" as const },
  dow: { value: "35,234.67", change: "+0.78%", trend: "up" as const },
  vix: { value: "16.23", change: "-5.2%", trend: "down" as const }
};

export function EnhancedDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 2000);
  };

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-chartreuse bg-clip-text text-transparent">
              Investment Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              Real-time market insights and analysis
              <Clock className="w-4 h-4" />
              <span className="text-sm">Updated: {formatLastUpdated(lastUpdated)}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
              Live Data
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Market Overview Strip */}
        <Card className="border-chartreuse/20 bg-gradient-to-r from-chartreuse/5 to-transparent">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">S&P 500</p>
                <p className="text-xl font-bold">{marketOverview.sp500.value}</p>
                <p className={cn("text-sm", marketOverview.sp500.trend === "up" ? "text-green-500" : "text-red-500")}>
                  {marketOverview.sp500.change}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">NASDAQ</p>
                <p className="text-xl font-bold">{marketOverview.nasdaq.value}</p>
                <p className={cn("text-sm", marketOverview.nasdaq.trend === "up" ? "text-green-500" : "text-red-500")}>
                  {marketOverview.nasdaq.change}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">DOW</p>
                <p className="text-xl font-bold">{marketOverview.dow.value}</p>
                <p className={cn("text-sm", marketOverview.dow.trend === "up" ? "text-green-500" : "text-red-500")}>
                  {marketOverview.dow.change}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">VIX</p>
                <p className="text-xl font-bold">{marketOverview.vix.value}</p>
                <p className={cn("text-sm", marketOverview.vix.trend === "down" ? "text-green-500" : "text-red-500")}>
                  {marketOverview.vix.change}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Row 1: Market Movers and Alerts */}
          <TopGainersCard />
          <TopLosersCard />
          <WatchlistAlertsCard />
          <PortfolioPerformanceCard />
          
          {/* Row 2: Sentiment, Earnings, News, Sectors */}
          <MarketSentimentCard />
          <EarningsCard />
          <NewsHighlightsCard />
          <SectorPerformanceCard />
        </div>

        {/* Quick Actions Section */}
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-chartreuse" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Button 
                variant="outline"
                onClick={() => setLocation("/find-stocks")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:border-chartreuse/30 hover:bg-chartreuse/5"
              >
                <BarChart3 className="w-6 h-6" />
                <span className="text-sm">Stock Screener</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation("/watchlists")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="w-6 h-6 text-xl">👀</div>
                <span className="text-sm">Watchlists</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation("/portfolios")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:border-purple-300 hover:bg-purple-50"
              >
                <div className="w-6 h-6 text-xl">📊</div>
                <span className="text-sm">Portfolios</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation("/earnings")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:border-indigo-300 hover:bg-indigo-50"
              >
                <div className="w-6 h-6 text-xl">📅</div>
                <span className="text-sm">Earnings</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation("/intrinsic-value")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="w-6 h-6 text-xl">💎</div>
                <span className="text-sm">Valuation</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation("/news")}
                className="h-auto p-4 flex flex-col items-center gap-2 hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="w-6 h-6 text-xl">📰</div>
                <span className="text-sm">News</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Market data provided by multiple sources • Updated every 15 seconds during market hours</p>
          <p className="mt-1">
            Welcome back, {user?.name || "Investor"}! 
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setLocation("/profile")}
              className="p-0 ml-1 h-auto text-chartreuse"
            >
              View Profile
            </Button>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}