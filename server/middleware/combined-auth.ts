import { Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, AuthUser } from './auth';
import { vercelProxyAuth, isFromVercelProxy, getProxyMetadata } from './vercel-proxy-auth';

/**
 * Combined authentication middleware that handles both regular auth and Vercel proxy
 * 
 * Flow:
 * 1. Check if request is from Vercel proxy
 * 2. If proxy and bypass is enabled, create system user
 * 3. Otherwise, proceed with normal authentication
 */
export function combinedAuth(options: {
  requireAuth?: boolean;
  bypassForProxy?: boolean;
  proxySecret?: string;
  debug?: boolean;
} = {}) {
  const {
    requireAuth: authRequired = true,
    bypassForProxy = true,
    proxySecret = process.env.VERCEL_PROXY_SECRET,
    debug = process.env.VERCEL_PROXY_DEBUG === 'true',
  } = options;

  // Create Vercel proxy middleware with configuration
  const proxyMiddleware = vercelProxyAuth({
    enabled: true,
    secret: proxySecret,
    bypassAuth: bypassForProxy,
    requireSecret: !!proxySecret,
    debug,
  });

  // Return combined middleware
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // First, check for Vercel proxy
      await new Promise<void>((resolve, reject) => {
        proxyMiddleware(req, res, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // If it's a proxy request and bypass is enabled, we're done
      if (isFromVercelProxy(req) && bypassForProxy && req.user) {
        if (debug) {
          console.log('🔐 Proxy auth bypass activated for:', {
            deployment: getProxyMetadata(req)?.deployment,
            requestId: getProxyMetadata(req)?.requestId,
          });
        }
        return next();
      }

      // Otherwise, proceed with normal authentication
      if (authRequired) {
        await new Promise<void>((resolve, reject) => {
          requireAuth(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          optionalAuth(req, res, (err?: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      next();
    } catch (error) {
      // Error already handled by individual middleware
      // Just ensure we don't continue
      return;
    }
  };
}

/**
 * Middleware for public endpoints that still tracks proxy requests
 */
export function publicWithProxyTracking() {
  return combinedAuth({
    requireAuth: false,
    bypassForProxy: false,
  });
}

/**
 * Middleware for authenticated endpoints that allows proxy bypass
 */
export function authenticatedWithProxyBypass() {
  return combinedAuth({
    requireAuth: true,
    bypassForProxy: true,
  });
}

/**
 * Middleware for strict authenticated endpoints (no proxy bypass)
 */
export function strictAuthenticated() {
  return combinedAuth({
    requireAuth: true,
    bypassForProxy: false,
  });
}

/**
 * Helper to get unified user info (handles both regular and proxy users)
 */
export function getUnifiedUser(req: Request): AuthUser | null {
  if (!req.user) return null;

  // If it's a proxy user, add proxy metadata
  if (req.user.id === 'vercel-proxy') {
    const proxyMeta = getProxyMetadata(req);
    return {
      ...req.user,
      metadata: {
        ...req.user.metadata,
        proxyInfo: proxyMeta,
      },
    };
  }

  return req.user;
}

/**
 * Check if the current user is a proxy system user
 */
export function isProxyUser(req: Request): boolean {
  return req.user?.id === 'vercel-proxy' && isFromVercelProxy(req);
}

/**
 * Audit log middleware for tracking proxy requests
 */
export function auditProxyRequests(req: Request, res: Response, next: NextFunction): void {
  if (isFromVercelProxy(req)) {
    const metadata = getProxyMetadata(req);
    const auditEntry = {
      timestamp: new Date().toISOString(),
      type: 'proxy_request',
      deployment: metadata?.deployment,
      region: metadata?.region,
      requestId: metadata?.requestId,
      path: req.path,
      method: req.method,
      userAgent: metadata?.userAgent,
      forwardedFor: metadata?.forwardedFor,
    };

    // Log to console (in production, send to logging service)
    console.log('📊 Proxy Audit:', JSON.stringify(auditEntry));
  }

  next();
}

// Export preset configurations
export const authMiddleware = {
  // Public endpoints (no auth required)
  public: publicWithProxyTracking(),
  
  // Protected endpoints (auth required, proxy can bypass)
  protected: authenticatedWithProxyBypass(),
  
  // Strict endpoints (auth always required)
  strict: strictAuthenticated(),
  
  // Custom configuration
  custom: combinedAuth,
  
  // Audit middleware
  audit: auditProxyRequests,
};

// Export helpers
export const authHelpers = {
  getUnifiedUser,
  isProxyUser,
  isFromVercelProxy,
};