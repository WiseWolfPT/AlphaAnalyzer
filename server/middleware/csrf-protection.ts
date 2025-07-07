// SECURITY FIX: CSRF Protection Alternative - Double Submit Cookie Pattern
// Replaces vulnerable csurf package with secure implementation

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CSRFRequest extends Request {
  csrfToken?: () => string;
}

/**
 * CSRF Protection Middleware using Double Submit Cookie Pattern
 * This is a secure alternative to the vulnerable csurf package
 */
export class CSRFProtection {
  private static readonly CSRF_TOKEN_LENGTH = 32;
  private static readonly CSRF_COOKIE_NAME = '__Host-csrf-token';
  private static readonly CSRF_HEADER_NAME = 'x-csrf-token';
  private static readonly CSRF_FORM_FIELD = '_csrf';

  /**
   * Generate a cryptographically secure CSRF token
   */
  private static generateToken(): string {
    return crypto.randomBytes(this.CSRF_TOKEN_LENGTH).toString('hex');
  }

  /**
   * Middleware to generate and set CSRF token
   */
  static generate() {
    return (req: CSRFRequest, res: Response, next: NextFunction) => {
      // Skip CSRF for safe methods (as per RFC 7231)
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Generate new token if not present
      let token = req.cookies?.[this.CSRF_COOKIE_NAME];
      
      if (!token) {
        token = this.generateToken();
        
        // Set secure cookie with CSRF token
        res.cookie(this.CSRF_COOKIE_NAME, token, {
          httpOnly: false, // Must be accessible to JavaScript for form submissions
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          sameSite: 'strict', // Strict same-site policy
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/'
        });
      }

      // Add method to get token for forms
      req.csrfToken = () => token;

      next();
    };
  }

  /**
   * Middleware to validate CSRF token
   */
  static validate() {
    return (req: CSRFRequest, res: Response, next: NextFunction) => {
      // Skip CSRF for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip CSRF for specific API endpoints that use other auth
      const skipPaths = [
        '/api/stripe/webhook', // Stripe has its own verification
        '/api/auth/callback',   // OAuth callbacks
        '/health'               // Health checks
      ];

      if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      const cookieToken = req.cookies?.[this.CSRF_COOKIE_NAME];
      const headerToken = req.headers[this.CSRF_HEADER_NAME] as string;
      const bodyToken = req.body?.[this.CSRF_FORM_FIELD];

      // Get token from header or body
      const providedToken = headerToken || bodyToken;

      // Validate token presence
      if (!cookieToken || !providedToken) {
        return res.status(403).json({
          error: {
            message: 'CSRF token missing',
            code: 'CSRF_TOKEN_MISSING',
            statusCode: 403
          }
        });
      }

      // Validate token match (constant-time comparison)
      if (!crypto.timingSafeEqual(
        Buffer.from(cookieToken, 'hex'),
        Buffer.from(providedToken, 'hex')
      )) {
        return res.status(403).json({
          error: {
            message: 'CSRF token mismatch',
            code: 'CSRF_TOKEN_MISMATCH',
            statusCode: 403
          }
        });
      }

      next();
    };
  }

  /**
   * Helper method to get CSRF token for API responses
   */
  static getToken(req: Request): string | null {
    return req.cookies?.[this.CSRF_COOKIE_NAME] || null;
  }

  /**
   * Middleware to add CSRF token to API responses
   */
  static addTokenToResponse() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json;
      
      res.json = function(data: any) {
        // Add CSRF token to response if it's a successful response
        if (res.statusCode < 400 && data && typeof data === 'object') {
          const csrfToken = CSRFProtection.getToken(req);
          if (csrfToken) {
            data._csrf = csrfToken;
          }
        }
        
        return originalJson.call(this, data);
      };

      next();
    };
  }
}

/**
 * Complete CSRF protection middleware setup
 */
export const csrfProtection = [
  CSRFProtection.generate(),
  CSRFProtection.addTokenToResponse()
];

/**
 * CSRF validation middleware (apply to state-changing endpoints)
 */
export const csrfValidation = CSRFProtection.validate();

/**
 * Get CSRF token helper function
 */
export const getCSRFToken = CSRFProtection.getToken;