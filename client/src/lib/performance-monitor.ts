/**
 * Performance monitoring utilities for state management
 */

interface PerformanceMetrics {
  storeUpdates: {
    storeName: string;
    updateCount: number;
    averageTime: number;
    maxTime: number;
    slowUpdates: number;
  }[];
  queryPerformance: {
    queryKey: string;
    hitCount: number;
    missCount: number;
    averageFetchTime: number;
    errorCount: number;
  }[];
  componentRenders: {
    componentName: string;
    renderCount: number;
    averageRenderTime: number;
    slowRenders: number;
  }[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    storeUpdates: [],
    queryPerformance: [],
    componentRenders: [],
  };

  private isEnabled = process.env.NODE_ENV === 'development';

  /**
   * Track store update performance
   */
  trackStoreUpdate(storeName: string, updateTime: number) {
    if (!this.isEnabled) return;

    const existing = this.metrics.storeUpdates.find(s => s.storeName === storeName);
    
    if (existing) {
      existing.updateCount += 1;
      existing.averageTime = (existing.averageTime + updateTime) / 2;
      existing.maxTime = Math.max(existing.maxTime, updateTime);
      
      if (updateTime > 16) { // 60fps threshold
        existing.slowUpdates += 1;
      }
    } else {
      this.metrics.storeUpdates.push({
        storeName,
        updateCount: 1,
        averageTime: updateTime,
        maxTime: updateTime,
        slowUpdates: updateTime > 16 ? 1 : 0,
      });
    }

    // Log slow updates immediately
    if (updateTime > 16) {
      console.warn(
        `🐌 Slow store update: ${storeName} took ${updateTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Track React Query performance
   */
  trackQueryPerformance(
    queryKey: string,
    type: 'hit' | 'miss' | 'error',
    fetchTime?: number
  ) {
    if (!this.isEnabled) return;

    const existing = this.metrics.queryPerformance.find(q => q.queryKey === queryKey);
    
    if (existing) {
      if (type === 'hit') existing.hitCount += 1;
      if (type === 'miss') existing.missCount += 1;
      if (type === 'error') existing.errorCount += 1;
      
      if (fetchTime) {
        existing.averageFetchTime = (existing.averageFetchTime + fetchTime) / 2;
      }
    } else {
      this.metrics.queryPerformance.push({
        queryKey,
        hitCount: type === 'hit' ? 1 : 0,
        missCount: type === 'miss' ? 1 : 0,
        errorCount: type === 'error' ? 1 : 0,
        averageFetchTime: fetchTime || 0,
      });
    }

    // Log slow queries immediately
    if (fetchTime && fetchTime > 1000) {
      console.warn(
        `🐌 Slow query: ${queryKey} took ${fetchTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number) {
    if (!this.isEnabled) return;

    const existing = this.metrics.componentRenders.find(c => c.componentName === componentName);
    
    if (existing) {
      existing.renderCount += 1;
      existing.averageRenderTime = (existing.averageRenderTime + renderTime) / 2;
      
      if (renderTime > 16) { // 60fps threshold
        existing.slowRenders += 1;
      }
    } else {
      this.metrics.componentRenders.push({
        componentName,
        renderCount: 1,
        averageRenderTime: renderTime,
        slowRenders: renderTime > 16 ? 1 : 0,
      });
    }

    // Log slow renders immediately
    if (renderTime > 16) {
      console.warn(
        `🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const { storeUpdates, queryPerformance, componentRenders } = this.metrics;

    let report = '📊 Performance Report\n\n';

    // Store updates report
    report += '🏪 Store Updates:\n';
    storeUpdates
      .sort((a, b) => b.slowUpdates - a.slowUpdates)
      .forEach(store => {
        report += `  ${store.storeName}: ${store.updateCount} updates, `;
        report += `avg ${store.averageTime.toFixed(2)}ms, `;
        report += `max ${store.maxTime.toFixed(2)}ms, `;
        report += `${store.slowUpdates} slow\n`;
      });

    // Query performance report
    report += '\n🔍 Query Performance:\n';
    queryPerformance
      .sort((a, b) => b.averageFetchTime - a.averageFetchTime)
      .forEach(query => {
        const hitRate = query.hitCount / (query.hitCount + query.missCount);
        report += `  ${query.queryKey}: ${(hitRate * 100).toFixed(1)}% hit rate, `;
        report += `avg ${query.averageFetchTime.toFixed(2)}ms, `;
        report += `${query.errorCount} errors\n`;
      });

    // Component renders report
    report += '\n⚛️ Component Renders:\n';
    componentRenders
      .sort((a, b) => b.slowRenders - a.slowRenders)
      .forEach(component => {
        report += `  ${component.componentName}: ${component.renderCount} renders, `;
        report += `avg ${component.averageRenderTime.toFixed(2)}ms, `;
        report += `${component.slowRenders} slow\n`;
      });

    return report;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      storeUpdates: [],
      queryPerformance: [],
      componentRenders: [],
    };
  }

  /**
   * Log performance summary
   */
  logSummary() {
    if (!this.isEnabled) return;

    console.group('📊 Performance Summary');
    console.log(this.generateReport());
    console.groupEnd();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Hook for tracking component renders
export function useRenderTracker(componentName: string) {
  if (process.env.NODE_ENV !== 'development') return;

  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    performanceMonitor.trackComponentRender(componentName, renderTime);
  };
}

// HOC for automatic render tracking
export function withRenderTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'Unknown';
  
  return function TrackedComponent(props: P) {
    const trackRender = useRenderTracker(name);
    
    React.useEffect(() => {
      trackRender?.();
    });

    return <Component {...props} />;
  };
}

// Utility for measuring arbitrary operations
export function measureOperation<T>(
  operation: () => T,
  operationName: string
): T {
  if (process.env.NODE_ENV !== 'development') {
    return operation();
  }

  const startTime = performance.now();
  const result = operation();
  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
  
  if (duration > 100) {
    console.warn(`🐌 Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

// Async version for promises
export async function measureAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return await operation();
  }

  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
  
  if (duration > 1000) {
    console.warn(`🐌 Slow async operation: ${operationName} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

// Setup automatic performance reporting
if (process.env.NODE_ENV === 'development') {
  // Log performance summary every 30 seconds
  setInterval(() => {
    performanceMonitor.logSummary();
  }, 30000);

  // Log performance summary on page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitor.logSummary();
  });

  // Make performance monitor available globally
  (window as any).performanceMonitor = performanceMonitor;
}

// Export performance monitor for use in stores
export default performanceMonitor;