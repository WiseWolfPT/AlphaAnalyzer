import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SimpleAuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  toggleAuthState: () => void; // Para demonstração apenas
}

const SimpleAuthContext = createContext<SimpleAuthContextType>({
  user: null,
  loading: false,
  signOut: async () => {},
  signIn: async () => ({}),
  register: async () => ({}),
  toggleAuthState: () => {},
});

export const useAuth = () => useContext(SimpleAuthContext);

interface SimpleAuthProviderProps {
  children: ReactNode;
}

export function SimpleAuthProvider({ children }: SimpleAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert Supabase user to our User type
  const convertUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email || '',
      avatar: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'
    };
  };

  useEffect(() => {
    // Get initial session
    auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(convertUser(session.user));
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(convertUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await auth.signIn(email, password);
    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const register = async (name: string, email: string, password: string) => {
    const { data, error } = await auth.signUp(email, password, { full_name: name });
    if (error) {
      return { error: error.message };
    }
    return {};
  };

  // Para demonstração - alternar entre logado/não logado (mock)
  const toggleAuthState = () => {
    if (user) {
      setUser(null);
    } else {
      setUser({
        id: 'demo-1',
        name: 'João Silva (Demo)',
        email: 'joao@demo.com',
        avatar: 'JS'
      });
    }
  };

  return (
    <SimpleAuthContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      signIn, 
      register,
      toggleAuthState 
    }}>
      {children}
    </SimpleAuthContext.Provider>
  );
}