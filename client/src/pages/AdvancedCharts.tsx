import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink, Home, Calendar, DollarSign, Activity, Target, Clock, Info } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import { dataAggregatorService, type AggregatedStockData } from "@/services/data-aggregator";

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
            <Button onClick={() => setLocation('/dashboard')}>Go Back</Button>
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
          
          <Button variant="outline" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Company Website
          </Button>
        </div>

        {/* Company Header - Horizontal Layout */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            {/* Company Info */}
            <div className="flex items-center gap-4">
              {stockData.logo && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">{stockData.symbol}</h1>
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 rounded-md text-xs font-medium">
                    <Calendar className="h-3 w-3" />
                    <span>Earnings: Jul 30</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{stockData.name}</p>
                <p className="text-xs text-muted-foreground">{profile.sector}</p>
              </div>
            </div>

            {/* Current Price */}
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">
                ${currentPrice.price.toFixed(2)}
              </div>
              <div className={cn(
                "flex items-center justify-end gap-1 text-sm font-medium",
                isPositive ? "text-emerald-500" : "text-red-500"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {isPositive ? '+' : ''}${currentPrice.change.toFixed(2)} ({isPositive ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%)
              </div>
              
              {/* After Hours Price */}
              <div className="mt-2 pt-2 border-t border-border/30">
                <div className="text-xs text-muted-foreground">After Hours</div>
                <div className="flex items-center justify-end gap-1 text-sm">
                  <span className="font-medium">${(currentPrice.price + 0.57).toFixed(2)}</span>
                  <span className="text-emerald-500">+$0.57 (+0.28%)</span>
                </div>
              </div>
            </div>

            {/* Period Toggle */}
            <div className="flex items-center bg-secondary/20 rounded-lg p-1">
              <Button
                variant={chartPeriod === 'quarterly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartPeriod('quarterly')}
                className="px-4 py-2 text-sm"
              >
                Quarterly
              </Button>
              <Button
                variant={chartPeriod === 'annual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartPeriod('annual')}
                className="px-4 py-2 text-sm"
              >
                Annual
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
                  <span className="text-muted-foreground">Market Cap</span>
                  <span className="font-medium">${(profile.marketCap / 1000000000).toFixed(1)}T</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price/Sales</span>
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
                  <span className="text-muted-foreground">EV/Revenue</span>
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
                  <span className="text-muted-foreground">Net Margin</span>
                  <span className="font-medium">{(keyMetrics.netMargin * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operating Margin</span>
                  <span className="font-medium">29.7%</span>
                </div>
              </div>
            </div>

            {/* FINANCIALS */}
            <div className="bg-secondary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">FINANCIALS</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free Cash Flow</span>
                  <span className="font-medium">${(keyMetrics.freeCashFlow / 1000000000).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cash</span>
                  <span className="font-medium">${(keyMetrics.totalCash / 1000000000).toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debt/Equity</span>
                  <span className="font-medium">1.75</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Debt</span>
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
                  <span className="text-muted-foreground">Revenue Growth</span>
                  <span className="font-medium">8.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPS Growth</span>
                  <span className="font-medium">11.1%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dividend Yield</span>
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
                  <span className="text-muted-foreground">Next Earnings</span>
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
                  <span className="text-muted-foreground">Dividend Date</span>
                  <span className="font-medium">Jul 12</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-border/50">
            <Button size="sm">
              Add to Watchlist
            </Button>
            <Button variant="outline" size="sm">
              Export Report
            </Button>
            <Button variant="outline" size="sm">
              Set Alert
            </Button>
          </div>
        </div>

        {/* Charts Grid - Full Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Row 1 */}
          <div id="price-chart"><PriceChart data={stockData.charts.price} /></div>
          <div id="revenue-chart"><RevenueChart data={stockData.charts.revenue} /></div>
          <div id="revenue-segment-chart"><RevenueSegmentChart data={stockData.charts.revenueBySegment} /></div>
          <div id="ebitda-chart"><EbitdaChart data={stockData.charts.ebitda} /></div>
          
          {/* Row 2 */}
          <div id="fcf-chart"><FreeCashFlowChart data={stockData.charts.freeCashFlow} /></div>
          <div id="net-income-chart"><NetIncomeChart data={stockData.charts.netIncome} /></div>
          <div id="eps-chart"><EpsChart data={stockData.charts.eps} /></div>
          <div id="cash-debt-chart"><CashDebtChart data={stockData.charts.cashAndDebt} /></div>
          
          {/* Row 3 */}
          <div id="dividends-chart"><DividendsChart data={stockData.charts.dividends} /></div>
          <div id="return-capital-chart"><ReturnCapitalChart data={stockData.charts.returnOfCapital} /></div>
          <div id="shares-chart"><SharesChart data={stockData.charts.sharesOutstanding} /></div>
          <div id="ratios-chart"><RatiosChart data={stockData.charts.ratios} /></div>
          
          {/* Row 4 */}
          <div id="valuation-chart"><ValuationChart data={stockData.charts.valuation} /></div>
          <div id="expenses-chart"><ExpensesChart data={stockData.charts.expenses} /></div>
        </div>

      </div>
    </MainLayout>
  );
}