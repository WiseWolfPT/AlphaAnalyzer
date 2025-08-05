/**
 * Sentry Configuration for Backend Error Monitoring
 * Provides comprehensive error tracking and performance monitoring for Node.js
 */

import { Express } from 'express';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Configuration
const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.APP_VERSION || '1.0.0';

export function initializeSentry() {
  // Only initialize Sentry when DSN is provided
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not provided. Error monitoring disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `alfalyzer-backend@${RELEASE}`,
    
    // Performance monitoring
    integrations: [
      // Enable HTTP tracking
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable profiling
      new ProfilingIntegration(),
    ],
    
    // Performance sampling
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Profiling sampling
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Error sampling
    sampleRate: 1.0,
    
    // Security settings
    beforeSend(event, hint) {
      // Filter out sensitive information
      if (event.exception) {
        const error = hint.originalException;
        
        // Don't send API key errors
        if (error && error.message && error.message.includes('api_key')) {
          return null;
        }
        
        // Filter rate limit errors (they're expected)
        if (error && error.message && error.message.includes('rate limit')) {
          // Only send 1% of rate limit errors
          return Math.random() < 0.01 ? event : null;
        }
      }
      
      // Remove sensitive data from request context
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers && event.request.headers.authorization) {
          event.request.headers.authorization = '[REDACTED]';
        }
        
        // Remove API keys from query params
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string.replace(
            /api_key=[^&]+/g,
            'api_key=[REDACTED]'
          );
        }
        
        // Remove sensitive data from body
        if (event.request.data && typeof event.request.data === 'object') {
          const sensitiveFields = ['password', 'token', 'api_key', 'secret'];
          sensitiveFields.forEach(field => {
            if (event.request.data[field]) {
              event.request.data[field] = '[REDACTED]';
            }
          });
        }
      }
      
      return event;
    },
  });

  console.log(`Sentry initialized for backend in ${ENVIRONMENT} environment`);
}

// Express middleware integration
export function setupSentryMiddleware(app: Express) {
  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
  
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

export function setupSentryErrorHandler(app: Express) {
  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only capture 4xx and 5xx errors
      return error.status >= 400;
    },
  }));
}

// Custom error reporting
export function reportError(error: Error, context?: Record<string, any>, user?: { id: string; email?: string }) {
  Sentry.withScope((scope) => {
    if (user) {
      scope.setUser({ id: user.id });
    }
    
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setContext(key, context[key]);
      });
    }
    
    Sentry.captureException(error);
  });
}

// API error tracking
export function trackApiError(
  provider: string,
  endpoint: string,
  error: Error,
  statusCode?: number,
  responseTime?: number
) {
  Sentry.withScope((scope) => {
    scope.setTag('error_category', 'api');
    scope.setTag('api_provider', provider);
    scope.setTag('api_endpoint', endpoint);
    
    if (statusCode) {
      scope.setTag('status_code', statusCode.toString());
    }
    
    scope.setContext('api_context', {
      provider,
      endpoint,
      status_code: statusCode,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString(),
    });
    
    Sentry.captureException(error);
  });
}

// Database error tracking
export function trackDatabaseError(
  operation: string,
  table: string,
  error: Error,
  query?: string
) {
  Sentry.withScope((scope) => {
    scope.setTag('error_category', 'database');
    scope.setTag('db_operation', operation);
    scope.setTag('db_table', table);
    
    scope.setContext('database_context', {
      operation,
      table,
      query: query ? query.substring(0, 200) : undefined, // Limit query length
      timestamp: new Date().toISOString(),
    });
    
    Sentry.captureException(error);
  });
}

// Performance tracking
export function trackPerformance(name: string, duration: number, tags?: Record<string, string>) {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${name} took ${duration}ms`,
    level: 'info',
    data: {
      duration_ms: duration,
      ...tags,
    },
  });
  
  // If performance is poor, create an event
  if (duration > 5000) { // 5 seconds
    Sentry.withScope((scope) => {
      scope.setTag('performance_issue', 'slow_operation');
      if (tags) {
        Object.keys(tags).forEach(key => {
          scope.setTag(key, tags[key]);
        });
      }
      
      Sentry.captureMessage(
        `Slow operation detected: ${name} took ${duration}ms`,
        'warning'
      );
    });
  }
}

// Transaction tracking
export function startTransaction(name: string, operation: string = 'custom') {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

// Admin action tracking
export function trackAdminAction(
  adminId: string,
  action: string,
  resource: string,
  resourceId?: string,
  success: boolean = true
) {
  Sentry.withScope((scope) => {
    scope.setTag('event_category', 'admin');
    scope.setTag('admin_action', action);
    scope.setTag('admin_resource', resource);
    scope.setTag('action_success', success.toString());
    
    scope.setUser({ id: adminId });
    
    scope.setContext('admin_context', {
      action,
      resource,
      resource_id: resourceId,
      success,
      timestamp: new Date().toISOString(),
    });
    
    const level = success ? 'info' : 'warning';
    Sentry.captureMessage(
      `Admin action: ${action} on ${resource}${resourceId ? ` (${resourceId})` : ''} - ${success ? 'Success' : 'Failed'}`,
      level
    );
  });
}

// Security event tracking
export function trackSecurityEvent(
  eventType: 'unauthorized_access' | 'failed_login' | 'suspicious_activity' | 'admin_escalation',
  userId?: string,
  ip?: string,
  details?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setTag('event_category', 'security');
    scope.setTag('security_event', eventType);
    
    if (userId) {
      scope.setUser({ id: userId });
    }
    
    if (ip) {
      scope.setTag('client_ip', ip);
    }
    
    scope.setContext('security_context', {
      event_type: eventType,
      user_id: userId,
      client_ip: ip,
      timestamp: new Date().toISOString(),
      ...details,
    });
    
    Sentry.captureMessage(
      `Security event: ${eventType}`,
      'warning'
    );
  });
}

// Financial data tracking
export function trackFinancialEvent(
  eventType: 'quota_exceeded' | 'api_failure' | 'calculation_error' | 'cache_miss',
  provider?: string,
  symbol?: string,
  details?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setTag('event_category', 'financial');
    scope.setTag('financial_event', eventType);
    
    if (provider) {
      scope.setTag('api_provider', provider);
    }
    
    if (symbol) {
      scope.setTag('stock_symbol', symbol);
    }
    
    scope.setContext('financial_context', {
      event_type: eventType,
      provider,
      symbol,
      timestamp: new Date().toISOString(),
      ...details,
    });
    
    const level = eventType === 'quota_exceeded' ? 'warning' : 'info';
    Sentry.captureMessage(
      `Financial event: ${eventType}${symbol ? ` for ${symbol}` : ''}${provider ? ` via ${provider}` : ''}`,
      level
    );
  });
}

// Custom breadcrumb
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

export { Sentry };