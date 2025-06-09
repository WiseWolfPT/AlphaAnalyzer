import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { realAPI } from "@/lib/real-api";
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

  const ChartComponent = type === 'volume' || type === 'revenue' || type === 'earnings' ? BarChart : AreaChart;

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          {type === 'price' ? (
            <>
              <defs>
                <linearGradient id={`gradient-${stock.symbol}-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getChartColor()} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={getChartColor()} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={getChartColor()} 
                strokeWidth={1.5}
                fill={`url(#gradient-${stock.symbol}-${type})`}
                dot={false}
              />
            </>
          ) : (
            <Bar 
              dataKey="value" 
              fill={getChartColor()}
              radius={[1, 1, 0, 0]}
            />
          )}
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const value = payload[0].value as number;
                const formatValue = () => {
                  switch (type) {
                    case 'price':
                      return `$${value.toFixed(2)}`;
                    case 'revenue':
                    case 'earnings':
                      return `$${(value / 1000).toFixed(1)}B`;
                    case 'volume':
                      return `${(value / 1000000).toFixed(1)}M`;
                    default:
                      return value.toString();
                  }
                };
                
                return (
                  <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                    <p className="text-sm font-medium">{formatValue()}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </ChartComponent>
      </ResponsiveContainer>
      
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
    const historicalData = await realAPI.getHistoricalData(stock.symbol, '1M');
    
    if (historicalData && historicalData.length > 0) {
      return historicalData.slice(-15).map(item => ({
        date: new Date(item.date).toLocaleDateString(),
        value: item.price
      }));
    }
  } catch (error) {
    console.warn('Failed to get historical data, using fallback');
  }
  
  return generateFallbackData(stock, 'price');
}

async function generateRevenueData(stock: MockStock): Promise<ChartData[]> {
  try {
    const financials = await realAPI.getFinancials(stock.symbol);
    
    if (financials && financials.revenue) {
      return financials.revenue.slice(-8).map(item => ({
        date: item.quarter,
        value: item.value,
        label: `${item.quarter}: $${(item.value / 1000).toFixed(1)}B`
      }));
    }
  } catch (error) {
    console.warn('Failed to get revenue data, using fallback');
  }
  
  return generateFallbackData(stock, 'revenue');
}

async function generateEarningsData(stock: MockStock): Promise<ChartData[]> {
  try {
    const financials = await realAPI.getFinancials(stock.symbol);
    
    if (financials && financials.eps) {
      return financials.eps.slice(-8).map(item => ({
        date: item.quarter,
        value: item.value,
        label: `${item.quarter}: $${item.value.toFixed(2)}`
      }));
    }
  } catch (error) {
    console.warn('Failed to get earnings data, using fallback');
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