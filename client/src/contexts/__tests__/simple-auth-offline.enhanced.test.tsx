/**
 * Comprehensive test suite for SimpleAuthProvider
 * Covers authentication flows, localStorage edge cases, and error handling
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SimpleAuthProvider, useAuth } from '../simple-auth-offline';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component to interact with auth context
const AuthTestComponent = () => {
  const { user, token, loading, signIn, register, signOut, toggleAuthState } = useAuth();
  
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSignIn = async () => {
    const result = await signIn(email, password);
    if (result.error) setError(result.error);
    else setError('');
  };

  const handleRegister = async () => {
    const result = await register(name, email, password);
    if (result.error) setError(result.error);
    else setError('');
  };

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="token">{token ? 'has-token' : 'no-token'}</div>
      <div data-testid="error">{error}</div>
      
      <input
        data-testid="email-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        data-testid="password-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <input
        data-testid="name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      
      <button data-testid="signin-btn" onClick={handleSignIn}>
        Sign In
      </button>
      <button data-testid="register-btn" onClick={handleRegister}>
        Register
      </button>
      <button data-testid="signout-btn" onClick={signOut}>
        Sign Out
      </button>
      <button data-testid="toggle-btn" onClick={toggleAuthState}>
        Toggle Auth
      </button>
    </div>
  );
};

describe('SimpleAuthProvider - Critical Authentication Flows', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Mock Date.now for consistent token generation
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // Fixed timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Auto-login and Initialization', () => {
    it('should auto-login with demo user when localStorage is empty', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
      expect(screen.getByTestId('token')).toHaveTextContent('has-token');
      
      // Verify localStorage was set
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'alfalyzer-user',
        expect.stringContaining('demo@alfalyzer.com')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'alfalyzer-token',
        expect.any(String)
      );
    });

    it('should restore user from valid localStorage data', async () => {
      const mockUser = {
        id: 'saved-user-123',
        name: 'Saved User',
        email: 'saved@example.com'
      };
      const mockToken = 'saved.token.here';

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUser))
        .mockReturnValueOnce(mockToken);

      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('saved@example.com');
        expect(screen.getByTestId('token')).toHaveTextContent('has-token');
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });
    });

    it('should handle corrupted localStorage gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorageMock.getItem
        .mockReturnValueOnce('invalid-json-data')
        .mockReturnValueOnce('some-token');

      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should fall back to demo user
      expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
      
      // Should clear corrupted data
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('alfalyzer-user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('alfalyzer-token');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing saved user:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle missing token with valid user data', async () => {
      const mockUser = {
        id: 'saved-user-123',
        name: 'Saved User',
        email: 'saved@example.com'
      };

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockUser))
        .mockReturnValueOnce(null); // No token

      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Should fall back to demo user since both user and token are required
      expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
    });
  });

  describe('Sign In Flow', () => {
    const renderAuthComponent = () => {
      return render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );
    };

    it('should sign in with valid demo credentials', async () => {
      renderAuthComponent();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'demo@alfalyzer.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'demo123' }
      });

      fireEvent.click(screen.getByTestId('signin-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
        expect(screen.getByTestId('error')).toHaveTextContent('');
      });

      // Verify token storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth-token',
        expect.any(String)
      );
    });

    it('should handle all valid demo credential combinations', async () => {
      const validCredentials = [
        { email: 'demo@alfalyzer.com', password: 'demo123', expectedName: 'Demo User' },
        { email: 'admin@alfalyzer.com', password: 'admin123', expectedName: 'Admin User' },
        { email: 'beta@alfalyzer.com', password: '123demo', expectedName: 'António Francisco (Beta)' },
        { email: 'test@test.com', password: 'test123', expectedName: 'Demo User' }
      ];

      for (const { email, password, expectedName } of validCredentials) {
        localStorageMock.clear();
        jest.clearAllMocks();

        const { unmount } = renderAuthComponent();

        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        });

        fireEvent.change(screen.getByTestId('email-input'), {
          target: { value: email }
        });
        fireEvent.change(screen.getByTestId('password-input'), {
          target: { value: password }
        });

        fireEvent.click(screen.getByTestId('signin-btn'));

        await waitFor(() => {
          expect(screen.getByTestId('user')).toHaveTextContent(email);
          expect(screen.getByTestId('error')).toHaveTextContent('');
        });

        // Verify the user object has correct name
        const userCall = localStorageMock.setItem.mock.calls.find(
          call => call[0] === 'alfalyzer-user'
        );
        expect(userCall).toBeDefined();
        const userData = JSON.parse(userCall![1]);
        expect(userData.name).toBe(expectedName);

        unmount();
      }
    });

    it('should reject invalid credentials', async () => {
      renderAuthComponent();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'invalid@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'wrongpassword' }
      });

      fireEvent.click(screen.getByTestId('signin-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'Credenciais inválidas. Use beta@alfalyzer.com / 123demo'
        );
      });

      // User should remain as demo user (auto-login)
      expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
    });

    it('should handle empty credentials', async () => {
      renderAuthComponent();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Don't set email/password, click sign in with empty fields
      fireEvent.click(screen.getByTestId('signin-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(
          'Credenciais inválidas. Use beta@alfalyzer.com / 123demo'
        );
      });
    });
  });

  describe('Registration Flow', () => {
    it('should register new user successfully', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      fireEvent.change(screen.getByTestId('name-input'), {
        target: { value: 'New User' }
      });
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'newuser@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByTestId('register-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('newuser@example.com');
        expect(screen.getByTestId('error')).toHaveTextContent('');
      });

      // Verify user data structure
      const userCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'alfalyzer-user'
      );
      expect(userCall).toBeDefined();
      const userData = JSON.parse(userCall![1]);
      
      expect(userData.name).toBe('New User');
      expect(userData.email).toBe('newuser@example.com');
      expect(userData.avatar).toBe('N'); // First letter of name
      expect(userData.id).toMatch(/^user-\d+$/);
    });

    it('should handle registration with special characters in name', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      fireEvent.change(screen.getByTestId('name-input'), {
        target: { value: 'José María' }
      });
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'jose@example.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByTestId('register-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('jose@example.com');
      });

      // Check avatar generation
      const userCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'alfalyzer-user'
      );
      const userData = JSON.parse(userCall![1]);
      expect(userData.avatar).toBe('J'); // First letter uppercase
    });
  });

  describe('Sign Out Flow', () => {
    it('should sign out and clear all stored data', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
      });

      fireEvent.click(screen.getByTestId('signout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('token')).toHaveTextContent('no-token');
      });

      // Verify all localStorage items are removed
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('alfalyzer-user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('alfalyzer-token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-token');
    });
  });

  describe('Toggle Auth State (Development Feature)', () => {
    it('should toggle from authenticated to unauthenticated', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
      });

      fireEvent.click(screen.getByTestId('toggle-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('token')).toHaveTextContent('no-token');
      });
    });

    it('should toggle from unauthenticated to demo user', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      // First sign out
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
      });

      fireEvent.click(screen.getByTestId('signout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });

      // Then toggle back
      fireEvent.click(screen.getByTestId('toggle-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('joao@demo.com');
        expect(screen.getByTestId('token')).toHaveTextContent('has-token');
      });

      // Verify demo user data
      const userCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'alfalyzer-user'
      );
      const userData = JSON.parse(userCall![1]);
      expect(userData.name).toBe('João Silva (Demo)');
      expect(userData.avatar).toBe('JS');
      expect(userData.id).toBe('demo-1');
    });
  });

  describe('Token Generation and Management', () => {
    it('should generate valid JWT-like tokens', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('demo@alfalyzer.com');
      });

      const tokenCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'alfalyzer-token'
      );
      expect(tokenCall).toBeDefined();
      
      const token = tokenCall![1];
      const parts = token.split('.');
      expect(parts).toHaveLength(3); // header.payload.signature

      // Decode header and payload
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
      expect(payload.email).toBe('demo@alfalyzer.com');
      expect(payload.iat).toBe(1640995200); // Fixed timestamp
      expect(payload.exp).toBe(1640995200 + (24 * 60 * 60)); // 24 hours later
    });

    it('should store tokens in multiple localStorage keys', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('token')).toHaveTextContent('has-token');
      });

      // Should store in both alfalyzer-token and auth-token
      const authTokenCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'auth-token'
      );
      const alfalyzerTokenCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'alfalyzer-token'
      );

      expect(authTokenCall).toBeDefined();
      expect(alfalyzerTokenCall).toBeDefined();
      expect(authTokenCall![1]).toBe(alfalyzerTokenCall![1]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle localStorage quota exceeded gracefully', async () => {
      const setItemSpy = jest.spyOn(localStorageMock, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should not crash even if localStorage fails
      expect(() => {
        render(
          <SimpleAuthProvider>
            <AuthTestComponent />
          </SimpleAuthProvider>
        );
      }).not.toThrow();

      setItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle localStorage unavailable', async () => {
      const originalLocalStorage = window.localStorage;
      
      // Remove localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });

      // Should still render without crashing
      expect(() => {
        render(
          <SimpleAuthProvider>
            <AuthTestComponent />
          </SimpleAuthProvider>
        );
      }).not.toThrow();

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });

    it('should handle concurrent authentication operations', async () => {
      render(
        <SimpleAuthProvider>
          <AuthTestComponent />
        </SimpleAuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      });

      // Set up for sign in
      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'demo@alfalyzer.com' }
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'demo123' }
      });

      // Rapidly click multiple auth operations
      fireEvent.click(screen.getByTestId('signin-btn'));
      fireEvent.click(screen.getByTestId('toggle-btn'));
      fireEvent.click(screen.getByTestId('signout-btn'));

      // Should handle gracefully without errors
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });
    });
  });
});