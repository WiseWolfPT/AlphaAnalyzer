/**
 * Advanced Lazy Loading System with Micro-bundles
 * 
 * This module implements aggressive code splitting strategies:
 * 1. Route-based splitting with preloading
 * 2. Component-level splitting for heavy libraries
 * 3. Intelligent preloading based on user behavior
 * 4. Fallback strategies for failed loads
 */

import { lazy, ComponentType } from 'react';

// Preload cache to avoid duplicate loads
const preloadCache = new Set<string>();

// Performance monitoring
const loadTimes = new Map<string, number>();

/**
 * Enhanced lazy loading with retry logic and preloading
 */
export function createLazyComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    name: string;
    preload?: (() => Promise<any>)[];
    fallback?: ComponentType<T>;
    retries?: number;
  }
) {
  const { name, preload = [], fallback, retries = 2 } = options;

  return lazy(async () => {
    const startTime = performance.now();
    
    try {
      // Load main component with retry logic
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const [module] = await Promise.all([
            importFn(),
            ...preload.map(fn => fn().catch(() => null))
          ]);
          
          const loadTime = performance.now() - startTime;
          loadTimes.set(name, loadTime);
          
          if (loadTime > 2000) {
            console.warn(`⚠️ Slow load for ${name}: ${loadTime.toFixed(2)}ms`);
          }
          
          return module;
        } catch (error) {
          lastError = error as Error;
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
      }
      
      if (fallback) {
        console.error(`❌ Failed to load ${name}, using fallback:`, lastError);
        return { default: fallback };
      }
      
      throw lastError;
    } catch (error) {
      console.error(`❌ Failed to load ${name}:`, error);
      throw error;
    }
  });
}

/**
 * Preload components based on user interaction patterns
 */
export function preloadComponent(name: string, importFn: () => Promise<any>) {
  if (preloadCache.has(name)) {
    return Promise.resolve();
  }
  
  preloadCache.add(name);
  
  return importFn()
    .then(() => {
      console.log(`✅ Preloaded ${name}`);
    })
    .catch(error => {
      console.warn(`⚠️ Failed to preload ${name}:`, error);
      preloadCache.delete(name); // Allow retry
    });
}

/**
 * Intelligent preloading based on route patterns
 */
export function setupIntelligentPreloading() {
  // Preload likely next routes based on current route
  const currentPath = window.location.pathname;
  
  const preloadRules: Record<string, string[]> = {
    '/': ['login', 'register', 'find-stocks'],
    '/login': ['dashboard', 'register'],
    '/register': ['trial', 'dashboard'],
    '/dashboard': ['stock-detail', 'portfolios', 'watchlists'],
    '/find-stocks': ['stock-detail', 'watchlists'],
    '/stock': ['charts', 'earnings', 'transcripts'],
    '/portfolios': ['watchlists', 'stock-detail'],
    '/watchlists': ['portfolios', 'stock-detail'],
    '/earnings': ['transcripts', 'stock-detail'],
    '/transcripts': ['earnings', 'stock-detail']
  };
  
  const rulesToApply = Object.entries(preloadRules).filter(([pattern]) => 
    currentPath.startsWith(pattern)
  );
  
  rulesToApply.forEach(([, components]) => {
    components.forEach(component => {
      // Delay preloading to not block main thread
      setTimeout(() => {
        preloadComponentByName(component);
      }, 2000);
    });
  });
}

/**
 * Preload specific components by name
 */
function preloadComponentByName(name: string) {
  const preloadMap: Record<string, () => Promise<any>> = {
    'login': () => import('@/pages/auth/login'),
    'register': () => import('@/pages/auth/register'),
    'dashboard': () => import('@/components/dashboard/fallback-dashboard'),
    'find-stocks': () => import('@/pages/find-stocks'),
    'stock-detail': () => import('@/pages/stock-detail'),
    'charts': () => import('@/pages/AdvancedCharts'),
    'portfolios': () => import('@/pages/portfolios'),
    'watchlists': () => import('@/pages/watchlists'),
    'earnings': () => import('@/pages/earnings'),
    'transcripts': () => import('@/pages/transcripts'),
    'trial': () => import('@/pages/trial')
  };
  
  const importFn = preloadMap[name];
  if (importFn) {
    preloadComponent(name, importFn);
  }
}

/**
 * Preload critical UI components
 */
export function preloadCriticalComponents() {
  const critical = [
    () => import('@/components/ui/button'),
    () => import('@/components/ui/card'),
    () => import('@/components/ui/alert'),
    () => import('@/components/shared/error-boundary')
  ];
  
  critical.forEach((importFn, index) => {
    setTimeout(() => {
      importFn().catch(() => null);
    }, index * 100);
  });
}

/**
 * Micro-bundle loaders for heavy libraries
 */
export const LazyLibraries = {
  // Chart libraries (lightweight Chart.js replacement)
  Charts: {
    LineChart: lazy(() => import('@/components/ui/lightweight-chart').then(m => ({ default: m.LightweightLineChart }))),
    BarChart: lazy(() => import('@/components/ui/lightweight-chart').then(m => ({ default: m.LightweightBarChart }))),
    PieChart: lazy(() => import('@/components/ui/lightweight-chart').then(m => ({ default: m.LightweightPieChart }))),
    PriceChart: lazy(() => import('@/components/ui/lightweight-chart').then(m => ({ default: m.LightweightPriceChart })))
  },
  
  // Animation libraries
  // LottiePlayer: removed - using CSS animations instead
  FramerMotion: {
    motion: lazy(() => import('framer-motion').then(m => ({ default: m.motion }))),
    AnimatePresence: lazy(() => import('framer-motion').then(m => ({ default: m.AnimatePresence })))
  },
  
  // Form libraries
  ReactHookForm: {
    useForm: lazy(() => import('react-hook-form').then(m => ({ default: m.useForm }))),
    Controller: lazy(() => import('react-hook-form').then(m => ({ default: m.Controller })))
  },
  
  // DnD libraries
  DndKit: {
    DndContext: lazy(() => import('@dnd-kit/core').then(m => ({ default: m.DndContext }))),
    SortableContext: lazy(() => import('@dnd-kit/sortable').then(m => ({ default: m.SortableContext })))
  }
};

/**
 * Monitor and report loading performance
 */
export function getLoadingMetrics() {
  const metrics = Array.from(loadTimes.entries()).map(([name, time]) => ({
    component: name,
    loadTime: time,
    status: time > 2000 ? 'slow' : time > 1000 ? 'moderate' : 'fast'
  }));
  
  return {
    components: metrics,
    averageLoadTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length,
    slowComponents: metrics.filter(m => m.status === 'slow'),
    totalComponents: metrics.length
  };
}

/**
 * Setup viewport-based preloading
 */
export function setupViewportPreloading() {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const preloadAttribute = element.dataset.preload;
          
          if (preloadAttribute) {
            preloadComponentByName(preloadAttribute);
            observer.unobserve(element);
          }
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    // Observe elements with data-preload attribute
    document.querySelectorAll('[data-preload]').forEach(el => {
      observer.observe(el);
    });
    
    return observer;
  }
  
  return null;
}

/**
 * CDN fallback for React in production - DISABLED
 * React is now bundled by Vite to avoid CSP issues on Koyeb
 */
export function setupCDNFallback() {
  // DISABLED: React is now bundled locally
  // Previously loaded React from CDN but caused CSP violations on Koyeb
  return;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  // Setup intelligent preloading after initial render
  setTimeout(() => {
    setupIntelligentPreloading();
    preloadCriticalComponents();
    setupViewportPreloading();
    // setupCDNFallback(); // DISABLED: React is now bundled locally
  }, 1000);
}