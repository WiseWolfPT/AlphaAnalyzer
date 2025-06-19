import React, { useMemo, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { StockCard } from './stock-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { MockStock } from '@/lib/mock-api';

interface VirtualizedStockListProps {
  stocks: MockStock[];
  height: number;
  onPerformanceClick: (stock: MockStock) => void;
  onQuickInfoClick: (stock: MockStock) => void;
  showMiniChart?: boolean;
  loading?: boolean;
  itemHeight?: number;
}

// Memoized row component to prevent unnecessary re-renders
const StockRow = memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: {
    stocks: MockStock[];
    onPerformanceClick: (stock: MockStock) => void;
    onQuickInfoClick: (stock: MockStock) => void;
    showMiniChart: boolean;
  };
}) => {
  const { stocks, onPerformanceClick, onQuickInfoClick, showMiniChart } = data;
  const stock = stocks[index];

  if (!stock) {
    return (
      <div style={style} className="p-4">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div style={style} className="p-2">
      <StockCard
        stock={stock}
        onPerformanceClick={() => onPerformanceClick(stock)}
        onQuickInfoClick={() => onQuickInfoClick(stock)}
        showMiniChart={showMiniChart}
      />
    </div>
  );
});

StockRow.displayName = 'StockRow';

export const VirtualizedStockList = memo(({
  stocks,
  height,
  onPerformanceClick,
  onQuickInfoClick,
  showMiniChart = true,
  loading = false,
  itemHeight = 280 // Optimized height for stock cards including mini charts
}: VirtualizedStockListProps) => {
  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    stocks,
    onPerformanceClick,
    onQuickInfoClick,
    showMiniChart
  }), [stocks, onPerformanceClick, onQuickInfoClick, showMiniChart]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Handle keyboard navigation for accessibility
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      // Custom keyboard navigation logic can be added here
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-4" style={{ height }}>
        {Array.from({ length: Math.ceil(height / itemHeight) }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">📈</div>
          <p>No stocks found</p>
        </div>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={stocks.length}
      itemSize={itemHeight}
      itemData={itemData}
      onKeyDown={handleKeyDown}
      className="focus:outline-none"
      style={{
        overflowX: 'hidden', // Prevent horizontal scrolling
      }}
    >
      {StockRow}
    </List>
  );
});

VirtualizedStockList.displayName = 'VirtualizedStockList';

// Grid virtualization for multiple columns
interface VirtualizedStockGridProps extends VirtualizedStockListProps {
  columns: number;
  width: number;
}

const StockGridRow = memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: {
    stocks: MockStock[];
    onPerformanceClick: (stock: MockStock) => void;
    onQuickInfoClick: (stock: MockStock) => void;
    showMiniChart: boolean;
    columns: number;
  };
}) => {
  const { stocks, onPerformanceClick, onQuickInfoClick, showMiniChart, columns } = data;
  
  return (
    <div style={style} className="flex gap-4 px-2">
      {Array.from({ length: columns }).map((_, colIndex) => {
        const stockIndex = index * columns + colIndex;
        const stock = stocks[stockIndex];
        
        if (!stock) {
          return <div key={colIndex} className="flex-1" />;
        }

        return (
          <div key={stock.symbol} className="flex-1 min-w-0">
            <StockCard
              stock={stock}
              onPerformanceClick={() => onPerformanceClick(stock)}
              onQuickInfoClick={() => onQuickInfoClick(stock)}
              showMiniChart={showMiniChart}
            />
          </div>
        );
      })}
    </div>
  );
});

StockGridRow.displayName = 'StockGridRow';

export const VirtualizedStockGrid = memo(({
  stocks,
  height,
  width,
  columns,
  onPerformanceClick,
  onQuickInfoClick,
  showMiniChart = true,
  loading = false,
  itemHeight = 280
}: VirtualizedStockGridProps) => {
  const itemData = useMemo(() => ({
    stocks,
    onPerformanceClick,
    onQuickInfoClick,
    showMiniChart,
    columns
  }), [stocks, onPerformanceClick, onQuickInfoClick, showMiniChart, columns]);

  const rowCount = Math.ceil(stocks.length / columns);

  if (loading) {
    return (
      <div className="grid gap-4" style={{ 
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        height 
      }}>
        {Array.from({ length: columns * Math.ceil(height / itemHeight) }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={rowCount}
      itemSize={itemHeight}
      itemData={itemData}
      width={width}
      className="focus:outline-none"
    >
      {StockGridRow}
    </List>
  );
});

VirtualizedStockGrid.displayName = 'VirtualizedStockGrid';