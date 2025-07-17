/**
 * FASE 2 - DIA 8: Error Tracking and Reporting System
 * Comprehensive error tracking with analysis, reporting, and automated issue detection
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as os from 'os';
import { structuredLogger } from './structured-logger';

// Error classification and tracking interfaces
export interface TrackedError {
  id: string;
  fingerprint: string;
  message: string;
  stack?: string;
  name: string;
  type: 'javascript' | 'http' | 'database' | 'api' | 'validation' | 'authentication' | 'authorization' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  firstSeen: Date;
  lastSeen: Date;
  count: number;
  affectedUsers: Set<string>;
  contexts: ErrorContext[];
  tags: string[];
  metadata: Record<string, any>;
  resolution?: {
    resolvedAt: Date;
    resolvedBy: string;
    resolution: string;
    preventionMeasures?: string[];
  };
}

export interface ErrorContext {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  environment: {
    nodeVersion: string;
    platform: string;
    hostname: string;
    memory: NodeJS.MemoryUsage;
    uptime: number;
  };
  breadcrumbs: Breadcrumb[];
  customData: Record<string, any>;
}

export interface Breadcrumb {
  timestamp: Date;
  type: 'navigation' | 'http' | 'user' | 'console' | 'custom';
  category: string;
  message: string;
  data?: Record<string, any>;
  level: 'debug' | 'info' | 'warning' | 'error';
}

export interface ErrorReport {
  summary: {
    totalErrors: number;
    newErrors: number;
    criticalErrors: number;
    affectedUsers: number;
    errorRate: number;
    topErrors: Array<{
      fingerprint: string;
      message: string;
      count: number;
      severity: string;
    }>;
  };
  trends: {
    timeRange: { start: Date; end: Date };
    errorsByHour: Array<{ hour: number; count: number }>;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  };
  insights: {
    frequentPatterns: string[];
    correlatedErrors: Array<{ errors: string[]; correlation: number }>;
    recommendations: string[];
  };
}

export interface ErrorTrackerConfig {
  enableAutoCapture: boolean;
  enableBreadcrumbs: boolean;
  maxBreadcrumbs: number;
  maxErrorContexts: number;
  retentionDays: number;
  severityRules: Array<{
    pattern: RegExp;
    severity: TrackedError['severity'];
    type?: TrackedError['type'];
  }>;
  ignoredErrors: RegExp[];
  notifications: {
    enableSlack: boolean;
    enableEmail: boolean;
    enableWebhook: boolean;
    criticalErrorThreshold: number;
    errorRateThreshold: number;
  };
  sampling: {
    enabled: boolean;
    rate: number; // 0-1, percentage of errors to track
  };
}

class ErrorTracker extends EventEmitter {
  private errors: Map<string, TrackedError> = new Map();
  private breadcrumbs: Breadcrumb[] = [];
  private config: ErrorTrackerConfig;
  private errorCounts: Map<string, number> = new Map(); // For rate calculation
  private requestCounts: Map<string, number> = new Map(); // For rate calculation
  private isCapturing = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: Partial<ErrorTrackerConfig>) {
    super();
    
    this.config = {
      enableAutoCapture: true,
      enableBreadcrumbs: true,
      maxBreadcrumbs: 100,
      maxErrorContexts: 50,
      retentionDays: 30,
      severityRules: [
        // Critical system errors
        { pattern: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/, severity: 'critical', type: 'api' },
        { pattern: /database|sql|sqlite/i, severity: 'high', type: 'database' },
        { pattern: /authentication|unauthorized/i, severity: 'high', type: 'authentication' },
        { pattern: /validation|invalid|required/i, severity: 'medium', type: 'validation' },
        { pattern: /permission|forbidden/i, severity: 'medium', type: 'authorization' },
        // HTTP errors
        { pattern: /5\d\d/, severity: 'high', type: 'http' },
        { pattern: /4\d\d/, severity: 'medium', type: 'http' },
        // Default patterns
        { pattern: /.*/, severity: 'medium', type: 'javascript' }
      ],
      ignoredErrors: [
        /favicon\.ico/,
        /robots\.txt/,
        /\.map$/
      ],
      notifications: {
        enableSlack: false,
        enableEmail: false,
        enableWebhook: false,
        criticalErrorThreshold: 5,
        errorRateThreshold: 10 // 10% error rate
      },
      sampling: {
        enabled: false,
        rate: 1.0 // Track all errors by default
      },
      ...config
    };

    if (this.config.enableAutoCapture) {
      this.setupAutoCapture();
    }

    this.setupCleanup();
  }

  /**
   * Start error tracking
   */
  start(): void {
    if (this.isCapturing) {
      console.warn('🐛 [ErrorTracker] Already capturing errors');
      return;
    }

    this.isCapturing = true;
    console.log('🐛 [ErrorTracker] Started error tracking');
    this.emit('tracker_started');
  }

  /**
   * Stop error tracking
   */
  stop(): void {
    if (!this.isCapturing) return;

    this.isCapturing = false;
    this.removeAutoCapture();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    console.log('🐛 [ErrorTracker] Stopped error tracking');
    this.emit('tracker_stopped');
  }

  /**
   * Track an error manually
   */
  trackError(
    error: Error | string,
    context?: Partial<ErrorContext>,
    customData?: Record<string, any>
  ): string | null {
    if (!this.isCapturing) return null;
    
    // Check sampling
    if (this.config.sampling.enabled && Math.random() > this.config.sampling.rate) {
      return null;
    }

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Check if error should be ignored
    if (this.shouldIgnoreError(errorObj)) {
      return null;
    }

    const fingerprint = this.generateFingerprint(errorObj);
    const errorId = this.getOrCreateError(errorObj, fingerprint);
    
    // Add context to existing error
    this.addErrorContext(errorId, context, customData);
    
    // Log the error
    structuredLogger.error(
      `Error tracked: ${errorObj.message}`,
      errorObj,
      { 
        errorId,
        fingerprint,
        ...customData 
      },
      context
    );

    this.emit('error_tracked', { errorId, error: errorObj, context });
    
    // Check for alerts
    this.checkErrorAlerts(errorId);
    
    return errorId;
  }

  /**
   * Add a breadcrumb for context
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.config.enableBreadcrumbs) return;

    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: new Date()
    };

    this.breadcrumbs.push(fullBreadcrumb);
    
    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }

    this.emit('breadcrumb_added', fullBreadcrumb);
  }

  /**
   * Track HTTP request for error rate calculation
   */
  trackRequest(path: string, statusCode: number): void {
    const key = `${new Date().getHours()}:${path}`;
    
    // Track total requests
    const requestCount = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, requestCount + 1);
    
    // Track errors (5xx status codes)
    if (statusCode >= 500) {
      const errorCount = this.errorCounts.get(key) || 0;
      this.errorCounts.set(key, errorCount + 1);
    }
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): TrackedError | null {
    return this.errors.get(errorId) || null;
  }

  /**
   * Get errors with filtering
   */
  getErrors(filters?: {
    severity?: TrackedError['severity'];
    type?: TrackedError['type'];
    status?: TrackedError['status'];
    since?: Date;
    limit?: number;
  }): TrackedError[] {
    let errors = Array.from(this.errors.values());

    if (filters) {
      if (filters.severity) {
        errors = errors.filter(e => e.severity === filters.severity);
      }
      if (filters.type) {
        errors = errors.filter(e => e.type === filters.type);
      }
      if (filters.status) {
        errors = errors.filter(e => e.status === filters.status);
      }
      if (filters.since) {
        errors = errors.filter(e => e.lastSeen >= filters.since!);
      }
      if (filters.limit) {
        errors = errors.slice(0, filters.limit);
      }
    }

    return errors.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  /**
   * Update error status
   */
  updateErrorStatus(
    errorId: string, 
    status: TrackedError['status'], 
    resolution?: TrackedError['resolution']
  ): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.status = status;
    if (resolution) {
      error.resolution = resolution;
    }

    structuredLogger.info(`Error status updated: ${errorId}`, {
      errorId,
      status,
      resolution
    });

    this.emit('error_updated', { errorId, status, resolution });
    return true;
  }

  /**
   * Generate error report
   */
  generateReport(timeRange?: { start: Date; end: Date }): ErrorReport {
    const now = new Date();
    const range = timeRange || {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: now
    };

    const relevantErrors = this.getErrors({ since: range.start });
    
    // Summary statistics
    const summary = {
      totalErrors: relevantErrors.length,
      newErrors: relevantErrors.filter(e => e.status === 'new').length,
      criticalErrors: relevantErrors.filter(e => e.severity === 'critical').length,
      affectedUsers: new Set(relevantErrors.flatMap(e => Array.from(e.affectedUsers))).size,
      errorRate: this.calculateErrorRate(),
      topErrors: relevantErrors
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(e => ({
          fingerprint: e.fingerprint,
          message: e.message,
          count: e.count,
          severity: e.severity
        }))
    };

    // Trend analysis
    const trends = {
      timeRange: range,
      errorsByHour: this.getErrorsByHour(relevantErrors, range),
      errorsByType: this.groupBy(relevantErrors, 'type'),
      errorsBySeverity: this.groupBy(relevantErrors, 'severity')
    };

    // Insights and patterns
    const insights = {
      frequentPatterns: this.findFrequentPatterns(relevantErrors),
      correlatedErrors: this.findCorrelatedErrors(relevantErrors),
      recommendations: this.generateRecommendations(relevantErrors)
    };

    return { summary, trends, insights };
  }

  /**
   * Export error data
   */
  exportData(): {
    errors: TrackedError[];
    breadcrumbs: Breadcrumb[];
    config: ErrorTrackerConfig;
    exportTimestamp: Date;
  } {
    return {
      errors: Array.from(this.errors.values()),
      breadcrumbs: this.breadcrumbs,
      config: this.config,
      exportTimestamp: new Date()
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Setup automatic error capture
   */
  private setupAutoCapture(): void {
    // Capture uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.trackError(error, {
        customData: { source: 'uncaughtException' }
      });
    });

    // Capture unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.trackError(error, {
        customData: { 
          source: 'unhandledRejection',
          promise: String(promise)
        }
      });
    });

    // Capture console errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      // Call original first
      originalConsoleError.apply(console, args);
      
      // Track error if it's an Error object
      const errorArg = args.find(arg => arg instanceof Error);
      if (errorArg) {
        this.trackError(errorArg, {
          customData: { 
            source: 'console.error',
            args: args.map(arg => String(arg))
          }
        });
      }
    };
  }

  /**
   * Remove automatic error capture
   */
  private removeAutoCapture(): void {
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    // Note: console.error override is not removed to avoid issues
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(error: Error): boolean {
    return this.config.ignoredErrors.some(pattern => 
      pattern.test(error.message) || (error.stack && pattern.test(error.stack))
    );
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error): string {
    // Create a consistent fingerprint based on error type and location
    const stack = error.stack || '';
    const message = error.message || '';
    const name = error.name || 'Error';
    
    // Extract relevant parts of stack trace (remove line numbers)
    const stackLines = stack.split('\n').slice(1, 4); // Take first 3 stack frames
    const normalizedStack = stackLines
      .map(line => line.replace(/:\d+:\d+/g, '')) // Remove line/column numbers
      .join('\n');
    
    const fingerprint = `${name}:${message}:${normalizedStack}`;
    return crypto.createHash('md5').update(fingerprint).digest('hex');
  }

  /**
   * Get or create error entry
   */
  private getOrCreateError(error: Error, fingerprint: string): string {
    const existing = Array.from(this.errors.values())
      .find(e => e.fingerprint === fingerprint);

    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
      return existing.id;
    }

    // Create new error entry
    const errorId = crypto.randomUUID();
    const { severity, type } = this.classifyError(error);
    
    const trackedError: TrackedError = {
      id: errorId,
      fingerprint,
      message: error.message,
      stack: error.stack,
      name: error.name,
      type,
      severity,
      status: 'new',
      firstSeen: new Date(),
      lastSeen: new Date(),
      count: 1,
      affectedUsers: new Set(),
      contexts: [],
      tags: [],
      metadata: {}
    };

    this.errors.set(errorId, trackedError);
    return errorId;
  }

  /**
   * Classify error severity and type
   */
  private classifyError(error: Error): { severity: TrackedError['severity']; type: TrackedError['type'] } {
    const message = error.message.toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    const combined = `${message} ${stack}`;

    for (const rule of this.config.severityRules) {
      if (rule.pattern.test(combined)) {
        return {
          severity: rule.severity,
          type: rule.type || 'javascript'
        };
      }
    }

    return { severity: 'medium', type: 'javascript' };
  }

  /**
   * Add context to an error
   */
  private addErrorContext(
    errorId: string,
    context?: Partial<ErrorContext>,
    customData?: Record<string, any>
  ): void {
    const error = this.errors.get(errorId);
    if (!error) return;

    const fullContext: ErrorContext = {
      timestamp: new Date(),
      userId: context?.userId,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      url: context?.url,
      method: context?.method,
      userAgent: context?.userAgent,
      ip: context?.ip,
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        hostname: os.hostname(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      breadcrumbs: [...this.breadcrumbs],
      customData: customData || {}
    };

    error.contexts.push(fullContext);
    
    // Track affected user
    if (context?.userId) {
      error.affectedUsers.add(context.userId);
    }

    // Keep only recent contexts
    if (error.contexts.length > this.config.maxErrorContexts) {
      error.contexts = error.contexts.slice(-this.config.maxErrorContexts);
    }
  }

  /**
   * Check for error-based alerts
   */
  private checkErrorAlerts(errorId: string): void {
    const error = this.errors.get(errorId);
    if (!error) return;

    // Critical error threshold
    if (error.severity === 'critical' && 
        error.count >= this.config.notifications.criticalErrorThreshold) {
      this.emit('critical_error_threshold', error);
    }

    // Error rate threshold
    const errorRate = this.calculateErrorRate();
    if (errorRate > this.config.notifications.errorRateThreshold) {
      this.emit('error_rate_threshold', { errorRate, threshold: this.config.notifications.errorRateThreshold });
    }
  }

  /**
   * Calculate current error rate
   */
  private calculateErrorRate(): number {
    const now = new Date();
    const currentHour = now.getHours();
    
    let totalRequests = 0;
    let totalErrors = 0;
    
    for (const [key, requests] of this.requestCounts.entries()) {
      const [hour] = key.split(':');
      if (parseInt(hour) === currentHour) {
        totalRequests += requests;
        totalErrors += this.errorCounts.get(key) || 0;
      }
    }
    
    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  /**
   * Get errors grouped by hour
   */
  private getErrorsByHour(
    errors: TrackedError[], 
    range: { start: Date; end: Date }
  ): Array<{ hour: number; count: number }> {
    const hourCounts: Record<number, number> = {};
    
    for (const error of errors) {
      for (const context of error.contexts) {
        if (context.timestamp >= range.start && context.timestamp <= range.end) {
          const hour = context.timestamp.getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      }
    }
    
    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour);
  }

  /**
   * Group errors by a property
   */
  private groupBy(errors: TrackedError[], property: keyof TrackedError): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const error of errors) {
      const value = String(error[property]);
      groups[value] = (groups[value] || 0) + error.count;
    }
    
    return groups;
  }

  /**
   * Find frequent error patterns
   */
  private findFrequentPatterns(errors: TrackedError[]): string[] {
    const patterns: Record<string, number> = {};
    
    for (const error of errors) {
      // Extract patterns from error messages
      const words = error.message.toLowerCase().split(/\s+/);
      const significantWords = words.filter(word => 
        word.length > 3 && !['error', 'failed', 'cannot', 'unable'].includes(word)
      );
      
      for (const word of significantWords) {
        patterns[word] = (patterns[word] || 0) + error.count;
      }
    }
    
    return Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern]) => pattern);
  }

  /**
   * Find correlated errors
   */
  private findCorrelatedErrors(errors: TrackedError[]): Array<{ errors: string[]; correlation: number }> {
    // Simplified correlation based on timing
    const correlations: Array<{ errors: string[]; correlation: number }> = [];
    
    // This is a basic implementation - could be enhanced with more sophisticated analysis
    for (let i = 0; i < errors.length; i++) {
      for (let j = i + 1; j < errors.length; j++) {
        const error1 = errors[i];
        const error2 = errors[j];
        
        // Check if errors occur within similar timeframes
        const timeDiff = Math.abs(error1.lastSeen.getTime() - error2.lastSeen.getTime());
        if (timeDiff < 60000) { // Within 1 minute
          correlations.push({
            errors: [error1.message, error2.message],
            correlation: 1 - (timeDiff / 60000)
          });
        }
      }
    }
    
    return correlations
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, 5);
  }

  /**
   * Generate recommendations based on error patterns
   */
  private generateRecommendations(errors: TrackedError[]): string[] {
    const recommendations: string[] = [];
    
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push(`Address ${criticalErrors.length} critical errors immediately`);
    }
    
    const dbErrors = errors.filter(e => e.type === 'database');
    if (dbErrors.length > 5) {
      recommendations.push('Review database connection handling and query optimization');
    }
    
    const apiErrors = errors.filter(e => e.type === 'api');
    if (apiErrors.length > 10) {
      recommendations.push('Implement API retry logic and circuit breaker patterns');
    }
    
    const highFrequencyErrors = errors.filter(e => e.count > 10);
    if (highFrequencyErrors.length > 0) {
      recommendations.push('Focus on fixing high-frequency errors for maximum impact');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Error patterns look normal - continue monitoring');
    }
    
    return recommendations;
  }

  /**
   * Setup cleanup schedule
   */
  private setupCleanup(): void {
    // Run cleanup every 6 hours
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    // Clean old errors
    for (const [id, error] of this.errors.entries()) {
      if (error.lastSeen < cutoff && error.status === 'resolved') {
        this.errors.delete(id);
        cleanedCount++;
      }
    }

    // Clean old breadcrumbs
    this.breadcrumbs = this.breadcrumbs.filter(b => b.timestamp >= cutoff);

    // Clean old request/error counts
    const currentTime = new Date();
    for (const [key] of this.requestCounts.entries()) {
      const [hourStr] = key.split(':');
      const hour = parseInt(hourStr);
      const hoursDiff = currentTime.getHours() - hour;
      
      if (Math.abs(hoursDiff) > 24) { // Keep last 24 hours
        this.requestCounts.delete(key);
        this.errorCounts.delete(key);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🐛 [ErrorTracker] Cleaned up ${cleanedCount} old errors`);
      this.emit('data_cleaned', { cleanedCount, cutoff });
    }
  }
}

// Create and export singleton instance
export const errorTracker = new ErrorTracker({
  enableAutoCapture: process.env.NODE_ENV !== 'test',
  retentionDays: parseInt(process.env.ERROR_RETENTION_DAYS || '30'),
  sampling: {
    enabled: process.env.ERROR_SAMPLING === 'true',
    rate: parseFloat(process.env.ERROR_SAMPLING_RATE || '1.0')
  }
});

export { ErrorTracker };
export default errorTracker;