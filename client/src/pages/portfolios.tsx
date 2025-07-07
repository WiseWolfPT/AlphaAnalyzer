import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, PieChart, Activity, TrendingUp, TrendingDown, Target, DollarSign, Percent, Plus, ExternalLink, AlertCircle } from "lucide-react";
import { SectorPerformance } from "@/components/stock/sector-performance";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { useStock } from "@/hooks/use-enhanced-stocks";
import { cn } from "@/lib/utils";
import type { MockStock } from "@/lib/mock-api";
import { api } from "@/lib/api";

// Portfolio interfaces to match the API response
interface Portfolio {
  id: string;
  name: string;
  description?: string;
  currency: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  holdings: Holding[];
  transactions: Transaction[];
  dividends: Dividend[];
  cash_transactions: CashTransaction[];
  portfolio_performance: PortfolioPerformance[];
}

interface Holding {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  total_cost: number;
  current_price?: number;
  current_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_percent?: number;
  last_updated: string;
}

interface Transaction {
  id: string;
  portfolio_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Dividend {
  id: string;
  portfolio_id: string;
  symbol: string;
  amount: number;
  payment_date: string;
  ex_dividend_date?: string;
  shares_owned?: number;
  amount_per_share?: number;
  currency: string;
  notes?: string;
  created_at: string;
}

interface CashTransaction {
  id: string;
  portfolio_id: string;
  type: 'deposit' | 'withdrawal' | 'dividend' | 'fee';
  amount: number;
  date: string;
  description?: string;
  reference_id?: string;
  created_at: string;
}

interface PortfolioPerformance {
  id: string;
  portfolio_id: string;
  date: string;
  total_value: number;
  total_cost: number;
  cash_balance: number;
  total_pnl?: number;
  total_pnl_percent?: number;
  daily_pnl?: number;
  daily_pnl_percent?: number;
}

interface PortfoliosResponse {
  count: number;
  portfolios: Portfolio[];
}

// Utility function to map database holding to frontend format
function mapHoldingToFrontend(holding: Holding) {
  return {
    symbol: holding.symbol,
    shares: holding.quantity,
    avgPrice: holding.average_price,
    currentPrice: holding.current_price || holding.average_price,
    value: holding.current_value || (holding.quantity * holding.average_price),
    totalCost: holding.total_cost,
    unrealizedPnl: holding.unrealized_pnl || 0,
    unrealizedPnlPercent: holding.unrealized_pnl_percent || 0
  };
}

// Enhanced portfolio holding component with real data
function PortfolioHolding({ holding }: { holding: ReturnType<typeof mapHoldingToFrontend> }) {
  const [, setLocation] = useLocation();
  const { data: stock, isLoading } = useStock(holding.symbol);

  const handleClick = () => {
    setLocation(`/stock/${holding.symbol}/charts`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  const currentPrice = stock?.currentPrice || holding.currentPrice;
  const gainLoss = (currentPrice - holding.avgPrice) * holding.shares;
  const gainLossPercent = ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
  const isPositive = gainLoss >= 0;
  const currentValue = currentPrice * holding.shares;

  return (
    <div 
      className="flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group border"
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-primary">{holding.symbol.charAt(0)}</span>
        </div>
        <div>
          <div className="font-medium group-hover:text-primary transition-colors">
            {holding.symbol}
          </div>
          <div className="text-sm text-muted-foreground">
            {holding.shares} shares × ${currentPrice.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="text-right flex items-center space-x-3">
        <div>
          <div className="font-medium">
            ${currentValue.toFixed(2)}
          </div>
          <div className={cn(
            "text-sm",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {isPositive ? "+" : ""}${gainLoss.toFixed(2)} ({isPositive ? "+" : ""}{gainLossPercent.toFixed(2)}%)
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

// Loading skeleton for portfolio overview
function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Chart Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
      
      {/* Holdings Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Error component
function PortfolioError({ error, retry }: { error: any; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium mb-2">Failed to Load Portfolio</h3>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        {error?.message || "There was an error loading your portfolio data. Please try again."}
      </p>
      <Button onClick={retry} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

export default function Portfolios() {
  // Get all stocks for sector analysis
  const { data: allStocks, isLoading: stocksLoading } = useQuery<MockStock[]>({
    queryKey: ["/api/stocks"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's portfolios from API
  const { 
    data: portfoliosResponse, 
    isLoading: portfoliosLoading, 
    error: portfoliosError,
    refetch: refetchPortfolios
  } = useQuery<PortfoliosResponse>({
    queryKey: ["/api/portfolios"],
    queryFn: async () => {
      const response = await api.get('/portfolios');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
  });

  // Get the default portfolio or first portfolio
  const selectedPortfolio = portfoliosResponse?.portfolios?.find(p => p.is_default) || 
                           portfoliosResponse?.portfolios?.[0];

  // Fetch performance data for the selected portfolio
  const {
    data: performanceData,
    isLoading: performanceLoading
  } = useQuery({
    queryKey: ["/api/portfolios", selectedPortfolio?.id, "performance"],
    queryFn: async () => {
      if (!selectedPortfolio?.id) return [];
      
      // For now, generate mock performance data until we have real performance tracking
      // In the future, this will call: /api/portfolios/${selectedPortfolio.id}/performance
      const data = [];
      const totalValue = selectedPortfolio.holdings.reduce((sum, holding) => {
        return sum + (holding.current_value || (holding.quantity * holding.average_price));
      }, 0);
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Add some realistic portfolio movement based on actual total value
        const change = (Math.random() - 0.5) * (totalValue * 0.015); // 1.5% max daily movement
        const currentValue = Math.max(totalValue + change, totalValue * 0.85);
        const totalCost = selectedPortfolio.holdings.reduce((sum, holding) => sum + holding.total_cost, 0);
        
        data.push({
          date: date.toLocaleDateString(),
          value: parseFloat(currentValue.toFixed(2)),
          gainLoss: parseFloat((currentValue - totalCost).toFixed(2))
        });
      }
      
      return data;
    },
    enabled: !!selectedPortfolio?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate portfolio summary data
  const portfolioData = selectedPortfolio ? (() => {
    const mappedHoldings = selectedPortfolio.holdings.map(mapHoldingToFrontend);
    const totalValue = mappedHoldings.reduce((sum, holding) => sum + holding.value, 0);
    const totalCost = mappedHoldings.reduce((sum, holding) => sum + holding.totalCost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    
    // Mock day change (in real app, this would come from comparing today vs yesterday)
    const dayChangePercent = (Math.random() - 0.5) * 5; // -2.5% to +2.5%
    const dayChange = (totalValue * dayChangePercent) / 100;
    
    return {
      totalValue,
      dayChange,
      dayChangePercent,
      totalGainLoss,
      totalGainLossPercent,
      holdings: mappedHoldings
    };
  })() : null;

  // Calculate best and worst performers
  const bestPerformer = portfolioData?.holdings?.reduce((best, holding) => {
    const currentGainPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
    const bestGainPercent = ((best.currentPrice - best.avgPrice) / best.avgPrice) * 100;
    return currentGainPercent > bestGainPercent ? holding : best;
  });

  const worstPerformer = portfolioData?.holdings?.reduce((worst, holding) => {
    const currentGainPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
    const worstGainPercent = ((worst.currentPrice - worst.avgPrice) / worst.avgPrice) * 100;
    return currentGainPercent < worstGainPercent ? holding : worst;
  });

  // Handle loading state
  if (portfoliosLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Portfolio Analytics</h1>
                <p className="text-muted-foreground">Comprehensive analysis of your investment portfolio</p>
              </div>
            </div>
            <Button disabled className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Holding
            </Button>
          </div>
          <PortfolioSkeleton />
        </div>
      </MainLayout>
    );
  }

  // Handle error state
  if (portfoliosError) {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Portfolio Analytics</h1>
                <p className="text-muted-foreground">Comprehensive analysis of your investment portfolio</p>
              </div>
            </div>
          </div>
          <PortfolioError error={portfoliosError} retry={refetchPortfolios} />
        </div>
      </MainLayout>
    );
  }

  // Handle empty portfolio state
  if (!selectedPortfolio || !portfolioData) {
    return (
      <MainLayout>
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Portfolio Analytics</h1>
                <p className="text-muted-foreground">Comprehensive analysis of your investment portfolio</p>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
              <Plus className="h-4 w-4 mr-2" />
              Create Portfolio
            </Button>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Portfolio Found</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              You haven't created any portfolios yet. Create your first portfolio to start tracking your investments.
            </p>
            <Button className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Portfolio
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Portfolio Analytics</h1>
              <p className="text-muted-foreground">Comprehensive analysis of your investment portfolio</p>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Holding
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Portfolio Overview</TabsTrigger>
            <TabsTrigger value="analytics">Market Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Portfolio Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Total Value</span>
                  </div>
                  <div className="text-2xl font-bold">${portfolioData.totalValue.toLocaleString()}</div>
                  <div className={cn(
                    "text-sm font-medium",
                    portfolioData.dayChangePercent >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {portfolioData.dayChangePercent >= 0 ? '+' : ''}${portfolioData.dayChange.toFixed(2)} ({portfolioData.dayChangePercent.toFixed(1)}%) today
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-chartreuse-dark" />
                    <span className="text-sm text-muted-foreground">Total Gain/Loss</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    portfolioData.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {portfolioData.totalGainLoss >= 0 ? '+' : ''}${portfolioData.totalGainLoss.toFixed(2)}
                  </div>
                  <div className={cn(
                    "text-sm",
                    portfolioData.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {portfolioData.totalGainLoss >= 0 ? '+' : ''}{portfolioData.totalGainLossPercent.toFixed(1)}% overall
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Best Performer</span>
                  </div>
                  {bestPerformer ? (
                    <>
                      <div className="text-lg font-bold">{bestPerformer.symbol}</div>
                      <div className="text-sm text-green-600">
                        +{(((bestPerformer.currentPrice - bestPerformer.avgPrice) / bestPerformer.avgPrice) * 100).toFixed(1)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No holdings</div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Holdings</span>
                  </div>
                  <div className="text-2xl font-bold">{portfolioData.holdings.length}</div>
                  <div className="text-sm text-muted-foreground">Active positions</div>
                </CardContent>
              </Card>
            </div>

            {/* Portfolio Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Portfolio Performance (30 Days)
                  {selectedPortfolio && (
                    <Badge variant="outline" className="ml-2">
                      {selectedPortfolio.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : performanceData && performanceData.length > 0 ? (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          fill="url(#portfolioGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No performance data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Holdings Table */}
            <Card>
              <CardHeader>
                <CardTitle>Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                {portfolioData.holdings.length > 0 ? (
                  <div className="space-y-3">
                    {portfolioData.holdings.map((holding) => (
                      <PortfolioHolding key={holding.symbol} holding={holding} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your portfolio by adding your first stock position.
                    </p>
                    <Button className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Holding
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            {/* Market Analytics - Sector Performance */}
            {allStocks && !stocksLoading ? (
              <SectorPerformance stocks={allStocks} />
            ) : (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-6">
            {/* Performance Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {portfolioData.holdings
                      .sort((a, b) => {
                        const aGain = ((a.currentPrice - a.avgPrice) / a.avgPrice) * 100;
                        const bGain = ((b.currentPrice - b.avgPrice) / b.avgPrice) * 100;
                        return bGain - aGain;
                      })
                      .slice(0, 3)
                      .map((holding) => {
                        const gainPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
                        return (
                          <div key={holding.symbol} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                            <div>
                              <div className="font-bold">{holding.symbol}</div>
                              <div className="text-sm text-muted-foreground">{holding.shares} shares</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">+{gainPercent.toFixed(1)}%</div>
                              <div className="text-sm text-muted-foreground">${holding.currentPrice.toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Underperformers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {portfolioData.holdings
                      .sort((a, b) => {
                        const aGain = ((a.currentPrice - a.avgPrice) / a.avgPrice) * 100;
                        const bGain = ((b.currentPrice - b.avgPrice) / b.avgPrice) * 100;
                        return aGain - bGain;
                      })
                      .slice(0, 3)
                      .map((holding) => {
                        const gainPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
                        const isNegative = gainPercent < 0;
                        return (
                          <div key={holding.symbol} className={`flex items-center justify-between p-3 ${isNegative ? 'bg-red-500/10' : 'bg-yellow-500/10'} rounded-lg`}>
                            <div>
                              <div className="font-bold">{holding.symbol}</div>
                              <div className="text-sm text-muted-foreground">{holding.shares} shares</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${isNegative ? 'text-red-600' : 'text-yellow-600'}`}>
                                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                              </div>
                              <div className="text-sm text-muted-foreground">${holding.currentPrice.toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Portfolio Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beta</span>
                      <span className="font-medium">1.15</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volatility (30D)</span>
                      <span className="font-medium">2.8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sharpe Ratio</span>
                      <span className="font-medium">1.42</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Diversification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sectors</span>
                      <span className="font-medium">4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Largest Position</span>
                      <span className="font-medium">24.3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tech Allocation</span>
                      <span className="font-medium">68.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Returns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">1 Month</span>
                      <span className="font-medium text-green-600">+8.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">3 Months</span>
                      <span className="font-medium text-green-600">+15.7%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">YTD</span>
                      <span className="font-medium text-green-600">+17.4%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}