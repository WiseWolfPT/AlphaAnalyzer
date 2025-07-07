/**
 * SUPABASE AUTH PROVIDER
 * AGENTE 4: Security Hardening Specialist
 * 
 * Secure authentication using Supabase
 * Replaces simple-auth system
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client for client-side operations
const supabase = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key'
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SupabaseAuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  toggleAuthState: () => void; // For beta access
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
  user: null,
  session: null,
  loading: false,
  signOut: async () => {},
  signIn: async () => ({}),
  signInWithGoogle: async () => ({}),
  signUp: async () => ({}),
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  toggleAuthState: () => {},
});

export const useAuth = () => useContext(SupabaseAuthContext);

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert Supabase user to our AuthUser format
  const convertUser = (supabaseUser: User): AuthUser => ({
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.full_name || 
           supabaseUser.user_metadata?.name || 
           supabaseUser.email?.split('@')[0] || 
           'Utilizador',
    avatar: supabaseUser.user_metadata?.avatar_url,
  });

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase not configured - using beta mode');
      // Beta mode - simplified authentication
      const betaUser = localStorage.getItem('alfalyzer-beta-user');
      if (betaUser) {
        try {
          setUser(JSON.parse(betaUser));
        } catch (error) {
          console.error('Error parsing beta user:', error);
          localStorage.removeItem('alfalyzer-beta-user');
        }
      }
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? convertUser(session.user) : null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ? convertUser(session.user) : null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name,
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      // Beta mode logout
      localStorage.removeItem('alfalyzer-beta-user');
      setUser(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) {
      return { error: 'Supabase não configurado' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  };

  // Beta mode toggle - for development/demo purposes
  const toggleAuthState = () => {
    if (!supabase) {
      // Beta mode - toggle authentication
      const betaUser: AuthUser = {
        id: 'beta-user-id',
        email: 'beta@alfalyzer.com',
        name: 'Beta User',
        avatar: undefined,
      };

      if (user) {
        localStorage.removeItem('alfalyzer-beta-user');
        setUser(null);
      } else {
        localStorage.setItem('alfalyzer-beta-user', JSON.stringify(betaUser));
        setUser(betaUser);
      }
    }
  };

  const value: SupabaseAuthContextType = {
    user,
    session,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    toggleAuthState,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

// Health check for Supabase configuration
export const getAuthStatus = () => ({
  configured: !!supabase,
  url: supabaseUrl || 'not configured',
  canAuth: !!supabase,
});

export { supabase };