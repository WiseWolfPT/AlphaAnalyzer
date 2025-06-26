/**
 * Centralized Error Handling Utilities
 * 
 * Provides secure error response handling that prevents
 * stack trace leaks in production environments.
 */

import { Response, Request } from 'express';
import { ZodError } from 'zod';
import { AuditLogger } from '../security/compliance-audit';

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
}

export interface StandardErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
  details?: any; // Only in development
  stack?: string; // Only in development
}

/**
 * Create a secure error response that prevents stack trace leaks
 */
export function createErrorResponse(
  error: Error | unknown,
  statusCode: number = 500,
  errorCode: string = 'INTERNAL_ERROR',
  userMessage: string = 'An internal error occurred',
  context?: ErrorContext
): StandardErrorResponse {
  const response: StandardErrorResponse = {
    error: errorCode,
    message: userMessage,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  // Add request ID if available
  if (context?.requestId) {
    response.requestId = context.requestId;
  }

  // SECURITY FIX: Only include sensitive error details in development
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) {
      response.details = error.message;
      response.stack = error.stack;
    } else {
      response.details = String(error);
    }
  }

  return response;
}

/**
 * Send a secure error response
 */
export function sendErrorResponse(
  res: Response,
  error: Error | unknown,
  statusCode: number = 500,
  errorCode: string = 'INTERNAL_ERROR',
  userMessage: string = 'An internal error occurred',
  context?: ErrorContext
): Response {
  const errorResponse = createErrorResponse(error, statusCode, errorCode, userMessage, context);
  return res.status(statusCode).json(errorResponse);
}

/**
 * Handle validation errors specifically
 */
export function handleValidationError(
  res: Response,
  error: ZodError,
  context?: ErrorContext
): Response {
  const response: StandardErrorResponse = {
    error: 'VALIDATION_ERROR',
    message: 'Invalid request data',
    statusCode: 400,
    timestamp: new Date().toISOString(),
  };

  if (context?.requestId) {
    response.requestId = context.requestId;
  }

  // SECURITY FIX: Only include detailed validation errors in development
  if (process.env.NODE_ENV === 'development') {
    response.details = error.errors;
  } else {
    // In production, only show generic validation message
    response.details = 'Request data validation failed';
  }

  return res.status(400).json(response);
}

/**
 * Handle authentication errors
 */
export function handleAuthError(
  res: Response,
  errorCode: string = 'AUTHENTICATION_REQUIRED',
  message: string = 'Authentication required',
  context?: ErrorContext
): Response {
  return sendErrorResponse(res, new Error(message), 401, errorCode, message, context);
}

/**
 * Handle authorization errors
 */
export function handleAuthzError(
  res: Response,
  errorCode: string = 'INSUFFICIENT_PERMISSIONS',
  message: string = 'Insufficient permissions',
  context?: ErrorContext
): Response {
  return sendErrorResponse(res, new Error(message), 403, errorCode, message, context);
}

/**
 * Handle rate limiting errors
 */
export function handleRateLimitError(
  res: Response,
  message: string = 'Too many requests',
  retryAfter?: number,
  context?: ErrorContext
): Response {
  const response = createErrorResponse(
    new Error(message),
    429,
    'RATE_LIMIT_EXCEEDED',
    message,
    context
  );

  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter.toString());
  }

  return res.status(429).json(response);
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(
  res: Response,
  resource: string = 'Resource',
  context?: ErrorContext
): Response {
  return sendErrorResponse(
    res,
    new Error(`${resource} not found`),
    404,
    'NOT_FOUND',
    `${resource} not found`,
    context
  );
}

/**
 * Log and handle critical errors with audit trail
 */
export async function logAndHandleError(
  error: Error | unknown,
  req: Request,
  res: Response,
  statusCode: number = 500,
  errorCode: string = 'INTERNAL_ERROR',
  userMessage: string = 'An internal error occurred'
): Promise<Response> {
  const context: ErrorContext = {
    requestId: (req as any).requestId,
    userId: (req as any).user?.id,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  // Log error for monitoring
  console.error('Application Error:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });

  // Audit critical errors
  if (statusCode >= 500) {
    try {
      await AuditLogger.securityViolation('application_error', {
        error: error instanceof Error ? error.message : String(error),
        statusCode,
        errorCode,
        path: context.path,
        method: context.method,
      }, {
        ipAddress: context.ip || 'unknown',
        userAgent: context.userAgent || 'unknown',
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }
  }

  return sendErrorResponse(res, error, statusCode, errorCode, userMessage, context);
}

/**
 * Express error handler middleware factory
 */
export function createSecureErrorHandler() {
  return async (
    error: Error | unknown,
    req: Request,
    res: Response,
    next: Function
  ) => {
    // Don't handle if response was already sent
    if (res.headersSent) {
      return next(error);
    }

    // Handle different error types
    if (error instanceof ZodError) {
      return handleValidationError(res, error, {
        requestId: (req as any).requestId,
        path: req.path,
        method: req.method,
      });
    }

    // Determine status code
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let userMessage = 'An internal error occurred';

    if (error instanceof Error) {
      // Parse common error patterns
      if (error.message.includes('JWT') || error.message.includes('token')) {
        statusCode = 401;
        errorCode = 'AUTHENTICATION_ERROR';
        userMessage = 'Authentication failed';
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        statusCode = 403;
        errorCode = 'AUTHORIZATION_ERROR';
        userMessage = 'Access denied';
      } else if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        userMessage = 'Resource not found';
      } else if (error.message.includes('rate limit')) {
        statusCode = 429;
        errorCode = 'RATE_LIMIT_EXCEEDED';
        userMessage = 'Too many requests';
      }
    }

    return logAndHandleError(error, req, res, statusCode, errorCode, userMessage);
  };
}