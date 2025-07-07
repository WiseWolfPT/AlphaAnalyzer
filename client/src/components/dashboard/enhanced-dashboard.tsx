import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, BarChart3, Clock, Zap } from "lucide-react";
import { useAuth } from "@/contexts/simple-auth-offline";
import { cn } from "@/lib/utils";

// Import lazy dashboard cards for better performance
import { LazyDashboardCards } from "./lazy-dashboard-cards";
import { DashboardErrorBoundary, DashboardCardErrorFallback } from "./dashboard-error-boundary";

// Import real market data hooks
import { useMarketOverview } from "@/hooks/use-market-data";
import { useRealTimeDashboard } from "@/hooks/use-real-time-dashboard";
import { useDashboardPerformance } from "@/hooks/use-dashboard-performance";

export function EnhancedDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Performance monitoring
  const { trackApiCall, getPerformanceSummary } = useDashboardPerformance('EnhancedDashboard');
  
  // Get real-time dashboard data
  const { 
    marketOverview, 
    topGainers, 
    topLosers, 
    lastUpdated, 
    isLive, 
    refreshAll, 
    hasData 
  } = useRealTimeDashboard();
  
  // Fallback market data hook for loading states
  const { isLoading: marketLoading, error: marketError } = useMarketOverview();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const startTime = performance.now();
    
    try {
      // Refresh all dashboard data
      const success = await refreshAll();
      trackApiCall('dashboard_refresh', startTime, success);
    } catch (error) {
      console.error('Error refreshing data:', error);
      trackApiCall('dashboard_refresh', startTime, false);
    } finally {
      setIsRefreshing(false);
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
            <Badge 
              variant="outline" 
              className={cn(
                isLive && hasData 
                  ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300"
                  : "border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full mr-2",
                isLive && hasData 
                  ? "bg-green-500 animate-pulse" 
                  : "bg-yellow-500"
              )} />
              {isLive && hasData ? "Live Data" : "Demo Data"}
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

        {/* Market Overview Strip - Real Data */}
        <Card className="border-chartreuse/20 bg-gradient-to-r from-chartreuse/5 to-transparent">
          <CardContent className="p-4">
            {marketLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-16 mx-auto" />
                    <div className="h-6 bg-muted rounded animate-pulse w-20 mx-auto" />
                    <div className="h-4 bg-muted rounded animate-pulse w-12 mx-auto" />
                  </div>
                ))}
              </div>
            ) : marketError ? (
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Market data temporarily unavailable</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">S&P 500</p>
                  <p className="text-xl font-bold">
                    {marketOverview?.sp500?.value?.toLocaleString() || "4,712.34"}
                  </p>
                  <p className={cn(
                    "text-sm", 
                    (marketOverview?.sp500?.change || 0) >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {(marketOverview?.sp500?.change || 0) >= 0 ? "+" : ""}
                    {marketOverview?.sp500?.change?.toFixed(2) || "+1.24"}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">NASDAQ</p>
                  <p className="text-xl font-bold">
                    {marketOverview?.nasdaq?.value?.toLocaleString() || "14,789.45"}
                  </p>
                  <p className={cn(
                    "text-sm", 
                    (marketOverview?.nasdaq?.change || 0) >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {(marketOverview?.nasdaq?.change || 0) >= 0 ? "+" : ""}
                    {marketOverview?.nasdaq?.change?.toFixed(2) || "+1.89"}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">DOW</p>
                  <p className="text-xl font-bold">
                    {marketOverview?.dow?.value?.toLocaleString() || "35,234.67"}
                  </p>
                  <p className={cn(
                    "text-sm", 
                    (marketOverview?.dow?.change || 0) >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {(marketOverview?.dow?.change || 0) >= 0 ? "+" : ""}
                    {marketOverview?.dow?.change?.toFixed(2) || "+0.78"}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">VIX</p>
                  <p className="text-xl font-bold">
                    {marketOverview?.vix?.value?.toFixed(2) || "16.23"}
                  </p>
                  <p className={cn(
                    "text-sm", 
                    (marketOverview?.vix?.change || 0) <= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {(marketOverview?.vix?.change || 0) >= 0 ? "+" : ""}
                    {marketOverview?.vix?.change?.toFixed(2) || "-5.2"}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Dashboard Grid */}
        <DashboardErrorBoundary fallback={DashboardCardErrorFallback}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <LazyDashboardCards 
              topGainers={topGainers}
              topLosers={topLosers}
              isLoading={marketLoading && !hasData}
            />
          </div>
        </DashboardErrorBoundary>

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