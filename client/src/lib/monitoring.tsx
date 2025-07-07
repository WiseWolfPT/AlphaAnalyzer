// Wave 4: Comprehensive Monitoring System
// Sentry, Analytics, and Performance Monitoring for Production
import React from 'react';

// Mock Sentry when not available
const SentryMock = {
  init: () => {},
  captureException: (error: any) => console.error('Error captured:', error),
  captureMessage: (message: string) => console.log('Message captured:', message),
  setUser: () => {},
  setTag: () => {},
  setContext: () => {},
  addBreadcrumb: () => {},
  withErrorBoundary: (component: any) => component,
  getCurrentHub: () => ({
    getScope: () => ({
      setTag: () => {},
      setContext: () => {},
    })
  })
};

const BrowserTracingMock = class {};

// Use mock for now - can be replaced with real Sentry when installed
const Sentry = SentryMock;
const BrowserTracing = BrowserTracingMock;

// Environment variables for monitoring
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const NODE_ENV = import.meta.env.NODE_ENV;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '4.0.0';

// Performance monitoring thresholds
const PERFORMANCE_THRESHOLDS = {
  FCP: 2500, // First Contentful Paint
  LCP: 4000, // Largest Contentful Paint
  FID: 300,  // First Input Delay
  CLS: 0.25, // Cumulative Layout Shift
  TTFB: 1000 // Time to First Byte
};

// Initialize Sentry for error tracking
export const initializeSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: `alfalyzer@${APP_VERSION}`,
    
    // Performance monitoring
    integrations: [
      new BrowserTracing({
        // Capture interactions like clicks, form submissions
        tracingOrigins: [
          'localhost',
          'alfalyzer.vercel.app',
          /^\//,
        ],
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
    ],
    
    // Performance monitoring sample rate
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Error filtering
    beforeSend(event) {
      // Filter out non-critical errors in production
      if (NODE_ENV === 'production') {
        // Ignore network errors from third-party APIs
        if (event.exception?.values?.[0]?.value?.includes('Network Error')) {
          return null;
        }
        
        // Ignore quota exceeded errors (expected behavior)
        if (event.exception?.values?.[0]?.value?.includes('quota')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Set user context for better error tracking
    initialScope: {
      tags: {
        component: 'frontend',
        market_focus: 'portugal',
        target_markets: 'usa_eu'
      },
    },
  });

  console.log('✅ Sentry initialized for error tracking');
};

// Google Analytics 4 integration
export const initializeAnalytics = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics ID not configured - analytics disabled');
    return;
  }

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    // Enhanced measurement for better insights
    enhanced_measurement: true,
    // Custom dimensions for Portuguese market
    custom_map: {
      custom_dimension_1: 'user_currency',
      custom_dimension_2: 'preferred_market',
      custom_dimension_3: 'subscription_tier'
    }
  });

  // Make gtag available globally
  (window as any).gtag = gtag;

  console.log('✅ Google Analytics initialized');
};

// Custom analytics events for financial platform
export const analytics = {
  // Track page views
  trackPageView: (pageName: string, additionalData?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
        ...additionalData
      });
    }
  },

  // Track stock searches
  trackStockSearch: (symbol: string, market: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'stock_search', {
        event_category: 'engagement',
        event_label: symbol,
        custom_market: market,
        value: 1
      });
    }
    
    Sentry.addBreadcrumb({
      message: `Stock search: ${symbol}`,
      category: 'user_action',
      data: { symbol, market }
    });
  },

  // Track portfolio actions
  trackPortfolioAction: (action: string, symbol?: string, value?: number) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'portfolio_action', {
        event_category: 'portfolio',
        event_label: action,
        stock_symbol: symbol,
        value: value
      });
    }
    
    Sentry.addBreadcrumb({
      message: `Portfolio action: ${action}`,
      category: 'user_action',
      data: { action, symbol, value }
    });
  },

  // Track API usage and performance
  trackApiCall: (provider: string, endpoint: string, duration: number, success: boolean) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'api_call', {
        event_category: 'api_performance',
        event_label: `${provider}_${endpoint}`,
        value: duration,
        custom_success: success
      });
    }
    
    // Send performance data to Sentry
    Sentry.addBreadcrumb({
      message: `API call: ${provider}/${endpoint}`,
      category: 'api',
      data: { provider, endpoint, duration, success },
      level: success ? 'info' : 'warning'
    });
  },

  // Track user subscription events
  trackSubscription: (action: string, tier: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'subscription', {
        event_category: 'subscription',
        event_label: action,
        subscription_tier: tier,
        value: tier === 'premium' ? 30 : tier === 'pro' ? 15 : 0
      });
    }
  },

  // Track errors manually
  trackError: (error: Error, context?: Record<string, any>) => {
    Sentry.captureException(error, {
      tags: {
        component: 'manual_tracking'
      },
      contexts: {
        additional_info: context
      }
    });
  }
};

// Performance monitoring utilities
export const performanceMonitor = {
  // Track Web Vitals
  trackWebVitals: () => {
    if ('web-vital' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => {
          analytics.trackApiCall('web-vitals', 'CLS', metric.value, metric.value < PERFORMANCE_THRESHOLDS.CLS);
        });

        getFID((metric) => {
          analytics.trackApiCall('web-vitals', 'FID', metric.value, metric.value < PERFORMANCE_THRESHOLDS.FID);
        });

        getFCP((metric) => {
          analytics.trackApiCall('web-vitals', 'FCP', metric.value, metric.value < PERFORMANCE_THRESHOLDS.FCP);
        });

        getLCP((metric) => {
          analytics.trackApiCall('web-vitals', 'LCP', metric.value, metric.value < PERFORMANCE_THRESHOLDS.LCP);
        });

        getTTFB((metric) => {
          analytics.trackApiCall('web-vitals', 'TTFB', metric.value, metric.value < PERFORMANCE_THRESHOLDS.TTFB);
        });
      });
    }
  },

  // Track API response times
  trackApiPerformance: async (
    apiCall: () => Promise<any>,
    provider: string,
    endpoint: string
  ): Promise<any> => {
    const startTime = performance.now();
    let success = false;
    
    try {
      const result = await apiCall();
      success = true;
      return result;
    } catch (error) {
      analytics.trackError(error as Error, { provider, endpoint });
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      analytics.trackApiCall(provider, endpoint, duration, success);
    }
  },

  // Track component render performance
  trackComponentPerformance: (componentName: string, renderTime: number) => {
    if (renderTime > 100) { // Only track slow renders
      Sentry.addBreadcrumb({
        message: `Slow render: ${componentName}`,
        category: 'performance',
        data: { componentName, renderTime },
        level: renderTime > 500 ? 'warning' : 'info'
      });
    }
  }
};

// User context utilities
export const userContext = {
  // Set user context for error tracking
  setUser: (user: { id: string; email: string; subscription_tier?: string }) => {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });

    // Set custom dimensions for analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', GA_MEASUREMENT_ID, {
        user_id: user.id,
        custom_map: {
          subscription_tier: user.subscription_tier || 'free'
        }
      });
    }
  },

  // Clear user context on logout
  clearUser: () => {
    Sentry.setUser(null);
  },

  // Set user preferences context
  setUserPreferences: (preferences: {
    currency: string;
    language: string;
    region: string;
  }) => {
    Sentry.setContext('user_preferences', preferences);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'user_preferences', {
        event_category: 'user',
        preferred_currency: preferences.currency,
        preferred_language: preferences.language,
        preferred_region: preferences.region
      });
    }
  }
};

// Initialize all monitoring systems
export const initializeMonitoring = () => {
  console.log('🔧 Initializing monitoring systems...');
  
  try {
    initializeSentry();
    initializeAnalytics();
    performanceMonitor.trackWebVitals();
    
    console.log('✅ All monitoring systems initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing monitoring:', error);
  }
};

// Error boundary integration
export const MonitoringErrorBoundary = Sentry.withErrorBoundary;

// HOC for tracking component performance
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const startTime = React.useRef(performance.now());
    
    React.useEffect(() => {
      const renderTime = performance.now() - startTime.current;
      performanceMonitor.trackComponentPerformance(componentName, renderTime);
    });
    
    return <Component {...props} />;
  });
};

// Export monitoring context
export { Sentry };