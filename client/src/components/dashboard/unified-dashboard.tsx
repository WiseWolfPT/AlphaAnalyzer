import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MainLayout } from '@/components/layout/main-layout';
import { FinancialDashboardLayout } from '@/components/layout/financial-dashboard-layout';
import { StockSearch } from '@/components/stock/stock-search';
import { EnhancedStockCard } from '@/components/stock/enhanced-stock-card';
import { BetaBanner } from '@/components/beta/beta-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { StockCardSkeleton } from '@/components/ui/stock-card-skeleton';
import { DashboardErrorBoundary } from './dashboard-error-boundary';
import { LazyDashboardCards } from './lazy-dashboard-cards';
import { 
  TrendingUp, Activity, Target, RefreshCw, Zap, AlertCircle, 
  User, Settings, Crown, Calendar, Shield, MonitorSpeaker,
  BarChart3, LineChart, PieChart, Settings2
} from 'lucide-react';

// Enhanced hooks for real data
import { useStocks, useMarketIndices, useApiQuota, useWarmCache } from '@/hooks/use-enhanced-stocks';
import { useAuth } from '@/contexts/simple-auth-offline';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { cn } from '@/lib/utils';

// Dashboard configuration interfaces
export interface UnifiedDashboardConfig {
  type: 'user' | 'admin' | 'valuation' | 'debug' | 'simple' | 'test';
  layout: 'standard' | 'financial' | 'minimal';
  features: DashboardFeatures;
  dataSource: 'real' | 'mock' | 'mixed' | 'auto';
  permissions?: string[];
  customization?: DashboardCustomization;
}

export interface DashboardFeatures {
  marketOverview?: boolean;
  stockGrid?: boolean;
  userProfile?: boolean;
  adminPanel?: boolean;
  valuationTools?: boolean;
  cacheMonitoring?: boolean;
  realTimeData?: boolean;
  errorBoundary?: boolean;
  lazyLoading?: boolean;
  betaBanner?: boolean;
  stockSearch?: boolean;
  portfolioSummary?: boolean;
  apiQuotaMonitoring?: boolean;
  systemStatus?: boolean;
}

export interface DashboardCustomization {
  branding?: string;
  theme?: 'light' | 'dark' | 'auto';
  language?: 'en' | 'pt';
  title?: string;
  subtitle?: string;
  stockSymbols?: string[];
}

// Default dashboard configurations
export const DASHBOARD_CONFIGS: Record<string, UnifiedDashboardConfig> = {
  user: {
    type: 'user',
    layout: 'financial',
    features: {
      marketOverview: true,
      stockGrid: true,
      userProfile: true,
      realTimeData: true,
      errorBoundary: true,
      lazyLoading: true,
      betaBanner: true,
      stockSearch: true,
      portfolioSummary: true
    },
    dataSource: 'auto',
    customization: {
      language: 'pt',
      title: 'Painel de Mercado',
      subtitle: 'Dados de mercado e análise em tempo real'
    }
  },
  admin: {
    type: 'admin',
    layout: 'standard',
    features: {
      adminPanel: true,
      cacheMonitoring: true,
      errorBoundary: true,
      systemStatus: true,
      apiQuotaMonitoring: true,
      realTimeData: true
    },
    permissions: ['admin'],
    dataSource: 'real',
    customization: {
      language: 'pt',
      title: 'Painel Administrativo',
      subtitle: 'Monitoramento e gestão do sistema'
    }
  },
  valuation: {
    type: 'valuation',
    layout: 'standard',
    features: {
      valuationTools: true,
      stockSearch: true,
      errorBoundary: true,
      realTimeData: true
    },
    dataSource: 'real',
    customization: {
      language: 'pt',
      title: 'Avaliação de Ações',
      subtitle: 'Ferramentas avançadas de valuation'
    }
  },
  debug: {
    type: 'debug',
    layout: 'standard',
    features: {
      cacheMonitoring: true,
      apiQuotaMonitoring: true,
      systemStatus: true,
      errorBoundary: true
    },
    permissions: ['admin', 'developer'],
    dataSource: 'real',
    customization: {
      language: 'en',
      title: 'Debug Dashboard',
      subtitle: 'System monitoring and performance analytics'
    }
  },
  simple: {
    type: 'simple',
    layout: 'minimal',
    features: {
      stockGrid: true,
      marketOverview: true,
      errorBoundary: true
    },
    dataSource: 'mixed',
    customization: {
      language: 'pt',
      title: 'Dashboard Simples',
      subtitle: 'Visão básica do mercado'
    }
  },
  test: {
    type: 'test',
    layout: 'minimal',
    features: {
      errorBoundary: true
    },
    dataSource: 'mock',
    customization: {
      title: 'Test Dashboard',
      subtitle: 'Dashboard para testes'
    }
  }
};

// Popular stocks to display
const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'META', 'NVDA', 'JPM', 'V', 'JNJ',
  'WMT', 'PG', 'UNH', 'DIS', 'MA'
];

// Mock data helpers
function getCompanyName(symbol: string): string {
  const companyNames: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corporation',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'JNJ': 'Johnson & Johnson',
    'WMT': 'Walmart Inc.',
    'PG': 'Procter & Gamble Co.',
    'UNH': 'UnitedHealth Group Inc.',
    'DIS': 'The Walt Disney Company',
    'MA': 'Mastercard Incorporated'
  };
  return companyNames[symbol] || `${symbol} Corporation`;
}

function getSector(symbol: string): string {
  const sectors: Record<string, string> = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'META': 'Technology',
    'NVDA': 'Technology',
    'JPM': 'Financial Services',
    'V': 'Financial Services',
    'JNJ': 'Healthcare',
    'WMT': 'Consumer Staples',
    'PG': 'Consumer Staples',
    'UNH': 'Healthcare',
    'DIS': 'Communication Services',
    'MA': 'Financial Services'
  };
  return sectors[symbol] || 'Technology';
}

function getIndustry(symbol: string): string {
  const industries: Record<string, string> = {
    'AAPL': 'Consumer Electronics',
    'MSFT': 'Software',
    'GOOGL': 'Internet Content & Information',
    'AMZN': 'Internet Retail',
    'TSLA': 'Auto Manufacturers',
    'META': 'Internet Content & Information',
    'NVDA': 'Semiconductors',
    'JPM': 'Banks',
    'V': 'Credit Services',
    'JNJ': 'Drug Manufacturers',
    'WMT': 'Discount Stores',
    'PG': 'Household & Personal Products',
    'UNH': 'Healthcare Plans',
    'DIS': 'Entertainment',
    'MA': 'Credit Services'
  };
  return industries[symbol] || 'Software';
}

export interface UnifiedDashboardProps {
  config?: Partial<UnifiedDashboardConfig>;
  variant?: keyof typeof DASHBOARD_CONFIGS;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  config: userConfig,
  variant = 'user'
}) => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Merge default config with user overrides
  const config = {
    ...DASHBOARD_CONFIGS[variant],
    ...userConfig,
    features: {
      ...DASHBOARD_CONFIGS[variant].features,
      ...userConfig?.features
    },
    customization: {
      ...DASHBOARD_CONFIGS[variant].customization,
      ...userConfig?.customization
    }
  };

  // State management
  const [displayedSymbols, setDisplayedSymbols] = useState(() => {
    if (config.customization?.stockSymbols) {
      return config.customization.stockSymbols;
    }
    // Load from localStorage or use default
    const saved = localStorage.getItem('alfalyzer-watchlist');
    return saved ? JSON.parse(saved) : POPULAR_SYMBOLS.slice(0, 9);
  });
  
  // Data fetching hooks (conditionally called)
  const stocksQuery = useStocks(
    config.features.stockGrid ? displayedSymbols : [],
    { enabled: config.features.stockGrid }
  );
  
  const indicesQuery = useMarketIndices(
    { enabled: config.features.marketOverview }
  );
  
  const quotaQuery = useApiQuota(
    { enabled: config.features.apiQuotaMonitoring }
  );
  
  const warmCacheMutation = useWarmCache();

  // Initialize pull-to-refresh for mobile PWA experience
  const { isPWA, isInitialized: pullToRefreshReady } = usePullToRefresh({
    enabled: config.features.realTimeData && config.type === 'user',
    hapticFeedback: true,
    threshold: 80
  });

  // Extract data from queries
  const { data: stocks, isLoading: stocksLoading, error: stocksError } = stocksQuery || { data: null, isLoading: false, error: null };
  const { data: marketIndices, isLoading: indicesLoading, error: indicesError } = indicesQuery || { data: null, isLoading: false, error: null };
  const { data: quotaStatus } = quotaQuery || { data: null };

  // Mock data fallbacks
  const mockStocks = (config.dataSource === 'mock' || (stocksError && config.dataSource === 'auto')) 
    ? displayedSymbols.map((symbol, index) => {
        const basePrice = Math.random() * 300 + 50;
        const change = (Math.random() - 0.5) * 20;
        const changePercent = (change / basePrice) * 100;
        
        return {
          id: index + 1,
          symbol,
          name: getCompanyName(symbol),
          price: basePrice.toString(),
          change: change.toString(),
          changePercent: changePercent.toString(),
          marketCap: (Math.random() * 1000000000000).toString(),
          sector: getSector(symbol),
          industry: getIndustry(symbol),
          currentPrice: basePrice,
          volume: Math.floor(Math.random() * 50000000 + 1000000),
          eps: Number((Math.random() * 10 + 0.5).toFixed(2)),
          peRatio: Number((basePrice / (Math.random() * 10 + 0.5)).toFixed(2)),
          logo: null,
          lastUpdated: new Date()
        };
      }) 
    : null;
  
  const displayStocks = stocks || mockStocks || [];

  // Market stats calculation
  const marketStats = config.features.marketOverview ? [
    {
      label: "S&P 500",
      value: marketIndices?.sp500?.value.toFixed(2) || "0.00",
      change: marketIndices?.sp500?.change || 0,
      icon: TrendingUp,
    },
    {
      label: "Dow Jones",
      value: marketIndices?.dow?.value.toFixed(2) || "0.00",
      change: marketIndices?.dow?.change || 0,
      icon: Activity,
    },
    {
      label: "Nasdaq",
      value: marketIndices?.nasdaq?.value.toFixed(2) || "0.00",
      change: marketIndices?.nasdaq?.change || 0,
      icon: Target,
    },
  ] : [];

  // User profile data
  const profileData = {
    name: user?.name || "António Francisco",
    email: user?.email || "alcateiafinanceirapt@gmail.com",
    joinDate: "Janeiro 2024",
    subscription: "Pro Trial",
    watchlistsCount: 3,
    portfolioValue: "€12,450.30",
    todayGain: "+€292.45 (+2.4%)",
    stats: [
      { label: "Watchlists", value: "3", icon: "📋" },
      { label: "Holdings", value: "24", icon: "📈" },
      { label: "Alerts", value: "12", icon: "🔔" },
      { label: "Days Active", value: "156", icon: "⏰" }
    ]
  };

  // Event handlers
  const handleAddStock = (symbol: string) => {
    if (!displayedSymbols.includes(symbol.toUpperCase())) {
      const newSymbols = [...displayedSymbols, symbol.toUpperCase()];
      setDisplayedSymbols(newSymbols);
      // Persist to localStorage
      localStorage.setItem('alfalyzer-watchlist', JSON.stringify(newSymbols));
    }
  };

  const handleRemoveStock = (symbol: string) => {
    const newSymbols = displayedSymbols.filter(s => s !== symbol);
    setDisplayedSymbols(newSymbols);
    // Persist to localStorage
    localStorage.setItem('alfalyzer-watchlist', JSON.stringify(newSymbols));
  };

  // Layout wrapper selection
  const LayoutWrapper = config.layout === 'financial' ? FinancialDashboardLayout : 
                        config.layout === 'minimal' ? ({ children }: { children: React.ReactNode }) => <div className="min-h-screen p-4">{children}</div> :
                        MainLayout;

  // Render dashboard content
  const renderDashboardContent = () => {
    // Test dashboard
    if (config.type === 'test') {
      return (
        <div className="container mx-auto p-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Dashboard de teste funcionando corretamente.</p>
              <p>Tipo: {config.type}</p>
              <p>Layout: {config.layout}</p>
              <p>Data Source: {config.dataSource}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Admin dashboard
    if (config.type === 'admin') {
      return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{config.customization?.title}</h1>
              <p className="text-muted-foreground mt-1">{config.customization?.subtitle}</p>
            </div>
            <Badge variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </Badge>
          </div>

          {config.features.systemStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-sm">Online</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">API Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-sm">Active</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Requests/Hour</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">5,678</div>
                </CardContent>
              </Card>
            </div>
          )}

          {config.features.apiQuotaMonitoring && quotaStatus && (
            <Card>
              <CardHeader>
                <CardTitle>API Quota Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p>API monitoring would be displayed here</p>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // Debug dashboard
    if (config.type === 'debug') {
      return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{config.customization?.title}</h1>
            <p className="text-muted-foreground mt-1">{config.customization?.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MonitorSpeaker className="h-5 w-5" />
                  <span>Cache Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Cache metrics would be displayed here</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>API Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>API performance metrics would be displayed here</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Valuation dashboard
    if (config.type === 'valuation') {
      return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{config.customization?.title}</h1>
              <p className="text-muted-foreground mt-1">{config.customization?.subtitle}</p>
            </div>
            {config.features.stockSearch && (
              <StockSearch onStockSelect={handleAddStock} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>DCF Model</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Discounted Cash Flow analysis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5" />
                  <span>Comparable Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>P/E, EV/EBITDA comparisons</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings2 className="h-5 w-5" />
                  <span>Sensitivity Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Scenario and sensitivity testing</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Standard user dashboard
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {config.features.betaBanner && <BetaBanner />}
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{config.customization?.title}</h1>
            <p className="text-muted-foreground mt-1">{config.customization?.subtitle}</p>
          </div>
          
          {(config.features.stockSearch || config.features.realTimeData) && (
            <div className="flex gap-2">
              {config.features.stockSearch && (
                <StockSearch onStockSelect={handleAddStock} />
              )}
              {config.features.realTimeData && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => warmCacheMutation.mutate()}
                  disabled={warmCacheMutation.isPending}
                >
                  <RefreshCw className={cn("h-4 w-4", warmCacheMutation.isPending && "animate-spin")} />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* User Profile Section */}
        {config.features.userProfile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Bem-vindo, {profileData.name.split(' ')[0]}!</CardTitle>
                      <p className="text-sm text-muted-foreground">{profileData.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          {profileData.subscription}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Membro desde {profileData.joinDate}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation("/profile")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {profileData.stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl">{stat.icon}</div>
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Summary */}
            {config.features.portfolioSummary && (
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                    <TrendingUp className="h-5 w-5" />
                    <span>Portfolio Hoje</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {profileData.portfolioValue}
                    </div>
                    <div className="text-lg font-medium text-green-700 dark:text-green-300">
                      {profileData.todayGain}
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => setLocation("/portfolios")}
                    >
                      Ver Portfolio Completo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Market Overview */}
        {config.features.marketOverview && marketStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketStats.map((stat) => {
              const Icon = stat.icon;
              const isPositive = stat.change >= 0;
              
              return (
                <div
                  key={stat.label}
                  className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {indicesLoading ? "..." : stat.value}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isPositive
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {isPositive ? "+" : ""}{stat.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* API Usage Alert */}
        {config.features.apiQuotaMonitoring && quotaStatus && (
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Estado de Uso das APIs</p>
              <p>API quota monitoring active</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Stock Grid */}
        {config.features.stockGrid && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Lista de Seguimento</h2>
              <Badge variant="secondary">
                {stocksLoading ? "Carregando..." : `${displayStocks?.length || 0} Ações`}
              </Badge>
            </div>
            
            {stocksLoading && config.features.lazyLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <StockCardSkeleton key={i} />
                ))}
              </div>
            ) : displayStocks && displayStocks.length > 0 ? (
              <ErrorBoundary fallback={
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erro ao carregar as ações. Por favor, recarregue a página.
                  </AlertDescription>
                </Alert>
              }>
                {config.features.lazyLoading ? (
                  <LazyDashboardCards />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stock-grid">
                    {displayStocks.map((stock) => (
                      <EnhancedStockCard
                        key={stock.symbol}
                        symbol={stock.symbol}
                        showRemove={false}
                        onQuickInfoClick={() => setLocation(`/stock/${stock.symbol}/charts`)}
                      />
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            ) : stocksError ? (
              <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Falha ao carregar dados em tempo real. Usando dados de demonstração.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.reload()}
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma ação encontrada. Tente pesquisar um símbolo acima.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Live Data Indicator */}
        {config.features.realTimeData && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span>Dados de mercado em tempo real</span>
          </div>
        )}
      </div>
    );
  };

  // Main render with error boundary wrapper
  if (config.features.errorBoundary) {
    return (
      <DashboardErrorBoundary>
        <LayoutWrapper>
          {renderDashboardContent()}
        </LayoutWrapper>
      </DashboardErrorBoundary>
    );
  }

  return (
    <LayoutWrapper>
      {renderDashboardContent()}
    </LayoutWrapper>
  );
};

// Export convenience components for specific dashboard types
export const UserDashboard = (props: Omit<UnifiedDashboardProps, 'variant'>) => (
  <UnifiedDashboard {...props} variant="user" />
);

export const AdminDashboard = (props: Omit<UnifiedDashboardProps, 'variant'>) => (
  <UnifiedDashboard {...props} variant="admin" />
);

export const ValuationDashboard = (props: Omit<UnifiedDashboardProps, 'variant'>) => (
  <UnifiedDashboard {...props} variant="valuation" />
);

export const DebugDashboard = (props: Omit<UnifiedDashboardProps, 'variant'>) => (
  <UnifiedDashboard {...props} variant="debug" />
);

export const SimpleDashboard = (props: Omit<UnifiedDashboardProps, 'variant'>) => (
  <UnifiedDashboard {...props} variant="simple" />
);

export const TestDashboard = (props: Omit<UnifiedDashboardProps, 'variant'>) => (
  <UnifiedDashboard {...props} variant="test" />
);

export default UnifiedDashboard;