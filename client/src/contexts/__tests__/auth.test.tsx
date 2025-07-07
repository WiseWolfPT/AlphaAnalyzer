/**
 * Authentication Flow Tests - AGENT A Emergency Financial Tests
 * Critical tests to ensure zero bugs in authentication and security
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../simple-auth-offline';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => store[key] = value,
    removeItem: (key: string) => delete store[key],
    clear: () => store = {}
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test wrapper
const AuthWrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

describe('Authentication Flow - CRITICAL SECURITY TESTS', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('User Registration Flow', () => {
    it('should register new user successfully', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthWrapper
      });

      const userData = {
        email: 'test@alfalyzer.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      await act(async () => {
        await result.current.signUp(userData.email, userData.password, userData.name);
      });

      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe(userData.email);
      expect(result.current.user?.name).toBe(userData.name);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthWrapper
      });

      const weakPasswords = ['123', 'password', 'abc'];

      for (const password of weakPasswords) {
        await act(async () => {
          try {
            await result.current.signUp('test@example.com', password, 'Test User');
          } catch (error) {
            expect(error).toBeDefined();
          }
        });
        
        expect(result.current.user).toBeNull();
      }
    });
  });

  describe('Session Management', () => {
    it('should handle logout correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthWrapper
      });

      await act(async () => {
        await result.current.signUp('test@alfalyzer.com', 'SecurePass123!', 'Test User');
      });

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access when authenticated', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthWrapper
      });

      await act(async () => {
        await result.current.signUp('test@alfalyzer.com', 'SecurePass123!', 'Test User');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });

    it('should deny access when not authenticated', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthWrapper
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});