// Wave 4: Comprehensive Monitoring System
// Sentry, Analytics, and Performance Monitoring for Production
import React from 'react';
import * as Sentry from '@sentry/react';
import { Replay } from '@sentry/replay';
import { useLocation } from 'wouter';

// Re-export for compatibility
export { Sentry };

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
    
    // Performance monitoring with Session Replay
    integrations: [
      Sentry.browserTracingIntegration({
        // Capture interactions like clicks, form submissions
        tracingOrigins: [
          'localhost',
          'alfalyzer.vercel.app',
          /^\//,
        ],
        // Enable automatic instrumentation for Wouter routing
        enableLongTask: true,
        enableInp: true,
      }),
      Sentry.replayIntegration({
        // Session replay for debugging financial calculations
        maskAllText: false,
        blockAllMedia: false,
        // Privacy settings for financial data
        mask: ['.password', '.credit-card', '.sensitive-data'],
        block: ['.chart-container', '.trading-widget'],
        // Collect replays on errors and 10% of sessions
        sessionSampleRate: 0.1,
        errorSampleRate: 1.0,
      }),
    ],
    
    // Performance monitoring sample rate
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session replay sample rate
    replaysSessionSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Set user context for better error tracking
    initialScope: {
      tags: {
        component: 'frontend',
        market_focus: 'portugal',
        target_markets: 'usa_eu',
        platform: 'financial_dashboard'
      },
      contexts: {
        app: {
          name: 'Alfalyzer',
          version: APP_VERSION,
          environment: NODE_ENV,
        },
        market: {
          primary_focus: 'portugal',
          supported_markets: ['usa', 'eu'],
          trading_hours: 'market_hours_aware',
        },
      },
    },
    
    // Enhanced error filtering for financial platform
    beforeSend(event, hint) {
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
        
        // Ignore chart rendering errors (non-critical)
        if (event.exception?.values?.[0]?.value?.includes('chart')) {
          return null;
        }
      }
      
      // Add financial platform context
      if (event.user) {
        event.contexts = {
          ...event.contexts,
          trading_session: {
            is_market_hours: isMarketHours(),
            user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            session_type: getSessionType(),
          },
        };
      }
      
      return event;
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
  // Track Web Vitals with Sentry integration
  trackWebVitals: () => {
    // Import web-vitals dynamically to avoid chunking issues
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => {
        const isGood = metric.value < PERFORMANCE_THRESHOLDS.CLS;
        
        // Send to Sentry as custom measurement
        Sentry.addBreadcrumb({
          category: 'web-vitals',
          message: `CLS: ${metric.value}`,
          level: isGood ? 'info' : 'warning',
          data: {
            metric: 'CLS',
            value: metric.value,
            threshold: PERFORMANCE_THRESHOLDS.CLS,
            rating: metric.rating,
            entries: metric.entries.length,
          },
        });
        
        // Send to Analytics
        analytics.trackApiCall('web-vitals', 'CLS', metric.value, isGood);
      });

      getFID((metric) => {
        const isGood = metric.value < PERFORMANCE_THRESHOLDS.FID;
        
        Sentry.addBreadcrumb({
          category: 'web-vitals',
          message: `FID: ${metric.value}ms`,
          level: isGood ? 'info' : 'warning',
          data: {
            metric: 'FID',
            value: metric.value,
            threshold: PERFORMANCE_THRESHOLDS.FID,
            rating: metric.rating,
          },
        });
        
        analytics.trackApiCall('web-vitals', 'FID', metric.value, isGood);
      });

      getFCP((metric) => {
        const isGood = metric.value < PERFORMANCE_THRESHOLDS.FCP;
        
        Sentry.addBreadcrumb({
          category: 'web-vitals',
          message: `FCP: ${metric.value}ms`,
          level: isGood ? 'info' : 'warning',
          data: {
            metric: 'FCP',
            value: metric.value,
            threshold: PERFORMANCE_THRESHOLDS.FCP,
            rating: metric.rating,
          },
        });
        
        analytics.trackApiCall('web-vitals', 'FCP', metric.value, isGood);
      });

      getLCP((metric) => {
        const isGood = metric.value < PERFORMANCE_THRESHOLDS.LCP;
        
        Sentry.addBreadcrumb({
          category: 'web-vitals',
          message: `LCP: ${metric.value}ms`,
          level: isGood ? 'info' : 'warning',
          data: {
            metric: 'LCP',
            value: metric.value,
            threshold: PERFORMANCE_THRESHOLDS.LCP,
            rating: metric.rating,
            entries: metric.entries.length,
          },
        });
        
        analytics.trackApiCall('web-vitals', 'LCP', metric.value, isGood);
      });

      getTTFB((metric) => {
        const isGood = metric.value < PERFORMANCE_THRESHOLDS.TTFB;
        
        Sentry.addBreadcrumb({
          category: 'web-vitals',
          message: `TTFB: ${metric.value}ms`,
          level: isGood ? 'info' : 'warning',
          data: {
            metric: 'TTFB',
            value: metric.value,
            threshold: PERFORMANCE_THRESHOLDS.TTFB,
            rating: metric.rating,
          },
        });
        
        analytics.trackApiCall('web-vitals', 'TTFB', metric.value, isGood);
      });
    }).catch(error => {
      console.warn('Failed to load web-vitals:', error);
    });
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

  // Track component render performance with enhanced Sentry integration
  trackComponentPerformance: (componentName: string, renderTime: number) => {
    if (renderTime > 100) { // Only track slow renders
      const isVerySlow = renderTime > 500;
      
      // Create a custom Sentry span for slow renders
      Sentry.withScope((scope) => {
        scope.setTag('component', componentName);
        scope.setTag('performance_category', isVerySlow ? 'very_slow' : 'slow');
        scope.setContext('render_performance', {
          componentName,
          renderTime,
          threshold: 100,
          severity: isVerySlow ? 'high' : 'medium',
        });
        
        // Add breadcrumb
        Sentry.addBreadcrumb({
          message: `Slow render: ${componentName}`,
          category: 'performance',
          data: {
            componentName,
            renderTime,
            threshold: 100,
            severity: isVerySlow ? 'high' : 'medium',
          },
          level: isVerySlow ? 'warning' : 'info',
        });
        
        // Capture as custom measurement
        Sentry.captureMessage(`Slow render: ${componentName} (${renderTime}ms)`, 'warning');
      });
      
      // Report to analytics for financial platform optimization
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'slow_render', {
          event_category: 'performance',
          event_label: componentName,
          value: Math.round(renderTime),
          custom_parameters: {
            component_type: getComponentType(componentName),
            is_financial_widget: isFinancialWidget(componentName),
          },
        });
      }
    }
  },
  
  // Enhanced financial platform performance tracking
  trackFinancialAction: (actionType: string, symbol: string, duration: number, success: boolean) => {
    Sentry.withScope((scope) => {
      scope.setTag('action_type', actionType);
      scope.setTag('symbol', symbol);
      scope.setTag('success', success.toString());
      scope.setTag('market_hours', isMarketHours().toString());
      
      scope.setContext('financial_action', {
        actionType,
        symbol,
        duration,
        success,
        market_hours: isMarketHours(),
        session_type: getSessionType(),
      });
      
      // Add breadcrumb for tracking
      Sentry.addBreadcrumb({
        message: `Financial Action: ${actionType}`,
        category: 'financial_action',
        data: {
          actionType,
          symbol,
          duration,
          success,
        },
        level: success ? 'info' : 'warning',
      });
      
      // Capture slow or failed actions
      if (duration > 2000 || !success) {
        Sentry.captureMessage(
          `Financial Action: ${actionType} - ${symbol} (${duration}ms)`,
          success ? 'warning' : 'error'
        );
      }
    });
    
    // Track in analytics
    analytics.trackPortfolioAction(actionType, symbol, duration);
  }
};

// User context utilities
export const userContext = {
  // Set user context for error tracking (enhanced)
  setUser: (user: { id: string; email: string; subscription_tier?: string }) => {
    enhancedUserContext.setFinancialUser({
      id: user.id,
      email: user.email,
      subscription_tier: user.subscription_tier,
    });
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

// Error boundary integration with custom fallback
export const MonitoringErrorBoundary = Sentry.withErrorBoundary;

// Custom error boundary for financial widgets
export const FinancialWidgetErrorBoundary = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}) => {
  return (
    <Sentry.ErrorBoundary
      fallback={fallback || DefaultFinancialErrorFallback}
      beforeCapture={(scope, error, errorInfo) => {
        scope.setTag('widget_type', 'financial');
        scope.setContext('widget_error', {
          component_stack: errorInfo.componentStack,
          error_boundary: 'financial_widget',
        });
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

// Default fallback component for financial widgets
const DefaultFinancialErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <h3 className="text-red-800 font-semibold mb-2">Widget Error</h3>
    <p className="text-red-700 text-sm mb-3">
      A financial widget encountered an error. This has been reported to our team.
    </p>
    <button
      onClick={resetError}
      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
    >
      Retry
    </button>
  </div>
);

// Helper functions for financial platform context
function isMarketHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Basic market hours (9 AM - 5 PM, Monday-Friday)
  return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
}

function getSessionType(): string {
  const hour = new Date().getHours();
  
  if (hour >= 9 && hour <= 17) return 'market_hours';
  if (hour >= 6 && hour <= 9) return 'pre_market';
  if (hour >= 17 && hour <= 20) return 'after_market';
  return 'off_hours';
}

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

// Enhanced user context for financial platform
export const enhancedUserContext = {
  ...userContext,
  
  // Set comprehensive user context for financial tracking
  setFinancialUser: (user: {
    id: string;
    email: string;
    subscription_tier?: string;
    portfolio_value?: number;
    preferred_currency?: string;
    trading_experience?: string;
  }) => {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      subscription_tier: user.subscription_tier,
    });
    
    // Set financial-specific context
    Sentry.setContext('financial_profile', {
      subscription_tier: user.subscription_tier || 'free',
      portfolio_value_range: getPortfolioValueRange(user.portfolio_value),
      preferred_currency: user.preferred_currency || 'EUR',
      trading_experience: user.trading_experience || 'beginner',
      market_focus: 'portugal',
    });
    
    // Set analytics context
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', GA_MEASUREMENT_ID, {
        user_id: user.id,
        custom_parameters: {
          subscription_tier: user.subscription_tier || 'free',
          preferred_currency: user.preferred_currency || 'EUR',
        },
      });
    }
  },
};

// Helper function to categorize portfolio value for privacy
function getPortfolioValueRange(value?: number): string {
  if (!value) return 'unknown';
  if (value < 1000) return 'starter';
  if (value < 10000) return 'growing';
  if (value < 100000) return 'substantial';
  return 'significant';
}

// Helper function to categorize component types
function getComponentType(componentName: string): string {
  if (componentName.includes('Chart')) return 'chart';
  if (componentName.includes('Portfolio')) return 'portfolio';
  if (componentName.includes('Stock')) return 'stock';
  if (componentName.includes('Dashboard')) return 'dashboard';
  if (componentName.includes('Watchlist')) return 'watchlist';
  return 'general';
}

// Helper function to identify financial widgets
function isFinancialWidget(componentName: string): boolean {
  const financialKeywords = ['Chart', 'Portfolio', 'Stock', 'Trading', 'Watchlist', 'Price', 'Market'];
  return financialKeywords.some(keyword => componentName.includes(keyword));
}

// Export enhanced monitoring context (already exported at top)
// export { Sentry }; // Removed duplicate export