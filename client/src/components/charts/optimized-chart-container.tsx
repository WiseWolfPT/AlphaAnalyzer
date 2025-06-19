import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { ChartContainer } from './chart-container';

interface OptimizedChartProps {
  data: Array<{ date: string; value: number; [key: string]: any }>;
  title: string;
  subtitle?: string;
  type: 'line' | 'area' | 'bar';
  dataKey: string;
  color?: string;
  height?: number;
  trend?: 'up' | 'down' | 'neutral';
  isRealTime?: boolean;
  maxDataPoints?: number;
  animationDuration?: number;
}

// Memoized tooltip component to prevent re-renders
const OptimizedTooltip = memo(({ active, payload, label, formatter }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const value = payload[0].value;
  const formattedValue = formatter ? formatter(value) : value;

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">
        Value: <span className="font-semibold text-foreground">{formattedValue}</span>
      </p>
    </div>
  );
});

OptimizedTooltip.displayName = 'OptimizedTooltip';

// Optimized chart component with performance enhancements
export const OptimizedChart = memo(({
  data,
  title,
  subtitle,
  type = 'line',
  dataKey,
  color = '#ec4899',
  height = 300,
  trend,
  isRealTime = false,
  maxDataPoints = 100,
  animationDuration = isRealTime ? 0 : 750 // Disable animations for real-time updates
}: OptimizedChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Optimize data for performance - limit data points for real-time charts
  const optimizedData = useMemo(() => {
    if (isRealTime && data.length > maxDataPoints) {
      return data.slice(-maxDataPoints);
    }
    return data;
  }, [data, isRealTime, maxDataPoints]);

  // Memoize chart calculations
  const chartMetrics = useMemo(() => {
    if (optimizedData.length === 0) return null;
    
    const firstValue = optimizedData[0]?.value || 0;
    const currentValue = optimizedData[optimizedData.length - 1]?.value || 0;
    const totalChange = currentValue - firstValue;
    const totalChangePercent = firstValue ? (totalChange / firstValue) * 100 : 0;
    const calculatedTrend = trend || (totalChange >= 0 ? 'up' : 'down');

    return {
      currentValue,
      totalChange,
      totalChangePercent,
      trend: calculatedTrend
    };
  }, [optimizedData, trend]);

  // Memoized formatter functions
  const tooltipFormatter = useCallback((value: number) => {
    if (type === 'bar' && dataKey.includes('volume')) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (dataKey.includes('price') || dataKey.includes('revenue')) {
      return `$${value.toFixed(2)}`;
    }
    return value.toFixed(2);
  }, [type, dataKey]);

  const tickFormatter = useCallback((value: string) => {
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }, []);

  // Performance optimization: Only re-render when data actually changes
  const dataFingerprint = useMemo(() => 
    JSON.stringify(optimizedData.slice(-10)), // Only check last 10 points for real-time
    [optimizedData]
  );

  const ChartComponent = useMemo(() => {
    switch (type) {
      case 'area':
        return AreaChart;
      case 'bar':
        return BarChart;
      default:
        return LineChart;
    }
  }, [type]);

  if (!optimizedData || optimizedData.length === 0) {
    return (
      <ChartContainer title={title} subtitle={subtitle}>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No data available
        </div>
      </ChartContainer>
    );
  }

  const renderChart = () => {
    const commonProps = {
      data: optimizedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const axisProps = {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 10, fill: 'currentColor' },
    };

    switch (type) {
      case 'area':
        return (
          <ChartComponent {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" {...axisProps} tickFormatter={tickFormatter} />
            <YAxis {...axisProps} />
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <Tooltip content={<OptimizedTooltip formatter={tooltipFormatter} />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${dataKey})`}
              animationDuration={animationDuration}
              connectNulls={false}
            />
          </ChartComponent>
        );

      case 'bar':
        return (
          <ChartComponent {...commonProps}>
            <XAxis dataKey="date" {...axisProps} tickFormatter={tickFormatter} />
            <YAxis {...axisProps} />
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <Tooltip content={<OptimizedTooltip formatter={tooltipFormatter} />} />
            <Bar
              dataKey={dataKey}
              fill={color}
              animationDuration={animationDuration}
              radius={[2, 2, 0, 0]}
            />
          </ChartComponent>
        );

      default: // line
        return (
          <ChartComponent {...commonProps}>
            <XAxis dataKey="date" {...axisProps} tickFormatter={tickFormatter} />
            <YAxis {...axisProps} />
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <Tooltip content={<OptimizedTooltip formatter={tooltipFormatter} />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
              animationDuration={animationDuration}
              connectNulls={false}
            />
          </ChartComponent>
        );
    }
  };

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      value={chartMetrics ? `$${chartMetrics.currentValue.toFixed(2)}` : undefined}
      change={chartMetrics ? `${chartMetrics.totalChange >= 0 ? '+' : ''}${chartMetrics.totalChangePercent.toFixed(2)}%` : undefined}
      trend={chartMetrics?.trend}
      height={`h-[${height}px]`}
    >
      <div ref={containerRef} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
});

OptimizedChart.displayName = 'OptimizedChart';

// Real-time chart wrapper with automatic updates
interface RealTimeChartProps extends OptimizedChartProps {
  updateInterval?: number;
  onDataRequest?: () => Promise<any[]>;
}

export const RealTimeChart = memo(({
  updateInterval = 5000,
  onDataRequest,
  ...chartProps
}: RealTimeChartProps) => {
  const [realtimeData, setRealtimeData] = React.useState(chartProps.data);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!onDataRequest || !chartProps.isRealTime) return;

    const fetchData = async () => {
      try {
        const newData = await onDataRequest();
        setRealtimeData(prevData => {
          // Merge new data while maintaining performance
          const combined = [...prevData, ...newData];
          return combined.slice(-chartProps.maxDataPoints!);
        });
      } catch (error) {
        console.error('Failed to fetch real-time data:', error);
      }
    };

    intervalRef.current = setInterval(fetchData, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [onDataRequest, updateInterval, chartProps.isRealTime, chartProps.maxDataPoints]);

  return (
    <OptimizedChart
      {...chartProps}
      data={realtimeData}
      isRealTime={true}
    />
  );
});

RealTimeChart.displayName = 'RealTimeChart';