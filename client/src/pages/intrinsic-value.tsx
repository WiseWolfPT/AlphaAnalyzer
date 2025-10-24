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
  Wifi,
  TrendingDown,
  Minus
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
import { AlfaValueHeader } from "@/components/stock/alfa-value-header";
import { useAlfaValue } from "@/hooks/use-alfa-value";
import { cn } from "@/lib/utils";
import { ValuationMethodsChart } from "@/components/stock/valuation-methods-chart";
import { ValuationGauge } from "@/components/stock/valuation-gauge";
import { useValuationChart, type BasedOn } from "@/hooks/use-valuation-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from "@/components/ui/select";
import { DualValuationLayout, type AutoCalculation, type MyCalculation } from "@/components/stock/dual-valuation-layout";
import { useToast } from "@/hooks/use-toast";
import { useMethodInputMapper } from "@/hooks/useMethodInputMapper";
import { FinancialInputsDynamic } from "@/components/stock/financial-inputs-dynamic";
import { CustomMethodSelector, type CustomBasedOn } from "@/components/intrinsic-value/custom-method-selector";

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

  // FASE 3: Valuation Methods Selection
  const [basedOn, setBasedOn] = useState<BasedOn>('fcf');
  const [showAllMethods, setShowAllMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('alfavalue');

  // ONDA 3.2: Custom Method "Based On" selection
  const [customBasedOn, setCustomBasedOn] = useState<CustomBasedOn>(() => {
    // Load from localStorage on mount
    try {
      const saved = localStorage.getItem('alfavalue-custom-based-on');
      if (saved && ['ocf', 'fcf', 'ni'].includes(saved)) {
        return saved as CustomBasedOn;
      }
    } catch (error) {
      console.error('Failed to load customBasedOn from localStorage:', error);
    }
    return 'fcf'; // Default to FCF (recommended)
  });

  /**
   * ONDA 3.2: Map Custom method + basedOn to backend method ID
   *
   * When user selects "Custom" method, we need to translate their "Based On"
   * choice (OCF/FCF/NI) to the appropriate backend DCF method ID.
   *
   * Mapping:
   * - OCF → dcf-20-ocf (DCF-20 Operating Cash Flow)
   * - FCF → dcf-20-fcf (DCF-20 Free Cash Flow)
   * - NI  → dcf-20-ni  (DCF-20 Net Income)
   */
  const getEffectiveMethodId = (method: string): string => {
    if (method !== 'custom') return method;

    // Map customBasedOn to backend method ID
    const methodMap: Record<CustomBasedOn, string> = {
      'ocf': 'dcf-20-ocf',
      'fcf': 'dcf-20-fcf',
      'ni': 'dcf-20-ni',
    };

    return methodMap[customBasedOn];
  };

  // FASE 3.2: My Calculation state
  const [myCalculation, setMyCalculation] = useState<MyCalculation>({
    stockPrice: 0,
    iv: 0,
    premium: 0,
    operatingCF: 0,
    totalDebt: 0,
    cash: 0,
    discountRate: 0,
    shares: 0,
    growth_1_5: 0,
    growth_6_10: 0,
    growth_11_20: 0,
    deductDebt: true,
    addCash: true,
  });

  const { toast } = useToast();

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

  // AlfaValue™ - Official Intrinsic Value (new system)
  const { data: alfaValueData, isLoading: isLoadingAlfaValue } = useAlfaValue(normalizedSymbol);

  // FASE 3: All Valuation Methods (10+)
  const { data: valuationChartData, isLoading: isLoadingValuationChart, error: valuationChartError } = useValuationChart(
    normalizedSymbol,
    {
      basedOn,
      excludeNRI: false,
      enabled: !!selectedStock?.symbol && showAllMethods,
    }
  );

  // FASE 3.2: Use new hook to map inputs dynamically (replaces giant useEffect)
  // ONDA 3.2: Pass effective method ID (maps "custom" to actual DCF method)
  const effectiveMethodIdForMapper = selectedMethod === 'custom'
    ? getEffectiveMethodId(selectedMethod)
    : selectedMethod;
  const mappedInputs = useMethodInputMapper(effectiveMethodIdForMapper, valuationChartData, alfaValueData);

  // Legacy: Official Intrinsic Value (backend computed) - kept for backward compatibility
  const { data: officialIV } = useQuery({
    queryKey: [`/api/valuation/intrinsic/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol && !alfaValueData, // only fetch if AlfaValue not available
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Legacy: Cache-first Intrinsic Value (fallback)
  const { data: cachedIV } = useQuery({
    queryKey: [`/api/cache/intrinsic-values/${normalizedSymbol}`],
    enabled: !!selectedStock?.symbol && !alfaValueData && !officialIV, // only fetch if AlfaValue not available
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

  // ONDA 3.2: Persist customBasedOn to localStorage
  useEffect(() => {
    if (selectedMethod === 'custom') {
      try {
        localStorage.setItem('alfavalue-custom-based-on', customBasedOn);
      } catch (error) {
        console.error('Failed to save customBasedOn to localStorage:', error);
      }
    }
  }, [customBasedOn, selectedMethod]);

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

  // FASE 3.2: Handler functions for DualValuationLayout
  const handleMyCalculationChange = (field: string, value: number | boolean) => {
    setMyCalculation(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = async () => {
    if (!selectedStock?.symbol) return;

    try {
      toast({
        title: "Calculating...",
        description: "Computing custom intrinsic value",
      });

      // Call backend API to calculate with custom values
      const response = await fetch(`/api/iv/${normalizedSymbol}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          based_on: basedOn,
          operating_cf: myCalculation.operatingCF,
          total_debt: myCalculation.totalDebt,
          cash: myCalculation.cash,
          discount_rate: myCalculation.discountRate / 100,
          shares: myCalculation.shares,
          growth_1_5: myCalculation.growth_1_5 / 100,
          growth_6_10: myCalculation.growth_6_10 / 100,
          growth_11_20: myCalculation.growth_11_20 / 100,
          deduct_debt: myCalculation.deductDebt,
          add_cash: myCalculation.addCash,
        }),
      });

      if (!response.ok) {
        throw new Error('Calculation failed');
      }

      const result = await response.json();
      const newIV = result.iv;
      const newPremium = ((myCalculation.stockPrice - newIV) / newIV) * 100;

      setMyCalculation(prev => ({
        ...prev,
        iv: newIV,
        premium: newPremium,
      }));

      toast({
        title: "Calculation complete",
        description: `New intrinsic value: $${newIV.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Calculate error:', error);
      toast({
        variant: "destructive",
        title: "Calculation failed",
        description: "Please check your inputs and try again",
      });
    }
  };

  const handleSave = () => {
    if (!selectedStock?.symbol) return;

    try {
      const storageKey = `alfalyzer_${normalizedSymbol}_assumptions`;
      localStorage.setItem(storageKey, JSON.stringify(myCalculation));

      toast({
        title: "Assumptions saved",
        description: `Saved for ${selectedStock.symbol}`,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Could not save to localStorage",
      });
    }
  };

  const handleLoad = () => {
    if (!selectedStock?.symbol) return;

    try {
      const storageKey = `alfalyzer_${normalizedSymbol}_assumptions`;
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        const loadedData = JSON.parse(saved);
        setMyCalculation(loadedData);

        toast({
          title: "Assumptions loaded",
          description: `Loaded for ${selectedStock.symbol}`,
        });
      } else {
        toast({
          title: "No saved data",
          description: "No assumptions found for this stock",
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      toast({
        variant: "destructive",
        title: "Load failed",
        description: "Could not load from localStorage",
      });
    }
  };

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
                      {selectedStock.sector && <Badge variant="secondary">{selectedStock.sector}</Badge>}
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

            {/* AlfaValue™ Header - New System */}
            <AlfaValueHeader ticker={normalizedSymbol} />

            {/* FASE 3: Valuation Methods Comparison (10+ methods) */}
            {alfaValueData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle>Compare All Valuation Methods</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          See how 10+ different valuation models assess {selectedStock.symbol}'s fair value
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={showAllMethods ? "default" : "outline"}
                      onClick={() => setShowAllMethods(!showAllMethods)}
                      className={showAllMethods ? 'bg-teya-green hover:bg-teya-green-dark text-black' : ''}
                    >
                      {showAllMethods ? (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Hide Methods
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Show All Methods
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {showAllMethods && (
                  <CardContent className="space-y-6">
                    {/* FASE 3.2: 15 Valuation Methods Dropdown */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <Label htmlFor="method-selector" className="text-sm font-medium min-w-[80px]">
                        Method:
                      </Label>
                      <Select
                        value={selectedMethod}
                        onValueChange={(value) => setSelectedMethod(value)}
                      >
                        <SelectTrigger id="method-selector" className="flex-1">
                          <SelectValue placeholder="Select valuation method" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px]">
                          <SelectItem value="alfavalue">AlfaValue™ (Proprietary)</SelectItem>

                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground mt-2">DCF Models</SelectLabel>
                            <SelectItem value="dcf-20-fcf">DCF-20 Free Cash Flow</SelectItem>
                            <SelectItem value="dcf-20-ocf">DCF-20 Operating Cash Flow</SelectItem>
                            <SelectItem value="dcf-20-ni">DCF-20 Net Income</SelectItem>
                            <SelectItem value="dni-20">DNI-20 Net Income</SelectItem>
                            <SelectItem value="dfcf-terminal">DFCF Terminal (FMP)</SelectItem>
                            <SelectItem value="dfcf-20">DFCF-20 (FMP)</SelectItem>
                          </SelectGroup>

                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground mt-2">Historical Multiples</SelectLabel>
                            <SelectItem value="pe-mean">P/E Mean 5Y</SelectItem>
                            <SelectItem value="pe-mean-nri">P/E Mean 5Y (without NRI)</SelectItem>
                            <SelectItem value="ps-mean">P/S Mean 5Y</SelectItem>
                            <SelectItem value="pb-mean">P/B Mean 5Y</SelectItem>
                            <SelectItem value="pb-mean-nri">P/B Mean 5Y (without NRI)</SelectItem>
                          </SelectGroup>

                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground mt-2">Growth-Adjusted</SelectLabel>
                            <SelectItem value="peg">PEG Ratio</SelectItem>
                            <SelectItem value="psg">PSG Ratio</SelectItem>
                          </SelectGroup>

                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground mt-2">Custom</SelectLabel>
                            <SelectItem value="custom">Custom (DCF with selectable base)</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Badge variant="outline" className="hidden sm:flex">
                        <Info className="h-3 w-3 mr-1" />
                        15 Methods
                      </Badge>
                    </div>

                    {/* ONDA 3.2: Custom Method "Based On" Selector */}
                    {selectedMethod === 'custom' && (
                      <CustomMethodSelector
                        value={customBasedOn}
                        onChange={setCustomBasedOn}
                      />
                    )}

                    {/* Based On selector - only show for DCF methods */}
                    {selectedMethod.includes('dcf') && (
                      <div className="flex items-center gap-4">
                        <Label htmlFor="based-on-selector" className="text-sm font-medium min-w-[80px]">
                          Based On:
                        </Label>
                        <Select
                          value={basedOn}
                          onValueChange={(value) => setBasedOn(value as BasedOn)}
                        >
                          <SelectTrigger id="based-on-selector" className="w-[200px]">
                            <SelectValue placeholder="Select base metric" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fcf">Free Cash Flow (FCF)</SelectItem>
                            <SelectItem value="ocf">Operating Cash Flow (OCF)</SelectItem>
                            <SelectItem value="ni">Net Income (NI)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className="ml-auto">
                          <Info className="h-3 w-3 mr-1" />
                          Changes DCF calculations basis
                        </Badge>
                      </div>
                    )}

                    {/* Loading State */}
                    {isLoadingValuationChart && (
                      <div className="text-center py-8">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 mx-auto mb-4"
                        >
                          <Calculator className="w-full h-full text-primary" />
                        </motion.div>
                        <p className="text-muted-foreground">Loading valuation methods...</p>
                      </div>
                    )}

                    {/* Error State */}
                    {valuationChartError && (
                      <div className="text-center py-8 text-red-500">
                        <p>Failed to load valuation methods</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {valuationChartError instanceof Error ? valuationChartError.message : 'Unknown error'}
                        </p>
                      </div>
                    )}

                    {/* FASE 3.2: Dual Column Layout (Auto vs My Calculation) */}
                    {valuationChartData && alfaValueData && (() => {
                      // ONDA 3.2: Use effective method ID (maps "custom" to actual DCF method)
                      const effectiveMethodId = getEffectiveMethodId(selectedMethod);
                      const autoMethod = valuationChartData.methods.find(m => m.method_id === effectiveMethodId);
                      const price = valuationChartData.price;
                      const iv = autoMethod?.iv || alfaValueData.iv;
                      const premium = ((price - iv) / iv) * 100;

                      // Simplified: autoCalculation only needs summary data (gauges use these)
                      const autoCalculation: AutoCalculation = {
                        stockPrice: price,
                        iv: iv,
                        premium: premium,
                        // These fields are no longer used (replaced by mappedInputs)
                        operatingCF: 0,
                        totalDebt: 0,
                        cash: 0,
                        discountRate: 0,
                        shares: 0,
                        growth_1_5: 0,
                        growth_6_10: 0,
                        growth_11_20: 0,
                      };

                      return (
                        <DualValuationLayout
                          method={selectedMethod}
                          autoCalculation={autoCalculation}
                          myCalculation={myCalculation}
                          mappedInputs={mappedInputs}
                          onMyCalculationChange={handleMyCalculationChange}
                          onCalculate={handleCalculate}
                          onSave={handleSave}
                          onLoad={handleLoad}
                        />
                      );
                    })()}

                    {/* Horizontal Bar Chart (full width) - Highlight selected method */}
                    {valuationChartData && (
                      <ValuationMethodsChart
                        methods={valuationChartData.methods}
                        currentPrice={valuationChartData.price}
                        highlightMethod={selectedMethod}
                      />
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Educational: How is Intrinsic Value Calculated? */}
            {alfaValueData && (
              <Card className="border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    How is Intrinsic Value Calculated?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground">
                      AlfaValue™ uses a 20-year Discounted Cash Flow (DCF) model to calculate intrinsic value.
                      The model projects future cash flows and discounts them back to present value using a
                      company-specific discount rate (WACC).
                    </p>
                  </div>

                  {/* Step-by-step breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Step 1: Project Cash Flows */}
                    <div className="p-4 border rounded-lg bg-background/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-teya-green/10 flex items-center justify-center text-teya-green font-bold">
                          1
                        </div>
                        <h4 className="font-semibold">Project Cash Flows</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Starting FCF:</span>
                          <span className="font-medium">${alfaValueData.inputs.fcf_ttm_musd.toFixed(0)}M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Years 1-5 Growth:</span>
                          <span className="font-medium text-green-600">
                            {(alfaValueData.assumptions.g_1_5 * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Years 6-10 Growth:</span>
                          <span className="font-medium text-green-600">
                            {(alfaValueData.assumptions.g_6_10 * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Years 11-20 Growth:</span>
                          <span className="font-medium text-green-600">
                            {(alfaValueData.assumptions.g_11_20 * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Discount to Present Value */}
                    <div className="p-4 border rounded-lg bg-background/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
                          2
                        </div>
                        <h4 className="font-semibold">Discount to Present Value</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Risk-Free Rate:</span>
                          <span className="font-medium">{(alfaValueData.assumptions.rf * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Beta:</span>
                          <span className="font-medium">{alfaValueData.assumptions.beta.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Market Risk Premium:</span>
                          <span className="font-medium">{(alfaValueData.assumptions.mrp * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-medium">WACC (Discount Rate):</span>
                          <span className="font-bold text-blue-600">
                            {(alfaValueData.assumptions.discount_rate * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Adjust for Balance Sheet */}
                    <div className="p-4 border rounded-lg bg-background/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold">
                          3
                        </div>
                        <h4 className="font-semibold">Adjust for Balance Sheet</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Enterprise Value:</span>
                          <span className="font-medium">Calculated</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>+ Cash:</span>
                          <span className="font-medium">${alfaValueData.inputs.cash_musd.toFixed(0)}M</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>- Debt:</span>
                          <span className="font-medium">${alfaValueData.inputs.debt_musd.toFixed(0)}M</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-medium">÷ Shares:</span>
                          <span className="font-bold">{alfaValueData.inputs.shares_m.toFixed(0)}M</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-bold text-teya-green">Intrinsic Value/Share:</span>
                          <span className="font-bold text-teya-green text-lg">
                            {formatCurrency(alfaValueData.iv)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Formula Display */}
                  <div className="p-4 bg-secondary/30 rounded-lg border border-secondary">
                    <h4 className="font-semibold mb-2 text-sm">DCF Formula</h4>
                    <div className="font-mono text-xs text-muted-foreground overflow-x-auto">
                      IV = Σ(FCF<sub>t</sub> / (1 + WACC)<sup>t</sup>) + (Cash - Debt) / Shares
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legacy: Official Intrinsic Value reference + Scenario (only show if AlfaValue not available) */}
            {!alfaValueData && (
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
            )}

            {/* Legacy: Presets (simple) - Only show if using legacy system */}
            {!alfaValueData && (
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
            )}

            {/* Calculation Results - Show AlfaValue visualization or legacy calculation */}
            {alfaValueData ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AlfaValue Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-teya-green" />
                      Valuation Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-secondary/30 rounded-lg">
                          <div className="text-sm text-muted-foreground">Current Price</div>
                          <div className="text-2xl font-bold">{formatCurrency(alfaValueData.price)}</div>
                        </div>
                        <div className="p-4 bg-teya-green/10 rounded-lg">
                          <div className="text-sm text-muted-foreground">Intrinsic Value</div>
                          <div className="text-2xl font-bold text-teya-green">{formatCurrency(alfaValueData.iv)}</div>
                        </div>
                      </div>

                      <div className={cn(
                        "text-center p-4 rounded-lg",
                        alfaValueData.status === 'undervalued'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : alfaValueData.status === 'overvalued'
                          ? 'bg-red-500/10 border border-red-500/20'
                          : 'bg-gray-500/10 border border-gray-500/20'
                      )}>
                        <div className={cn(
                          "text-2xl font-bold",
                          alfaValueData.status === 'undervalued' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatPercentage(Math.abs(alfaValueData.discount_pct))}
                        </div>
                        <div className="text-sm">
                          {alfaValueData.status === 'undervalued' ? 'Discount to Fair Value' : 'Premium to Fair Value'}
                        </div>
                        <Badge className="mt-2" variant={alfaValueData.status === 'undervalued' ? 'default' : 'secondary'}>
                          {alfaValueData.status === 'undervalued' ? (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Undervalued
                            </>
                          ) : alfaValueData.status === 'overvalued' ? (
                            <>
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Overvalued
                            </>
                          ) : (
                            <>
                              <Minus className="h-3 w-3 mr-1" />
                              Fairly Priced
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Confidence & Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-500" />
                      Analysis Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Confidence Level:</span>
                        <Badge variant={
                          alfaValueData.confidence === 'HIGH' ? 'default' :
                          alfaValueData.confidence === 'MED' ? 'secondary' : 'outline'
                        }>
                          {alfaValueData.confidence}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Sector Growth (Mid):</span>
                        <span className="font-medium">{(alfaValueData.meta.g_sector_mid * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Growth Source:</span>
                        <span className="font-medium capitalize">{alfaValueData.meta.g_sector_source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Region:</span>
                        <span className="font-medium">{alfaValueData.meta.region}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Terminal Growth (Regional):</span>
                        <span className="font-medium">{(alfaValueData.meta.g_term_region * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t">
                        <span className="text-sm text-muted-foreground">Calculation Date:</span>
                        <span className="font-medium">{new Date(alfaValueData.as_of).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : isCalculating ? (
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
