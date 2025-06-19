import { useEffect, useRef, useCallback, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentCounts: Record<string, number>;
  reRenderCount: number;
  lastUpdate: number;
}

interface PerformanceConfig {
  trackMemory?: boolean;
  sampleRate?: number;
  reportThreshold?: number;
  onReport?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(
  componentName: string,
  config: PerformanceConfig = {}
) {
  const {
    trackMemory = false,
    sampleRate = 1.0,
    reportThreshold = 16, // 60fps threshold
    onReport
  } = config;

  const renderCount = useRef(0);
  const startTime = useRef<number>();
  const lastReportTime = useRef(Date.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCounts: {},
    reRenderCount: 0,
    lastUpdate: Date.now()
  });

  // Track render start
  const markRenderStart = useCallback(() => {
    if (Math.random() > sampleRate) return;
    startTime.current = performance.now();
  }, [sampleRate]);

  // Track render end and calculate metrics
  const markRenderEnd = useCallback(() => {
    if (!startTime.current) return;
    
    const renderTime = performance.now() - startTime.current;
    renderCount.current++;

    const newMetrics: PerformanceMetrics = {
      renderTime,
      reRenderCount: renderCount.current,
      componentCounts: {
        ...metrics.componentCounts,
        [componentName]: (metrics.componentCounts[componentName] || 0) + 1
      },
      lastUpdate: Date.now()
    };

    // Add memory usage if tracking
    if (trackMemory && 'memory' in performance) {
      const memInfo = (performance as any).memory;
      newMetrics.memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // MB
    }

    setMetrics(newMetrics);

    // Report if threshold exceeded
    if (renderTime > reportThreshold && onReport) {
      onReport(newMetrics);
    }

    startTime.current = undefined;
  }, [componentName, reportThreshold, onReport, trackMemory, metrics.componentCounts]);

  // Effect to track renders
  useEffect(() => {
    markRenderStart();
    return markRenderEnd;
  });

  return {
    metrics,
    markRenderStart,
    markRenderEnd,
    reset: useCallback(() => {
      renderCount.current = 0;
      setMetrics({
        renderTime: 0,
        componentCounts: {},
        reRenderCount: 0,
        lastUpdate: Date.now()
      });
    }, [])
  };
}

// Hook for tracking data loading performance
export function useDataLoadingPerformance() {
  const [loadingMetrics, setLoadingMetrics] = useState<{
    isLoading: boolean;
    loadTime: number;
    dataSize: number;
    errorCount: number;
  }>({
    isLoading: false,
    loadTime: 0,
    dataSize: 0,
    errorCount: 0
  });

  const startTime = useRef<number>();

  const startLoading = useCallback(() => {
    startTime.current = performance.now();
    setLoadingMetrics(prev => ({ ...prev, isLoading: true }));
  }, []);

  const endLoading = useCallback((dataSize = 0, hasError = false) => {
    const loadTime = startTime.current ? performance.now() - startTime.current : 0;
    
    setLoadingMetrics(prev => ({
      isLoading: false,
      loadTime,
      dataSize,
      errorCount: prev.errorCount + (hasError ? 1 : 0)
    }));
  }, []);

  return {
    loadingMetrics,
    startLoading,
    endLoading
  };
}

// Hook for monitoring memory leaks
export function useMemoryMonitor(intervalMs = 5000) {
  const [memoryStats, setMemoryStats] = useState<{
    current: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>({
    current: 0,
    peak: 0,
    trend: 'stable'
  });

  const previousMemory = useRef<number[]>([]);

  useEffect(() => {
    if (!('memory' in performance)) return;

    const interval = setInterval(() => {
      const memInfo = (performance as any).memory;
      const currentMemory = memInfo.usedJSHeapSize / 1024 / 1024;
      
      previousMemory.current.push(currentMemory);
      if (previousMemory.current.length > 10) {
        previousMemory.current.shift();
      }

      // Calculate trend
      const recent = previousMemory.current.slice(-3);
      const trend = recent.length >= 3 
        ? recent[2] > recent[0] * 1.1 ? 'increasing'
        : recent[2] < recent[0] * 0.9 ? 'decreasing'
        : 'stable'
        : 'stable';

      setMemoryStats(prev => ({
        current: currentMemory,
        peak: Math.max(prev.peak, currentMemory),
        trend
      }));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return memoryStats;
}

// Performance debugging utilities
export const PerformanceUtils = {
  // Measure function execution time
  measureAsync: async <T>(fn: () => Promise<T>, label: string): Promise<{ result: T; time: number }> => {
    const start = performance.now();
    const result = await fn();
    const time = performance.now() - start;
    
    console.log(`[Performance] ${label}: ${time.toFixed(2)}ms`);
    return { result, time };
  },

  // Measure synchronous function
  measure: <T>(fn: () => T, label: string): { result: T; time: number } => {
    const start = performance.now();
    const result = fn();
    const time = performance.now() - start;
    
    console.log(`[Performance] ${label}: ${time.toFixed(2)}ms`);
    return { result, time };
  },

  // Create a performance budget checker
  createBudgetChecker: (budgets: Record<string, number>) => {
    return (operation: string, time: number) => {
      const budget = budgets[operation];
      if (budget && time > budget) {
        console.warn(`[Performance Budget] ${operation} exceeded budget: ${time.toFixed(2)}ms > ${budget}ms`);
        return false;
      }
      return true;
    };
  },

  // Memory usage reporter
  reportMemoryUsage: (label: string) => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      console.log(`[Memory] ${label}:`, {
        used: `${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }
};

// React DevTools Profiler integration
export function useProfiler(id: string, onRender?: (id: string, phase: string, actualDuration: number) => void) {
  const handleRender = useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>
  ) => {
    if (onRender) {
      onRender(id, phase, actualDuration);
    }
    
    // Log slow renders
    if (actualDuration > 16) {
      console.warn(`[Profiler] Slow render detected in ${id}: ${actualDuration.toFixed(2)}ms`);
    }
  }, [onRender]);

  return { onRender: handleRender };
}