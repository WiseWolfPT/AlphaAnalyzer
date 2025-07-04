/**
 * Supabase Authentication Middleware - Roadmap V4
 * 
 * Protects routes with JWT validation using Supabase Auth
 * Public routes: no token required
 * Protected routes: valid JWT required in Authorization: Bearer <jwt>
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for backend operations
let supabase: SupabaseClient | null = null;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase Auth initialized');
  } else {
    console.log('⚠️ Supabase not configured - auth middleware will allow all requests');
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize Supabase:', error);
}

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        aud?: string;
        exp?: number;
      };
    }
  }
}

/**
 * Middleware to protect routes requiring authentication
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip auth if Supabase not configured (development fallback)
    if (!supabase) {
      console.log('🔓 Auth bypassed - Supabase not configured');
      req.user = {
        id: 'dev-user',
        email: 'dev@alfalyzer.com',
        role: 'user'
      };
      return next();
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
        code: 'MISSING_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('🚫 Invalid JWT token:', error?.message || 'No user found');
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        timestamp: new Date().toISOString()
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      aud: user.aud,
      exp: user.user_metadata?.exp
    };

    console.log(`🔐 Authenticated user: ${user.email} (${user.id})`);
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First run auth middleware
  await requireAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      console.log(`🚫 Access denied for user ${req.user.email} - admin role required`);
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`👑 Admin access granted to ${req.user.email}`);
    next();
  });
};

/**
 * Optional auth middleware - sets user if token provided, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || !supabase) {
      // No token or Supabase not configured - continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'user'
      };
      console.log(`🔐 Optional auth: ${user.email}`);
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Don't block request on optional auth errors
    next();
  }
};

/**
 * Get Supabase client instance
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  return supabase;
};

/**
 * Health check for Supabase connection
 */
export const checkSupabaseHealth = async (): Promise<{
  isConnected: boolean;
  url?: string;
  error?: string;
}> => {
  try {
    if (!supabase) {
      return {
        isConnected: false,
        error: 'Supabase not configured'
      };
    }

    // Simple health check by trying to get user with invalid token
    // This will fail but shows that Supabase is reachable
    await supabase.auth.getUser('invalid-token');
    
    return {
      isConnected: true,
      url: process.env.SUPABASE_URL
    };
  } catch (error) {
    // Expected error for invalid token means Supabase is reachable
    if (error instanceof Error && error.message.includes('invalid')) {
      return {
        isConnected: true,
        url: process.env.SUPABASE_URL
      };
    }
    
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};