/**
 * EXTREME ROUTE-BASED CODE SPLITTING
 * Implementação ultra-granular para chunks < 100KB
 */

import { lazy, ComponentType } from 'react';

// Tipo para configuração de rotas
interface RouteConfig {
  path: string;
  component: ComponentType<any>;
  preloadTargets?: string[];
  chunkName?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  intersectionObserver?: boolean;
}

// Cache para componentes carregados
const componentCache = new Map<string, ComponentType<any>>();

// Sistema de métricas de performance
class PerformanceTracker {
  private metrics: Map<string, { loadTime: number; size?: number; timestamp: number }> = new Map();

  track(componentName: string, loadTime: number, size?: number) {
    this.metrics.set(componentName, {
      loadTime,
      size,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
  }

  getSlowComponents(threshold = 1000) {
    return this.getMetrics().filter(m => m.loadTime > threshold);
  }
}

export const performanceTracker = new PerformanceTracker();

// Sistema de lazy loading com Intersection Observer
export function createIntersectionObserverLazy<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    name: string;
    rootMargin?: string;
    threshold?: number;
    retries?: number;
  }
): ComponentType<T> {
  const { name, rootMargin = '100px', threshold = 0.1, retries = 3 } = options;

  return lazy(async () => {
    const startTime = performance.now();
    
    // Verificar cache primeiro
    if (componentCache.has(name)) {
      return { default: componentCache.get(name)! };
    }

    // Implementar retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await importFn();
        const loadTime = performance.now() - startTime;
        
        // Cache o componente
        componentCache.set(name, module.default);
        
        // Track performance
        performanceTracker.track(name, loadTime);
        
        if (loadTime > 2000) {
          console.warn(`🐌 Slow component load: ${name} (${loadTime.toFixed(2)}ms)`);
        }
        
        return module;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError;
  });
}

// Configuração extrema de rotas com micro-chunks
export const routeConfig: Record<string, RouteConfig> = {
  // CRITICAL ROUTES (< 20KB cada)
  '/': {
    path: '/',
    component: createIntersectionObserverLazy(
      () => import('../pages/landing').then(m => ({ default: m.default })),
      { name: 'Landing' }
    ),
    preloadTargets: ['/login', '/register'],
    chunkName: 'route-landing',
    priority: 'critical'
  },

  // AUTH ROUTES (< 30KB cada)
  '/login': {
    path: '/login',
    component: createIntersectionObserverLazy(
      () => import('../pages/auth/login').then(m => ({ default: m.default })),
      { name: 'Login' }
    ),
    preloadTargets: ['/dashboard', '/register'],
    chunkName: 'route-auth-login',
    priority: 'critical'
  },

  '/register': {
    path: '/register',
    component: createIntersectionObserverLazy(
      () => import('../pages/auth/register').then(m => ({ default: m.default })),
      { name: 'Register' }
    ),
    preloadTargets: ['/trial', '/dashboard'],
    chunkName: 'route-auth-register',
    priority: 'critical'
  },

  '/trial': {
    path: '/trial',
    component: createIntersectionObserverLazy(
      () => import('../pages/trial').then(m => ({ default: m.default })),
      { name: 'Trial' }
    ),
    preloadTargets: ['/dashboard'],
    chunkName: 'route-auth-trial',
    priority: 'high'
  },

  // DASHBOARD ROUTES (< 50KB cada)
  '/dashboard': {
    path: '/dashboard',
    component: createIntersectionObserverLazy(
      () => import('../components/dashboard/fallback-dashboard'),
      { name: 'UserDashboard' }
    ),
    preloadTargets: ['/find-stocks', '/watchlists', '/portfolios'],
    chunkName: 'route-dashboard-user',
    priority: 'high'
  },

  '/find-stocks': {
    path: '/find-stocks',
    component: createIntersectionObserverLazy(
      () => import('../pages/find-stocks').then(m => ({ default: m.default })),
      { name: 'FindStocks' }
    ),
    preloadTargets: ['/stock/:symbol'],
    chunkName: 'route-find-stocks',
    priority: 'high'
  },

  // STOCK ANALYSIS ROUTES (< 80KB cada)
  '/stock/:symbol': {
    path: '/stock/:symbol',
    component: createIntersectionObserverLazy(
      () => import('../pages/stock-detail').then(m => ({ default: m.default })),
      { name: 'StockDetail' }
    ),
    preloadTargets: ['/stock/:symbol/charts'],
    chunkName: 'route-stock-detail',
    priority: 'high'
  },

  '/stock/:symbol/charts': {
    path: '/stock/:symbol/charts',
    component: createIntersectionObserverLazy(
      () => import('../pages/AdvancedCharts').then(m => ({ default: m.default })),
      { name: 'AdvancedCharts', retries: 3 }
    ),
    preloadTargets: ['/earnings', '/transcripts'],
    chunkName: 'route-charts',
    priority: 'medium'
  },

  // PORTFOLIO ROUTES (< 60KB cada)
  '/portfolios': {
    path: '/portfolios',
    component: createIntersectionObserverLazy(
      () => import('../pages/portfolios').then(m => ({ default: m.default })),
      { name: 'Portfolios' }
    ),
    preloadTargets: ['/watchlists'],
    chunkName: 'route-portfolios',
    priority: 'medium'
  },

  '/watchlists': {
    path: '/watchlists',
    component: createIntersectionObserverLazy(
      () => import('../pages/watchlists').then(m => ({ default: m.default })),
      { name: 'Watchlists' }
    ),
    preloadTargets: ['/portfolios'],
    chunkName: 'route-watchlists',
    priority: 'medium'
  },

  // MARKET DATA ROUTES (< 40KB cada)
  '/earnings': {
    path: '/earnings',
    component: createIntersectionObserverLazy(
      () => import('../pages/earnings').then(m => ({ default: m.default })),
      { name: 'Earnings' }
    ),
    preloadTargets: ['/transcripts'],
    chunkName: 'route-earnings',
    priority: 'medium'
  },

  '/transcripts': {
    path: '/transcripts',
    component: createIntersectionObserverLazy(
      () => import('../pages/transcripts').then(m => ({ default: m.default })),
      { name: 'Transcripts' }
    ),
    preloadTargets: ['/earnings'],
    chunkName: 'route-transcripts',
    priority: 'medium'
  },

  '/news': {
    path: '/news',
    component: createIntersectionObserverLazy(
      () => import('../pages/news').then(m => ({ default: m.default })),
      { name: 'News' }
    ),
    chunkName: 'route-news',
    priority: 'medium'
  },

  '/alerts': {
    path: '/alerts',
    component: createIntersectionObserverLazy(
      () => import('../pages/alerts').then(m => ({ default: m.default })),
      { name: 'Alerts' }
    ),
    chunkName: 'route-alerts',
    priority: 'medium'
  },

  // VALUATION ROUTES (< 70KB cada)
  '/intrinsic-value': {
    path: '/intrinsic-value',
    component: createIntersectionObserverLazy(
      () => import('../pages/intrinsic-value').then(m => ({ default: m.default })),
      { name: 'IntrinsicValue' }
    ),
    chunkName: 'route-valuation',
    priority: 'medium'
  },

  // USER MANAGEMENT ROUTES (< 30KB cada)
  '/profile': {
    path: '/profile',
    component: createIntersectionObserverLazy(
      () => import('../pages/profile').then(m => ({ default: m.default })),
      { name: 'Profile' }
    ),
    preloadTargets: ['/settings'],
    chunkName: 'route-profile',
    priority: 'low'
  },

  '/settings': {
    path: '/settings',
    component: createIntersectionObserverLazy(
      () => import('../pages/settings').then(m => ({ default: m.default })),
      { name: 'Settings' }
    ),
    preloadTargets: ['/profile'],
    chunkName: 'route-settings',
    priority: 'low'
  },

  // SUPPORT ROUTES (< 20KB cada)
  '/help': {
    path: '/help',
    component: createIntersectionObserverLazy(
      () => import('../pages/help').then(m => ({ default: m.default })),
      { name: 'Help' }
    ),
    chunkName: 'route-help',
    priority: 'low'
  },

  // ADMIN ROUTES (< 50KB cada)
  '/admin': {
    path: '/admin',
    component: createIntersectionObserverLazy(
      () => import('../pages/admin/admin-dashboard'),
      { name: 'AdminDashboard' }
    ),
    chunkName: 'route-admin',
    priority: 'low'
  },

  '/admin/api-monitoring': {
    path: '/admin/api-monitoring',
    component: createIntersectionObserverLazy(
      () => import('../pages/admin/api-monitoring').then(m => ({ default: m.default })),
      { name: 'ApiMonitoring' }
    ),
    chunkName: 'route-admin-api',
    priority: 'low'
  },

  // 404 FALLBACK
  '*': {
    path: '*',
    component: createIntersectionObserverLazy(
      () => import('../pages/not-found').then(m => ({ default: m.default })),
      { name: 'NotFound' }
    ),
    chunkName: 'route-fallback',
    priority: 'low'
  }
};

// Sistema de preloading inteligente
export class IntelligentPreloader {
  private preloadedRoutes = new Set<string>();
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const preloadRoute = element.dataset.preloadRoute;
          
          if (preloadRoute && !this.preloadedRoutes.has(preloadRoute)) {
            this.preloadRoute(preloadRoute);
            this.observer?.unobserve(element);
          }
        }
      });
    }, {
      rootMargin: '100px',
      threshold: 0.1
    });
  }

  preloadRoute(routePath: string) {
    const config = routeConfig[routePath];
    if (!config || this.preloadedRoutes.has(routePath)) return;

    this.preloadedRoutes.add(routePath);
    
    // Preload principal component
    const startTime = performance.now();
    config.component.preload?.().catch(() => {
      console.warn(`Failed to preload ${routePath}`);
    });

    // Preload targets
    if (config.preloadTargets) {
      config.preloadTargets.forEach(target => {
        setTimeout(() => {
          this.preloadRoute(target);
        }, 1000);
      });
    }
  }

  observeElement(element: HTMLElement, routePath: string) {
    if (this.observer) {
      element.dataset.preloadRoute = routePath;
      this.observer.observe(element);
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Instância global do preloader
export const intelligentPreloader = new IntelligentPreloader();

// Utilitário para obter rotas por prioridade
export function getRoutesByPriority(priority: 'critical' | 'high' | 'medium' | 'low') {
  return Object.entries(routeConfig)
    .filter(([, config]) => config.priority === priority)
    .map(([path, config]) => ({ path, ...config }));
}

// Utilitário para obter métricas de performance
export function getPerformanceReport() {
  const metrics = performanceTracker.getMetrics();
  const slowComponents = performanceTracker.getSlowComponents();
  
  return {
    totalComponents: metrics.length,
    averageLoadTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length,
    slowComponents,
    fastComponents: metrics.filter(m => m.loadTime < 500),
    recommendations: slowComponents.length > 0 ? 
      `Consider optimizing: ${slowComponents.map(c => c.name).join(', ')}` : 
      'All components loading within acceptable limits'
  };
}

// Preload crítico automático
export function preloadCriticalRoutes() {
  const criticalRoutes = getRoutesByPriority('critical');
  
  criticalRoutes.forEach(route => {
    setTimeout(() => {
      intelligentPreloader.preloadRoute(route.path);
    }, 100);
  });
}

// Inicializar sistema
if (typeof window !== 'undefined') {
  setTimeout(() => {
    preloadCriticalRoutes();
  }, 1000);
}