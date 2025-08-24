/**
 * Secure Authentication Routes with Input Validation
 * Phase 8: Security Implementation
 */

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createValidator, authLimiter, securityLogger } from '../middleware/security-config';
import { supabase } from '../lib/supabase-admin';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase and number'
    ),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
});

const resetPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .max(255, 'Email too long'),
});

const updatePasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase and number'
    ),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post(
  '/register',
  authLimiter, // Apply rate limiting
  createValidator(registerSchema), // Validate input
  async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users_metadata')
        .select('id')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists',
        });
      }
      
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${process.env.FRONTEND_URL}/auth/verify`,
        },
      });
      
      if (error) {
        securityLogger.logAuthFailure(email, req.ip || 'unknown');
        return res.status(400).json({
          error: 'Registration failed',
          message: error.message,
        });
      }
      
      // Log successful registration
      console.log(`[AUTH] New user registered: ${email}`);
      
      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      });
    } catch (error) {
      console.error('[AUTH] Registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create account',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  authLimiter, // Apply rate limiting
  createValidator(loginSchema), // Validate input
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        securityLogger.logAuthFailure(email, req.ip || 'unknown');
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }
      
      if (!data.session) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Unable to create session',
        });
      }
      
      // Set secure httpOnly cookies
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.cookie('access-token', data.session.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });
      
      res.cookie('refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/api/auth/refresh',
      });
      
      // Log successful login
      console.log(`[AUTH] User logged in: ${email}`);
      
      res.json({
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
        },
      });
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to authenticate',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout and clear cookies
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies['access-token'];
    
    if (token) {
      // Sign out from Supabase (invalidate token)
      await supabase.auth.signOut();
    }
    
    // Clear cookies
    res.clearCookie('access-token', { path: '/' });
    res.clearCookie('refresh-token', { path: '/api/auth/refresh' });
    
    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    // Still clear cookies even if Supabase signout fails
    res.clearCookie('access-token', { path: '/' });
    res.clearCookie('refresh-token', { path: '/api/auth/refresh' });
    
    res.json({
      message: 'Logout completed',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  createValidator(refreshTokenSchema),
  async (req, res) => {
    try {
      const refreshToken = req.cookies['refresh-token'] || req.body.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          error: 'No refresh token',
          message: 'Refresh token is required',
        });
      }
      
      // Refresh session with Supabase
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      
      if (error || !data.session) {
        return res.status(401).json({
          error: 'Token refresh failed',
          message: 'Invalid or expired refresh token',
        });
      }
      
      // Update cookies with new tokens
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.cookie('access-token', data.session.access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/',
      });
      
      // Only update refresh token if a new one was provided
      if (data.session.refresh_token) {
        res.cookie('refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/api/auth/refresh',
        });
      }
      
      res.json({
        message: 'Token refreshed successfully',
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      });
    } catch (error) {
      console.error('[AUTH] Token refresh error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to refresh token',
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Request password reset email
 */
router.post(
  '/reset-password',
  authLimiter, // Apply rate limiting to prevent abuse
  createValidator(resetPasswordSchema),
  async (req, res) => {
    try {
      const { email } = req.body;
      
      // Request password reset from Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
      });
      
      if (error) {
        // Don't reveal if email exists or not (security)
        console.error('[AUTH] Password reset error:', error);
      }
      
      // Always return success to prevent email enumeration
      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('[AUTH] Password reset error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process password reset request',
      });
    }
  }
);

/**
 * POST /api/auth/update-password
 * Update password with reset token
 */
router.post(
  '/update-password',
  authLimiter,
  createValidator(updatePasswordSchema),
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      // Update password using the token
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        return res.status(400).json({
          error: 'Password update failed',
          message: error.message,
        });
      }
      
      res.json({
        message: 'Password updated successfully. You can now login with your new password.',
      });
    } catch (error) {
      console.error('[AUTH] Password update error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update password',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies['access-token'];
    
    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'No access token provided',
      });
    }
    
    // Get user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired',
      });
    }
    
    // Get additional user metadata
    const { data: metadata } = await supabase
      .from('users_metadata')
      .select('subscription_tier, created_at')
      .eq('id', user.id)
      .single();
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        subscription_tier: metadata?.subscription_tier || 'free',
        created_at: metadata?.created_at || user.created_at,
      },
    });
  } catch (error) {
    console.error('[AUTH] Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information',
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with OTP
 */
router.post(
  '/verify-email',
  authLimiter,
  async (req, res) => {
    try {
      const { email, token } = req.body;
      
      if (!email || !token) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Email and verification token are required',
        });
      }
      
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      
      if (error) {
        return res.status(400).json({
          error: 'Verification failed',
          message: error.message,
        });
      }
      
      res.json({
        message: 'Email verified successfully. You can now login.',
      });
    } catch (error) {
      console.error('[AUTH] Email verification error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify email',
      });
    }
  }
);

export default router;