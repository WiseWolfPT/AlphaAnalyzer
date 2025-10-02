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
  Wifi,
  Download,
  FileText
} from "lucide-react";
import { useCachedQuote } from "@/hooks/use-cache-data";
import { getStockChangePercent, isStockPositive } from "@/lib/stock-data-normalizer";
import { MiniChart } from "@/components/stock/mini-charts";
import { useRealtimeQuote } from "@/hooks/use-realtime-quotes";
import { useQuery } from '@tanstack/react-query';
import { fetchIntrinsicValueData, normalizeIntrinsicValue } from '@/lib/intrinsic-value';

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
  // Use cached prices by default; realtime can be toggled on
  const [useRealtime, setUseRealtime] = useState(false);

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

  // Export functions for CSV and PDF
  const exportToCSV = () => {
    if (comparisonStocks.length === 0) return;

    const headers = ['Symbol', 'Current Price', 'Change %', 'Intrinsic Value', 'Valuation', 'Upside/Downside %'];
    const csvContent = [
      headers.join(','),
      ...comparisonStocks.map(stock => {
        const symbol = stock.symbol;
        // Extract data from DOM elements or use cached quote data
        const cardElement = document.querySelector(`[data-stock-symbol="${symbol}"]`);
        const priceElement = cardElement?.querySelector('[data-price]');
        const changeElement = cardElement?.querySelector('[data-change]');
        const ivElement = cardElement?.querySelector('[data-intrinsic-value]');
        const valuationElement = cardElement?.querySelector('[data-valuation]');
        const diffElement = cardElement?.querySelector('[data-difference]');

        const price = priceElement?.textContent || 'N/A';
        const changePercent = changeElement?.textContent || 'N/A';
        const intrinsicValue = ivElement?.textContent || 'N/A';
        const valuation = valuationElement?.textContent || 'N/A';
        const difference = diffElement?.textContent || 'N/A';

        // Escape commas in values for CSV
        const escapeCSV = (value: string) => value.includes(',') ? `"${value}"` : value;

        return [
          escapeCSV(symbol),
          escapeCSV(price),
          escapeCSV(changePercent),
          escapeCSV(intrinsicValue),
          escapeCSV(valuation),
          escapeCSV(difference)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    // Basic PDF export - uses browser's print functionality
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate PDF table rows with actual data
    const tableRows = comparisonStocks.map(stock => {
      const symbol = stock.symbol;
      const cardElement = document.querySelector(`[data-stock-symbol="${symbol}"]`);
      const priceElement = cardElement?.querySelector('[data-price]');
      const changeElement = cardElement?.querySelector('[data-change]');
      const ivElement = cardElement?.querySelector('[data-intrinsic-value]');
      const valuationElement = cardElement?.querySelector('[data-valuation]');
      const diffElement = cardElement?.querySelector('[data-difference]');

      const price = priceElement?.textContent || 'N/A';
      const changePercent = changeElement?.textContent || 'N/A';
      const intrinsicValue = ivElement?.textContent || 'N/A';
      const valuation = valuationElement?.textContent || 'N/A';
      const difference = diffElement?.textContent || 'N/A';

      return `
        <tr>
          <td><strong>${symbol}</strong></td>
          <td>${price}</td>
          <td>${changePercent}</td>
          <td>${intrinsicValue}</td>
          <td>${valuation}</td>
          <td>${difference}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Comparison Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          h1 {
            color: #059669;
            border-bottom: 3px solid #059669;
            padding-bottom: 10px;
          }
          .header-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          th {
            background-color: #059669;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            border: 1px solid #e0e0e0;
            padding: 12px;
            text-align: left;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f0f9f5;
          }
          .generated {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            text-align: center;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Stock Comparison Report</h1>
        <div class="header-info">
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p><strong>Symbols Compared:</strong> ${comparisonStocks.map(s => s.symbol).join(', ')}</p>
          <p><strong>Total Stocks:</strong> ${comparisonStocks.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Current Price</th>
              <th>Change %</th>
              <th>Intrinsic Value</th>
              <th>Valuation</th>
              <th>Upside/Downside %</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="generated">
          <strong>Generated by Alfalyzer</strong><br>
          Professional Stock Analysis Platform<br>
          <em>Data sourced from real-time market feeds</em>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
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

        {/* Export and Add Stock Controls */}
        <div className="flex items-center gap-2">
          {/* Export Buttons */}
          {comparisonStocks.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                title="Export comparison to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                title="Export comparison to PDF"
              >
                <FileText className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">PDF</span>
              </Button>
            </>
          )}

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
  // Cache-first quote to avoid exhausting external API quotas
  const { data: cachedQuote, isLoading: stockLoading } = useCachedQuote(symbol);
  const { data: intrinsicData, isLoading: ivLoading } = useQuery({
    queryKey: ['intrinsicValue', symbol],
    queryFn: () => fetchIntrinsicValueData(symbol),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: Boolean(symbol),
  });
  const intrinsicValue = normalizeIntrinsicValue(intrinsicData);
  const { quote: realtimeQuote, isConnected } = useRealtimeQuote(symbol, {
    enabled: useRealtime
  });
  
  const calculations = useMemo(() => {
    if (!cachedQuote?.data && !realtimeQuote) return null;
    
    // Use realtime data if available, otherwise fall back to cached quote
    const currentPrice = realtimeQuote?.price || cachedQuote?.data?.price || 0;
    const changePercent = realtimeQuote?.change_percent ?? (cachedQuote?.data?.changePercent ?? 0);
    const isPositive = realtimeQuote ? (realtimeQuote.change >= 0) : ((cachedQuote?.data?.changePercent ?? 0) >= 0);
    
    const hasIntrinsicValue = typeof intrinsicValue === 'number' && intrinsicValue !== 0;
    const valuationDiff = hasIntrinsicValue
      ? ((currentPrice - intrinsicValue) / intrinsicValue) * 100
      : null;
    
    const isUndervalued = valuationDiff !== null ? valuationDiff < 0 : false;
    
    return {
      currentPrice,
      changePercent,
      isPositive,
      intrinsicValue,
      valuationDiff,
      isUndervalued
    };
  }, [cachedQuote, intrinsicValue, realtimeQuote]);

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

  if (!calculations) {
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
    <Card className="h-[400px] relative group" data-stock-symbol={symbol}>
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
            <p className="text-sm text-muted-foreground truncate">Company</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Price */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" data-price>
              ${calculations.currentPrice?.toFixed(2) || '0.00'}
            </span>
            <Badge
              variant={calculations.isPositive ? "default" : "secondary"}
              className={cn(
                calculations.isPositive
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              )}
              data-change
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
            ) : typeof intrinsicValue === 'number' ? (
              <span className="text-sm font-bold text-teya-green" data-intrinsic-value>
                ${intrinsicValue.toFixed(2)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground" data-intrinsic-value>N/A</span>
            )}
          </div>
          
          {typeof calculations.intrinsicValue === 'number' && calculations.valuationDiff !== null && (
            <div className="flex items-center justify-between">
              <Badge
                variant={calculations.isUndervalued ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  calculations.isUndervalued
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-600"
                )}
                data-valuation
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
              <span
                className={cn(
                  "text-xs font-medium",
                  calculations.isUndervalued ? "text-green-600" : "text-red-600"
                )}
                data-difference
              >
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
            <MiniChart stock={{ symbol, price: String(calculations.currentPrice ?? 0) } as any} type="price" height={60} />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="font-medium">{cachedQuote?.data?.marketCap ? `$${Number(cachedQuote.data.marketCap).toLocaleString()}` : "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">P/E Ratio</span>
            <span className="font-medium">{cachedQuote?.data?.pe ?? "N/A"}</span>
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
  const { data: cachedQuote } = useCachedQuote(symbol);
  const { data: intrinsicData } = useQuery({
    queryKey: ['intrinsicValue', symbol],
    queryFn: () => fetchIntrinsicValueData(symbol),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: Boolean(symbol),
  });
  const intrinsicValue = normalizeIntrinsicValue(intrinsicData);
  
  const currentPrice = cachedQuote?.data?.price ?? 0;
  const hasIntrinsicValue = typeof intrinsicValue === 'number' && intrinsicValue !== 0;
  const valuationDiff = hasIntrinsicValue
    ? ((currentPrice - intrinsicValue) / intrinsicValue) * 100
    : null;
  
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="font-semibold w-16">{symbol}</span>
        <div className="text-sm space-x-4">
          <span>Preço: <span className="font-medium">${(currentPrice ?? 0).toFixed(2)}</span></span>
          <span>IV: <span className="font-medium text-teya-green">
            {typeof intrinsicValue === 'number' ? `$${intrinsicValue.toFixed(2)}` : "N/A"}
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
  const { data: cachedQuote } = useCachedQuote(symbol);
  
  const changePercent = cachedQuote?.data?.changePercent ?? 0;
  const isPositive = (changePercent ?? 0) >= 0;
  
  return (
    <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="font-semibold w-16">{symbol}</span>
        <div className="text-sm">
          Market Cap: <span className="font-medium">{cachedQuote?.data?.marketCap ? `$${Number(cachedQuote.data.marketCap).toLocaleString()}` : "N/A"}</span>
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
