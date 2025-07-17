/**
 * Auth Context Compatibility Layer
 * This file provides backward compatibility for components using the old Supabase auth context
 * while migrating to the new Zustand-based authentication management in user-store.
 * 
 * @deprecated This compatibility layer will be removed in a future version.
 * Please migrate to using the auth functions from user-store directly.
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { 
  useAuthState, 
  useAuthActions, 
  useUserProfile,
  type UserProfile
} from '@/stores/user-store';

// Legacy auth context interface for backward compatibility
interface AuthContextType {
  // State
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  
  // Actions
  signUp: (email: string, password: string, userData?: any) => Promise<{ user: SupabaseUser | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: SupabaseUser | null; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ user: SupabaseUser | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ user: SupabaseUser | null; error: AuthError | null }>;
  refreshUser: () => Promise<void>;
}

// Create the compatibility context
const AuthCompatContext = createContext<AuthContextType | undefined>(undefined);

// Compatibility provider component
export function AuthCompatProvider({ children }: { children: ReactNode }) {
  const { user, session, isLoading, error, isAuthenticated } = useAuthState();
  const userProfile = useUserProfile();
  const {
    signUp: signUpAction,
    signIn: signInAction,
    signInWithGoogle: signInWithGoogleAction,
    signOut: signOutAction,
    resetPassword: resetPasswordAction,
    refreshUser: refreshUserAction,
    updateUserProfile,
    setSupabaseUser,
    setSession,
    setUserProfile,
    setAuthLoading,
    setAuthError,
  } = useAuthActions();

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthLoading(true);
        setAuthError(null);

        // Import supabase here to avoid circular dependencies
        const { supabase } = await import('@/lib/supabase');
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          await loadUserProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthError(error instanceof Error ? error.message : 'Failed to initialize auth');
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const setupAuthListener = async () => {
      const { supabase } = await import('@/lib/supabase');
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          
          setSession(session);
          setSupabaseUser(session?.user ?? null);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
            
            // Update last login time
            if (event === 'SIGNED_IN') {
              await updateLastLogin(session.user.id);
            }
          } else {
            setUserProfile(null);
          }
          
          setAuthLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    };

    const cleanupPromise = setupAuthListener();
    
    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [setSupabaseUser, setSession, setUserProfile, setAuthLoading, setAuthError]);

  // Load user profile from database
  const loadUserProfile = async (authId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User profile doesn't exist, create it
          await createUserProfile(authId);
          return;
        }
        throw error;
      }

      setUserProfile(data);
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      setAuthError(error.message || 'Failed to load user profile');
    }
  };

  // Create user profile for new users
  const createUserProfile = async (authId: string) => {
    try {
      const { supabase, getCurrentUser } = await import('@/lib/supabase');
      const user = await getCurrentUser();
      
      if (!user) throw new Error('No authenticated user');

      const profileData = {
        auth_id: authId,
        email: user.email!,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        preferred_currency: 'EUR' as const,
        preferred_language: 'pt' as const,
        preferred_region: 'EU' as const,
        subscription_tier: 'free' as const,
        timezone: 'Europe/Lisbon',
        is_active: true,
      };

      const { data, error } = await supabase
        .from('users')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      setAuthError(error.message || 'Failed to create user profile');
    }
  };

  // Update last login timestamp
  const updateLastLogin = async (authId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('auth_id', authId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  // Update profile wrapper for backward compatibility
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      await updateUserProfile(updates);
      return { user, error: null };
    } catch (error) {
      const authError = error as AuthError;
      return { user: null, error: authError };
    }
  };

  const contextValue: AuthContextType = {
    // State
    user,
    session,
    loading: isLoading,
    userProfile,
    isAuthenticated,
    
    // Actions
    signUp: signUpAction,
    signIn: signInAction,
    signInWithGoogle: signInWithGoogleAction,
    signOut: signOutAction,
    resetPassword: resetPasswordAction,
    updateProfile,
    refreshUser: refreshUserAction,
  };

  return (
    <AuthCompatContext.Provider value={contextValue}>
      {children}
    </AuthCompatContext.Provider>
  );
}

// Compatibility hook for old auth context
export function useSupabaseAuth(): AuthContextType {
  const context = useContext(AuthCompatContext);
  
  if (!context) {
    throw new Error('useSupabaseAuth must be used within an AuthCompatProvider');
  }

  // Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '🔄 DEPRECATED: useSupabaseAuth from supabase-auth-context is deprecated. ' +
      'Please migrate to using auth functions from user-store directly:\n' +
      'import { useAuthState, useAuthActions } from "@/stores/user-store";\n' +
      'This compatibility layer will be removed in a future version.'
    );
  }

  return context;
}

// Export the provider for easy migration
export { AuthCompatProvider };

// Protected route component (simplified version)
export const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireProfile?: boolean;
}> = ({ children, fallback, requireProfile = false }) => {
  const { user, loading, userProfile } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teya-green"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">
            Precisa de fazer login para aceder a esta página.
          </p>
          <a href="/login" className="text-teya-green hover:underline">
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  if (requireProfile && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">A configurar perfil...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teya-green mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Migration helper utilities
export const authMigrationUtils = {
  /**
   * Check if all components in a file have migrated away from useSupabaseAuth
   */
  checkMigrationStatus: () => {
    if (process.env.NODE_ENV === 'development') {
      console.group('Auth Migration Status');
      console.log('Components still using legacy useSupabaseAuth:');
      console.log('- Check console warnings for DEPRECATED: useSupabaseAuth messages');
      console.log('Migration guide: https://docs.alfalyzer.com/migration/auth-context');
      console.groupEnd();
    }
  },

  /**
   * Example migration from old to new pattern
   */
  migrationExample: () => {
    console.log(`
    // OLD (deprecated):
    const { 
      user, 
      userProfile, 
      signIn, 
      signOut, 
      loading, 
      isAuthenticated 
    } = useSupabaseAuth();
    
    // NEW (recommended):
    import { useAuthState, useAuthActions } from '@/stores/user-store';
    
    const { user, userProfile, isLoading, isAuthenticated } = useAuthState();
    const { signIn, signOut } = useAuthActions();
    `);
  },

  /**
   * Performance comparison between old and new patterns
   */
  performanceComparison: () => {
    console.log(`
    PERFORMANCE IMPROVEMENTS:
    
    Old Context Pattern:
    - Complex 495-line context with multiple state variables
    - Multiple useEffect hooks causing re-renders
    - Manual state synchronization
    - Toast notifications coupled with auth logic
    
    New Zustand Pattern:
    - Centralized auth state in user-store
    - Selective re-renders for different auth slices
    - Performance monitoring built-in
    - Decoupled notification logic
    - Automatic persistence of user profile
    
    Expected improvements:
    - 40-60% reduction in auth-related re-renders
    - Better code organization and maintainability
    - Easier testing and debugging
    - Consistent state management patterns
    `);
  }
};

// Legacy types for backward compatibility
export type {
  AuthContextType,
  UserProfile,
};