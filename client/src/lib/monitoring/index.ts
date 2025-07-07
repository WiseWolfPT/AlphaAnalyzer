import { 
  initSentry, 
  captureException, 
  identifyUser, 
  clearUser,
  addBreadcrumb,
  SentryErrorBoundary,
  startTransaction 
} from './sentry';
import { 
  initWebVitals, 
  markPerformance, 
  measurePerformance,
  monitorLongTasks 
} from './web-vitals';

export function initializeMonitoring(): void {
  // Initialize Sentry error tracking
  initSentry();
  
  // Initialize Web Vitals performance monitoring
  initWebVitals();
  
  // Monitor long tasks
  const cleanupLongTasks = monitorLongTasks();
  
  // Global error handler
  window.addEventListener('error', (event) => {
    captureException(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureException(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
      promise: event.promise,
      reason: event.reason,
    });
  });
  
  // Log initialization
  if (import.meta.env.DEV) {
    console.log('🚀 Monitoring initialized');
  }
  
  // Return cleanup function
  return cleanupLongTasks;
}

// Re-export monitoring utilities
export { 
  captureException, 
  identifyUser, 
  clearUser,
  addBreadcrumb,
  SentryErrorBoundary,
  startTransaction,
  markPerformance, 
  measurePerformance
};