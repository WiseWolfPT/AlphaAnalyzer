import React, { lazy, Suspense } from 'react';
import { ChartContainer } from './chart-container';

// Dynamic imports for chart components - enables granular loading
const PriceChart = lazy(() => import('./price-chart').then(module => ({ default: module.PriceChart })));
const RevenueChart = lazy(() => import('./revenue-chart').then(module => ({ default: module.RevenueChart })));
const RevenueSegmentChart = lazy(() => import('./revenue-segment-chart').then(module => ({ default: module.RevenueSegmentChart })));
const EbitdaChart = lazy(() => import('./ebitda-chart').then(module => ({ default: module.EbitdaChart })));
const FreeCashFlowChart = lazy(() => import('./free-cash-flow-chart').then(module => ({ default: module.FreeCashFlowChart })));
const NetIncomeChart = lazy(() => import('./net-income-chart').then(module => ({ default: module.NetIncomeChart })));
const EpsChart = lazy(() => import('./eps-chart').then(module => ({ default: module.EpsChart })));
const CashDebtChart = lazy(() => import('./cash-debt-chart').then(module => ({ default: module.CashDebtChart })));
const DividendsChart = lazy(() => import('./dividends-chart').then(module => ({ default: module.DividendsChart })));
const ReturnCapitalChart = lazy(() => import('./return-capital-chart').then(module => ({ default: module.ReturnCapitalChart })));
const SharesChart = lazy(() => import('./shares-chart').then(module => ({ default: module.SharesChart })));
const RatiosChart = lazy(() => import('./ratios-chart').then(module => ({ default: module.RatiosChart })));
const ValuationChart = lazy(() => import('./valuation-chart').then(module => ({ default: module.ValuationChart })));
const ExpensesChart = lazy(() => import('./expenses-chart').then(module => ({ default: module.ExpensesChart })));

// Chart loading skeleton
const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
    <div className="h-2 bg-muted rounded w-1/4 mb-4"></div>
    <div className="h-48 bg-muted rounded"></div>
  </div>
);

// Chart error boundary
const ChartError = ({ error }: { error: Error }) => (
  <div className="flex items-center justify-center h-48 text-muted-foreground">
    <div className="text-center">
      <p className="text-sm">Failed to load chart</p>
      <p className="text-xs">{error.message}</p>
    </div>
  </div>
);

// Chart component mapping with dynamic loading
export const getDynamicChartComponent = (chartId: string, stockData: any) => {
  if (!stockData) return null;
  
  const chartProps = getChartProps(chartId, stockData);
  if (!chartProps) return null;
  
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ErrorBoundary>
        {renderChart(chartId, chartProps)}
      </ErrorBoundary>
    </Suspense>
  );
};

// Chart props mapping
const getChartProps = (chartId: string, stockData: any) => {
  switch (chartId) {
    case 'price-chart':
      return { data: stockData.charts.price };
    case 'revenue-chart':
      return { data: stockData.charts.revenue };
    case 'revenue-segment-chart':
      return { data: stockData.charts.revenueBySegment };
    case 'ebitda-chart':
      return { data: stockData.charts.ebitda };
    case 'fcf-chart':
      return { data: stockData.charts.freeCashFlow };
    case 'net-income-chart':
      return { data: stockData.charts.netIncome };
    case 'eps-chart':
      return { data: stockData.charts.eps };
    case 'cash-debt-chart':
      return { data: stockData.charts.cashAndDebt };
    case 'dividends-chart':
      return { data: stockData.charts.dividends };
    case 'return-capital-chart':
      return { data: stockData.charts.returnOfCapital };
    case 'shares-chart':
      return { data: stockData.charts.sharesOutstanding };
    case 'ratios-chart':
      return { data: stockData.charts.ratios };
    case 'valuation-chart':
      return { data: stockData.charts.valuation };
    case 'expenses-chart':
      return { data: stockData.charts.expenses };
    default:
      return null;
  }
};

// Chart rendering
const renderChart = (chartId: string, props: any) => {
  switch (chartId) {
    case 'price-chart':
      return <PriceChart {...props} />;
    case 'revenue-chart':
      return <RevenueChart {...props} />;
    case 'revenue-segment-chart':
      return <RevenueSegmentChart {...props} />;
    case 'ebitda-chart':
      return <EbitdaChart {...props} />;
    case 'fcf-chart':
      return <FreeCashFlowChart {...props} />;
    case 'net-income-chart':
      return <NetIncomeChart {...props} />;
    case 'eps-chart':
      return <EpsChart {...props} />;
    case 'cash-debt-chart':
      return <CashDebtChart {...props} />;
    case 'dividends-chart':
      return <DividendsChart {...props} />;
    case 'return-capital-chart':
      return <ReturnCapitalChart {...props} />;
    case 'shares-chart':
      return <SharesChart {...props} />;
    case 'ratios-chart':
      return <RatiosChart {...props} />;
    case 'valuation-chart':
      return <ValuationChart {...props} />;
    case 'expenses-chart':
      return <ExpensesChart {...props} />;
    default:
      return null;
  }
};

// Simple error boundary for chart components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ChartError error={this.state.error!} />;
    }

    return this.props.children;
  }
}

// Preload critical charts (for better performance)
export const preloadCriticalCharts = () => {
  // Preload the most commonly used charts
  Promise.all([
    import('./price-chart'),
    import('./revenue-chart'),
    import('./chart-container'),
  ]).catch(() => {
    // Ignore preload errors
  });
};

// Chart metadata for bundle analysis
export const CHART_METADATA = {
  'price-chart': { bundle: 'charts-components-basic', priority: 'high' },
  'revenue-chart': { bundle: 'charts-components-financial', priority: 'high' },
  'revenue-segment-chart': { bundle: 'charts-components-financial', priority: 'medium' },
  'ebitda-chart': { bundle: 'charts-components-financial', priority: 'medium' },
  'fcf-chart': { bundle: 'charts-components-cash', priority: 'high' },
  'net-income-chart': { bundle: 'charts-components-cash', priority: 'high' },
  'eps-chart': { bundle: 'charts-components-cash', priority: 'high' },
  'cash-debt-chart': { bundle: 'charts-components-debt', priority: 'medium' },
  'dividends-chart': { bundle: 'charts-components-debt', priority: 'medium' },
  'return-capital-chart': { bundle: 'charts-components-debt', priority: 'low' },
  'shares-chart': { bundle: 'charts-components-analysis', priority: 'low' },
  'ratios-chart': { bundle: 'charts-components-analysis', priority: 'medium' },
  'valuation-chart': { bundle: 'charts-components-analysis', priority: 'medium' },
  'expenses-chart': { bundle: 'charts-components-analysis', priority: 'low' },
};