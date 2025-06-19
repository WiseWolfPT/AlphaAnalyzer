import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth, db } from '../lib/supabase';
import { SubscriptionTier, UserRole } from '../types/auth';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        subscriptionTier: SubscriptionTier;
        roles: UserRole[];
        permissions: string[];
        whopUserId?: string;
        sessionId?: string;
      };
      session?: {
        id: string;
        userId: string;
        createdAt: Date;
        lastActivity: Date;
        ipAddress: string;
        userAgent: string;
      };
    }
  }
}

export interface AuthMiddlewareOptions {
  accessTokenSecret: string;
  whopAppId?: string;
  enableWhopIntegration?: boolean;
  requireSubscription?: SubscriptionTier;
  requiredPermissions?: string[];
  requiredRoles?: UserRole[];
}

export class AuthenticationMiddleware {
  private accessTokenSecret: string;
  private whopAppId?: string;
  private enableWhopIntegration: boolean;

  // Whop JWT public key for token verification
  private static readonly WHOP_JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAErz8a8vxvexHC0TLT91g7llOdDOsN
uYiGEfic4Qhni+HMfRBuUphOh7F3k8QgwZc9UlL0AHmyYqtbhL9NuJes6w==
-----END PUBLIC KEY-----`;

  constructor(options: AuthMiddlewareOptions) {
    this.accessTokenSecret = options.accessTokenSecret;
    this.whopAppId = options.whopAppId;
    this.enableWhopIntegration = options.enableWhopIntegration || false;
  }

  /**
   * Main authentication middleware
   */
  authenticate = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Try Whop authentication first if enabled
        if (this.enableWhopIntegration) {
          const whopUser = await this.authenticateWhopUser(req);
          if (whopUser) {
            req.user = whopUser;
            return next();
          }
        }

        // Fallback to traditional JWT authentication
        const token = this.extractTokenFromHeader(req);
        if (!token) {
          return this.unauthorizedResponse(res, 'NO_TOKEN', 'Authentication token required');
        }

        const payload = this.verifyJWT(token);
        const user = await this.loadUserFromDatabase(payload.sub);
        
        if (!user) {
          return this.unauthorizedResponse(res, 'USER_NOT_FOUND', 'User not found');
        }

        req.user = {
          id: user.id,
          email: user.email,
          subscriptionTier: user.subscription_tier as SubscriptionTier,
          roles: user.roles || [],
          permissions: this.extractPermissions(user.roles || []),
        };

        // Update user activity
        await this.updateLastActivity(user.id, req);

        next();
      } catch (error) {
        console.error('Authentication error:', error);
        return this.unauthorizedResponse(res, 'AUTHENTICATION_ERROR', 'Authentication failed');
      }
    };
  };

  /**
   * Authenticate user via Whop token
   */
  private async authenticateWhopUser(req: Request): Promise<any | null> {
    try {
      const whopToken = req.headers['x-whop-user-token'] as string;
      if (!whopToken || !this.whopAppId) return null;

      // Verify Whop JWT token
      const payload = jwt.verify(whopToken, AuthenticationMiddleware.WHOP_JWT_PUBLIC_KEY, {
        algorithms: ['ES256'],
        issuer: 'urn:whopcom:exp-proxy',
        audience: this.whopAppId,
      }) as any;

      const whopUserId = payload.sub;
      
      // Find or create user in our database linked to Whop user
      const user = await this.findOrCreateWhopUser(whopUserId, payload);
      
      return {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscription_tier as SubscriptionTier,
        roles: user.roles || [],
        permissions: this.extractPermissions(user.roles || []),
        whopUserId,
      };
    } catch (error) {
      console.error('Whop authentication error:', error);
      return null;
    }
  }

  /**
   * Find or create user from Whop authentication
   */
  private async findOrCreateWhopUser(whopUserId: string, whopPayload: any) {
    // Check if user already exists with this Whop ID
    let user = await db.from('profiles').select('*').eq('whop_user_id', whopUserId).single();
    
    if (!user.data) {
      // Create new user from Whop data
      const newUser = {
        whop_user_id: whopUserId,
        email: whopPayload.email || `whop_${whopUserId}@temp.com`,
        full_name: whopPayload.name || 'Whop User',
        subscription_tier: 'premium', // Whop users get premium access
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdUser } = await db.from('profiles').insert(newUser).select().single();
      return createdUser;
    }

    return user.data;
  }

  /**
   * Verify JWT token
   */
  private verifyJWT(token: string): any {
    try {
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('ACCESS_TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_ACCESS_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Load user from database
   */
  private async loadUserFromDatabase(userId: string) {
    const { data: user } = await db.from('profiles').select('*').eq('id', userId).single();
    return user;
  }

  /**
   * Update user last activity
   */
  private async updateLastActivity(userId: string, req: Request) {
    const sessionData = {
      user_id: userId,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      last_activity: new Date().toISOString(),
    };

    // Update or insert session data
    await db.from('user_sessions').upsert(sessionData, { onConflict: 'user_id' });
  }

  /**
   * Extract permissions from roles
   */
  private extractPermissions(roles: UserRole[]): string[] {
    const permissions = new Set<string>();
    roles.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    });
    return Array.from(permissions);
  }

  /**
   * Extract token from Authorization header
   */
  private extractTokenFromHeader(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Middleware for subscription tier requirements
   */
  requireSubscriptionTier = (minimumTier: SubscriptionTier) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.unauthorizedResponse(res, 'NOT_AUTHENTICATED', 'Authentication required');
      }

      if (!this.hasMinimumSubscriptionTier(req.user.subscriptionTier, minimumTier)) {
        return this.forbiddenResponse(
          res,
          'SUBSCRIPTION_TIER_INSUFFICIENT',
          `Requires ${minimumTier} subscription or higher`,
          { requiredTier: minimumTier, currentTier: req.user.subscriptionTier }
        );
      }

      next();
    };
  };

  /**
   * Middleware for permission requirements
   */
  requirePermissions = (permissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.unauthorizedResponse(res, 'NOT_AUTHENTICATED', 'Authentication required');
      }

      const hasPermissions = permissions.every(permission => 
        req.user!.permissions.includes(permission)
      );

      if (!hasPermissions) {
        return this.forbiddenResponse(
          res,
          'INSUFFICIENT_PERMISSIONS',
          'Insufficient permissions',
          { requiredPermissions: permissions, userPermissions: req.user.permissions }
        );
      }

      next();
    };
  };

  /**
   * Middleware for role requirements
   */
  requireRoles = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.unauthorizedResponse(res, 'NOT_AUTHENTICATED', 'Authentication required');
      }

      const roleNames = roles.map(r => r.name);
      const userRoleNames = req.user.roles.map(r => r.name);
      const hasRole = roleNames.some(role => userRoleNames.includes(role));

      if (!hasRole) {
        return this.forbiddenResponse(
          res,
          'INSUFFICIENT_ROLES',
          'Insufficient role permissions',
          { requiredRoles: roleNames, userRoles: userRoleNames }
        );
      }

      next();
    };
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Try Whop authentication first if enabled
        if (this.enableWhopIntegration) {
          const whopUser = await this.authenticateWhopUser(req);
          if (whopUser) {
            req.user = whopUser;
            return next();
          }
        }

        // Try traditional JWT authentication
        const token = this.extractTokenFromHeader(req);
        if (token) {
          const payload = this.verifyJWT(token);
          const user = await this.loadUserFromDatabase(payload.sub);
          
          if (user) {
            req.user = {
              id: user.id,
              email: user.email,
              subscriptionTier: user.subscription_tier as SubscriptionTier,
              roles: user.roles || [],
              permissions: this.extractPermissions(user.roles || []),
            };
          }
        }
      } catch (error) {
        // Silently ignore authentication errors in optional auth
        console.warn('Optional authentication failed:', error);
      }
      
      next();
    };
  };

  /**
   * Check if user has minimum subscription tier
   */
  private hasMinimumSubscriptionTier(userTier: SubscriptionTier, minimumTier: SubscriptionTier): boolean {
    const tierHierarchy: Record<SubscriptionTier, number> = {
      'free': 0,
      'pro': 1,
      'premium': 2,
    };

    return tierHierarchy[userTier] >= tierHierarchy[minimumTier];
  }

  /**
   * Send unauthorized response
   */
  private unauthorizedResponse(res: Response, code: string, message: string) {
    return res.status(401).json({
      error: code,
      message,
      statusCode: 401,
    });
  }

  /**
   * Send forbidden response
   */
  private forbiddenResponse(res: Response, code: string, message: string, details?: any) {
    return res.status(403).json({
      error: code,
      message,
      statusCode: 403,
      details,
    });
  }
}

// Export singleton instance
export const authMiddleware = new AuthenticationMiddleware({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'fallback-secret',
  whopAppId: process.env.WHOP_APP_ID,
  enableWhopIntegration: process.env.ENABLE_WHOP_INTEGRATION === 'true',
});