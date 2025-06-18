import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Home, Calendar, DollarSign, Activity, Target, Clock, Info, Settings, RotateCcw, Eye } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import { dataAggregatorService, type AggregatedStockData } from "@/services/data-aggregator";
import { useChartLayout } from "@/hooks/use-chart-layout";
import { DraggableChart } from "@/components/charts/draggable-chart";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

// Chart Components
import { PriceChart } from "@/components/charts/price-chart";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { RevenueSegmentChart } from "@/components/charts/revenue-segment-chart";
import { EbitdaChart } from "@/components/charts/ebitda-chart";
import { FreeCashFlowChart } from "@/components/charts/free-cash-flow-chart";
import { NetIncomeChart } from "@/components/charts/net-income-chart";
import { EpsChart } from "@/components/charts/eps-chart";
import { CashDebtChart } from "@/components/charts/cash-debt-chart";
import { DividendsChart } from "@/components/charts/dividends-chart";
import { ReturnCapitalChart } from "@/components/charts/return-capital-chart";
import { SharesChart } from "@/components/charts/shares-chart";
import { RatiosChart } from "@/components/charts/ratios-chart";
import { ValuationChart } from "@/components/charts/valuation-chart";
import { ExpensesChart } from "@/components/charts/expenses-chart";

export default function AdvancedCharts() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const symbol = params.symbol;
  const [stockData, setStockData] = useState<AggregatedStockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'quarterly' | 'annual'>('quarterly');
  const [isDragMode, setIsDragMode] = useState(false);
  
  // Chart layout management
  const { 
    charts, 
    visibleCharts, 
    isCustomized, 
    reorderCharts, 
    toggleChartVisibility, 
    resetLayout 
  } = useChartLayout(symbol);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Chart component mapping
  const getChartComponent = (chartId: string) => {
    if (!stockData) return null;
    
    switch (chartId) {
      case 'price-chart':
        return <PriceChart data={stockData.charts.price} />;
      case 'revenue-chart':
        return <RevenueChart data={stockData.charts.revenue} />;
      case 'revenue-segment-chart':
        return <RevenueSegmentChart data={stockData.charts.revenueBySegment} />;
      case 'ebitda-chart':
        return <EbitdaChart data={stockData.charts.ebitda} />;
      case 'fcf-chart':
        return <FreeCashFlowChart data={stockData.charts.freeCashFlow} />;
      case 'net-income-chart':
        return <NetIncomeChart data={stockData.charts.netIncome} />;
      case 'eps-chart':
        return <EpsChart data={stockData.charts.eps} />;
      case 'cash-debt-chart':
        return <CashDebtChart data={stockData.charts.cashAndDebt} />;
      case 'dividends-chart':
        return <DividendsChart data={stockData.charts.dividends} />;
      case 'return-capital-chart':
        return <ReturnCapitalChart data={stockData.charts.returnOfCapital} />;
      case 'shares-chart':
        return <SharesChart data={stockData.charts.sharesOutstanding} />;
      case 'ratios-chart':
        return <RatiosChart data={stockData.charts.ratios} />;
      case 'valuation-chart':
        return <ValuationChart data={stockData.charts.valuation} />;
      case 'expenses-chart':
        return <ExpensesChart data={stockData.charts.expenses} />;
      default:
        return null;
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = charts.findIndex(chart => chart.id === active.id);
      const newIndex = charts.findIndex(chart => chart.id === over.id);
      
      const newCharts = arrayMove(charts, oldIndex, newIndex);
      reorderCharts(newCharts);
    }
  };

  useEffect(() => {
    if (symbol && typeof symbol === 'string') {
      fetchStockData(symbol);
    }
  }, [symbol, chartPeriod]);

  // Generate quarterly data (16 quarters rolling)
  const generateQuarterlyData = () => {
    const currentQuarter = Math.floor((new Date().getMonth()) / 3) + 1;
    const currentYear = new Date().getFullYear();
    const quarters = [];
    
    // Generate 16 quarters back from current
    for (let i = 15; i >= 0; i--) {
      let year = currentYear;
      let quarter = currentQuarter - i;
      
      while (quarter <= 0) {
        quarter += 4;
        year -= 1;
      }
      while (quarter > 4) {
        quarter -= 4;
        year += 1;
      }
      
      quarters.push(`Q${quarter} ${year}`);
    }
    
    return quarters.map(quarter => ({
      quarter,
      value: Math.floor(Math.random() * 30000) + 80000
    }));
  };

  // Generate annual data (last 10 years)
  const generateAnnualData = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = 9; i >= 0; i--) {
      years.push((currentYear - i).toString());
    }
    
    return years.map(year => ({
      quarter: year, // Keep same property name for consistency
      value: Math.floor(Math.random() * 120000) + 300000
    }));
  };

  const fetchStockData = async (stockSymbol: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Generate dynamic data based on current period
      const revenueData = chartPeriod === 'quarterly' ? generateQuarterlyData() : generateAnnualData();
      
      // Mock data for demo - replace with real API calls when keys are configured
      const mockData: AggregatedStockData = {
        symbol: stockSymbol.toUpperCase(),
        name: stockSymbol === 'AAPL' ? 'Apple Inc.' : `${stockSymbol.toUpperCase()} Inc.`,
        logo: stockSymbol === 'AAPL' ? 'https://logo.clearbit.com/apple.com' : '',
        currentPrice: {
          price: 203.92,
          change: 3.29,
          changePercent: 1.64,
          high: 207.12,
          low: 201.85,
          open: 202.45,
          previousClose: 200.63
        },
        profile: {
          sector: 'Technology',
          industry: 'Consumer Electronics',
          marketCap: 3200000000000,
          sharesOutstanding: 15700000000,
          country: 'US',
          currency: 'USD',
          website: 'https://www.apple.com'
        },
        charts: {
          price: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price: 180 + Math.random() * 40
          })),
          revenue: revenueData,
          revenueBySegment: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            segments: {
              'iPhone': 45000 + Math.random() * 20000,
              'iPad': 7000 + Math.random() * 3000,
              'Mac': 10000 + Math.random() * 5000,
              'Services': 20000 + Math.random() * 10000,
              'Wearables': 8000 + Math.random() * 4000
            }
          })),
          ebitda: revenueData.map(item => ({
            quarter: item.quarter,
            value: Math.floor(item.value * 0.35) + Math.random() * 5000
          })),
          freeCashFlow: revenueData.map(item => ({
            quarter: item.quarter,
            value: Math.floor(item.value * 0.28) + Math.random() * 8000
          })),
          netIncome: revenueData.map(item => ({
            quarter: item.quarter,
            value: Math.floor(item.value * 0.25) + Math.random() * 6000
          })),
          eps: revenueData.map(item => ({
            quarter: item.quarter,
            value: 1.2 + Math.random() * 0.8
          })),
          cashAndDebt: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            cash: 160000 + Math.random() * 20000,
            debt: 110000 + Math.random() * 15000
          })),
          dividends: Array.from({ length: 12 }, (_, i) => ({
            date: new Date(Date.now() - i * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: 0.22 + Math.random() * 0.08
          })),
          returnOfCapital: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            value: 15 + Math.random() * 10
          })),
          sharesOutstanding: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            value: 15700 + Math.random() * 200
          })),
          ratios: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            pe: 25 + Math.random() * 10,
            roe: 0.15 + Math.random() * 0.1,
            roa: 0.08 + Math.random() * 0.05,
            grossMargin: 0.35 + Math.random() * 0.1
          })),
          valuation: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            value: 28 + Math.random() * 12
          })),
          expenses: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            operating: 45000 + Math.random() * 10000,
            rd: 25000 + Math.random() * 5000,
            sga: 15000 + Math.random() * 3000,
            other: 5000 + Math.random() * 2000
          }))
        },
        keyMetrics: {
          pe: 28.5,
          eps: 1.89,
          dividendYield: 0.0047,
          marketCap: 3200000000000,
          freeCashFlow: 93000000000,
          netIncome: 97000000000,
          ebitda: 125000000000,
          totalCash: 165000000000,
          totalDebt: 110000000000,
          roe: 0.175,
          roa: 0.087,
          grossMargin: 0.381,
          operatingMargin: 0.297,
          netMargin: 0.253
        }
      };
      
      setStockData(mockData);
    } catch (err) {
      setError('Failed to load stock data. Please try again.');
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading stock data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !stockData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 mb-4">⚠️ Error</div>
            <h3 className="text-xl font-semibold mb-2">Failed to load stock data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => setLocation('/dashboard')} className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">Go Back</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { currentPrice, profile, keyMetrics } = stockData;
  const isPositive = currentPrice.change >= 0;

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{stockData.name} ({stockData.symbol})</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Advanced Charts</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <Button variant="outline" className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 transition-all duration-300">
            <ExternalLink className="h-4 w-4" />
            Company Website
          </Button>
        </div>

        {/* Company Header - Horizontal Layout */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            {/* Left - All Company & Price Info Together */}
            <div className="flex items-start gap-6">
              {stockData.logo && (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0 ring-1 ring-border/50">
                  <img
                    src={stockData.logo}
                    alt={`${stockData.name} logo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                {/* Top Row: AAPL + Price + Earnings Badge */}
                <div className="flex items-center gap-6">
                  <h1 className="text-3xl font-bold text-foreground tracking-tight">{stockData.symbol}</h1>
                  <div className="text-2xl font-bold text-foreground tracking-tight">
                    ${currentPrice.price.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-chartreuse/15 text-chartreuse-dark rounded-lg text-sm font-medium border border-chartreuse/20">
                    <Calendar className="h-4 w-4" />
                    <span>Earnings: Jul 30</span>
                  </div>
                </div>

                {/* Second Row: Company Name + Change */}
                <div className="flex items-center gap-6">
                  <p className="text-lg font-medium text-foreground/90">{stockData.name}</p>
                  <div className={cn(
                    "flex items-center gap-2 text-base font-semibold",
                    isPositive ? "text-emerald-500" : "text-red-500"
                  )}>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}${currentPrice.change.toFixed(2)} ({isPositive ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {/* Third Row: Sector + After Hours */}
                <div className="flex items-center gap-6">
                  <p className="text-sm text-muted-foreground">{profile.sector}</p>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-muted-foreground">After Hours</span>
                    <span className="text-foreground font-semibold">${(currentPrice.price + 0.57).toFixed(2)}</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +$0.57 (+0.28%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Action Buttons */}
            <div className="flex items-center gap-3">
              <Button size="default" className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black px-6 py-2 font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                Add to Watchlist
              </Button>
              <Button variant="outline" size="default" className="px-6 py-2 font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 transition-all duration-300">
                Set Alert
              </Button>
            </div>
          </div>

          {/* 5 Metrics Groups - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* VALUATION */}
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">VALUATION</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">P/E Ratio</span>
                    <MetricTooltip content="Price-to-Earnings ratio. Compares stock price to earnings per share. 15-25 = reasonable, >30 = expensive, <15 = cheap or troubled" />
                  </div>
                  <span className="font-medium">{keyMetrics.pe.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Market Cap</span>
                    <MetricTooltip content="Total value of all company shares. Large cap >$10B, Mid cap $2-10B, Small cap <$2B. Larger = more stable, smaller = more growth potential" />
                  </div>
                  <span className="font-medium">${(profile.marketCap / 1000000000).toFixed(1)}T</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Price/Sales</span>
                    <MetricTooltip content="Stock price divided by revenue per share. Compares valuation to sales. <1 = cheap, 1-3 = reasonable, >5 = expensive" />
                  </div>
                  <span className="font-medium">7.8</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Enterprise Value</span>
                    <MetricTooltip content="Market cap + debt - cash. True cost to buy entire company. More accurate than market cap for comparisons" />
                  </div>
                  <span className="font-medium">$2.98T</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">EV/Revenue</span>
                    <MetricTooltip content="Enterprise Value divided by revenue. Better than P/S for debt-heavy companies. <2 = cheap, 2-5 = fair, >8 = expensive" />
                  </div>
                  <span className="font-medium">7.6</span>
                </div>
              </div>
            </div>

            {/* PERFORMANCE */}
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">PERFORMANCE</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">ROE</span>
                    <MetricTooltip content="Return on Equity. How efficiently company uses shareholders' money to generate profit. >15% = excellent, 10-15% = good, <10% = poor" />
                  </div>
                  <span className="font-medium">{(keyMetrics.roe * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Net Margin</span>
                    <MetricTooltip content="Net income as percentage of revenue. Shows profitability after all expenses. >20% = excellent, 10-20% = good, <5% = poor" />
                  </div>
                  <span className="font-medium">{(keyMetrics.netMargin * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Operating Margin</span>
                    <MetricTooltip content="Operating income as percentage of revenue. Profit from core business before taxes and interest. >15% = excellent, 5-15% = good" />
                  </div>
                  <span className="font-medium">29.7%</span>
                </div>
              </div>
            </div>

            {/* FINANCIALS */}
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-chartreuse-dark" />
                <h3 className="text-sm font-semibold text-foreground">FINANCIALS</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Free Cash Flow</span>
                    <MetricTooltip content="Cash left after capital expenditures. Shows real cash generating ability. Positive = good, growing = excellent" />
                  </div>
                  <span className="font-medium">${(keyMetrics.freeCashFlow / 1000000000).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Total Cash</span>
                    <MetricTooltip content="Cash and cash equivalents on balance sheet. Higher = more financial flexibility and safety during tough times" />
                  </div>
                  <span className="font-medium">${(keyMetrics.totalCash / 1000000000).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Debt/Equity</span>
                    <MetricTooltip content="Total debt divided by shareholder equity. Measures financial leverage. <0.5 = conservative, 0.5-1 = moderate, >2 = risky" />
                  </div>
                  <span className="font-medium">1.75</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Total Debt</span>
                    <MetricTooltip content="All company debt obligations. Compare to cash and earnings to assess ability to service debt" />
                  </div>
                  <span className="font-medium">$86.5B</span>
                </div>
              </div>
            </div>

            {/* GROWTH */}
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold text-foreground">GROWTH</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Revenue Growth</span>
                    <MetricTooltip content="Year-over-year revenue growth rate. Shows business expansion. >20% = high growth, 10-20% = moderate, <5% = slow" />
                  </div>
                  <span className="font-medium">8.2%</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">EPS Growth</span>
                    <MetricTooltip content="Earnings per share growth rate. Shows profit growth per share. >15% = excellent, 5-15% = good, negative = declining" />
                  </div>
                  <span className="font-medium">11.1%</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Dividend Yield</span>
                    <MetricTooltip content="Annual dividends as percentage of stock price. Provides income to investors. 2-4% = reasonable, >6% = high (may be risky)" />
                  </div>
                  <span className="font-medium">{(keyMetrics.dividendYield * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* TIMING */}
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">TIMING</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Next Earnings</span>
                    <MetricTooltip content="Date of next quarterly earnings announcement. Key catalyst that often moves stock price significantly" />
                  </div>
                  <span className="font-medium">Jul 30</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Days to Earnings</span>
                    <MetricTooltip content="Days until next earnings announcement. Stock often becomes more volatile as this date approaches" />
                  </div>
                  <span className="font-medium">23 days</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="text-muted-foreground">Dividend Date</span>
                    <MetricTooltip content="Ex-dividend date. Must own stock before this date to receive dividend payment" />
                  </div>
                  <span className="font-medium">Jul 12</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Separator Line to Align with Sidebar */}
        <div className="border-t border-border/30 my-6" style={{marginTop: '1.5rem', marginBottom: '1.5rem'}}></div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between bg-card/30 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Charts</h3>
            {isCustomized && (
              <span className="text-xs text-muted-foreground bg-chartreuse/10 text-chartreuse-dark px-2 py-1 rounded-md">
                Custom Layout
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {visibleCharts.length} of {charts.length} visible
            </span>

            {/* Period Toggle - Closer to Charts */}
            <div className="flex items-center bg-secondary/20 rounded-lg p-1 ml-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChartPeriod('quarterly')}
                className={`px-4 py-2 text-sm transition-all duration-300 ${
                  chartPeriod === 'quarterly' 
                    ? 'bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse text-rich-black font-semibold shadow-sm shadow-chartreuse/30' 
                    : 'hover:bg-chartreuse/10 hover:text-chartreuse'
                }`}
              >
                Quarterly
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChartPeriod('annual')}
                className={`px-4 py-2 text-sm transition-all duration-300 ${
                  chartPeriod === 'annual' 
                    ? 'bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse text-rich-black font-semibold shadow-sm shadow-chartreuse/30' 
                    : 'hover:bg-chartreuse/10 hover:text-chartreuse'
                }`}
              >
                Annual
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDragMode(!isDragMode)}
              className={`flex items-center gap-2 transition-all duration-300 ${
                isDragMode 
                  ? 'bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse text-rich-black font-semibold shadow-sm shadow-chartreuse/30' 
                  : 'border border-chartreuse/30 hover:border-chartreuse hover:bg-chartreuse/10 hover:text-chartreuse'
              }`}
            >
              <Settings className="h-4 w-4" />
              {isDragMode ? "Done" : "Customize"}
            </Button>
            
            {isCustomized && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetLayout}
                className="flex items-center gap-2 border border-chartreuse/30 hover:border-chartreuse hover:bg-chartreuse/10 hover:text-chartreuse transition-all duration-300"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
            
            {isDragMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  charts.forEach(chart => {
                    if (!chart.visible) {
                      toggleChartVisibility(chart.id);
                    }
                  });
                }}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Show All
              </Button>
            )}
          </div>
        </div>

        {/* Draggable Charts Grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={charts.map(chart => chart.id)}
            strategy={rectSortingStrategy}
          >
            <div className={cn(
              "grid gap-6 transition-all duration-200",
              isDragMode 
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" 
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}>
              {(isDragMode ? charts : visibleCharts).map((chart) => (
                <DraggableChart
                  key={chart.id}
                  id={chart.id}
                  name={chart.name}
                  visible={chart.visible}
                  onToggleVisibility={toggleChartVisibility}
                  isDragMode={isDragMode}
                >
                  {getChartComponent(chart.id)}
                </DraggableChart>
              ))}
            </div>
          </SortableContext>
        </DndContext>

      </div>
    </MainLayout>
  );
}