import React, { useEffect } from 'react';
import { usePrefetch } from '@/hooks/use-prefetch';
import { getLoadingMetrics } from '@/lib/lazy-loader';

export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { warmupCache } = usePrefetch();
  
  useEffect(() => {
    console.log('📍 AppInitializer useEffect running');
    
    // Warm up cache with popular symbols during idle time
    warmupCache();
    
    // Log loading metrics after initial render
    const logMetrics = () => {
      const metrics = getLoadingMetrics();
      if (metrics.totalComponents > 0) {
        console.group('🚀 Alfalyzer Performance Metrics');
        console.log('📊 Average Load Time:', `${metrics.averageLoadTime.toFixed(2)}ms`);
        console.log('📦 Total Components Loaded:', metrics.totalComponents);
        
        if (metrics.slowComponents.length > 0) {
          console.warn('🐌 Slow Components:', metrics.slowComponents);
        }
        
        console.table(metrics.components);
        console.groupEnd();
      }
    };
    
    // Log metrics after components have had time to load
    setTimeout(logMetrics, 5000);
    
    // Enhanced performance monitoring for production
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navigationData = {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            totalTime: entry.loadEventEnd - entry.fetchStart
          };
          
          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log('📈 Navigation Performance:', navigationData);
          }
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
    
    // Clean up observer
    return () => observer.disconnect();
  }, [warmupCache]);

  return <>{children}</>;
};