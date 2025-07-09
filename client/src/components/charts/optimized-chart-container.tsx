import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  LightweightLineChart, 
  LightweightPriceChart, 
  LightweightBarChart, 
  LightweightChartContainer
} from '@/components/ui/lightweight-chart';
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

  // Transform data for Chart.js components
  const transformedData = useMemo(() => {
    switch (type) {
      case 'area':
        return optimizedData.map(item => ({
          date: item.date,
          price: item.value
        }));
      case 'line':
        return optimizedData.map(item => ({
          label: new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          value: item.value
        }));
      case 'bar':
        return optimizedData.map(item => ({
          label: new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          value: item.value
        }));
      default:
        return optimizedData.map(item => ({
          label: new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          value: item.value
        }));
    }
  }, [optimizedData, type]);

  // Performance optimization: Only re-render when data actually changes
  const dataFingerprint = useMemo(() => 
    JSON.stringify(optimizedData.slice(-10)), // Only check last 10 points for real-time
    [optimizedData]
  );

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
    const chartProps = {
      data: transformedData,
      color,
      className: "w-full h-full"
    };

    switch (type) {
      case 'area':
        return (
          <LightweightPriceChart
            {...chartProps}
            data={transformedData as any}
          />
        );
      case 'bar':
        return (
          <LightweightBarChart
            {...chartProps}
            data={transformedData as any}
          />
        );
      default: // line
        return (
          <LightweightLineChart
            {...chartProps}
            data={transformedData as any}
          />
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
        <LightweightChartContainer
          config={{
            [dataKey]: {
              label: title,
              color: color,
            }
          }}
          className="w-full h-full"
        >
          {renderChart()}
        </LightweightChartContainer>
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