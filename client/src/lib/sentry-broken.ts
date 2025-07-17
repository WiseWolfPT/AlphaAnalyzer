/**
 * Sentry Configuration for Frontend Error Monitoring
 * Provides comprehensive error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Sentry configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

export function initializeSentry() {
  // Only initialize Sentry in production or when DSN is provided
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not provided. Error monitoring disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `alfalyzer@${RELEASE}`,
    
    // Performance monitoring
    integrations: [
      new BrowserTracing({
        // Set up automatic route change tracking for Wouter
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          // We'll manually track route changes since we use Wouter
        ),
      }),
    ],
    
    // Performance sampling
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Error sampling
    sampleRate: 1.0,
    
    // Session tracking
    autoSessionTracking: true,
    
    // Privacy settings
    beforeSend(event, hint) {
      // Filter out sensitive information
      if (event.exception) {
        const error = hint.originalException;
        
        // Don't send authentication errors to Sentry
        if (error && error.message && error.message.includes('auth')) {
          return null;
        }
        
        // Filter out network errors that are user-related
        if (error && error.message && error.message.includes('Network Error')) {
          return null;
        }
      }
      
      // Remove sensitive data from context
      if (event.contexts && event.contexts.user) {
        delete event.contexts.user.email;
        delete event.contexts.user.ip_address;
      }
      
      return event;
    },
    
    // Set user context
    initialScope: {
      tags: {
        component: 'frontend',
        platform: 'web',
      },
    },
  });

  console.log(`Sentry initialized for ${ENVIRONMENT} environment`);
}

// Custom error reporting functions
export function reportError(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setContext(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
}

export function reportMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setContext(key, context[key]);
      });
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

// User identification
export function identifyUser(user: { id: string; email?: string; tier?: string }) {
  Sentry.setUser({
    id: user.id,
    // Don't send email to Sentry for privacy
    subscription_tier: user.tier,
  });
}

// Performance tracking
export function trackPerformance(name: string, operation: () => void | Promise<void>) {
  const transaction = Sentry.startTransaction({
    name,
    op: 'custom',
  });
  
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  
  try {
    const result = operation();
    if (result instanceof Promise) {
      return result.finally(() => transaction.finish());
    } else {
      transaction.finish();
      return result;
    }
  } catch (error) {
    transaction.setStatus('internal_error');
    transaction.finish();
    throw error;
  }
}

// API call tracking
export function trackApiCall(url: string, method: string, statusCode?: number, duration?: number) {
  const transaction = Sentry.startTransaction({
    name: `${method} ${url}`,
    op: 'http.client',
  });
  
  if (statusCode) {
    transaction.setHttpStatus(statusCode);
  }
  
  if (duration) {
    transaction.setMeasurement('http.request.duration', duration, 'millisecond');
  }
  
  transaction.finish();
}

// Custom tags for categorizing errors
export function setErrorTags(tags: Record<string, string>) {
  Sentry.configureScope((scope) => {
    Object.keys(tags).forEach((key) => {
      scope.setTag(key, tags[key]);
    });
  });
}

// Financial specific error tracking
export function trackFinancialError(
  errorType: 'api_quota_exceeded' | 'invalid_symbol' | 'calculation_error' | 'auth_failure',
  symbol?: string,
  provider?: string,
  additionalContext?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setTag('error_category', 'financial');
    scope.setTag('error_type', errorType);
    
    if (symbol) {
      scope.setTag('stock_symbol', symbol);
    }
    
    if (provider) {
      scope.setTag('api_provider', provider);
    }
    
    if (additionalContext) {
      scope.setContext('financial_context', additionalContext);
    }
    
    Sentry.captureMessage(`Financial Error: ${errorType}`, 'error');
  });
}

// Admin panel error tracking
export function trackAdminError(
  action: string,
  resource: string,
  error: Error,
  userId?: string
) {
  Sentry.withScope((scope) => {
    scope.setTag('error_category', 'admin');
    scope.setTag('admin_action', action);
    scope.setTag('admin_resource', resource);
    
    if (userId) {
      scope.setTag('admin_user', userId);
    }
    
    scope.setContext('admin_context', {
      action,
      resource,
      timestamp: new Date().toISOString(),
    });
    
    Sentry.captureException(error);
  });
}

// React Error Boundary integration
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// Profiling integration
export function startProfiler(name: string) {
  return Sentry.startTransaction({
    name,
    op: 'navigation',
  });
}

export { Sentry };