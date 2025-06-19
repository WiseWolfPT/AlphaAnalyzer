// Comprehensive logging system for financial application compliance and debugging
import type { 
  FinancialError, 
  ComplianceLogEntry, 
  ErrorCategory, 
  ErrorSeverity 
} from '@shared/error-types';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export enum LogCategory {
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  PERFORMANCE = 'performance',
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  AUDIT = 'audit',
  API = 'api',
  USER_ACTION = 'user_action',
  CALCULATION = 'calculation',
  DATA_ACCESS = 'data_access'
}

interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  url?: string;
  action?: string;
  resource?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  errorId?: string;
  traceId?: string;
  sensitive?: boolean; // Flag for PII or sensitive financial data
}

interface AuditEvent {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'blocked';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  financialImpact?: {
    amount?: number;
    currency?: string;
    affected?: boolean;
  };
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  endpoint?: string;
  provider?: string;
  cacheHit?: boolean;
  errorCount?: number;
  metadata?: Record<string, any>;
}

class FinancialLogger {
  private logBuffer: LogEntry[] = [];
  private auditBuffer: AuditEvent[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private sessionId: string;
  private userId?: string;
  private flushInterval: NodeJS.Timeout | null = null;
  private bufferSize = 100;
  private flushIntervalMs = 30000; // 30 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeLogger();
    this.setupPeriodicFlush();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeLogger(): void {
    // Set up user context
    this.detectUser();
    
    // Log session start
    this.logInfo(LogCategory.AUDIT, 'Session started', {
      sessionId: this.sessionId,
      userAgent: navigator?.userAgent,
      url: window?.location?.href
    });

    // Set up error listeners
    window.addEventListener('error', (event) => {
      this.logError(LogCategory.TECHNICAL, 'Unhandled JavaScript error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError(LogCategory.TECHNICAL, 'Unhandled promise rejection', {
        reason: event.reason,
        promise: String(event.promise)
      });
    });

    // Set up beforeunload listener for session end
    window.addEventListener('beforeunload', () => {
      this.logInfo(LogCategory.AUDIT, 'Session ending');
      this.flush();
    });
  }

  private detectUser(): void {
    // Try to get user info from local storage or other sources
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.userId = user.id || user.email;
      }
    } catch (error) {
      // Silent fail - user detection is optional
    }
  }

  private setupPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.logInfo(LogCategory.AUDIT, 'User identified', { userId });
  }

  // Core logging methods
  private log(
    level: LogLevel, 
    category: LogCategory, 
    message: string, 
    context: Partial<LogContext> = {},
    sensitive: boolean = false
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      context: {
        userId: this.userId,
        sessionId: this.sessionId,
        requestId: context.requestId || this.generateTraceId(),
        ipAddress: this.getClientIP(),
        userAgent: navigator?.userAgent,
        url: window?.location?.href,
        ...context
      },
      sensitive
    };

    // Add to buffer
    this.logBuffer.push(entry);

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  logTrace(category: LogCategory, message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.TRACE, category, message, context);
  }

  logDebug(category: LogCategory, message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  logInfo(category: LogCategory, message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  logWarn(category: LogCategory, message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  logError(category: LogCategory, message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.ERROR, category, message, context);
  }

  logFatal(category: LogCategory, message: string, context?: Partial<LogContext>): void {
    this.log(LogLevel.FATAL, category, message, context);
  }

  // Specialized logging methods
  logFinancialError(error: FinancialError, context?: Partial<LogContext>): void {
    const logLevel = this.mapErrorSeverityToLogLevel(error.severity);
    const category = this.mapErrorCategoryToLogCategory(error.category);
    
    this.log(logLevel, category, error.message, {
      ...context,
      errorId: error.id,
      errorCategory: error.category,
      errorSeverity: error.severity,
      recoveryStrategy: error.recoveryStrategy,
      retryable: error.retryable
    });

    // Create compliance log entry if required
    if (error.complianceLog) {
      this.logCompliance(error, context);
    }
  }

  logAPICall(
    method: string, 
    endpoint: string, 
    duration: number, 
    success: boolean, 
    context?: Partial<LogContext>
  ): void {
    this.logInfo(LogCategory.API, `API ${method} ${endpoint}`, {
      ...context,
      action: `${method} ${endpoint}`,
      duration,
      outcome: success ? 'success' : 'failure'
    });

    // Add to performance metrics
    this.logPerformance({
      operation: `API_${method}`,
      endpoint,
      duration,
      success,
      timestamp: new Date(),
      metadata: context?.metadata
    });
  }

  logUserAction(
    action: string, 
    resource: string, 
    outcome: 'success' | 'failure' | 'blocked' = 'success',
    context?: Partial<LogContext>
  ): void {
    this.logInfo(LogCategory.USER_ACTION, `User ${action} on ${resource}`, {
      ...context,
      action,
      resource
    });

    // Create audit event
    this.logAudit({
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
      action,
      resource,
      outcome,
      riskLevel: this.assessRiskLevel(action, resource),
      metadata: context?.metadata
    });
  }

  logCalculation(
    calculationType: string,
    inputs: Record<string, any>,
    result: any,
    duration: number,
    success: boolean
  ): void {
    this.logInfo(LogCategory.CALCULATION, `Calculation: ${calculationType}`, {
      action: calculationType,
      duration,
      metadata: {
        inputs: this.sanitizeInputs(inputs),
        success,
        resultType: typeof result
      }
    }, true); // Mark as sensitive due to financial data

    // Performance metric
    this.logPerformance({
      operation: `CALC_${calculationType}`,
      duration,
      success,
      timestamp: new Date(),
      metadata: { inputKeys: Object.keys(inputs) }
    });
  }

  logDataAccess(
    dataType: string,
    symbol?: string,
    cached: boolean = false,
    duration?: number
  ): void {
    this.logInfo(LogCategory.DATA_ACCESS, `Accessed ${dataType} data`, {
      action: `access_${dataType}`,
      resource: symbol || dataType,
      duration,
      metadata: {
        cached,
        dataType,
        symbol
      }
    });
  }

  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: Partial<LogContext>
  ): void {
    const logLevel = severity === 'critical' ? LogLevel.FATAL :
                    severity === 'high' ? LogLevel.ERROR :
                    severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;

    this.log(logLevel, LogCategory.SECURITY, `Security event: ${event}`, {
      ...context,
      securityEvent: event,
      severity
    });

    // Create audit event for security incidents
    this.logAudit({
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
      action: 'security_event',
      resource: event,
      outcome: 'blocked',
      riskLevel: severity,
      metadata: context?.metadata
    });
  }

  // Compliance logging
  private logCompliance(error: FinancialError, context?: Partial<LogContext>): void {
    const complianceEntry: ComplianceLogEntry = {
      timestamp: new Date(),
      errorId: error.id,
      userId: this.userId,
      sessionId: this.sessionId,
      action: context?.action || 'error_occurred',
      resource: context?.resource || 'unknown',
      errorCategory: error.category,
      errorSeverity: error.severity,
      ipAddress: this.getClientIP(),
      userAgent: navigator?.userAgent,
      auditTrail: [{
        timestamp: new Date(),
        action: 'error_logged',
        result: 'logged',
        metadata: {
          errorMessage: error.message,
          context: error.context
        }
      }]
    };

    // Add financial impact if available
    if (error.context?.financialImpact) {
      complianceEntry.financialImpact = error.context.financialImpact;
    }

    // Store compliance log (this would typically go to a secure, immutable store)
    this.storeComplianceLog(complianceEntry);
  }

  // Audit logging
  private logAudit(event: AuditEvent): void {
    this.auditBuffer.push(event);
    
    if (this.auditBuffer.length >= 10) { // Smaller buffer for audit events
      this.flushAuditLogs();
    }
  }

  // Performance logging
  private logPerformance(metric: PerformanceMetric): void {
    this.performanceBuffer.push(metric);
    
    if (this.performanceBuffer.length >= 20) {
      this.flushPerformanceLogs();
    }
  }

  // Helper methods
  private mapErrorSeverityToLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.LOW: return LogLevel.INFO;
      case ErrorSeverity.MEDIUM: return LogLevel.WARN;
      case ErrorSeverity.HIGH: return LogLevel.ERROR;
      case ErrorSeverity.CRITICAL: return LogLevel.FATAL;
      default: return LogLevel.WARN;
    }
  }

  private mapErrorCategoryToLogCategory(category: ErrorCategory): LogCategory {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return LogCategory.SECURITY;
      case ErrorCategory.CALCULATION:
        return LogCategory.CALCULATION;
      case ErrorCategory.API_LIMIT:
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.NETWORK:
        return LogCategory.API;
      case ErrorCategory.DATA_INTEGRITY:
        return LogCategory.DATA_ACCESS;
      default:
        return LogCategory.TECHNICAL;
    }
  }

  private assessRiskLevel(action: string, resource: string): 'low' | 'medium' | 'high' | 'critical' {
    // Risk assessment logic for audit events
    const highRiskActions = ['delete', 'transfer', 'withdraw', 'modify_settings'];
    const mediumRiskActions = ['calculate', 'export', 'download'];
    const criticalResources = ['account', 'portfolio', 'settings'];
    
    if (highRiskActions.includes(action) || criticalResources.includes(resource)) {
      return 'high';
    }
    if (mediumRiskActions.includes(action)) {
      return 'medium';
    }
    return 'low';
  }

  private sanitizeInputs(inputs: Record<string, any>): Record<string, any> {
    // Remove or mask sensitive data from inputs
    const sanitized = { ...inputs };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'ssn', 'account'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private getClientIP(): string {
    // In a real application, this would be obtained from headers or a service
    return 'client';
  }

  private consoleLog(entry: LogEntry): void {
    const levelNames = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelColors = ['gray', 'blue', 'green', 'orange', 'red', 'darkred'];
    
    console.log(
      `%c[${levelNames[entry.level]}] %c${entry.category} %c${entry.message}`,
      `color: ${levelColors[entry.level]}; font-weight: bold`,
      'color: purple; font-weight: bold',
      'color: black',
      entry.context
    );
  }

  // Flush methods
  private flush(): void {
    if (this.logBuffer.length === 0) return;

    // In a real application, this would send logs to a logging service
    this.sendToLoggingService(this.logBuffer);
    this.logBuffer = [];
  }

  private flushAuditLogs(): void {
    if (this.auditBuffer.length === 0) return;

    this.sendToAuditService(this.auditBuffer);
    this.auditBuffer = [];
  }

  private flushPerformanceLogs(): void {
    if (this.performanceBuffer.length === 0) return;

    this.sendToPerformanceService(this.performanceBuffer);
    this.performanceBuffer = [];
  }

  // Service integration methods (would be replaced with actual service calls)
  private async sendToLoggingService(logs: LogEntry[]): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.group('📊 Batch Log Upload');
      console.table(logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: LogLevel[log.level],
        category: log.category,
        message: log.message,
        userId: log.context.userId
      })));
      console.groupEnd();
    }
    
    // TODO: Implement actual logging service integration
    // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(logs) });
  }

  private async sendToAuditService(events: AuditEvent[]): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Audit Events');
      console.table(events);
      console.groupEnd();
    }
    
    // TODO: Implement actual audit service integration
    // await fetch('/api/audit', { method: 'POST', body: JSON.stringify(events) });
  }

  private async sendToPerformanceService(metrics: PerformanceMetric[]): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.group('⚡ Performance Metrics');
      console.table(metrics);
      console.groupEnd();
    }
    
    // TODO: Implement actual performance monitoring integration
    // await fetch('/api/metrics', { method: 'POST', body: JSON.stringify(metrics) });
  }

  private async storeComplianceLog(entry: ComplianceLogEntry): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.group('📋 Compliance Log');
      console.log(entry);
      console.groupEnd();
    }
    
    // TODO: Implement secure compliance logging
    // This would typically use a separate, immutable logging service
    // await fetch('/api/compliance/logs', { method: 'POST', body: JSON.stringify(entry) });
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    this.flush();
    this.flushAuditLogs();
    this.flushPerformanceLogs();
  }
}

// Global logger instance
export const financialLogger = new FinancialLogger();

// Convenience functions
export const logError = (error: FinancialError, context?: Partial<LogContext>) => 
  financialLogger.logFinancialError(error, context);

export const logUserAction = (action: string, resource: string, outcome?: 'success' | 'failure' | 'blocked') =>
  financialLogger.logUserAction(action, resource, outcome);

export const logAPICall = (method: string, endpoint: string, duration: number, success: boolean) =>
  financialLogger.logAPICall(method, endpoint, duration, success);

export const logCalculation = (type: string, inputs: Record<string, any>, result: any, duration: number, success: boolean) =>
  financialLogger.logCalculation(type, inputs, result, duration, success);

export const logDataAccess = (dataType: string, symbol?: string, cached?: boolean, duration?: number) =>
  financialLogger.logDataAccess(dataType, symbol, cached, duration);

export const logSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical') =>
  financialLogger.logSecurityEvent(event, severity);

export default financialLogger;