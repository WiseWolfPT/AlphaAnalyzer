/**
 * Admin Authentication Middleware
 * Provides additional security and role checking for admin routes
 */

import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth-middleware';
import { db } from '../lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

/**
 * Admin authentication middleware
 * Ensures user is authenticated and has admin privileges
 */
export const requireAdmin = () => {
  return [
    // First authenticate the user
    authMiddleware.instance.authenticate(),
    
    // Then check admin permissions
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          });
        }

        // Check if user has admin role
        const isAdmin = req.user.permissions.includes('admin:access') || 
                       req.user.roles.some(role => role.name === 'admin' || role.name === 'super_admin');

        if (!isAdmin) {
          // Log unauthorized admin access attempt
          await db.logSecurityEvent({
            user_id: req.user.id,
            action: 'unauthorized_admin_access',
            resource: 'admin_panel',
            ip_address: req.ip || 'unknown',
            user_agent: req.headers['user-agent'] || 'unknown',
            success: false,
            details: { 
              attempted_path: req.path,
              user_roles: req.user.roles.map(r => r.name),
              user_permissions: req.user.permissions
            },
          });

          return res.status(403).json({
            success: false,
            error: 'ADMIN_ACCESS_DENIED',
            message: 'Admin access required',
            timestamp: new Date().toISOString()
          });
        }

        // Enhance request with admin user info
        req.adminUser = {
          id: req.user.id,
          email: req.user.email,
          roles: req.user.roles.map(r => r.name),
          permissions: req.user.permissions,
          isAdmin: true,
          isSuperAdmin: req.user.roles.some(role => role.name === 'super_admin')
        };

        // Log successful admin access
        await db.logSecurityEvent({
          user_id: req.user.id,
          action: 'admin_access_granted',
          resource: 'admin_panel',
          ip_address: req.ip || 'unknown',
          user_agent: req.headers['user-agent'] || 'unknown',
          success: true,
          details: { 
            accessed_path: req.path,
            admin_level: req.adminUser.isSuperAdmin ? 'super_admin' : 'admin'
          },
        });

        next();
      } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(500).json({
          success: false,
          error: 'ADMIN_AUTH_ERROR',
          message: 'Admin authentication failed',
          timestamp: new Date().toISOString()
        });
      }
    }
  ];
};

/**
 * Require specific admin permissions
 */
export const requireAdminPermission = (permission: string) => {
  return [
    ...requireAdmin(),
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.adminUser?.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          error: 'INSUFFICIENT_ADMIN_PERMISSIONS',
          message: `Admin permission required: ${permission}`,
          timestamp: new Date().toISOString()
        });
      }
      next();
    }
  ];
};

/**
 * Require super admin access
 */
export const requireSuperAdmin = () => {
  return [
    ...requireAdmin(),
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.adminUser?.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: 'SUPER_ADMIN_REQUIRED',
          message: 'Super admin access required',
          timestamp: new Date().toISOString()
        });
      }
      next();
    }
  ];
};

/**
 * Rate limiting for admin actions
 */
export const adminRateLimit = () => {
  const attempts = new Map<string, { count: number; lastAttempt: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}-admin`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxAttempts = 10; // Aggressive limit: 10 admin actions per minute

    const userAttempts = attempts.get(key) || { count: 0, lastAttempt: 0 };

    // Reset if outside window
    if (now - userAttempts.lastAttempt > windowMs) {
      userAttempts.count = 0;
    }

    userAttempts.count++;
    userAttempts.lastAttempt = now;
    attempts.set(key, userAttempts);

    if (userAttempts.count > maxAttempts) {
      return res.status(429).json({
        success: false,
        error: 'ADMIN_RATE_LIMIT_EXCEEDED',
        message: 'Too many admin actions. Please wait before trying again.',
        retryAfter: Math.ceil((windowMs - (now - userAttempts.lastAttempt)) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};
