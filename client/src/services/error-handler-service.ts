/**
 * Global Error Handler Service
 * Provides centralized error handling with retry logic, user notifications, and logging
 */

import { useNotificationStore } from '@/stores/notification-store';

export interface ErrorOptions {
  // Error metadata
  context?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'network' | 'api' | 'validation' | 'auth' | 'system';
  
  // Retry configuration
  retry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  
  // UI options
  showNotification?: boolean;
  notificationDuration?: number;
  silent?: boolean;
  
  // Additional data
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  options: ErrorOptions;
  retryCount: number;
  resolved: boolean;
}

class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private errorQueue: Map<string, ErrorReport> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  private constructor() {
    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * Handle an error with optional retry logic
   */
  async handleError(
    error: Error | unknown,
    options: ErrorOptions = {}
  ): Promise<void> {
    const errorObj = this.normalizeError(error);
    const errorId = this.generateErrorId();
    
    const report: ErrorReport = {
      id: errorId,
      timestamp: new Date(),
      error: errorObj,
      options: {
        severity: 'medium',
        showNotification: true,
        retry: true,
        maxRetries: 3,
        retryDelay: 1000,
        ...options
      },
      retryCount: 0,
      resolved: false
    };

    this.errorQueue.set(errorId, report);

    // Log error
    this.logError(report);

    // Show notification if enabled
    if (report.options.showNotification && !report.options.silent) {
      this.showErrorNotification(report);
    }

    // Handle retry logic if enabled
    if (report.options.retry && this.isRetryableError(errorObj, report.options.category)) {
      await this.scheduleRetry(report);
    }

    // Report to monitoring services (when available)
    this.reportToMonitoring(report);
  }

  /**
   * Handle API errors specifically
   */
  async handleApiError(
    error: Error | unknown,
    endpoint: string,
    retryFn?: () => Promise<any>
  ): Promise<any> {
    const errorObj = this.normalizeError(error);
    
    // Check if it's a network error
    if (this.isNetworkError(errorObj)) {
      return this.handleNetworkError(errorObj, endpoint, retryFn);
    }

    // Check if it's a quota error
    if (this.isQuotaError(errorObj)) {
      return this.handleQuotaError(errorObj, endpoint);
    }

    // Check if it's an auth error
    if (this.isAuthError(errorObj)) {
      return this.handleAuthError(errorObj);
    }

    // Default API error handling
    await this.handleError(errorObj, {
      context: `API call to ${endpoint}`,
      category: 'api',
      retry: !!retryFn,
      showNotification: true
    });

    throw errorObj;
  }

  /**
   * Handle network errors with offline fallback
   */
  private async handleNetworkError(
    error: Error,
    endpoint: string,
    retryFn?: () => Promise<any>
  ): Promise<any> {
    const { showError, showWarning } = useNotificationStore.getState();

    // Check if we're offline
    if (!navigator.onLine) {
      showWarning(
        'Offline Mode',
        'You are currently offline. Showing cached data where available.'
      );
      
      // Return cached data if available
      const cachedData = this.getCachedData(endpoint);
      if (cachedData) {
        return cachedData;
      }
      
      throw new Error('No cached data available for offline mode');
    }

    // Network error while online - retry
    if (retryFn) {
      showWarning(
        'Connection Issue',
        'Having trouble connecting. Retrying...'
      );

      try {
        const result = await this.retryWithBackoff(retryFn, 3, 1000);
        return result;
      } catch (retryError) {
        showError(
          'Connection Failed',
          'Unable to connect to the server. Please check your connection and try again.'
        );
        throw retryError;
      }
    }

    throw error;
  }

  /**
   * Handle API quota errors
   */
  private async handleQuotaError(error: Error, endpoint: string): Promise<void> {
    const { showError, showWarning } = useNotificationStore.getState();

    showWarning(
      'API Limit Reached',
      'We\'ve hit our API limit. Switching to cached data for a few minutes.'
    );

    // Log quota error for monitoring
    this.logQuotaError(endpoint);

    throw error;
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthError(error: Error): Promise<void> {
    const { showError } = useNotificationStore.getState();

    showError(
      'Authentication Required',
      'Please log in to continue.',
      {
        persistent: true,
        actions: [
          {
            label: 'Log In',
            action: () => {
              window.location.href = '/login';
            },
            type: 'primary'
          }
        ]
      }
    );

    throw error;
  }

  /**
   * Retry a function with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = this.normalizeError(error);
        
        if (i < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Show error notification to user
   */
  private showErrorNotification(report: ErrorReport): void {
    const { showError, showWarning, showInfo } = useNotificationStore.getState();
    const { error, options } = report;

    const title = this.getErrorTitle(error, options);
    const message = this.getErrorMessage(error, options);

    switch (options.severity) {
      case 'critical':
      case 'high':
        showError(title, message, {
          duration: options.notificationDuration || 8000,
          category: 'system'
        });
        break;
      case 'medium':
        showWarning(title, message, {
          duration: options.notificationDuration || 6000,
          category: 'system'
        });
        break;
      case 'low':
        showInfo(title, message, {
          duration: options.notificationDuration || 5000,
          category: 'system'
        });
        break;
    }
  }

  /**
   * Get user-friendly error title
   */
  private getErrorTitle(error: Error, options: ErrorOptions): string {
    if (options.context) {
      return `Error in ${options.context}`;
    }

    switch (options.category) {
      case 'network':
        return 'Connection Error';
      case 'api':
        return 'Data Loading Error';
      case 'validation':
        return 'Validation Error';
      case 'auth':
        return 'Authentication Error';
      case 'system':
        return 'System Error';
      default:
        return 'Something went wrong';
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: Error, options: ErrorOptions): string {
    // Check for specific error types
    if (this.isNetworkError(error)) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (this.isQuotaError(error)) {
      return 'We\'ve temporarily hit our data limit. Please try again in a few minutes.';
    }

    if (this.isAuthError(error)) {
      return 'You need to be logged in to perform this action.';
    }

    // Use error message if it's user-friendly
    if (error.message && !error.message.includes('fetch') && !error.message.includes('undefined')) {
      return error.message;
    }

    // Default messages by category
    switch (options.category) {
      case 'validation':
        return 'Please check your input and try again.';
      case 'api':
        return 'Failed to load data. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Schedule a retry for a failed operation
   */
  private async scheduleRetry(report: ErrorReport): Promise<void> {
    const { maxRetries = 3, retryDelay = 1000 } = report.options;

    if (report.retryCount >= maxRetries) {
      return;
    }

    const timeout = setTimeout(() => {
      report.retryCount++;
      
      // Attempt retry logic here
      // This would be implemented based on the specific error context
      
      this.retryTimeouts.delete(report.id);
    }, retryDelay * Math.pow(2, report.retryCount));

    this.retryTimeouts.set(report.id, timeout);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error, category?: string): boolean {
    // Network errors are retryable
    if (this.isNetworkError(error)) {
      return true;
    }

    // Timeout errors are retryable
    if (error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    // 5xx server errors are retryable
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return true;
    }

    // API errors might be retryable
    if (category === 'api' && !this.isAuthError(error) && !this.isQuotaError(error)) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: Error): boolean {
    return error.name === 'NetworkError' ||
           error.message.includes('Failed to fetch') ||
           error.message.includes('Network request failed') ||
           error.message.includes('ERR_NETWORK');
  }

  /**
   * Check if error is a quota error
   */
  private isQuotaError(error: Error): boolean {
    return error.message.includes('quota') ||
           error.message.includes('rate limit') ||
           error.message.includes('429') ||
           error.message.includes('too many requests');
  }

  /**
   * Check if error is an auth error
   */
  private isAuthError(error: Error): boolean {
    return error.message.includes('401') ||
           error.message.includes('403') ||
           error.message.includes('unauthorized') ||
           error.message.includes('forbidden');
  }

  /**
   * Normalize various error types into Error objects
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return new Error((error as any).message);
    }

    return new Error('An unknown error occurred');
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error for debugging
   */
  private logError(report: ErrorReport): void {
    const logLevel = report.options.severity === 'critical' || report.options.severity === 'high' 
      ? 'error' 
      : 'warn';

    console[logLevel]('[ErrorHandler]', {
      id: report.id,
      timestamp: report.timestamp,
      error: report.error.message,
      stack: report.error.stack,
      context: report.options.context,
      category: report.options.category,
      severity: report.options.severity,
      data: report.options.data
    });
  }

  /**
   * Log quota error specifically
   */
  private logQuotaError(endpoint: string): void {
    console.warn('[ErrorHandler] API Quota Error', {
      endpoint,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    });
  }

  /**
   * Report error to monitoring service
   */
  private reportToMonitoring(report: ErrorReport): void {
    // This would integrate with Sentry, LogRocket, etc.
    // For now, just log that we would report it
    if (report.options.severity === 'critical' || report.options.severity === 'high') {
      console.info('[ErrorHandler] Would report to monitoring:', report.id);
    }
  }

  /**
   * Get cached data for offline fallback
   */
  private getCachedData(endpoint: string): any {
    // This would integrate with the cache service
    // For now, return null
    return null;
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        context: 'Unhandled Promise Rejection',
        severity: 'high',
        category: 'system'
      });
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || event.message, {
        context: 'Global Error',
        severity: 'high',
        category: 'system'
      });
    });
  }

  /**
   * Clear error from queue
   */
  clearError(errorId: string): void {
    this.errorQueue.delete(errorId);
    
    const timeout = this.retryTimeouts.get(errorId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(errorId);
    }
  }

  /**
   * Get all errors in queue
   */
  getErrors(): ErrorReport[] {
    return Array.from(this.errorQueue.values());
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    this.errorQueue.clear();
  }
}

// Export singleton instance
export const errorHandler = ErrorHandlerService.getInstance();

// Export convenience functions
export const handleError = (error: Error | unknown, options?: ErrorOptions) => 
  errorHandler.handleError(error, options);

export const handleApiError = (error: Error | unknown, endpoint: string, retryFn?: () => Promise<any>) =>
  errorHandler.handleApiError(error, endpoint, retryFn);

export const retryWithBackoff = <T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number) =>
  errorHandler.retryWithBackoff(fn, maxRetries, baseDelay);