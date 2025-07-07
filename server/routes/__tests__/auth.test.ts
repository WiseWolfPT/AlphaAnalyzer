/**
 * ALFALYZER - AUTH ROUTES TESTS
 * Testes de integração para endpoints de autenticação
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import { authRouter } from '../auth';
import { supabase } from '../../lib/supabase';
import { authMiddleware } from '../../middleware/auth-middleware';

// Mock do Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock do middleware de autenticação
vi.mock('../../middleware/auth', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }),
}));

// Configurar Express app para testes
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('deve registrar novo usuário com sucesso', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        user_metadata: { name: 'New User' },
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValueOnce({
          data: { id: 'profile-id' },
          error: null,
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('deve validar campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // missing name and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('deve validar formato de email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
    });

    it('deve validar força da senha', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });

    it('deve lidar com erro de email duplicado', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        user_metadata: { name: 'Test User' },
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('user@example.com');
    });

    it('deve rejeitar credenciais inválidas', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid login credentials');
    });

    it('deve validar campos obrigatórios', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          // missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('deve incluir informações adicionais do usuário', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        user_metadata: { 
          name: 'Test User',
          role: 'premium',
        },
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('role', 'premium');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('deve fazer logout com sucesso', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('deve exigir autenticação', async () => {
      // Temporariamente remover o mock do authMiddleware
      vi.mocked(authMiddleware).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });

    it('deve lidar com erro do Supabase', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: { message: 'Session expired' },
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to logout');
    });
  });

  describe('GET /api/auth/me', () => {
    it('deve retornar dados do usuário autenticado', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-id',
            email: 'user@example.com',
            user_metadata: { name: 'Test User' },
          },
        },
        error: null,
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'user-id');
      expect(response.body).toHaveProperty('email', 'user@example.com');
      expect(response.body).toHaveProperty('name', 'Test User');
    });

    it('deve exigir autenticação', async () => {
      vi.mocked(authMiddleware).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('deve atualizar perfil do usuário', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValueOnce({
          data: { 
            id: 'user-id',
            name: 'Updated Name',
            bio: 'New bio',
          },
          error: null,
        }),
      } as any);

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: 'Updated Name',
          bio: 'New bio',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Name');
      expect(response.body).toHaveProperty('bio', 'New bio');
    });

    it('deve validar dados do perfil', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: '', // empty name
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Name must be at least');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('deve permitir alteração de senha', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'NewPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password updated successfully');
    });

    it('deve validar força da nova senha', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send({
          currentPassword: 'OldPass123!',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    });
  });

  describe('Rate Limiting', () => {
    it('deve aplicar rate limiting em endpoints sensíveis', async () => {
      // Fazer múltiplas requisições rapidamente
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'TestPass123!',
          })
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('deve incluir headers de segurança', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
  });
});