/**
 * No-op implementation of Sentry for production when @sentry/node is not available
 */

export function initializeSentry() {
  console.log('Sentry not available - error monitoring disabled');
}

export function setupSentryMiddleware(app: any) {
  // No-op
}

export function setupSentryErrorHandler(app: any) {
  // No-op
}

export function reportError(error: Error, context?: any, user?: any) {
  console.error('Error:', error);
}

export function trackApiError(
  provider: string,
  endpoint: string,
  error: Error,
  statusCode?: number,
  responseTime?: number
) {
  console.error(`API Error [${provider}/${endpoint}]:`, error);
}

export function trackDatabaseError(
  operation: string,
  table: string,
  error: Error,
  query?: string
) {
  console.error(`Database Error [${operation}/${table}]:`, error);
}

export function startTransaction(name: string, op: string) {
  return {
    setData: () => {},
    setStatus: () => {},
    finish: () => {},
  };
}

export function monitorPerformance(
  operation: string,
  duration: number,
  status: 'success' | 'error',
  tags?: Record<string, string>
) {
  // No-op
}

export function trackSecurityEvent(
  eventType: string,
  severity: 'info' | 'warning' | 'error' | 'critical',
  details: any,
  user?: any
) {
  if (severity === 'error' || severity === 'critical') {
    console.error(`Security Event [${eventType}]:`, details);
  }
}

export function monitorRateLimit(
  provider: string,
  endpoint: string,
  remaining: number,
  total: number,
  reset: Date | string
) {
  // No-op
}

export function addBreadcrumb(message: string, category: string, data?: any) {
  // No-op
}

export const Sentry = null;