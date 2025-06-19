// Comprehensive error handling system for financial application
import { toast } from '@/hooks/use-toast';
import type {
  FinancialError,
  APIError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  RetryConfig,
  CircuitBreakerConfig,
  ErrorRecoveryResult,
  USER_ERROR_MESSAGES
} from '@shared/error-types';

// Generate unique error ID
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate request ID for tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error creation utilities
export class ErrorFactory {
  static createAPIError(
    endpoint: string,
    method: string,
    originalError: Error,
    statusCode?: number,
    provider?: string
  ): APIError {
    const category = this.categorizeAPIError(statusCode, originalError);
    const severity = this.determineSeverity(category, statusCode);
    
    return {
      id: generateErrorId(),
      category,
      severity,
      message: `API Error: ${method} ${endpoint} - ${originalError.message}`,
      userMessage: USER_ERROR_MESSAGES[category][severity],
      originalError,
      context: {
        endpoint,
        method,
        statusCode,
        provider,
        userAgent: navigator?.userAgent,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      requestId: generateRequestId(),
      recoveryStrategy: this.determineRecoveryStrategy(category, severity),
      retryable: this.isRetryable(category, statusCode),
      complianceLog: this.requiresComplianceLogging(category),
      endpoint,
      method,
      statusCode,
      provider,
      quotaExceeded: this.isQuotaExceeded(statusCode, originalError),
      rateLimit: this.extractRateLimit(originalError)
    };
  }

  static createValidationError(
    field: string,
    value: any,
    constraints: string[],
    context?: Record<string, any>
  ): FinancialError {
    return {
      id: generateErrorId(),
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      message: `Validation failed for field '${field}': ${constraints.join(', ')}`,
      userMessage: `Please check the ${field} field: ${constraints.join(', ')}`,
      context: { field, value, constraints, ...context },
      timestamp: new Date(),
      recoveryStrategy: RecoveryStrategy.FAIL,
      retryable: false,
      complianceLog: false
    };
  }

  static createCalculationError(
    calculationType: string,
    inputs: Record<string, any>,
    originalError: Error,
    context?: Record<string, any>
  ): FinancialError {
    return {
      id: generateErrorId(),
      category: ErrorCategory.CALCULATION,
      severity: ErrorSeverity.HIGH,
      message: `Calculation error in ${calculationType}: ${originalError.message}`,
      userMessage: USER_ERROR_MESSAGES[ErrorCategory.CALCULATION][ErrorSeverity.HIGH],
      originalError,
      context: { calculationType, inputs, ...context },
      timestamp: new Date(),
      recoveryStrategy: RecoveryStrategy.FALLBACK,
      retryable: true,
      complianceLog: true
    };
  }

  private static categorizeAPIError(statusCode?: number, error?: Error): ErrorCategory {
    if (!statusCode) return ErrorCategory.NETWORK;
    
    if (statusCode >= 500) return ErrorCategory.SERVICE_UNAVAILABLE;
    if (statusCode === 429) return ErrorCategory.RATE_LIMIT;
    if (statusCode === 401) return ErrorCategory.AUTHENTICATION;
    if (statusCode === 403) return ErrorCategory.AUTHORIZATION;
    if (statusCode === 408 || error?.message?.includes('timeout')) return ErrorCategory.TIMEOUT;
    if (statusCode >= 400) return ErrorCategory.VALIDATION;
    
    return ErrorCategory.UNKNOWN;
  }

  private static determineSeverity(category: ErrorCategory, statusCode?: number): ErrorSeverity {
    switch (category) {
      case ErrorCategory.SERVICE_UNAVAILABLE:
        return statusCode === 503 ? ErrorSeverity.HIGH : ErrorSeverity.CRITICAL;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return ErrorSeverity.HIGH;
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.API_LIMIT:
        return ErrorSeverity.MEDIUM;
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.LOW;
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private static determineRecoveryStrategy(category: ErrorCategory, severity: ErrorSeverity): RecoveryStrategy {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
      case ErrorCategory.SERVICE_UNAVAILABLE:
        return RecoveryStrategy.RETRY;
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.API_LIMIT:
        return RecoveryStrategy.CACHE;
      case ErrorCategory.AUTHENTICATION:
        return RecoveryStrategy.FAIL;
      case ErrorCategory.CALCULATION:
        return RecoveryStrategy.FALLBACK;
      default:
        return severity === ErrorSeverity.CRITICAL ? RecoveryStrategy.FAIL : RecoveryStrategy.RETRY;
    }
  }

  private static isRetryable(category: ErrorCategory, statusCode?: number): boolean {
    const nonRetryableCategories = [
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.AUTHORIZATION,
      ErrorCategory.VALIDATION
    ];
    
    if (nonRetryableCategories.includes(category)) return false;
    if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429 && statusCode !== 408) return false;
    
    return true;
  }

  private static requiresComplianceLogging(category: ErrorCategory): boolean {
    return [
      ErrorCategory.AUTHENTICATION,
      ErrorCategory.AUTHORIZATION,
      ErrorCategory.DATA_INTEGRITY,
      ErrorCategory.CALCULATION
    ].includes(category);
  }

  private static isQuotaExceeded(statusCode?: number, error?: Error): boolean {
    return statusCode === 429 || 
           error?.message?.toLowerCase().includes('quota') ||
           error?.message?.toLowerCase().includes('limit exceeded');
  }

  private static extractRateLimit(error?: Error): APIError['rateLimit'] {
    // Try to extract rate limit info from error message or headers
    const message = error?.message || '';
    const limitMatch = message.match(/limit[:\s]+(\d+)/i);
    const remainingMatch = message.match(/remaining[:\s]+(\d+)/i);
    const resetMatch = message.match(/reset[:\s]+(\d+)/i);
    
    if (limitMatch || remainingMatch || resetMatch) {
      return {
        limit: limitMatch ? parseInt(limitMatch[1]) : 1000,
        remaining: remainingMatch ? parseInt(remainingMatch[1]) : 0,
        resetTime: resetMatch ? new Date(parseInt(resetMatch[1]) * 1000) : new Date(Date.now() + 3600000)
      };
    }
    
    return undefined;
  }
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private halfOpenCalls = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'half-open';
        this.halfOpenCalls = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

// Retry mechanism with exponential backoff
export class RetryHandler {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<ErrorRecoveryResult<T>> {
    let lastError: FinancialError | null = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const data = await operation();
        return {
          success: true,
          data,
          strategy: RecoveryStrategy.RETRY,
          attemptCount: attempt,
          recoveryTime: Date.now() - startTime
        };
      } catch (error) {
        const financialError = this.createFinancialError(error, context);
        lastError = financialError;
        
        if (!this.config.retryCondition(financialError) || attempt === this.config.maxAttempts) {
          break;
        }
        
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError!,
      strategy: RecoveryStrategy.RETRY,
      attemptCount: this.config.maxAttempts,
      recoveryTime: Date.now() - startTime
    };
  }

  private createFinancialError(error: any, context?: Record<string, any>): FinancialError {
    if (error instanceof Error) {
      return {
        id: generateErrorId(),
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: 'An unexpected error occurred',
        originalError: error,
        context,
        timestamp: new Date(),
        recoveryStrategy: RecoveryStrategy.RETRY,
        retryable: true,
        complianceLog: false
      };
    }
    
    return error as FinancialError;
  }

  private calculateDelay(attempt: number): number {
    const baseDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const delayWithJitter = baseDelay * (1 + (Math.random() - 0.5) * this.config.jitterRange / 100);
    return Math.min(delayWithJitter, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main error handler class
export class FinancialErrorHandler {
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private errorMetrics = new Map<string, number>();

  constructor(
    retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterRange: 10,
      retryCondition: (error) => error.retryable
    },
    circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 300000,
      halfOpenMaxCalls: 3
    }
  ) {
    this.retryHandler = new RetryHandler(retryConfig);
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
  }

  async handleError<T>(
    error: FinancialError,
    recoveryOperation?: () => Promise<T>
  ): Promise<ErrorRecoveryResult<T>> {
    this.logError(error);
    this.updateMetrics(error);
    this.notifyUser(error);
    
    if (error.complianceLog) {
      await this.logCompliance(error);
    }

    if (!recoveryOperation) {
      return {
        success: false,
        error,
        strategy: RecoveryStrategy.FAIL,
        attemptCount: 0,
        recoveryTime: 0
      };
    }

    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        return await this.retryHandler.execute(recoveryOperation);
      
      case RecoveryStrategy.CACHE:
        return await this.handleCacheStrategy(error, recoveryOperation);
      
      case RecoveryStrategy.FALLBACK:
        return await this.handleFallbackStrategy(error, recoveryOperation);
      
      default:
        return {
          success: false,
          error,
          strategy: error.recoveryStrategy,
          attemptCount: 0,
          recoveryTime: 0
        };
    }
  }

  private async handleCacheStrategy<T>(
    error: FinancialError,
    operation: () => Promise<T>
  ): Promise<ErrorRecoveryResult<T>> {
    try {
      // Try to get cached data
      const cacheKey = this.getCacheKey(error);
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        return {
          success: true,
          data: JSON.parse(cachedData),
          strategy: RecoveryStrategy.CACHE,
          attemptCount: 0,
          recoveryTime: 0
        };
      }
    } catch (cacheError) {
      console.warn('Cache retrieval failed:', cacheError);
    }

    // If no cache available, try retry
    return await this.retryHandler.execute(operation);
  }

  private async handleFallbackStrategy<T>(
    error: FinancialError,
    operation: () => Promise<T>
  ): Promise<ErrorRecoveryResult<T>> {
    // First try the original operation with retry
    const retryResult = await this.retryHandler.execute(operation);
    
    if (retryResult.success) {
      return retryResult;
    }

    // If retry fails, use fallback data
    try {
      const fallbackData = await this.getFallbackData<T>(error);
      return {
        success: true,
        data: fallbackData,
        strategy: RecoveryStrategy.FALLBACK,
        attemptCount: retryResult.attemptCount,
        recoveryTime: retryResult.recoveryTime
      };
    } catch (fallbackError) {
      return retryResult; // Return original retry result if fallback fails
    }
  }

  private async getFallbackData<T>(error: FinancialError): Promise<T> {
    // Implement fallback data retrieval based on error context
    // This could involve mock data, cached data, or simplified calculations
    throw new Error('Fallback data not available');
  }

  private getCacheKey(error: FinancialError): string {
    return `cache_${error.category}_${JSON.stringify(error.context)}`;
  }

  private logError(error: FinancialError): void {
    console.group(`🚨 Financial Error: ${error.category}`);
    console.error('Error ID:', error.id);
    console.error('Message:', error.message);
    console.error('Severity:', error.severity);
    console.error('Context:', error.context);
    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }
    console.groupEnd();
  }

  private updateMetrics(error: FinancialError): void {
    const key = `${error.category}_${error.severity}`;
    this.errorMetrics.set(key, (this.errorMetrics.get(key) || 0) + 1);
  }

  private notifyUser(error: FinancialError): void {
    const variant = this.getToastVariant(error.severity);
    
    toast({
      title: this.getToastTitle(error.category, error.severity),
      description: error.userMessage,
      variant,
      duration: this.getToastDuration(error.severity)
    });
  }

  private getToastVariant(severity: ErrorSeverity): 'default' | 'destructive' {
    return [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(severity) 
      ? 'destructive' 
      : 'default';
  }

  private getToastTitle(category: ErrorCategory, severity: ErrorSeverity): string {
    const titles: Record<ErrorSeverity, string> = {
      [ErrorSeverity.LOW]: 'Notice',
      [ErrorSeverity.MEDIUM]: 'Warning',
      [ErrorSeverity.HIGH]: 'Error',
      [ErrorSeverity.CRITICAL]: 'Critical Error'
    };
    
    return titles[severity];
  }

  private getToastDuration(severity: ErrorSeverity): number {
    const durations: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 3000,
      [ErrorSeverity.MEDIUM]: 5000,
      [ErrorSeverity.HIGH]: 7000,
      [ErrorSeverity.CRITICAL]: 10000
    };
    
    return durations[severity];
  }

  private async logCompliance(error: FinancialError): Promise<void> {
    // Implement compliance logging
    // This would typically send to a secure logging service
    const complianceLog = {
      timestamp: new Date(),
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      context: error.context,
      userAgent: navigator?.userAgent,
      url: window?.location?.href
    };
    
    console.log('📋 Compliance Log:', complianceLog);
    
    // TODO: Send to compliance logging service
    // await this.sendToComplianceService(complianceLog);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.errorMetrics);
  }

  clearMetrics(): void {
    this.errorMetrics.clear();
  }
}

// Global error handler instance
export const errorHandler = new FinancialErrorHandler();

// Utility functions for common error scenarios
export const handleAPIError = (endpoint: string, method: string, error: Error, statusCode?: number, provider?: string) => {
  const apiError = ErrorFactory.createAPIError(endpoint, method, error, statusCode, provider);
  return errorHandler.handleError(apiError);
};

export const handleValidationError = (field: string, value: any, constraints: string[]) => {
  const validationError = ErrorFactory.createValidationError(field, value, constraints);
  return errorHandler.handleError(validationError);
};

export const handleCalculationError = (calculationType: string, inputs: Record<string, any>, error: Error) => {
  const calculationError = ErrorFactory.createCalculationError(calculationType, inputs, error);
  return errorHandler.handleError(calculationError);
};