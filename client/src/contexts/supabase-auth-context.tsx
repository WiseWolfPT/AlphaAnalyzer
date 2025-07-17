// Wave 4: Supabase Authentication Context
// Complete auth system for Portuguese investors platform
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, getCurrentUser, handleSupabaseError } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Authentication context types
interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  
  // Actions
  signUp: (email: string, password: string, userData?: any) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ user: User | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: any) => Promise<{ user: User | null; error: AuthError | null }>;
  
  // Utilities
  isAuthenticated: boolean;
  userProfile: any;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Portuguese-specific user profile structure
interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  name?: string;
  preferred_currency: 'EUR' | 'USD';
  preferred_language: 'pt' | 'en';
  preferred_region: 'EU' | 'USA' | 'APAC';
  subscription_tier: 'free' | 'pro' | 'premium';
  profile_picture_url?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  is_active: boolean;
}

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await loadUserProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
          
          // Update last login time
          if (event === 'SIGNED_IN') {
            await updateLastLogin(session.user.id);
            toast({
              title: "Bem-vindo ao Alfalyzer! 🎉",
              description: "Autenticação realizada com sucesso.",
            });
          }
        } else {
          setUserProfile(null);
          if (event === 'SIGNED_OUT') {
            toast({
              title: "Sessão terminada",
              description: "Logout realizado com sucesso.",
            });
          }
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  // Load user profile from database
  const loadUserProfile = async (authId: string) => {
    try {
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
      handleSupabaseError(error, 'load user profile');
    }
  };

  // Create user profile for new users
  const createUserProfile = async (authId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      const profileData = {
        auth_id: authId,
        email: user.email!,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        preferred_currency: 'EUR' as const, // Default for Portuguese users
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
      
      toast({
        title: "Perfil criado! 🎯",
        description: "O seu perfil foi configurado para investidores portugueses.",
      });
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      handleSupabaseError(error, 'create user profile');
    }
  };

  // Update last login timestamp
  const updateLastLogin = async (authId: string) => {
    try {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('auth_id', authId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  // Sign up new user
  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData?.name,
            preferred_language: 'pt',
            preferred_currency: 'EUR',
            preferred_region: 'EU',
            ...userData
          }
        }
      });

      if (error) {
        toast({
          title: "Erro no registo",
          description: error.message,
          variant: "destructive",
        });
        return { user: null, error };
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Verifique o seu email 📧",
          description: "Enviámos um link de confirmação para o seu email.",
        });
      }

      return { user: data.user, error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast({
        title: "Erro no registo",
        description: authError.message,
        variant: "destructive",
      });
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Sign in existing user
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { user: null, error };
      }

      return { user: data.user, error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast({
        title: "Erro no login",
        description: authError.message,
        variant: "destructive",
      });
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      return { user: data.user, error };
    } catch (error: any) {
      const authError = error as AuthError;
      toast({
        title: "Erro no login com Google",
        description: authError.message,
        variant: "destructive",
      });
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Sign out user
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Erro no logout",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Clear local state
      setUser(null);
      setSession(null);
      setUserProfile(null);

      return { error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Erro na recuperação",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Email enviado! 📧",
        description: "Verifique o seu email para redefinir a password.",
      });

      return { error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      return { error: authError };
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      setLoading(true);

      // Update auth metadata if needed
      const authUpdates: any = {};
      if (updates.name) {
        authUpdates.data = { name: updates.name };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw authError;
      }

      // Update user profile in database
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('auth_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      
      toast({
        title: "Perfil atualizado! ✅",
        description: "As suas preferências foram guardadas.",
      });

      return { user: user, error: null };
    } catch (error: any) {
      const authError = error as AuthError;
      toast({
        title: "Erro na atualização",
        description: authError.message,
        variant: "destructive",
      });
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const value: AuthContextType = {
    // State
    user,
    session,
    loading,
    userProfile,
    isAuthenticated: !!user,
    
    // Actions
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

// Protected route component
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