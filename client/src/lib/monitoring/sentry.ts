// Mock Sentry for development - replace with real Sentry when available
const mockSentry = {
  init: () => {},
  captureException: (error: Error) => console.error('Error:', error),
  setUser: (user: any) => {},
  addBreadcrumb: (breadcrumb: any) => {},
  startTransaction: (data: any) => ({ finish: () => {} }),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
};

export const initSentry = () => {
  // TODO: Install and configure @sentry/react when needed
  console.log('Sentry monitoring disabled - using mock');
};

// Error boundary component
export const SentryErrorBoundary = mockSentry.ErrorBoundary;

// Performance monitoring helpers
export const startTransaction = (name: string, op: string) => {
  return mockSentry.startTransaction({ name, op });
};

// Custom error capture
export const captureException = (error: Error, context?: Record<string, any>) => {
  mockSentry.captureException(error);
};

// User identification
export const identifyUser = (userId: string, email?: string, username?: string) => {
  mockSentry.setUser({ id: userId, email, username });
};

// Clear user on logout
export const clearUser = () => {
  mockSentry.setUser(null);
};

// Add custom breadcrumb
export const addBreadcrumb = (message: string, data?: any) => {
  mockSentry.addBreadcrumb({ message, data });
};