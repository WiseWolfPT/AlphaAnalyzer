/**
 * LAZY LOADING COM INTERSECTION OBSERVER
 * Implementação extrema para performance > 98
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyChartProps {
  data: any;
  type?: 'line' | 'bar' | 'pie' | 'area';
  className?: string;
  height?: number;
  width?: number;
  threshold?: number;
  rootMargin?: string;
  preloadDistance?: number;
}

interface ChartMetrics {
  loadTime: number;
  renderTime: number;
  dataSize: number;
  intersectionTime: number;
}

// Performance tracker para charts
class ChartPerformanceTracker {
  private metrics: Map<string, ChartMetrics> = new Map();
  
  track(id: string, metrics: ChartMetrics) {
    this.metrics.set(id, metrics);
    
    // Log slow charts
    if (metrics.loadTime > 1000) {
      console.warn(`🐌 Slow chart load: ${id} (${metrics.loadTime}ms)`);
    }
    
    // Log para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Chart ${id}:`, {
        load: `${metrics.loadTime}ms`,
        render: `${metrics.renderTime}ms`,
        intersection: `${metrics.intersectionTime}ms`,
        dataSize: `${metrics.dataSize} items`
      });
    }
  }
  
  getMetrics() {
    return Array.from(this.metrics.entries());
  }
  
  getAverageLoadTime() {
    const metrics = Array.from(this.metrics.values());
    return metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length;
  }
}

const chartTracker = new ChartPerformanceTracker();

// Componente otimizado com memo e lazy loading
const LazyChart: React.FC<LazyChartProps> = memo(({ 
  data, 
  type = 'line',
  className = '',
  height = 300,
  width,
  threshold = 0.1,
  rootMargin = '100px',
  preloadDistance = 200
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const ref = useRef<HTMLDivElement>(null);
  const loadStartTime = useRef<number>(0);
  const intersectionTime = useRef<number>(0);
  const chartId = useRef<string>(`chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Intersection Observer com performance otimizada
  useEffect(() => {
    if (!ref.current || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            intersectionTime.current = performance.now();
            setShouldLoad(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin, shouldLoad]);

  // Preload quando próximo do viewport
  useEffect(() => {
    if (!ref.current || shouldLoad) return;

    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const isNearViewport = rect.top < window.innerHeight + preloadDistance;
      
      if (isNearViewport && !shouldLoad) {
        setShouldLoad(true);
      }
    };

    // Throttle scroll listener
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [preloadDistance, shouldLoad]);

  // Dynamic import com retry logic
  useEffect(() => {
    if (!shouldLoad || ChartComponent) return;

    const loadChart = async () => {
      setIsLoading(true);
      setError(null);
      loadStartTime.current = performance.now();

      try {
        let chartModule;
        const maxRetries = 3;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            switch (type) {
              case 'line':
                chartModule = await import('@/components/ui/lightweight-chart')
                  .then(m => m.LightweightLineChart);
                break;
              case 'bar':
                chartModule = await import('@/components/ui/lightweight-chart')
                  .then(m => m.LightweightBarChart);
                break;
              case 'pie':
                chartModule = await import('@/components/ui/lightweight-chart')
                  .then(m => m.LightweightPieChart);
                break;
              case 'area':
                chartModule = await import('@/components/ui/lightweight-chart')
                  .then(m => m.LightweightAreaChart);
                break;
              default:
                chartModule = await import('@/components/ui/lightweight-chart')
                  .then(m => m.LightweightLineChart);
            }
            break;
          } catch (err) {
            if (attempt === maxRetries) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }

        const loadTime = performance.now() - loadStartTime.current;
        const renderStartTime = performance.now();
        
        setChartComponent(() => chartModule);
        
        // Track performance após render
        setTimeout(() => {
          const renderTime = performance.now() - renderStartTime;
          chartTracker.track(chartId.current, {
            loadTime,
            renderTime,
            dataSize: Array.isArray(data) ? data.length : 0,
            intersectionTime: intersectionTime.current
          });
        }, 100);
        
      } catch (err) {
        console.error('Failed to load chart:', err);
        setError(`Failed to load ${type} chart`);
      } finally {
        setIsLoading(false);
      }
    };

    loadChart();
  }, [shouldLoad, type, data, ChartComponent]);

  // Memoized skeleton component
  const SkeletonComponent = memo(() => (
    <div className={`animate-pulse ${className}`} style={{ height, width }}>
      <Skeleton className="w-full h-full rounded-lg" />
      <div className="mt-2 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  ));

  // Error component
  const ErrorComponent = memo(({ error }: { error: string }) => (
    <div className={`flex items-center justify-center border-2 border-dashed border-red-300 rounded-lg ${className}`} 
         style={{ height, width }}>
      <div className="text-center text-red-500">
        <p className="text-sm font-medium">Chart Load Error</p>
        <p className="text-xs mt-1">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setShouldLoad(true);
          }}
          className="mt-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
        >
          Retry
        </button>
      </div>
    </div>
  ));

  return (
    <div ref={ref} className={`relative ${className}`}>
      {error ? (
        <ErrorComponent error={error} />
      ) : !shouldLoad ? (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg" 
             style={{ height, width }}>
          <div className="text-center text-gray-500">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto mb-2"></div>
              <p className="text-sm">Loading chart...</p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <SkeletonComponent />
      ) : ChartComponent ? (
        <div className="chart-container">
          <ChartComponent 
            data={data}
            height={height}
            width={width}
            className={className}
          />
        </div>
      ) : (
        <SkeletonComponent />
      )}
    </div>
  );
});

LazyChart.displayName = 'LazyChart';

// HOC para adicionar performance monitoring
export const withChartPerformance = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    const startTime = useRef(performance.now());
    
    useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      
      if (renderTime > 100) {
        console.warn(`Slow chart render: ${renderTime}ms`);
      }
    }, []);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withChartPerformance(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Utilitário para obter métricas de performance
export const getChartMetrics = () => {
  const metrics = chartTracker.getMetrics();
  const averageLoadTime = chartTracker.getAverageLoadTime();
  
  return {
    totalCharts: metrics.length,
    averageLoadTime,
    slowCharts: metrics.filter(([, m]) => m.loadTime > 1000),
    fastCharts: metrics.filter(([, m]) => m.loadTime < 500),
    recommendations: averageLoadTime > 1000 ? 
      'Consider optimizing chart data or using lighter chart library' : 
      'Chart performance is optimal'
  };
};

// Preload de componentes críticos
export const preloadChartComponents = () => {
  const preloadPromises = [
    import('@/components/ui/lightweight-chart'),
    import('@/components/ui/skeleton')
  ];

  Promise.all(preloadPromises).catch(() => {
    console.warn('Failed to preload some chart components');
  });
};

// Batch loading para múltiplos charts
export const BatchChartLoader = ({ charts }: { charts: Array<{ id: string; type: string; data: any }> }) => {
  const [loadedCharts, setLoadedCharts] = useState<Set<string>>(new Set());
  
  const loadChart = (chartId: string) => {
    setLoadedCharts(prev => new Set(prev).add(chartId));
  };

  return (
    <div className="space-y-4">
      {charts.map(chart => (
        <div key={chart.id} className="chart-batch-item">
          <LazyChart
            data={chart.data}
            type={chart.type as any}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
};

export default LazyChart;