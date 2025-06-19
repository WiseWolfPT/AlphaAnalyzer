# TypeScript Error Monitoring Patterns for Production Financial Apps

## Table of Contents
1. [Sentry Integration Patterns](#sentry-integration-patterns)
2. [API Error Logging Strategies](#api-error-logging-strategies)
3. [Performance Monitoring Setup](#performance-monitoring-setup)
4. [Custom Error Classes](#custom-error-classes)
5. [TypeScript Error Handling](#typescript-error-handling)

## 1. Sentry Integration Patterns

### Node.js Server-Side Integration

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    integrations: [
      // Express.js integration
      Sentry.expressIntegration(),
      // Prisma integration for database monitoring
      Sentry.prismaIntegration(),
      // Profiling integration for performance insights
      nodeProfilingIntegration(),
      // HTTP integration for API monitoring
      Sentry.httpIntegration({
        tracing: {
          ignoreOutgoingRequests: (url, options) => {
            // Ignore health check requests
            return url.includes('/health') || url.includes('/metrics');
          }
        }
      })
    ],
    beforeSend(event) {
      // Filter out sensitive data
      if (event.extra) {
        delete event.extra.password;
        delete event.extra.token;
        delete event.extra.apiKey;
      }
      return event;
    }
  });
}

// Express.js setup
export function setupExpressErrorHandler(app: Express) {
  // Add routes first
  app.use('/api', routes);
  
  // Sentry error handler must be before other error handlers
  Sentry.setupExpressErrorHandler(app);
  
  // Custom error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      statusCode: '50001'
    });
  });
}
```

### Client-Side Integration (React/Next.js)

```typescript
// src/lib/sentry-client.ts
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function initClientSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true
      })
    ],
    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      return event;
    }
  });
}

// Error Boundary Component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please try again.</div>;
    }
    return this.props.children;
  }
}
```

### Context and Tag Management

```typescript
// src/lib/sentry-context.ts
import * as Sentry from '@sentry/node';

interface UserContext {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
}

interface TransactionContext {
  transactionId: string;
  amount: number;
  currency: string;
  type: string;
}

export class SentryContextManager {
  static setUserContext(user: UserContext) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    Sentry.setTag('user.role', user.role);
    if (user.organizationId) {
      Sentry.setTag('organization.id', user.organizationId);
    }
  }

  static setTransactionContext(transaction: TransactionContext) {
    Sentry.setContext('transaction', {
      id: transaction.transactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type
    });
    
    Sentry.setTag('transaction.type', transaction.type);
    Sentry.setTag('transaction.currency', transaction.currency);
  }

  static addBreadcrumb(message: string, category: string, data?: any) {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data,
      timestamp: Date.now() / 1000
    });
  }

  static captureFinancialError(error: Error, context: {
    operation: string;
    userId?: string;
    transactionId?: string;
    amount?: number;
  }) {
    Sentry.withScope(scope => {
      scope.setTag('error.financial', true);
      scope.setTag('operation', context.operation);
      scope.setContext('financial_operation', context);
      
      if (context.userId) {
        scope.setTag('user.id', context.userId);
      }
      
      Sentry.captureException(error);
    });
  }
}
```

## 2. API Error Logging Strategies

### Express.js Middleware for API Error Logging

```typescript
// src/middleware/error-logging.ts
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';

export interface ApiError extends Error {
  statusCode: number;
  errorCode: string;
  details?: any;
  isOperational?: boolean;
}

export class ApiErrorLogger {
  static logRequest(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    req.requestId = requestId;
    
    // Log request details
    const startTime = Date.now();
    
    Sentry.addBreadcrumb({
      message: `API Request: ${req.method} ${req.path}`,
      category: 'api.request',
      data: {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id
      }
    });

    // Log response
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      Sentry.addBreadcrumb({
        message: `API Response: ${res.statusCode}`,
        category: 'api.response',
        data: {
          requestId,
          statusCode: res.statusCode,
          duration,
          responseSize: data ? data.length : 0
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  }

  static logError(error: ApiError, req: Request, res: Response, next: NextFunction) {
    const errorId = uuidv4();
    
    // Enhanced error context
    Sentry.withScope(scope => {
      scope.setTag('error.type', 'api');
      scope.setTag('error.code', error.errorCode);
      scope.setTag('error.operational', error.isOperational || false);
      scope.setTag('request.id', req.requestId);
      
      scope.setContext('request', {
        id: req.requestId,
        method: req.method,
        url: req.url,
        headers: this.sanitizeHeaders(req.headers),
        body: this.sanitizeBody(req.body),
        params: req.params,
        query: req.query
      });
      
      scope.setContext('response', {
        statusCode: error.statusCode,
        errorCode: error.errorCode
      });
      
      scope.setLevel('error');
      Sentry.captureException(error);
    });
    
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${errorId}] API Error:`, {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        requestId: req.requestId
      });
    }
    
    // Send error response
    res.status(error.statusCode || 500).json({
      error: {
        id: errorId,
        message: error.isOperational ? error.message : 'Internal server error',
        code: error.errorCode || 'INTERNAL_ERROR',
        statusCode: error.statusCode || 500
      }
    });
  }

  private static sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }

  private static sanitizeBody(body: any): any {
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.apiKey;
    delete sanitized.secret;
    return sanitized;
  }
}
```

### Database Error Logging

```typescript
// src/lib/database-error-logger.ts
import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';

export class DatabaseErrorLogger {
  static async logDatabaseOperation<T>(
    operation: string,
    query: () => Promise<T>,
    context?: {
      table?: string;
      userId?: string;
      transactionId?: string;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      Sentry.addBreadcrumb({
        message: `Database operation: ${operation}`,
        category: 'db.query',
        data: {
          operation,
          table: context?.table,
          userId: context?.userId,
          transactionId: context?.transactionId
        }
      });
      
      const result = await query();
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        Sentry.addBreadcrumb({
          message: `Slow database query: ${operation}`,
          category: 'db.slow_query',
          level: 'warning',
          data: {
            operation,
            duration,
            table: context?.table
          }
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Sentry.withScope(scope => {
        scope.setTag('error.type', 'database');
        scope.setTag('db.operation', operation);
        scope.setTag('db.table', context?.table || 'unknown');
        
        scope.setContext('database', {
          operation,
          duration,
          table: context?.table,
          userId: context?.userId,
          transactionId: context?.transactionId
        });
        
        scope.setLevel('error');
        Sentry.captureException(error);
      });
      
      throw error;
    }
  }
}

// Usage with Prisma
export class PrismaErrorLogger {
  constructor(private prisma: PrismaClient) {}
  
  async createUser(userData: any) {
    return DatabaseErrorLogger.logDatabaseOperation(
      'createUser',
      () => this.prisma.user.create({ data: userData }),
      { table: 'user' }
    );
  }
  
  async createTransaction(transactionData: any, userId: string) {
    return DatabaseErrorLogger.logDatabaseOperation(
      'createTransaction',
      () => this.prisma.transaction.create({ data: transactionData }),
      { 
        table: 'transaction',
        userId,
        transactionId: transactionData.id
      }
    );
  }
}
```

## 3. Performance Monitoring Setup

### Application Performance Monitoring

```typescript
// src/lib/performance-monitor.ts
import * as Sentry from '@sentry/node';

export class PerformanceMonitor {
  static startTransaction(name: string, op: string, data?: any) {
    const transaction = Sentry.startTransaction({
      name,
      op,
      data
    });
    
    Sentry.getCurrentHub().configureScope(scope => {
      scope.setSpan(transaction);
    });
    
    return transaction;
  }
  
  static async measureAsync<T>(
    spanName: string,
    operation: () => Promise<T>,
    options?: {
      op?: string;
      data?: any;
      tags?: Record<string, string>;
    }
  ): Promise<T> {
    return Sentry.startSpan(
      {
        name: spanName,
        op: options?.op || 'function',
        data: options?.data,
        tags: options?.tags
      },
      async () => {
        const startTime = Date.now();
        try {
          const result = await operation();
          const duration = Date.now() - startTime;
          
          // Log slow operations
          if (duration > 5000) {
            Sentry.addBreadcrumb({
              message: `Slow operation: ${spanName}`,
              category: 'performance',
              level: 'warning',
              data: { duration, operation: spanName }
            });
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          Sentry.setTag('performance.error', true);
          Sentry.setContext('performance', {
            operation: spanName,
            duration,
            error: error.message
          });
          throw error;
        }
      }
    );
  }
  
  static measureSync<T>(
    spanName: string,
    operation: () => T,
    options?: {
      op?: string;
      data?: any;
      tags?: Record<string, string>;
    }
  ): T {
    return Sentry.startSpan(
      {
        name: spanName,
        op: options?.op || 'function',
        data: options?.data,
        tags: options?.tags
      },
      () => {
        const startTime = Date.now();
        try {
          const result = operation();
          const duration = Date.now() - startTime;
          
          if (duration > 1000) {
            Sentry.addBreadcrumb({
              message: `Slow sync operation: ${spanName}`,
              category: 'performance',
              level: 'warning',
              data: { duration, operation: spanName }
            });
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          Sentry.setTag('performance.error', true);
          Sentry.setContext('performance', {
            operation: spanName,
            duration,
            error: error.message
          });
          throw error;
        }
      }
    );
  }
}

// Decorator for method performance monitoring
export function MonitorPerformance(spanName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const actualSpanName = spanName || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = function (...args: any[]) {
      if (originalMethod.constructor.name === 'AsyncFunction') {
        return PerformanceMonitor.measureAsync(
          actualSpanName,
          () => originalMethod.apply(this, args),
          {
            op: 'method',
            data: { className: target.constructor.name, methodName: propertyKey }
          }
        );
      } else {
        return PerformanceMonitor.measureSync(
          actualSpanName,
          () => originalMethod.apply(this, args),
          {
            op: 'method',
            data: { className: target.constructor.name, methodName: propertyKey }
          }
        );
      }
    };
    
    return descriptor;
  };
}
```

### Cron Job Monitoring

```typescript
// src/lib/cron-monitor.ts
import * as Sentry from '@sentry/node';

export class CronMonitor {
  static async withMonitor<T>(
    monitorSlug: string,
    job: () => Promise<T>,
    config?: {
      schedule?: {
        type: 'crontab' | 'interval';
        value: string;
      };
      checkinMargin?: number;
      maxRuntime?: number;
      timezone?: string;
    }
  ): Promise<T> {
    const checkInId = Sentry.captureCheckIn({
      monitorSlug,
      status: 'in_progress',
      ...config
    });
    
    const startTime = Date.now();
    
    try {
      const result = await job();
      const duration = Date.now() - startTime;
      
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug,
        status: 'ok',
        duration: duration / 1000 // Convert to seconds
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug,
        status: 'error',
        duration: duration / 1000
      });
      
      // Also capture the exception
      Sentry.withScope(scope => {
        scope.setTag('cron.job', monitorSlug);
        scope.setContext('cron', {
          monitorSlug,
          duration: duration / 1000,
          error: error.message
        });
        Sentry.captureException(error);
      });
      
      throw error;
    }
  }
}

// Usage example
export class FinancialCronJobs {
  @MonitorPerformance('reconciliation-job')
  static async runReconciliation() {
    return CronMonitor.withMonitor(
      'daily-reconciliation',
      async () => {
        // Reconciliation logic here
        console.log('Running daily reconciliation...');
      },
      {
        schedule: {
          type: 'crontab',
          value: '0 2 * * *' // Daily at 2 AM
        },
        checkinMargin: 5,
        maxRuntime: 30,
        timezone: 'UTC'
      }
    );
  }
}
```

## 4. Custom Error Classes

### Base Error Classes

```typescript
// src/lib/errors/base-error.ts
export abstract class BaseError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  abstract readonly isOperational: boolean;
  
  constructor(
    message: string,
    public readonly details?: any,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      stack: this.stack
    };
  }
}

// Authentication Errors
export class AuthenticationError extends BaseError {
  readonly statusCode = 401;
  readonly errorCode = 'AUTH_FAILED';
  readonly isOperational = true;
  
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, details);
  }
}

export class AuthorizationError extends BaseError {
  readonly statusCode = 403;
  readonly errorCode = 'AUTH_INSUFFICIENT_PERMISSIONS';
  readonly isOperational = true;
  
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, details);
  }
}

// Validation Errors
export class ValidationError extends BaseError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_FAILED';
  readonly isOperational = true;
  
  constructor(message: string, public readonly fields?: Record<string, string[]>) {
    super(message, { fields });
  }
}

// Business Logic Errors
export class BusinessLogicError extends BaseError {
  readonly statusCode = 422;
  readonly errorCode = 'BUSINESS_LOGIC_ERROR';
  readonly isOperational = true;
  
  constructor(message: string, details?: any) {
    super(message, details);
  }
}

// Resource Errors
export class NotFoundError extends BaseError {
  readonly statusCode = 404;
  readonly errorCode = 'RESOURCE_NOT_FOUND';
  readonly isOperational = true;
  
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, details);
  }
}

export class ConflictError extends BaseError {
  readonly statusCode = 409;
  readonly errorCode = 'RESOURCE_CONFLICT';
  readonly isOperational = true;
  
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, details);
  }
}

// External Service Errors
export class ExternalServiceError extends BaseError {
  readonly statusCode = 502;
  readonly errorCode = 'EXTERNAL_SERVICE_ERROR';
  readonly isOperational = true;
  
  constructor(
    message: string,
    public readonly service: string,
    public readonly serviceStatusCode?: number,
    details?: any
  ) {
    super(message, { service, serviceStatusCode, ...details });
  }
}

// Rate Limiting Errors
export class RateLimitError extends BaseError {
  readonly statusCode = 429;
  readonly errorCode = 'RATE_LIMIT_EXCEEDED';
  readonly isOperational = true;
  
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    details?: any
  ) {
    super(message, { retryAfter, ...details });
  }
}

// System Errors
export class SystemError extends BaseError {
  readonly statusCode = 500;
  readonly errorCode = 'SYSTEM_ERROR';
  readonly isOperational = false;
  
  constructor(message: string = 'System error', details?: any, cause?: Error) {
    super(message, details, cause);
  }
}
```

### Financial Domain-Specific Errors

```typescript
// src/lib/errors/financial-errors.ts
import { BaseError } from './base-error';

export class InsufficientFundsError extends BaseError {
  readonly statusCode = 422;
  readonly errorCode = 'INSUFFICIENT_FUNDS';
  readonly isOperational = true;
  
  constructor(
    public readonly availableBalance: number,
    public readonly requestedAmount: number,
    public readonly currency: string,
    public readonly accountId: string
  ) {
    super(`Insufficient funds. Available: ${availableBalance} ${currency}, Requested: ${requestedAmount} ${currency}`, {
      availableBalance,
      requestedAmount,
      currency,
      accountId
    });
  }
}

export class InvalidTransactionError extends BaseError {
  readonly statusCode = 422;
  readonly errorCode = 'INVALID_TRANSACTION';
  readonly isOperational = true;
  
  constructor(
    message: string,
    public readonly transactionId?: string,
    public readonly violations?: string[]
  ) {
    super(message, { transactionId, violations });
  }
}

export class TransactionLimitExceededError extends BaseError {
  readonly statusCode = 422;
  readonly errorCode = 'TRANSACTION_LIMIT_EXCEEDED';
  readonly isOperational = true;
  
  constructor(
    public readonly limitType: 'daily' | 'monthly' | 'single',
    public readonly limit: number,
    public readonly current: number,
    public readonly currency: string
  ) {
    super(`${limitType} transaction limit exceeded. Limit: ${limit} ${currency}, Current: ${current} ${currency}`, {
      limitType,
      limit,
      current,
      currency
    });
  }
}

export class AccountFrozenError extends BaseError {
  readonly statusCode = 423;
  readonly errorCode = 'ACCOUNT_FROZEN';
  readonly isOperational = true;
  
  constructor(
    public readonly accountId: string,
    public readonly reason: string,
    public readonly frozenAt: Date
  ) {
    super(`Account ${accountId} is frozen: ${reason}`, {
      accountId,
      reason,
      frozenAt
    });
  }
}

export class ComplianceError extends BaseError {
  readonly statusCode = 422;
  readonly errorCode = 'COMPLIANCE_VIOLATION';
  readonly isOperational = true;
  
  constructor(
    message: string,
    public readonly ruleType: string,
    public readonly ruleId: string,
    details?: any
  ) {
    super(message, { ruleType, ruleId, ...details });
  }
}

export class PaymentProcessingError extends BaseError {
  readonly statusCode = 502;
  readonly errorCode = 'PAYMENT_PROCESSING_ERROR';
  readonly isOperational = true;
  
  constructor(
    message: string,
    public readonly paymentProvider: string,
    public readonly providerErrorCode?: string,
    public readonly transactionId?: string
  ) {
    super(message, { paymentProvider, providerErrorCode, transactionId });
  }
}
```

## 5. TypeScript Error Handling

### Result Pattern for Error Handling

```typescript
// src/lib/result.ts
export type Result<T, E = Error> = Success<T> | Failure<E>;

export class Success<T> {
  constructor(public readonly value: T) {}
  
  isSuccess(): this is Success<T> {
    return true;
  }
  
  isFailure(): this is never {
    return false;
  }
  
  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Success(fn(this.value));
  }
  
  mapError<F>(fn: (error: never) => F): Result<T, F> {
    return this as any;
  }
  
  flatMap<U, F>(fn: (value: T) => Result<U, F>): Result<U, F> {
    return fn(this.value);
  }
  
  getOrElse(defaultValue: T): T {
    return this.value;
  }
  
  getOrThrow(): T {
    return this.value;
  }
}

export class Failure<E> {
  constructor(public readonly error: E) {}
  
  isSuccess(): this is never {
    return false;
  }
  
  isFailure(): this is Failure<E> {
    return true;
  }
  
  map<U>(fn: (value: never) => U): Result<U, E> {
    return this as any;
  }
  
  mapError<F>(fn: (error: E) => F): Result<never, F> {
    return new Failure(fn(this.error));
  }
  
  flatMap<U, F>(fn: (value: never) => Result<U, F>): Result<U, E | F> {
    return this as any;
  }
  
  getOrElse<T>(defaultValue: T): T {
    return defaultValue;
  }
  
  getOrThrow(): never {
    throw this.error;
  }
}

export const Result = {
  success: <T>(value: T): Result<T, never> => new Success(value),
  failure: <E>(error: E): Result<never, E> => new Failure(error),
  
  try: <T>(fn: () => T): Result<T, Error> => {
    try {
      return Result.success(fn());
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  },
  
  tryAsync: async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
    try {
      const value = await fn();
      return Result.success(value);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
};
```

### Service Layer Error Handling

```typescript
// src/services/financial-service.ts
import { Result } from '../lib/result';
import { 
  InsufficientFundsError, 
  InvalidTransactionError,
  AccountFrozenError,
  ValidationError 
} from '../lib/errors/financial-errors';
import { SentryContextManager } from '../lib/sentry-context';

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface Account {
  id: string;
  balance: number;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  dailyLimit: number;
  monthlyLimit: number;
}

export class FinancialService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository
  ) {}
  
  async transfer(request: TransferRequest, userId: string): Promise<Result<Transaction, 
    ValidationError | InsufficientFundsError | AccountFrozenError | InvalidTransactionError
  >> {
    // Set user context for monitoring
    SentryContextManager.addBreadcrumb(
      'Transfer initiated',
      'financial.transfer',
      { ...request, userId }
    );
    
    // Validate request
    const validationResult = this.validateTransferRequest(request);
    if (validationResult.isFailure()) {
      return validationResult;
    }
    
    // Get accounts
    const fromAccountResult = await this.getAccount(request.fromAccountId);
    if (fromAccountResult.isFailure()) {
      return fromAccountResult;
    }
    
    const toAccountResult = await this.getAccount(request.toAccountId);
    if (toAccountResult.isFailure()) {
      return toAccountResult;
    }
    
    const fromAccount = fromAccountResult.value;
    const toAccount = toAccountResult.value;
    
    // Check account status
    if (fromAccount.status === 'frozen') {
      const error = new AccountFrozenError(
        fromAccount.id,
        'Account is frozen',
        new Date()
      );
      SentryContextManager.captureFinancialError(error, {
        operation: 'transfer',
        userId,
        transactionId: request.fromAccountId
      });
      return Result.failure(error);
    }
    
    // Check sufficient funds
    if (fromAccount.balance < request.amount) {
      const error = new InsufficientFundsError(
        fromAccount.balance,
        request.amount,
        request.currency,
        fromAccount.id
      );
      SentryContextManager.captureFinancialError(error, {
        operation: 'transfer',
        userId,
        amount: request.amount
      });
      return Result.failure(error);
    }
    
    // Check limits
    const limitsResult = await this.checkTransactionLimits(fromAccount, request.amount);
    if (limitsResult.isFailure()) {
      return limitsResult;
    }
    
    // Process transfer
    const transactionResult = await this.processTransfer(fromAccount, toAccount, request, userId);
    if (transactionResult.isFailure()) {
      SentryContextManager.captureFinancialError(transactionResult.error, {
        operation: 'transfer',
        userId,
        amount: request.amount
      });
      return transactionResult;
    }
    
    SentryContextManager.addBreadcrumb(
      'Transfer completed successfully',
      'financial.transfer',
      { transactionId: transactionResult.value.id, userId }
    );
    
    return transactionResult;
  }
  
  private validateTransferRequest(request: TransferRequest): Result<void, ValidationError> {
    const errors: Record<string, string[]> = {};
    
    if (!request.fromAccountId) {
      errors.fromAccountId = ['From account ID is required'];
    }
    
    if (!request.toAccountId) {
      errors.toAccountId = ['To account ID is required'];
    }
    
    if (request.fromAccountId === request.toAccountId) {
      errors.accounts = ['Cannot transfer to the same account'];
    }
    
    if (!request.amount || request.amount <= 0) {
      errors.amount = ['Amount must be greater than 0'];
    }
    
    if (!request.currency) {
      errors.currency = ['Currency is required'];
    }
    
    if (Object.keys(errors).length > 0) {
      return Result.failure(new ValidationError('Transfer request validation failed', errors));
    }
    
    return Result.success(undefined);
  }
  
  private async getAccount(accountId: string): Promise<Result<Account, NotFoundError>> {
    try {
      const account = await this.accountRepository.findById(accountId);
      if (!account) {
        return Result.failure(new NotFoundError(`Account ${accountId} not found`));
      }
      return Result.success(account);
    } catch (error) {
      return Result.failure(new SystemError('Failed to retrieve account', { accountId }, error));
    }
  }
  
  private async checkTransactionLimits(
    account: Account, 
    amount: number
  ): Promise<Result<void, TransactionLimitExceededError>> {
    // Check daily limits
    const dailyUsage = await this.transactionRepository.getDailyUsage(account.id);
    if (dailyUsage + amount > account.dailyLimit) {
      return Result.failure(new TransactionLimitExceededError(
        'daily',
        account.dailyLimit,
        dailyUsage + amount,
        account.currency
      ));
    }
    
    // Check monthly limits
    const monthlyUsage = await this.transactionRepository.getMonthlyUsage(account.id);
    if (monthlyUsage + amount > account.monthlyLimit) {
      return Result.failure(new TransactionLimitExceededError(
        'monthly',
        account.monthlyLimit,
        monthlyUsage + amount,
        account.currency
      ));
    }
    
    return Result.success(undefined);
  }
  
  private async processTransfer(
    fromAccount: Account,
    toAccount: Account,
    request: TransferRequest,
    userId: string
  ): Promise<Result<Transaction, InvalidTransactionError | SystemError>> {
    try {
      const transaction = await this.transactionRepository.createTransfer({
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        userId,
        type: 'transfer',
        status: 'completed'
      });
      
      return Result.success(transaction);
    } catch (error) {
      if (error instanceof InvalidTransactionError) {
        return Result.failure(error);
      }
      
      return Result.failure(new SystemError('Failed to process transfer', {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        amount: request.amount,
        userId
      }, error));
    }
  }
}
```

### Controller Error Handling

```typescript
// src/controllers/financial-controller.ts
import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '../services/financial-service';
import { 
  ValidationError, 
  InsufficientFundsError, 
  AccountFrozenError,
  InvalidTransactionError 
} from '../lib/errors/financial-errors';

export class FinancialController {
  constructor(private financialService: FinancialService) {}
  
  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transferRequest = req.body;
      const userId = req.user.id;
      
      const result = await this.financialService.transfer(transferRequest, userId);
      
      if (result.isSuccess()) {
        res.status(200).json({
          statusCode: '20000',
          message: 'Transfer completed successfully',
          data: {
            transaction: result.value
          }
        });
      } else {
        this.handleError(result.error, res);
      }
    } catch (error) {
      next(error);
    }
  }
  
  private handleError(error: Error, res: Response) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        statusCode: '40001',
        message: error.message,
        details: error.fields
      });
    } else if (error instanceof InsufficientFundsError) {
      res.status(422).json({
        statusCode: '42201',
        message: error.message,
        details: {
          availableBalance: error.availableBalance,
          requestedAmount: error.requestedAmount,
          currency: error.currency
        }
      });
    } else if (error instanceof AccountFrozenError) {
      res.status(423).json({
        statusCode: '42301',
        message: error.message,
        details: {
          accountId: error.accountId,
          reason: error.reason
        }
      });
    } else if (error instanceof InvalidTransactionError) {
      res.status(422).json({
        statusCode: '42202',
        message: error.message,
        details: {
          transactionId: error.transactionId,
          violations: error.violations
        }
      });
    } else {
      // Let global error handler deal with unexpected errors
      throw error;
    }
  }
}
```

This comprehensive guide provides production-ready error monitoring patterns for TypeScript financial applications, including:

1. **Sentry Integration**: Complete setup for both server-side and client-side monitoring
2. **API Error Logging**: Comprehensive middleware for request/response logging and error context
3. **Performance Monitoring**: Transaction tracking, slow query detection, and cron job monitoring
4. **Custom Error Classes**: Domain-specific error types with proper inheritance and context
5. **TypeScript Error Handling**: Result pattern implementation with type safety and functional error handling

All patterns are designed for high-scale financial applications with emphasis on security, observability, and maintainability.