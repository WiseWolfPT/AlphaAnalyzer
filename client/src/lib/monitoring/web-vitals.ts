import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

// Thresholds based on Google's recommendations
const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  FID: { good: 100, needsImprovement: 300 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

// Categorize metric value
const getMetricRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
  if (!thresholds) return 'poor';
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
};

// Send metrics to analytics endpoint
const sendToAnalytics = (metric: Metric) => {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: getMetricRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };

  // Send to your analytics endpoint
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }).catch((error) => {
      console.error('Failed to send metrics:', error);
    });
  }

  // Also log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: getMetricRating(metric.name, metric.value),
      delta: metric.delta,
    });
  }

  // Send to Sentry if available
  if (window.Sentry) {
    window.Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${metric.name}: ${metric.value}`,
      level: 'info',
      data: {
        value: metric.value,
        rating: getMetricRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
      },
    });
  }
};

// Initialize Web Vitals monitoring
export const initWebVitals = () => {
  // Core Web Vitals
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getLCP(sendToAnalytics);
  
  // Additional metrics
  getFCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
};

// Custom performance marks
export const markPerformance = (markName: string) => {
  if ('performance' in window && window.performance.mark) {
    window.performance.mark(markName);
  }
};

// Measure between two marks
export const measurePerformance = (measureName: string, startMark: string, endMark: string) => {
  if ('performance' in window && window.performance.measure) {
    try {
      window.performance.measure(measureName, startMark, endMark);
      const entries = window.performance.getEntriesByName(measureName);
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        if (import.meta.env.DEV) {
          console.log(`[Performance] ${measureName}: ${duration.toFixed(2)}ms`);
        }
        return duration;
      }
    } catch (error) {
      console.error('Performance measurement failed:', error);
    }
  }
  return null;
};

// Monitor long tasks
export const monitorLongTasks = () => {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Long task is anything over 50ms
          if (entry.duration > 50) {
            console.warn('[Performance] Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name,
            });
            
            // Send to analytics
            if (window.Sentry) {
              window.Sentry.addBreadcrumb({
                category: 'performance',
                message: 'Long task detected',
                level: 'warning',
                data: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                },
              });
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      return () => observer.disconnect();
    } catch (error) {
      console.error('Failed to monitor long tasks:', error);
    }
  }
  
  return () => {};
};