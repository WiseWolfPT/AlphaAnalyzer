import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { sessionManager } from '../lib/session-manager';
import { db, auth } from '../lib/supabase';
import { 
  AuthTokens, 
  LoginRequest, 
  LoginResponse, 
  SubscriptionTier,
  FINANCIAL_PERMISSIONS,
  SUBSCRIPTION_FEATURES 
} from '../types/auth';

const router = Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimitMiddleware.endpointRateLimit('/api/auth', {
  'free': 10,    // 10 attempts per hour for unauthenticated users
  'pro': 20,
  'premium': 30,
});

/**
 * Login endpoint with enhanced security
 */
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe }: LoginRequest & { rememberMe?: boolean } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIALS',
        message: 'Email and password are required',
      });
    }

    // Attempt Supabase authentication
    const { data: authData, error: authError } = await auth.signIn(email, password);
    
    if (authError || !authData.user) {
      // Log failed authentication attempt
      await db.logSecurityEvent({
        user_id: email, // Use email since we don't have user ID
        action: 'login_failed',
        resource: 'authentication',
        ip_address: req.ip || '',
        user_agent: req.headers['user-agent'] || '',
        success: false,
        details: { 
          error: authError?.message,
          email: email.substring(0, 3) + '***' // Partial email for security
        },
      });

      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Get user profile with roles and permissions
    const userProfile = await db.getProfile(authData.user.id);
    
    if (!userProfile) {
      return res.status(404).json({
        error: 'USER_PROFILE_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(userProfile);
    const refreshToken = generateRefreshToken(userProfile.id);
    
    // Create session
    const session = await sessionManager.createSession(
      userProfile.id,
      req.ip || '',
      req.headers['user-agent'] || '',
      { loginMethod: 'email_password', rememberMe }
    );

    if (!session) {
      return res.status(500).json({
        error: 'SESSION_CREATION_FAILED',
        message: 'Failed to create session',
      });
    }

    // Set session cookie
    const sessionCookieOptions = sessionManager.getSessionCookieOptions();
    if (rememberMe) {
      sessionCookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }
    
    res.cookie('alfalyzer_session', session.session_token, sessionCookieOptions);

    // Log successful authentication
    await db.logSecurityEvent({
      user_id: userProfile.id,
      action: 'login_success',
      resource: 'authentication',
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      success: true,
      details: { 
        sessionId: session.id,
        subscriptionTier: userProfile.subscription_tier,
        rememberMe: rememberMe || false
      },
    });

    const response: LoginResponse = {
      statusCode: '200',
      message: 'Login successful',
      data: {
        user: {
          id: userProfile.id,
          name: userProfile.full_name || 'User',
          email: userProfile.email,
          roles: userProfile.roles || [],
          subscriptionTier: userProfile.subscription_tier as SubscriptionTier,
          profilePicUrl: userProfile.avatar_url,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60, // 15 minutes
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'LOGIN_ERROR',
      message: 'An error occurred during login',
    });
  }
});

/**
 * Register endpoint with subscription tier assignment
 */
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { name, email, password, subscriptionTier = 'free' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Name, email, and password are required',
      });
    }

    // Validate subscription tier
    const validTiers: SubscriptionTier[] = ['free', 'pro', 'premium'];
    if (!validTiers.includes(subscriptionTier)) {
      return res.status(400).json({
        error: 'INVALID_SUBSCRIPTION_TIER',
        message: 'Invalid subscription tier',
      });
    }

    // Attempt Supabase registration
    const { data: authData, error: authError } = await auth.signUp(email, password, {
      full_name: name,
    });

    if (authError) {
      return res.status(400).json({
        error: 'REGISTRATION_FAILED',
        message: authError.message,
      });
    }

    if (!authData.user) {
      return res.status(400).json({
        error: 'REGISTRATION_FAILED',
        message: 'User registration failed',
      });
    }

    // Create user profile
    const profileData = {
      id: authData.user.id,
      email,
      full_name: name,
      subscription_tier: subscriptionTier,
      roles: [], // Default to no roles, assign as needed
    };

    const { data: profile, error: profileError } = await db.createProfile(profileData);

    if (profileError || !profile) {
      return res.status(500).json({
        error: 'PROFILE_CREATION_FAILED',
        message: 'Failed to create user profile',
      });
    }

    // Log successful registration
    await db.logSecurityEvent({
      user_id: profile.id,
      action: 'user_registered',
      resource: 'user_account',
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      success: true,
      details: { 
        subscriptionTier,
        registrationMethod: 'email_password'
      },
    });

    res.status(201).json({
      statusCode: '201',
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        userId: profile.id,
        email: profile.email,
        subscriptionTier: profile.subscription_tier,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'REGISTRATION_ERROR',
      message: 'An error occurred during registration',
    });
  }
});

/**
 * Logout endpoint with session cleanup
 */
router.post('/logout', authMiddleware.authenticate(), async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies?.alfalyzer_session;
    
    if (sessionToken) {
      // Find and invalidate session
      const session = await db.getSession(sessionToken);
      if (session) {
        await sessionManager.invalidateSession(session.id);
        
        // Log logout
        await db.logSecurityEvent({
          user_id: req.user!.id,
          action: 'logout',
          resource: 'authentication',
          ip_address: req.ip || '',
          user_agent: req.headers['user-agent'] || '',
          success: true,
          details: { sessionId: session.id },
        });
      }
    }

    // Clear session cookie
    res.clearCookie('alfalyzer_session');

    res.json({
      statusCode: '200',
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'LOGOUT_ERROR',
      message: 'An error occurred during logout',
    });
  }
});

/**
 * Get current user profile
 */
router.get('/me', authMiddleware.authenticate(), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    
    // Get fresh user profile data
    const profile = await db.getProfile(user.id);
    
    if (!profile) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    // Get user permissions based on subscription tier
    const permissions = SUBSCRIPTION_FEATURES[user.subscriptionTier] || [];

    res.json({
      statusCode: '200',
      message: 'User profile retrieved successfully',
      data: {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        avatar: profile.avatar_url,
        subscriptionTier: profile.subscription_tier,
        roles: profile.roles || [],
        permissions,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'PROFILE_ERROR',
      message: 'Failed to retrieve user profile',
    });
  }
});

/**
 * Update subscription tier (admin only)
 */
router.put('/subscription/:userId', 
  authMiddleware.authenticate(),
  authMiddleware.requirePermissions(['admin:users']),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { subscriptionTier }: { subscriptionTier: SubscriptionTier } = req.body;

      const validTiers: SubscriptionTier[] = ['free', 'pro', 'premium'];
      if (!validTiers.includes(subscriptionTier)) {
        return res.status(400).json({
          error: 'INVALID_SUBSCRIPTION_TIER',
          message: 'Invalid subscription tier',
        });
      }

      const { data: updatedProfile, error } = await db.updateUserSubscription(userId, subscriptionTier);

      if (error || !updatedProfile) {
        return res.status(500).json({
          error: 'UPDATE_FAILED',
          message: 'Failed to update subscription tier',
        });
      }

      // Log subscription change
      await db.logSecurityEvent({
        user_id: req.user!.id,
        action: 'subscription_updated',
        resource: 'user_subscription',
        ip_address: req.ip || '',
        user_agent: req.headers['user-agent'] || '',
        success: true,
        details: { 
          targetUserId: userId,
          newSubscriptionTier: subscriptionTier,
          adminId: req.user!.id
        },
      });

      res.json({
        statusCode: '200',
        message: 'Subscription tier updated successfully',
        data: {
          userId: updatedProfile.id,
          subscriptionTier: updatedProfile.subscription_tier,
        },
      });
    } catch (error) {
      console.error('Subscription update error:', error);
      res.status(500).json({
        error: 'SUBSCRIPTION_UPDATE_ERROR',
        message: 'Failed to update subscription tier',
      });
    }
  }
);

/**
 * Get user's active sessions
 */
router.get('/sessions', authMiddleware.authenticate(), async (req: Request, res: Response) => {
  try {
    const sessions = await sessionManager.getUserActiveSessions(req.user!.id);
    
    res.json({
      statusCode: '200',
      message: 'Active sessions retrieved successfully',
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          ipAddress: session.ip_address,
          userAgent: session.user_agent,
          createdAt: session.created_at,
          lastActivity: session.last_activity,
          expiresAt: session.expires_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'SESSIONS_ERROR',
      message: 'Failed to retrieve active sessions',
    });
  }
});

/**
 * Revoke all sessions except current
 */
router.post('/sessions/revoke-all', authMiddleware.authenticate(), async (req: Request, res: Response) => {
  try {
    const currentSessionToken = req.cookies?.alfalyzer_session;
    let currentSessionId: string | undefined;

    if (currentSessionToken) {
      const currentSession = await db.getSession(currentSessionToken);
      currentSessionId = currentSession?.id;
    }

    const success = await sessionManager.invalidateAllUserSessions(req.user!.id, currentSessionId);

    if (!success) {
      return res.status(500).json({
        error: 'REVOKE_FAILED',
        message: 'Failed to revoke sessions',
      });
    }

    // Log session revocation
    await db.logSecurityEvent({
      user_id: req.user!.id,
      action: 'sessions_revoked',
      resource: 'user_sessions',
      ip_address: req.ip || '',
      user_agent: req.headers['user-agent'] || '',
      success: true,
      details: { 
        exceptSessionId: currentSessionId,
        reason: 'user_requested'
      },
    });

    res.json({
      statusCode: '200',
      message: 'All sessions revoked successfully',
    });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    res.status(500).json({
      error: 'REVOKE_SESSIONS_ERROR',
      message: 'Failed to revoke sessions',
    });
  }
});

/**
 * Helper function to generate access token
 */
function generateAccessToken(user: any): string {
  const payload = {
    sub: user.id,
    email: user.email,
    roles: (user.roles || []).map((r: any) => r.name),
    permissions: SUBSCRIPTION_FEATURES[user.subscription_tier as SubscriptionTier] || [],
    subscriptionTier: user.subscription_tier,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    iss: 'alfalyzer-api',
    aud: 'alfalyzer-app',
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'fallback-secret');
}

/**
 * Helper function to generate refresh token
 */
function generateRefreshToken(userId: string): string {
  const payload = {
    sub: userId,
    tokenId: require('crypto').randomBytes(32).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback-secret');
}

export default router;