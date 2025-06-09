import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db, type Profile } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  updateProfile: (updates: Partial<Profile>) => Promise<any>;
  isSubscribed: (tier: 'pro' | 'premium') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userProfile = await db.getProfile(session.user.id);
        setProfile(userProfile);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Get or create user profile
        let userProfile = await db.getProfile(session.user.id);
        
        if (!userProfile && session.user.email) {
          // Create profile for new user
          const { data: newProfile } = await db.updateProfile(session.user.id, {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || '',
            subscription_tier: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          userProfile = newProfile;
        }
        
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    setLoading(true);
    try {
      const result = await auth.signUp(email, password, metadata);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await auth.signIn(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const result = await auth.signInWithGoogle();
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await auth.signOut();
      return result;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const result = await auth.resetPassword(email);
    return result;
  };

  const updatePassword = async (newPassword: string) => {
    const result = await auth.updatePassword(newPassword);
    return result;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { data: null, error: new Error('No user logged in') };
    
    const result = await db.updateProfile(user.id, updates);
    if (result.data) {
      setProfile(result.data);
    }
    return result;
  };

  const isSubscribed = (tier: 'pro' | 'premium') => {
    if (!profile) return false;
    
    if (tier === 'pro') {
      return profile.subscription_tier === 'pro' || profile.subscription_tier === 'premium';
    }
    
    if (tier === 'premium') {
      return profile.subscription_tier === 'premium';
    }
    
    return false;
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isSubscribed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login page
      window.location.href = '/auth/login';
    }
  }, [user, loading]);
  
  return { user, loading };
}

// Hook for subscription checks
export function useSubscription() {
  const { profile, isSubscribed } = useAuth();
  
  return {
    tier: profile?.subscription_tier || 'free',
    isSubscribed,
    isPro: isSubscribed('pro'),
    isPremium: isSubscribed('premium'),
    isFree: profile?.subscription_tier === 'free'
  };
}