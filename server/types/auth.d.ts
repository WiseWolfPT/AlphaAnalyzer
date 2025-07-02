// Authentication Types

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  metadata?: Record<string, any>;
}

export interface SessionData {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthError {
  error: string;
  message: string;
  code?: string;
  statusCode?: number;
}

export type UserRole = 'user' | 'admin' | 'moderator' | 'premium';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: string[];
}

// Supabase Auth Types Extension
export interface SupabaseAuthUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  app_metadata: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };
  user_metadata: {
    [key: string]: any;
  };
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: SupabaseAuthUser;
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireRoles?: UserRole[];
  requirePermissions?: string[];
  allowExpired?: boolean;
}

// Express Request Extension
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
      session?: SessionData;
    }
  }
}