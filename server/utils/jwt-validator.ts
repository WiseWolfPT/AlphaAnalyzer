/**
 * CENTRALIZED JWT VALIDATION UTILITY
 * Provides secure JWT validation for both HTTP and WebSocket connections
 */

import jwt from 'jsonwebtoken';
import { z } from 'zod';

// JWT payload validation schema
const JWTPayloadSchema = z.object({
  sub: z.string().min(1, 'Subject (user ID) is required'),
  email: z.string().email().optional(),
  iat: z.number().positive(),
  exp: z.number().positive(),
  type: z.enum(['access', 'refresh', 'api_access', 'websocket']).optional(),
  subscriptionTier: z.enum(['free', 'pro', 'premium']).optional(),
  roles: z.array(z.string()).optional(),
  whopUserId: z.string().optional(),
});

export interface ValidatedJWTPayload {
  sub: string;
  email?: string;
  iat: number;
  exp: number;
  type?: 'access' | 'refresh' | 'api_access' | 'websocket';
  subscriptionTier?: 'free' | 'pro' | 'premium';
  roles?: string[];
  whopUserId?: string;
}

export interface JWTValidationOptions {
  secret: string;
  algorithms?: jwt.Algorithm[];
  maxAge?: string | number;
  clockTolerance?: number;
  allowedTypes?: string[];
  requireType?: string;
}

export interface JWTValidationResult {
  success: boolean;
  payload?: ValidatedJWTPayload;
  error?: string;
  errorCode?: string;
}

/**
 * CENTRALIZED JWT VALIDATION
 * Used by both HTTP middleware and WebSocket authentication
 */
export class JWTValidator {
  private static instance: JWTValidator;
  private defaultSecret: string;

  constructor(defaultSecret: string) {
    this.defaultSecret = defaultSecret;
  }

  static getInstance(secret?: string): JWTValidator {
    if (!JWTValidator.instance) {
      if (!secret) {
        throw new Error('JWT secret required for first initialization');
      }
      JWTValidator.instance = new JWTValidator(secret);
    }
    return JWTValidator.instance;
  }

  /**
   * VALIDATE JWT TOKEN
   * Comprehensive validation with security checks
   */
  validateToken(token: string, options?: Partial<JWTValidationOptions>): JWTValidationResult {
    try {
      // SECURITY: Input validation
      if (!token || typeof token !== 'string') {
        return {
          success: false,
          error: 'Invalid token format',
          errorCode: 'INVALID_TOKEN_FORMAT'
        };
      }

      // SECURITY: Check token length to prevent DoS
      if (token.length > 2048) {
        return {
          success: false,
          error: 'Token too long',
          errorCode: 'TOKEN_TOO_LONG'
        };
      }

      // SECURITY: Validate token structure (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          success: false,
          error: 'Invalid token structure',
          errorCode: 'INVALID_TOKEN_STRUCTURE'
        };
      }

      const secret = options?.secret || this.defaultSecret;
      if (!secret) {
        return {
          success: false,
          error: 'JWT secret not configured',
          errorCode: 'SECRET_NOT_CONFIGURED'
        };
      }

      // JWT verification with security options
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: options?.algorithms || ['HS256'],
        maxAge: options?.maxAge || '24h',
        clockTolerance: options?.clockTolerance || 30,
      };

      const decoded = jwt.verify(token, secret, verifyOptions);

      // SECURITY: Validate decoded payload structure
      if (!decoded || typeof decoded === 'string') {
        return {
          success: false,
          error: 'Invalid token payload',
          errorCode: 'INVALID_PAYLOAD'
        };
      }

      // SECURITY: Validate payload with Zod schema
      const validation = JWTPayloadSchema.safeParse(decoded);
      if (!validation.success) {
        console.warn('JWT payload validation failed:', validation.error.errors);
        return {
          success: false,
          error: 'Invalid token payload structure',
          errorCode: 'PAYLOAD_VALIDATION_FAILED'
        };
      }

      const payload = validation.data;

      // SECURITY: Additional type validation if required
      if (options?.requireType && payload.type !== options.requireType) {
        return {
          success: false,
          error: `Token type mismatch. Expected: ${options.requireType}, got: ${payload.type}`,
          errorCode: 'TOKEN_TYPE_MISMATCH'
        };
      }

      // SECURITY: Check allowed types
      if (options?.allowedTypes && payload.type && !options.allowedTypes.includes(payload.type)) {
        return {
          success: false,
          error: 'Token type not allowed for this endpoint',
          errorCode: 'TOKEN_TYPE_NOT_ALLOWED'
        };
      }

      // SECURITY: Additional expiration check (belt and suspenders)
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return {
          success: false,
          error: 'Token has expired',
          errorCode: 'TOKEN_EXPIRED'
        };
      }

      // SECURITY: Check issued at time (not in future)
      if (payload.iat > now + 60) { // Allow 1 minute clock skew
        return {
          success: false,
          error: 'Token issued in the future',
          errorCode: 'TOKEN_FUTURE_ISSUED'
        };
      }

      return {
        success: true,
        payload
      };

    } catch (error) {
      // SECURITY: Map JWT errors to secure error codes
      let errorCode = 'TOKEN_VALIDATION_FAILED';
      let message = 'Token validation failed';

      if (error instanceof jwt.TokenExpiredError) {
        errorCode = 'TOKEN_EXPIRED';
        message = 'Token has expired';
      } else if (error instanceof jwt.JsonWebTokenError) {
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid token';
      } else if (error instanceof jwt.NotBeforeError) {
        errorCode = 'TOKEN_NOT_ACTIVE';
        message = 'Token not active yet';
      }

      return {
        success: false,
        error: message,
        errorCode
      };
    }
  }

  /**
   * EXTRACT TOKEN FROM REQUEST
   * Supports multiple token sources with priority
   */
  extractTokenFromRequest(headers: Record<string, any>, query?: Record<string, any>): string | null {
    // Priority 1: Authorization header (Bearer token)
    const authHeader = headers.authorization || headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token.length > 0) {
        return token;
      }
    }

    // Priority 2: Query parameter (for WebSocket connections)
    if (query && query.token && typeof query.token === 'string') {
      return query.token.trim();
    }

    // Priority 3: x-access-token header (alternative)
    const accessToken = headers['x-access-token'];
    if (accessToken && typeof accessToken === 'string') {
      return accessToken.trim();
    }

    return null;
  }

  /**
   * VALIDATE TOKEN FOR HTTP MIDDLEWARE
   */
  validateForHTTP(token: string): JWTValidationResult {
    return this.validateToken(token, {
      allowedTypes: ['access', 'api_access'],
      maxAge: '24h',
    });
  }

  /**
   * VALIDATE TOKEN FOR WEBSOCKET
   */
  validateForWebSocket(token: string): JWTValidationResult {
    return this.validateToken(token, {
      allowedTypes: ['access', 'websocket'],
      maxAge: '24h',
    });
  }

  /**
   * VALIDATE API TOKEN
   */
  validateAPIToken(token: string): JWTValidationResult {
    return this.validateToken(token, {
      requireType: 'api_access',
      maxAge: '7d', // API tokens can be longer-lived
    });
  }

  /**
   * GENERATE SECURE TOKEN METADATA
   */
  generateTokenMetadata(payload: ValidatedJWTPayload): Record<string, any> {
    return {
      userId: payload.sub,
      tokenType: payload.type || 'access',
      subscriptionTier: payload.subscriptionTier || 'free',
      roles: payload.roles || [],
      issuedAt: new Date(payload.iat * 1000),
      expiresAt: new Date(payload.exp * 1000),
      timeToExpiry: payload.exp * 1000 - Date.now(),
    };
  }
}

/**
 * FACTORY FUNCTION FOR EASY ACCESS
 */
export function createJWTValidator(secret?: string): JWTValidator {
  const envSecret = process.env.JWT_ACCESS_SECRET;
  const finalSecret = secret || envSecret;
  
  if (!finalSecret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is required');
  }
  
  return JWTValidator.getInstance(finalSecret);
}

/**
 * CONVENIENCE FUNCTIONS FOR COMMON USE CASES
 */
export function validateJWTForHTTP(token: string): JWTValidationResult {
  const validator = createJWTValidator();
  return validator.validateForHTTP(token);
}

export function validateJWTForWebSocket(token: string): JWTValidationResult {
  const validator = createJWTValidator();
  return validator.validateForWebSocket(token);
}

export function extractTokenFromHeaders(headers: Record<string, any>, query?: Record<string, any>): string | null {
  const validator = createJWTValidator();
  return validator.extractTokenFromRequest(headers, query);
}