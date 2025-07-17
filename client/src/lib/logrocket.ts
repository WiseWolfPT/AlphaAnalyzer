/**
 * LogRocket Configuration for Frontend Session Recording
 * Provides session recording and user experience monitoring
 */

import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

// Configuration
const LOGROCKET_APP_ID = import.meta.env.VITE_LOGROCKET_APP_ID;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';

// Privacy configuration
const privacyConfig = {
  // Don't capture input fields with sensitive data
  inputSanitizer: true,
  
  // Sanitize text content
  textSanitizer: true,
  
  // Sanitize request/response headers
  requestSanitizer: (request: any) => {
    // Don't log authorization headers
    if (request.headers && request.headers.authorization) {
      request.headers.authorization = '[REDACTED]';
    }
    
    // Don't log API keys
    if (request.url && request.url.includes('api_key=')) {
      request.url = request.url.replace(/api_key=[^&]+/, 'api_key=[REDACTED]');
    }
    
    return request;
  },
  
  responseSanitizer: (response: any) => {
    // Don't log sensitive response data
    if (response.body && typeof response.body === 'string') {
      try {
        const parsed = JSON.parse(response.body);
        if (parsed.access_token) {
          parsed.access_token = '[REDACTED]';
          response.body = JSON.stringify(parsed);
        }
        if (parsed.api_key) {
          parsed.api_key = '[REDACTED]';
          response.body = JSON.stringify(parsed);
        }
      } catch (e) {
        // Not JSON, continue
      }
    }
    
    return response;
  },
  
  // Console log levels to capture
  consoleOptions: {
    isEnabled: {
      log: true,
      info: true,
      warn: true,
      error: true,
      debug: false, // Don't capture debug logs
    },
  },
  
  // Network request configuration
  networkOptions: {
    isEnabled: true,
    requestSanitizer: true,
    responseSanitizer: true,
  },
  
  // DOM configuration
  domSanitizer: true,
};

export function initializeLogRocket() {
  // Only initialize LogRocket in production or when app ID is provided
  if (!LOGROCKET_APP_ID) {
    console.warn('LogRocket App ID not provided. Session recording disabled.');
    return;
  }

  // Initialize LogRocket
  LogRocket.init(LOGROCKET_APP_ID, {
    ...privacyConfig,
    
    // Release tracking
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Environment
    serverURL: ENVIRONMENT === 'production' ? undefined : 'https://r.lr-ingest.io',
    
    // Performance settings
    mergeIframes: true,
    parentDomain: ENVIRONMENT === 'production' ? 'alfalyzer.com' : undefined,
  });

  // Set up React plugin
  setupLogRocketReact(LogRocket);

  console.log(`LogRocket initialized for ${ENVIRONMENT} environment`);
}

// User identification
export function identifyUser(user: { 
  id: string; 
  email?: string; 
  name?: string; 
  tier?: string;
  admin?: boolean;
}) {
  LogRocket.identify(user.id, {
    name: user.name || 'Unknown User',
    email: user.email || 'unknown@example.com',
    subscription_tier: user.tier || 'free',
    is_admin: user.admin || false,
    
    // Add timestamp for tracking
    identified_at: new Date().toISOString(),
  });
}

// Session tracking
export function startSession(sessionName?: string) {
  if (sessionName) {
    LogRocket.getSessionURL(sessionURL => {
      console.log(`LogRocket session: ${sessionURL}`);
      
      // You can send this URL to your analytics or support system
      if (window.analytics) {
        window.analytics.track('LogRocket Session Started', {
          session_url: sessionURL,
          session_name: sessionName,
        });
      }
    });
  }
}

// Custom event tracking
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  LogRocket.track(eventName, {
    timestamp: new Date().toISOString(),
    ...properties,
  });
}

// Financial action tracking
export function trackFinancialAction(
  action: 'portfolio_created' | 'stock_added' | 'watchlist_updated' | 'api_call' | 'calculation_performed',
  symbol?: string,
  additionalData?: Record<string, any>
) {
  LogRocket.track(`Financial: ${action}`, {
    action,
    symbol,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
}

// Admin action tracking
export function trackAdminAction(
  action: 'user_banned' | 'transcript_published' | 'settings_changed' | 'api_key_rotated',
  resource?: string,
  additionalData?: Record<string, any>
) {
  LogRocket.track(`Admin: ${action}`, {
    action,
    resource,
    timestamp: new Date().toISOString(),
    admin_user: true,
    ...additionalData,
  });
}

// Error context
export function addErrorContext(context: Record<string, any>) {
  LogRocket.addMetadata('error_context', {
    timestamp: new Date().toISOString(),
    ...context,
  });
}

// Performance tracking
export function trackPerformance(metric: string, value: number, unit: string = 'ms') {
  LogRocket.track('Performance Metric', {
    metric,
    value,
    unit,
    timestamp: new Date().toISOString(),
  });
}

// API call tracking with performance
export function trackApiPerformance(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  cacheHit: boolean = false
) {
  LogRocket.track('API Call', {
    endpoint,
    method,
    duration_ms: duration,
    status_code: statusCode,
    cache_hit: cacheHit,
    timestamp: new Date().toISOString(),
  });
}

// User feedback integration
export function captureUserFeedback(feedback: {
  rating: number;
  comment?: string;
  page?: string;
  feature?: string;
}) {
  LogRocket.track('User Feedback', {
    ...feedback,
    timestamp: new Date().toISOString(),
  });
  
  // Also get session URL for feedback context
  LogRocket.getSessionURL(sessionURL => {
    console.log(`User feedback session: ${sessionURL}`);
    
    // You can send feedback + session URL to your support system
    if (window.analytics) {
      window.analytics.track('User Feedback Submitted', {
        ...feedback,
        session_url: sessionURL,
      });
    }
  });
}

// A/B test tracking
export function trackABTest(testName: string, variant: string) {
  LogRocket.track('A/B Test', {
    test_name: testName,
    variant,
    timestamp: new Date().toISOString(),
  });
}

// Feature flag tracking
export function trackFeatureFlag(flagName: string, enabled: boolean) {
  LogRocket.addMetadata('feature_flags', {
    [flagName]: enabled,
  });
}

// Session URL for support
export function getSessionUrlForSupport(): Promise<string> {
  return new Promise((resolve) => {
    LogRocket.getSessionURL(resolve);
  });
}

// Console integration
export function logToLogRocket(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  // This will be captured by LogRocket's console integration
  console[level](`[LogRocket] ${message}`, data);
}

// Integration with error boundary
export function captureErrorForSession(error: Error, errorInfo?: any) {
  LogRocket.captureException(error);
  
  LogRocket.addMetadata('react_error', {
    error_message: error.message,
    error_stack: error.stack,
    component_stack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
  });
}

export { LogRocket };