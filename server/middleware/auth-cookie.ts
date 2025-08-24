import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      userId?: string;
    }
  }
}

// Create Supabase client for auth verification
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Authentication middleware using httpOnly cookies
 * Protects routes by verifying the access token from cookies
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies['access-token'];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        code: 'NO_TOKEN' 
      });
    }
    
    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token validation error:', error);
      // Token might be expired
      return res.status(401).json({ 
        error: 'Token invalid or expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Tries to authenticate but doesn't block if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies['access-token'];
    
    if (!token) {
      // No token, but that's okay for optional auth
      return next();
    }
    
    // Try to validate token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      // Valid token, attach user
      req.user = user;
      req.userId = user.id;
    }
    
    // Continue regardless
    next();
  } catch (error) {
    // Log error but continue
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Refresh token middleware
 * Automatically refreshes expired tokens using the refresh token
 */
export const autoRefreshMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies['access-token'];
    const refreshToken = req.cookies['refresh-token'];
    
    if (!accessToken && refreshToken) {
      // Access token missing or expired, try to refresh
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });
      
      if (!error && data.session) {
        // Successfully refreshed, update cookies
        res.cookie('access-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 1000 // 1 hour
        });
        
        if (data.session.refresh_token) {
          res.cookie('refresh-token', data.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth/refresh',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          });
        }
        
        // Attach user to request
        req.user = data.user;
        req.userId = data.user?.id;
      }
    }
    
    next();
  } catch (error) {
    console.error('Auto-refresh error:', error);
    next();
  }
};

/**
 * Admin-only middleware
 * Requires user to have admin role
 */
export const adminOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // First ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Not authenticated',
      code: 'NO_AUTH' 
    });
  }
  
  try {
    // Check if user has admin role
    // This would typically check the database for user roles
    // For now, we'll check user metadata
    const userMetadata = req.user.user_metadata || {};
    const isAdmin = userMetadata.role === 'admin' || userMetadata.is_admin === true;
    
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_ONLY' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ 
      error: 'Authorization error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Rate limiting by subscription tier
 * Different limits for free vs paid users
 */
export const tierBasedRateLimit = (
  freeLimit: number = 10,
  paidLimit: number = 100
) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  const windowMs = 60 * 1000; // 1 minute window
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId || req.ip || 'anonymous';
    const now = Date.now();
    
    // Get or create request count for user
    let userRequests = requestCounts.get(userId);
    
    if (!userRequests || userRequests.resetTime < now) {
      userRequests = { count: 0, resetTime: now + windowMs };
      requestCounts.set(userId, userRequests);
    }
    
    // Determine rate limit based on user tier
    const limit = req.user?.user_metadata?.subscription_tier === 'free' ? freeLimit : paidLimit;
    
    if (userRequests.count >= limit) {
      return res.status(429).json({ 
        error: 'Too many requests',
        code: 'RATE_LIMIT',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }
    
    userRequests.count++;
    next();
  };
};

// Export middleware functions
export default {
  authMiddleware,
  optionalAuth,
  autoRefreshMiddleware,
  adminOnly,
  tierBasedRateLimit
};