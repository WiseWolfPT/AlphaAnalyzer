/**
 * Sentry module selector - uses real Sentry if available, otherwise no-op
 */

let sentryModule: any;

try {
  // Try to load the real Sentry module
  require('@sentry/node');
  sentryModule = require('./sentry');
} catch (error) {
  // Use no-op implementation if Sentry is not available
  console.log('Using no-op Sentry implementation');
  sentryModule = require('./sentry-noop');
}

// Re-export all functions
export const {
  initializeSentry,
  setupSentryMiddleware,
  setupSentryErrorHandler,
  reportError,
  trackApiError,
  trackDatabaseError,
  startTransaction,
  monitorPerformance,
  trackSecurityEvent,
  monitorRateLimit,
  addBreadcrumb,
  Sentry
} = sentryModule;