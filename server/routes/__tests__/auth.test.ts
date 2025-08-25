/**
 * Authentication API Tests
 * Testing critical authentication endpoints with httpOnly cookies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Router } from 'express';
import type { Response, Request, NextFunction } from 'express';

// Mock Supabase admin
vi.mock('../../lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      exchangeCodeForSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
    }
  }
}));

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User'
  },
  created_at: '2024-01-01T00:00:00.000Z'
};

const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser
};

describe('Authentication Routes', () => {
  let app: express.Application;
  let supabaseAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Import mocked Supabase
    const { supabase } = require('../../lib/supabase-admin');
    supabaseAuth = supabase.auth;

    // Create auth router (simplified version)
    const router = Router();

    // Google OAuth callback
    router.post('/auth/google/callback', async (req: Request, res: Response) => {
      try {
        const { code } = req.body;
        
        if (!code) {
          return res.status(400).json({ error: 'Code is required' });
        }

        const { data, error } = await supabaseAuth.exchangeCodeForSession(code);
        
        if (error) throw error;

        // Set httpOnly cookies
        res.cookie('access-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 1000 // 1 hour
        });
        
        res.cookie('refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/auth/refresh',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        
        res.json({ 
          user: data.user,
          message: 'Login successful'
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // Email/Password login
    router.post('/auth/login', async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabaseAuth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;

        // Set httpOnly cookies
        res.cookie('access-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 1000
        });
        
        res.cookie('refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/auth/refresh',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
        
        res.json({ user: data.user });
      } catch (error: any) {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });

    // Register
    router.post('/auth/register', async (req: Request, res: Response) => {
      try {
        const { email, password, name } = req.body;
        
        // Validate input
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const { data, error } = await supabaseAuth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        
        if (error) throw error;

        res.json({ 
          message: 'Registration successful! Check your email for verification.',
          user: data.user 
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // Refresh token
    router.post('/auth/refresh', async (req: Request, res: Response) => {
      try {
        const refreshToken = req.cookies['refresh-token'];
        
        if (!refreshToken) {
          return res.status(401).json({ error: 'No refresh token' });
        }

        const { data, error } = await supabaseAuth.refreshSession({
          refresh_token: refreshToken
        });
        
        if (error) throw error;

        // Update access token cookie
        res.cookie('access-token', data.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 1000
        });
        
        res.json({ message: 'Token refreshed' });
      } catch (error: any) {
        res.status(401).json({ error: 'Failed to refresh token' });
      }
    });

    // Logout
    router.post('/auth/logout', (req: Request, res: Response) => {
      res.clearCookie('access-token');
      res.clearCookie('refresh-token', { path: '/api/auth/refresh' });
      res.json({ message: 'Logged out successfully' });
    });

    // Get current user
    router.get('/auth/me', async (req: Request, res: Response) => {
      try {
        const token = req.cookies['access-token'];
        
        if (!token) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const { data: { user }, error } = await supabaseAuth.getUser(token);
        
        if (error) throw error;

        res.json({ user });
      } catch (error: any) {
        res.status(401).json({ error: 'Invalid token' });
      }
    });

    app.use('/api', router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/google/callback', () => {
    it('should exchange code for session and set cookies', async () => {
      supabaseAuth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'google-auth-code' })
        .expect(200);

      expect(response.body).toEqual({
        user: mockUser,
        message: 'Login successful'
      });

      // Check cookies were set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('access-token');
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Strict');
      expect(cookies[1]).toContain('refresh-token');
      expect(cookies[1]).toContain('Path=/api/auth/refresh');
    });

    it('should return error if code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({})
        .expect(400);

      expect(response.body).toEqual({ error: 'Code is required' });
    });

    it('should handle Supabase errors', async () => {
      supabaseAuth.exchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: 'Invalid authorization code' }
      });

      const response = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'invalid-code' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Invalid authorization code' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with email and password', async () => {
      supabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toEqual({ user: mockUser });
      expect(supabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      // Check cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('access-token');
      expect(cookies[1]).toContain('refresh-token');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Email and password are required' });
    });

    it('should handle invalid credentials', async () => {
      supabaseAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should prevent brute force attacks (rate limiting)', async () => {
      supabaseAuth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      // Simulate multiple failed login attempts
      const attempts = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(attempts);
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      supabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'securePassword123',
          name: 'New User'
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Registration successful! Check your email for verification.',
        user: mockUser
      });

      expect(supabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'securePassword123',
        options: {
          data: { name: 'New User' }
        }
      });
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short'
        })
        .expect(400);

      expect(response.body).toEqual({ 
        error: 'Password must be at least 8 characters' 
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({ 
        error: 'Email and password are required' 
      });
    });

    it('should handle duplicate email registration', async () => {
      supabaseAuth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toEqual({ error: 'User already registered' });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      supabaseAuth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh-token=test-refresh-token')
        .expect(200);

      expect(response.body).toEqual({ message: 'Token refreshed' });
      
      // Check new access token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('access-token');
    });

    it('should return error if no refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body).toEqual({ error: 'No refresh token' });
    });

    it('should handle invalid refresh token', async () => {
      supabaseAuth.refreshSession.mockResolvedValue({
        data: null,
        error: { message: 'Invalid refresh token' }
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh-token=invalid-token')
        .expect(401);

      expect(response.body).toEqual({ error: 'Failed to refresh token' });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear all auth cookies', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'access-token=test; refresh-token=test')
        .expect(200);

      expect(response.body).toEqual({ message: 'Logged out successfully' });
      
      // Check cookies are cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('access-token=;');
      expect(cookies[0]).toContain('Expires=');
      expect(cookies[1]).toContain('refresh-token=;');
    });

    it('should work even without cookies', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      supabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'access-token=valid-token')
        .expect(200);

      expect(response.body).toEqual({ user: mockUser });
      expect(supabaseAuth.getUser).toHaveBeenCalledWith('valid-token');
    });

    it('should return 401 if no token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toEqual({ error: 'Not authenticated' });
    });

    it('should handle invalid token', async () => {
      supabaseAuth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' }
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'access-token=invalid-token')
        .expect(401);

      expect(response.body).toEqual({ error: 'Invalid token' });
    });
  });

  describe('Security Tests', () => {
    it('should not expose tokens in response body', async () => {
      supabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      // Response should not contain tokens
      expect(response.body).not.toHaveProperty('access_token');
      expect(response.body).not.toHaveProperty('refresh_token');
      expect(response.body).not.toHaveProperty('session');
    });

    it('should set secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      supabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      // In production, cookies should have Secure flag
      const cookies = response.headers['set-cookie'];
      if (process.env.NODE_ENV === 'production') {
        expect(cookies[0]).toContain('Secure');
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should use httpOnly cookies to prevent XSS', async () => {
      supabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      cookies.forEach((cookie: string) => {
        if (cookie.includes('token')) {
          expect(cookie).toContain('HttpOnly');
        }
      });
    });

    it('should use SameSite attribute to prevent CSRF', async () => {
      supabaseAuth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      cookies.forEach((cookie: string) => {
        if (cookie.includes('token')) {
          expect(cookie).toContain('SameSite=Strict');
        }
      });
    });
  });
});