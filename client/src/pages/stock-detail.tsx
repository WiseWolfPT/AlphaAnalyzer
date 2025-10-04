import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { AdvancedTradingChart } from "@/components/charts/advanced-trading-chart";
import { StockHeaderV2 } from "@/components/stock/stock-header-v2";
import { RealtimeStockHeaderV2 } from "@/components/stock/realtime-stock-header-v2";
import { StockNewsFeed } from "@/components/stock/stock-news-feed";
import { StockFinancialsChart } from "@/components/stock/stock-financials-chart";
import { Button } from "@/components/ui/button";
import { fetchIntrinsicValueData, normalizeIntrinsicValue } from '@/lib/intrinsic-value';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Share2, 
  Calculator, 
  FileText,
  ArrowLeft,
  Star,
  Plus,
  ChartLine,
  BarChart3,
  Activity,
  Wifi,
  Target,
  Newspaper
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeQuote } from "@/hooks/use-realtime-quotes";
import { useCompanyData } from "@/hooks/use-company-profile";
import { useCachedQuote } from "@/hooks/use-cache-data";
import { useExtendedHours } from "@/hooks/use-extended-hours";
import { useStockDetails } from "@/hooks/use-stock-details";
import { ClientOnly } from "@/components/shared/client-only";

// Mock company data
const getCompanyData = (symbol: string) => {
  const companies: Record<string, any> = {
    'AAPL': {
      name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
      marketCap: '$2.7T',
      pe: '28.6',
      dividend: '0.96%',
      beta: '1.25',
      price: 203.92,
      change: 3.29,
      changePercent: 1.64,
      afterHoursPrice: 204.49,
      afterHoursChange: 0.57,
      afterHoursChangePercent: 0.28,
      volume: '52.3M',
      avgVolume: '48.1M',
      dayRange: '173.12 - 176.89',
      yearRange: '124.17 - 199.62',
      earningsDate: 'Jul 30',
      logo: 'https://logo.clearbit.com/apple.com'
    },
    'MSFT': {
      name: 'Microsoft Corporation',
      sector: 'Technology',
      industry: 'Software',
      description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
      marketCap: '$2.8T',
      pe: '35.2',
      dividend: '0.68%',
      beta: '0.89',
      price: 378.85,
      change: -1.23,
      changePercent: -0.32,
      afterHoursPrice: 379.15,
      afterHoursChange: 0.30,
      afterHoursChangePercent: 0.08,
      volume: '29.7M',
      avgVolume: '31.2M',
      dayRange: '377.45 - 380.21',
      yearRange: '309.45 - 427.33',
      earningsDate: 'Oct 24',
      logo: 'https://logo.clearbit.com/microsoft.com'
    }
  };

  return companies[symbol] || {
    name: `${symbol} Corporation`,
    sector: 'Technology',
    industry: 'Software',
    description: `${symbol} is a technology company operating in various segments.`,
    marketCap: '$150B',
    pe: '22.5',
    dividend: '1.2%',
    beta: '1.1',
    price: 150.00,
    change: 2.50,
    changePercent: 1.69,
    afterHoursPrice: 150.75,
    afterHoursChange: 0.75,
    afterHoursChangePercent: 0.50,
    volume: '25.0M',
    avgVolume: '28.5M',
    dayRange: '148.50 - 152.75',
    yearRange: '95.50 - 180.25',
    earningsDate: 'TBD',
    logo: `https://logo.clearbit.com/${symbol.toLowerCase()}.com`
  };
};

export default function StockDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const symbol = params.symbol?.toUpperCase() || 'AAPL';
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [useRealtime, setUseRealtime] = useState(true);
  
  // Get realtime quote if enabled
  const { quote: realtimeQuote, isConnected } = useRealtimeQuote(symbol, {
    enabled: useRealtime
  });
  
  // Get real company data from API
  const { profile, metrics, isLoading: isLoadingCompany } = useCompanyData(symbol);
  
  // Get cached quote data
  const { data: cachedQuote, isLoading: isLoadingQuote } = useCachedQuote(symbol);
  // Extended hours
  const { data: extendedHours } = useExtendedHours(symbol);
  
  // Debug: Log the cached quote data
  useEffect(() => {
    if (cachedQuote) {
      console.log('📊 Cached Quote Data:', cachedQuote);
      console.log('📊 Actual Price:', cachedQuote?.data?.price);
    }
  }, [cachedQuote]);
  
  // Get detailed stock data from new endpoints
  const { 
    profile: detailedProfile, 
    metrics: detailedMetrics, 
    incomeStatements, 
    news, 
    historicalPrices,
    isLoading: isLoadingDetails 
  } = useStockDetails(symbol);
  
  // Use real data if available, fallback to mock
  const mockData = getCompanyData(symbol);
  const company = (detailedProfile || profile) ? {
    ...mockData,
    name: detailedProfile?.name || profile?.name || mockData.name,
    sector: detailedProfile?.sector || profile?.sector || mockData.sector,
    industry: detailedProfile?.industry || profile?.industry || mockData.industry,
    description: detailedProfile?.description || profile?.description || mockData.description,
    marketCap: detailedProfile?.marketCap ? `$${(detailedProfile.marketCap / 1e9).toFixed(1)}B` : 
               profile?.marketCap ? `$${(profile.marketCap / 1e9).toFixed(1)}B` : mockData.marketCap,
    logo: detailedProfile?.logo || profile?.logo || mockData.logo,
    website: detailedProfile?.website || profile?.website,
    ceo: detailedProfile?.ceo || profile?.ceo,
    employees: detailedProfile?.employees || profile?.employees,
    country: detailedProfile?.country || profile?.country,
    exchange: detailedProfile?.exchange,
    ipo: detailedProfile?.ipo,
    // Use metrics if available
    pe: detailedMetrics?.peRatio?.toFixed(2) || metrics?.peRatio?.toFixed(2) || mockData.pe,
    dividend: detailedMetrics?.dividendYield ? `${(detailedMetrics.dividendYield * 100).toFixed(2)}%` : 
              metrics?.dividendYield ? `${(metrics.dividendYield * 100).toFixed(2)}%` : mockData.dividend,
    beta: detailedMetrics?.beta?.toFixed(2) || metrics?.beta?.toFixed(2) || mockData.beta,
    eps: detailedMetrics?.eps?.toFixed(2) || metrics?.eps?.toFixed(2),
    roe: detailedMetrics?.roe ? `${(detailedMetrics.roe * 100).toFixed(2)}%` : 
         metrics?.roe ? `${(metrics.roe * 100).toFixed(2)}%` : undefined,
    // Use cached quote for price data - NO MOCK FALLBACK
    price: cachedQuote?.data?.price || 0,
    change: cachedQuote?.data?.change || 0,
    changePercent: cachedQuote?.data?.changePercent || 0,
    volume: cachedQuote?.data?.volume ? `${(cachedQuote.data.volume / 1e6).toFixed(1)}M` : '0M',
    dayRange: cachedQuote?.data ? `${cachedQuote.data.low?.toFixed(2)} - ${cachedQuote.data.high?.toFixed(2)}` : '0.00 - 0.00',
    yearRange: detailedMetrics ? `${detailedMetrics['52WeekLow']?.toFixed(2)} - ${detailedMetrics['52WeekHigh']?.toFixed(2)}` : 
               metrics ? `${metrics['52WeekLow']?.toFixed(2)} - ${metrics['52WeekHigh']?.toFixed(2)}` : mockData.yearRange,
  } : mockData;
  
  const isPositive = company.change >= 0;

  // Fetch official Intrinsic Value (cache-first, read-only)
  const { data: officialIVData } = useQuery({
    queryKey: ["officialIV", symbol],
    queryFn: () => fetchIntrinsicValueData(symbol),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const officialIntrinsicValue = normalizeIntrinsicValue(officialIVData);
  const latestPrice = Number(realtimeQuote?.price ?? company.price ?? 0);
  const valuationDiff = officialIntrinsicValue && latestPrice
    ? ((latestPrice - officialIntrinsicValue) / officialIntrinsicValue) * 100
    : null;
  const isUndervalued = valuationDiff !== null ? valuationDiff < 0 : null;

  // Simple sensitivity band (client-side only, based on official IV if available)
  const baseIV = officialIntrinsicValue ?? null;
  const conservativeIV = baseIV ? baseIV * 0.9 : null; // -10%
  const optimisticIV = baseIV ? baseIV * 1.1 : null;   // +10%

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

  const handleAddToWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    // Here you would implement the actual watchlist logic
  };

  const handleViewCharts = () => {
    setLocation(`/stock/${symbol}`);
  };

  const handleCalculateValue = () => {
    setLocation(`/intrinsic-value?symbol=${symbol}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/stocks')}
            className="gap-2 text-foreground hover:bg-secondary/60 border border-border/50"
            aria-label="Voltar à pesquisa de ações"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à pesquisa
          </Button>
          
          <Button
            variant={useRealtime ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUseRealtime(!useRealtime)}
            className={useRealtime ? 'bg-teya-green hover:bg-teya-green-dark text-black' : ''}
            title="Alternar atualizações em tempo real"
          >
            <Wifi className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline">Tempo Real</span>
          </Button>
        </div>

        {/* Stock Header - New Layout */}
        {useRealtime ? (
          <RealtimeStockHeaderV2
            symbol={symbol}
            company={company}
            isInWatchlist={isInWatchlist}
            onAddToWatchlist={handleAddToWatchlist}
            realtimeQuote={realtimeQuote}
            isConnected={isConnected}
            onShare={() => {
            // Handle share functionality
            if (navigator.share) {
              navigator.share({
                title: `${company.name} (${symbol})`,
                text: `Check out ${company.name} stock analysis on Alfalyzer`,
                url: window.location.href,
              });
            } else {
              // Fallback to copying to clipboard
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          />
        ) : (
          <StockHeaderV2
            symbol={symbol}
            company={company}
            isInWatchlist={isInWatchlist}
            onAddToWatchlist={handleAddToWatchlist}
            onShare={() => {
              // Handle share functionality
              if (navigator.share) {
                navigator.share({
                  title: `${company.name} (${symbol})`,
                  text: `Check out ${company.name} stock analysis on Alfalyzer`,
                  url: window.location.href,
                });
              } else {
                // Fallback to copying to clipboard
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          />
        )}

        {/* Price Information */}
        <Card className="border-teya-green/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                <p className="text-3xl font-bold">${((realtimeQuote?.price || company.price) || 0).toFixed(2)}</p>
                <p className={cn("text-sm font-medium", 
                  (realtimeQuote ? realtimeQuote.change >= 0 : isPositive) ? "text-green-500" : "text-red-500")}>
                  {(realtimeQuote ? realtimeQuote.change >= 0 : isPositive) ? "+" : ""}
                  {Math.abs((realtimeQuote?.change || company.change) || 0).toFixed(2)} 
                  ({(realtimeQuote ? realtimeQuote.change >= 0 : isPositive) ? "+" : ""}
                  {Math.abs((realtimeQuote?.change_percent || company.changePercent) || 0).toFixed(2)}%)
                </p>
              </div>
              {/* Extended hours block */}
              {extendedHours && (extendedHours.afterHours || extendedHours.preMarket) && (
                <div className="col-span-2 md:col-span-2 lg:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-muted-foreground">Extended Hours</p>
                    <Badge variant="outline">
                      {extendedHours.currentSession === 'pre-market' ? 'Pre-Market' : extendedHours.currentSession === 'after-hours' ? 'After-Hours' : 'Closed'}
                    </Badge>
                  </div>
                  {(() => {
                    const sess = extendedHours.currentSession === 'pre-market' ? extendedHours.preMarket : extendedHours.afterHours || extendedHours.preMarket;
                    if (!sess) return <p className="text-sm text-muted-foreground">No extended trading data</p>;
                    const pos = (sess.change || 0) >= 0;
                    return (
                      <div className="flex items-baseline gap-3">
                        <p className="text-2xl font-bold">${(sess.price ?? 0).toFixed(2)}</p>
                        <p className={cn("text-sm font-medium", pos ? "text-green-500" : "text-red-500")}
                        >{pos ? '+' : ''}{Math.abs(sess.change ?? 0).toFixed(2)} ({pos ? '+' : ''}{Math.abs(sess.changePercent ?? 0).toFixed(2)}%)</p>
                        <p className="text-xs text-muted-foreground">Vol: {Intl.NumberFormat().format(sess.volume || 0)}</p>
                      </div>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground mt-1">Last update: {extendedHours.afterHours?.timestamp || extendedHours.preMarket?.timestamp}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                <p className="text-xl font-bold">{company.marketCap}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">P/E Ratio</p>
                <p className="text-xl font-bold">{company.pe}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Dividend Yield</p>
                <p className="text-xl font-bold">{company.dividend}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Volume</p>
                <p className="text-xl font-bold">{company.volume}</p>
                <p className="text-xs text-muted-foreground">Avg: {company.avgVolume}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Beta</p>
                <p className="text-xl font-bold">{company.beta}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Financials
            </TabsTrigger>
            <TabsTrigger value="valuation" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Valuation
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <ChartLine className="h-4 w-4" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview Tab - Resumo com IV em destaque */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Intrinsic Value Highlight */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-teya-green" />
                    Análise de Valor Intrínseco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ClientOnly
                    fallback={
                      <div className="bg-gradient-to-r from-teya-green/10 to-teya-green/5 border border-teya-green/20 rounded-lg p-6 space-y-4">
                        <div className="h-6 w-40 bg-teya-green/20 rounded" />
                        <div className="h-5 w-24 bg-muted rounded" />
                      </div>
                    }
                  >
                    <div className="bg-gradient-to-r from-teya-green/10 to-teya-green/5 border border-teya-green/20 rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-teya-green">
                            {baseIV ? formatCurrency(baseIV) : 'N/A'}
                          </h3>
                          <p className="text-sm text-muted-foreground">Valor Intrínseco (Oficial)</p>
                        </div>
                        <div className="text-right">
                          <h3 className="text-2xl font-bold">{formatCurrency(latestPrice)}</h3>
                          <p className="text-sm text-muted-foreground">Preço Atual</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-background/60 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${isUndervalued === null ? 'bg-gray-400' : isUndervalued ? 'bg-green-500' : 'bg-red-500'}`} />
                          <Badge className={`${isUndervalued ? 'bg-green-500/10 text-green-700 border-green-200' : 'bg-red-500/10 text-red-700 border-red-200'}`}>
                            {isUndervalued ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {isUndervalued === null ? '—' : isUndervalued ? 'Subvalorizada' : 'Sobrevalorizada'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${valuationDiff !== null && valuationDiff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {valuationDiff === null ? '—' : `${valuationDiff.toFixed(1)}%`}
                          </span>
                          <p className="text-xs text-muted-foreground">vs. Valor Intrínseco</p>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Baseado em DCF com crescimento conservador e WACC estimado
                        </span>
                      </div>
                    </div>
                  </ClientOnly>
                </CardContent>
              </Card>

              {/* Company Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo da Empresa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{company.description}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Setor</span>
                      <span className="text-sm font-medium">{company.sector}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Indústria</span>
                      <span className="text-sm font-medium">{company.industry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Market Cap</span>
                      <span className="text-sm font-medium">{company.marketCap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">P/E Ratio</span>
                      <span className="text-sm font-medium">{company.pe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Dividend</span>
                      <span className="text-sm font-medium">{company.dividend}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setLocation(`/compare?add=${symbol}`)}
                    className="w-full bg-teya-green hover:bg-teya-green/90 text-teya-dark"
                  >
                    <ChartLine className="w-4 h-4 mr-2" />
                    Comparar com Outras
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financials" className="space-y-6">
            {/* Financials Tab - Gráficos de receitas, lucros, FCF (tipo Qualtrim) */}
            <StockFinancialsChart data={incomeStatements} isLoading={isLoadingDetails} />
          </TabsContent>

          <TabsContent value="valuation" className="space-y-6">
            {/* Valuation Tab - Detalhe do cálculo IV */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DCF Model */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-teya-green" />
                    Modelo DCF (Discounted Cash Flow)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-teya-green/5 border border-teya-green/20 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <h3 className="text-3xl font-bold text-teya-green">{baseIV ? formatCurrency(baseIV) : 'N/A'}</h3>
                      <p className="text-sm text-muted-foreground">Valor Intrínseco (Oficial)</p>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FCF Base (TTM)</span>
                        <span className="font-medium">$78.5B</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxa de Crescimento</span>
                        <span className="font-medium text-green-600">8.0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">WACC</span>
                        <span className="font-medium">10.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Terminal Growth</span>
                        <span className="font-medium">2.5%</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Shares Outstanding</span>
                        <span className="font-medium">15.5B</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCalculateValue}
                    className="w-full bg-teya-green hover:bg-teya-green/90 text-teya-dark"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Recalcular com Parâmetros Personalizados
                  </Button>
                </CardContent>
              </Card>

              {/* Valuation Multiples */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    Múltiplos de Valuation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">P/E Ratio</p>
                      <p className="text-lg font-bold">{company.pe}</p>
                      <p className="text-xs text-green-600">vs. 32.1 (setor)</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">P/B Ratio</p>
                      <p className="text-lg font-bold">8.2</p>
                      <p className="text-xs text-red-600">vs. 3.8 (setor)</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">EV/EBITDA</p>
                      <p className="text-lg font-bold">22.4</p>
                      <p className="text-xs text-green-600">vs. 28.5 (setor)</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">PEG Ratio</p>
                      <p className="text-lg font-bold">1.8</p>
                      <p className="text-xs text-green-600">vs. 2.3 (setor)</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Análise Comparativa</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      A empresa está negociando com múltiplos atrativos comparado ao setor, 
                      especialmente em P/E e EV/EBITDA, sugerindo uma oportunidade de valor.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Sensitivity Analysis */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    Análise de Sensibilidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <h4 className="font-medium mb-2">Cenário Conservador</h4>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-red-600">{conservativeIV ? formatCurrency(conservativeIV) : 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Crescimento: 5%</p>
                        <p className="text-sm text-muted-foreground">WACC: 12%</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium mb-2">Cenário Base</h4>
                      <div className="bg-teya-green/10 border border-teya-green/20 rounded-lg p-3">
                        <p className="text-2xl font-bold text-teya-green">{baseIV ? formatCurrency(baseIV) : 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Crescimento: 8%</p>
                        <p className="text-sm text-muted-foreground">WACC: 10.5%</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium mb-2">Cenário Otimista</h4>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-2xl font-bold text-green-600">{optimisticIV ? formatCurrency(optimisticIV) : 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">Crescimento: 12%</p>
                        <p className="text-sm text-muted-foreground">WACC: 9%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/20 border rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      <strong>Preço Atual:</strong> {formatCurrency(latestPrice)} |
                      <strong> Range de Fair Value:</strong> {conservativeIV && optimisticIV ? `${formatCurrency(conservativeIV)} - ${formatCurrency(optimisticIV)}` : '—'} |
                      <strong> Margem de Segurança:</strong> {baseIV ? `${Math.max(0, ((baseIV - latestPrice) / baseIV) * 100).toFixed(0)}%` : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="news" className="space-y-6">
            {/* News Tab - Latest company news */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <StockNewsFeed articles={news} isLoading={isLoadingDetails} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-6">
            {/* Compare Tab - Link rápido para comparação */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Compare Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartLine className="h-5 w-5 text-teya-green" />
                    Comparação Rápida
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Compare {symbol} com outras ações do mesmo setor ou com seus principais concorrentes.
                  </p>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setLocation(`/compare?stocks=${symbol},MSFT,GOOGL,META`)}
                      className="w-full bg-teya-green hover:bg-teya-green/90 text-teya-dark justify-start"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Comparar com Big Tech (MSFT, GOOGL, META)
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation(`/compare?add=${symbol}`)}
                      variant="outline" 
                      className="w-full border-teya-green/30 hover:bg-teya-green/10 justify-start"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar a Nova Comparação
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation(`/compare?stocks=${symbol},SPY,QQQ`)}
                      variant="outline" 
                      className="w-full border-blue-300 hover:bg-blue-50 justify-start"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Comparar com Índices (SPY, QQQ)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sector Peers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Principais Concorrentes ({company.sector})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Mock competitor data */}
                    {[
                      { symbol: 'MSFT', name: 'Microsoft Corp.', pe: '35.2', mc: '$2.8T', change: '+0.8%' },
                      { symbol: 'GOOGL', name: 'Alphabet Inc.', pe: '26.1', mc: '$1.7T', change: '-0.3%' },
                      { symbol: 'META', name: 'Meta Platforms', pe: '24.8', mc: '$800B', change: '+1.2%' }
                    ].map((competitor) => (
                      <div key={competitor.symbol} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer"
                           onClick={() => setLocation(`/stock/${competitor.symbol}`)}>
                        <div className="flex-1">
                          <div className="font-medium">{competitor.symbol}</div>
                          <div className="text-sm text-muted-foreground truncate">{competitor.name}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div>P/E: {competitor.pe}</div>
                          <div className={cn(
                            "font-medium",
                            competitor.change.startsWith('+') ? "text-green-600" : "text-red-600"
                          )}>
                            {competitor.change}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      onClick={() => setLocation(`/compare?stocks=${symbol},MSFT,GOOGL,META`)}
                      variant="outline" 
                      className="w-full border-teya-green/30 hover:bg-teya-green/10 mt-3"
                    >
                      <ChartLine className="w-4 h-4 mr-2" />
                      Comparar Todos os Concorrentes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Insights */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    Insights de Comparação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200">Vantagem Competitiva</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {symbol} tem melhor margem de lucro que 70% dos concorrentes do setor
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">Valuation</span>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        P/E ratio 15% abaixo da média do setor, indicando possível subavaliação
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-purple-800 dark:text-purple-200">Crescimento</span>
                      </div>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Taxa de crescimento de receita acima da média dos pares nos últimos 3 anos
                      </p>
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
