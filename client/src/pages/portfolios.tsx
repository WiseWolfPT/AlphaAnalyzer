import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart, Activity, TrendingUp, TrendingDown, Target, DollarSign, Percent, Plus } from "lucide-react";
import { SectorPerformance } from "@/components/stock/sector-performance";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";
import type { MockStock } from "@/lib/mock-api";

export default function Portfolios() {
  // Get all stocks for sector analysis
  const { data: allStocks, isLoading } = useQuery<MockStock[]>({
    queryKey: ["/api/stocks"],
    staleTime: 5 * 60 * 1000,
  });

  // Mock portfolio data - in real app, this would come from user's actual portfolio
  const portfolioData = {
    totalValue: 12450.30,
    dayChange: 292.45,
    dayChangePercent: 2.4,
    totalGainLoss: 1850.75,
    totalGainLossPercent: 17.4,
    holdings: [
      { symbol: "AAPL", shares: 10, avgPrice: 150.00, currentPrice: 175.43, value: 1754.30 },
      { symbol: "MSFT", shares: 8, avgPrice: 300.00, currentPrice: 378.85, value: 3030.80 },
      { symbol: "GOOGL", shares: 15, avgPrice: 120.00, currentPrice: 142.56, value: 2138.40 },
      { symbol: "NVDA", shares: 3, avgPrice: 700.00, currentPrice: 875.30, value: 2625.90 },
      { symbol: "TSLA", shares: 5, avgPrice: 200.00, currentPrice: 248.42, value: 1242.10 },
      { symbol: "META", shares: 2, avgPrice: 400.00, currentPrice: 484.20, value: 968.40 },
      { symbol: "AMZN", shares: 4, avgPrice: 140.00, currentPrice: 151.94, value: 607.76 },
      { symbol: "NFLX", shares: 1, avgPrice: 600.00, currentPrice: 641.05, value: 641.05 }
    ]
  };

  // Generate portfolio performance data for the last 30 days
  const generatePortfolioPerformance = () => {
    const data = [];
    let currentValue = portfolioData.totalValue;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some realistic portfolio movement
      const change = (Math.random() - 0.5) * (currentValue * 0.015); // 1.5% max daily movement
      currentValue = Math.max(currentValue + change, portfolioData.totalValue * 0.85);
      
      data.push({
        date: date.toLocaleDateString(),
        value: parseFloat(currentValue.toFixed(2)),
        gainLoss: parseFloat((currentValue - (portfolioData.totalValue - portfolioData.totalGainLoss)).toFixed(2))
      });
    }
    
    return data;
  };

  const performanceData = generatePortfolioPerformance();
  const bestPerformer = portfolioData.holdings.reduce((best, holding) => {
    const currentGainPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
    const bestGainPercent = ((best.currentPrice - best.avgPrice) / best.avgPrice) * 100;
    return currentGainPercent > bestGainPercent ? holding : best;
  });

  const worstPerformer = portfolioData.holdings.reduce((worst, holding) => {
    const currentGainPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
    const worstGainPercent = ((worst.currentPrice - worst.avgPrice) / worst.avgPrice) * 100;
    return currentGainPercent < worstGainPercent ? holding : worst;
  });

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
          <Button className="bg-primary hover:bg-primary/90">
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
                    {portfolioData.dayChangePercent >= 0 ? '+' : ''}${portfolioData.dayChange.toFixed(2)} ({portfolioData.dayChangePercent}%) today
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Total Gain/Loss</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">+${portfolioData.totalGainLoss.toFixed(2)}</div>
                  <div className="text-sm text-green-600">+{portfolioData.totalGainLossPercent}% overall</div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Best Performer</span>
                  </div>
                  <div className="text-lg font-bold">{bestPerformer.symbol}</div>
                  <div className="text-sm text-green-600">
                    +{(((bestPerformer.currentPrice - bestPerformer.avgPrice) / bestPerformer.avgPrice) * 100).toFixed(1)}%
                  </div>
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
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Holdings Table */}
            <Card>
              <CardHeader>
                <CardTitle>Current Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {portfolioData.holdings.map((holding) => {
                    const gainLoss = holding.shares * (holding.currentPrice - holding.avgPrice);
                    const gainLossPercent = ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
                    const isPositive = gainLoss >= 0;
                    
                    return (
                      <div key={holding.symbol} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-sm">{holding.symbol.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="font-bold">{holding.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {holding.shares} shares @ ${holding.avgPrice.toFixed(2)} avg
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold">${holding.value.toFixed(2)}</div>
                          <div className={cn(
                            "text-sm font-medium",
                            isPositive ? "text-green-600" : "text-red-600"
                          )}>
                            {isPositive ? '+' : ''}${gainLoss.toFixed(2)} ({gainLossPercent.toFixed(1)}%)
                          </div>
                        </div>
                        
                        <Badge variant={isPositive ? "default" : "destructive"}>
                          ${holding.currentPrice.toFixed(2)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            {/* Market Analytics - Sector Performance */}
            {allStocks && !isLoading && (
              <SectorPerformance stocks={allStocks} />
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