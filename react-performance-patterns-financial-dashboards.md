# React Performance Optimization Patterns for Financial Dashboards

This document provides comprehensive React performance optimization patterns specifically tailored for financial dashboards handling thousands of stocks and real-time data updates.

## Table of Contents
1. [React.memo for Expensive Components](#reactmemo-for-expensive-components)
2. [useMemo for Calculations](#usememo-for-calculations)
3. [Virtual Scrolling for Large Datasets](#virtual-scrolling-for-large-datasets)
4. [Chart Rendering Optimization](#chart-rendering-optimization)
5. [TypeScript Performance Patterns](#typescript-performance-patterns)
6. [Real-time Data Handling](#real-time-data-handling)
7. [Component Architecture Patterns](#component-architecture-patterns)

## React.memo for Expensive Components

### Basic React.memo Implementation

```tsx
import { memo } from 'react';

// Stock item component that should only re-render when its data changes
const StockItem = memo(function StockItem({ stock, onSelect }) {
  return (
    <div className="stock-item" onClick={() => onSelect(stock.symbol)}>
      <span>{stock.symbol}</span>
      <span className={stock.change >= 0 ? 'positive' : 'negative'}>
        ${stock.price} ({stock.change}%)
      </span>
    </div>
  );
});

// Stock list component that prevents re-rendering of individual items
const StockList = memo(function StockList({ stocks, onStockSelect }) {
  return (
    <div className="stock-list">
      {stocks.map(stock => (
        <StockItem 
          key={stock.symbol} 
          stock={stock} 
          onSelect={onStockSelect}
        />
      ))}
    </div>
  );
});
```

### Advanced React.memo with Custom Comparison

```tsx
import { memo } from 'react';

interface StockChartProps {
  symbol: string;
  data: StockData[];
  timeframe: string;
  indicators: string[];
}

// Custom comparison function for complex props
const StockChart = memo(function StockChart({ 
  symbol, 
  data, 
  timeframe, 
  indicators 
}: StockChartProps) {
  // Expensive chart rendering logic
  const chartData = useMemo(() => 
    processChartData(data, indicators), 
    [data, indicators]
  );

  return <Chart data={chartData} />;
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.timeframe === nextProps.timeframe &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data.every((item, index) => 
      item.timestamp === nextProps.data[index]?.timestamp &&
      item.price === nextProps.data[index]?.price
    ) &&
    prevProps.indicators.length === nextProps.indicators.length &&
    prevProps.indicators.every((indicator, index) => 
      indicator === nextProps.indicators[index]
    )
  );
});
```

## useMemo for Calculations

### Financial Calculations Memoization

```tsx
import { useMemo } from 'react';

function PortfolioSummary({ stocks, positions }) {
  // Memoize expensive portfolio calculations
  const portfolioMetrics = useMemo(() => {
    const totalValue = positions.reduce((sum, position) => {
      const stock = stocks.find(s => s.symbol === position.symbol);
      return sum + (stock?.price || 0) * position.quantity;
    }, 0);

    const totalCost = positions.reduce((sum, position) => 
      sum + position.costBasis * position.quantity, 0
    );

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    const diversification = calculateDiversification(positions, stocks);
    const riskMetrics = calculateRiskMetrics(positions, stocks);

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      diversification,
      riskMetrics
    };
  }, [stocks, positions]);

  return (
    <div className="portfolio-summary">
      <div>Total Value: ${portfolioMetrics.totalValue.toFixed(2)}</div>
      <div>Total Gain/Loss: ${portfolioMetrics.totalGainLoss.toFixed(2)}</div>
      <div>Percentage: {portfolioMetrics.totalGainLossPercent.toFixed(2)}%</div>
    </div>
  );
}
```

### Market Data Processing

```tsx
function MarketOverview({ rawMarketData, selectedSectors }) {
  // Memoize filtered and sorted market data
  const processedData = useMemo(() => {
    const filteredData = rawMarketData.filter(stock => 
      selectedSectors.includes(stock.sector)
    );

    const sortedData = filteredData.sort((a, b) => b.marketCap - a.marketCap);

    const sectorSummary = selectedSectors.map(sector => {
      const sectorStocks = filteredData.filter(stock => stock.sector === sector);
      return {
        sector,
        count: sectorStocks.length,
        avgChange: sectorStocks.reduce((sum, stock) => sum + stock.change, 0) / sectorStocks.length,
        totalMarketCap: sectorStocks.reduce((sum, stock) => sum + stock.marketCap, 0)
      };
    });

    return {
      stocks: sortedData,
      sectorSummary
    };
  }, [rawMarketData, selectedSectors]);

  return (
    <div className="market-overview">
      {processedData.sectorSummary.map(sector => (
        <SectorCard key={sector.sector} data={sector} />
      ))}
      <StockGrid stocks={processedData.stocks} />
    </div>
  );
}
```

### Technical Indicator Calculations

```tsx
function TechnicalAnalysis({ priceData, indicators }) {
  // Memoize technical indicator calculations
  const technicalData = useMemo(() => {
    const calculatedIndicators = {};

    if (indicators.includes('SMA')) {
      calculatedIndicators.sma20 = calculateSMA(priceData, 20);
      calculatedIndicators.sma50 = calculateSMA(priceData, 50);
    }

    if (indicators.includes('RSI')) {
      calculatedIndicators.rsi = calculateRSI(priceData, 14);
    }

    if (indicators.includes('MACD')) {
      calculatedIndicators.macd = calculateMACD(priceData);
    }

    if (indicators.includes('BB')) {
      calculatedIndicators.bollingerBands = calculateBollingerBands(priceData, 20, 2);
    }

    return calculatedIndicators;
  }, [priceData, indicators]);

  return (
    <div className="technical-analysis">
      {indicators.map(indicator => (
        <IndicatorChart 
          key={indicator}
          type={indicator}
          data={technicalData[indicator.toLowerCase()]}
        />
      ))}
    </div>
  );
}
```

## Virtual Scrolling for Large Datasets

### React Window Implementation

```tsx
import { FixedSizeList as List } from 'react-window';
import { memo } from 'react';

interface StockRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    stocks: Stock[];
    onStockClick: (stock: Stock) => void;
  };
}

// Virtualized stock row component
const StockRow = memo(({ index, style, data }: StockRowProps) => {
  const stock = data.stocks[index];
  
  return (
    <div 
      style={style}
      className="stock-row"
      onClick={() => data.onStockClick(stock)}
    >
      <div className="stock-symbol">{stock.symbol}</div>
      <div className="stock-name">{stock.name}</div>
      <div className="stock-price">${stock.price.toFixed(2)}</div>
      <div className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
      </div>
      <div className="stock-volume">{formatVolume(stock.volume)}</div>
    </div>
  );
});

// Virtual stock list component
function VirtualStockList({ stocks, onStockClick }) {
  const itemData = useMemo(() => ({
    stocks,
    onStockClick
  }), [stocks, onStockClick]);

  return (
    <List
      height={600}
      itemCount={stocks.length}
      itemSize={50}
      itemData={itemData}
      overscanCount={10}
    >
      {StockRow}
    </List>
  );
}
```

### Dynamic Height Virtual Scrolling

```tsx
import { VariableSizeList as List } from 'react-window';

// For variable height items (news articles, analysis reports)
const NewsRow = memo(({ index, style, data }) => {
  const article = data.articles[index];
  
  return (
    <div style={style} className="news-row">
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      <div className="news-meta">
        <span>{article.source}</span>
        <span>{formatDate(article.publishedAt)}</span>
      </div>
    </div>
  );
});

function VirtualNewsList({ articles }) {
  const getItemSize = useCallback((index) => {
    const article = articles[index];
    // Calculate dynamic height based on content
    const baseHeight = 100;
    const titleHeight = Math.ceil(article.title.length / 50) * 20;
    const summaryHeight = Math.ceil(article.summary.length / 80) * 16;
    return baseHeight + titleHeight + summaryHeight;
  }, [articles]);

  return (
    <List
      height={800}
      itemCount={articles.length}
      itemSize={getItemSize}
      itemData={{ articles }}
      overscanCount={5}
    >
      {NewsRow}
    </List>
  );
}
```

## Chart Rendering Optimization

### Optimized Chart Components with Recharts

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { memo, useMemo } from 'react';

// Memoized stock chart component
const StockChart = memo(function StockChart({ 
  data, 
  symbol, 
  timeframe,
  indicators = [] 
}) {
  // Memoize chart data processing
  const chartData = useMemo(() => {
    return data.map(point => ({
      timestamp: point.timestamp,
      price: point.price,
      volume: point.volume,
      date: new Date(point.timestamp).toLocaleDateString()
    }));
  }, [data]);

  // Memoize indicator calculations
  const indicatorData = useMemo(() => {
    const result = {};
    
    if (indicators.includes('SMA20')) {
      result.sma20 = calculateSMA(data, 20);
    }
    
    if (indicators.includes('SMA50')) {
      result.sma50 = calculateSMA(data, 50);
    }
    
    return result;
  }, [data, indicators]);

  // Memoize merged data
  const mergedData = useMemo(() => {
    return chartData.map((point, index) => ({
      ...point,
      ...Object.keys(indicatorData).reduce((acc, key) => {
        acc[key] = indicatorData[key][index];
        return acc;
      }, {})
    }));
  }, [chartData, indicatorData]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={mergedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#8884d8" 
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {indicators.includes('SMA20') && (
          <Line 
            type="monotone" 
            dataKey="sma20" 
            stroke="#ff7300" 
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
        )}
        {indicators.includes('SMA50') && (
          <Line 
            type="monotone" 
            dataKey="sma50" 
            stroke="#387908" 
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
});
```

### High-Performance Candlestick Chart

```tsx
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CandlestickChart = memo(function CandlestickChart({ data, width, height }) {
  // Memoize candlestick data processing
  const candlestickData = useMemo(() => {
    return data.map(candle => ({
      ...candle,
      bodyHeight: Math.abs(candle.close - candle.open),
      bodyY: Math.min(candle.open, candle.close),
      wickTop: candle.high - Math.max(candle.open, candle.close),
      wickBottom: Math.min(candle.open, candle.close) - candle.low,
      fill: candle.close >= candle.open ? '#00ff00' : '#ff0000'
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={height || 400}>
      <ComposedChart data={candlestickData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        {/* Candlestick bodies */}
        <Bar dataKey="bodyHeight" fill="fill" />
        {/* Candlestick wicks */}
        <Line dataKey="high" stroke="#666" strokeWidth={1} dot={false} />
        <Line dataKey="low" stroke="#666" strokeWidth={1} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
```

### Chart Data Sampling for Performance

```tsx
function useChartDataSampling(data: PricePoint[], maxPoints: number = 1000) {
  return useMemo(() => {
    if (data.length <= maxPoints) {
      return data;
    }

    const samplingRatio = Math.ceil(data.length / maxPoints);
    const sampledData = [];
    
    for (let i = 0; i < data.length; i += samplingRatio) {
      sampledData.push(data[i]);
    }
    
    // Always include the last data point
    if (sampledData[sampledData.length - 1] !== data[data.length - 1]) {
      sampledData.push(data[data.length - 1]);
    }
    
    return sampledData;
  }, [data, maxPoints]);
}

// Usage in chart component
function OptimizedChart({ rawData, symbol }) {
  const sampledData = useChartDataSampling(rawData, 500);
  
  return <StockChart data={sampledData} symbol={symbol} />;
}
```

## TypeScript Performance Patterns

### Efficient Type Definitions

```tsx
// Use specific types instead of generic ones
interface Stock {
  readonly symbol: string;
  readonly name: string;
  readonly price: number;
  readonly change: number;
  readonly volume: number;
  readonly marketCap: number;
  readonly sector: string;
}

// Use union types for known values
type TimeFrame = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y';
type OrderType = 'BUY' | 'SELL' | 'LIMIT' | 'STOP';

// Use mapped types for transformations
type StockUpdate = Pick<Stock, 'symbol' | 'price' | 'change' | 'volume'>;
type StockSummary = Omit<Stock, 'marketCap' | 'sector'>;

// Optimize component props with specific interfaces
interface StockListProps {
  readonly stocks: readonly Stock[];
  readonly onStockSelect: (symbol: string) => void;
  readonly sortBy?: keyof Stock;
  readonly filterBy?: string;
}
```

### Performance-Optimized Hooks with TypeScript

```tsx
// Custom hook with proper typing and memoization
function useStockData(symbol: string): {
  data: Stock | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchStockData(symbol);
      setData(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}

// Type-safe event handlers
interface StockEventHandlers {
  onStockClick: (stock: Stock) => void;
  onStockHover: (stock: Stock | null) => void;
  onStockSelect: (symbols: readonly string[]) => void;
}

const StockTable: React.FC<{
  stocks: readonly Stock[];
  handlers: StockEventHandlers;
}> = memo(({ stocks, handlers }) => {
  const handleRowClick = useCallback((stock: Stock) => {
    handlers.onStockClick(stock);
  }, [handlers]);

  return (
    <table>
      {stocks.map(stock => (
        <StockRow 
          key={stock.symbol}
          stock={stock}
          onClick={handleRowClick}
        />
      ))}
    </table>
  );
});
```

## Real-time Data Handling

### WebSocket Data Management

```tsx
import { useEffect, useRef, useCallback } from 'react';

interface RealTimeStockData {
  symbol: string;
  price: number;
  change: number;
  timestamp: number;
}

function useRealTimeStockData(symbols: string[]) {
  const [stockData, setStockData] = useState<Map<string, RealTimeStockData>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Memoize the update handler to prevent unnecessary re-renders
  const handleStockUpdate = useCallback((update: RealTimeStockData) => {
    setStockData(prev => {
      const newData = new Map(prev);
      newData.set(update.symbol, update);
      return newData;
    });
  }, []);

  // Batch updates for better performance
  const batchedUpdates = useRef<RealTimeStockData[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout>();

  const processBatchedUpdates = useCallback(() => {
    if (batchedUpdates.current.length > 0) {
      setStockData(prev => {
        const newData = new Map(prev);
        batchedUpdates.current.forEach(update => {
          newData.set(update.symbol, update);
        });
        return newData;
      });
      batchedUpdates.current = [];
    }
  }, []);

  const addToBatch = useCallback((update: RealTimeStockData) => {
    batchedUpdates.current.push(update);
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    batchTimeoutRef.current = setTimeout(processBatchedUpdates, 100); // Batch updates every 100ms
  }, [processBatchedUpdates]);

  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('wss://your-financial-data-feed.com');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        // Subscribe to symbols
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          symbols: symbols
        }));
      };

      wsRef.current.onmessage = (event) => {
        const update = JSON.parse(event.data) as RealTimeStockData;
        addToBatch(update);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [symbols, addToBatch]);

  return stockData;
}
```

### Throttled Updates for High-Frequency Data

```tsx
import { throttle } from 'lodash';

function useThrottledStockUpdates(symbol: string, throttleMs: number = 100) {
  const [stockData, setStockData] = useState<Stock | null>(null);

  // Throttled update function
  const throttledUpdate = useMemo(
    () => throttle((newData: Stock) => {
      setStockData(newData);
    }, throttleMs),
    [throttleMs]
  );

  useEffect(() => {
    const websocket = new WebSocket(`wss://stock-feed.com/${symbol}`);
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      throttledUpdate(data);
    };

    return () => {
      websocket.close();
      throttledUpdate.cancel();
    };
  }, [symbol, throttledUpdate]);

  return stockData;
}
```

## Component Architecture Patterns

### Container-Presenter Pattern

```tsx
// Container component handles data and logic
function StockDashboardContainer() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['AAPL', 'GOOGL', 'MSFT']);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1D');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const stockData = useRealTimeStockData(selectedSymbols);
  const historicalData = useHistoricalData(selectedSymbols, timeframe);

  const handleSymbolAdd = useCallback((symbol: string) => {
    setSelectedSymbols(prev => [...prev, symbol]);
  }, []);

  const handleSymbolRemove = useCallback((symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  }, []);

  const handleTimeframeChange = useCallback((newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe);
  }, []);

  return (
    <StockDashboardPresenter
      stockData={stockData}
      historicalData={historicalData}
      selectedSymbols={selectedSymbols}
      timeframe={timeframe}
      viewMode={viewMode}
      onSymbolAdd={handleSymbolAdd}
      onSymbolRemove={handleSymbolRemove}
      onTimeframeChange={handleTimeframeChange}
      onViewModeChange={setViewMode}
    />
  );
}

// Presenter component handles UI rendering
const StockDashboardPresenter = memo(function StockDashboardPresenter({
  stockData,
  historicalData,
  selectedSymbols,
  timeframe,
  viewMode,
  onSymbolAdd,
  onSymbolRemove,
  onTimeframeChange,
  onViewModeChange
}) {
  return (
    <div className="stock-dashboard">
      <DashboardHeader
        timeframe={timeframe}
        viewMode={viewMode}
        onTimeframeChange={onTimeframeChange}
        onViewModeChange={onViewModeChange}
      />
      <StockSelector
        selectedSymbols={selectedSymbols}
        onSymbolAdd={onSymbolAdd}
        onSymbolRemove={onSymbolRemove}
      />
      <StockDataDisplay
        stockData={stockData}
        historicalData={historicalData}
        viewMode={viewMode}
      />
    </div>
  );
});
```

### Context Optimization for Global State

```tsx
// Optimized context that prevents unnecessary re-renders
const StockDataContext = createContext<{
  stockData: Map<string, Stock>;
  subscribeToStock: (symbol: string) => void;
  unsubscribeFromStock: (symbol: string) => void;
} | null>(null);

const StockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stockData, setStockData] = useState<Map<string, Stock>>(new Map());
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set());

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    stockData,
    subscribeToStock: (symbol: string) => {
      setSubscribedSymbols(prev => new Set([...prev, symbol]));
    },
    unsubscribeFromStock: (symbol: string) => {
      setSubscribedSymbols(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  }), [stockData]);

  return (
    <StockDataContext.Provider value={contextValue}>
      {children}
    </StockDataContext.Provider>
  );
};

// Custom hook for consuming stock data
function useStockData(symbol?: string) {
  const context = useContext(StockDataContext);
  if (!context) {
    throw new Error('useStockData must be used within StockDataProvider');
  }

  const stockData = symbol ? context.stockData.get(symbol) : null;
  
  useEffect(() => {
    if (symbol) {
      context.subscribeToStock(symbol);
      return () => context.unsubscribeFromStock(symbol);
    }
  }, [symbol, context]);

  return stockData;
}
```

## Performance Monitoring and Debugging

### Performance Profiling Component

```tsx
import { Profiler } from 'react';

function onRenderCallback(id: string, phase: 'mount' | 'update', actualDuration: number) {
  console.log(`Component ${id} ${phase} took ${actualDuration}ms`);
  
  // Send to analytics service
  if (actualDuration > 100) {
    analytics.track('slow_render', {
      componentId: id,
      phase,
      duration: actualDuration
    });
  }
}

function App() {
  return (
    <Profiler id="StockDashboard" onRender={onRenderCallback}>
      <StockDashboard />
    </Profiler>
  );
}
```

### Development Tools for Performance

```tsx
// Development-only performance monitoring
const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  if (process.env.NODE_ENV !== 'development') {
    return Component;
  }

  return React.forwardRef<any, P>((props, ref) => {
    const renderStartTime = performance.now();
    
    useEffect(() => {
      const renderEndTime = performance.now();
      const renderTime = renderEndTime - renderStartTime;
      
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`${componentName} took ${renderTime.toFixed(2)}ms to render`);
      }
    });

    return <Component {...props} ref={ref} />;
  });
};

// Usage
const MonitoredStockChart = withPerformanceMonitoring(StockChart, 'StockChart');
```

## Best Practices Summary

### 1. Component Optimization Checklist
- [ ] Use React.memo for components that render frequently
- [ ] Implement custom comparison functions for complex props
- [ ] Use useMemo for expensive calculations
- [ ] Use useCallback for event handlers passed to child components
- [ ] Implement virtual scrolling for large lists (>100 items)

### 2. Data Management Best Practices
- [ ] Batch WebSocket updates to reduce re-renders
- [ ] Use throttling for high-frequency data updates
- [ ] Implement data normalization for complex state
- [ ] Use immutable data structures where possible
- [ ] Cache API responses with proper invalidation

### 3. Chart Performance Guidelines
- [ ] Disable animations for real-time charts
- [ ] Sample data points for large datasets
- [ ] Use appropriate chart types for data size
- [ ] Implement lazy loading for off-screen charts
- [ ] Optimize tooltip calculations

### 4. TypeScript Performance Tips
- [ ] Use specific types instead of `any`
- [ ] Implement proper prop interfaces
- [ ] Use readonly modifiers for immutable data
- [ ] Leverage union types for known values
- [ ] Use mapped types for transformations

This comprehensive guide provides the foundation for building high-performance React financial dashboards that can handle thousands of stocks efficiently while maintaining smooth user interactions and real-time updates.