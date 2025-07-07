/**
 * Dashboard Performance Monitor Hook
 * Tracks dashboard performance metrics
 */

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
}

export function useDashboardPerformance(componentName: string) {
  const startTimeRef = useRef<number>(performance.now());
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const renderStartRef = useRef<number>(performance.now());

  // Track component mount and render times
  useEffect(() => {
    const mountTime = performance.now() - startTimeRef.current;
    const renderTime = performance.now() - renderStartRef.current;
    
    setMetrics(prev => ({
      ...prev,
      loadTime: mountTime,
      renderTime: renderTime
    }));

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance [${componentName}]:`, {
        loadTime: `${mountTime.toFixed(2)}ms`,
        renderTime: `${renderTime.toFixed(2)}ms`
      });
    }

    // Reset render timer for next render
    renderStartRef.current = performance.now();
  }, [componentName]);

  // Track API response times
  const trackApiCall = (apiName: string, startTime: number, success: boolean) => {
    const responseTime = performance.now() - startTime;
    
    setMetrics(prev => ({
      ...prev,
      apiResponseTime: responseTime,
      errorRate: success ? (prev.errorRate || 0) * 0.9 : (prev.errorRate || 0) * 0.9 + 0.1
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API [${apiName}]:`, {
        responseTime: `${responseTime.toFixed(2)}ms`,
        success,
        status: success ? '✅' : '❌'
      });
    }
  };

  // Track cache performance
  const trackCacheHit = (hit: boolean) => {
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: hit ? (prev.cacheHitRate || 0) * 0.9 + 0.1 : (prev.cacheHitRate || 0) * 0.9
    }));
  };

  // Get performance summary
  const getPerformanceSummary = () => {
    return {
      ...metrics,
      grade: getPerformanceGrade(metrics),
      recommendations: getPerformanceRecommendations(metrics)
    };
  };

  return {
    metrics,
    trackApiCall,
    trackCacheHit,
    getPerformanceSummary
  };
}

function getPerformanceGrade(metrics: Partial<PerformanceMetrics>): 'A' | 'B' | 'C' | 'D' | 'F' {
  const { loadTime = 0, renderTime = 0, apiResponseTime = 0, cacheHitRate = 0 } = metrics;
  
  let score = 100;
  
  // Penalize slow load times
  if (loadTime > 1000) score -= 30;
  else if (loadTime > 500) score -= 15;
  else if (loadTime > 200) score -= 5;
  
  // Penalize slow render times
  if (renderTime > 100) score -= 20;
  else if (renderTime > 50) score -= 10;
  
  // Penalize slow API responses
  if (apiResponseTime > 2000) score -= 25;
  else if (apiResponseTime > 1000) score -= 15;
  else if (apiResponseTime > 500) score -= 5;
  
  // Penalize low cache hit rate
  if (cacheHitRate < 0.5) score -= 15;
  else if (cacheHitRate < 0.7) score -= 10;
  
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getPerformanceRecommendations(metrics: Partial<PerformanceMetrics>): string[] {
  const recommendations: string[] = [];
  const { loadTime = 0, renderTime = 0, apiResponseTime = 0, cacheHitRate = 0 } = metrics;
  
  if (loadTime > 500) {
    recommendations.push('Consider lazy loading non-critical components');
  }
  
  if (renderTime > 50) {
    recommendations.push('Optimize render performance with React.memo or useMemo');
  }
  
  if (apiResponseTime > 1000) {
    recommendations.push('Implement better caching for API responses');
  }
  
  if (cacheHitRate < 0.7) {
    recommendations.push('Increase cache TTL or improve cache warming');
  }
  
  return recommendations;
}