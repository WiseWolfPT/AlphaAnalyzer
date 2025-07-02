import { Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase-admin';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

// User interface with id, email, and role
export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  metadata?: Record<string, any>;
}

// JWT Error types
export enum JWTErrorType {
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  NO_TOKEN = 'NO_TOKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }
  
  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also support token without Bearer prefix
  return authHeader;
}

/**
 * Verify JWT token with Supabase Admin Client
 */
async function verifySupabaseToken(token: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error) {
      // Check if token is expired
      if (error.message.includes('expired')) {
        return { user: null, error: JWTErrorType.EXPIRED_TOKEN };
      }
      // Check for invalid token
      if (error.message.includes('invalid') || error.message.includes('malformed')) {
        return { user: null, error: JWTErrorType.INVALID_TOKEN };
      }
      return { user: null, error: error.message };
    }
    
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Token verification error:', error);
    return { user: null, error: JWTErrorType.INVALID_TOKEN };
  }
}

/**
 * Main authentication middleware - requires authenticated user
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        error: JWTErrorType.NO_TOKEN,
        message: 'Authentication required. Please provide a valid token.',
      });
      return;
    }
    
    // Store token for potential refresh handling
    req.token = token;
    
    // Verify token with Supabase
    const { user, error } = await verifySupabaseToken(token);
    
    if (error || !user) {
      // Handle expired token specifically
      if (error === JWTErrorType.EXPIRED_TOKEN) {
        res.status(401).json({
          error: JWTErrorType.EXPIRED_TOKEN,
          message: 'Token has expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      
      res.status(401).json({
        error: error || JWTErrorType.INVALID_TOKEN,
        message: 'Invalid authentication token.',
      });
      return;
    }
    
    // Get user metadata and role from database
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, metadata')
      .eq('id', user.id)
      .single();
    
    // Add user to request
    req.user = {
      id: user.id,
      email: user.email!,
      role: profile?.role || 'user',
      metadata: profile?.metadata || {},
    };
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Authentication failed due to internal error.',
    });
  }
}

/**
 * Admin-only middleware - requires admin role
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // First check if user is authenticated
  await requireAuth(req, res, () => {
    // Check if user has admin role
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Admin access required.',
        requiredRole: 'admin',
        currentRole: req.user?.role || 'user',
      });
      return;
    }
    
    next();
  });
}

/**
 * Resource ownership middleware - verifies user owns the resource
 */
export function requireOwnership(resourceField: string = 'user_id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First check if user is authenticated
    await requireAuth(req, res, () => {
      // Admin users can access any resource
      if (req.user?.role === 'admin') {
        next();
        return;
      }
      
      // Check ownership
      const resourceUserId = req.params[resourceField] || req.body?.[resourceField] || req.query?.[resourceField];
      
      if (!resourceUserId) {
        res.status(400).json({
          error: 'BAD_REQUEST',
          message: `Resource identifier '${resourceField}' not found in request.`,
        });
        return;
      }
      
      if (resourceUserId !== req.user?.id) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.',
        });
        return;
      }
      
      next();
    });
  };
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      // No token provided, continue without user
      next();
      return;
    }
    
    // Verify token with Supabase
    const { user, error } = await verifySupabaseToken(token);
    
    if (user && !error) {
      // Get user metadata and role from database
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, metadata')
        .eq('id', user.id)
        .single();
      
      // Add user to request
      req.user = {
        id: user.id,
        email: user.email!,
        role: profile?.role || 'user',
        metadata: profile?.metadata || {},
      };
    }
    
    // Continue regardless of authentication status
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Continue without user on error
    next();
  }
}

// Helper functions

/**
 * Get user from request if authenticated
 */
export function getUserFromRequest(req: Request): AuthUser | null {
  return req.user || null;
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.user;
}

/**
 * Check if user has specific role
 */
export function hasRole(req: Request, role: string): boolean {
  return req.user?.role === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(req: Request): boolean {
  return hasRole(req, 'admin');
}

/**
 * Refresh token handler - detects expired tokens and provides refresh guidance
 */
export async function handleTokenRefresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const refreshToken = req.body.refresh_token || req.headers['x-refresh-token'];
  
  if (!refreshToken) {
    res.status(400).json({
      error: 'NO_REFRESH_TOKEN',
      message: 'Refresh token is required.',
    });
    return;
  }
  
  try {
    // Use Supabase to refresh the session
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });
    
    if (error || !data.session) {
      res.status(401).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token.',
      });
      return;
    }
    
    // Return new tokens
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: 'bearer',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'REFRESH_FAILED',
      message: 'Failed to refresh token.',
    });
  }
}

/**
 * Role-based access control middleware factory
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          error: 'INSUFFICIENT_ROLE',
          message: 'You do not have the required role to access this resource.',
          requiredRoles: allowedRoles,
          currentRole: req.user?.role || 'none',
        });
        return;
      }
      
      next();
    });
  };
}

/**
 * Verify user has specific permissions (stored in metadata)
 */
export function requirePermissions(permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      const userPermissions = req.user?.metadata?.permissions || [];
      const hasAllPermissions = permissions.every(perm => userPermissions.includes(perm));
      
      if (!hasAllPermissions) {
        res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have the required permissions.',
          requiredPermissions: permissions,
          currentPermissions: userPermissions,
        });
        return;
      }
      
      next();
    });
  };
}

// Export middleware collection for easy import
export const auth = {
  requireAuth,
  requireAdmin,
  requireOwnership,
  optionalAuth,
  requireRole,
  requirePermissions,
  handleTokenRefresh,
};

// Export helpers
export const helpers = {
  getUserFromRequest,
  isAuthenticated,
  hasRole,
  isAdmin,
  extractToken,
};