import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function StockCharts() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const symbol = params.symbol;
  const [stockData, setStockData] = useState<AggregatedStockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (symbol && typeof symbol === 'string') {
      fetchStockData(symbol);
    }
  }, [symbol]);

  const fetchStockData = async (stockSymbol: string) => {
    try {
      setLoading(true);
      setError(null);
      
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
          revenue: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            value: 90000 + Math.random() * 30000
          })),
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
          ebitda: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            value: 32000 + Math.random() * 8000
          })),
          freeCashFlow: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            value: 25000 + Math.random() * 10000
          })),
          netIncome: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
            value: 22000 + Math.random() * 8000
          })),
          eps: Array.from({ length: 8 }, (_, i) => ({
            quarter: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
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
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button variant="outline" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Company Website
          </Button>
        </div>

        {/* Company Header */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {stockData.logo && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
                <h1 className="text-3xl font-bold text-foreground">{stockData.name}</h1>
                <p className="text-lg text-muted-foreground">{stockData.symbol} • {profile.sector}</p>
                <p className="text-sm text-muted-foreground">{profile.country} • {profile.currency}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">
                ${currentPrice.price.toFixed(2)}
              </div>
              <div className={cn(
                "flex items-center gap-1 text-lg font-medium",
                isPositive ? "text-emerald-500" : "text-red-500"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {isPositive ? '+' : ''}${currentPrice.change.toFixed(2)} ({isPositive ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%)
              </div>
              <div className="text-sm text-muted-foreground">
                Market Cap: ${(profile.marketCap / 1000000000).toFixed(1)}B
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-card/30 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">P/E Ratio</div>
            <div className="text-lg font-bold">{keyMetrics.pe.toFixed(1)}</div>
          </div>
          <div className="bg-card/30 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">EPS</div>
            <div className="text-lg font-bold">${keyMetrics.eps.toFixed(2)}</div>
          </div>
          <div className="bg-card/30 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ROE</div>
            <div className="text-lg font-bold">{(keyMetrics.roe * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-card/30 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dividend Yield</div>
            <div className="text-lg font-bold">{(keyMetrics.dividendYield * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-card/30 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Free Cash Flow</div>
            <div className="text-lg font-bold">${(keyMetrics.freeCashFlow / 1000000000).toFixed(1)}B</div>
          </div>
          <div className="bg-card/30 p-4 rounded-lg text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Net Margin</div>
            <div className="text-lg font-bold">{(keyMetrics.netMargin * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* 14 Charts Grid - 4x4 Layout like Qualtrim */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
          
          {/* Empty spaces for 4x4 grid */}
          <div className="hidden xl:block"></div>
          <div className="hidden xl:block"></div>
        </div>

        {/* Additional Info Section */}
        <div className="bg-card/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Industry:</span>
              <span className="ml-2 font-medium">{profile.industry || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Shares Outstanding:</span>
              <span className="ml-2 font-medium">{(profile.sharesOutstanding / 1000000).toFixed(0)}M</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Cash:</span>
              <span className="ml-2 font-medium">${(keyMetrics.totalCash / 1000000000).toFixed(1)}B</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Debt:</span>
              <span className="ml-2 font-medium">${(keyMetrics.totalDebt / 1000000000).toFixed(1)}B</span>
            </div>
            <div>
              <span className="text-muted-foreground">Operating Margin:</span>
              <span className="ml-2 font-medium">{(keyMetrics.operatingMargin * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Gross Margin:</span>
              <span className="ml-2 font-medium">{(keyMetrics.grossMargin * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button className="bg-primary hover:bg-primary/90">
            Add to Watchlist
          </Button>
          <Button variant="outline">
            Export Report
          </Button>
          <Button variant="outline">
            Set Price Alert
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}