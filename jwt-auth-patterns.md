# JWT Authentication Patterns for TypeScript SaaS Applications

This document contains comprehensive JWT authentication patterns for TypeScript SaaS applications, including token generation, validation, refresh patterns, middleware, and subscription tier access control.

## Table of Contents
1. [Core JWT Types and Interfaces](#core-jwt-types-and-interfaces)
2. [JWT Token Generation](#jwt-token-generation)
3. [JWT Token Validation](#jwt-token-validation)
4. [Refresh Token Patterns](#refresh-token-patterns)
5. [Authentication Middleware](#authentication-middleware)
6. [User Session Management](#user-session-management)
7. [Subscription Tier Access Control](#subscription-tier-access-control)
8. [Complete Implementation Examples](#complete-implementation-examples)

## Core JWT Types and Interfaces

### TypeScript Interfaces for Authentication

```typescript
// Core authentication types
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  permissions: string[];
  subscriptionTier: SubscriptionTier;
  iat: number; // Issued at
  exp: number; // Expires at
  iss: string; // Issuer
  aud: string; // Audience
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string; // Unique token identifier
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSession {
  userId: string;
  email: string;
  roles: Role[];
  subscriptionTier: SubscriptionTier;
  permissions: string[];
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
}

// Subscription tiers for SaaS
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export interface Role {
  _id: string;
  code: string;
  permissions: string[];
  status: boolean;
}

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  statusCode: string;
  message: string;
  data: {
    user: {
      _id: string;
      name: string;
      email: string;
      roles: Role[];
      subscriptionTier: SubscriptionTier;
      profilePicUrl?: string;
    };
    tokens: AuthTokens;
  };
}

export interface AuthMiddlewareOptions {
  secretKey: string;
  algorithms: string[];
  issuer: string;
  audience: string;
  clockTolerance?: number;
}
```

### JSON Web Token Constants

```typescript
export const JsonWebTokenTypes = {
  Jwt: "JWT",
  Jwk: "JWK", 
  Pop: "pop"
} as const;

export type JsonWebTokenTypes = typeof JsonWebTokenTypes[keyof typeof JsonWebTokenTypes];

export const GrantType = {
  IMPLICIT_GRANT: "implicit",
  AUTHORIZATION_CODE_GRANT: "authorization_code",
  CLIENT_CREDENTIALS_GRANT: "client_credentials",
  RESOURCE_OWNER_PASSWORD_GRANT: "password",
  REFRESH_TOKEN_GRANT: "refresh_token",
  DEVICE_CODE_GRANT: "device_code",
  JWT_BEARER: "urn:ietf:params:oauth:grant-type:jwt-bearer"
} as const;

export type GrantType = typeof GrantType[keyof typeof GrantType];
```

## JWT Token Generation

### JWT Service Implementation

```typescript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { promisify } from 'util';

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    issuer: string;
    audience: string;
  }) {
    this.accessTokenSecret = config.accessTokenSecret;
    this.refreshTokenSecret = config.refreshTokenSecret;
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  /**
   * Generate access token with user payload
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      iss: this.issuer,
      aud: this.audience
    };

    return jwt.sign(tokenPayload, this.accessTokenSecret, {
      algorithm: 'HS256'
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenId = crypto.randomBytes(32).toString('hex');
    
    const payload: RefreshTokenPayload = {
      sub: userId,
      tokenId,
      iat: now,
      exp: now + (7 * 24 * 60 * 60) // 7 days
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      algorithm: 'HS256'
    });
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(user: {
    id: string;
    email: string;
    roles: Role[];
    subscriptionTier: SubscriptionTier;
  }): Promise<AuthTokens> {
    const permissions = this.extractPermissions(user.roles);
    
    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles.map(r => r.code),
      permissions,
      subscriptionTier: user.subscriptionTier
    });

    const refreshToken = this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes
    };
  }

  /**
   * Extract permissions from roles
   */
  private extractPermissions(roles: Role[]): string[] {
    const permissions = new Set<string>();
    roles.forEach(role => {
      if (role.status) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    });
    return Array.from(permissions);
  }
}
```

### Token Generation with Custom Claims

```typescript
export class CustomClaimsJWTService extends JWTService {
  /**
   * Generate token with custom claims for subscription features
   */
  generateTokenWithSubscriptionClaims(
    user: any,
    customClaims: Record<string, any> = {}
  ): string {
    const subscriptionClaims = this.getSubscriptionClaims(user.subscriptionTier);
    
    return this.generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r: Role) => r.code),
      permissions: this.extractPermissions(user.roles),
      subscriptionTier: user.subscriptionTier,
      ...subscriptionClaims,
      ...customClaims
    });
  }

  /**
   * Get subscription-specific claims
   */
  private getSubscriptionClaims(tier: SubscriptionTier): Record<string, any> {
    const claims: Record<string, any> = {};

    switch (tier) {
      case SubscriptionTier.FREE:
        claims.apiCallsPerMonth = 1000;
        claims.storageLimit = '100MB';
        claims.features = ['basic_analytics'];
        break;
      case SubscriptionTier.BASIC:
        claims.apiCallsPerMonth = 10000;
        claims.storageLimit = '1GB';
        claims.features = ['basic_analytics', 'email_support'];
        break;
      case SubscriptionTier.PREMIUM:
        claims.apiCallsPerMonth = 100000;
        claims.storageLimit = '10GB';
        claims.features = ['advanced_analytics', 'priority_support', 'custom_integrations'];
        break;
      case SubscriptionTier.ENTERPRISE:
        claims.apiCallsPerMonth = -1; // unlimited
        claims.storageLimit = 'unlimited';
        claims.features = ['enterprise_analytics', 'dedicated_support', 'sso', 'audit_logs'];
        break;
    }

    return claims;
  }
}
```

## JWT Token Validation

### JWT Validation Service

```typescript
export class JWTValidationService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(config: AuthMiddlewareOptions) {
    this.accessTokenSecret = config.secretKey;
    this.refreshTokenSecret = config.secretKey; // In production, use different secrets
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('ACCESS_TOKEN_EXPIRED', 'Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('INVALID_ACCESS_TOKEN', 'Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify and decode refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256']
      }) as RefreshTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('REFRESH_TOKEN_EXPIRED', 'Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('INVALID_REFRESH_TOKEN', 'Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Extract JWT payload without verification (for expired tokens)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}

// Custom Auth Error class
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
```

## Refresh Token Patterns

### Refresh Token Service

```typescript
export class RefreshTokenService {
  constructor(
    private jwtService: JWTService,
    private jwtValidationService: JWTValidationService,
    private tokenRepository: TokenRepository,
    private userService: UserService
  ) {}

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = await this.jwtValidationService.verifyRefreshToken(refreshToken);
    
    // Check if refresh token exists in database (not revoked)
    const storedToken = await this.tokenRepository.findRefreshToken(payload.tokenId);
    if (!storedToken || storedToken.revoked) {
      throw new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or revoked');
    }

    // Get current user data
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new AuthError('USER_NOT_FOUND', 'User not found');
    }

    // Generate new token pair
    const newTokens = await this.jwtService.generateTokenPair(user);

    // Optionally rotate refresh token
    if (this.shouldRotateRefreshToken(storedToken)) {
      await this.tokenRepository.revokeRefreshToken(payload.tokenId);
      // The new refresh token is already generated in generateTokenPair
    }

    // Update last used timestamp
    await this.tokenRepository.updateRefreshTokenLastUsed(payload.tokenId);

    return newTokens;
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const payload = await this.jwtValidationService.verifyRefreshToken(refreshToken);
    await this.tokenRepository.revokeRefreshToken(payload.tokenId);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.revokeAllUserRefreshTokens(userId);
  }

  /**
   * Check if refresh token should be rotated
   */
  private shouldRotateRefreshToken(token: any): boolean {
    const daysSinceIssued = (Date.now() - token.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceIssued > 1; // Rotate if token is older than 1 day
  }
}

// Token Repository Interface
export interface TokenRepository {
  findRefreshToken(tokenId: string): Promise<RefreshTokenRecord | null>;
  saveRefreshToken(token: RefreshTokenRecord): Promise<void>;
  revokeRefreshToken(tokenId: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;
  updateRefreshTokenLastUsed(tokenId: string): Promise<void>;
  cleanupExpiredTokens(): Promise<void>;
}

export interface RefreshTokenRecord {
  id: string;
  tokenId: string;
  userId: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}
```

## Authentication Middleware

### Express.js Authentication Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      session?: UserSession;
    }
  }
}

export class AuthMiddleware {
  constructor(
    private jwtValidationService: JWTValidationService,
    private sessionService: SessionService
  ) {}

  /**
   * Main authentication middleware
   */
  authenticate = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = this.extractTokenFromHeader(req);
        if (!token) {
          return this.unauthorizedResponse(res, 'NO_TOKEN', 'Authentication token required');
        }

        // Verify JWT token
        const payload = await this.jwtValidationService.verifyAccessToken(token);
        
        // Attach user to request
        req.user = payload;

        // Optionally load full session
        const session = await this.sessionService.getSession(payload.sub);
        req.session = session;

        next();
      } catch (error) {
        if (error instanceof AuthError) {
          return this.unauthorizedResponse(res, error.code, error.message);
        }
        return this.unauthorizedResponse(res, 'AUTHENTICATION_ERROR', 'Authentication failed');
      }
    };
  };

  /**
   * Middleware for specific roles
   */
  requireRoles = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.unauthorizedResponse(res, 'NOT_AUTHENTICATED', 'User not authenticated');
      }

      const userRoles = req.user.roles;
      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return this.forbiddenResponse(res, 'INSUFFICIENT_ROLES', 'Insufficient role permissions');
      }

      next();
    };
  };

  /**
   * Middleware for specific permissions
   */
  requirePermissions = (permissions: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.unauthorizedResponse(res, 'NOT_AUTHENTICATED', 'User not authenticated');
      }

      const userPermissions = req.user.permissions;
      const hasPermissions = permissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermissions) {
        return this.forbiddenResponse(res, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions');
      }

      next();
    };
  };

  /**
   * Middleware for subscription tier access
   */
  requireSubscriptionTier = (minimumTier: SubscriptionTier) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.unauthorizedResponse(res, 'NOT_AUTHENTICATED', 'User not authenticated');
      }

      if (!this.hasMinimumSubscriptionTier(req.user.subscriptionTier, minimumTier)) {
        return this.forbiddenResponse(
          res, 
          'SUBSCRIPTION_TIER_INSUFFICIENT', 
          `Requires ${minimumTier} subscription or higher`
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
        const token = this.extractTokenFromHeader(req);
        if (token) {
          const payload = await this.jwtValidationService.verifyAccessToken(token);
          req.user = payload;
        }
      } catch (error) {
        // Silently ignore authentication errors in optional auth
      }
      next();
    };
  };

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
   * Check if user has minimum subscription tier
   */
  private hasMinimumSubscriptionTier(
    userTier: SubscriptionTier, 
    minimumTier: SubscriptionTier
  ): boolean {
    const tierHierarchy = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.BASIC]: 1,
      [SubscriptionTier.PREMIUM]: 2,
      [SubscriptionTier.ENTERPRISE]: 3
    };

    return tierHierarchy[userTier] >= tierHierarchy[minimumTier];
  }

  /**
   * Send unauthorized response
   */
  private unauthorizedResponse(res: Response, code: string, message: string) {
    return res.status(401).json({
      statusCode: '40001',
      error: code,
      message
    });
  }

  /**
   * Send forbidden response
   */
  private forbiddenResponse(res: Response, code: string, message: string) {
    return res.status(403).json({
      statusCode: '40003',
      error: code,
      message
    });
  }
}
```

### Middleware Usage Examples

```typescript
import express from 'express';

const app = express();
const authMiddleware = new AuthMiddleware(jwtValidationService, sessionService);

// Public routes (no authentication)
app.get('/public', (req, res) => {
  res.json({ message: 'Public endpoint' });
});

// Protected routes (authentication required)
app.get('/profile', 
  authMiddleware.authenticate(),
  (req, res) => {
    res.json({ user: req.user });
  }
);

// Role-based protection
app.get('/admin', 
  authMiddleware.authenticate(),
  authMiddleware.requireRoles(['ADMIN', 'SUPER_ADMIN']),
  (req, res) => {
    res.json({ message: 'Admin only endpoint' });
  }
);

// Permission-based protection
app.get('/users',
  authMiddleware.authenticate(),
  authMiddleware.requirePermissions(['read_users', 'manage_users']),
  (req, res) => {
    res.json({ users: [] });
  }
);

// Subscription tier protection
app.get('/premium-features',
  authMiddleware.authenticate(),
  authMiddleware.requireSubscriptionTier(SubscriptionTier.PREMIUM),
  (req, res) => {
    res.json({ features: [] });
  }
);

// Optional authentication
app.get('/content',
  authMiddleware.optionalAuth(),
  (req, res) => {
    const isAuthenticated = !!req.user;
    res.json({ 
      content: isAuthenticated ? 'Premium content' : 'Free content' 
    });
  }
);
```

## User Session Management

### Session Service Implementation

```typescript
export class SessionService {
  constructor(
    private sessionRepository: SessionRepository,
    private userService: UserService
  ) {}

  /**
   * Create user session
   */
  async createSession(user: any, additionalData?: Record<string, any>): Promise<UserSession> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    const session: UserSession = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      subscriptionTier: user.subscriptionTier,
      permissions: this.extractPermissions(user.roles),
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ...additionalData
    };

    await this.sessionRepository.saveSession(session);
    return session;
  }

  /**
   * Get user session
   */
  async getSession(userId: string): Promise<UserSession | null> {
    const session = await this.sessionRepository.findSessionByUserId(userId);
    if (!session) return null;

    // Update last activity
    await this.updateLastActivity(session.sessionId);
    
    return session;
  }

  /**
   * Update session last activity
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    await this.sessionRepository.updateLastActivity(sessionId, new Date());
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await this.sessionRepository.deleteSession(sessionId);
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.deleteAllUserSessions(userId);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const expirationTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours
    await this.sessionRepository.deleteExpiredSessions(expirationTime);
  }

  /**
   * Get active sessions for user
   */
  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    return this.sessionRepository.findActiveSessionsByUserId(userId);
  }

  private extractPermissions(roles: Role[]): string[] {
    const permissions = new Set<string>();
    roles.forEach(role => {
      if (role.status) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    });
    return Array.from(permissions);
  }
}

// Session Repository Interface
export interface SessionRepository {
  saveSession(session: UserSession): Promise<void>;
  findSessionByUserId(userId: string): Promise<UserSession | null>;
  findSessionById(sessionId: string): Promise<UserSession | null>;
  findActiveSessionsByUserId(userId: string): Promise<UserSession[]>;
  updateLastActivity(sessionId: string, lastActivity: Date): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  deleteAllUserSessions(userId: string): Promise<void>;
  deleteExpiredSessions(expirationTime: Date): Promise<void>;
}
```

## Subscription Tier Access Control

### Subscription Authorization Service

```typescript
export class SubscriptionAuthorizationService {
  /**
   * Check if user can access feature based on subscription
   */
  canAccessFeature(userTier: SubscriptionTier, feature: string): boolean {
    const tierFeatures = this.getFeaturesByTier();
    return tierFeatures[userTier]?.includes(feature) || false;
  }

  /**
   * Check API rate limit for subscription tier
   */
  checkApiRateLimit(userTier: SubscriptionTier, currentUsage: number): {
    allowed: boolean;
    limit: number;
    remaining: number;
  } {
    const limits = this.getApiLimitsByTier();
    const limit = limits[userTier];
    
    if (limit === -1) { // Unlimited
      return { allowed: true, limit: -1, remaining: -1 };
    }

    const remaining = Math.max(0, limit - currentUsage);
    return {
      allowed: currentUsage < limit,
      limit,
      remaining
    };
  }

  /**
   * Check storage limit for subscription tier
   */
  checkStorageLimit(userTier: SubscriptionTier, currentUsage: number): {
    allowed: boolean;
    limit: number;
    remaining: number;
  } {
    const limits = this.getStorageLimitsByTier();
    const limit = limits[userTier];
    
    if (limit === -1) { // Unlimited
      return { allowed: true, limit: -1, remaining: -1 };
    }

    const remaining = Math.max(0, limit - currentUsage);
    return {
      allowed: currentUsage < limit,
      limit,
      remaining
    };
  }

  /**
   * Get features by subscription tier
   */
  private getFeaturesByTier(): Record<SubscriptionTier, string[]> {
    return {
      [SubscriptionTier.FREE]: [
        'basic_dashboard',
        'basic_analytics',
        'community_support'
      ],
      [SubscriptionTier.BASIC]: [
        'basic_dashboard',
        'basic_analytics',
        'email_support',
        'data_export',
        'basic_integrations'
      ],
      [SubscriptionTier.PREMIUM]: [
        'basic_dashboard',
        'advanced_dashboard',
        'basic_analytics',
        'advanced_analytics',
        'priority_support',
        'data_export',
        'custom_integrations',
        'webhooks',
        'api_access'
      ],
      [SubscriptionTier.ENTERPRISE]: [
        'basic_dashboard',
        'advanced_dashboard',
        'enterprise_dashboard',
        'basic_analytics',
        'advanced_analytics',
        'enterprise_analytics',
        'dedicated_support',
        'data_export',
        'unlimited_integrations',
        'webhooks',
        'api_access',
        'sso',
        'audit_logs',
        'custom_roles',
        'white_labeling'
      ]
    };
  }

  /**
   * Get API limits by subscription tier (calls per month)
   */
  private getApiLimitsByTier(): Record<SubscriptionTier, number> {
    return {
      [SubscriptionTier.FREE]: 1000,
      [SubscriptionTier.BASIC]: 10000,
      [SubscriptionTier.PREMIUM]: 100000,
      [SubscriptionTier.ENTERPRISE]: -1 // Unlimited
    };
  }

  /**
   * Get storage limits by subscription tier (in bytes)
   */
  private getStorageLimitsByTier(): Record<SubscriptionTier, number> {
    return {
      [SubscriptionTier.FREE]: 100 * 1024 * 1024, // 100MB
      [SubscriptionTier.BASIC]: 1024 * 1024 * 1024, // 1GB
      [SubscriptionTier.PREMIUM]: 10 * 1024 * 1024 * 1024, // 10GB
      [SubscriptionTier.ENTERPRISE]: -1 // Unlimited
    };
  }
}

// Subscription middleware
export const requireFeature = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const authService = new SubscriptionAuthorizationService();
    const canAccess = authService.canAccessFeature(req.user.subscriptionTier, feature);

    if (!canAccess) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        message: `Feature '${feature}' not available in your subscription plan`,
        requiredTier: getMinimumTierForFeature(feature)
      });
    }

    next();
  };
};

// Rate limiting middleware
export const checkApiRateLimit = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const authService = new SubscriptionAuthorizationService();
    
    // Get current usage (implement based on your tracking system)
    const currentUsage = await getCurrentApiUsage(req.user.sub);
    
    const rateLimit = authService.checkApiRateLimit(req.user.subscriptionTier, currentUsage);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded',
        limit: rateLimit.limit,
        current: currentUsage
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': getNextResetTime().toString()
    });

    next();
  };
};

// Helper functions (implement based on your system)
async function getCurrentApiUsage(userId: string): Promise<number> {
  // Implement API usage tracking
  return 0;
}

function getNextResetTime(): number {
  // Return timestamp of next monthly reset
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.floor(nextMonth.getTime() / 1000);
}

function getMinimumTierForFeature(feature: string): SubscriptionTier {
  // Implementation to find minimum tier for a feature
  return SubscriptionTier.BASIC;
}
```

## Complete Implementation Examples

### Complete Auth Controller

```typescript
export class AuthController {
  constructor(
    private jwtService: JWTService,
    private jwtValidationService: JWTValidationService,
    private refreshTokenService: RefreshTokenService,
    private sessionService: SessionService,
    private userService: UserService,
    private passwordService: PasswordService
  ) {}

  /**
   * User login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Validate user credentials
      const user = await this.userService.findByEmail(email);
      if (!user || !await this.passwordService.verify(password, user.passwordHash)) {
        res.status(401).json({
          statusCode: '40001',
          message: 'Invalid credentials'
        });
        return;
      }

      // Generate tokens
      const tokens = await this.jwtService.generateTokenPair(user);

      // Create session
      const session = await this.sessionService.createSession(user);

      // Response
      const response: LoginResponse = {
        statusCode: '10000',
        message: 'Login successful',
        data: {
          user: {
            _id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            subscriptionTier: user.subscriptionTier,
            profilePicUrl: user.profilePicUrl
          },
          tokens
        }
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        statusCode: '50001',
        message: 'Login failed'
      });
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          statusCode: '40001',
          message: 'Refresh token required'
        });
        return;
      }

      const tokens = await this.refreshTokenService.refreshAccessToken(refreshToken);

      res.json({
        statusCode: '10000',
        message: 'Token refreshed successfully',
        data: { tokens }
      });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          statusCode: '40001',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        statusCode: '50001',
        message: 'Token refresh failed'
      });
    }
  }

  /**
   * Logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        await this.refreshTokenService.revokeRefreshToken(refreshToken);
      }

      if (req.session) {
        await this.sessionService.invalidateSession(req.session.sessionId);
      }

      res.json({
        statusCode: '10000',
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        statusCode: '50001',
        message: 'Logout failed'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          statusCode: '40001',
          message: 'User not authenticated'
        });
        return;
      }

      const user = await this.userService.findById(req.user.sub);
      if (!user) {
        res.status(404).json({
          statusCode: '40004',
          message: 'User not found'
        });
        return;
      }

      res.json({
        statusCode: '10000',
        message: 'success',
        data: {
          name: user.name,
          email: user.email,
          profilePicUrl: user.profilePicUrl,
          roles: user.roles,
          subscriptionTier: user.subscriptionTier
        }
      });
    } catch (error) {
      res.status(500).json({
        statusCode: '50001',
        message: 'Failed to get profile'
      });
    }
  }
}
```

### Route Configuration with Middleware

```typescript
import express from 'express';

export function configureAuthRoutes(
  authController: AuthController,
  authMiddleware: AuthMiddleware
): express.Router {
  const router = express.Router();

  // Public routes
  router.post('/login', authController.login.bind(authController));
  router.post('/signup', authController.signup.bind(authController));
  router.post('/refresh-token', authController.refreshToken.bind(authController));

  // Protected routes
  router.post('/logout', 
    authMiddleware.authenticate(),
    authController.logout.bind(authController)
  );

  router.get('/profile', 
    authMiddleware.authenticate(),
    authController.getProfile.bind(authController)
  );

  // Admin routes
  router.get('/admin/users',
    authMiddleware.authenticate(),
    authMiddleware.requireRoles(['ADMIN']),
    authController.getUsers.bind(authController)
  );

  // Premium feature routes
  router.get('/analytics/advanced',
    authMiddleware.authenticate(),
    requireFeature('advanced_analytics'),
    authController.getAdvancedAnalytics.bind(authController)
  );

  // API with rate limiting
  router.get('/api/data',
    authMiddleware.authenticate(),
    checkApiRateLimit(),
    authController.getData.bind(authController)
  );

  return router;
}
```

This comprehensive guide provides all the essential JWT authentication patterns for TypeScript SaaS applications, including token generation, validation, refresh patterns, middleware implementation, session management, and subscription-based access control. The patterns are production-ready and include proper error handling, security considerations, and scalability features.