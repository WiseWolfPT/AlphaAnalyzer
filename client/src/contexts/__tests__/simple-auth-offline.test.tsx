/**
 * ALFALYZER - AUTHENTICATION CONTEXT TESTS
 * Testes unitários para o contexto de autenticação
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from '../simple-auth-offline';
import { supabase } from '@/lib/supabase';

// Mock do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Inicialização', () => {
    it('deve inicializar sem usuário autenticado', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('deve restaurar sessão existente', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@alfalyzer.com',
          user_metadata: { name: 'Test User' },
        },
        access_token: 'mock-token',
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: 'user-123',
        email: 'test@alfalyzer.com',
        name: 'Test User',
      });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Login', () => {
    it('deve fazer login com sucesso', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@alfalyzer.com',
        user_metadata: { name: 'Test User' },
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { access_token: 'mock-token' },
        },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@alfalyzer.com', 'password123');
      });

      expect(result.current.user).toEqual({
        id: 'user-123',
        email: 'test@alfalyzer.com',
        name: 'Test User',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@alfalyzer.com',
        password: 'password123',
      });
    });

    it('deve lidar com erro de login', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('wrong@email.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('deve salvar token no localStorage após login', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@alfalyzer.com' },
          session: { access_token: 'mock-token-123' },
        },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@alfalyzer.com', 'password123');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'alfalyzer_auth_token',
        'mock-token-123'
      );
    });
  });

  describe('Registro', () => {
    it('deve registrar novo usuário com sucesso', async () => {
      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@alfalyzer.com',
        user_metadata: { name: 'New User' },
      };

      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { access_token: 'new-token' },
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValueOnce({
          data: { id: 'profile-123' },
          error: null,
        }),
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register('New User', 'newuser@alfalyzer.com', 'password123');
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@alfalyzer.com',
        password: 'password123',
        options: {
          data: { name: 'New User' },
        },
      });

      expect(result.current.user).toEqual({
        id: 'new-user-123',
        email: 'newuser@alfalyzer.com',
        name: 'New User',
      });
    });

    it('deve criar perfil de usuário após registro', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@alfalyzer.com' },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockResolvedValueOnce({
        data: { id: 'profile-123' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: insertMock,
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register('Test User', 'test@alfalyzer.com', 'password123');
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(insertMock).toHaveBeenCalledWith({
        id: 'user-123',
        name: 'Test User',
        email: 'test@alfalyzer.com',
      });
    });

    it('deve lidar com erro de email duplicado', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.register('Duplicate', 'existing@alfalyzer.com', 'password123');
        })
      ).rejects.toThrow('User already registered');
    });
  });

  describe('Logout', () => {
    it('deve fazer logout com sucesso', async () => {
      // Setup: usuário logado
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Simular usuário logado
      act(() => {
        result.current.user = {
          id: 'user-123',
          email: 'test@alfalyzer.com',
          name: 'Test User',
        };
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('alfalyzer_auth_token');
    });

    it('deve lidar com erro de logout', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: { message: 'Logout failed' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.logout();
        })
      ).rejects.toThrow('Logout failed');
    });
  });

  describe('Atualização de Perfil', () => {
    it('deve atualizar perfil do usuário', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockResolvedValueOnce({
        data: { name: 'Updated Name' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simular usuário logado
      act(() => {
        result.current.user = {
          id: 'user-123',
          email: 'test@alfalyzer.com',
          name: 'Old Name',
        };
      });

      await act(async () => {
        await result.current.updateProfile({ name: 'Updated Name' });
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(updateMock).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(eqMock).toHaveBeenCalledWith('id', 'user-123');
      
      expect(result.current.user?.name).toBe('Updated Name');
    });

    it('deve exigir usuário autenticado para atualizar perfil', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.updateProfile({ name: 'New Name' });
        })
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('Auth State Changes', () => {
    it('deve escutar mudanças no estado de autenticação', async () => {
      const unsubscribeMock = vi.fn();
      const onAuthStateChangeMock = vi.fn((callback) => {
        // Simular mudança de estado
        setTimeout(() => {
          callback('SIGNED_IN', {
            user: {
              id: 'user-123',
              email: 'test@alfalyzer.com',
              user_metadata: { name: 'Test User' },
            },
          });
        }, 100);

        return { data: { subscription: { unsubscribe: unsubscribeMock } } };
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(onAuthStateChangeMock);

      const { result, unmount } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual({
          id: 'user-123',
          email: 'test@alfalyzer.com',
          name: 'Test User',
        });
      });

      unmount();
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Modo Offline', () => {
    it('deve funcionar em modo offline com dados cached', async () => {
      // Simular dados offline no localStorage
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({
          id: 'offline-user',
          email: 'offline@alfalyzer.com',
          name: 'Offline User',
        })
      );

      // Simular falha de rede
      vi.mocked(supabase.auth.getSession).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual({
        id: 'offline-user',
        email: 'offline@alfalyzer.com',
        name: 'Offline User',
      });
      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('Permissões e Roles', () => {
    it('deve verificar permissões do usuário', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simular usuário com role admin
      act(() => {
        result.current.user = {
          id: 'admin-123',
          email: 'admin@alfalyzer.com',
          name: 'Admin User',
          role: 'admin',
        };
      });

      expect(result.current.hasPermission('admin')).toBe(true);
      expect(result.current.hasPermission('user')).toBe(true);
      expect(result.current.isAdmin).toBe(true);
    });

    it('deve negar permissões não autorizadas', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simular usuário regular
      act(() => {
        result.current.user = {
          id: 'user-123',
          email: 'user@alfalyzer.com',
          name: 'Regular User',
          role: 'user',
        };
      });

      expect(result.current.hasPermission('admin')).toBe(false);
      expect(result.current.hasPermission('user')).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });
  });
});