import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { StockSearch } from "@/components/stock/stock-search";
import { EnhancedStockCard } from "@/components/stock/enhanced-stock-card";
import { BetaBanner } from "@/components/beta/beta-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Target, RefreshCw, Zap, AlertCircle, User, Settings, Crown, Calendar } from "lucide-react";
// Import simplified hooks temporarily
// import { useStocks, useMarketIndices, useApiQuota, useWarmCache } from "@/hooks/use-enhanced-stocks";
import { useAuth } from "@/contexts/simple-auth-offline";
import { cn } from "@/lib/utils";

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

export default function EnhancedDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [displayedSymbols, setDisplayedSymbols] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('alfalyzer-watchlist');
    return saved ? JSON.parse(saved) : POPULAR_SYMBOLS.slice(0, 9);
  });
  
  // Temporarily use mock data while fixing API issues
  const stocks = displayedSymbols.map((symbol, index) => {
    // Generate realistic base price for each symbol
    const basePrice = Math.random() * 300 + 50; // $50-$350
    const change = (Math.random() - 0.5) * 20; // -$10 to +$10
    const changePercent = (change / basePrice) * 100;
    
    return {
      // Required fields from Stock schema
      id: index + 1,
      symbol,
      name: getCompanyName(symbol),
      price: basePrice.toString(), // Schema expects string
      change: change.toString(), // Schema expects string
      changePercent: changePercent.toString(), // Schema expects string
      marketCap: (Math.random() * 1000000000000).toString(), // Schema expects string
      sector: getSector(symbol),
      industry: getIndustry(symbol),
      
      // Additional fields expected by components
      currentPrice: basePrice, // Number for component usage
      volume: Math.floor(Math.random() * 50000000 + 1000000), // 1M-50M volume
      eps: Number((Math.random() * 10 + 0.5).toFixed(2)), // $0.50-$10.50 EPS
      peRatio: Number((basePrice / (Math.random() * 10 + 0.5)).toFixed(2)), // Realistic P/E
      logo: null,
      lastUpdated: new Date()
    };
  });
  const stocksLoading = false;
  
  const marketIndices = {
    sp500: { 
      value: Number((4500 + Math.random() * 200).toFixed(2)), 
      change: Number(((Math.random() - 0.5) * 3).toFixed(2))
    },
    dow: { 
      value: Number((35000 + Math.random() * 1000).toFixed(2)), 
      change: Number(((Math.random() - 0.5) * 3).toFixed(2))
    },
    nasdaq: { 
      value: Number((15000 + Math.random() * 500).toFixed(2)), 
      change: Number(((Math.random() - 0.5) * 3).toFixed(2))
    }
  };
  const indicesLoading = false;
  
  const quotaStatus = null;
  const isWarmingCache = false;
  
  const warmCache = () => {
    console.log('Cache warming simulated');
  };


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

  const marketStats = [
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
  ];

  // Calculate API usage - temporarily disabled
  const apiUsage: any[] = [];

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

  return (
    <MainLayout>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <BetaBanner />
        
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Painel de Mercado</h1>
            <p className="text-muted-foreground mt-1">Dados de mercado e análise em tempo real</p>
          </div>
          
          <div className="flex gap-2">
            <StockSearch onStockSelect={handleAddStock} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => warmCache()}
              disabled={isWarmingCache}
            >
              <RefreshCw className={cn("h-4 w-4", isWarmingCache && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* User Profile Section */}
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
        </div>

        {/* Market Overview */}
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

        {/* API Usage Alert */}
        {apiUsage.length > 0 && (
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Estado de Uso das APIs</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {apiUsage.map((api) => (
                  <div key={api.provider} className="text-sm">
                    <span className="font-medium">{api.provider}:</span>{" "}
                    <span className={cn(
                      api.percentage > 80 ? "text-red-600 dark:text-red-400" :
                      api.percentage > 50 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-green-600 dark:text-green-400"
                    )}>
                      {api.percentage.toFixed(0)}% used
                    </span>
                    <span className="text-muted-foreground text-xs block">
                      {api.remaining}/{api.limit} remaining
                    </span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stock Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Lista de Seguimento</h2>
            <Badge variant="secondary">
              {stocksLoading ? "Carregando..." : `${stocks?.length || 0} Ações`}
            </Badge>
          </div>
          
          {stocksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : stocks && stocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stocks.map((stock) => (
                <EnhancedStockCard
                  key={stock.symbol}
                  symbol={stock.symbol}
                  showRemove={false}
                />
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma ação encontrada. Tente pesquisar um símbolo acima.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Live Data Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span>Dados de mercado em tempo real</span>
        </div>
      </div>

    </MainLayout>
  );
}