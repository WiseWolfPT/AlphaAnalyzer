/**
 * Global Error Handler Middleware
 * Implementa error handling robusto e consistente para toda a aplicação
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Error types enumeration
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

// Standard error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    retryable?: boolean;
    retryAfter?: number;
  };
}

// Custom error class for structured error handling
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    details?: any,
    retryable: boolean = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    this.retryAfter = retryAfter;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Error logging with structured data
const logError = (error: Error, req: Request, additionalContext?: any) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack,
    additionalContext
  };

  // Log based on severity
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error('🚨 [ERROR-HANDLER] Internal Server Error:', JSON.stringify(errorLog, null, 2));
    } else if (error.statusCode >= 400) {
      console.warn('⚠️ [ERROR-HANDLER] Client Error:', JSON.stringify(errorLog, null, 2));
    } else {
      console.log('ℹ️ [ERROR-HANDLER] Info:', JSON.stringify(errorLog, null, 2));
    }
  } else {
    console.error('💥 [ERROR-HANDLER] Unhandled Error:', JSON.stringify(errorLog, null, 2));
  }
};

// Convert various error types to standardized AppError
const normalizeError = (error: any): AppError => {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return new AppError(
      ErrorType.VALIDATION_ERROR,
      'Validation failed',
      400,
      {
        validationErrors: error.errors,
        message: 'The provided data does not meet the required format'
      }
    );
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AppError(
      ErrorType.AUTHENTICATION_ERROR,
      'Invalid authentication token',
      401,
      { originalError: error.message }
    );
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError(
      ErrorType.AUTHENTICATION_ERROR,
      'Authentication token has expired',
      401,
      { originalError: error.message }
    );
  }

  // Database errors
  if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('UNIQUE constraint')) {
    return new AppError(
      ErrorType.DATABASE_ERROR,
      'Database constraint violation',
      409,
      { originalError: error.message }
    );
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new AppError(
      ErrorType.NETWORK_ERROR,
      'Network connection failed',
      503,
      { originalError: error.message },
      true,
      30 // retry after 30 seconds
    );
  }

  // API rate limit errors
  if (error.message?.includes('rate limit') || error.status === 429) {
    return new AppError(
      ErrorType.RATE_LIMIT_ERROR,
      'Rate limit exceeded',
      429,
      { originalError: error.message },
      true,
      60 // retry after 60 seconds
    );
  }

  // External API errors
  if (error.message?.includes('API') || error.response?.status) {
    const statusCode = error.response?.status || 502;
    return new AppError(
      ErrorType.EXTERNAL_SERVICE_ERROR,
      'External service error',
      statusCode >= 500 ? 502 : statusCode,
      { 
        originalError: error.message,
        externalStatus: error.response?.status,
        externalStatusText: error.response?.statusText
      },
      statusCode >= 500, // only retry on server errors
      statusCode === 429 ? 60 : 30
    );
  }

  // Generic internal server error
  return new AppError(
    ErrorType.INTERNAL_ERROR,
    'Internal server error',
    500,
    { originalError: error.message }
  );
};

// Create standardized error response
const createErrorResponse = (error: AppError, requestId?: string): ErrorResponse => {
  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.type,
      message: error.message,
      timestamp: new Date().toISOString()
    }
  };

  // Add optional fields
  if (requestId) {
    response.error.requestId = requestId;
  }

  if (error.details) {
    response.error.details = error.details;
  }

  if (error.retryable) {
    response.error.retryable = true;
    if (error.retryAfter) {
      response.error.retryAfter = error.retryAfter;
    }
  }

  return response;
};

// Main error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Convert to standardized error
  const normalizedError = normalizeError(error);
  
  // Log the error
  logError(normalizedError, req, {
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    body: req.body
  });

  // Create response
  const errorResponse = createErrorResponse(
    normalizedError,
    (req as any).requestId
  );

  // Set retry-after header for retryable errors
  if (normalizedError.retryable && normalizedError.retryAfter) {
    res.set('Retry-After', normalizedError.retryAfter.toString());
  }

  // Set CORS headers for error responses
  res.set('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.set('Access-Control-Allow-Credentials', 'true');

  // Send error response
  res.status(normalizedError.statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Predefined error creators for common scenarios
export const createValidationError = (message: string, details?: any) => {
  return new AppError(ErrorType.VALIDATION_ERROR, message, 400, details);
};

export const createAuthenticationError = (message: string = 'Authentication required') => {
  return new AppError(ErrorType.AUTHENTICATION_ERROR, message, 401);
};

export const createAuthorizationError = (message: string = 'Insufficient permissions') => {
  return new AppError(ErrorType.AUTHORIZATION_ERROR, message, 403);
};

export const createNotFoundError = (resource: string = 'Resource') => {
  return new AppError(ErrorType.NOT_FOUND_ERROR, `${resource} not found`, 404);
};

export const createRateLimitError = (retryAfter: number = 60) => {
  return new AppError(
    ErrorType.RATE_LIMIT_ERROR,
    'Rate limit exceeded',
    429,
    undefined,
    true,
    retryAfter
  );
};

export const createBusinessLogicError = (message: string, details?: any) => {
  return new AppError(ErrorType.BUSINESS_LOGIC_ERROR, message, 422, details);
};

export const createExternalServiceError = (service: string, originalError?: any, retryable: boolean = true) => {
  return new AppError(
    ErrorType.EXTERNAL_SERVICE_ERROR,
    `${service} service unavailable`,
    503,
    { service, originalError },
    retryable,
    30
  );
};

// Retry logic utility for external API calls
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000,
  retryCondition: (error: any) => boolean = (error) => error.retryable
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const normalizedError = normalizeError(error);
      if (!retryCondition(normalizedError) || attempt === maxRetries) {
        throw normalizedError;
      }
      
      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt - 1);
      console.warn(`🔄 [RETRY] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw normalizeError(lastError);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  // Only handle API routes as 404
  if (req.originalUrl.startsWith('/api/')) {
    const error = createNotFoundError(`Route ${req.method} ${req.originalUrl}`);
    next(error);
  } else {
    // For non-API routes, let them pass through (handled by static file server)
    next();
  }
};

// Graceful shutdown error handler
export const gracefulShutdownHandler = (server: any) => {
  return (signal: string) => {
    console.log(`🛑 [ERROR-HANDLER] Received ${signal}, gracefully shutting down...`);
    
    server.close(() => {
      console.log('✅ [ERROR-HANDLER] HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ [ERROR-HANDLER] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
};

// Health check with error handling
export const healthCheckHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Basic health checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requestId: (req as any).requestId,
      cors: 'enabled',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(health);
  } catch (error) {
    next(createExternalServiceError('Health Check', error, false));
  }
};