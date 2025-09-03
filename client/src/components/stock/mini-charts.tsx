import { useState, useEffect } from "react";
import { LightweightMiniChart } from "@/components/ui/lightweight-chart";
import { getAPIURL } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import type { MockStock } from "@/lib/mock-api";

interface MiniChartProps {
  stock: MockStock;
  type: 'price' | 'revenue' | 'earnings' | 'volume';
  height?: number;
  className?: string;
}

interface ChartData {
  date: string;
  value: number;
  label?: string;
}

export function MiniChart({ stock, type, height = 40, className }: MiniChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      
      try {
        let chartData: ChartData[] = [];
        
        switch (type) {
          case 'price':
            chartData = await generatePriceData(stock);
            break;
          case 'revenue':
            chartData = await generateRevenueData(stock);
            break;
          case 'earnings':
            chartData = await generateEarningsData(stock);
            break;
          case 'volume':
            chartData = await generateVolumeData(stock);
            break;
        }
        
        setData(chartData);
        
        // Calculate trend
        if (chartData.length >= 2) {
          const first = chartData[0].value;
          const last = chartData[chartData.length - 1].value;
          const change = (last - first) / first;
          
          if (change > 0.02) setTrend('up');
          else if (change < -0.02) setTrend('down');
          else setTrend('neutral');
        }
        
      } catch (error) {
        console.error(`Failed to load ${type} data for ${stock.symbol}:`, error);
        
        // Fallback to generated data
        setData(generateFallbackData(stock, type));
        setTrend('neutral');
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [stock.symbol, type]);

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-muted rounded", className)} style={{ height }}>
        <div className="w-full h-full bg-muted/50 rounded" />
      </div>
    );
  }

  const getChartColor = () => {
    switch (trend) {
      case 'up': return "#10b981"; // green
      case 'down': return "#ef4444"; // red
      default: return "#6b7280"; // gray
    }
  };

  const chartType = type === 'price' ? 'area' : 'line';

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <LightweightMiniChart
        data={data}
        type={chartType as 'line' | 'area'}
        color={getChartColor()}
        height={height}
      />
      
      {/* Trend indicator */}
      <div className={cn(
        "absolute top-1 right-1 w-2 h-2 rounded-full",
        trend === 'up' ? "bg-green-500" : trend === 'down' ? "bg-red-500" : "bg-gray-500"
      )} />
    </div>
  );
}

// Data generation functions
async function generatePriceData(stock: MockStock): Promise<ChartData[]> {
  try {
    // Prefer cached historical data to avoid external API usage
    const endpoint = getAPIURL(`/cache/historical/${encodeURIComponent(stock.symbol)}/1m`);
    const resp = await fetch(endpoint, { credentials: 'include' });
    if (resp.ok) {
      const body = await resp.json();
      const arr = body?.data || body || [];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.slice(-15).map((item: any) => ({
          date: new Date(item.date || item.timestamp || Date.now()).toLocaleDateString(),
          value: Number(item.close ?? item.price ?? item.value ?? 0)
        }));
      }
    }
  } catch (error) {
    console.warn('Failed to get cached historical data, using fallback');
  }
  return generateFallbackData(stock, 'price');
}

async function generateRevenueData(stock: MockStock): Promise<ChartData[]> {
  try {
    // Prefer cached financials (pure read)
    const endpoint = getAPIURL(`/cache/financials/${encodeURIComponent(stock.symbol)}`);
    const resp = await fetch(endpoint, { credentials: 'include' });
    if (resp.ok) {
      const body = await resp.json();
      const fin = body?.data || body || {};
      const series = fin.revenue || fin.quarterlyRevenue || [];
      if (Array.isArray(series) && series.length > 0) {
        return series.slice(-8).map((item: any) => ({
          date: item.quarter || item.date || '',
          value: Number(item.value ?? item.amount ?? 0),
          label: `${item.quarter || item.date}: $${((Number(item.value ?? item.amount ?? 0)) / 1_000).toFixed(1)}B`
        }));
      }
    }
  } catch (error) {
    console.warn('Failed to get cached financials (revenue), using fallback');
  }
  return generateFallbackData(stock, 'revenue');
}

async function generateEarningsData(stock: MockStock): Promise<ChartData[]> {
  try {
    // Prefer cached financials (pure read)
    const endpoint = getAPIURL(`/cache/financials/${encodeURIComponent(stock.symbol)}`);
    const resp = await fetch(endpoint, { credentials: 'include' });
    if (resp.ok) {
      const body = await resp.json();
      const fin = body?.data || body || {};
      const series = fin.eps || fin.quarterlyEPS || [];
      if (Array.isArray(series) && series.length > 0) {
        return series.slice(-8).map((item: any) => ({
          date: item.quarter || item.date || '',
          value: Number(item.value ?? item.amount ?? 0),
          label: `${item.quarter || item.date}: $${Number(item.value ?? item.amount ?? 0).toFixed(2)}`
        }));
      }
    }
  } catch (error) {
    console.warn('Failed to get cached financials (earnings), using fallback');
  }
  return generateFallbackData(stock, 'earnings');
}

async function generateVolumeData(stock: MockStock): Promise<ChartData[]> {
  // Generate mock volume data for the last 15 days
  const data = [];
  const baseVolume = 5000000; // 5M average volume
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const volume = baseVolume + (Math.random() - 0.5) * baseVolume * 0.8;
    
    data.push({
      date: date.toLocaleDateString(),
      value: Math.floor(volume),
      label: `${date.toLocaleDateString()}: ${(volume / 1000000).toFixed(1)}M`
    });
  }
  
  return data;
}

function generateFallbackData(stock: MockStock, type: string): ChartData[] {
  const points = type === 'price' || type === 'volume' ? 15 : 8;
  const data = [];
  
  const baseValues: Record<string, number> = {
    price: parseFloat(stock.price),
    revenue: 80000, // 80B
    earnings: parseFloat(stock.eps || '5'),
    volume: 5000000 // 5M
  };
  
  const baseValue = baseValues[type] || 100;
  let currentValue = baseValue;
  
  for (let i = points - 1; i >= 0; i--) {
    const date = new Date();
    
    if (type === 'price' || type === 'volume') {
      date.setDate(date.getDate() - i);
    } else {
      date.setMonth(date.getMonth() - i);
    }
    
    // Add realistic variation
    const volatility = type === 'price' ? 0.03 : type === 'volume' ? 0.4 : 0.1;
    const change = (Math.random() - 0.5) * volatility * baseValue;
    currentValue = Math.max(currentValue + change, baseValue * (1 - volatility));
    
    const formatDate = () => {
      if (type === 'price' || type === 'volume') {
        return date.toLocaleDateString();
      } else {
        return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      }
    };
    
    data.push({
      date: formatDate(),
      value: parseFloat(currentValue.toFixed(2)),
      label: `${formatDate()}: ${currentValue.toFixed(2)}`
    });
  }
  
  return data;
}

// Mini chart collection component (like Qualtrim's grid)
interface MiniChartGridProps {
  stock: MockStock;
  className?: string;
}

export function MiniChartGrid({ stock, className }: MiniChartGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Price (1M)</div>
        <MiniChart stock={stock} type="price" height={32} />
      </div>
      
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Volume</div>
        <MiniChart stock={stock} type="volume" height={32} />
      </div>
      
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Revenue</div>
        <MiniChart stock={stock} type="revenue" height={32} />
      </div>
      
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground font-medium">Earnings</div>
        <MiniChart stock={stock} type="earnings" height={32} />
      </div>
    </div>
  );
}
