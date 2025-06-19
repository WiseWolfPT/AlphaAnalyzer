import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Percent, PieChart, BarChart3, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PortfolioHolding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  sector: string;
  marketValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number;
}

interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cash: number;
  dividendYield: number;
}

interface PortfolioOverviewProps {
  portfolioName?: string;
  className?: string;
  onAddHolding?: () => void;
  onSettings?: () => void;
  onHoldingClick?: (symbol: string) => void;
}

const mockHoldings: PortfolioHolding[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 50,
    avgCost: 150.00,
    currentPrice: 175.43,
    sector: 'Technology',
    marketValue: 8771.50,
    totalReturn: 1271.50,
    totalReturnPercent: 16.95,
    dayChange: 117.00,
    dayChangePercent: 1.35,
    weight: 35.2
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    shares: 25,
    avgCost: 320.00,
    currentPrice: 378.85,
    sector: 'Technology',
    marketValue: 9471.25,
    totalReturn: 1471.25,
    totalReturnPercent: 18.39,
    dayChange: 103.00,
    dayChangePercent: 1.10,
    weight: 38.0
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    shares: 15,
    avgCost: 125.00,
    currentPrice: 142.56,
    sector: 'Technology',
    marketValue: 2138.40,
    totalReturn: 263.40,
    totalReturnPercent: 14.08,
    dayChange: -18.45,
    dayChangePercent: -0.85,
    weight: 8.6
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    shares: 20,
    avgCost: 180.00,
    currentPrice: 208.91,
    sector: 'Consumer Discretionary',
    marketValue: 4178.20,
    totalReturn: 578.20,
    totalReturnPercent: 16.06,
    dayChange: -113.40,
    dayChangePercent: -2.64,
    weight: 16.8
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    shares: 12,
    avgCost: 210.00,
    currentPrice: 245.67,
    sector: 'ETF',
    marketValue: 2948.04,
    totalReturn: 428.04,
    totalReturnPercent: 17.00,
    dayChange: 14.76,
    dayChangePercent: 0.50,
    weight: 11.8
  }
];

export function PortfolioOverview({
  portfolioName = "My Portfolio",
  className,
  onAddHolding,
  onSettings,
  onHoldingClick
}: PortfolioOverviewProps) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(mockHoldings);
  const [stats, setStats] = useState<PortfolioStats | null>(null);

  // Calculate portfolio statistics
  useEffect(() => {
    const totalValue = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
    const totalCost = holdings.reduce((sum, holding) => sum + (holding.shares * holding.avgCost), 0);
    const totalReturn = totalValue - totalCost;
    const totalReturnPercent = (totalReturn / totalCost) * 100;
    const dayChange = holdings.reduce((sum, holding) => sum + holding.dayChange, 0);
    const dayChangePercent = (dayChange / (totalValue - dayChange)) * 100;
    const cash = 2500.00; // Mock cash value
    const dividendYield = 2.15; // Mock dividend yield

    setStats({
      totalValue: totalValue + cash,
      totalCost,
      totalReturn,
      totalReturnPercent,
      dayChange,
      dayChangePercent,
      cash,
      dividendYield
    });
  }, [holdings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getSectorAllocations = () => {
    const sectorMap = new Map<string, number>();
    holdings.forEach(holding => {
      const current = sectorMap.get(holding.sector) || 0;
      sectorMap.set(holding.sector, current + holding.marketValue);
    });

    const total = holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
    return Array.from(sectorMap.entries()).map(([sector, value]) => ({
      sector,
      value,
      percentage: (value / total) * 100
    })).sort((a, b) => b.value - a.value);
  };

  if (!stats) return null;

  const sectorAllocations = getSectorAllocations();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{portfolioName}</h2>
          <p className="text-muted-foreground">Real-time portfolio tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddHolding}>
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
          <Button variant="ghost" size="sm" onClick={onSettings}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Portfolio Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Return</p>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.totalReturn >= 0 ? "text-positive" : "text-negative"
                )}>
                  {formatCurrency(stats.totalReturn)}
                </p>
                <p className={cn(
                  "text-sm",
                  stats.totalReturnPercent >= 0 ? "text-positive" : "text-negative"
                )}>
                  {formatPercent(stats.totalReturnPercent)}
                </p>
              </div>
              <TrendingUp className={cn(
                "h-8 w-8",
                stats.totalReturn >= 0 ? "text-positive" : "text-negative"
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Day Change</p>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.dayChange >= 0 ? "text-positive" : "text-negative"
                )}>
                  {formatCurrency(stats.dayChange)}
                </p>
                <p className={cn(
                  "text-sm",
                  stats.dayChangePercent >= 0 ? "text-positive" : "text-negative"
                )}>
                  {formatPercent(stats.dayChangePercent)}
                </p>
              </div>
              {stats.dayChange >= 0 ? (
                <TrendingUp className="h-8 w-8 text-positive" />
              ) : (
                <TrendingDown className="h-8 w-8 text-negative" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.cash)}</p>
                <p className="text-sm text-muted-foreground">
                  Dividend Yield: {stats.dividendYield}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="holdings" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Holdings
          </TabsTrigger>
          <TabsTrigger value="allocation" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Allocation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Symbol</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Shares</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Value</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Return</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Day Change</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => (
                      <tr
                        key={holding.symbol}
                        className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => onHoldingClick?.(holding.symbol)}
                      >
                        <td className="p-4">
                          <div>
                            <div className="font-semibold">{holding.symbol}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[120px]">
                              {holding.name}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {holding.sector}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4 text-right hidden sm:table-cell">
                          <div className="text-sm">{holding.shares}</div>
                          <div className="text-xs text-muted-foreground">
                            @ {formatCurrency(holding.avgCost)}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-semibold">
                            {formatCurrency(holding.marketValue)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(holding.currentPrice)}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className={cn(
                            "font-semibold",
                            holding.totalReturn >= 0 ? "text-positive" : "text-negative"
                          )}>
                            {formatCurrency(holding.totalReturn)}
                          </div>
                          <div className={cn(
                            "text-sm",
                            holding.totalReturnPercent >= 0 ? "text-positive" : "text-negative"
                          )}>
                            {formatPercent(holding.totalReturnPercent)}
                          </div>
                        </td>
                        <td className="p-4 text-right hidden md:table-cell">
                          <div className={cn(
                            "font-semibold",
                            holding.dayChange >= 0 ? "text-positive" : "text-negative"
                          )}>
                            {formatCurrency(holding.dayChange)}
                          </div>
                          <div className={cn(
                            "text-sm",
                            holding.dayChangePercent >= 0 ? "text-positive" : "text-negative"
                          )}>
                            {formatPercent(holding.dayChangePercent)}
                          </div>
                        </td>
                        <td className="p-4 text-right hidden lg:table-cell">
                          <div className="text-sm font-medium">
                            {holding.weight.toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectorAllocations.map((allocation, index) => (
                  <div key={allocation.sector} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{allocation.sector}</span>
                      <span className="text-sm text-muted-foreground">
                        {allocation.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={allocation.percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(allocation.value)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stocks</span>
                    <span className="text-sm text-muted-foreground">
                      {((stats.totalValue - stats.cash) / stats.totalValue * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(stats.totalValue - stats.cash) / stats.totalValue * 100} 
                    className="h-2" 
                  />
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(stats.totalValue - stats.cash)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cash</span>
                    <span className="text-sm text-muted-foreground">
                      {(stats.cash / stats.totalValue * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={stats.cash / stats.totalValue * 100} 
                    className="h-2" 
                  />
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(stats.cash)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}