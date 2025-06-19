// Authentication and authorization types for Alfalyzer

export type SubscriptionTier = 'free' | 'pro' | 'premium';

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: SubscriptionTier;
  whop_user_id?: string;
  roles: UserRole[];
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  last_activity: Date;
  expires_at: Date;
  active: boolean;
}

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  permissions: string[];
  subscriptionTier: SubscriptionTier;
  whopUserId?: string;
  iat: number; // Issued at
  exp: number; // Expires at
  iss: string; // Issuer
  aud: string; // Audience
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  statusCode: string;
  message: string;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      roles: UserRole[];
      subscriptionTier: SubscriptionTier;
      profilePicUrl?: string;
    };
    tokens: AuthTokens;
  };
}

// Financial application specific permissions
export const FINANCIAL_PERMISSIONS = {
  // Basic permissions
  READ_STOCKS: 'read:stocks',
  READ_BASIC_ANALYSIS: 'read:basic_analysis',
  
  // Pro permissions
  READ_ADVANCED_ANALYSIS: 'read:advanced_analysis',
  CREATE_WATCHLISTS: 'create:watchlists',
  EXPORT_DATA: 'export:data',
  
  // Premium permissions
  READ_INTRINSIC_VALUES: 'read:intrinsic_values',
  CREATE_INTRINSIC_VALUES: 'create:intrinsic_values',
  UNLIMITED_API_CALLS: 'unlimited:api_calls',
  REAL_TIME_DATA: 'access:real_time_data',
  
  // Administrative permissions
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_ANALYTICS: 'admin:analytics',
} as const;

// Subscription tier feature mapping
export const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, string[]> = {
  'free': [
    FINANCIAL_PERMISSIONS.READ_STOCKS,
    FINANCIAL_PERMISSIONS.READ_BASIC_ANALYSIS,
  ],
  'pro': [
    FINANCIAL_PERMISSIONS.READ_STOCKS,
    FINANCIAL_PERMISSIONS.READ_BASIC_ANALYSIS,
    FINANCIAL_PERMISSIONS.READ_ADVANCED_ANALYSIS,
    FINANCIAL_PERMISSIONS.CREATE_WATCHLISTS,
    FINANCIAL_PERMISSIONS.EXPORT_DATA,
  ],
  'premium': [
    FINANCIAL_PERMISSIONS.READ_STOCKS,
    FINANCIAL_PERMISSIONS.READ_BASIC_ANALYSIS,
    FINANCIAL_PERMISSIONS.READ_ADVANCED_ANALYSIS,
    FINANCIAL_PERMISSIONS.CREATE_WATCHLISTS,
    FINANCIAL_PERMISSIONS.EXPORT_DATA,
    FINANCIAL_PERMISSIONS.READ_INTRINSIC_VALUES,
    FINANCIAL_PERMISSIONS.CREATE_INTRINSIC_VALUES,
    FINANCIAL_PERMISSIONS.UNLIMITED_API_CALLS,
    FINANCIAL_PERMISSIONS.REAL_TIME_DATA,
  ],
};

// API rate limits per subscription tier
export const API_RATE_LIMITS: Record<SubscriptionTier, {
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}> = {
  'free': {
    requestsPerHour: 100,
    requestsPerDay: 1000,
    burstLimit: 10,
  },
  'pro': {
    requestsPerHour: 1000,
    requestsPerDay: 15000,
    burstLimit: 50,
  },
  'premium': {
    requestsPerHour: 5000,
    requestsPerDay: 100000,
    burstLimit: 200,
  },
};

// Whop integration types
export interface WhopUser {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface WhopAccessCheck {
  hasAccess: boolean;
  accessLevel: 'none' | 'member' | 'admin';
  experienceId?: string;
  companyId?: string;
}

// Security and compliance types
export interface SecurityLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  success: boolean;
  details?: Record<string, any>;
}

export interface DataAccessLog {
  id: string;
  user_id: string;
  data_type: 'stock_data' | 'financial_metrics' | 'user_data' | 'analysis_results';
  resource_id: string;
  access_type: 'read' | 'write' | 'delete' | 'export';
  timestamp: Date;
  ip_address: string;
  user_agent: string;
}

// Financial data compliance types
export interface FinancialDataAccess {
  user_id: string;
  data_source: 'alpha_vantage' | 'finnhub' | 'internal';
  symbols_accessed: string[];
  data_types: string[];
  access_timestamp: Date;
  subscription_tier: SubscriptionTier;
  rate_limit_remaining: number;
}

// Error types for authentication
export class AuthenticationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 403,
    public requiredPermissions?: string[],
    public userPermissions?: string[]
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public limit: number,
    public current: number,
    public resetTime: Date,
    public statusCode: number = 429
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}