import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Lazy loading with error boundaries and loading states
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ComponentType
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importFn();
      return module;
    } catch (error) {
      console.error('Failed to load component:', error);
      // Return a fallback component if loading fails
      if (fallback) {
        return { default: fallback };
      }
      throw error;
    }
  });
}

// Preload components for better UX
export function preloadComponent(importFn: () => Promise<any>) {
  return importFn();
}

// Financial dashboard route-based code splitting
export const LazyComponents = {
  // Main dashboard components
  Dashboard: createLazyComponent(() => import('@/pages/landing')),
  StockCharts: createLazyComponent(() => import('@/pages/StockCharts')),
  AdvancedCharts: createLazyComponent(() => import('@/pages/AdvancedCharts')),
  
  // Financial analysis components
  IntrinsicValue: createLazyComponent(() => import('@/pages/intrinsic-value')),
  Earnings: createLazyComponent(() => import('@/pages/earnings')),
  Insights: createLazyComponent(() => import('@/pages/insights-safe')),
  
  // Portfolio management
  Portfolios: createLazyComponent(() => import('@/pages/portfolios')),
  Watchlists: createLazyComponent(() => import('@/pages/watchlists')),
  
  // Heavy chart components
  PriceChart: createLazyComponent(() => import('@/components/charts/price-chart')),
  RevenueChart: createLazyComponent(() => import('@/components/charts/revenue-chart')),
  EarningsChart: createLazyComponent(() => import('@/components/charts/eps-chart')),
  CashFlowChart: createLazyComponent(() => import('@/components/charts/free-cash-flow-chart')),
  
  // Market analysis tools
  SectorPerformance: createLazyComponent(() => import('@/components/stock/sector-performance')),
  EarningsTrends: createLazyComponent(() => import('@/components/stock/earnings-trends')),
  
  // Modals and heavy UI
  PerformanceModal: createLazyComponent(() => import('@/components/stock/performance-modal')),
  QuickInfoModal: createLazyComponent(() => import('@/components/stock/quick-info-modal')),
};

// Dynamic imports for chart libraries based on chart type
export const ChartLibraries = {
  async loadRechartsComponents() {
    const [
      { ResponsiveContainer },
      { LineChart, Line },
      { AreaChart, Area },
      { BarChart, Bar },
      { PieChart, Pie },
      { Tooltip },
      { XAxis, YAxis },
      { CartesianGrid }
    ] = await Promise.all([
      import('recharts').then(m => ({ ResponsiveContainer: m.ResponsiveContainer })),
      import('recharts').then(m => ({ LineChart: m.LineChart, Line: m.Line })),
      import('recharts').then(m => ({ AreaChart: m.AreaChart, Area: m.Area })),
      import('recharts').then(m => ({ BarChart: m.BarChart, Bar: m.Bar })),
      import('recharts').then(m => ({ PieChart: m.PieChart, Pie: m.Pie })),
      import('recharts').then(m => ({ Tooltip: m.Tooltip })),
      import('recharts').then(m => ({ XAxis: m.XAxis, YAxis: m.YAxis })),
      import('recharts').then(m => ({ CartesianGrid: m.CartesianGrid })),
    ]);

    return {
      ResponsiveContainer,
      LineChart,
      Line,
      AreaChart,
      Area,
      BarChart,
      Bar,
      PieChart,
      Pie,
      Tooltip,
      XAxis,
      YAxis,
      CartesianGrid
    };
  },

  async loadVirtualizationComponents() {
    const [
      { FixedSizeList },
      { VariableSizeList },
      { FixedSizeGrid },
      { Virtuoso },
      { TableVirtuoso }
    ] = await Promise.all([
      import('react-window').then(m => ({ FixedSizeList: m.FixedSizeList })),
      import('react-window').then(m => ({ VariableSizeList: m.VariableSizeList })),
      import('react-window').then(m => ({ FixedSizeGrid: m.FixedSizeGrid })),
      import('react-virtuoso').then(m => ({ Virtuoso: m.Virtuoso })),
      import('react-virtuoso').then(m => ({ TableVirtuoso: m.TableVirtuoso })),
    ]);

    return {
      FixedSizeList,
      VariableSizeList,
      FixedSizeGrid,
      Virtuoso,
      TableVirtuoso
    };
  }
};

// Service worker for caching financial data
export const ServiceWorkerUtils = {
  register: async () => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered: ', registration);
        return registration;
      } catch (error) {
        console.log('SW registration failed: ', error);
      }
    }
  },

  // Cache financial API responses
  cacheFinancialData: async (key: string, data: any, ttl = 300000) => { // 5 minutes default
    if ('caches' in window) {
      const cache = await caches.open('financial-data-v1');
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${ttl / 1000}`
        }
      });
      await cache.put(key, response);
    }
  },

  getCachedFinancialData: async (key: string) => {
    if ('caches' in window) {
      const cache = await caches.open('financial-data-v1');
      const response = await cache.match(key);
      if (response) {
        return await response.json();
      }
    }
    return null;
  }
};

// Bundle analyzer utilities
export const BundleAnalyzer = {
  // Measure and report chunk loading times
  measureChunkLoad: async (chunkName: string, loadFn: () => Promise<any>) => {
    const start = performance.now();
    try {
      const result = await loadFn();
      const loadTime = performance.now() - start;
      
      console.log(`[Bundle] ${chunkName} loaded in ${loadTime.toFixed(2)}ms`);
      
      // Report to analytics if needed
      if (typeof gtag !== 'undefined') {
        gtag('event', 'chunk_load_time', {
          chunk_name: chunkName,
          load_time: Math.round(loadTime)
        });
      }
      
      return result;
    } catch (error) {
      const loadTime = performance.now() - start;
      console.error(`[Bundle] ${chunkName} failed to load after ${loadTime.toFixed(2)}ms:`, error);
      throw error;
    }
  },

  // Get current bundle information
  getBundleInfo: () => {
    const scripts = Array.from(document.scripts);
    const chunks = scripts
      .filter(script => script.src.includes('chunk'))
      .map(script => ({
        src: script.src,
        loaded: true,
        size: script.src.length // Approximate
      }));

    return {
      totalChunks: chunks.length,
      chunks,
      timestamp: Date.now()
    };
  }
};

// Progressive loading strategies
export const ProgressiveLoading = {
  // Load components based on viewport intersection
  loadOnVisible: (elementId: string, importFn: () => Promise<any>) => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            importFn();
            observer.unobserve(entry.target);
          }
        });
      });

      const element = document.getElementById(elementId);
      if (element) {
        observer.observe(element);
      }
    } else {
      // Fallback for browsers without IntersectionObserver
      importFn();
    }
  },

  // Load components on user interaction
  loadOnInteraction: (events: string[], importFn: () => Promise<any>) => {
    const load = () => {
      importFn();
      events.forEach(event => {
        document.removeEventListener(event, load);
      });
    };

    events.forEach(event => {
      document.addEventListener(event, load, { once: true });
    });
  },

  // Load components after critical resources
  loadAfterCritical: (importFn: () => Promise<any>, delay = 100) => {
    if (document.readyState === 'complete') {
      setTimeout(importFn, delay);
    } else {
      window.addEventListener('load', () => {
        setTimeout(importFn, delay);
      });
    }
  }
};

// Resource prioritization
export const ResourcePrioritization = {
  // Preload critical financial data
  preloadCriticalData: async () => {
    const criticalEndpoints = [
      '/api/stocks', // Main stock list
      '/api/markets/status', // Market status
      '/api/user/watchlist' // User's watchlist
    ];

    return Promise.allSettled(
      criticalEndpoints.map(endpoint => 
        fetch(endpoint).then(r => r.json())
      )
    );
  },

  // Prefetch likely-to-be-needed resources
  prefetchResources: (resources: string[]) => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  },

  // Priority loading for chart data
  loadChartDataByPriority: async (symbols: string[]) => {
    // Load most important stocks first (user's watchlist)
    const prioritySymbols = symbols.slice(0, 5);
    const remainingSymbols = symbols.slice(5);

    // Load priority symbols immediately
    const priorityPromises = prioritySymbols.map(symbol =>
      fetch(`/api/stocks/${symbol}/chart`).then(r => r.json())
    );

    const priorityResults = await Promise.allSettled(priorityPromises);

    // Load remaining symbols with slight delay to not overwhelm the API
    const remainingPromises = remainingSymbols.map((symbol, index) =>
      new Promise(resolve => {
        setTimeout(() => {
          fetch(`/api/stocks/${symbol}/chart`)
            .then(r => r.json())
            .then(resolve)
            .catch(resolve);
        }, index * 100); // Stagger requests
      })
    );

    const remainingResults = await Promise.allSettled(remainingPromises);

    return [...priorityResults, ...remainingResults];
  }
};