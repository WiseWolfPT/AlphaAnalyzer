import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { UniversalSearch } from "@/components/universal-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  TrendingUp, 
  Target, 
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Percent,
  ArrowUp,
  ArrowDown,
  Info,
  Wifi
} from "lucide-react";
import { ResponsiveContainer } from "@/components/ui/lightweight-chart";
import { 
  PieChart as RechartsPieChart, 
  BarChart, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Pie, 
  Cell, 
  Bar, 
  Tooltip, 
  Legend 
} from "recharts";
import { motion } from "framer-motion";
import { useRealtimeQuote } from "@/hooks/use-realtime-quotes";
import type { Stock } from "@shared/schema";
import { useCachedQuote, useCachedFundamentals, useCachedFinancials } from "@/hooks/use-cache-data";
import { DCFCalculatorCard } from "@/components/stock/dcf-calculator-card";

interface ValuationResult {
  method: string;
  value: number;
  description: string;
  confidence: number;
}

interface IntrinsicCalculation {
  currentPrice: number;
  intrinsicValue: number;
  discount: number;
  isUndervalued: boolean;
  methods: ValuationResult[];
}

export default function IntrinsicValue() {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculation, setCalculation] = useState<IntrinsicCalculation | null>(null);
  const [useRealtime, setUseRealtime] = useState(true);

  // Manual calculation inputs
  const [eps, setEps] = useState("6.13");
  const [growthRate, setGrowthRate] = useState(8);
  const [discountRate, setDiscountRate] = useState(10);
  const [terminalGrowth, setTerminalGrowth] = useState(3);
  const [years, setYears] = useState(10);
  const [presetKey, setPresetKey] = useState<'conservative' | 'base' | 'optimistic' | null>(null);

  // Read symbol from URL on page load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const symbolFromUrl = searchParams.get('symbol');
    
    if (symbolFromUrl) {
      // Set the search query to trigger the search
      setSearchQuery(symbolFromUrl);
      
      // Create a stock object for the symbol
      const stockFromUrl: Stock = {
        symbol: symbolFromUrl.toUpperCase(),
        name: symbolFromUrl.toUpperCase(), // Will be updated when search results load
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        marketCap: 0
      };
      
      setSelectedStock(stockFromUrl);
      
      // Do not auto-calculate; we'll try cache-first and let user recalc if quiser
    }
  }, []);
  
  // Normalize symbol for API/provider (dot->hyphen for class shares like BRK.B)
  const normalizedSymbol = (selectedStock?.symbol || '').replace('.', '-');

  // Get realtime quote if enabled and stock is selected
  const { quote: realtimeQuote, isConnected } = useRealtimeQuote(selectedStock?.symbol || '', {
    enabled: useRealtime && !!selectedStock?.symbol
  });

  // Use cached fundamentals and financials for valuation
  const { data: fundamentals } = useCachedFundamentals(normalizedSymbol || '', {
    enabled: !!selectedStock?.symbol
  });
  
  const { data: financials } = useCachedFinancials(normalizedSymbol || '', {
    enabled: !!selectedStock?.symbol
  });

  // Cache-first quote fallback (if realtime not available)
  const { data: cachedQuoteResp } = useCachedQuote(normalizedSymbol || '', {
    enabled: !!selectedStock?.symbol
  });
  // Normalize cache response shape
  const cachedQuote: any = (cachedQuoteResp && (cachedQuoteResp as any).data) ? (cachedQuoteResp as any).data : cachedQuoteResp;
  
  // Fetch DCF data for the new calculator
  const { data: dcfData } = useQuery({
    queryKey: [`/api/market-data/dcf/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Official Intrinsic Value (backend computed)
  const { data: officialIV } = useQuery({
    queryKey: [`/api/valuation/intrinsic/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol,
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Cache-first Intrinsic Value (fallback)
  const { data: cachedIV } = useQuery({
    queryKey: [`/api/cache/intrinsic-values/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol,
    staleTime: 24 * 60 * 60 * 1000,
  });
  
  // Hydrate calculation from cached IV when available
  useEffect(() => {
    if (!selectedStock) return;
    try {
      const payload: any = officialIV || cachedIV;
      const data = payload?.data ?? payload;
      if (!data || !data.intrinsicValue) return;
      const currentPrice = parseFloat(data.currentPrice || '0');
      const intrinsic = parseFloat(data.intrinsicValue || '0');
      if (!intrinsic || !currentPrice) return;
      const discount = ((currentPrice - intrinsic) / intrinsic) * 100;
      setCalculation({
        currentPrice,
        intrinsicValue: intrinsic,
        discount,
        isUndervalued: (String(data.valuation || '')).toLowerCase() === 'undervalued' || discount < 0,
        methods: [
          {
            method: 'Cached IV',
            value: intrinsic,
            description: 'Last calculated intrinsic value from cache',
            confidence: 85,
          },
        ],
      });
    } catch {}
  }, [officialIV, cachedIV, selectedStock?.symbol]);

  // Auto-calculate Scenario model when presets change
  useEffect(() => {
    if (!selectedStock || !presetKey) return;
    try {
      // Try get EPS from official IV payload or fundamentals
      const payload: any = officialIV || cachedIV;
      const data = payload?.data ?? payload ?? {};
      const epsFromOfficial = parseFloat(String(data?.eps ?? ''));
      const epsFromFund = parseFloat(String((fundamentals as any)?.eps ?? (fundamentals as any)?.EPS ?? ''));
      const epsValue = Number.isFinite(epsFromOfficial) && epsFromOfficial > 0 ? epsFromOfficial : (Number.isFinite(epsFromFund) && epsFromFund > 0 ? epsFromFund : parseFloat(eps));

      const px = Number(realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? selectedStock.price ?? 0);

      const preset = presetKey === 'conservative'
        ? { growthRate: 5, discountRate: 11, terminalGrowth: 2, peTerminal: 18, marginOfSafety: 30, projectionYears: 10 }
        : presetKey === 'base'
        ? { growthRate: 8, discountRate: 10, terminalGrowth: 2, peTerminal: 22, marginOfSafety: 25, projectionYears: 10 }
        : { growthRate: 12, discountRate: 9, terminalGrowth: 2.5, peTerminal: 25, marginOfSafety: 20, projectionYears: 10 };

      // Simple blended model: DCF (70%) + PE terminal (30%), then apply MOS
      const dcfVal = calculateDCF(epsValue, preset.growthRate, preset.discountRate, preset.terminalGrowth, preset.projectionYears);
      const peVal = calculatePE(epsValue, preset.peTerminal);
      const blended = 0.7 * dcfVal + 0.3 * peVal;
      const withMOS = blended * (1 - preset.marginOfSafety / 100);
      const discountPct = withMOS > 0 ? ((px - withMOS) / withMOS) * 100 : 0;

      setCalculation({
        currentPrice: px,
        intrinsicValue: withMOS,
        discount: discountPct,
        isUndervalued: discountPct < 0,
        methods: [
          { method: 'DCF (preset)', value: dcfVal, description: 'DCF based on preset inputs', confidence: 80 },
          { method: 'P/E Terminal', value: peVal, description: 'EPS × P/E terminal', confidence: 60 },
        ],
      });
    } catch {
      // ignore
    }
  }, [presetKey, officialIV, cachedIV, fundamentals, realtimeQuote, cachedQuote, selectedStock?.symbol]);
  
  const { data: searchResults, error: searchError, isLoading: searchLoading } = useQuery<Stock[]>({
    queryKey: [`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length > 0,
  });

  // Debug search results
  useEffect(() => {
    if (searchQuery) {
      console.log('Search query:', searchQuery);
      console.log('Search loading:', searchLoading);
      console.log('Search error:', searchError);
      console.log('Search results:', searchResults);
    }
  }, [searchQuery, searchResults, searchError, searchLoading]);
  
  // Recalculate when realtime price changes
  useEffect(() => {
    if (selectedStock && realtimeQuote && calculation) {
      // Update calculation with new price
      const newPrice = realtimeQuote.price;
      const valuationDiff = calculation.intrinsicValue ? 
        ((newPrice - calculation.intrinsicValue) / calculation.intrinsicValue) * 100 : 0;
      
      setCalculation(prev => prev ? {
        ...prev,
        currentPrice: newPrice,
        discount: valuationDiff,
        isUndervalued: valuationDiff < 0
      } : null);
    }
  }, [realtimeQuote]);

  const calculateIntrinsicValue = (stock: Stock) => {
    setIsCalculating(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      // Use realtime price if available; fallback para cached quote
      const currentPrice = realtimeQuote?.price || (typeof stock.price === 'number' ? stock.price : parseFloat((stock as any).price || '0'));
      const epsValue = typeof stock.eps === 'number' ? stock.eps : parseFloat(stock.eps || eps);
      
      // Different valuation methods
      const dcfValue = calculateDCF(epsValue, growthRate, discountRate, terminalGrowth, years);
      const peValue = calculatePE(epsValue, 15); // Conservative P/E of 15
      const pegValue = calculatePEG(epsValue, growthRate);
      
      const methods: ValuationResult[] = [
        {
          method: "DCF (10-year)",
          value: dcfValue,
          description: "Discounted Cash Flow model",
          confidence: 85
        },
        {
          method: "P/E Valuation",
          value: peValue,
          description: "Price-to-Earnings based",
          confidence: 70
        },
        {
          method: "PEG Ratio",
          value: pegValue,
          description: "PEG-adjusted valuation",
          confidence: 75
        }
      ];

      // Average intrinsic value (weighted by confidence)
      const totalWeight = methods.reduce((sum, m) => sum + m.confidence, 0);
      const weightedValue = methods.reduce((sum, m) => sum + (m.value * m.confidence), 0) / totalWeight;
      
      const discount = ((currentPrice - weightedValue) / weightedValue) * 100;
      
      setCalculation({
        currentPrice,
        intrinsicValue: weightedValue,
        discount,
        isUndervalued: discount < 0,
        methods
      });
      
      setIsCalculating(false);
    }, 1500);
  };

  const calculateDCF = (eps: number, growth: number, discount: number, terminal: number, years: number): number => {
    let totalValue = 0;
    let currentEps = eps;
    
    // Growth phase
    for (let i = 1; i <= years; i++) {
      currentEps *= (1 + growth / 100);
      totalValue += currentEps / Math.pow(1 + discount / 100, i);
    }
    
    // Terminal value
    const terminalValue = (currentEps * (1 + terminal / 100)) / (discount / 100 - terminal / 100);
    totalValue += terminalValue / Math.pow(1 + discount / 100, years);
    
    return totalValue;
  };

  const calculatePE = (eps: number, peRatio: number): number => {
    return eps * peRatio;
  };

  const calculatePEG = (eps: number, growth: number): number => {
    const fairPE = growth * 1.2; // PEG ratio of 1.2
    return eps * fairPE;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Pie chart data
  const pieData = calculation ? [
    {
      name: 'Undervalued',
      value: calculation.isUndervalued ? Math.abs(calculation.discount) : 0,
      color: '#10b981'
    },
    {
      name: 'Fair Value',
      value: calculation.isUndervalued ? 100 - Math.abs(calculation.discount) : Math.abs(calculation.discount),
      color: '#f59e0b'
    },
    {
      name: 'Overvalued',
      value: calculation.isUndervalued ? 0 : 100 - Math.abs(calculation.discount),
      color: '#ef4444'
    }
  ] : [];

  // Bar chart data for methods comparison
  const barData = calculation?.methods.map(method => ({
    name: method.method,
    value: method.value,
    current: calculation.currentPrice
  })) || [];

  // Current preset configuration (for UI hints if needed)
  const presetConfig = presetKey ? (
    presetKey === 'conservative' ? { growthRate: 5, discountRate: 11, terminalGrowth: 2, marginOfSafety: 30, projectionYears: 10 } :
    presetKey === 'base' ? { growthRate: 8, discountRate: 10, terminalGrowth: 2, marginOfSafety: 25, projectionYears: 10 } :
    { growthRate: 12, discountRate: 9, terminalGrowth: 2.5, marginOfSafety: 20, projectionYears: 10 }
  ) : null;

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teya-green/10 rounded-xl">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Intrinsic Value Calculator</h1>
                <p className="text-muted-foreground">Calculate the true worth of any stock with advanced valuation methods</p>
              </div>
            </div>
            
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

          {/* Search Bar */}
          <div className="max-w-2xl">
            <UniversalSearch
              onSelect={(stock) => {
                // Cache-first: select and hydrate from cached IV
                setSelectedStock(stock);
                setSearchQuery(stock.symbol);
                setCalculation(null);
                setPresetKey('base');
              }}
              placeholder="Search for a stock to analyze..."
              showRecentSearches={true}
              showPopularStocks={true}
            />
          </div>
        </div>

        {selectedStock && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stock Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teya-green/20 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-primary">{selectedStock.symbol.charAt(0)}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedStock.symbol}</h2>
                      <p className="text-muted-foreground">{selectedStock.name}</p>
                      <Badge variant="secondary">{selectedStock.sector}</Badge>
                    </div>
                  </div>
                  <div className="text-right relative">
                    {/* Realtime indicator */}
                    {useRealtime && isConnected && realtimeQuote && (
                      <div className="absolute -top-2 -right-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" 
                              title="Dados em tempo real" />
                      </div>
                    )}
                    
                    <div className="text-3xl font-bold">
                      {formatCurrency(
                        (realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0) ||
                        parseFloat(String(selectedStock.price || 0))
                      )}
                    </div>
                    <div className={`flex items-center gap-1 ${
                      ((realtimeQuote?.change ?? cachedQuote?.change ?? parseFloat(String(selectedStock.changePercent || 0))) >= 0)
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {((realtimeQuote?.change ?? cachedQuote?.change ?? parseFloat(String(selectedStock.changePercent || 0))) >= 0) ? 
                        <ArrowUp className="h-4 w-4" /> : 
                        <ArrowDown className="h-4 w-4" />
                      }
                      <span>
                        {`${((realtimeQuote?.change_percent ?? cachedQuote?.changePercent ?? cachedQuote?.change_percent ?? parseFloat(String(selectedStock.changePercent || 0))) >= 0 ? '+' : '')}${
                          ((realtimeQuote?.change_percent ?? cachedQuote?.changePercent ?? cachedQuote?.change_percent ?? parseFloat(String(selectedStock.changePercent || 0))) || 0).toFixed(2)
                        }%`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Official Intrinsic Value reference + Scenario */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Valor Intrínseco Oficial</div>
                    <div className="text-2xl font-bold text-primary">
                      {(() => {
                        const payload: any = officialIV || cachedIV;
                        const data = payload?.data ?? payload;
                        const iv = data?.intrinsicValue ? parseFloat(data.intrinsicValue) : null;
                        return iv ? formatCurrency(iv) : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Preço Atual</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        (realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0) ||
                        parseFloat(String(selectedStock.price || 0))
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Upside vs. VI</div>
                    <div className={`text-2xl font-bold ${(() => {
                      const payload: any = officialIV || cachedIV;
                      const data = payload?.data ?? payload;
                      const iv = data?.intrinsicValue ? parseFloat(data.intrinsicValue) : null;
                      const px = Number(realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0);
                      const diff = iv && px ? ((iv - px) / px) * 100 : null;
                      return diff !== null && diff > 0 ? 'text-green-600' : 'text-red-600';
                    })()}`}>
                      {(() => {
                        const payload: any = officialIV || cachedIV;
                        const data = payload?.data ?? payload;
                        const iv = data?.intrinsicValue ? parseFloat(data.intrinsicValue) : null;
                        const px = Number(realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0);
                        const diff = iv && px ? ((iv - px) / px) * 100 : null;
                        return diff === null ? '—' : `${diff.toFixed(1)}%`;
                      })()}
                    </div>
                    {(() => {
                      const payload: any = officialIV || cachedIV;
                      const data = payload?.data ?? payload;
                      const updated = data?.calculatedAt || data?.lastUpdated;
                      return updated ? <div className="text-xs text-muted-foreground">Atualizado: {new Date(updated).toLocaleString()}</div> : null;
                    })()}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">VI (Cenário)</div>
                    <div className="text-2xl font-bold">
                      {calculation?.intrinsicValue ? formatCurrency(calculation.intrinsicValue) : '—'}
                    </div>
                    <div className={`text-sm ${calculation ? (calculation.isUndervalued ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                      {calculation ? `${formatPercentage(-calculation.discount)} vs. Preço` : 'Selecione um preset'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Presets (simple) */}
            <Card>
              <CardHeader>
                <CardTitle>Presets de Cenário</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant={presetKey === 'conservative' ? 'default' : 'outline'} onClick={() => setPresetKey('conservative')}>Conservador</Button>
                <Button variant={presetKey === 'base' ? 'default' : 'outline'} onClick={() => setPresetKey('base')}>Base</Button>
                <Button variant={presetKey === 'optimistic' ? 'default' : 'outline'} onClick={() => setPresetKey('optimistic')}>Otimista</Button>
              </CardContent>
            </Card>

            {/* Calculation Results */}
            {isCalculating ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 mx-auto mb-4"
                  >
                    <Calculator className="w-full h-full text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2">Calculating Intrinsic Value...</h3>
                  <p className="text-muted-foreground mb-4">Analyzing financial data and running valuation models</p>
                  <Progress value={75} className="max-w-xs mx-auto" />
                </CardContent>
              </Card>
            ) : calculation && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Valuation Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Valuation Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current vs Intrinsic */}
                    <div className="text-center">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-secondary/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Current Price</div>
                          <div className="text-2xl font-bold">{formatCurrency(calculation.currentPrice)}</div>
                        </div>
                        <div className="p-4 bg-teya-green/10 rounded-lg">
                          <div className="text-sm text-muted-foreground">Intrinsic Value</div>
                          <div className="text-2xl font-bold text-primary">{formatCurrency(calculation.intrinsicValue)}</div>
                        </div>
                      </div>
                      
                      {/* Discount/Premium */}
                      <div className={`text-center p-4 rounded-lg ${
                        calculation.isUndervalued 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <div className={`text-2xl font-bold ${
                          calculation.isUndervalued ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(Math.abs(calculation.discount))}
                        </div>
                        <div className="text-sm">
                          {calculation.isUndervalued ? 'Potential Upside' : 'Premium to Fair Value'}
                        </div>
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${value.toFixed(1)}%`, '']}
                          />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Valuation Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Valuation Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {calculation.methods.map((method, index) => (
                      <motion.div
                        key={method.method}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{method.method}</div>
                            <div className="text-sm text-muted-foreground">{method.description}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(method.value)}</div>
                            <div className="text-xs text-muted-foreground">{method.confidence}% confidence</div>
                          </div>
                        </div>
                        <Progress value={method.confidence} className="h-1" />
                      </motion.div>
                    ))}

                    {/* Methods Comparison Chart */}
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            formatter={(value: any, name: string) => [
                              formatCurrency(value), 
                              name === 'value' ? 'Intrinsic Value' : 'Current Price'
                            ]}
                            labelStyle={{ color: '#1F2937' }}
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="value" 
                            fill="#10b981" 
                            name="Intrinsic Value"
                            radius={[2, 2, 0, 0]}
                          />
                          <Bar 
                            dataKey="current" 
                            fill="#ef4444" 
                            name="Current Price"
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Advanced DCF Calculator with Real Data (collapsed by default) */}
            <details>
              <summary className="cursor-pointer px-2 py-1 text-sm text-muted-foreground">Avançado (opcional)</summary>
              <div className="mt-4">
                <DCFCalculatorCard 
                  symbol={normalizedSymbol}
                  currentPrice={
                    (realtimeQuote?.price ?? cachedQuote?.price ?? cachedQuote?.close ?? cachedQuote?.last ?? 0) ||
                    parseFloat(String(selectedStock.price || 0))
                  }
                  preset={presetConfig}
                  onCalculate={(result) => {
                    // Update the main calculation result
                    setCalculation({
                      currentPrice: realtimeQuote?.price || parseFloat(selectedStock.price),
                      intrinsicValue: result.intrinsicValuePerShare,
                      discount: result.upside,
                      isUndervalued: result.upside > 0,
                      methods: [
                        {
                          method: "DCF (Free Cash Flow)",
                          value: result.intrinsicValuePerShare,
                          description: "Discounted Cash Flow with FCF",
                          confidence: 90
                        },
                        {
                          method: "Enterprise Value",
                          value: result.enterpriseValue / (dcfData?.sharesOutstanding || 1000000000),
                          description: "Enterprise value per share",
                          confidence: 85
                        },
                        {
                          method: "With Margin of Safety",
                          value: result.intrinsicValuePerShare * 0.75,
                          description: "25% margin of safety applied",
                          confidence: 95
                        }
                      ]
                    });
                  }}
                />
              </div>
            </details>

            {/* Legacy Manual Calculator - Hidden but kept for backward compatibility */}
            {false && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Manual Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="dcf" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="dcf">DCF Model</TabsTrigger>
                      <TabsTrigger value="pe">P/E Valuation</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="dcf" className="space-y-4 mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="eps">EPS (TTM)</Label>
                          <Input
                            id="eps"
                            type="number"
                            value={eps}
                            onChange={(e) => setEps(e.target.value)}
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label>Growth Rate: {growthRate}%</Label>
                          <Slider
                            value={[growthRate]}
                            onValueChange={(value) => setGrowthRate(value[0])}
                            max={30}
                            min={0}
                            step={0.5}
                          />
                        </div>
                        <div>
                          <Label>Discount Rate: {discountRate}%</Label>
                          <Slider
                            value={[discountRate]}
                            onValueChange={(value) => setDiscountRate(value[0])}
                            max={20}
                            min={5}
                            step={0.5}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={() => selectedStock && calculateIntrinsicValue(selectedStock)}
                        className="w-full bg-gradient-to-r from-teya-green via-teya-green-dark to-teya-green hover:from-teya-green-dark hover:via-teya-green hover:to-teya-green-dark text-rich-black font-semibold shadow-lg shadow-teya-green/30 hover:shadow-teya-green/50 hover:scale-105 transition-all duration-300 border-0"
                        data-calculate-button
                      >
                        Recalculate
                      </Button>
                    </TabsContent>
                    
                    <TabsContent value="pe" className="space-y-4 mt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <PieChart className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p>P/E valuation model coming soon</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-4 mt-6">
                      <div className="text-center py-8 text-muted-foreground">
                        <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p>Advanced models coming soon</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!selectedStock && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calculator className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Start Your Analysis</h3>
              <p className="text-muted-foreground mb-6">
                Search for a stock above to calculate its intrinsic value using advanced valuation models
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">DCF Analysis</div>
                </div>
                <div className="text-center">
                  <Percent className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">Multiple Methods</div>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">Real-time Data</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
