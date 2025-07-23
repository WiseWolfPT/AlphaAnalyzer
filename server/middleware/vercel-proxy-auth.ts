import { Request, Response, NextFunction } from 'express';
import { AuthUser } from './auth';
import { supabaseAdmin } from '../lib/supabase-admin';

// Extend Express Request to support proxy auth
declare global {
  namespace Express {
    interface Request {
      isVercelProxy?: boolean;
      proxyMetadata?: {
        region?: string;
        deployment?: string;
        requestId?: string;
        forwardedFor?: string;
        forwardedProto?: string;
        forwardedHost?: string;
        userAgent?: string;
      };
    }
  }
}

// Configuration for Vercel proxy authentication
interface VercelProxyConfig {
  enabled: boolean;
  secret?: string;
  allowedDeployments?: string[];
  allowedRegions?: string[];
  debug: boolean;
  bypassAuth: boolean;
  requireSecret: boolean;
}

// Default configuration
const defaultConfig: VercelProxyConfig = {
  enabled: process.env.ENABLE_VERCEL_PROXY_AUTH === 'true',
  secret: process.env.VERCEL_PROXY_SECRET,
  allowedDeployments: process.env.VERCEL_ALLOWED_DEPLOYMENTS?.split(',').map(d => d.trim()),
  allowedRegions: process.env.VERCEL_ALLOWED_REGIONS?.split(',').map(r => r.trim()),
  debug: process.env.VERCEL_PROXY_DEBUG === 'true',
  bypassAuth: process.env.VERCEL_PROXY_BYPASS_AUTH === 'true',
  requireSecret: process.env.VERCEL_PROXY_REQUIRE_SECRET === 'true',
};

/**
 * Logger for Vercel proxy authentication
 */
class VercelProxyLogger {
  private debug: boolean;

  constructor(debug: boolean) {
    this.debug = debug;
  }

  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component: 'vercel-proxy-auth',
      message,
      ...data,
    };

    if (level === 'debug' && !this.debug) {
      return;
    }

    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    
    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      // Send to error tracking service
    }
  }
}

const logger = new VercelProxyLogger(defaultConfig.debug);

/**
 * Check if request is coming from Vercel proxy
 */
function isVercelProxyRequest(req: Request): boolean {
  // Check for Vercel-specific headers
  const vercelHeaders = [
    'x-vercel-deployment-url',
    'x-vercel-id',
    'x-vercel-forwarded-for',
    'x-vercel-proxy-signature',
    'x-vercel-proxy-signature-ts',
  ];

  const hasVercelHeaders = vercelHeaders.some(header => req.headers[header] !== undefined);
  
  // Check for forwarded headers that Vercel sets
  const hasForwardedHeaders = req.headers['x-forwarded-for'] && 
                             req.headers['x-forwarded-proto'] &&
                             req.headers['x-forwarded-host'];

  // Check if request is coming from Vercel edge network
  const isVercelNetwork = req.headers['x-vercel-edge'] === 'true' ||
                         req.headers['x-vercel-proxy'] === '1';

  return hasVercelHeaders || (hasForwardedHeaders && isVercelNetwork);
}

/**
 * Extract Vercel proxy metadata from headers
 */
function extractVercelMetadata(req: Request): Request['proxyMetadata'] {
  return {
    region: req.headers['x-vercel-ip-country-region'] as string,
    deployment: req.headers['x-vercel-deployment-url'] as string,
    requestId: req.headers['x-vercel-id'] as string,
    forwardedFor: req.headers['x-forwarded-for'] as string,
    forwardedProto: req.headers['x-forwarded-proto'] as string,
    forwardedHost: req.headers['x-forwarded-host'] as string,
    userAgent: req.headers['user-agent'] as string,
  };
}

/**
 * Verify Vercel proxy signature (if secret is configured)
 */
function verifyProxySignature(req: Request, secret: string): boolean {
  const signature = req.headers['x-vercel-proxy-signature'] as string;
  const timestamp = req.headers['x-vercel-proxy-signature-ts'] as string;

  if (!signature || !timestamp) {
    logger.log('debug', 'Missing proxy signature headers');
    return false;
  }

  // Verify timestamp is recent (within 5 minutes)
  const now = Date.now();
  const signatureTime = parseInt(timestamp, 10);
  const timeDiff = Math.abs(now - signatureTime);
  
  if (timeDiff > 5 * 60 * 1000) {
    logger.log('warn', 'Proxy signature timestamp too old', { timeDiff });
    return false;
  }

  // In production, implement HMAC signature verification
  // For now, we'll do a simple check
  const expectedSignature = Buffer.from(`${secret}-${timestamp}`).toString('base64');
  
  return signature === expectedSignature;
}

/**
 * Verify deployment is allowed
 */
function isDeploymentAllowed(deployment: string | undefined, allowedDeployments: string[] | undefined): boolean {
  if (!allowedDeployments || allowedDeployments.length === 0) {
    return true; // No restrictions
  }

  if (!deployment) {
    return false;
  }

  return allowedDeployments.some(allowed => 
    deployment.includes(allowed) || allowed === '*'
  );
}

/**
 * Verify region is allowed
 */
function isRegionAllowed(region: string | undefined, allowedRegions: string[] | undefined): boolean {
  if (!allowedRegions || allowedRegions.length === 0) {
    return true; // No restrictions
  }

  if (!region) {
    return false;
  }

  return allowedRegions.includes(region) || allowedRegions.includes('*');
}

/**
 * Main Vercel proxy authentication middleware
 */
export function vercelProxyAuth(config: Partial<VercelProxyConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip if not enabled
      if (!finalConfig.enabled) {
        logger.log('debug', 'Vercel proxy auth disabled');
        return next();
      }

      // Check if this is a Vercel proxy request
      const isProxy = isVercelProxyRequest(req);
      
      if (!isProxy) {
        logger.log('debug', 'Not a Vercel proxy request');
        return next();
      }

      // Mark request as coming from Vercel proxy
      req.isVercelProxy = true;

      // Extract metadata
      const metadata = extractVercelMetadata(req);
      req.proxyMetadata = metadata;

      logger.log('info', 'Vercel proxy request detected', {
        deployment: metadata.deployment,
        region: metadata.region,
        requestId: metadata.requestId,
      });

      // Verify proxy signature if required
      if (finalConfig.requireSecret && finalConfig.secret) {
        const isValidSignature = verifyProxySignature(req, finalConfig.secret);
        
        if (!isValidSignature) {
          logger.log('error', 'Invalid proxy signature', {
            requestId: metadata.requestId,
            deployment: metadata.deployment,
          });
          
          return res.status(403).json({
            error: 'INVALID_PROXY_SIGNATURE',
            message: 'Invalid proxy authentication',
          });
        }
      }

      // Verify deployment is allowed
      if (!isDeploymentAllowed(metadata.deployment, finalConfig.allowedDeployments)) {
        logger.log('warn', 'Deployment not allowed', {
          deployment: metadata.deployment,
          allowed: finalConfig.allowedDeployments,
        });
        
        return res.status(403).json({
          error: 'DEPLOYMENT_NOT_ALLOWED',
          message: 'This deployment is not authorized',
        });
      }

      // Verify region is allowed
      if (!isRegionAllowed(metadata.region, finalConfig.allowedRegions)) {
        logger.log('warn', 'Region not allowed', {
          region: metadata.region,
          allowed: finalConfig.allowedRegions,
        });
        
        return res.status(403).json({
          error: 'REGION_NOT_ALLOWED',
          message: 'This region is not authorized',
        });
      }

      // If bypass auth is enabled, create a system user
      if (finalConfig.bypassAuth) {
        logger.log('info', 'Bypassing auth for Vercel proxy', {
          requestId: metadata.requestId,
        });

        // Create a system user for the proxy
        req.user = {
          id: 'vercel-proxy',
          email: 'proxy@vercel.com',
          role: 'system',
          metadata: {
            isProxy: true,
            deployment: metadata.deployment,
            region: metadata.region,
          },
        };
      }

      // Continue to next middleware
      next();
    } catch (error) {
      logger.log('error', 'Vercel proxy auth error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: 'PROXY_AUTH_ERROR',
        message: 'Proxy authentication failed',
      });
    }
  };
}

/**
 * Middleware to ensure request is from Vercel proxy
 */
export function requireVercelProxy(req: Request, res: Response, next: NextFunction): void {
  if (!req.isVercelProxy) {
    logger.log('warn', 'Non-proxy request blocked', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(403).json({
      error: 'PROXY_REQUIRED',
      message: 'This endpoint requires Vercel proxy',
    });
    return;
  }

  next();
}

/**
 * Get proxy metadata from request
 */
export function getProxyMetadata(req: Request): Request['proxyMetadata'] | null {
  return req.proxyMetadata || null;
}

/**
 * Check if request is from Vercel proxy
 */
export function isFromVercelProxy(req: Request): boolean {
  return req.isVercelProxy === true;
}

/**
 * Rate limiting specific to Vercel proxy
 */
export function vercelProxyRateLimit(windowMs: number = 60000, max: number = 1000) {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isVercelProxy) {
      return next();
    }

    const key = req.proxyMetadata?.deployment || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request timestamps for this deployment
    const timestamps = requests.get(key) || [];
    
    // Filter out old timestamps
    const recentTimestamps = timestamps.filter(ts => ts > windowStart);
    
    // Add current timestamp
    recentTimestamps.push(now);
    
    // Update map
    requests.set(key, recentTimestamps);

    // Check if limit exceeded
    if (recentTimestamps.length > max) {
      logger.log('warn', 'Proxy rate limit exceeded', {
        deployment: key,
        count: recentTimestamps.length,
        limit: max,
      });

      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this deployment',
        retryAfter: Math.ceil(windowMs / 1000),
      });
      return;
    }

    next();
  };
}

// Export middleware collection
export const vercelProxy = {
  auth: vercelProxyAuth,
  requireProxy: requireVercelProxy,
  rateLimit: vercelProxyRateLimit,
};

// Export helpers
export const vercelProxyHelpers = {
  getProxyMetadata,
  isFromVercelProxy,
  isVercelProxyRequest,
  extractVercelMetadata,
};