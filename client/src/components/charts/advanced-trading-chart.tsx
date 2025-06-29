import { useRef, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Volume2, BarChart3, Settings, Fullscreen, Download, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Mock chart data since we can't import lightweight-charts directly
interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface LineData {
  time: string;
  value: number;
}

interface AdvancedTradingChartProps {
  symbol: string;
  data?: CandlestickData[];
  height?: number;
  className?: string;
  onTimeframeChange?: (timeframe: string) => void;
  showVolume?: boolean;
  showOrderBook?: boolean;
}

// Generate mock data for demonstration
function generateMockData(days: number = 100): CandlestickData[] {
  const data: CandlestickData[] = [];
  let basePrice = 150;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    const open = basePrice + (Math.random() - 0.5) * 2;
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility * basePrice;
    const close = Math.max(0.01, open + change);
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;
    const volume = Math.floor(Math.random() * 1000000) + 500000;
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });
    
    basePrice = close;
  }
  
  return data;
}

// Simulate TradingView Lightweight Charts implementation
function useLightweightChart(containerRef: React.RefObject<HTMLDivElement>, data: CandlestickData[]) {
  const [chart, setChart] = useState<any>(null);
  const [series, setSeries] = useState<any>(null);
  
  useEffect(() => {
    if (!containerRef.current || !data.length) return;
    
    // This would be the actual lightweight-charts implementation:
    /*
    import { createChart, ColorType } from 'lightweight-charts';
    
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgb(120, 123, 134)',
      },
      grid: {
        vertLines: { color: 'rgba(120, 123, 134, 0.2)' },
        horzLines: { color: 'rgba(120, 123, 134, 0.2)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: 'rgba(120, 123, 134, 0.2)',
      },
      rightPriceScale: {
        borderColor: 'rgba(120, 123, 134, 0.2)',
      },
    });
    
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    
    candlestickSeries.setData(data);
    chart.timeScale().fitContent();
    */
    
    // Mock implementation for demonstration
    const mockChart = {
      timeScale: () => ({
        fitContent: () => {},
        scrollToRealTime: () => {}
      }),
      remove: () => {}
    };
    
    const mockSeries = {
      setData: (newData: any) => {},
      update: (newPoint: any) => {}
    };
    
    setChart(mockChart);
    setSeries(mockSeries);
    
    // Create a visual representation using Canvas or SVG
    const canvas = document.createElement('canvas');
    canvas.width = containerRef.current.clientWidth;
    canvas.height = containerRef.current.clientHeight;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    containerRef.current.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw a simple candlestick chart representation
      const padding = 40;
      const chartWidth = canvas.width - padding * 2;
      const chartHeight = canvas.height - padding * 2;
      
      const prices = data.map(d => [d.low, d.high]).flat();
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;
      
      ctx.strokeStyle = 'rgba(120, 123, 134, 0.2)';
      ctx.lineWidth = 1;
      
      // Draw grid
      for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
      }
      
      // Draw candlesticks
      const candleWidth = chartWidth / data.length * 0.8;
      
      data.forEach((candle, index) => {
        const x = padding + (chartWidth / data.length) * index + candleWidth / 2;
        const openY = padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
        const closeY = padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;
        const highY = padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
        const lowY = padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;
        
        const isUp = candle.close > candle.open;
        ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
        ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
        
        // Draw wick
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        
        // Draw body
        const bodyHeight = Math.abs(closeY - openY);
        const bodyY = Math.min(openY, closeY);
        
        if (isUp) {
          ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        } else {
          ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        }
      });
    }
    
    return () => {
      if (containerRef.current && canvas) {
        containerRef.current.removeChild(canvas);
      }
    };
  }, [data, containerRef]);
  
  return { chart, series };
}

export function AdvancedTradingChart({
  symbol,
  data,
  height = 400,
  className,
  onTimeframeChange,
  showVolume = true,
  showOrderBook = false
}: AdvancedTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  
  const [chartData, setChartData] = useState<CandlestickData[]>(data || generateMockData());
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { chart: mainChart } = useLightweightChart(chartContainerRef, chartData);
  const { chart: volumeChart } = useLightweightChart(volumeContainerRef, chartData);
  
  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (chartData.length > 0) {
        const lastCandle = chartData[chartData.length - 1];
        const newPrice = lastCandle.close + (Math.random() - 0.5) * 2;
        
        setChartData(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...lastCandle,
            close: parseFloat(newPrice.toFixed(2)),
            high: Math.max(lastCandle.high, newPrice),
            low: Math.min(lastCandle.low, newPrice),
            volume: Math.floor(Math.random() * 1000000) + 500000
          };
          return updated;
        });
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [chartData]);
  
  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    onTimeframeChange?.(newTimeframe);
    
    // Generate new data based on timeframe
    const daysMap: Record<string, number> = {
      '1H': 1,
      '4H': 7,
      '1D': 30,
      '1W': 180,
      '1M': 365
    };
    
    setChartData(generateMockData(daysMap[newTimeframe] || 30));
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };
  
  const formatVolume = (volume: number) => {
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };
  
  const currentCandle = chartData[chartData.length - 1];
  const prevCandle = chartData[chartData.length - 2];
  const priceChange = currentCandle && prevCandle ? currentCandle.close - prevCandle.close : 0;
  const priceChangePercent = prevCandle ? (priceChange / prevCandle.close) * 100 : 0;
  
  return (
    <Card className={cn("w-full", isFullscreen && "fixed inset-0 z-50", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {symbol}
          </CardTitle>
          
          {currentCandle && (
            <div className="flex items-center gap-3 text-sm">
              <div className="font-semibold">
                {formatPrice(currentCandle.close)}
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "flex items-center gap-1",
                  priceChange >= 0 ? "text-positive" : "text-negative"
                )}
              >
                {priceChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {priceChange >= 0 ? '+' : ''}
                {formatPrice(priceChange)} ({priceChangePercent.toFixed(2)}%)
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1">
            {['1H', '4H', '1D', '1W', '1M'].map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleTimeframeChange(tf)}
                className="h-8 px-2 text-xs"
              >
                {tf}
              </Button>
            ))}
          </div>
          
          {/* Chart Type Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <BarChart2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setChartType('candlestick')}>
                Candlestick
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChartType('line')}>
                Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChartType('area')}>
                Area
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Fullscreen className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem>
                Chart Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mx-6 mb-4">
            <TabsTrigger value="chart">Price Chart</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart" className="space-y-4 px-6 pb-6">
            {/* Main Chart */}
            <div className="relative">
              <div 
                ref={chartContainerRef} 
                style={{ height: `${height}px` }}
                className="w-full border border-border rounded-lg bg-card"
              />
              
              {/* Real-time indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
                <div className="w-2 h-2 bg-positive rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
            
            {/* OHLC Values */}
            {currentCandle && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Open</div>
                  <div className="font-semibold">{formatPrice(currentCandle.open)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">High</div>
                  <div className="font-semibold text-positive">{formatPrice(currentCandle.high)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Low</div>
                  <div className="font-semibold text-negative">{formatPrice(currentCandle.low)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Close</div>
                  <div className="font-semibold">{formatPrice(currentCandle.close)}</div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="volume" className="space-y-4 px-6 pb-6">
            <div 
              ref={volumeContainerRef} 
              style={{ height: `${height}px` }}
              className="w-full border border-border rounded-lg bg-card"
            />
            
            {currentCandle && (
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Current Volume</span>
                </div>
                <div className="font-semibold">
                  {formatVolume(currentCandle.volume || 0)}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-4 px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Technical Indicators</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>RSI (14)</span>
                    <span className="font-medium">67.43</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MACD</span>
                    <span className="font-medium text-positive">+2.14</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moving Avg (50)</span>
                    <span className="font-medium">{formatPrice(currentCandle?.close * 0.98 || 0)}</span>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Market Sentiment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Bullish Signals</span>
                    <span className="font-medium text-positive">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bearish Signals</span>
                    <span className="font-medium text-negative">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overall Rating</span>
                    <Badge className="bg-positive text-white">Buy</Badge>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}