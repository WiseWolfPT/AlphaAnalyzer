import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, PieChart, ArrowRight, Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioData {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  topPerformer: {
    symbol: string;
    name: string;
    change: number;
    changePercent: number;
  };
  worstPerformer: {
    symbol: string;
    name: string;
    change: number;
    changePercent: number;
  };
  monthlyReturn: number;
  yearlyReturn: number;
}

export function PortfolioPerformanceCard() {
  const [, setLocation] = useLocation();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock portfolio data - in real implementation, fetch from API
    const mockPortfolio: PortfolioData = {
      totalValue: 52450.75,
      todayChange: 1247.32,
      todayChangePercent: 2.43,
      totalReturn: 8234.50,
      totalReturnPercent: 18.67,
      topPerformer: {
        symbol: "NVDA",
        name: "NVIDIA Corp",
        change: 567.89,
        changePercent: 8.92
      },
      worstPerformer: {
        symbol: "COIN",
        name: "Coinbase",
        change: -189.45,
        changePercent: -5.67
      },
      monthlyReturn: 12.34,
      yearlyReturn: 24.78
    };

    // Simulate API delay
    setTimeout(() => {
      setPortfolioData(mockPortfolio);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleViewPortfolio = () => {
    setLocation("/portfolios");
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded animate-pulse w-32" />
              <div className="h-6 bg-muted rounded animate-pulse w-24" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-full" />
              <div className="h-4 bg-muted rounded animate-pulse w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!portfolioData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm mb-2">No portfolio data</p>
            <Button variant="outline" size="sm" onClick={handleViewPortfolio}>
              Create Portfolio
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositiveToday = portfolioData.todayChange >= 0;
  const isPositiveTotal = portfolioData.totalReturn >= 0;

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200/50 dark:border-purple-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <PieChart className="w-5 h-5" />
            Portfolio Performance
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewPortfolio}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-100/50"
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Value */}
        <div className="text-center">
          <p className="text-3xl font-bold">
            ${portfolioData.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            {isPositiveToday ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={cn("font-medium", 
              isPositiveToday ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {isPositiveToday ? "+" : ""}${Math.abs(portfolioData.todayChange).toFixed(2)} ({portfolioData.todayChangePercent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Today's Change</p>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground">Total Return</p>
            <p className={cn("text-lg font-bold", 
              isPositiveTotal ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {isPositiveTotal ? "+" : ""}{portfolioData.totalReturnPercent.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground">Monthly</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              +{portfolioData.monthlyReturn.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Top/Worst Performers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-green-50/50 dark:bg-green-950/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-green-600" />
              <div>
                <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300 text-xs">
                  {portfolioData.topPerformer.symbol}
                </Badge>
                <p className="text-xs text-muted-foreground">Best Today</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-600 dark:text-green-400">
                +{portfolioData.topPerformer.changePercent.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-950/30 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <div>
                <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 text-xs">
                  {portfolioData.worstPerformer.symbol}
                </Badge>
                <p className="text-xs text-muted-foreground">Worst Today</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                {portfolioData.worstPerformer.changePercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}