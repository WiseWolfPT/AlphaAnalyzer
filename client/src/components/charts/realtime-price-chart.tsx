// Real-time Price Chart Component with WebSocket integration
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from './chart-container';
import { useSymbolStream } from '@/hooks/use-financial-stream';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Signal, AlertTriangle } from 'lucide-react';

interface RealtimePriceChartProps {
  symbol: string;
  height?: string;
  maxDataPoints?: number;
  showConnectionStatus?: boolean;
  enableVolumeChart?: boolean;
  updateInterval?: number;
}

interface ChartDataPoint {
  timestamp: number;
  time: string;
  price: number;
  volume?: number;
  change?: number;
}

export function RealtimePriceChart({ 
  symbol,
  height = "h-64",
  maxDataPoints = 50,
  showConnectionStatus = true,
  enableVolumeChart = false,
  updateInterval = 1000
}: RealtimePriceChartProps) {
  const {
    data: currentData,
    historicalData,
    isConnected,
    connectionStates,
    priceChange,
    priceChangePercent,
    volume,
    lastUpdate
  } = useSymbolStream(symbol);

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const chartDataRef = useRef<ChartDataPoint[]>([]);

  // Update chart data when new real-time data arrives
  useEffect(() => {
    if (!currentData || currentData.timestamp <= lastUpdateRef.current) {
      return;
    }

    lastUpdateRef.current = currentData.timestamp;

    const newDataPoint: ChartDataPoint = {
      timestamp: currentData.timestamp,
      time: new Date(currentData.timestamp).toLocaleTimeString(),
      price: currentData.price,
      volume: currentData.volume,
      change: currentData.change
    };

    setIsAnimating(true);
    
    setChartData(prevData => {
      const updatedData = [...prevData, newDataPoint];
      
      // Maintain max data points
      if (updatedData.length > maxDataPoints) {
        updatedData.splice(0, updatedData.length - maxDataPoints);
      }
      
      chartDataRef.current = updatedData;
      return updatedData;
    });

    // Reset animation after a short delay
    const animationTimeout = setTimeout(() => {
      setIsAnimating(false);
    }, 500);

    return () => clearTimeout(animationTimeout);
  }, [currentData, maxDataPoints]);

  // Initialize chart with historical data
  useEffect(() => {
    if (historicalData.length > 0) {
      const initialData = historicalData
        .slice(-maxDataPoints)
        .map(point => ({
          timestamp: point.timestamp,
          time: new Date(point.timestamp).toLocaleTimeString(),
          price: point.price,
          volume: point.volume,
          change: point.change
        }));
      
      setChartData(initialData);
      chartDataRef.current = initialData;
    }
  }, [historicalData, maxDataPoints]);

  // Calculate trend and price info
  const trend = priceChangePercent >= 0 ? 'up' : 'down';
  const currentPrice = currentData?.price || 0;
  const formattedChange = priceChangePercent >= 0 ? `+${priceChangePercent.toFixed(2)}%` : `${priceChangePercent.toFixed(2)}%`;

  // Connection status indicator
  const getConnectionStatusIcon = () => {
    if (!isConnected) return <WifiOff className="h-3 w-3 text-red-500" />;
    
    const connectedCount = Array.from(connectionStates.values()).filter(state => state === 'connected').length;
    const totalCount = connectionStates.size;
    
    if (connectedCount === totalCount) return <Signal className="h-3 w-3 text-green-500" />;
    if (connectedCount > 0) return <Wifi className="h-3 w-3 text-yellow-500" />;
    return <AlertTriangle className="h-3 w-3 text-red-500" />;
  };

  const getConnectionStatusText = () => {
    if (!isConnected) return "Disconnected";
    
    const connectedCount = Array.from(connectionStates.values()).filter(state => state === 'connected').length;
    const totalCount = connectionStates.size;
    
    return `${connectedCount}/${totalCount} sources`;
  };

  // Custom tooltip for real-time data
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.time}</p>
          <p className="text-sm text-muted-foreground">
            Price: <span className="font-semibold text-foreground">${data.price.toFixed(2)}</span>
          </p>
          {data.change !== undefined && (
            <p className="text-sm text-muted-foreground">
              Change: <span className={`font-semibold ${data.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}
              </span>
            </p>
          )}
          {enableVolumeChart && data.volume && (
            <p className="text-sm text-muted-foreground">
              Volume: <span className="font-semibold text-foreground">{data.volume.toLocaleString()}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Chart color based on trend
  const chartColor = trend === 'up' ? '#10b981' : '#ef4444'; // green or red
  const gradientId = `gradient-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="relative">
      <ChartContainer 
        title={`${symbol} Real-time Price`}
        subtitle={
          <div className="flex items-center gap-2">
            <span>{trend === 'up' ? '↗' : '↘'} {formattedChange}</span>
            {showConnectionStatus && (
              <Badge variant="outline" className="text-xs py-0 px-2">
                <div className="flex items-center gap-1">
                  {getConnectionStatusIcon()}
                  <span>{getConnectionStatusText()}</span>
                </div>
              </Badge>
            )}
          </div>
        }
        value={currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : undefined}
        change={formattedChange}
        trend={trend}
        height={height}
      >
        <div className="relative">
          {/* Animation overlay for new data */}
          {isAnimating && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-pulse pointer-events-none" />
          )}
          
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                domain={['dataMin', 'dataMax']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ 
                  r: 4, 
                  fill: chartColor,
                  stroke: '#fff',
                  strokeWidth: 2
                }}
                connectNulls={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartContainer>

      {/* Data freshness indicator */}
      {lastUpdate > 0 && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs py-0 px-1">
            {new Date(lastUpdate).toLocaleTimeString()}
          </Badge>
        </div>
      )}
    </div>
  );
}

// Component for displaying multiple real-time price charts in a grid
interface RealtimePriceGridProps {
  symbols: string[];
  columns?: number;
  height?: string;
  showConnectionStatus?: boolean;
}

export function RealtimePriceGrid({ 
  symbols, 
  columns = 2, 
  height = "h-48",
  showConnectionStatus = false 
}: RealtimePriceGridProps) {
  const gridCols = `grid-cols-${columns}`;
  
  return (
    <div className={`grid ${gridCols} gap-4`}>
      {symbols.map(symbol => (
        <RealtimePriceChart
          key={symbol}
          symbol={symbol}
          height={height}
          showConnectionStatus={showConnectionStatus}
          maxDataPoints={30} // Smaller for grid view
        />
      ))}
    </div>
  );
}

// Mini real-time price widget for sidebars/headers
interface MiniPriceWidgetProps {
  symbol: string;
  className?: string;
}

export function MiniPriceWidget({ symbol, className }: MiniPriceWidgetProps) {
  const { data, isConnected, priceChangePercent } = useSymbolStream(symbol);
  
  if (!data) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-sm text-muted-foreground">{symbol}</span>
        <span className="text-sm">--</span>
      </div>
    );
  }

  const trend = priceChangePercent >= 0 ? 'up' : 'down';
  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 ${statusColor} rounded-full ${isConnected ? 'animate-pulse' : ''}`} />
      <span className="text-sm font-medium">{symbol}</span>
      <span className="text-sm font-semibold">${data.price.toFixed(2)}</span>
      <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
        {trend === 'up' ? '↗' : '↘'} {Math.abs(priceChangePercent).toFixed(2)}%
      </span>
    </div>
  );
}