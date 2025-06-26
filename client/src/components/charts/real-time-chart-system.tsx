import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  ComposedChart,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Database,
  Zap,
  BarChart3,
  Download,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react';
import { websocketManager, ConnectionState, type ConnectionMetrics } from '@/lib/websocket-manager';

// Types for real-time chart data
export interface RealTimeDataPoint {
  timestamp: number;
  value: number;
  label?: string;
  [key: string]: any;
}

export interface APIMetrics {
  timestamp: number;
  apiCallsPerMinute: number;
  errorRate: number;
  avgResponseTime: number;
  rateLimitUsage: number;
  successfulCalls: number;
  failedCalls: number;
  cachedResponses: number;
}

export interface RateLimitStatus {
  provider: string;
  current: number;
  limit: number;
  resetTime: number;
  percentage: number;
}

// Real-time data buffer for performance optimization
class RealTimeDataBuffer {
  private buffer: Map<string, RealTimeDataPoint[]> = new Map();
  private maxSize: number;
  private subscribers: Map<string, Set<(data: RealTimeDataPoint[]) => void>> = new Map();

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  addData(key: string, data: RealTimeDataPoint): void {
    if (!this.buffer.has(key)) {
      this.buffer.set(key, []);
    }

    const buffer = this.buffer.get(key)!;
    buffer.push(data);

    // Keep buffer size manageable
    if (buffer.length > this.maxSize) {
      buffer.splice(0, buffer.length - this.maxSize);
    }

    // Notify subscribers
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback([...buffer]));
    }
  }

  getData(key: string, limit?: number): RealTimeDataPoint[] {
    const data = this.buffer.get(key) || [];
    return limit ? data.slice(-limit) : data;
  }

  subscribe(key: string, callback: (data: RealTimeDataPoint[]) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  clear(key?: string): void {
    if (key) {
      this.buffer.delete(key);
      this.subscribers.delete(key);
    } else {
      this.buffer.clear();
      this.subscribers.clear();
    }
  }
}

// Singleton data buffer
export const realTimeDataBuffer = new RealTimeDataBuffer();

// Enhanced real-time chart component
interface RealTimeChartProps {
  dataKey: string;
  title: string;
  subtitle?: string;
  type: 'line' | 'area' | 'bar' | 'composed';
  height?: number;
  maxDataPoints?: number;
  updateInterval?: number;
  color?: string;
  gradientColors?: [string, string];
  showGrid?: boolean;
  showLegend?: boolean;
  animated?: boolean;
  autoScale?: boolean;
  formatter?: (value: number) => string;
  onDataUpdate?: (data: RealTimeDataPoint[]) => void;
  className?: string;
}

export const RealTimeChart = memo(({
  dataKey,
  title,
  subtitle,
  type = 'line',
  height = 300,
  maxDataPoints = 50,
  updateInterval = 1000,
  color = '#3b82f6',
  gradientColors,
  showGrid = true,
  showLegend = false,
  animated = true,
  autoScale = true,
  formatter,
  onDataUpdate,
  className
}: RealTimeChartProps) => {
  const [data, setData] = useState<RealTimeDataPoint[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time data
  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = realTimeDataBuffer.subscribe(dataKey, (newData) => {
      if (isLive) {
        const limitedData = newData.slice(-maxDataPoints);
        setData(limitedData);
        setLastUpdate(Date.now());
        onDataUpdate?.(limitedData);
      }
    });

    // Load initial data
    const initialData = realTimeDataBuffer.getData(dataKey, maxDataPoints);
    setData(initialData);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [dataKey, maxDataPoints, isLive, onDataUpdate]);

  // Chart configuration
  const chartConfig: ChartConfig = useMemo(() => ({
    value: {
      label: title,
      color: color,
    },
  }), [title, color]);

  // Format functions
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const formatValue = useCallback((value: number) => {
    if (formatter) return formatter(value);
    return value.toFixed(2);
  }, [formatter]);

  // Chart statistics
  const chartStats = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const current = values[values.length - 1];
    const previous = values[values.length - 2];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    const trend = previous !== undefined ? 
      (current > previous ? 'up' : current < previous ? 'down' : 'neutral') : 
      'neutral';

    const change = previous !== undefined ? current - previous : 0;
    const changePercent = previous !== undefined && previous !== 0 ? 
      ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      min,
      max,
      avg,
      trend,
      change,
      changePercent
    };
  }, [data]);

  const toggleLiveUpdates = useCallback(() => {
    setIsLive(prev => !prev);
  }, []);

  const exportData = useCallback(() => {
    const csv = [
      'timestamp,value,formatted_time',
      ...data.map(d => `${d.timestamp},${d.value},${formatTime(d.timestamp)}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataKey}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, dataKey, formatTime]);

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const gradientId = `gradient-${dataKey}`;
    const [startColor, endColor] = gradientColors || [color, color];

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={startColor} stopOpacity={0.8} />
                <stop offset="95%" stopColor={endColor} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              domain={autoScale ? ['auto', 'auto'] : undefined}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  labelFormatter={(value) => formatTime(Number(value))}
                  formatter={(value) => [formatValue(Number(value)), 'Value']}
                />
              }
            />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={animated ? 750 : 0}
              connectNulls={false}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              domain={autoScale ? ['auto', 'auto'] : undefined}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  labelFormatter={(value) => formatTime(Number(value))}
                  formatter={(value) => [formatValue(Number(value)), 'Value']}
                />
              }
            />
            {showLegend && <Legend />}
            <Bar
              dataKey="value"
              fill={color}
              animationDuration={animated ? 750 : 0}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" opacity={0.3} />}
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              domain={autoScale ? ['auto', 'auto'] : undefined}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  labelFormatter={(value) => formatTime(Number(value))}
                  formatter={(value) => [formatValue(Number(value)), 'Value']}
                />
              }
            />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
              animationDuration={animated ? 750 : 0}
              connectNulls={false}
            />
          </LineChart>
        );
    }
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={toggleLiveUpdates}>
                {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No data available</p>
              <p className="text-sm">Waiting for real-time updates...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            {chartStats && (
              <Badge variant={chartStats.trend === 'up' ? 'default' : chartStats.trend === 'down' ? 'destructive' : 'secondary'}>
                {chartStats.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                {chartStats.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                {formatValue(chartStats.current)}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={exportData}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleLiveUpdates}>
              {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
        </div>
        {chartStats && (
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Min: {formatValue(chartStats.min)}</span>
            <span>Max: {formatValue(chartStats.max)}</span>
            <span>Avg: {formatValue(chartStats.avg)}</span>
            {chartStats.changePercent !== 0 && (
              <span className={chartStats.changePercent > 0 ? 'text-green-600' : 'text-red-600'}>
                {chartStats.changePercent > 0 ? '+' : ''}{chartStats.changePercent.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div ref={chartRef} style={{ height: `${height}px` }}>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Last update: {formatTime(lastUpdate)}</span>
          <span>{data.length} data points</span>
        </div>
      </CardContent>
    </Card>
  );
});

RealTimeChart.displayName = 'RealTimeChart';

// Utility function to simulate API metrics data
export const generateAPIMetrics = (): APIMetrics => {
  const now = Date.now();
  const baseApiCalls = 50 + Math.random() * 100;
  const errorRate = Math.random() * 0.1; // 0-10% error rate
  const responseTime = 50 + Math.random() * 200; // 50-250ms
  const rateLimitUsage = Math.random() * 100; // 0-100%

  return {
    timestamp: now,
    apiCallsPerMinute: baseApiCalls,
    errorRate: errorRate * 100,
    avgResponseTime: responseTime,
    rateLimitUsage: rateLimitUsage,
    successfulCalls: Math.floor(baseApiCalls * (1 - errorRate)),
    failedCalls: Math.floor(baseApiCalls * errorRate),
    cachedResponses: Math.floor(baseApiCalls * 0.3) // 30% cache hit rate
  };
};

// Utility function to add data to buffer
export const addRealTimeData = (key: string, value: number, label?: string): void => {
  realTimeDataBuffer.addData(key, {
    timestamp: Date.now(),
    value,
    label
  });
};

export default RealTimeChart;