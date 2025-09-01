/**
 * COMPARE PAGE - Stock Comparison Tool
 * Conforme especificado no plan.md Fase 5.2:
 * - Comparar até 4 ações lado a lado
 * - Mesmos gráficos para todas
 * - Foco em: Preço vs IV, Receitas, Lucros
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  X, 
  GitCompare, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  DollarSign,
  BarChart3,
  Target,
  Search,
  Wifi
} from "lucide-react";
import { useStock, useIntrinsicValue } from "@/hooks/use-enhanced-stocks";
import { useNormalizedStock, getStockPrice, getStockChangePercent, isStockPositive } from "@/lib/stock-data-normalizer";
import { MiniChart } from "@/components/stock/mini-charts";
import { useRealtimeQuote } from "@/hooks/use-realtime-quotes";

interface ComparisonStock {
  symbol: string;
  data?: any;
  intrinsicValue?: number;
  isLoading?: boolean;
}

export default function ComparePage() {
  const [comparisonStocks, setComparisonStocks] = useState<ComparisonStock[]>([
    { symbol: "AAPL" },
    { symbol: "MSFT" }
  ]);
  const [searchSymbol, setSearchSymbol] = useState("");
  const [useRealtime, setUseRealtime] = useState(true);

  const addStock = () => {
    if (searchSymbol.trim() && comparisonStocks.length < 4) {
      const symbol = searchSymbol.trim().toUpperCase();
      if (!comparisonStocks.find(s => s.symbol === symbol)) {
        setComparisonStocks([...comparisonStocks, { symbol }]);
        setSearchSymbol("");
      }
    }
  };

  const removeStock = (symbolToRemove: string) => {
    setComparisonStocks(comparisonStocks.filter(s => s.symbol !== symbolToRemove));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teya-green/20 rounded-lg">
            <GitCompare className="h-6 w-6 text-teya-green" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Compare Stocks</h1>
            <p className="text-muted-foreground">
              Analise até 4 ações lado a lado com foco em valor intrínseco
            </p>
          </div>
        </div>

        {/* Add Stock Input */}
        <div className="flex items-center gap-2">
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
          
          <Input
            placeholder="Símbolo (ex: TSLA)"
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addStock()}
            className="w-40"
            disabled={comparisonStocks.length >= 4}
          />
          <Button 
            onClick={addStock}
            disabled={!searchSymbol.trim() || comparisonStocks.length >= 4}
            className="bg-teya-green text-teya-dark hover:bg-teya-green/90"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comparison Grid */}
      {comparisonStocks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {comparisonStocks.map((stockItem) => (
            <ComparisonCard
              key={stockItem.symbol}
              symbol={stockItem.symbol}
              onRemove={() => removeStock(stockItem.symbol)}
              canRemove={comparisonStocks.length > 1}
              useRealtime={useRealtime}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <GitCompare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma ação para comparar</h3>
          <p className="text-muted-foreground">
            Adicione pelo menos 2 ações para começar a comparação
          </p>
        </Card>
      )}

      {/* Side-by-side Charts Section */}
      {comparisonStocks.length >= 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-teya-green" />
            Análise Comparativa
          </h2>
          
          <ComparisonCharts stocks={comparisonStocks} />
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ 
  symbol, 
  onRemove, 
  canRemove,
  useRealtime 
}: { 
  symbol: string; 
  onRemove: () => void;
  canRemove: boolean;
  useRealtime: boolean;
}) {
  const { data: rawStock, isLoading: stockLoading } = useStock(symbol);
  const { data: intrinsicValue, isLoading: ivLoading } = useIntrinsicValue(symbol);
  const { quote: realtimeQuote, isConnected } = useRealtimeQuote(symbol, {
    enabled: useRealtime
  });
  
  const stock = useNormalizedStock(rawStock);
  
  const calculations = useMemo(() => {
    if (!stock && !realtimeQuote) return null;
    
    // Use realtime data if available, otherwise fall back to stock data
    const currentPrice = realtimeQuote?.price || getStockPrice(stock);
    const changePercent = realtimeQuote?.change_percent || getStockChangePercent(stock);
    const isPositive = realtimeQuote ? realtimeQuote.change >= 0 : isStockPositive(stock);
    
    const valuationDiff = intrinsicValue ? 
      ((currentPrice - intrinsicValue) / intrinsicValue) * 100 : 
      null;
    
    const isUndervalued = valuationDiff ? valuationDiff < 0 : false;
    
    return {
      currentPrice,
      changePercent,
      isPositive,
      intrinsicValue,
      valuationDiff,
      isUndervalued
    };
  }, [stock, intrinsicValue, realtimeQuote]);

  if (stockLoading) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teya-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando {symbol}...</p>
        </div>
      </Card>
    );
  }

  if (!stock || !calculations) {
    return (
      <Card className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <X className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Erro ao carregar {symbol}</p>
          {canRemove && (
            <Button variant="outline" size="sm" onClick={onRemove} className="mt-2">
              Remover
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[400px] relative group">
      {/* Realtime indicator */}
      {useRealtime && isConnected && realtimeQuote && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" 
                title="Dados em tempo real" />
        </div>
      )}
      
      {/* Remove button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teya-green/20 rounded-lg flex items-center justify-center">
            <span className="font-bold text-teya-green">{symbol.charAt(0)}</span>
          </div>
          <div>
            <CardTitle className="text-lg">{symbol}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {stock.name || "Company Name"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Price */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">${calculations.currentPrice?.toFixed(2) || '0.00'}</span>
            <Badge 
              variant={calculations.isPositive ? "default" : "secondary"}
              className={cn(
                calculations.isPositive 
                  ? "bg-green-500/10 text-green-600" 
                  : "bg-red-500/10 text-red-600"
              )}
            >
              {calculations.isPositive ? '+' : ''}{calculations.changePercent?.toFixed(1) || '0.0'}%
            </Badge>
          </div>
        </div>

        {/* Intrinsic Value */}
        <div className="bg-teya-green/5 border border-teya-green/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Calculator className="h-3 w-3 text-teya-green" />
              <span className="text-xs font-medium">Valor Intrínseco</span>
            </div>
            {ivLoading ? (
              <div className="w-4 h-4 border border-teya-green border-t-transparent rounded-full animate-spin" />
            ) : intrinsicValue !== null && intrinsicValue !== undefined && typeof intrinsicValue === 'number' ? (
              <span className="text-sm font-bold text-teya-green">
                ${intrinsicValue.toFixed(2)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">N/A</span>
            )}
          </div>
          
          {calculations.intrinsicValue && calculations.valuationDiff !== null && (
            <div className="flex items-center justify-between">
              <Badge 
                variant={calculations.isUndervalued ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  calculations.isUndervalued 
                    ? "bg-green-500/10 text-green-600" 
                    : "bg-red-500/10 text-red-600"
                )}
              >
                {calculations.isUndervalued ? (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Subvalorizada
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Sobrevalorizada
                  </>
                )}
              </Badge>
              <span className={cn(
                "text-xs font-medium",
                calculations.isUndervalued ? "text-green-600" : "text-red-600"
              )}>
                {calculations.valuationDiff > 0 ? '+' : ''}{calculations.valuationDiff?.toFixed(1) || '0.0'}%
              </span>
            </div>
          )}
        </div>

        {/* Mini Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Price Trend (1M)</span>
            <BarChart3 className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="h-16 border border-border/50 rounded">
            <MiniChart stock={stock} type="price" height={60} />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="font-medium">{stock.marketCap || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">P/E Ratio</span>
            <span className="font-medium">{stock.pe || "N/A"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonCharts({ stocks }: { stocks: ComparisonStock[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Price vs Intrinsic Value Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teya-green" />
            Preço vs Valor Intrínseco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stocks.map((stockItem) => (
              <PriceVsIVRow key={stockItem.symbol} symbol={stockItem.symbol} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teya-green" />
            Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stocks.map((stockItem) => (
              <PerformanceRow key={stockItem.symbol} symbol={stockItem.symbol} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PriceVsIVRow({ symbol }: { symbol: string }) {
  const { data: rawStock } = useStock(symbol);
  const { data: intrinsicValue } = useIntrinsicValue(symbol);
  const stock = useNormalizedStock(rawStock);
  
  if (!stock) return null;
  
  const currentPrice = getStockPrice(stock);
  const valuationDiff = intrinsicValue ? 
    ((currentPrice - intrinsicValue) / intrinsicValue) * 100 : null;
  
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="font-semibold w-16">{symbol}</span>
        <div className="text-sm space-x-4">
          <span>Preço: <span className="font-medium">${currentPrice?.toFixed(2) || '0.00'}</span></span>
          <span>IV: <span className="font-medium text-teya-green">
            {intrinsicValue && typeof intrinsicValue === 'number' ? `$${intrinsicValue.toFixed(2)}` : "N/A"}
          </span></span>
        </div>
      </div>
      {valuationDiff !== null && (
        <Badge 
          variant={valuationDiff < 0 ? "default" : "secondary"}
          className={cn(
            valuationDiff < 0 
              ? "bg-green-500/10 text-green-600" 
              : "bg-red-500/10 text-red-600"
          )}
        >
          {valuationDiff > 0 ? '+' : ''}{valuationDiff?.toFixed(1) || '0.0'}%
        </Badge>
      )}
    </div>
  );
}

function PerformanceRow({ symbol }: { symbol: string }) {
  const { data: rawStock } = useStock(symbol);
  const stock = useNormalizedStock(rawStock);
  
  if (!stock) return null;
  
  const changePercent = getStockChangePercent(stock);
  const isPositive = isStockPositive(stock);
  
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="font-semibold w-16">{symbol}</span>
        <div className="text-sm">
          Market Cap: <span className="font-medium">{stock.marketCap || "N/A"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={cn(
          "font-semibold",
          isPositive ? "text-green-600" : "text-red-600"
        )}>
          {isPositive ? '+' : ''}{changePercent?.toFixed(2) || '0.00'}%
        </span>
      </div>
    </div>
  );
}