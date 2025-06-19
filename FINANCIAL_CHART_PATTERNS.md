# Chart.js Patterns for Financial Data Visualization

This document provides comprehensive patterns and examples for implementing professional trading charts using Chart.js with React and TypeScript, focusing on candlestick charts, OHLC data, real-time updates, and technical indicators.

## Table of Contents

1. [Chart.js for Financial Charts](#chartjs-for-financial-charts)
2. [React Integration with TypeScript](#react-integration-with-typescript)
3. [Real-time Data Updates](#real-time-data-updates)
4. [Multiple Timeframe Switching](#multiple-timeframe-switching)
5. [Volume and Indicator Overlays](#volume-and-indicator-overlays)
6. [TradingView Lightweight Charts Alternative](#tradingview-lightweight-charts-alternative)
7. [Performance Optimization](#performance-optimization)
8. [Complete Trading Chart Example](#complete-trading-chart-example)

## Chart.js for Financial Charts

### Basic Setup with TypeScript

```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);
```

### Financial Data Types

```typescript
interface OHLCData {
  time: string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickDataPoint {
  x: string | Date;
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
}
```

### Candlestick Chart Implementation

Since Chart.js doesn't have native candlestick support, we use a combination of bar charts and line segments:

```typescript
function createCandlestickData(ohlcData: OHLCData[]): {
  upperShadows: any[];
  lowerShadows: any[];
  bullishBodies: any[];
  bearishBodies: any[];
} {
  const upperShadows = [];
  const lowerShadows = [];
  const bullishBodies = [];
  const bearishBodies = [];

  ohlcData.forEach((candle) => {
    const isBullish = candle.close >= candle.open;
    
    // Upper shadow (high to body top)
    upperShadows.push({
      x: candle.time,
      y: [Math.max(candle.open, candle.close), candle.high]
    });
    
    // Lower shadow (low to body bottom)
    lowerShadows.push({
      x: candle.time,
      y: [candle.low, Math.min(candle.open, candle.close)]
    });
    
    // Candle body
    if (isBullish) {
      bullishBodies.push({
        x: candle.time,
        y: [candle.open, candle.close]
      });
      bearishBodies.push({
        x: candle.time,
        y: null
      });
    } else {
      bearishBodies.push({
        x: candle.time,
        y: [candle.close, candle.open]
      });
      bullishBodies.push({
        x: candle.time,
        y: null
      });
    }
  });

  return { upperShadows, lowerShadows, bullishBodies, bearishBodies };
}
```

### Chart Configuration for Financial Data

```typescript
const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Disable for better performance
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'day',
        displayFormats: {
          day: 'MMM dd',
          hour: 'HH:mm'
        }
      },
      ticks: {
        source: 'auto',
        maxTicksLimit: 10
      }
    },
    y: {
      type: 'linear',
      position: 'right',
      grid: {
        color: 'rgba(128, 128, 128, 0.2)'
      },
      ticks: {
        callback: function(value) {
          return '$' + value.toFixed(2);
        }
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        title: function(context) {
          return new Date(context[0].parsed.x).toLocaleDateString();
        },
        label: function(context) {
          const dataIndex = context.dataIndex;
          const data = ohlcData[dataIndex];
          return [
            `Open: $${data.open.toFixed(2)}`,
            `High: $${data.high.toFixed(2)}`,
            `Low: $${data.low.toFixed(2)}`,
            `Close: $${data.close.toFixed(2)}`,
            data.volume ? `Volume: ${data.volume.toLocaleString()}` : ''
          ].filter(Boolean);
        }
      }
    }
  },
  interaction: {
    mode: 'index',
    intersect: false
  }
};
```

## React Integration with TypeScript

### Financial Chart Component

```typescript
import React, { useRef, useEffect, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface FinancialChartProps {
  data: OHLCData[];
  timeframe: '1m' | '5m' | '1h' | '1d';
  indicators?: IndicatorConfig[];
  onTimeframeChange?: (timeframe: string) => void;
}

const FinancialChart: React.FC<FinancialChartProps> = ({
  data,
  timeframe,
  indicators = [],
  onTimeframeChange
}) => {
  const chartRef = useRef<ChartJS>(null);
  const [chartData, setChartData] = useState<ChartData<'bar'>>({
    datasets: []
  });

  useEffect(() => {
    if (!data.length) return;

    const candlestickData = createCandlestickData(data);
    
    const datasets = [
      // Upper shadows
      {
        type: 'bar' as const,
        label: 'Upper Shadow',
        data: candlestickData.upperShadows,
        backgroundColor: 'rgba(128, 128, 128, 0.8)',
        borderColor: 'rgba(128, 128, 128, 1)',
        borderWidth: 1,
        barThickness: 1,
        categoryPercentage: 1.0,
        barPercentage: 1.0
      },
      // Lower shadows
      {
        type: 'bar' as const,
        label: 'Lower Shadow',
        data: candlestickData.lowerShadows,
        backgroundColor: 'rgba(128, 128, 128, 0.8)',
        borderColor: 'rgba(128, 128, 128, 1)',
        borderWidth: 1,
        barThickness: 1,
        categoryPercentage: 1.0,
        barPercentage: 1.0
      },
      // Bullish bodies
      {
        type: 'bar' as const,
        label: 'Bullish',
        data: candlestickData.bullishBodies,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        barThickness: 8,
        categoryPercentage: 1.0,
        barPercentage: 1.0
      },
      // Bearish bodies
      {
        type: 'bar' as const,
        label: 'Bearish',
        data: candlestickData.bearishBodies,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        barThickness: 8,
        categoryPercentage: 1.0,
        barPercentage: 1.0
      }
    ];

    // Add indicators
    indicators.forEach((indicator, index) => {
      datasets.push({
        type: 'line' as const,
        label: indicator.name,
        data: indicator.data.map((value, i) => ({
          x: data[i]?.time,
          y: value
        })),
        borderColor: indicator.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      });
    });

    setChartData({ datasets });
  }, [data, indicators]);

  return (
    <div className="financial-chart">
      <div className="timeframe-selector">
        {['1m', '5m', '1h', '1d'].map((tf) => (
          <button
            key={tf}
            className={`timeframe-btn ${tf === timeframe ? 'active' : ''}`}
            onClick={() => onTimeframeChange?.(tf)}
          >
            {tf}
          </button>
        ))}
      </div>
      <Chart
        ref={chartRef}
        type="bar"
        data={chartData}
        options={chartOptions}
      />
    </div>
  );
};
```

### Chart Event Handlers

```typescript
import { getDatasetAtEvent, getElementAtEvent } from 'react-chartjs-2';

const handleChartClick = (event: MouseEvent) => {
  const chart = chartRef.current;
  if (!chart) return;

  const elements = getElementAtEvent(chart, event);
  if (elements.length > 0) {
    const element = elements[0];
    const dataIndex = element.index;
    const candleData = data[dataIndex];
    
    // Handle candle selection
    console.log('Selected candle:', candleData);
  }
};

const handleChartHover = (event: MouseEvent) => {
  const chart = chartRef.current;
  if (!chart) return;

  // Update crosshair or custom tooltip
  updateCrosshair(event, chart);
};
```

## Real-time Data Updates

### Efficient Data Updates

```typescript
const useRealtimeData = (symbol: string, timeframe: string) => {
  const [data, setData] = useState<OHLCData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const ws = new WebSocket(`wss://api.example.com/ws`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      setData(prevData => {
        const newData = [...prevData];
        const lastIndex = newData.length - 1;
        
        if (lastIndex >= 0 && 
            new Date(newData[lastIndex].time).getTime() === 
            new Date(update.time).getTime()) {
          // Update existing candle
          newData[lastIndex] = {
            ...newData[lastIndex],
            high: Math.max(newData[lastIndex].high, update.price),
            low: Math.min(newData[lastIndex].low, update.price),
            close: update.price,
            volume: (newData[lastIndex].volume || 0) + (update.volume || 0)
          };
        } else {
          // Add new candle
          newData.push({
            time: update.time,
            open: update.price,
            high: update.price,
            low: update.price,
            close: update.price,
            volume: update.volume || 0
          });
        }
        
        // Keep only last 1000 candles for performance
        return newData.slice(-1000);
      });
      
      setLastUpdate(new Date());
    };

    return () => ws.close();
  }, [symbol, timeframe]);

  return { data, lastUpdate };
};
```

### Chart Update Strategy

```typescript
const FinancialChartWithRealtime: React.FC<Props> = ({ symbol, timeframe }) => {
  const { data, lastUpdate } = useRealtimeData(symbol, timeframe);
  const chartRef = useRef<ChartJS>(null);
  const lastDataLength = useRef(0);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data.length) return;

    // Only update if we have new data
    if (data.length === lastDataLength.current) {
      // Update last candle without full re-render
      const candlestickData = createCandlestickData([data[data.length - 1]]);
      
      chart.data.datasets.forEach((dataset, index) => {
        if (dataset.data && dataset.data.length > 0) {
          const lastIndex = dataset.data.length - 1;
          // Update last data point based on dataset type
          switch (index) {
            case 0: // Upper shadows
              dataset.data[lastIndex] = candlestickData.upperShadows[0];
              break;
            case 1: // Lower shadows
              dataset.data[lastIndex] = candlestickData.lowerShadows[0];
              break;
            case 2: // Bullish bodies
              dataset.data[lastIndex] = candlestickData.bullishBodies[0];
              break;
            case 3: // Bearish bodies
              dataset.data[lastIndex] = candlestickData.bearishBodies[0];
              break;
          }
        }
      });
      
      chart.update('none'); // Update without animation
    } else {
      // Full data refresh for new candles
      const candlestickData = createCandlestickData(data);
      
      chart.data.datasets[0].data = candlestickData.upperShadows;
      chart.data.datasets[1].data = candlestickData.lowerShadows;
      chart.data.datasets[2].data = candlestickData.bullishBodies;
      chart.data.datasets[3].data = candlestickData.bearishBodies;
      
      chart.update('none');
      lastDataLength.current = data.length;
    }
  }, [data, lastUpdate]);

  return (
    <Chart
      ref={chartRef}
      type="bar"
      data={chartData}
      options={chartOptions}
    />
  );
};
```

## Multiple Timeframe Switching

### Timeframe Data Management

```typescript
interface TimeframeData {
  [key: string]: OHLCData[];
}

const useMultiTimeframeData = (symbol: string) => {
  const [timeframeData, setTimeframeData] = useState<TimeframeData>({});
  const [currentTimeframe, setCurrentTimeframe] = useState('1h');
  const [isLoading, setIsLoading] = useState(false);

  const loadTimeframeData = async (timeframe: string) => {
    if (timeframeData[timeframe]) {
      setCurrentTimeframe(timeframe);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/ohlc/${symbol}?timeframe=${timeframe}`);
      const data = await response.json();
      
      setTimeframeData(prev => ({
        ...prev,
        [timeframe]: data
      }));
      setCurrentTimeframe(timeframe);
    } catch (error) {
      console.error('Failed to load timeframe data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentData = () => timeframeData[currentTimeframe] || [];

  return {
    currentData: getCurrentData(),
    currentTimeframe,
    isLoading,
    switchTimeframe: loadTimeframeData
  };
};
```

### Timeframe Selector Component

```typescript
interface TimeframeSelectorProps {
  currentTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  isLoading?: boolean;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  currentTimeframe,
  onTimeframeChange,
  isLoading = false
}) => {
  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
    { value: '1w', label: '1w' }
  ];

  return (
    <div className="timeframe-selector">
      {timeframes.map(({ value, label }) => (
        <button
          key={value}
          className={`timeframe-btn ${value === currentTimeframe ? 'active' : ''}`}
          onClick={() => onTimeframeChange(value)}
          disabled={isLoading}
        >
          {label}
        </button>
      ))}
      {isLoading && <div className="loading-spinner">⏳</div>}
    </div>
  );
};
```

## Volume and Indicator Overlays

### Volume Overlay Implementation

```typescript
const createVolumeData = (ohlcData: OHLCData[]) => {
  return ohlcData.map(candle => ({
    x: candle.time,
    y: candle.volume || 0,
    backgroundColor: candle.close >= candle.open 
      ? 'rgba(34, 197, 94, 0.6)' 
      : 'rgba(239, 68, 68, 0.6)'
  }));
};

const addVolumeOverlay = (datasets: any[], ohlcData: OHLCData[]) => {
  const volumeData = createVolumeData(ohlcData);
  
  datasets.push({
    type: 'bar' as const,
    label: 'Volume',
    data: volumeData,
    backgroundColor: volumeData.map(d => d.backgroundColor),
    borderWidth: 0,
    yAxisID: 'volume',
    order: 10 // Render behind candlesticks
  });
};
```

### Technical Indicators

```typescript
interface IndicatorConfig {
  name: string;
  type: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB';
  period: number;
  color: string;
  data: number[];
}

// Simple Moving Average
const calculateSMA = (data: OHLCData[], period: number): number[] => {
  const sma: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    
    const sum = data.slice(i - period + 1, i + 1)
      .reduce((acc, candle) => acc + candle.close, 0);
    sma.push(sum / period);
  }
  
  return sma;
};

// Exponential Moving Average
const calculateEMA = (data: OHLCData[], period: number): number[] => {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i].close);
    } else {
      ema.push((data[i].close - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  
  return ema;
};

// RSI Calculator
const calculateRSI = (data: OHLCData[], period: number = 14): number[] => {
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      if (i > 0) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }
      rsi.push(NaN);
      continue;
    }
    
    if (i === period) {
      gains /= period;
      losses /= period;
    } else {
      const change = data[i].close - data[i - 1].close;
      gains = ((gains * (period - 1)) + (change > 0 ? change : 0)) / period;
      losses = ((losses * (period - 1)) + (change < 0 ? Math.abs(change) : 0)) / period;
    }
    
    const rs = gains / losses;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
};
```

### Multi-Panel Chart Layout

```typescript
const MultiPanelChart: React.FC<Props> = ({ data, indicators }) => {
  const mainChartRef = useRef<ChartJS>(null);
  const volumeChartRef = useRef<ChartJS>(null);
  const indicatorChartRef = useRef<ChartJS>(null);

  const mainChartData = useMemo(() => {
    const candlestickData = createCandlestickData(data);
    const datasets = [...createCandlestickDatasets(candlestickData)];
    
    // Add price-based indicators (SMA, EMA, etc.)
    indicators
      .filter(ind => ['SMA', 'EMA', 'BB'].includes(ind.type))
      .forEach(indicator => {
        datasets.push({
          type: 'line' as const,
          label: indicator.name,
          data: indicator.data.map((value, i) => ({
            x: data[i]?.time,
            y: value
          })),
          borderColor: indicator.color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        });
      });
    
    return { datasets };
  }, [data, indicators]);

  const volumeChartData = useMemo(() => ({
    datasets: [{
      type: 'bar' as const,
      label: 'Volume',
      data: createVolumeData(data),
      backgroundColor: data.map(candle => 
        candle.close >= candle.open 
          ? 'rgba(34, 197, 94, 0.6)' 
          : 'rgba(239, 68, 68, 0.6)'
      )
    }]
  }), [data]);

  const oscillatorChartData = useMemo(() => {
    const datasets = [];
    
    indicators
      .filter(ind => ['RSI', 'MACD'].includes(ind.type))
      .forEach(indicator => {
        datasets.push({
          type: 'line' as const,
          label: indicator.name,
          data: indicator.data.map((value, i) => ({
            x: data[i]?.time,
            y: value
          })),
          borderColor: indicator.color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        });
      });
    
    return { datasets };
  }, [data, indicators]);

  return (
    <div className="multi-panel-chart">
      <div className="main-chart" style={{ height: '60%' }}>
        <Chart
          ref={mainChartRef}
          type="bar"
          data={mainChartData}
          options={mainChartOptions}
        />
      </div>
      
      <div className="volume-chart" style={{ height: '20%' }}>
        <Chart
          ref={volumeChartRef}
          type="bar"
          data={volumeChartData}
          options={volumeChartOptions}
        />
      </div>
      
      {oscillatorChartData.datasets.length > 0 && (
        <div className="oscillator-chart" style={{ height: '20%' }}>
          <Chart
            ref={indicatorChartRef}
            type="line"
            data={oscillatorChartData}
            options={oscillatorChartOptions}
          />
        </div>
      )}
    </div>
  );
};
```

## TradingView Lightweight Charts Alternative

For more advanced financial charting, consider using TradingView's Lightweight Charts:

### Lightweight Charts Setup

```typescript
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

const TradingViewChart: React.FC<Props> = ({ data, indicators }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: 0, // Normal crosshair mode
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Convert data format for Lightweight Charts
    const lightweightData = data.map(candle => ({
      time: new Date(candle.time).getTime() / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeries.setData(lightweightData);

    // Add indicators
    indicators.forEach(indicator => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 2,
      });

      const indicatorData = indicator.data.map((value, index) => ({
        time: new Date(data[index].time).getTime() / 1000,
        value: value,
      })).filter(point => !isNaN(point.value));

      lineSeries.setData(indicatorData);
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) {
        return;
      }
      const newRect = entries[0].contentRect;
      chart.applyOptions({ width: newRect.width, height: newRect.height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data.length) return;

    const latestData = data[data.length - 1];
    candlestickSeriesRef.current.update({
      time: new Date(latestData.time).getTime() / 1000,
      open: latestData.open,
      high: latestData.high,
      low: latestData.low,
      close: latestData.close,
    });
  }, [data]);

  return <div ref={chartContainerRef} className="trading-chart-container" />;
};
```

## Performance Optimization

### Chart.js Performance Tips

```typescript
// Disable animations for real-time charts
const performantChartOptions: ChartOptions = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  
  // Optimize rendering
  elements: {
    point: {
      radius: 0, // Hide points on line charts
    },
    line: {
      tension: 0, // Disable bezier curves
    },
  },
  
  // Optimize scales
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 10, // Limit number of ticks
      },
    },
    y: {
      ticks: {
        maxTicksLimit: 8,
      },
    },
  },
  
  // Optimize plugins
  plugins: {
    legend: {
      display: false, // Hide legend if not needed
    },
    tooltip: {
      enabled: false, // Use custom tooltip for better performance
    },
  },
};

// Custom tooltip implementation
const useCustomTooltip = (chartRef: RefObject<ChartJS>) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;

    chart.options.plugins = {
      ...chart.options.plugins,
      tooltip: {
        enabled: false,
        external: function(context) {
          const { chart, tooltip: tooltipModel } = context;
          
          if (tooltipModel.opacity === 0) {
            tooltip.style.opacity = '0';
            return;
          }

          // Set content
          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const ohlcData = data[dataIndex];
            
            tooltip.innerHTML = `
              <div class="custom-tooltip">
                <div>Open: $${ohlcData.open.toFixed(2)}</div>
                <div>High: $${ohlcData.high.toFixed(2)}</div>
                <div>Low: $${ohlcData.low.toFixed(2)}</div>
                <div>Close: $${ohlcData.close.toFixed(2)}</div>
                ${ohlcData.volume ? `<div>Volume: ${ohlcData.volume.toLocaleString()}</div>` : ''}
              </div>
            `;
          }

          // Position tooltip
          const position = Chart.helpers.getRelativePosition(context.chart.canvas, context.chart);
          tooltip.style.opacity = '1';
          tooltip.style.left = position.x + 'px';
          tooltip.style.top = position.y + 'px';
        }
      }
    };
  }, [chartRef, data]);

  return tooltipRef;
};
```

### Data Virtualization

```typescript
const useVirtualizedData = (fullData: OHLCData[], visibleRange: number = 200) => {
  const [visibleData, setVisibleData] = useState<OHLCData[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const startIndex = Math.max(0, fullData.length - visibleRange - scrollPosition);
    const endIndex = Math.min(fullData.length, startIndex + visibleRange);
    
    setVisibleData(fullData.slice(startIndex, endIndex));
  }, [fullData, scrollPosition, visibleRange]);

  const scrollToPosition = (position: number) => {
    setScrollPosition(Math.max(0, Math.min(position, fullData.length - visibleRange)));
  };

  return {
    visibleData,
    scrollPosition,
    totalLength: fullData.length,
    scrollToPosition,
    canScrollLeft: scrollPosition > 0,
    canScrollRight: scrollPosition < fullData.length - visibleRange
  };
};
```

## Complete Trading Chart Example

```typescript
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Chart } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

interface TradingChartProps {
  symbol: string;
  initialTimeframe?: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ 
  symbol, 
  initialTimeframe = '1h' 
}) => {
  const chartRef = useRef<ChartJS>(null);
  const { currentData, currentTimeframe, isLoading, switchTimeframe } = 
    useMultiTimeframeData(symbol);
  const { data: realtimeData } = useRealtimeData(symbol, currentTimeframe);
  
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([
    {
      name: 'SMA 20',
      type: 'SMA',
      period: 20,
      color: '#3b82f6',
      data: []
    },
    {
      name: 'EMA 50',
      type: 'EMA',
      period: 50,
      color: '#f59e0b',
      data: []
    }
  ]);

  // Combine historical and real-time data
  const combinedData = useMemo(() => {
    if (!currentData.length) return realtimeData;
    if (!realtimeData.length) return currentData;
    
    // Merge data, ensuring no duplicates
    const lastHistoricalTime = new Date(currentData[currentData.length - 1].time);
    const realtimeDataFiltered = realtimeData.filter(
      candle => new Date(candle.time) > lastHistoricalTime
    );
    
    return [...currentData, ...realtimeDataFiltered];
  }, [currentData, realtimeData]);

  // Calculate indicators
  useEffect(() => {
    if (!combinedData.length) return;

    setIndicators(prev => prev.map(indicator => ({
      ...indicator,
      data: indicator.type === 'SMA' 
        ? calculateSMA(combinedData, indicator.period)
        : calculateEMA(combinedData, indicator.period)
    })));
  }, [combinedData]);

  const chartData: ChartData<'bar'> = useMemo(() => {
    if (!combinedData.length) return { datasets: [] };

    const candlestickData = createCandlestickData(combinedData);
    const datasets = [
      {
        type: 'bar' as const,
        label: 'Upper Shadow',
        data: candlestickData.upperShadows,
        backgroundColor: 'rgba(128, 128, 128, 0.8)',
        borderWidth: 0,
        barThickness: 1,
        order: 1
      },
      {
        type: 'bar' as const,
        label: 'Lower Shadow',
        data: candlestickData.lowerShadows,
        backgroundColor: 'rgba(128, 128, 128, 0.8)',
        borderWidth: 0,
        barThickness: 1,
        order: 1
      },
      {
        type: 'bar' as const,
        label: 'Bullish',
        data: candlestickData.bullishBodies,
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
        barThickness: 8,
        order: 2
      },
      {
        type: 'bar' as const,
        label: 'Bearish',
        data: candlestickData.bearishBodies,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
        barThickness: 8,
        order: 2
      }
    ];

    // Add indicator lines
    indicators.forEach(indicator => {
      datasets.push({
        type: 'line' as const,
        label: indicator.name,
        data: indicator.data.map((value, i) => ({
          x: combinedData[i]?.time,
          y: isNaN(value) ? null : value
        })),
        borderColor: indicator.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        order: 3,
        spanGaps: false
      });
    });

    return { datasets };
  }, [combinedData, indicators]);

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: currentTimeframe.includes('m') ? 'minute' : 
                currentTimeframe.includes('h') ? 'hour' : 'day',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'MMM dd HH:mm',
            day: 'MMM dd'
          }
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.2)'
        }
      },
      y: {
        type: 'linear',
        position: 'right',
        grid: {
          color: 'rgba(128, 128, 128, 0.2)'
        },
        ticks: {
          callback: function(value) {
            return '$' + Number(value).toFixed(2);
          }
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          filter: (legendItem) => {
            return !['Upper Shadow', 'Lower Shadow'].includes(legendItem.text || '');
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context) {
            return new Date(context[0].parsed.x).toLocaleString();
          },
          label: function(context) {
            const dataIndex = context.dataIndex;
            const ohlc = combinedData[dataIndex];
            
            if (context.datasetIndex < 4) {
              // OHLC data
              return [
                `Open: $${ohlc.open.toFixed(2)}`,
                `High: $${ohlc.high.toFixed(2)}`,
                `Low: $${ohlc.low.toFixed(2)}`,
                `Close: $${ohlc.close.toFixed(2)}`,
                ohlc.volume ? `Volume: ${ohlc.volume.toLocaleString()}` : ''
              ].filter(Boolean);
            } else {
              // Indicator data
              const value = context.parsed.y;
              return `${context.dataset.label}: ${value?.toFixed(2) || 'N/A'}`;
            }
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  return (
    <div className="trading-chart-container">
      <div className="chart-header">
        <h2>{symbol} - {currentTimeframe}</h2>
        <TimeframeSelector
          currentTimeframe={currentTimeframe}
          onTimeframeChange={switchTimeframe}
          isLoading={isLoading}
        />
      </div>
      
      <div className="chart-content" style={{ height: '500px' }}>
        {isLoading ? (
          <div className="loading-placeholder">Loading chart data...</div>
        ) : (
          <Chart
            ref={chartRef}
            type="bar"
            data={chartData}
            options={chartOptions}
          />
        )}
      </div>
      
      <div className="chart-controls">
        <button onClick={() => chartRef.current?.resetZoom()}>
          Reset Zoom
        </button>
        <button onClick={() => {
          const chart = chartRef.current;
          if (chart) {
            chart.options.plugins!.legend!.display = 
              !chart.options.plugins!.legend!.display;
            chart.update();
          }
        }}>
          Toggle Indicators
        </button>
      </div>
    </div>
  );
};

export default TradingChart;
```

## CSS Styles

```css
.trading-chart-container {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 16px;
  color: white;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.timeframe-selector {
  display: flex;
  gap: 4px;
  align-items: center;
}

.timeframe-btn {
  padding: 6px 12px;
  border: 1px solid #404040;
  background: #2a2a2a;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.timeframe-btn:hover {
  background: #3a3a3a;
  border-color: #606060;
}

.timeframe-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.chart-content {
  position: relative;
  background: #222;
  border-radius: 4px;
}

.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ccc;
}

.chart-controls {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.chart-controls button {
  padding: 8px 16px;
  border: 1px solid #404040;
  background: #2a2a2a;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.chart-controls button:hover {
  background: #3a3a3a;
}

.custom-tooltip {
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px;
  color: white;
  font-size: 12px;
  pointer-events: none;
  position: absolute;
  z-index: 1000;
}

.multi-panel-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

This comprehensive guide provides patterns for implementing professional financial charts using Chart.js with React and TypeScript. While Chart.js requires custom implementation for candlestick charts, it offers excellent performance and customization options. For more advanced financial charting needs, consider using TradingView's Lightweight Charts library, which is specifically designed for financial data visualization.