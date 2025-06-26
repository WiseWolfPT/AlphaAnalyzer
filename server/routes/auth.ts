import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // Importar crypto no topo do arquivo para evitar require() dinâmico
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { sessionManager } from '../lib/session-manager';
import { db, auth } from '../lib/supabase';
import { validationSchemas } from '../security/security-middleware'; // Importar esquemas de validação
import { 
  AuthTokens, 
  LoginRequest, 
  LoginResponse, 
  SubscriptionTier,
  FINANCIAL_PERMISSIONS,
  SUBSCRIPTION_FEATURES 
} from '../types/auth';

const router = Router();

// Verificar se as variáveis de ambiente críticas estão definidas
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('CRITICAL: JWT secrets not configured. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.');
}

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

    // Validação de entrada com schema
    if (!email || !password) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIALS',
        message: 'Email and password are required',
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Invalid email format',
      });
    }

    // Sanitizar entrada
    const sanitizedEmail = email.toLowerCase().trim();

    // Attempt Supabase authentication
    const { data: authData, error: authError } = await auth.signIn(sanitizedEmail, password);
    
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

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Invalid email format',
      });
    }

    // Validar complexidade da senha
    if (password.length < 8) {
      return res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long',
      });
    }

    // Validar que a senha contém pelo menos um número e uma letra
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      return res.status(400).json({
        error: 'WEAK_PASSWORD',
        message: 'Password must contain at least one letter and one number',
      });
    }

    // Sanitizar entradas
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedName = name.trim();

    // Validate subscription tier
    const validTiers: SubscriptionTier[] = ['free', 'pro', 'premium'];
    if (!validTiers.includes(subscriptionTier)) {
      return res.status(400).json({
        error: 'INVALID_SUBSCRIPTION_TIER',
        message: 'Invalid subscription tier',
      });
    }

    // Attempt Supabase registration
    const { data: authData, error: authError } = await auth.signUp(sanitizedEmail, password, {
      full_name: sanitizedName,
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
      email: sanitizedEmail,
      full_name: sanitizedName,
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
router.post('/logout', authMiddleware.instance.authenticate(), async (req: Request, res: Response) => {
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
router.get('/me', authMiddleware.instance.authenticate(), async (req: Request, res: Response) => {
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
  authMiddleware.instance.authenticate(),
  authMiddleware.instance.requirePermissions(['admin:users']),
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
router.get('/sessions', authMiddleware.instance.authenticate(), async (req: Request, res: Response) => {
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
 * Refresh token endpoint
 */
router.post('/refresh', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'MISSING_REFRESH_TOKEN',
        message: 'Refresh token is required',
      });
    }

    // Verificar e decodificar o refresh token
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, secret);
    } catch (error) {
      return res.status(401).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    // Buscar o usuário
    const userProfile = await db.getProfile(decoded.sub);
    if (!userProfile) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Gerar novos tokens
    const newAccessToken = generateAccessToken(userProfile);
    const newRefreshToken = generateRefreshToken(userProfile.id);

    res.json({
      statusCode: '200',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60, // 15 minutes
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'REFRESH_TOKEN_ERROR',
      message: 'Failed to refresh token',
    });
  }
});

/**
 * Revoke all sessions except current
 */
router.post('/sessions/revoke-all', authMiddleware.instance.authenticate(), async (req: Request, res: Response) => {
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
  // Garantir que temos a secret (já verificada no início do arquivo)
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET not configured');
  }

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

  return jwt.sign(payload, secret);
}

/**
 * Helper function to generate refresh token
 */
function generateRefreshToken(userId: string): string {
  // Garantir que temos a secret (já verificada no início do arquivo)
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  const payload = {
    sub: userId,
    tokenId: crypto.randomBytes(32).toString('hex'), // Usar crypto importado no topo
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };

  return jwt.sign(payload, secret);
}

export default router;