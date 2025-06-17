import { useState, useEffect } from 'react';

export interface ChartItem {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  visible: boolean;
}

const DEFAULT_CHARTS: ChartItem[] = [
  { id: 'price-chart', name: 'Price', component: null as any, visible: true },
  { id: 'revenue-chart', name: 'Revenue', component: null as any, visible: true },
  { id: 'revenue-segment-chart', name: 'Revenue by Segment', component: null as any, visible: true },
  { id: 'ebitda-chart', name: 'EBITDA', component: null as any, visible: true },
  { id: 'fcf-chart', name: 'Free Cash Flow', component: null as any, visible: true },
  { id: 'net-income-chart', name: 'Net Income', component: null as any, visible: true },
  { id: 'eps-chart', name: 'EPS', component: null as any, visible: true },
  { id: 'cash-debt-chart', name: 'Cash & Debt', component: null as any, visible: true },
  { id: 'dividends-chart', name: 'Dividends', component: null as any, visible: true },
  { id: 'return-capital-chart', name: 'Return of Capital', component: null as any, visible: true },
  { id: 'shares-chart', name: 'Shares Outstanding', component: null as any, visible: true },
  { id: 'ratios-chart', name: 'Ratios', component: null as any, visible: true },
  { id: 'valuation-chart', name: 'Valuation', component: null as any, visible: true },
  { id: 'expenses-chart', name: 'Expenses', component: null as any, visible: true },
];

export function useChartLayout(symbol?: string) {
  const [charts, setCharts] = useState<ChartItem[]>(DEFAULT_CHARTS);
  const [isCustomized, setIsCustomized] = useState(false);

  // Storage key based on stock symbol for per-stock layouts
  const storageKey = symbol ? `chart-layout-${symbol}` : 'chart-layout-default';

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(storageKey);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        setCharts(parsedLayout);
        setIsCustomized(true);
      }
    } catch (error) {
      console.error('Error loading chart layout:', error);
    }
  }, [storageKey]);

  // Save layout to localStorage
  const saveLayout = (newCharts: ChartItem[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newCharts));
      setCharts(newCharts);
      setIsCustomized(true);
    } catch (error) {
      console.error('Error saving chart layout:', error);
    }
  };

  // Reorder charts
  const reorderCharts = (newCharts: ChartItem[]) => {
    saveLayout(newCharts);
  };

  // Toggle chart visibility
  const toggleChartVisibility = (chartId: string) => {
    const newCharts = charts.map(chart => 
      chart.id === chartId 
        ? { ...chart, visible: !chart.visible }
        : chart
    );
    saveLayout(newCharts);
  };

  // Reset to default layout
  const resetLayout = () => {
    try {
      localStorage.removeItem(storageKey);
      setCharts(DEFAULT_CHARTS);
      setIsCustomized(false);
    } catch (error) {
      console.error('Error resetting chart layout:', error);
    }
  };

  // Get visible charts only
  const visibleCharts = charts.filter(chart => chart.visible);

  return {
    charts,
    visibleCharts,
    isCustomized,
    reorderCharts,
    toggleChartVisibility,
    resetLayout,
  };
}