import { lazy } from 'react';

// Lazy loading de componentes pesados para otimização de bundle

// Charts - recharts é o maior chunk (356KB)
export const LazyAdvancedCharts = lazy(() => import('@/components/charts/AdvancedCharts'));
export const LazyRealtimeChartSystem = lazy(() => import('@/components/charts/real-time-chart-system'));
export const LazyRatiosChart = lazy(() => import('@/components/charts/ratios-chart'));
export const LazyRevenueChart = lazy(() => import('@/components/charts/revenue-chart'));
export const LazyEbitdaChart = lazy(() => import('@/components/charts/ebitda-chart'));
export const LazyNetIncomeChart = lazy(() => import('@/components/charts/net-income-chart'));
export const LazyValuationChart = lazy(() => import('@/components/charts/valuation-chart'));
export const LazyReturnCapitalChart = lazy(() => import('@/components/charts/return-capital-chart'));

// Páginas pesadas
export const LazyIntrinsicValue = lazy(() => import('@/pages/intrinsic-value'));
export const LazyPortfolios = lazy(() => import('@/pages/portfolios'));
export const LazyAIChat = lazy(() => import('@/pages/ai-chat-demo'));
export const LazyTranscripts = lazy(() => import('@/pages/transcripts'));
export const LazyNews = lazy(() => import('@/pages/news'));

// Admin pages
export const LazyAdminDashboard = lazy(() => import('@/pages/admin/admin-dashboard'));
export const LazyAPIMonitoring = lazy(() => import('@/pages/admin/api-monitoring'));

// Landing page com Lottie
export const LazyLanding = lazy(() => import('@/pages/landing'));

// Fallback component para loading
export const ChartLoadingFallback = () => (
  <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
    </div>
  </div>
);

export const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-lg text-muted-foreground">Carregando página...</p>
    </div>
  </div>
);