/**
 * Simplified Sentry Configuration for Production Build
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

export function initializeSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not provided. Error monitoring disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `alfalyzer@${RELEASE}`,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  });
}

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const addBreadcrumb = Sentry.addBreadcrumb;
export const setUser = Sentry.setUser;
export const setContext = Sentry.setContext;
export const setTags = Sentry.setTags;
export const setTag = Sentry.setTag;
export const withScope = Sentry.withScope;

export const trackSearch = (searchQuery: string, results: number) => {
  addBreadcrumb({
    category: 'search',
    message: `Search for "${searchQuery}" returned ${results} results`,
    level: 'info',
  });
};

export const trackApiCall = (endpoint: string, status: number, duration: number) => {
  addBreadcrumb({
    category: 'api',
    message: `API call to ${endpoint}`,
    level: status >= 400 ? 'error' : 'info',
    data: { status, duration },
  });
};

export const trackFinancialDataView = (symbol: string, dataType: string) => {
  addBreadcrumb({
    category: 'financial-data',
    message: `Viewed ${dataType} for ${symbol}`,
    level: 'info',
  });
};

export const setUserContext = (user: any) => {
  if (user) {
    setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    setUser(null);
  }
};

export const reportError = captureException;

export default {
  initializeSentry,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setContext,
  setTags,
  setTag,
  withScope,
  trackSearch,
  trackApiCall,
  trackFinancialDataView,
  setUserContext,
  reportError,
};