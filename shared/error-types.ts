// Error types and interfaces for financial application error handling

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  API_LIMIT = 'api_limit',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATA_INTEGRITY = 'data_integrity',
  CALCULATION = 'calculation',
  RATE_LIMIT = 'rate_limit',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CACHE = 'cache',
  DEGRADE = 'degrade',
  FAIL = 'fail',
  IGNORE = 'ignore'
}

export interface FinancialError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  recoveryStrategy: RecoveryStrategy;
  retryable: boolean;
  complianceLog: boolean; // Whether this error should be logged for compliance
}

export interface APIError extends FinancialError {
  endpoint: string;
  method: string;
  statusCode?: number;
  provider?: string;
  quotaExceeded?: boolean;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}

export interface ValidationError extends FinancialError {
  field: string;
  value: any;
  constraints: string[];
}

export interface CalculationError extends FinancialError {
  calculationType: string;
  inputs: Record<string, any>;
  expectedRange?: {
    min: number;
    max: number;
  };
}

export interface DataIntegrityError extends FinancialError {
  dataType: string;
  checkType: 'missing' | 'corrupt' | 'stale' | 'inconsistent';
  affectedRecords?: number;
}

export interface ErrorMetrics {
  errorId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  resolutionTime?: number; // in milliseconds
  userImpact: number; // percentage of users affected
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitterRange: number; // percentage
  retryCondition: (error: FinancialError) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
  halfOpenMaxCalls: number;
}

export interface ErrorHandlerConfig {
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  fallbackEnabled: boolean;
  cacheEnabled: boolean;
  userNotification: boolean;
  complianceLogging: boolean;
}

export type ErrorHandler<T = any> = (error: FinancialError) => Promise<T | null>;

export interface ErrorRecoveryResult<T = any> {
  success: boolean;
  data?: T;
  error?: FinancialError;
  strategy: RecoveryStrategy;
  attemptCount: number;
  recoveryTime: number; // milliseconds
}

// User-friendly error messages mapping
export const USER_ERROR_MESSAGES: Record<ErrorCategory, Record<ErrorSeverity, string>> = {
  [ErrorCategory.NETWORK]: {
    [ErrorSeverity.LOW]: 'Connection is slow. Please wait...',
    [ErrorSeverity.MEDIUM]: 'Network issue detected. Retrying...',
    [ErrorSeverity.HIGH]: 'Connection problems. Some features may be limited.',
    [ErrorSeverity.CRITICAL]: 'Unable to connect. Please check your internet connection.'
  },
  [ErrorCategory.API_LIMIT]: {
    [ErrorSeverity.LOW]: 'Data refresh may be delayed.',
    [ErrorSeverity.MEDIUM]: 'API usage approaching limit. Using cached data.',
    [ErrorSeverity.HIGH]: 'Daily API limit reached. Using cached data until tomorrow.',
    [ErrorSeverity.CRITICAL]: 'All API services unavailable. Displaying last known data.'
  },
  [ErrorCategory.AUTHENTICATION]: {
    [ErrorSeverity.LOW]: 'Session will expire soon. Please save your work.',
    [ErrorSeverity.MEDIUM]: 'Please log in again to continue.',
    [ErrorSeverity.HIGH]: 'Authentication failed. Please log in.',
    [ErrorSeverity.CRITICAL]: 'Account access denied. Please contact support.'
  },
  [ErrorCategory.VALIDATION]: {
    [ErrorSeverity.LOW]: 'Please check the highlighted field.',
    [ErrorSeverity.MEDIUM]: 'Some information needs to be corrected.',
    [ErrorSeverity.HIGH]: 'Required information is missing or invalid.',
    [ErrorSeverity.CRITICAL]: 'Cannot process request due to invalid data.'
  },
  [ErrorCategory.DATA_INTEGRITY]: {
    [ErrorSeverity.LOW]: 'Some data may be outdated.',
    [ErrorSeverity.MEDIUM]: 'Data inconsistency detected. Refreshing...',
    [ErrorSeverity.HIGH]: 'Data integrity issue. Using alternative source.',
    [ErrorSeverity.CRITICAL]: 'Critical data corruption. Please contact support.'
  },
  [ErrorCategory.CALCULATION]: {
    [ErrorSeverity.LOW]: 'Calculation warning. Please review inputs.',
    [ErrorSeverity.MEDIUM]: 'Calculation completed with assumptions.',
    [ErrorSeverity.HIGH]: 'Cannot calculate with current inputs.',
    [ErrorSeverity.CRITICAL]: 'Calculation error. Results may be unreliable.'
  },
  [ErrorCategory.RATE_LIMIT]: {
    [ErrorSeverity.LOW]: 'Request rate is high. Slowing down...',
    [ErrorSeverity.MEDIUM]: 'Rate limit approaching. Please wait...',
    [ErrorSeverity.HIGH]: 'Rate limit exceeded. Retrying in a moment...',
    [ErrorSeverity.CRITICAL]: 'Too many requests. Please wait before trying again.'
  },
  [ErrorCategory.SERVICE_UNAVAILABLE]: {
    [ErrorSeverity.LOW]: 'Service temporarily slow.',
    [ErrorSeverity.MEDIUM]: 'Service experiencing issues. Using backup.',
    [ErrorSeverity.HIGH]: 'Service unavailable. Limited functionality.',
    [ErrorSeverity.CRITICAL]: 'All services down. Please try again later.'
  },
  [ErrorCategory.TIMEOUT]: {
    [ErrorSeverity.LOW]: 'Request taking longer than usual...',
    [ErrorSeverity.MEDIUM]: 'Request timeout. Retrying...',
    [ErrorSeverity.HIGH]: 'Connection timeout. Please try again.',
    [ErrorSeverity.CRITICAL]: 'Server not responding. Please check connection.'
  },
  [ErrorCategory.AUTHORIZATION]: {
    [ErrorSeverity.LOW]: 'Limited access to this feature.',
    [ErrorSeverity.MEDIUM]: 'Insufficient permissions. Contact administrator.',
    [ErrorSeverity.HIGH]: 'Access denied. Please check your subscription.',
    [ErrorSeverity.CRITICAL]: 'Account suspended. Contact support immediately.'
  },
  [ErrorCategory.UNKNOWN]: {
    [ErrorSeverity.LOW]: 'Minor issue detected.',
    [ErrorSeverity.MEDIUM]: 'Unexpected issue. Please try again.',
    [ErrorSeverity.HIGH]: 'System error. Attempting recovery...',
    [ErrorSeverity.CRITICAL]: 'Critical system error. Please contact support.'
  }
};

// Compliance logging requirements for financial applications
export interface ComplianceLogEntry {
  timestamp: Date;
  errorId: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  errorCategory: ErrorCategory;
  errorSeverity: ErrorSeverity;
  ipAddress?: string;
  userAgent?: string;
  financialImpact?: {
    amount?: number;
    currency?: string;
    affected?: boolean;
  };
  regulatoryContext?: {
    regulation: string;
    requirement: string;
    compliance: boolean;
  };
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    result: string;
    metadata?: Record<string, any>;
  }>;
}